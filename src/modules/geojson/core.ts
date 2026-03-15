/* eslint-disable security/detect-object-injection */
/**

 * GeoLeaf GeoJSON Module - Aggregator

 * Main module that delegates to specialized sub-modules

 *

 * Architecture Phase 3.5:

 * - geojson/shared.js        : Shared state, constants, STYLE_OPERATORS

 * - geojson/style-resolver.js: styleRules evaluation, buildLeafletOptions

 * - geojson/layer-manager.js : Gestion layers (show/hide/toggle/remove)

 * - geojson/loader.js        : Loadsment (loadUrl, loadFromActiveProfile)

 * - geojson/popup-tooltip.js : Unified popups and tooltips

 * - geojson/clustering.js    : Clustering strategies

 *

 * @module geoleaf.geojson

 */

"use strict";

import { Log } from "../log/index.js";

import { GeoJSONShared as SharedModule } from "./shared.ts";

import { GeoJSONStyleResolver } from "./style-resolver.js";

import { PopupTooltip as _PopupTooltip } from "./popup-tooltip.js";

import { GeoJSONClustering } from "./clustering.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

// ========================================

//   GETTERS LAZY POUR SOUS-MODULES

// ========================================

const getState = () => SharedModule.state;

const getLayerManager = () => _g.GeoLeaf && _g.GeoLeaf._GeoJSONLayerManager;

const getLoader = () => _g.GeoLeaf && _g.GeoLeaf._GeoJSONLoader;

function _validateZoomOnFit(options: any, g: any): void {
    if (
        typeof options.maxZoomOnFit !== "number" ||
        options.maxZoomOnFit < 1 ||
        options.maxZoomOnFit > 20
    ) {
        Log.warn("[GeoLeaf.GeoJSON] options.maxZoomOnFit must be a number between 1 and 20.");

        options.maxZoomOnFit =
            g.GeoLeaf && g.GeoLeaf.CONSTANTS ? g.GeoLeaf.CONSTANTS.GEOJSON_MAX_ZOOM_ON_FIT : 18;
    }
}

function _resolveMapFromOptions(options: any, g: any): any {
    return g.GeoLeaf && g.GeoLeaf.Utils
        ? g.GeoLeaf.Utils.ensureMap(options.map)
        : options.map || null;
}

function _mergeInitOptions(current: any, incoming: any, g: any): any {
    return g.GeoLeaf && g.GeoLeaf.Utils && g.GeoLeaf.Utils.mergeOptions
        ? g.GeoLeaf.Utils.mergeOptions(current, incoming)
        : Object.assign({}, current, incoming);
}

function _hideCasingLayer(casingLayer: any): void {
    const el = casingLayer.getElement?.();

    if (el) {
        el.style.display = "none";
        return;
    }

    if (typeof casingLayer.setStyle === "function") {
        if (casingLayer.options._originalCasingOpacity === undefined) {
            casingLayer.options._originalCasingOpacity = casingLayer.options.opacity;
        }

        casingLayer.setStyle({ opacity: 0 });
    }
}

function _hideLayerElement(leafletLayer: any): void {
    if (leafletLayer.getElement) {
        const el = leafletLayer.getElement();

        if (el) el.style.display = "none";

        if (leafletLayer._casingLayer) _hideCasingLayer(leafletLayer._casingLayer);
    } else if (leafletLayer.setStyle) {
        if (leafletLayer.options._originalOpacity === undefined) {
            leafletLayer.options._originalOpacity = leafletLayer.options.opacity;

            leafletLayer.options._originalFillOpacity = leafletLayer.options.fillOpacity;

            leafletLayer.options._originalColor = leafletLayer.options.color;

            leafletLayer.options._originalWeight = leafletLayer.options.weight;

            leafletLayer.options._originalDashArray = leafletLayer.options.dashArray;
        }

        leafletLayer.setStyle({ opacity: 0, fillOpacity: 0 });

        if (leafletLayer._casingLayer) _hideCasingLayer(leafletLayer._casingLayer);
    }
}

function _hideSingleLayer(leafletLayer: any, layerData: any, clusterGroup: any): void {
    if (clusterGroup) {
        if (!layerData._filteredOutLayers.has(leafletLayer)) {
            clusterGroup.removeLayer(leafletLayer);

            layerData._filteredOutLayers.add(leafletLayer);
        }

        return;
    }

    _hideLayerElement(leafletLayer);
}

function _showCasingLayer(casingLayer: any): void {
    const el = casingLayer.getElement?.();

    if (el) {
        el.style.display = "";
        return;
    }

    if (typeof casingLayer.setStyle === "function") {
        const origOpacity = casingLayer.options._originalCasingOpacity;

        casingLayer.setStyle({ opacity: origOpacity !== undefined ? origOpacity : 1 });
    }
}

function _restoreLayerStyle(leafletLayer: any): void {
    leafletLayer.setStyle({
        opacity: leafletLayer.options._originalOpacity,

        fillOpacity: leafletLayer.options._originalFillOpacity ?? 0,

        color: leafletLayer.options._originalColor ?? leafletLayer.options.color,

        weight: leafletLayer.options._originalWeight ?? leafletLayer.options.weight,

        dashArray: leafletLayer.options._originalDashArray ?? leafletLayer.options.dashArray,
    });
}

function _showLayerElement(leafletLayer: any): void {
    if (leafletLayer.getElement) {
        const el = leafletLayer.getElement();

        if (el) el.style.display = "";

        if (leafletLayer._casingLayer) _showCasingLayer(leafletLayer._casingLayer);
    } else if (leafletLayer.setStyle && leafletLayer.options._originalOpacity !== undefined) {
        _restoreLayerStyle(leafletLayer);

        if (leafletLayer._casingLayer) _showCasingLayer(leafletLayer._casingLayer);
    }
}

function _showSingleLayer(leafletLayer: any, layerData: any, clusterGroup: any): void {
    if (clusterGroup) {
        if (layerData._filteredOutLayers.has(leafletLayer)) {
            clusterGroup.addLayer(leafletLayer);

            layerData._filteredOutLayers.delete(leafletLayer);
        }

        return;
    }

    _showLayerElement(leafletLayer);
}

function _setupGeoJSONPanes(map: any, PaneConfig: any, PaneHelpers: any): void {
    const basemapPane = map.createPane(PaneConfig.BASEMAP_NAME);

    basemapPane.style.zIndex = PaneConfig.BASEMAP_ZINDEX;

    const _createdPanes = new Set();

    const _origGetPaneName = PaneHelpers.getPaneName.bind(PaneHelpers);

    (PaneHelpers as any).getOrCreatePane = function (zIndex: any, map: any) {
        const paneName = _origGetPaneName(zIndex);

        if (!_createdPanes.has(paneName)) {
            const pane = map.createPane(paneName);

            pane.style.zIndex = PaneConfig.LAYER_BASE_ZINDEX + zIndex;

            pane.style.pointerEvents = "none";

            _createdPanes.add(paneName);
        }

        return paneName;
    };

    (PaneHelpers as any).enablePaneInteraction = function (zIndex: any, map: any) {
        const paneName = _origGetPaneName(zIndex);

        const pane = map.getPane(paneName);

        if (pane) {
            pane.style.pointerEvents = "auto";
        }
    };

    Log.info(
        `[GeoLeaf.GeoJSON] Basemap pane created: ${PaneConfig.BASEMAP_NAME} (z:${PaneConfig.BASEMAP_ZINDEX}). GeoJSON layers: panes created on demand.`
    );
}

function _setupLayerGroupsAndZoom(state: any): void {
    state.layerGroup = _g.L.featureGroup().addTo(state.map);

    state.layers = new Map();

    const LayerManager = getLayerManager();

    if (LayerManager) {
        state.map.on("zoomend", () => {
            LayerManager.updateLayerVisibilityByZoom();
        });
    }
}

function _resolveGeometryFilteredIds(state: any, options: any): any[] {
    const layerIds: any[] = options.layerIds
        ? Array.isArray(options.layerIds)
            ? options.layerIds
            : [options.layerIds]
        : Array.from(state.layers.keys());

    if (!options.geometryType) return layerIds;

    const geoType = options.geometryType.toLowerCase();

    const typeAliases: any = {
        poi: "point",
        route: "line",
        linestring: "line",
        area: "polygon",
    };

    const normalizedType = typeAliases[geoType] || geoType;

    return layerIds.filter((id) => {
        const data = state.layers.get(id);

        if (!data) return false;

        const layerGeoType = (data.geometryType || "").toLowerCase();

        const normalizedLayerType = typeAliases[layerGeoType] || layerGeoType;

        return normalizedLayerType === normalizedType;
    });
}

function _applyFeatureVisibilityForLayer(
    layerData: any,
    filterFn: any,
    layerId: any,
    stats: any
): void {
    const isLineLayer = ["line", "linestring", "polyline"].includes(
        (layerData.geometryType || "").toLowerCase()
    );

    const bypassFilter =
        layerData.config?.search?.enabled === false ||
        (isLineLayer && layerData.config?.search?.enabled !== true);

    if (!layerData._filteredOutLayers) {
        layerData._filteredOutLayers = new Set();
    }

    const toShow: any[] = [];

    const toHide: any[] = [];

    layerData.layer.eachLayer((leafletLayer: any) => {
        if (!leafletLayer.feature) return;

        stats.total++;

        const shouldShow = bypassFilter || filterFn(leafletLayer.feature, layerId);

        if (shouldShow) {
            toShow.push(leafletLayer);

            stats.visible++;
        } else {
            toHide.push(leafletLayer);

            stats.filtered++;
        }
    });

    const clusterGroup = layerData.clusterGroup;

    toHide.forEach((leafletLayer) => {
        leafletLayer._geoleafFiltered = true;

        _hideSingleLayer(leafletLayer, layerData, clusterGroup);
    });

    toShow.forEach((leafletLayer) => {
        leafletLayer._geoleafFiltered = false;

        _showSingleLayer(leafletLayer, layerData, clusterGroup);
    });
}

const GeoJSONModule = {
    /**

     * Getters for direct state access (compatibility)

     */

    get _map() {
        return getState() ? getState().map : null;
    },

    get _layerGroup() {
        return getState() ? getState().layerGroup : null;
    },

    get _geoJsonLayer() {
        return getState() ? getState().geoJsonLayer : null;
    },

    get _layers() {
        return getState() ? getState().layers : new Map();
    },

    get _options() {
        return getState() ? getState().options : {};
    },

    /**

     * Validates options passed to init()

     * @param {Object} options

     * @private

     */

    _validateOptions(options: any) {
        if (options.map && typeof options.map.addLayer !== "function") {
            Log.warn("[GeoLeaf.GeoJSON] options.map does not appear to be a valid Leaflet map.");
        }

        if (options.defaultStyle && typeof options.defaultStyle !== "object") {
            Log.warn("[GeoLeaf.GeoJSON] options.defaultStyle must be an object.");

            delete options.defaultStyle;
        }

        if (options.onEachFeature && typeof options.onEachFeature !== "function") {
            Log.warn("[GeoLeaf.GeoJSON] options.onEachFeature must be a function.");

            delete options.onEachFeature;
        }

        if (options.pointToLayer && typeof options.pointToLayer !== "function") {
            Log.warn("[GeoLeaf.GeoJSON] options.pointToLayer must be a function.");

            delete options.pointToLayer;
        }

        if (options.maxZoomOnFit !== undefined) _validateZoomOnFit(options, _g);

        return options;
    },

    /**

     * Initialise the module GeoJSON.

     *

     * @param {Object} options

     * @param {L.Map} [options.map] - Carte Leaflet. Si absent, tentative via GeoLeaf.Core.getMap().

     * @param {Object} [options.defaultStyle]

     * @param {Object} [options.defaultPointStyle]

     * @param {Function} [options.onEachFeature]

     * @param {Function} [options.pointToLayer]

     * @param {boolean} [options.fitBoundsOnLoad]

     * @param {number} [options.maxZoomOnFit]

     * @returns {L.GeoJSON|null} - The GeoJSON layer or null on failure.

     */

    init(options: any = {}) {
        const state = getState();

        if (!state) {
            Log.error("[GeoLeaf.GeoJSON] shared.js module not loaded.");

            return null;
        }

        // Validation

        options = this._validateOptions(options);

        if (typeof _g.L === "undefined" || !_g.L || typeof _g.L.geoJSON !== "function") {
            Log.error("[GeoLeaf.GeoJSON] Leaflet (L) is required but not found.");

            return null;
        }

        // Use shared helper

        const map = _resolveMapFromOptions(options, _g);

        if (!map) {
            Log.error(
                "[GeoLeaf.GeoJSON] No Leaflet map available. Pass a map instance in init({ map })."
            );

            return null;
        }

        state.map = map;

        // Fusionner les options

        state.options = _mergeInitOptions(state.options, options, _g);

        // Create panes and layer groups

        _setupGeoJSONPanes(state.map, SharedModule.PANE_CONFIG, SharedModule.PaneHelpers);

        _setupLayerGroupsAndZoom(state);

        // LEGACY: Create empty GeoJSON layer (for compatibility)

        const StyleResolver = GeoJSONStyleResolver;

        const leafletOptions = StyleResolver
            ? StyleResolver.buildLeafletOptions(state.options as any)
            : {};

        (state as any).geoJsonLayer = _g.L.geoJSON(null, leafletOptions);

        (state as any).geoJsonLayer.addTo(state.layerGroup);

        Log.info("[GeoLeaf.GeoJSON] Module initialized in multi-layer mode");

        return state.geoJsonLayer;
    },

    /**

     * Returns the GeoJSON layer maine (LEGACY).

     * @returns {L.GeoJSON|null}

     */

    getLayer() {
        const state = getState();

        return state ? state.geoJsonLayer : null;
    },

    // ========================================

    //   DELEGATION TO LAYER MANAGER

    // ========================================

    getLayerById(layerId: any) {
        const LayerManager = getLayerManager();

        return LayerManager ? LayerManager.getLayerById(layerId) : null;
    },

    getLayerData(layerId: any) {
        const LayerManager = getLayerManager();

        return LayerManager ? LayerManager.getLayerData(layerId) : null;
    },

    getAllLayers() {
        const LayerManager = getLayerManager();

        return LayerManager ? LayerManager.getAllLayers() : [];
    },

    showLayer(layerId: any) {
        const LayerManager = getLayerManager();

        if (LayerManager) LayerManager.showLayer(layerId);
    },

    hideLayer(layerId: any) {
        const LayerManager = getLayerManager();

        if (LayerManager) LayerManager.hideLayer(layerId);
    },

    toggleLayer(layerId: any) {
        const LayerManager = getLayerManager();

        if (LayerManager) LayerManager.toggleLayer(layerId);
    },

    removeLayer(layerId: any) {
        const LayerManager = getLayerManager();

        if (LayerManager) LayerManager.removeLayer(layerId);
    },

    updateLayerZIndex(layerId: any, newZIndex: any) {
        const LayerManager = getLayerManager();

        return LayerManager ? LayerManager.updateLayerZIndex(layerId, newZIndex) : false;
    },

    setLayerStyle(layerId: any, styleConfig: any) {
        const LayerManager = getLayerManager();

        return LayerManager ? LayerManager.setLayerStyle(layerId, styleConfig) : false;
    },

    // ========================================

    //   DELEGATION TO LOADER

    // ========================================

    loadUrl(url: any, options = {}) {
        const Loader = getLoader();

        return Loader ? Loader.loadUrl(url, options) : Promise.resolve(null);
    },

    addData(geojsonData: any, options = {}) {
        const Loader = getLoader();

        if (Loader) Loader.addData(geojsonData, options);
    },

    loadFromActiveProfile(options = {}) {
        const Loader = getLoader();

        return Loader ? Loader.loadFromActiveProfile(options) : Promise.resolve([]);
    },

    // ========================================

    //   FILTRAGE DES FEATURES

    // ========================================

    /**

     * Filtre les features de toutes les GeoJSON layers.

     * Shows only features that pass the predicate.

     *

     * @param {Function} filterFn - Fonction (feature, layerId) => boolean

     * @param {Object} [options] - Additional options

     * @returns {Object} - { filtered: number, total: number, visible: number }

     */

    filterFeatures(filterFn: any, options: any = {}) {
        const state = getState();

        if (typeof filterFn !== "function") {
            Log.warn("[GeoLeaf.GeoJSON] filterFeatures: filterFn must be a function");

            return { filtered: 0, total: 0, visible: 0 };
        }

        const stats = { filtered: 0, total: 0, visible: 0 };

        const layerIds = _resolveGeometryFilteredIds(state, options);

        layerIds.forEach((layerId) => {
            const layerData = state.layers.get(layerId);

            if (!layerData || !layerData.layer) return;

            _applyFeatureVisibilityForLayer(layerData, filterFn, layerId, stats);
        });

        Log.debug(
            `[GeoLeaf.GeoJSON] filterFeatures: ${stats.visible}/${stats.total} visible features`
        );

        return stats;
    },

    /**

     * Resets the feature filter (shows all).

     *

     * @param {Object} [options] - Same options as filterFeatures

     */

    clearFeatureFilter(options = {}) {
        return this.filterFeatures(() => true, options);
    },

    /**

     * Returns all loaded features.

     * Reads directly from state.layers (featureCache removed in Sprint 1).

     * @param {Object} [options]

     * @returns {Array<Object>} features GeoJSON enrichies de { _layerId }

     */

    getFeatures(options: any = {}) {
        const state = getState();

        if (!state) return [];

        const geometrySet = Array.isArray(options.geometryTypes)
            ? new Set(options.geometryTypes.map((t: any) => t.toLowerCase()))
            : null;

        const layerSet = Array.isArray(options.layerIds) ? new Set(options.layerIds) : null;

        const result: any[] = [];

        state.layers.forEach((layerData, layerId) => {
            if (layerSet && !layerSet.has(layerId)) return;

            const geoType = (layerData.geometryType || "").toLowerCase();

            if (geometrySet && !geometrySet.has(geoType)) return;

            (layerData.features || []).forEach((f: any) => {
                if (f && typeof f === "object") {
                    // Shallow tag with _layerId instead of full Object.assign clone

                    f._layerId = layerId;

                    result.push(f);
                }
            });
        });

        return result;
    },

    /**

     * Removes all GeoJSON entities from the legacy layer.

     */

    clear() {
        const state = getState();

        if (state && (state as any).geoJsonLayer) {
            (state as any).geoJsonLayer.clearLayers();
        }
    },

    // ========================================

    //   EXPOSED INTERNAL METHODS

    // ========================================

    _updateLayerVisibilityByZoom() {
        const LayerManager = getLayerManager();

        if (LayerManager) LayerManager.updateLayerVisibilityByZoom();
    },

    _registerWithLayerManager() {
        const LayerManager = getLayerManager();

        if (LayerManager) LayerManager.registerWithLayerManager();
    },

    _convertFeatureToPOI(feature: any, def: any) {
        const pt = _g.GeoLeaf && _g.GeoLeaf._GeoJSONPopupTooltip;

        return pt ? pt.convertFeatureToPOI(feature, def) : null;
    },

    _getClusteringStrategy(def: any, geojsonData: any) {
        const Clustering = GeoJSONClustering;

        return Clustering
            ? Clustering.getClusteringStrategy(def, geojsonData)
            : { shouldCluster: false, useSharedCluster: false };
    },

    _getSharedPOICluster() {
        const Clustering = GeoJSONClustering;

        return Clustering ? Clustering.getSharedPOICluster() : null;
    },

    _getPoiConfig() {
        const Clustering = GeoJSONClustering;

        return Clustering ? Clustering.getPoiConfig() : {};
    },

    _detectLayerType(layer: any) {
        const LayerManager = getLayerManager();

        return LayerManager ? LayerManager.detectLayerType(layer) : "mixed";
    },

    _buildLeafletOptions(options: any) {
        const StyleResolver = GeoJSONStyleResolver;

        return StyleResolver ? StyleResolver.buildLeafletOptions(options) : {};
    },
};

// Exposes _StyleRules for compatibility with the Themes module

// (already done in style-resolver.js, but we ensure it is accessible)

if (_g.GeoLeaf && !_g.GeoLeaf._StyleRules && GeoJSONStyleResolver) {
    _g.GeoLeaf._StyleRules = {
        evaluate: GeoJSONStyleResolver.evaluateStyleRules,

        operators: SharedModule ? SharedModule.STYLE_OPERATORS : {},

        getNestedValue: GeoJSONStyleResolver.getNestedValue,
    };
}

const GeoJSONCore = GeoJSONModule;

export { GeoJSONCore };
