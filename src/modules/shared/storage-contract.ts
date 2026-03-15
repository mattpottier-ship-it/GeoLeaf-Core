/**
 * @module shared/storage-contract
 * @description Interface optionalle pour access au module Storage from
 * the modules non-Storage (POI, LayerManager…) sans importer directly
 * le plugin Storage (qui est optional).
 *
 * Phase 10-C — Pattern E : remplace le couplage runtime par
 * le contrat d'interface ESM pur `StorageContract.*`.
 *
 * CYCLE ROMPU :
 *   POI → StorageContract (no-dep ESM singleton)
 *   StorageContract.init() ← called par geoleaf.storage.js au loading du plugin
 *
 * USAGE dans the modules consommateurs :
 *   import { StorageContract } from '../shared/storage-contract.js';
 *
 *   if (StorageContract.isAvailable()) {
 *       const items = await StorageContract.DB.getAllFromSyncQueue();
 *   }
 *
 *   // Image upload (POI) :
 *   if (StorageContract.isAvailable() && StorageContract.DB?.storeImageLocally) {
 *       await StorageContract.DB.storeImageLocally(imageData);
 *   }
 *
 * INITIALISATION :
 *   // Dans geoleaf.storage.js (ou le plugin Storage), after assemblage :
 *   StorageContract.init(Storage);
 */
"use strict";

/** @type {Object|null} Reference to the Storage facade (geoleaf.storage.js) */
let _storageRef: any = null;

/**
 * Contrat d'interface optional pour the module Storage.
 *
 * Exposes read-only les sous-modules DB et CacheManager via des getters paresseux.
 * `init(storage)` est la seule method d'write — called une seule fois
 * au boot du plugin Storage.
 *
 * @namespace StorageContract
 */
const StorageContract = {
    /**
     * Initializes le contrat with the facade Storage.
     * Called by `geoleaf.storage.js` when the Storage plugin is loaded.
     *
     * @param {Object} storageModule - La facade Storage (export de geoleaf.storage.js)
     */
    init(storageModule: any) {
        _storageRef = storageModule;
    },

    /**
     * Returns true si le plugin Storage est loaded ET que IndexedDB est open.
     * @returns {boolean}
     */
    isAvailable() {
        if (!_storageRef) return false;
        return typeof _storageRef.isAvailable === "function"
            ? _storageRef.isAvailable()
            : !!_storageRef.DB;
    },

    /**
     * Access to module IndexedDB (Storage.DB).
     * @returns {Object|null}
     */
    get DB() {
        return _storageRef?.DB ?? null;
    },

    /**
     * Access to module CacheManager (Storage.CacheManager).
     * @returns {Object|null}
     */
    get CacheManager() {
        return _storageRef?.CacheManager ?? null;
    },

    /**
     * Access to the Cache namespace (Storage.Cache).
     * Contient CacheStorage, LayerSelector, etc.
     * @returns {Object|null}
     */
    get Cache() {
        return _storageRef?.Cache ?? null;
    },

    /**
     * Checks if un plugin Storage est registered (same non initialized/DB closede).
     * Different from isAvailable() which also checks that DB is open.
     * @returns {boolean}
     */
    isPluginLoaded() {
        return _storageRef !== null;
    },

    /**
     * Downloads a profile for offline availability.
     * @param {string} profileId - Identifier of the profile
     * @returns {Promise<Object>}
     */
    downloadProfileForOffline(profileId: any) {
        if (!_storageRef) {
            return Promise.reject(new Error("[StorageContract] Storage plugin not loaded"));
        }
        return _storageRef.downloadProfileForOffline(profileId);
    },
};

export { StorageContract };
