/**
 * POI Renderers - Media Renderers Module (Migrated to AbstractRenderer)
 * Rendu des médias: images, galeries, lightbox
 *
 * @module poi/renderers/media-renderers
 * @requires renderers/abstract-renderer
 * @version 2.0.0 - Migrated to AbstractRenderer base class
 */
import { AbstractRenderer } from '../../renderers/abstract-renderer.js';

/**
 * @class MediaRenderers
 * @extends AbstractRenderer
 * @description Renders media elements: images, galleries, lightbox
 */
class MediaRenderers extends AbstractRenderer {
    constructor(options = {}) {
        super({
            name: 'MediaRenderers',
            debug: options.debug || false,
            config: options.config || {}
        });
        this.init();
    }

    /**
     * Render method (required by AbstractRenderer)
     * @param {Object} data - Render data {section, value, type}
     * @returns {HTMLElement|null} Rendered element
     */
    render(data) {
        const { section, value, type } = data;

        switch (type) {
            case 'image':
                return this.renderImage(section, value);
            case 'gallery':
                return this.renderGallery(section, value);
            default:
                this.warn('Unknown media render type:', type);
                return null;
        }
    }

    /**
     * Rend une image (hero ou normale)
     * @param {Object} section - Section config
     * @param {string} imageUrl - Image URL
     * @returns {HTMLElement|null}
     */
    renderImage(section, imageUrl) {
        if (!imageUrl) return null;

        const className = section.variant === 'hero'
            ? 'gl-poi-sidepanel__photo gl-poi-sidepanel__photo--hero'
            : 'gl-poi-sidepanel__photo';

        const photoDiv = this.createElement('div', className);
        const img = this.createElement('img', null, {
            src: imageUrl,
            alt: section.label || 'Photo',
            loading: 'lazy'
        });

        photoDiv.appendChild(img);
        return photoDiv;
    }

    /**
     * Rend une galerie d'images avec miniatures
     * @param {Object} section - Section config
     * @param {Array<string>} gallery - Array of image URLs
     * @returns {HTMLElement|null}
     */
    renderGallery(section, gallery) {
        if (!gallery || !Array.isArray(gallery) || gallery.length === 0) {
            this.warn('renderGallery: invalid gallery data', gallery);
            return null;
        }

        this.info('renderGallery: rendering', gallery.length, 'images');

        const galleryDiv = this.createElement('div', 'gl-poi-gallery');

        // Image principale
        const mainDiv = this._createMainImage(gallery[0]);
        galleryDiv.appendChild(mainDiv);

        // Miniatures si plusieurs images
        if (gallery.length > 1) {
            const thumbsDiv = this._createThumbnails(gallery, mainDiv);
            galleryDiv.appendChild(thumbsDiv);
        }

        return galleryDiv;
    }

    /**
     * Crée l'image principale de la galerie
     * @private
     * @param {string} imageUrl - Image URL
     * @returns {HTMLElement}
     */
    _createMainImage(imageUrl) {
        const mainDiv = this.createElement('div', 'gl-poi-gallery__main', {
            'data-gallery-index': '0'
        });

        const mainImg = this.createElement('img', null, {
            src: imageUrl,
            alt: 'Image 1',
            loading: 'lazy'
        });

        mainDiv.appendChild(mainImg);
        return mainDiv;
    }

    /**
     * Crée les miniatures de la galerie
     * @private
     * @param {Array<string>} gallery - Array of image URLs
     * @param {HTMLElement} mainDiv - Main image container
     * @returns {HTMLElement}
     */
    _createThumbnails(gallery, mainDiv) {
        const thumbsDiv = this.createElement('div', 'gl-poi-gallery__thumbnails');
        const mainImg = mainDiv.querySelector('img');

        gallery.forEach((imgUrl, index) => {
            const thumbDiv = this._createThumbnail(imgUrl, index, mainImg, mainDiv, thumbsDiv);
            thumbsDiv.appendChild(thumbDiv);
        });

        return thumbsDiv;
    }

    /**
     * Crée une miniature individuelle
     * @private
     * @param {string} imgUrl - Image URL
     * @param {number} index - Image index
     * @param {HTMLElement} mainImg - Main image element
     * @param {HTMLElement} mainDiv - Main image container
     * @param {HTMLElement} thumbsDiv - Thumbnails container
     * @returns {HTMLElement}
     */
    _createThumbnail(imgUrl, index, mainImg, mainDiv, thumbsDiv) {
        const thumbDiv = this.createElement('div',
            index === 0 ? 'gl-poi-gallery__thumb active' : 'gl-poi-gallery__thumb',
            { 'data-index': index.toString() }
        );

        const imgThumb = this.createElement('img', null, {
            src: imgUrl,
            alt: `Image ${index + 1}`,
            loading: 'lazy'
        });

        thumbDiv.appendChild(imgThumb);

        // Event listener pour changer l'image principale
        this.addEventListener(thumbDiv, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Retirer la classe active de toutes les miniatures
            const allThumbs = thumbsDiv.querySelectorAll('.gl-poi-gallery__thumb');
            allThumbs.forEach(t => t.classList.remove('active'));

            // Ajouter la classe active à la miniature cliquée
            thumbDiv.classList.add('active');

            // Changer l'image principale
            mainImg.src = imgUrl;
            mainImg.alt = `Image ${index + 1}`;
            mainDiv.setAttribute('data-gallery-index', index.toString());

            this.info('Gallery: Switched to image', index + 1);
        }, true);

        return thumbDiv;
    }

    /**
     * Cleanup when gallery is destroyed
     * @override
     */
    destroy() {
        this.debug('Destroying MediaRenderers');
        super.destroy();
    }
}

// ── ESM Export ──
export { MediaRenderers };
