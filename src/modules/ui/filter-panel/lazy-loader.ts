/* eslint-disable security/detect-object-injection */
// @ts-nocheck — migration TS, typage progressif
/**
 * GeoLeaf UI Filter Panel - Lazy Loader
 * Loadsment to the demande des filtres categories et tags
 *
 * @module ui/filter-panel/lazy-loader
 */
"use strict";

import { Log } from "../../log/index.js";
import { buildCategoryTreeContent, buildTagsListContent } from "../filter-control-builder.js";
import { ThemeSelector } from "../../themes/theme-selector.js";
import { GeoJSONCore } from "../../geojson/core.js";

const FilterPanelLazyLoader = {
    _cache: {},
    _openAccordions: new Set(),

    /**
     * Loads thes categories pour the theme active
     * @param {string} themeId - ID of the theme
     * @returns {Array} - Array de categories with theurs sous-categories
     */
    loadCategories(themeId) {
        const cacheKey = `categories_${themeId}`;

        if (this._cache[cacheKey]) {
            Log.debug("[LazyLoader] Cache HIT for categories:", themeId);
            return this._cache[cacheKey];
        }

        Log.debug("[LazyLoader] Cache MISS for categories, scanning...");
        const result = this._scanCategories(themeId);
        this._cache[cacheKey] = result;
        return result;
    },

    /**
     * Loads thes tags pour the theme active
     * @param {string} themeId - ID of the theme
     * @returns {Array} - Array de tags uniques
     */
    loadTags(themeId) {
        const cacheKey = `tags_${themeId}`;

        if (this._cache[cacheKey]) {
            Log.debug("[LazyLoader] Cache HIT for tags:", themeId);
            return this._cache[cacheKey];
        }

        Log.debug("[LazyLoader] Cache MISS for tags, scanning...");
        const result = this._scanTags(themeId);
        this._cache[cacheKey] = result;
        return result;
    },

    /**
     * Scanne les features pour extraire les categories used
     * @private
     * @param {string} themeId - ID of the theme
     * @returns {Object} - {categories: Map, usedIds: Set}
     */
    _scanCategories(themeId) {
        const startTime = performance.now();

        // Retrieve the layers visibles of the theme
        const visibleLayerIds = this._getVisibleLayerIds(themeId);

        // Retrieve toutes les features
        let allFeatures = [];
        try {
            if (GeoJSONCore && typeof GeoJSONCore.getFeatures === "function") {
                allFeatures = GeoJSONCore.getFeatures() || [];
            }
        } catch (err) {
            Log.warn("[LazyLoader] Error fetching features:", err);
            return { categories: new Map(), usedIds: new Set() };
        }

        // Filtrer par layers visibles
        const visibleFeatures = allFeatures.filter((feature) => {
            const layerId =
                feature.properties?._layerId || feature.properties?.layerId || feature._layerId;
            return visibleLayerIds.includes(layerId);
        });

        Log.debug(
            `[LazyLoader] Category scan: ${visibleFeatures.length} features on ${visibleLayerIds.length} active layers`
        );

        // Extraire les categories uniques (normalisation lowercasee + variantes camelCasee)
        const usedCategoryIds = new Set();
        visibleFeatures.forEach((feature) => {
            const props = feature.properties || {};
            if (props.categoryId) {
                usedCategoryIds.add(props.categoryId);
            }
            if (props.subcategoryId) {
                usedCategoryIds.add(props.subcategoryId);
            }
            // Variante camelCasee (subCategoryId) presents dans certains GeoJSON
            if (props.subCategoryId) {
                usedCategoryIds.add(props.subCategoryId);
            }
        });

        const elapsed = (performance.now() - startTime).toFixed(2);
        Log.info(
            `[LazyLoader] Category scan completed in ${elapsed}ms: ${usedCategoryIds.size} categories found`
        );

        return {
            usedIds: usedCategoryIds,
            visibleLayerIds: visibleLayerIds,
        };
    },

    /**
     * Scanne les features pour extraire les tags used
     * @private
     * @param {string} themeId - ID of the theme
     * @returns {Array} - Array de tags sorted
     */
    _scanTags(themeId) {
        const startTime = performance.now();

        // Retrieve the layers visibles of the theme
        const visibleLayerIds = this._getVisibleLayerIds(themeId);

        // Retrieve toutes les features
        let allFeatures = [];
        try {
            if (GeoJSONCore && typeof GeoJSONCore.getFeatures === "function") {
                allFeatures = GeoJSONCore.getFeatures() || [];
            }
        } catch (err) {
            Log.warn("[LazyLoader] Error retrieving features:", err);
            return [];
        }

        // Filtrer par layers visibles
        const visibleFeatures = allFeatures.filter((feature) => {
            const layerId =
                feature.properties?._layerId || feature.properties?.layerId || feature._layerId;
            return visibleLayerIds.includes(layerId);
        });

        // Extraire les tags uniques
        const tagSet = new Set();
        visibleFeatures.forEach((feature) => {
            const props = feature.properties || {};
            const attrs = props.attributes || {};
            const tags = attrs.tags || props.tags;

            if (Array.isArray(tags)) {
                tags.forEach((tag) => {
                    if (tag && typeof tag === "string") {
                        tagSet.add(tag);
                    }
                });
            }
        });

        const tagsArray = Array.from(tagSet).sort();
        const elapsed = (performance.now() - startTime).toFixed(2);

        Log.info(`[LazyLoader] Tag scan completed in ${elapsed}ms:`, {
            totalFeatures: allFeatures.length,
            visibleFeatures: visibleFeatures.length,
            tagsFound: tagsArray.length,
        });

        return tagsArray;
    },

    /**
     * Retrieves thes IDs des layers actually visibles sur the map
     * @private
     * @param {string} _themeId - ID of the theme (not used, but kept for compatibility)
     * @returns {Array} - Array d'IDs de layers avec visible: true
     */
    _getVisibleLayerIds(_themeId) {
        let visibleLayerIds = [];

        try {
            if (GeoJSONCore && typeof GeoJSONCore.getAllLayers === "function") {
                const allLayers = GeoJSONCore.getAllLayers();
                // Filtrer only celles qui sont visibles (ON in theyer manager)
                visibleLayerIds = allLayers
                    .filter((layer) => layer.visible === true)
                    .map((layer) => layer.id);

                Log.debug(
                    `[LazyLoader] ${visibleLayerIds.length} visible layers found:`,
                    visibleLayerIds
                );
            }
        } catch (err) {
            Log.warn("[LazyLoader] Error retrieving visible layers:", err);
        }

        return visibleLayerIds;
    },

    /**
     * Marque un accordion comme open
     * @param {string} type - 'categories' ou 'tags'
     * @param {HTMLElement} element - Element of the accordion
     */
    markAccordionOpen(type, element) {
        this._openAccordions.add({ type, element });
        Log.debug(`[LazyLoader] Accordion "${type}" marked as open`);
    },

    /**
     * Marque un accordion comme closed
     * @param {HTMLElement} element - Element of the accordion
     */
    markAccordionClosed(element) {
        this._openAccordions.forEach((item) => {
            if (item.element === element) {
                this._openAccordions.delete(item);
                Log.debug(`[LazyLoader] Accordion "${item.type}" marked as closed`);
            }
        });
    },

    /**
     * Invalid le cache pour a theme specific
     * @param {string} themeId - ID of the theme
     */
    invalidateCacheForTheme(themeId) {
        delete this._cache[`categories_${themeId}`];
        delete this._cache[`tags_${themeId}`];
        Log.info(`[LazyLoader] Cache invalidated for theme: ${themeId}`);
    },

    /**
     * Invalid tout le cache (changement de theme)
     */
    clearCache() {
        this._cache = {};
        Log.info("[LazyLoader] Cache completely cleared");
    },

    /**
     * Refreshes les accordions opens
     * Used after a theme change or layer toggle
     */
    refreshOpenAccordions() {
        if (this._openAccordions.size === 0) {
            Log.debug("[LazyLoader] No open accordion to refresh");
            return;
        }

        Log.info(`[LazyLoader] Refreshing ${this._openAccordions.size} open accordion(s)`);
        const currentTheme = ThemeSelector.getCurrentTheme();

        if (!currentTheme) {
            Log.warn("[LazyLoader] Unable to retrieve active theme");
            return;
        }

        this._openAccordions.forEach(({ type, element }) => {
            // Sauvegarder the state des checkboxes / tags selected
            const savedStates = this._saveCheckboxStates(element);

            // Target the [data-lazy-type] area that receives innerHTML
            const contentArea = element.querySelector("[data-lazy-type]");

            if (!contentArea) {
                Log.warn("[LazyLoader] Zone [data-lazy-type] not found in accordion");
                return;
            }

            // Reset le flag lazyLoaded pour permettre un futur reloading
            element.dataset.lazyLoaded = "false";

            // Appeler la fonction de render appropriate
            if (type === "categories") {
                this._rerenderCategories(contentArea, currentTheme, savedStates);
            } else if (type === "tags") {
                this._rerenderTags(contentArea, currentTheme, savedStates);
            }

            // Re-marquer comme loaded after the re-render
            element.dataset.lazyLoaded = "true";
        });
    },

    /**
     * Re-render les categories dans un accordion
     * @private
     */
    _rerenderCategories(contentArea, themeId, savedStates) {
        const result = this.loadCategories(themeId);

        // Building du contenu via import ESM direct (P3-DEAD-02)
        const content = buildCategoryTreeContent(result);
        // User values are escaped at the source by buildCategoryTreeContent.
        // We use createContextualFragment (remove scripts only) to preserve
        // all safe attributes (class, data-*, type, value, name, checked) — the whitelist
        // de sanitizeHTML supprimait <input> et <label>, casesant les checkboxes.
        contentArea.textContent = "";
        const catFrag = document
            .createRange()
            .createContextualFragment(content.replace(/<script[\s\S]*?<\/script>/gi, ""));
        contentArea.appendChild(catFrag);

        // NE PAS re-attach attachCategoryTreeListners ici :
        // the listener on contentArea (added by _loadAccordionContentIfNeeded)
        // survives child replacement. Re-attaching would cause duplicates
        // that would cancel checkbox toggles (toggle pair = zero net).

        // Restaurer les states des checkboxes
        this._restoreCheckboxStates(contentArea, savedStates);
    },

    /**
     * Re-render les tags dans un accordion
     * @private
     */
    _rerenderTags(contentArea, themeId, savedStates) {
        const tags = this.loadTags(themeId);

        // Building du contenu via import ESM direct (P3-DEAD-02)
        const content = buildTagsListContent(tags);
        // User values are escaped at the source by buildTagsListContent.
        // We use createContextualFragment (remove scripts only) to preserve
        // class et data-tag-value sur les <span> badges — la whitelist supprimait ces attributes,
        // rendant les tags non selectionnables.
        contentArea.textContent = "";
        const tagFrag = document
            .createRange()
            .createContextualFragment(content.replace(/<script[\s\S]*?<\/script>/gi, ""));
        contentArea.appendChild(tagFrag);

        // NE PAS re-attach attachTagsListners ici :
        // the listener on contentArea (added by _loadAccordionContentIfNeeded)
        // survives child replacement. Re-attaching would cause duplicates
        // that would cancel toggles (toggle pair = zero net, badge
        // semblant inactive same after click).

        // Restaurer les states des checkboxes
        this._restoreCheckboxStates(contentArea, savedStates);
    },

    /**
     * Sauvegarde the state des checkboxes avant re-render
     * @private
     */
    _saveCheckboxStates(element) {
        const states = {};
        const checkboxes = element.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach((cb) => {
            const categoryId = cb.dataset.glFilterCategoryId;
            const subcategoryId = cb.dataset.glFilterSubcategoryId;
            const value = cb.value;

            let key;
            if (subcategoryId) {
                key = `${categoryId}:${subcategoryId}`;
            } else if (categoryId) {
                key = categoryId;
            } else if (value) {
                key = value;
            }

            if (key) {
                states[key] = cb.checked;
            }
        });

        return states;
    },

    /**
     * Restaure the state des checkboxes after re-render
     * @private
     */
    _restoreCheckboxStates(element, savedStates) {
        if (!savedStates || Object.keys(savedStates).length === 0) return;

        const checkboxes = element.querySelectorAll('input[type="checkbox"]');
        let restoredCount = 0;

        checkboxes.forEach((cb) => {
            const categoryId = cb.dataset.glFilterCategoryId;
            const subcategoryId = cb.dataset.glFilterSubcategoryId;
            const value = cb.value;

            let key;
            if (subcategoryId) {
                key = `${categoryId}:${subcategoryId}`;
            } else if (categoryId) {
                key = categoryId;
            } else if (value) {
                key = value;
            }

            if (key && savedStates[key] !== undefined) {
                cb.checked = savedStates[key];
                restoredCount++;
            }
        });

        Log.debug(`[LazyLoader] ${restoredCount} checkbox states restored`);
    },
};

// Listnsr the events de changement de theme
document.addEventListener("geoleaf:theme:applied", () => {
    Log.info("[LazyLoader] theme:applied event detected — full invalidation");

    // 1. Emptyr le cache de data (scan categories/tags)
    FilterPanelLazyLoader.clearCache();

    // 2. Reset TOUS les flags data-lazy-loaded sur les accordions
    //    (closeds ou opens) pour forcer un reloading au prochain expand
    const allAccordions = document.querySelectorAll(
        ".gl-filter-panel__group--accordion[data-lazy-loaded]"
    );
    allAccordions.forEach((acc) => {
        acc.dataset.lazyLoaded = "false";
    });
    Log.debug(`[LazyLoader] ${allAccordions.length} data-lazy-loaded flag(s) reset`);

    // 3. Refresh currently open accordions (immediate re-render)
    FilterPanelLazyLoader.refreshOpenAccordions();
});

// Listnsr l'event de changement de visibility de layer
document.addEventListener("geoleaf:geojson:visibility-changed", (e) => {
    const detail = e.detail || {};
    Log.info("[LazyLoader] Layer visibility changed:", detail.layerId, detail.visible);

    // Invalidr le cache of the theme active
    const currentTheme = ThemeSelector.getCurrentTheme();
    if (currentTheme) {
        FilterPanelLazyLoader.invalidateCacheForTheme(currentTheme);
        // Refresh open accordions
        FilterPanelLazyLoader.refreshOpenAccordions();
    }
});

export { FilterPanelLazyLoader };
