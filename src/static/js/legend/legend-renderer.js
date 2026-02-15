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
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
    const Log = GeoLeaf.Log;

    /**
     * Rendu d'une section de légende
     * @param {HTMLElement} container - Conteneur parent
     * @param {Object} section - Section de légende
     */
    function renderSection(container, section) {
        const sectionEl = global.L.DomUtil.create("div", "gl-legend__section", container);

        // Titre de section
        if (section.title) {
            const titleEl = global.L.DomUtil.create("h3", "gl-legend__section-title", sectionEl);
            titleEl.textContent = section.title;
        }

        // Items
        const itemsContainer = global.L.DomUtil.create("div", "gl-legend__items", sectionEl);
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
        const itemEl = global.L.DomUtil.create("div", "gl-legend__item", container);

        // Symbole
        const symbolEl = global.L.DomUtil.create("div", "gl-legend__symbol", itemEl);
        renderSymbol(symbolEl, item);

        // Texte
        const textContainer = global.L.DomUtil.create("div", "gl-legend__text", itemEl);

        const labelEl = global.L.DomUtil.create("span", "gl-legend__label", textContainer);
        labelEl.textContent = item.label || "";

        if (item.description) {
            const descEl = global.L.DomUtil.create("span", "gl-legend__description", textContainer);
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
        if (GeoLeaf._UIComponents && typeof GeoLeaf._UIComponents.renderSymbol === 'function') {
            GeoLeaf._UIComponents.renderSymbol(container, item);
        } else {
            // Fallback si module non chargé
            if (Log) Log.error("[LegendRenderer] Module _UIComponents non disponible");
        }
    }

    /**
     * Rendu d'un symbole cercle simple
     */
    /**
     * Rendu d'un symbole cercle simple
     * @deprecated Utiliser GeoLeaf._UIComponents.renderCircleSymbol()
     */
    function renderCircleSymbol(container, item) {
        if (GeoLeaf._UIComponents) {
            GeoLeaf._UIComponents.renderCircleSymbol(container, item);
        }
    }

    /**
     * Rendu d'un symbole ligne
     * @deprecated Utiliser GeoLeaf._UIComponents.renderLineSymbol()
     */
    function renderLineSymbol(container, item) {
        if (GeoLeaf._UIComponents) {
            GeoLeaf._UIComponents.renderLineSymbol(container, item);
        }
    }

    /**
     * Rendu d'un symbole polygone/remplissage
     * @deprecated Utiliser GeoLeaf._UIComponents.renderPolygonSymbol()
     */
    function renderPolygonSymbol(container, item) {
        if (GeoLeaf._UIComponents) {
            GeoLeaf._UIComponents.renderPolygonSymbol(container, item);
        }
    }

    /**
     * Rendu d'un symbole étoile (rating)
     * @deprecated Utiliser GeoLeaf._UIComponents.renderStarSymbol()
     */
    function renderStarSymbol(container, item) {
        if (GeoLeaf._UIComponents) {
            GeoLeaf._UIComponents.renderStarSymbol(container, item);
        }
    }

    /**
     * Rendu du footer
     * @param {HTMLElement} container - Conteneur parent
     * @param {Object} footer - Configuration du footer
     */
    function renderFooter(container, footer) {
        if (!footer || !footer.text) return;

        const footerEl = global.L.DomUtil.create("div", "gl-legend__footer", container);
        footerEl.textContent = footer.text;

        if (footer.style === "italic") {
            footerEl.style.fontStyle = "italic";
        }
    }

    // Exposer dans l'espace de noms interne
    GeoLeaf._LegendRenderer = {
        renderSection: renderSection,
        renderItem: renderItem,
        renderSymbol: renderSymbol,
        renderFooter: renderFooter,
        renderAccordion: renderAccordion
    };

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
        if (!GeoLeaf._UIComponents) {
            if (Log) Log.error("[LegendRenderer] Module _UIComponents non disponible");
            return;
        }

        const { bodyEl } = GeoLeaf._UIComponents.createAccordion(container, {
            layerId: accordionData.layerId,
            label: accordionData.label,
            collapsed: accordionData.collapsed !== false,
            visible: accordionData.visible,
            onToggle: (layerId, expanded) => {
                // Notifier le module Legend du changement
                if (global.GeoLeaf && global.GeoLeaf.Legend && typeof global.GeoLeaf.Legend.toggleAccordion === "function") {
                    global.GeoLeaf.Legend.toggleAccordion(layerId);
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

})(window);
