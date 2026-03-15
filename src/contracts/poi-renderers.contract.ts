/**
 * GeoLeaf Contract — POI Renderers (lazy-chunk boundary)
 *
 * Interface ESM pure pour access aux sous-modules de rendu POI
 * (RendererCore, FieldRenderers, MediaRenderers, RendererLinks)
 * from the facade poi/renderers.js sans couplage runtime.
 *
 * Phase 10-D — Pattern C : contrat de chunk POI Renderers.
 *
 * USAGE :
 *   import { POIRenderersContract } from '../../contracts/poi-renderers.contract.js';
 *
 *   const fragment = POIRenderersContract.renderContent(poi, state);
 *   await POIRenderersContract.populateSidePanel(poi, layout);
 */
"use strict";

import { RendererCore as _RendererCore } from "../modules/poi/renderers/core.js";
import { RendererLinks } from "../modules/poi/renderers/links.js";
import { FieldRenderers } from "../modules/poi/renderers/field-renderers.js";
import { MediaRenderers } from "../modules/poi/renderers/media-renderers.js";

const RendererCore: any = _RendererCore;

/** @type {FieldRenderers|null} Instance singleton paresseuse */
let _fieldRenderers: any = null;

/** @type {MediaRenderers|null} Instance singleton paresseuse */
let _mediaRenderers: any = null;

/**
 * Returns the instance singleton de FieldRenderers (lazy-init).
 * @returns {FieldRenderers}
 * @private
 */
function _getFieldRenderers() {
    if (!_fieldRenderers) {
        _fieldRenderers = new FieldRenderers({ debug: false });
    }
    return _fieldRenderers;
}

/**
 * Returns the instance singleton de MediaRenderers (lazy-init).
 * @returns {MediaRenderers}
 * @private
 */
function _getMediaRenderers() {
    if (!_mediaRenderers) {
        _mediaRenderers = new MediaRenderers({ debug: false });
    }
    return _mediaRenderers;
}

/**
 * Contrat d'interface for thes sous-modules POI Renderers.
 * @namespace POIRenderersContract
 */
const POIRenderersContract = {
    /**
     * Peuple le side panel with thes data of a POI.
     * @param {Object} poi - POI normalized
     * @param {Object} customLayout - Layout custom (optional)
     * @returns {Promise<void>}
     */
    async populateSidePanel(poi: any, customLayout?: any) {
        if (RendererCore && typeof RendererCore.populateSidePanel === "function") {
            return RendererCore.populateSidePanel(poi, customLayout);
        }
    },

    /**
     * Rend le contenu complete of a POI (side panel).
     * @param {Object} poi - Data du POI
     * @param {Object} state - STATE
     * @returns {DocumentFragment}
     */
    renderContent(poi: any, state?: any) {
        if (RendererCore && typeof RendererCore.renderContent === "function") {
            return RendererCore.renderContent(poi, state);
        }
        return document.createDocumentFragment();
    },

    /**
     * Rend un field text.
     * @param {Object} section
     * @param {Object} poi
     * @param {string} value
     * @returns {Promise<HTMLElement|null>}
     */
    async renderText(section: any, poi: any, value: any) {
        return _getFieldRenderers().renderText(section, poi, value);
    },

    /**
     * Rend un badge.
     * @param {Object} section
     * @param {*} value
     * @param {Object} poi
     * @returns {HTMLElement|null}
     */
    renderBadge(section: any, value: any, poi?: any) {
        return _getFieldRenderers().renderBadge(section, value, poi);
    },

    /**
     * Rend une image.
     * @param {Object} section
     * @param {string} imageUrl
     * @returns {HTMLElement|null}
     */
    renderImage(section: any, imageUrl: any) {
        return _getMediaRenderers().renderImage(section, imageUrl);
    },

    /**
     * Rend une gallery.
     * @param {Object} section
     * @param {Array<string>} gallery
     * @returns {HTMLElement|null}
     */
    renderGallery(section: any, gallery: any) {
        return _getMediaRenderers().renderGallery(section, gallery);
    },

    /**
     * Rend un link.
     * @param {Object} section
     * @param {string} url
     * @returns {HTMLElement|null}
     */
    renderLink(section: any, url: any) {
        return RendererLinks.renderLink(section, url);
    },
};

export { POIRenderersContract };
