/**
 * GeoLeaf UI Filter Panel - Core
 * API publique et délégation vers les sous-modules
 *
 * @module ui/filter-panel/core
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Dépendances lazy
    const getLog = () => (GeoLeaf.Log || console);
    const getShared = () => GeoLeaf._UIFilterPanelShared;
    const getStateReader = () => GeoLeaf._UIFilterPanelStateReader;
    const getApplier = () => GeoLeaf._UIFilterPanelApplier;
    const getRenderer = () => GeoLeaf._UIFilterPanelRenderer;
    const getProximity = () => GeoLeaf._UIFilterPanelProximity;

    // Créer le namespace si nécessaire
    GeoLeaf._UIFilterPanel = GeoLeaf._UIFilterPanel || {};

    // ========================================
    //   API PUBLIQUE - Délégation vers sous-modules
    // ========================================

    /**
     * Construit le panneau de filtres depuis la configuration du profil actif
     * @param {Object} options - Options
     */
    GeoLeaf._UIFilterPanel.buildFilterPanelFromActiveProfile = function(options) {
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
    GeoLeaf._UIFilterPanel.toggleFilterPanelVisibility = function(forceState) {
        const Renderer = getRenderer();
        if (Renderer && Renderer.toggleFilterPanelVisibility) {
            return Renderer.toggleFilterPanelVisibility(forceState);
        }
    };

    /**
     * Initialise le bouton toggle du panneau de filtres
     */
    GeoLeaf._UIFilterPanel.initFilterToggle = function() {
        const Renderer = getRenderer();
        if (Renderer && Renderer.initFilterToggle) {
            return Renderer.initFilterToggle();
        }
    };

    /**
     * Rafraîchit les badges de tags
     */
    GeoLeaf._UIFilterPanel.refreshFilterTags = function() {
        const Renderer = getRenderer();
        if (Renderer && Renderer.refreshFilterTags) {
            return Renderer.refreshFilterTags();
        }
    };

    /**
     * Applique les filtres initiaux
     */
    GeoLeaf._UIFilterPanel.applyFiltersInitial = function() {
        const Applier = getApplier();
        if (Applier && Applier.applyFiltersInitial) {
            return Applier.applyFiltersInitial();
        }
    };

    /**
     * Initialise le filtre de proximité
     * @param {L.Map} map
     */
    GeoLeaf._UIFilterPanel.initProximityFilter = function(map) {
        const Proximity = getProximity();
        if (Proximity && Proximity.initProximityFilter) {
            return Proximity.initProximityFilter(map);
        }
    };

    /**
     * Retourne l'élément DOM du panneau de filtres
     * @returns {HTMLElement|null}
     */
    GeoLeaf._UIFilterPanel._getFilterPanelElement = function() {
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
    GeoLeaf._UIFilterPanel._getBasePois = function() {
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
    GeoLeaf._UIFilterPanel._getBaseRoutes = function() {
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
    GeoLeaf._UIFilterPanel._readFiltersFromPanel = function(panelEl) {
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
    GeoLeaf._UIFilterPanel._filterPoiList = function(basePois, filterState) {
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
    GeoLeaf._UIFilterPanel._filterRouteList = function(baseRoutes, filterState) {
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
    GeoLeaf._UIFilterPanel._refreshPoiLayer = function(filteredPois) {
        const Applier = getApplier();
        if (Applier && Applier.refreshPoiLayer) {
            return Applier.refreshPoiLayer(filteredPois);
        }
    };

})(window);
