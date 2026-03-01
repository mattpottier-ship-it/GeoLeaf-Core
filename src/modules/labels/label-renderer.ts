/**
 * Module Label Renderer pour GeoLeaf
 * Crée et gère les tooltips permanents Leaflet pour les étiquettes
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
                Log.warn("[LabelRenderer] Paramètres invalides pour createTooltipsForLayer", {
                    layerId,
                    hasLeafletLayer: !!leafletLayer,
                    hasLabelConfig: !!labelConfig,
                    labelId: labelConfig?.labelId,
                });
            return;
        }
        const labelField = labelConfig.labelId;
        if (Log)
            Log.debug(`[LabelRenderer] Création tooltips pour ${layerId}, champ: ${labelField}`);
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
                if (Log) Log.warn("[LabelRenderer] Erreur création tooltip:", err);
            }
        });
        if (Log)
            Log.debug(
                `[LabelRenderer] ${tooltipsMap.size} tooltips créés pour ${layerId} (${featureCount} features parcourues)`
            );
    },

    _createTooltipForFeature(
        featureLayer: any,
        labelField: string,
        style: LabelStyleLike,
        tooltipsMap: Map<string, unknown>
    ): void {
        const feature = featureLayer.feature;
        if (!feature || !feature.properties) {
            if (Log) Log.debug("[LabelRenderer] Feature ou properties manquant");
            return;
        }
        const labelValue = (this as any)._extractFieldValue(feature.properties, labelField);
        if (!labelValue) return;
        let position:
            | { lat: number; lng: number }
            | { lat: () => number; lng: () => number }
            | null = null;
        if (typeof featureLayer.getLatLng === "function") {
            position = featureLayer.getLatLng();
        } else if (typeof featureLayer.getBounds === "function") {
            const bounds = featureLayer.getBounds();
            if (bounds && typeof bounds.getCenter === "function") position = bounds.getCenter();
        } else if (typeof featureLayer.getLatLngs === "function") {
            const latlngs = featureLayer.getLatLngs();
            if (latlngs && latlngs.length > 0) {
                const flatLatlngs = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
                if (flatLatlngs && flatLatlngs.length > 0) {
                    const middleIndex = Math.floor(flatLatlngs.length / 2);
                    position = flatLatlngs[middleIndex];
                }
            }
        }
        if (!position) {
            if (Log)
                Log.debug(
                    "[LabelRenderer] Position null pour feature, skipping label. Label:",
                    labelValue
                );
            return;
        }
        const lat =
            typeof position.lat === "function" ? (position as any).lat() : (position as any).lat;
        const lng =
            typeof position.lng === "function" ? (position as any).lng() : (position as any).lng;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
        const htmlContent = (this as any)._formatLabelContent(labelValue, style);
        const L = (globalThis as any).L;
        if (!L) return;
        const labelIcon = L.divIcon({
            html: htmlContent,
            className: (this as any)._buildClassName(style),
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
            const featureId =
                feature.id || feature.properties.id || `feature_${Date.now()}_${Math.random()}`;
            tooltipsMap.set(String(featureId), labelMarker);
        } else {
            if (Log) Log.warn("[LabelRenderer] Carte non disponible pour", labelValue);
        }
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
        if (style.font) {
            if (style.font.family)
                element.style.setProperty(
                    "font-family",
                    `"${style.font.family}", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`,
                    "important"
                );
            if (style.font.sizePt)
                element.style.setProperty("font-size", `${style.font.sizePt}pt`, "important");
            if (style.font.bold) element.style.setProperty("font-weight", "bold", "important");
            else if (style.font.weight)
                element.style.setProperty(
                    "font-weight",
                    String(style.font.weight < 400 ? 500 : style.font.weight),
                    "important"
                );
            if (style.font.italic) element.style.setProperty("font-style", "italic", "important");
        }
        if (style.color) element.style.setProperty("color", style.color, "important");
        if (style.opacity !== undefined)
            element.style.setProperty("opacity", String(style.opacity), "important");
        if (style.buffer && style.buffer.enabled) {
            const bufferColor = style.buffer.color || "#ffffff";
            const bufferOpacity = style.buffer.opacity !== undefined ? style.buffer.opacity : 1;
            const bufferSize = style.buffer.sizePx || 2;
            const rgba = (this as any)._hexToRgba(bufferColor, bufferOpacity);
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
            shadowParts.push(
                `0 0 ${bufferSize * 0.8}px ${rgba}`,
                `0 0 ${bufferSize * 1.5}px ${rgba}`
            );
            element.style.setProperty("text-shadow", shadowParts.join(", "), "important");
        }
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
