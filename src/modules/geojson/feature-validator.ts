/* eslint-disable security/detect-object-injection */
/**







 * GeoLeaf GeoJSON Module - Feature Validator







 * @module geojson/feature-validator







 */

import { getLog } from "../utils/general-utils.js";

import type { GeoJSONFeature } from "./geojson-types.js";

interface ValidationError {
    featureId: string | number;

    field: string;

    message: string;

    severity: string;
}

function _resolveFeatureId(feat: any, index?: number): string | number {
    const rawId = feat?.properties?.id ?? feat?.id ?? index ?? "unknown";

    return typeof rawId === "string" || typeof rawId === "number" ? rawId : "unknown";
}

function _validateNumericField(
    props: Record<string, unknown>,

    featureId: string | number,

    field: string,

    min: number,

    max?: number
): ValidationError[] {
    const errors: ValidationError[] = [];

    const val = props[field];

    if (val === undefined) return errors;

    if (typeof val !== "number") {
        errors.push({
            featureId,
            field: `properties.${field}`,
            message: `${field} must be un nombre`,
            severity: "warning",
        });

        return errors;
    }

    const n = val as number;

    if (n < min) {
        errors.push({
            featureId,
            field: `properties.${field}`,
            message:
                max !== undefined
                    ? `${field} must be entre ${min} et ${max}`
                    : `${field} must be >= ${min}`,
            severity: "warning",
        });
    }

    if (max !== undefined && n > max) {
        errors.push({
            featureId,
            field: `properties.${field}`,
            message: `${field} must be entre ${min} et ${max}`,
            severity: "warning",
        });
    }

    return errors;
}

function _validateColorField(
    props: Record<string, unknown>,

    featureId: string | number
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (
        typeof props.color !== "undefined" &&
        typeof props.color === "string" &&
        !/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(props.color)
    ) {
        errors.push({
            featureId,
            field: "properties.color",
            message: `color invalide '${props.color}'. Format: #RGB ou #RRGGBB`,
            severity: "warning",
        });
    }

    return errors;
}

function _validateUrlEmailFields(
    props: Record<string, unknown>,

    featureId: string | number
): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of ["link", "photo", "url"]) {
        const v = props[field];

        if (typeof v !== "undefined" && typeof v === "string") {
            let urlOk = true;

            try {
                new URL(v as string);
            } catch {
                urlOk = /^(https?:\/\/|\/|\.\.?\/)/.test(v as string);
            }

            if (!urlOk)
                errors.push({
                    featureId,
                    field: `properties.${field}`,
                    message: `${field} n'est pas une URL valide`,
                    severity: "warning",
                });
        }
    }

    if (
        typeof props.email !== "undefined" &&
        typeof props.email === "string" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.email)
    ) {
        errors.push({
            featureId,
            field: "properties.email",
            message: "email invalide",
            severity: "warning",
        });
    }

    return errors;
}

function _validateTagsAndStructure(
    props: Record<string, unknown>,

    featureId: string | number
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof props.tags !== "undefined") {
        if (!Array.isArray(props.tags)) {
            errors.push({
                featureId,
                field: "properties.tags",
                message: "tags must be un array",
                severity: "warning",
            });
        } else {
            (props.tags as unknown[]).forEach((tag, idx) => {
                if (typeof tag !== "string") {
                    errors.push({
                        featureId,
                        field: `properties.tags[${idx}]`,
                        message: "tag must be une string",
                        severity: "warning",
                    });
                }
            });
        }
    }

    for (const [key, value] of Object.entries(props)) {
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            errors.push({
                featureId,
                field: `properties.${key}`,
                message: "Nested property detected. Properties must be flat.",
                severity: "error",
            });
        }
    }

    return errors;
}

const FeatureValidator = {
    validateFeatureCollection(collection: { type?: string; features?: unknown[] } | unknown[]): {
        validFeatures: unknown[];

        errors: ValidationError[];
    } {
        const Log = getLog();

        const errors: ValidationError[] = [];

        const validFeatures: unknown[] = [];

        if (!collection || typeof collection !== "object") {
            Log.warn?.("[GeoLeaf.GeoJSON.Validator] Invalid collection: invalid type");

            return {
                validFeatures: [],
                errors: [
                    {
                        featureId: "?",
                        field: "",
                        message: "Collection non valide",
                        severity: "error",
                    },
                ],
            };
        }

        const coll = collection as { type?: string; features?: unknown[] };

        const features =
            coll.type === "FeatureCollection"
                ? coll.features
                : Array.isArray(collection)
                  ? collection
                  : [collection];

        if (!Array.isArray(features)) {
            Log.warn?.("[GeoLeaf.GeoJSON.Validator] No features to validate");

            return { validFeatures: [], errors: [] };
        }

        for (let i = 0; i < features.length; i++) {
            const result = FeatureValidator.validateFeature(features[i] as GeoJSONFeature, i);

            if (result.valid) {
                validFeatures.push(features[i]);
            } else {
                errors.push(...result.errors);
            }
        }

        return { validFeatures, errors };
    },

    validateFeature(
        feature: GeoJSONFeature | unknown,

        index?: number
    ): { valid: boolean; errors: ValidationError[] } {
        const Log = getLog();

        const errors: ValidationError[] = [];

        const feat = feature as GeoJSONFeature & { properties?: Record<string, unknown> };

        const featureId: string | number = _resolveFeatureId(feat, index);

        if (!feat || (feat as { type?: string }).type !== "Feature") {
            errors.push({
                featureId,

                field: "type",

                message: "Feature doit avoir type='Feature'",

                severity: "error",
            });

            Log.warn?.("[GeoLeaf.GeoJSON.Validator] Feature " + featureId + ": invalid type");

            return { valid: false, errors };
        }

        const geomResult = FeatureValidator.validateGeometry(
            (feat as GeoJSONFeature).geometry,

            featureId
        );

        if (!geomResult.valid) errors.push(...geomResult.errors);

        const propsResult = FeatureValidator.validateProperties(
            (feat as GeoJSONFeature).properties,

            featureId
        );

        if (!propsResult.valid) errors.push(...propsResult.errors);

        if (errors.length > 0) {
            Log.warn?.(
                "[GeoLeaf.GeoJSON.Validator] Feature " +
                    featureId +
                    " rejected: " +
                    errors.map((e) => e.message).join("; ")
            );

            return { valid: false, errors };
        }

        return { valid: true, errors: [] };
    },

    validateGeometry(
        geometry: unknown,

        featureId: string | number
    ): { valid: boolean; errors: ValidationError[] } {
        const errors: ValidationError[] = [];

        const validTypes = ["Point", "LineString", "MultiLineString", "Polygon", "MultiPolygon"];

        if (!geometry || typeof geometry !== "object") {
            errors.push({
                featureId,

                field: "geometry",

                message: "geometry required et must be un object",

                severity: "error",
            });

            return { valid: false, errors };
        }

        const geom = geometry as { type?: string; coordinates?: unknown };

        if (!geom.type) {
            errors.push({
                featureId,

                field: "geometry.type",

                message: "geometry.type required",

                severity: "error",
            });

            return { valid: false, errors };
        }

        if (!validTypes.includes(geom.type)) {
            errors.push({
                featureId,

                field: "geometry.type",

                message: `Invalid geometry type '${geom.type}'. Must be: ${validTypes.join(", ")}`,

                severity: "error",
            });

            return { valid: false, errors };
        }

        if (!Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
            errors.push({
                featureId,

                field: "geometry.coordinates",

                message: "geometry.coordinates must be un array non-vide",

                severity: "error",
            });

            return { valid: false, errors };
        }

        return { valid: errors.length === 0, errors };
    },

    validateProperties(
        properties: Record<string, unknown> | null | undefined,

        featureId: string | number
    ): { valid: boolean; errors: ValidationError[] } {
        const errors: ValidationError[] = [];

        if (!properties || typeof properties !== "object") {
            errors.push({
                featureId,
                field: "properties",
                message: "properties required et must be un object",
                severity: "error",
            });

            return { valid: false, errors };
        }

        const hasName = properties.name || properties.title || properties.label;

        if (!hasName) {
            errors.push({
                featureId,
                field: "properties.name",
                message: "properties doit contenir au moins name, title ou label",
                severity: "error",
            });
        }

        errors.push(..._validateNumericField(properties, featureId, "distance_km", 0));

        errors.push(..._validateNumericField(properties, featureId, "duration_min", 0));

        errors.push(..._validateNumericField(properties, featureId, "rating", 0, 5));

        errors.push(..._validateColorField(properties, featureId));

        errors.push(..._validateNumericField(properties, featureId, "opacity", 0, 1));

        errors.push(..._validateNumericField(properties, featureId, "weight", 0));

        errors.push(..._validateUrlEmailFields(properties, featureId));

        errors.push(..._validateTagsAndStructure(properties, featureId));

        const hasErrors = errors.some((e) => e.severity === "error");

        return { valid: !hasErrors, errors };
    },

    isValidUrl(url: string): boolean {
        if (typeof url !== "string") return false;

        try {
            new URL(url);

            return true;
        } catch {
            return /^(https?:\/\/|\/|\.\.?\/)/.test(url);
        }
    },

    isValidEmail(email: string): boolean {
        if (typeof email !== "string") return false;

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
};

export { FeatureValidator };
