/**
 * GeoLeaf Theme Applier - Visibility
 * Gestion de la visibilité des couches et application des styles
 *
 * @module themes/theme-applier/visibility
 */
"use strict";

import { Log } from "../../log/index.js";
import { Config } from "../../config/config-primitives.js";
import { ThemeApplierCore as TA } from "../theme-applier/core.js";
import { GeoJSONShared } from "../../shared/geojson-state.js";
import { LayerVisibilityManager } from "../../shared/layer-visibility-state.js";
import { LayerManagerStyle } from "../../geojson/layer-manager/style.js";
import { StyleLoader } from "../../loaders/style-loader.js";
import { Labels } from "../../labels/labels.js";
import { LabelButtonManager } from "../../labels/label-button-manager.js";
import { LayerManager } from "../../geoleaf.layer-manager.js";
import { StyleSelector } from "../../layer-manager/style-selector.js";

/**
 * Désactive toutes les couches GeoJSON
 * @private
 */
TA._hideAllLayers = function () {
    if (!GeoJSONShared.state.layers) {
        return;
    }

    const VisibilityManager = LayerVisibilityManager;
    if (!VisibilityManager) {
        return;
    }

    // Réinitialiser tous les overrides utilisateur pour laisser le thème prendre le contrôle
    VisibilityManager.resetAllUserOverrides();

    // Parcourir toutes les couches enregistrées
    GeoJSONShared.getLayers().forEach((layerData, layerId) => {
        VisibilityManager.setVisibility(layerId, false, VisibilityManager.VisibilitySource.THEME);
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
    const layerData = GeoJSONShared.state.layers?.get(layerId);

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
    const layerData = GeoJSONShared.state.layers?.get(layerId);
    if (!layerData) {
        return Promise.resolve();
    }

    const VisibilityManager = LayerVisibilityManager;
    if (!VisibilityManager) {
        return Promise.resolve();
    }

    if (visible) {
        // Utiliser le gestionnaire centralisé avec source THEME
        VisibilityManager.setVisibility(layerId, true, VisibilityManager.VisibilitySource.THEME);

        // Appliquer le style si spécifié
        if (styleId && LayerManagerStyle?.setLayerStyle) {
            const availableStyles = layerData.config?.styles?.available || [];
            let effectiveStyleId = styleId;
            let styleExists = availableStyles.some((s) => s.id === styleId);

            // Fallback: si 'default' n'existe pas, essayer 'défaut' (et vice-versa)
            if (!styleExists) {
                const fallbackMap = {
                    default: "défaut",
                    défaut: "default",
                };
                const fallbackStyleId = fallbackMap[styleId];
                if (fallbackStyleId) {
                    const fallbackExists = availableStyles.some((s) => s.id === fallbackStyleId);
                    if (fallbackExists) {
                        effectiveStyleId = fallbackStyleId;
                        styleExists = true;
                    }
                }
            }

            if (styleExists) {
                const styleFile = availableStyles.find((s) => s.id === effectiveStyleId)?.file;
                if (styleFile) {
                    let profileId = "default";
                    if (Config && typeof Config.getActiveProfile === "function") {
                        const activeProfile = Config.getActiveProfile();
                        profileId = activeProfile?.id || "default";
                    }

                    const layerDirectory = layerData._layerDirectory || layerId;

                    const localStyleLoader = StyleLoader;
                    if (!localStyleLoader) {
                        if (Log) Log.error(`[ThemeApplier] StyleLoader non disponible`);
                        return Promise.resolve();
                    }

                    return localStyleLoader
                        .loadAndValidateStyle(
                            profileId,
                            layerId,
                            effectiveStyleId,
                            styleFile,
                            `layers/${layerDirectory}`
                        )
                        .then((result) => {
                            const styleConfig = result.styleData;
                            LayerManagerStyle.setLayerStyle(layerId, styleConfig);

                            // Stocker currentStyle pour les labels
                            const layerDataForStyle = GeoJSONShared.state.layers?.get(layerId);
                            if (layerDataForStyle) {
                                layerDataForStyle.currentStyle = styleConfig;
                            }

                            // Initialiser les labels si configurés
                            if (Labels && typeof Labels.initializeLayerLabels === "function") {
                                Labels.initializeLayerLabels(layerId);
                            }

                            // Mettre à jour l'état du bouton des labels
                            if (LabelButtonManager) {
                                LabelButtonManager.syncImmediate(layerId);
                            }

                            // Synchroniser l'UI du Layer Manager
                            if (LayerManager && typeof LayerManager.refresh === "function") {
                                LayerManager.refresh();
                            }

                            // Mettre à jour le style actuel dans le sélecteur
                            if (StyleSelector) {
                                StyleSelector.setCurrentStyle(layerId, styleId);
                            }

                            // Rafraîchir le sélecteur dans l'UI
                            TA._updateStyleSelector(layerId, styleId);

                            // Charger la légende correspondante
                            TA._loadLegendForStyle(layerId, styleId);

                            return result;
                        })
                        .catch((_err) => {
                            // Silencieux — erreur déjà loguée par StyleLoader
                        });
                }
            }
        }
    } else {
        // Masquer la couche avec source THEME
        VisibilityManager.setVisibility(layerId, false, VisibilityManager.VisibilitySource.THEME);

        // Désactiver les labels et mettre à jour le bouton
        if (Labels) {
            Labels.disableLabels(layerId);
        }
        if (LabelButtonManager) {
            LabelButtonManager.syncImmediate(layerId);
        }
    }

    return Promise.resolve();
};

export { TA as ThemeApplierVisibility };
