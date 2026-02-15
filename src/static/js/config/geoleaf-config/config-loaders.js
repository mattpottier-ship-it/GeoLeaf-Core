/*!
 * GeoLeaf Core – Config / Loaders
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf;
    const Log = GeoLeaf.Log;
    const Config = GeoLeaf.Config;

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
        const Loader = GeoLeaf._ConfigLoader;
        if (!Loader) {
            Log.error("[GeoLeaf.Config] Module Loader non disponible.");
            return Promise.reject(new Error("Loader module not available"));
        }

        return Loader.loadUrl(url, options)
            .then((jsonCfg) => {
                // Validation de la structure du JSON
                this._validateConfig(jsonCfg);

                // Fusion profonde avec la configuration existante
                const Storage = GeoLeaf._ConfigStorage;
                if (Storage && typeof Storage.deepMerge === "function") {
                    this._config = Storage.deepMerge(this._config, jsonCfg);
                } else {
                    // Fallback si Storage pas disponible
                    this._config = Object.assign({}, this._config, jsonCfg);
                }

                // Normalisation des POI (avis) éventuels dans la config
                const Normalization = GeoLeaf._ConfigNormalization;
                if (Array.isArray(this._config.poi) && Normalization) {
                    this._config.poi = Normalization.normalizePoiArray(this._config.poi);
                }

                this._isLoaded = true;
                this._source = "url";

                // Initialiser les sous-modules maintenant que _config est chargé
                this._initSubModules();

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
        const Taxonomy = GeoLeaf._ConfigTaxonomy;
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
        const Profile = GeoLeaf._ConfigProfile;
        if (!Profile) {
            Log.error("[GeoLeaf.Config] Module Profile non disponible.");
            return Promise.reject(new Error("Profile module not available"));
        }

        return Profile.loadActiveProfileResources(options);
    };

})(window);
