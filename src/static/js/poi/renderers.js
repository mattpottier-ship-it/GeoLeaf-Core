/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * Module POI Renderers (Agrégateur)
 * Façade publique pour tous les renderers POI
 *
 * ARCHITECTURE REFACTORISÉE :
 * - poi/renderers/fields.js : Champs texte et badges
 * - poi/renderers/media.js : Images et galeries
 * - poi/renderers/links.js : Liens externes
 * - poi/renderers/core.js : Logique de rendu principale (legacy)
 * - poi/renderers.js (ce fichier) : Agrégateur/façade publique
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};

    /**
     * Module POI Renderers
     * Délègue aux sous-modules spécialisés
     * @namespace _POIRenderers
     * @private
     */
    const _POIRenderers = {
        /**
         * Rend le contenu complet d'un POI
         * (Délégué au core pour compatibilité)
         * @param {Object} poi - Données du POI
         * @param {Object} state - État
         * @returns {DocumentFragment}
         */
        renderContent(poi, state) {
            // Délégation au module core (fichier original)
            if (GeoLeaf._POIRenderersCore && typeof GeoLeaf._POIRenderersCore.renderContent === 'function') {
                return GeoLeaf._POIRenderersCore.renderContent(poi, state);
            }
            if (GeoLeaf.Log) GeoLeaf.Log.error('[POI] Module _POIRenderersCore non disponible');
            return document.createDocumentFragment();
        },

        /**
         * Rend un champ texte
         * (Délégué au module fields)
         */
        renderText(section, poi, value) {
            if (GeoLeaf._POIRendererFields) {
                return GeoLeaf._POIRendererFields.renderText(section, poi, value);
            }
            if (GeoLeaf.Log) GeoLeaf.Log.error('[POI] Module _POIRendererFields non disponible pour renderText');
            return null;
        },

        /**
         * Rend un badge
         * (Délégué au module fields)
         */
        renderBadge(section, value, poi) {
            if (GeoLeaf._POIRendererFields) {
                return GeoLeaf._POIRendererFields.renderBadge(section, value, poi);
            }
            if (GeoLeaf.Log) GeoLeaf.Log.error('[POI] Module _POIRendererFields non disponible pour renderBadge');
            return null;
        },

        /**
         * Rend une image
         * (Délégué au module media)
         */
        renderImage(section, imageUrl) {
            if (GeoLeaf._POIRendererMedia) {
                return GeoLeaf._POIRendererMedia.renderImage(section, imageUrl);
            }
            if (GeoLeaf.Log) GeoLeaf.Log.error('[POI] Module _POIRendererMedia non disponible pour renderImage');
            return null;
        },

        /**
         * Rend une galerie
         * (Délégué au module media)
         */
        renderGallery(section, gallery) {
            if (GeoLeaf._POIRendererMedia) {
                return GeoLeaf._POIRendererMedia.renderGallery(section, gallery);
            }
            return null;
        },

        /**
         * Rend un lien
         * (Délégué au module links)
         */
        renderLink(section, url) {
            if (GeoLeaf._POIRendererLinks) {
                return GeoLeaf._POIRendererLinks.renderLink(section, url);
            }
            if (GeoLeaf.Log) GeoLeaf.Log.error('[POI] Module _POIRendererLinks non disponible pour renderLink');
            return null;
        },

        /**
         * Peuple le side panel avec les données du POI
         * (Délégué au module core)
         * @returns {Promise<void>}
         */
        async populateSidePanel(poi, customLayout) {
            if (GeoLeaf._POIRenderersCore && typeof GeoLeaf._POIRenderersCore.populateSidePanel === 'function') {
                return await GeoLeaf._POIRenderersCore.populateSidePanel(poi, customLayout);
            }
            if (GeoLeaf.Log) GeoLeaf.Log.error('[POI] Module _POIRenderersCore non disponible pour populateSidePanel');
        }
    };

    // Exposer dans l'espace de noms interne
    GeoLeaf._POIRenderers = _POIRenderers;

})(window);
