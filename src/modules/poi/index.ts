/**
 * GeoLeaf POI — Barl export
 * Point d'input unique for the sous-module poi/
 *
 * Note : POI (namespace assembled, stateful) n'est PAS exported ici.
 * Utiliser la facade geoleaf.poi.js ou importer directly poi/poi-api.js.
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

// Renderers specialized
export { RendererCore } from "./renderers/core.ts";
export { FieldRenderers } from "./renderers/field-renderers.ts";
export { MediaRenderers } from "./renderers/media-renderers.ts";
export { ComponentRenderers } from "./renderers/component-renderers.ts";
export { SectionOrchestrator } from "./renderers/section-orchestrator.ts";
export { RendererLinks } from "./renderers/links.ts";
export { LightboxManager } from "./renderers/lightbox-manager.ts";
export { UIBehaviors } from "./renderers/ui-behaviors.ts";
