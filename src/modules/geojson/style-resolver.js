/**
 * GeoLeaf GeoJSON Module - Style Resolver
 * Évaluation des règles de style dynamiques (styleRules)
 *
 * @module geojson/style-resolver
 */
"use strict";

import { GeoJSONShared } from './shared.js';
import { getLog } from '../utils/general-utils.js';

const _g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});


const GeoJSONStyleResolver = {};

/**
 * Résout une valeur imbriquée dans un objet via un chemin (ex: "properties.name").
 * @param {Object} obj - Objet source
 * @param {string} path - Chemin (dot notation)
 * @returns {*} Valeur trouvée ou null
 */
GeoJSONStyleResolver.getNestedValue = function (obj, path) {
    if (!obj || !path) return null;
    return path.split('.').reduce((current, prop) =>
        current && current[prop] !== undefined ? current[prop] : null, obj);
};


/**
 * Évalue une condition simple contre une feature GeoJSON.
 * @param {Object} feature - Feature GeoJSON
 * @param {Object} condition - {field, operator, value}
 * @param {Object} STYLE_OPERATORS - Opérateurs de comparaison
 * @param {Object} Log - Logger
 * @returns {boolean} true si la condition est remplie
 */
GeoJSONStyleResolver.evaluateCondition = function (feature, condition, STYLE_OPERATORS, Log) {
    const { field, operator, value } = condition;
    if (!field || !operator) return false;

    // Résoudre la valeur du champ depuis la feature
    const fieldValue = GeoJSONStyleResolver.getNestedValue(feature, field);

    // Si le champ n'existe pas, la condition n'est pas remplie
    if (fieldValue === null || fieldValue === undefined) return false;

    // Obtenir la fonction de comparaison
    const compareFn = STYLE_OPERATORS[operator];
    if (!compareFn) {
        Log.warn && Log.warn('[GeoJSON] Opérateur styleRules inconnu:', operator);
        return false;
    }

    // Évaluer la condition
    try {
        return compareFn(fieldValue, value);
    } catch (e) {
        Log.warn && Log.warn('[GeoJSON] Erreur évaluation condition:', e.message);
        return false;
    }
};

/**
 * Évalue les règles de style (styleRules) contre une feature GeoJSON.
 * Retourne le style de la PREMIÈRE règle correspondante (ordre du tableau).
 * Supporte les formats:
 * - Simple: {when: {field, operator, value}, style: {...}}
 * - Composé: {when: {all: [{field, operator, value}, ...]}, style: {...}}
 *
 * @param {Object} feature - Feature GeoJSON
 * @param {Array} styleRules - Tableau de règles
 * @returns {Object|null} Style de la première règle correspondante, ou null
 */
GeoJSONStyleResolver.evaluateStyleRules = function (feature, styleRules) {
    if (!Array.isArray(styleRules) || styleRules.length === 0) {
        return null;
    }

    const shared = GeoJSONShared;
    const Log = getLog();
    const STYLE_OPERATORS = shared.STYLE_OPERATORS;

    for (const rule of styleRules) {
        if (!rule || !rule.when || !rule.style) continue;

        // Support du format composé avec "all": [conditions]
        if (rule.when.all && Array.isArray(rule.when.all)) {
            // Vérifier que TOUTES les conditions sont remplies
            const allConditionsMet = rule.when.all.every(condition =>
                GeoJSONStyleResolver.evaluateCondition(feature, condition, STYLE_OPERATORS, Log)
            );

            if (allConditionsMet) {
                return rule.style;
            }
        }
        // Format simple avec field, operator, value
        else if (rule.when.field && rule.when.operator) {
            const conditionMet = GeoJSONStyleResolver.evaluateCondition(
                feature,
                rule.when,
                STYLE_OPERATORS,
                Log
            );

            if (conditionMet) {
                return rule.style;
            }
        }
    }

    return null;
};

/**
 * Construit les options Leaflet pour L.geoJSON à partir des options GeoLeaf.
 *
 * @param {Object} options - Options GeoLeaf
 * @returns {Object} - Options Leaflet
 */
GeoJSONStyleResolver.buildLeafletOptions = function (options) {
    const evaluateStyleRules = GeoJSONStyleResolver.evaluateStyleRules;

    const normalizeStyle = (style) => {
        if (!style || typeof style !== 'object') {
            return {};
        }

        const normalized = {};

        // Format imbriqué fill/stroke
        if (style.fill || style.stroke) {
            if (style.fill) {
                if (style.fill.color) normalized.fillColor = style.fill.color;
                if (typeof style.fill.opacity === 'number') {
                    normalized.fillOpacity = style.fill.opacity;
                } else {
                    normalized.fillOpacity = 1.0;
                }
            }

            if (style.stroke) {
                if (style.stroke.color) normalized.color = style.stroke.color;
                if (typeof style.stroke.opacity === 'number') normalized.opacity = style.stroke.opacity;
                if (typeof style.stroke.widthPx === 'number') normalized.weight = style.stroke.widthPx;
                if (style.stroke.dashArray) normalized.dashArray = style.stroke.dashArray;
                if (style.stroke.lineCap) normalized.lineCap = style.stroke.lineCap;
                if (style.stroke.lineJoin) normalized.lineJoin = style.stroke.lineJoin;
            }

            // Hatch (hachurage) — copier la structure pour que setLayerStyle
            // puisse la traiter plus tard.
            // Pour renderMode 'pattern_only' : on met fillColor='transparent'
            // et fillOpacity=1. Transparent évite le flash blanc, et fillOpacity=1
            // garantit que le pattern SVG sera visible dès son injection par
            // _applyHatchToLayer (plus besoin de changer fill-opacity après coup).
            if (style.hatch && style.hatch.enabled) {
                normalized.hatch = Object.assign({}, style.hatch);
                if (style.hatch.renderMode === 'pattern_only') {
                    normalized.fillColor = 'transparent';
                    normalized.fillOpacity = 1;
                }
            }

            // Propriétés communes
            if (style.shape) normalized.shape = style.shape;
            if (typeof style.sizePx === 'number') {
                normalized.radius = style.sizePx;
                normalized.sizePx = style.sizePx;
            }
        } else {
            Object.assign(normalized, style);
            if (typeof normalized.fillOpacity !== 'number') {
                normalized.fillOpacity = 1.0;
            }
        }

        return normalized;
    };

    const leafletOptions = {
        /**
         * Style pour polygones / lignes.
         * Priorité : defaultStyle < styleRules (première correspondante) < feature.properties.style
         */
        style(feature) {
            // 1. Commencer avec le style par défaut
            let finalStyle = Object.assign({}, normalizeStyle(options.defaultStyle));

            // 2. Appliquer les styleRules (première règle correspondante gagne)
            if (options.styleRules && Array.isArray(options.styleRules)) {
                const matchedStyle = evaluateStyleRules(feature, options.styleRules);
                if (matchedStyle) {
                    finalStyle = Object.assign({}, finalStyle, normalizeStyle(matchedStyle));
                }
            }

            // 3. Mode interactif
            const interactiveShapes = typeof options.interactiveShape === "boolean"
                ? options.interactiveShape
                : (_g.GeoLeaf && _g.GeoLeaf.Config && _g.GeoLeaf.Config.get ? _g.GeoLeaf.Config.get('ui.interactiveShapes', false) : false);
            finalStyle.interactive = interactiveShapes;

            return finalStyle;
        },

        /**
         * Gestion des points (Point / MultiPoint).
         */
        pointToLayer: options.pointToLayer
            ? function (feature, latlng) {
                  return options.pointToLayer(feature, latlng);
              }
            : function (feature, latlng) {
                  // Utiliser le paramètre interactiveShape défini pour cette couche
                  const interactiveShapes = typeof options.interactiveShape === "boolean"
                      ? options.interactiveShape
                      : (_g.GeoLeaf && _g.GeoLeaf.Config && _g.GeoLeaf.Config.get ? _g.GeoLeaf.Config.get('ui.interactiveShapes', false) : false);
                  const pointStyle = _g.GeoLeaf && _g.GeoLeaf.Utils && _g.GeoLeaf.Utils.mergeOptions
                      ? _g.GeoLeaf.Utils.mergeOptions(options.defaultPointStyle, { interactive: interactiveShapes })
                      : Object.assign({}, options.defaultPointStyle, { interactive: interactiveShapes });
                  return _g.L.circleMarker(latlng, pointStyle);
              },

        /**
         * Callback pour chaque entité.
         */
        onEachFeature: function (feature, layer) {
            // Popup simple par défaut si popupContent fourni
            if (
                feature &&
                feature.properties &&
                typeof feature.properties.popupContent === "string"
            ) {
                layer.bindPopup(feature.properties.popupContent);
            }

            // Callback custom utilisateur
            if (typeof options.onEachFeature === "function") {
                options.onEachFeature(feature, layer);
            }
        }
    };

    return leafletOptions;
};

// Exposer aussi via _StyleRules pour compatibilité avec le module Themes
if (!_g.GeoLeaf) _g.GeoLeaf = {};
_g.GeoLeaf._StyleRules = {
    evaluate: GeoJSONStyleResolver.evaluateStyleRules,
    operators: GeoJSONShared ? GeoJSONShared.STYLE_OPERATORS : {},
    getNestedValue: GeoJSONStyleResolver.getNestedValue
};

export { GeoJSONStyleResolver };
