/**
 * GeoLeaf UI Filter Panel - Core
 * API publique et délégation vers les sous-modules
 *
 * @module ui/filter-panel/core
 */
"use strict";

import { getLog } from '../../utils/general-utils.js';
import { FilterPanelShared } from './shared.js';
import { FilterPanelStateReader } from './state-reader.js';
import { FilterPanelApplier } from './applier.js';
import { FilterPanelRenderer } from './renderer.js';
import { FilterPanelProximity } from './proximity.js';

// Direct ESM bindings (P3-DEAD-01 complete)
const getShared = () => FilterPanelShared;
const getStateReader = () => FilterPanelStateReader;
const getApplier = () => FilterPanelApplier;
const getRenderer = () => FilterPanelRenderer;
const getProximity = () => FilterPanelProximity;

const FilterPanel = {};

// ========================================
//   API PUBLIQUE - Délégation vers sous-modules
// ========================================

/**
 * Construit le panneau de filtres depuis la configuration du profil actif
 * @param {Object} options - Options
 */
FilterPanel.buildFilterPanelFromActiveProfile = function(options) {
    const Renderer = getRenderer();
    if (Renderer && Renderer.buildFilterPanelFromActiveProfile) {
        return Renderer.buildFilterPanelFromActiveProfile(options);
    }
    getLog().error("[GeoLeaf.UI.FilterPanel] Module Renderer non chargé");
};

/**
 * Bascule la visibilité du panneau de filtres
 * @param {boolean} [forceState]
 */
FilterPanel.toggleFilterPanelVisibility = function(forceState) {
    const Renderer = getRenderer();
    if (Renderer && Renderer.toggleFilterPanelVisibility) {
        return Renderer.toggleFilterPanelVisibility(forceState);
    }
};

/**
 * Initialise le bouton toggle du panneau de filtres
 */
FilterPanel.initFilterToggle = function() {
    const Renderer = getRenderer();
    if (Renderer && Renderer.initFilterToggle) {
        return Renderer.initFilterToggle();
    }
};

/**
 * Rafraîchit les badges de tags
 */
FilterPanel.refreshFilterTags = function() {
    const Renderer = getRenderer();
    if (Renderer && Renderer.refreshFilterTags) {
        return Renderer.refreshFilterTags();
    }
};

/**
 * Applique les filtres initiaux
 */
FilterPanel.applyFiltersInitial = function() {
    const Applier = getApplier();
    if (Applier && Applier.applyFiltersInitial) {
        return Applier.applyFiltersInitial();
    }
};

/**
 * Initialise le filtre de proximité
 * @param {L.Map} map
 */
FilterPanel.initProximityFilter = function(map) {
    const Proximity = getProximity();
    if (Proximity && Proximity.initProximityFilter) {
        return Proximity.initProximityFilter(map);
    }
};

/**
 * Retourne l'élément DOM du panneau de filtres
 * @returns {HTMLElement|null}
 */
FilterPanel._getFilterPanelElement = function() {
    const Shared = getShared();
    if (Shared && Shared.getFilterPanelElement) {
        return Shared.getFilterPanelElement();
    }
    return null;
};

/**
 * Récupère les POI de base
 * @returns {Array}
 */
FilterPanel._getBasePois = function() {
    const Shared = getShared();
    if (Shared && Shared.getBasePois) {
        return Shared.getBasePois();
    }
    return [];
};

/**
 * Récupère les routes de base
 * @returns {Array}
 */
FilterPanel._getBaseRoutes = function() {
    const Shared = getShared();
    if (Shared && Shared.getBaseRoutes) {
        return Shared.getBaseRoutes();
    }
    return [];
};

/**
 * Lit l'état des filtres depuis le panneau
 * @param {HTMLElement} panelEl
 * @returns {Object}
 */
FilterPanel._readFiltersFromPanel = function(panelEl) {
    const StateReader = getStateReader();
    if (StateReader && StateReader.readFiltersFromPanel) {
        return StateReader.readFiltersFromPanel(panelEl);
    }
    return {};
};

/**
 * Filtre une liste de POI
 * @param {Array} basePois
 * @param {Object} filterState
 * @returns {Array}
 */
FilterPanel._filterPoiList = function(basePois, filterState) {
    const Applier = getApplier();
    if (Applier && Applier.filterPoiList) {
        return Applier.filterPoiList(basePois, filterState);
    }
    return basePois || [];
};

/**
 * Filtre une liste de routes
 * @param {Array} baseRoutes
 * @param {Object} filterState
 * @returns {Array}
 */
FilterPanel._filterRouteList = function(baseRoutes, filterState) {
    const Applier = getApplier();
    if (Applier && Applier.filterRouteList) {
        return Applier.filterRouteList(baseRoutes, filterState);
    }
    return baseRoutes || [];
};

/**
 * Rafraîchit la couche POI
 * @param {Array} filteredPois
 */
FilterPanel._refreshPoiLayer = function(filteredPois) {
    const Applier = getApplier();
    if (Applier && Applier.refreshPoiLayer) {
        return Applier.refreshPoiLayer(filteredPois);
    }
};


export { FilterPanel };
