/**
 * globals.poi.js — Bridge UMD/ESM : B10 — poi, add-form, renderers
 *
 * @see globals.js (orchestrateur)
 */

// B10 : poi — direct
import { POIShared } from "./poi/shared.js";
import { POINormalizers } from "./poi/normalizers.js";
import { POIMarkers } from "./poi/markers.js";
import { POIPopup } from "./poi/popup.js";
import { POISidepanel } from "./poi/sidepanel.js";
import { POIRenderers } from "./poi/renderers.js";
import { POICore } from "./poi/core.js";
// B10 : poi/renderers/
import { ComponentRenderers } from "./poi/renderers/component-renderers.js";
import { RendererCore } from "./poi/renderers/core.js";
// FieldRenderers and MediaRenderers are imported and assigned in globals.api.js
import { LightboxManager } from "./poi/renderers/lightbox-manager.js";
import { RendererLinks } from "./poi/renderers/links.js";
// MediaRenderers assigned in globals.api.js
import { SectionOrchestrator } from "./poi/renderers/section-orchestrator.js";
import { UIBehaviors } from "./poi/renderers/ui-behaviors.js";
import { POICoreContract } from "../contracts/poi-core.contract.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

// ── B10 assignations : poi ───────────────────────────────────────────────────
if (!_g.GeoLeaf.POI) _g.GeoLeaf.POI = {};
_g.GeoLeaf._POIShared = POIShared;
_g.GeoLeaf._POINormalizers = POINormalizers;
_g.GeoLeaf._POIMarkers = POIMarkers;
_g.GeoLeaf._POIPopup = POIPopup;
_g.GeoLeaf._POISidePanel = POISidepanel;
_g.GeoLeaf._POIRenderers = POIRenderers;
_g.GeoLeaf._POICore = POICore;
// poi/renderers/
_g.GeoLeaf.ComponentRenderers = ComponentRenderers;
_g.GeoLeaf._POIRenderersCore = RendererCore;
_g.GeoLeaf.LightboxManager = LightboxManager;
_g.GeoLeaf._lightboxManager = new LightboxManager();
_g.GeoLeaf._POIRendererLinks = RendererLinks;
_g.GeoLeaf.SectionOrchestrator = SectionOrchestrator;
_g.GeoLeaf._POIUIBehaviors = UIBehaviors;

// ── Enregistrer showPoiDetails dans POICoreContract (utilisé par markers.js) ──
// Permet à POICoreContract.showPoiDetails(poi) de déléguer vers le side panel.
POICoreContract.register({
    showPoiDetails: (poi, customLayout) => POISidepanel.openSidePanel(poi, customLayout)
});
