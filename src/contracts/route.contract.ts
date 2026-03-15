/**
 * GeoLeaf Contract — Route (lazy-chunk boundary)
 *
 * Interface ESM pure pour access au module Route depuis the modules core.
 *
 * Phase 10-D — Pattern C : contrat de chunk Route.
 *
 * USAGE :
 *   import { RouteContract } from '../../../contracts/route.contract.js';
 *
 *   const routeGroup = RouteContract.getLayerGroup();
 *   if (routeGroup) tempGroup.addLayer(routeGroup);
 */
"use strict";

import { Route } from "../modules/geoleaf.route.js";

/**
 * Contrat d'interface pour the module Route.
 * @namespace RouteContract
 */
const RouteContract = {
    /**
     * Returns true si Route est initialized.
     * @returns {boolean}
     */
    isAvailable() {
        return !!Route && Route._initialized === true;
    },

    /**
     * Returns the LayerGroup contenant les routes.
     * Note : the method dans geoleaf.route.js est `getLayer()`.
     * Ce contrat uniformise l'API sous `getLayerGroup()`.
     * @returns {L.LayerGroup|null}
     */
    getLayerGroup() {
        if (typeof Route.getLayer === "function") {
            return Route.getLayer();
        }
        return null;
    },
};

export { RouteContract };
