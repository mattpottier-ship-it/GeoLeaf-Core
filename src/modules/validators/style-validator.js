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
    validateWhenCondition as _validateWhenCondition,
    validateSimpleCondition as _validateSimpleCondition,
    validateScales as _validateScales,
    validateLegend as _validateLegend
} from './style-validator-rules.js';

/**
 * Classe d'erreur pour les validations de style
 */
export class StyleValidationError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'StyleValidationError';
        this.context = context;
    }
}

/**
 * Valide un objet de style contre le schéma JSON
 * @param {Object} styleData - Données du style à valider
 * @param {Object} context - Contexte additionnel (profileId, layerId, styleId)
 * @returns {Object} Résultat de validation { valid: boolean, errors: Array, warnings: Array }
 */
export function validateStyle(styleData, context = {}) {
    const errors = [];
    const warnings = [];

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
            message: `Erreur inattendue lors de la validation: ${error.message}`,
            stack: error.stack,
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
function validateRequiredFields(styleData, errors, context) {
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
function validateId(styleData, errors, context) {
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
function validateLabel(styleData, errors, warnings, context) {
    if (!('label' in styleData)) return;

    const label = styleData.label;

    // String: nom d'affichage
    if (typeof label === 'string') {
        return;
    }

    // Objet: configuration de labels intégrés
    if (typeof label === 'object' && label !== null) {
        // enabled est requis
        if (!('enabled' in label)) {
            errors.push({
                field: 'label.enabled',
                message: `Le champ 'enabled' est requis dans la configuration de labels`,
                context: { labelConfig: label, ...context }
            });
        } else if (typeof label.enabled !== 'boolean') {
            errors.push({
                field: 'label.enabled',
                message: `Le champ 'enabled' doit être un booléen`,
                context: { received: typeof label.enabled, value: label.enabled, ...context }
            });
        }

        // Si enabled, field devrait être présent
        if (label.enabled && !label.field) {
            warnings.push({
                field: 'label.field',
                message: `Les labels sont activés mais aucun champ n'est spécifié`,
                context: { labelConfig: label, ...context }
            });
        }

        // Validation font
        if (label.font) {
            validateFont(label.font, errors, warnings, context);
        }

        // Validation des couleurs
        if (label.color && !isValidHexColor(label.color)) {
            errors.push({
                field: 'label.color',
                message: `Couleur invalide, format attendu: #RRGGBB`,
                context: { received: label.color, ...context }
            });
        }

        // Validation opacity
        if ('opacity' in label && (typeof label.opacity !== 'number' || label.opacity < 0 || label.opacity > 1)) {
            errors.push({
                field: 'label.opacity',
                message: `L'opacité doit être un nombre entre 0 et 1`,
                context: { received: label.opacity, ...context }
            });
        }

        // Validation buffer
        if (label.buffer) {
            validateLabelComponent(label.buffer, 'label.buffer', errors, warnings, context);
        }

        // Validation background
        if (label.background) {
            validateLabelComponent(label.background, 'label.background', errors, warnings, context);
        }

        // Validation offset
        if (label.offset && typeof label.offset.distancePx !== 'undefined') {
            if (typeof label.offset.distancePx !== 'number') {
                errors.push({
                    field: 'label.offset.distancePx',
                    message: `distancePx doit être un nombre`,
                    context: { received: typeof label.offset.distancePx, ...context }
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
function validateFont(font, errors, warnings, context) {
    if (typeof font !== 'object' || font === null) {
        errors.push({
            field: 'label.font',
            message: `La configuration font doit être un objet`,
            context: { received: typeof font, ...context }
        });
        return;
    }

    if (font.sizePt !== undefined) {
        if (typeof font.sizePt !== 'number' || font.sizePt < 1) {
            errors.push({
                field: 'label.font.sizePt',
                message: `sizePt doit être un nombre >= 1`,
                context: { received: font.sizePt, ...context }
            });
        }
    }

    if (font.weight !== undefined) {
        if (!Number.isInteger(font.weight) || font.weight < 0 || font.weight > 100) {
            errors.push({
                field: 'label.font.weight',
                message: `weight doit être un entier entre 0 et 100`,
                context: { received: font.weight, ...context }
            });
        }
    }
}

/**
 * Valide un composant de label (buffer, background)
 */
function validateLabelComponent(component, fieldPath, errors, warnings, context) {
    if (typeof component !== 'object' || component === null) {
        errors.push({
            field: fieldPath,
            message: `${fieldPath} doit être un objet`,
            context: { received: typeof component, ...context }
        });
        return;
    }

    if (component.color && !isValidHexColor(component.color)) {
        errors.push({
            field: `${fieldPath}.color`,
            message: `Couleur invalide, format attendu: #RRGGBB`,
            context: { received: component.color, ...context }
        });
    }

    if ('opacity' in component && (typeof component.opacity !== 'number' || component.opacity < 0 || component.opacity > 1)) {
        errors.push({
            field: `${fieldPath}.opacity`,
            message: `L'opacité doit être un nombre entre 0 et 1`,
            context: { received: component.opacity, ...context }
        });
    }

    if ('sizePx' in component && (typeof component.sizePx !== 'number' || component.sizePx < 0)) {
        errors.push({
            field: `${fieldPath}.sizePx`,
            message: `sizePx doit être un nombre >= 0`,
            context: { received: component.sizePx, ...context }
        });
    }
}

/**
 * Valide le style de base
 */
function validateBaseStyle(styleData, errors, warnings, context) {
    const style = styleData.style || styleData.defaultStyle;

    if (!style) return;

    if (typeof style !== 'object' || style === null) {
        errors.push({
            field: 'style',
            message: `Le style doit être un objet`,
            context: { received: typeof style, ...context }
        });
        return;
    }

    // Validation des couleurs
    ['fillColor', 'color'].forEach(colorField => {
        if (style[colorField] && !isValidHexColor(style[colorField])) {
            errors.push({
                field: `style.${colorField}`,
                message: `Couleur invalide, format attendu: #RRGGBB`,
                context: { received: style[colorField], ...context }
            });
        }
    });

    // Validation des opacités
    ['fillOpacity', 'opacity'].forEach(opacityField => {
        if (opacityField in style) {
            if (typeof style[opacityField] !== 'number' || style[opacityField] < 0 || style[opacityField] > 1) {
                errors.push({
                    field: `style.${opacityField}`,
                    message: `${opacityField} doit être un nombre entre 0 et 1`,
                    context: { received: style[opacityField], ...context }
                });
            }
        }
    });

    // Validation des tailles
    ['weight', 'sizePx', 'radius'].forEach(sizeField => {
        if (sizeField in style) {
            if (typeof style[sizeField] !== 'number' || style[sizeField] < 0) {
                errors.push({
                    field: `style.${sizeField}`,
                    message: `${sizeField} doit être un nombre >= 0`,
                    context: { received: style[sizeField], ...context }
                });
            }
        }
    });

    // Validation shape (points)
    if (style.shape && !['circle', 'square'].includes(style.shape)) {
        errors.push({
            field: 'style.shape',
            message: `shape doit être 'circle' ou 'square'`,
            context: { received: style.shape, allowed: ['circle', 'square'], ...context }
        });
    }

    // Validation stroke (lignes)
    if (style.stroke) {
        validateStroke(style.stroke, errors, warnings, context);
    }

    // Validation casing (lignes)
    if (style.casing) {
        validateCasing(style.casing, errors, warnings, context);
    }

    // Validation fillPattern (polygones)
    if (style.fillPattern) {
        validateFillPattern(style.fillPattern, errors, warnings, context);
    }
}

/**
 * Valide le stroke (lignes)
 */
function validateStroke(stroke, errors, warnings, context) {
    if (typeof stroke !== 'object' || stroke === null) {
        errors.push({
            field: 'style.stroke',
            message: `stroke doit être un objet`,
            context: { received: typeof stroke, ...context }
        });
        return;
    }

    if (stroke.color && !isValidHexColor(stroke.color)) {
        errors.push({
            field: 'style.stroke.color',
            message: `Couleur invalide, format attendu: #RRGGBB`,
            context: { received: stroke.color, ...context }
        });
    }

    if ('opacity' in stroke && (typeof stroke.opacity !== 'number' || stroke.opacity < 0 || stroke.opacity > 1)) {
        errors.push({
            field: 'style.stroke.opacity',
            message: `opacity doit être un nombre entre 0 et 1`,
            context: { received: stroke.opacity, ...context }
        });
    }

    if ('weight' in stroke && (typeof stroke.weight !== 'number' || stroke.weight < 0)) {
        errors.push({
            field: 'style.stroke.weight',
            message: `weight doit être un nombre >= 0`,
            context: { received: stroke.weight, ...context }
        });
    }

    if (stroke.dashArray !== null && stroke.dashArray !== undefined && typeof stroke.dashArray !== 'string') {
        errors.push({
            field: 'style.stroke.dashArray',
            message: `dashArray doit être une chaîne de caractères ou null`,
            context: { received: typeof stroke.dashArray, value: stroke.dashArray, ...context }
        });
    }
}

/**
 * Valide le casing (lignes)
 */
function validateCasing(casing, errors, warnings, context) {
    if (typeof casing !== 'object' || casing === null) {
        errors.push({
            field: 'style.casing',
            message: `casing doit être un objet`,
            context: { received: typeof casing, ...context }
        });
        return;
    }

    if ('enabled' in casing && typeof casing.enabled !== 'boolean') {
        errors.push({
            field: 'style.casing.enabled',
            message: `enabled doit être un booléen`,
            context: { received: typeof casing.enabled, ...context }
        });
    }

    if (casing.color && !isValidHexColor(casing.color)) {
        errors.push({
            field: 'style.casing.color',
            message: `Couleur invalide, format attendu: #RRGGBB`,
            context: { received: casing.color, ...context }
        });
    }
}

/**
 * Valide le fillPattern (polygones)
 */
function validateFillPattern(pattern, errors, warnings, context) {
    if (typeof pattern !== 'object' || pattern === null) {
        errors.push({
            field: 'style.fillPattern',
            message: `fillPattern doit être un objet`,
            context: { received: typeof pattern, ...context }
        });
        return;
    }

    if ('enabled' in pattern && typeof pattern.enabled !== 'boolean') {
        errors.push({
            field: 'style.fillPattern.enabled',
            message: `enabled doit être un booléen`,
            context: { received: typeof pattern.enabled, ...context }
        });
    }

    if (pattern.type && !['diagonal', 'horizontal', 'vertical', 'cross', 'x'].includes(pattern.type)) {
        errors.push({
            field: 'style.fillPattern.type',
            message: `type doit être parmi: diagonal, horizontal, vertical, cross, x`,
            context: { received: pattern.type, allowed: ['diagonal', 'horizontal', 'vertical', 'cross', 'x'], ...context }
        });
    }

    if (pattern.color && !isValidHexColor(pattern.color)) {
        errors.push({
            field: 'style.fillPattern.color',
            message: `Couleur invalide, format attendu: #RRGGBB`,
            context: { received: pattern.color, ...context }
        });
    }

    ['weight', 'density'].forEach(field => {
        if (field in pattern && (typeof pattern[field] !== 'number' || pattern[field] < 0)) {
            errors.push({
                field: `style.fillPattern.${field}`,
                message: `${field} doit être un nombre >= 0`,
                context: { received: pattern[field], ...context }
            });
        }
    });
}

/**
 * Vérifie si une couleur est au format hex valide (#RRGGBB)
 */
function isValidHexColor(color) {
    return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Formate un résultat de validation en message d'erreur lisible
 * @param {Object} validationResult - Résultat de validateStyle()
 * @param {string} styleFilePath - Chemin du fichier de style (optionnel)
 * @returns {string} Message formaté
 */
export function formatValidationErrors(validationResult, styleFilePath = '') {
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

        validationResult.errors.forEach((error, index) => {
            lines.push(`  ${index + 1}. Champ: ${error.field}`);
            lines.push(`     Message: ${error.message}`);
            if (error.context) {
                lines.push(`     Contexte: ${JSON.stringify(error.context, null, 2).split('\n').join('\n     ')}`);
            }
            if (error.stack) {
                lines.push(`     Stack: ${error.stack.split('\n').slice(0, 3).join('\n     ')}`);
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


