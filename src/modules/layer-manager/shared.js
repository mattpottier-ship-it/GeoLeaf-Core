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
"use strict";

import { Log } from '../log/index.js';



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

const LMShared = _LayerManagerShared;
export { LMShared };
