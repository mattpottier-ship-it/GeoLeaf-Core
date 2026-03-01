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

/**
 * Module Theme Applier
 * @namespace _ThemeApplier
 * @private
 */
const _ThemeApplier: any = {
    /** @type {string|null} Thème actuellement actif */
    _currentThemeId: null,

    /** @type {boolean} Flag pour savoir si c'est le premier chargement */
    _isFirstLoad: true,

    /**
     * Initialise le ThemeApplier
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
     * Applique un thème
     * @param {Object} theme - Configuration du thème
     * @param {Object} [options] - Options d'application
     * @param {boolean} [options.fitBounds] - Force le fitBounds
     * @returns {Promise<void>}
     */
    applyTheme(theme: any, options: any = {}) {
        // Initialiser si nécessaire
        if (!this._pendingLayerConfigs) {
            this._init();
        }

        if (Legend && typeof Legend.showLoadingOverlay === "function") {
            Legend.showLoadingOverlay();
        }

        if (!theme || !theme.id) {
            return Promise.reject(new Error("Thème invalide"));
        }

        // Vérifier les dépendances
        if (!GeoJSONCore || !LayerManager) {
            return Promise.reject(new Error("Modules GeoJSON ou LayerManager non disponibles"));
        }

        // Notifier le début du chargement du thème
        try {
            document.dispatchEvent(
                new CustomEvent("geoleaf:theme:applying", {
                    detail: {
                        themeId: theme.id,
                        themeName: theme.name || theme.label || theme.id,
                    },
                })
            );
        } catch (_e: any) {
            /* silencieux */
        }

        // Désactiver toutes les couches d'abord
        this._hideAllLayers();

        // Appliquer les couches du thème avec chargement optimisé par lots
        const layerConfigs = theme.layers || [];

        // Récupérer la configuration de performance depuis le profil
        const profileConfig = _Config?.Profile?.getActiveProfileConfig();
        const perfConfig = profileConfig?.performance || {};
        // fitBounds désactivé : le positionnement se fait via map.bounds du profil
        const enableFitBounds = false;

        // Séparer les couches visibles et invisibles
        const visibleLayers = layerConfigs.filter((config: any) => config.visible !== false);

        // Charger d'abord les couches visibles par lots
        const BATCH_SIZE = perfConfig.themeBatchSize || 3;

        // Helper progression pour l'écran de chargement (97→99)
        const updateProgress = (p: any) => {
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
        };

        const loadInBatches = async (layers: any) => {
            for (let i = 0; i < layers.length; i += BATCH_SIZE) {
                const batch = layers.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map((layerConfig: any) => this._applyLayerConfig(layerConfig)));

                if (i === 0) {
                    updateProgress(98);
                }
            }
        };

        const self = this;

        return loadInBatches(visibleLayers)
            .then(() => {
                updateProgress(98);
                return Promise.resolve();
            })
            .then(() => {
                updateProgress(99);
                self._currentThemeId = theme.id;

                // Rafraîchir le LayerManager
                if (LayerManager && LayerManager.refresh) {
                    LayerManager.refresh();
                }

                // Synchroniser l'état de visibilité dans la légende
                self._syncLegendVisibility();

                // Événement de thème appliqué
                try {
                    const themeNotificationEvent = new CustomEvent("geoleaf:theme:applied", {
                        detail: {
                            themeId: theme.id,
                            themeName: theme.name || theme.label || theme.id,
                            layerCount: visibleLayers.length,
                            totalLayersInTheme: layerConfigs.length,
                            timestamp: new Date().toISOString(),
                        },
                    });
                    document.dispatchEvent(themeNotificationEvent);
                } catch (_e: any) {
                    // Silencieux
                }

                // FitBounds selon la configuration
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
                if (Legend && typeof Legend.hideLoadingOverlay === "function") {
                    Legend.hideLoadingOverlay();
                }
            });
    },

    /**
     * Récupère l'ID du thème actuellement actif
     * @returns {string|null}
     */
    getCurrentThemeId() {
        return this._currentThemeId;
    },
};

export { _ThemeApplier as ThemeApplierCore };
