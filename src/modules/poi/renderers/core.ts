/**
 * GeoLeaf POI Module - Renderers Core
 * Orchestrateur main pour the render du side panel POI
 * Phase 6.2 - Version refactorisee (837 LOC -> ~140 LOC)
 *
 * Architecture modulaire:
 * - lightbox-manager.js: Gestion lightbox
 * - ui-behaviors.js: UI behaviors (accordions, gallery)
 * - component-renderers.js: Renderers components (badges, links, lists, tables, tags)
 * - section-orchestrator.js: Dispatcher de sections + extraction values
 * - media-renderers-v2.js: Renderers media
 */
import { Log } from "../../log/index.js";
import { Config } from "../../config/config-primitives.js";
import { POIShared } from "../shared.ts";
import { POINormalizers } from "../normalizers.ts";
import { compareByOrder } from "../../utils/general-utils.js";
import { SectionOrchestrator } from "./section-orchestrator.ts";
import { LightboxManager } from "./lightbox-manager.ts";
import { UIBehaviors } from "./ui-behaviors.ts";
import { DOMSecurity } from "../../utils/dom-security.js";

// Initializesr les nouveaux modules
let sectionOrchestrator: any = null;
let lightboxManager: any = null;
let uiBehaviors: any = null;

/**
 * Initializes the modules (lazy loading)
 * @private
 */
function _initModules() {
    if (!sectionOrchestrator) {
        sectionOrchestrator = new SectionOrchestrator();
    }
    if (!lightboxManager) {
        lightboxManager = new LightboxManager();
    }
    if (!uiBehaviors) {
        uiBehaviors = UIBehaviors;
    }
}

/**
 * Populates the side panel with POI data using the JSON layout.
 *
 * @param {object} poi - Normalized POI.
 * @param {object} customLayout - Custom layout (optional).
 * @returns {Promise<void>}
 */
function _getDefaultLayoutExtra(): any[] {
    return [
        {
            type: "gallery",
            label: "Galerie photos",
            field: "attributes.gallery",
            accordion: true,
            defaultOpen: true,
        },
        {
            type: "list",
            label: "Prix",
            field: "attributes.price",
            accordion: true,
            defaultOpen: false,
        },
        {
            type: "reviews",
            label: "Avis r\u00e9cents",
            field: "attributes.reviews.recent",
            maxCount: 5,
            accordion: true,
            defaultOpen: false,
        },
        { type: "tags", label: "Tags", field: "attributes.tags", accordion: false },
        {
            type: "link",
            label: "Visiter le site web",
            field: "attributes.website",
            accordion: false,
        },
    ];
}

function _getDefaultLayout(): any[] {
    return [
        { type: "text", field: "title", style: "title", accordion: false },
        { type: "image", field: "attributes.mainImage", variant: "hero", accordion: false },
        { type: "text", field: "attributes.shortDescription", variant: "short", accordion: false },
        {
            type: "text",
            label: "Informations",
            field: "attributes.longDescription",
            variant: "multiline",
            accordion: true,
            defaultOpen: true,
        },
        {
            type: "text",
            label: "Description",
            field: "attributes.description_long",
            variant: "multiline",
            accordion: true,
            defaultOpen: true,
        },
        ..._getDefaultLayoutExtra(),
    ];
}

function _resolveLayoutFromNormalized(normalized: any): any[] | null {
    if (!normalized._sidepanelConfig) return null;
    if (!normalized._sidepanelConfig.detailLayout) return null;
    if (Log) Log.info("[POI] Layout retrieved from layer config attached to the POI");
    return normalized._sidepanelConfig.detailLayout;
}

function _resolveLayoutFromProfile(): any[] | null {
    if (!Config) return null;
    if (typeof (Config as any).getActiveProfile !== "function") return null;
    const activeProfile = (Config as any).getActiveProfile();
    if (!activeProfile) return null;
    if (!activeProfile.panels) return null;
    if (!activeProfile.panels.detail) return null;
    if (Log) Log.info("[POI] Layout retrieved from active profile:", activeProfile.id || "unknown");
    return activeProfile.panels.detail.layout;
}

function _resolveLayout(customLayout: any, normalized: any, state: any): any[] {
    if (customLayout) return customLayout;
    const fromNorm = _resolveLayoutFromNormalized(normalized);
    if (fromNorm) return fromNorm;
    const fromProfile = _resolveLayoutFromProfile();
    if (fromProfile) return fromProfile;
    if (
        state.poiConfig &&
        state.poiConfig.panels &&
        state.poiConfig.panels.detail &&
        state.poiConfig.panels.detail.layout
    ) {
        return state.poiConfig.panels.detail.layout;
    }
    if (Log) Log.warn("[POI] No layout found, using default layout");
    return _getDefaultLayout();
}

async function _renderSections(
    sortedLayout: any[],
    normalized: any,
    state: any
): Promise<HTMLElement> {
    const body = document.createElement("div");
    body.className = "gl-poi-sidepanel__body";
    for (const section of sortedLayout) {
        try {
            const element = sectionOrchestrator
                ? await sectionOrchestrator.renderSection(section, normalized, state)
                : null;
            if (element) {
                body.appendChild(element);
                if (Log) Log.info("[POI] ✓ Section added:", section.label || section.type);
            } else {
                if (Log)
                    Log.warn(
                        "[POI] ✗ Section skipped (element null):",
                        section.label || section.type,
                        "- field:",
                        section.field
                    );
            }
        } catch (error) {
            console.error("[SIDEPANEL] ERROR rendering section:", section.label, error);
            if (Log) Log.error("[POI] Error rendering section:", section.label, error);
        }
    }
    return body;
}

function _attachPostRenderBehaviors(normalized: any, body: HTMLElement, state: any): void {
    const singleAccordion = normalized._sidepanelConfig?.singleAccordion;
    if (singleAccordion === true && uiBehaviors) {
        uiBehaviors.attachSingleAccordionBehavior(body);
    }
    if (uiBehaviors) {
        uiBehaviors.attachGalleryEvents(state.sidePanelElement, lightboxManager);
    }
}

function _debugNormalized(normalized: any): void {
    if (!Log) return;
    Log.debug("[POI] Normalized POI:", normalized.title || normalized.label);
    Log.debug("[POI] Available attribute fields:", Object.keys(normalized.attributes || {}));
}

async function populateSidePanel(poi: any, customLayout: any) {
    _initModules();
    const shared = POIShared;
    if (!shared) {
        if (Log) Log.error("[POI] populateSidePanel : shared is null");
        return;
    }
    const state = shared.state;
    if (!state.sidePanelElement) {
        if (Log) Log.error("[POI] populateSidePanel : sidePanelElement not found");
        return;
    }
    const contentDiv = state.sidePanelElement.querySelector(".gl-poi-sidepanel__content");
    if (!contentDiv) return;
    DOMSecurity.clearElementFast(contentDiv);
    delete state.sidePanelElement._galleryEventsAttached;
    const normalizers = POINormalizers;
    const normalized = normalizers ? normalizers.normalizePoi(poi) : poi;
    _debugNormalized(normalized);
    const layout = _resolveLayout(customLayout, normalized, state);
    const sortedLayout = [...layout].sort(compareByOrder);
    if (Log) Log.info("[POI] Generating side panel with", sortedLayout.length, "sections");
    const body = await _renderSections(sortedLayout, normalized, state);
    contentDiv.appendChild(body);
    _attachPostRenderBehaviors(normalized, body, state);
}

const RendererCore = {
    populateSidePanel,
};

export { RendererCore };
