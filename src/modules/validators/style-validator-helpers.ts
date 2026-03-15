/* eslint-disable security/detect-object-injection */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @fileoverview Helpers color et opacity reusable for style validation.
 * Deduplicates repeated patterns (color hex, plage opacity, size >= 0).
 * @module validators/style-validator-helpers
 */

import type { ValidationErrorItem } from "./style-validator-rules.js";

/**
 * Checks if une color est au format hex valide (#RRGGBB)
 */
export function isValidHexColor(color: unknown): boolean {
    return typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Pousse une error si le field color est present mais invalid (#RRGGBB)
 */
export function pushColorError(
    obj: Record<string, unknown>,
    key: string,
    fieldPath: string,
    errors: ValidationErrorItem[],
    context: Record<string, unknown>
): void {
    if (obj[key] && !isValidHexColor(obj[key])) {
        errors.push({
            field: fieldPath,
            message: `Couleur invalide, format expected: #RRGGBB`,
            context: { received: obj[key], ...context },
        });
    }
}

/**
 * Pousse une error si le field opacity est present mais hors de la plage [0, 1]
 */
export function pushOpacityError(
    obj: Record<string, unknown>,
    key: string,
    fieldPath: string,
    errors: ValidationErrorItem[],
    context: Record<string, unknown>
): void {
    if (key in obj) {
        const val = obj[key];
        if (typeof val !== "number" || val < 0 || val > 1) {
            errors.push({
                field: fieldPath,
                message: `Opacity must be a number between 0 and 1`,
                context: { received: val, ...context },
            });
        }
    }
}

/**
 * Pousse une error si the numeric field is present but strictly negative
 */
export function pushSizeError(
    obj: Record<string, unknown>,
    key: string,
    fieldPath: string,
    errors: ValidationErrorItem[],
    context: Record<string, unknown>
): void {
    if (key in obj) {
        const val = obj[key];
        if (typeof val !== "number" || val < 0) {
            errors.push({
                field: fieldPath,
                message: `${key} must be un nombre >= 0`,
                context: { received: val, ...context },
            });
        }
    }
}
