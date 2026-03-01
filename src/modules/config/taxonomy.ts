/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from "../log/index.js";
import { ProfileLoader } from "./loader.js";
import type { GeoLeafConfig } from "./geoleaf-config/config-types.js";
import type { CategoryItem } from "./geoleaf-config/config-types.js";

interface TaxonomyModuleType {
    _config: GeoLeafConfig | null;
    init(config: GeoLeafConfig): void;
    loadTaxonomy(
        url: string | null,
        options?: LoadUrlOptions
    ): Promise<Record<string, CategoryItem>>;
    getCategories(): Record<string, CategoryItem>;
    getCategory(categoryId: string): CategoryItem | undefined;
    getSubcategory(categoryId: string, subCategoryId: string): CategoryItem | undefined;
}

interface LoadUrlOptions {
    headers?: Record<string, string>;
    strictContentType?: boolean;
}

const TaxonomyModule: TaxonomyModuleType = {
    _config: null,

    init(config: GeoLeafConfig): void {
        this._config = config;
    },

    loadTaxonomy(
        url: string | null = null,
        options: LoadUrlOptions = {}
    ): Promise<Record<string, CategoryItem>> {
        const Loader = ProfileLoader;
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
                } else if (this._config) {
                    if (!this._config.categories || typeof this._config.categories !== "object") {
                        this._config.categories = {};
                    }
                    Object.assign(
                        this._config.categories,
                        (cfg as { categories: Record<string, CategoryItem> }).categories
                    );
                    Log.info("[GeoLeaf.Config.Taxonomy] Mapping catégories fusionné avec succès.");
                }
                return this.getCategories();
            })
            .catch((err) => {
                Log.error(
                    "[GeoLeaf.Config.Taxonomy] Erreur lors du chargement de la taxonomie :",
                    err
                );
                return {};
            });
    },

    getCategories(): Record<string, CategoryItem> {
        if (!this._config) return {};
        const cats = this._config.categories;
        return cats && typeof cats === "object" && !Array.isArray(cats) ? cats : {};
    },

    getCategory(categoryId: string): CategoryItem | undefined {
        if (!categoryId || typeof categoryId !== "string") return undefined;
        const cats = this.getCategories();
        if (!Object.prototype.hasOwnProperty.call(cats, categoryId)) return undefined;
        return cats[categoryId];
    },

    getSubcategory(categoryId: string, subCategoryId: string): CategoryItem | undefined {
        if (
            !categoryId ||
            typeof categoryId !== "string" ||
            !subCategoryId ||
            typeof subCategoryId !== "string"
        ) {
            return undefined;
        }
        const category = this.getCategory(categoryId);
        if (
            !category?.subcategories ||
            typeof category.subcategories !== "object" ||
            Array.isArray(category.subcategories)
        ) {
            return undefined;
        }
        const subs = category.subcategories;
        if (!Object.prototype.hasOwnProperty.call(subs, subCategoryId)) return undefined;
        return subs[subCategoryId];
    },
};

const TaxonomyManager = TaxonomyModule;
export { TaxonomyManager };
