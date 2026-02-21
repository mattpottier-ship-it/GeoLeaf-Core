/**
 * Module Legend Renderer
 * Rendu des symboles de légende cartographique
 *
 * DÉPENDANCES:
 * - Leaflet (L.DomUtil)
 * - GeoLeaf.Log (optionnel)
 *
 * EXPOSE:
 * - GeoLeaf._LegendRenderer
 */
"use strict";

import { Log } from '../log/index.js';
import { _UIComponents } from '../ui/components.js';



/**
 * Rendu d'une section de légende
 * @param {HTMLElement} container - Conteneur parent
 * @param {Object} section - Section de légende
 */
function renderSection(container, section) {
    const sectionEl = globalThis.L.DomUtil.create("div", "gl-legend__section", container);

    // Titre de section
    if (section.title) {
        const titleEl = globalThis.L.DomUtil.create("h3", "gl-legend__section-title", sectionEl);
        titleEl.textContent = section.title;
    }

    // Items
    const itemsContainer = globalThis.L.DomUtil.create("div", "gl-legend__items", sectionEl);
    if (Array.isArray(section.items)) {
        section.items.forEach(item => renderItem(itemsContainer, item));
    }

    return sectionEl;
}


/**
 * Rendu d'un item de légende
 * @param {HTMLElement} container - Conteneur parent
 * @param {Object} item - Item de légende
 */
function renderItem(container, item) {
    const itemEl = globalThis.L.DomUtil.create("div", "gl-legend__item", container);

    // Symbole
    const symbolEl = globalThis.L.DomUtil.create("div", "gl-legend__symbol", itemEl);
    renderSymbol(symbolEl, item);

    // Texte
    const textContainer = globalThis.L.DomUtil.create("div", "gl-legend__text", itemEl);

    const labelEl = globalThis.L.DomUtil.create("span", "gl-legend__label", textContainer);
    labelEl.textContent = item.label || "";

    if (item.description) {
        const descEl = globalThis.L.DomUtil.create("span", "gl-legend__description", textContainer);
        descEl.textContent = item.description;
    }

    return itemEl;
}

/**
 * Rendu d'un symbole selon son type
 * @param {HTMLElement} container - Conteneur du symbole
 * @param {Object} item - Configuration du symbole
 */
function renderSymbol(container, item) {
    // Déléguer au module commun
    if (_UIComponents && typeof _UIComponents.renderSymbol === 'function') {
        _UIComponents.renderSymbol(container, item);
    } else {
        // Fallback si module non chargé
        if (Log) Log.error("[LegendRenderer] Module _UIComponents non disponible");
    }
}

/**
 * Rendu du footer
 * @param {HTMLElement} container - Conteneur parent
 * @param {Object} footer - Configuration du footer
 */
function renderFooter(container, footer) {
    if (!footer || !footer.text) return;

    const footerEl = globalThis.L.DomUtil.create("div", "gl-legend__footer", container);
    footerEl.textContent = footer.text;

    if (footer.style === "italic") {
        footerEl.style.fontStyle = "italic";
    }
}

/**
 * Rendu d'un accordéon pour une couche
 * @param {HTMLElement} container - Conteneur parent
 * @param {Object} accordionData - Configuration de l'accordéon
 * @param {string} accordionData.layerId - ID de la couche
 * @param {string} accordionData.label - Titre de l'accordéon
 * @param {boolean} accordionData.collapsed - État initial
 * @param {boolean} accordionData.visible - Couche visible ou non (pour grisage)
 * @param {Array} accordionData.sections - Sections de légende
 */
function renderAccordion(container, accordionData) {
    // Utiliser le module commun pour créer l'accordéon
    const _UIComponents = (typeof globalThis !== 'undefined' ? globalThis : window)?.GeoLeaf?._UIComponents;
    if (!_UIComponents) {
        if (Log) Log.error("[LegendRenderer] Module _UIComponents non disponible");
        return;
    }

    const { bodyEl } = _UIComponents.createAccordion(container, {
        layerId: accordionData.layerId,
        label: accordionData.label,
        collapsed: accordionData.collapsed !== false,
        visible: accordionData.visible,
        onToggle: (layerId, expanded) => {
            // Notifier le module Legend du changement
            const _gl = (typeof globalThis !== 'undefined' ? globalThis : window);
            if (_gl.GeoLeaf && _gl.GeoLeaf.Legend && typeof _gl.GeoLeaf.Legend.toggleAccordion === "function") {
                _gl.GeoLeaf.Legend.toggleAccordion(layerId);
            }
        }
    });

    // Rendre les sections à l'intérieur du body
    if (Array.isArray(accordionData.sections)) {
        accordionData.sections.forEach(section => {
            renderSection(bodyEl, section);
        });
    }
}

const LegendRenderer = {
    renderSection: renderSection,
    renderItem: renderItem,
    renderSymbol: renderSymbol,
    renderFooter: renderFooter,
    renderAccordion: renderAccordion
};
export { LegendRenderer };
