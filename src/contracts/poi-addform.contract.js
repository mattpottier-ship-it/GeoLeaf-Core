/**
 * GeoLeaf Contract — POI AddForm (lazy-chunk boundary)
 *
 * Interface ESM pure pour accéder à AddFormOrchestrator et POIPlacementMode
 * depuis les modules UI (controls.js, fields-manager.js) sans couplage runtime.
 *
 * Phase 10-D — Pattern C : contrat de chunk POI AddForm.
 *
 * USAGE :
 *   import { POIAddFormContract } from '../contracts/poi-addform.contract.js';
 *
 *   if (POIAddFormContract.isAddFormAvailable()) {
 *       POIAddFormContract.openAddForm(latlng, null);
 *   }
 *
 *   POIAddFormContract.activatePlacementMode(map, callback);
 */
"use strict";

/**
 * Phase 7 — Premium Separation:
 * AddFormOrchestrator and POIPlacementMode are now in GeoLeaf-Plugins/plugin-addpoi.
 * Access them only via globalThis.GeoLeaf at runtime (after the plugin is loaded).
 */
function _getOrchestrator() {
    return (typeof globalThis !== "undefined" ? globalThis : window)?.GeoLeaf?.POI?.AddForm ?? null;
}
function _getPlacementMode() {
    return (
        (typeof globalThis !== "undefined" ? globalThis : window)?.GeoLeaf?.POI?.PlacementMode ??
        null
    );
}

/**
 * Contrat d'interface pour le module POI AddForm + PlacementMode.
 * @namespace POIAddFormContract
 */
const POIAddFormContract = {
    /**
     * Retourne true si AddFormOrchestrator est disponible.
     * @returns {boolean}
     */
    isAddFormAvailable() {
        const orch = _getOrchestrator();
        return !!(orch && typeof orch.openAddForm === "function");
    },

    /**
     * Retourne true si PlacementMode est disponible.
     * @returns {boolean}
     */
    isPlacementModeAvailable() {
        const pm = _getPlacementMode();
        return !!(pm && typeof pm.activate === "function");
    },

    /**
     * Ouvre le formulaire d'ajout de POI.
     * @param {L.LatLng} latlng - Position initiale (optionnelle)
     * @param {Object|null} options - Options supplémentaires
     * @returns {Promise<void>}
     */
    async openAddForm(latlng, options) {
        return _getOrchestrator()?.openAddForm(latlng, options);
    },

    /**
     * Active le mode placement pour choisir une position sur la carte.
     * @param {L.Map} map - Instance de la carte Leaflet
     * @param {Function} callback - callback(result) avec result.latlng
     */
    activatePlacementMode(map, callback) {
        const pm = _getPlacementMode();
        if (pm && typeof pm.activate === "function") {
            pm.activate(map, callback);
        }
    },

    /**
     * Accès direct à AddFormOrchestrator (pour les cas où l'API complète est nécessaire).
     * @type {Object}
     */
    get orchestrator() {
        return _getOrchestrator();
    },

    /**
     * Accès direct à POIPlacementMode.
     * @type {Object}
     */
    get placementMode() {
        return _getPlacementMode();
    },
};

export { POIAddFormContract };
