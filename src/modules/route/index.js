/**
 * GeoLeaf Route — Barrel export
 * Point d'entrée unique pour le sous-module route/
 *
 * Note : Route (namespace assemblé, stateful) n'est PAS exporté ici.
 * Utiliser la façade geoleaf.route.js ou importer directement route/route-api.js.
 *
 * @module route
 */
export { RouteLoaders } from "./loaders.js";
export { RouteStyleResolver } from "./style-resolver.js";
export { RoutePopupBuilder } from "./popup-builder.js";
export { RouteLayerManager } from "./layer-manager.js";
