// @ts-nocheck — migration TS, typage progressif
"use strict";

/**
 * GeoLeaf UI Content Builder - Text Renderers
 * Renderers : text, longtext, link
 *
 * @module ui/content-builder/renderers-text
 */
import { escapeHtml } from "../../security/index.js";
import { Config } from "../../config/config-primitives.js";
import { resolveField } from "../../utils/general-utils.js";

/**
 * Builds the HTML d'icone de categorie for thes titles.
 * @private
 */
function _buildCategoryIconHtml(options, poi) {
    if (!(options.includeIcon && options.resolveCategoryDisplay)) return "";
    const displayConfig = options.resolveCategoryDisplay(poi);
    if (!displayConfig?.iconId) return "";
    const iconsConfig =
        typeof Config?.getIconsConfig === "function" ? Config.getIconsConfig() : null;
    const iconPrefix = iconsConfig?.symbolPrefix ?? "gl-poi-cat-";
    const iconIdNormalized = String(displayConfig.iconId).trim().toLowerCase().replace(/\s+/g, "-");
    const symbolId = iconPrefix + iconIdNormalized;
    const colorFill = displayConfig.colorFill ?? "#666";
    const colorStroke = displayConfig.colorStroke ?? "#222";
    return (
        '<svg class="gl-poi-popup__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">' +
        '<circle cx="12" cy="12" r="10" fill="' +
        colorFill +
        '" stroke="' +
        colorStroke +
        '" stroke-width="1.5"/>' +
        '<svg x="4" y="4" width="16" height="16" viewBox="0 0 32 32"><use href="#' +
        symbolId +
        '" style="color: #ffffff"/></svg>' +
        "</svg>"
    );
}

/**
 * Builds a element de type "text"
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderText(poi, config, options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null || value === "") return "";
    const escaped = escapeHtml(String(value));
    const variant = config.variant || "default";
    if (variant === "title") {
        return (
            '<h3 class="gl-poi-popup__title">' +
            _buildCategoryIconHtml(options, poi) +
            '<span class="gl-poi-popup__title-text">' +
            escaped +
            "</span></h3>"
        );
    }
    if (variant === "short") return '<p class="gl-poi-popup__desc">' + escaped + "</p>";
    if (variant === "long" || variant === "paragraph")
        return '<p class="gl-poi-popup__desc gl-poi-popup__desc--long">' + escaped + "</p>";
    return '<p class="gl-poi-popup__desc">' + escaped + "</p>";
}

/**
 * Builds a element de type "longtext"
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderLongtext(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null || value === "") return "";

    const escaped = escapeHtml(String(value));
    return (
        '<div class="gl-content__longtext"><p>' + escaped.replace(/\n/g, "</p><p>") + "</p></div>"
    );
}

/**
 * Builds a element de type "link"
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderLink(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null || value === "") return "";

    const label = escapeHtml(config.label || value);
    const variant = config.variant || "default";

    if (variant === "button") {
        return (
            '<a href="' +
            escapeHtml(value) +
            '" target="_blank" rel="noopener noreferrer" class="gl-content__link gl-content__link--button">' +
            label +
            "</a>"
        );
    }

    return (
        '<a href="' +
        escapeHtml(value) +
        '" target="_blank" rel="noopener noreferrer" class="gl-content__link">' +
        label +
        "</a>"
    );
}

export { renderText, renderLongtext, renderLink };
