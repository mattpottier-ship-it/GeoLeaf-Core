/**
 * GeoLeaf GeoJSON Module - Popup & Tooltip
 * Gestion des popups et tooltips unifi�s
 *
 * @module geojson/popup-tooltip
 */

import { GeoJSONShared } from './shared.js';
import { getLog } from '../utils/general-utils.js';
import type { GeoJSONFeature } from './geojson-types.js';

const _g: any = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {} as Window);

interface LayerDefLike {
    id?: string;
    label?: string;
    interactiveShape?: boolean;
    showPopup?: boolean;
    [key: string]: unknown;
}

const _defaultState = { map: null as unknown };
const getState = () => (GeoJSONShared && GeoJSONShared.state) ? GeoJSONShared.state : _defaultState;

/** Leaflet layer-like (on, bindPopup, getTooltip, etc.) */
type LeafletLayerLike = { on: (ev: string, fn: (...args: unknown[]) => void) => unknown; [key: string]: unknown };

const PopupTooltip: {
    convertFeatureToPOI: (feature: GeoJSONFeature, def: LayerDefLike) => Record<string, unknown>;
    bindUnifiedPopup: (feature: GeoJSONFeature, layer: LeafletLayerLike, def: LayerDefLike) => void;
    bindUnifiedTooltip: (feature: GeoJSONFeature, layer: LeafletLayerLike, def: LayerDefLike) => void;
} = {} as any;

/**
 * Convertit une feature GeoJSON en format POI pour le side panel.
 */
PopupTooltip.convertFeatureToPOI = function (feature: GeoJSONFeature, def: LayerDefLike): Record<string, unknown> {
    let poi: Record<string, unknown>;

    const Normalizer = (_g as any).GeoLeaf && (_g as any).GeoLeaf._Normalizer;
    if (Normalizer && typeof Normalizer.normalizeFromGeoJSON === 'function') {
        poi = Normalizer.normalizeFromGeoJSON(feature, def);
    } else {
        const props = feature.properties || {};
        const geom = feature.geometry as { type: string; coordinates?: number[] };
        poi = {
            id: (props as any).id || ("geojson-feature-" + Math.random().toString(36).substr(2, 9)),
            title: (props as any).NAME || (props as any).Name || (props as any).name ||
                   (props as any).TITLE || (props as any).Title || (props as any).title ||
                   (props as any).LABEL || (props as any).Label || (props as any).label || "Sans titre",
            description: (props as any).description || (props as any).desc || "",
            properties: { ...props },
            attributes: {
                source: "geojson",
                layerId: def.id,
                layerLabel: def.label,
                ...props
            }
        };
        if (geom && geom.coordinates && geom.coordinates.length >= 2) {
            (poi as any).latlng = [geom.coordinates[1], geom.coordinates[0]];
            (poi as any).geometry = geom;
            (poi as any).location = { lat: geom.coordinates[1], lng: geom.coordinates[0] };
        }
    }

    if (poi) {
        (poi as any).attributes = (poi as any).attributes || {};
        (poi as any).attributes.source = "geojson";
        (poi as any).attributes.layerId = def.id;
        (poi as any).attributes.layerLabel = def.label;
        (poi as any)._layerConfig = def;
        const Loader = (_g as any).GeoLeaf && (_g as any).GeoLeaf._GeoJSONLoader;
        const sidepanelLayout = Loader && Loader.getSidepanelConfig ? Loader.getSidepanelConfig(def) : null;
        if (sidepanelLayout) {
            (poi as any)._sidepanelConfig = { detailLayout: sidepanelLayout };
        }
    }

    return poi;
};

/**
 * Attache un popup unifi� compatible avec le syst�me POI.
 */
PopupTooltip.bindUnifiedPopup = function (feature: GeoJSONFeature, layer: LeafletLayerLike, def: LayerDefLike): void {
    const Log = getLog();
    if (!feature.properties) return;
    if (def.interactiveShape === false) return;
    const showPopup = typeof def.showPopup === 'boolean' ? def.showPopup : true;

    if (!showPopup) {
        layer.on("click", (e: unknown) => {
            if (e && (e as any).originalEvent) (e as any).originalEvent.stopPropagation();
            if ((layer as any).getTooltip && (layer as any).getTooltip()) {
                try {
                    if (typeof (layer as any).closeTooltip === 'function') (layer as any).closeTooltip();
                    else (layer as any).unbindTooltip();
                } catch (_err) { /* ignore */ }
            }
            const GeoLeaf = (_g as any).GeoLeaf;
            if (GeoLeaf && GeoLeaf.POI && typeof GeoLeaf.POI.showPoiDetails === "function") {
                const poiData = PopupTooltip.convertFeatureToPOI(feature, def);
                const shared = GeoLeaf._POIShared && GeoLeaf._POIShared.state;
                const current = shared ? shared.currentPoiInPanel : null;
                if (current && poiData && (current as any).id && (poiData as any).id && (current as any).id === (poiData as any).id) {
                    if (GeoLeaf.POI && typeof GeoLeaf.POI.hideSidePanel === 'function') GeoLeaf.POI.hideSidePanel();
                } else {
                    GeoLeaf.POI.showPoiDetails(poiData);
                }
            }
        });
        return;
    }

    if ((layer as any).getPopup && (layer as any).getPopup()) return;

    const poiData = PopupTooltip.convertFeatureToPOI(feature, def);
    const ContentBuilder = (_g as any).GeoLeaf && (_g as any).GeoLeaf._ContentBuilder?.Assemblers || null;
    const Loader = (_g as any).GeoLeaf && (_g as any).GeoLeaf._GeoJSONLoader;
    let popupConfig: unknown = null;
    try {
        popupConfig = Loader && Loader.getPopupConfig ? Loader.getPopupConfig(def) : null;
    } catch (_e) { /* ignore */ }

    if (ContentBuilder && typeof ContentBuilder.buildPopupHTML === 'function') {
        const markersModule = (_g as any).GeoLeaf && (_g as any).GeoLeaf._POIMarkers;
        const resolveCategoryDisplay = markersModule && typeof markersModule.resolveCategoryDisplay === 'function'
            ? markersModule.resolveCategoryDisplay : null;
        const popupContent = ContentBuilder.buildPopupHTML(poiData, popupConfig, { resolveCategoryDisplay: resolveCategoryDisplay });
        if (popupContent) (layer as any).bindPopup(popupContent);
    } else {
        const popupModule = (_g as any).GeoLeaf && (_g as any).GeoLeaf._POIPopup;
        if (popupModule && typeof popupModule.buildQuickPopupContent === 'function') {
            const markersModule = (_g as any).GeoLeaf && (_g as any).GeoLeaf._POIMarkers;
            const resolveCategoryDisplay = markersModule && typeof markersModule.resolveCategoryDisplay === 'function'
                ? markersModule.resolveCategoryDisplay : null;
            const popupContent = popupModule.buildQuickPopupContent(poiData, resolveCategoryDisplay);
            if (popupContent) (layer as any).bindPopup(popupContent);
        } else {
            const Security = (_g as any).GeoLeaf && (_g as any).GeoLeaf.Security || {
                escapeHtml: (str: unknown) => {
                    if (!str) return "";
                    const div = document.createElement("div");
                    div.textContent = String(str);
                    return div.innerHTML;
                }
            };
            const props = feature.properties || {};
            const name = (props as any).name || (props as any).label || (props as any).title || "Sans titre";
            const description = (props as any).description || (props as any).desc || "";
            let popupHtml = '<div class="gl-geojson-popup">';
            popupHtml += '<h3 class="gl-popup-title">' + (Security as any).escapeHtml(name) + '</h3>';
            if (description) popupHtml += '<p class="gl-popup-description">' + (Security as any).escapeHtml(description) + '</p>';
            if ((_g as any).GeoLeaf && (_g as any).GeoLeaf.POI && typeof (_g as any).GeoLeaf.POI.showPoiDetails === "function") {
                popupHtml += '<a href="#" class="gl-poi-popup__link" data-layer-id="' + def.id + '" data-feature-id="' + ((props as any).id || '') + '">Voir d�tails ?</a>';
            }
            popupHtml += '</div>';
            (layer as any).bindPopup(popupHtml);
        }
    }

    (layer as any)._geoleafPopupActive = false;

    layer.on('popupopen', () => {
        (layer as any)._geoleafPopupActive = true;
        if ((layer as any).getTooltip && (layer as any).getTooltip()) {
            try {
                if (typeof (layer as any).closeTooltip === 'function') (layer as any).closeTooltip();
            } catch (err) {
                Log.warn('[GeoJSON] Erreur fermeture tooltip:', err);
            }
        }
        const popup = (layer as any).getPopup();
        if (!popup) return;
        const popupEl = popup.getElement && popup.getElement();
        if (!popupEl) return;
        const link = popupEl.querySelector('.gl-poi-popup__link');
        if (link && !(link as any)._geoleafClickBound) {
            (link as any)._geoleafClickBound = true;
            link.addEventListener('click', (e: Event) => {
                e.preventDefault();
                if ((_g as any).GeoLeaf && (_g as any).GeoLeaf.POI && typeof (_g as any).GeoLeaf.POI.showPoiDetails === "function") {
                    (_g as any).GeoLeaf.POI.showPoiDetails(PopupTooltip.convertFeatureToPOI(feature, def));
                }
            });
        }
    });

    layer.on('popupclose', () => {
        (layer as any)._geoleafPopupActive = false;
        if ((layer as any).getTooltip && (layer as any).getTooltip() && (layer as any).getTooltip().options?.permanent) {
            setTimeout(() => {
                if ((layer as any).openTooltip && !(layer as any)._geoleafPopupActive) (layer as any).openTooltip();
            }, 50);
        }
    });
};

/**
 * Attache un tooltip unifi� � une couche selon sa configuration.
 */
PopupTooltip.bindUnifiedTooltip = function (feature: GeoJSONFeature, layer: LeafletLayerLike, def: LayerDefLike): void {
    const state = getState();
    if (!feature.properties || !layer) return;

    const tooltipMode = (def.tooltipMode as string) || "hover";
    const tooltipMinZoom = typeof def.tooltipMinZoom === "number" ? def.tooltipMinZoom : 0;
    if (tooltipMode === "never") return;

    const props = feature.properties || {};
    const tooltipText = (props as any).NAME || (props as any).Name || (props as any).name ||
                        (props as any).TITLE || (props as any).Title || (props as any).title ||
                        (props as any).LABEL || (props as any).Label || (props as any).label ||
                        (props as any).id || "Sans titre";

    const Loader = (_g as any).GeoLeaf && (_g as any).GeoLeaf._GeoJSONLoader;
    const tooltipConfig = Loader && Loader.getTooltipConfig ? Loader.getTooltipConfig(def) : null;
    const featureAsPoi = PopupTooltip.convertFeatureToPOI(feature, def);

    const buildTooltipContent = (): string => {
        const ContentBuilder = (_g as any).GeoLeaf && (_g as any).GeoLeaf._ContentBuilder?.Assemblers || null;
        if (ContentBuilder && typeof ContentBuilder.buildTooltipHTML === 'function') {
            const content = ContentBuilder.buildTooltipHTML(featureAsPoi, tooltipConfig);
            return (content as string) || tooltipText;
        }
        const POIPopup = (_g as any).GeoLeaf && (_g as any).GeoLeaf._POIPopup;
        if (POIPopup && typeof POIPopup.buildTooltipContent === 'function') {
            const content = POIPopup.buildTooltipContent(featureAsPoi);
            return (content as string) || tooltipText;
        }
        return tooltipText;
    };

    const updateTooltipVisibility = (): void => {
        if (!state.map) return;
        if ((layer as any)._geoleafPopupActive) return;
        const currentZoom = (state.map as any).getZoom();
        const shouldShow = currentZoom >= tooltipMinZoom;
        const content = buildTooltipContent();
        if (shouldShow) {
            if (!(layer as any).getTooltip()) {
                (layer as any).bindTooltip(content, {
                    direction: 'top', offset: [0, -10], opacity: 0.9,
                    className: 'gl-geojson-tooltip', permanent: tooltipMode === 'always'
                });
                if (tooltipMode === 'always' && (layer as any).openTooltip) (layer as any).openTooltip();
            } else {
                const tooltip = (layer as any).getTooltip();
                if (tooltip && tooltip.setContent) tooltip.setContent(content);
            }
        } else {
            if ((layer as any).getTooltip()) {
                try {
                    if (typeof (layer as any).closeTooltip === 'function') (layer as any).closeTooltip();
                    else (layer as any).unbindTooltip();
                } catch (_err) { /* ignore */ }
            }
        }
    };

    (layer as any)._geoleafTooltipUpdate = updateTooltipVisibility;
    layer.on('tooltipopen', () => {
        if ((layer as any)._geoleafPopupActive) (layer as any).closeTooltip();
    });
    layer.on('add', () => {
        updateTooltipVisibility();
        if (state.map) (state.map as any).on('zoomend', updateTooltipVisibility);
    });
    layer.on('remove', () => {
        if (state.map && (layer as any)._geoleafTooltipUpdate) {
            (state.map as any).off('zoomend', (layer as any)._geoleafTooltipUpdate);
        }
    });
};

(PopupTooltip as any)._getTestState = () => _defaultState;

export { PopupTooltip };
