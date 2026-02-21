/**
 * GeoLeaf POI Module - Lightbox Manager
 * Gestion de l'affichage lightbox pour les images avec navigation galerie
 * Phase 6.2 - Extraction depuis core.js
 */

/**
 * Gestionnaire de lightbox pour affichage d'images en plein écran
 * Supporte la navigation dans une galerie d'images (flèches gauche/droite)
 */
class LightboxManager {
    constructor() {
        this.currentLightbox = null;
        this.keyHandler = null;
        /** @type {string[]} Liste des URLs d'images de la galerie */
        this.galleryImages = [];
        /** @type {number} Index courant dans la galerie */
        this.currentIndex = 0;
        /** @type {HTMLImageElement|null} Référence vers l'élément image affichée */
        this._imgElement = null;
        /** @type {HTMLElement|null} Référence vers le compteur */
        this._counterElement = null;
        /** @type {HTMLElement|null} Référence vers le bouton précédent */
        this._prevButton = null;
        /** @type {HTMLElement|null} Référence vers le bouton suivant */
        this._nextButton = null;
        /** @type {Function|null} Callback appelé quand l'index change */
        this.onIndexChange = null;
    }

    /**
     * Ouvre une lightbox pour afficher une image en plein écran.
     * Si un tableau d'images est fourni, active la navigation par flèches.
     * @param {string} imageSrc - URL de l'image à afficher
     * @param {string[]} [galleryImages] - Tableau d'URLs pour navigation galerie
     * @param {number} [startIndex] - Index de départ dans la galerie
     */
    open(imageSrc, galleryImages, startIndex) {
        // Fermer lightbox précédente si existe
        this.close();

        // Configurer la galerie
        if (Array.isArray(galleryImages) && galleryImages.length > 1) {
            this.galleryImages = galleryImages;
            this.currentIndex = typeof startIndex === 'number' ? startIndex : galleryImages.indexOf(imageSrc);
            if (this.currentIndex < 0) this.currentIndex = 0;
        } else {
            this.galleryImages = [imageSrc];
            this.currentIndex = 0;
        }

        // Créer le conteneur principal (utilise les classes CSS existantes)
        const lightbox = document.createElement('div');
        lightbox.className = 'gl-poi-lightbox-global';
        lightbox.style.display = 'flex';

        // Overlay (clic pour fermer)
        const overlay = document.createElement('div');
        overlay.className = 'gl-poi-lightbox__overlay';
        overlay.addEventListener('click', () => this.close());
        lightbox.appendChild(overlay);

        // Conteneur de contenu
        const content = document.createElement('div');
        content.className = 'gl-poi-lightbox__content';
        lightbox.appendChild(content);

        // Image
        const img = document.createElement('img');
        img.className = 'gl-poi-lightbox__image';
        img.src = imageSrc;
        img.alt = '';
        content.appendChild(img);
        this._imgElement = img;

        // Bouton fermer
        const closeBtn = document.createElement('button');
        closeBtn.className = 'gl-poi-lightbox__close';
        closeBtn.setAttribute('aria-label', 'Fermer');
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });
        lightbox.appendChild(closeBtn);

        // Navigation galerie (flèches + compteur) si plusieurs images
        if (this.galleryImages.length > 1) {
            this._createNavigation(lightbox);
        }

        document.body.appendChild(lightbox);
        this.currentLightbox = lightbox;

        // Gestion clavier : Escape, flèches gauche/droite
        this.keyHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.next();
            }
        };
        document.addEventListener('keydown', this.keyHandler);
    }

    /**
     * Crée les boutons de navigation et le compteur
     * @private
     * @param {HTMLElement} lightbox - Conteneur lightbox
     */
    _createNavigation(lightbox) {
        // Bouton précédent
        const prevBtn = document.createElement('button');
        prevBtn.className = 'gl-poi-lightbox__prev';
        prevBtn.setAttribute('aria-label', 'Image précédente');
        prevBtn.textContent = '\u2039';
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.prev();
        });
        lightbox.appendChild(prevBtn);
        this._prevButton = prevBtn;

        // Bouton suivant
        const nextBtn = document.createElement('button');
        nextBtn.className = 'gl-poi-lightbox__next';
        nextBtn.setAttribute('aria-label', 'Image suivante');
        nextBtn.textContent = '\u203A';
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.next();
        });
        lightbox.appendChild(nextBtn);
        this._nextButton = nextBtn;

        // Compteur (ex: "2 / 5")
        const counter = document.createElement('div');
        counter.className = 'gl-poi-lightbox__counter';
        lightbox.appendChild(counter);
        this._counterElement = counter;

        this._updateNavState();
    }

    /**
     * Navigue vers l'image précédente
     */
    prev() {
        if (this.galleryImages.length <= 1) return;
        this.currentIndex = (this.currentIndex - 1 + this.galleryImages.length) % this.galleryImages.length;
        this._updateImage();
    }

    /**
     * Navigue vers l'image suivante
     */
    next() {
        if (this.galleryImages.length <= 1) return;
        this.currentIndex = (this.currentIndex + 1) % this.galleryImages.length;
        this._updateImage();
    }

    /**
     * Met à jour l'image affichée et l'état de navigation
     * @private
     */
    _updateImage() {
        if (!this._imgElement) return;
        this._imgElement.src = this.galleryImages[this.currentIndex];
        this._updateNavState();

        // Notifier le changement d'index (pour synchroniser les miniatures)
        if (typeof this.onIndexChange === 'function') {
            this.onIndexChange(this.currentIndex);
        }
    }

    /**
     * Met à jour le compteur et la visibilité des flèches
     * @private
     */
    _updateNavState() {
        if (this._counterElement) {
            this._counterElement.textContent = `${this.currentIndex + 1} / ${this.galleryImages.length}`;
        }
    }

    /**
     * Ferme la lightbox active
     */
    close() {
        if (this.currentLightbox && document.body.contains(this.currentLightbox)) {
            document.body.removeChild(this.currentLightbox);
        }

        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }

        this.currentLightbox = null;
        this._imgElement = null;
        this._counterElement = null;
        this._prevButton = null;
        this._nextButton = null;
        this.galleryImages = [];
        this.currentIndex = 0;
        this.onIndexChange = null;
    }

    /**
     * Vérifie si une lightbox est actuellement ouverte
     * @returns {boolean}
     */
    isOpen() {
        return this.currentLightbox !== null && document.body.contains(this.currentLightbox);
    }
}

// ── ESM Export ──
export { LightboxManager };
