/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Side Panel
 * Management of the detailed display side panel for POI
 */
import { Log } from "../log/index.js";
import { POIShared } from "./shared.ts";
import { POIRenderers } from "./renderers.ts";
import { createElement } from "../utils/dom-helpers.js";
import { getLabel } from "../i18n/i18n.js";

/**
 * Shorthand for createElement
 */
const $create = (tag: any, props: any, ...children: any[]) => {
    return createElement(tag, props, ...children);
};

// Reference au module shared

/**
 * Creates the element DOM du panel side si non existing.
 */
function createSidePanel() {
    const shared = POIShared;
    if (!shared) return;
    const state = shared.state;

    if (state.sidePanelElement) return; // Already created

    // Createsr l'overlay
    const overlay = $create("div", {
        className: "gl-poi-sidepanel-overlay",
        attributes: { "aria-hidden": "true" },
    });
    // Add to .gl-main for fullscreen mode support
    const glMain = document.querySelector(".gl-main");
    if (glMain) {
        glMain.appendChild(overlay);
    } else {
        document.body.appendChild(overlay);
    }
    state.sidePanelOverlay = overlay;

    // Createsr the panel
    const panel = $create("aside", {
        className: "gl-poi-sidepanel",
        attributes: {
            "aria-hidden": "true",
            role: "complementary",
            "aria-label": getLabel("aria.sidepanel.landmark"), // F2
        },
    });

    // Createsr le header avec button fermer
    const header = $create("div", { className: "gl-poi-sidepanel__header" });
    const closeBtn = $create("button", {
        className: "gl-poi-sidepanel__close",
        attributes: { "aria-label": getLabel("aria.sidepanel.close") }, // i18n
        textContent: "×",
        onClick: closeSidePanel,
    });
    header.appendChild(closeBtn);

    // Createsr le content
    const content = $create("div", { className: "gl-poi-sidepanel__content" });

    panel.appendChild(header);
    panel.appendChild(content);
    // Add to .gl-main for fullscreen mode support
    if (glMain) {
        glMain.appendChild(panel);
    } else {
        document.body.appendChild(panel);
    }
    state.sidePanelElement = panel;
    state.sidePanelContent = content;

    // Event listners
    overlay.addEventListener("click", closeSidePanel);

    if (Log) Log.info("[POI] Side panel created.");
}

/**
 * Ouvre the panel side with thes infos completes du POI.
 *
 * @param {object} poi - Data completes du POI.
 * @param {object} customLayout - Layout custom (optional).
 * @returns {Promise<void>}
 */
async function _populatePanel(poi: any, customLayout: any): Promise<void> {
    const renderers = POIRenderers;
    if (typeof renderers?.populateSidePanel === "function") {
        try {
            await renderers.populateSidePanel(poi, customLayout);
        } catch (err: any) {
            Log?.error("[POI] Erreur lors du peuplement du side panel :", err);
        }
    } else {
        Log?.warn("[POI] openSidePanel() : renderers.populateSidePanel non disponible");
    }
}

async function openSidePanel(poi: any, customLayout?: any) {
    if (!poi) {
        Log?.warn("[POI] openSidePanel() : POI invalide.");
        return;
    }

    Log?.debug("[POI] openSidePanel:", poi.id ?? poi.name);

    const shared = POIShared;
    if (!shared) {
        Log?.error("[POI] openSidePanel() : POIShared is null");
        return;
    }
    const state = shared.state;

    // S'assurer que the panel existe
    if (!state.sidePanelElement) {
        createSidePanel();
    }

    if (!state.sidePanelElement) {
        Log?.error("[POI] openSidePanel() : Unable to create the side panel.");
        return;
    }

    state.currentPoiInPanel = poi;
    state.currentGalleryIndex = 0;

    await _populatePanel(poi, customLayout);

    // Displaysr l'overlay et the panel avec animation
    if (state.sidePanelOverlay) {
        state.sidePanelOverlay.classList.add("open");
    }
    state.sidePanelElement.classList.add("open");
    state.sidePanelElement.setAttribute("aria-hidden", "false");

    // F3: move focus to close button on panel open
    const closeBtnEl = state.sidePanelElement.querySelector(
        ".gl-poi-sidepanel__close"
    ) as HTMLElement | null;
    if (closeBtnEl) closeBtnEl.focus();

    // F4: Escape key closes the panel
    const _escapeHandler = (e: any) => {
        if (e.key === "Escape") {
            closeSidePanel();
            document.removeEventListener("keydown", _escapeHandler);
        }
    };
    document.addEventListener("keydown", _escapeHandler);
    (state as any)._escapeHandler = _escapeHandler;

    // Add class to body to shift the map
    document.body.classList.add("gl-poi-sidepanel-open");

    Log?.info("[POI] Side panel opened for:", poi.title ?? poi.name ?? poi.label);
}

/**
 * Ferme the panel side.
 */
function closeSidePanel() {
    const shared = POIShared;
    if (!shared) return;
    const state = shared.state;

    if (!state.sidePanelElement) return;

    state.sidePanelElement.classList.remove("open");
    state.sidePanelElement.setAttribute("aria-hidden", "true");

    // F4: remove Escape listner
    if ((state as any)._escapeHandler) {
        document.removeEventListener("keydown", (state as any)._escapeHandler);
        (state as any)._escapeHandler = null;
    }

    if (state.sidePanelOverlay) {
        state.sidePanelOverlay.classList.remove("open");
    }

    // Retirer class du body
    document.body.classList.remove("gl-poi-sidepanel-open");

    // Nettoyer la lightbox globale
    const lightbox = document.querySelector(".gl-poi-lightbox-global");
    if (lightbox) {
        lightbox.remove();
    }

    state.currentPoiInPanel = null;

    if (Log) Log.info("[POI] Side panel closed.");
}

/**
 * Alias pour fermer the panel (API public).
 */
function hideSidePanel() {
    closeSidePanel();
}

// ========================================
//   EXPORT
// ========================================

const POISidepanel = {
    createSidePanel,
    openSidePanel,
    closeSidePanel,
    hideSidePanel,
};

// ── ESM Export ──
export { POISidepanel };
