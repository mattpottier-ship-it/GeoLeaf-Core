/*!
 * GeoLeaf Core – Core / Map Factory
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

import { Log } from "../log/index.js";
import { CONSTANTS } from "../constants/index.js";
declare const L: any;

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

/**
 * Builds thes options Leaflet froms options GeoLeaf.
 * @param {object} options
 * @returns {object} leafletMapOptions
 */
export function buildLeafletOptions(options: any) {
    const center = Array.isArray(options.center) ? options.center : CONSTANTS.DEFAULT_CENTER;
    const zoom = Number.isFinite(options.zoom) ? options.zoom : CONSTANTS.DEFAULT_ZOOM;

    return Object.assign({}, options.mapOptions || {}, {
        center,
        zoom,
        zoomControl: options.mapOptions?.zoomControl ?? true,
        attributionControl: options.mapOptions?.attributionControl ?? false,
        zoomSnap: options.mapOptions?.zoomSnap ?? 1,
        zoomDelta: options.mapOptions?.zoomDelta ?? 1,
        wheelPxPerZoomLevel: options.mapOptions?.wheelPxPerZoomLevel ?? 120,
        preferCanvas: options.mapOptions?.preferCanvas ?? true,
    });
}

/**
 * Valide le DOM container et returnne l'element cible.
 * @param {string} mapId
 * @returns {HTMLElement}
 * @throws {Error} si mapId manquant ou element introuvable
 */
export function resolveMapContainer(mapId: any) {
    if (!mapId) throw new Error("L'option obligatoire 'mapId' est manquante.");
    const el = document.getElementById(mapId);
    if (!el) throw new Error(`No DOM element found for mapId='${mapId}'.`);
    return el;
}

/**
 * Creates ae instance Leaflet Map.
 * @param {HTMLElement} targetEl
 * @param {object} leafletOptions
 * @returns {L.Map}
 */
export function createLeafletMap(targetEl: any, leafletOptions: any) {
    if (typeof L === "undefined") {
        throw new Error("Leaflet (L) not found. Make sure Leaflet 1.9.x is loaded.");
    }
    return L.map(targetEl, leafletOptions);
}

/**
 * Applies the theme via GeoLeaf.UI si available.
 * @param {string} theme
 */
export function applyThemeSafe(theme: any) {
    try {
        if (_g.GeoLeaf?.UI && typeof _g.GeoLeaf.UI.applyTheme === "function") {
            _g.GeoLeaf.UI.applyTheme(theme);
        }
    } catch (err) {
        Log.warn("[GeoLeaf.Core] Error applying theme:", err);
    }
}

/**
 * Initialise Legend si activated in the config.
 * @param {L.Map} mapInstance
 */
export function initLegendSafe(mapInstance: any) {
    const uiConfig = _g.GeoLeaf?.Config?.get ? _g.GeoLeaf.Config.get("ui") : null;
    const showLegend = uiConfig ? uiConfig.showLegend !== false : true;

    if (showLegend && typeof _g.GeoLeaf?.Legend?.init === "function") {
        try {
            _g.GeoLeaf.Legend.init(mapInstance, {
                position: "bottomleft",
                collapsible: true,
                collapsed: false,
            });
        } catch (err) {
            Log.warn("[GeoLeaf.Core] Error initializing legend:", err);
        }
    }
}
