/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf GeoJSON — Feature Filter Helpers
 * Extracted from geojson/core.ts — Sprint 1 refactoring.
 * Handles geometry-type filtering and per-feature visibility for filterFeatures().
 *
 * @module geojson/geojson-filter
 */

"use strict";

import { _hideSingleLayer, _showSingleLayer } from "./geojson-visibility.js";

/**
 * Resolves the list of layer IDs to process, optionally filtered by geometry type.
 * @internal
 */
export function _resolveGeometryFilteredIds(state: any, options: any): any[] {
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

/**
 * Applies a filter predicate to all features in a single layer,
 * showing or hiding each feature via the visibility helpers.
 * @internal
 */
export function _applyFeatureVisibilityForLayer(
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
