/**
 * GeoLeaf UI Filter Panel - Applier
 * Application des filtres aux couches POI, Routes, GeoJSON
 *
 * @module ui/filter-panel/applier
 */
"use strict";

import { getLog, getDistance } from '../../utils/general-utils.js';
import { FilterPanelShared } from './shared.js';
import { FilterPanelStateReader } from './state-reader.js';
import { Config } from '../../config/geoleaf-config/config-core.js';
import { POI } from '../../geoleaf.poi.js';
import { GeoJSONCore } from '../../geojson/core.js';
import { Route } from '../../geoleaf.route.js';
import { Filters } from '../../geoleaf.filters.js';

// Direct ESM bindings (P3-DEAD-01 complete)
const getShared = () => FilterPanelShared;
const getStateReader = () => FilterPanelStateReader;

const FilterPanelApplier = {};

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
        FilterPanelApplier._applyFiltersImmediate(panelEl, _lastSkipRoutes);
    }, APPLY_DEBOUNCE_DELAY);
};

/**
 * MEMORY LEAK FIX (Phase 2): Cleanup timeout on destroy
 */
FilterPanelApplier.destroy = function() {
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
FilterPanelApplier.refreshPoiLayer = function(filteredPois) {
    const Log = getLog();

    // Vérifier si le système POI est activé dans la config
    const poiConfig = (typeof Config.get === 'function') ? Config.get('poiConfig') : null;
    if (poiConfig && poiConfig.enabled === false) {
        Log.debug("[GeoLeaf.UI.FilterPanel] Système POI désactivé, pas de rafraîchissement de la couche POI.");
        return;
    }

    if (!POI) {
        Log.warn("[GeoLeaf.UI.FilterPanel] GeoLeaf.POI indisponible, pas de rafraîchissement de la couche POI.");
        return;
    }

    if (typeof POI._clearAllForTests === "function") {
        POI._clearAllForTests();
    } else {
        Log.warn("[GeoLeaf.UI.FilterPanel] GeoLeaf.POI._clearAllForTests indisponible.");
    }

    filteredPois.forEach(function(p) {
        try {
            POI.addPoi(p);
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
FilterPanelApplier.filterGeoJSONLayers = function(state) {
    const Log = getLog();
    const Shared = getShared();
    const GeoJSON = GeoJSONCore;

    if (!GeoJSON || typeof GeoJSON.filterFeatures !== 'function') {
        return;
    }

    const hasCats = state.categoriesTree && state.categoriesTree.length > 0;
    const hasSubs = state.subCategoriesTree && state.subCategoriesTree.length > 0;
    const hasTags = state.hasTags && state.selectedTags && state.selectedTags.length > 0;
    const selectedTags = state.selectedTags || [];
    const hasProximity = state.proximity && state.proximity.active;
    const hasSearchText = state.hasSearchText && state.searchText;
    const searchText = state.searchText || '';
    // getDistance imported from general-utils.js

    // Helper pour obtenir les champs de recherche depuis la config de la couche
    const getLayerSearchFields = (layerId) => {
        try {
            const layerData = GeoJSON.getLayerData(layerId);
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
            const activeProfile = Config._activeProfileData;
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
    GeoJSON.filterFeatures(createFilterFunction('polygon'), { geometryType: 'polygon' });

    // Filtrer les polylignes (routes GeoJSON)
    GeoJSON.filterFeatures(createFilterFunction('line'), { geometryType: 'line' });

    // Filtrer les points (POI GeoJSON - MultiPoint, Point, etc.)
    GeoJSON.filterFeatures(createFilterFunction('point'), { geometryType: 'point' });
};

/**
 * Applique tous les filtres actifs avec debounce
 * @param {HTMLElement} panelEl - Élément du panneau de filtres
 */
FilterPanelApplier.applyFiltersNow = function(panelEl, skipRoutes) {
    _debouncedApplyFilters(panelEl, skipRoutes);
};

/**
 * Applique tous les filtres actifs immédiatement (interne, avec protection contre les appels répétés)
 * @private
 * @param {HTMLElement} panelEl - Élément du panneau de filtres
 * @param {boolean} skipRoutes - Si true, skip le traitement des routes (preserve leurs styles)
 */
FilterPanelApplier._applyFiltersImmediate = function(panelEl, skipRoutes) {
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
    FilterPanelApplier.filterGeoJSONLayers(state);

    if (!basePois.length && !baseRoutes.length) {
        Log.info("[GeoLeaf.UI.FilterPanel] Aucun POI ni route source trouvé.");
        return;
    }

    // Gérer le filtrage et l'affichage des itinéraires via GeoLeaf.Route
    if (Route && typeof Route.isInitialized === 'function' && Route.isInitialized()) {
        if (state.dataTypes.routes) {
            // Si skipRoutes=true, on affiche juste les routes existantes sans les recharger
            if (skipRoutes) {
                Route.show();
            } else {
                // Filtrer les routes
                let filteredRoutes = baseRoutes;
                filteredRoutes = Filters && typeof Filters.filterRouteList === 'function'
                    ? Filters.filterRouteList(baseRoutes, state)
                    : baseRoutes;

                Log.info("[GeoLeaf.UI.FilterPanel] Filtres appliqués sur les routes.", {
                    total: baseRoutes.length,
                    result: filteredRoutes.length
                });

                // Utiliser filterVisibility() si disponible pour préserver les styles
                // Sinon, utiliser loadFromConfig() (comportement par défaut)
                if (typeof Route.filterVisibility === 'function') {
                    Route.filterVisibility(filteredRoutes);
                } else if (typeof Route.loadFromConfig === 'function') {
                    Route.loadFromConfig(filteredRoutes);
                }
                Route.show();
            }
        } else {
            Route.hide();
        }
    }

    // Filtrer les POI
    const filtered = FilterPanelApplier.filterPoiList(basePois, state);

    Log.info("[GeoLeaf.UI.FilterPanel] Filtres appliqués sur les POI.", {
        total: basePois.length,
        result: filtered.length,
        filters: state
    });

    FilterPanelApplier.refreshPoiLayer(filtered);
};

/**
 * Filtre une liste de POI selon les critères fournis
 * Délègue vers GeoLeaf.Filters.filterPoiList()
 *
 * @param {Array} basePois - Liste complète des POI
 * @param {Object} filterState - État des filtres
 * @returns {Array} POI filtrés
 */
FilterPanelApplier.filterPoiList = function(basePois, filterState) {
    if (Filters && typeof Filters.filterPoiList === 'function') {
        return Filters.filterPoiList(basePois, filterState);
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
FilterPanelApplier.filterRouteList = function(baseRoutes, filterState) {
    if (Filters && typeof Filters.filterRouteList === 'function') {
        return Filters.filterRouteList(baseRoutes, filterState);
    }

    const Log = getLog();
    Log.warn('[GeoLeaf.UI.FilterPanel] Module Filters non chargé, retour liste complète');
    return baseRoutes || [];
};

/**
 * Applique les filtres initiaux au chargement
 */
FilterPanelApplier.applyFiltersInitial = function() {
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
    if (Route && typeof Route.isInitialized === 'function' && Route.isInitialized()) {
        if (state.dataTypes.routes) {
            let filteredRoutes = FilterPanelApplier.filterRouteList(baseRoutes, state);
            if (typeof Route.loadFromConfig === 'function') {
                Route.loadFromConfig(filteredRoutes);
            }
            Route.show();
        } else {
            Route.hide();
        }
    }

    // Filtrer et charger les POI
    const filtered = FilterPanelApplier.filterPoiList(basePois, state);
    Log.info("[GeoLeaf.UI.FilterPanel] POI filtrés pour chargement initial.", {
        total: basePois.length,
        result: filtered.length
    });

    FilterPanelApplier.refreshPoiLayer(filtered);
};


export { FilterPanelApplier };
