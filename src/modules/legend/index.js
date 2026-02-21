/**
 * GeoLeaf Legend — Barrel export
 * Point d'entrée unique pour le sous-module legend/
 *
 * Note : Legend (namespace assemblé, stateful) n'est PAS exporté ici.
 * Utiliser la façade geoleaf.legend.js ou importer directement legend/legend-api.js.
 *
 * @module legend
 */
export { LegendControl } from "./legend-control.js";
export { LegendGenerator } from "./legend-generator.js";
export { LegendRenderer } from "./legend-renderer.js";
export { BasemapSelector } from "./basemap-selector.js";
