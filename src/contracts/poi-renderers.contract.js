/**
 * GeoLeaf Contract — POI Renderers (lazy-chunk boundary)
 *
 * Interface ESM pure pour accéder aux sous-modules de rendu POI
 * (RendererCore, FieldRenderers, MediaRenderers, RendererLinks)
 * depuis la façade poi/renderers.js sans couplage runtime.
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

import { RendererCore } from "../modules/poi/renderers/core.js";
import { RendererLinks } from "../modules/poi/renderers/links.js";
import { FieldRenderers } from "../modules/poi/renderers/field-renderers.js";
import { MediaRenderers } from "../modules/poi/renderers/media-renderers.js";

/** @type {FieldRenderers|null} Instance singleton paresseuse */
let _fieldRenderers = null;

/** @type {MediaRenderers|null} Instance singleton paresseuse */
let _mediaRenderers = null;

/**
 * Retourne l'instance singleton de FieldRenderers (lazy-init).
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
 * Retourne l'instance singleton de MediaRenderers (lazy-init).
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
 * Contrat d'interface pour les sous-modules POI Renderers.
 * @namespace POIRenderersContract
 */
const POIRenderersContract = {
    /**
     * Peuple le side panel avec les données d'un POI.
     * @param {Object} poi - POI normalisé
     * @param {Object} customLayout - Layout personnalisé (optionnel)
     * @returns {Promise<void>}
     */
    async populateSidePanel(poi, customLayout) {
        if (RendererCore && typeof RendererCore.populateSidePanel === "function") {
            return RendererCore.populateSidePanel(poi, customLayout);
        }
    },

    /**
     * Rend le contenu complet d'un POI (side panel).
     * @param {Object} poi - Données du POI
     * @param {Object} state - État
     * @returns {DocumentFragment}
     */
    renderContent(poi, state) {
        if (RendererCore && typeof RendererCore.renderContent === "function") {
            return RendererCore.renderContent(poi, state);
        }
        return document.createDocumentFragment();
    },

    /**
     * Rend un champ texte.
     * @param {Object} section
     * @param {Object} poi
     * @param {string} value
     * @returns {Promise<HTMLElement|null>}
     */
    async renderText(section, poi, value) {
        return _getFieldRenderers().renderText(section, poi, value);
    },

    /**
     * Rend un badge.
     * @param {Object} section
     * @param {*} value
     * @param {Object} poi
     * @returns {HTMLElement|null}
     */
    renderBadge(section, value, poi) {
        return _getFieldRenderers().renderBadge(section, value, poi);
    },

    /**
     * Rend une image.
     * @param {Object} section
     * @param {string} imageUrl
     * @returns {HTMLElement|null}
     */
    renderImage(section, imageUrl) {
        return _getMediaRenderers().renderImage(section, imageUrl);
    },

    /**
     * Rend une galerie.
     * @param {Object} section
     * @param {Array<string>} gallery
     * @returns {HTMLElement|null}
     */
    renderGallery(section, gallery) {
        return _getMediaRenderers().renderGallery(section, gallery);
    },

    /**
     * Rend un lien.
     * @param {Object} section
     * @param {string} url
     * @returns {HTMLElement|null}
     */
    renderLink(section, url) {
        return RendererLinks.renderLink(section, url);
    },
};

export { POIRenderersContract };
