/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf Table – Export Utilities
 * Pure export helpers extracted from geoleaf.table.js (Phase 8.2.2)
 *
 * @module table/export
 */

interface GeoJSONFeature {
    id?: string | number;
    properties?: Record<string, unknown>;
    geometry?: unknown;
}

/**
 * Resolves the ID of a GeoJSON feature consistently with the renderer.
 */
const _FEATURE_ID_PROPS = ["id", "fid", "osm_id", "OBJECTID", "SITE_ID", "code", "IN1"];

export function resolveFeatureId(feature: GeoJSONFeature, syntheticIndex: number): string {
    if (feature.id != null && feature.id !== "") return String(feature.id);

    const p = feature.properties;
    if (!p) return "__gl_row_" + syntheticIndex;

    for (const key of _FEATURE_ID_PROPS) {
        const v = p[key];
        if (v != null && v !== "") return String(v);
    }

    return "__gl_row_" + syntheticIndex;
}

/**
 * Builds a GeoJSON FeatureCollection from an array of features.
 */
export function buildGeoJSONCollection(features: GeoJSONFeature[]): {
    type: string;
    features: unknown[];
} {
    return {
        type: "FeatureCollection",
        features: features.map((f) => ({
            type: "Feature",
            properties: f.properties || {},
            geometry: f.geometry || null,
        })),
    };
}

/**
 * Triggers download of a GeoJSON file in the browser.
 */
export function downloadGeoJSON(geojson: unknown, layerId?: string): void {
    const json = JSON.stringify(geojson, null, 2);
    const blob = new Blob([json], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (layerId || "export") + "_selection.geojson";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
