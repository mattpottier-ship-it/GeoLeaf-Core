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

// Méthodes disponibles via sous-modules
export const parseGPX              = (...args) => RouteLoaders?.parseGPX?.(...args);
export const getRouteColor         = (...args) => RouteStyleResolver?.getRouteColor?.(...args);
export const resolveRouteStyle     = (...args) => RouteStyleResolver?.resolveRouteStyle?.(...args);
export const resolveEndpointConfig = (...args) => RouteStyleResolver?.resolveEndpointConfig?.(...args);

// Fonctions absentes de l'implémentation actuelle — stubs
export function extractRouteCoords(route) {
    if (!route) return [];
    return route.coordinates || route.coords || [];
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
    const elvs = coords.map(c => c[2]).filter(e => typeof e === 'number');
    if (!elvs.length) return { gain: 0, loss: 0, min: null, max: null };
    let gain = 0, loss = 0;
    for (let i = 1; i < elvs.length; i++) { const d = elvs[i] - elvs[i-1]; if (d > 0) gain += d; else loss -= d; }
    return { gain, loss, min: Math.min(...elvs), max: Math.max(...elvs) };
}
export function getRouteBounds(coords = []) {
    if (!coords.length) return null;
    const lats = coords.map(c => c[0]), lngs = coords.map(c => c[1]);
    return [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
}
export function simplifyRoute(coords, tolerance = 0.0001) { return coords; }
export function getRouteStats(route) { return { distance: 0, duration: null, elevation: null }; }
export function validateRoute(route) { return route && Array.isArray(route.coordinates || route.coords); }

export { Route };
