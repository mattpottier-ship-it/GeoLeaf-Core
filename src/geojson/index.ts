/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/geojson/index.js — SHIM LEGACY
 * Rétrocompatibilité : expose les utilitaires GeoJSON depuis src/geojson/
 * (ancienne structure) → src/modules/geojson/
 * @module src/geojson
 */
import { GeoJSONCore as _GeoJSONCore } from "../modules/geojson/core.js";
const GeoJSONCore: any = _GeoJSONCore;
import { GeoJSONShared } from "../modules/geojson/shared.js";
import { FeatureValidator } from "../modules/geojson/feature-validator.js";

// Alias GeoJSON (classe principale)
export const GeoJSON = GeoJSONCore;

// Opérateurs de style (disponibles sur GeoJSONShared)
export const STYLE_OPERATORS = (GeoJSONShared as any).STYLE_OPERATORS;

// Valeurs par défaut (compatibilité tests / API legacy)
const defaultStyle = (GeoJSONShared as any).state?.options?.defaultStyle || {
    color: "#3388ff",
    weight: 2,
    fillOpacity: 0.5,
    fillColor: "#3388ff",
};
const defaultPointStyle = (GeoJSONShared as any).state?.options?.defaultPointStyle || {
    radius: 6,
    fillColor: "#3388ff",
    color: "#3388ff",
    weight: 2,
};
export const DEFAULT_STYLES = (GeoJSONShared as any).DEFAULT_STYLES || {
    polygon: { ...defaultStyle, fillColor: defaultStyle.fillColor || defaultStyle.color },
    line: { color: defaultStyle.color, weight: defaultStyle.weight },
    point: { radius: defaultPointStyle.radius, fillColor: defaultPointStyle.fillColor },
};

// Wrappers validation — format attendu par les tests { valid, errors: string[], featureCount? }
function validateFeature(...args: any[]) {
    const r = (FeatureValidator.validateFeature as any)?.(...args);
    if (!r) return { valid: false, errors: ["Validator unavailable"] };
    return {
        valid: r.valid,
        errors: (r.errors || []).map((e: any) => (typeof e === "string" ? e : e.message)),
    };
}
/* eslint-disable complexity -- validation branches */
function validateFeatureCollection(collection: any, ...rest: any[]) {
    const r = (FeatureValidator.validateFeatureCollection as any)?.(collection, ...rest);
    if (!r) return { valid: false, errors: ["Validator unavailable"], featureCount: 0 };
    const features =
        collection?.type === "FeatureCollection"
            ? collection.features
            : Array.isArray(collection)
              ? collection
              : [];
    const wrongType =
        collection && collection.type !== undefined && collection.type !== "FeatureCollection";
    const missingFeatures =
        collection?.type === "FeatureCollection" && !Array.isArray(collection?.features);
    const errors = (r.errors || []).map((e: any) => (typeof e === "string" ? e : e.message));
    if (wrongType) {
        errors.push('GeoJSON type must be "FeatureCollection"');
    }
    if (missingFeatures) {
        errors.push("GeoJSON must have features array");
    }
    const featureCount = Array.isArray(features) ? features.length : 0;
    return {
        valid: errors.length === 0,
        errors,
        featureCount,
    };
}
/* eslint-enable complexity */
export { validateFeature, validateFeatureCollection };

// Fonctions absentes de l'implémentation actuelle — stubs géométriques
export function getGeometryType(feature: any) {
    return feature?.geometry?.type ?? null;
}
export function isPointGeometry(feature: any) {
    const t = getGeometryType(feature);
    return t === "Point" || t === "MultiPoint";
}
export function isLineGeometry(feature: any) {
    const t = getGeometryType(feature);
    return t === "LineString" || t === "MultiLineString";
}
export function isPolygonGeometry(feature: any) {
    const t = getGeometryType(feature);
    return t === "Polygon" || t === "MultiPolygon";
}
export function getFeatureProperty(feature: any, key: any) {
    if (feature == null || key == null) return null;
    const parts = String(key).split(".");
    let v = feature;
    for (const p of parts) {
        v = v?.[p];
    }
    return v !== undefined ? v : null;
}
export function evaluateStyleCondition(featureOrLeft: any, conditionOrOp: any, rightValue?: any) {
    // API (leftValue, operator, rightValue) pour tests / style rules
    if (arguments.length >= 3 && typeof conditionOrOp === "string") {
        const ops = STYLE_OPERATORS || {};
        return ops[conditionOrOp] ? ops[conditionOrOp](featureOrLeft, rightValue) : false;
    }
    // API (feature, condition) avec condition = { field, operator, value }
    if (!conditionOrOp || !featureOrLeft) return false;
    const { field, operator, value } = conditionOrOp;
    const prop = getFeatureProperty(featureOrLeft, field);
    const ops = STYLE_OPERATORS || {};
    return ops[operator] ? ops[operator](prop, value) : prop === value;
}
// GeoJSON coordinates are [lng, lat]; we return [lat, lng] for API/tests consistency
function toLatLng(coord: any) {
    return Array.isArray(coord) && coord.length >= 2 ? [coord[1], coord[0]] : null;
}
export function extractCoordinates(feature: any) {
    if (feature == null) return null;
    const geom = feature.geometry;
    if (!geom || !geom.coordinates) return null;
    const c = geom.coordinates;
    if (!Array.isArray(c)) return null;
    switch (geom.type) {
        case "Point":
            return toLatLng(c) ? [toLatLng(c)] : null;
        case "MultiPoint":
            return c.map(toLatLng).filter(Boolean);
        case "LineString":
            return c.map(toLatLng).filter(Boolean);
        case "MultiLineString":
            return c.flat().map(toLatLng).filter(Boolean);
        case "Polygon":
            return c[0] && c[0].length ? c[0].map(toLatLng).filter(Boolean) : null;
        case "MultiPolygon":
            return c.flat(2).map(toLatLng).filter(Boolean);
        default:
            return null;
    }
}
export function calculateBounds(features = []) {
    if (!features || !Array.isArray(features)) return null;
    const coords = features
        .flatMap((f: any) => extractCoordinates(f))
        .filter(
            (c) => c != null && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
        );
    if (!coords.length) return null;
    const lats = coords.map((c) => c[0]),
        lngs = coords.map((c) => c[1]);
    const minLat = Math.min(...lats),
        maxLat = Math.max(...lats),
        minLng = Math.min(...lngs),
        maxLng = Math.max(...lngs);
    if (!Number.isFinite(minLat) || !Number.isFinite(maxLng)) return null;
    return [
        [minLat, minLng],
        [maxLat, maxLng],
    ];
}

// Namespace pour tests / API legacy
GeoJSONCore.STYLE_OPERATORS = STYLE_OPERATORS;
GeoJSONCore.DEFAULT_STYLES = DEFAULT_STYLES;
GeoJSONCore.evaluateStyleCondition = evaluateStyleCondition;
GeoJSONCore.getFeatureProperty = getFeatureProperty;
GeoJSONCore.getGeometryType = getGeometryType;
GeoJSONCore.isPointGeometry = isPointGeometry;
GeoJSONCore.isLineGeometry = isLineGeometry;
GeoJSONCore.isPolygonGeometry = isPolygonGeometry;
GeoJSONCore.validateFeature = validateFeature;
GeoJSONCore.validateFeatureCollection = validateFeatureCollection;
GeoJSONCore.extractCoordinates = extractCoordinates;
GeoJSONCore.calculateBounds = calculateBounds;
