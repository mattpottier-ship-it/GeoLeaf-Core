/**
 * GeoLeaf GeoJSON — Feature Filter
 * Filtrage et retrieval des features des GeoJSON layers.
 *
 * Extrait de geojson/core.ts (split Sprint 1 roadmap).
 *
 * @module geoleaf.geojson.feature-filter
 */
"use strict";

import { Log } from "../log/index.js";
import { GeoJSONShared as SharedModule } from "./shared.ts";

const getState = () => SharedModule.state;

function _restoreCasingLayer(casingLayer: any): void {
    const casingEl = casingLayer.getElement?.();
    if (casingEl) {
        casingEl.style.display = "";
        return;
    }
    if (typeof casingLayer.setStyle !== "function") return;
    const orig = casingLayer.options._originalCasingOpacity;
    casingLayer.setStyle({ opacity: orig !== undefined ? orig : 1 });
}

function _buildRestoredStyle(o: any): object {
    return {
        opacity: o._originalOpacity,
        fillOpacity: o._originalFillOpacity ?? 0,
        color: o._originalColor ?? o.color,
        weight: o._originalWeight ?? o.weight,
        dashArray: o._originalDashArray ?? o.dashArray,
    };
}

function _hideCasingLayer(casingLayer: any): void {
    const casingEl = casingLayer.getElement?.();
    if (casingEl) {
        casingEl.style.display = "none";
        return;
    }
    if (typeof casingLayer.setStyle !== "function") return;
    if (casingLayer.options._originalCasingOpacity === undefined) {
        casingLayer.options._originalCasingOpacity = casingLayer.options.opacity;
    }
    casingLayer.setStyle({ opacity: 0 });
}

function _saveLayerStyle(options: any): void {
    if (options._originalOpacity !== undefined) return;
    options._originalOpacity = options.opacity;
    options._originalFillOpacity = options.fillOpacity;
    options._originalColor = options.color;
    options._originalWeight = options.weight;
    options._originalDashArray = options.dashArray;
}

function _hideLeafletLayer(leafletLayer: any): void {
    if (leafletLayer.getElement) {
        const el = leafletLayer.getElement();
        if (el) el.style.display = "none";
        if (leafletLayer._casingLayer) _hideCasingLayer(leafletLayer._casingLayer);
    } else if (leafletLayer.setStyle) {
        _saveLayerStyle(leafletLayer.options);
        leafletLayer.setStyle({ opacity: 0, fillOpacity: 0 });
        if (leafletLayer._casingLayer) _hideCasingLayer(leafletLayer._casingLayer);
    }
}

function _showLeafletLayer(leafletLayer: any): void {
    if (leafletLayer.getElement) {
        const el = leafletLayer.getElement();
        if (el) el.style.display = "";
        if (leafletLayer._casingLayer) _restoreCasingLayer(leafletLayer._casingLayer);
    } else if (leafletLayer.setStyle && leafletLayer.options._originalOpacity !== undefined) {
        leafletLayer.setStyle(_buildRestoredStyle(leafletLayer.options));
        if (leafletLayer._casingLayer) _restoreCasingLayer(leafletLayer._casingLayer);
    }
}

/**
 * Filtre les features de toutes les GeoJSON layers.
 * Shows only features that pass the predicate.
 *
 * @param {Function} filterFn - Fonction (feature, layerId) => boolean
 * @param {Object} [options] - Additional options
 * @returns {Object} - { filtered: number, total: number, visible: number }
 */
function _resolveLayerIds(state: any, options: any): any[] {
    const typeAliases: any = { poi: "point", route: "line", linestring: "line", area: "polygon" };
    let layerIds: any[] = options.layerIds
        ? Array.isArray(options.layerIds)
            ? options.layerIds
            : [options.layerIds]
        : Array.from(state.layers.keys());
    if (options.geometryType) {
        const normalizedType =
            typeAliases[options.geometryType.toLowerCase()] || options.geometryType.toLowerCase();
        layerIds = layerIds.filter((id) => {
            const data = state.layers.get(id);
            if (!data) return false;
            const normalizedLayerType =
                typeAliases[(data.geometryType || "").toLowerCase()] ||
                (data.geometryType || "").toLowerCase();
            return normalizedLayerType === normalizedType;
        });
    }
    return layerIds;
}

function _processLayerVisibility(layerData: any, layerId: any, filterFn: any, stats: any): void {
    if (!layerData.layer) return;
    const isLineLayer = ["line", "linestring", "polyline"].includes(
        (layerData.geometryType || "").toLowerCase()
    );
    const bypassFilter =
        layerData.config?.search?.enabled === false ||
        (isLineLayer && layerData.config?.search?.enabled !== true);
    if (!layerData._filteredOutLayers) layerData._filteredOutLayers = new Set();
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
        if (clusterGroup) {
            if (!layerData._filteredOutLayers.has(leafletLayer)) {
                clusterGroup.removeLayer(leafletLayer);
                layerData._filteredOutLayers.add(leafletLayer);
            }
        } else {
            _hideLeafletLayer(leafletLayer);
        }
    });
    toShow.forEach((leafletLayer) => {
        leafletLayer._geoleafFiltered = false;
        if (clusterGroup) {
            if (layerData._filteredOutLayers.has(leafletLayer)) {
                clusterGroup.addLayer(leafletLayer);
                layerData._filteredOutLayers.delete(leafletLayer);
            }
        } else {
            _showLeafletLayer(leafletLayer);
        }
    });
}

function filterFeatures(filterFn: any, options: any = {}) {
    const state = getState();
    if (typeof filterFn !== "function") {
        Log.warn("[GeoLeaf.GeoJSON] filterFeatures: filterFn must be a function");
        return { filtered: 0, total: 0, visible: 0 };
    }

    const stats = { filtered: 0, total: 0, visible: 0 };
    const layerIds = _resolveLayerIds(state, options);

    layerIds.forEach((layerId) => {
        const layerData = state.layers.get(layerId);
        if (!layerData) return;
        _processLayerVisibility(layerData, layerId, filterFn, stats);
    });

    Log.debug(
        `[GeoLeaf.GeoJSON] filterFeatures: ${stats.visible}/${stats.total} features visibles`
    );
    return stats;
}

/**
 * Resets the feature filter (shows all).
 *
 * @param {Object} [options] - Same options as filterFeatures
 */
function clearFeatureFilter(options: any = {}) {
    return filterFeatures(() => true, options);
}

/**
 * Returns all loaded features.
 * Reads directly from state.layers (featureCache removed in Sprint 1).
 * @param {Object} [options]
 * @returns {Array<Object>} features GeoJSON enrichies de { _layerId }
 */
function getFeatures(options: any = {}) {
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
}

export { filterFeatures, clearFeatureFilter, getFeatures };
