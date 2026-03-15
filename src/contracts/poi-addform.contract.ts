/**
 * GeoLeaf Contract — POI AddForm (lazy-chunk boundary)
 *
 * Interface ESM pure pour access to AddFormOrchestrator et POIPlacementMode
 * from the modules UI (controls.js, fields-manager.js) sans couplage runtime.
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
 *   POIAddFormContract.activatePlacementMode(map: any, callback: any);
 */
"use strict";

/**
 * Phase 7 — Premium Separation:
 * AddFormOrchestrator and POIPlacementMode are now in GeoLeaf-Plugins/plugin-addpoi.
 * Access them only via globalThis.GeoLeaf at runtime (after the plugin is loaded).
 */
function _getOrchestrator() {
    return (
        (typeof globalThis !== "undefined" ? globalThis : (window as any))?.GeoLeaf?.POI?.AddForm ??
        null
    );
}
function _getPlacementMode() {
    return (
        (typeof globalThis !== "undefined" ? globalThis : (window as any))?.GeoLeaf?.POI
            ?.PlacementMode ?? null
    );
}

/**
 * Contrat d'interface pour the module POI AddForm + PlacementMode.
 * @namespace POIAddFormContract
 */
const POIAddFormContract = {
    /**
     * Returns true si AddFormOrchestrator est available.
     * @returns {boolean}
     */
    isAddFormAvailable() {
        const orch = _getOrchestrator();
        return !!(orch && typeof orch.openAddForm === "function");
    },

    /**
     * Returns true si PlacementMode est available.
     * @returns {boolean}
     */
    isPlacementModeAvailable() {
        const pm = _getPlacementMode();
        return !!(pm && typeof pm.activate === "function");
    },

    /**
     * Ouvre le form d'ajout de POI.
     * @param {L.LatLng} latlng - Position initial (optionalle)
     * @param {Object|null} options - Additional options
     * @returns {Promise<void>}
     */
    async openAddForm(latlng: any, options?: any) {
        return _getOrchestrator()?.openAddForm(latlng, options);
    },

    /**
     * Active le mode placement pour choisir une position sur the map.
     * @param {L.Map} map - Instance de the map Leaflet
     * @param {Function} callback - callback(result) avec result.latlng
     */
    activatePlacementMode(map: any, callback: any) {
        const pm = _getPlacementMode();
        if (pm && typeof pm.activate === "function") {
            pm.activate(map, callback);
        }
    },

    /**
     * Direct access to AddFormOrchestrator (for cases where the complete API is required).
     * @type {Object}
     */
    get orchestrator() {
        return _getOrchestrator();
    },

    /**
     * Direct access to POIPlacementMode.
     * @type {Object}
     */
    get placementMode() {
        return _getPlacementMode();
    },
};

export { POIAddFormContract };
