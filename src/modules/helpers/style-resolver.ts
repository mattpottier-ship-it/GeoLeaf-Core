/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * Style Resolver - Helper pour résoudre les couleurs depuis les styleRules des couches
 * @module helpers/style-resolver
 */

interface StyleRuleWhen {
    field?: string;
    value?: unknown;
}

interface StyleRule {
    when?: StyleRuleWhen;
    style?: { fillColor?: string; color?: string };
}

interface StyleConfig {
    styleRules?: StyleRule[];
    defaultStyle?: { fillColor?: string; color?: string };
}

interface LayerData {
    currentStyle?: StyleConfig;
}

interface GeoJSONSharedState {
    state?: {
        layers?: Map<string, LayerData>;
    };
}

interface GeoLeafGlobalStyle {
    GeoLeaf?: {
        _GeoJSONShared?: GeoJSONSharedState;
    };
}

const _gl = (
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {}
) as GeoLeafGlobalStyle;

export interface StyleColors {
    fillColor?: string;
    color?: string;
    colorFill?: string;
    colorStroke?: string;
}

export interface PoiColors {
    colorFill: string | null;
    colorStroke: string | null;
    colorRoute: string | null;
}

interface PoiWithLayer {
    categoryId?: string;
    category?: string;
    subCategoryId?: string;
    subCategory?: string;
    sub_category?: string;
    attributes?: Record<string, unknown>;
    properties?: Record<string, unknown>;
    _layerConfig?: { id: string };
}

export function getColorsFromLayerStyle(
    poi: PoiWithLayer | null | undefined,
    layerId: string | null | undefined
): StyleColors | null {
    if (!poi || !layerId) return null;

    const layerData = _gl.GeoLeaf?._GeoJSONShared?.state?.layers?.get(layerId);
    if (!layerData) return null;

    const styleConfig = layerData.currentStyle;
    if (!styleConfig?.styleRules) return null;

    const categoryId =
        poi.categoryId ??
        poi.category ??
        (poi.attributes as Record<string, unknown> | undefined)?.categoryId ??
        (poi.properties as Record<string, unknown> | undefined)?.categoryId ??
        (poi.properties as Record<string, unknown> | undefined)?.category;

    const subCategoryId =
        poi.subCategoryId ??
        poi.subCategory ??
        (poi as { sub_category?: string }).sub_category ??
        (poi.attributes as Record<string, unknown> | undefined)?.subCategoryId ??
        (poi.properties as Record<string, unknown> | undefined)?.subCategoryId ??
        (poi.properties as Record<string, unknown> | undefined)?.sub_category;

    if (subCategoryId) {
        const rule = styleConfig.styleRules.find(
            (r: StyleRule) =>
                r.when?.field === "properties.subCategoryId" && r.when?.value === subCategoryId
        );
        if (rule?.style) {
            return {
                fillColor: rule.style.fillColor,
                color: rule.style.color,
                colorFill: rule.style.fillColor,
                colorStroke: rule.style.color,
            };
        }
    }

    if (categoryId) {
        const rule = styleConfig.styleRules.find(
            (r: StyleRule) =>
                r.when?.field === "properties.categoryId" && r.when?.value === categoryId
        );
        if (rule?.style) {
            return {
                fillColor: rule.style.fillColor,
                color: rule.style.color,
                colorFill: rule.style.fillColor,
                colorStroke: rule.style.color,
            };
        }
    }

    if (styleConfig.defaultStyle) {
        return {
            fillColor: styleConfig.defaultStyle.fillColor,
            color: styleConfig.defaultStyle.color,
            colorFill: styleConfig.defaultStyle.fillColor,
            colorStroke: styleConfig.defaultStyle.color,
        };
    }

    return null;
}

export function resolvePoiColors(poi: PoiWithLayer | null | undefined): PoiColors {
    const colors: PoiColors = {
        colorFill: null,
        colorStroke: null,
        colorRoute: null,
    };

    if (!poi?._layerConfig) return colors;

    const layerId = poi._layerConfig.id;
    const styleColors = getColorsFromLayerStyle(poi, layerId);

    if (styleColors) {
        colors.colorFill = styleColors.fillColor ?? styleColors.colorFill ?? null;
        colors.colorStroke = styleColors.color ?? styleColors.colorStroke ?? null;
        colors.colorRoute = styleColors.color ?? styleColors.colorStroke ?? null;
    }

    return colors;
}

export const StyleResolver = {
    getColorsFromLayerStyle,
    resolvePoiColors,
};
