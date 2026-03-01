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
export { POICore } from "./core.ts";
export { POIMarkers } from "./markers.ts";
export { POINormalizers } from "./normalizers.ts";
export { POIPopup } from "./popup.ts";
export { POIRenderers } from "./renderers.ts";
export { POIShared } from "./shared.ts";
export { POISidepanel } from "./sidepanel.ts";

// Renderers spécialisés
export { RendererCore } from "./renderers/core.ts";
export { FieldRenderers } from "./renderers/field-renderers.ts";
export { MediaRenderers } from "./renderers/media-renderers.ts";
export { ComponentRenderers } from "./renderers/component-renderers.ts";
export { SectionOrchestrator } from "./renderers/section-orchestrator.ts";
export { RendererLinks } from "./renderers/links.ts";
export { LightboxManager } from "./renderers/lightbox-manager.ts";
export { UIBehaviors } from "./renderers/ui-behaviors.ts";
