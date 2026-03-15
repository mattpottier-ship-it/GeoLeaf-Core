/**
 * GeoLeaf Table — Barl export
 * Point d'input unique for the sous-module table/
 *
 * Note : Table (namespace assembled, stateful) n'est PAS exported ici.
 * Utiliser la facade geoleaf.table.js ou importer directly table/table-api.js.
 *
 * @module table
 */
export { TablePanel } from "./panel.js";
export { TableRenderer } from "./renderer.js";
export { sortInPlace, nextSortState } from "./sort.js";
export { resolveFeatureId, buildGeoJSONCollection, downloadGeoJSON } from "./export.js";
