/**
 * GeoLeaf POI — Barrel export
 * Point d'entrée unique pour le sous-module poi/
 *
 * Note : POI (namespace assemblé, stateful) n'est PAS exporté ici.
 * Utiliser la façade geoleaf.poi.js ou importer directement poi/poi-api.js.
 *
 * @module poi
 */

// Modules principaux
export { POICore } from "./core.js";
export { POIMarkers } from "./markers.js";
export { POINormalizers } from "./normalizers.js";
export { POIPopup } from "./popup.js";
export { POIRenderers } from "./renderers.js";
export { POIShared } from "./shared.js";
export { POISidepanel } from "./sidepanel.js";

// Renderers spécialisés
export { RendererCore } from "./renderers/core.js";
export { FieldRenderers } from "./renderers/field-renderers.js";
export { MediaRenderers } from "./renderers/media-renderers.js";
export { ComponentRenderers } from "./renderers/component-renderers.js";
export { SectionOrchestrator } from "./renderers/section-orchestrator.js";
export { RendererLinks } from "./renderers/links.js";
export { LightboxManager } from "./renderers/lightbox-manager.js";
export { UIBehaviors } from "./renderers/ui-behaviors.js";
