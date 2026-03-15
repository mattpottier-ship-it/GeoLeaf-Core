/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf Theme Applier - UI Sync
 * Synchronization of the UI : selector de style, legend, fitBounds
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
 * Updates the selector de style dans l'UI
 * @param {string} layerId - Identifier de the layer
 * @param {string} styleId - Identifier du style
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
 * Loads the legend correspondant au style applied
 * @param {string} layerId - ID de the layer
 * @param {string} styleId - ID du style
 * @private
 */
TA._loadLegendForStyle = function (layerId: any, styleId: any) {
    if (!LegendContract.isAvailable()) {
        return;
    }

    // Retrieve les information de the layer
    const layersMap = GeoJSONShared.state.layers;
    const layerInfo = layersMap instanceof Map ? layersMap.get(layerId) : layersMap?.[layerId];

    if (!layerInfo || !(layerInfo as any).config) {
        return;
    }

    // Utiliser la nouvelle API qui generates the legend from the style
    LegendContract.loadLayerLegend(layerId, styleId, (layerInfo as any).config);
};

/**
 * Zoom sur l'emprise de toutes the layers loadedes
 * @private
 */

function _collectAllLayers(tempGroup: any): number {
    let count = 0;
    if (GeoJSONShared.getLayers) {
        GeoJSONShared.getLayers().forEach((layerData: any) => {
            if (layerData.layer) {
                try {
                    tempGroup.addLayer(layerData.layer);
                    count++;
                } catch (_e: any) {
                    /* silent */
                }
            }
        });
    }
    if (POIShared?.getMarkerLayer) {
        const markerLayer = POIShared.getMarkerLayer();
        if (markerLayer) {
            try {
                tempGroup.addLayer(markerLayer);
                count++;
            } catch (_e: any) {
                /* silent */
            }
        }
    }
    if (RouteContract.isAvailable()) {
        try {
            const routeGroup = RouteContract.getLayerGroup();
            if (routeGroup) {
                tempGroup.addLayer(routeGroup);
                count++;
            }
        } catch (_e: any) {
            /* silent */
        }
    }
    return count;
}

function _fitAndReveal(map: any, tempGroup: any) {
    const bounds = tempGroup.getBounds();
    if (!bounds.isValid()) {
        return;
    }
    const mapContainer =
        document.getElementById("geoleaf-map") ||
        document.querySelector(".leaflet-container")?.parentElement;
    if (mapContainer) {
        (mapContainer as HTMLElement).style.opacity = "1";
    }
    map.fitBounds(bounds, { maxZoom: 12, padding: [50, 50], animate: false });
    setTimeout(() => {
        try {
            document.dispatchEvent(
                new CustomEvent("geoleaf:map:ready", { detail: { time: Date.now() } })
            );
        } catch (_e: any) {
            /* fallback */
        }
    }, 800);
}

TA._fitBoundsOnAllLayers = function () {
    const map = Core?.getMap();
    if (!map) {
        return;
    }

    if ((window as any)._glLoadingScreen?.updateProgress) {
        (window as any)._glLoadingScreen.updateProgress(99);
    }

    const tempGroup = (globalThis as any).L.featureGroup();
    const layerCount = _collectAllLayers(tempGroup);
    if (layerCount > 0) {
        _fitAndReveal(map, tempGroup);
    }
};

/**
 * Synchronise l'visibility state de toutes the layers dans the legend
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

    // Parcourir toutes the layers et synchronize leur state
    (GeoJSONShared as any).getLayers().forEach((layerData: any, layerId: any) => {
        const visState = (VisibilityManager as any).getVisibilityState(layerId);
        const isVisible = visState ? visState.current : layerData.visible;
        LegendContract.setLayerVisibility(layerId, isVisible);
    });
};

export { TA as ThemeApplierUISync };
