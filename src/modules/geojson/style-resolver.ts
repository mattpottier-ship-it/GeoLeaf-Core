/**
 * GeoLeaf GeoJSON Module - Style Resolver
 * @module geojson/style-resolver
 */

import { GeoJSONShared } from './shared.js';
import { getLog } from '../utils/general-utils.js';
import type { GeoJSONFeature, GeoJSONStyleRule } from './geojson-types.js';

const _g: any = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

/** Fallback when GeoJSONShared is not yet loaded (e.g. in tests that load style-resolver in isolation) */
const DEFAULT_STYLE_OPERATORS: Record<string, (a: unknown, b: unknown) => boolean> = {
    '>': (a, b) => Number(a) > Number(b),
    '>=': (a, b) => Number(a) >= Number(b),
    '<': (a, b) => Number(a) < Number(b),
    '<=': (a, b) => Number(a) <= Number(b),
    '==': (a, b) => a == b,
    '===': (a, b) => a === b,
    eq: (a, b) => a == b,
    '!=': (a, b) => a != b,
    '!==': (a, b) => a !== b,
    neq: (a, b) => a != b,
    contains: (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
    startsWith: (a, b) => String(a).toLowerCase().startsWith(String(b).toLowerCase()),
    endsWith: (a, b) => String(a).toLowerCase().endsWith(String(b).toLowerCase()),
    in: (a, b) => Array.isArray(b) && b.includes(a),
    notIn: (a, b) => Array.isArray(b) && !b.includes(a),
    between: (a, b) =>
        Array.isArray(b) && b.length === 2 && Number(a) >= Number(b[0]) && Number(a) <= Number(b[1]),
};

interface StyleRuleWhen {
    field?: string;
    operator?: string;
    value?: unknown;
    all?: { field?: string; operator?: string; value?: unknown }[];
}

interface LayerStyleOptions {
    defaultStyle?: Record<string, unknown>;
    defaultPointStyle?: Record<string, unknown>;
    styleRules?: GeoJSONStyleRule[];
    pointToLayer?: (feature: GeoJSONFeature, latlng: unknown) => unknown;
    onEachFeature?: (feature: GeoJSONFeature, layer: unknown) => void;
    interactiveShape?: boolean;
}

const GeoJSONStyleResolver = {
    getNestedValue(obj: Record<string, unknown> | null, path: string): unknown {
        if (!obj || !path) return null;
        return path.split('.').reduce(
            (current: unknown, prop: string) =>
                current != null && typeof current === 'object' && (current as Record<string, unknown>)[prop] !== undefined
                    ? (current as Record<string, unknown>)[prop]
                    : null,
            obj as unknown
        );
    },

    evaluateCondition(
        feature: GeoJSONFeature,
        condition: StyleRuleWhen,
        STYLE_OPERATORS: Record<string, (a: unknown, b: unknown) => boolean>,
        Log: { warn?: (a: string, b?: unknown) => void }
    ): boolean {
        const { field, operator, value } = condition;
        if (!field || !operator) return false;
        const fieldValue = GeoJSONStyleResolver.getNestedValue(
            feature.properties ?? {},
            field
        ) as unknown;
        if (fieldValue === null || fieldValue === undefined) return false;
        const compareFn = STYLE_OPERATORS[operator];
        if (!compareFn) {
            Log.warn?.('[GeoJSON] Op�rateur styleRules inconnu:', operator);
            return false;
        }
        try {
            return compareFn(fieldValue, value);
        } catch (e) {
            Log.warn?.(
                '[GeoJSON] Erreur �valuation condition:',
                e instanceof Error ? e.message : e
            );
            return false;
        }
    },

    evaluateStyleRules(
        feature: GeoJSONFeature,
        styleRules: GeoJSONStyleRule[] | null | undefined
    ): Record<string, unknown> | null {
        if (!Array.isArray(styleRules) || styleRules.length === 0) return null;
        const Log = getLog();
        const STYLE_OPERATORS = GeoJSONShared?.STYLE_OPERATORS ?? DEFAULT_STYLE_OPERATORS;

        for (const rule of styleRules) {
            if (!rule?.when || !rule?.style) continue;
            const when = rule.when as StyleRuleWhen;

            if (when.all && Array.isArray(when.all)) {
                const allMet = when.all.every((condition) =>
                    GeoJSONStyleResolver.evaluateCondition(
                        feature,
                        condition,
                        STYLE_OPERATORS,
                        Log
                    )
                );
                if (allMet) return rule.style as Record<string, unknown>;
            } else if (when.field && when.operator) {
                const conditionMet = GeoJSONStyleResolver.evaluateCondition(
                    feature,
                    when,
                    STYLE_OPERATORS,
                    Log
                );
                if (conditionMet) return rule.style as Record<string, unknown>;
            }
        }
        return null;
    },

    buildLeafletOptions(options: LayerStyleOptions): Record<string, unknown> {
        const evaluateStyleRules = GeoJSONStyleResolver.evaluateStyleRules;
        const g = _g as {
            GeoLeaf?: { Config?: { get: (path: string, def: unknown) => unknown }; Utils?: { mergeOptions: (a: unknown, b: unknown) => unknown } };
            L?: { circleMarker: (latlng: unknown, opts: unknown) => unknown };
        };

        const normalizeStyle = (style: Record<string, unknown> | null): Record<string, unknown> => {
            if (!style || typeof style !== 'object') return {};
            const normalized: Record<string, unknown> = {};
            const fill = style.fill as { color?: string; opacity?: number } | undefined;
            const stroke = style.stroke as {
                color?: string;
                opacity?: number;
                widthPx?: number;
                dashArray?: string;
                lineCap?: string;
                lineJoin?: string;
            } | undefined;

            if (fill || stroke) {
                if (fill) {
                    if (fill.color) normalized.fillColor = fill.color;
                    normalized.fillOpacity =
                        typeof fill.opacity === 'number' ? fill.opacity : 1.0;
                }
                if (stroke) {
                    if (stroke.color) normalized.color = stroke.color;
                    if (typeof stroke.opacity === 'number')
                        normalized.opacity = stroke.opacity;
                    if (typeof stroke.widthPx === 'number')
                        normalized.weight = stroke.widthPx;
                    if (stroke.dashArray) normalized.dashArray = stroke.dashArray;
                    if (stroke.lineCap) normalized.lineCap = stroke.lineCap;
                    if (stroke.lineJoin) normalized.lineJoin = stroke.lineJoin;
                }
                const hatch = style.hatch as { enabled?: boolean; renderMode?: string } | undefined;
                if (hatch?.enabled) {
                    normalized.hatch = Object.assign({}, style.hatch);
                    if (hatch.renderMode === 'pattern_only') {
                        normalized.fillColor = 'transparent';
                        normalized.fillOpacity = 1;
                    }
                }
                if (style.shape) normalized.shape = style.shape;
                if (typeof style.sizePx === 'number') {
                    normalized.radius = style.sizePx;
                    normalized.sizePx = style.sizePx;
                }
            } else {
                Object.assign(normalized, style);
                if (typeof normalized.fillOpacity !== 'number') normalized.fillOpacity = 1.0;
            }
            return normalized;
        };

        const leafletOptions: Record<string, unknown> = {
            style(feature: GeoJSONFeature) {
                let finalStyle = Object.assign(
                    {},
                    normalizeStyle((options.defaultStyle ?? {}) as Record<string, unknown>)
                );
                if (options.styleRules?.length) {
                    const matched = evaluateStyleRules(feature, options.styleRules);
                    if (matched)
                        finalStyle = Object.assign(
                            {},
                            finalStyle,
                            normalizeStyle(matched)
                        );
                }
                const interactiveShapes =
                    typeof options.interactiveShape === 'boolean'
                        ? options.interactiveShape
                        : (g.GeoLeaf?.Config?.get?.('ui.interactiveShapes', false) as boolean);
                finalStyle.interactive = interactiveShapes;
                return finalStyle;
            },

            pointToLayer: options.pointToLayer
                ? (feature: GeoJSONFeature, latlng: unknown) =>
                      options.pointToLayer!(feature, latlng)
                : (feature: GeoJSONFeature, latlng: unknown) => {
                      const interactiveShapes =
                          typeof options.interactiveShape === 'boolean'
                              ? options.interactiveShape
                              : (g.GeoLeaf?.Config?.get?.('ui.interactiveShapes', false) as boolean);
                      const pointStyle =
                          g.GeoLeaf?.Utils?.mergeOptions
                              ? g.GeoLeaf.Utils.mergeOptions(
                                    options.defaultPointStyle ?? {},
                                    { interactive: interactiveShapes }
                                )
                              : Object.assign(
                                    {},
                                    options.defaultPointStyle ?? {},
                                    { interactive: interactiveShapes }
                                );
                      return g.L?.circleMarker(latlng, pointStyle);
                  },

            onEachFeature(feature: GeoJSONFeature, layer: unknown) {
                const layerObj = layer as { bindPopup?: (content: string) => void };
                if (
                    feature?.properties &&
                    typeof feature.properties.popupContent === 'string'
                ) {
                    layerObj.bindPopup?.(feature.properties.popupContent);
                }
                if (typeof options.onEachFeature === 'function') {
                    options.onEachFeature(feature, layer);
                }
            },
        };

        return leafletOptions;
    },
};

if (!(_g as { GeoLeaf?: unknown }).GeoLeaf) (_g as { GeoLeaf?: unknown }).GeoLeaf = {};
(
    _g as {
        GeoLeaf: {
            _StyleRules?: {
                evaluate: typeof GeoJSONStyleResolver.evaluateStyleRules;
                operators: Record<string, (a: unknown, b: unknown) => boolean>;
                getNestedValue: typeof GeoJSONStyleResolver.getNestedValue;
            };
        };
    }
).GeoLeaf._StyleRules = {
    evaluate: GeoJSONStyleResolver.evaluateStyleRules,
    operators: GeoJSONShared?.STYLE_OPERATORS ?? DEFAULT_STYLE_OPERATORS,
    getNestedValue: GeoJSONStyleResolver.getNestedValue,
};

export { GeoJSONStyleResolver };
