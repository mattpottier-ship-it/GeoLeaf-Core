/**
 * GeoLeaf – Themes API (assemblage namespace Themes)
 *
 * Assemble GeoLeaf.Themes depuis les modules refactorisés :
 *   - themes/theme-loader.js
 *   - themes/theme-applier/core.js
 *   - themes/theme-selector.js
 *   - themes/theme-cache.js
 *
 * @module themes/themes-api
 */
"use strict";

import { Log as _Log } from "../log/index.js";
import { Config } from "../config/config-primitives.js";
import { GeoJSONShared } from "../shared/geojson-state.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
_g.GeoLeaf = _g.GeoLeaf || {};

// ── État interne ────────────────────────────────────────────────
const _state = {
    initialized: false,
    options: {},
    _layerThemes: new Map(),
    _availableCache: new Map(),
};

// Loader/manager internes (références mockables dans les tests)
const _loader = {
    _indexCache: new Map(),
    _themeCache: new Map(),

    clearCache() {
        this._indexCache.clear();
        this._themeCache.clear();
    },

    getStylesBasePath() {
        try {
            const profile = Config?.getActiveProfile?.();
            if (!profile || !profile.stylesConfig) return null;
            const base = Config?.get?.("data.profilesBasePath") || "data/profiles";
            return `${base}/${profile.id}/styles`;
        } catch (_) {
            return null;
        }
    },

    load: async (layerId, options = {}) => {
        const Log = _Log;
        if (options.enabled === false) return [];
        const cacheKey = `${layerId}:${options.directory || layerId}`;
        if (_loader._indexCache.has(cacheKey)) return _loader._indexCache.get(cacheKey);
        try {
            const basePath = Config?.get?.("data.profilesBasePath") || "data/profiles";
            const dir = options.directory || layerId;
            const url = `${basePath}/${dir}/themes/index.json`;
            const response = await (typeof fetch !== "undefined"
                ? fetch(url)
                : Promise.reject(new Error("fetch unavailable")));
            if (!response.ok) return [];
            const data = await response.json();
            const result = Array.isArray(data.themes)
                ? data.themes
                : Array.isArray(data)
                  ? data
                  : [];
            _loader._indexCache.set(cacheKey, result);
            return result;
        } catch (err) {
            if (Log) Log.warn("[Themes._loader] Erreur lors du chargement:", err.message);
            return [];
        }
    },

    invalidateCache: () => {
        _loader._indexCache.clear();
        _loader._themeCache.clear();
        _state._availableCache.clear();
    },
};

const _manager = {
    apply: async (layerId, themeId) => {
        const Log = _Log;
        const layerData =
            typeof GeoJSONShared?.getLayerById === "function"
                ? GeoJSONShared.getLayerById(layerId)
                : null;
        if (!layerData) {
            if (Log) Log.warn("[Themes._manager] Couche introuvable:", layerId);
            return false;
        }
        _state._layerThemes.set(layerId, themeId);
        return true;
    },
    getCurrent: (layerId) => {
        return _state._layerThemes.has(layerId) ? _state._layerThemes.get(layerId) : null;
    },
};

// ── API publique GeoLeaf.Themes ────────────────────────────────

/**
 * @namespace GeoLeaf.Themes
 */
const Themes = {
    _loader,
    _manager,

    init(options = {}) {
        _state.options = { ...options };
        _state.initialized = true;
        return true;
    },

    async applyTheme(layerId, themeId) {
        if (!_state.initialized) this.init();
        return _manager.apply(layerId, themeId);
    },

    getCurrentTheme(layerId) {
        return _manager.getCurrent(layerId);
    },

    async getAvailableThemes(layerId, options = {}) {
        if (options.enabled === false) return [];
        if (_state._availableCache.has(layerId)) return _state._availableCache.get(layerId);
        const result = await _loader.load(layerId, options);
        if (result.length > 0) _state._availableCache.set(layerId, result);
        return result;
    },

    async initializeLayerTheme(layerId, options = {}) {
        if (options.enabled === false) return null;
        const rememberChoice = options.rememberChoice || _state.options.rememberChoice;
        let rememberedTheme = null;
        if (rememberChoice) {
            try {
                rememberedTheme = localStorage.getItem(`gl-theme-${layerId}`) || null;
            } catch (_) {
                /* localStorage non disponible */
            }
        }
        const themes = await this.getAvailableThemes(layerId, options);
        if (!themes.length) return null;
        const defaultId =
            rememberedTheme || options.default || options.defaultTheme || themes[0]?.id || null;
        if (defaultId) {
            await this.applyTheme(layerId, defaultId);
            if (rememberChoice) {
                try {
                    localStorage.setItem(`gl-theme-${layerId}`, defaultId);
                } catch (_) {
                    /* noop */
                }
            }
        }
        return defaultId;
    },

    async loadTheme(themeOrId) {
        const Log = _Log;
        if (!themeOrId) return null;
        try {
            const themeId = typeof themeOrId === "string" ? themeOrId : themeOrId.id;
            if (Log) Log.debug("[Themes] loadTheme:", themeId);
            return { id: themeId };
        } catch (err) {
            if (Log) Log.warn("[Themes] loadTheme error:", err.message);
            return null;
        }
    },

    clearRememberedThemes() {
        try {
            const keys = Object.keys(localStorage).filter((k) => k.startsWith("gl-theme-"));
            keys.forEach((k) => localStorage.removeItem(k));
        } catch (_) {
            /* localStorage non disponible */
        }
    },

    invalidateCache() {
        _loader.clearCache();
        _state._layerThemes.clear();
        _state._availableCache.clear();
    },
};

// Attacher sur le namespace global
_g.GeoLeaf.Themes = Themes;

export { Themes };
