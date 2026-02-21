/*!
 * GeoLeaf Core
 *  2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * Module POI Renderers (Agrégateur)
 * Facade publique pour tous les renderers POI - Phase 10-D Pattern C
 */

import { POIRenderersContract } from "../../contracts/poi-renderers.contract.js";

const _POIRenderers = {
    /**
     * Rend le contenu complet d'un POI
     * @param {Object} poi - Données du POI
     * @param {Object} state - État
     * @returns {DocumentFragment}
     */
    renderContent(poi, state) {
        return POIRenderersContract.renderContent(poi, state);
    },

    /**
     * Rend un champ texte
     */
    renderText(section, poi, value) {
        return POIRenderersContract.renderText(section, poi, value);
    },

    /**
     * Rend un badge
     */
    renderBadge(section, value, poi) {
        return POIRenderersContract.renderBadge(section, value, poi);
    },

    /**
     * Rend une image
     */
    renderImage(section, imageUrl) {
        return POIRenderersContract.renderImage(section, imageUrl);
    },

    /**
     * Rend une galerie
     */
    renderGallery(section, gallery) {
        return POIRenderersContract.renderGallery(section, gallery);
    },

    /**
     * Rend un lien
     */
    renderLink(section, url) {
        return POIRenderersContract.renderLink(section, url);
    },

    /**
     * Peuple le side panel avec les données du POI
     * @returns {Promise<void>}
     */
    async populateSidePanel(poi, customLayout) {
        return POIRenderersContract.populateSidePanel(poi, customLayout);
    },
};

//  ESM Export
const POIRenderers = _POIRenderers;
export { POIRenderers };
