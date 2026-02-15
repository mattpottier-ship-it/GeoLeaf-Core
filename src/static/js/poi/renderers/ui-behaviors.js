/**
 * GeoLeaf POI Module - UI Behaviors
 * Comportements interactifs pour le side panel (accordéons, galeries)
 * Phase 6.2 - Extraction depuis core.js
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;

    /**
     * Comportements UI pour le side panel POI
     */
    const UIBehaviors = {
        /**
         * Attache le comportement d'accordéon exclusif (un seul ouvert à la fois)
         * @param {HTMLElement} container - Conteneur parent des accordéons
         */
        attachSingleAccordionBehavior(container) {
            const accordions = container.querySelectorAll('details.gl-accordion');
            if (accordions.length === 0) return;

            accordions.forEach(accordion => {
                accordion.addEventListener('toggle', (event) => {
                    // Si cet accordéon vient d'être ouvert
                    if (event.target.open) {
                        // Fermer tous les autres accordéons
                        accordions.forEach(otherAccordion => {
                            if (otherAccordion !== event.target && otherAccordion.open) {
                                otherAccordion.removeAttribute('open');
                            }
                        });
                    }
                });
            });

            if (Log) Log.info('[POI] Comportement singleAccordion activé:', accordions.length, 'accordéons');
        },

        /**
         * Attache les événements de navigation pour une galerie d'images
         * @param {HTMLElement} sidePanelElement - Élément du side panel
         * @param {LightboxManager} lightboxManager - Instance du gestionnaire de lightbox
         */
        attachGalleryEvents(sidePanelElement, lightboxManager) {
            if (!sidePanelElement) return;

            // Navigation par miniatures
            const thumbs = sidePanelElement.querySelectorAll('.gl-poi-gallery__thumb');
            const mainImg = sidePanelElement.querySelector('.gl-poi-gallery__main img');

            if (!mainImg || thumbs.length === 0) return;

            thumbs.forEach((thumb) => {
                thumb.addEventListener('click', () => {
                    const index = parseInt(thumb.getAttribute('data-index'), 10);
                    const imgSrc = thumb.querySelector('img').src;

                    // Mettre à jour l'image principale
                    mainImg.src = imgSrc;
                    mainImg.alt = `Image ${index + 1}`;

                    // Mettre à jour l'état actif des miniatures
                    thumbs.forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                });
            });

            // Clic sur l'image principale pour lightbox
            mainImg.addEventListener('click', () => {
                if (lightboxManager) {
                    lightboxManager.open(mainImg.src);
                }
            });
        },

        /**
         * Configure tous les comportements UI pour le side panel
         * @param {HTMLElement} container - Conteneur du side panel
         * @param {LightboxManager} lightboxManager - Instance du gestionnaire de lightbox
         */
        setupAll(container, lightboxManager) {
            this.attachSingleAccordionBehavior(container);
            this.attachGalleryEvents(container, lightboxManager);
        }
    };

    // Export global
    GeoLeaf._POIUIBehaviors = UIBehaviors;

})(typeof window !== "undefined" ? window : global);
