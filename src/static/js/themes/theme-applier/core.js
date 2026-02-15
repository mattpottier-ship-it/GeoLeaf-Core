/**
 * GeoLeaf Theme Applier - Core
 * Module state, init/cleanup, applyTheme orchestration, getCurrentThemeId
 *
 * @module themes/theme-applier/core
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};

    /**
     * Module Theme Applier
     * @namespace _ThemeApplier
     * @private
     */
    const _ThemeApplier = {
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
        applyTheme(theme, options = {}) {
            // Initialiser si nécessaire
            if (!this._pendingLayerConfigs) {
                this._init();
            }

            if (GeoLeaf.Legend && typeof GeoLeaf.Legend.showLoadingOverlay === "function") {
                GeoLeaf.Legend.showLoadingOverlay();
            }

            if (!theme || !theme.id) {
                return Promise.reject(new Error("Thème invalide"));
            }

            // Vérifier les dépendances
            if (!GeoLeaf.GeoJSON || !GeoLeaf.LayerManager) {
                return Promise.reject(new Error("Modules GeoJSON ou LayerManager non disponibles"));
            }

            // Notifier le début du chargement du thème
            try {
                document.dispatchEvent(new CustomEvent('geoleaf:theme:applying', {
                    detail: {
                        themeId: theme.id,
                        themeName: theme.name || theme.label || theme.id
                    }
                }));
            } catch (e) { /* silencieux */ }

            // Désactiver toutes les couches d'abord
            this._hideAllLayers();

            // Appliquer les couches du thème avec chargement optimisé par lots
            const layerConfigs = theme.layers || [];

            // Récupérer la configuration de performance depuis le profil
            const profileConfig = GeoLeaf.Config?.Profile?.getActiveProfileConfig();
            const perfConfig = profileConfig?.performance || {};
            const maxLayers = perfConfig.maxConcurrentLayers || 10;
            // fitBounds désactivé : le positionnement se fait via map.bounds du profil
            const enableFitBounds = false;

            // Séparer les couches visibles et invisibles
            const visibleLayers = layerConfigs.filter(config => config.visible !== false);
            const hiddenLayers = layerConfigs.filter(config => config.visible === false);

            // Charger d'abord les couches visibles par lots
            const BATCH_SIZE = perfConfig.themeBatchSize || 3;

            // Helper progression pour l'écran de chargement (97→99)
            const updateProgress = (p) => {
                try {
                    if (typeof window !== 'undefined' && window._glLoadingScreen && typeof window._glLoadingScreen.updateProgress === 'function') {
                        window._glLoadingScreen.updateProgress(p);
                    }
                } catch (e) { /* ignore */ }
            };

            const loadInBatches = async (layers) => {
                for (let i = 0; i < layers.length; i += BATCH_SIZE) {
                    const batch = layers.slice(i, i + BATCH_SIZE);
                    await Promise.all(batch.map(layerConfig => this._applyLayerConfig(layerConfig)));

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
                    if (GeoLeaf.LayerManager && GeoLeaf.LayerManager.refresh) {
                        GeoLeaf.LayerManager.refresh();
                    }

                    // Synchroniser l'état de visibilité dans la légende
                    self._syncLegendVisibility();

                    // Événement de thème appliqué
                    try {
                        const themeNotificationEvent = new CustomEvent('geoleaf:theme:applied', {
                            detail: {
                                themeId: theme.id,
                                themeName: theme.name || theme.label || theme.id,
                                layerCount: visibleLayers.length,
                                totalLayersInTheme: layerConfigs.length,
                                timestamp: new Date().toISOString()
                            }
                        });
                        document.dispatchEvent(themeNotificationEvent);
                    } catch (e) {
                        // Silencieux
                    }

                    // FitBounds selon la configuration
                    const shouldFitBounds = options.fitBounds === true ||
                                           (self._isFirstLoad && enableFitBounds);
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
                    if (GeoLeaf.Legend && typeof GeoLeaf.Legend.hideLoadingOverlay === "function") {
                        GeoLeaf.Legend.hideLoadingOverlay();
                    }
                });
        },

        /**
         * Récupère l'ID du thème actuellement actif
         * @returns {string|null}
         */
        getCurrentThemeId() {
            return this._currentThemeId;
        }
    };

    // Exposer dans l'espace de noms
    GeoLeaf._ThemeApplier = _ThemeApplier;

})(window);
