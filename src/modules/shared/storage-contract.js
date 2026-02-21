/**
 * @module shared/storage-contract
 * @description Interface optionnelle pour accéder au module Storage depuis
 * les modules non-Storage (POI, LayerManager…) sans importer directement
 * le plugin Storage (qui est optionnel).
 *
 * Phase 10-C — Pattern E : remplace le couplage runtime par
 * le contrat d'interface ESM pur `StorageContract.*`.
 *
 * CYCLE ROMPU :
 *   POI → StorageContract (no-dep ESM singleton)
 *   StorageContract.init() ← appelé par geoleaf.storage.js au chargement du plugin
 *
 * USAGE dans les modules consommateurs :
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
 *   // Dans geoleaf.storage.js (ou le plugin Storage), après assemblage :
 *   StorageContract.init(Storage);
 */
"use strict";

/** @type {Object|null} Référence à la facade Storage (geoleaf.storage.js) */
let _storageRef = null;

/**
 * Contrat d'interface optionnel pour le module Storage.
 *
 * Expose read-only les sous-modules DB et CacheManager via des getters paresseux.
 * `init(storage)` est la seule méthode d'écriture — appelée une seule fois
 * au boot du plugin Storage.
 *
 * @namespace StorageContract
 */
const StorageContract = {
    /**
     * Initialise le contrat avec la facade Storage.
     * Appelé par `geoleaf.storage.js` lorsque le plugin Storage est chargé.
     *
     * @param {Object} storageModule - La facade Storage (export de geoleaf.storage.js)
     */
    init(storageModule) {
        _storageRef = storageModule;
    },

    /**
     * Retourne true si le plugin Storage est chargé ET que IndexedDB est ouvert.
     * @returns {boolean}
     */
    isAvailable() {
        if (!_storageRef) return false;
        return typeof _storageRef.isAvailable === "function"
            ? _storageRef.isAvailable()
            : !!_storageRef.DB;
    },

    /**
     * Accès au module IndexedDB (Storage.DB).
     * @returns {Object|null}
     */
    get DB() {
        return _storageRef?.DB ?? null;
    },

    /**
     * Accès au module CacheManager (Storage.CacheManager).
     * @returns {Object|null}
     */
    get CacheManager() {
        return _storageRef?.CacheManager ?? null;
    },

    /**
     * Accès au namespace Cache (Storage.Cache).
     * Contient CacheStorage, LayerSelector, etc.
     * @returns {Object|null}
     */
    get Cache() {
        return _storageRef?.Cache ?? null;
    },

    /**
     * Vérifie si un plugin Storage est enregistré (même non initialisé/DB fermée).
     * Différent de isAvailable() qui vérifie aussi que DB est ouverte.
     * @returns {boolean}
     */
    isPluginLoaded() {
        return _storageRef !== null;
    },

    /**
     * Télécharge un profil pour disponibilité offline.
     * @param {string} profileId - Identifiant du profil
     * @returns {Promise<Object>}
     */
    downloadProfileForOffline(profileId) {
        if (!_storageRef) {
            return Promise.reject(new Error("[StorageContract] Storage plugin not loaded"));
        }
        return _storageRef.downloadProfileForOffline(profileId);
    },
};

export { StorageContract };
