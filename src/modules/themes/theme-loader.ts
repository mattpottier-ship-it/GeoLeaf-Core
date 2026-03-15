/**
 * Module Theme Loader
 * Loads et met en cache le file themes.json
 *
 * DEPENDENCIES:
 * - GeoLeaf.Log (optional)
 * - GeoLeaf.Core.getActiveProfile()
 *
 * EXPOSE:
 * - GeoLeaf._ThemeLoader
 *
 * @module _ThemeLoader
 * @private
 */
"use strict";

import { Log } from "../log/index.js";
import { getLabel } from "../i18n/i18n.js";
import { FetchHelper } from "../utils/fetch-helper.js";

/**
 * Cache for thes configurations de themes
 * @type {Map<string, Object>}
 */
const _cache = new Map();

/**
 * Promises en cours de loading
 * @type {Map<string, Promise>}
 */
const _loadingPromises = new Map();

function _normalizeTheme(theme: any): any {
    if (!theme.id) {
        Log?.warn("[ThemeLoader] Theme without ID ignored");
        return null;
    }
    return {
        id: theme.id,
        label: theme.label || theme.id,
        type: theme.type || "secondary",
        description: theme.description || "",
        icon: theme.icon || "",
        layers: Array.isArray(theme.layers) ? theme.layers : [],
    };
}

function _resolveDefaultTheme(validatedConfig: any): void {
    if (!validatedConfig.defaultTheme) {
        validatedConfig.defaultTheme = validatedConfig.themes[0].id;
        return;
    }
    const defaultExists = validatedConfig.themes.some(
        (t: any) => t.id === validatedConfig.defaultTheme
    );
    if (!defaultExists) {
        Log?.warn("[ThemeLoader] defaultTheme not found, using first theme");
        validatedConfig.defaultTheme = validatedConfig.themes[0].id;
    }
}

/**
 * Module Theme Loader
 * @namespace _ThemeLoader
 * @private
 */
function _doFetchThemesConfig(
    themesPath: string,
    validateFn: (d: any) => any,
    profileId: string,
    Log: any,
    _cache: any,
    _loadingPromises: any
): Promise<any> {
    if (FetchHelper) {
        return FetchHelper.get(themesPath, { timeout: 8000, retries: 1, parseResponse: true })
            .then((data: any) => {
                if (Log) Log.debug("[ThemeLoader] File loaded:", themesPath);
                const validated = validateFn(data);
                _cache.set(profileId, validated);
                _loadingPromises.delete(profileId);
                return validated;
            })
            .catch((err: any) => {
                if (Log) Log.warn("[ThemeLoader] Error loading themes.json:", err.message);
                _loadingPromises.delete(profileId);
                throw err;
            });
    } else {
        return fetch(themesPath)
            .then((response) => {
                if (!response.ok)
                    throw new Error(`HTTP Error ${response.status} while loading ${themesPath}`);
                return response.json();
            })
            .then((data: any) => {
                if (Log) Log.debug("[ThemeLoader] File loaded:", themesPath);
                const validated = validateFn(data);
                _cache.set(profileId, validated);
                _loadingPromises.delete(profileId);
                return validated;
            })
            .catch((err: any) => {
                if (Log) Log.warn("[ThemeLoader] Error loading themes.json:", err.message);
                _loadingPromises.delete(profileId);
                throw err;
            });
    }
}

const _ThemeLoader = {
    /**
     * Loads the file themes.json pour a profile
     * @param {string} profileId - ID of the profile
     * @returns {Promise<Object>} Configuration des themes
     */
    loadThemesConfig(profileId: any) {
        if (Log) Log.debug("[ThemeLoader] loadThemesConfig called for:", profileId);

        if (_cache.has(profileId)) {
            if (Log) Log.debug("[ThemeLoader] Config cached for:", profileId);
            return Promise.resolve(_cache.get(profileId));
        }

        if (_loadingPromises.has(profileId)) {
            if (Log) Log.debug("[ThemeLoader] Loading already in progress for:", profileId);
            return _loadingPromises.get(profileId);
        }

        const isInDemo = window.location.pathname.includes("/demo/");
        const basePath = isInDemo ? "../" : "";
        const themesPath = `${basePath}profiles/${profileId}/themes.json`;

        const loadPromise = _doFetchThemesConfig(
            themesPath,
            (d) => this._validateConfig(d),
            profileId,
            Log,
            _cache,
            _loadingPromises
        );
        _loadingPromises.set(profileId, loadPromise);
        return loadPromise;
    },

    /**
     * Valide et normalise la configuration des themes
     * @param {Object} config - Configuration brute
     * @returns {Object} Configuration validated
     * @private
     */
    _validateConfig(config: any) {
        if (!config || typeof config !== "object") {
            throw new Error("Invalid theme configuration");
        }

        // Values by default pour config
        const validatedConfig = {
            config: {
                primaryThemes: {
                    enabled: true,
                    position: "top-map",
                    ...(config.config?.primaryThemes || {}),
                },
                secondaryThemes: {
                    enabled: true,
                    placeholder: getLabel("ui.theme.select_placeholder"),
                    showNavigationButtons: true,
                    position: "top-layermanager",
                    ...(config.config?.secondaryThemes || {}),
                },
            },
            themes: [] as any[],
            defaultTheme: config.defaultTheme || null,
        };

        // Valider the themes
        if (!Array.isArray(config.themes)) {
            Log?.warn("[ThemeLoader] No theme defined in configuration");
            return validatedConfig;
        }

        // Normaliser chaque theme
        validatedConfig.themes = config.themes.map(_normalizeTheme).filter(Boolean);

        // Check qu'il y a au moins a theme
        if (validatedConfig.themes.length === 0) {
            throw new Error("Aucun theme valide found dans la configuration");
        }

        // Check que le defaultTheme existe
        _resolveDefaultTheme(validatedConfig);

        Log?.debug(
            "[ThemeLoader] Configuration validated:",
            validatedConfig.themes.length,
            "themes"
        );

        return validatedConfig;
    },

    /**
     * Empty le cache (pour tests ou reloading)
     * @param {string} [profileId] - Profile ID (optional, empties all if not specified)
     */
    clearCache(profileId: any) {
        if (profileId) {
            _cache.delete(profileId);
            _loadingPromises.delete(profileId);
            if (Log) Log.debug("[ThemeLoader] Cache cleared for:", profileId);
        } else {
            _cache.clear();
            _loadingPromises.clear();
            if (Log) Log.debug("[ThemeLoader] Full cache cleared");
        }
    },
};

export { _ThemeLoader as ThemeLoader };
