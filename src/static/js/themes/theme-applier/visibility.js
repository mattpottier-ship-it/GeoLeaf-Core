/**
 * GeoLeaf Theme Applier - Visibility
 * Gestion de la visibilité des couches et application des styles
 *
 * @module themes/theme-applier/visibility
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
    const Log = GeoLeaf.Log;

    const TA = GeoLeaf._ThemeApplier;

    /**
     * Désactive toutes les couches GeoJSON
     * @private
     */
    TA._hideAllLayers = function () {
        if (!GeoLeaf._GeoJSONShared?.state?.layers) {
            return;
        }

        const VisibilityManager = GeoLeaf._LayerVisibilityManager;
        if (!VisibilityManager) {
            return;
        }

        // Réinitialiser tous les overrides utilisateur pour laisser le thème prendre le contrôle
        VisibilityManager.resetAllUserOverrides();

        let hiddenCount = 0;

        // Parcourir toutes les couches enregistrées
        GeoLeaf._GeoJSONShared.state.layers.forEach((layerData, layerId) => {
            const changed = VisibilityManager.setVisibility(
                layerId,
                false,
                VisibilityManager.VisibilitySource.THEME
            );

            if (changed) {
                hiddenCount++;
            }
        });
    };

    /**
     * Applique la configuration d'une couche (visible/masquée + style)
     * @param {Object} layerConfig - Configuration { id, visible, style }
     * @returns {Promise<void>}
     * @private
     */
    TA._applyLayerConfig = function (layerConfig) {
        if (!layerConfig?.id) {
            return Promise.resolve();
        }

        const layerId = layerConfig.id;
        const visible = layerConfig.visible !== false;
        const styleId = layerConfig.style ? String(layerConfig.style).trim() : undefined;

        // Récupérer la couche depuis le registre
        let layerData = GeoLeaf._GeoJSONShared?.state?.layers?.get(layerId);

        // Si la couche n'existe pas, essayer de la charger automatiquement
        if (!layerData) {
            return TA._loadLayerFromProfile(layerId).then((loadedLayer) => {
                if (loadedLayer) {
                    return TA._setLayerVisibilityAndStyle(layerId, visible, styleId);
                } else {
                    return TA._scheduleLayerConfig(layerId, visible, styleId);
                }
            });
        }

        // La couche existe déjà, appliquer directement la visibilité
        return TA._setLayerVisibilityAndStyle(layerId, visible, styleId);
    };

    /**
     * Définit la visibilité et le style d'une couche
     * @param {string} layerId - ID de la couche
     * @param {boolean} visible - Visibilité souhaitée
     * @param {string} styleId - ID du style à appliquer
     * @returns {Promise<void>}
     * @private
     */
    TA._setLayerVisibilityAndStyle = function (layerId, visible, styleId) {
        const layerData = GeoLeaf._GeoJSONShared?.state?.layers?.get(layerId);
        if (!layerData) {
            return Promise.resolve();
        }

        const VisibilityManager = GeoLeaf._LayerVisibilityManager;
        if (!VisibilityManager) {
            return Promise.resolve();
        }

        if (visible) {
            // Utiliser le gestionnaire centralisé avec source THEME
            VisibilityManager.setVisibility(
                layerId,
                true,
                VisibilityManager.VisibilitySource.THEME
            );

            // Appliquer le style si spécifié
            if (styleId && GeoLeaf._GeoJSONLayerManager?.setLayerStyle) {
                const availableStyles = layerData.config?.styles?.available || [];
                let effectiveStyleId = styleId;
                let styleExists = availableStyles.some(s => s.id === styleId);

                // Fallback: si 'default' n'existe pas, essayer 'défaut' (et vice-versa)
                if (!styleExists) {
                    const fallbackMap = {
                        'default': 'défaut',
                        'défaut': 'default'
                    };
                    const fallbackStyleId = fallbackMap[styleId];
                    if (fallbackStyleId) {
                        const fallbackExists = availableStyles.some(s => s.id === fallbackStyleId);
                        if (fallbackExists) {
                            effectiveStyleId = fallbackStyleId;
                            styleExists = true;
                        }
                    }
                }

                if (styleExists) {
                    const styleFile = availableStyles.find(s => s.id === effectiveStyleId)?.file;
                    if (styleFile) {
                        let profileId = 'default';
                        if (GeoLeaf.Config && typeof GeoLeaf.Config.getActiveProfile === 'function') {
                            const activeProfile = GeoLeaf.Config.getActiveProfile();
                            profileId = activeProfile?.id || 'default';
                        }

                        const layerDirectory = layerData._layerDirectory || layerId;

                        const StyleLoader = GeoLeaf._StyleLoader;
                        if (!StyleLoader) {
                            if (Log) Log.error(`[ThemeApplier] GeoLeaf._StyleLoader non disponible`);
                            return Promise.resolve();
                        }

                        return StyleLoader.loadAndValidateStyle(
                            profileId,
                            layerId,
                            effectiveStyleId,
                            styleFile,
                            `layers/${layerDirectory}`
                        )
                            .then(result => {
                                const styleConfig = result.styleData;
                                GeoLeaf._GeoJSONLayerManager.setLayerStyle(layerId, styleConfig);

                                // Stocker currentStyle pour les labels
                                const layerDataForStyle = GeoLeaf._GeoJSONShared?.state?.layers?.get(layerId);
                                if (layerDataForStyle) {
                                    layerDataForStyle.currentStyle = styleConfig;
                                }

                                // Initialiser les labels si configurés
                                if (GeoLeaf.Labels && typeof GeoLeaf.Labels.initializeLayerLabels === 'function') {
                                    GeoLeaf.Labels.initializeLayerLabels(layerId);
                                }

                                // Mettre à jour l'état du bouton des labels
                                if (GeoLeaf._LabelButtonManager) {
                                    GeoLeaf._LabelButtonManager.syncImmediate(layerId);
                                }

                                // Synchroniser l'UI du Layer Manager
                                if (GeoLeaf.LayerManager && typeof GeoLeaf.LayerManager.refresh === 'function') {
                                    GeoLeaf.LayerManager.refresh();
                                }

                                // Mettre à jour le style actuel dans le sélecteur
                                if (GeoLeaf._LayerManagerStyleSelector) {
                                    GeoLeaf._LayerManagerStyleSelector.setCurrentStyle(layerId, styleId);
                                }

                                // Rafraîchir le sélecteur dans l'UI
                                TA._updateStyleSelector(layerId, styleId);

                                // Charger la légende correspondante
                                TA._loadLegendForStyle(layerId, styleId);

                                return result;
                            })
                            .catch(err => {
                                // Silencieux — erreur déjà loguée par StyleLoader
                            });
                    }
                }
            }
        } else {
            // Masquer la couche avec source THEME
            VisibilityManager.setVisibility(
                layerId,
                false,
                VisibilityManager.VisibilitySource.THEME
            );

            // Désactiver les labels et mettre à jour le bouton
            if (GeoLeaf.Labels) {
                GeoLeaf.Labels.disableLabels(layerId);
            }
            if (GeoLeaf._LabelButtonManager) {
                GeoLeaf._LabelButtonManager.syncImmediate(layerId);
            }
        }

        return Promise.resolve();
    };

})(window);
