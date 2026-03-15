/**
 * GeoLeaf GeoJSON Layer Manager - Style
 * Style normalization, hatch patterns, style application
 *
 * @module geojson/layer-manager/style
 */
"use strict";

import { normalizeStyleToLeaflet } from "../style-utils.js";
import { GeoJSONShared } from "../shared.js";
import { getLog } from "../../utils/general-utils.js";
import { _createHatchPattern, _findLayerSvg, _applyHatchToLayer } from "./hatch-pattern.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

const getState = () => GeoJSONShared.state;

const LayerManager: any = {};

// ── _normalizeStyleToLeaflet helpers ─────────────────────────────────────

function _buildNormalizedCasing(style: any, normalized: any): void {
    if (!style.casing?.enabled) return;
    normalized._casing = {
        enabled: true,
        color: style.casing.color || "#000000",
        opacity: typeof style.casing.opacity === "number" ? style.casing.opacity : 1.0,
        weight: typeof style.casing.widthPx === "number" ? style.casing.widthPx : 1.0,
        dashArray: style.casing.dashArray || null,
        lineCap: style.casing.lineCap || null,
        lineJoin: style.casing.lineJoin || null,
    };
}

function _buildNormalizedHatch(style: any, layerId: any, normalized: any): void {
    if (!style.hatch) return;
    normalized.hatch = { ...style.hatch };
    if (style.hatch.stroke) {
        const hs: any = {};
        if (style.hatch.stroke.color) hs.color = style.hatch.stroke.color;
        if (typeof style.hatch.stroke.opacity === "number") hs.opacity = style.hatch.stroke.opacity;
        if (typeof style.hatch.stroke.widthPx === "number") hs.widthPx = style.hatch.stroke.widthPx;
        normalized.hatch.stroke = hs;
    }
    if (!style.hatch.enabled || !layerId) return;
    const patternId = _createHatchPattern(layerId, style.hatch);
    if (!patternId) return;
    normalized._hatchPatternId = patternId;
    if (style.hatch.renderMode === "pattern_only") {
        normalized.fillColor = "transparent";
        normalized.fillOpacity = 1;
    }
}

// ── eachLayer callback helpers ────────────────────────────────────────────

function _applyPointerEvents(layer: any, isInteractive: boolean): void {
    if (layer._path) {
        layer._path.style.pointerEvents = isInteractive ? "auto" : "none";
        return;
    }
    if (layer._renderer && typeof layer.redraw === "function") layer.redraw();
}

function _applyInteractiveState(layer: any, layerData: any, _g2: any): void {
    const cfg = layerData.config;
    const isInteractive =
        typeof cfg.interactiveShape === "boolean"
            ? cfg.interactiveShape
            : _g2.GeoLeaf?.Config?.get
              ? _g2.GeoLeaf.Config.get("ui.interactiveShapes", false)
              : false;
    if (layer.options) layer.options.interactive = isInteractive;
    _applyPointerEvents(layer, isInteractive);
}

function _createCasingLayer(layer: any, casingConfig: any, leafletLayer: any, _g2: any): void {
    const cs = {
        color: casingConfig.color,
        opacity: casingConfig.opacity,
        weight: casingConfig.weight,
        dashArray: casingConfig.dashArray,
        lineCap: casingConfig.lineCap || "butt",
        lineJoin: casingConfig.lineJoin || "miter",
        fill: false,
    };
    layer._casingLayer = _g2.L.polyline(layer.getLatLngs(), cs);
    if (leafletLayer?.addLayer) leafletLayer.addLayer(layer._casingLayer);
    else if (layer._map) layer._map.addLayer(layer._casingLayer);
    if (layer._casingLayer.setZIndex) layer._casingLayer.setZIndex((layer.options.zIndex || 0) - 1);
}

function _applyLayerCasing(layer: any, style: any, leafletLayer: any, _g2: any): void {
    if (!style._casing?.enabled) {
        if (layer._casingLayer && leafletLayer?.removeLayer) {
            leafletLayer.removeLayer(layer._casingLayer);
            layer._casingLayer = null;
        }
        return;
    }
    if (!(layer instanceof _g2.L.Polyline) || layer instanceof _g2.L.Polygon) return;
    const cc = style._casing;
    if (!layer._casingLayer) {
        _createCasingLayer(layer, cc, leafletLayer, _g2);
    } else {
        layer._casingLayer.setStyle({
            color: cc.color,
            opacity: cc.opacity,
            weight: cc.weight,
            dashArray: cc.dashArray,
            lineCap: cc.lineCap || "butt",
            lineJoin: cc.lineJoin || "miter",
        });
    }
}

function _applyLayerHatch(layer: any, style: any): void {
    if (!style._hatchPatternId || !style.hatch) return;
    const patternId = style._hatchPatternId;
    const hatchConfig = style.hatch;
    setTimeout(() => {
        _applyHatchToLayer(layer, patternId, hatchConfig);
    }, 0);
    if (layer._hatchPatternId === patternId) return;
    layer._hatchPatternId = patternId;
    if (layer._hatchListener) layer.off("add", layer._hatchListener);
    layer._hatchListener = function () {
        _applyHatchToLayer(this, patternId, hatchConfig);
    };
    layer.on("add", layer._hatchListener);
    if (!layer._hatchCleanupBound) {
        layer._hatchCleanupBound = true;
        layer.on("remove", function (this: any) {
            if (this._hatchListener) {
                this.off("add", this._hatchListener);
                this._hatchListener = null;
            }
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise le format de style to the format Leaflet
 * Phase 4 dedup: delegates base fill/stroke to shared normalizeStyleToLeaflet,
 * then layers on hatch patterns and caseing extensions.
 * @private
 * @param {Object} style - Style source (format nested ou plat)
 * @param {string} layerId - ID de the layer (for thes patterns SVG)
 * @returns {Object} - Style normalized au format Leaflet
 */
function _normalizeStyleToLeaflet(style: any, layerId: any) {
    if (!style || typeof style !== "object") return {};
    const normalized = normalizeStyleToLeaflet(style);
    if (style.fill || style.stroke) {
        if (style.hatch?.enabled && style.hatch.renderMode === "pattern_only") {
            normalized.fillColor = "transparent";
            normalized.fillOpacity = 1;
        }
        _buildNormalizedCasing(style, normalized);
        _buildNormalizedHatch(style, layerId, normalized);
    }
    return normalized;
}

function _getRawStyle(styleConfig: any): any {
    if (styleConfig.defaultStyle) return styleConfig.defaultStyle;
    return styleConfig.style ?? {};
}

function _buildMarkerDisplayConfig(style: any, poiData: any, POIMarkers: any): any {
    let displayConfig: any = {};
    if (typeof POIMarkers.resolveCategoryDisplay === "function") {
        displayConfig = POIMarkers.resolveCategoryDisplay(poiData);
    }
    if (style.fillColor) displayConfig.colorFill = style.fillColor;
    if (style.color) displayConfig.colorStroke = style.color;
    if (typeof style.radius === "number") displayConfig.radius = style.radius;
    if (typeof style.weight === "number") displayConfig.weight = style.weight;
    if (typeof style.fillOpacity === "number") displayConfig.fillOpacity = style.fillOpacity;
    if (typeof style.opacity === "number") displayConfig.opacity = style.opacity;
    return displayConfig;
}

function _recreateMarkerLayers(layersToRecreate: any[], leafletLayer: any, _g2: any): number {
    if (layersToRecreate.length === 0) return 0;
    const POIMarkers = _g2.GeoLeaf?._POIMarkers;
    let markersRecreated = 0;
    layersToRecreate.forEach(({ layer, feature, style }) => {
        const latlng = layer.getLatLng();
        if (POIMarkers && typeof POIMarkers.buildMarkerIcon === "function") {
            const poiData = {
                ...feature.properties,
                latlng: [latlng.lat, latlng.lng],
                attributes: feature.properties.attributes ?? {},
                _layerConfig: { style: style },
            };
            const displayConfig = _buildMarkerDisplayConfig(style, poiData, POIMarkers);
            const newIcon = POIMarkers.buildMarkerIcon(displayConfig);
            layer.setIcon(newIcon);
            markersRecreated++;
        } else {
            const newMarker = _g2.L.circleMarker(latlng, style);
            newMarker.feature = feature;
            leafletLayer.removeLayer(layer);
            leafletLayer.addLayer(newMarker);
            markersRecreated++;
        }
    });
    return markersRecreated;
}

function _buildStyleFn(defaultStyle: any, styleRules: any[], layerId: any): (feature: any) => any {
    return function _styleFn(feature: any): any {
        let finalStyle = Object.assign({}, defaultStyle);
        if (styleRules.length > 0 && _g.GeoLeaf && _g.GeoLeaf._GeoJSONStyleResolver) {
            const matchedStyle = _g.GeoLeaf._GeoJSONStyleResolver.evaluateStyleRules(
                feature,
                styleRules
            );
            if (matchedStyle) {
                const normalizedRuleStyle = _normalizeStyleToLeaflet(matchedStyle, layerId);
                finalStyle = Object.assign({}, finalStyle, normalizedRuleStyle);
            }
        }
        return finalStyle;
    };
}

function _setupHatchListeners(
    layerData: any,
    leafletLayer: any,
    defaultStyle: any,
    styleRules: any[],
    styled: number,
    Log: any
): void {
    const hasHatchInRules = styleRules.some((rule: any) => rule.style?.hatch?.enabled);
    if (!defaultStyle._hatchPatternId) return;
    if (hasHatchInRules) return;
    const patternId = defaultStyle._hatchPatternId;
    const hatchConfig = defaultStyle.hatch;
    _applyHatchToLayer(leafletLayer, patternId, hatchConfig);
    Log.debug(`[GeoLeaf.GeoJSON] Hatching applied: pattern=${patternId}, features=${styled}`);
    if (layerData._hatchListeners) {
        leafletLayer.off("add", layerData._hatchListeners.onAdd);
        if (_g.L && _g.L.DomEvent) {
            leafletLayer.eachLayer(function (layer: any) {
                if (layer._path) layer.off("add", layerData._hatchListeners.onLayerAdd);
            });
        }
    }
    const onAdd = function () {
        setTimeout(function () {
            _applyHatchToLayer(leafletLayer, patternId, hatchConfig);
        }, 0);
    };
    const onLayerAdd = function (this: any) {
        _applyHatchToLayer(this, patternId, hatchConfig);
    };
    leafletLayer.on("add", onAdd);
    leafletLayer.eachLayer(function (layer: any) {
        if (layer._path) layer.on("add", onLayerAdd);
    });
    layerData._hatchListeners = { onAdd, onLayerAdd };
    layerData._hatchPatternId = patternId;
}

function _finalizeStyleConfig(
    layerData: any,
    layerId: any,
    styleConfig: any,
    styleRules: any[]
): void {
    layerData.config = Object.assign({}, layerData.config, {
        style: styleConfig.defaultStyle || styleConfig.style,
        styleRules: styleRules,
    });
    layerData.currentStyle = styleConfig;
    const GeoLeaf = _g.GeoLeaf;
    if (!GeoLeaf) return;
    if (GeoLeaf._LabelButtonManager) GeoLeaf._LabelButtonManager.syncImmediate(layerId);
    if (
        GeoLeaf._GeoJSONLayerManager &&
        typeof GeoLeaf._GeoJSONLayerManager.updateLayerVisibilityByZoom === "function"
    ) {
        GeoLeaf._GeoJSONLayerManager.updateLayerVisibilityByZoom();
    }
}

function _buildDefaultStyleConfig(
    styleConfig: any,
    layerId: any
): { defaultStyle: any; styleRules: any[]; styleFn: (feature: any) => any } {
    const baseStyle = {
        color: "#999999",
        weight: 2,
        opacity: 0.9,
        fillColor: "#cccccc",
        fillOpacity: 0.15,
    };
    const rawStyle = _getRawStyle(styleConfig);
    const normalizedStyle = _normalizeStyleToLeaflet(rawStyle, layerId);
    const defaultStyle = Object.assign({}, baseStyle, normalizedStyle);
    const styleRules = Array.isArray(styleConfig.styleRules) ? styleConfig.styleRules : [];
    const styleFn = _buildStyleFn(defaultStyle, styleRules, layerId);
    return { defaultStyle, styleRules, styleFn };
}

function _applyStyleFirstPass(
    leafletLayer: any,
    styleFn: (feature: any) => any,
    layerData: any
): { styled: number; layersToRecreate: any[] } {
    let styled = 0;
    const layersToRecreate: any[] = [];

    leafletLayer.eachLayer(function (layer: any) {
        if (!layer.feature) return;
        const style: any = styleFn(layer.feature);
        if (layer.setStyle && typeof layer.setStyle === "function") {
            layer.setStyle(style);
            if (layer._geoleafFiltered) {
                layer.setStyle({ opacity: 0, fillOpacity: 0 });
                if (layer._casingLayer && typeof layer._casingLayer.setStyle === "function")
                    layer._casingLayer.setStyle({ opacity: 0 });
            }
            _applyInteractiveState(layer, layerData, _g);
            styled++;
            _applyLayerCasing(layer, style, leafletLayer, _g);
            _applyLayerHatch(layer, style);
        } else if (_g.L && layer instanceof _g.L.Marker) {
            layersToRecreate.push({ layer, feature: layer.feature, style });
        }
    });

    return { styled, layersToRecreate };
}

/**
 * Applies a nouveau style to a layer existing.
 * Used by the Themes module to dynamically change appearance.
 *
 * @param {string} layerId - ID de the layer
 * @param {Object} styleConfig - Configuration du style { style, styleRules }
 * @returns {boolean} - true si le style has been applied avec success
 */
LayerManager.setLayerStyle = function (layerId: any, styleConfig: any) {
    const state = getState();
    const Log = getLog();
    const layerData = state.layers.get(layerId);

    if (!layerData) {
        Log.warn("[GeoLeaf.GeoJSON] setLayerStyle: layer not found:", layerId);
        return false;
    }

    // Sprint 8: VT layers — delegate to VectorTiles module
    if (layerData.isVectorTile && _g.GeoLeaf && _g.GeoLeaf._VectorTiles) {
        _g.GeoLeaf._VectorTiles.updateLayerStyle(layerId, styleConfig);
        return true;
    }

    const leafletLayer = layerData.layer;
    if (!leafletLayer || typeof leafletLayer.setStyle !== "function") {
        Log.warn("[GeoLeaf.GeoJSON] setLayerStyle: layer has no setStyle method:", layerId);
        return false;
    }

    const { defaultStyle, styleRules, styleFn } = _buildDefaultStyleConfig(styleConfig, layerId);

    try {
        const { styled, layersToRecreate } = _applyStyleFirstPass(leafletLayer, styleFn, layerData);

        const markersRecreated = _recreateMarkerLayers(layersToRecreate, leafletLayer, _g);

        Log.debug(
            `[GeoLeaf.GeoJSON] Style applied: ${styled + markersRecreated} features (${styled} setStyle, ${markersRecreated} markers)`
        );

        _setupHatchListeners(layerData, leafletLayer, defaultStyle, styleRules, styled, Log);

        _finalizeStyleConfig(layerData, layerId, styleConfig, styleRules);

        Log.debug("[GeoLeaf.GeoJSON] Style applied successfully:", layerId);
        return true;
    } catch (err) {
        Log.error("[GeoLeaf.GeoJSON] Error in setLayerStyle:", layerId, (err as any).message);
        return false;
    }
};

export { LayerManager as LayerManagerStyle };
