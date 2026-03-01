/**
 * Module Legend Generator
 * Génère automatiquement les légendes depuis les fichiers de style
 *
 * DÉPENDANCES:
 * - GeoLeaf.Log (optionnel)
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

function getIconFromTaxonomy(
    rule: StyleRule,
    taxonomyData: TaxonomyData | null | undefined,
    symbolPrefix: string
): string | null {
    if (!rule.when || !taxonomyData?.categories) {
        if (Log)
            Log.debug("[LegendGenerator] Données insuffisantes pour récupérer icône:", {
                hasRule: !!rule.when,
                hasTaxonomy: !!taxonomyData,
                hasCategories: !!(taxonomyData && taxonomyData.categories),
            });
        return null;
    }

    const field = rule.when.field;
    const value = rule.when.value;
    const categories = taxonomyData.categories;

    if (Log) Log.debug(`[LegendGenerator] Recherche icône pour ${field}=${value}`);

    const isSubCategory =
        field === "properties.subCategoryId" || field === "attributes.subCategoryId";
    const isCategoryId = field === "properties.categoryId" || field === "attributes.categoryId";

    if (isSubCategory) {
        for (const categoryKey in categories) {
            const subcategories = categories[categoryKey].subcategories;
            if (subcategories?.[value as string]?.icon) {
                const iconId = symbolPrefix + subcategories[value as string].icon;
                if (Log) Log.debug(`[LegendGenerator] Icône trouvée (subcat): ${iconId}`);
                return iconId;
            }
        }
    }

    if (isCategoryId && categories[value as string]?.icon) {
        const iconId = symbolPrefix + categories[value as string].icon;
        if (Log) Log.debug(`[LegendGenerator] Icône trouvée (cat): ${iconId}`);
        return iconId;
    }

    if (Log) Log.warn(`[LegendGenerator] Aucune icône trouvée pour ${field}=${value}`);
    return null;
}

function shouldUseIcons(): boolean {
    try {
        const shared = POIShared ?? null;
        const poiConfig = shared ? (shared as { state?: { poiConfig?: { showIconsOnMap?: boolean } } }).state?.poiConfig ?? {} : {};
        const showIconsOnMap = poiConfig.showIconsOnMap !== false;

        if (showIconsOnMap) {
            const iconsConfig = (Config as { getIconsConfig?: () => { showOnMap?: boolean } }).getIconsConfig?.() ?? null;
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
 * Génère les données de légende depuis un fichier de style
 */
function generateLegendFromStyle(
    styleData: StyleData | null | undefined,
    geometryType: string,
    taxonomyData: TaxonomyData | null | undefined
): LegendData | null {
    if (!styleData) {
        if (Log) Log.warn("[LegendGenerator] Style data manquant");
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
                if (Log) Log.warn("[LegendGenerator] Règle sans propriété legend:", rule);
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

    if (items.length === 0 && styleData.style && styleData.legend) {
        const item = generateLegendItem(
            styleData.style,
            styleData.legend,
            geometryType,
            null,
            null,
            taxonomyData,
            symbolPrefix
        );

        if (item) {
            items.push(item);
        }
    }

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

    switch (geometryType) {
        case "point":
            item.symbol = generatePointSymbol(mergedStyle, rule, taxonomyData, symbolPrefix);
            break;
        case "line":
            item.symbol = generateLineSymbol(mergedStyle);
            break;
        case "polygon":
            item.symbol = generatePolygonSymbol(mergedStyle);
            break;
        default:
            if (Log) Log.warn("[LegendGenerator] Type de géométrie non reconnu:", geometryType);
            item.symbol = generatePointSymbol(mergedStyle, rule, taxonomyData, symbolPrefix);
    }

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

function resolveRuleIcons(rule: StyleRule): { useIcon: boolean; iconId: string | null } {
    if (!shouldUseIcons()) {
        return { useIcon: false, iconId: null };
    }
    const categoriesConfig = (Config as { getCategories?: () => Record<string, TaxonomyCategory> }).getCategories?.() ?? {};

    if (!categoriesConfig || Object.keys(categoriesConfig).length === 0) {
        return { useIcon: false, iconId: null };
    }

    let categoryId: string | null = null;
    let subCategoryId: string | null = null;

    if (rule.when?.field && rule.when.value !== undefined) {
        if (rule.when.field === "properties.fclass" || rule.when.field === "fclass") {
            const mapping = fclassMappings[rule.when.value];
            if (mapping) {
                categoryId = mapping.categoryId;
                subCategoryId = mapping.subCategoryId;
            }
        } else if (
            rule.when.field === "properties.categoryId" ||
            rule.when.field === "categoryId"
        ) {
            categoryId = rule.when.value;
        } else if (
            rule.when.field === "properties.subCategoryId" ||
            rule.when.field === "subCategoryId"
        ) {
            subCategoryId = rule.when.value;
        } else if (rule.when.field === "properties.category" || rule.when.field === "category") {
            categoryId = rule.when.value;
        } else if (
            rule.when.field === "properties.subCategory" ||
            rule.when.field === "subCategory"
        ) {
            subCategoryId = rule.when.value;
        }
    } else if (rule.condition) {
        if (rule.condition.categoryId !== undefined) categoryId = rule.condition.categoryId;
        if (rule.condition.subCategoryId !== undefined) subCategoryId = rule.condition.subCategoryId;
        if (rule.condition.category !== undefined) categoryId = rule.condition.category;
        if (rule.condition.subCategory !== undefined) subCategoryId = rule.condition.subCategory;
    }

    if (subCategoryId && !categoryId) {
        Object.keys(categoriesConfig).forEach((catKey) => {
            const cat = categoriesConfig[catKey];
            if (cat.subcategories?.[subCategoryId!]) {
                categoryId = catKey;
            }
        });
    }

    if (!categoryId && !subCategoryId) {
        return { useIcon: false, iconId: null };
    }

    let iconId: string | null = null;
    if (subCategoryId && categoriesConfig[categoryId!]?.subcategories) {
        const subCat = categoriesConfig[categoryId!].subcategories![subCategoryId];
        const cat = categoriesConfig[categoryId!];
        if (subCat) {
            iconId = subCat.icon || (subCat as { iconId?: string }).iconId || cat.icon || cat.iconId || null;
        } else {
            iconId = cat.icon || cat.iconId || null;
        }
    } else if (categoriesConfig[categoryId!]) {
        const cat = categoriesConfig[categoryId!];
        iconId = cat.icon || cat.iconId || null;
    }

    return {
        useIcon: iconId !== null,
        iconId,
    };
}

function generatePointSymbol(
    style: Record<string, unknown>,
    rule: StyleRule | null,
    taxonomyData: TaxonomyData | null | undefined,
    symbolPrefix: string
): Record<string, unknown> {
    const fill = (style.fill as Record<string, unknown>) || {};
    const stroke = (style.stroke as Record<string, unknown>) || {};

    const resolvedRadius =
        (style.radius as number) ||
        (style.size as number) ||
        (style.sizePx ? (style.sizePx as number) / 2 : undefined);

    const defaultRadius = 24;

    const symbol: Record<string, unknown> = {
        type: "circle",
        radius: resolvedRadius || defaultRadius,
        fillColor: (style.fillColor as string) || (style.color as string) || (fill.color as string) || "#3388ff",
        fillOpacity:
            style.fillOpacity !== undefined
                ? style.fillOpacity
                : fill.opacity !== undefined
                  ? fill.opacity
                  : 1,
        color: (style.color as string) || (stroke.color as string) || "#ffffff",
        weight: (style.weight as number) || (stroke.widthPx as number) || 2,
        opacity:
            style.opacity !== undefined
                ? style.opacity
                : stroke.opacity !== undefined
                  ? stroke.opacity
                  : 1,
    };

    if (style.useIcon && style.iconId) {
        symbol.icon = style.iconId;
        symbol.iconColor = "#ffffff";
        if (Log) Log.debug(`[LegendGenerator] Icône trouvée dans le style: ${style.iconId}`);
    } else if (rule && shouldUseIcons()) {
        const iconResolution = resolveRuleIcons(rule);
        if (iconResolution.useIcon && iconResolution.iconId) {
            const fullIconId = (iconResolution.iconId as string).startsWith("#")
                ? iconResolution.iconId
                : symbolPrefix
                  ? symbolPrefix + iconResolution.iconId
                  : "#sprite-" + iconResolution.iconId;
            symbol.icon = fullIconId;
            symbol.iconColor = "#ffffff";
            if (Log) Log.debug(`[LegendGenerator] Icône résolue depuis la config: ${fullIconId}`);
        }
    }
    if (!symbol.icon && rule && taxonomyData && shouldUseIcons()) {
        const icon = getIconFromTaxonomy(rule, taxonomyData, symbolPrefix);
        if (icon) {
            symbol.icon = icon;
            symbol.iconColor = "#ffffff";
            if (Log) Log.debug("[LegendGenerator] Icône taxonomy ajoutée:", icon);
        }
    }

    return symbol;
}

function generateLineSymbol(style: Record<string, unknown>): Record<string, unknown> {
    const stroke = (style.stroke as Record<string, unknown>) || {};
    const casing = (style.casing as Record<string, unknown>) || {};

    const symbol: Record<string, unknown> = {
        type: "line",
        color: (stroke.color as string) || (style.color as string) || "#3388ff",
        width: (stroke.widthPx as number) || (style.weight as number) || 3,
        style: "solid",
    };

    if ((casing.enabled as boolean) && casing.color) {
        symbol.outlineColor = casing.color;
        symbol.outlineWidth = Math.max(0.5, ((casing.widthPx as number) || 1) * 0.4);
        symbol.outlineOpacity = casing.opacity ?? 1;
    }

    if (stroke.opacity !== undefined) {
        symbol.opacity = stroke.opacity;
    }

    const dashArray = (style.dashArray as string) || (stroke.dashArray as string);
    if (dashArray) {
        symbol.dashArray = dashArray;
        if (dashArray === "5, 5" || dashArray === "10, 10") {
            symbol.style = "dashed";
        } else if (dashArray === "1, 3" || dashArray === "2, 4") {
            symbol.style = "dotted";
        }
    }

    return symbol;
}

function generatePolygonSymbol(style: Record<string, unknown>): Record<string, unknown> {
    const fill = (style.fill as Record<string, unknown>) || {};
    const stroke = (style.stroke as Record<string, unknown>) || {};

    const symbol: Record<string, unknown> = {
        type: "polygon",
        fillColor: (style.fillColor as string) || (style.color as string) || (fill.color as string) || "#3388ff",
        color: (style.color as string) || (stroke.color as string) || "#333",
        weight: (style.weight as number) || (stroke.widthPx as number) || 1,
    };

    applyOpacityProperties(symbol, style, ["fillOpacity"]);
    if (fill.opacity !== undefined) {
        symbol.opacity = fill.opacity;
    }
    if (style.opacity !== undefined) {
        symbol.opacity = style.opacity;
    }

    const dashArray = (style.dashArray as string) || (stroke.dashArray as string);
    if (dashArray) {
        symbol.dashArray = dashArray;
    }

    if (style.fillPattern) {
        symbol.fillPattern = style.fillPattern;
    }
    if (style.hatch) {
        symbol.hatch = style.hatch;
    }

    return symbol;
}

const LegendGenerator = {
    generateLegendFromStyle,
    generateLegendItem,
};
export { LegendGenerator };
