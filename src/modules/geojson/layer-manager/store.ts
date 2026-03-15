/**
 * GeoLeaf GeoJSON Layer Manager - Store
 * Layer CRUD operations: get, query, remove, z-index
 *
 * @module geojson/layer-manager/store
 */
"use strict";

import { GeoJSONShared } from "../shared.js";
import { getLog } from "../../utils/general-utils.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

const getState = () => GeoJSONShared.state;

const LayerManager: any = {};

/**
 * Retrieves a layer specific par son ID.
 *
 * @param {string} layerId - ID de the layer
 * @returns {Object|null} - { id, label, layer, visible, config, clusterGroup } ou null
 */
LayerManager.getLayerById = function (layerId: any) {
    const state = getState();
    return state.layers.get(layerId) || null;
};

/**
 * Retrieves thes data d'a layer (geojson, geometryType, config).
 * Used by the Themes module to apply styles.
 *
 * @param {string} layerId - ID de the layer
 * @returns {Object|null} - { geojson, geometryType, config } ou null
 */
LayerManager.getLayerData = function (layerId: any) {
    const state = getState();
    const layerData = state.layers.get(layerId);
    if (!layerData) return null;

    return {
        geojson: layerData.geojson || null,
        features: layerData.features || [],
        geometryType: layerData.geometryType || "unknown",
        config: layerData.config || {},
        layer: layerData.layer,
    };
};

/**
 * Retrieves toutes the layers loadedes.
 *
 * @returns {Array<Object>} - Array de { id, label, visible, type, featureCount }
 *
 * Note: 'visible' returnne the state LOGIQUE de the layer (activatede/deactivatede par l'user ou the theme),
 * pas the state physical sur the map (qui can be hidden par le zoom).
 * This is the state that must be reflected by the ON/OFF toggle button.
 */
LayerManager.getAllLayers = function () {
    const state = getState();
    const _Log = getLog();
    const layers: any[] = [];
    state.layers.forEach((layerData, id) => {
        // Utiliser logicalState qui est independent du zoom
        const meta = layerData._visibility;
        const logicalVisible =
            meta && typeof meta.logicalState === "boolean"
                ? meta.logicalState
                : layerData.visible || false;

        layers.push({
            id: id,
            label: layerData.label,
            visible: logicalVisible,
            // Perf 6.1.2: Use cached geometryType instead of O(n) detectLayerType() per call
            type: layerData.geometryType || LayerManager.detectLayerType(layerData.layer),
            featureCount: layerData.features
                ? layerData.features.length
                : layerData.layer
                  ? layerData.layer.getLayers().length
                  : 0,
        });
    });
    return layers;
};

/**
 * Detects the type of geometry dominant d'a layer.
 *
 * @param {L.GeoJSON} layer
 * @returns {string} - "poi", "route", "area", ou "mixed"
 */
LayerManager.detectLayerType = function (layer: any) {
    if (!layer || typeof layer.eachLayer !== "function") return "mixed";

    const types = { Point: 0, LineString: 0, Polygon: 0 };

    layer.eachLayer((l: any) => {
        if (l.feature && l.feature.geometry) {
            const geomType = l.feature.geometry.type;
            if (geomType.includes("Point")) types.Point++;
            else if (geomType.includes("LineString")) types.LineString++;
            else if (geomType.includes("Polygon")) types.Polygon++;
        }
    });

    const max = Math.max(types.Point, types.LineString, types.Polygon);
    if (max === 0) return "mixed";
    if (types.Point === max) return "poi";
    if (types.LineString === max) return "route";
    if (types.Polygon === max) return "area";
    return "mixed";
};

/**
 * Removes ae layer.
 *
 * @param {string} layerId - ID de the layer
 */
LayerManager.removeLayer = function (layerId: any) {
    const state = getState();
    const Log = getLog();
    const layerData = state.layers.get(layerId);

    if (!layerData) {
        Log.warn("[GeoLeaf.GeoJSON] removeLayer: layer not found:", layerId);
        return;
    }

    // Retirer de the map
    if (layerData.visible) {
        LayerManager.hideLayer(layerId);
    }

    // Destroy Leaflet objects
    if (layerData.clusterGroup) {
        layerData.clusterGroup.clearLayers();
    }
    if (layerData.layer) {
        layerData.layer.clearLayers();
    }

    // Retirer de la Map
    state.layers.delete(layerId);
    // featureCache removed (Sprint 1)

    Log.debug("[GeoLeaf.GeoJSON] Layer removed:", layerId);
};

/**
 * Updates the zIndex d'a layer (ordre d'emstackment sur the map).
 */
function _removeLayerOrCluster(state: any, layerData: any): void {
    if (layerData.clusterGroup) {
        state.map.removeLayer(layerData.clusterGroup);
    } else {
        state.map.removeLayer(layerData.layer);
    }
}

function _addLayerOrCluster(state: any, layerData: any): void {
    if (layerData.clusterGroup) {
        state.map.addLayer(layerData.clusterGroup);
    } else {
        state.map.addLayer(layerData.layer);
    }
}

function _moveLayerToPane(state: any, layerData: any, newPaneName: string): void {
    if (!layerData.layer?.options) return;
    layerData.layer.options.pane = newPaneName;
    layerData.layer.eachLayer((subLayer: any) => {
        if (subLayer.options) subLayer.options.pane = newPaneName;
        if (subLayer._path?.parentNode) {
            state.map.getPane(newPaneName)?.appendChild(subLayer._path);
        }
    });
    if (layerData.clusterGroup?.options) {
        layerData.clusterGroup.options.pane = newPaneName;
    }
}

LayerManager.updateLayerZIndex = function (layerId: any, newZIndex: any) {
    const state = getState();
    const Log = getLog();
    const layerData = state.layers.get(layerId);

    if (!layerData) {
        Log.warn("[GeoLeaf.GeoJSON] updateLayerZIndex: layer not found:", layerId);
        return false;
    }

    const PaneHelpers = GeoJSONShared.PaneHelpers;
    newZIndex = PaneHelpers.validateZIndex(newZIndex);

    const oldZIndex = layerData.config.zIndex || 0;
    if (oldZIndex === newZIndex) {
        Log.debug("[GeoLeaf.GeoJSON] updateLayerZIndex: identical zIndex, no change:", layerId);
        return true;
    }

    Log.info(`[GeoLeaf.GeoJSON] zIndex change for ${layerId}: ${oldZIndex} → ${newZIndex}`);
    layerData.config.zIndex = newZIndex;

    const VisPool = _g.GeoLeaf?._LayerVisibilityManager;
    const visState = VisPool ? VisPool.getVisibilityState(layerId) : null;
    const isVisible = visState ? visState.current : layerData.visible;

    if (!isVisible) {
        Log.debug("[GeoLeaf.GeoJSON] Layer not visible, zIndex updated in config only");
        return true;
    }

    const newPaneName = PaneHelpers.getPaneName(newZIndex);
    const newPane = state.map.getPane(newPaneName);
    if (!newPane) {
        Log.error(`[GeoLeaf.GeoJSON] Pane ${newPaneName} not found`);
        return false;
    }

    try {
        _removeLayerOrCluster(state, layerData);
        _moveLayerToPane(state, layerData, newPaneName);
        _addLayerOrCluster(state, layerData);
        Log.debug(`[GeoLeaf.GeoJSON] Layer ${layerId} moved to pane ${newPaneName}`);
        if (state.map) {
            state.map.fire("geoleaf:geojson:zindex-changed", { layerId, oldZIndex, newZIndex });
        }
        return true;
    } catch (error) {
        Log.error(`[GeoLeaf.GeoJSON] Error changing zIndex for ${layerId}:`, error);
        return false;
    }
};

export { LayerManager as LayerManagerStore };
