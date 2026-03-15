/**
 * GeoLeaf UI Filter Panel - Core
 * API public et delegation to thes sous-modules
 *
 * @module ui/filter-panel/core
 */
"use strict";

import { getLog } from "../../utils/general-utils.js";
import { FilterPanelShared } from "./shared.ts";
import { FilterPanelStateReader } from "./state-reader.js";
import { FilterPanelApplier } from "./applier.js";
import { FilterPanelRenderer } from "./renderer.js";
import { FilterPanelProximity } from "./proximity.js";

// Direct ESM bindings (P3-DEAD-01 completee)
const getShared = (): any => FilterPanelShared;
const getStateReader = (): any => FilterPanelStateReader;
const getApplier = (): any => FilterPanelApplier;
const getRenderer = (): any => FilterPanelRenderer;
const getProximity = (): any => FilterPanelProximity;

const FilterPanel: any = {};

// ========================================
//   API PUBLIQUE - Delegation vers sous-modules
// ========================================

/**
 * Builds the filter panels from the configuration of the profile active
 * @param {Object} options - Options
 */
FilterPanel.buildFilterPanelFromActiveProfile = function (options: any) {
    const Renderer = getRenderer();
    if (Renderer && Renderer.buildFilterPanelFromActiveProfile) {
        return Renderer.buildFilterPanelFromActiveProfile(options);
    }
    getLog().error("[GeoLeaf.UI.FilterPanel] Renderer module not loaded");
};

/**
 * Switches la visibility du filter panels
 * @param {boolean} [forceState]
 */
FilterPanel.toggleFilterPanelVisibility = function (forceState: any) {
    const Renderer = getRenderer();
    if (Renderer && Renderer.toggleFilterPanelVisibility) {
        return Renderer.toggleFilterPanelVisibility(forceState);
    }
};

/**
 * Initializes le button toggle du filter panels
 */
FilterPanel.initFilterToggle = function () {
    const Renderer = getRenderer();
    if (Renderer && Renderer.initFilterToggle) {
        return Renderer.initFilterToggle();
    }
};

/**
 * Refreshes les badges de tags
 */
FilterPanel.refreshFilterTags = function () {
    const Renderer = getRenderer();
    if (Renderer && Renderer.refreshFilterTags) {
        return Renderer.refreshFilterTags();
    }
};

/**
 * Applies thes filtres initiaux
 */
FilterPanel.applyFiltersInitial = function () {
    const Applier = getApplier();
    if (Applier && Applier.applyFiltersInitial) {
        return Applier.applyFiltersInitial();
    }
};

/**
 * Initializes le proximity filter
 * @param {L.Map} map
 */
FilterPanel.initProximityFilter = function (map: any) {
    const Proximity = getProximity();
    if (Proximity && Proximity.initProximityFilter) {
        return Proximity.initProximityFilter(map);
    }
};

/**
 * Returns the element DOM du filter panels
 * @returns {HTMLElement|null}
 */
FilterPanel._getFilterPanelElement = function () {
    const Shared = getShared();
    if (Shared && Shared.getFilterPanelElement) {
        return Shared.getFilterPanelElement();
    }
    return null;
};

/**
 * Retrieves thes POI de base
 * @returns {Array}
 */
FilterPanel._getBasePois = function () {
    const Shared = getShared();
    if (Shared && Shared.getBasePois) {
        return Shared.getBasePois();
    }
    return [];
};

/**
 * Retrieves thes routes de base
 * @returns {Array}
 */
FilterPanel._getBaseRoutes = function () {
    const Shared = getShared();
    if (Shared && Shared.getBaseRoutes) {
        return Shared.getBaseRoutes();
    }
    return [];
};

/**
 * Lit the state des filtres from the panel
 * @param {HTMLElement} panelEl
 * @returns {Object}
 */
FilterPanel._readFiltersFromPanel = function (panelEl: any) {
    const StateReader = getStateReader();
    if (StateReader && StateReader.readFiltersFromPanel) {
        return StateReader.readFiltersFromPanel(panelEl);
    }
    return {};
};

/**
 * Filtre a list de POI
 * @param {Array} basePois
 * @param {Object} filterState
 * @returns {Array}
 */
FilterPanel._filterPoiList = function (basePois: any, filterState: any) {
    const Applier = getApplier();
    if (Applier && Applier.filterPoiList) {
        return Applier.filterPoiList(basePois, filterState);
    }
    return basePois || [];
};

/**
 * Filtre a list de routes
 * @param {Array} baseRoutes
 * @param {Object} filterState
 * @returns {Array}
 */
FilterPanel._filterRouteList = function (baseRoutes: any, filterState: any) {
    const Applier = getApplier();
    if (Applier && Applier.filterRouteList) {
        return Applier.filterRouteList(baseRoutes, filterState);
    }
    return baseRoutes || [];
};

/**
 * Refreshes the layer POI
 * @param {Array} filteredPois
 */
FilterPanel._refreshPoiLayer = function (filteredPois: any) {
    const Applier = getApplier();
    if (Applier && Applier.refreshPoiLayer) {
        return Applier.refreshPoiLayer(filteredPois);
    }
};

export { FilterPanel };
