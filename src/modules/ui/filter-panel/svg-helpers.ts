/**
 * GeoLeaf UI Filter Panel - SVG Helpers
 * Fonctions SVG for thes icons du filter panels
 *
 * @module ui/filter-panel/svg-helpers
 */
"use strict";

import { DOMSecurity } from "../../utils/dom-security.js";

/**
 * Updates une icon de toggle pour the state "panel open" (arrow gauche)
 * @param {HTMLElement} icon - L'element icon to update
 */
export function setToggleIconOpen(icon: HTMLElement) {
    // SAFE: SVG static hardcoded
    DOMSecurity.clearElementFast(icon);
    const svg = DOMSecurity.createSVGIcon(16, 16, "M15 18l-6-6 6-6", {
        stroke: "currentColor",
        strokeWidth: "6",
        fill: "none",
    });
    icon.appendChild(svg);
}

/**
 * Updates une icon de toggle pour the state "panel closed" (arrow droite)
 * @param {HTMLElement} icon - L'element icon to update
 */
export function setToggleIconClosed(icon: HTMLElement) {
    // SAFE: SVG static hardcoded
    DOMSecurity.clearElementFast(icon);
    const svg = DOMSecurity.createSVGIcon(16, 16, "M9 6l6 6-6 6", {
        stroke: "currentColor",
        strokeWidth: "6",
        fill: "none",
    });
    icon.appendChild(svg);
}
