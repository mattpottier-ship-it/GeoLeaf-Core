/**
 * GeoLeaf Data Normalizer Module
 * Module central for the normalisation des data provenant de different sources.
 * Converts JSON, GeoJSON, GPX (future) et Routes vers un format POI unified.
 *
 * @module data/normalizer
 * @version 1.0.0
 */
"use strict";

import { getLog } from "../utils/general-utils.js";

// ========================================
//   TYPES DE SOURCES
// ========================================

const SOURCE_TYPES = {
    JSON: "json",
    GEOJSON: "geojson",
    GPX: "gpx",
    ROUTE: "route",
};

// ========================================
//   UTILITAIRES
// ========================================

// getLog imported from general-utils.js (Phase 4 dedup)

/**
 * Generates a ID unique
 * @returns {string}
 */
function generateUniqueId() {
    return "poi_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

/**
 * Determines the type of geometry froms coordinates Leaflet
 * @param {Object} layer - Layer Leaflet
 * @returns {string} 'Point', 'Polygon', 'LineString' ou 'Unknown'
 */
function detectGeometryType(layer: any) {
    if (!layer) return "Unknown";

    if (typeof layer.getLatLng === "function") {
        return "Point";
    }
    if (typeof layer.getLatLngs === "function") {
        const latLngs = layer.getLatLngs();
        // Polygon : array de arrayx de points (anneau outer + trous potential)
        // LineString : array de points
        if (Array.isArray(latLngs) && latLngs.length > 0) {
            if (Array.isArray(latLngs[0]) && Array.isArray(latLngs[0][0])) {
                return "Polygon";
            }
            if (Array.isArray(latLngs[0])) {
                // Can be Polygon ou LineString selon si closed
                return "Polygon";
            }
            return "LineString";
        }
    }
    return "Unknown";
}

/**
 * Extrait les coordinates of a layer Leaflet
 * @param {Object} layer - Layer Leaflet
 * @returns {Array|null} Coordinates [lat, lng] ou null
 */
/* eslint-disable complexity -- layer type branchs */
function extractCoordinates(layer: any) {
    if (!layer) return null;

    if (typeof layer.getLatLng === "function") {
        const ll = layer.getLatLng();
        return ll ? [ll.lat, ll.lng] : null;
    }

    if (typeof layer.getCenter === "function") {
        const center = layer.getCenter();
        return center ? [center.lat, center.lng] : null;
    }

    if (typeof layer.getBounds === "function") {
        try {
            const bounds = layer.getBounds();
            if (bounds && bounds.isValid()) {
                const center = bounds.getCenter();
                return center ? [center.lat, center.lng] : null;
            }
        } catch (_e) {
            // Bounds invalids
        }
    }

    return null;
}
/* eslint-enable complexity */

// ========================================
//   NORMALISEURS PAR TYPE DE SOURCE
// ========================================

/**
 * Normalise une input JSON en POI
 * @param {Object} data - Data JSON brutes
 * @param {Object} layerConfig - Configuration du layer
 * @returns {Object} POI normalized
 */
/* eslint-disable complexity, security/detect-object-injection -- config-driven field mapping */
function normalizeFromJSON(data: any, layerConfig: any = {}) {
    if (!data) return null;

    const id = data.id || data.uid || data.guid || generateUniqueId();
    const dataMapping = layerConfig.dataMapping || {};

    // Extraction du title
    const titleField = dataMapping.title || "title";
    const title =
        data[titleField] || data.title || data.name || data.label || data.nom || "Sans titre";

    // Extraction de la description
    const descField = dataMapping.description || "description";
    const description = data[descField] || data.description || data.shortDescription || "";

    // Extraction des coordinates
    const latField = dataMapping.lat || "lat";
    const lngField = dataMapping.lng || "lng";
    let lat = data[latField];
    let lng = data[lngField];

    // Fallbacks pour coordinates
    if (lat === undefined) lat = data.latitude || data.y;
    if (lng === undefined) lng = data.longitude || data.lng || data.x;

    // Extraction category/sous-category
    const catField = dataMapping.categoryId || "categoryId";
    const subCatField = dataMapping.subCategoryId || "subCategoryId";
    const categoryId = data[catField] || data.categoryId || data.category || null;
    const subCategoryId = data[subCatField] || data.subCategoryId || data.subcategory || null;

    // Building des attributes (toutes les properties)
    const attributes = { ...data };

    return {
        id: String(id),
        sourceType: SOURCE_TYPES.JSON,
        geometryType: "Point",
        title: String(title),
        description: String(description || ""),
        lat: lat !== undefined ? parseFloat(lat) : null,
        lng: lng !== undefined ? parseFloat(lng) : null,
        categoryId: categoryId,
        subCategoryId: subCategoryId,
        attributes: attributes,
        rawData: data,
    };
}
/* eslint-enable complexity, security/detect-object-injection */

/**
 * Normalise une feature GeoJSON en POI
 * @param {Object} feature - Feature GeoJSON
 * @param {Object} layerConfig - Configuration du layer
 * @param {Object} layer - Layer Leaflet (optional, pour coordinates)
 * @returns {Object} POI normalized
 */
/* eslint-disable complexity, max-lines-per-function, security/detect-object-injection -- GeoJSON field mapping */
function normalizeFromGeoJSON(feature: any, layerConfig: any = {}, layer: any = null) {
    if (!feature) return null;

    const props = feature.properties || {};
    const geometry = feature.geometry || {};
    const dataMapping = layerConfig.dataMapping || {};

    // ID
    const id = feature.id || props.id || props.uid || props.guid || generateUniqueId();

    // Type of geometry
    let geometryType = geometry.type || "Unknown";
    if (layer && geometryType === "Unknown") {
        geometryType = detectGeometryType(layer);
    }

    // Extraction du title
    const titleField = dataMapping.title || "title";
    const titlePath = titleField.includes(".") ? titleField.split(".").pop() : titleField;
    const title =
        props[titlePath] || props.name || props.nom || props.title || props.label || "Sans titre";

    // Extraction de la description
    const descField = dataMapping.description || "description";
    const descPath = descField.includes(".") ? descField.split(".").pop() : descField;
    const description = props[descPath] || props.description || props.shortDescription || "";

    // Coordinates
    let lat = null,
        lng = null;
    if (geometry.coordinates) {
        if (geometryType === "Point") {
            // GeoJSON : [lng, lat]
            lng = geometry.coordinates[0];
            lat = geometry.coordinates[1];
        } else if (layer) {
            const coords = extractCoordinates(layer);
            if (coords) {
                lat = coords[0];
                lng = coords[1];
            }
        } else if (geometry.coordinates.length > 0) {
            // Calculatesr le centre approximatif
            const flatCoords = flattenCoordinates(geometry.coordinates, geometry.type);
            if (flatCoords.length > 0) {
                let sumLat = 0,
                    sumLng = 0;
                flatCoords.forEach((c) => {
                    sumLng += c[0];
                    sumLat += c[1];
                });
                lng = sumLng / flatCoords.length;
                lat = sumLat / flatCoords.length;
            }
        }
    } else if (layer) {
        const coords = extractCoordinates(layer);
        if (coords) {
            lat = coords[0];
            lng = coords[1];
        }
    }

    // Category/sub-category
    const catField = dataMapping.categoryId || "categoryId";
    const catPath = catField.includes(".") ? catField.split(".").pop() : catField;
    const subCatField = dataMapping.subCategoryId || "subCategoryId";
    const subCatPath = subCatField.includes(".") ? subCatField.split(".").pop() : subCatField;

    const categoryId = props[catPath] || props.categoryId || props.category || null;
    const subCategoryId = props[subCatPath] || props.subCategoryId || props.subcategory || null;

    // Building des attributes
    // Hoist nested props.attributes.* fields to top level so that config paths like
    // "attributes.reviews.rating" resolve correctly when the GeoJSON stores rich data
    // under properties.attributes (e.g. reviews, gallery, photo, etc.)
    const nestedAttrs =
        props.attributes && typeof props.attributes === "object" ? props.attributes : {};
    const attributes = { ...props, ...nestedAttrs };

    return {
        id: String(id),
        sourceType: SOURCE_TYPES.GEOJSON,
        geometryType: geometryType,
        title: String(title),
        description: String(description || ""),
        lat: lat !== null ? parseFloat(lat) : null,
        lng: lng !== null ? parseFloat(lng) : null,
        categoryId: categoryId,
        subCategoryId: subCategoryId,
        attributes: attributes,
        properties: props, // Conserve aussi properties pour compatibility
        rawData: feature,
    };
}
/* eslint-enable complexity, max-lines-per-function, security/detect-object-injection */

/**
 * Aplatit les coordinates GeoJSON selon the type of geometry
 * @param {Array} coords - Coordinates nestedes
 * @param {string} type - Type of geometry
 * @returns {Array} Array de [lng, lat]
 */
function flattenCoordinates(coords: any, type: any) {
    if (!coords || !Array.isArray(coords)) return [];

    switch (type) {
        case "Point":
            return [coords];
        case "MultiPoint":
        case "LineString":
            return coords;
        case "MultiLineString":
        case "Polygon":
            return coords.flat();
        case "MultiPolygon":
            return coords.flat(2);
        default: {
            // Aplatir recursively
            const flat: any[] = [];
            const flatten = (arr: any) => {
                if (!Array.isArray(arr)) return;
                if (typeof arr[0] === "number") {
                    flat.push(arr);
                } else {
                    arr.forEach(flatten);
                }
            };
            flatten(coords);
            return flat;
        }
    }
}

/**
 * Normalise un waypoint GPX en POI (placeholder pour futur module)
 * @param {Object} waypoint - Waypoint GPX
 * @param {Object} layerConfig - Configuration du layer
 * @returns {Object} POI normalized
 */
/* eslint-disable complexity -- GPX field fallbacks */
function normalizeFromGPX(waypoint: any, _layerConfig: any = {}) {
    if (!waypoint) return null;

    getLog().info("[Normalizer] GPX normalization - placeholder for future implementation");

    // Structure de base pour GPX
    const id = waypoint.name || waypoint.sym || generateUniqueId();
    const title = waypoint.name || waypoint.cmt || "Point GPX";
    const description = waypoint.desc || waypoint.cmt || "";

    return {
        id: String(id),
        sourceType: SOURCE_TYPES.GPX,
        geometryType: "Point",
        title: String(title),
        description: String(description),
        lat: waypoint.lat !== undefined ? parseFloat(waypoint.lat) : null,
        lng: waypoint.lon !== undefined ? parseFloat(waypoint.lon) : null,
        categoryId: waypoint.type || null,
        subCategoryId: null,
        attributes: { ...waypoint },
        rawData: waypoint,
    };
}
/* eslint-enable complexity */

/**
 * Normalise un point de route en POI
 * @param {Object} routePoint - Point de route
 * @param {Object} routeConfig - Configuration de la route
 * @returns {Object} POI normalized
 */
/* eslint-disable complexity -- route point field fallbacks */
function normalizeFromRoute(routePoint: any, _routeConfig: any = {}) {
    if (!routePoint) return null;

    const id = routePoint.id || routePoint.placeId || generateUniqueId();
    const title = routePoint.name || routePoint.title || routePoint.address || "Point de route";
    const description = routePoint.description || routePoint.comment || "";

    let lat = null,
        lng = null;
    if (routePoint.latLng) {
        lat = routePoint.latLng.lat;
        lng = routePoint.latLng.lng;
    } else if (routePoint.lat !== undefined && routePoint.lng !== undefined) {
        lat = routePoint.lat;
        lng = routePoint.lng;
    }

    return {
        id: String(id),
        sourceType: SOURCE_TYPES.ROUTE,
        geometryType: "Point",
        title: String(title),
        description: String(description),
        lat: lat !== null ? parseFloat(lat) : null,
        lng: lng !== null ? parseFloat(lng) : null,
        categoryId: routePoint.type || "route-point",
        subCategoryId: routePoint.order !== undefined ? `stop-${routePoint.order}` : null,
        order: routePoint.order,
        address: routePoint.address,
        attributes: { ...routePoint },
        rawData: routePoint,
    };
}
/* eslint-enable complexity */

// ========================================
//   FONCTION PRINCIPALE
// ========================================

/**
 * Normalise des data based on theur type of source
 * @param {string} sourceType - Type of source ('json', 'geojson', 'gpx', 'route')
 * @param {Object} data - Data brutes
 * @param {Object} layerConfig - Configuration du layer
 * @param {Object} options - Options additionnelles (layer Leaflet, etc.)
 * @returns {Object} POI normalized
 */
function normalizeFeature(sourceType: any, data: any, layerConfig: any = {}, options: any = {}) {
    if (!data) {
        getLog().warn("[Normalizer] Null data for normalization");
        return null;
    }

    switch (sourceType) {
        case SOURCE_TYPES.JSON:
            return normalizeFromJSON(data, layerConfig);

        case SOURCE_TYPES.GEOJSON:
            return normalizeFromGeoJSON(data, layerConfig, options.layer);

        case SOURCE_TYPES.GPX:
            return normalizeFromGPX(data, layerConfig);

        case SOURCE_TYPES.ROUTE:
            return normalizeFromRoute(data, layerConfig);

        default:
            getLog().warn("[Normalizer] Unrecognized source type:", sourceType);
            // Tenter une detection automatic
            return autoDetectAndNormalize(data, layerConfig, options);
    }
}

/**
 * Detects automaticment the type of source et normalise
 * @param {Object} data - Data brutes
 * @param {Object} layerConfig - Configuration du layer
 * @param {Object} options - Options additionnelles
 * @returns {Object} POI normalized
 */
function autoDetectAndNormalize(data: any, layerConfig: any = {}, options: any = {}) {
    // Detection GeoJSON
    if (data.type === "Feature" && data.geometry) {
        return normalizeFromGeoJSON(data, layerConfig, options.layer);
    }

    // Detection GPX (waypoint)
    if (data.lat !== undefined && data.lon !== undefined && (data.name || data.sym)) {
        return normalizeFromGPX(data, layerConfig);
    }

    // Detection Route
    if (data.latLng || (data.order !== undefined && data.address)) {
        return normalizeFromRoute(data, layerConfig);
    }

    // By default : JSON
    return normalizeFromJSON(data, layerConfig);
}

/**
 * Normalise un data table
 * @param {string} sourceType - Type of source
 * @param {Array} dataArray - Data table brutes
 * @param {Object} layerConfig - Configuration du layer
 * @param {Object} options - Options additionnelles
 * @returns {Array} Array de POIs normalized
 */
function normalizeCollection(
    sourceType: any,
    dataArray: any,
    layerConfig: any = {},
    options: any = {}
) {
    if (!Array.isArray(dataArray)) {
        getLog().warn("[Normalizer] normalizeCollection expects an array");
        return [];
    }

    return dataArray
        .map((data) => normalizeFeature(sourceType, data, layerConfig, options))
        .filter((poi) => poi !== null);
}

// ========================================
//   EXPORT
// ========================================

const DataNormalizer = {
    // Types de sources
    SOURCE_TYPES,

    // Normaliseurs par type
    normalizeFromJSON,
    normalizeFromGeoJSON,
    normalizeFromGPX,
    normalizeFromRoute,

    // Fonctions maines
    normalizeFeature,
    autoDetectAndNormalize,
    normalizeCollection,

    // Utilitaires
    detectGeometryType,
    extractCoordinates,
    generateUniqueId,
};

// Log de loading
getLog().info("[GeoLeaf._Normalizer] Module Normalizer loaded");

export { DataNormalizer };
