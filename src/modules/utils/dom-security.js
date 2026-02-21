/**
 * GeoLeaf - DOM Security Module
 *
 * @description Wrappers sécurisés pour manipuler le DOM sans vulnérabilités XSS
 * @module GeoLeaf.DOMSecurity
 * @version 3.0.1
 * @date 2026-01-17
 *
 * USAGE:
 * - Remplace innerHTML par des alternatives sécurisées
 * - Utilise textContent pour données non-HTML
 * - Sanitize via GeoLeaf.Security pour HTML nécessaire
 * - Crée SVG de manière sécurisée
 */

import { Log } from '../log/index.js';
import { Security } from '../security/index.js';

'use strict';

/**
 * Définit le contenu texte d'un élément de manière sécurisée
 * Remplace: element.innerHTML = text
 *
 * @param {HTMLElement} element - Élément DOM cible
 * @param {string|number} text - Contenu texte (sera converti en string)
 * @returns {void}
 *
 * @example
 * // ❌ AVANT (vulnérable XSS)
 * div.innerHTML = userData;
 *
 * // ✅ APRÈS (sécurisé)
 * DOMSecurity.setTextContent(div, userData);
 */
function setTextContent(element, text) {
    if (!element || !element.nodeType) {
        Log.warn('[DOMSecurity] Invalid element in setTextContent');
        return;
    }
    element.textContent = text != null ? String(text) : '';
}

/**
 * Injecte du HTML dans un élément après sanitisation (whitelist de balises sûres).
 * Remplace: element.innerHTML = html (quand du HTML enrichi doit être rendu)
 *
 * @param {HTMLElement} element - Élément DOM cible
 * @param {string} html - Contenu HTML à sanitiser et injecter
 * @param {string[]} [allowedTags] - Balises autorisées (défaut: p br strong em span a ul ol li)
 * @returns {void}
 *
 * @example
 * // ✅ Rendu HTML sanitisé
 * DOMSecurity.setSafeHTML(div, '<strong>Important</strong>');
 */
function setSafeHTML(element, html, allowedTags) {
    if (!element || !element.nodeType) {
        Log.warn('[DOMSecurity] Invalid element in setSafeHTML');
        return;
    }

    // Utiliser Security.sanitizeHTML si disponible — sanitisation avec whitelist
    if (Security && typeof Security.sanitizeHTML === 'function') {
        Security.sanitizeHTML(element, html, allowedTags ? { allowedTags } : {});
    } else {
        // Fallback sûr : textContent si Security non disponible
        Log.warn('[DOMSecurity] Security.sanitizeHTML unavailable, falling back to textContent');
        element.textContent = html ? String(html) : '';
    }
}

/**
 * Vide un élément de manière sécurisée
 * Remplace: element.innerHTML = ""
 *
 * @param {HTMLElement} element - Élément DOM à vider
 * @returns {void}
 *
 * @example
 * DOMSecurity.clearElement(container);
 */
function clearElement(element) {
    if (!element || !element.nodeType) {
        Log.warn('[DOMSecurity] Invalid element in clearElement');
        return;
    }

    // Méthode la plus performante et sûre
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Vide rapidement en utilisant textContent (alternative)
 * Plus rapide que removeChild mais moins propre
 *
 * @param {HTMLElement} element - Élément DOM à vider
 * @returns {void}
 */
function clearElementFast(element) {
    if (!element || !element.nodeType) {
        Log.warn('[DOMSecurity] Invalid element in clearElementFast');
        return;
    }
    element.textContent = '';
}

/**
 * Crée un élément SVG de manière sécurisée
 *
 * @param {number} width - Largeur SVG
 * @param {number} height - Hauteur SVG
 * @param {string} pathData - Données du path SVG
 * @param {Object} [options={}] - Options SVG
 * @param {string} [options.viewBox] - ViewBox SVG
 * @param {string} [options.fill='none'] - Couleur de remplissage
 * @param {string} [options.stroke='currentColor'] - Couleur de trait
 * @param {string|number} [options.strokeWidth='2'] - Épaisseur trait
 * @param {string} [options.strokeLinecap='round'] - Style bout de trait
 * @param {string} [options.strokeLinejoin='round'] - Style jonction
 * @returns {SVGElement} Élément SVG créé
 *
 * @example
 * const icon = DOMSecurity.createSVGIcon(18, 18, 'M6 9l6 6 6-6');
 * button.appendChild(icon);
 */
function createSVGIcon(width, height, pathData, options = {}) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', options.viewBox || `0 0 24 24`);
    svg.setAttribute('fill', options.fill || 'none');
    svg.setAttribute('stroke', options.stroke || 'currentColor');
    svg.setAttribute('stroke-width', String(options.strokeWidth || '2'));
    svg.setAttribute('stroke-linecap', options.strokeLinecap || 'round');
    svg.setAttribute('stroke-linejoin', options.strokeLinejoin || 'round');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);

    return svg;
}

/**
 * Bibliothèque d'icônes SVG communes
 * @constant
 */
const SVG_ICONS = {
    // Chevrons
    'chevron-down': 'M6 9l6 6 6-6',
    'chevron-up': 'M18 15l-6-6-6 6',
    'chevron-left': 'M15 18l-6-6 6-6',
    'chevron-right': 'M9 18l6-6-6-6',

    // Arrows
    'arrow-left': '‹',
    'arrow-right': '›',

    // UI Controls
    'close': '✕',
    'check': '✓',
    'star': '★',
    'star-empty': '☆',

    // Triangles (collapse/expand)
    'triangle-right': '▶',
    'triangle-down': '▼',

    // Home/Layers
    'home': 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    'layers': 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',

    // Location
    'marker': 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z',
    'map-pin': 'M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z',

    // Actions
    'download': 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    'upload': 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    'trash': 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    'copy': 'M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z',

    // Status
    'sync': 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15'
};

/**
 * Obtient une icône SVG prédéfinie
 *
 * @param {string} name - Nom de l'icône
 * @param {number} [size=18] - Taille de l'icône
 * @param {Object} [options={}] - Options SVG supplémentaires
 * @returns {SVGElement|null} Élément SVG ou null si non trouvé
 *
 * @example
 * const homeIcon = DOMSecurity.getIcon('home', 24);
 * button.appendChild(homeIcon);
 */
function getIcon(name, size = 18, options = {}) {
    const pathData = SVG_ICONS[name];
    if (!pathData) {
        Log.warn(`[DOMSecurity] Icon '${name}' not found`);
        return null;
    }
    return createSVGIcon(size, size, pathData, options);
}

/**
 * Crée un élément avec attributs de manière sécurisée
 * Alternative sécurisée à innerHTML pour structures simples
 *
 * @param {string} tagName - Nom de la balise
 * @param {Object} [attributes={}] - Attributs de l'élément
 * @param {string|HTMLElement|Array} [children] - Enfants (texte ou éléments)
 * @returns {HTMLElement} Élément créé
 *
 * @example
 * const div = DOMSecurity.createElement('div',
 *   { class: 'container', id: 'main' },
 *   ['Hello ', DOMSecurity.createElement('strong', {}, 'World')]
 * );
 */
function createElement(tagName, attributes = {}, children = null) {
    const element = document.createElement(tagName);

    // Définir les attributs
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'class' || key === 'className') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key.startsWith('data-')) {
            element.setAttribute(key, value);
        } else {
            element[key] = value;
        }
    }

    // Ajouter les enfants
    if (children) {
        if (Array.isArray(children)) {
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child && child.nodeType) {
                    element.appendChild(child);
                }
            });
        } else if (typeof children === 'string') {
            element.textContent = children;
        } else if (children.nodeType) {
            element.appendChild(children);
        }
    }

    return element;
}

// API publique
export const DOMSecurity = {
    setTextContent,
    setSafeHTML,
    clearElement,
    clearElementFast,
    createSVGIcon,
    getIcon,
    createElement,
    SVG_ICONS // Exposer la liste pour référence
};


