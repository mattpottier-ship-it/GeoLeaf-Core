/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */
/**
 * @fileoverview Label configuration extractor for GeoLeaf style data.
 * Extracted from style-loader.ts as part of Sprint 1 refactoring.
 * @module loaders/label-extractor
 */

"use strict";

/**
 * Ensures visibleByDefault is set when label.enabled is true.
 * Mutates styleData in place; emits a console warning if the field was missing.
 * @param {Object} styleData - Style data object.
 * @param {string} stylePath - Path of the style file (used in warning message).
 * @internal
 */
export function _ensureLabelVisibleByDefault(styleData: any, stylePath: string): void {
    if (styleData.label && styleData.label.enabled === true) {
        if (styleData.label.visibleByDefault === undefined) {
            styleData.label.visibleByDefault = false;
            console.warn(
                `[StyleLoader] "visibleByDefault" manquant: ${stylePath}\nFallback applied: visibleByDefault = false`
            );
        }
    }
}

/**
 * Extracts label configuration from a loaded style data object.
 * Automatically detects if labels are integrated in the style.
 * @param {Object} styleData - The style data object.
 * @returns {Object|null} Label configuration or null if absent/disabled.
 */
export function extractLabelConfig(styleData: any): Record<string, unknown> | null {
    if (!styleData || typeof styleData !== "object") {
        return null;
    }

    if (styleData.label && typeof styleData.label === "object" && styleData.label !== null) {
        if (styleData.label.enabled === true) {
            return {
                ...styleData.label,
                isIntegrated: true,
            };
        }
    }

    return null;
}
