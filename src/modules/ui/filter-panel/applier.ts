/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf UI Filter Panel - Applier
 * Application des filtres aux layers POI, Routes, GeoJSON
 *
 * @module ui/filter-panel/applier
 */
"use strict";

import { getLog, getDistance } from "../../utils/general-utils.js";
import { FilterPanelShared } from "../../ui/filter-panel/shared.js";
import { FilterPanelStateReader } from "./state-reader.js";
import { Config as _Config } from "../../config/geoleaf-config/config-core.js";
const Config: any = _Config;
import { POI } from "../../geoleaf.poi.js";
import { GeoJSONCore } from "../../geojson/core.js";
import { Route } from "../../geoleaf.route.js";
import { Filters } from "../../geoleaf.filters.js";

// Direct ESM bindings (P3-DEAD-01 completee)
const getShared = () => FilterPanelShared;

const FilterPanelApplier: any = {};

// --- Module-level helpers for filterGeoJSONLayers ---

function _getSearchFieldsFromLayerConfig(layerData: any): string[] | null {
    if (!layerData || !layerData.config) return null;
    if (layerData.config.search && Array.isArray(layerData.config.search.indexingFields)) {
        return layerData.config.search.indexingFields;
    }
    if (Array.isArray(layerData.config.indexingFields)) return layerData.config.indexingFields;
    if (Array.isArray(layerData.config.searchFields)) return layerData.config.searchFields;
    return null;
}

function _getSearchFieldsFromProfile(): string[] | null {
    try {
        const activeProfile = (Config as any)._activeProfileData;
        if (!activeProfile) return null;
        if (!activeProfile.search) return null;
        if (!activeProfile.search.filters) return null;
        const searchFilter = activeProfile.search.filters.find((f: any) => f.type === "search");
        if (searchFilter && Array.isArray(searchFilter.searchFields))
            return searchFilter.searchFields;
    } catch (_e) {
        /* ignore */
    }
    return null;
}

function _getLayerSearchFields(GeoJSON: any, layerId: any): string[] {
    const Log = getLog();
    try {
        const layerData = GeoJSON.getLayerData(layerId);
        const fromConfig = _getSearchFieldsFromLayerConfig(layerData);
        if (fromConfig) return fromConfig;
    } catch (err) {
        Log.warn(
            "[GeoLeaf.UI.FilterPanel] Erreur r\u00e9cup\u00e9ration fields de recherche:",
            err
        );
    }
    try {
        const fromProfile = _getSearchFieldsFromProfile();
        if (fromProfile) return fromProfile;
    } catch (err) {
        Log.warn(
            "[GeoLeaf.UI.FilterPanel] Erreur r\u00e9cup\u00e9ration fields par d\u00e9faut:",
            err
        );
    }
    return [
        "title",
        "description",
        "properties.title",
        "properties.name",
        "properties.description",
        "attributes.nom",
    ];
}

function _featureMatchesSearch(
    feature: any,
    searchFields: string[],
    searchLower: string,
    Shared: any
): boolean {
    for (let i = 0; i < searchFields.length; i++) {
        const fieldPath = searchFields[i];
        let propertiesFieldPath = fieldPath;
        if (fieldPath.startsWith("properties."))
            propertiesFieldPath = fieldPath.substring("properties.".length);
        let value = null;
        if (feature.properties)
            value = Shared.getNestedValue(feature.properties, propertiesFieldPath);
        if (!value) value = Shared.getNestedValue(feature, fieldPath);
        if (value && String(value).toLowerCase().includes(searchLower)) return true;
    }
    return false;
}

function _resolveCatId(props: any): string | null {
    if (props.categoryId) return String(props.categoryId);
    if (props.category) return String(props.category);
    return null;
}

function _resolveSubId(props: any): string | null {
    if (props.subcategoryId) return String(props.subcategoryId);
    if (props.subCategoryId) return String(props.subCategoryId);
    if (props.subcategory) return String(props.subcategory);
    if (props.sub_category) return String(props.sub_category);
    return null;
}

function _featurePassesCatFilter(
    props: any,
    hasCats: boolean,
    hasSubs: boolean,
    state: any
): boolean {
    const catId = _resolveCatId(props);
    const subId = _resolveSubId(props);
    if (!catId && !subId) return false;
    if (hasSubs) {
        if (!subId) return false;
        if (!state.subCategoriesTree.includes(subId)) return false;
    }
    if (hasCats && !hasSubs) {
        if (!catId) return false;
        if (!state.categoriesTree.includes(catId)) return false;
    }
    return true;
}

function _getFeatureTags(props: any): string[] {
    let featureTags = props.tags || [];
    if (!Array.isArray(featureTags)) {
        if (typeof featureTags === "string") {
            featureTags = featureTags.split(/[,;]+/);
        } else {
            featureTags = [];
        }
    }
    return featureTags.map((t: any) => String(t).trim()).filter(Boolean);
}

function _featurePassesProximityCheck(feature: any, state: any, Shared: any): boolean {
    if (!state.proximity.center) return true;
    const point = Shared.getRepresentativePoint(feature.geometry);
    if (!point) return true;
    const dist = getDistance(
        state.proximity.center.lat,
        state.proximity.center.lng,
        point.lat,
        point.lng
    );
    return dist <= state.proximity.radius;
}

interface _GeoFilterCtx {
    hasSearchText: boolean;
    searchText: string;
    hasCats: boolean;
    hasSubs: boolean;
    hasTags: boolean;
    selectedTags: string[];
    hasProximity: boolean;
    state: any;
    GeoJSON: any;
    Shared: any;
}

function _safeProps(feature: any): any {
    return feature.properties ? feature.properties : {};
}

function _applyGeoFilter(feature: any, layerId: any, ctx: _GeoFilterCtx): boolean {
    const safeProps = _safeProps(feature);
    if (ctx.hasSearchText) {
        const fields = _getLayerSearchFields(ctx.GeoJSON, layerId);
        if (!_featureMatchesSearch(feature, fields, ctx.searchText.toLowerCase(), ctx.Shared))
            return false;
    }
    if (ctx.hasCats || ctx.hasSubs) {
        if (!_featurePassesCatFilter(safeProps, ctx.hasCats, ctx.hasSubs, ctx.state)) return false;
    }
    if (ctx.hasTags) {
        const featureTags = _getFeatureTags(safeProps);
        const hasAtLeastOneTag = ctx.selectedTags.some((tag: any) => featureTags.includes(tag));
        if (!hasAtLeastOneTag) return false;
    }
    if (ctx.hasProximity) {
        if (!_featurePassesProximityCheck(feature, ctx.state, ctx.Shared)) return false;
    }
    return true;
}

function _applyRouteFilters(baseRoutes: any[], state: any, skipRoutes: boolean): void {
    const Log = getLog();
    if (!state.dataTypes.routes) {
        Route.hide();
        return;
    }
    if (skipRoutes) {
        Route.show();
        return;
    }
    let filteredRoutes = baseRoutes;
    if (Filters && typeof Filters.filterRouteList === "function") {
        filteredRoutes = Filters.filterRouteList(baseRoutes, state);
    }
    Log.info("[GeoLeaf.UI.FilterPanel] Filters applied on routes.", {
        total: baseRoutes.length,
        result: filteredRoutes.length,
    });
    if (typeof Route.filterVisibility === "function") {
        Route.filterVisibility(filteredRoutes);
    } else if (typeof Route.loadFromConfig === "function") {
        Route.loadFromConfig(filteredRoutes);
    }
    Route.show();
}

// Cache et optimisations for thes performances
const _cachedFilterState = null;
let _lastApplyTime = 0;
const APPLY_DEBOUNCE_DELAY = 300; // 300ms

// Fonction debounce pour l'application des filtres
let _applyFiltersTimeout: ReturnType<typeof setTimeout> | null = null;
let _lastSkipRoutes = false; // Store skipRoutes flag for debounced call
const _debouncedApplyFilters = function (panelEl: any, skipRoutes: any) {
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
FilterPanelApplier.destroy = function () {
    if (_applyFiltersTimeout) {
        clearTimeout(_applyFiltersTimeout);
        _applyFiltersTimeout = null;
    }
};

/**
 * Rafraîchit la visibilité des POI selon the list filtréee.
 * IMPORTANT: Cette fonction filters UNIQUEMENT les POI du système POI traditionnel.
 * Les GeoJSON layers (point, line, polygon) sont gérées par filterGeoJSONLayers().
 * On n'appelle PAS filterFeatures() ici pour éviter de hide les GeoJSON layers.
 *
 * @param {Array} filteredPois - List des POI à display
 */
FilterPanelApplier.refreshPoiLayer = function (filteredPois: any) {
    const Log = getLog();

    // Vérifier si le système POI est activé in the config
    const poiConfig = typeof Config.get === "function" ? Config.get("poiConfig") : null;
    if (poiConfig && poiConfig.enabled === false) {
        Log.debug("[GeoLeaf.UI.FilterPanel] POI system disabled, skipping POI layer refresh.");
        return;
    }

    if (!POI) {
        Log.warn("[GeoLeaf.UI.FilterPanel] GeoLeaf.POI unavailable, skipping POI layer refresh.");
        return;
    }

    if (typeof POI._clearAllForTests === "function") {
        POI._clearAllForTests();
    } else {
        Log.warn("[GeoLeaf.UI.FilterPanel] GeoLeaf.POI._clearAllForTests unavailable.");
    }

    filteredPois.forEach(function (p: any) {
        try {
            POI.addPoi(p);
        } catch (err) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Failed to add filtered POI:", p, err);
        }
    });

    Log.debug(`[GeoLeaf.UI.FilterPanel] refreshPoiLayer: ${filteredPois.length} visible POIs`);
};

/**
 * Applies thes filtres aux GeoJSON layers (polygons et polylines)
 * @param {Object} state - État des filtres
 */
function _buildGeoFilterCtx(state: any, GeoJSON: any, Shared: any): _GeoFilterCtx {
    const hasCats = state.categoriesTree && state.categoriesTree.length > 0;
    const hasSubs = state.subCategoriesTree && state.subCategoriesTree.length > 0;
    const hasTags = state.hasTags && state.selectedTags && state.selectedTags.length > 0;
    const selectedTags = state.selectedTags || [];
    const hasProximity = state.proximity && state.proximity.active;
    const hasSearchText = state.hasSearchText && state.searchText;
    const searchText = state.searchText || "";
    return {
        hasSearchText: !!hasSearchText,
        searchText,
        hasCats,
        hasSubs,
        hasTags,
        selectedTags,
        hasProximity: !!hasProximity,
        state,
        GeoJSON,
        Shared,
    };
}

FilterPanelApplier.filterGeoJSONLayers = function (state: any) {
    const Shared = getShared();
    const GeoJSON = GeoJSONCore;
    if (!GeoJSON || typeof GeoJSON.filterFeatures !== "function") return;
    const ctx = _buildGeoFilterCtx(state, GeoJSON, Shared);
    const filterFn = (_geometryType: any) => (feature: any, layerId: any) =>
        _applyGeoFilter(feature, layerId, ctx);
    GeoJSON.filterFeatures(filterFn("polygon"), { geometryType: "polygon" });
    GeoJSON.filterFeatures(filterFn("line"), { geometryType: "line" });
    GeoJSON.filterFeatures(filterFn("point"), { geometryType: "point" });
};

/**
 * Applies tous the filters actives avec debounce
 */
FilterPanelApplier.applyFiltersNow = function (panelEl: any, skipRoutes: any) {
    _debouncedApplyFilters(panelEl, skipRoutes);
};

/**
 * Applies tous the filters actives imm\u00e9diatement (internal)
 * @private
 */
FilterPanelApplier._applyFiltersImmediate = function (panelEl: any, skipRoutes: any) {
    const Log = getLog();
    const Shared = getShared();
    const StateReader = FilterPanelStateReader;

    const now = Date.now();
    if (now - _lastApplyTime < 100) return;
    _lastApplyTime = now;

    const basePois = Shared.getBasePois();
    const baseRoutes = Shared.getBaseRoutes();
    const state = StateReader.readFiltersFromPanel(panelEl);

    FilterPanelApplier.filterGeoJSONLayers(state);

    if (!basePois.length && !baseRoutes.length) {
        Log.info("[GeoLeaf.UI.FilterPanel] No source POI or route found.");
        return;
    }

    if (Route && typeof Route.isInitialized === "function" && Route.isInitialized()) {
        _applyRouteFilters(baseRoutes, state, skipRoutes);
    }

    const filtered = FilterPanelApplier.filterPoiList(basePois, state);
    Log.info("[GeoLeaf.UI.FilterPanel] Filters applied on POIs.", {
        total: basePois.length,
        result: filtered.length,
        filters: state,
    });
    FilterPanelApplier.refreshPoiLayer(filtered);
};

/**
 * Filtre a list de POI based on thes criteria fournis
 */
FilterPanelApplier.filterPoiList = function (basePois: any, filterState: any) {
    if (Filters && typeof Filters.filterPoiList === "function") {
        return Filters.filterPoiList(basePois, filterState);
    }
    return basePois;
};

/**
 * Filtre a list de routes based on thes criteria fournis
 */
FilterPanelApplier.filterRouteList = function (baseRoutes: any, filterState: any) {
    if (Filters && typeof Filters.filterRouteList === "function") {
        return Filters.filterRouteList(baseRoutes, filterState);
    }
    return baseRoutes;
};

/**
 * Applies initial filters by retrieving the panel from Shared
 */
FilterPanelApplier.applyFiltersInitial = function () {
    const Shared = getShared();
    const panelEl = Shared.getFilterPanelElement();
    if (!panelEl) return;
    _lastApplyTime = 0;
    FilterPanelApplier._applyFiltersImmediate(panelEl, false);
};

export { FilterPanelApplier };
