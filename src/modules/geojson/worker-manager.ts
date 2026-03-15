/**
 * GeoLeaf GeoJSON Worker Manager
 * Orchestre le cycle de vie du Web Worker GeoJSON.
 *
 * Features :
 *   - Creation lazy of a Worker unique (singleton)
 *   - Communication postMessage / onmessage
 *   - Fallback transparent vers fetch main-thread si Worker inavailable
 *   - Nettoyage automatic du Worker after un delay d'inactivity
 *
 * @module geojson/worker-manager
 */
"use strict";

import { getLog } from "../utils/general-utils.js";

/** Delay avant terminaison du Worker inactive (ms) */
const IDLE_TIMEOUT = 30000;

/** Chunk size sent to the Worker */
const DEFAULT_CHUNK_SIZE = 500;

/** Nom du file worker */
const WORKER_FILENAME = "geojson-worker.js";

/**
 * Detects le directory de base du bundle GeoLeaf en scannant les balises <script>.
 * Allows resolve l'URL du Worker relative to the bundle, pas to the page HTML.
 *
 * @returns {string} Base URL se terminant par '/' (ex. "../dist/" ou "/assets/js/")
 * @private
 */
function _detectScriptBase() {
    // Method 1 : document.currentScript (available only pendant l'execution synchrone du script)
    if (
        typeof document !== "undefined" &&
        document.currentScript &&
        (document.currentScript as any).src
    ) {
        return (document.currentScript as any).src.substring(
            0,
            (document.currentScript as any).src.lastIndexOf("/") + 1
        );
    }

    // Method 2 : scanner les <script> pour trouver geoleaf*.js
    if (typeof document !== "undefined") {
        const scripts = document.getElementsByTagName("script");
        for (let i = scripts.length - 1; i >= 0; i--) {
            /* eslint-disable-next-line security/detect-object-injection -- index from array length */
            const src = scripts[i].src || "";
            if (/geoleaf[\w.-]*\.js/i.test(src)) {
                return src.substring(0, src.lastIndexOf("/") + 1);
            }
        }
    }

    // Method 3 : fallback — same directory que la page
    return "";
}

/** Base URL captured when the module loads */
const _scriptBase = _detectScriptBase();

/**
 * STATE internal du manager.
 * @private
 */
const _state: any = {
    worker: null,
    workerAvailable: true,
    pending: new Map(),
    idleTimer: null,
};

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Tente de create le Worker. Renvoie null si impossible.
 * @returns {Worker|null}
 * @private
 */
function _createWorker() {
    if (!_state.workerAvailable) return null;
    if (_state.worker) return _state.worker;

    try {
        // Resolve the Worker URL relative to the GeoLeaf script (not the page HTML)
        const workerUrl = _scriptBase + WORKER_FILENAME;
        const worker = new Worker(workerUrl);

        worker.onmessage = _onMessage;
        worker.onerror = _onError;

        _state.worker = worker;
        getLog().debug("[WorkerManager] Web Worker GeoJSON created:", workerUrl);
        return worker;
    } catch (err: any) {
        getLog().warn(
            "[WorkerManager] Unable to create Web Worker, main-thread fallback:",
            err.message
        );
        _state.workerAvailable = false;
        return null;
    }
}

/**
 * Reinitializes le timer d'inactivity.
 * @private
 */
function _resetIdleTimer() {
    if (_state.idleTimer) clearTimeout(_state.idleTimer);
    _state.idleTimer = setTimeout(() => {
        if (_state.pending.size === 0 && _state.worker) {
            _state.worker.terminate();
            _state.worker = null;
            getLog().debug("[WorkerManager] Worker terminated after inactivity");
        }
    }, IDLE_TIMEOUT);
}

// ─── Worker message handlers ────────────────────────────────────

/**
 * Manager fors messages received from the Worker.
 * @param {MessageEvent} event
 * @private
 */
/* eslint-disable complexity -- message type dispatch */
function _onMessage(event: any) {
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
                // Callback optional par chunk (pour rendu progressif)
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
                    features: entry.features,
                });
                _resetIdleTimer();
            }
            break;

        case "text-done":
            // Perf 6.3.1: GPX text fetch completeed in Worker
            if (entry) {
                _state.pending.delete(msg.layerId);
                entry.resolve(msg.text || "");
                _resetIdleTimer();
            }
            break;

        case "error":
            if (entry) {
                _state.pending.delete(msg.layerId);
                entry.reject(new Error(msg.message));
                _resetIdleTimer();
            } else {
                getLog().warn("[WorkerManager] Worker error without layerId:", msg.message);
            }
            break;

        case "pong":
            getLog().debug("[WorkerManager] Worker pong received");
            break;
    }
}

/**
 * Manager d'error globale du Worker.
 * @param {ErrorEvent} err
 * @private
 */
function _onError(err: any) {
    const details =
        err.message ||
        err.filename ||
        "unknown (possible 404 on " + _scriptBase + WORKER_FILENAME + ")";
    getLog().error("[WorkerManager] Worker error:", details);
    // Rejeter toutes les requests en cours → fallback main-thread
    _state.pending.forEach(function (entry: any) {
        entry.reject(new Error("Worker error: " + details));
    });
    _state.pending.clear();
    // Marquer le Worker comme inavailable → prochains appels utiliseront le fallback
    _state.workerAvailable = false;
    if (_state.worker) {
        _state.worker.terminate();
        _state.worker = null;
    }
}
/* eslint-enable complexity */

// ─── Fallback main-thread ───────────────────────────────────────

/**
 * Fallback : fetch + parse sur le thread main.
 *
 * @param {string} url
 * @param {string} layerId
 * @returns {Promise<Object>} FeatureCollection
 * @private
 */
function _mainThreadFetch(url: any, layerId: any) {
    const Log = getLog();
    Log.debug("[WorkerManager] Main-thread fallback for:", layerId);

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

// ─── API public ───────────────────────────────────────────────

const WorkerManager = {
    /**
     * Retrieves et parse un GeoJSON via le Web Worker (ou fallback main-thread).
     *
     * @param {string} url - URL du GeoJSON
     * @param {string} layerId - Identifier unique de the layer
     * @param {Object} [options={}]
     * @param {number} [options.chunkSize=500] - Nombre de features par chunk
     * @param {Function} [options.onChunk] - Callback(features[], chunkIndex, totalFeatures)
     * @returns {Promise<Object>} - Resolved with a complete FeatureCollection
     */
    fetchGeoJSON: function (url: any, layerId: any, options: any) {
        options = options || {};

        // Resolve relative URLs to absolute before sending to the Worker.
        // The Worker resolves relative paths against its own location (dist/),
        // not the page URL — so we must pass an absolute URL.
        let absoluteUrl = url;
        if (typeof location !== "undefined" && url && !url.includes("://")) {
            try {
                absoluteUrl = new URL(url, location.href).href;
            } catch (_) {
                // keep original url if resolution fails
            }
        }

        const worker = _createWorker();

        if (!worker) {
            return _mainThreadFetch(absoluteUrl, layerId);
        }

        return new Promise(function (resolve, reject) {
            _state.pending.set(layerId, {
                resolve: resolve,
                reject: reject,
                features: [],
                onChunk: options.onChunk || null,
            });

            worker.postMessage({
                type: "fetch",
                url: absoluteUrl,
                layerId: layerId,
                chunkSize: options.chunkSize || DEFAULT_CHUNK_SIZE,
            });

            _resetIdleTimer();
        });
    },

    /**
     * Retrieves the text brut of a URL via le Web Worker (ou fallback main-thread).
     * Perf 6.3.1: Used for GPX files to offload network from the main thread.
     * Note: le parsing DOMParser reste sur le main thread car non available dans tous les Workers.
     *
     * @param {string} url - URL du file text
     * @param {string} layerId - Identifier unique de the layer
     * @returns {Promise<string>} - Resolved with raw text
     */
    fetchText: function (url: any, layerId: any) {
        // Resolve relative URLs to absolute (same reason as fetchGeoJSON)
        let absoluteUrl = url;
        if (typeof location !== "undefined" && url && !url.includes("://")) {
            try {
                absoluteUrl = new URL(url, location.href).href;
            } catch (_) {
                /* invalid URL, use original */
            }
        }

        const worker = _createWorker();

        if (!worker) {
            // Fallback main-thread
            return fetch(absoluteUrl).then(function (response) {
                if (!response.ok)
                    throw new Error("HTTP " + response.status + " pour " + absoluteUrl);
                return response.text();
            });
        }

        return new Promise(function (resolve, reject) {
            _state.pending.set(layerId, {
                resolve: resolve,
                reject: reject,
                features: [], // unused for text, kept for consistency
                onChunk: null,
            });

            worker.postMessage({
                type: "fetch-text",
                url: absoluteUrl,
                layerId: layerId,
            });

            _resetIdleTimer();
        });
    },

    /**
     * Checks if le Web Worker est available.
     * @returns {boolean}
     */
    isAvailable: function () {
        return _state.workerAvailable && typeof Worker !== "undefined";
    },

    /**
     * Termine le Worker et nettoie the state.
     * Called during application teardown.
     */
    dispose: function () {
        if (_state.idleTimer) clearTimeout(_state.idleTimer);
        _state.pending.forEach(function (entry: any) {
            entry.reject(new Error("WorkerManager disposed"));
        });
        _state.pending.clear();
        if (_state.worker) {
            _state.worker.terminate();
            _state.worker = null;
        }
        getLog().debug("[WorkerManager] Disposed");
    },
};

export { WorkerManager };
