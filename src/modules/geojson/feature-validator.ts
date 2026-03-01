/**
 * GeoLeaf GeoJSON Module - Feature Validator
 * @module geojson/feature-validator
 */

import { getLog } from '../utils/general-utils.js';
import type { GeoJSONFeature } from './geojson-types.js';

interface ValidationError {
    featureId: string | number;
    field: string;
    message: string;
    severity: string;
}

const FeatureValidator = {
    validateFeatureCollection(collection: { type?: string; features?: unknown[] } | unknown[]): {
        validFeatures: unknown[];
        errors: ValidationError[];
    } {
        const Log = getLog();
        const errors: ValidationError[] = [];
        const validFeatures: unknown[] = [];

        if (!collection || typeof collection !== 'object') {
            Log.warn?.('[GeoLeaf.GeoJSON.Validator] Collection non valide : type invalide');
            return { validFeatures: [], errors: [{ featureId: '?', field: '', message: 'Collection non valide', severity: 'error' }] };
        }

        const coll = collection as { type?: string; features?: unknown[] };
        const features =
            coll.type === 'FeatureCollection'
                ? coll.features
                : Array.isArray(collection)
                  ? collection
                  : [collection];

        if (!Array.isArray(features)) {
            Log.warn?.('[GeoLeaf.GeoJSON.Validator] Pas de features à valider');
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
        const rawId = feat?.properties?.id ?? feat?.id ?? index ?? 'unknown';
        const featureId: string | number =
            typeof rawId === 'string' || typeof rawId === 'number' ? rawId : 'unknown';

        if (!feat || (feat as { type?: string }).type !== 'Feature') {
            errors.push({
                featureId,
                field: 'type',
                message: "Feature doit avoir type='Feature'",
                severity: 'error',
            });
            Log.warn?.('[GeoLeaf.GeoJSON.Validator] Feature ' + featureId + ': type invalide');
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
                '[GeoLeaf.GeoJSON.Validator] Feature ' +
                    featureId +
                    ' rejetée : ' +
                    errors.map((e) => e.message).join('; ')
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
        const validTypes = ['Point', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'];

        if (!geometry || typeof geometry !== 'object') {
            errors.push({
                featureId,
                field: 'geometry',
                message: 'geometry requis et doit être un objet',
                severity: 'error',
            });
            return { valid: false, errors };
        }

        const geom = geometry as { type?: string; coordinates?: unknown };
        if (!geom.type) {
            errors.push({
                featureId,
                field: 'geometry.type',
                message: 'geometry.type requis',
                severity: 'error',
            });
            return { valid: false, errors };
        }

        if (!validTypes.includes(geom.type)) {
            errors.push({
                featureId,
                field: 'geometry.type',
                message: `Type de géométrie invalide '${geom.type}'. Doit être : ${validTypes.join(', ')}`,
                severity: 'error',
            });
            return { valid: false, errors };
        }

        if (!Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
            errors.push({
                featureId,
                field: 'geometry.coordinates',
                message: 'geometry.coordinates doit être un array non-vide',
                severity: 'error',
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

        if (!properties || typeof properties !== 'object') {
            errors.push({
                featureId,
                field: 'properties',
                message: 'properties requis et doit être un objet',
                severity: 'error',
            });
            return { valid: false, errors };
        }

        const hasName = properties.name || properties.title || properties.label;
        if (!hasName) {
            errors.push({
                featureId,
                field: 'properties.name',
                message: 'properties doit contenir au moins name, title ou label',
                severity: 'error',
            });
        }

        if (
            typeof properties.distance_km !== 'undefined' &&
            typeof properties.distance_km !== 'number'
        ) {
            errors.push({
                featureId,
                field: 'properties.distance_km',
                message: 'distance_km doit être un nombre',
                severity: 'warning',
            });
        }
        if (
            typeof properties.distance_km === 'number' &&
            (properties.distance_km as number) < 0
        ) {
            errors.push({
                featureId,
                field: 'properties.distance_km',
                message: 'distance_km doit être >= 0',
                severity: 'warning',
            });
        }

        if (
            typeof properties.duration_min !== 'undefined' &&
            typeof properties.duration_min !== 'number'
        ) {
            errors.push({
                featureId,
                field: 'properties.duration_min',
                message: 'duration_min doit être un nombre',
                severity: 'warning',
            });
        }
        if (
            typeof properties.duration_min === 'number' &&
            (properties.duration_min as number) < 0
        ) {
            errors.push({
                featureId,
                field: 'properties.duration_min',
                message: 'duration_min doit être >= 0',
                severity: 'warning',
            });
        }

        if (typeof properties.rating !== 'undefined') {
            if (typeof properties.rating !== 'number') {
                errors.push({
                    featureId,
                    field: 'properties.rating',
                    message: 'rating doit être un nombre',
                    severity: 'warning',
                });
            } else if (
                (properties.rating as number) < 0 ||
                (properties.rating as number) > 5
            ) {
                errors.push({
                    featureId,
                    field: 'properties.rating',
                    message: 'rating doit être entre 0 et 5',
                    severity: 'warning',
                });
            }
        }

        if (
            typeof properties.color !== 'undefined' &&
            typeof properties.color === 'string' &&
            !/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(properties.color)
        ) {
            errors.push({
                featureId,
                field: 'properties.color',
                message: `color invalide '${properties.color}'. Format: #RGB ou #RRGGBB`,
                severity: 'warning',
            });
        }

        if (typeof properties.opacity !== 'undefined') {
            if (typeof properties.opacity !== 'number') {
                errors.push({
                    featureId,
                    field: 'properties.opacity',
                    message: 'opacity doit être un nombre',
                    severity: 'warning',
                });
            } else if (
                (properties.opacity as number) < 0 ||
                (properties.opacity as number) > 1
            ) {
                errors.push({
                    featureId,
                    field: 'properties.opacity',
                    message: 'opacity doit être entre 0 et 1',
                    severity: 'warning',
                });
            }
        }

        if (typeof properties.weight !== 'undefined') {
            if (typeof properties.weight !== 'number') {
                errors.push({
                    featureId,
                    field: 'properties.weight',
                    message: 'weight doit être un nombre',
                    severity: 'warning',
                });
            } else if ((properties.weight as number) < 0) {
                errors.push({
                    featureId,
                    field: 'properties.weight',
                    message: 'weight doit être >= 0',
                    severity: 'warning',
                });
            }
        }

        const urlFields = ['link', 'photo', 'url'];
        for (const field of urlFields) {
            if (
                typeof properties[field] !== 'undefined' &&
                typeof properties[field] === 'string' &&
                !FeatureValidator.isValidUrl(properties[field] as string)
            ) {
                errors.push({
                    featureId,
                    field: `properties.${field}`,
                    message: `${field} n'est pas une URL valide`,
                    severity: 'warning',
                });
            }
        }

        if (
            typeof properties.email !== 'undefined' &&
            typeof properties.email === 'string' &&
            !FeatureValidator.isValidEmail(properties.email)
        ) {
            errors.push({
                featureId,
                field: 'properties.email',
                message: 'email invalide',
                severity: 'warning',
            });
        }

        if (typeof properties.tags !== 'undefined') {
            if (!Array.isArray(properties.tags)) {
                errors.push({
                    featureId,
                    field: 'properties.tags',
                    message: 'tags doit être un array',
                    severity: 'warning',
                });
            } else {
                (properties.tags as unknown[]).forEach((tag, idx) => {
                    if (typeof tag !== 'string') {
                        errors.push({
                            featureId,
                            field: `properties.tags[${idx}]`,
                            message: 'tag doit être une string',
                            severity: 'warning',
                        });
                    }
                });
            }
        }

        for (const [key, value] of Object.entries(properties)) {
            if (
                value !== null &&
                typeof value === 'object' &&
                !Array.isArray(value)
            ) {
                errors.push({
                    featureId,
                    field: `properties.${key}`,
                    message: `Propriété imbriquée détectée. Les propriétés doivent être plates.`,
                    severity: 'error',
                });
            }
        }

        const hasErrors = errors.some((e) => e.severity === 'error');
        return { valid: !hasErrors, errors };
    },

    isValidUrl(url: string): boolean {
        if (typeof url !== 'string') return false;
        try {
            new URL(url);
            return true;
        } catch {
            return /^(https?:\/\/|\/|\.\.?\/)/.test(url);
        }
    },

    isValidEmail(email: string): boolean {
        if (typeof email !== 'string') return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
};

export { FeatureValidator };
