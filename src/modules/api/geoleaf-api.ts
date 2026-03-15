/**
 * GeoLeaf – Unified public API (assembly)
 * Phase 4.3 — Refactored robust Controller architecture
 *
 * Builds the GeoLeafAPI object by delegating to APIController.
 * This module is loaded after globals.api.js (which initializes _APIController).
 *
 * @module api/geoleaf-api
 */
"use strict";

import { Log } from "../log/index.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
_g.GeoLeaf = _g.GeoLeaf || {};

// Retrieve any GeoLeaf already attached by the modules
const existing = _g.GeoLeaf || {};

// ⚠️ APIController checks are deferred into each function (lazy access).
// Module-level throws (before Object.assign) prevented Rollup from including the public API:
// with propertyReadSideEffects:false, Rollup statically analyzed APIController = undefined
// and concluded the throw was inevitable → all following code = dead code eliminated.
//
// Validation now happens at runtime, inside _getAPIController().

// Lazy and validated access to APIController (called in each public method)
function _getAPIController() {
    const ctrl = existing._APIController;
    if (!ctrl) {
        if (Log)
            Log.error(
                "[GeoLeaf.API] APIController unavailable. API modules must be loaded before geoleaf.api.js"
            );
        throw new Error("APIController missing - verify that API modules are loaded");
    }
    if (!ctrl.isInitialized) {
        if (Log)
            Log.error(
                "[GeoLeaf.API] APIController in failed state. Checking state:",
                ctrl.getHealthStatus()
            );
        throw new Error("APIController in failed state");
    }
    return ctrl;
}

// ---------------------------------------------------------------------
// API public delegated vers APIController
// ---------------------------------------------------------------------

/**
 * Initializes GeoLeaf with the provided options.
 * Delegates to `APIController.geoleafInit`.
 *
 * @param {object} options - GeoLeaf initialization options (mapId, profile, theme, etc.)
 * @returns {Promise<void>} Resolves when initialization is complete.
 */
function geoleafInit(options: any) {
    try {
        return _getAPIController().geoleafInit(options);
    } catch (error) {
        if (Log) Log.error("[GeoLeaf.init] Error during initialization:", error);
        throw error;
    }
}

/**
 * Applies a visual theme to the GeoLeaf map container.
 * Delegates to `APIController.geoleafSetTheme`.
 *
 * @param {string} theme - Theme identifier (e.g. `'default'`, `'dark'`, `'green'`).
 * @returns {void}
 */
function geoleafSetTheme(theme: any) {
    try {
        return _getAPIController().geoleafSetTheme(theme);
    } catch (error) {
        if (Log) Log.error("[GeoLeaf.setTheme] Error applying theme:", error);
        throw error;
    }
}

/**
 * Loads a GeoLeaf configuration from a URL string or a plain config object.
 * Validates input type before delegating to `APIController.geoleafLoadConfig`.
 *
 * @param {string | object} input - Remote URL to a JSON config file, or an inline config object.
 * @returns {Promise<void>} Resolves when the configuration has been loaded and applied.
 * @throws {TypeError} If `input` is null, undefined, or not a string/object.
 */
function geoleafLoadConfig(input: any) {
    if (
        input === null ||
        input === undefined ||
        (typeof input !== "string" && typeof input !== "object")
    ) {
        throw new TypeError(
            `[GeoLeaf.loadConfig] Invalid input: expected string URL or config object, got ${typeof input}`
        );
    }
    try {
        return _getAPIController().geoleafLoadConfig(input);
    } catch (error) {
        if (Log) Log.error("[GeoLeaf.loadConfig] Error loading configuration:", error);
        throw error;
    }
}

// ---------------------------------------------------------------------
// Building of the API final (mutation de the object global GeoLeaf)
// ---------------------------------------------------------------------

const GeoLeafAPI = Object.assign(existing, {
    // Methods maines
    init: geoleafInit,
    setTheme: geoleafSetTheme,
    loadConfig: geoleafLoadConfig,

    // Constantes (source unique : constants/index.js)
    CONSTANTS: _g.GeoLeaf.CONSTANTS || {},

    // Alias retrocompat — BaseLayers = Baselayers
    get BaseLayers() {
        return this.Baselayers;
    },

    // Version (lue from the manifest ou les constantes)
    version: (_g.GeoLeaf.CONSTANTS && _g.GeoLeaf.CONSTANTS.VERSION) || "1.1.0",

    /**
     * Returns a registered GeoLeaf module by name via APIController.
     * @param {string} name - Module name (e.g. `'poi'`, `'route'`, `'table'`).
     * @returns {object | null} The module object, or `null` if not found.
     */
    getModule: function (name: any) {
        const ctrl = existing._APIController;
        return ctrl && ctrl.moduleAccessFn ? ctrl.moduleAccessFn(name) : null;
    },

    /**
     * Returns `true` if a GeoLeaf module with the given name is registered.
     * @param {string} name - Module name (e.g. `'poi'`, `'legend'`).
     * @returns {boolean}
     */
    hasModule: function (name: any) {
        const ctrl = existing._APIController;
        const mod = ctrl && ctrl.moduleAccessFn ? ctrl.moduleAccessFn(name) : null;
        return !!mod;
    },

    /**
     * Returns a top-level GeoLeaf namespace by name (e.g. `GeoLeaf['POI']`).
     * @param {string} name - Namespace key on the global `GeoLeaf` object.
     * @returns {object | null} The namespace object, or `null` if absent.
     */
    getNamespace: function (name: any) {
        // eslint-disable-next-line security/detect-object-injection
        return _g.GeoLeaf && name ? _g.GeoLeaf[name] || null : null;
    },

    /**
     * Creates a new Leaflet map instance managed by GeoLeaf.
     * @param {string} id - DOM element id for the map container.
     * @param {object} [options] - Optional Leaflet / GeoLeaf map options.
     * @returns {object | null} The Leaflet map instance, or `null` on failure.
     */
    createMap: function (id: any, options: any) {
        const ctrl = existing._APIController;
        return ctrl && ctrl.geoleafCreateMap ? ctrl.geoleafCreateMap(id, options) : null;
    },

    /**
     * Retrieves a managed Leaflet map instance by its container id.
     * @param {string} id - DOM element id of the target map container.
     * @returns {object | null} The Leaflet map instance, or `null` if not found.
     */
    getMap: function (id: any) {
        const ctrl = existing._APIController;
        return ctrl && ctrl.managers && ctrl.managers.factory
            ? ctrl.managers.factory.getMapInstance(id)
            : null;
    },

    /**
     * Returns all active Leaflet map instances managed by GeoLeaf.
     * @returns {object[]} Array of Leaflet map instances (may be empty).
     */
    getAllMaps: function () {
        const ctrl = existing._APIController;
        return ctrl && ctrl.managers && ctrl.managers.factory
            ? ctrl.managers.factory.getAllMapInstances()
            : [];
    },

    /**
     * Destroys and removes a managed Leaflet map instance.
     * @param {string} id - DOM element id of the map container to remove.
     * @returns {boolean} `true` if the map was found and removed, `false` otherwise.
     */
    removeMap: function (id: any) {
        const ctrl = existing._APIController;
        if (
            ctrl &&
            ctrl.managers &&
            ctrl.managers.factory &&
            typeof ctrl.managers.factory.removeMapInstance === "function"
        ) {
            return ctrl.managers.factory.removeMapInstance(id);
        }
        return false;
    },

    /**
     * Returns the current health status of the GeoLeaf APIController.
     * Includes module load states, error counts, and initialization flags.
     * @returns {object | null} Health status object, or `null` if APIController is unavailable.
     */
    getHealth: function () {
        const ctrl = existing._APIController;
        return ctrl && ctrl.getHealthStatus ? ctrl.getHealthStatus() : null;
    },

    /**
     * Alias for {@link GeoLeafAPI.getHealth} — returns APIController metrics.
     * @returns {object | null} Health status object.
     */
    getMetrics: function () {
        return this.getHealth();
    },
});

if (Log) {
    Log.info(`[GeoLeaf.API] Public API initialized successfully`);
    const _ctrl = existing._APIController;
    if (_ctrl) Log.info(`[GeoLeaf.API] APIController health:`, _ctrl.getHealthStatus());
}

export { GeoLeafAPI };
