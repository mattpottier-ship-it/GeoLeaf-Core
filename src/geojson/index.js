/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/geojson/index.js — SHIM LEGACY
 * Rétrocompatibilité : expose les utilitaires GeoJSON depuis src/geojson/
 * (ancienne structure) → src/modules/geojson/
 * @module src/geojson
 */
import { GeoJSONCore }        from '../modules/geojson/core.js';
import { GeoJSONShared }      from '../modules/geojson/shared.js';
import { FeatureValidator }   from '../modules/geojson/feature-validator.js';

// Alias GeoJSON (classe principale)
export const GeoJSON = GeoJSONCore;

// Opérateurs de style (disponibles sur GeoJSONShared)
export const STYLE_OPERATORS = GeoJSONShared.STYLE_OPERATORS;

// Valeurs par défaut
export const DEFAULT_STYLES = GeoJSONShared.DEFAULT_STYLES || {
    color: '#3388ff', weight: 2, fillOpacity: 0.5
};

// Fonctions de validation de features (disponibles sur FeatureValidator)
export const validateFeature            = (...args) => FeatureValidator.validateFeature?.(...args);
export const validateFeatureCollection  = (...args) => FeatureValidator.validateFeatureCollection?.(...args);

// Fonctions absentes de l'implémentation actuelle — stubs géométriques
export function getGeometryType(feature) {
    return feature?.geometry?.type ?? null;
}
export function isPointGeometry(feature) {
    const t = getGeometryType(feature);
    return t === 'Point' || t === 'MultiPoint';
}
export function isLineGeometry(feature) {
    const t = getGeometryType(feature);
    return t === 'LineString' || t === 'MultiLineString';
}
export function isPolygonGeometry(feature) {
    const t = getGeometryType(feature);
    return t === 'Polygon' || t === 'MultiPolygon';
}
export function getFeatureProperty(feature, key) {
    return feature?.properties?.[key] ?? null;
}
export function evaluateStyleCondition(feature, condition) {
    if (!condition || !feature) return false;
    const { field, operator, value } = condition;
    const prop = getFeatureProperty(feature, field);
    const ops = STYLE_OPERATORS || {};
    return ops[operator] ? ops[operator](prop, value) : prop === value;
}
export function extractCoordinates(feature) {
    const geom = feature?.geometry;
    if (!geom) return [];
    switch (geom.type) {
        case 'Point': return [geom.coordinates];
        case 'LineString': case 'MultiPoint': return geom.coordinates;
        case 'Polygon': case 'MultiLineString': return geom.coordinates.flat();
        case 'MultiPolygon': return geom.coordinates.flat(2);
        default: return [];
    }
}
export function calculateBounds(features = []) {
    const coords = features.flatMap(f => extractCoordinates(f));
    if (!coords.length) return null;
    const lngs = coords.map(c => c[0]), lats = coords.map(c => c[1]);
    return [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
}
