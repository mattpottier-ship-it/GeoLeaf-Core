/**
 * GeoLeaf Contract — Route (lazy-chunk boundary)
 *
 * Interface ESM pure pour accéder au module Route depuis les modules core.
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
 * Contrat d'interface pour le module Route.
 * @namespace RouteContract
 */
const RouteContract = {
    /**
     * Retourne true si Route est initialisé.
     * @returns {boolean}
     */
    isAvailable() {
        return !!Route && Route._initialized === true;
    },

    /**
     * Retourne le LayerGroup contenant les itinéraires.
     * Note : la méthode dans geoleaf.route.js est `getLayer()`.
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
