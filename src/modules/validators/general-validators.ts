/**
 * GeoLeaf — General Validators
 * Validation fonctions génériques (coordonnées, URL, email, etc.)
 *
 * @module validators/general-validators
 */

import { Errors } from "../errors/index.js";
import { validateCoordinates as _secValidateCoordinates } from "../security/index.js";

// ── Types ──

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export interface ValidatorOptions {
    throwOnError?: boolean;
}

export interface ValidateUrlOptions extends ValidatorOptions {
    allowedProtocols?: string[];
    allowDataImages?: boolean;
}

export interface ValidateZoomOptions extends ValidatorOptions {
    min?: number;
    max?: number;
}

export interface ValidateBatchItem {
    value: unknown;
    validator: (
        value: unknown,
        options?: Record<string, unknown>
    ) => { valid: boolean; error?: string | null };
    options?: Record<string, unknown>;
    label?: string;
}

function validateCoordinates(
    lat: number,
    lng: number,
    options: ValidatorOptions = {}
): { valid: boolean; error: string | null } {
    const { throwOnError = false } = options;
    try {
        _secValidateCoordinates(lat, lng);
        return { valid: true, error: null };
    } catch (err) {
        const error = new Errors.ValidationError((err as Error).message, { lat, lng });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }
}

function validateUrl(
    url: string,
    options: ValidateUrlOptions = {}
): { valid: boolean; error: string | null; url: string | null } {
    const {
        allowedProtocols = ["http:", "https:", "data:"],
        allowDataImages = true,
        throwOnError = false,
    } = options;

    if (!url || typeof url !== "string") {
        const error = new Errors.ValidationError("URL must be a non-empty string", {
            url,
            type: typeof url,
        });
        if (throwOnError) throw error;
        return { valid: false, error: error.message, url: null };
    }

    try {
        const parsed = new URL(url, "http://dummy.com");
        const protocol = parsed.protocol;

        if (!allowedProtocols.includes(protocol)) {
            if (protocol === "data:") {
                if (!allowDataImages) {
                    throw new Errors.SecurityError("Data URLs are not allowed", { url, protocol });
                }
                let end = url.indexOf(",");
                if (end < 0) end = url.indexOf(";");
                const dataType = url.substring(5, end >= 0 ? end : undefined);
                if (!dataType.startsWith("image/")) {
                    throw new Errors.SecurityError("Only data:image URLs are allowed", {
                        url,
                        dataType,
                    });
                }
            } else {
                throw new Errors.SecurityError(`Protocol "${protocol}" not allowed`, {
                    url,
                    protocol,
                    allowed: allowedProtocols,
                });
            }
        }

        if (protocol === "data:") {
            if (!allowDataImages) {
                throw new Errors.SecurityError("Data URLs are not allowed", { url, protocol });
            }
            let end = url.indexOf(",");
            if (end < 0) end = url.indexOf(";");
            const dataType = url.substring(5, end >= 0 ? end : undefined).trim();
            if (!dataType.startsWith("image/")) {
                throw new Errors.SecurityError("Only data:image URLs are allowed", {
                    url,
                    dataType,
                });
            }
        }

        return { valid: true, error: null, url: parsed.href };
    } catch (err) {
        if (throwOnError) throw err;
        return { valid: false, error: (err as Error).message, url: null };
    }
}

function validateEmail(
    email: unknown,
    options: ValidatorOptions = {}
): { valid: boolean; error: string | null } {
    const { throwOnError = false } = options;

    if (!email || typeof email !== "string") {
        const error = new Errors.ValidationError("Email must be a non-empty string", {
            email,
            type: typeof email,
        });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        const error = new Errors.ValidationError("Invalid email format", { email });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    return { valid: true, error: null };
}

function validatePhone(
    phone: unknown,
    options: ValidatorOptions = {}
): { valid: boolean; error: string | null } {
    const { throwOnError = false } = options;

    if (!phone || typeof phone !== "string") {
        const error = new Errors.ValidationError("Phone must be a non-empty string", {
            phone,
            type: typeof phone,
        });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    const phoneRegex = /^[\d\s+\-()]+$/;
    if (!phoneRegex.test(phone)) {
        const error = new Errors.ValidationError("Invalid phone format", { phone });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
        const error = new Errors.ValidationError("Phone number must contain at least 10 digits", {
            phone,
            digitCount: digits.length,
        });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    return { valid: true, error: null };
}

function validateZoom(
    zoom: number,
    options: ValidateZoomOptions = {}
): { valid: boolean; error: string | null } {
    const { min = 0, max = 20, throwOnError = false } = options;

    if (typeof zoom !== "number") {
        const error = new Errors.ValidationError("Zoom must be a number", {
            zoom,
            type: typeof zoom,
        });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    if (!Number.isFinite(zoom)) {
        const error = new Errors.ValidationError("Zoom must be a finite number", { zoom });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    if (zoom < min || zoom > max) {
        const error = new Errors.ValidationError(`Zoom must be between ${min} and ${max}`, {
            zoom,
            min,
            max,
        });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    return { valid: true, error: null };
}

function validateRequiredFields(
    config: Record<string, unknown> | null | undefined,
    requiredFields: string[],
    options: ValidatorOptions = {}
): { valid: boolean; error: string | null; missing: string[] } {
    const { throwOnError = false } = options;

    if (!config || typeof config !== "object") {
        const error = new Errors.ConfigError("Config must be an object", {
            config,
            type: typeof config,
        });
        if (throwOnError) throw error;
        return { valid: false, error: error.message, missing: requiredFields };
    }

    const missing = requiredFields.filter(
        (field) => !(field in config) || config[field] === null || config[field] === undefined
    );

    if (missing.length > 0) {
        const error = new Errors.ConfigError(`Missing required fields: ${missing.join(", ")}`, {
            config,
            missing,
        });
        if (throwOnError) throw error;
        return { valid: false, error: error.message, missing };
    }

    return { valid: true, error: null, missing: [] };
}

function validateGeoJSON(
    geojson: Record<string, unknown> | null | undefined,
    options: ValidatorOptions = {}
): { valid: boolean; error: string | null } {
    const { throwOnError = false } = options;

    if (!geojson || typeof geojson !== "object") {
        const error = new Errors.ValidationError("GeoJSON must be an object", {
            geojson,
            type: typeof geojson,
        });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    if (!geojson.type) {
        const error = new Errors.ValidationError("GeoJSON must have a type field", { geojson });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    const validTypes = [
        "Point",
        "MultiPoint",
        "LineString",
        "MultiLineString",
        "Polygon",
        "MultiPolygon",
        "GeometryCollection",
        "Feature",
        "FeatureCollection",
    ];

    if (!validTypes.includes(geojson.type as string)) {
        const error = new Errors.ValidationError("Invalid GeoJSON type", {
            type: geojson.type,
            validTypes,
        });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    if (geojson.type === "Feature" && !geojson.geometry) {
        const error = new Errors.ValidationError("Feature must have a geometry", { geojson });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    if (geojson.type === "FeatureCollection" && !Array.isArray(geojson.features)) {
        const error = new Errors.ValidationError("FeatureCollection must have a features array", {
            geojson,
        });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    return { valid: true, error: null };
}

function validateColor(
    color: unknown,
    options: ValidatorOptions = {}
): { valid: boolean; error: string | null } {
    const { throwOnError = false } = options;

    if (!color || typeof color !== "string") {
        const error = new Errors.ValidationError("Color must be a non-empty string", {
            color,
            type: typeof color,
        });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    // eslint-disable-next-line security/detect-unsafe-regex
    const hexRegex = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/;
    const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
    const rgbaRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;

    const isValid =
        hexRegex.test(color) ||
        rgbRegex.test(color) ||
        rgbaRegex.test(color) ||
        (typeof CSS !== "undefined" && CSS.supports("color", color));

    if (!isValid) {
        const error = new Errors.ValidationError("Invalid color format", { color });
        if (throwOnError) throw error;
        return { valid: false, error: error.message };
    }

    return { valid: true, error: null };
}

function validateBatch(validations: ValidateBatchItem[]): ValidationResult {
    const errors: string[] = [];

    for (const item of validations) {
        const { value, validator, options = {}, label = "value" } = item;

        if (typeof validator !== "function") {
            errors.push(`Invalid validator for ${label}`);
            continue;
        }

        const result = validator(value, { ...options, throwOnError: false }) as {
            valid: boolean;
            error?: string | null;
        };
        if (!result.valid) {
            errors.push(`${label}: ${result.error ?? "validation failed"}`);
        }
    }

    return { valid: errors.length === 0, errors };
}

const Validators = {
    validateCoordinates,
    validateUrl,
    validateEmail,
    validatePhone,
    validateZoom,
    validateRequiredFields,
    validateGeoJSON,
    validateColor,
    validateBatch,
};

export {
    Validators,
    validateCoordinates,
    validateUrl,
    validateEmail,
    validatePhone,
    validateZoom,
    validateRequiredFields,
    validateGeoJSON,
    validateColor,
    validateBatch,
};
