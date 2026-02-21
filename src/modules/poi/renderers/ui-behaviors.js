/**
 * GeoLeaf POI Module - UI Behaviors
 * Comportements interactifs pour le side panel (accordéons, galeries)
 * Phase 6.2 - Extraction depuis core.js
 */
import { Log } from '../../log/index.js';


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
        if (sidePanelElement._galleryEventsAttached) return;
        sidePanelElement._galleryEventsAttached = true;

        // Navigation par miniatures
        const thumbs = sidePanelElement.querySelectorAll('.gl-poi-gallery__thumb');
        const mainImg = sidePanelElement.querySelector('.gl-poi-gallery__main img');

        if (!mainImg || thumbs.length === 0) return;

        // Collecter toutes les URLs d'images de la galerie
        const galleryImages = Array.from(thumbs).map(
            thumb => thumb.querySelector('img').src
        );

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

        // Clic sur l'image principale pour lightbox avec navigation galerie
        mainImg.addEventListener('click', () => {
            if (lightboxManager) {
                // Déterminer l'index courant depuis la miniature active
                const activeThumb = sidePanelElement.querySelector('.gl-poi-gallery__thumb.active');
                const currentIndex = activeThumb
                    ? parseInt(activeThumb.getAttribute('data-index'), 10)
                    : 0;

                // Ouvrir la lightbox avec toute la galerie
                lightboxManager.open(mainImg.src, galleryImages, currentIndex);

                // Synchroniser les miniatures quand on navigue dans la lightbox
                lightboxManager.onIndexChange = (newIndex) => {
                    thumbs.forEach(t => t.classList.remove('active'));
                    const targetThumb = sidePanelElement.querySelector(
                        `.gl-poi-gallery__thumb[data-index="${newIndex}"]`
                    );
                    if (targetThumb) {
                        targetThumb.classList.add('active');
                        // Mettre à jour l'image principale du panneau aussi
                        const imgSrc = targetThumb.querySelector('img').src;
                        mainImg.src = imgSrc;
                        mainImg.alt = `Image ${newIndex + 1}`;
                    }
                };
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

// ── ESM Export ──
export { UIBehaviors };
