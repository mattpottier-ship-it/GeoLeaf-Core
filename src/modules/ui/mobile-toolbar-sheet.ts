/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf UI – Mobile toolbar: sheet modal (full-height overlay panel).
 * @module ui/mobile-toolbar-sheet
 */

import { domState, getDefaultSheetTitles } from "./mobile-toolbar-state.js";
import { createSvgIcon, refreshFilterButtonState } from "./mobile-toolbar-pill.js";
import { getLabel } from "../i18n/i18n.js";

// C1: guard — only one document-level Escape listner at a time
let _escapeListenerAdded = false;

function _attachFocusTrap(overlay: HTMLElement): void {
    overlay.addEventListener("keydown", (e) => {
        if (!overlay.classList.contains("open") || e.key !== "Tab") return;
        const focusable = Array.from(
            overlay.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter((el) => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
}

/** Creates the sheet overlay DOM and attaches keyboard / clickk handlers. */
export function createSheetDom(): HTMLElement {
    const overlay = document.createElement("div");
    overlay.className = "gl-sheet-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "gl-sheet-panel-title");

    const panel = document.createElement("div");
    panel.className = "gl-sheet-panel";

    const header = document.createElement("div");
    header.className = "gl-sheet-panel__header";

    const title = document.createElement("h2");
    title.className = "gl-sheet-panel__title";
    title.id = "gl-sheet-panel-title";
    domState.panelTitle = title;

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "gl-sheet-panel__close";
    closeBtn.setAttribute("aria-label", getLabel("aria.sheet.close"));
    closeBtn.appendChild(createSvgIcon("M18 6L6 18M6 6l12 12", 24));

    const body = document.createElement("div");
    body.className = "gl-sheet-panel__body";
    body.id = "gl-sheet-panel-body";
    domState.panelBody = body;

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);
    panel.appendChild(body);
    overlay.appendChild(panel);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeSheet();
    });
    closeBtn.addEventListener("click", () => closeSheet());

    _attachFocusTrap(overlay);

    // C1: add document Escape listner only once
    if (!_escapeListenerAdded) {
        _escapeListenerAdded = true;
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && domState.overlay?.classList.contains("open")) closeSheet();
        });
    }

    return overlay;
}

/** Moves a node into the sheet body and registers it for restoration on close. */
function moveNodeToSheetBody(node: HTMLElement | null): void {
    if (!node || !domState.panelBody) return;
    const parent = node.parentElement;
    if (!parent) return;
    const nextSibling = node.nextSibling;
    domState.restoreOnClose.push({ parent, node, nextSibling });
    domState.panelBody.appendChild(node);
}

/** Injects existing DOM panels (filters, layers, table, legend) into the sheet body. */
function injectSheetContent(sheetId: string): void {
    if (!domState.panelBody) return;
    domState.restoreOnClose = [];
    if (sheetId === "filters") {
        const panel = document.getElementById("gl-filter-panel");
        if (panel) {
            panel.classList.add("is-open", "gl-sheet-content");
            moveNodeToSheetBody(panel);
        }
    } else if (sheetId === "layers") {
        const lm = document.querySelector(".gl-layer-manager") as HTMLElement | null;
        if (lm) {
            lm.classList.remove("gl-layer-manager--collapsed");
            moveNodeToSheetBody(lm);
        }
    } else if (sheetId === "table") {
        const tablePanel = document.querySelector(".gl-table-panel") as HTMLElement | null;
        if (tablePanel) {
            tablePanel.classList.add("is-visible", "gl-sheet-content");
            moveNodeToSheetBody(tablePanel);
        }
    } else if (sheetId === "legend") {
        const legendEl = document.querySelector(".gl-map-legend") as HTMLElement | null;
        if (legendEl) moveNodeToSheetBody(legendEl);
    }
}

/** Restores nodes moved into the sheet back to their original positions. */
function restoreMovedNodes(): void {
    for (let i = domState.restoreOnClose.length - 1; i >= 0; i--) {
        const { parent, node, nextSibling } = domState.restoreOnClose[i];
        node.classList.remove("gl-sheet-content");
        if (nextSibling && nextSibling.parentNode === parent) {
            parent.insertBefore(node, nextSibling);
        } else {
            parent.appendChild(node);
        }
    }
    domState.restoreOnClose = [];
    document.getElementById("gl-filter-panel")?.classList.remove("is-open");
    // Keep is-visible if the table panel is open via desktop panel (data-gl-open=true)
    const tpRestore = document.querySelector<HTMLElement>(".gl-table-panel");
    if (tpRestore && tpRestore.getAttribute("data-gl-open") !== "true") {
        tpRestore.classList.remove("is-visible");
    }
}

/** Opens the sheet overlay for the given sheetId. */
export function openSheet(sheetId: string): void {
    const titles = { ...getDefaultSheetTitles(), ...(domState.options?.sheetTitles ?? {}) };
    const title = titles[sheetId] ?? sheetId;
    if (domState.panelTitle) domState.panelTitle.textContent = title;
    if (domState.panelBody) domState.panelBody.innerHTML = "";
    domState.activeSheetId = sheetId;
    domState.lastFocusedElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    domState.overlay?.classList.add("open");
    domState.overlay?.setAttribute("aria-labelledby", "gl-sheet-panel-title");
    const openedBtn = domState.toolbar?.querySelector(`[data-gl-sheet="${sheetId}"]`);
    if (openedBtn instanceof HTMLElement) openedBtn.setAttribute("aria-expanded", "true");
    if (["filters", "layers", "table", "legend"].includes(sheetId)) {
        injectSheetContent(sheetId);
    }
    const sheetCloseBtn = domState.overlay?.querySelector<HTMLElement>(".gl-sheet-panel__close");
    sheetCloseBtn?.focus();
    refreshFilterButtonState();
}

/** Closes the sheet overlay and restores any moved nodes. */
export function closeSheet(): void {
    restoreMovedNodes();
    domState.overlay?.classList.remove("open");
    domState.activeSheetId = null;
    domState.toolbar
        ?.querySelectorAll("[aria-expanded]")
        .forEach((el) => el.setAttribute("aria-expanded", "false"));
    if (domState.lastFocusedElement) {
        domState.lastFocusedElement.focus();
        domState.lastFocusedElement = null;
    }
    refreshFilterButtonState();
}
