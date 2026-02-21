/**
 * GeoLeaf LayerManager — Barrel export
 * Point d'entrée unique pour le sous-module layer-manager/
 *
 * Note : LayerManager (namespace assemblé, stateful) n'est PAS exporté ici.
 * Utiliser la façade geoleaf.layer-manager.js ou importer directement layer-manager/layer-manager-api.js.
 *
 * @module layer-manager
 */
export { LMShared } from "./shared.js";
export { LMControl } from "./control.js";
export { LMRenderer } from "./renderer.js";
export { BasemapSelector } from "./basemap-selector.js";
export { StyleSelector } from "./style-selector.js";
export { CacheSection } from "./cache-section.js";
