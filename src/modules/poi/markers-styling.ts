/* eslint-disable security/detect-object-injection */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Markers Styling
 * Resolution des colors et configuration d'display par category
 */
import { Log } from "../log/index.js";
import { Config } from "../config/config-primitives.js";
import { POIShared } from "./shared.ts";
import { StyleResolver } from "../helpers/style-resolver.ts";
import { getPoiBaseConfig } from "./markers-config.ts";

// ── Tiny generic helper (no CC cost vs ?? chains) ────────────────────────────
function _firstVal(...args: unknown[]): unknown {
    for (const a of args) if (a !== null && a !== undefined) return a;
    return undefined;
}

// ── Category/subcategory ID resolution ───────────────────────────────────────

function _resolveCategoryId(poi: any): any {
    const attrs = poi.attributes;
    const props = poi.properties;
    return _firstVal(
        poi.categoryId,
        poi.category,
        attrs?.categoryId,
        props?.categoryId,
        props?.category
    );
}

function _resolveSubCategoryId(poi: any): any {
    const attrs = poi.attributes;
    const props = poi.properties;
    return _firstVal(
        poi.subCategoryId,
        poi.subCategory,
        poi.sub_category,
        attrs?.subCategoryId,
        props?.subCategoryId,
        props?.sub_category
    );
}

/** Casee-insensitive lookup of a category key in the categories config object. */
function _resolveCatKey(id: any, categoriesConfig: any): string | null {
    if (!id || !categoriesConfig) return null;
    if (categoriesConfig[id]) return id;
    const upper = String(id).toUpperCase();
    if (categoriesConfig[upper]) return upper;
    const lower = String(id).toLowerCase();
    if (categoriesConfig[lower]) return lower;
    return Object.keys(categoriesConfig).find((k: string) => k.toLowerCase() === lower) || null;
}

/** Resolve icon ID from category (+ optional subcategory) config entry. */
function _resolveIconId(
    categoriesConfig: any,
    resolvedCatKey: string,
    subCategoryId: any
): string | null {
    const cat = categoriesConfig[resolvedCatKey];
    if (subCategoryId && cat?.subcategories) {
        const subs = cat.subcategories;
        const lower = String(subCategoryId).toLowerCase();
        const subCat =
            subs[subCategoryId] || subs[String(subCategoryId).toUpperCase()] || subs[lower];
        if (subCat)
            return _firstVal(subCat.icon, subCat.iconId, cat.icon, cat.iconId, null) as
                | string
                | null;
    }
    return _firstVal(cat?.icon, cat?.iconId, null) as string | null;
}

/** Log a warning when a requested category key is not found in the taxonomy. */
function _warnUnknownCategory(categoryId: any): void {
    if (categoryId && categoryId !== "undefined" && categoryId !== "null" && Log)
        Log.warn(
            `[POI] resolveCategoryDisplay() : Category '${categoryId}' not found in taxonomy.`
        );
}

// ── Layer-style colour application helpers ───────────────────────────────────

function _applyLayerStyleColors(colors: any, layerStyle: any): void {
    if (layerStyle.fillColor) colors.colorFill = layerStyle.fillColor;
    if (layerStyle.color) colors.colorStroke = layerStyle.color;
    if (typeof layerStyle.weight === "number") colors.weight = layerStyle.weight;
    if (typeof layerStyle.radius === "number") colors.radius = layerStyle.radius;
    if (typeof layerStyle.fillOpacity === "number") colors.fillOpacity = layerStyle.fillOpacity;
    if (typeof layerStyle.opacity === "number") colors.opacity = layerStyle.opacity;
}

function _applyStyleResolverColors(colors: any, poi: any): void {
    if (!StyleResolver) return;
    const styleColors = StyleResolver.resolvePoiColors(poi);
    if (styleColors.colorFill) colors.colorFill = styleColors.colorFill;
    if (styleColors.colorStroke) colors.colorStroke = styleColors.colorStroke;
    if (styleColors.colorRoute) colors.colorRoute = styleColors.colorRoute;
}

/**
 * Resolves les colors of a POI from category.style.json of the profile active.
 * Ordre de priority des colors :
 * 1. Style de the layer (poi._layerConfig.style)
 * 2. Style de category (category.style.json)
 * 3. Style by default (baseConfig)
 *
 * @param {object} poi - Data du POI.
 * @param {object} baseConfig - Configuration de base avec colors by default
 * @returns {object} { colorFill, colorStroke, colorRoute, weight, radius, fillOpacity, opacity }
 */
function resolveCategoryColors(poi: any, baseConfig: any) {
    const colors: any = {
        colorFill: baseConfig.colorFill,
        colorStroke: baseConfig.colorStroke,
        colorRoute: null,
        weight: baseConfig.weight,
        radius: baseConfig.radius,
        fillOpacity: baseConfig.fillOpacity !== undefined ? baseConfig.fillOpacity : null,
        opacity: baseConfig.opacity !== undefined ? baseConfig.opacity : null,
    };
    if (poi._layerConfig && poi._layerConfig.style)
        _applyLayerStyleColors(colors, poi._layerConfig.style);
    _applyStyleResolverColors(colors, poi);
    return colors;
}

/**
 * Resolves l'display of a POI (icon + colors) from the taxonomy et category.style.json of the profile active.
 * Ordre de priority des styles :
 * 1. Style de the layer (poi._layerConfig.style) for thes colors
 * 2. Style de category (category.style.json) for thes colors
 * 3. Taxonomie for thes icons
 * 4. Style by default (baseConfig)
 *
 * @param {object} poi - Data du POI.
 * @returns {object} Configuration d'display { useIcon, iconId, colorFill, colorStroke, weight, radius, fillOpacity, opacity }.
 */
function resolveCategoryDisplay(poi: any) {
    const ConfigAny = Config as any;
    const categoriesConfig = ConfigAny.getCategories?.() ?? {};
    const shared = POIShared;
    const poiConfig = shared ? shared.state.poiConfig : {};
    const showIconsOnMap = poiConfig.showIconsOnMap !== false;
    const baseConfig = getPoiBaseConfig();
    const colors = resolveCategoryColors(poi, baseConfig);

    const result: any = {
        useIcon: false,
        iconId: null,
        colorFill: colors.colorFill,
        colorStroke: colors.colorStroke,
        colorRoute: colors.colorRoute,
        weight: colors.weight,
        radius: colors.radius,
        fillOpacity: colors.fillOpacity,
        opacity: colors.opacity,
    };

    if (showIconsOnMap) {
        try {
            const iconsConfig = ConfigAny.getIconsConfig?.() ?? null;
            if (iconsConfig && iconsConfig.showOnMap !== false) result.useIcon = true;
        } catch (_e) {
            /* fallback: showIconsOnMap remains true */
        }
    }

    const categoryId = _resolveCategoryId(poi);
    const subCategoryId = _resolveSubCategoryId(poi);
    const resolvedCatKey = _resolveCatKey(categoryId, categoriesConfig);

    if (resolvedCatKey) {
        result.iconId = _resolveIconId(categoriesConfig, resolvedCatKey, subCategoryId);
    } else {
        _warnUnknownCategory(categoryId);
    }

    return result;
}

export { resolveCategoryDisplay };
