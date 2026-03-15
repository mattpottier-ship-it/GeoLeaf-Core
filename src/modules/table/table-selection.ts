/**
 * GeoLeaf Table – Selection and export logic.
 * @module table/table-selection
 */
"use strict";

import { Log } from "../log/index.js";
import { tableState, fireEvent, getSelectedFeatures } from "./table-state.js";
import { extendBoundsFromGeometry } from "./table-highlight.js";
import { buildGeoJSONCollection, downloadGeoJSON } from "./export.js";
import { TableRenderer as _TableRenderer } from "./renderer.js";

/** Returns the IDs des entities selected. */
export function getSelectedIds(): string[] {
    return Array.from(tableState._selectedIds);
}

/**
 * Selects or deselects entities.
 * @param ids - IDs to selectionner
 * @param add - Addsr to the selection existing (true) ou remplacer (false)
 */
export function setSelection(ids: any[], add = false): void {
    if (!add) {
        tableState._selectedIds.clear();
    }
    ids.forEach((id: any) => tableState._selectedIds.add(String(id)));
    fireEvent("table:selectionChanged", {
        layerId: tableState._currentLayerId,
        selectedIds: Array.from(tableState._selectedIds),
    });
    if (_TableRenderer && typeof (_TableRenderer as any).updateSelection === "function") {
        (_TableRenderer as any).updateSelection(tableState._container, tableState._selectedIds);
    }
    Log.debug("[Table] Selection updated:", tableState._selectedIds.size, "entities");
}

/** Efface toute the selection. */
export function clearSelection(): void {
    tableState._selectedIds.clear();
    fireEvent("table:selectionChanged", {
        layerId: tableState._currentLayerId,
        selectedIds: [],
    });
    if (_TableRenderer && typeof (_TableRenderer as any).updateSelection === "function") {
        (_TableRenderer as any).updateSelection(tableState._container, tableState._selectedIds);
    }
    Log.debug("[Table] Selection cleared");
}

/** Zoom Leaflet sur les entities selected. */
export function zoomToSelection(): void {
    if (tableState._selectedIds.size === 0) {
        Log.warn("[Table] No entity selected for zoom");
        return;
    }
    const selectedFeatures = getSelectedFeatures();
    if (selectedFeatures.length === 0) {
        Log.warn("[Table] No feature found for selected IDs");
        return;
    }
    const L = (globalThis as any).L;
    if (!L || typeof L.latLngBounds !== "function") {
        Log.warn("[Table] Leaflet (L) unavailable for zoomToSelection");
        return;
    }
    const bounds = L.latLngBounds([]);
    selectedFeatures.forEach((feature: any) => {
        if (feature.geometry && feature.geometry.coordinates) {
            extendBoundsFromGeometry(bounds, feature.geometry);
        }
    });
    if (bounds.isValid()) {
        tableState._map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        fireEvent("table:zoomToSelection", {
            layerId: tableState._currentLayerId,
            selectedIds: Array.from(tableState._selectedIds),
        });
        Log.debug("[Table] Zoom on selection (", selectedFeatures.length, "entities)");
    } else {
        Log.warn("[Table] Invalid bounds for selection");
    }
}

/** Exports selected entities as GeoJSON (download). */
export function exportSelection(): void {
    if (tableState._selectedIds.size === 0) {
        Log.warn("[Table] No entity selected for export");
        return;
    }
    const selectedFeatures = getSelectedFeatures();
    if (selectedFeatures.length === 0) {
        Log.warn("[Table] No feature found for export");
        return;
    }
    try {
        downloadGeoJSON(
            buildGeoJSONCollection(selectedFeatures),
            tableState._currentLayerId ?? undefined
        );
        Log.info("[Table] GeoJSON export:", selectedFeatures.length, "entities exported");
    } catch (e) {
        Log.error("[Table] Error during export:", e);
    }
    fireEvent("table:exportSelection", {
        layerId: tableState._currentLayerId,
        selectedIds: Array.from(tableState._selectedIds),
        rows: selectedFeatures,
    });
}
