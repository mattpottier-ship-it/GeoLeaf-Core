/**
 * GeoLeaf Theme Applier - UI Sync
 * Synchronisation de l'UI : sélecteur de style, légende, fitBounds
 *
 * @module themes/theme-applier/ui-sync
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};

    const TA = GeoLeaf._ThemeApplier;

    /**
     * Met à jour le sélecteur de style dans l'UI
     * @param {string} layerId - Identifiant de la couche
     * @param {string} styleId - Identifiant du style
     * @private
     */
    TA._updateStyleSelector = function (layerId, styleId) {
        const selectId = "style-selector-" + layerId;
        const select = document.getElementById(selectId);

        if (select) {
            select.value = styleId;
        }
    };

    /**
     * Charge la légende correspondant au style appliqué
     * @param {string} layerId - ID de la couche
     * @param {string} styleId - ID du style
     * @private
     */
    TA._loadLegendForStyle = function (layerId, styleId) {
        if (!GeoLeaf.Legend || typeof GeoLeaf.Legend.loadLayerLegend !== "function") {
            return;
        }

        // Récupérer les informations de la couche
        const layersMap = GeoLeaf._GeoJSONShared?.state?.layers;
        const layerInfo = layersMap instanceof Map ? layersMap.get(layerId) : layersMap?.[layerId];

        if (!layerInfo || !layerInfo.config) {
            return;
        }

        // Utiliser la nouvelle API qui génère la légende depuis le style
        GeoLeaf.Legend.loadLayerLegend(layerId, styleId, layerInfo.config);
    };

    /**
     * Zoom sur l'emprise de toutes les couches chargées
     * @private
     */
    TA._fitBoundsOnAllLayers = function () {
        const map = GeoLeaf.Core?.getMap();
        if (!map) {
            return;
        }

        // Mettre à jour la progression (99%)
        if (window._glLoadingScreen && typeof window._glLoadingScreen.updateProgress === 'function') {
            window._glLoadingScreen.updateProgress(99);
        }

        // Créer un groupe temporaire avec toutes les couches pour calculer les bounds
        const tempGroup = global.L.featureGroup();
        let layerCount = 0;

        // Ajouter les couches GeoJSON
        if (GeoLeaf._GeoJSONShared?.state?.layers) {
            GeoLeaf._GeoJSONShared.state.layers.forEach((layerData, layerId) => {
                if (layerData.layer) {
                    try {
                        tempGroup.addLayer(layerData.layer);
                        layerCount++;
                    } catch (e) {
                        // Silencieux
                    }
                }
            });
        }

        // Ajouter les POI s'ils existent
        if (GeoLeaf._POIShared?.state?.markerLayer) {
            try {
                tempGroup.addLayer(GeoLeaf._POIShared.state.markerLayer);
                layerCount++;
            } catch (e) {
                // Silencieux
            }
        }

        // Ajouter les Routes s'elles existent
        if (GeoLeaf.Route?.getLayerGroup) {
            try {
                const routeGroup = GeoLeaf.Route.getLayerGroup();
                if (routeGroup) {
                    tempGroup.addLayer(routeGroup);
                    layerCount++;
                }
            } catch (e) {
                // Silencieux
            }
        }

        // Zoomer sur l'emprise
        if (layerCount > 0) {
            const bounds = tempGroup.getBounds();
            if (bounds.isValid()) {
                // Afficher la carte AVANT le fitBounds pour éviter l'écran noir
                const mapContainer = document.getElementById('geoleaf-map') ||
                                   document.querySelector('.leaflet-container')?.parentElement;
                if (mapContainer) {
                    mapContainer.style.opacity = '1';
                }

                map.fitBounds(bounds, { maxZoom: 12, padding: [50, 50], animate: false });

                // Attendre que les tuiles soient chargées avant de fermer le spinner
                setTimeout(() => {
                    try {
                        const event = new CustomEvent('geoleaf:map:ready', { detail: { time: Date.now() } });
                        document.dispatchEvent(event);
                    } catch (e) {
                        // fallback
                    }
                }, 800);
            }
        }
    };

    /**
     * Synchronise l'état de visibilité de toutes les couches dans la légende
     * @private
     */
    TA._syncLegendVisibility = function () {
        if (!GeoLeaf.Legend || typeof GeoLeaf.Legend.setLayerVisibility !== "function") {
            return;
        }

        if (!GeoLeaf._GeoJSONShared?.state?.layers) {
            return;
        }

        const VisibilityManager = GeoLeaf._LayerVisibilityManager;
        if (!VisibilityManager) {
            return;
        }

        // Parcourir toutes les couches et synchroniser leur état
        GeoLeaf._GeoJSONShared.state.layers.forEach((layerData, layerId) => {
            const visState = VisibilityManager.getVisibilityState(layerId);
            const isVisible = visState ? visState.current : layerData.visible;
            GeoLeaf.Legend.setLayerVisibility(layerId, isVisible);
        });
    };

})(window);
