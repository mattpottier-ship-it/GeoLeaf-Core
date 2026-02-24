/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module errors
 * @description Typed error classes for GeoLeaf.
 * Each error type includes context information and can be caught specifically.
 */

import { Log } from '../log/index.js';

// ── Base class ──

export class GeoLeafError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = this.constructor.name;
        this.context = context;
        this.timestamp = new Date().toISOString();
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }

    toString() {
        const contextStr = Object.keys(this.context).length > 0
            ? ` [Context: ${JSON.stringify(this.context)}]`
            : '';
        return `${this.name}: ${this.message}${contextStr}`;
    }
}

// ── Specific error types ──

export class ValidationError extends GeoLeafError {
    constructor(message, context = {}) {
        super(message, context);
        this.code = 'VALIDATION_ERROR';
    }
}

export class SecurityError extends GeoLeafError {
    constructor(message, context = {}) {
        super(message, context);
        this.code = 'SECURITY_ERROR';
    }
}

export class ConfigError extends GeoLeafError {
    constructor(message, context = {}) {
        super(message, context);
        this.code = 'CONFIG_ERROR';
    }
}

export class NetworkError extends GeoLeafError {
    constructor(message, context = {}) {
        super(message, context);
        this.code = 'NETWORK_ERROR';
    }
}

export class InitializationError extends GeoLeafError {
    constructor(message, context = {}) {
        super(message, context);
        this.code = 'INITIALIZATION_ERROR';
    }
}

export class MapError extends GeoLeafError {
    constructor(message, context = {}) {
        super(message, context);
        this.code = 'MAP_ERROR';
    }
}

export class DataError extends GeoLeafError {
    constructor(message, context = {}) {
        super(message, context);
        this.code = 'DATA_ERROR';
    }
}

export class POIError extends GeoLeafError {
    constructor(message, context = {}) {
        super(message, context);
        this.code = 'POI_ERROR';
    }
}

export class RouteError extends GeoLeafError {
    constructor(message, context = {}) {
        super(message, context);
        this.code = 'ROUTE_ERROR';
    }
}

export class UIError extends GeoLeafError {
    constructor(message, context = {}) {
        super(message, context);
        this.code = 'UI_ERROR';
    }
}

// ── Error codes enum ──

export const ErrorCodes = Object.freeze({
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
});

// ── Utility functions ──

export function normalizeError(error, defaultMessage = 'An unknown error occurred') {
    if (error instanceof Error) return error;
    if (typeof error === 'string') return new GeoLeafError(error);
    if (error && typeof error === 'object') {
        const message = error.message || error.error || defaultMessage;
        return new GeoLeafError(message, { originalError: error });
    }
    return new GeoLeafError(defaultMessage, { originalError: error });
}

export function isErrorType(error, ErrorClass) {
    return error instanceof ErrorClass;
}

export function getErrorCode(error) {
    if (error && typeof error === 'object' && 'code' in error) return error.code;
    return 'UNKNOWN_ERROR';
}

export function createError(ErrorClass, message, context = {}) {
    const error = new ErrorClass(message, context);
    if (Error.captureStackTrace) {
        Error.captureStackTrace(error, createError);
    }
    return error;
}

export function createErrorByType(type, message, context = {}) {
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

const MAX_ERROR_MESSAGE_LENGTH = 500;

export function sanitizeErrorMessage(message, maxLength = MAX_ERROR_MESSAGE_LENGTH) {
    if (message == null) return 'Unknown error';
    let str = typeof message === 'string' ? message : String(message);
    str = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    if (str.length > maxLength) {
        str = str.slice(0, maxLength) + '...';
    }
    return str;
}

export function safeErrorHandler(handler, error) {
    if (typeof handler !== 'function') return;
    try {
        handler(error);
    } catch (handlerError) {
        Log.error('[GeoLeaf.Errors] Error in error handler:', handlerError);
        Log.error('[GeoLeaf.Errors] Original error:', error);
    }
}

// ── Aggregate export (facade) ──

export const Errors = {
    GeoLeafError,
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
    normalizeError,
    isErrorType,
    getErrorCode,
    createError,
    createErrorByType,
    sanitizeErrorMessage,
    safeErrorHandler,
    ErrorCodes
};

// ── Backward compatibility moved to globals.js ──
