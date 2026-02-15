/**
 * Module partagé pour LayerManager
 * État et utilitaires communs entre les sous-modules
 *
 * DÉPENDANCES:
 * - GeoLeaf.Log (optionnel)
 *
 * EXPOSE:
 * - GeoLeaf._LayerManagerShared
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
    const Log = GeoLeaf.Log;

    /**
     * État partagé pour LayerManager (privé interne)
     * @private
     */
    const _LayerManagerShared = {
        /**
         * Référence à la carte Leaflet
         * @type {L.Map|null}
         */
        map: null,

        /**
         * Référence au contrôle Leaflet
         * @type {L.Control|null}
         */
        control: null,

        /**
         * Options internes du module
         * @type {Object}
         */
        options: {
            position: "bottomright",
            title: "Légende",
            collapsible: true,
            collapsed: false,
            sections: []
        }
    };

    // Exposer dans l'espace de noms interne
    GeoLeaf._LayerManagerShared = _LayerManagerShared;

})(window);
