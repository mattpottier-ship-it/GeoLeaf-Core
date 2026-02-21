/**
 * Module Renderers/Links pour POI
 * Rendu des liens
 */
import { Log } from '../../log/index.js';


/**
 * Module Links Renderer
 * @namespace _POIRendererLinks
 * @private
 */
const _POIRendererLinks = {
    /**
     * Rend un lien (website, etc.)
     * @param {Object} section - Configuration de la section
     * @param {string} url - URL du lien
     * @returns {HTMLElement|null}
     */
    renderLink(section, url) {
        if (!url) return null;

        const container = document.createElement('div');
        container.className = 'gl-poi-link-container';

        const link = document.createElement('a');
        link.className = 'gl-poi-website-link';
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = section.label || url;

        container.appendChild(link);
        return container;
    }
};


// ── ESM Export ──
const RendererLinks = _POIRendererLinks;
export { RendererLinks };
