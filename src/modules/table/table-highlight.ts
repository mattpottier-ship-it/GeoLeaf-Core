/**
 * GeoLeaf Table – Highlight and geometry utilities.
 * @module table/table-highlight
 */
"use strict";

import { Log } from "../log/index.js";
import { tableState, fireEvent, getSelectedFeatures } from "./table-state.js";

/** Removes toutes the layers de surbrillance de the map. */
export function clearHighlightLayers(): void {
    tableState._highlightLayers.forEach((layer: any) => {
        try {
            if (tableState._map && tableState._map.hasLayer(layer)) {
                tableState._map.removeLayer(layer);
            }
        } catch (_e) {
            // Silencieux
        }
    });
    tableState._highlightLayers = [];
}

/** Extends Leaflet bounds from a GeoJSON geometry. */
export function extendBoundsFromGeometry(bounds: any, geometry: any): void {
    const coords = geometry.coordinates;
    const type = geometry.type;
    if (type === "Point") {
        bounds.extend([coords[1], coords[0]]);
    } else if (type === "LineString") {
        coords.forEach((c: any) => bounds.extend([c[1], c[0]]));
    } else if (type === "MultiLineString") {
        coords.forEach((line: any) => line.forEach((c: any) => bounds.extend([c[1], c[0]])));
    } else if (type === "Polygon") {
        coords[0].forEach((c: any) => bounds.extend([c[1], c[0]]));
    } else if (type === "MultiPolygon") {
        coords.forEach((poly: any) => {
            poly[0].forEach((c: any) => bounds.extend([c[1], c[0]]));
        });
    } else if (type === "MultiPoint") {
        coords.forEach((c: any) => bounds.extend([c[1], c[0]]));
    }
}

function _addFeatureHighlight(feature: any, L: any): void {
    if (!feature.geometry) return;
    const highlightStyle = {
        color: "#FFD600",
        weight: 4,
        opacity: 1,
        fillOpacity: 0.15,
        fillColor: "#FFD600",
        dashArray: "",
        interactive: false,
    };
    try {
        if (feature.geometry.type === "Point") {
            const coords = feature.geometry.coordinates;
            const circle = L.circleMarker([coords[1], coords[0]], {
                radius: 14,
                color: "#FFD600",
                weight: 4,
                opacity: 1,
                fillOpacity: 0.25,
                fillColor: "#FFD600",
                interactive: false,
            });
            circle.addTo(tableState._map);
            tableState._highlightLayers.push(circle);
        } else {
            const highlightLayer = L.geoJSON(feature, {
                style: () => highlightStyle,
                interactive: false,
                pointToLayer: (_f: any, latlng: any) => L.circleMarker(latlng, highlightStyle),
            });
            highlightLayer.addTo(tableState._map);
            tableState._highlightLayers.push(highlightLayer);
        }
    } catch (e) {
        Log.warn("[Table] Erreur surbrillance feature:", e);
    }
}

/** Active ou deactivates la surbrillance des entities selected sur the map. */
export function highlightSelection(active: boolean): void {
    clearHighlightLayers();
    tableState._highlightActive = active;

    if (!active) {
        Log.debug("[Table] Highlight disabled");
        fireEvent("table:highlightSelection", {
            layerId: tableState._currentLayerId,
            selectedIds: Array.from(tableState._selectedIds),
            active: false,
        });
        return;
    }

    if (tableState._selectedIds.size === 0) {
        Log.warn("[Table] No entity selected for highlighting");
        return;
    }

    const selectedFeatures = getSelectedFeatures();
    if (selectedFeatures.length === 0) {
        Log.warn("[Table] No feature found for highlighting");
        return;
    }

    const L = (globalThis as any).L;
    if (!L || typeof L.circleMarker !== "function" || typeof L.geoJSON !== "function") {
        Log.warn("[Table] Leaflet (L) unavailable for highlightSelection");
        return;
    }

    selectedFeatures.forEach((feature: any) => _addFeatureHighlight(feature, L));

    fireEvent("table:highlightSelection", {
        layerId: tableState._currentLayerId,
        selectedIds: Array.from(tableState._selectedIds),
        active: true,
    });

    Log.debug("[Table] Highlight enabled for", selectedFeatures.length, "entities");
}
