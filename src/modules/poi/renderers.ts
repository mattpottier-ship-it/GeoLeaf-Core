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

import { POIRenderersContract } from "../../contracts/poi-renderers.contract.ts";

const _POIRenderers = {
    /**
     * Rend le contenu complet d'un POI
     * @param {Object} poi - Données du POI
     * @param {Object} state - État
     * @returns {DocumentFragment}
     */
    renderContent(poi: any, state: any) {
        return POIRenderersContract.renderContent(poi, state);
    },

    /**
     * Rend un champ texte
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
     * Rend une galerie
     */
    renderGallery(section: any, gallery: any) {
        return POIRenderersContract.renderGallery(section, gallery);
    },

    /**
     * Rend un lien
     */
    renderLink(section: any, url: any) {
        return POIRenderersContract.renderLink(section, url);
    },

    /**
     * Peuple le side panel avec les données du POI
     * @returns {Promise<void>}
     */
    async populateSidePanel(poi: any, customLayout: any) {
        return POIRenderersContract.populateSidePanel(poi, customLayout);
    },
};

//  ESM Export
const POIRenderers = _POIRenderers;
export { POIRenderers };
