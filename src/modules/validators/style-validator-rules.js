/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @fileoverview Validations des règles de style (styleRules, conditions, scales)
 * Extrait de style-validator.js pour réduire la complexité
 * @module validators/style-validator-rules
 */

/**
 * Valide les styleRules (règles conditionnelles de style)
 * Vérifie la structure when/style de chaque règle et valide les conditions
 *
 * @param {Array<Object>} rules - Tableau de règles styleRules
 * @param {Object} rules[].when - Condition d'application (simple ou composée avec "all")
 * @param {Object} rules[].style - Style à appliquer si condition vraie
 * @param {Object} [rules[].legend] - Info légende optionnelle pour cette règle
 * @param {Array<Object>} errors - Tableau d'erreurs à remplir (modifié in-place)
 * @param {Array<Object>} warnings - Tableau d'avertissements à remplir (modifié in-place)
 * @param {Object} context - Contexte additionnel (profileId, layerId, etc.)
 * @returns {void} Modifie errors/warnings directement
 * @example
 * const rules = [
 *   { when: { field: 'population', operator: '>', value: 100000 }, style: { color: '#ff0000' } },
 *   { when: { all: [{ field: 'type', operator: '==', value: 'city' }] }, style: { weight: 3 } }
 * ];
 * const errors = [], warnings = [];
 * validateStyleRules(rules, errors, warnings, { layerId: 'cities' });
 */
export function validateStyleRules(rules, errors, warnings, context) {
    if (!Array.isArray(rules)) {
        errors.push({
            field: 'styleRules',
            message: `styleRules doit être un tableau`,
            context: { received: typeof rules, ...context }
        });
        return;
    }

    rules.forEach((rule, index) => {
        const ruleContext = { ...context, ruleIndex: index };

        if (typeof rule !== 'object' || rule === null) {
            errors.push({
                field: `styleRules[${index}]`,
                message: `La règle doit être un objet`,
                context: ruleContext
            });
            return;
        }

        // Validation when
        if (!rule.when) {
            errors.push({
                field: `styleRules[${index}].when`,
                message: `Le champ 'when' est requis`,
                context: ruleContext
            });
        } else {
            validateWhenCondition(rule.when, index, errors, warnings, ruleContext);
        }

        // Validation style
        if (!rule.style) {
            errors.push({
                field: `styleRules[${index}].style`,
                message: `Le champ 'style' est requis`,
                context: ruleContext
            });
        } else if (typeof rule.style !== 'object' || rule.style === null) {
            errors.push({
                field: `styleRules[${index}].style`,
                message: `Le style doit être un objet`,
                context: { received: typeof rule.style, ...ruleContext }
            });
        }

        // Validation legend (optionnel)
        if (rule.legend && typeof rule.legend !== 'object') {
            errors.push({
                field: `styleRules[${index}].legend`,
                message: `legend doit être un objet`,
                context: { received: typeof rule.legend, ...ruleContext }
            });
        }
    });
}

/**
 * Valide la condition when d'une règle
 * Supporte conditions simples et composées avec opérateur "all" (ET logique)
 *
 * @param {Object} when - Objet de condition when
 * @param {string} [when.field] - Champ à tester (mode simple)
 * @param {string} [when.operator] - Opérateur de comparaison (mode simple)
 * @param {*} [when.value] - Valeur de référence (mode simple)
 * @param {Array<Object>} [when.all] - Tableau de conditions (mode composé, ET logique)
 * @param {number} ruleIndex - Index de la règle dans styleRules (pour messages d'erreur)
 * @param {Array<Object>} errors - Tableau d'erreurs
 * @param {Array<Object>} warnings - Tableau d'avertissements
 * @param {Object} context - Contexte
 * @returns {void}
 * @example
 * // Condition simple
 * const when1 = { field: 'population', operator: '>', value: 50000 };
 * // Condition composée (AND)
 * const when2 = { all: [
 *   { field: 'type', operator: '==', value: 'restaurant' },
 *   { field: 'rating', operator: '>=', value: 4 }
 * ]};
 */
export function validateWhenCondition(when, ruleIndex, errors, warnings, context) {
    if (typeof when !== 'object' || when === null) {
        errors.push({
            field: `styleRules[${ruleIndex}].when`,
            message: `when doit être un objet`,
            context: { received: typeof when, ...context }
        });
        return;
    }

    // Support pour conditions composées avec "all"
    if (when.all && Array.isArray(when.all)) {
        // Valider chaque condition dans le tableau "all"
        when.all.forEach((condition, condIndex) => {
            validateSimpleCondition(condition, ruleIndex, condIndex, errors, context);
        });
        return;
    }

    // Support pour conditions simples
    validateSimpleCondition(when, ruleIndex, null, errors, context);
}

/**
 * Valide une condition simple (field/operator/value)
 * Vérifie la présence des champs requis et la validité de l'opérateur
 *
 * @param {Object} condition - Condition à valider
 * @param {string} condition.field - Nom du champ de feature à tester (ex: 'properties.population')
 * @param {string} condition.operator - Opérateur: '==', '!=', '<', '>', '<=', '>=', 'in', 'contains'
 * @param {*} condition.value - Valeur de référence (string, number, array selon opérateur)
 * @param {number} ruleIndex - Index de la règle dans styleRules
 * @param {number|null} condIndex - Index de la condition dans "all" (null si condition simple)
 * @param {Array<Object>} errors - Tableau d'erreurs
 * @param {Object} context - Contexte
 * @returns {void}
 * @example
 * const condition = { field: 'properties.type', operator: 'in', value: ['hotel', 'restaurant'] };
 * validateSimpleCondition(condition, 0, null, errors, {});
 */
export function validateSimpleCondition(condition, ruleIndex, condIndex = null, errors, context) {
    // Champs requis
    const required = ['field', 'operator', 'value'];
    for (const field of required) {
        if (!(field in condition)) {
            const prefix = condIndex !== null ? `styleRules[${ruleIndex}].when.all[${condIndex}]` : `styleRules[${ruleIndex}].when`;
            errors.push({
                field: `${prefix}.${field}`,
                message: `Le champ '${field}' est requis dans la condition`,
                context
            });
        }
    }

    // Validation operator
    const validOperators = ['==', '!=', '<', '>', '<=', '>=', 'in', 'contains'];
    if (condition.operator && !validOperators.includes(condition.operator)) {
        const prefix = condIndex !== null ? `styleRules[${ruleIndex}].when.all[${condIndex}]` : `styleRules[${ruleIndex}].when`;
        errors.push({
            field: `${prefix}.operator`,
            message: `Opérateur invalide`,
            context: { received: condition.operator, allowed: validOperators, ...context }
        });
    }

    // Validation field
    if (condition.field && typeof condition.field !== 'string') {
        const prefix = condIndex !== null ? `styleRules[${ruleIndex}].when.all[${condIndex}]` : `styleRules[${ruleIndex}].when`;
        errors.push({
            field: `${prefix}.field`,
            message: `field doit être une chaîne de caractères`,
            context: { received: typeof condition.field, ...context }
        });
    }
}

/**
 * Valide les échelles (layerScale, labelScale)
 * Vérifie la structure des objets d'échelle et la validité des valeurs min/max
 *
 * @param {Object} styleData - Données du style
 * @param {Object} [styleData.layerScale] - Échelle de visibilité de la couche
 * @param {number|null} [styleData.layerScale.minScale] - Zoom minimum (ou null = pas de limite)
 * @param {number|null} [styleData.layerScale.maxScale] - Zoom maximum (ou null = pas de limite)
 * @param {Object} [styleData.labelScale] - Échelle de visibilité des labels
 * @param {Array<Object>} errors - Tableau d'erreurs
 * @param {Array<Object>} warnings - Tableau d'avertissements
 * @param {Object} context - Contexte
 * @returns {void}
 * @example
 * const styleData = {
 *   layerScale: { minScale: 10, maxScale: 18 },  // Visible du zoom 10 à 18
 *   labelScale: { minScale: 14, maxScale: null }  // Labels visibles à partir du zoom 14
 * };
 */
export function validateScales(styleData, errors, warnings, context) {
    ['layerScale', 'labelScale'].forEach(scaleField => {
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

        const scale = styleData[scaleField];
        if (typeof scale !== 'object' || scale === null) {
            errors.push({
                field: scaleField,
                message: `${scaleField} doit être un objet`,
                context: { received: typeof scale, ...context }
            });
            return;
        }

        ['minScale', 'maxScale'].forEach(prop => {
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
                if (typeof scale[prop] !== 'number' || scale[prop] < 0) {
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

/**
 * Valide la configuration legend
 * Vérifie la structure et les types des propriétés de légende
 *
 * @param {Object} legend - Configuration legend
 * @param {number} [legend.order] - Ordre d'affichage dans la légende (doit être entier)
 * @param {string} [legend.label] - Label à afficher dans la légende
 * @param {string} [legend.description] - Description complémentaire
 * @param {Array<Object>} errors - Tableau d'erreurs
 * @param {Array<Object>} warnings - Tableau d'avertissements
 * @param {Object} context - Contexte
 * @returns {void}
 * @example
 * const legend = { order: 1, label: 'Grandes villes', description: 'Population > 100k' };
 */
export function validateLegend(legend, errors, warnings, context) {
    if (typeof legend !== 'object' || legend === null) {
        errors.push({
            field: 'legend',
            message: `legend doit être un objet`,
            context: { received: typeof legend, ...context }
        });
        return;
    }

    if ('order' in legend && !Number.isInteger(legend.order)) {
        errors.push({
            field: 'legend.order',
            message: `order doit être un entier`,
            context: { received: legend.order, type: typeof legend.order, ...context }
        });
    }
}

/**
 * Facade objet pour rétrocompatibilité
 * @type {Object}
 */
export const StyleValidatorRules = {
    validateStyleRules,
    validateWhenCondition,
    validateSimpleCondition,
    validateScales,
    validateLegend
};


