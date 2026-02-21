/**
 * GeoLeaf GeoJSON Web Worker
 * Exécute le fetch + parse JSON hors du thread principal.
 *
 * Protocole de messages :
 *   → { type: "fetch", url, layerId, chunkSize }
 *   ← { type: "chunk",    layerId, features: [...], index, total }
 *   ← { type: "done",     layerId, featureCount }
 *   ← { type: "error",    layerId, message }
 *
 * Si le Service Worker (core ou complet) est enregistré, les requêtes
 * fetch() émises ici seront interceptées par la stratégie cache-first du SW.
 *
 * Version: __GEOLEAF_VERSION__
 * @module geojson/geojson-worker
 */
/* eslint-env worker */
"use strict";

/** Taille des chunks par défaut (nombre de features par message) */
const DEFAULT_CHUNK_SIZE = 500;

/** Protocoles autorisés pour les requêtes fetch */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Valide une URL avant de l'utiliser dans fetch().
 * Bloque les protocoles dangereux (javascript:, data:, file:, blob:, etc.).
 *
 * @param {string} url - URL à valider
 * @returns {string} URL validée
 * @throws {Error} Si l'URL est invalide ou utilise un protocole interdit
 */
function validateWorkerUrl(url) {
    if (!url || typeof url !== 'string') {
        throw new Error('URL must be a non-empty string');
    }

    url = url.trim();

    // Relative URLs are allowed (resolved against worker origin).
    // This includes paths starting with /, ./, ../ OR bare relative paths (e.g. "profiles/tourism/...").
    // A relative URL has no protocol separator "://" so it cannot contain a dangerous scheme.
    if (!url.includes('://')) {
        return url;
    }

    try {
        const parsed = new URL(url);
        if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
            throw new Error('Protocol "' + parsed.protocol + '" not allowed. Only http: and https: are permitted.');
        }
        return parsed.href;
    } catch (e) {
        throw new Error('Invalid URL: ' + e.message);
    }
}

/**
 * Gère un message « fetch » : télécharge, parse et renvoie en chunks.
 *
 * @param {Object} msg - Données du message reçu
 */
async function handleFetch(msg) {
    const { url, layerId, chunkSize } = msg;
    const size = (typeof chunkSize === "number" && chunkSize > 0) ? chunkSize : DEFAULT_CHUNK_SIZE;

    try {
        const validatedUrl = validateWorkerUrl(url);
        const response = await fetch(validatedUrl);
        if (!response.ok) {
            throw new Error("HTTP " + response.status + " pour " + url);
        }

        const data = await response.json();

        // Normaliser en FeatureCollection
        let features;
        if (data && data.type === "FeatureCollection" && Array.isArray(data.features)) {
            features = data.features;
        } else if (data && data.type === "Feature") {
            features = [data];
        } else if (Array.isArray(data)) {
            features = data;
        } else {
            // Objet inconnu — renvoyer tel quel dans un seul chunk
            features = data && data.features ? data.features : [];
        }

        const total = features.length;

        // Envoyer les features par chunks pour ne pas bloquer le postMessage
        for (let i = 0; i < total; i += size) {
            const chunk = features.slice(i, i + size);
            self.postMessage({
                type: "chunk",
                layerId: layerId,
                features: chunk,
                index: Math.floor(i / size),
                total: total
            });
        }

        // Signal de fin
        self.postMessage({
            type: "done",
            layerId: layerId,
            featureCount: total
        });

    } catch (err) {
        self.postMessage({
            type: "error",
            layerId: layerId,
            message: err.message || String(err)
        });
    }
}

/**
 * Gère un message « fetch-text » : télécharge un fichier texte (ex: GPX) et le renvoie.
 * Perf 6.3.1: Off-load réseau GPX vers le Worker — le parsing DOMParser reste sur main thread.
 *
 * @param {Object} msg - Données du message reçu
 */
async function handleFetchText(msg) {
    const { url, layerId } = msg;

    try {
        const validatedUrl = validateWorkerUrl(url);
        const response = await fetch(validatedUrl);
        if (!response.ok) {
            throw new Error("HTTP " + response.status + " pour " + url);
        }

        const text = await response.text();

        self.postMessage({
            type: "text-done",
            layerId: layerId,
            text: text
        });

    } catch (err) {
        self.postMessage({
            type: "error",
            layerId: layerId,
            message: err.message || String(err)
        });
    }
}

/**
 * Écouteur de messages principal.
 */
self.onmessage = function (event) {
    const msg = event.data;
    if (!msg || !msg.type) return;

    switch (msg.type) {
        case "fetch":
            handleFetch(msg);
            break;

        case "fetch-text":
            // Perf 6.3.1: Fetch GPX text off-thread
            handleFetchText(msg);
            break;

        case "ping":
            self.postMessage({ type: "pong" });
            break;

        default:
            self.postMessage({
                type: "error",
                layerId: msg.layerId || null,
                message: "Type de message inconnu : " + msg.type
            });
    }
};
