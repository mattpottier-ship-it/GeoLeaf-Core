/**
 * GeoLeaf Contract — POI Core operations
 *
 * Interface ESM pour que les modules POI (add-form, sync…) puissent appeler
 * les opérations CRUD du module POI (addPoi, updatePoi, removePoi, notify)
 * sans couplage runtime vers le namespace global.
 *
 * Phase 10-E — Pattern G.
 *
 * REGISTRATION (dans globals.poi.js ou geoleaf.core.js) :
 *   import { POICoreContract } from '../../contracts/poi-core.contract.js';
 *   POICoreContract.register({ addPoi, updatePoi, removePoi }, notifyInstance);
 */
"use strict";

import { POICore } from '../modules/poi/core.js';

/** @type {{updatePoi?: Function, removePoi?: Function}|null} */
let _extra = null;
/** @type {{success: Function, error: Function}|null} */
let _notify = null;

/**
 * @namespace POICoreContract
 */
const POICoreContract = {
    /**
     * Enregistre les fonctions POI non-exportées et le système de notification.
     * Appelé par globals.poi.js ou le plugin addpoi au chargement.
     * @param {{updatePoi?: Function, removePoi?: Function}} extras
     * @param {{success: Function, error: Function}} [notifyInstance]
     */
    register(extras, notifyInstance) {
        _extra = extras || {};
        if (notifyInstance) _notify = notifyInstance;
    },

    /**
     * @returns {boolean}
     */
    canShowDetails() {
        return !!(_extra && typeof _extra.showPoiDetails === 'function');
    },

    /**
     * Show POI details panel.
     * @param {Object} poi
     */
    showPoiDetails(poi) {
        if (_extra && typeof _extra.showPoiDetails === 'function') {
            _extra.showPoiDetails(poi);
        }
    },
    /**
     * Enregistre l'instance UI.notify.
     * @param {{success: Function, error: Function}} notifyInstance
     */
    registerNotify(notifyInstance) {
        _notify = notifyInstance;
    },

    // ── POI CRUD ──

    /**
     * @param {Object} poi
     * @returns {L.Marker|null}
     */
    addPoi(poi) {
        return POICore.addPoi(poi);
    },

    /**
     * @param {Object} poiData
     */
    updatePoi(poiData) {
        if (_extra && typeof _extra.updatePoi === 'function') {
            _extra.updatePoi(poiData);
        }
        // else: graceful no-op — updatePoi not yet registered
    },

    /**
     * @param {string} poiId
     */
    removePoi(poiId) {
        if (_extra && typeof _extra.removePoi === 'function') {
            _extra.removePoi(poiId);
        }
    },

    /**
     * @returns {boolean}
     */
    canUpdate() {
        return !!(_extra && typeof _extra.updatePoi === 'function');
    },

    /**
     * @returns {boolean}
     */
    canRemove() {
        return !!(_extra && typeof _extra.removePoi === 'function');
    },

    // ── Notifications ──

    /**
     * @param {string} message
     */
    notifySuccess(message) {
        if (_notify && typeof _notify.success === 'function') {
            _notify.success(message);
        }
    },

    /**
     * @param {string} message
     */
    notifyError(message) {
        if (_notify && typeof _notify.error === 'function') {
            _notify.error(message);
        }
    },
};

export { POICoreContract };
