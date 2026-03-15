/* eslint-disable security/detect-object-injection */
/*!

 * GeoLeaf Core – Baselayers / UI

 * © 2026 Mattieu Pottier

 * Released under the MIT License

 */

import { Log } from "../log/index.js";

import { DOMSecurity } from "../utils/dom-security.js";

import { _baseLayers, setBaseLayer, getActiveKey } from "./registry.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

let _uiBound = false;

let _resizeHandler: any = null;

// ---------------------------------------------------------

// Indicator active

// ---------------------------------------------------------

function _updateActiveIndicator(panel: any, activeButton: any) {
    if (!panel || !activeButton) return;

    const panelRect = panel.getBoundingClientRect();

    const buttonRect = activeButton.getBoundingClientRect();

    panel.style.setProperty("--indicator-left", buttonRect.left - panelRect.left + "px");

    panel.style.setProperty("--indicator-width", buttonRect.width + "px");
}

// ---------------------------------------------------------

// UI refresh

// ---------------------------------------------------------

export function refreshUI() {
    if (!_g.document) return;

    const elements = _g.document.querySelectorAll("[data-gl-baselayer]");

    const leftPanel = _g.document.getElementById("gl-left-panel");

    const activeKey = getActiveKey();

    let activeElement = null;

    elements.forEach((el: any) => {
        const key = el.getAttribute("data-gl-baselayer");

        if (!key) return;

        const isActive = key === activeKey;

        el.classList.toggle("gl-baselayer-active", isActive);

        el.classList.toggle("is-active", isActive);

        el.setAttribute("aria-pressed", String(isActive));

        if (isActive) activeElement = el;
    });

    if (leftPanel && activeElement) {
        _updateActiveIndicator(leftPanel, activeElement);
    }
}

// ---------------------------------------------------------

// Creation des controles UI

// ---------------------------------------------------------

// Creation des controles UI (helpers)

// ---------------------------------------------------------

function _computeShowControls(uiCfg: any): boolean {
    return uiCfg && uiCfg.showBaseLayerControls === false ? false : !!uiCfg;
}

function _createLeftPanel(): HTMLElement {
    const panel = _g.document.createElement("div");

    panel.id = "gl-left-panel";

    panel.className = "gl-left-panel";

    const mapContainer =
        _g.document.getElementById("geoleaf-map") || _g.document.querySelector(".gl-map");

    (mapContainer || _g.document.body).appendChild(panel);

    return panel;
}

function _populateLeftPanel(leftPanel: any): void {
    DOMSecurity.clearElementFast(leftPanel);

    Object.keys(_baseLayers).forEach((key) => {
        const def = _baseLayers[key];

        const button = _g.document.createElement("button");

        button.className = "gl-baselayer-btn";

        button.setAttribute("data-gl-baselayer", key);

        button.setAttribute("aria-label", def.label || key);

        button.textContent = def.label || key;

        leftPanel.appendChild(button);
    });

    leftPanel.style.display = "flex";

    Log.info(
        "[GeoLeaf.Baselayers] Controls created with",
        Object.keys(_baseLayers).length,
        "buttons"
    );
}

export function createBaseLayerControlsUI(config: any) {
    if (!_g.document) return;

    if (!config && _g.GeoLeaf?.Config?.get) {
        config = {
            ui: _g.GeoLeaf.Config.get("ui"),

            basemaps: _g.GeoLeaf.Config.get("basemaps") || {},
        };
    }

    const uiCfg = config?.ui;

    const showControls = _computeShowControls(uiCfg);

    Log.info(
        "[GeoLeaf.Baselayers] showBaseLayerControls =",

        showControls,

        "(config.ui.showBaseLayerControls =",

        uiCfg?.showBaseLayerControls ?? "N/A",

        ")"
    );

    let leftPanel = _g.document.getElementById("gl-left-panel");

    if (showControls) {
        if (!leftPanel) {
            leftPanel = _createLeftPanel();
        }

        _populateLeftPanel(leftPanel);

        setTimeout(refreshUI, 50);
    } else {
        leftPanel?.parentNode?.removeChild(leftPanel);
    }
}

// ---------------------------------------------------------

// Binding DOM (une seule fois)

// ---------------------------------------------------------

export function bindUIOnce() {
    if (_uiBound || !_g.document) return;

    _uiBound = true;

    _g.document.addEventListener("click", (evt: any) => {
        const target = evt.target.closest("[data-gl-baselayer]");

        if (!target) return;

        const key = target.getAttribute("data-gl-baselayer");

        if (!key) return;

        evt.preventDefault();

        setBaseLayer(key);

        refreshUI();
    });

    let resizeTimeout: any;

    _resizeHandler = () => {
        clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(refreshUI, 100);
    };

    _g.addEventListener("resize", _resizeHandler);
}

// ---------------------------------------------------------

// Nettoyage

// ---------------------------------------------------------

export function destroyUI() {
    if (_resizeHandler) {
        _g.removeEventListener("resize", _resizeHandler);

        _resizeHandler = null;
    }

    _uiBound = false;
}
