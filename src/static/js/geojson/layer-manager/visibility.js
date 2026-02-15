/**
 * GeoLeaf GeoJSON Layer Manager - Visibility
 * Show/hide/toggle layers, zoom-based visibility
 *
 * @module geojson/layer-manager/visibility
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const getState = () => GeoLeaf._GeoJSONShared.state;
    const getLog = () => (GeoLeaf.Log || console);
    const ScaleUtils = GeoLeaf.Utils && GeoLeaf.Utils.ScaleUtils;

    const LayerManager = GeoLeaf._GeoJSONLayerManager = GeoLeaf._GeoJSONLayerManager || {};

    /**
     * Affiche une couche (rend visible).
     *
     * @param {string} layerId - ID de la couche
     */
    LayerManager.showLayer = function (layerId) {
        const state = getState();
        const Log = getLog();
        const layerData = state.layers.get(layerId);

        if (!layerData) {
            Log.warn("[GeoLeaf.GeoJSON] showLayer: couche introuvable :", layerId);
            return;
        }

        // Utiliser le gestionnaire de visibilité centralisé
        const VisibilityManager = GeoLeaf._LayerVisibilityManager;
        if (!VisibilityManager) {
            Log.error("[GeoLeaf.GeoJSON] LayerVisibilityManager non disponible");
            return;
        }

        const changed = VisibilityManager.setVisibility(
            layerId,
            true,
            VisibilityManager.VisibilitySource.USER
        );

        // IMPORTANT: Recalculer la visibilité physique en fonction du zoom
        // setVisibility met à jour logicalState (bouton), mais il faut aussi recalculer current
        LayerManager.updateLayerVisibilityByZoom();

        // Charger la légende si disponible (uniquement si changement effectué)
        if (changed) {
            LayerManager._loadLayerLegend(layerId, layerData);

            // Gérer les labels au moment de l'activation
            if (GeoLeaf.Labels && GeoLeaf.Labels.hasLabelConfig(layerId)) {
                // Vérifier si visibleByDefault est true pour les labels
                const visibleByDefault = layerData.currentStyle?.label?.visibleByDefault === true;

                if (visibleByDefault) {
                    // Activer et afficher les labels immédiatement
                    GeoLeaf.Labels.enableLabels(layerId, {}, true);
                } else if (GeoLeaf.Labels.areLabelsEnabled(layerId)) {
                    // Sinon, juste rafraîchir si déjà activés
                    GeoLeaf.Labels.refreshLabels(layerId);
                }
            }
            if (GeoLeaf._LabelButtonManager) {
                GeoLeaf._LabelButtonManager.syncImmediate(layerId);
            }

            Log.debug("[GeoLeaf.GeoJSON] Couche affichée :", layerId);
        }
    };

    /**
     * Masque une couche (rend invisible).
     *
     * @param {string} layerId - ID de la couche
     */
    LayerManager.hideLayer = function (layerId) {
        const state = getState();
        const Log = getLog();
        const layerData = state.layers.get(layerId);

        if (!layerData) {
            Log.warn("[GeoLeaf.GeoJSON] hideLayer: couche introuvable :", layerId);
            return;
        }

        // Utiliser le gestionnaire de visibilité centralisé
        const VisibilityManager = GeoLeaf._LayerVisibilityManager;
        if (!VisibilityManager) {
            Log.error("[GeoLeaf.GeoJSON] LayerVisibilityManager non disponible");
            return;
        }

        const changed = VisibilityManager.setVisibility(
            layerId,
            false,
            VisibilityManager.VisibilitySource.USER
        );

        // IMPORTANT: Recalculer la visibilité physique (even on hide, to ensure consistency)
        LayerManager.updateLayerVisibilityByZoom();

        if (changed) {
            // Masquer les labels et mettre à jour le bouton
            if (GeoLeaf.Labels) {
                GeoLeaf.Labels.disableLabels(layerId);
            }
            if (GeoLeaf._LabelButtonManager) {
                GeoLeaf._LabelButtonManager.syncImmediate(layerId);
            }

            Log.debug("[GeoLeaf.GeoJSON] Couche masquée :", layerId);
        }
    };

    /**
     * Toggle la visibilité d'une couche.
     *
     * @param {string} layerId - ID de la couche
     */
    LayerManager.toggleLayer = function (layerId) {
        const state = getState();
        const Log = getLog();
        const layerData = state.layers.get(layerId);

        if (!layerData) {
            Log.warn("[GeoLeaf.GeoJSON] toggleLayer: couche introuvable :", layerId);
            return;
        }

        // Obtenir l'état actuel via le gestionnaire de visibilité
        const VisibilityManager = GeoLeaf._LayerVisibilityManager;
        if (!VisibilityManager) {
            Log.error("[GeoLeaf.GeoJSON] LayerVisibilityManager non disponible");
            return;
        }

        const visState = VisibilityManager.getVisibilityState(layerId);
        const currentlyVisible = visState ? visState.current : layerData.visible;

        // Toggle
        if (currentlyVisible) {
            LayerManager.hideLayer(layerId);
        } else {
            LayerManager.showLayer(layerId);
        }
    };

    /**
     * Affiche une couche (interne, sans vérifier visible).
     * @deprecated Utiliser GeoLeaf._LayerVisibilityManager.setVisibility() à la place
     * @private
     */
    LayerManager._showLayerInternal = function (layerId, layerData) {
        const Log = getLog();
        Log.warn("[GeoLeaf.GeoJSON] _showLayerInternal() est déprécié, utiliser LayerVisibilityManager");

        // Rediriger vers le gestionnaire centralisé
        const VisibilityManager = GeoLeaf._LayerVisibilityManager;
        if (VisibilityManager) {
            VisibilityManager.setVisibility(
                layerId,
                true,
                VisibilityManager.VisibilitySource.SYSTEM
            );
        }
    };

    /**
     * Masque une couche (interne, sans vérifier visible).
     * @deprecated Utiliser GeoLeaf._LayerVisibilityManager.setVisibility() à la place
     * @private
     */
    LayerManager._hideLayerInternal = function (layerId, layerData) {
        const Log = getLog();
        Log.warn("[GeoLeaf.GeoJSON] _hideLayerInternal() est déprécié, utiliser LayerVisibilityManager");

        // Rediriger vers le gestionnaire centralisé
        const VisibilityManager = GeoLeaf._LayerVisibilityManager;
        if (VisibilityManager) {
            VisibilityManager.setVisibility(
                layerId,
                false,
                VisibilityManager.VisibilitySource.SYSTEM
            );
        }
    };

    /**
     * Met à jour la visibilité des couches en fonction de layerScale du style actif.
     * Respecte les préférences utilisateur (désactivation manuelle ou par thème).
     * Utilise le gestionnaire de visibilité centralisé avec source 'zoom'.
     * Exécution immédiate pour réactivité pendant le zoom (le debounce LayerManager.refresh évite les saccades d'UI).
     */
    LayerManager.updateLayerVisibilityByZoom = function () {
        const state = getState();
        const Log = getLog();
        if (!state.map) return;

        const VisibilityManager = GeoLeaf._LayerVisibilityManager;
        if (!VisibilityManager) {
            Log.error("[GeoLeaf.GeoJSON] LayerVisibilityManager non disponible");
            return;
        }

        const currentScale = (ScaleUtils && typeof ScaleUtils.calculateMapScale === "function")
            ? ScaleUtils.calculateMapScale(state.map, { logger: Log })
            : 0;

        const normalizeScaleValue = (value) => {
            if (typeof value !== "number") return null;
            return value <= 0 ? null : value;
        };

        state.layers.forEach((layerData, layerId) => {
            const config = layerData.config;
            if (!config) return;

            const hasCurrentStyle = !!layerData.currentStyle;
            const styleScale = hasCurrentStyle ? layerData.currentStyle.layerScale : null;
            if (!styleScale && hasCurrentStyle) {
                if (Log && typeof Log.warn === "function") {
                    Log.warn(`[GeoLeaf.GeoJSON] layerScale manquant pour ${layerId}, couche laissée visible par défaut`);
                }
            }

            const minScale = normalizeScaleValue(styleScale && styleScale.minScale);
            const maxScale = normalizeScaleValue(styleScale && styleScale.maxScale);

            const shouldBeVisibleByScale = (ScaleUtils && typeof ScaleUtils.isScaleInRange === "function")
                ? ScaleUtils.isScaleInRange(currentScale, minScale, maxScale, Log)
                : true;

            // Base visibility: user override > theme intent > config default
            const meta = layerData._visibility;
            let baseVisible;
            if (meta && meta.userOverride) {
                // IMPORTANT: Pour userOverride, utiliser logicalState (état bouton), pas current (état zoom)
                baseVisible = meta.logicalState;
            } else if (meta && meta.themeOverride) {
                baseVisible = meta.themeDesired;
            } else {
                // visibility.active parameter is deprecated - now managed by layerScale in style files
                baseVisible = true;
            }

            // RÈGLE CRITIQUE :
            // - L'AFFICHAGE sur la carte RESPECTE TOUJOURS les seuils de zoom
            // - Le BOUTON (via logicalState) reste indépendant du zoom
            // - Utilisateur voit : bouton ON, mais couche cachée si hors zoom
            const shouldBeVisible = baseVisible && shouldBeVisibleByScale;

            VisibilityManager.setVisibility(
                layerId,
                shouldBeVisible,
                VisibilityManager.VisibilitySource.ZOOM
            );
        });
    };

    /**
     * Émet un événement de changement de visibilité.
     *
     * @param {string} layerId
     * @param {boolean} visible
     * @private
     */
    LayerManager._fireLayerVisibilityEvent = function (layerId, visible) {
        const state = getState();
        if (!state.map) return;

        try {
            state.map.fire("geoleaf:geojson:visibility-changed", {
                layerId: layerId,
                visible: visible
            });
        } catch (e) {
            // Silencieux
        }
    };

})(window);
