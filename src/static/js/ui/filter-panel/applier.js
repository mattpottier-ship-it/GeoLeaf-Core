/**
 * GeoLeaf UI Filter Panel - Applier
 * Application des filtres aux couches POI, Routes, GeoJSON
 *
 * @module ui/filter-panel/applier
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Dépendances lazy
    const getLog = () => (GeoLeaf.Log || console);
    const getShared = () => GeoLeaf._UIFilterPanelShared;
    const getStateReader = () => GeoLeaf._UIFilterPanelStateReader;

    GeoLeaf._UIFilterPanelApplier = GeoLeaf._UIFilterPanelApplier || {};

    // Cache et optimisations pour les performances
    let _cachedFilterState = null;
    let _lastApplyTime = 0;
    const APPLY_DEBOUNCE_DELAY = 300; // 300ms

    // Fonction debounce pour l'application des filtres
    let _applyFiltersTimeout = null;
    let _lastSkipRoutes = false; // Store skipRoutes flag for debounced call
    const _debouncedApplyFilters = function(panelEl, skipRoutes) {
        if (_applyFiltersTimeout) {
            clearTimeout(_applyFiltersTimeout);
        }
        _lastSkipRoutes = skipRoutes || false;
        _applyFiltersTimeout = setTimeout(() => {
            GeoLeaf._UIFilterPanelApplier._applyFiltersImmediate(panelEl, _lastSkipRoutes);
        }, APPLY_DEBOUNCE_DELAY);
    };

    /**
     * MEMORY LEAK FIX (Phase 2): Cleanup timeout on destroy
     */
    GeoLeaf._UIFilterPanelApplier.destroy = function() {
        if (_applyFiltersTimeout) {
            clearTimeout(_applyFiltersTimeout);
            _applyFiltersTimeout = null;
        }
    };

    /**
     * Rafraîchit la visibilité des POI selon la liste filtrée.
     * IMPORTANT: Cette fonction filtre UNIQUEMENT les POI du système POI traditionnel.
     * Les couches GeoJSON (point, line, polygon) sont gérées par filterGeoJSONLayers().
     * On n'appelle PAS filterFeatures() ici pour éviter de masquer les couches GeoJSON.
     *
     * @param {Array} filteredPois - Liste des POI à afficher
     */
    GeoLeaf._UIFilterPanelApplier.refreshPoiLayer = function(filteredPois) {
        const Log = getLog();

        // Vérifier si le système POI est activé dans la config
        const Config = GeoLeaf.Config;
        const poiConfig = (Config && typeof Config.get === 'function') ? Config.get('poiConfig') : null;
        if (poiConfig && poiConfig.enabled === false) {
            Log.debug("[GeoLeaf.UI.FilterPanel] Système POI désactivé, pas de rafraîchissement de la couche POI.");
            return;
        }

        // Fallback: utiliser l'ancien système POI (si GeoJSON n'est pas disponible)
        if (!GeoLeaf.POI) {
            Log.warn("[GeoLeaf.UI.FilterPanel] GeoLeaf.POI indisponible, pas de rafraîchissement de la couche POI.");
            return;
        }

        if (typeof GeoLeaf.POI._clearAllForTests === "function") {
            GeoLeaf.POI._clearAllForTests();
        } else {
            Log.warn("[GeoLeaf.UI.FilterPanel] GeoLeaf.POI._clearAllForTests indisponible.");
        }

        filteredPois.forEach(function(p) {
            try {
                GeoLeaf.POI.addPoi(p);
            } catch (err) {
                Log.warn("[GeoLeaf.UI.FilterPanel] Impossible d'ajouter un POI filtré:", p, err);
            }
        });

        Log.debug(`[GeoLeaf.UI.FilterPanel] refreshPoiLayer: ${filteredPois.length} POI visibles`);
    };

    /**
     * Applique les filtres aux couches GeoJSON (polygones et polylignes)
     * @param {Object} state - État des filtres
     */
    GeoLeaf._UIFilterPanelApplier.filterGeoJSONLayers = function(state) {
        const Log = getLog();
        const Shared = getShared();

        if (!GeoLeaf.GeoJSON || typeof GeoLeaf.GeoJSON.filterFeatures !== 'function') {
            return;
        }

        const hasCats = state.categoriesTree && state.categoriesTree.length > 0;
        const hasSubs = state.subCategoriesTree && state.subCategoriesTree.length > 0;
        const hasTags = state.hasTags && state.selectedTags && state.selectedTags.length > 0;
        const selectedTags = state.selectedTags || [];
        const hasProximity = state.proximity && state.proximity.active;
        const hasSearchText = state.hasSearchText && state.searchText;
        const searchText = state.searchText || '';
        const getDistance = GeoLeaf.Utils && typeof GeoLeaf.Utils.getDistance === 'function' ? GeoLeaf.Utils.getDistance : null;

        // Helper pour obtenir les champs de recherche depuis la config de la couche
        const getLayerSearchFields = (layerId) => {
            try {
                const layerData = GeoLeaf.GeoJSON.getLayerData(layerId);
                if (layerData && layerData.config) {
                    // Priorité 1: search.indexingFields (format standard des configs de couches)
                    if (layerData.config.search && Array.isArray(layerData.config.search.indexingFields)) {
                        return layerData.config.search.indexingFields;
                    }
                    // Priorité 2: indexingFields à la racine (legacy)
                    if (Array.isArray(layerData.config.indexingFields)) {
                        return layerData.config.indexingFields;
                    }
                    // Priorité 3: searchFields (legacy)
                    if (Array.isArray(layerData.config.searchFields)) {
                        return layerData.config.searchFields;
                    }
                }
            } catch (err) {
                Log.warn("[GeoLeaf.UI.FilterPanel] Erreur récupération champs de recherche:", err);
            }

            // Fallback: champs par défaut du profil
            try {
                const activeProfile = GeoLeaf.Config && GeoLeaf.Config._activeProfileData;
                if (activeProfile && activeProfile.search && activeProfile.search.filters) {
                    const searchFilter = activeProfile.search.filters.find(f => f.type === 'search');
                    if (searchFilter && Array.isArray(searchFilter.searchFields)) {
                        return searchFilter.searchFields;
                    }
                }
            } catch (err) {
                Log.warn("[GeoLeaf.UI.FilterPanel] Erreur récupération champs par défaut:", err);
            }

            // Fallback ultime
            return ['title', 'description', 'properties.title', 'properties.name', 'properties.description', 'attributes.nom'];
        };

        // Helper pour tester la recherche textuelle sur une feature
        const matchesSearchText = (feature, layerId) => {
            if (!hasSearchText) return true;

            const searchFields = getLayerSearchFields(layerId);
            const searchLower = searchText.toLowerCase();

            for (let i = 0; i < searchFields.length; i++) {
                let fieldPath = searchFields[i];
                let value = null;

                // Normaliser le chemin: si commence par "properties.", on le supprime
                // puisque on va chercher directement dans feature.properties
                let propertiesFieldPath = fieldPath;
                if (fieldPath.startsWith('properties.')) {
                    propertiesFieldPath = fieldPath.substring('properties.'.length);
                }

                // Tester d'abord dans properties
                if (feature.properties) {
                    value = Shared.getNestedValue(feature.properties, propertiesFieldPath);
                }

                // Si pas trouvé, tester à la racine avec le chemin original
                if (!value) {
                    value = Shared.getNestedValue(feature, fieldPath);
                }

                if (value && String(value).toLowerCase().includes(searchLower)) {
                    return true;
                }
            }

            return false;
        };

        // Fonction de filtre commune pour polygones et lignes
        const createFilterFunction = (geometryType) => (feature, layerId) => {
            const props = feature.properties || {};

            // Filtrage par recherche textuelle
            if (hasSearchText && !matchesSearchText(feature, layerId)) {
                return false;
            }

            // Filtrage par catégorie/sous-catégorie
            if (hasCats || hasSubs) {
                const catId = props.categoryId || props.category || null;
                const subId = props.subcategoryId || props.subCategoryId || props.subcategory || props.sub_category || null;

                // Si pas de catégorie sur cette feature, masquer quand filtre actif
                if (!catId && !subId) return false;

                // Si des sous-catégories sont sélectionnées
                if (hasSubs) {
                    if (!subId || !state.subCategoriesTree.includes(String(subId))) {
                        return false;
                    }
                }

                // Si seulement des catégories (pas de sous-cat)
                if (hasCats && !hasSubs) {
                    if (!catId || !state.categoriesTree.includes(String(catId))) {
                        return false;
                    }
                }
            }

            // Filtrage par tags (au moins UN des tags sélectionnés doit être présent)
            if (hasTags) {
                let featureTags = props.tags || [];
                if (!Array.isArray(featureTags)) {
                    if (typeof featureTags === 'string') {
                        featureTags = featureTags.split(/[,;]+/);
                    } else {
                        featureTags = [];
                    }
                }
                featureTags = featureTags.map(t => String(t).trim()).filter(Boolean);

                const hasAtLeastOneTag = selectedTags.some(tag => featureTags.includes(tag));
                if (!hasAtLeastOneTag) {
                    return false;
                }
            }

            // Filtrage par proximité
            if (hasProximity && state.proximity.center && getDistance) {
                const point = Shared.getRepresentativePoint(feature.geometry);
                if (point) {
                    const distance = getDistance(
                        state.proximity.center.lat,
                        state.proximity.center.lng,
                        point.lat,
                        point.lng
                    );
                    if (distance > state.proximity.radius) {
                        return false;
                    }
                }
            }

            return true;
        };

        // Filtrer les polygones (zones)
        GeoLeaf.GeoJSON.filterFeatures(createFilterFunction('polygon'), { geometryType: 'polygon' });

        // Filtrer les polylignes (routes GeoJSON)
        GeoLeaf.GeoJSON.filterFeatures(createFilterFunction('line'), { geometryType: 'line' });

        // Filtrer les points (POI GeoJSON - MultiPoint, Point, etc.)
        GeoLeaf.GeoJSON.filterFeatures(createFilterFunction('point'), { geometryType: 'point' });
    };

    /**
     * Applique tous les filtres actifs avec debounce
     * @param {HTMLElement} panelEl - Élément du panneau de filtres
     */
    GeoLeaf._UIFilterPanelApplier.applyFiltersNow = function(panelEl, skipRoutes) {
        _debouncedApplyFilters(panelEl, skipRoutes);
    };

    /**
     * Applique tous les filtres actifs immédiatement (interne, avec protection contre les appels répétés)
     * @private
     * @param {HTMLElement} panelEl - Élément du panneau de filtres
     * @param {boolean} skipRoutes - Si true, skip le traitement des routes (preserve leurs styles)
     */
    GeoLeaf._UIFilterPanelApplier._applyFiltersImmediate = function(panelEl, skipRoutes) {
        const Log = getLog();
        const Shared = getShared();
        const StateReader = getStateReader();

        // Éviter les appels répétés trop rapprochés
        const now = Date.now();
        if (now - _lastApplyTime < 100) return; // 100ms minimum entre les appels
        _lastApplyTime = now;

        const basePois = Shared.getBasePois();
        const baseRoutes = Shared.getBaseRoutes();
        const state = StateReader.readFiltersFromPanel(panelEl);

        // Filtrage des couches GeoJSON (polygones, polylignes)
        GeoLeaf._UIFilterPanelApplier.filterGeoJSONLayers(state);

        if (!basePois.length && !baseRoutes.length) {
            Log.info("[GeoLeaf.UI.FilterPanel] Aucun POI ni route source trouvé.");
            return;
        }

        // Gérer le filtrage et l'affichage des itinéraires via GeoLeaf.Route
        if (GeoLeaf.Route && typeof GeoLeaf.Route.isInitialized === 'function' && GeoLeaf.Route.isInitialized()) {
            if (state.dataTypes.routes) {
                // Si skipRoutes=true, on affiche juste les routes existantes sans les recharger
                if (skipRoutes) {
                    GeoLeaf.Route.show();
                } else {
                    // Filtrer les routes
                    let filteredRoutes = baseRoutes;
                    filteredRoutes = GeoLeaf.Filters && typeof GeoLeaf.Filters.filterRouteList === 'function'
                        ? GeoLeaf.Filters.filterRouteList(baseRoutes, state)
                        : baseRoutes;

                    Log.info("[GeoLeaf.UI.FilterPanel] Filtres appliqués sur les routes.", {
                        total: baseRoutes.length,
                        result: filteredRoutes.length
                    });

                    // Utiliser filterVisibility() si disponible pour préserver les styles
                    // Sinon, utiliser loadFromConfig() (comportement par défaut)
                    if (typeof GeoLeaf.Route.filterVisibility === 'function') {
                        GeoLeaf.Route.filterVisibility(filteredRoutes);
                    } else if (typeof GeoLeaf.Route.loadFromConfig === 'function') {
                        GeoLeaf.Route.loadFromConfig(filteredRoutes);
                    }
                    GeoLeaf.Route.show();
                }
            } else {
                GeoLeaf.Route.hide();
            }
        }

        // Filtrer les POI
        const filtered = GeoLeaf._UIFilterPanelApplier.filterPoiList(basePois, state);

        Log.info("[GeoLeaf.UI.FilterPanel] Filtres appliqués sur les POI.", {
            total: basePois.length,
            result: filtered.length,
            filters: state
        });

        GeoLeaf._UIFilterPanelApplier.refreshPoiLayer(filtered);
    };

    /**
     * Filtre une liste de POI selon les critères fournis
     * Délègue vers GeoLeaf.Filters.filterPoiList()
     *
     * @param {Array} basePois - Liste complète des POI
     * @param {Object} filterState - État des filtres
     * @returns {Array} POI filtrés
     */
    GeoLeaf._UIFilterPanelApplier.filterPoiList = function(basePois, filterState) {
        if (GeoLeaf.Filters && typeof GeoLeaf.Filters.filterPoiList === 'function') {
            return GeoLeaf.Filters.filterPoiList(basePois, filterState);
        }

        const Log = getLog();
        Log.warn('[GeoLeaf.UI.FilterPanel] Module Filters non chargé, retour liste complète');
        return basePois || [];
    };

    /**
     * Filtre une liste de routes selon les critères fournis
     * Délègue vers GeoLeaf.Filters.filterRouteList()
     *
     * @param {Array} baseRoutes - Liste complète des routes
     * @param {Object} filterState - État des filtres
     * @returns {Array} Routes filtrées
     */
    GeoLeaf._UIFilterPanelApplier.filterRouteList = function(baseRoutes, filterState) {
        if (GeoLeaf.Filters && typeof GeoLeaf.Filters.filterRouteList === 'function') {
            return GeoLeaf.Filters.filterRouteList(baseRoutes, filterState);
        }

        const Log = getLog();
        Log.warn('[GeoLeaf.UI.FilterPanel] Module Filters non chargé, retour liste complète');
        return baseRoutes || [];
    };

    /**
     * Applique les filtres initiaux au chargement
     */
    GeoLeaf._UIFilterPanelApplier.applyFiltersInitial = function() {
        const Log = getLog();
        const Shared = getShared();
        const StateReader = getStateReader();

        const panelEl = Shared.getFilterPanelElement();
        if (!panelEl) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Panneau de filtres non trouvé, impossible d'appliquer les filtres initiaux.");
            return;
        }

        Log.info("[GeoLeaf.UI.FilterPanel] Application des filtres initiaux...");

        const state = StateReader.readFiltersFromPanel(panelEl);
        const basePois = Shared.getBasePois();
        const baseRoutes = Shared.getBaseRoutes();

        if (!basePois.length && !baseRoutes.length) {
            Log.info("[GeoLeaf.UI.FilterPanel] Aucun POI ni route source trouvé.");
            return;
        }

        // Gérer les itinéraires
        if (GeoLeaf.Route && typeof GeoLeaf.Route.isInitialized === 'function' && GeoLeaf.Route.isInitialized()) {
            if (state.dataTypes.routes) {
                let filteredRoutes = GeoLeaf._UIFilterPanelApplier.filterRouteList(baseRoutes, state);
                if (typeof GeoLeaf.Route.loadFromConfig === 'function') {
                    GeoLeaf.Route.loadFromConfig(filteredRoutes);
                }
                GeoLeaf.Route.show();
            } else {
                GeoLeaf.Route.hide();
            }
        }

        // Filtrer et charger les POI
        const filtered = GeoLeaf._UIFilterPanelApplier.filterPoiList(basePois, state);
        Log.info("[GeoLeaf.UI.FilterPanel] POI filtrés pour chargement initial.", {
            total: basePois.length,
            result: filtered.length
        });

        GeoLeaf._UIFilterPanelApplier.refreshPoiLayer(filtered);
    };

})(window);
