/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @fileoverview Types de base, class d'error et validation des fields structurels du style
 * @module validators/style-validator-core
 */

import type { ValidationErrorItem, ValidationWarningItem } from "./style-validator-rules.js";

export interface StyleValidationResult {
    valid: boolean;
    errors: (ValidationErrorItem & { stack?: string })[];
    warnings: ValidationWarningItem[];
}

/**
 * Classe d'error for thes validations de style
 */
export class StyleValidationError extends Error {
    context: Record<string, unknown>;
    constructor(message: string, context: Record<string, unknown> = {}) {
        super(message);
        this.name = "StyleValidationError";
        this.context = context;
    }
}

/**
 * Valide les fields structurels required (id, style/defaultStyle, layerScale)
 */
export function validateRequiredFields(
    styleData: Record<string, unknown>,
    errors: (ValidationErrorItem & { stack?: string })[],
    context: Record<string, unknown>
): void {
    if (!("id" in styleData) || styleData.id == null) {
        errors.push({
            field: "id",
            message: `Le field required 'id' est manquant`,
            context: { availableFields: Object.keys(styleData), ...context },
        });
    }

    const hasStyle = "style" in styleData && styleData.style != null;
    const hasDefaultStyle = "defaultStyle" in styleData && styleData.defaultStyle != null;

    if (!hasStyle && !hasDefaultStyle) {
        errors.push({
            field: "style",
            message: `Le field required 'style' ou 'defaultStyle' est manquant`,
            context: { availableFields: Object.keys(styleData), ...context },
        });
    }

    if (!("layerScale" in styleData)) {
        errors.push({
            field: "layerScale",
            message: `Le field required 'layerScale' est manquant`,
            context: { availableFields: Object.keys(styleData), ...context },
        });
    }
}

/**
 * Valide le format of the ID (lettres Unicode, chiffres, tirets, underscores)
 */
export function validateId(
    styleData: Record<string, unknown>,
    errors: ValidationErrorItem[],
    context: Record<string, unknown>
): void {
    if (!styleData.id) return;

    // \p{L} = all Unicode letters (including accented, CJK, etc.)
    const idPattern = /^[\p{L}0-9_-]+$/u;
    if (typeof styleData.id !== "string") {
        errors.push({
            field: "id",
            message: `L'ID must be une string de characters`,
            context: { received: typeof styleData.id, value: styleData.id, ...context },
        });
    } else if (!idPattern.test(styleData.id)) {
        errors.push({
            field: "id",
            message: `L'ID doit contenir only des lettres, chiffres, tirets et underscores`,
            context: { received: styleData.id, pattern: idPattern.toString(), ...context },
        });
    }
}
