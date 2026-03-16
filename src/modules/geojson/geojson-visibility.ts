/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf GeoJSON — Layer Visibility Helpers
 * Extracted from geojson/core.ts — Sprint 1 refactoring.
 * Handles show/hide operations on individual Leaflet feature layers.
 *
 * @module geojson/geojson-visibility
 */

"use strict";

/**
 * Hides a casing (border) layer by setting its opacity to 0 or display:none.
 * @internal
 */
export function _hideCasingLayer(casingLayer: any): void {
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

/**
 * Hides a Leaflet feature layer element (marker or vector).
 * Saves original style values for later restoration.
 * @internal
 */
export function _hideLayerElement(leafletLayer: any): void {
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

/**
 * Hides a single feature layer, respecting cluster groups.
 * @internal
 */
export function _hideSingleLayer(leafletLayer: any, layerData: any, clusterGroup: any): void {
    if (clusterGroup) {
        if (!layerData._filteredOutLayers.has(leafletLayer)) {
            clusterGroup.removeLayer(leafletLayer);
            layerData._filteredOutLayers.add(leafletLayer);
        }
        return;
    }
    _hideLayerElement(leafletLayer);
}

/**
 * Restores a casing layer to its original opacity.
 * @internal
 */
export function _showCasingLayer(casingLayer: any): void {
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

/**
 * Restores a vector layer to its original style values.
 * @internal
 */
export function _restoreLayerStyle(leafletLayer: any): void {
    leafletLayer.setStyle({
        opacity: leafletLayer.options._originalOpacity,
        fillOpacity: leafletLayer.options._originalFillOpacity ?? 0,
        color: leafletLayer.options._originalColor ?? leafletLayer.options.color,
        weight: leafletLayer.options._originalWeight ?? leafletLayer.options.weight,
        dashArray: leafletLayer.options._originalDashArray ?? leafletLayer.options.dashArray,
    });
}

/**
 * Shows a Leaflet feature layer element (marker or vector).
 * @internal
 */
export function _showLayerElement(leafletLayer: any): void {
    if (leafletLayer.getElement) {
        const el = leafletLayer.getElement();
        if (el) el.style.display = "";
        if (leafletLayer._casingLayer) _showCasingLayer(leafletLayer._casingLayer);
    } else if (leafletLayer.setStyle && leafletLayer.options._originalOpacity !== undefined) {
        _restoreLayerStyle(leafletLayer);
        if (leafletLayer._casingLayer) _showCasingLayer(leafletLayer._casingLayer);
    }
}

/**
 * Shows a single feature layer, respecting cluster groups.
 * @internal
 */
export function _showSingleLayer(leafletLayer: any, layerData: any, clusterGroup: any): void {
    if (clusterGroup) {
        if (layerData._filteredOutLayers.has(leafletLayer)) {
            clusterGroup.addLayer(leafletLayer);
            layerData._filteredOutLayers.delete(leafletLayer);
        }
        return;
    }
    _showLayerElement(leafletLayer);
}
