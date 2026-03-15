/**
 * GeoLeaf POI Module - UI Behaviors
 * Comportements interactives for the side panel (accordions, galleries)
 * Phase 6.2 - Extraction from core.js
 */
import { Log } from "../../log/index.js";

/**
 * Comportements UI for the side panel POI
 */
const UIBehaviors = {
    /**
     * Attache le behavior d'accordion exclusif (un seul open to the fois)
     * @param {HTMLElement} container - Conteneur parent des accordions
     */
    attachSingleAccordionBehavior(container: any) {
        const accordions = container.querySelectorAll("details.gl-accordion");
        if (accordions.length === 0) return;

        accordions.forEach((accordion: any) => {
            accordion.addEventListener("toggle", (event: any) => {
                // Si cet accordion vient to be open
                if (event.target.open) {
                    // Fermer tous les autres accordions
                    accordions.forEach((otherAccordion: any) => {
                        if (otherAccordion !== event.target && otherAccordion.open) {
                            otherAccordion.removeAttribute("open");
                        }
                    });
                }
            });
        });

        if (Log) Log.info("[POI] ");
    },

    /**
     * Attache the events de navigation for ae gallery d'images
     * @param {HTMLElement} sidePanelElement - Element du side panel
     * @param {LightboxManager} lightboxManager - Instance du manager for lightbox
     */
    attachGalleryEvents(sidePanelElement: any, lightboxManager: any) {
        if (!sidePanelElement) return;
        if (sidePanelElement._galleryEventsAttached) return;
        sidePanelElement._galleryEventsAttached = true;

        // Navigation par thumbnails
        const thumbs = sidePanelElement.querySelectorAll(".gl-poi-gallery__thumb");
        const mainImg = sidePanelElement.querySelector(".gl-poi-gallery__main img");

        if (!mainImg || thumbs.length === 0) return;

        // Collecter toutes les URLs d'images de la gallery
        const galleryImages = Array.from(thumbs).map(
            (thumb: any) => thumb.querySelector("img").src
        );

        thumbs.forEach((thumb: any) => {
            thumb.addEventListener("click", () => {
                const index = parseInt(thumb.getAttribute("data-index"), 10);
                const imgSrc = thumb.querySelector("img").src;

                // Mettre up to date l'image maine
                mainImg.src = imgSrc;
                mainImg.alt = `Image ${index + 1}`;

                // Mettre up to date the state active des thumbnails
                thumbs.forEach((t: any) => (t as any).classList.remove("active"));
                thumb.classList.add("active");
            });
        });

        // Click sur l'image maine pour lightbox avec navigation gallery
        mainImg.addEventListener("click", () => {
            if (lightboxManager) {
                // Determine the current index from the active thumbnail
                const activeThumb = sidePanelElement.querySelector(".gl-poi-gallery__thumb.active");
                const currentIndex = activeThumb
                    ? parseInt(activeThumb.getAttribute("data-index"), 10)
                    : 0;

                // Ouvrir la lightbox avec toute la gallery
                lightboxManager.open(mainImg.src, galleryImages, currentIndex);

                // Synchronize les thumbnails quand on navigue in the lightbox
                lightboxManager.onIndexChange = (newIndex: any) => {
                    thumbs.forEach((t: any) => (t as any).classList.remove("active"));
                    const targetThumb = sidePanelElement.querySelector(
                        `.gl-poi-gallery__thumb[data-index="${newIndex}"]`
                    );
                    if (targetThumb) {
                        targetThumb.classList.add("active");
                        // Mettre up to date l'image maine du panel aussi
                        const imgSrc = targetThumb.querySelector("img").src;
                        mainImg.src = imgSrc;
                        mainImg.alt = `Image ${newIndex + 1}`;
                    }
                };
            }
        });
    },

    /**
     * Configure tous les behaviors UI for the side panel
     * @param {HTMLElement} container - Conteneur du side panel
     * @param {LightboxManager} lightboxManager - Instance du manager for lightbox
     */
    setupAll(container: any, lightboxManager: any) {
        this.attachSingleAccordionBehavior(container);
        this.attachGalleryEvents(container, lightboxManager);
    },
};

// ── ESM Export ──
export { UIBehaviors };
