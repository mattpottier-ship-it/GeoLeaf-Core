/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf - Errors Module
 *
 * Provides typed error classes for better error handling throughout the library.
 * Each error type includes context information and can be caught specifically.
 *
 * @module GeoLeaf.Errors
 * @version 1.4.0
 */

(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    /**
     * Base error class for all GeoLeaf errors
     * Extends native Error with additional context
     */
    class GeoLeafError extends Error {
        constructor(message, context = {}) {
            super(message);
            this.name = this.constructor.name;
            this.context = context;
            this.timestamp = new Date().toISOString();

            // Maintain proper stack trace in V8
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, this.constructor);
            }
        }

        /**
         * Convert error to JSON for logging/serialization
         */
        toJSON() {
            return {
                name: this.name,
                message: this.message,
                context: this.context,
                timestamp: this.timestamp,
                stack: this.stack
            };
        }

        /**
         * Get formatted error message with context
         */
        toString() {
            const contextStr = Object.keys(this.context).length > 0
                ? ` [Context: ${JSON.stringify(this.context)}]`
                : '';
            return `${this.name}: ${this.message}${contextStr}`;
        }
    }

    /**
     * Validation error - thrown when input validation fails
     * Used for: coordinate validation, parameter validation, data format errors
     */
    class ValidationError extends GeoLeafError {
        constructor(message, context = {}) {
            super(message, context);
            this.code = 'VALIDATION_ERROR';
        }
    }

    /**
     * Security error - thrown when security checks fail
     * Used for: XSS detection, protocol validation, unsafe content
     */
    class SecurityError extends GeoLeafError {
        constructor(message, context = {}) {
            super(message, context);
            this.code = 'SECURITY_ERROR';
        }
    }

    /**
     * Configuration error - thrown when config is invalid or missing
     * Used for: missing required config, invalid config format, config loading errors
     */
    class ConfigError extends GeoLeafError {
        constructor(message, context = {}) {
            super(message, context);
            this.code = 'CONFIG_ERROR';
        }
    }

    /**
     * Network error - thrown when HTTP requests fail
     * Used for: fetch failures, timeout, network unavailable
     */
    class NetworkError extends GeoLeafError {
        constructor(message, context = {}) {
            super(message, context);
            this.code = 'NETWORK_ERROR';
        }
    }

    /**
     * Initialization error - thrown when module initialization fails
     * Used for: missing dependencies, invalid state, setup failures
     */
    class InitializationError extends GeoLeafError {
        constructor(message, context = {}) {
            super(message, context);
            this.code = 'INITIALIZATION_ERROR';
        }
    }

    /**
     * Map error - thrown when map operations fail
     * Used for: invalid map instance, missing Leaflet, map state errors
     */
    class MapError extends GeoLeafError {
        constructor(message, context = {}) {
            super(message, context);
            this.code = 'MAP_ERROR';
        }
    }

    /**
     * Data error - thrown when data processing fails
     * Used for: invalid GeoJSON, parsing errors, data transformation failures
     */
    class DataError extends GeoLeafError {
        constructor(message, context = {}) {
            super(message, context);
            this.code = 'DATA_ERROR';
        }
    }

    /**
     * POI error - thrown when POI operations fail
     * Used for: invalid POI data, marker creation failures, popup errors
     */
    class POIError extends GeoLeafError {
        constructor(message, context = {}) {
            super(message, context);
            this.code = 'POI_ERROR';
        }
    }

    /**
     * Route error - thrown when route operations fail
     * Used for: invalid route data, routing service failures
     */
    class RouteError extends GeoLeafError {
        constructor(message, context = {}) {
            super(message, context);
            this.code = 'ROUTE_ERROR';
        }
    }

    /**
     * UI error - thrown when UI operations fail
     * Used for: DOM manipulation failures, element not found, rendering errors
     */
    class UIError extends GeoLeafError {
        constructor(message, context = {}) {
            super(message, context);
            this.code = 'UI_ERROR';
        }
    }

    /**
     * Helper function to create error from unknown value
     * Ensures we always have a proper Error object
     */
    function normalizeError(error, defaultMessage = 'An unknown error occurred') {
        if (error instanceof Error) {
            return error;
        }

        if (typeof error === 'string') {
            return new GeoLeafError(error);
        }

        if (error && typeof error === 'object') {
            const message = error.message || error.error || defaultMessage;
            return new GeoLeafError(message, { originalError: error });
        }

        return new GeoLeafError(defaultMessage, { originalError: error });
    }

    /**
     * Helper function to check if error is a specific type
     */
    function isErrorType(error, ErrorClass) {
        return error instanceof ErrorClass;
    }

    /**
     * Helper function to get error code
     */
    function getErrorCode(error) {
        if (error && typeof error === 'object' && 'code' in error) {
            return error.code;
        }
        return 'UNKNOWN_ERROR';
    }

    /**
     * Helper to create an error with stack trace from current location
     */
    function createError(ErrorClass, message, context = {}) {
        const error = new ErrorClass(message, context);
        // Ensure stack trace is captured at creation point
        if (Error.captureStackTrace) {
            Error.captureStackTrace(error, createError);
        }
        return error;
    }

    /**
     * Error factory - creates appropriate error based on type string
     */
    function createErrorByType(type, message, context = {}) {
        const errorMap = {
            'validation': ValidationError,
            'security': SecurityError,
            'config': ConfigError,
            'network': NetworkError,
            'initialization': InitializationError,
            'map': MapError,
            'data': DataError,
            'poi': POIError,
            'route': RouteError,
            'ui': UIError
        };

        const ErrorClass = errorMap[type.toLowerCase()] || GeoLeafError;
        return createError(ErrorClass, message, context);
    }

    /**
     * Safe error handler wrapper
     * Catches errors in error handlers to prevent infinite loops
     */
    function safeErrorHandler(handler, error) {
        try {
            handler(error);
        } catch (handlerError) {
            if (Log) Log.error('[GeoLeaf.Errors] Error in error handler:', handlerError);
            if (Log) Log.error('[GeoLeaf.Errors] Original error:', error);
        }
    }

    // Export all error classes and utilities
    GeoLeaf.Errors = {
        // Base class
        GeoLeafError,

        // Specific error types
        ValidationError,
        SecurityError,
        ConfigError,
        NetworkError,
        InitializationError,
        MapError,
        DataError,
        POIError,
        RouteError,
        UIError,

        // Utilities
        normalizeError,
        isErrorType,
        getErrorCode,
        createError,
        createErrorByType,
        safeErrorHandler,

        // Error codes enum for easy reference
        ErrorCodes: {
            VALIDATION: 'VALIDATION_ERROR',
            SECURITY: 'SECURITY_ERROR',
            CONFIG: 'CONFIG_ERROR',
            NETWORK: 'NETWORK_ERROR',
            INITIALIZATION: 'INITIALIZATION_ERROR',
            MAP: 'MAP_ERROR',
            DATA: 'DATA_ERROR',
            POI: 'POI_ERROR',
            ROUTE: 'ROUTE_ERROR',
            UI: 'UI_ERROR'
        }
    };

    // Freeze error codes to prevent modification
    if (Object.freeze) {
        Object.freeze(GeoLeaf.Errors.ErrorCodes);
    }

})(typeof window !== 'undefined' ? window : this);
