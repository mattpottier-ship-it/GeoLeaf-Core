/**
 * GeoLeaf Table – Export Utilities
 * Pure export helpers extracted from geoleaf.table.js (Phase 8.2.2)
 *
 * @module table/export
 */
"use strict";

/**
 * Résout l'ID d'une feature GeoJSON de façon cohérente avec le renderer.
 * Miroir exact de la logique utilisée dans table/renderer.js.
 *
 * @param {Object} feature        - Feature GeoJSON
 * @param {number} syntheticIndex - Index de fallback (0-based)
 * @returns {string} ID résolu
 */
export function resolveFeatureId(feature, syntheticIndex) {
    // 1. ID standard GeoJSON
    if (feature.id != null && feature.id !== "") return String(feature.id);

    const p = feature.properties;
    if (!p) return "__gl_row_" + syntheticIndex;

    // 2. Propriétés d'identifiant courantes
    if (p.id      != null && p.id      !== "") return String(p.id);
    if (p.fid     != null && p.fid     !== "") return String(p.fid);
    if (p.osm_id  != null && p.osm_id  !== "") return String(p.osm_id);
    if (p.OBJECTID!= null && p.OBJECTID!== "") return String(p.OBJECTID);
    if (p.SITE_ID != null && p.SITE_ID !== "") return String(p.SITE_ID);
    if (p.code    != null && p.code    !== "") return String(p.code);
    if (p.IN1     != null && p.IN1     !== "") return String(p.IN1);

    // 3. Fallback : ID synthétique
    return "__gl_row_" + syntheticIndex;
}

/**
 * Construit une FeatureCollection GeoJSON à partir d'un tableau de features.
 *
 * @param {Array} features - Les features GeoJSON sélectionnées
 * @returns {{type: "FeatureCollection", features: Array}} FeatureCollection
 */
export function buildGeoJSONCollection(features) {
    return {
        type: "FeatureCollection",
        features: features.map(f => ({
            type: "Feature",
            properties: f.properties || {},
            geometry: f.geometry || null
        }))
    };
}

/**
 * Déclenche le téléchargement d'un fichier GeoJSON dans le navigateur.
 *
 * @param {Object} geojson   - Objet GeoJSON à sérialiser
 * @param {string} layerId   - ID de la couche (utilisé comme préfixe du nom de fichier)
 */
export function downloadGeoJSON(geojson, layerId) {
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
