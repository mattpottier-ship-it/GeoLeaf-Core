/*!
 * GeoLeaf Core – Config / Loaders
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

"use strict";

import { Log } from '../../log/index.js';
import { Config } from './config-core.js';
import { ProfileLoader as ConfigLoader } from '../loader.js';
import { TaxonomyManager } from '../taxonomy.js';
import { ProfileManager } from '../profile.js';


/**
 * Charge une configuration depuis une URL JSON et la fusionne.
 *
 * @param {string} url - URL du fichier JSON
 * @param {Object} [options] - Options de chargement
 * @param {Object} [options.headers] - Headers HTTP personnalisés (ex: CSRF token)
 * @param {boolean} [options.strictContentType=true] - Validation stricte du Content-Type
 * @returns {Promise<Object>}
 * @example
 * Config.loadUrl('/api/config.json', {
 *     headers: { 'X-CSRF-Token': '...' },
 *     strictContentType: true
 * })
 */
Config.loadUrl = function (url, options = {}) {
    const Loader = ConfigLoader;
    if (!Loader) {
        Log.error("[GeoLeaf.Config] Module Loader non disponible.");
        return Promise.reject(new Error("Loader module not available"));
    }

    return Loader.loadUrl(url, options)
        .then((jsonCfg) => {
            // perf 5.5+5.6 : utiliser _applyConfig() pour éviter la duplication de
            // _validateConfig() et _initSubModules() (appels doubles supprimés)
            this._applyConfig(jsonCfg, "url");

            this._maybeFireLoadedEvent();

            return this._config;
        })
        .catch((err) => {
            Log.error("[GeoLeaf.Config] Erreur lors du chargement JSON :", err);
            return this._config;
        });
};

/**
 * Charge un fichier de taxonomie (mapping catégories / sous-catégories)
 * et le fusionne dans la configuration existante.
 *
 * @param {string} [url] - URL du fichier de mapping (depuis le profil)
 * @param {Object} [options]
 * @param {Object} [options.headers]
 * @param {boolean} [options.strictContentType=true]
 * @returns {Promise<Object>} - Objet categories consolidé
 */
Config.loadTaxonomy = function (url = null, options = {}) {
    const Taxonomy = TaxonomyManager;
    if (!Taxonomy) {
        Log.error("[GeoLeaf.Config] Module Taxonomy non disponible.");
        return Promise.reject(new Error("Taxonomy module not available"));
    }

    return Taxonomy.loadTaxonomy(url, options);
};

/**
 * Charge les ressources liées au profil actif :
 * - profile.json
 * - poi.json
 * - mapping.json
 * - routes.json
 *
 * @param {Object} [options]
 * @param {Object} [options.headers] - Headers HTTP optionnels.
 * @param {boolean} [options.strictContentType=true] - Validation stricte du Content-Type.
 * @returns {Promise<Object>} Configuration consolidée incluant les données du profil.
 */
Config.loadActiveProfileResources = function (options = {}) {
    const Profile = ProfileManager;
    if (!Profile) {
        Log.error("[GeoLeaf.Config] Module Profile non disponible.");
        return Promise.reject(new Error("Profile module not available"));
    }

    return Profile.loadActiveProfileResources(options);
};

const ConfigLoaders = {
    loadUrl: Config.loadUrl,
    loadTaxonomy: Config.loadTaxonomy,
    loadActiveProfileResources: Config.loadActiveProfileResources
};

export { ConfigLoaders };
