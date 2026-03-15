/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf GeoJSON Module - Popup & Tooltip
 * Gestion des popups et tooltips unifiés
 *
 * @module geojson/popup-tooltip
 */

import { GeoJSONShared } from "./shared.js";
import { getLog } from "../utils/general-utils.js";
import type { GeoJSONFeature } from "./geojson-types.js";

const _g: any =
    typeof globalThis !== "undefined"
        ? globalThis
        : typeof window !== "undefined"
          ? window
          : ({} as Window);

interface LayerDefLike {
    id?: string;
    label?: string;
    interactiveShape?: boolean;
    showPopup?: boolean;
    [key: string]: unknown;
}

const _defaultState = { map: null as unknown };
const getState = () => (GeoJSONShared && GeoJSONShared.state ? GeoJSONShared.state : _defaultState);

/** Leaflet layer-like (on, bindPopup, getTooltip, etc.) */
type LeafletLayerLike = {
    on: (ev: string, fn: (...args: unknown[]) => void) => unknown;
    [key: string]: unknown;
};

const PopupTooltip: {
    convertFeatureToPOI: (feature: GeoJSONFeature, def: LayerDefLike) => Record<string, unknown>;
    bindUnifiedPopup: (feature: GeoJSONFeature, layer: LeafletLayerLike, def: LayerDefLike) => void;
    bindUnifiedTooltip: (
        feature: GeoJSONFeature,
        layer: LeafletLayerLike,
        def: LayerDefLike
    ) => void;
} = {} as any;

/**
 * Converts ae feature GeoJSON en format POI for the side panel.
 */
function _firstPropStr(p: any, keys: string[], fallback: string): string {
    for (const k of keys) {
        if (p[k]) return p[k];
    }
    return fallback;
}

function _buildFallbackPOI(feature: GeoJSONFeature, def: LayerDefLike): Record<string, unknown> {
    const props = feature.properties || {};
    const p = props as any;
    const nameKeys = ["NAME", "Name", "name", "TITLE", "Title", "title", "LABEL", "Label", "label"];
    const title = _firstPropStr(p, nameKeys, "Sans titre");
    const geom = feature.geometry as { type: string; coordinates?: number[] };
    const poi: Record<string, unknown> = {
        id: p.id ? p.id : "geojson-feature-" + Math.random().toString(36).substr(2, 9),
        title,
        description: p.description ? p.description : p.desc ? p.desc : "",
        properties: { ...props },
        attributes: { source: "geojson", layerId: def.id, layerLabel: def.label, ...props },
    };
    if (geom && geom.coordinates && geom.coordinates.length >= 2) {
        (poi as any).latlng = [geom.coordinates[1], geom.coordinates[0]];
        (poi as any).geometry = geom;
        (poi as any).location = { lat: geom.coordinates[1], lng: geom.coordinates[0] };
    }
    return poi;
}

function _enrichPOI(poi: Record<string, unknown>, def: LayerDefLike): void {
    (poi as any).attributes = (poi as any).attributes ? (poi as any).attributes : {};
    (poi as any).attributes.source = "geojson";
    (poi as any).attributes.layerId = def.id;
    (poi as any).attributes.layerLabel = def.label;
    (poi as any)._layerConfig = def;
    const Loader = (_g as any).GeoLeaf && (_g as any).GeoLeaf._GeoJSONLoader;
    const sidepanelLayout =
        Loader && Loader.getSidepanelConfig ? Loader.getSidepanelConfig(def) : null;
    if (sidepanelLayout) {
        (poi as any)._sidepanelConfig = { detailLayout: sidepanelLayout };
    }
}

PopupTooltip.convertFeatureToPOI = function (
    feature: GeoJSONFeature,
    def: LayerDefLike
): Record<string, unknown> {
    let poi: Record<string, unknown>;
    const Normalizer = (_g as any).GeoLeaf && (_g as any).GeoLeaf._Normalizer;
    if (Normalizer && typeof Normalizer.normalizeFromGeoJSON === "function") {
        poi = Normalizer.normalizeFromGeoJSON(feature, def);
    } else {
        poi = _buildFallbackPOI(feature, def);
    }
    if (poi) _enrichPOI(poi, def);
    return poi;
};

/**
 * Attache un popup unifié compatible with the système POI.
 */
function _getGeoLeaf(): any {
    return (_g as any).GeoLeaf;
}
function _getResolveCategoryDisplay(): unknown {
    const m = _getGeoLeaf() && _getGeoLeaf()._POIMarkers;
    return m && typeof m.resolveCategoryDisplay === "function" ? m.resolveCategoryDisplay : null;
}

function _defaultEscapeHtml(str: unknown): string {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
}

function _escapeHtml(str: unknown): string {
    const GeoLeaf = _getGeoLeaf();
    const fn =
        GeoLeaf && GeoLeaf.Security && typeof GeoLeaf.Security.escapeHtml === "function"
            ? GeoLeaf.Security.escapeHtml
            : _defaultEscapeHtml;
    return fn(str);
}

function _propStr(p: any, ...keys: string[]): string {
    for (const k of keys) {
        if (p[k]) return p[k];
    }
    return "";
}

function _buildFallbackPopupHtml(feature: GeoJSONFeature, def: LayerDefLike): string {
    const GeoLeaf = _getGeoLeaf();
    const props = feature.properties ? feature.properties : {};
    const p = props as any;
    const name = _propStr(p, "name", "label", "title") || "Sans titre";
    const description = _propStr(p, "description", "desc");
    let html = '<div class="gl-geojson-popup">';
    html += '<h3 class="gl-popup-title">' + _escapeHtml(name) + "</h3>";
    if (description) html += '<p class="gl-popup-description">' + _escapeHtml(description) + "</p>";
    if (GeoLeaf && GeoLeaf.POI && typeof GeoLeaf.POI.showPoiDetails === "function") {
        html +=
            '<a href="#" class="gl-poi-popup__link" data-layer-id="' +
            def.id +
            '" data-feature-id="' +
            (p.id ? p.id : "") +
            '">Voir d\u00e9tails ?</a>';
    }
    html += "</div>";
    return html;
}

function _buildPopupContent(
    poiData: unknown,
    popupConfig: unknown,
    def: LayerDefLike,
    feature: GeoJSONFeature
): string | null {
    const GeoLeaf = _getGeoLeaf();
    const ContentBuilder =
        GeoLeaf && GeoLeaf._ContentBuilder ? GeoLeaf._ContentBuilder.Assemblers : null;
    if (ContentBuilder && typeof ContentBuilder.buildPopupHTML === "function") {
        return ContentBuilder.buildPopupHTML(poiData, popupConfig, {
            resolveCategoryDisplay: _getResolveCategoryDisplay(),
        });
    }
    const popupModule = GeoLeaf && GeoLeaf._POIPopup;
    if (popupModule && typeof popupModule.buildQuickPopupContent === "function") {
        return popupModule.buildQuickPopupContent(poiData, _getResolveCategoryDisplay());
    }
    return _buildFallbackPopupHtml(feature, def);
}

function _handleSidePanelClick(e: Event, feature: GeoJSONFeature, def: LayerDefLike): void {
    e.preventDefault();
    const GeoLeaf = _getGeoLeaf();
    if (GeoLeaf && GeoLeaf.POI && typeof GeoLeaf.POI.showPoiDetails === "function") {
        GeoLeaf.POI.showPoiDetails(PopupTooltip.convertFeatureToPOI(feature, def));
    }
}

function _bindPopupOpenHandler(
    layer: LeafletLayerLike,
    feature: GeoJSONFeature,
    def: LayerDefLike
): void {
    const Log = getLog();
    layer.on("popupopen", () => {
        (layer as any)._geoleafPopupActive = true;
        if ((layer as any).getTooltip && (layer as any).getTooltip()) {
            try {
                if (typeof (layer as any).closeTooltip === "function")
                    (layer as any).closeTooltip();
            } catch (err) {
                Log.warn("[GeoJSON] Error closing tooltip:", err);
            }
        }
        const popup = (layer as any).getPopup();
        if (!popup) return;
        const popupEl = popup.getElement && popup.getElement();
        if (!popupEl) return;
        const link = popupEl.querySelector(".gl-poi-popup__link");
        if (link && !(link as any)._geoleafClickBound) {
            (link as any)._geoleafClickBound = true;
            link.addEventListener("click", (e: Event) => _handleSidePanelClick(e, feature, def));
        }
    });
}

function _closeLayerTooltip(layer: any): void {
    if (!(layer.getTooltip && layer.getTooltip())) return;
    try {
        if (typeof layer.closeTooltip === "function") layer.closeTooltip();
        else layer.unbindTooltip();
    } catch (_err) {
        /* ignore */
    }
}

function _toggleSidePanel(GeoLeaf: any, poiData: Record<string, unknown>): void {
    const shared = GeoLeaf._POIShared && GeoLeaf._POIShared.state;
    const current = shared ? shared.currentPoiInPanel : null;
    const curId = current ? (current as any).id : undefined;
    const poiId = poiData ? (poiData as any).id : undefined;
    if (curId && poiId && curId === poiId) {
        if (typeof GeoLeaf.POI.hideSidePanel === "function") GeoLeaf.POI.hideSidePanel();
    } else {
        GeoLeaf.POI.showPoiDetails(poiData);
    }
}

function _bindNoPopupClickHandler(
    layer: LeafletLayerLike,
    feature: GeoJSONFeature,
    def: LayerDefLike
): void {
    layer.on("click", (e: unknown) => {
        if (e && (e as any).originalEvent) (e as any).originalEvent.stopPropagation();
        _closeLayerTooltip(layer as any);
        const GeoLeaf = _getGeoLeaf();
        if (!(GeoLeaf && GeoLeaf.POI && typeof GeoLeaf.POI.showPoiDetails === "function")) return;
        _toggleSidePanel(GeoLeaf, PopupTooltip.convertFeatureToPOI(feature, def));
    });
}

function _getPopupConfig(def: LayerDefLike): unknown {
    const GeoLeaf = _getGeoLeaf();
    const Loader = GeoLeaf && GeoLeaf._GeoJSONLoader;
    try {
        return Loader && Loader.getPopupConfig ? Loader.getPopupConfig(def) : null;
    } catch (_e) {
        return null;
    }
}

function _bindPopupCloseHandler(layer: LeafletLayerLike): void {
    layer.on("popupclose", () => {
        (layer as any)._geoleafPopupActive = false;
        const tt = (layer as any).getTooltip && (layer as any).getTooltip();
        if (!(tt && tt.options && tt.options.permanent)) return;
        setTimeout(() => {
            if ((layer as any).openTooltip && !(layer as any)._geoleafPopupActive)
                (layer as any).openTooltip();
        }, 50);
    });
}

PopupTooltip.bindUnifiedPopup = function (
    feature: GeoJSONFeature,
    layer: LeafletLayerLike,
    def: LayerDefLike
): void {
    if (!feature.properties) return;
    if (def.interactiveShape === false) return;
    const showPopup = typeof def.showPopup === "boolean" ? def.showPopup : true;
    if (!showPopup) {
        _bindNoPopupClickHandler(layer, feature, def);
        return;
    }
    if ((layer as any).getPopup && (layer as any).getPopup()) return;
    const poiData = PopupTooltip.convertFeatureToPOI(feature, def);
    const popupContent = _buildPopupContent(poiData, _getPopupConfig(def), def, feature);
    if (popupContent) (layer as any).bindPopup(popupContent);
    (layer as any)._geoleafPopupActive = false;
    _bindPopupOpenHandler(layer, feature, def);
    _bindPopupCloseHandler(layer);
};

/**
 * Attache un tooltip unifi\u00e9 \u00e0 a layer selon sa configuration.
 */
function _getTooltipText(props: any): string {
    return _firstPropStr(
        props,
        ["NAME", "Name", "name", "TITLE", "Title", "title", "LABEL", "Label", "label", "id"],
        "Sans titre"
    );
}

function _buildTooltipContent(
    featureAsPoi: unknown,
    tooltipConfig: unknown,
    tooltipText: string,
    fallback: string
): string {
    const GeoLeaf = _getGeoLeaf();
    const ContentBuilder =
        GeoLeaf && GeoLeaf._ContentBuilder ? GeoLeaf._ContentBuilder.Assemblers : null;
    if (ContentBuilder && typeof ContentBuilder.buildTooltipHTML === "function") {
        const content = ContentBuilder.buildTooltipHTML(featureAsPoi, tooltipConfig);
        return (content as string) ? (content as string) : tooltipText;
    }
    const POIPopup = GeoLeaf && GeoLeaf._POIPopup;
    if (POIPopup && typeof POIPopup.buildTooltipContent === "function") {
        const content = POIPopup.buildTooltipContent(featureAsPoi);
        return (content as string) ? (content as string) : tooltipText;
    }
    return fallback;
}

function _hideTooltip(layer: any): void {
    if (!layer.getTooltip()) return;
    try {
        if (typeof layer.closeTooltip === "function") layer.closeTooltip();
        else layer.unbindTooltip();
    } catch (_err) {
        /* ignore */
    }
}

function _showOrUpdateTooltip(layer: any, content: string, tooltipMode: string): void {
    if (!layer.getTooltip()) {
        layer.bindTooltip(content, {
            direction: "top",
            offset: [0, -10],
            opacity: 0.9,
            className: "gl-geojson-tooltip",
            permanent: tooltipMode === "always",
        });
        if (tooltipMode === "always" && layer.openTooltip) layer.openTooltip();
    } else {
        const tooltip = layer.getTooltip();
        if (tooltip && tooltip.setContent) tooltip.setContent(content);
    }
}

type TooltipCtx = {
    state: any;
    layer: any;
    featureAsPoi: unknown;
    tooltipConfig: unknown;
    tooltipText: string;
    tooltipMinZoom: number;
    tooltipMode: string;
};

function _updateTooltipVisibility(ctx: TooltipCtx): void {
    if (!ctx.state.map) return;
    if (ctx.layer._geoleafPopupActive) return;
    const currentZoom = ctx.state.map.getZoom();
    const content = _buildTooltipContent(
        ctx.featureAsPoi,
        ctx.tooltipConfig,
        ctx.tooltipText,
        ctx.tooltipText
    );
    if (currentZoom >= ctx.tooltipMinZoom) {
        _showOrUpdateTooltip(ctx.layer, content, ctx.tooltipMode);
    } else {
        _hideTooltip(ctx.layer);
    }
}

PopupTooltip.bindUnifiedTooltip = function (
    feature: GeoJSONFeature,
    layer: LeafletLayerLike,
    def: LayerDefLike
): void {
    const state = getState();
    if (!feature.properties || !layer) return;
    const tooltipMode = (def.tooltipMode as string) ? (def.tooltipMode as string) : "hover";
    const tooltipMinZoom = typeof def.tooltipMinZoom === "number" ? def.tooltipMinZoom : 0;
    if (tooltipMode === "never") return;
    const props = feature.properties;
    const tooltipText = _getTooltipText(props as any);
    const GeoLeaf = _getGeoLeaf();
    const Loader = GeoLeaf && GeoLeaf._GeoJSONLoader;
    const tooltipConfig = Loader && Loader.getTooltipConfig ? Loader.getTooltipConfig(def) : null;
    const featureAsPoi = PopupTooltip.convertFeatureToPOI(feature, def);
    const ctx: TooltipCtx = {
        state,
        layer,
        featureAsPoi,
        tooltipConfig,
        tooltipText,
        tooltipMinZoom,
        tooltipMode,
    };
    const updateFn = () => _updateTooltipVisibility(ctx);
    (layer as any)._geoleafTooltipUpdate = updateFn;
    layer.on("tooltipopen", () => {
        if ((layer as any)._geoleafPopupActive) (layer as any).closeTooltip();
    });
    layer.on("add", () => {
        updateFn();
        if (state.map) (state.map as any).on("zoomend", updateFn);
    });
    layer.on("remove", () => {
        if (state.map && (layer as any)._geoleafTooltipUpdate) {
            (state.map as any).off("zoomend", (layer as any)._geoleafTooltipUpdate);
        }
    });
};

(PopupTooltip as any)._getTestState = () => _defaultState;

export { PopupTooltip };
