/* eslint-disable security/detect-object-injection */
// @ts-nocheck — migration TS, typage progressif
"use strict";

/**
 * GeoLeaf UI Content Builder - Visual Renderers
 * Renderers : badge, image
 *
 * @module ui/content-builder/renderers-visual
 */
import { escapeHtml, validateUrl } from "../../security/index.js";
import { resolveField, getLog, getActiveProfile } from "../../utils/general-utils.js";
import { getColorsFromLayerStyle } from "../../helpers/style-resolver.js";

function _resolveBadgeLabel(taxonomy, config, value, attrs) {
    if (!taxonomy || !config.field) return value;
    if (config.field.includes("categoryId") && !config.field.includes("subCategoryId")) {
        const catData = taxonomy.categories?.[value];
        if (catData?.label) return catData.label;
        return value;
    }
    if (!config.field.includes("subCategoryId")) return value;
    const catId = attrs.categoryId || attrs.category;
    const catData = taxonomy.categories?.[catId];
    const subCatData = catData?.subcategories?.[value];
    if (subCatData?.label) return subCatData.label;
    return value;
}

function _resolveBadgeColors(
    poi,
    config
): { fillColor: string | null; strokeColor: string | null } {
    let fillColor: string | null = null;
    let strokeColor: string | null = null;
    if (poi._layerConfig?.style) {
        if (poi._layerConfig.style.fillColor) fillColor = poi._layerConfig.style.fillColor;
        if (poi._layerConfig.style.color) strokeColor = poi._layerConfig.style.color;
    }
    if (getColorsFromLayerStyle && poi._layerConfig) {
        const styleColors = getColorsFromLayerStyle(poi, poi._layerConfig.id);
        if (styleColors?.fillColor) fillColor = styleColors.fillColor;
        if (styleColors?.color) strokeColor = styleColors.color;
    }
    void config;
    return { fillColor, strokeColor };
}

function _isCategoryField(field: string): boolean {
    if (field.includes("categoryId")) return true;
    if (field.includes("subCategoryId")) return true;
    return false;
}

/**
 * Builds a element de type "badge"
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function _buildBadgeStyle(poi: any, config: any, taxonomy: any): string {
    if (!taxonomy) return "";
    if (!config.field) return "";
    if (!_isCategoryField(config.field)) return "";
    const { fillColor, strokeColor } = _resolveBadgeColors(poi, config);
    let style = "";
    if (fillColor) style += "background-color: " + fillColor + ";";
    if (strokeColor) style += "border-color: " + strokeColor + ";";
    return style;
}

function renderBadge(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null || value === "") return "";
    const profile = getActiveProfile();
    const taxonomy = profile?.taxonomy;
    const variant = config.variant || "default";
    const attrs = poi.attributes || {};
    const displayValue = _resolveBadgeLabel(taxonomy, config, value, attrs);
    const style = _buildBadgeStyle(poi, config, taxonomy);
    const escaped = escapeHtml(String(displayValue));
    const badgeClass = "gl-poi-badge gl-poi-badge--" + variant;
    return (
        '<span class="' +
        badgeClass +
        '"' +
        (style ? ' style="' + style + '"' : "") +
        ">" +
        escaped +
        "</span>"
    );
}

/**
 * Builds a element de type "image"
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderImage(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null || value === "") return "";

    let photoUrl = null;
    try {
        photoUrl = validateUrl(value);
    } catch (e) {
        getLog().warn("[ContentBuilder.Shared] URL image invalide:", e.message);
        return "";
    }

    if (!photoUrl) return "";

    const alt = escapeHtml(config.label || "Image");

    return (
        '<div class="gl-poi-popup__photo"><img src="' +
        photoUrl +
        '" alt="' +
        alt +
        '" loading="lazy" /></div>'
    );
}

export { renderBadge, renderImage };
