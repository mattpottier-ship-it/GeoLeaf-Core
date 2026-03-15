/* eslint-disable security/detect-object-injection */
/**
 * Module Legend Generator
 * Generates automaticment the legends from thes files de style
 *
 * DEPENDENCIES:
 * - GeoLeaf.Log (optional)
 *
 * EXPOSE:
 * - GeoLeaf._LegendGenerator
 */

import { Log } from "../log/index.js";
import { Config } from "../config/config-primitives.js";
import { compareByOrder } from "../utils/general-utils.js";
import { POIShared } from "../shared/poi-state.js";

// Loose types for style JSON and taxonomy
interface StyleRuleWhen {
    field?: string;
    value?: string;
}
interface StyleRuleCondition {
    categoryId?: string;
    subCategoryId?: string;
    category?: string;
    subCategory?: string;
}
interface StyleRule {
    style?: Record<string, unknown>;
    legend?: { label?: string; order?: number; description?: string };
    when?: StyleRuleWhen;
    condition?: StyleRuleCondition;
}
interface StyleData {
    id?: string;
    label?: string;
    description?: string;
    style?: Record<string, unknown>;
    legend?: { label?: string; order?: number; description?: string };
    styleRules?: StyleRule[];
}
interface TaxonomyCategory {
    icon?: string;
    iconId?: string;
    subcategories?: Record<string, { icon?: string; iconId?: string }>;
}
interface TaxonomyData {
    categories?: Record<string, TaxonomyCategory>;
    icons?: { symbolPrefix?: string };
}

export interface LegendData {
    version: string;
    id?: string;
    title: string;
    description: string;
    sections: { title: string; items: LegendItemData[] }[];
}

export interface LegendItemData {
    label: string;
    order: number;
    description?: string;
    symbol: Record<string, unknown>;
}

function _findKeyCI(obj: Record<string, any>, id: string): string | null {
    if (Object.prototype.hasOwnProperty.call(obj, id)) return id;
    const lower = id.toLowerCase();
    return Object.keys(obj).find((k) => k.toLowerCase() === lower) ?? null;
}

function _findSubcategoryIcon(
    categories: Record<string, any>,
    value: string | number,
    symbolPrefix: string
): string | null {
    const valueStr = value as string;
    for (const categoryKey in categories) {
        const subcategories = categories[categoryKey].subcategories;
        if (!subcategories) continue;
        const subKey = _findKeyCI(subcategories, valueStr);
        if (subKey && subcategories[subKey]?.icon) {
            return symbolPrefix + subcategories[subKey].icon;
        }
    }
    return null;
}

function _findCategoryIcon(
    categories: Record<string, any>,
    value: string | number,
    symbolPrefix: string
): string | null {
    const catKey = _findKeyCI(categories, value as string);
    if (catKey && categories[catKey]?.icon) {
        return symbolPrefix + categories[catKey].icon;
    }
    return null;
}

function _buildFallbackItem(
    items: any[],
    styleData: any,
    geometryType: string,
    taxonomyData: any,
    symbolPrefix: string
): void {
    if (items.length !== 0 || !styleData.style || !styleData.legend) return;
    const item = generateLegendItem(
        styleData.style,
        styleData.legend,
        geometryType,
        null,
        null,
        taxonomyData,
        symbolPrefix
    );
    if (item) items.push(item);
}

function _buildSymbolForGeometry(
    geometryType: string,
    mergedStyle: any,
    rule: any,
    taxonomyData: any,
    symbolPrefix: string
): Record<string, unknown> {
    switch (geometryType) {
        case "point":
            return generatePointSymbol(mergedStyle, rule, taxonomyData, symbolPrefix);
        case "line":
            return generateLineSymbol(mergedStyle);
        case "polygon":
            return generatePolygonSymbol(mergedStyle);
        default:
            Log?.warn("[LegendGenerator] Unrecognized geometry type:", geometryType);
            return generatePointSymbol(mergedStyle, rule, taxonomyData, symbolPrefix);
    }
}

const _FIELD_CATEGORY_MAP: Record<string, "categoryId" | "subCategoryId"> = {
    "properties.categoryId": "categoryId",
    categoryId: "categoryId",
    "properties.category": "categoryId",
    category: "categoryId",
    "properties.subCategoryId": "subCategoryId",
    subCategoryId: "subCategoryId",
    "properties.subCategory": "subCategoryId",
    subCategory: "subCategoryId",
};

function _resolveIdsFromWhen(rule: any): {
    categoryId: string | null;
    subCategoryId: string | null;
} {
    const ids = { categoryId: null as string | null, subCategoryId: null as string | null };
    if (!(rule.when?.field && rule.when.value !== undefined)) return ids;
    const f = rule.when.field;
    const v = rule.when.value;
    if (f === "properties.fclass" || f === "fclass") {
        const mapping = fclassMappings[v];
        if (mapping) {
            ids.categoryId = mapping.categoryId;
            ids.subCategoryId = mapping.subCategoryId;
        }
    } else {
        const key = _FIELD_CATEGORY_MAP[f];
        if (key) ids[key] = v;
    }
    return ids;
}

function _resolveIdsFromCondition(rule: any): {
    categoryId: string | null;
    subCategoryId: string | null;
} {
    let categoryId: string | null = null;
    let subCategoryId: string | null = null;
    if (!rule.condition) return { categoryId, subCategoryId };
    if (rule.condition.categoryId !== undefined) categoryId = rule.condition.categoryId;
    if (rule.condition.subCategoryId !== undefined) subCategoryId = rule.condition.subCategoryId;
    if (rule.condition.category !== undefined) categoryId = rule.condition.category;
    if (rule.condition.subCategory !== undefined) subCategoryId = rule.condition.subCategory;
    return { categoryId, subCategoryId };
}

function _inferCategoryId(
    categoriesConfig: Record<string, any>,
    subCategoryId: string | null
): string | null {
    if (!subCategoryId) return null;
    for (const catKey of Object.keys(categoriesConfig)) {
        const subs = categoriesConfig[catKey].subcategories;
        if (subs && _findKeyCI(subs, subCategoryId)) return catKey;
    }
    return null;
}

function _resolveSubcatIcon(cat: any, subCategoryId: string): string | null {
    const subKey = cat.subcategories ? _findKeyCI(cat.subcategories, subCategoryId) : null;
    const subCat = subKey ? cat.subcategories[subKey] : null;
    if (subCat) return subCat.icon || (subCat as any).iconId || cat.icon || cat.iconId || null;
    return cat.icon || cat.iconId || null;
}

function _resolveIconId(
    categoriesConfig: Record<string, any>,
    categoryId: string | null,
    subCategoryId: string | null
): string | null {
    if (!categoryId) return null;
    const catKey = _findKeyCI(categoriesConfig, categoryId);
    const cat = catKey ? categoriesConfig[catKey] : null;
    if (!cat) return null;
    if (subCategoryId && cat.subcategories) return _resolveSubcatIcon(cat, subCategoryId);
    return cat.icon || cat.iconId || null;
}

function _resolveRadius(style: Record<string, unknown>): number {
    const r = (style.radius as number) || (style.size as number);
    return r || (style.sizePx ? (style.sizePx as number) / 2 : 24);
}

function _resolveFirstDefined(v1: unknown, v2: unknown, fallback: number): number {
    if (v1 !== undefined) return v1 as number;
    if (v2 !== undefined) return v2 as number;
    return fallback;
}

function _resolveCircleColors(
    style: Record<string, unknown>,
    fill: Record<string, unknown>,
    stroke: Record<string, unknown>
): { fillColor: string; color: string } {
    return {
        fillColor:
            (style.fillColor as string) ||
            (style.color as string) ||
            (fill.color as string) ||
            "#3388ff",
        color: (style.color as string) || (stroke.color as string) || "#ffffff",
    };
}

function _buildPointSymbolBase(style: Record<string, unknown>): Record<string, unknown> {
    const fill = (style.fill as Record<string, unknown>) || {};
    const stroke = (style.stroke as Record<string, unknown>) || {};
    const colors = _resolveCircleColors(style, fill, stroke);
    return {
        type: "circle",
        radius: _resolveRadius(style),
        fillColor: colors.fillColor,
        fillOpacity: _resolveFirstDefined(style.fillOpacity, fill.opacity, 1),
        color: colors.color,
        weight: (style.weight as number) || (stroke.widthPx as number) || 2,
        opacity: _resolveFirstDefined(style.opacity, stroke.opacity, 1),
    };
}

function _applyIconFromRule(
    symbol: Record<string, unknown>,
    rule: any,
    symbolPrefix: string
): boolean {
    if (!shouldUseIcons()) return false;
    const res = resolveRuleIcons(rule);
    if (!res.useIcon || !res.iconId) return false;
    const base = (res.iconId as string).startsWith("#")
        ? res.iconId
        : symbolPrefix
          ? symbolPrefix + res.iconId
          : "#sprite-" + res.iconId;
    symbol.icon = base;
    symbol.iconColor = "#ffffff";
    Log?.debug(`[LegendGenerator] Icon resolved from config: ${base}`);
    return true;
}

function _applyPointIcon(
    symbol: Record<string, unknown>,
    style: Record<string, unknown>,
    rule: any,
    taxonomyData: any,
    symbolPrefix: string
): void {
    if (style.useIcon && style.iconId) {
        symbol.icon = style.iconId;
        symbol.iconColor = "#ffffff";
        Log?.debug(`[LegendGenerator] Icon found in style: ${style.iconId}`);
        return;
    }
    if (rule && _applyIconFromRule(symbol, rule, symbolPrefix)) return;
    if (!symbol.icon && rule && taxonomyData && shouldUseIcons()) {
        const icon = getIconFromTaxonomy(rule, taxonomyData, symbolPrefix);
        if (icon) {
            symbol.icon = icon;
            symbol.iconColor = "#ffffff";
            Log?.debug("[LegendGenerator] Taxonomy icon added:", icon);
        }
    }
}

function _buildLineBase(style: Record<string, unknown>): {
    symbol: Record<string, unknown>;
    stroke: Record<string, unknown>;
    casing: Record<string, unknown>;
} {
    const stroke = (style.stroke as Record<string, unknown>) || {};
    const casing = (style.casing as Record<string, unknown>) || {};
    const symbol: Record<string, unknown> = {
        type: "line",
        color: (stroke.color as string) || (style.color as string) || "#3388ff",
        width: (stroke.widthPx as number) || (style.weight as number) || 3,
        style: "solid",
    };
    return { symbol, stroke, casing };
}

function _applyCasingLine(symbol: Record<string, unknown>, casing: Record<string, unknown>): void {
    if ((casing.enabled as boolean) && casing.color) {
        symbol.outlineColor = casing.color;
        symbol.outlineWidth = Math.max(0.5, ((casing.widthPx as number) || 1) * 0.4);
        symbol.outlineOpacity = casing.opacity ?? 1;
    }
}

function _applyLineDash(
    symbol: Record<string, unknown>,
    style: Record<string, unknown>,
    stroke: Record<string, unknown>
): void {
    const dashArray = (style.dashArray as string) || (stroke.dashArray as string);
    if (!dashArray) return;
    symbol.dashArray = dashArray;
    if (dashArray === "5, 5" || dashArray === "10, 10") {
        symbol.style = "dashed";
    } else if (dashArray === "1, 3" || dashArray === "2, 4") {
        symbol.style = "dotted";
    }
}

function _buildPolygonBase(
    fill: Record<string, unknown>,
    stroke: Record<string, unknown>,
    style: Record<string, unknown>
): Record<string, unknown> {
    return {
        type: "polygon",
        fillColor:
            (style.fillColor as string) ||
            (style.color as string) ||
            (fill.color as string) ||
            "#3388ff",
        color: (style.color as string) || (stroke.color as string) || "#333",
        weight: (style.weight as number) || (stroke.widthPx as number) || 1,
    };
}

function _applyPolygonDecorations(
    symbol: Record<string, unknown>,
    fill: Record<string, unknown>,
    style: Record<string, unknown>,
    stroke: Record<string, unknown>
): void {
    applyOpacityProperties(symbol, style, ["fillOpacity"]);
    if (fill.opacity !== undefined) symbol.opacity = fill.opacity;
    if (style.opacity !== undefined) symbol.opacity = style.opacity;
    const dashArray = (style.dashArray as string) || (stroke.dashArray as string);
    if (dashArray) symbol.dashArray = dashArray;
    if (style.fillPattern) symbol.fillPattern = style.fillPattern;
    if (style.hatch) symbol.hatch = style.hatch;
}

function _isSubCategoryField(field: string | undefined): boolean {
    return field === "properties.subCategoryId" || field === "attributes.subCategoryId";
}

function _isCategoryIdField(field: string | undefined): boolean {
    return field === "properties.categoryId" || field === "attributes.categoryId";
}

function getIconFromTaxonomy(
    rule: StyleRule,
    taxonomyData: TaxonomyData | null | undefined,
    symbolPrefix: string
): string | null {
    if (!rule.when || !taxonomyData?.categories) {
        Log?.debug("[LegendGenerator] Insufficient data to retrieve icon:", {
            hasRule: !!rule.when,
            hasTaxonomy: !!taxonomyData,
            hasCategories: !!(taxonomyData && taxonomyData.categories),
        });
        return null;
    }

    const field = rule.when.field;
    const value = rule.when.value ?? "";
    const categories = taxonomyData.categories;
    Log?.debug(`[LegendGenerator] Looking for icon for ${field}=${value}`);

    const isSubCategory = _isSubCategoryField(field);
    const isCategoryId = _isCategoryIdField(field);

    if (isSubCategory) {
        const iconId = _findSubcategoryIcon(categories, value, symbolPrefix);
        if (iconId) {
            Log?.debug(`[LegendGenerator] Icon found (subcat): ${iconId}`);
            return iconId;
        }
    }
    if (isCategoryId) {
        const iconId = _findCategoryIcon(categories, value, symbolPrefix);
        if (iconId) {
            Log?.debug(`[LegendGenerator] Icon found (cat): ${iconId}`);
            return iconId;
        }
    }

    Log?.warn(`[LegendGenerator] No icon found for ${field}=${value}`);
    return null;
}

function shouldUseIcons(): boolean {
    try {
        const shared = POIShared ?? null;
        const poiConfig = shared
            ? ((shared as { state?: { poiConfig?: { showIconsOnMap?: boolean } } }).state
                  ?.poiConfig ?? {})
            : {};
        const showIconsOnMap = poiConfig.showIconsOnMap !== false;

        if (showIconsOnMap) {
            const iconsConfig =
                (Config as { getIconsConfig?: () => { showOnMap?: boolean } }).getIconsConfig?.() ??
                null;
            if (iconsConfig && iconsConfig.showOnMap !== false) {
                return true;
            }
        }
    } catch {
        // ignore
    }
    return false;
}

/**
 * Generates thes data de legend from un file de style
 */
function generateLegendFromStyle(
    styleData: StyleData | null | undefined,
    geometryType: string,
    taxonomyData: TaxonomyData | null | undefined
): LegendData | null {
    if (!styleData) {
        Log?.warn("[LegendGenerator] Style data manquant");
        return null;
    }

    const legendData: LegendData = {
        version: "3.0",
        id: styleData.id,
        title: styleData.label || "Sans titre",
        description: styleData.description || "",
        sections: [],
    };

    const items: LegendItemData[] = [];
    const symbolPrefix = taxonomyData?.icons?.symbolPrefix || "tourism-poi-cat-";

    if (Array.isArray(styleData.styleRules) && styleData.styleRules.length > 0) {
        styleData.styleRules.forEach((rule) => {
            if (!rule.legend) {
                Log?.warn("[LegendGenerator] Rule without legend property:", rule);
                return;
            }

            const item = generateLegendItem(
                rule.style,
                rule.legend,
                geometryType,
                styleData.style ?? null,
                rule,
                taxonomyData,
                symbolPrefix
            );

            if (item) {
                items.push(item);
            }
        });

        items.sort(compareByOrder);
    }

    _buildFallbackItem(items, styleData, geometryType, taxonomyData, symbolPrefix);

    if (items.length > 0) {
        legendData.sections.push({
            title: "",
            items,
        });
    }

    return legendData;
}

function generateLegendItem(
    style: Record<string, unknown> | undefined,
    legend: { label?: string; order?: number; description?: string },
    geometryType: string,
    baseStyle: Record<string, unknown> | null,
    rule: StyleRule | null,
    taxonomyData: TaxonomyData | null | undefined,
    symbolPrefix: string
): LegendItemData | null {
    if (!style || !legend) {
        return null;
    }

    const mergedStyle = baseStyle ? Object.assign({}, baseStyle, style) : style;

    const item: LegendItemData = {
        label: legend.label || "Sans label",
        order: legend.order ?? 999,
        symbol: {},
    };

    if (legend.description) {
        item.description = legend.description;
    }

    item.symbol = _buildSymbolForGeometry(
        geometryType,
        mergedStyle,
        rule,
        taxonomyData,
        symbolPrefix
    );

    return item;
}

function applyOpacityProperties(
    symbol: Record<string, unknown>,
    style: Record<string, unknown>,
    opacityProps: string[]
): void {
    opacityProps.forEach((prop) => {
        if (style[prop] !== undefined) {
            symbol[prop] = style[prop];
        }
    });
}

const fclassMappings: Record<string, { categoryId: string; subCategoryId: string }> = {
    archaeological: { categoryId: "CULTURES", subCategoryId: "SITE ARCHEOLOGIQUE" },
    museum: { categoryId: "CULTURES", subCategoryId: "MUSEE" },
    camp_site: { categoryId: "HEBERGEMENT", subCategoryId: "CAMPING" },
    hotel: { categoryId: "HEBERGEMENT", subCategoryId: "HOTEL" },
};

function _getCategories(): Record<string, TaxonomyCategory> | null {
    const cfg = (
        Config as { getCategories?: () => Record<string, TaxonomyCategory> }
    ).getCategories?.();
    if (!cfg || Object.keys(cfg).length === 0) return null;
    return cfg;
}

function resolveRuleIcons(rule: StyleRule): { useIcon: boolean; iconId: string | null } {
    if (!shouldUseIcons()) return { useIcon: false, iconId: null };
    const categoriesConfig = _getCategories();
    if (!categoriesConfig) return { useIcon: false, iconId: null };

    let { categoryId, subCategoryId } = _resolveIdsFromWhen(rule);
    if (!categoryId && !subCategoryId) {
        ({ categoryId, subCategoryId } = _resolveIdsFromCondition(rule));
    }

    if (subCategoryId && !categoryId) {
        categoryId = _inferCategoryId(categoriesConfig, subCategoryId);
    }

    if (!categoryId && !subCategoryId) return { useIcon: false, iconId: null };
    const iconId = _resolveIconId(categoriesConfig, categoryId, subCategoryId);
    return { useIcon: iconId !== null, iconId };
}

function generatePointSymbol(
    style: Record<string, unknown>,
    rule: StyleRule | null,
    taxonomyData: TaxonomyData | null | undefined,
    symbolPrefix: string
): Record<string, unknown> {
    const symbol = _buildPointSymbolBase(style);
    _applyPointIcon(symbol, style, rule, taxonomyData, symbolPrefix);
    return symbol;
}

function generateLineSymbol(style: Record<string, unknown>): Record<string, unknown> {
    const { symbol, stroke, casing } = _buildLineBase(style);
    _applyCasingLine(symbol, casing);
    if (stroke.opacity !== undefined) {
        symbol.opacity = stroke.opacity;
    }
    _applyLineDash(symbol, style, stroke);
    return symbol;
}

function generatePolygonSymbol(style: Record<string, unknown>): Record<string, unknown> {
    const fill = (style.fill as Record<string, unknown>) || {};
    const stroke = (style.stroke as Record<string, unknown>) || {};
    const symbol = _buildPolygonBase(fill, stroke, style);
    _applyPolygonDecorations(symbol, fill, style, stroke);
    return symbol;
}

const LegendGenerator = {
    generateLegendFromStyle,
    generateLegendItem,
};
export { LegendGenerator };
