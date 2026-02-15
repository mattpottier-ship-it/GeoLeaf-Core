/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Filters Module
 * Filtrage des POI et Routes selon critères (catégories, tags, proximité, recherche, note)
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;
    const Utils = GeoLeaf.Utils;

    // ========================================
    //   HELPER FUNCTIONS
    // ========================================

    /**
     * Extrait une valeur depuis un chemin (ex: "attributes.shortDescription")
     * @param {object} obj - Objet source
     * @param {string} path - Chemin avec notation point
     * @returns {*} Valeur trouvée ou null
     * @private
     */
    function getNestedValue(obj, path) {
        return path.split('.').reduce((current, prop) =>
            current && current[prop] !== undefined ? current[prop] : null, obj);
    }

    /**
     * Récupère les champs de recherche depuis le profil actif
     * 1. Priorité : extrait les champs marqués "search": true dans panels.detail.layout et panels.route.layout
     * 2. Fallback : récupère searchFields du filtre search dans le profil
     * 3. Fallback final : champs par défaut
     * @returns {Array<string>} Liste des chemins de champs à rechercher
     * @private
     */
    function getSearchFieldsFromProfile() {
        try {
            // Essayer de récupérer depuis GeoLeaf.Config
            if (GeoLeaf.Config && typeof GeoLeaf.Config.getActiveProfile === 'function') {
                const profile = GeoLeaf.Config.getActiveProfile();

                // 1. PRIORITÉ : Extraire les champs avec "search": true depuis tous les layouts
                const searchableFieldsSet = new Set();

                // Extraire depuis panels.detail.layout (POI)
                if (profile && profile.panels && profile.panels.detail && Array.isArray(profile.panels.detail.layout)) {
                    profile.panels.detail.layout
                        .filter(item => item.search === true && item.field)
                        .forEach(item => searchableFieldsSet.add(item.field));
                }

                // Extraire depuis panels.route.layout (Routes)
                if (profile && profile.panels && profile.panels.route && Array.isArray(profile.panels.route.layout)) {
                    profile.panels.route.layout
                        .filter(item => item.search === true && item.field)
                        .forEach(item => searchableFieldsSet.add(item.field));
                }

                if (searchableFieldsSet.size > 0) {
                    const searchableFields = Array.from(searchableFieldsSet);
                    if (Log) Log.debug('[Filters] Champs de recherche depuis layouts (search:true):', searchableFields);
                    return searchableFields;
                }

                // 2. FALLBACK : Chercher searchFields dans panels.search.filters
                if (profile && profile.panels && profile.panels.search && Array.isArray(profile.panels.search.filters)) {
                    const searchFilter = profile.panels.search.filters.find(f => f.type === 'search');
                    if (searchFilter && Array.isArray(searchFilter.searchFields) && searchFilter.searchFields.length > 0) {
                        if (Log) Log.debug('[Filters] Champs de recherche depuis searchFields (fallback):', searchFilter.searchFields);
                        return searchFilter.searchFields;
                    }
                }
            }
        } catch (err) {
            if (Log) Log.warn('[Filters] Erreur extraction searchFields du profil:', err);
        }

        // 3. FALLBACK FINAL : champs par défaut
        const defaultFields = ['title', 'label', 'name'];
        if (Log) Log.debug('[Filters] Utilisation des champs de recherche par défaut:', defaultFields);
        return defaultFields;
    }

    /**
     * Extrait les coordonnées d'une route dans différents formats
     * @param {object} route - Objet route
     * @returns {Array<[number, number]>} Tableau de coordonnées [lat, lng]
     * @private
     */
    function extractRouteCoords(route) {
        // Cas 1 : tableau direct de [lat, lng]
        if (Array.isArray(route.geometry) && route.geometry.length > 0) {
            if (
                Array.isArray(route.geometry[0]) &&
                typeof route.geometry[0][0] === "number" &&
                typeof route.geometry[0][1] === "number"
            ) {
                return route.geometry.map((pair) => [pair[0], pair[1]]);
            }

            // Cas 2 : GeoJSON-like dans un tableau
            if (
                route.geometry[0] &&
                typeof route.geometry[0] === "object" &&
                route.geometry[0].type === "LineString" &&
                Array.isArray(route.geometry[0].coordinates)
            ) {
                return route.geometry[0].coordinates.map((c) => [c[1], c[0]]);
            }
        }

        // Cas 3 : vrai objet GeoJSON
        if (
            route.geometry &&
            typeof route.geometry === "object" &&
            route.geometry.type === "LineString" &&
            Array.isArray(route.geometry.coordinates)
        ) {
            return route.geometry.coordinates.map((c) => [c[1], c[0]]);
        }

        return [];
    }

    // ========================================
    //   PUBLIC API
    // ========================================

    /**
     * Filtre une liste de POI selon les critères fournis
     * @param {Array} basePois - Liste complète des POI
     * @param {object} filterState - État des filtres
     * @param {Array<string>} [filterState.categoriesTree] - IDs des catégories sélectionnées
     * @param {Array<string>} [filterState.subCategoriesTree] - IDs des sous-catégories sélectionnées
     * @param {boolean} [filterState.hasMinRating] - Activer filtre note minimale
     * @param {number} [filterState.minRating] - Note minimale
     * @param {Array<string>} [filterState.selectedTags] - Tags sélectionnés
     * @param {boolean} [filterState.hasTags] - Activer filtre tags
     * @param {object} [filterState.dataTypes] - Types de données (poi, routes)
     * @param {string} [filterState.searchText] - Texte de recherche
     * @param {boolean} [filterState.hasSearchText] - Activer recherche textuelle
     * @param {object} [filterState.proximity] - Filtre proximité {active, center, radius}
     * @returns {Array} POI filtrés
     */
    function filterPoiList(basePois, filterState) {
        const catsSel = filterState.categoriesTree || [];
        const subsSel = filterState.subCategoriesTree || [];
        const hasCats = catsSel.length > 0;
        const hasSubs = subsSel.length > 0;
        const hasMinRating = !!filterState.hasMinRating;
        const minRating = filterState.minRating;
        const selectedTags = filterState.selectedTags || [];
        const hasTags = filterState.hasTags;
        const dataTypes = filterState.dataTypes || { poi: true, routes: true };
        const searchText = filterState.searchText || "";
        const hasSearchText = filterState.hasSearchText || false;
        const proximity = filterState.proximity || { active: false };

        if (Log) {
            Log.debug("[Filters] Début filtrage POI:", {
                totalPOI: basePois.length,
                hasCats,
                hasSubs,
                hasSearchText,
                proximityActive: proximity.active
            });
        }

        if (!Array.isArray(basePois) || basePois.length === 0) {
            if (Log) Log.debug("[Filters] Aucun POI à filtrer");
            return [];
        }

        // Utilise GeoLeaf.Utils.getDistance() (formule de Haversine)
        const getDistance = Utils ? Utils.getDistance : null;

        return basePois.filter(function (poi) {
            const attrs = poi.attributes || {};
            const props = poi.properties || {};

            // Filtre Type de données (POI / Routes)
            const poiType = poi.type || attrs.type || props.type || 'poi';
            if (poiType === 'route' || poiType === 'routes') {
                if (!dataTypes.routes) return false;
            } else {
                if (!dataTypes.poi) return false;
            }

            // Filtre Recherche textuelle
            if (hasSearchText) {
                const searchFields = getSearchFieldsFromProfile();
                let matchFound = false;

                for (let i = 0; i < searchFields.length; i++) {
                    const fieldPath = searchFields[i];
                    const value = getNestedValue(poi, fieldPath);

                    if (value && String(value).toLowerCase().includes(searchText)) {
                        matchFound = true;
                        break;
                    }
                }

                if (!matchFound) return false;
            }

            // Filtre Proximité
            if (proximity.active && proximity.center && getDistance) {
                let lat, lng;

                // Vérifier d'abord le format latlng [lat, lng]
                if (poi.latlng && Array.isArray(poi.latlng) && poi.latlng.length === 2) {
                    lat = poi.latlng[0];
                    lng = poi.latlng[1];
                } else {
                    lat = poi.lat || poi.latitude || attrs.latitude || props.latitude ||
                              (poi.coordinates && poi.coordinates[1]) ||
                              (poi.geometry && poi.geometry.coordinates && poi.geometry.coordinates[1]);
                    lng = poi.lng || poi.longitude || attrs.longitude || props.longitude ||
                              (poi.coordinates && poi.coordinates[0]) ||
                              (poi.geometry && poi.geometry.coordinates && poi.geometry.coordinates[0]);
                }

                if (lat && lng) {
                    const distance = getDistance(proximity.center.lat, proximity.center.lng, lat, lng);
                    if (distance > proximity.radius) return false;
                } else {
                    // Si pas de coordonnées, on exclut du filtre proximité
                    return false;
                }
            }

            const catId =
                attrs.categoryId ||
                poi.categoryId ||
                poi.category ||
                props.categoryId ||
                props.category ||
                null;

            const subId =
                attrs.subCategoryId ||
                poi.subCategoryId ||
                poi.subCategory ||
                poi.sub_category ||
                props.subCategoryId ||
                props.sub_category ||
                null;

            // Filtre catégories / sous-catégories (tree-view)
            // Logique:
            // - Si des sous-catégories sont cochées: le POI doit avoir cette sous-catégorie
            // - Si seulement des catégories sont cochées (sans sous-cat): le POI doit avoir cette catégorie
            if (hasCats || hasSubs) {
                // Cas 1: Des sous-catégories sont sélectionnées
                if (hasSubs) {
                    // Si le POI a une sous-catégorie, vérifier qu'elle est dans la liste
                    if (subId && subsSel.includes(String(subId))) {
                        // OK - sous-catégorie correspond
                    } else {
                        // POI n'a pas la bonne sous-catégorie
                        // On vérifie si sa catégorie est sélectionnée SANS sous-catégorie cochée
                        // (permet de garder les POI dont la catégorie est cochée mais pas leurs sous-cat)
                        if (hasCats && catId && catsSel.includes(String(catId))) {
                            // Vérifier si aucune sous-cat de cette catégorie n'est cochée
                            // Pour simplifier, on rejette si des sous-cat sont cochées
                            return false;
                        } else {
                            return false;
                        }
                    }
                }
                // Cas 2: Seulement des catégories (pas de sous-cat)
                else if (hasCats) {
                    if (!catId || !catsSel.includes(String(catId))) {
                        return false;
                    }
                }
            }

            // Filtre note minimale
            if (hasMinRating) {
                let avg = 0;
                let hasRating = false;

                // Cas 1: reviews est un objet avec rating (format actuel)
                let reviewsObj = attrs.reviews || poi.reviews || props.reviews;
                if (reviewsObj && typeof reviewsObj === "object" && !Array.isArray(reviewsObj)) {
                    if (typeof reviewsObj.rating === "number") {
                        avg = reviewsObj.rating;
                        hasRating = true;
                    }
                }

                // Cas 2: reviews est un array (ancien format)
                else if (Array.isArray(reviewsObj) && reviewsObj.length > 0) {
                    const sum = reviewsObj.reduce(
                        (acc, r) => acc + (Number(r.rating) || 0),
                        0
                    );
                    avg = sum / reviewsObj.length;
                    hasRating = avg > 0;
                }

                // Cas 3: rating directement sur l'objet
                else if (typeof attrs.rating === "number") {
                    avg = attrs.rating;
                    hasRating = true;
                } else if (typeof poi.rating === "number") {
                    avg = poi.rating;
                    hasRating = true;
                } else if (typeof props.rating === "number") {
                    avg = props.rating;
                    hasRating = true;
                }

                // Exclure si: 1) pas de note OU 2) note < minRating
                // Comportement: quand filtre actif, seuls les POI avec note >= minRating passent
                if (!hasRating || avg < minRating) {
                    return false;
                }
            }

            // Tags (au moins UN des tags sélectionnés doit être présent dans le POI)
            if (hasTags) {
                let poiTags =
                    attrs.tags || poi.tags || props.tags || [];
                if (!Array.isArray(poiTags)) {
                    if (typeof poiTags === "string") {
                        poiTags = poiTags.split(/[,;]+/);
                    } else {
                        poiTags = [];
                    }
                }
                poiTags = poiTags
                    .map((t) => String(t).trim())
                    .filter(Boolean);

                const hasAtLeastOne = selectedTags.some((tag) =>
                    poiTags.includes(tag)
                );
                if (!hasAtLeastOne) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Filtre une liste de routes selon les critères fournis
     * @param {Array} baseRoutes - Liste complète des routes
     * @param {object} filterState - État des filtres
     * @param {Array<string>} [filterState.categoriesTree] - IDs des catégories sélectionnées
     * @param {Array<string>} [filterState.subCategoriesTree] - IDs des sous-catégories sélectionnées
     * @param {Array<string>} [filterState.selectedTags] - Tags sélectionnés
     * @param {boolean} [filterState.hasTags] - Activer filtre tags
     * @param {string} [filterState.searchText] - Texte de recherche
     * @param {boolean} [filterState.hasSearchText] - Activer recherche textuelle
     * @param {object} [filterState.proximity] - Filtre proximité {active, center, radius}
     * @returns {Array} Routes filtrées
     */
    function filterRouteList(baseRoutes, filterState) {
        const catsSel = filterState.categoriesTree || [];
        const subsSel = filterState.subCategoriesTree || [];
        const hasCats = catsSel.length > 0;
        const hasSubs = subsSel.length > 0;
        const selectedTags = filterState.selectedTags || [];
        const hasTags = filterState.hasTags;
        const hasMinRating = !!filterState.hasMinRating;
        const minRating = filterState.minRating;
        const searchText = filterState.searchText || "";
        const hasSearchText = filterState.hasSearchText || false;
        const proximity = filterState.proximity || { active: false };

        if (Log) {
            Log.debug("[Filters] Début filtrage routes:", {
                totalRoutes: baseRoutes.length,
                hasCats,
                hasSubs,
                hasMinRating,
                minRating,
                hasSearchText,
                proximityActive: proximity.active
            });
        }

        if (!Array.isArray(baseRoutes) || baseRoutes.length === 0) {
            if (Log) Log.debug("[Filters] Aucune route à filtrer");
            return [];
        }

        // Utilise GeoLeaf.Utils.getDistance() (formule de Haversine)
        const getDistance = Utils ? Utils.getDistance : null;

        return baseRoutes.filter(function (route) {
            const attrs = route.attributes || {};
            const props = route.properties || {};

            // Filtre Recherche textuelle
            if (hasSearchText) {
                const searchFields = getSearchFieldsFromProfile();
                let matchFound = false;

                for (let i = 0; i < searchFields.length; i++) {
                    const fieldPath = searchFields[i];
                    const value = getNestedValue(route, fieldPath);

                    if (value && String(value).toLowerCase().includes(searchText)) {
                        matchFound = true;
                        break;
                    }
                }

                if (!matchFound) return false;
            }

            // Filtre catégories / sous-catégories (tree-view)
            const catId =
                attrs.categoryId ||
                route.categoryId ||
                route.category ||
                props.categoryId ||
                props.category ||
                null;

            const subId =
                attrs.subCategoryId ||
                route.subCategoryId ||
                route.subCategory ||
                route.sub_category ||
                props.subCategoryId ||
                props.sub_category ||
                null;

            // Filtre catégories / sous-catégories (tree-view)
            // Logique:
            // - Si des sous-catégories sont cochées: la route doit avoir cette sous-catégorie
            // - Si seulement des catégories sont cochées (sans sous-cat): la route doit avoir cette catégorie
            if (hasCats || hasSubs) {
                // Cas 1: Des sous-catégories sont sélectionnées
                if (hasSubs) {
                    if (subId && subsSel.includes(String(subId))) {
                        // OK - sous-catégorie correspond
                    } else {
                        // Route n'a pas la bonne sous-catégorie
                        if (hasCats && catId && catsSel.includes(String(catId))) {
                            return false;
                        } else {
                            return false;
                        }
                    }
                }
                // Cas 2: Seulement des catégories (pas de sous-cat)
                else if (hasCats) {
                    if (!catId || !catsSel.includes(String(catId))) {
                        return false;
                    }
                }
            }

            // Filtre Tags (au moins UN des tags sélectionnés doit être présent)
            if (hasTags) {
                let routeTags =
                    attrs.tags || route.tags || props.tags || [];
                if (!Array.isArray(routeTags)) {
                    if (typeof routeTags === "string") {
                        routeTags = routeTags.split(/[,;]+/);
                    } else {
                        routeTags = [];
                    }
                }
                routeTags = routeTags
                    .map((t) => String(t).trim())
                    .filter(Boolean);

                const hasAtLeastOne = selectedTags.some((tag) =>
                    routeTags.includes(tag)
                );
                if (!hasAtLeastOne) {
                    return false;
                }
            }

            // Filtre note minimale (même logique que pour les POI)
            if (hasMinRating) {
                let avg = 0;
                let hasRating = false;

                // Cas 1: reviews est un objet avec rating (format actuel)
                let reviewsObj = attrs.reviews || route.reviews || props.reviews;
                if (reviewsObj && typeof reviewsObj === "object" && !Array.isArray(reviewsObj)) {
                    if (typeof reviewsObj.rating === "number") {
                        avg = reviewsObj.rating;
                        hasRating = true;
                    }
                }

                // Cas 2: reviews est un array (ancien format)
                else if (Array.isArray(reviewsObj) && reviewsObj.length > 0) {
                    const sum = reviewsObj.reduce(
                        (acc, r) => acc + (Number(r.rating) || 0),
                        0
                    );
                    avg = sum / reviewsObj.length;
                    hasRating = avg > 0;
                }

                // Cas 3: rating directement sur l'objet
                else if (typeof attrs.rating === "number") {
                    avg = attrs.rating;
                    hasRating = true;
                } else if (typeof route.rating === "number") {
                    avg = route.rating;
                    hasRating = true;
                } else if (typeof props.rating === "number") {
                    avg = props.rating;
                    hasRating = true;
                }

                // Exclure si: 1) pas de note OU 2) note < minRating
                // Comportement: quand filtre actif, seules les routes avec note >= minRating passent
                if (!hasRating || avg < minRating) {
                    return false;
                }
            }

            // Filtre Proximité : vérifier si au moins un point de l'itinéraire est dans le cercle
            if (proximity.active && proximity.center && getDistance) {
                const coords = extractRouteCoords(route);

                if (coords.length === 0) {
                    // Si pas de coordonnées, on exclut du filtre proximité
                    return false;
                }

                // Vérifier si au moins un point de l'itinéraire est dans le rayon
                let isInRadius = false;
                for (let i = 0; i < coords.length; i++) {
                    const lat = coords[i][0];
                    const lng = coords[i][1];
                    const distance = getDistance(proximity.center.lat, proximity.center.lng, lat, lng);
                    if (distance <= proximity.radius) {
                        isInRadius = true;
                        break;
                    }
                }

                if (!isInRadius) {
                    return false;
                }
            }

            return true;
        });
    }

    // ========================================
    //   EXPORT
    // ========================================

    GeoLeaf.Filters = {
        filterPoiList,
        filterRouteList
    };

})(typeof window !== "undefined" ? window : global);
