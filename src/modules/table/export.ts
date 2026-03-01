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
 * Résout l'ID d'une feature GeoJSON de façon cohérente avec le renderer.
 */
export function resolveFeatureId(feature: GeoJSONFeature, syntheticIndex: number): string {
    if (feature.id != null && feature.id !== "") return String(feature.id);

    const p = feature.properties;
    if (!p) return "__gl_row_" + syntheticIndex;

    if (p.id != null && p.id !== "") return String(p.id);
    if (p.fid != null && p.fid !== "") return String(p.fid);
    if (p.osm_id != null && p.osm_id !== "") return String(p.osm_id);
    if (p.OBJECTID != null && p.OBJECTID !== "") return String(p.OBJECTID);
    if (p.SITE_ID != null && p.SITE_ID !== "") return String(p.SITE_ID);
    if (p.code != null && p.code !== "") return String(p.code);
    if (p.IN1 != null && p.IN1 !== "") return String(p.IN1);

    return "__gl_row_" + syntheticIndex;
}

/**
 * Construit une FeatureCollection GeoJSON à partir d'un tableau de features.
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
 * Déclenche le téléchargement d'un fichier GeoJSON dans le navigateur.
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
