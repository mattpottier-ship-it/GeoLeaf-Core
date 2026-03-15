/**
 * GeoLeaf POI Module - Lightbox Manager
 * Gestion of the display lightbox for thes images avec navigation gallery
 * Phase 6.2 - Extraction from core.js
 */

/**
 * Manager for lightbox pour display d'images en fullscreen
 * Supporte la navigation dans une gallery d'images (arrows gauche/droite)
 */
function _buildLightboxDom(imageSrc: string): { lightbox: HTMLDivElement; img: HTMLImageElement } {
    const lightbox = document.createElement("div") as HTMLDivElement;
    lightbox.className = "gl-poi-lightbox-global";
    lightbox.style.display = "flex";

    const overlay = document.createElement("div");
    overlay.className = "gl-poi-lightbox__overlay";
    lightbox.appendChild(overlay);

    const content = document.createElement("div");
    content.className = "gl-poi-lightbox__content";
    lightbox.appendChild(content);

    const img = document.createElement("img") as HTMLImageElement;
    img.className = "gl-poi-lightbox__image";
    img.src = imageSrc;
    img.alt = "";
    content.appendChild(img);

    const closeBtn = document.createElement("button");
    closeBtn.className = "gl-poi-lightbox__close";
    closeBtn.setAttribute("aria-label", "Fermer");
    closeBtn.textContent = "×";
    lightbox.appendChild(closeBtn);

    return { lightbox, img };
}

class LightboxManager {
    currentLightbox: HTMLElement | null = null;
    keyHandler: ((e: KeyboardEvent) => void) | null = null;
    galleryImages: string[] = [];
    currentIndex: number = 0;
    _imgElement: HTMLImageElement | null = null;
    _counterElement: HTMLElement | null = null;
    _prevButton: HTMLElement | null = null;
    _nextButton: HTMLElement | null = null;
    onIndexChange: ((index: number) => void) | null = null;

    constructor() {
        this.currentLightbox = null;
        this.keyHandler = null;
        this.galleryImages = [];
        this.currentIndex = 0;
        this._imgElement = null;
        this._counterElement = null;
        this._prevButton = null;
        this._nextButton = null;
        this.onIndexChange = null;
    }

    /**
     * Ouvre une lightbox pour display une image en fullscreen.
     * If a array d'images est fourni, active la navigation par arrows.
     * @param {string} imageSrc - URL of the image to display
     * @param {string[]} [galleryImages] - Array d'URLs pour navigation gallery
     * @param {number} [startIndex] - Starting index in the gallery
     */
    open(imageSrc: any, galleryImages?: any, startIndex?: any) {
        this.close();

        if (Array.isArray(galleryImages) && galleryImages.length > 1) {
            this.galleryImages = galleryImages;
            this.currentIndex =
                typeof startIndex === "number" ? startIndex : galleryImages.indexOf(imageSrc);
            if (this.currentIndex < 0) this.currentIndex = 0;
        } else {
            this.galleryImages = [imageSrc];
            this.currentIndex = 0;
        }

        const { lightbox, img } = _buildLightboxDom(imageSrc);
        {
            const overlay = lightbox.querySelector(".gl-poi-lightbox__overlay") as HTMLElement;
            if (overlay) overlay.addEventListener("click", () => this.close());
        }
        const closeBtn = lightbox.querySelector(".gl-poi-lightbox__close") as HTMLElement;
        if (closeBtn) {
            closeBtn.addEventListener("click", (e: any) => {
                e.stopPropagation();
                this.close();
            });
        }
        this._imgElement = img;

        if (this.galleryImages.length > 1) {
            this._createNavigation(lightbox);
        }

        document.body.appendChild(lightbox);
        this.currentLightbox = lightbox;

        this.keyHandler = (e: any) => {
            if (e.key === "Escape") {
                this.close();
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                this.prev();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                this.next();
            }
        };
        document.addEventListener("keydown", this.keyHandler);
    }

    /**
     * Creates thes buttons de navigation et le compteur
     * @private
     * @param {HTMLElement} lightbox - Conteneur lightbox
     */
    _createNavigation(lightbox: any) {
        // Button previous
        const prevBtn = document.createElement("button");
        prevBtn.className = "gl-poi-lightbox__prev";
        prevBtn.setAttribute("aria-label", "Image previous");
        prevBtn.textContent = "\u2039";
        prevBtn.addEventListener("click", (e: any) => {
            e.stopPropagation();
            this.prev();
        });
        lightbox.appendChild(prevBtn);
        this._prevButton = prevBtn;

        // Button suivant
        const nextBtn = document.createElement("button");
        nextBtn.className = "gl-poi-lightbox__next";
        nextBtn.setAttribute("aria-label", "Image suivante");
        nextBtn.textContent = "\u203A";
        nextBtn.addEventListener("click", (e: any) => {
            e.stopPropagation();
            this.next();
        });
        lightbox.appendChild(nextBtn);
        this._nextButton = nextBtn;

        // Compteur (ex: "2 / 5")
        const counter = document.createElement("div");
        counter.className = "gl-poi-lightbox__counter";
        lightbox.appendChild(counter);
        this._counterElement = counter;

        this._updateNavState();
    }

    /**
     * Navigue vers l'image previous
     */
    prev() {
        if (this.galleryImages.length <= 1) return;
        this.currentIndex =
            (this.currentIndex - 1 + this.galleryImages.length) % this.galleryImages.length;
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
     * Updates the image displayed et the state de navigation
     * @private
     */
    _updateImage() {
        if (!this._imgElement) return;
        this._imgElement.src = this.galleryImages[this.currentIndex];
        this._updateNavState();

        // Notifier le changement d'index (pour synchronize les thumbnails)
        if (typeof this.onIndexChange === "function") {
            this.onIndexChange(this.currentIndex);
        }
    }

    /**
     * Updates the compteur et la visibility des arrows
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
            document.removeEventListener("keydown", this.keyHandler);
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
     * Checks if une lightbox est currentlement opene
     * @returns {boolean}
     */
    isOpen() {
        return this.currentLightbox !== null && document.body.contains(this.currentLightbox);
    }
}

// ── ESM Export ──
export { LightboxManager };
