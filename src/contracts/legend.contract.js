/**
 * GeoLeaf Contract — Legend (lazy-chunk boundary)
 *
 * Interface ESM pure pour accéder au module Legend depuis les modules core
 * sans couplage runtime — interface ESM pure.
 *
 * Phase 10-D — Pattern C : contrat de chunk Legend.
 *
 * USAGE :
 *   import { LegendContract } from '../../../contracts/legend.contract.js';
 *
 *   if (LegendContract.isAvailable()) {
 *       LegendContract.loadLayerLegend(layerId, styleId, layerConfig);
 *   }
 *
 * POURQUOI un contrat ?
 * Legend (geoleaf.legend.js) est une façade qui dépend de l'init runtime
 * (map + profil). Le contrat encapsule la garde d'initialisation et fournit
 * un point d'entrée typé, sans exposer le namespace global.
 */
"use strict";

import { Legend } from "../modules/geoleaf.legend.js";

/**
 * Contrat d'interface pour le module Legend.
 * @namespace LegendContract
 */
const LegendContract = {
    /**
     * Retourne true si Legend est initialisé (carte chargée).
     * @returns {boolean}
     */
    isAvailable() {
        return !!Legend && typeof Legend.loadLayerLegend === "function";
    },

    /**
     * Charge et affiche la légende pour une couche et un style donnés.
     * @param {string} layerId
     * @param {string} styleId
     * @param {Object} layerConfig
     */
    loadLayerLegend(layerId, styleId, layerConfig) {
        if (typeof Legend.loadLayerLegend === "function") {
            Legend.loadLayerLegend(layerId, styleId, layerConfig);
        }
    },

    /**
     * Met à jour la visibilité d'une couche dans la légende.
     * @param {string} layerId
     * @param {boolean} visible
     */
    setLayerVisibility(layerId, visible) {
        if (typeof Legend.setLayerVisibility === "function") {
            Legend.setLayerVisibility(layerId, visible);
        }
    },
};

export { LegendContract };
