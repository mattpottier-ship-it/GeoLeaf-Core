/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

(function (global) {
    "use strict";

    /**
     * Namespace global GeoLeaf
     */
    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    /**
     * Logger unifié
     */
    const Log = GeoLeaf.Log;

    /**
     * Module Config.Storage
     *
     * Responsabilités :
     * - Stockage et gestion de la configuration consolidée
     * - API get/set avec chemins "a.b.c"
     * - Fusion profonde (deep merge)
     * - Helpers de navigation dans l'arbre de config
     */
    const StorageModule = {
        /**
         * Configuration interne (référence partagée)
         * @type {Object}
         * @private
         */
        _config: null,

        /**
         * Initialise le module avec une référence à la config.
         *
         * @param {Object} config - Référence à l'objet de configuration global
         */
        init(config) {
            this._config = config;
        },

        /**
         * Retourne la configuration complète (objet).
         *
         * @returns {Object}
         */
        getAll() {
            return this._config || {};
        },

        /**
         * Récupère une valeur via un chemin de type "map.center" ou "basemaps.street.url".
         *
         * @param {string} path - Chemin avec des points.
         * @param {*} [defaultValue] - Valeur renvoyée si le chemin n'existe pas.
         * @returns {*}
         */
        get(path, defaultValue) {
            if (!this._config) {
                return typeof defaultValue === "undefined" ? undefined : defaultValue;
            }

            if (!path || typeof path !== "string") {
                return typeof defaultValue === "undefined" ? undefined : defaultValue;
            }

            const segments = path.split(".");
            let current = this._config;

            for (let i = 0; i < segments.length; i++) {
                const key = segments[i];
                if (current && Object.prototype.hasOwnProperty.call(current, key)) {
                    current = current[key];
                } else {
                    return typeof defaultValue === "undefined" ? undefined : defaultValue;
                }
            }

            return current;
        },

        /**
         * Définit une valeur via un chemin de type "map.center" ou "basemaps.street.url".
         * Crée les objets intermédiaires si nécessaire.
         *
         * @param {string} path
         * @param {*} value
         */
        set(path, value) {
            if (!this._config) {
                Log.warn("[GeoLeaf.Config.Storage] Configuration non initialisée.");
                return;
            }

            if (!path || typeof path !== "string") {
                Log.warn("[GeoLeaf.Config.Storage] set() requiert un chemin string.");
                return;
            }

            const segments = path.split(".");
            let current = this._config;

            for (let i = 0; i < segments.length; i++) {
                const key = segments[i];

                if (i === segments.length - 1) {
                    current[key] = value;
                } else {
                    if (
                        !Object.prototype.hasOwnProperty.call(current, key) ||
                        typeof current[key] !== "object" ||
                        current[key] === null
                    ) {
                        current[key] = {};
                    }
                    current = current[key];
                }
            }
        },

        /**
         * Retourne une section de configuration (ex : "basemaps", "map").
         *
         * @param {string} sectionName
         * @param {Object} [defaultValue]
         * @returns {Object|*}
         */
        getSection(sectionName, defaultValue) {
            if (!sectionName) {
                return typeof defaultValue === "undefined" ? undefined : defaultValue;
            }
            const value = this.get(sectionName);
            if (typeof value === "undefined") {
                return typeof defaultValue === "undefined" ? undefined : defaultValue;
            }
            return value;
        },

        /**
         * Fusion profonde (deep merge) simple pour objets JSON.
         *
         * @param {Object} target
         * @param {Object} source
         * @returns {Object}
         */
        deepMerge(target, source) {
            const output = Object.assign({}, target || {});
            if (!source || typeof source !== "object") {
                return output;
            }

            Object.keys(source).forEach((key) => {
                const srcVal = source[key];
                const tgtVal = output[key];

                if (
                    srcVal &&
                    typeof srcVal === "object" &&
                    !Array.isArray(srcVal) &&
                    tgtVal &&
                    typeof tgtVal === "object" &&
                    !Array.isArray(tgtVal)
                ) {
                    output[key] = this.deepMerge(tgtVal, srcVal);
                } else {
                    output[key] = srcVal;
                }
            });

            return output;
        },

        /**
         * Lecture d'une valeur via un chemin "a.b.c".
         *
         * @param {Object} source
         * @param {string} path
         * @returns {*}
         */
        getValueByPath(source, path) {
            if (!source || !path) return undefined;
            const parts = path.split(".");
            let current = source;

            for (let i = 0; i < parts.length; i += 1) {
                if (current == null) {
                    return undefined;
                }
                current = current[parts[i]];
            }

            return current;
        },

        /**
         * Écriture d'une valeur via un chemin "a.b.c".
         * Crée les sous-objets intermédiaires si nécessaire.
         *
         * @param {Object} target
         * @param {string} path
         * @param {*} value
         */
        setValueByPath(target, path, value) {
            if (!target || !path) return;
            const parts = path.split(".");
            let current = target;

            for (let i = 0; i < parts.length - 1; i += 1) {
                const key = parts[i];
                if (
                    !Object.prototype.hasOwnProperty.call(current, key) ||
                    current[key] == null
                ) {
                    current[key] = {};
                }
                current = current[key];
            }

            current[parts[parts.length - 1]] = value;
        }
    };

    // Exposer le module
    GeoLeaf._ConfigStorage = StorageModule;
})(window);
