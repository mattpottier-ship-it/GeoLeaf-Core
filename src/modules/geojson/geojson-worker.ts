/**
 * GeoLeaf GeoJSON Web Worker
 * Executes fetch + JSON parse off the main thread.
 *
 * Protocole de messages :
 *   → { type: "fetch", url, layerId, chunkSize }
 *   ← { type: "chunk",    layerId, features: [...], index, total }
 *   ← { type: "done",     layerId, featureCount }
 *   ← { type: "error",    layerId, message }
 *
 * If the Service Worker (core ou complete) est registered, les requests
 * fetch() requests here will be intercepted by the SW cache-first strategy.
 *
 * Version: __GEOLEAF_VERSION__
 * @module geojson/geojson-worker
 */
/* eslint-env worker */
"use strict";

/** Size des chunks by default (nombre de features par message) */
const DEFAULT_CHUNK_SIZE = 500;

/** Allowed protocols for fetch requests */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Valide une URL avant of the utiliser dans fetch().
 * Bloque les protocoles dangereux (javascript:, data:, file:, blob:, etc.).
 *
 * @param {string} url - URL to validate
 * @returns {string} Validated URL
 * @throws {Error} Si l'URL est invalid ou utilise un protocole interdit
 */
function validateWorkerUrl(url: any) {
    if (!url || typeof url !== "string") {
        throw new Error("URL must be a non-empty string");
    }

    url = url.trim();

    // Relative URLs are allowed (resolved against worker origin).
    // This includes paths starting with /, ./, ../ OR bare relative paths (e.g. "profiles/tourism/...").
    // A relative URL has no protocol separator "://" so it cannot contain a dangerous scheme.
    if (!url.includes("://")) {
        return url;
    }

    try {
        const parsed = new URL(url);
        if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
            throw new Error(
                'Protocol "' +
                    parsed.protocol +
                    '" not allowed. Only http: and https: are permitted.'
            );
        }
        return parsed.href;
    } catch (e: unknown) {
        throw new Error("Invalid URL: " + (e as any).message);
    }
}

function _normalizeFeatures(data: any): any[] {
    if (data?.type === "FeatureCollection" && Array.isArray(data.features)) return data.features;
    if (data?.type === "Feature") return [data];
    if (Array.isArray(data)) return data;
    return data?.features ?? [];
}

/**
 * Manages un message « fetch » : downloads, parse et returns en chunks.
 *
 * @param {Object} msg - Received message data
 */
async function handleFetch(msg: any) {
    const { url, layerId, chunkSize } = msg;
    const size = typeof chunkSize === "number" && chunkSize > 0 ? chunkSize : DEFAULT_CHUNK_SIZE;

    try {
        const validatedUrl = validateWorkerUrl(url);
        const response = await fetch(validatedUrl);
        if (!response.ok) {
            throw new Error("HTTP " + response.status + " pour " + url);
        }

        const data = await response.json();

        // Normaliser en FeatureCollection
        const features = _normalizeFeatures(data);

        const total = features.length;

        // Envoyer les features par chunks pour ne pas bloquer le postMessage
        for (let i = 0; i < total; i += size) {
            const chunk = features.slice(i, i + size);
            self.postMessage({
                type: "chunk",
                layerId: layerId,
                features: chunk,
                index: Math.floor(i / size),
                total: total,
            });
        }

        // Signal de fin
        self.postMessage({
            type: "done",
            layerId: layerId,
            featureCount: total,
        });
    } catch (err: unknown) {
        self.postMessage({
            type: "error",
            layerId: layerId,
            message: (err as any).message || String(err),
        });
    }
}

/**
 * Manages un message « fetch-text » : downloads un file text (ex: GPX) et le returns.
 * Perf 6.3.1: Off-load network GPX to the Worker — le parsing DOMParser reste sur main thread.
 *
 * @param {Object} msg - Received message data
 */
async function handleFetchText(msg: any) {
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
            text: text,
        });
    } catch (err: unknown) {
        self.postMessage({
            type: "error",
            layerId: layerId,
            message: (err as any).message || String(err),
        });
    }
}

/**
 * Listnsur de messages main.
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
                message: "Type de message inconnu : " + msg.type,
            });
    }
};
