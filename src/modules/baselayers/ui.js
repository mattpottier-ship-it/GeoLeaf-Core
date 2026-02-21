/*!
 * GeoLeaf Core – Baselayers / UI
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

import { Log } from "../log/index.js";
import { _baseLayers, setBaseLayer, getActiveKey } from "./registry.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

let _uiBound = false;
let _resizeHandler = null;

// ---------------------------------------------------------
// Indicateur actif
// ---------------------------------------------------------
function _updateActiveIndicator(panel, activeButton) {
    if (!panel || !activeButton) return;
    const panelRect = panel.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    panel.style.setProperty("--indicator-left", buttonRect.left - panelRect.left + "px");
    panel.style.setProperty("--indicator-width", buttonRect.width + "px");
}

// ---------------------------------------------------------
// Rafraîchissement de l'UI
// ---------------------------------------------------------
export function refreshUI() {
    if (!_g.document) return;

    const elements = _g.document.querySelectorAll("[data-gl-baselayer]");
    const leftPanel = _g.document.getElementById("gl-left-panel");
    const activeKey = getActiveKey();
    let activeElement = null;

    elements.forEach((el) => {
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
// Création des contrôles UI
// ---------------------------------------------------------
export function createBaseLayerControlsUI(config) {
    if (!_g.document) return;

    if (!config && _g.GeoLeaf?.Config?.get) {
        config = {
            ui: _g.GeoLeaf.Config.get("ui"),
            basemaps: _g.GeoLeaf.Config.get("basemaps") || {},
        };
    }

    const uiCfg = config && config.ui;
    const showControls = uiCfg && uiCfg.showBaseLayerControls === false ? false : !!uiCfg;

    Log.info(
        "[GeoLeaf.Baselayers] showBaseLayerControls =",
        showControls,
        "(config.ui.showBaseLayerControls =",
        uiCfg ? uiCfg.showBaseLayerControls : "N/A",
        ")"
    );

    let leftPanel = _g.document.getElementById("gl-left-panel");

    if (showControls) {
        if (!leftPanel) {
            leftPanel = _g.document.createElement("div");
            leftPanel.id = "gl-left-panel";
            leftPanel.className = "gl-left-panel";
            const mapContainer =
                _g.document.getElementById("geoleaf-map") || _g.document.querySelector(".gl-map");
            (mapContainer || _g.document.body).appendChild(leftPanel);
        }

        if (_g.GeoLeaf?.DOMSecurity?.clearElementFast) {
            _g.GeoLeaf.DOMSecurity.clearElementFast(leftPanel);
        } else {
            leftPanel.innerHTML = "";
        }

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
            "[GeoLeaf.Baselayers] Contrôles créés avec",
            Object.keys(_baseLayers).length,
            "boutons"
        );

        setTimeout(refreshUI, 50);
    } else {
        if (leftPanel && leftPanel.parentNode) {
            leftPanel.parentNode.removeChild(leftPanel);
        }
    }
}

// ---------------------------------------------------------
// Binding DOM (une seule fois)
// ---------------------------------------------------------
export function bindUIOnce() {
    if (_uiBound || !_g.document) return;
    _uiBound = true;

    _g.document.addEventListener("click", (evt) => {
        const target = evt.target.closest("[data-gl-baselayer]");
        if (!target) return;
        const key = target.getAttribute("data-gl-baselayer");
        if (!key) return;
        evt.preventDefault();
        setBaseLayer(key);
        refreshUI();
    });

    let resizeTimeout;
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
