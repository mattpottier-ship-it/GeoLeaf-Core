/*!



 * GeoLeaf Core



 * © 2026 Mattieu Pottier



 * Released under the MIT License



 * https://geoleaf.dev



 */

/**



 * GeoLeaf POI Module - Markers Config



 * Configuration de base des markers POI (read profile active + CSS variables)



 */

import { Log } from "../log/index.js";

import { Config } from "../config/config-primitives.js";

/**



 * Obtient la configuration de base des POI depuis the profile active.



 *



 * @returns {object} Configuration de base { radius, weight, colorFill, colorStroke, fillOpacity, opacity, showIconsOnMap }.



 */

function _applyPoiProfileOverrides(poiCfg: any, base: any): void {
    if (typeof poiCfg.radius === "number") base.radius = poiCfg.radius;

    if (typeof poiCfg.weight === "number") base.weight = poiCfg.weight;

    if (typeof poiCfg.fillOpacity === "number") base.fillOpacity = poiCfg.fillOpacity;

    if (typeof poiCfg.opacity === "number") base.opacity = poiCfg.opacity;

    if (typeof poiCfg.showIconsOnMap === "boolean") base.showIconsOnMap = poiCfg.showIconsOnMap;

    if (typeof poiCfg.colorFill === "string") base.colorFill = poiCfg.colorFill;

    if (typeof poiCfg.colorStroke === "string") base.colorStroke = poiCfg.colorStroke;
}

function _getComputedPoiColors(base: any): void {
    if (
        typeof document !== "undefined" &&
        typeof window !== "undefined" &&
        typeof (window as any).getComputedStyle === "function"
    ) {
        const root = getComputedStyle(document.documentElement);

        const fillCss = root.getPropertyValue("--gl-color-poi-fill-default").trim();

        const strokeCss = root.getPropertyValue("--gl-color-poi-stroke-default").trim();

        if (fillCss && !base.colorFill) base.colorFill = fillCss;

        if (strokeCss && !base.colorStroke) base.colorStroke = strokeCss;
    }
}

function getPoiBaseConfig() {
    const base = {
        radius: 6,

        weight: 1.5,

        colorFill: "#4a90e5",

        colorStroke: "#ffffff",

        fillOpacity: 0.8,

        opacity: 0.9,

        showIconsOnMap: true,
    };

    try {
        const ConfigAny = Config as any;

        if (ConfigAny && typeof ConfigAny.getActiveProfile === "function") {
            const poiCfg = ConfigAny.getActiveProfile()?.appearance?.poi;

            if (poiCfg) _applyPoiProfileOverrides(poiCfg, base);
        }

        _getComputedPoiColors(base);
    } catch (err: any) {
        if (Log) Log.warn("[POI] getPoiBaseConfig() : Erreur lecture config :", err);
    }

    return base;
}

export { getPoiBaseConfig };
