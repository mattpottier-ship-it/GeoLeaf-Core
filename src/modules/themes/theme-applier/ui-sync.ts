/**
 * GeoLeaf Theme Applier - UI Sync
 * Synchronisation de l'UI : sélecteur de style, légende, fitBounds
 *
 * @module themes/theme-applier/ui-sync
 */
"use strict";

import { ThemeApplierCore as TA } from "../theme-applier/core.js";
import { GeoJSONShared } from "../../shared/geojson-state.js";
import { POIShared } from "../../shared/poi-state.js";
import { LayerVisibilityManager } from "../../shared/layer-visibility-state.js";
import { LegendContract } from "../../../contracts/legend.contract.js";
import { RouteContract } from "../../../contracts/route.contract.js";
import { Core } from "../../geoleaf.core.js";

/**
 * Met à jour le sélecteur de style dans l'UI
 * @param {string} layerId - Identifiant de la couche
 * @param {string} styleId - Identifiant du style
 * @private
 */
TA._updateStyleSelector = function (layerId: any, styleId: any) {
    const selectId = "style-selector-" + layerId;
    const select = document.getElementById(selectId);

    if (select) {
        (select as any).value = styleId;
    }
};

/**
 * Charge la légende correspondant au style appliqué
 * @param {string} layerId - ID de la couche
 * @param {string} styleId - ID du style
 * @private
 */
TA._loadLegendForStyle = function (layerId: any, styleId: any) {
    if (!LegendContract.isAvailable()) {
        return;
    }

    // Récupérer les informations de la couche
    const layersMap = GeoJSONShared.state.layers;
    const layerInfo = layersMap instanceof Map ? layersMap.get(layerId) : layersMap?.[layerId];

    if (!layerInfo || !(layerInfo as any).config) {
        return;
    }

    // Utiliser la nouvelle API qui génère la légende depuis le style
    LegendContract.loadLayerLegend(layerId, styleId, (layerInfo as any).config);
};

/**
 * Zoom sur l'emprise de toutes les couches chargées
 * @private
 */
TA._fitBoundsOnAllLayers = function () {
    const map = Core?.getMap();
    if (!map) {
        return;
    }

    // Mettre à jour la progression (99%)
    if ((window as any)._glLoadingScreen && typeof (window as any)._glLoadingScreen.updateProgress === "function") {
        (window as any)._glLoadingScreen.updateProgress(99);
    }

    // Créer un groupe temporaire avec toutes les couches pour calculer les bounds
    const tempGroup = (globalThis as any).L.featureGroup();
    let layerCount = 0;

    // Ajouter les couches GeoJSON
    if (GeoJSONShared.getLayers) {
        GeoJSONShared.getLayers().forEach((layerData: any, _layerId: any) => {
            if (layerData.layer) {
                try {
                    tempGroup.addLayer(layerData.layer);
                    layerCount++;
                } catch (_e: any) {
                    // Silencieux
                }
            }
        });
    }

    // Ajouter les POI s'ils existent
    if (POIShared?.getMarkerLayer) {
        const markerLayer = POIShared.getMarkerLayer();
        if (markerLayer) {
            try {
                tempGroup.addLayer(markerLayer);
                layerCount++;
            } catch (_e: any) {
                // Silencieux
            }
        }
    }

    // Ajouter les Routes s'elles existent
    if (RouteContract.isAvailable()) {
        try {
            const routeGroup = RouteContract.getLayerGroup();
            if (routeGroup) {
                tempGroup.addLayer(routeGroup);
                layerCount++;
            }
        } catch (_e: any) {
            // Silencieux
        }
    }

    // Zoomer sur l'emprise
    if (layerCount > 0) {
        const bounds = tempGroup.getBounds();
        if (bounds.isValid()) {
            // Afficher la carte AVANT le fitBounds pour éviter l'écran noir
            const mapContainer =
                document.getElementById("geoleaf-map") ||
                document.querySelector(".leaflet-container")?.parentElement;
            if (mapContainer) {
                mapContainer.style.opacity = "1";
            }

            map.fitBounds(bounds, { maxZoom: 12, padding: [50, 50], animate: false });

            // Attendre que les tuiles soient chargées avant de fermer le spinner
            setTimeout(() => {
                try {
                    const event = new CustomEvent("geoleaf:map:ready", {
                        detail: { time: Date.now() },
                    });
                    document.dispatchEvent(event);
                } catch (_e: any) {
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
    if (!LegendContract.isAvailable()) {
        return;
    }

    if (!GeoJSONShared.getLayers) {
        return;
    }

    const VisibilityManager = LayerVisibilityManager;
    if (!VisibilityManager) {
        return;
    }

    // Parcourir toutes les couches et synchroniser leur état
    (GeoJSONShared as any).getLayers().forEach((layerData: any, layerId: any) => {
        const visState = (VisibilityManager as any).getVisibilityState(layerId);
        const isVisible = visState ? visState.current : layerData.visible;
        LegendContract.setLayerVisibility(layerId, isVisible);
    });
};

export { TA as ThemeApplierUISync };
