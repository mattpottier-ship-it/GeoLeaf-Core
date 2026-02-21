/*!
 * GeoLeaf Core – Config / Accessors
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

"use strict";

import { Log } from '../../log/index.js';
import { Config } from './config-core.js';
import { StorageHelper } from '../storage.js';
import { TaxonomyManager } from '../taxonomy.js';
import { ProfileManager } from '../profile.js';


/* ------------------------------------------------------------------ */
/*  Storage accessors                                                  */
/* ------------------------------------------------------------------ */

/**
 * Retourne la configuration complète (objet).
 *
 * @returns {Object}
 */
Config.getAll = function () {
    // S'assurer que les sous-modules sont initialisés
    if (!this._isLoaded) {
        this._initSubModules();
    }

    const Storage = StorageHelper;
    return Storage && typeof Storage.getAll === "function"
        ? Storage.getAll()
        : this._config;
};

/**
 * Récupère une valeur via un chemin de type "map.center" ou "basemaps.street.url".
 *
 * @param {string} path - Chemin avec des points.
 * @param {*} [defaultValue] - Valeur renvoyée si le chemin n'existe pas.
 * @returns {*}
 */
Config.get = function (path, defaultValue) {
    // S'assurer que les sous-modules sont initialisés
    if (!this._isLoaded) {
        this._initSubModules();
    }

    const Storage = StorageHelper;
    return Storage && typeof Storage.get === "function"
        ? Storage.get(path, defaultValue)
        : defaultValue;
};

/**
 * Définit une valeur via un chemin de type "map.center" ou "basemaps.street.url".
 * Crée les objets intermédiaires si nécessaire.
 *
 * @param {string} path
 * @param {*} value
 */
Config.set = function (path, value) {
    const Storage = StorageHelper;
    if (Storage && typeof Storage.set === "function") {
        Storage.set(path, value);
    } else {
        Log.warn("[GeoLeaf.Config] Module Storage non disponible pour set().");
    }
};

/**
 * Retourne une section de configuration (ex : "basemaps", "map").
 *
 * @param {string} sectionName
 * @param {Object} [defaultValue]
 * @returns {Object|*}
 */
Config.getSection = function (sectionName, defaultValue) {
    const Storage = StorageHelper;
    return Storage && typeof Storage.getSection === "function"
        ? Storage.getSection(sectionName, defaultValue)
        : defaultValue;
};

/* ------------------------------------------------------------------ */
/*  Taxonomy accessors                                                 */
/* ------------------------------------------------------------------ */

/**
 * Retourne l'objet complet des catégories (mapping interne).
 *
 * @returns {Object} - { [categoryId]: { label, icon, colorFill, colorStroke, subcategories? } }
 */
Config.getCategories = function () {
    // S'assurer que les sous-modules sont initialisés
    if (!this._isLoaded) {
        this._initSubModules();
    }

    const Taxonomy = TaxonomyManager;
    return Taxonomy && typeof Taxonomy.getCategories === "function"
        ? Taxonomy.getCategories()
        : {};
};

/**
 * Retourne une catégorie à partir de son identifiant.
 *
 * @param {string} categoryId
 * @returns {Object|undefined}
 */
Config.getCategory = function (categoryId) {
    const Taxonomy = TaxonomyManager;
    return Taxonomy && typeof Taxonomy.getCategory === "function"
        ? Taxonomy.getCategory(categoryId)
        : undefined;
};

/**
 * Retourne une sous-catégorie à partir de son identifiant et de celui
 * de la catégorie parente.
 *
 * @param {string} categoryId
 * @param {string} subCategoryId
 * @returns {Object|undefined}
 */
Config.getSubcategory = function (categoryId, subCategoryId) {
    const Taxonomy = TaxonomyManager;
    return Taxonomy && typeof Taxonomy.getSubcategory === "function"
        ? Taxonomy.getSubcategory(categoryId, subCategoryId)
        : undefined;
};

/* ------------------------------------------------------------------ */
/*  Profile accessors                                                  */
/* ------------------------------------------------------------------ */

/**
 * Retourne l'identifiant du profil actuellement chargé (ou null).
 *
 * @returns {string|null}
 */
Config.getActiveProfileId = function () {
    const Profile = ProfileManager;
    return Profile && typeof Profile.getActiveProfileId === "function"
        ? Profile.getActiveProfileId()
        : null;
};

/**
 * Retourne l'objet profile.json du profil actif (ou null).
 *
 * @returns {Object|null}
 */
Config.getActiveProfile = function () {
    const Profile = ProfileManager;
    return Profile && typeof Profile.getActiveProfile === "function"
        ? Profile.getActiveProfile()
        : null;
};

/**
 * Retourne le tableau de POI normalisés du profil actif.
 *
 * @returns {Array}
 */
Config.getActiveProfilePoi = function () {
    const Profile = ProfileManager;
    return Profile && typeof Profile.getActiveProfilePoi === "function"
        ? Profile.getActiveProfilePoi()
        : [];
};

/**
 * Retourne le tableau de routes du profil actif.
 *
 * @returns {Array}
 */
Config.getActiveProfileRoutes = function () {
    const Profile = ProfileManager;
    return Profile && typeof Profile.getActiveProfileRoutes === "function"
        ? Profile.getActiveProfileRoutes()
        : [];
};

/**
 * Retourne l'objet de mapping du profil actif (mapping.json).
 *
 * @returns {Object|null}
 */
Config.getActiveProfileMapping = function () {
    const Profile = ProfileManager;
    return Profile && typeof Profile.getActiveProfileMapping === "function"
        ? Profile.getActiveProfileMapping()
        : null;
};

/**
 * Retourne la configuration des icônes depuis la taxonomie du profil actif.
 *
 * @returns {Object|null}
 */
Config.getIconsConfig = function () {
    const Profile = ProfileManager;
    return Profile && typeof Profile.getIconsConfig === "function"
        ? Profile.getIconsConfig()
        : null;
};

/**
 * Indique si l'usage de mapping.json pour normaliser les POI de profil est activé.
 *
 * @returns {boolean} true si le mapping doit être utilisé, false sinon.
 */
Config.isProfilePoiMappingEnabled = function () {
    const Profile = ProfileManager;
    return Profile && typeof Profile.isProfilePoiMappingEnabled === "function"
        ? Profile.isProfilePoiMappingEnabled()
        : true;
};

const ConfigAccessors = {
    getAll: Config.getAll,
    get: Config.get,
    set: Config.set,
    getSection: Config.getSection,
    getCategories: Config.getCategories,
    getCategory: Config.getCategory,
    getSubcategory: Config.getSubcategory,
    getActiveProfileId: Config.getActiveProfileId,
    getActiveProfile: Config.getActiveProfile,
    getActiveProfilePoi: Config.getActiveProfilePoi,
    getActiveProfileRoutes: Config.getActiveProfileRoutes,
    getActiveProfileMapping: Config.getActiveProfileMapping,
    getIconsConfig: Config.getIconsConfig,
    isProfilePoiMappingEnabled: Config.isProfilePoiMappingEnabled
};

export { ConfigAccessors };
