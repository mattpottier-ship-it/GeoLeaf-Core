/* eslint-disable security/detect-object-injection */
/**
 * Module Label Renderer pour GeoLeaf
 * Creates et manages les tooltips permanents Leaflet for thes labels
 * @private GeoLeaf._LabelRenderer
 */

import { Log } from "../log/index.js";
import { Core } from "../geoleaf.core.js";

interface LabelConfigLike {
    labelId?: string;
    minZoom?: number;
    maxZoom?: number;
}

interface LabelStyleLike {
    field?: string;
    className?: string;
    variant?: string;
    prefix?: string;
    suffix?: string;
    font?: { family?: string; sizePt?: number; weight?: number; bold?: boolean; italic?: boolean };
    color?: string;
    opacity?: number;
    buffer?: { enabled?: boolean; color?: string; opacity?: number; sizePx?: number };
    textTransform?: string;
}

function _resolvePositionFromBounds(featureLayer: any): { lat: number; lng: number } | null {
    const bounds = featureLayer.getBounds();
    if (!bounds) return null;
    if (typeof bounds.getCenter !== "function") return null;
    return bounds.getCenter();
}

function _resolvePositionFromLatLngs(featureLayer: any): { lat: number; lng: number } | null {
    const latlngs = featureLayer.getLatLngs();
    if (!latlngs || latlngs.length === 0) return null;
    const flatLatlngs = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
    if (!flatLatlngs || flatLatlngs.length === 0) return null;
    const middleIndex = Math.floor(flatLatlngs.length / 2);
    return flatLatlngs[middleIndex];
}

function _resolveFeaturePosition(featureLayer: any): { lat: number; lng: number } | null {
    if (typeof featureLayer.getLatLng === "function") return featureLayer.getLatLng();
    if (typeof featureLayer.getBounds === "function")
        return _resolvePositionFromBounds(featureLayer);
    if (typeof featureLayer.getLatLngs === "function")
        return _resolvePositionFromLatLngs(featureLayer);
    return null;
}

function _extractLatLng(position: any): { lat: number; lng: number } {
    const lat = typeof position.lat === "function" ? position.lat() : position.lat;
    const lng = typeof position.lng === "function" ? position.lng() : position.lng;
    return { lat, lng };
}

function _buildFeatureId(feature: any): string {
    if (feature.id) return String(feature.id);
    if (feature.properties && feature.properties.id) return String(feature.properties.id);
    return `feature_${Date.now()}_${Math.random()}`;
}

function _applyFontStyles(element: HTMLElement, font: LabelStyleLike["font"]): void {
    if (!font) return;
    if (font.family)
        element.style.setProperty(
            "font-family",
            `"${font.family}", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`,
            "important"
        );
    if (font.sizePt) element.style.setProperty("font-size", `${font.sizePt}pt`, "important");
    if (font.bold) {
        element.style.setProperty("font-weight", "bold", "important");
    } else if (font.weight) {
        element.style.setProperty(
            "font-weight",
            String(font.weight < 400 ? 500 : font.weight),
            "important"
        );
    }
    if (font.italic) element.style.setProperty("font-style", "italic", "important");
}

function _buildBufferShadow(
    bufferColor: string,
    bufferOpacity: number,
    bufferSize: number,
    hexToRgba: (hex: string, opacity: number) => string
): string {
    const rgba = hexToRgba(bufferColor, bufferOpacity);
    const shadowParts: string[] = [];
    for (let angle = 0; angle < 360; angle += 30) {
        const rad = (angle * Math.PI) / 180;
        shadowParts.push(
            `${(Math.cos(rad) * bufferSize).toFixed(2)}px ${(Math.sin(rad) * bufferSize).toFixed(2)}px 0 ${rgba}`
        );
    }
    for (let angle = 15; angle < 360; angle += 30) {
        const rad = (angle * Math.PI) / 180;
        shadowParts.push(
            `${(Math.cos(rad) * bufferSize * 0.7).toFixed(2)}px ${(Math.sin(rad) * bufferSize * 0.7).toFixed(2)}px 0 ${rgba}`
        );
    }
    shadowParts.push(`0 0 ${bufferSize * 0.8}px ${rgba}`, `0 0 ${bufferSize * 1.5}px ${rgba}`);
    return shadowParts.join(", ");
}

function _applyBufferStyle(
    element: HTMLElement,
    buffer: NonNullable<LabelStyleLike["buffer"]>,
    hexToRgba: (hex: string, opacity: number) => string
): void {
    if (!buffer.enabled) return;
    const bufferColor = buffer.color || "#ffffff";
    const bufferOpacity = buffer.opacity !== undefined ? buffer.opacity : 1;
    const bufferSize = buffer.sizePx || 2;
    const shadow = _buildBufferShadow(bufferColor, bufferOpacity, bufferSize, hexToRgba);
    element.style.setProperty("text-shadow", shadow, "important");
}

function _isValidLatLng(lat: number, lng: number): boolean {
    if (!lat || !lng) return false;
    if (isNaN(lat)) return false;
    if (isNaN(lng)) return false;
    return true;
}

function _addLabelMarkerToMap(
    L: any,
    lat: number,
    lng: number,
    htmlContent: string,
    className: string,
    feature: any,
    tooltipsMap: Map<string, unknown>
): void {
    const labelIcon = L.divIcon({
        html: htmlContent,
        className,
        iconSize: null,
        iconAnchor: [0, 0],
    });
    const labelMarker = L.marker([lat, lng], {
        icon: labelIcon,
        interactive: false,
        keyboard: false,
    });
    const map = Core && (Core as any).getMap ? (Core as any).getMap() : null;
    if (map) {
        labelMarker.addTo(map);
        tooltipsMap.set(_buildFeatureId(feature), labelMarker);
    } else {
        if (Log) Log.warn("[LabelRenderer] Map not available for label addition");
    }
}

const _LabelRenderer = {
    createTooltipsForLayer(
        layerId: string,
        leafletLayer: { eachLayer: (fn: (layer: unknown) => void) => void },
        labelConfig: LabelConfigLike,
        style: LabelStyleLike,
        tooltipsMap: Map<string, unknown>
    ): void {
        if (!leafletLayer || !labelConfig || !labelConfig.labelId) {
            if (Log)
                Log.warn("[LabelRenderer] Invalid parameters for createTooltipsForLayer", {
                    layerId,
                    hasLeafletLayer: !!leafletLayer,
                    hasLabelConfig: !!labelConfig,
                    labelId: labelConfig?.labelId,
                });
            return;
        }
        const labelField = labelConfig.labelId;
        if (Log)
            Log.debug(`[LabelRenderer] Creating tooltips for ${layerId}, field: ${labelField}`);
        let featureCount = 0;
        leafletLayer.eachLayer((featureLayer: unknown) => {
            featureCount++;
            try {
                (this as any)._createTooltipForFeature(
                    featureLayer,
                    labelField,
                    style,
                    tooltipsMap
                );
            } catch (err) {
                if (Log) Log.warn("[LabelRenderer] Error creating tooltip:", err);
            }
        });
        if (Log)
            Log.debug(
                `[LabelRenderer] ${tooltipsMap.size} tooltips created for ${layerId} (${featureCount} features processed)`
            );
    },

    _createTooltipForFeature(
        featureLayer: any,
        labelField: string,
        style: LabelStyleLike,
        tooltipsMap: Map<string, unknown>
    ): void {
        const feature = featureLayer.feature;
        if (!feature) return;
        if (!feature.properties) return;
        const labelValue = (this as any)._extractFieldValue(feature.properties, labelField);
        if (!labelValue) return;
        const position = _resolveFeaturePosition(featureLayer);
        if (!position) {
            if (Log)
                Log.debug(
                    "[LabelRenderer] Null position for feature, skipping label. Label:",
                    labelValue
                );
            return;
        }
        const { lat, lng } = _extractLatLng(position);
        if (!_isValidLatLng(lat, lng)) return;
        const htmlContent = (this as any)._formatLabelContent(labelValue, style);
        const L = (globalThis as any).L;
        if (!L) return;
        _addLabelMarkerToMap(
            L,
            lat,
            lng,
            htmlContent,
            (this as any)._buildClassName(style),
            feature,
            tooltipsMap
        );
    },

    _extractFieldValue(properties: Record<string, unknown>, fieldPath: string): unknown {
        if (!properties || !fieldPath) return null;
        if (!fieldPath.includes(".")) return properties[fieldPath];
        const parts = fieldPath.split(".");
        let value: unknown = properties;
        for (const part of parts) {
            if (value && typeof value === "object" && part in (value as object))
                value = (value as Record<string, unknown>)[part];
            else return null;
        }
        return value;
    },

    _parseOffset(offset: unknown): [number, number] {
        if (!offset) return [0, 0];
        if (Array.isArray(offset) && offset.length === 2) {
            return [
                typeof offset[0] === "number" ? offset[0] : 0,
                typeof offset[1] === "number" ? offset[1] : 0,
            ];
        }
        return [0, 0];
    },

    _buildClassName(style: LabelStyleLike): string {
        const classes = ["gl-label"];
        if (style?.className) classes.push(style.className);
        if (style?.variant) classes.push(`gl-label--${style.variant}`);
        return classes.join(" ");
    },

    _formatLabelContent(value: unknown, style: LabelStyleLike): string {
        if (!value) return "";
        let content = String(value);
        if (style?.prefix) content = style.prefix + content;
        if (style?.suffix) content = content + style.suffix;
        const div = (globalThis as any).document.createElement("div");
        div.className = "gl-label__content";
        div.textContent = content;
        if (style) (this as any)._applyInlineStyles(div, style);
        return div.outerHTML;
    },

    _applyInlineStyles(element: HTMLElement, style: LabelStyleLike): void {
        if (!element || !style) return;
        _applyFontStyles(element, style.font);
        if (style.color) element.style.setProperty("color", style.color, "important");
        if (style.opacity !== undefined)
            element.style.setProperty("opacity", String(style.opacity), "important");
        if (style.buffer)
            _applyBufferStyle(element, style.buffer, (hex: string, op: number) =>
                (this as any)._hexToRgba(hex, op)
            );
        if (style.textTransform)
            element.style.setProperty("text-transform", style.textTransform, "important");
    },

    _hexToRgba(hex: string, opacity: number): string {
        if (!hex) return `rgba(0, 0, 0, ${opacity})`;
        hex = hex.replace("#", "");
        if (hex.length === 3)
            hex = hex
                .split("")
                .map((c: string) => c + c)
                .join("");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
};

export { _LabelRenderer as LabelRenderer };
