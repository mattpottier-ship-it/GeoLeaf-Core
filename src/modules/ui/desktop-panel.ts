/* eslint-disable security/detect-object-injection */
/**

 * desktop-panel.ts

 *

 * Panneau lateral droit avec tabs verticaux collapsibles (>= 1440px).

 * Tabs : Filtres / Couches / Legende / Array

 * Les elements sont deplaces dans the panel apres import des modules secondarys.

 * Appeler activateDesktopPanel() from init.ts apres Legend + LayerManager + Table.

 */

import { TableContract } from "../../contracts/table.contract.js";
import { getLabel } from "../i18n/i18n.js";

export interface DesktopPanelOptions {
    glMain: HTMLElement;

    titleFilters?: string;

    titleLayers?: string;

    titleLegend?: string;

    titleTable?: string;
}

interface RestoreEntry {
    node: HTMLElement;

    parent: Element;

    nextSibling: ChildNode | null;
}

const BREAKPOINT = "(min-width: 1440px)";

const PANEL_ID = "gl-right-panel";

let _panel: HTMLElement | null = null;

let _restoreEntries: RestoreEntry[] = [];

let _mql: MediaQueryList | null = null;

let _isActive = false;

let _legendObserver: MutationObserver | null = null;

// DOM Builders

function buildTabsDom(
    panel: HTMLElement,

    titles: { filters: string; layers: string; legend: string; table: string }
): void {
    const tabs = document.createElement("div");

    tabs.className = "gl-rp-tabs";

    tabs.setAttribute("role", "tablist");

    tabs.setAttribute("aria-label", getLabel("aria.panel.nav"));

    const defs = [
        { id: "filters", label: titles.filters },

        { id: "layers", label: titles.layers },

        { id: "legend", label: titles.legend },

        { id: "table", label: titles.table },
    ];

    for (let i = 0; i < defs.length; i++) {
        const def = defs[i];
        const btn = document.createElement("button");

        btn.type = "button";

        btn.className = "gl-rp-tab";

        btn.id = "gl-rp-tab-" + def.id; // B2: tab id for aria-labelledby

        btn.dataset.glRpTab = def.id;

        btn.setAttribute("role", "tab");

        btn.setAttribute("aria-controls", "gl-rp-pane-" + def.id);

        btn.setAttribute("aria-selected", "false");

        btn.setAttribute("tabindex", i === 0 ? "0" : "-1"); // B4: roving tabindex

        btn.textContent = def.label;

        btn.addEventListener("click", () => handleTabClick(panel, def.id));

        tabs.appendChild(btn);
    }

    // B3: arrow key navigation (roving focus, no auto-select)
    tabs.addEventListener("keydown", (e: KeyboardEvent) => {
        const btns = Array.from(tabs.querySelectorAll<HTMLElement>("[role='tab']"));
        const idx = btns.indexOf(document.activeElement as HTMLElement);
        if (idx === -1) return;
        let next = idx;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
            e.preventDefault();
            next = (idx + 1) % btns.length;
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
            e.preventDefault();
            next = (idx - 1 + btns.length) % btns.length;
        } else if (e.key === "Home") {
            e.preventDefault();
            next = 0;
        } else if (e.key === "End") {
            e.preventDefault();
            next = btns.length - 1;
        } else {
            return;
        }
        btns[next].focus();
    });

    panel.appendChild(tabs);
}

function buildContentDom(panel: HTMLElement): void {
    const content = document.createElement("div");

    content.className = "gl-rp-content";

    const ids = ["filters", "layers", "legend"];

    for (const id of ids) {
        const pane = document.createElement("div");

        pane.className = "gl-rp-pane";

        pane.id = "gl-rp-pane-" + id;

        pane.setAttribute("role", "tabpanel");

        pane.setAttribute("aria-labelledby", "gl-rp-tab-" + id); // B5

        pane.setAttribute("tabindex", "0"); // B5

        content.appendChild(pane);
    }

    // Contenu insere AVANT la bande d tabs (ordre flex row: contenu | tabs)

    panel.insertBefore(content, panel.firstChild);
}

function buildPanelDom(
    glMain: HTMLElement,

    titles: { filters: string; layers: string; legend: string; table: string }
): HTMLElement {
    const panel = document.createElement("div");

    panel.id = PANEL_ID;

    panel.setAttribute("aria-label", getLabel("aria.panel.lateral"));

    buildTabsDom(panel, titles);

    buildContentDom(panel);

    glMain.appendChild(panel);

    return panel;
}

// Tab Interaction

function _closeAllTabs(panel: HTMLElement): void {
    const allTabs = Array.from(panel.querySelectorAll<HTMLElement>(".gl-rp-tab"));
    allTabs.forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
        t.setAttribute("tabindex", "-1"); // B4: roving — reset all
    });
    // Keep first tab as keyboard entry point when none is active
    if (allTabs.length) allTabs[0].setAttribute("tabindex", "0");

    panel
        .querySelectorAll<HTMLElement>(".gl-rp-pane")
        .forEach((p) => p.classList.remove("is-active"));

    panel.classList.remove("has-active");
}

function _closeTablePanel(tp: HTMLElement): void {
    tp.setAttribute("data-gl-open", "false");

    tp.classList.remove("is-visible");

    const props = [
        "position",
        "top",
        "bottom",
        "right",
        "left",
        "width",
        "height",
        "transform",
        "display",
        "visibility",
        "opacity",
        "z-index",
    ];

    props.forEach((p) => tp.style.removeProperty(p));

    TableContract.toggle();
}

function _openTablePanel(tp: HTMLElement, tableTab: HTMLElement | null): void {
    tp.setAttribute("data-gl-open", "true");

    tp.classList.add("is-visible");

    tp.style.setProperty("display", "flex", "important");

    tp.style.setProperty("visibility", "visible", "important");

    tp.style.setProperty("opacity", "1", "important");

    tp.style.setProperty("z-index", "1100", "important");

    TableContract.show();

    tableTab?.classList.add("is-active");

    tableTab?.setAttribute("aria-selected", "true");
}

function _resolveTablePanel(_panel: HTMLElement): HTMLElement | null {
    let tp = document.querySelector<HTMLElement>(".gl-table-panel");

    if (!tp) {
        const _g = (typeof globalThis !== "undefined" ? globalThis : window) as Record<
            string,
            unknown
        >;

        const _container = (_g["GeoLeaf"] as any)?.["Table"]?.["_container"] as
            | HTMLElement
            | null
            | undefined;

        tp = _container || null;

        if (tp && !document.body.contains(tp)) document.body.appendChild(tp);
    }

    return tp;
}

function _handleTableTab(panel: HTMLElement): void {
    const tableTab = panel.querySelector<HTMLElement>("[data-gl-rp-tab='table']");

    _closeAllTabs(panel);

    const tp = _resolveTablePanel(panel);

    if (!tp) {
        console.warn("[GL-Desktop] .gl-table-panel not found — Table.init() not called?");

        return;
    }

    const isOpen = tp.getAttribute("data-gl-open") === "true";

    if (!isOpen) {
        _openTablePanel(tp, tableTab);
    } else {
        _closeTablePanel(tp);
    }
}

function _closeOpenTablePanelIfAny(): void {
    const _tp = document.querySelector<HTMLElement>(".gl-table-panel");

    if (_tp && _tp.getAttribute("data-gl-open") === "true") {
        _closeTablePanel(_tp);
    }
}

function handleTabClick(panel: HTMLElement, tabId: string): void {
    /* Array → panneat the bottom pleine width, independent du side panel */

    if (tabId === "table") {
        _handleTableTab(panel);

        return;
    }

    /* Close the table if another tab is clicked */

    _closeOpenTablePanelIfAny();

    const targetTab = panel.querySelector<HTMLElement>("[data-gl-rp-tab='" + tabId + "']");

    const targetPane = document.getElementById("gl-rp-pane-" + tabId);

    if (!targetTab || !targetPane) return;

    const isAlreadyActive = targetTab.classList.contains("is-active");

    _closeAllTabs(panel);

    if (isAlreadyActive) return;

    targetTab.classList.add("is-active");

    targetTab.setAttribute("aria-selected", "true");

    targetTab.setAttribute("tabindex", "0"); // B4: active tab in tab order

    targetPane.classList.add("is-active");

    panel.classList.add("has-active");
}

// Move / Restore

function storeAndMove(node: HTMLElement, targetBody: HTMLElement): void {
    _restoreEntries.push({
        node,

        parent: node.parentElement as Element,

        nextSibling: node.nextSibling as ChildNode | null,
    });

    targetBody.appendChild(node);
}

// Activate / Deactivate

function activatePanel(): void {
    if (_isActive) return;

    _isActive = true;

    const pFilters = document.getElementById("gl-rp-pane-filters");

    const pLayers = document.getElementById("gl-rp-pane-layers");

    const pLegend = document.getElementById("gl-rp-pane-legend");

    if (!pFilters || !pLayers || !pLegend) return;

    const filterPanel = document.getElementById("gl-filter-panel") as HTMLElement | null;

    if (filterPanel) {
        storeAndMove(filterPanel, pFilters);
    }

    const layerManager = document.querySelector<HTMLElement>(".gl-layer-manager");

    if (layerManager) {
        storeAndMove(layerManager, pLayers);
    }

    const legend = document.querySelector<HTMLElement>(".gl-map-legend");

    if (legend) {
        storeAndMove(legend, pLegend);
    } else {
        // La legende est creee de facon asynchrone (fetch des styles) :

        // on surveille le DOM et on deplace l element quand il apparait.

        _legendObserver = new MutationObserver(() => {
            const el = document.querySelector<HTMLElement>(".gl-map-legend");

            if (el && !pLegend.contains(el)) {
                storeAndMove(el, pLegend);

                _legendObserver!.disconnect();

                _legendObserver = null;
            }
        });

        _legendObserver.observe(document.body, { childList: true, subtree: true });
    }

    document.body.classList.add("gl-right-panel-open");
}

function deactivatePanel(): void {
    if (!_isActive) return;

    _isActive = false;

    if (_legendObserver) {
        _legendObserver.disconnect();

        _legendObserver = null;
    }

    for (let i = _restoreEntries.length - 1; i >= 0; i--) {
        const { node, parent, nextSibling } = _restoreEntries[i];

        try {
            if (nextSibling && nextSibling.parentNode === parent) {
                parent.insertBefore(node, nextSibling);
            } else {
                parent.appendChild(node);
            }
        } catch {
            // noeud detache - ignorer
        }
    }

    _restoreEntries = [];

    if (_panel) {
        _panel.querySelectorAll<HTMLElement>(".gl-rp-tab").forEach((t) => {
            t.classList.remove("is-active");

            t.setAttribute("aria-selected", "false");
        });

        _panel

            .querySelectorAll<HTMLElement>(".gl-rp-pane")

            .forEach((p) => p.classList.remove("is-active"));

        _panel.classList.remove("has-active");
    }

    document.body.classList.remove("gl-right-panel-open");
}

// MediaQuery Listner

function onMQChange(e: MediaQueryListEvent): void {
    if (!_panel) return;

    if (e.matches) {
        activatePanel();
    } else {
        deactivatePanel();
    }
}

// Public API

/**

 * Cree le DOM du panel lateral droit (>= 1440px).

 * N active PAS les deplacement d elements - appeler activateDesktopPanel() ensuite.

 */

export function initDesktopPanel(options: DesktopPanelOptions): void {
    const { glMain } = options;

    if (document.getElementById(PANEL_ID)) return;

    const titles = {
        filters: options.titleFilters || "Filtres",

        layers: options.titleLayers || "Couches",

        legend: options.titleLegend || "Legende",

        table: options.titleTable || "Tableau",
    };

    _panel = buildPanelDom(glMain, titles);

    _mql = window.matchMedia(BREAKPOINT);

    _mql.addEventListener("change", onMQChange);

    // Synchronize l'tab Array avec the events of the module Table

    document.addEventListener("geoleaf:table:opened", () => {
        if (!_panel) return;

        _panel.querySelectorAll<HTMLElement>(".gl-rp-tab").forEach((t) => {
            t.classList.remove("is-active");

            t.setAttribute("aria-selected", "false");
        });

        _panel

            .querySelectorAll<HTMLElement>(".gl-rp-pane")

            .forEach((p) => p.classList.remove("is-active"));

        _panel.classList.remove("has-active");

        const tableTab = _panel.querySelector<HTMLElement>("[data-gl-rp-tab='table']");

        tableTab?.classList.add("is-active");

        tableTab?.setAttribute("aria-selected", "true");
    });

    document.addEventListener("geoleaf:table:closed", () => {
        if (!_panel) return;

        const tableTab = _panel.querySelector<HTMLElement>("[data-gl-rp-tab='table']");

        tableTab?.classList.remove("is-active");

        tableTab?.setAttribute("aria-selected", "false");
    });

    // NE PAS appeler activatePanel() ici :

    // les elements (legend, layer-manager, table) n existent pas encore in the DOM.

    // init.ts appellera activateDesktopPanel() apres tous the modules secondarys.
}

/**

 * Deplace les elements (filtres, layers, legende, array) dans the panels.

 * A appeler APRES Legend.init(), LayerManager.init(), Table.init().

 */

export function activateDesktopPanel(): void {
    if (!_mql) return;

    if (_mql.matches) {
        activatePanel();
    }
}

/**

 * Detruit the panel lateral droit et restaure les elements.

 */

export function destroyDesktopPanel(): void {
    deactivatePanel();

    if (_mql) {
        _mql.removeEventListener("change", onMQChange);

        _mql = null;
    }

    if (_panel && _panel.parentElement) {
        _panel.parentElement.removeChild(_panel);
    }

    _panel = null;

    _isActive = false;

    _restoreEntries = [];
}
