/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */
/**
 * @fileoverview In-memory cache for GeoLeaf styles.
 * Extracted from style-loader.ts as part of Sprint 1 refactoring.
 * @module loaders/style-cache
 */

"use strict";

/**
 * In-memory cache for loaded styles.
 * Key: "profileId:layerId:styleId"
 * Value: { styleData, labelConfig, timestamp }
 */
export const styleCache = new Map<string, unknown>();

/**
 * Clears the style cache.
 * @param {string|null} [cacheKey] - Specific key to remove, or null to clear all entries.
 */
export function clearStyleCache(cacheKey: string | null = null): void {
    if (cacheKey) {
        styleCache.delete(cacheKey);
    } else {
        styleCache.clear();
    }
}
