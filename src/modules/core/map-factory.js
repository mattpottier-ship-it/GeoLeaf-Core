/*!
 * GeoLeaf Core – Core / Map Factory
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

import { Log } from "../log/index.js";
import { CONSTANTS } from "../constants/index.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

/**
 * Construit les options Leaflet à partir des options GeoLeaf.
 * @param {object} options
 * @returns {object} leafletMapOptions
 */
export function buildLeafletOptions(options) {
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
 * Valide le DOM container et retourne l'élément cible.
 * @param {string} mapId
 * @returns {HTMLElement}
 * @throws {Error} si mapId manquant ou élément introuvable
 */
export function resolveMapContainer(mapId) {
    if (!mapId) throw new Error("L'option obligatoire 'mapId' est manquante.");
    const el = document.getElementById(mapId);
    if (!el) throw new Error(`Aucun élément DOM trouvé pour mapId='${mapId}'.`);
    return el;
}

/**
 * Crée une instance Leaflet Map.
 * @param {HTMLElement} targetEl
 * @param {object} leafletOptions
 * @returns {L.Map}
 */
export function createLeafletMap(targetEl, leafletOptions) {
    if (typeof L === "undefined") {
        throw new Error("Leaflet (L) est introuvable. Assurez-vous d'avoir chargé Leaflet 1.9.x.");
    }
    return L.map(targetEl, leafletOptions);
}

/**
 * Applique le thème via GeoLeaf.UI si disponible.
 * @param {string} theme
 */
export function applyThemeSafe(theme) {
    try {
        if (_g.GeoLeaf?.UI && typeof _g.GeoLeaf.UI.applyTheme === "function") {
            _g.GeoLeaf.UI.applyTheme(theme);
        }
    } catch (err) {
        Log.warn("[GeoLeaf.Core] Impossible d'appliquer le thème :", err);
    }
}

/**
 * Initialise Legend si activé dans la config.
 * @param {L.Map} mapInstance
 */
export function initLegendSafe(mapInstance) {
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
            Log.warn("[GeoLeaf.Core] Impossible d'initialiser Legend :", err);
        }
    }
}
