/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * @fileoverview GeoJSON utility functions for feature analysis, validation, and coordinate processing.
 * Previously part of the src/geojson/ legacy shim; moved here as canonical utilities.
 * @module geojson/geojson-utils
 */

import { GeoJSONShared } from "./shared.ts";
import { FeatureValidator } from "./feature-validator.ts";

function _getStyleOperators(): Record<string, (a: unknown, b: unknown) => boolean> {
    return (GeoJSONShared as any).STYLE_OPERATORS || {};
}

/**
 * Returns the geometry type string of a GeoJSON feature, or null if unavailable.
 * @param feature - The GeoJSON feature object.
 * @returns The geometry type string (e.g. `"Point"`, `"LineString"`), or null.
 */
export function getGeometryType(feature: any): string | null {
    return feature?.geometry?.type ?? null;
}

/**
 * Returns true if the feature has Point or MultiPoint geometry.
 * @param feature - The GeoJSON feature object.
 * @returns `true` if the geometry type is `"Point"` or `"MultiPoint"`.
 */
export function isPointGeometry(feature: any): boolean {
    const t = getGeometryType(feature);
    return t === "Point" || t === "MultiPoint";
}

/**
 * Returns true if the feature has LineString or MultiLineString geometry.
 * @param feature - The GeoJSON feature object.
 * @returns `true` if the geometry type is `"LineString"` or `"MultiLineString"`.
 */
export function isLineGeometry(feature: any): boolean {
    const t = getGeometryType(feature);
    return t === "LineString" || t === "MultiLineString";
}

/**
 * Returns true if the feature has Polygon or MultiPolygon geometry.
 * @param feature - The GeoJSON feature object.
 * @returns `true` if the geometry type is `"Polygon"` or `"MultiPolygon"`.
 */
export function isPolygonGeometry(feature: any): boolean {
    const t = getGeometryType(feature);
    return t === "Polygon" || t === "MultiPolygon";
}

/* eslint-disable security/detect-object-injection -- key from config path, ops from STYLE_OPERATORS */
/**
 * Retrieves a nested property from a GeoJSON feature using dot-notation key.
 * @param feature - The GeoJSON feature object.
 * @param key - Dot-notation property path (e.g. `"properties.name"`).
 * @returns The property value or null if not found.
 */
export function getFeatureProperty(feature: any, key: any): any {
    if (feature == null || key == null) return null;
    const parts = String(key).split(".");
    let v: any = feature;
    for (const p of parts) {
        v = v?.[p];
    }
    return v !== undefined ? v : null;
}

/**
 * Evaluates a style condition against a feature or two values.
 * Supports both `(leftValue, operator, rightValue)` and `(feature, { field, operator, value })` call signatures.
 * @param featureOrLeft - A GeoJSON feature (2-arg form) or a left-hand value (3-arg form).
 * @param conditionOrOp - A condition object `{ field, operator, value }` or an operator string.
 * @param rightValue - The right-hand comparison value (3-arg form only).
 * @returns `true` if the condition is satisfied, `false` otherwise.
 */
export function evaluateStyleCondition(
    featureOrLeft: any,
    conditionOrOp: any,
    rightValue?: any
): boolean {
    const ops = _getStyleOperators();
    if (arguments.length >= 3 && typeof conditionOrOp === "string") {
        return ops[conditionOrOp] ? ops[conditionOrOp](featureOrLeft, rightValue) : false;
    }
    if (!conditionOrOp || !featureOrLeft) return false;
    const { field, operator, value } = conditionOrOp;
    const prop = getFeatureProperty(featureOrLeft, field);
    return ops[operator] ? ops[operator](prop, value) : prop === value;
}
/* eslint-enable security/detect-object-injection */

/**
 * Validates a GeoJSON feature and returns a normalized result object.
 * @param args - Passed through to `FeatureValidator.validateFeature`.
 * @returns `{ valid, errors }` where errors is an array of strings.
 */
export function validateFeature(...args: any[]): { valid: boolean; errors: string[] } {
    const r = (FeatureValidator.validateFeature as any)?.(...args);
    if (!r) return { valid: false, errors: ["Validator unavailable"] };
    return {
        valid: r.valid,
        errors: (r.errors || []).map((e: any) => (typeof e === "string" ? e : e.message)),
    };
}

/* eslint-disable complexity -- validation branches */
/**
 * Validates a GeoJSON FeatureCollection and returns a normalized result object.
 * @param collection - The GeoJSON FeatureCollection or array to validate.
 * @param rest - Additional arguments passed through to the underlying validator.
 * @returns `{ valid, errors, featureCount }`.
 */
export function validateFeatureCollection(
    collection: any,
    ...rest: any[]
): { valid: boolean; errors: string[]; featureCount: number } {
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
    if (wrongType) errors.push('GeoJSON type must be "FeatureCollection"');
    if (missingFeatures) errors.push("GeoJSON must have features array");
    return {
        valid: errors.length === 0,
        errors,
        featureCount: Array.isArray(features) ? features.length : 0,
    };
}
/* eslint-enable complexity */

function _toLatLng(coord: any): [number, number] | null {
    return Array.isArray(coord) && coord.length >= 2 ? [coord[1], coord[0]] : null;
}

/* eslint-disable complexity -- geometry type branches */
/**
 * Extracts coordinates from a GeoJSON feature, converting [lng, lat] → [lat, lng].
 * @param feature - The GeoJSON feature to extract coordinates from.
 * @returns Array of [lat, lng] pairs, or null if no valid coordinates are found.
 */
export function extractCoordinates(feature: any): [number, number][] | null {
    if (feature == null) return null;
    const geom = feature.geometry;
    if (!geom || !geom.coordinates) return null;
    const c = geom.coordinates;
    if (!Array.isArray(c)) return null;
    switch (geom.type) {
        case "Point":
            return _toLatLng(c) ? [_toLatLng(c) as [number, number]] : null;
        case "MultiPoint":
            return c.map(_toLatLng).filter(Boolean) as [number, number][];
        case "LineString":
            return c.map(_toLatLng).filter(Boolean) as [number, number][];
        case "MultiLineString":
            return c.flat().map(_toLatLng).filter(Boolean) as [number, number][];
        case "Polygon":
            return c[0]?.length
                ? (c[0].map(_toLatLng).filter(Boolean) as [number, number][])
                : null;
        case "MultiPolygon":
            return c.flat(2).map(_toLatLng).filter(Boolean) as [number, number][];
        default:
            return null;
    }
}
/* eslint-enable complexity */

/**
 * Computes the bounding box [[minLat, minLng], [maxLat, maxLng]] from an array of GeoJSON features.
 * @param features - Array of GeoJSON features to compute bounds from. Defaults to `[]`.
 * @returns A `[[minLat, minLng], [maxLat, maxLng]]` bounding box, or null if no valid coordinates.
 */
export function calculateBounds(features: any[] = []): [[number, number], [number, number]] | null {
    if (!features || !Array.isArray(features)) return null;
    const coords = features
        .flatMap((f: any) => extractCoordinates(f))
        .filter(
            (c): c is [number, number] =>
                c != null && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
        );
    if (!coords.length) return null;
    const lats = coords.map((c) => c[0]);
    const lngs = coords.map((c) => c[1]);
    const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
    const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
    if (!Number.isFinite(minLat) || !Number.isFinite(maxLng)) return null;
    return [
        [minLat, minLng],
        [maxLat, maxLng],
    ];
}
