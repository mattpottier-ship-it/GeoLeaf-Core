/**
 * POI Renderers - Accordion Utilities Module
 * Gestion des accordéons pour les sections de détail POI
 *
 * @module poi/renderers/accordion-utils
 * @requires poi/renderers/core (parent)
 */
((global) => {
    'use strict';

    const GeoLeaf = global.GeoLeaf || {};
    const Log = GeoLeaf.Log;

    /**
     * Wrappe un contenu dans un accordéon <details>
     */
    function wrapInAccordion(section, content, isOpen = false) {
        if (!content) {
            if (Log) Log.error('[POI] wrapInAccordion: content is null/undefined for section:', section.label || section.type);
            return null;
        }

        // Créer un div accordéon (pas <details>, pour utiliser les styles CSS existants)
        const accordion = document.createElement('div');
        accordion.className = 'gl-accordion' + (isOpen ? ' is-open' : '');

        const header = document.createElement('button');
        header.className = 'gl-accordion__header';
        header.type = 'button';
        header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

        const title = document.createElement('span');
        title.className = 'gl-accordion__title';
        title.textContent = section.label || 'Section';

        const icon = document.createElement('span');
        icon.className = 'gl-accordion__icon';
        icon.textContent = '▼';
        icon.setAttribute('aria-hidden', 'true');

        header.appendChild(title);
        header.appendChild(icon);

        const body = document.createElement('div');
        body.className = 'gl-accordion__body';
        body.appendChild(content);

        // Toggle au clic
        header.addEventListener('click', () => {
            const isCurrentlyOpen = accordion.classList.contains('is-open');
            if (isCurrentlyOpen) {
                accordion.classList.remove('is-open');
                header.setAttribute('aria-expanded', 'false');
            } else {
                accordion.classList.add('is-open');
                header.setAttribute('aria-expanded', 'true');
            }
        });

        accordion.appendChild(header);
        accordion.appendChild(body);

        if (Log) Log.info('[POI] Accordion created for:', section.label || section.type);
        return accordion;
    }

    /**
     * Attache le comportement singleAccordion : un seul accordéon ouvert à la fois
     */
    function attachSingleAccordionBehavior(container) {
        if (!container) return;

        const accordions = container.querySelectorAll('.gl-accordion');
        if (accordions.length === 0) return;

        accordions.forEach(details => {
            details.addEventListener('toggle', () => {
                if (details.open) {
                    accordions.forEach(otherDetails => {
                        if (otherDetails !== details && otherDetails.open) {
                            otherDetails.removeAttribute('open');
                        }
                    });
                }
            });
        });
    }

    // Export
    GeoLeaf._POIAccordionUtils = {
        wrapInAccordion,
        attachSingleAccordionBehavior
    };

    if (Log) Log.debug('[POI] Accordion Utils module loaded');

})(window);
