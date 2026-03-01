/**
 * GeoLeaf Error Logger
 *
 * Centralised error logging for consistent error reporting across all modules.
 * Replaces 60+ LOC of repetitive logging patterns with unified interface.
 *
 * @module GeoLeaf.Utils.ErrorLogger
 * @version 3.0.0
 */

import { Log } from "../log/index.js";

export interface ErrorLoggerOperationContext {
    success: (result: unknown) => unknown;
    error: (error: unknown) => never;
    warn: (warning: string) => void;
}

export const ErrorLogger = {
    LEVELS: {
        ERROR: "error",
        WARN: "warn",
        INFO: "info",
        DEBUG: "debug",
    } as const,

    error(module: string, message: string, error?: unknown): void {
        const fullMessage = `[${module}] ${message}`;
        if (Log && typeof Log.error === "function") {
            Log.error(fullMessage, error);
            if (error && typeof error === "object" && error !== null && "stack" in error) {
                Log.error(`  Stack: ${(error as Error).stack}`);
            }
        }
    },

    warn(module: string, message: string): void {
        const fullMessage = `[${module}] ${message}`;
        if (Log && typeof Log.warn === "function") {
            Log.warn(fullMessage);
        }
    },

    info(module: string, message: string): void {
        const fullMessage = `[${module}] ${message}`;
        if (Log && typeof Log.info === "function") {
            Log.info(fullMessage);
        }
    },

    debug(module: string, message: string): void {
        const fullMessage = `[${module}] ${message}`;
        if (Log && typeof Log.debug === "function") {
            Log.debug(fullMessage);
        } else {
            console.debug(fullMessage);
        }
    },

    quotaError(module: string, available: number, needed: number): void {
        const availableGB = (available / 1024 / 1024 / 1024).toFixed(2);
        const neededGB = (needed / 1024 / 1024 / 1024).toFixed(2);
        const shortageGB = ((needed - available) / 1024 / 1024 / 1024).toFixed(2);
        const message = `QUOTA EXCEEDED - Available: ${availableGB}GB, Needed: ${neededGB}GB, Shortage: ${shortageGB}GB`;
        this.error(module, message);
    },

    networkError(module: string, url: string, status: number | string, error?: unknown): void {
        const message = `Network error [${status}] - ${url}`;
        this.error(module, message, error);
    },

    validationError(module: string, field: string, expectedFormat: string): void {
        const message = `Validation error - ${field} (expected: ${expectedFormat})`;
        this.warn(module, message);
    },

    idbError(module: string, operation: string, error?: unknown): void {
        const message = `IndexedDB error (${operation})`;
        this.error(module, message, error);
    },

    performance(module: string, operation: string, milliseconds: number): void {
        const message = `${operation} completed in ${milliseconds}ms`;
        this.info(module, message);
    },

    memoryWarning(module: string, usedMB: number): void {
        const message = `⚠️ High memory usage: ${usedMB}MB`;
        this.warn(module, message);
    },

    operation(module: string, operation: string): ErrorLoggerOperationContext {
        const startTime = performance.now();
        const self = this;
        return {
            success(result: unknown) {
                const duration = performance.now() - startTime;
                self.info(module, `${operation} succeeded (${duration.toFixed(0)}ms)`);
                return result;
            },
            error(error: unknown): never {
                const duration = performance.now() - startTime;
                self.error(module, `${operation} failed (${duration.toFixed(0)}ms)`, error);
                throw error;
            },
            warn(warning: string) {
                const duration = performance.now() - startTime;
                self.warn(module, `${operation} warning (${duration.toFixed(0)}ms): ${warning}`);
            },
        };
    },
};

if (Log) {
    Log.debug("[ErrorLogger] Module loaded");
}
