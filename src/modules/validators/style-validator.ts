/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @fileoverview Validateur de fichiers de style GeoLeaf
 * Valide les fichiers style.json contre le schéma JSON défini
 * et génère des erreurs détaillées avec contexte pour faciliter le debugging
 * @module validators/style-validator
 */

import {
    validateStyleRules as _validateStyleRules,
    validateScales as _validateScales,
    validateLegend as _validateLegend,
    type ValidationErrorItem,
    type ValidationWarningItem
} from './style-validator-rules.js';

export interface StyleValidationResult {
    valid: boolean;
    errors: (ValidationErrorItem & { stack?: string })[];
    warnings: ValidationWarningItem[];
}

/**
 * Classe d'erreur pour les validations de style
 */
export class StyleValidationError extends Error {
    context: Record<string, unknown>;
    constructor(message: string, context: Record<string, unknown> = {}) {
        super(message);
        this.name = 'StyleValidationError';
        this.context = context;
    }
}

/**
 * Valide un objet de style contre le schéma JSON
 */
export function validateStyle(
    styleData: Record<string, unknown> | null | undefined,
    context: Record<string, unknown> = {}
): StyleValidationResult {
    const errors: (ValidationErrorItem & { stack?: string })[] = [];
    const warnings: ValidationWarningItem[] = [];

    try {
        // Validation de base: objet requis
        if (!styleData || typeof styleData !== 'object') {
            errors.push({
                field: 'root',
                message: 'Le style doit être un objet JSON valide',
                context: { received: typeof styleData, ...context }
            });
            return { valid: false, errors, warnings };
        }

        // Validation des champs requis
        validateRequiredFields(styleData, errors, context);

        // Validation du format de l'ID
        validateId(styleData, errors, context);

        // Validation du champ label (string ou objet)
        validateLabel(styleData, errors, warnings, context);

        // Validation du style de base
        validateBaseStyle(styleData, errors, warnings, context);

        // Validation des styleRules si présentes
        if (styleData.styleRules) {
            _validateStyleRules(styleData.styleRules, errors, warnings, context);
        }

        // Validation des échelles
        _validateScales(styleData, errors, warnings, context);

        // Validation de la légende
        if (styleData.legend) {
            _validateLegend(styleData.legend, errors, warnings, context);
        }

    } catch (error) {
        errors.push({
            field: 'validation',
            message: `Erreur inattendue lors de la validation: ${(error as Error).message}`,
            stack: (error as Error).stack,
            context
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Valide les champs requis
 */
function validateRequiredFields(
    styleData: Record<string, unknown>,
    errors: (ValidationErrorItem & { stack?: string })[],
    context: Record<string, unknown>
): void {
    // Vérifier l'ID (obligatoire)
    if (!('id' in styleData) || styleData.id === undefined || styleData.id === null) {
        errors.push({
            field: 'id',
            message: `Le champ requis 'id' est manquant`,
            context: { availableFields: Object.keys(styleData), ...context }
        });
    }

    // Vérifier que 'style' OU 'defaultStyle' est présent (au moins un des deux)
    const hasStyle = ('style' in styleData) && styleData.style !== undefined && styleData.style !== null;
    const hasDefaultStyle = ('defaultStyle' in styleData) && styleData.defaultStyle !== undefined && styleData.defaultStyle !== null;

    if (!hasStyle && !hasDefaultStyle) {
        errors.push({
            field: 'style',
            message: `Le champ requis 'style' ou 'defaultStyle' est manquant`,
            context: { availableFields: Object.keys(styleData), ...context }
        });
    }

    if (!('layerScale' in styleData)) {
        errors.push({
            field: 'layerScale',
            message: `Le champ requis 'layerScale' est manquant`,
            context: { availableFields: Object.keys(styleData), ...context }
        });
    }
}

/**
 * Valide le format de l'ID
 */
function validateId(
    styleData: Record<string, unknown>,
    errors: ValidationErrorItem[],
    context: Record<string, unknown>
): void {
    if (!styleData.id) return;

    // Pattern acceptant lettres (y compris accentuées), chiffres, tirets et underscores
    // \p{L} = toutes les lettres Unicode (y compris é, à, ñ, etc.)
    const idPattern = /^[\p{L}0-9_-]+$/u;
    if (typeof styleData.id !== 'string') {
        errors.push({
            field: 'id',
            message: `L'ID doit être une chaîne de caractères`,
            context: { received: typeof styleData.id, value: styleData.id, ...context }
        });
    } else if (!idPattern.test(styleData.id)) {
        errors.push({
            field: 'id',
            message: `L'ID doit contenir uniquement des lettres, chiffres, tirets et underscores`,
            context: { received: styleData.id, pattern: idPattern.toString(), ...context }
        });
    }
}

/**
 * Valide le champ label (peut être string ou objet de config label)
 */
function validateLabel(
    styleData: Record<string, unknown>,
    errors: ValidationErrorItem[],
    warnings: ValidationWarningItem[],
    context: Record<string, unknown>
): void {
    if (!('label' in styleData)) return;

    const label = styleData.label as string | Record<string, unknown> | undefined;

    // String: nom d'affichage
    if (typeof label === 'string') {
        return;
    }

    // Objet: configuration de labels intégrés
    if (typeof label === 'object' && label !== null) {
        const labelObj = label as Record<string, unknown>;
        // enabled est requis
        if (!('enabled' in labelObj)) {
            errors.push({
                field: 'label.enabled',
                message: `Le champ 'enabled' est requis dans la configuration de labels`,
                context: { labelConfig: label, ...context }
            });
        } else if (typeof labelObj.enabled !== 'boolean') {
            errors.push({
                field: 'label.enabled',
                message: `Le champ 'enabled' doit être un booléen`,
                context: { received: typeof labelObj.enabled, value: labelObj.enabled, ...context }
            });
        }

        // Si enabled, field devrait être présent
        if (labelObj.enabled && !labelObj.field) {
            warnings.push({
                field: 'label.field',
                message: `Les labels sont activés mais aucun champ n'est spécifié`,
                context: { labelConfig: label, ...context }
            });
        }

        // Validation font
        if (labelObj.font) {
            validateFont(labelObj.font, errors, warnings, context);
        }

        // Validation des couleurs
        if (labelObj.color && !isValidHexColor(labelObj.color as string)) {
            errors.push({
                field: 'label.color',
                message: `Couleur invalide, format attendu: #RRGGBB`,
                context: { received: labelObj.color, ...context }
            });
        }

        // Validation opacity
        if ('opacity' in labelObj && (typeof labelObj.opacity !== 'number' || (labelObj.opacity as number) < 0 || (labelObj.opacity as number) > 1)) {
            errors.push({
                field: 'label.opacity',
                message: `L'opacité doit être un nombre entre 0 et 1`,
                context: { received: labelObj.opacity, ...context }
            });
        }

        // Validation buffer
        if (labelObj.buffer) {
            validateLabelComponent(labelObj.buffer, 'label.buffer', errors, warnings, context);
        }

        // Validation background
        if (labelObj.background) {
            validateLabelComponent(labelObj.background, 'label.background', errors, warnings, context);
        }

        // Validation offset
        if (labelObj.offset && typeof (labelObj.offset as Record<string, unknown>).distancePx !== 'undefined') {
            const offset = labelObj.offset as Record<string, unknown>;
            if (typeof offset.distancePx !== 'number') {
                errors.push({
                field: 'label.offset.distancePx',
                message: `distancePx doit être un nombre`,
                context: { received: typeof offset.distancePx, ...context }
                });
            }
        }

        return;
    }

    // Type invalide
    errors.push({
        field: 'label',
        message: `Le champ 'label' doit être une chaîne de caractères ou un objet de configuration`,
        context: { received: typeof label, value: label, ...context }
    });
}

/**
 * Valide la configuration font
 */
function validateFont(
    font: unknown,
    errors: ValidationErrorItem[],
    _warnings: ValidationWarningItem[],
    context: Record<string, unknown>
): void {
    if (typeof font !== 'object' || font === null) {
        errors.push({
            field: 'label.font',
            message: `La configuration font doit être un objet`,
            context: { received: typeof font, ...context }
        });
        return;
    }

    const f = font as Record<string, unknown>;
    if (f.sizePt !== undefined) {
        if (typeof f.sizePt !== 'number' || f.sizePt < 1) {
            errors.push({
                field: 'label.font.sizePt',
                message: `sizePt doit être un nombre >= 1`,
                context: { received: f.sizePt, ...context }
            });
        }
    }

    if (f.weight !== undefined) {
        if (!Number.isInteger(f.weight) || (f.weight as number) < 0 || (f.weight as number) > 100) {
            errors.push({
                field: 'label.font.weight',
                message: `weight doit être un entier entre 0 et 100`,
                context: { received: f.weight, ...context }
            });
        }
    }
}

/**
 * Valide un composant de label (buffer, background)
 */
function validateLabelComponent(
    component: unknown,
    fieldPath: string,
    errors: ValidationErrorItem[],
    _warnings: ValidationWarningItem[],
    context: Record<string, unknown>
): void {
    if (typeof component !== 'object' || component === null) {
        errors.push({
            field: fieldPath,
            message: `${fieldPath} doit être un objet`,
            context: { received: typeof component, ...context }
        });
        return;
    }

    const comp = component as Record<string, unknown>;
    if (comp.color && !isValidHexColor(comp.color as string)) {
        errors.push({
            field: `${fieldPath}.color`,
            message: `Couleur invalide, format attendu: #RRGGBB`,
            context: { received: comp.color, ...context }
        });
    }

    if ('opacity' in comp && (typeof comp.opacity !== 'number' || (comp.opacity as number) < 0 || (comp.opacity as number) > 1)) {
        errors.push({
            field: `${fieldPath}.opacity`,
            message: `L'opacité doit être un nombre entre 0 et 1`,
            context: { received: comp.opacity, ...context }
        });
    }

    if ('sizePx' in comp && (typeof comp.sizePx !== 'number' || (comp.sizePx as number) < 0)) {
        errors.push({
            field: `${fieldPath}.sizePx`,
            message: `sizePx doit être un nombre >= 0`,
            context: { received: comp.sizePx, ...context }
        });
    }
}

/**
 * Valide le style de base
 */
function validateBaseStyle(
    styleData: Record<string, unknown>,
    errors: ValidationErrorItem[],
    warnings: ValidationWarningItem[],
    context: Record<string, unknown>
): void {
    const style = styleData.style || styleData.defaultStyle;

    if (!style) return;

    const styleObj = style as Record<string, unknown>;
    if (typeof styleObj !== 'object' || styleObj === null) {
        errors.push({
            field: 'style',
            message: `Le style doit être un objet`,
            context: { received: typeof styleObj, ...context }
        });
        return;
    }

    // Validation des couleurs
    (['fillColor', 'color'] as const).forEach(colorField => {
        if (styleObj[colorField] && !isValidHexColor(styleObj[colorField] as string)) {
            errors.push({
                field: `style.${colorField}`,
                message: `Couleur invalide, format attendu: #RRGGBB`,
                context: { received: styleObj[colorField], ...context }
            });
        }
    });

    // Validation des opacités
    (['fillOpacity', 'opacity'] as const).forEach(opacityField => {
        if (opacityField in styleObj) {
            const val = styleObj[opacityField];
            if (typeof val !== 'number' || val < 0 || val > 1) {
                errors.push({
                    field: `style.${opacityField}`,
                    message: `${opacityField} doit être un nombre entre 0 et 1`,
                    context: { received: val, ...context }
                });
            }
        }
    });

    // Validation des tailles
    (['weight', 'sizePx', 'radius'] as const).forEach(sizeField => {
        if (sizeField in styleObj) {
            const val = styleObj[sizeField];
            if (typeof val !== 'number' || val < 0) {
                errors.push({
                    field: `style.${sizeField}`,
                    message: `${sizeField} doit être un nombre >= 0`,
                    context: { received: val, ...context }
                });
            }
        }
    });

    // Validation shape (points)
    if (styleObj.shape && !['circle', 'square'].includes(styleObj.shape as string)) {
        errors.push({
            field: 'style.shape',
            message: `shape doit être 'circle' ou 'square'`,
            context: { received: styleObj.shape, allowed: ['circle', 'square'], ...context }
        });
    }

    // Validation stroke (lignes)
    if (styleObj.stroke) {
        validateStroke(styleObj.stroke, errors, warnings, context);
    }

    // Validation casing (lignes)
    if (styleObj.casing) {
        validateCasing(styleObj.casing, errors, warnings, context);
    }

    // Validation fillPattern (polygones)
    if (styleObj.fillPattern) {
        validateFillPattern(styleObj.fillPattern, errors, warnings, context);
    }
}

/**
 * Valide le stroke (lignes)
 */
function validateStroke(
    stroke: unknown,
    errors: ValidationErrorItem[],
    _warnings: ValidationWarningItem[],
    context: Record<string, unknown>
): void {
    if (typeof stroke !== 'object' || stroke === null) {
        errors.push({
            field: 'style.stroke',
            message: `stroke doit être un objet`,
            context: { received: typeof stroke, ...context }
        });
        return;
    }

    const s = stroke as Record<string, unknown>;
    if (s.color && !isValidHexColor(s.color as string)) {
        errors.push({
            field: 'style.stroke.color',
            message: `Couleur invalide, format attendu: #RRGGBB`,
            context: { received: s.color, ...context }
        });
    }

    if ('opacity' in s && (typeof s.opacity !== 'number' || (s.opacity as number) < 0 || (s.opacity as number) > 1)) {
        errors.push({
            field: 'style.stroke.opacity',
            message: `opacity doit être un nombre entre 0 et 1`,
            context: { received: s.opacity, ...context }
        });
    }

    if ('weight' in s && (typeof s.weight !== 'number' || (s.weight as number) < 0)) {
        errors.push({
            field: 'style.stroke.weight',
            message: `weight doit être un nombre >= 0`,
            context: { received: s.weight, ...context }
        });
    }

    if (s.dashArray !== null && s.dashArray !== undefined && typeof s.dashArray !== 'string') {
        errors.push({
            field: 'style.stroke.dashArray',
            message: `dashArray doit être une chaîne de caractères ou null`,
            context: { received: typeof s.dashArray, value: s.dashArray, ...context }
        });
    }
}

/**
 * Valide le casing (lignes)
 */
function validateCasing(
    casing: unknown,
    errors: ValidationErrorItem[],
    _warnings: ValidationWarningItem[],
    context: Record<string, unknown>
): void {
    if (typeof casing !== 'object' || casing === null) {
        errors.push({
            field: 'style.casing',
            message: `casing doit être un objet`,
            context: { received: typeof casing, ...context }
        });
        return;
    }

    const c = casing as Record<string, unknown>;
    if ('enabled' in c && typeof c.enabled !== 'boolean') {
        errors.push({
            field: 'style.casing.enabled',
            message: `enabled doit être un booléen`,
            context: { received: typeof c.enabled, ...context }
        });
    }

    if (c.color && !isValidHexColor(c.color as string)) {
        errors.push({
            field: 'style.casing.color',
            message: `Couleur invalide, format attendu: #RRGGBB`,
            context: { received: c.color, ...context }
        });
    }
}

/**
 * Valide le fillPattern (polygones)
 */
function validateFillPattern(
    pattern: unknown,
    errors: ValidationErrorItem[],
    _warnings: ValidationWarningItem[],
    context: Record<string, unknown>
): void {
    if (typeof pattern !== 'object' || pattern === null) {
        errors.push({
            field: 'style.fillPattern',
            message: `fillPattern doit être un objet`,
            context: { received: typeof pattern, ...context }
        });
        return;
    }

    const p = pattern as Record<string, unknown>;
    if ('enabled' in p && typeof p.enabled !== 'boolean') {
        errors.push({
            field: 'style.fillPattern.enabled',
            message: `enabled doit être un booléen`,
            context: { received: typeof p.enabled, ...context }
        });
    }

    if (p.type && !['diagonal', 'horizontal', 'vertical', 'cross', 'x'].includes(p.type as string)) {
        errors.push({
            field: 'style.fillPattern.type',
            message: `type doit être parmi: diagonal, horizontal, vertical, cross, x`,
            context: { received: p.type, allowed: ['diagonal', 'horizontal', 'vertical', 'cross', 'x'], ...context }
        });
    }

    if (p.color && !isValidHexColor(p.color as string)) {
        errors.push({
            field: 'style.fillPattern.color',
            message: `Couleur invalide, format attendu: #RRGGBB`,
            context: { received: p.color, ...context }
        });
    }

    (['weight', 'density'] as const).forEach(field => {
        if (field in p && (typeof p[field] !== 'number' || (p[field] as number) < 0)) {
            errors.push({
                field: `style.fillPattern.${field}`,
                message: `${field} doit être un nombre >= 0`,
                context: { received: p[field], ...context }
            });
        }
    });
}

/**
 * Vérifie si une couleur est au format hex valide (#RRGGBB)
 */
function isValidHexColor(color: unknown): boolean {
    return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Formate un résultat de validation en message d'erreur lisible
 */
export function formatValidationErrors(
    validationResult: StyleValidationResult,
    styleFilePath: string = ''
): string | null {
    if (validationResult.valid) {
        return null;
    }

    const lines = [];
    lines.push('═══════════════════════════════════════════════════════');
    lines.push('❌ ERREUR DE VALIDATION DE STYLE GEOLEAF');
    lines.push('═══════════════════════════════════════════════════════');

    if (styleFilePath) {
        lines.push(`Fichier: ${styleFilePath}`);
        lines.push('');
    }

    if (validationResult.errors.length > 0) {
        lines.push(`❌ ${validationResult.errors.length} erreur(s) détectée(s):`);
        lines.push('');

        validationResult.errors.forEach((err, index) => {
            lines.push(`  ${index + 1}. Champ: ${err.field}`);
            lines.push(`     Message: ${err.message}`);
            if (err.context) {
                lines.push(`     Contexte: ${JSON.stringify(err.context, null, 2).split('\n').join('\n     ')}`);
            }
            const errWithStack = err as ValidationErrorItem & { stack?: string };
            if (errWithStack.stack) {
                lines.push(`     Stack: ${errWithStack.stack.split('\n').slice(0, 3).join('\n     ')}`);
            }
            lines.push('');
        });
    }

    if (validationResult.warnings.length > 0) {
        lines.push(`⚠️  ${validationResult.warnings.length} avertissement(s):`);
        lines.push('');

        validationResult.warnings.forEach((warning, index) => {
            lines.push(`  ${index + 1}. Champ: ${warning.field}`);
            lines.push(`     Message: ${warning.message}`);
            if (warning.context) {
                lines.push(`     Contexte: ${JSON.stringify(warning.context, null, 2).split('\n').join('\n     ')}`);
            }
            lines.push('');
        });
    }

    lines.push('═══════════════════════════════════════════════════════');
    lines.push('💡 Conseil: Vérifiez la documentation dans docs/STYLE_FORMAT_SPEC.md');
    lines.push('═══════════════════════════════════════════════════════');

    return lines.join('\n');
}

/**
 * Module Style Validator
 * Expose les fonctions publiques
 */
export const StyleValidator = {
    validateStyle,
    formatValidationErrors,
    StyleValidationError
};


