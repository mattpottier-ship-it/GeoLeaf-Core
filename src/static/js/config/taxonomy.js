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
     * Module Config.Taxonomy
     *
     * Responsabilités :
     * - Chargement et gestion de la taxonomie (catégories/sous-catégories)
     * - Lecture des catégories depuis mapping.json (ancienne taxonomie)
     * - Lecture des catégories depuis profile.json (nouvelle taxonomie)
     * - API de consultation : getCategories(), getCategory(), getSubcategory()
     */
    const TaxonomyModule = {
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
         * Charge un fichier de taxonomie (mapping catégories / sous-catégories)
         * et le fusionne dans la configuration existante.
         *
         * @param {string} [url] - URL du fichier de mapping (depuis le profil)
         * @param {Object} [options]
         * @param {Object} [options.headers]
         * @param {boolean} [options.strictContentType=true]
         * @returns {Promise<Object>} - Objet categories consolidé
         */
        loadTaxonomy(url = null, options = {}) {
            const Loader = GeoLeaf._ConfigLoader;
            if (!Loader) {
                Log.error("[GeoLeaf.Config.Taxonomy] Module Loader non disponible.");
                return Promise.reject(new Error("Loader module not available"));
            }

            if (!url) {
                Log.info("[GeoLeaf.Config.Taxonomy] Aucune URL de mapping fournie — skip.");
                return Promise.resolve({});
            }

            return Loader.loadUrl(url, options)
                .then((cfg) => {
                    const hasCategories =
                        cfg &&
                        typeof cfg === "object" &&
                        cfg.categories &&
                        typeof cfg.categories === "object" &&
                        !Array.isArray(cfg.categories);

                    if (!hasCategories) {
                        Log.warn(
                            "[GeoLeaf.Config.Taxonomy] Fichier de mapping catégories chargé mais " +
                            "aucune propriété 'categories' valide trouvée (attendu: { \"categories\": { ... } })."
                        );
                    } else {
                        // Fusionner dans la config
                        if (!this._config.categories || typeof this._config.categories !== "object") {
                            this._config.categories = {};
                        }
                        Object.assign(this._config.categories, cfg.categories);

                        Log.info(
                            "[GeoLeaf.Config.Taxonomy] Mapping catégories fusionné avec succès."
                        );
                    }

                    return this.getCategories();
                })
                .catch((err) => {
                    Log.error("[GeoLeaf.Config.Taxonomy] Erreur lors du chargement de la taxonomie :", err);
                    return {};
                });
        },

        /**
         * Retourne l'objet complet des catégories (mapping interne).
         *
         * @returns {Object} - { [categoryId]: { label, icon, colorFill, colorStroke, subcategories? } }
         */
        getCategories() {
            if (!this._config) return {};
            const cats = this._config.categories;
            return (cats && typeof cats === "object" && !Array.isArray(cats)) ? cats : {};
        },

        /**
         * Retourne une catégorie à partir de son identifiant.
         *
         * @param {string} categoryId
         * @returns {Object|undefined}
         */
        getCategory(categoryId) {
            if (!categoryId || typeof categoryId !== "string") {
                return undefined;
            }

            const cats = this.getCategories();
            if (!Object.prototype.hasOwnProperty.call(cats, categoryId)) {
                return undefined;
            }

            return cats[categoryId];
        },

        /**
         * Retourne une sous-catégorie à partir de son identifiant et de celui
         * de la catégorie parente.
         *
         * @param {string} categoryId
         * @param {string} subCategoryId
         * @returns {Object|undefined}
         */
        getSubcategory(categoryId, subCategoryId) {
            if (
                !categoryId || typeof categoryId !== "string" ||
                !subCategoryId || typeof subCategoryId !== "string"
            ) {
                return undefined;
            }

            const category = this.getCategory(categoryId);
            if (
                !category ||
                !category.subcategories ||
                typeof category.subcategories !== "object" ||
                Array.isArray(category.subcategories)
            ) {
                return undefined;
            }

            const subs = category.subcategories;
            if (!Object.prototype.hasOwnProperty.call(subs, subCategoryId)) {
                return undefined;
            }

            return subs[subCategoryId];
        }
    };

    // Exposer le module
    GeoLeaf._ConfigTaxonomy = TaxonomyModule;
})(window);
