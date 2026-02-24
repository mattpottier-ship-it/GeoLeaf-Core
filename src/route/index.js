/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/route/index.js — SHIM LEGACY
 * Rétrocompatibilité : expose Route depuis src/route/ → src/modules/geoleaf.route.js
 * + fonctions individuelles depuis les sous-modules de route/
 * @module src/route
 */
import { Route } from '../modules/geoleaf.route.js';
import { RouteLoaders } from '../modules/route/loaders.js';
import { RouteStyleResolver } from '../modules/route/style-resolver.js';

// parseGPX: RouteLoaders n'a pas parseGPX — implémentation synchrone pour tests/legacy
export function parseGPX(gpxText) {
    if (gpxText == null || typeof gpxText !== 'string' || gpxText.trim() === '') return [];
    const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
    if (!parser) return [];
    const doc = parser.parseFromString(gpxText, 'text/xml');
    const trkpts = doc.querySelectorAll('trkpt');
    const coords = [];
    trkpts.forEach((pt) => {
        const lat = parseFloat(pt.getAttribute('lat'));
        const lon = parseFloat(pt.getAttribute('lon'));
        if (Number.isFinite(lat) && Number.isFinite(lon)) coords.push([lat, lon]);
    });
    return coords;
}
// Adapter: tests use (route, taxonomy, defaultColor); API uses (route, profile, routeConfigDefault)
function routeGetRouteColor(route, taxonomyOrProfile, defaultColor) {
    if (!route) return defaultColor || '#1E88E5';
    if (route.properties?.color) return route.properties.color;
    const profile = taxonomyOrProfile && taxonomyOrProfile.categories
        ? { taxonomy: { categories: taxonomyOrProfile.categories } }
        : taxonomyOrProfile;
    const routeConfigDefault = typeof defaultColor === 'string' ? { color: defaultColor } : { color: '#1E88E5' };
    const attrs = route.attributes || { categoryId: route.categoryId, subCategoryId: route.subCategoryId };
    return RouteStyleResolver.getRouteColor({ ...route, attributes: attrs }, profile, routeConfigDefault) || defaultColor || '#1E88E5';
}
export const getRouteColor = routeGetRouteColor;
export function resolveRouteStyle(route, a, b, c) {
    const defaultStyle = (a && typeof a === 'object' && ('color' in a || 'weight' in a)) ? a : undefined;
    const activeProfile = (a && a.taxonomy) ? a : (c && c.categories ? { taxonomy: { categories: c.categories } } : a);
    const routeConfigDefault = (b && typeof b === 'object') ? b : {};
    const routeWithAttrs = route && (route.attributes || route.categoryId != null)
        ? { ...route, attributes: route.attributes || { categoryId: route.categoryId, subCategoryId: route.subCategoryId } }
        : route;
    const result = RouteStyleResolver?.resolveRouteStyle?.(routeWithAttrs, activeProfile, routeConfigDefault, defaultStyle);
    return result && typeof result === 'object' ? { opacity: 0.8, ...result } : { color: '#1E88E5', weight: 4, opacity: 0.8 };
}
// Tests call (route, moduleOptions, profileEndpoints); API is (route, profileEndpoints, moduleOptions)
export function resolveEndpointConfig(route, moduleOptions, profileEndpoints) {
    return RouteStyleResolver?.resolveEndpointConfig?.(route, profileEndpoints, moduleOptions) || { showStart: true, showEnd: true, startStyle: {}, endStyle: {} };
}

// Helper: normalise [lng, lat] → [lat, lng]
function toLatLng(coord) {
    if (!Array.isArray(coord) || coord.length < 2) return null;
    return [Number(coord[1]), Number(coord[0])];
}

export function extractRouteCoords(route) {
    if (!route) return [];
    if (route.coordinates && Array.isArray(route.coordinates)) return route.coordinates;
    if (route.coords && Array.isArray(route.coords)) return route.coords;
    const geom = route.geometry;
    if (!geom) return [];
    if (Array.isArray(geom)) {
        if (geom.length && Array.isArray(geom[0])) return geom;
        // Nested: [ { type: 'LineString', coordinates: [[lng,lat],...] } ]
        if (geom[0] && geom[0].type === 'LineString' && Array.isArray(geom[0].coordinates)) {
            return geom[0].coordinates.map(c => toLatLng(c)).filter(Boolean);
        }
        return [];
    }
    if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
        return geom.coordinates.map(c => toLatLng(c)).filter(Boolean);
    }
    if (geom.type === 'MultiLineString' && Array.isArray(geom.coordinates)) {
        return geom.coordinates.flat().map(c => toLatLng(c)).filter(Boolean);
    }
    if (Array.isArray(geom) && geom[0] && geom[0].type === 'LineString' && Array.isArray(geom[0].coordinates)) {
        return geom[0].coordinates.map(c => toLatLng(c)).filter(Boolean);
    }
    return [];
}
export function getDistance(lat1, lng1, lat2, lng2) {
    // Haversine simplifié
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export function calculateRouteDistance(coords = []) {
    let total = 0;
    for (let i = 1; i < coords.length; i++) total += getDistance(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1]);
    return total;
}
export function calculateElevation(coords = []) {
    const elvs = (coords || []).map(c => c[2]).filter(e => typeof e === 'number' && Number.isFinite(e));
    if (!elvs.length) return { gain: 0, loss: 0, min: 0, max: 0 };
    let gain = 0, loss = 0;
    for (let i = 1; i < elvs.length; i++) { const d = elvs[i] - elvs[i - 1]; if (d > 0) gain += d; else loss -= d; }
    return { gain, loss, min: Math.min(...elvs), max: Math.max(...elvs) };
}
export function getRouteBounds(coords = []) {
    const valid = (coords || []).filter(c => Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]));
    if (!valid.length) return null;
    const lats = valid.map(c => c[0]);
    const lngs = valid.map(c => c[1]);
    return {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs)
    };
}
export function simplifyRoute(coords, tolerance = 0.0001) {
    if (!coords?.length) return [];
    if (coords.length <= 2 || tolerance <= 0) return coords;
    const step = Math.max(1, Math.min(coords.length - 2, Math.floor(tolerance) || 1));
    const out = [coords[0]];
    for (let i = step; i < coords.length - 1; i += step) out.push(coords[i]);
    if (coords.length > 1) out.push(coords[coords.length - 1]);
    return out;
}
export function getRouteStats(route) {
    const coords = extractRouteCoords(route || {});
    const elev = calculateElevation(coords);
    const dist = calculateRouteDistance(coords);
    return {
        distance: dist,
        elevationGain: elev.gain,
        elevationLoss: elev.loss,
        minElevation: elev.min ?? undefined,
        maxElevation: elev.max ?? undefined,
        pointCount: coords.length,
        bounds: getRouteBounds(coords),
        duration: null,
        elevation: elev
    };
}

export function validateRoute(route) {
    const errors = [];
    if (route == null || typeof route !== 'object') {
        return { valid: false, errors: ['Route must be an object'] };
    }
    const coords = extractRouteCoords(route);
    if (!coords.length) {
        return { valid: false, errors: ['Route has no valid coordinates'] };
    }
    if (coords.length < 2) {
        return { valid: false, errors: ['Route must have at least 2 points'] };
    }
    for (let i = 0; i < coords.length; i++) {
        const c = coords[i];
        if (!Array.isArray(c) || c.length < 2) continue;
        const lat = Number(c[0]), lng = Number(c[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return { valid: false, errors: ['Route contains invalid coordinates (NaN or non-numeric)'] };
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return { valid: false, errors: ['Route contains invalid coordinates (out of bounds)'] };
        }
    }
    return { valid: true, errors: [] };
}

export { Route };

// Namespace pour tests
Route.extractRouteCoords = extractRouteCoords;
Route.parseGPX = parseGPX;
Route.getDistance = getDistance;
Route.calculateRouteDistance = calculateRouteDistance;
Route.calculateElevation = calculateElevation;
Route.getRouteBounds = getRouteBounds;
Route.getRouteColor = getRouteColor;
Route.resolveRouteStyle = resolveRouteStyle;
Route.resolveEndpointConfig = resolveEndpointConfig;
Route.simplifyRoute = simplifyRoute;
Route.getRouteStats = getRouteStats;
Route.validateRoute = validateRoute;
