/**
 * GeoLeaf Table — Barrel export
 * Point d'entrée unique pour le sous-module table/
 *
 * Note : Table (namespace assemblé, stateful) n'est PAS exporté ici.
 * Utiliser la façade geoleaf.table.js ou importer directement table/table-api.js.
 *
 * @module table
 */
export { TablePanel } from "./panel.js";
export { TableRenderer } from "./renderer.js";
export { sortInPlace, nextSortState } from "./sort.js";
export { resolveFeatureId, buildGeoJSONCollection, downloadGeoJSON } from "./export.js";
