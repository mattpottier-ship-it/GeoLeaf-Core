/**
 * GeoLeaf Theme Applier - Core
 * Module state, init/cleanup, applyTheme orchestration, getCurrentThemeId
 *
 * @module themes/theme-applier/core
 */
"use strict";

import { Config } from "../../config/config-primitives.js";
import { Legend } from "../../geoleaf.legend.js";
import { LayerManager } from "../../geoleaf.layer-manager.js";
import { GeoJSONCore } from "../../geojson/core.js";
const _Config: any = Config;

function _showLegendOverlay() {
    if (Legend && typeof Legend.showLoadingOverlay === "function") {
        Legend.showLoadingOverlay();
    }
}
function _hideLegendOverlay() {
    if (Legend && typeof Legend.hideLoadingOverlay === "function") {
        Legend.hideLoadingOverlay();
    }
}
function _dispatchCustomEvent(name: string, detail: Record<string, unknown>) {
    try {
        document.dispatchEvent(new CustomEvent(name, { detail }));
    } catch (_e: any) {
        /* silent */
    }
}
function _refreshLayerManager() {
    if (LayerManager && LayerManager.refresh) {
        LayerManager.refresh();
    }
}

function _updateLoadingProgress(p: number): void {
    try {
        if (
            typeof window !== "undefined" &&
            (window as any)._glLoadingScreen &&
            typeof (window as any)._glLoadingScreen.updateProgress === "function"
        ) {
            (window as any)._glLoadingScreen.updateProgress(p);
        }
    } catch (_e: any) {
        /* ignore */
    }
}

async function _loadLayersInBatches(
    visibleLayers: any[],
    batchSize: number,
    applyFn: (cfg: any) => Promise<void>
): Promise<void> {
    for (let i = 0; i < visibleLayers.length; i += batchSize) {
        const batch = visibleLayers.slice(i, i + batchSize);
        await Promise.all(batch.map((layerConfig: any) => applyFn(layerConfig)));
        if (i === 0) {
            _updateLoadingProgress(98);
        }
    }
}

/**
 * Theme Applier module
 * @namespace _ThemeApplier
 * @private
 */
const _ThemeApplier: any = {
    /** @type {string|null} Currently active theme */
    _currentThemeId: null,

    /** @type {boolean} Flag pour savoir si c'est le premier loading */
    _isFirstLoad: true,

    /**
     * Initializes the ThemeApplier
     * @private
     */
    _init() {
        this._pendingLayerConfigs = new Map();
        this._pendingCheckTimer = null;
    },

    /**
     * Nettoie les ressources
     * @private
     */
    _cleanup() {
        if (this._pendingCheckTimer) {
            clearTimeout(this._pendingCheckTimer);
            this._pendingCheckTimer = null;
        }
        if (this._pendingLayerConfigs) {
            this._pendingLayerConfigs.clear();
        }
    },

    /**
     * Applies a theme
     * @param {Object} theme - Configuration of the theme
     * @param {Object} [options] - Options d'application
     * @param {boolean} [options.fitBounds] - Force le fitBounds
     * @returns {Promise<void>}
     */
    applyTheme(theme: any, options: any = {}) {
        if (!this._pendingLayerConfigs) {
            this._init();
        }
        _showLegendOverlay();

        if (!theme || !theme.id) {
            return Promise.reject(new Error("Invalid theme"));
        }
        if (!GeoJSONCore || !LayerManager) {
            return Promise.reject(new Error("GeoJSON or LayerManager modules not available"));
        }

        _dispatchCustomEvent("geoleaf:theme:applying", {
            themeId: theme.id,
            themeName: theme.name || theme.label || theme.id,
        });

        return this._applyThemeLayers(theme, options);
    },

    _applyThemeLayers(theme: any, options: any) {
        this._hideAllLayers();

        const layerConfigs = theme.layers || [];
        const profileConfig = _Config?.Profile?.getActiveProfileConfig();
        const perfConfig = profileConfig?.performance || {};
        const enableFitBounds = false;
        const visibleLayers = layerConfigs.filter((cfg: any) => cfg.visible !== false);
        const BATCH_SIZE = perfConfig.themeBatchSize || 3;
        const self = this;

        return _loadLayersInBatches(visibleLayers, BATCH_SIZE, (cfg) => this._applyLayerConfig(cfg))
            .then(() => {
                _updateLoadingProgress(98);
                return Promise.resolve();
            })
            .then(() => {
                _updateLoadingProgress(99);
                self._currentThemeId = theme.id;
                _refreshLayerManager();
                self._syncLegendVisibility();
                _dispatchCustomEvent("geoleaf:theme:applied", {
                    themeId: theme.id,
                    themeName: theme.name || theme.label || theme.id,
                    layerCount: visibleLayers.length,
                    totalLayersInTheme: layerConfigs.length,
                    timestamp: new Date().toISOString(),
                });
                const shouldFitBounds =
                    options.fitBounds === true || (self._isFirstLoad && enableFitBounds);
                if (shouldFitBounds) {
                    setTimeout(() => {
                        self._fitBoundsOnAllLayers();
                    }, 1000);
                    self._isFirstLoad = false;
                }
            })
            .catch((err) => {
                throw err;
            })
            .finally(() => {
                _hideLegendOverlay();
            });
    },

    /**
     * Retrieves the ID of the theme currentlement active
     * @returns {string|null}
     */
    getCurrentThemeId() {
        return this._currentThemeId;
    },
};

export { _ThemeApplier as ThemeApplierCore };
