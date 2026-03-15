/*!
 * GeoLeaf Core
 *  2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * Module POI Renderers (Aggregator)
 * Facade public pour tous les renderers POI - Phase 10-D Pattern C
 */

import { POIRenderersContract } from "../../contracts/poi-renderers.contract.ts";

const _POIRenderers = {
    /**
     * Rend le contenu complete of a POI
     * @param {Object} poi - Data du POI
     * @param {Object} state - STATE
     * @returns {DocumentFragment}
     */
    renderContent(poi: any, state: any) {
        return POIRenderersContract.renderContent(poi, state);
    },

    /**
     * Rend un field text
     */
    renderText(section: any, poi: any, value: any) {
        return POIRenderersContract.renderText(section, poi, value);
    },

    /**
     * Rend un badge
     */
    renderBadge(section: any, value: any, poi: any) {
        return POIRenderersContract.renderBadge(section, value, poi);
    },

    /**
     * Rend une image
     */
    renderImage(section: any, imageUrl: any) {
        return POIRenderersContract.renderImage(section, imageUrl);
    },

    /**
     * Rend une gallery
     */
    renderGallery(section: any, gallery: any) {
        return POIRenderersContract.renderGallery(section, gallery);
    },

    /**
     * Rend un link
     */
    renderLink(section: any, url: any) {
        return POIRenderersContract.renderLink(section, url);
    },

    /**
     * Peuple le side panel with thes data du POI
     * @returns {Promise<void>}
     */
    async populateSidePanel(poi: any, customLayout: any) {
        return POIRenderersContract.populateSidePanel(poi, customLayout);
    },
};

//  ESM Export
const POIRenderers = _POIRenderers;
export { POIRenderers };
