/**















 * GeoLeaf – Themes API (assemblage namespace Themes)















 *















 * Assemble GeoLeaf.Themes from the modules refactoreds :















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

const _Config: any = Config;

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

// ── STATE internal ────────────────────────────────────────────────

const _state = {
    initialized: false,

    options: {},

    _layerThemes: new Map(),

    _availableCache: new Map(),
};

// Loader/manager internals (references mockables in thes tests)

function _getThemesUrl(layerId: any, options: any): string {
    const basePath = _Config?.get?.("data.profilesBasePath") || "data/profiles";

    const dir = options.directory || layerId;

    return `${basePath}/${dir}/themes/index.json`;
}

function _parseFetchedThemes(data: any): any[] {
    if (Array.isArray(data.themes)) return data.themes;

    if (Array.isArray(data)) return data;

    return [];
}

const _loader = {
    _indexCache: new Map(),

    _themeCache: new Map(),

    clearCache() {
        this._indexCache.clear();

        this._themeCache.clear();
    },

    getStylesBasePath() {
        try {
            const profile = _Config?.getActiveProfile?.();

            if (!profile || !profile.stylesConfig) return null;

            const base = _Config?.get?.("data.profilesBasePath") || "data/profiles";

            return `${base}/${profile.id}/styles`;
        } catch (_: any) {
            return null;
        }
    },

    load: async (layerId: any, options: any = {}) => {
        const Log = _Log;

        if (options.enabled === false) return [];

        const cacheKey = `${layerId}:${options.directory || layerId}`;

        if (_loader._indexCache.has(cacheKey)) return _loader._indexCache.get(cacheKey);

        try {
            const response = await (typeof fetch !== "undefined"
                ? fetch(_getThemesUrl(layerId, options))
                : Promise.reject(new Error("fetch unavailable")));

            if (!response.ok) return [];

            const result = _parseFetchedThemes(await response.json());

            _loader._indexCache.set(cacheKey, result);

            return result;
        } catch (err: any) {
            if (Log) Log.warn("[Themes._loader] Error during loading:", err.message);

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
    apply: async (layerId: any, themeId: any) => {
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

    getCurrent: (layerId: any) => {
        return _state._layerThemes.has(layerId) ? _state._layerThemes.get(layerId) : null;
    },
};

// ── API public GeoLeaf.Themes ────────────────────────────────

/**















 * @namespace GeoLeaf.Themes















 */

function _resolveDefaultThemeId(
    rememberedTheme: string | null,
    options: any,
    themes: any[]
): string | null {
    return rememberedTheme || options.default || options.defaultTheme || themes[0]?.id || null;
}

function _tryGetStoredTheme(layerId: any): string | null {
    try {
        return localStorage.getItem(`gl-theme-${layerId}`) || null;
    } catch (_: any) {
        return null;
    }
}

function _tryStoreTheme(layerId: any, themeId: string): void {
    try {
        localStorage.setItem(`gl-theme-${layerId}`, themeId);
    } catch (_: any) {
        /* noop */
    }
}

const Themes = {
    _loader,

    _manager,

    init(options: any = {}) {
        _state.options = { ...options };

        _state.initialized = true;

        return true;
    },

    async applyTheme(layerId: any, themeId: any) {
        if (!_state.initialized) this.init();

        return _manager.apply(layerId, themeId);
    },

    getCurrentTheme(layerId: any) {
        return _manager.getCurrent(layerId);
    },

    async getAvailableThemes(layerId: any, options: any = {}) {
        if (options.enabled === false) return [];

        if (_state._availableCache.has(layerId)) return _state._availableCache.get(layerId);

        const result = await _loader.load(layerId, options);

        if (result.length > 0) _state._availableCache.set(layerId, result);

        return result;
    },

    async initializeLayerTheme(layerId: any, options: any = {}) {
        if (options.enabled === false) return null;

        const rememberChoice = options.rememberChoice || (_state as any).options.rememberChoice;

        const rememberedTheme = rememberChoice ? _tryGetStoredTheme(layerId) : null;

        const themes = await this.getAvailableThemes(layerId, options);

        if (!themes.length) return null;

        const defaultId = _resolveDefaultThemeId(rememberedTheme, options, themes);

        if (defaultId) {
            await this.applyTheme(layerId, defaultId);

            if (rememberChoice) _tryStoreTheme(layerId, defaultId);
        }

        return defaultId;
    },

    async loadTheme(themeOrId: any) {
        const Log = _Log;

        if (!themeOrId) return null;

        try {
            const themeId = typeof themeOrId === "string" ? themeOrId : themeOrId.id;

            if (Log) Log.debug("[Themes] loadTheme:", themeId);

            return { id: themeId };
        } catch (err: any) {
            if (Log) Log.warn("[Themes] loadTheme error:", err.message);

            return null;
        }
    },

    clearRememberedThemes() {
        try {
            const keys = Object.keys(localStorage).filter((k) => k.startsWith("gl-theme-"));

            keys.forEach((k) => localStorage.removeItem(k));
        } catch (_: any) {
            /* localStorage non available */
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
