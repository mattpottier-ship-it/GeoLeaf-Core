/**
 * desktop-panel.ts
 *
 * Panneau lateral droit avec onglets verticaux repliables (>= 1440px).
 * Onglets : Filtres / Couches / Legende / Tableau
 * Les elements sont deplaces dans le panneau apres import des modules secondaires.
 * Appeler activateDesktopPanel() depuis init.ts apres Legend + LayerManager + Table.
 */

import { TableContract } from "../../contracts/table.contract.js";

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
    tabs.setAttribute("aria-label", "Panneau de navigation");

    const defs = [
        { id: "filters", label: titles.filters },
        { id: "layers", label: titles.layers },
        { id: "legend", label: titles.legend },
        { id: "table", label: titles.table },
    ];

    for (const def of defs) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gl-rp-tab";
        btn.dataset.glRpTab = def.id;
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-controls", "gl-rp-pane-" + def.id);
        btn.setAttribute("aria-selected", "false");
        btn.textContent = def.label;
        btn.addEventListener("click", () => handleTabClick(panel, def.id));
        tabs.appendChild(btn);
    }

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
        content.appendChild(pane);
    }

    // Contenu insere AVANT la bande d onglets (ordre flex row: contenu | onglets)
    panel.insertBefore(content, panel.firstChild);
}

function buildPanelDom(
    glMain: HTMLElement,
    titles: { filters: string; layers: string; legend: string; table: string }
): HTMLElement {
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-label", "Panneau lateral");

    buildTabsDom(panel, titles);
    buildContentDom(panel);

    glMain.appendChild(panel);
    return panel;
}

// Tab Interaction

function handleTabClick(panel: HTMLElement, tabId: string): void {
    /* Tableau → panneau bas pleine largeur, indépendant du side panel */
    if (tabId === "table") {
        const tableTab = panel.querySelector<HTMLElement>("[data-gl-rp-tab='table']");
        /* Fermer les autres onglets / panneaux */
        panel.querySelectorAll<HTMLElement>(".gl-rp-tab").forEach((t) => {
            t.classList.remove("is-active");
            t.setAttribute("aria-selected", "false");
        });
        panel
            .querySelectorAll<HTMLElement>(".gl-rp-pane")
            .forEach((p) => p.classList.remove("is-active"));
        panel.classList.remove("has-active");
        /* Localiser le panneau tableau */
        let tp = document.querySelector<HTMLElement>(".gl-table-panel");
        if (!tp) {
            const _g = (typeof globalThis !== "undefined" ? globalThis : window) as Record<
                string,
                unknown
            >;
            const _gl = _g["GeoLeaf"] as Record<string, unknown> | undefined;
            const _table = _gl?.["Table"] as Record<string, unknown> | undefined;
            const _container = _table?.["_container"] as HTMLElement | null | undefined;
            tp = _container || null;
            if (tp && !document.body.contains(tp)) {
                document.body.appendChild(tp);
            }
        }
        console.log(
            "[GL-Desktop] Onglet Tableau — élément trouvé:",
            !!tp,
            tp ? tp.parentElement?.tagName : "N/A"
        );
        if (!tp) {
            console.warn("[GL-Desktop] .gl-table-panel absent — Table.init() n'a pas été appelé ?");
            return;
        }
        const isOpen = tp.getAttribute("data-gl-open") === "true";
        console.log(
            "[GL-Desktop] isOpen=",
            isOpen,
            "| parent.id=",
            tp.parentElement?.id,
            "parent.class=",
            tp.parentElement?.className
        );
        if (!isOpen) {
            tp.setAttribute("data-gl-open", "true");
            tp.classList.add("is-visible");
            tp.style.setProperty("display", "flex", "important");
            tp.style.setProperty("visibility", "visible", "important");
            tp.style.setProperty("opacity", "1", "important");
            tp.style.setProperty("z-index", "1100", "important");
            TableContract.show();
            tableTab?.classList.add("is-active");
            tableTab?.setAttribute("aria-selected", "true");
        } else {
            tp.setAttribute("data-gl-open", "false");
            tp.classList.remove("is-visible");
            tp.style.removeProperty("position");
            tp.style.removeProperty("top");
            tp.style.removeProperty("bottom");
            tp.style.removeProperty("right");
            tp.style.removeProperty("left");
            tp.style.removeProperty("width");
            tp.style.removeProperty("height");
            tp.style.removeProperty("transform");
            tp.style.removeProperty("display");
            tp.style.removeProperty("visibility");
            tp.style.removeProperty("opacity");
            tp.style.removeProperty("z-index");
            TableContract.toggle();
        }
        return;
    }
    /* Fermer le tableau si un autre onglet est cliqué */
    const _tp = document.querySelector<HTMLElement>(".gl-table-panel");
    if (_tp && _tp.getAttribute("data-gl-open") === "true") {
        _tp.setAttribute("data-gl-open", "false");
        _tp.classList.remove("is-visible");
        _tp.style.removeProperty("position");
        _tp.style.removeProperty("top");
        _tp.style.removeProperty("bottom");
        _tp.style.removeProperty("right");
        _tp.style.removeProperty("left");
        _tp.style.removeProperty("width");
        _tp.style.removeProperty("height");
        _tp.style.removeProperty("transform");
        _tp.style.removeProperty("display");
        _tp.style.removeProperty("visibility");
        _tp.style.removeProperty("opacity");
        _tp.style.removeProperty("z-index");
        TableContract.toggle();
    }

    const allTabs = panel.querySelectorAll<HTMLElement>(".gl-rp-tab");
    const allPanes = panel.querySelectorAll<HTMLElement>(".gl-rp-pane");
    const targetTab = panel.querySelector<HTMLElement>("[data-gl-rp-tab='" + tabId + "']");
    const targetPane = document.getElementById("gl-rp-pane-" + tabId);

    if (!targetTab || !targetPane) return;

    const isAlreadyActive = targetTab.classList.contains("is-active");

    allTabs.forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
    });
    allPanes.forEach((p) => p.classList.remove("is-active"));
    panel.classList.remove("has-active");

    if (isAlreadyActive) return;

    targetTab.classList.add("is-active");
    targetTab.setAttribute("aria-selected", "true");
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

// MediaQuery Listener

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
 * Cree le DOM du panneau lateral droit (>= 1440px).
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

    // Synchroniser l'onglet Tableau avec les événements du module Table
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
    // les elements (legend, layer-manager, table) n existent pas encore dans le DOM.
    // init.ts appellera activateDesktopPanel() apres tous les modules secondaires.
}

/**
 * Deplace les elements (filtres, couches, legende, tableau) dans les panneaux.
 * A appeler APRES Legend.init(), LayerManager.init(), Table.init().
 */
export function activateDesktopPanel(): void {
    if (!_mql) return;
    if (_mql.matches) {
        activatePanel();
    }
}

/**
 * Detruit le panneau lateral droit et restaure les elements.
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
