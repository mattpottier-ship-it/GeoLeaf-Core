/**
 * GeoLeaf UI Filter Panel - Shared Helpers
 * Fonctions utilitaires sharedes pour the panel de filtres
 *
 * @module ui/filter-panel/shared
 */
"use strict";

import { getNestedValue } from "../../utils/object-utils.js";
import { getLog } from "../../utils/general-utils.js";
import { GeoJSONCore } from "../../geojson/core.js";
import { Config as _Config } from "../../config/geoleaf-config/config-core.js";
const Config: any = _Config;
const _runtime: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
// _runtime used only for legacy demo fallback (_runtime.cfg)

const FilterPanelShared: any = {};

function _isPointGeom(geom: any): boolean {
    return geom?.type?.toLowerCase().indexOf("point") !== -1;
}

function _isLineGeom(geom: any): boolean {
    return geom?.type?.toLowerCase().indexOf("line") !== -1;
}

function _enrichPoiProps(poi: any, props: any, feature: any, latlng: any): void {
    if (!poi.title && props.name) poi.title = props.name;
    if (!poi.id && feature.id) poi.id = feature.id;
    if (!poi.latlng && latlng) poi.latlng = latlng;
    if (!poi.attributes && props.attributes) poi.attributes = props.attributes;
}

function _enrichRouteProps(route: any, props: any, feature: any): void {
    if (!route.title && props.name) route.title = props.name;
    if (!route.id && feature.id) route.id = feature.id;
}

function _isProtectedArea(props: any): boolean {
    const hasOtherProperties = Object.keys(props).some(
        (key) => !["fid", "name", "Name", "region", "REGION", "Region"].includes(key)
    );
    return !hasOtherProperties && (props.fid !== undefined || props.Name);
}

// ========================================
//   CONVERSION DE FEATURES
// ========================================

/**
 * Converts ae feature GeoJSON Point en object POI-like
 * @param {Object} feature - Feature GeoJSON
 * @returns {Object|null} - POI-like ou null
 */
FilterPanelShared.featureToPoiLike = function (feature: any) {
    if (!feature || !feature.geometry || !feature.properties) return null;

    const geom = feature.geometry;
    if (!geom || !_isPointGeom(geom)) return null;

    const coords = Array.isArray(geom.coordinates) ? geom.coordinates : null;
    const latlng = coords && coords.length >= 2 ? [coords[1], coords[0]] : null;
    const props = feature.properties ?? {};
    const poi = Object.assign({}, props);

    _enrichPoiProps(poi, props, feature, latlng);

    return poi;
};

/**
 * Converts ae feature GeoJSON LineString en object Route-like
 * @param {Object} feature - Feature GeoJSON
 * @returns {Object|null} - Route-like ou null
 */
FilterPanelShared.featureToRouteLike = function (feature: any) {
    if (!feature || !feature.geometry || !feature.properties) return null;

    const geom = feature.geometry;
    if (!geom || !_isLineGeom(geom)) return null;

    const props = feature.properties ?? {};

    // Exclude protected areas (aires_protegees_nationales) - they should not be treated as routes/itineraries
    if (_isProtectedArea(props)) return null;

    const route = Object.assign({}, props);
    _enrichRouteProps(route, props, feature);
    route.geometry = geom;

    return route;
};

// ========================================
//   DATA RETRIEVAL
// ========================================

function _resolvePoiFromGeoJSON(featureToPoiLike: (f: any) => any): any[] | null {
    if (!GeoJSONCore || typeof GeoJSONCore.getFeatures !== "function") return null;
    const feats = GeoJSONCore.getFeatures({ geometryTypes: ["point"] }) ?? [];
    const pois = feats.map(featureToPoiLike).filter(Boolean);
    return pois.length ? pois : null;
}

function _resolvePoiFromConfig(): any[] | null {
    if (!Config) return null;
    if (typeof Config.get === "function") {
        const fromGet = Config.get("poi");
        if (Array.isArray(fromGet)) return fromGet;
    }
    if (Array.isArray(Config._activeProfileData?.poi)) return Config._activeProfileData.poi;
    return null;
}

function _resolveRoutesFromGeoJSON(featureToRouteLike: (f: any) => any): any[] | null {
    if (!GeoJSONCore || typeof GeoJSONCore.getFeatures !== "function") return null;
    const feats =
        GeoJSONCore.getFeatures({ geometryTypes: ["line", "linestring", "multilinestring"] }) ?? [];
    const routes = feats.map(featureToRouteLike).filter(Boolean);
    return routes.length ? routes : null;
}

function _resolveRoutesFromConfig(): any[] | null {
    if (!Config) return null;
    if (typeof Config.get === "function") {
        const fromGet = Config.get("routes");
        if (Array.isArray(fromGet)) return fromGet;
    }
    if (Array.isArray(Config._activeProfileData?.routes)) return Config._activeProfileData.routes;
    return null;
}

/**
 * Retrieves tous les POI from thes different sources
 * @returns {Array} - List des POI
 */
FilterPanelShared.getBasePois = function () {
    const Log = getLog();

    try {
        const result = _resolvePoiFromGeoJSON(FilterPanelShared.featureToPoiLike);
        if (result) return result;
    } catch (err) {
        Log.warn("[GeoLeaf.UI.FilterPanel] Error retrieving POI via GeoJSON:", err);
    }

    try {
        const result = _resolvePoiFromConfig();
        if (result) return result;
    } catch (err) {
        Log.warn("[GeoLeaf.UI.FilterPanel] Error retrieving POI via Config:", err);
    }

    if (_runtime.cfg && Array.isArray(_runtime.cfg.poi)) return _runtime.cfg.poi;
    return [];
};

/**
 * Retrieves toutes les routes from thes different sources
 * @returns {Array} - List des routes
 */
FilterPanelShared.getBaseRoutes = function () {
    const Log = getLog();

    try {
        const result = _resolveRoutesFromGeoJSON(FilterPanelShared.featureToRouteLike);
        if (result) return result;
    } catch (err) {
        Log.warn("[GeoLeaf.UI.FilterPanel] Error retrieving routes via GeoJSON:", err);
    }

    try {
        const result = _resolveRoutesFromConfig();
        if (result) return result;
    } catch (err) {
        Log.warn("[GeoLeaf.UI.FilterPanel] Error retrieving routes via Config:", err);
    }

    if (_runtime.cfg && Array.isArray(_runtime.cfg.routes)) return _runtime.cfg.routes;
    return [];
};

// ========================================
//   UTILITAIRES
// ========================================

/**
 * Returns the element DOM du filter panels.
 * Priority au conteneur flottant #gl-filter-panel, puis fallback #gl-left-panel.
 * @returns {HTMLElement|null}
 */
FilterPanelShared.getFilterPanelElement = function () {
    let el = document.getElementById("gl-filter-panel");
    if (el) return el;

    el = document.getElementById("gl-left-panel");
    if (el) return el;

    const Log = getLog();
    Log.warn(
        "[GeoLeaf.UI.FilterPanel] No filter panel container found (#gl-filter-panel / #gl-left-panel)."
    );

    return null;
};

/**
 * Access to a nested property (Phase 4 dedup: delegates to Utils)
 */
FilterPanelShared.getNestedValue = getNestedValue;

/**
 * Extracts a representative point from a geometry (for distance calculation)
 * @param {Object} geometry - GeoJSON geometry
 * @returns {Object|null} - { lat, lng } ou null
 */
function _coordToLatLng(coords: any): { lng: number; lat: number } | null {
    return coords ? { lng: coords[0], lat: coords[1] } : null;
}

function _midPoint(coordsArray: any[]): { lng: number; lat: number } | null {
    if (!coordsArray || coordsArray.length === 0) return null;
    const c = coordsArray[Math.floor(coordsArray.length / 2)];
    return { lng: c[0], lat: c[1] };
}

FilterPanelShared.getRepresentativePoint = function (geometry: any) {
    if (!geometry || !geometry.coordinates) return null;

    switch (geometry.type) {
        case "Polygon":
            return _coordToLatLng(geometry.coordinates[0][0]);
        case "MultiPolygon":
            return _coordToLatLng(geometry.coordinates[0][0][0]);
        case "LineString":
            return _midPoint(geometry.coordinates);
        case "MultiLineString":
            return _midPoint(geometry.coordinates[0]);
        case "Point":
            return { lng: geometry.coordinates[0], lat: geometry.coordinates[1] };
        case "MultiPoint":
            return _coordToLatLng(geometry.coordinates[0]);
        default:
            return null;
    }
};

/**
 * Collecte tous les tags uniques from a list d'items
 * @param {Array} items - List d'items (POI, routes)
 * @returns {Array} - Tags uniques sorted
 */
FilterPanelShared.collectAllTags = function (items: any) {
    const tagSet = new Set();

    items.forEach(function (item: any) {
        // Support GeoJSON properties.attributes.tags, item.attributes.tags, et item.tags
        const props = item.properties || item;
        const attrs = props.attributes || item.attributes || {};
        const tags = attrs.tags || props.tags || item.tags;

        if (Array.isArray(tags) && tags.length > 0) {
            tags.forEach(function (t) {
                if (t && typeof t === "string") {
                    tagSet.add(t);
                }
            });
        }
    });

    const arr = Array.from(tagSet);
    arr.sort();
    return arr;
};

export { FilterPanelShared };
