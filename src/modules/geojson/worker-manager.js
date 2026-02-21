/**
 * GeoLeaf GeoJSON Worker Manager
 * Orchestre le cycle de vie du Web Worker GeoJSON.
 *
 * Fonctionnalités :
 *   - Création lazy d'un Worker unique (singleton)
 *   - Communication postMessage / onmessage
 *   - Fallback transparent vers fetch main-thread si Worker indisponible
 *   - Nettoyage automatique du Worker après un délai d'inactivité
 *
 * @module geojson/worker-manager
 */
"use strict";

import { getLog } from '../utils/general-utils.js';

/** Délai avant terminaison du Worker inactif (ms) */
const IDLE_TIMEOUT = 30000;

/** Chunk size envoyé au Worker */
const DEFAULT_CHUNK_SIZE = 500;

/** Nom du fichier worker */
const WORKER_FILENAME = "geojson-worker.js";

/**
 * Détecte le répertoire de base du bundle GeoLeaf en scannant les balises <script>.
 * Permet de résoudre l'URL du Worker relativement au bundle, pas à la page HTML.
 *
 * @returns {string} Base URL se terminant par '/' (ex. "../dist/" ou "/assets/js/")
 * @private
 */
function _detectScriptBase() {
    // Méthode 1 : document.currentScript (disponible uniquement pendant l'exécution synchrone du script)
    if (typeof document !== "undefined" && document.currentScript && document.currentScript.src) {
        return document.currentScript.src.substring(0, document.currentScript.src.lastIndexOf("/") + 1);
    }

    // Méthode 2 : scanner les <script> pour trouver geoleaf*.js
    if (typeof document !== "undefined") {
        var scripts = document.getElementsByTagName("script");
        for (var i = scripts.length - 1; i >= 0; i--) {
            var src = scripts[i].src || "";
            if (/geoleaf[\w.-]*\.js/i.test(src)) {
                return src.substring(0, src.lastIndexOf("/") + 1);
            }
        }
    }

    // Méthode 3 : fallback — même répertoire que la page
    return "";
}

/** Base URL capturée au chargement du module */
const _scriptBase = _detectScriptBase();

/**
 * État interne du manager.
 * @private
 */
const _state = {
    /** @type {Worker|null} */
    worker: null,
    /** @type {boolean} */
    workerAvailable: true,
    /** @type {Map<string, Object>} layerId → { resolve, reject, features, onChunk } */
    pending: new Map(),
    /** @type {number|null} */
    idleTimer: null
};

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Tente de créer le Worker. Renvoie null si impossible.
 * @returns {Worker|null}
 * @private
 */
function _createWorker() {
    if (!_state.workerAvailable) return null;
    if (_state.worker) return _state.worker;

    try {
        // Résoudre l'URL du Worker relativement au script GeoLeaf (pas à la page HTML)
        const workerUrl = _scriptBase + WORKER_FILENAME;
        const worker = new Worker(workerUrl);

        worker.onmessage = _onMessage;
        worker.onerror = _onError;

        _state.worker = worker;
        getLog().debug("[WorkerManager] Web Worker GeoJSON créé :", workerUrl);
        return worker;
    } catch (err) {
        getLog().warn("[WorkerManager] Impossible de créer le Web Worker, fallback main-thread :", err.message);
        _state.workerAvailable = false;
        return null;
    }
}

/**
 * Réinitialise le timer d'inactivité.
 * @private
 */
function _resetIdleTimer() {
    if (_state.idleTimer) clearTimeout(_state.idleTimer);
    _state.idleTimer = setTimeout(() => {
        if (_state.pending.size === 0 && _state.worker) {
            _state.worker.terminate();
            _state.worker = null;
            getLog().debug("[WorkerManager] Worker terminé après inactivité");
        }
    }, IDLE_TIMEOUT);
}

// ─── Worker message handlers ────────────────────────────────────

/**
 * Gestionnaire des messages reçus du Worker.
 * @param {MessageEvent} event
 * @private
 */
function _onMessage(event) {
    const msg = event.data;
    if (!msg || !msg.type) return;

    const entry = msg.layerId ? _state.pending.get(msg.layerId) : null;

    switch (msg.type) {
        case "chunk":
            if (entry) {
                // Accumuler les features
                if (msg.features && msg.features.length) {
                    entry.features.push(...msg.features);
                }
                // Callback optionnel par chunk (pour rendu progressif)
                if (typeof entry.onChunk === "function") {
                    entry.onChunk(msg.features, msg.index, msg.total);
                }
            }
            break;

        case "done":
            if (entry) {
                _state.pending.delete(msg.layerId);
                entry.resolve({
                    type: "FeatureCollection",
                    features: entry.features
                });
                _resetIdleTimer();
            }
            break;

        case "text-done":
            // Perf 6.3.1: GPX text fetch completed in Worker
            if (entry) {
                _state.pending.delete(msg.layerId);
                entry.resolve(msg.text || '');
                _resetIdleTimer();
            }
            break;

        case "error":
            if (entry) {
                _state.pending.delete(msg.layerId);
                entry.reject(new Error(msg.message));
                _resetIdleTimer();
            } else {
                getLog().warn("[WorkerManager] Erreur Worker sans layerId :", msg.message);
            }
            break;

        case "pong":
            getLog().debug("[WorkerManager] Worker pong reçu");
            break;
    }
}

/**
 * Gestionnaire d'erreur globale du Worker.
 * @param {ErrorEvent} err
 * @private
 */
function _onError(err) {
    var details = err.message || err.filename || "unknown (possible 404 on " + _scriptBase + WORKER_FILENAME + ")";
    getLog().error("[WorkerManager] Erreur Worker :", details);
    // Rejeter toutes les requêtes en cours → fallback main-thread
    _state.pending.forEach(function (entry) {
        entry.reject(new Error("Worker error: " + details));
    });
    _state.pending.clear();
    // Marquer le Worker comme indisponible → prochains appels utiliseront le fallback
    _state.workerAvailable = false;
    if (_state.worker) {
        _state.worker.terminate();
        _state.worker = null;
    }
}

// ─── Fallback main-thread ───────────────────────────────────────

/**
 * Fallback : fetch + parse sur le thread principal.
 *
 * @param {string} url
 * @param {string} layerId
 * @returns {Promise<Object>} FeatureCollection
 * @private
 */
function _mainThreadFetch(url, layerId) {
    const Log = getLog();
    Log.debug("[WorkerManager] Fallback main-thread pour :", layerId);

    return fetch(url)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("HTTP " + response.status + " pour " + url);
            }
            return response.json();
        })
        .then(function (data) {
            // Normaliser
            if (data && data.type === "FeatureCollection") return data;
            if (data && data.type === "Feature") {
                return { type: "FeatureCollection", features: [data] };
            }
            if (Array.isArray(data)) {
                return { type: "FeatureCollection", features: data };
            }
            return data;
        });
}

// ─── API publique ───────────────────────────────────────────────

const WorkerManager = {

    /**
     * Récupère et parse un GeoJSON via le Web Worker (ou fallback main-thread).
     *
     * @param {string} url - URL du GeoJSON
     * @param {string} layerId - Identifiant unique de la couche
     * @param {Object} [options={}]
     * @param {number} [options.chunkSize=500] - Nombre de features par chunk
     * @param {Function} [options.onChunk] - Callback(features[], chunkIndex, totalFeatures)
     * @returns {Promise<Object>} - Résolu avec un FeatureCollection complet
     */
    fetchGeoJSON: function (url, layerId, options) {
        options = options || {};

        // Resolve relative URLs to absolute before sending to the Worker.
        // The Worker resolves relative paths against its own location (dist/),
        // not the page URL — so we must pass an absolute URL.
        var absoluteUrl = url;
        if (typeof location !== "undefined" && url && !url.includes("://")) {
            try {
                absoluteUrl = new URL(url, location.href).href;
            } catch (_) {
                // keep original url if resolution fails
            }
        }

        var worker = _createWorker();

        if (!worker) {
            return _mainThreadFetch(absoluteUrl, layerId);
        }

        return new Promise(function (resolve, reject) {
            _state.pending.set(layerId, {
                resolve: resolve,
                reject: reject,
                features: [],
                onChunk: options.onChunk || null
            });

            worker.postMessage({
                type: "fetch",
                url: absoluteUrl,
                layerId: layerId,
                chunkSize: options.chunkSize || DEFAULT_CHUNK_SIZE
            });

            _resetIdleTimer();
        });
    },

    /**
     * Récupère le texte brut d'une URL via le Web Worker (ou fallback main-thread).
     * Perf 6.3.1: Utilisé pour les fichiers GPX afin de décharger le réseau du thread principal.
     * Note: le parsing DOMParser reste sur le main thread car non disponible dans tous les Workers.
     *
     * @param {string} url - URL du fichier texte
     * @param {string} layerId - Identifiant unique de la couche
     * @returns {Promise<string>} - Résolu avec le texte brut
     */
    fetchText: function (url, layerId) {
        // Resolve relative URLs to absolute (same reason as fetchGeoJSON)
        var absoluteUrl = url;
        if (typeof location !== "undefined" && url && !url.includes("://")) {
            try {
                absoluteUrl = new URL(url, location.href).href;
            } catch (_) {}
        }

        var worker = _createWorker();

        if (!worker) {
            // Fallback main-thread
            return fetch(absoluteUrl).then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status + ' pour ' + absoluteUrl);
                return response.text();
            });
        }

        return new Promise(function (resolve, reject) {
            _state.pending.set(layerId, {
                resolve: resolve,
                reject: reject,
                features: [], // unused for text, kept for consistency
                onChunk: null
            });

            worker.postMessage({
                type: 'fetch-text',
                url: absoluteUrl,
                layerId: layerId
            });

            _resetIdleTimer();
        });
    },

    /**
     * Vérifie si le Web Worker est disponible.
     * @returns {boolean}
     */
    isAvailable: function () {
        return _state.workerAvailable && typeof Worker !== "undefined";
    },

    /**
     * Termine le Worker et nettoie l'état.
     * Appelé lors du teardown de l'application.
     */
    dispose: function () {
        if (_state.idleTimer) clearTimeout(_state.idleTimer);
        _state.pending.forEach(function (entry) {
            entry.reject(new Error("WorkerManager disposed"));
        });
        _state.pending.clear();
        if (_state.worker) {
            _state.worker.terminate();
            _state.worker = null;
        }
        getLog().debug("[WorkerManager] Disposed");
    }
};

export { WorkerManager };
