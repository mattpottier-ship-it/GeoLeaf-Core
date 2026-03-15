/**
 * GeoLeaf Contract — POI Core operations
 *
 * Interface ESM pour que the modules POI (add-form, sync…) puissent appeler
 * les operations CRUD of the module POI (addPoi, updatePoi, removePoi, notify)
 * sans couplage runtime to the namespace global.
 *
 * Phase 10-E — Pattern G.
 *
 * REGISTRATION (dans globals.poi.js ou geoleaf.core.js) :
 *   import { POICoreContract } from '../../contracts/poi-core.contract.js';
 *   POICoreContract.register({ addPoi, updatePoi, removePoi }, notifyInstance);
 */
"use strict";

import { POICore } from "../modules/poi/core.js";

/** @type {{updatePoi?: Function, removePoi?: Function}|null} */
let _extra: any = null;
/** @type {{success: Function, error: Function}|null} */
let _notify: any = null;

/**
 * @namespace POICoreContract
 */
const POICoreContract = {
    /**
     * Registers thes fonctions POI non-exportedes et the system de notification.
     * Called by globals.poi.js or the addpoi plugin on loading.
     * @param {{updatePoi?: Function, removePoi?: Function}} extras
     * @param {{success: Function, error: Function}} [notifyInstance]
     */
    register(extras: any, notifyInstance?: any) {
        _extra = extras || {};
        if (notifyInstance) _notify = notifyInstance;
    },

    /**
     * @returns {boolean}
     */
    canShowDetails() {
        return !!(_extra && typeof _extra.showPoiDetails === "function");
    },

    /**
     * Show POI details panel.
     * @param {Object} poi
     */
    showPoiDetails(poi: any) {
        if (_extra && typeof _extra.showPoiDetails === "function") {
            _extra.showPoiDetails(poi);
        }
    },
    /**
     * Registers the instance UI.notify.
     * @param {{success: Function, error: Function}} notifyInstance
     */
    registerNotify(notifyInstance: any) {
        _notify = notifyInstance;
    },

    // ── POI CRUD ──

    /**
     * @param {Object} poi
     * @returns {L.Marker|null}
     */
    addPoi(poi: any) {
        return POICore.addPoi(poi);
    },

    /**
     * @param {Object} poiData
     */
    updatePoi(poiData: any) {
        if (_extra && typeof _extra.updatePoi === "function") {
            _extra.updatePoi(poiData);
        }
        // else: graceful no-op — updatePoi not yet registered
    },

    /**
     * @param {string} poiId
     */
    removePoi(poiId: any) {
        if (_extra && typeof _extra.removePoi === "function") {
            _extra.removePoi(poiId);
        }
    },

    /**
     * @returns {boolean}
     */
    canUpdate() {
        return !!(_extra && typeof _extra.updatePoi === "function");
    },

    /**
     * @returns {boolean}
     */
    canRemove() {
        return !!(_extra && typeof _extra.removePoi === "function");
    },

    // ── Notifications ──

    /**
     * @param {string} message
     */
    notifySuccess(message: any) {
        if (_notify && typeof _notify.success === "function") {
            _notify.success(message);
        }
    },

    /**
     * @param {string} message
     */
    notifyError(message: any) {
        if (_notify && typeof _notify.error === "function") {
            _notify.error(message);
        }
    },
};

export { POICoreContract };
