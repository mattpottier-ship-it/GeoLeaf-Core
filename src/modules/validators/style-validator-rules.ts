/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @fileoverview Validations des règles de style (styleRules, conditions, scales)
 * @module validators/style-validator-rules
 */

export interface ValidationErrorItem {
    field: string;
    message: string;
    context?: Record<string, unknown>;
}

export interface ValidationWarningItem {
    field: string;
    message: string;
    context?: Record<string, unknown>;
}

export interface StyleRuleWhen {
    field?: string;
    operator?: string;
    value?: unknown;
    all?: Array<{ field?: string; operator?: string; value?: unknown }>;
}

export interface StyleRule {
    when?: StyleRuleWhen;
    style?: Record<string, unknown>;
    legend?: Record<string, unknown>;
}

export function validateStyleRules(
    rules: unknown,
    errors: ValidationErrorItem[],
    warnings: ValidationWarningItem[],
    context: Record<string, unknown>
): void {
    if (!Array.isArray(rules)) {
        errors.push({
            field: 'styleRules',
            message: `styleRules doit être un tableau`,
            context: { received: typeof rules, ...context }
        });
        return;
    }

    rules.forEach((rule: unknown, index: number) => {
        const ruleContext = { ...context, ruleIndex: index };

        if (typeof rule !== 'object' || rule === null) {
            errors.push({
                field: `styleRules[${index}]`,
                message: `La règle doit être un objet`,
                context: ruleContext
            });
            return;
        }

        const r = rule as StyleRule;

        if (!r.when) {
            errors.push({
                field: `styleRules[${index}].when`,
                message: `Le champ 'when' est requis`,
                context: ruleContext
            });
        } else {
            validateWhenCondition(r.when, index, errors, warnings, ruleContext);
        }

        if (!r.style) {
            errors.push({
                field: `styleRules[${index}].style`,
                message: `Le champ 'style' est requis`,
                context: ruleContext
            });
        } else if (typeof r.style !== 'object' || r.style === null) {
            errors.push({
                field: `styleRules[${index}].style`,
                message: `Le style doit être un objet`,
                context: { received: typeof r.style, ...ruleContext }
            });
        }

        if (r.legend && typeof r.legend !== 'object') {
            errors.push({
                field: `styleRules[${index}].legend`,
                message: `legend doit être un objet`,
                context: { received: typeof r.legend, ...ruleContext }
            });
        }
    });
}

export function validateWhenCondition(
    when: unknown,
    ruleIndex: number,
    errors: ValidationErrorItem[],
    _warnings: ValidationWarningItem[],
    context: Record<string, unknown>
): void {
    if (typeof when !== 'object' || when === null) {
        errors.push({
            field: `styleRules[${ruleIndex}].when`,
            message: `when doit être un objet`,
            context: { received: typeof when, ...context }
        });
        return;
    }

    const w = when as StyleRuleWhen;

    if (w.all && Array.isArray(w.all)) {
        w.all.forEach((condition: unknown, condIndex: number) => {
            validateSimpleCondition(condition, ruleIndex, condIndex, errors, context);
        });
        return;
    }

    validateSimpleCondition(w, ruleIndex, null, errors, context);
}

export function validateSimpleCondition(
    condition: unknown,
    ruleIndex: number,
    condIndex: number | null,
    errors: ValidationErrorItem[],
    context: Record<string, unknown>
): void {
    const c = condition as Record<string, unknown>;
    const required = ['field', 'operator', 'value'];
    for (const field of required) {
        if (!(field in c)) {
            const prefix = condIndex !== null ? `styleRules[${ruleIndex}].when.all[${condIndex}]` : `styleRules[${ruleIndex}].when`;
            errors.push({
                field: `${prefix}.${field}`,
                message: `Le champ '${field}' est requis dans la condition`,
                context
            });
        }
    }

    const validOperators = ['==', '!=', '<', '>', '<=', '>=', 'in', 'contains'];
    if (c.operator && !validOperators.includes(c.operator as string)) {
        const prefix = condIndex !== null ? `styleRules[${ruleIndex}].when.all[${condIndex}]` : `styleRules[${ruleIndex}].when`;
        errors.push({
            field: `${prefix}.operator`,
            message: `Opérateur invalide`,
            context: { received: c.operator, allowed: validOperators, ...context }
        });
    }

    if (c.field && typeof c.field !== 'string') {
        const prefix = condIndex !== null ? `styleRules[${ruleIndex}].when.all[${condIndex}]` : `styleRules[${ruleIndex}].when`;
        errors.push({
            field: `${prefix}.field`,
            message: `field doit être une chaîne de caractères`,
            context: { received: typeof c.field, ...context }
        });
    }
}

export function validateScales(
    styleData: Record<string, unknown>,
    errors: ValidationErrorItem[],
    _warnings: ValidationWarningItem[],
    context: Record<string, unknown>
): void {
    (['layerScale', 'labelScale'] as const).forEach(scaleField => {
        const isRequired = scaleField === 'layerScale';

        if (!styleData[scaleField]) {
            if (isRequired) {
                errors.push({
                    field: scaleField,
                    message: `${scaleField} est requis`,
                    context
                });
            }
            return;
        }

        const scale = styleData[scaleField] as Record<string, unknown> | null;
        if (typeof scale !== 'object' || scale === null) {
            errors.push({
                field: scaleField,
                message: `${scaleField} doit être un objet`,
                context: { received: typeof scale, ...context }
            });
            return;
        }

        (['minScale', 'maxScale'] as const).forEach(prop => {
            if (!(prop in scale)) {
                if (isRequired) {
                    errors.push({
                        field: `${scaleField}.${prop}`,
                        message: `${prop} est requis dans ${scaleField}`,
                        context
                    });
                }
                return;
            }

            if (scale[prop] !== null) {
                if (typeof scale[prop] !== 'number' || (scale[prop] as number) < 0) {
                    errors.push({
                        field: `${scaleField}.${prop}`,
                        message: `${prop} doit être un nombre >= 0 ou null`,
                        context: { received: scale[prop], ...context }
                    });
                }
            }
        });
    });
}

export function validateLegend(
    legend: unknown,
    errors: ValidationErrorItem[],
    _warnings: ValidationWarningItem[],
    context: Record<string, unknown>
): void {
    if (typeof legend !== 'object' || legend === null) {
        errors.push({
            field: 'legend',
            message: `legend doit être un objet`,
            context: { received: typeof legend, ...context }
        });
        return;
    }

    const leg = legend as Record<string, unknown>;
    if ('order' in leg && !Number.isInteger(leg.order)) {
        errors.push({
            field: 'legend.order',
            message: `order doit être un entier`,
            context: { received: leg.order, type: typeof leg.order, ...context }
        });
    }
}

export const StyleValidatorRules = {
    validateStyleRules,
    validateWhenCondition,
    validateSimpleCondition,
    validateScales,
    validateLegend
};
