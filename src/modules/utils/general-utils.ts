/* eslint-disable security/detect-object-injection */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @fileoverview General utility functions for GeoLeaf
 */

import { Log } from "../log/index.js";
import { Config } from "../config/config-primitives.js";
import { validateUrl as _secValidateUrl } from "../security/index.js";
import { Core } from "../geoleaf.core.js";

export function validateUrl(
    url: string | null | undefined,
    _allowedProtocols: string[] = ["http:", "https:", "mailto:", "tel:"]
): string | null {
    if (!url || typeof url !== "string") return null;
    try {
        return _secValidateUrl(url);
    } catch {
        return null;
    }
}

export function deepMerge<T extends Record<string, unknown>>(
    target: T,
    source: Record<string, unknown> | null | undefined
): T {
    if (!source || typeof source !== "object") return target;
    if (!target || typeof target !== "object") return source as T;

    const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];
    const output = Object.assign({}, target) as T;

    Object.keys(source).forEach((key) => {
        if (DANGEROUS_KEYS.includes(key)) return;

        const srcVal = source[key];
        if (srcVal && typeof srcVal === "object" && !Array.isArray(srcVal)) {
            (output as Record<string, unknown>)[key] = deepMerge(
                (target[key] as Record<string, unknown>) || {},
                srcVal as Record<string, unknown>
            );
        } else {
            (output as Record<string, unknown>)[key] = srcVal;
        }
    });

    return output;
}

export function ensureMap(explicitMap: unknown): unknown {
    if (explicitMap) return explicitMap;
    if (Core && typeof (Core as { getMap?: () => unknown }).getMap === "function") {
        return (Core as { getMap: () => unknown }).getMap();
    }
    return null;
}

export function mergeOptions<T extends Record<string, unknown>>(
    defaults: T,
    override: Record<string, unknown> | null | undefined
): T {
    if (!override || typeof override !== "object") return defaults;
    return Object.assign({}, defaults, override) as T;
}

export function fireMapEvent(
    map: { fire?: (name: string, payload: unknown) => void } | null | undefined,
    eventName: string,
    payload?: unknown
): void {
    if (!map || typeof map.fire !== "function") return;
    try {
        map.fire(eventName, payload ?? {});
    } catch (err) {
        if (Log) Log.warn("[Utils] fireMapEvent error:", eventName, err);
    }
}

export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number = 250,
    immediate: boolean = false
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function debounced(this: unknown, ...args: Parameters<T>) {
        const context = this;
        const later = () => {
            timeout = undefined;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number = 100
): (...args: Parameters<T>) => void {
    let lastRan: number | undefined;
    return function throttled(this: unknown, ...args: Parameters<T>) {
        const context = this;
        const now = Date.now();
        if (!lastRan || now - lastRan >= limit) {
            func.apply(context, args);
            lastRan = now;
        }
    };
}

export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function _traversePath(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split(".");
    let value: unknown = obj;

    for (const key of keys) {
        if (value && typeof value === "object" && key in (value as object)) {
            value = (value as Record<string, unknown>)[key];
        } else {
            value = null;
            break;
        }
    }

    if (value != null) {
        if (typeof value === "string") {
            if (value.trim()) return value;
        } else {
            return value;
        }
    }
    return null;
}

export function resolveField(
    obj: Record<string, unknown> | null | undefined,
    ...paths: string[]
): unknown {
    if (!obj || typeof obj !== "object") return "";

    for (const path of paths) {
        const result = _traversePath(obj, path);
        if (result != null) return result;
    }

    return "";
}

export function compareByOrder(
    a: { order?: number },
    b: { order?: number },
    fallback: number = 999
): number {
    const orderA = typeof a.order === "number" ? a.order : fallback;
    const orderB = typeof b.order === "number" ? b.order : fallback;
    return orderA - orderB;
}

export function getLog(): typeof Log {
    return Log;
}

export function getActiveProfile(): unknown {
    const C = Config as unknown as { getActiveProfile?: () => unknown };
    if (C && typeof C.getActiveProfile === "function") {
        return C.getActiveProfile() ?? null;
    }
    return null;
}

export const Utils = {
    validateUrl,
    deepMerge,
    ensureMap,
    mergeOptions,
    fireMapEvent,
    debounce,
    throttle,
    getDistance,
    resolveField,
    compareByOrder,
    getLog,
    getActiveProfile,
};
