// @ts-nocheck � migration TS, typage progressif
/**
 * GeoLeaf UI Filter Panel - Lazy Loader
 * Chargement à la demande des filtres catégories et tags
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
     * Charge les catégories pour le thème actif
     * @param {string} themeId - ID du thème
     * @returns {Array} - Array de catégories avec leurs sous-catégories
     */
    loadCategories(themeId) {
        const cacheKey = `categories_${themeId}`;

        if (this._cache[cacheKey]) {
            Log.debug("[LazyLoader] Cache HIT pour catégories:", themeId);
            return this._cache[cacheKey];
        }

        Log.debug("[LazyLoader] Cache MISS pour catégories, scan en cours...");
        const result = this._scanCategories(themeId);
        this._cache[cacheKey] = result;
        return result;
    },

    /**
     * Charge les tags pour le thème actif
     * @param {string} themeId - ID du thème
     * @returns {Array} - Array de tags uniques
     */
    loadTags(themeId) {
        const cacheKey = `tags_${themeId}`;

        if (this._cache[cacheKey]) {
            Log.debug("[LazyLoader] Cache HIT pour tags:", themeId);
            return this._cache[cacheKey];
        }

        Log.debug("[LazyLoader] Cache MISS pour tags, scan en cours...");
        const result = this._scanTags(themeId);
        this._cache[cacheKey] = result;
        return result;
    },

    /**
     * Scanne les features pour extraire les catégories utilisées
     * @private
     * @param {string} themeId - ID du thème
     * @returns {Object} - {categories: Map, usedIds: Set}
     */
    _scanCategories(themeId) {
        const startTime = performance.now();

        // Récupérer les couches visibles du thème
        const visibleLayerIds = this._getVisibleLayerIds(themeId);

        // Récupérer toutes les features
        let allFeatures = [];
        try {
            if (GeoJSONCore && typeof GeoJSONCore.getFeatures === "function") {
                allFeatures = GeoJSONCore.getFeatures() || [];
            }
        } catch (err) {
            Log.warn("[LazyLoader] Erreur récupération features:", err);
            return { categories: new Map(), usedIds: new Set() };
        }

        // Filtrer par couches visibles
        const visibleFeatures = allFeatures.filter((feature) => {
            const layerId =
                feature.properties?._layerId || feature.properties?.layerId || feature._layerId;
            return visibleLayerIds.includes(layerId);
        });

        Log.debug(
            `[LazyLoader] Scan catégories: ${visibleFeatures.length} features sur ${visibleLayerIds.length} couches actives`
        );

        // Extraire les catégories uniques (normalisation lowercase + variantes camelCase)
        const usedCategoryIds = new Set();
        visibleFeatures.forEach((feature) => {
            const props = feature.properties || {};
            if (props.categoryId) {
                usedCategoryIds.add(props.categoryId);
            }
            if (props.subcategoryId) {
                usedCategoryIds.add(props.subcategoryId);
            }
            // Variante camelCase (subCategoryId) présente dans certains GeoJSON
            if (props.subCategoryId) {
                usedCategoryIds.add(props.subCategoryId);
            }
        });

        const elapsed = (performance.now() - startTime).toFixed(2);
        Log.info(
            `[LazyLoader] Scan catégories terminé en ${elapsed}ms: ${usedCategoryIds.size} catégories trouvées`
        );

        return {
            usedIds: usedCategoryIds,
            visibleLayerIds: visibleLayerIds,
        };
    },

    /**
     * Scanne les features pour extraire les tags utilisés
     * @private
     * @param {string} themeId - ID du thème
     * @returns {Array} - Array de tags triés
     */
    _scanTags(themeId) {
        const startTime = performance.now();

        // Récupérer les couches visibles du thème
        const visibleLayerIds = this._getVisibleLayerIds(themeId);

        // Récupérer toutes les features
        let allFeatures = [];
        try {
            if (GeoJSONCore && typeof GeoJSONCore.getFeatures === "function") {
                allFeatures = GeoJSONCore.getFeatures() || [];
            }
        } catch (err) {
            Log.warn("[LazyLoader] Erreur récupération features:", err);
            return [];
        }

        // Filtrer par couches visibles
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

        Log.info(`[LazyLoader] Scan tags terminé en ${elapsed}ms:`, {
            totalFeatures: allFeatures.length,
            visibleFeatures: visibleFeatures.length,
            tagsFound: tagsArray.length,
        });

        return tagsArray;
    },

    /**
     * Récupère les IDs des couches réellement visibles sur la carte
     * @private
     * @param {string} _themeId - ID du thème (non utilisé, mais conservé pour compatibilité)
     * @returns {Array} - Array d'IDs de couches avec visible: true
     */
    _getVisibleLayerIds(_themeId) {
        let visibleLayerIds = [];

        try {
            if (GeoJSONCore && typeof GeoJSONCore.getAllLayers === "function") {
                const allLayers = GeoJSONCore.getAllLayers();
                // Filtrer uniquement celles qui sont visibles (ON dans layer manager)
                visibleLayerIds = allLayers
                    .filter((layer) => layer.visible === true)
                    .map((layer) => layer.id);

                Log.debug(
                    `[LazyLoader] ${visibleLayerIds.length} couches visibles trouvées:`,
                    visibleLayerIds
                );
            }
        } catch (err) {
            Log.warn("[LazyLoader] Erreur récupération couches visibles:", err);
        }

        return visibleLayerIds;
    },

    /**
     * Marque un accordéon comme ouvert
     * @param {string} type - 'categories' ou 'tags'
     * @param {HTMLElement} element - Element de l'accordéon
     */
    markAccordionOpen(type, element) {
        this._openAccordions.add({ type, element });
        Log.debug(`[LazyLoader] Accordéon "${type}" marqué comme ouvert`);
    },

    /**
     * Marque un accordéon comme fermé
     * @param {HTMLElement} element - Element de l'accordéon
     */
    markAccordionClosed(element) {
        this._openAccordions.forEach((item) => {
            if (item.element === element) {
                this._openAccordions.delete(item);
                Log.debug(`[LazyLoader] Accordéon "${item.type}" marqué comme fermé`);
            }
        });
    },

    /**
     * Invalide le cache pour un thème spécifique
     * @param {string} themeId - ID du thème
     */
    invalidateCacheForTheme(themeId) {
        delete this._cache[`categories_${themeId}`];
        delete this._cache[`tags_${themeId}`];
        Log.info(`[LazyLoader] Cache invalidé pour thème: ${themeId}`);
    },

    /**
     * Invalide tout le cache (changement de thème)
     */
    clearCache() {
        this._cache = {};
        Log.info("[LazyLoader] Cache complètement vidé");
    },

    /**
     * Rafraîchit les accordéons ouverts
     * Utilisé après un changement de thème ou toggle de couche
     */
    refreshOpenAccordions() {
        if (this._openAccordions.size === 0) {
            Log.debug("[LazyLoader] Aucun accordéon ouvert à rafraîchir");
            return;
        }

        Log.info(
            `[LazyLoader] Rafraîchissement de ${this._openAccordions.size} accordéon(s) ouvert(s)`
        );
        const currentTheme = ThemeSelector.getCurrentTheme();

        if (!currentTheme) {
            Log.warn("[LazyLoader] Impossible de récupérer le thème actif");
            return;
        }

        this._openAccordions.forEach(({ type, element }) => {
            // Sauvegarder l'état des checkboxes / tags sélectionnés
            const savedStates = this._saveCheckboxStates(element);

            // Cibler la zone [data-lazy-type] qui reçoit le innerHTML
            const contentArea = element.querySelector("[data-lazy-type]");

            if (!contentArea) {
                Log.warn("[LazyLoader] Zone [data-lazy-type] introuvable dans l'accordéon");
                return;
            }

            // Réinitialiser le flag lazyLoaded pour permettre un futur rechargement
            element.dataset.lazyLoaded = "false";

            // Appeler la fonction de render appropriée
            if (type === "categories") {
                this._rerenderCategories(contentArea, currentTheme, savedStates);
            } else if (type === "tags") {
                this._rerenderTags(contentArea, currentTheme, savedStates);
            }

            // Re-marquer comme chargé après le re-render
            element.dataset.lazyLoaded = "true";
        });
    },

    /**
     * Re-render les catégories dans un accordéon
     * @private
     */
    _rerenderCategories(contentArea, themeId, savedStates) {
        const result = this.loadCategories(themeId);

        // Construction du contenu via import ESM direct (P3-DEAD-02)
        const content = buildCategoryTreeContent(result);
        // Les valeurs utilisateur sont échappées à la source par buildCategoryTreeContent.
        // On utilise createContextualFragment (suppression scripts uniquement) pour préserver
        // tous les attributs sûrs (class, data-*, type, value, name, checked) — la whitelist
        // de sanitizeHTML supprimait <input> et <label>, cassant les checkboxes.
        contentArea.textContent = "";
        const catFrag = document
            .createRange()
            .createContextualFragment(content.replace(/<script[\s\S]*?<\/script>/gi, ""));
        contentArea.appendChild(catFrag);

        // NE PAS réattacher attachCategoryTreeListeners ici :
        // le listener sur contentArea (ajouté par _loadAccordionContentIfNeeded)
        // survit au remplacement des enfants. Réattacher causerait des duplicatas
        // qui annuleraient les toggles de checkbox (toggle pair = zéro net).

        // Restaurer les états des checkboxes
        this._restoreCheckboxStates(contentArea, savedStates);
    },

    /**
     * Re-render les tags dans un accordéon
     * @private
     */
    _rerenderTags(contentArea, themeId, savedStates) {
        const tags = this.loadTags(themeId);

        // Construction du contenu via import ESM direct (P3-DEAD-02)
        const content = buildTagsListContent(tags);
        // Les valeurs utilisateur sont échappées à la source par buildTagsListContent.
        // On utilise createContextualFragment (suppression scripts uniquement) pour préserver
        // class et data-tag-value sur les <span> badges — la whitelist supprimait ces attributs,
        // rendant les tags non sélectionnables.
        contentArea.textContent = "";
        const tagFrag = document
            .createRange()
            .createContextualFragment(content.replace(/<script[\s\S]*?<\/script>/gi, ""));
        contentArea.appendChild(tagFrag);

        // NE PAS réattacher attachTagsListeners ici :
        // le listener sur contentArea (ajouté par _loadAccordionContentIfNeeded)
        // survit au remplacement des enfants. Réattacher causerait des duplicatas
        // qui annuleraient les toggles (toggle pair = zéro net, badge
        // semblant inactif même après clic).

        // Restaurer les états des checkboxes
        this._restoreCheckboxStates(contentArea, savedStates);
    },

    /**
     * Sauvegarde l'état des checkboxes avant re-render
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
     * Restaure l'état des checkboxes après re-render
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

        Log.debug(`[LazyLoader] ${restoredCount} états de checkbox restaurés`);
    },
};

// Écouter les événements de changement de thème
document.addEventListener("geoleaf:theme:applied", () => {
    Log.info("[LazyLoader] Événement theme:applied détecté — invalidation complète");

    // 1. Vider le cache de données (scan catégories/tags)
    FilterPanelLazyLoader.clearCache();

    // 2. Réinitialiser TOUS les flags data-lazy-loaded sur les accordéons
    //    (fermés ou ouverts) pour forcer un rechargement au prochain expand
    const allAccordions = document.querySelectorAll(
        ".gl-filter-panel__group--accordion[data-lazy-loaded]"
    );
    allAccordions.forEach((acc) => {
        acc.dataset.lazyLoaded = "false";
    });
    Log.debug(`[LazyLoader] ${allAccordions.length} flag(s) data-lazy-loaded réinitialisé(s)`);

    // 3. Rafraîchir les accordéons actuellement ouverts (re-render immédiat)
    FilterPanelLazyLoader.refreshOpenAccordions();
});

// Écouter l'événement de changement de visibilité de couche
document.addEventListener("geoleaf:geojson:visibility-changed", (e) => {
    const detail = e.detail || {};
    Log.info("[LazyLoader] Visibilité couche changée:", detail.layerId, detail.visible);

    // Invalider le cache du thème actif
    const currentTheme = ThemeSelector.getCurrentTheme();
    if (currentTheme) {
        FilterPanelLazyLoader.invalidateCacheForTheme(currentTheme);
        // Rafraîchir les accordéons ouverts
        FilterPanelLazyLoader.refreshOpenAccordions();
    }
});

export { FilterPanelLazyLoader };
