/**
 * GeoLeaf POI Module - Lightbox Manager
 * Gestion de l'affichage lightbox pour les images
 * Phase 6.2 - Extraction depuis core.js
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    /**
     * Gestionnaire de lightbox pour affichage d'images en plein écran
     */
    class LightboxManager {
        constructor() {
            this.currentLightbox = null;
            this.closeHandler = null;
        }

        /**
         * Ouvre une lightbox pour afficher une image en plein écran
         * @param {string} imageSrc - URL de l'image à afficher
         */
        open(imageSrc) {
            // Fermer lightbox précédente si existe
            this.close();

            const lightbox = document.createElement('div');
            lightbox.className = 'gl-poi-lightbox';
            lightbox.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.95);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            `;

            const img = document.createElement('img');
            img.src = imageSrc;
            img.style.cssText = `
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
            `;

            lightbox.appendChild(img);
            document.body.appendChild(lightbox);

            // Stocker référence
            this.currentLightbox = lightbox;

            // Fermer en cliquant n'importe où
            lightbox.addEventListener('click', () => {
                this.close();
            });

            // Fermer avec Escape
            this.closeHandler = (e) => {
                if (e.key === 'Escape') {
                    this.close();
                }
            };
            document.addEventListener('keydown', this.closeHandler);
        }

        /**
         * Ferme la lightbox active
         */
        close() {
            if (this.currentLightbox && document.body.contains(this.currentLightbox)) {
                document.body.removeChild(this.currentLightbox);
            }

            if (this.closeHandler) {
                document.removeEventListener('keydown', this.closeHandler);
                this.closeHandler = null;
            }

            this.currentLightbox = null;
        }

        /**
         * Vérifie si une lightbox est actuellement ouverte
         * @returns {boolean}
         */
        isOpen() {
            return this.currentLightbox !== null && document.body.contains(this.currentLightbox);
        }
    }

    // Export global
    GeoLeaf.LightboxManager = LightboxManager;

    // Instance singleton pour usage simple
    GeoLeaf._lightboxManager = new LightboxManager();

})(typeof window !== "undefined" ? window : global);
