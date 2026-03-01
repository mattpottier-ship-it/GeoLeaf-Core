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

// ── Types ──

export interface ErrorContext {
    [key: string]: unknown;
}

export interface ErrorToJSON {
    name: string;
    message: string;
    context: ErrorContext;
    timestamp: string;
    stack?: string;
}

type ErrorClassConstructor = new (message: string, context?: ErrorContext) => GeoLeafError;

// ── Base class ──

export class GeoLeafError extends Error {
    context: ErrorContext;
    timestamp: string;
    declare code?: string;

    constructor(message: string, context: ErrorContext = {}) {
        super(message);
        this.name = this.constructor.name;
        this.context = context;
        this.timestamp = new Date().toISOString();
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    toJSON(): ErrorToJSON {
        return {
            name: this.name,
            message: this.message,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }

    toString(): string {
        const contextStr = Object.keys(this.context).length > 0
            ? ` [Context: ${JSON.stringify(this.context)}]`
            : '';
        return `${this.name}: ${this.message}${contextStr}`;
    }
}

// ── Specific error types ──

export class ValidationError extends GeoLeafError {
    declare code: string;
    constructor(message: string, context: ErrorContext = {}) {
        super(message, context);
        this.code = 'VALIDATION_ERROR';
    }
}

export class SecurityError extends GeoLeafError {
    declare code: string;
    constructor(message: string, context: ErrorContext = {}) {
        super(message, context);
        this.code = 'SECURITY_ERROR';
    }
}

export class ConfigError extends GeoLeafError {
    declare code: string;
    constructor(message: string, context: ErrorContext = {}) {
        super(message, context);
        this.code = 'CONFIG_ERROR';
    }
}

export class NetworkError extends GeoLeafError {
    declare code: string;
    constructor(message: string, context: ErrorContext = {}) {
        super(message, context);
        this.code = 'NETWORK_ERROR';
    }
}

export class InitializationError extends GeoLeafError {
    declare code: string;
    constructor(message: string, context: ErrorContext = {}) {
        super(message, context);
        this.code = 'INITIALIZATION_ERROR';
    }
}

export class MapError extends GeoLeafError {
    declare code: string;
    constructor(message: string, context: ErrorContext = {}) {
        super(message, context);
        this.code = 'MAP_ERROR';
    }
}

export class DataError extends GeoLeafError {
    declare code: string;
    constructor(message: string, context: ErrorContext = {}) {
        super(message, context);
        this.code = 'DATA_ERROR';
    }
}

export class POIError extends GeoLeafError {
    declare code: string;
    constructor(message: string, context: ErrorContext = {}) {
        super(message, context);
        this.code = 'POI_ERROR';
    }
}

export class RouteError extends GeoLeafError {
    declare code: string;
    constructor(message: string, context: ErrorContext = {}) {
        super(message, context);
        this.code = 'ROUTE_ERROR';
    }
}

export class UIError extends GeoLeafError {
    declare code: string;
    constructor(message: string, context: ErrorContext = {}) {
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

export function normalizeError(error: unknown, defaultMessage: string = 'An unknown error occurred'): GeoLeafError {
    if (error instanceof Error) return error as GeoLeafError;
    if (typeof error === 'string') return new GeoLeafError(error);
    if (error && typeof error === 'object') {
        const obj = error as { message?: string; error?: string };
        const message = obj.message || obj.error || defaultMessage;
        return new GeoLeafError(message, { originalError: error });
    }
    return new GeoLeafError(defaultMessage, { originalError: error });
}

export function isErrorType(error: unknown, ErrorClass: typeof GeoLeafError): boolean {
    return error instanceof ErrorClass;
}

export function getErrorCode(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error) return (error as { code: string }).code;
    return 'UNKNOWN_ERROR';
}

export function createError(ErrorClass: ErrorClassConstructor, message: string, context: ErrorContext = {}): GeoLeafError {
    const err = new ErrorClass(message, context);
    if (Error.captureStackTrace) {
        Error.captureStackTrace(err, createError);
    }
    return err;
}

const errorMap: Record<string, ErrorClassConstructor> = {
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

export function createErrorByType(type: string, message: string, context: ErrorContext = {}): GeoLeafError {
    const ErrorClass = errorMap[type.toLowerCase()] || GeoLeafError;
    return createError(ErrorClass, message, context);
}

const MAX_ERROR_MESSAGE_LENGTH = 500;

export function sanitizeErrorMessage(message: unknown, maxLength: number = MAX_ERROR_MESSAGE_LENGTH): string {
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

export function safeErrorHandler(handler: ((err: unknown) => void) | undefined, error: unknown): void {
    if (typeof handler !== 'function') return;
    try {
        handler(error);
    } catch (handlerError: unknown) {
        (Log as { error: (...args: unknown[]) => void }).error('[GeoLeaf.Errors] Error in error handler:', handlerError);
        (Log as { error: (...args: unknown[]) => void }).error('[GeoLeaf.Errors] Original error:', error);
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
