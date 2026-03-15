/*!



 * GeoLeaf Core



 * © 2026 Mattieu Pottier



 * Released under the MIT License



 * https://geoleaf.dev



 */

/**



 * GeoLeaf POI Module - Markers Icon HTML



 * Generation des icons DivIcon Leaflet (mode icon SVG sprite + mode circle simple)



 */

import { Config } from "../config/config-primitives.js";

import { getPoiBaseConfig } from "./markers-config.ts";

/**



 * Builds the icon Leaflet (DivIcon) pour a marker POI.



 * Mode icon : utilise le sprite SVG profile avec circle de fond.



 * Mode simple : circle simple sans icon.



 *



 * @param {object} displayConfig - Configuration d'display { useIcon, iconId, colorFill, colorStroke, radius, weight, fillOpacity, opacity }.



 * @returns {L.DivIcon} Icon Leaflet configured.



 */

function _toColorWithAlpha(color: string | undefined, alpha: any): string {
    if (alpha !== null && typeof alpha === "number" && color && color.startsWith("#")) {
        const r = parseInt(color.slice(1, 3), 16);

        const g = parseInt(color.slice(3, 5), 16);

        const b = parseInt(color.slice(5, 7), 16);

        return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    }

    return color ?? "";
}

function _buildIconModeHtml(
    displayConfig: any,
    colorFill: string,
    colorStroke: string,
    iconSizeIcon: number,
    weight: number
): string {
    const iconsConfig = (Config as any).getIconsConfig?.() ?? null;
    const iconPrefix = (iconsConfig && iconsConfig.symbolPrefix) || "gl-poi-cat-";
    const symbolId =
        iconPrefix + String(displayConfig.iconId).trim().toLowerCase().replace(/\s+/g, "-");
    return [
        `<div class="gl-poi-marker" style="--gl-poi-fill:${colorFill};--gl-poi-stroke:${colorStroke};width:${iconSizeIcon}px;height:${iconSizeIcon}px;">`,
        `<svg class="gl-poi-marker__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" style="overflow: visible;">`,
        `<circle cx="12" cy="12" r="10" fill="${colorFill}" stroke="${colorStroke}" stroke-width="${weight}"/>`,
        `<svg x="2" y="2" width="20" height="20" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" overflow="visible">`,
        `<use href="#${symbolId}" style="color: #ffffff"/>`,
        `</svg></svg></div>`,
    ].join("");
}

function _buildCircleModeHtml(
    colorFill: string,
    colorStroke: string,
    radius: number,
    iconSizeCircle: number,
    weight: number
): string {
    return [
        `<div class="gl-poi-marker" style="--gl-poi-fill:${colorFill};--gl-poi-stroke:${colorStroke};width:${iconSizeCircle}px;height:${iconSizeCircle}px;">`,
        `<svg class="gl-poi-marker__circle" aria-hidden="true" focusable="false">`,
        `<circle cx="50%" cy="50%" r="${radius}" fill="${colorFill}" stroke="${colorStroke}" stroke-width="${weight}" />`,
        `</svg></div>`,
    ].join("");
}

function buildMarkerIcon(displayConfig: any) {
    const baseConfig = getPoiBaseConfig();
    const radius = displayConfig.radius !== undefined ? displayConfig.radius : baseConfig.radius;
    const weight = displayConfig.weight !== undefined ? displayConfig.weight : baseConfig.weight;
    const fillOpacity = displayConfig.fillOpacity;
    const strokeOpacity = displayConfig.opacity;
    const iconSizeCircle = Math.max(Math.round(radius * 2 + weight * 2), 8);
    const iconSizeIcon = Math.max(Math.round(radius * 2 + weight * 2), 16);
    const colorFill = _toColorWithAlpha(displayConfig.colorFill, fillOpacity);
    const colorStroke = _toColorWithAlpha(displayConfig.colorStroke, strokeOpacity);
    const L = (globalThis as any).L;
    if (displayConfig.useIcon && displayConfig.iconId) {
        return L.divIcon({
            html: _buildIconModeHtml(displayConfig, colorFill, colorStroke, iconSizeIcon, weight),
            className: "gl-poi-divicon",
            iconSize: [iconSizeIcon, iconSizeIcon],
            iconAnchor: [iconSizeIcon / 2, iconSizeIcon / 2],
            popupAnchor: [0, -(iconSizeIcon / 2)],
        });
    }
    return L.divIcon({
        html: _buildCircleModeHtml(colorFill, colorStroke, radius, iconSizeCircle, weight),
        className: "gl-poi-divicon",
        iconSize: [iconSizeCircle, iconSizeCircle],
        iconAnchor: [iconSizeCircle / 2, iconSizeCircle / 2],
        popupAnchor: [0, -(iconSizeCircle / 2)],
    });
}

export { buildMarkerIcon };
