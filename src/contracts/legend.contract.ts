/**
 * GeoLeaf Contract — Legend (lazy-chunk boundary)
 *
 * Interface ESM pure pour access au module Legend from the modules core
 * sans couplage runtime — interface ESM pure.
 *
 * Phase 10-D — Pattern C : contrat de chunk Legend.
 *
 * USAGE :
 *   import { LegendContract } from '../../../contracts/legend.contract.js';
 *
 *   if (LegendContract.isAvailable()) {
 *       LegendContract.loadLayerLegend(layerId, styleId: any, layerConfig: any);
 *   }
 *
 * POURQUOI un contrat ?
 * Legend (geoleaf.legend.js) est une facade qui depends of the init runtime
 * (map + profile). Le contrat encapsule la garde d'initialization et fournit
 * un point d'input typed, sans exposer le namespace global.
 */
"use strict";

import { Legend } from "../modules/geoleaf.legend.js";

/**
 * Contrat d'interface pour the module Legend.
 * @namespace LegendContract
 */
const LegendContract = {
    /**
     * Returns true si Legend est initialized (carte loadede).
     * @returns {boolean}
     */
    isAvailable() {
        return !!Legend && typeof Legend.loadLayerLegend === "function";
    },

    /**
     * Loads and displays the legend for a layer with given styles.
     * @param {string} layerId
     * @param {string} styleId
     * @param {Object} layerConfig
     */
    loadLayerLegend(layerId: any, styleId: any, layerConfig: any) {
        if (typeof Legend.loadLayerLegend === "function") {
            Legend.loadLayerLegend(layerId, styleId, layerConfig);
        }
    },

    /**
     * Updates the visibility d'a layer dans the legend.
     * @param {string} layerId
     * @param {boolean} visible
     */
    setLayerVisibility(layerId: any, visible: any) {
        if (typeof Legend.setLayerVisibility === "function") {
            Legend.setLayerVisibility(layerId, visible);
        }
    },
};

export { LegendContract };
