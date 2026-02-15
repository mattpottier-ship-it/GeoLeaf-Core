/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf - Validators Module
 *
 * Centralized validation functions for all GeoLeaf modules.
 * Uses typed errors from GeoLeaf.Errors for consistent error handling.
 *
 * @module GeoLeaf.Validators
 * @version 1.4.0
 */

(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Use typed errors if available, fallback to Error
    const Errors = GeoLeaf.Errors || {
        ValidationError: Error,
        SecurityError: Error,
        ConfigError: Error
    };

    /**
     * Validate geographic coordinates
     * @param {number} lat - Latitude value
     * @param {number} lng - Longitude value
     * @param {object} options - Validation options
     * @returns {{valid: boolean, error: string|null}}
     */
    function validateCoordinates(lat, lng, options = {}) {
        const { throwOnError = false } = options;

        // Check if values are numbers
        if (typeof lat !== 'number' || typeof lng !== 'number') {
            const error = new Errors.ValidationError(
                'Coordinates must be numbers',
                { lat, lng, type: typeof lat, lngType: typeof lng }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        // Check for NaN or Infinity
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            const error = new Errors.ValidationError(
                'Coordinates must be finite numbers',
                { lat, lng }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        // Validate latitude range (-90 to 90)
        if (lat < -90 || lat > 90) {
            const error = new Errors.ValidationError(
                'Latitude must be between -90 and 90',
                { lat, expected: 'Range: -90 to 90' }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        // Validate longitude range (-180 to 180)
        if (lng < -180 || lng > 180) {
            const error = new Errors.ValidationError(
                'Longitude must be between -180 and 180',
                { lng, expected: 'Range: -180 to 180' }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        return { valid: true, error: null };
    }

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @param {object} options - Validation options
     * @returns {{valid: boolean, error: string|null, url: string|null}}
     */
    function validateUrl(url, options = {}) {
        const {
            allowedProtocols = ['http:', 'https:', 'data:'],
            allowDataImages = true,
            throwOnError = false
        } = options;

        if (!url || typeof url !== 'string') {
            const error = new Errors.ValidationError(
                'URL must be a non-empty string',
                { url, type: typeof url }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message, url: null };
        }

        try {
            const parsed = new URL(url, 'http://dummy.com');
            const protocol = parsed.protocol;

            // Check if protocol is allowed
            if (!allowedProtocols.includes(protocol)) {
                // Special handling for data: URLs
                if (protocol === 'data:') {
                    if (!allowDataImages) {
                        throw new Errors.SecurityError(
                            'Data URLs are not allowed',
                            { url, protocol }
                        );
                    }

                    // Validate data URL type
                    const dataType = url.substring(5, url.indexOf(',') || url.indexOf(';'));
                    if (!dataType.startsWith('image/')) {
                        throw new Errors.SecurityError(
                            'Only data:image URLs are allowed',
                            { url, dataType }
                        );
                    }
                } else {
                    throw new Errors.SecurityError(
                        `Protocol "${protocol}" not allowed`,
                        { url, protocol, allowed: allowedProtocols }
                    );
                }
            }

            return { valid: true, error: null, url: parsed.href };
        } catch (err) {
            if (throwOnError) throw err;
            return { valid: false, error: err.message, url: null };
        }
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @param {object} options - Validation options
     * @returns {{valid: boolean, error: string|null}}
     */
    function validateEmail(email, options = {}) {
        const { throwOnError = false } = options;

        if (!email || typeof email !== 'string') {
            const error = new Errors.ValidationError(
                'Email must be a non-empty string',
                { email, type: typeof email }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        // Basic email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            const error = new Errors.ValidationError(
                'Invalid email format',
                { email }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        return { valid: true, error: null };
    }

    /**
     * Validate phone number
     * @param {string} phone - Phone to validate
     * @param {object} options - Validation options
     * @returns {{valid: boolean, error: string|null}}
     */
    function validatePhone(phone, options = {}) {
        const { throwOnError = false } = options;

        if (!phone || typeof phone !== 'string') {
            const error = new Errors.ValidationError(
                'Phone must be a non-empty string',
                { phone, type: typeof phone }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        // Basic phone validation: allow digits, spaces, +, -, (, )
        const phoneRegex = /^[\d\s+\-()]+$/;

        if (!phoneRegex.test(phone)) {
            const error = new Errors.ValidationError(
                'Invalid phone format',
                { phone }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        // Check minimum length (at least 10 digits)
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10) {
            const error = new Errors.ValidationError(
                'Phone number must contain at least 10 digits',
                { phone, digitCount: digits.length }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        return { valid: true, error: null };
    }

    /**
     * Validate zoom level
     * @param {number} zoom - Zoom level to validate
     * @param {object} options - Validation options
     * @returns {{valid: boolean, error: string|null}}
     */
    function validateZoom(zoom, options = {}) {
        const {
            min = 0,
            max = 20,
            throwOnError = false
        } = options;

        if (typeof zoom !== 'number') {
            const error = new Errors.ValidationError(
                'Zoom must be a number',
                { zoom, type: typeof zoom }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        if (!Number.isFinite(zoom)) {
            const error = new Errors.ValidationError(
                'Zoom must be a finite number',
                { zoom }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        if (zoom < min || zoom > max) {
            const error = new Errors.ValidationError(
                `Zoom must be between ${min} and ${max}`,
                { zoom, min, max }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        return { valid: true, error: null };
    }

    /**
     * Validate required configuration fields
     * @param {object} config - Configuration object
     * @param {array} requiredFields - Array of required field names
     * @param {object} options - Validation options
     * @returns {{valid: boolean, error: string|null, missing: array}}
     */
    function validateRequiredFields(config, requiredFields, options = {}) {
        const { throwOnError = false } = options;

        if (!config || typeof config !== 'object') {
            const error = new Errors.ConfigError(
                'Config must be an object',
                { config, type: typeof config }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message, missing: requiredFields };
        }

        const missing = requiredFields.filter(field => {
            return !(field in config) || config[field] === null || config[field] === undefined;
        });

        if (missing.length > 0) {
            const error = new Errors.ConfigError(
                `Missing required fields: ${missing.join(', ')}`,
                { config, missing }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message, missing };
        }

        return { valid: true, error: null, missing: [] };
    }

    /**
     * Validate GeoJSON object
     * @param {object} geojson - GeoJSON object to validate
     * @param {object} options - Validation options
     * @returns {{valid: boolean, error: string|null}}
     */
    function validateGeoJSON(geojson, options = {}) {
        const { throwOnError = false } = options;

        if (!geojson || typeof geojson !== 'object') {
            const error = new Errors.ValidationError(
                'GeoJSON must be an object',
                { geojson, type: typeof geojson }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        // Check for type field
        if (!geojson.type) {
            const error = new Errors.ValidationError(
                'GeoJSON must have a type field',
                { geojson }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        // Validate type
        const validTypes = [
            'Point', 'MultiPoint', 'LineString', 'MultiLineString',
            'Polygon', 'MultiPolygon', 'GeometryCollection',
            'Feature', 'FeatureCollection'
        ];

        if (!validTypes.includes(geojson.type)) {
            const error = new Errors.ValidationError(
                'Invalid GeoJSON type',
                { type: geojson.type, validTypes }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        // Basic structure validation
        if (geojson.type === 'Feature' && !geojson.geometry) {
            const error = new Errors.ValidationError(
                'Feature must have a geometry',
                { geojson }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        if (geojson.type === 'FeatureCollection' && !Array.isArray(geojson.features)) {
            const error = new Errors.ValidationError(
                'FeatureCollection must have a features array',
                { geojson }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        return { valid: true, error: null };
    }

    /**
     * Validate color string (hex, rgb, rgba, named)
     * @param {string} color - Color string to validate
     * @param {object} options - Validation options
     * @returns {{valid: boolean, error: string|null}}
     */
    function validateColor(color, options = {}) {
        const { throwOnError = false } = options;

        if (!color || typeof color !== 'string') {
            const error = new Errors.ValidationError(
                'Color must be a non-empty string',
                { color, type: typeof color }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        // Check for valid color formats
        // eslint-disable-next-line security/detect-unsafe-regex
        const hexRegex = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/;
        const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
        const rgbaRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;

        const isValid = hexRegex.test(color) ||
                       rgbRegex.test(color) ||
                       rgbaRegex.test(color) ||
                       CSS.supports('color', color);

        if (!isValid) {
            const error = new Errors.ValidationError(
                'Invalid color format',
                { color }
            );
            if (throwOnError) throw error;
            return { valid: false, error: error.message };
        }

        return { valid: true, error: null };
    }

    /**
     * Batch validate multiple values with their validators
     * @param {array} validations - Array of {value, validator, options, label}
     * @returns {{valid: boolean, errors: array}}
     */
    function validateBatch(validations) {
        const errors = [];

        for (const item of validations) {
            const { value, validator, options = {}, label = 'value' } = item;

            if (typeof validator !== 'function') {
                errors.push(`Invalid validator for ${label}`);
                continue;
            }

            const result = validator(value, { ...options, throwOnError: false });

            if (!result.valid) {
                errors.push(`${label}: ${result.error}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Export all validators
    GeoLeaf.Validators = {
        validateCoordinates,
        validateUrl,
        validateEmail,
        validatePhone,
        validateZoom,
        validateRequiredFields,
        validateGeoJSON,
        validateColor,
        validateBatch
    };

})(typeof window !== 'undefined' ? window : this);
