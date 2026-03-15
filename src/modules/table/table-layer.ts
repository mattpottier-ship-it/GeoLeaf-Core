/**
 * GeoLeaf Table – Layer data and map event logic.
 * @module table/table-layer
 */
"use strict";

import { Log } from "../log/index.js";
import { tableState, _g } from "./table-state.js";
import { TablePanel as _TablePanel } from "./panel.js";

/** Returns the features d'a layer en appliquant la limite de lines. */
export function getLayerFeatures(layerId: string): any[] {
    if (!_g.GeoLeaf.GeoJSON || typeof _g.GeoLeaf.GeoJSON.getLayerData !== "function") {
        Log.warn("[Table] Module GeoJSON non disponible");
        return [];
    }
    const layerData = _g.GeoLeaf.GeoJSON.getLayerData(layerId);
    if (!layerData || !layerData.features) {
        Log.warn("[Table] No data for layer:", layerId);
        return [];
    }
    Log.debug("[Table] _getLayerFeatures - Nombre de features:", layerData.features.length);
    const maxRows = tableState._config?.maxRowsPerLayer || 1000;
    if (layerData.features.length > maxRows) {
        Log.warn(
            "[Table] Large dataset (" +
                layerData.features.length +
                " entities). Limited to " +
                maxRows
        );
        return layerData.features.slice(0, maxRows);
    }
    return layerData.features || [];
}

/** Returns toutes the layers ayant `table.enabled = true`. */
export function getAvailableLayers(): any[] {
    if (!_g.GeoLeaf.GeoJSON || typeof _g.GeoLeaf.GeoJSON.getAllLayers !== "function") {
        return [];
    }
    const allLayers = _g.GeoLeaf.GeoJSON.getAllLayers();
    const availableLayers: any[] = [];
    allLayers.forEach((layer: any) => {
        const layerData = _g.GeoLeaf.GeoJSON.getLayerData(layer.id);
        if (
            layerData &&
            layerData.config &&
            layerData.config.table &&
            layerData.config.table.enabled
        ) {
            availableLayers.push({
                id: layer.id,
                label: layer.label || layer.id,
                config: layerData.config.table,
            });
        }
    });
    return availableLayers;
}

/** Returns the layers availables ET visibles sur the map. */
export function getAvailableVisibleLayers(): any[] {
    const available = getAvailableLayers();
    const VisibilityManager = _g.GeoLeaf._LayerVisibilityManager;
    return available.filter((layer: any) => {
        if (VisibilityManager && typeof VisibilityManager.getVisibilityState === "function") {
            const visState = VisibilityManager.getVisibilityState(layer.id);
            return visState && visState.current === true;
        }
        const layerData = _g.GeoLeaf.GeoJSON.getLayerData(layer.id);
        return layerData && layerData._visibility && layerData._visibility.current === true;
    });
}

/**
 * Attache les listners d'events Leaflet et DOM.
 * @param refreshCallback   - Called to refresh the table data
 * @param setLayerCallback  - Called to change the active layer
 */
export function attachMapEvents(
    refreshCallback: () => void,
    setLayerCallback: (id: string) => void
): void {
    const map = tableState._map;
    if (!map) return;

    let refreshSelectorTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefreshSelector = () => {
        if (refreshSelectorTimer) clearTimeout(refreshSelectorTimer);
        refreshSelectorTimer = setTimeout(() => {
            if (_TablePanel && typeof (_TablePanel as any).refreshLayerSelector === "function") {
                (_TablePanel as any).refreshLayerSelector();
            }
        }, 150);
    };

    map.on("geoleaf:filters:changed", () => {
        if (tableState._isVisible && tableState._currentLayerId) {
            refreshCallback();
        }
    });

    map.on("geoleaf:geojson:layers-loaded", () => {
        Log.debug("[Table] layers-loaded event received, refreshing selector");
        debouncedRefreshSelector();
    });

    document.addEventListener("geoleaf:theme:applied", () => {
        Log.debug("[Table] theme:applied event received, refreshing selector");
        debouncedRefreshSelector();
    });

    map.on("geoleaf:geojson:visibility-changed", (e: any) => {
        debouncedRefreshSelector();
        if (tableState._currentLayerId === e.layerId) {
            if (e.visible) {
                refreshCallback();
            } else {
                setTimeout(() => {
                    const available = getAvailableVisibleLayers();
                    if (available.length > 0) {
                        setLayerCallback(available[0].id);
                        const select = document.querySelector(
                            "[data-table-layer-select]"
                        ) as HTMLSelectElement | null;
                        if (select) select.value = available[0].id;
                    } else {
                        setLayerCallback("");
                    }
                }, 200);
            }
        }
    });
}
