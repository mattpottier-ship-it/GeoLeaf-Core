/**
 * GeoLeaf UI Filter Panel - SVG Helpers
 * Fonctions SVG pour les icônes du panneau de filtres
 *
 * @module ui/filter-panel/svg-helpers
 */
"use strict";

import { DOMSecurity } from '../../utils/dom-security.js';

/**
 * Met à jour une icône de toggle pour l'état "panneau ouvert" (flèche gauche)
 * @param {HTMLElement} icon - L'élément icône à mettre à jour
 */
export function setToggleIconOpen(icon) {
    // SAFE: SVG statique hardcodé
    DOMSecurity.clearElementFast(icon);
    const svg = DOMSecurity.createSVGIcon(16, 16, 'M15 18l-6-6 6-6', {
        stroke: 'currentColor',
        strokeWidth: '6',
        fill: 'none'
    });
    icon.appendChild(svg);
}

/**
 * Met à jour une icône de toggle pour l'état "panneau fermé" (flèche droite)
 * @param {HTMLElement} icon - L'élément icône à mettre à jour
 */
export function setToggleIconClosed(icon) {
    // SAFE: SVG statique hardcodé
    DOMSecurity.clearElementFast(icon);
    const svg = DOMSecurity.createSVGIcon(16, 16, 'M9 6l6 6-6 6', {
        stroke: 'currentColor',
        strokeWidth: '6',
        fill: 'none'
    });
    icon.appendChild(svg);
}
