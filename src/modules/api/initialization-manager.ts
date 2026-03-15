// @ts-nocheck — migration TS, progressive typing
/**
 * API Initialization Manager - Sprint 4.3 (Version Robuste)
 * Manager for GeoLeaf initialization operations
 * @module APIInitializationManager
 */
"use strict";

import { Log } from "../log/index.js";
const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
_g.GeoLeaf = _g.GeoLeaf || {};

/**
 * Manager d'initialization pour GeoLeaf
 */

function _normalizeMapAndUiOpts(options) {
    if (options.map) {
        return { mapOpts: options.map || {}, uiOpts: options.ui || {} };
    }
    return {
        mapOpts: {
            target: options.target || options.mapId,
            center: options.center,
            zoom: options.zoom,
        },
        uiOpts: { theme: options.theme },
    };
}

function _resolveCenter(mapOpts, CONSTANTS) {
    return Array.isArray(mapOpts.center) ? mapOpts.center : CONSTANTS.DEFAULT_CENTER || [0, 0];
}

function _resolveZoom(mapOpts, CONSTANTS) {
    return Number.isFinite(mapOpts.zoom) ? mapOpts.zoom : CONSTANTS.DEFAULT_ZOOM || 12;
}
function _applyUITheme(UI, theme) {
    if (typeof UI.applyTheme === "function") return UI.applyTheme(theme);
    if (typeof UI.setTheme === "function") return UI.setTheme(theme);
    if (typeof UI.theme === "function") return UI.theme(theme);
    throw new Error("UI module does not provide applyTheme, setTheme or theme method");
}
class APIInitializationManager {
    constructor() {
        this.isReady = true; // Manager ready without separate init
        this.pendingPromise = null;
        this.cancelled = false;
        this.stats = {
            initCalls: 0,
            configLoads: 0,
            errors: 0,
        };
    }

    /**
     * Initialise GeoLeaf with thes options fournies
     * @param {Object} options - Options d'initialization
     * @param {Function} getModule - Module access function
     * @returns {*} Initialization result
     */
    init(options, getModule) {
        try {
            this.stats.initCalls++;

            if (Log) Log.info("[APIInitializationManager] Initializing GeoLeaf");

            // Parameter validation
            const validationResult = this._validateInitParams(options, getModule);
            if (!validationResult.valid) {
                throw new Error(validationResult.error);
            }

            // Obtenir the module Core
            const Core = getModule("Core");
            if (!Core || typeof Core.init !== "function") {
                throw new Error(
                    "[GeoLeaf.init] GeoLeaf.Core.init() is not available. Core module must be loaded before API."
                );
            }

            // Normaliser les options
            const normalizedOptions = this._normalizeInitOptions(options);
            if (Log)
                Log.info(
                    "[APIInitializationManager] Initializing with options:",
                    normalizedOptions
                );

            // Appeler l'initialization du Core
            const result = Core.init(normalizedOptions);

            if (Log) Log.info("[APIInitializationManager] Initialization completed successfully");
            return result;
        } catch (error) {
            this.stats.errors++;
            if (Log) Log.error("[APIInitializationManager] Initialization failed:", error);
            throw error;
        }
    }

    /**
     * Loads the configuration from URL or data
     * @param {string|Object} input - Source de configuration
     * @param {Function} getModule - Module access function
     * @returns {Promise<Object>} Configuration data
     */
    async loadConfig(input, getModule) {
        try {
            this.stats.configLoads++;
            Log?.info("[APIInitializationManager] Loading configuration");
            if (!input) {
                throw new Error("Configuration input is required");
            }
            if (!getModule || typeof getModule !== "function") {
                throw new Error("getModule function is required");
            }
            const Config = getModule("Config");
            if (!Config || typeof Config.init !== "function") {
                throw new Error(
                    "[GeoLeaf.loadConfig] GeoLeaf.Config.init() is not available. Config module must be loaded."
                );
            }
            const options = this._normalizeConfigOptions(input);
            if (this.pendingPromise) {
                this.cancelled = true;
                Log?.info("[APIInitializationManager] Cancelling previous config load request");
            }
            this.cancelled = false;
            this.pendingPromise = Config.init(options);
            const result = await this.pendingPromise;
            this.pendingPromise = null;
            if (this.cancelled) {
                Log?.info("[APIInitializationManager] Config load was cancelled");
                return null;
            }
            Log?.info("[APIInitializationManager] Configuration loaded successfully");
            return result;
        } catch (error) {
            this.stats.errors++;
            this.pendingPromise = null;
            Log?.error("[APIInitializationManager] Config loading failed:", error);
            throw error;
        }
    }
    /**
     * Changes the interface theme
     * @param {string} theme - Theme name
     * @param {Function} getModule - Module access function
     * @returns {boolean} Change success
     */
    setTheme(theme, getModule) {
        try {
            Log?.info(`[APIInitializationManager] Setting theme: ${theme}`);
            if (!theme || typeof theme !== "string") {
                throw new Error("Theme name must be a non-empty string");
            }
            if (!getModule || typeof getModule !== "function") {
                throw new Error("getModule function is required");
            }
            const UI = getModule("UI");
            if (!UI) {
                throw new Error(
                    "[GeoLeaf.setTheme] GeoLeaf.UI is not available. UI module must be loaded."
                );
            }
            const result = _applyUITheme(UI, theme);
            Log?.info(`[APIInitializationManager] Theme '${theme}' applied successfully`);
            return result;
        } catch (error) {
            this.stats.errors++;
            Log?.error(`[APIInitializationManager] Failed to set theme '${theme}':`, error);
            return false;
        }
    }
    /**
     * Validates initialization parameters
     * @private
     */
    _validateInitParams(options, getModule) {
        if (!options || typeof options !== "object") {
            return { valid: false, error: "[GeoLeaf.init] An options object is required." };
        }

        if (!getModule || typeof getModule !== "function") {
            return { valid: false, error: "getModule function is required" };
        }

        return { valid: true };
    }

    /**
     * Normalise les options d'initialization
     * @private
     */
    _normalizeInitOptions(options) {
        const { mapOpts, uiOpts } = _normalizeMapAndUiOpts(options);
        const target = mapOpts.target || mapOpts.mapId;
        if (!target) {
            throw new Error(
                "[GeoLeaf.init] The 'map.target' (or 'target'/'mapId') option is required."
            );
        }
        const CONSTANTS = _g.GeoLeaf.CONSTANTS || {};
        const center = _resolveCenter(mapOpts, CONSTANTS);
        const zoom = _resolveZoom(mapOpts, CONSTANTS);
        const theme = uiOpts.theme || mapOpts.theme || "light";
        return {
            mapId: String(target),
            center,
            zoom,
            theme,
            mapOptions: mapOpts.mapOptions || {},
        };
    } /**
     * Normalise les options de configuration
     * @private
     */
    _normalizeConfigOptions(input) {
        if (typeof input === "string") {
            // URL string
            return {
                source: "url",
                url: input,
                autoEvent: true,
            };
        } else if (input && typeof input === "object") {
            // Configuration object
            return {
                source: input.url ? "url" : "data",
                url: input.url,
                data: input.data,
                profileId: input.profileId,
                autoEvent: input.autoEvent !== false, // true by default
                ...input,
            };
        } else {
            throw new Error("Configuration input must be a URL string or options object");
        }
    }

    /**
     * Obtient les statistiques du manager
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            isReady: this.isReady,
            hasPendingRequest: !!this.pendingPromise,
        };
    }

    /**
     * Reinitializes the manager
     */
    reset() {
        if (this.pendingPromise) {
            this.cancelled = true;
        }

        this.pendingPromise = null;
        this.cancelled = false;
        this.stats = {
            initCalls: 0,
            configLoads: 0,
            errors: 0,
        };

        if (Log) Log.info("[APIInitializationManager] Manager reset");
    }
}

export { APIInitializationManager };
