// @ts-nocheck — migration TS, typage progressif
"use strict";

/**
 * GeoLeaf UI Content Builder - Numeric Renderers
 * Renderers : number, metric, rating
 *
 * @module ui/content-builder/renderers-numeric
 */
import { escapeHtml } from "../../security/index.js";
import { resolveField } from "../../utils/general-utils.js";
import { formatNumber } from "../../utils/formatters.js";

function _formatNumberHtml(numValue: number, config: any): string {
    const formatted = numValue.toLocaleString("fr-FR");
    const label = config.label ? escapeHtml(config.label) : "";
    const variant = config.variant || "default";

    if (variant === "stat") {
        return (
            '<div class="gl-content__stat">' +
            (label ? '<span class="gl-content__stat-label">' + label + "</span>" : "") +
            '<span class="gl-content__stat-value">' +
            formatted +
            "</span>" +
            "</div>"
        );
    }

    return (
        '<p class="gl-content__number">' +
        (label ? "<strong>" + label + ":</strong> " : "") +
        formatted +
        "</p>"
    );
}

/**
 * Builds a element de type "number"
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderNumber(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null || value === "") return "";

    const numValue = Number(value);
    if (isNaN(numValue)) return "";

    if (formatNumber) return formatNumber(numValue);
    return _formatNumberHtml(numValue, config);
}

/**
 * Builds a element de type "metric" (KPI, statistiques avec suffix/prefixe)
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {string} [config.field] - Path du field
 * @param {string} [config.label] - Label optional
 * @param {string} [config.prefix] - Prefixe (ex: "+", "-")
 * @param {string} [config.suffix] - Suffixe (ex: "%", "€", " km²")
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderMetric(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null || value === "") return "";

    const numValue = typeof value === "number" ? value : parseFloat(value);
    if (isNaN(numValue)) return "";

    const formatted = numValue.toLocaleString("fr-FR");
    const label = config.label ? escapeHtml(config.label) : "";
    const suffix = config.suffix ? escapeHtml(config.suffix) : "";
    const prefix = config.prefix ? escapeHtml(config.prefix) : "";

    return (
        '<p class="gl-content__metric">' +
        (label ? "<strong>" + label + ":</strong> " : "") +
        prefix +
        formatted +
        suffix +
        "</p>"
    );
}

function _buildStarsHtml(rating: number): string {
    let html = '<span class="gl-rating__stars">';
    for (let i = 1; i <= 5; i++) {
        const cls = i <= Math.round(rating) ? " gl-rating__star--filled" : "";
        html += '<span class="gl-rating__star' + cls + '">\u2605</span>';
    }
    return html + "</span>";
}

/**
 * Builds a element de type "rating" (note avec etoiles)
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderRating(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null || value === "") return "";

    const rating = typeof value === "number" ? value : parseFloat(value);
    if (isNaN(rating)) return "";

    const label = config.label ? escapeHtml(config.label) : "";
    const variant = config.variant || "default";

    const starsHtml = _buildStarsHtml(rating);
    const numericValue = rating.toFixed(1);

    if (variant === "stat") {
        return (
            '<div class="gl-rating gl-rating--stat">' +
            (label ? '<span class="gl-rating__label">' + label + "</span>" : "") +
            '<div class="gl-rating__content">' +
            starsHtml +
            '<span class="gl-rating__value">' +
            numericValue +
            "/5</span>" +
            "</div>" +
            "</div>"
        );
    }

    return (
        '<div class="gl-rating">' +
        (label ? '<span class="gl-rating__label">' + label + ": </span>" : "") +
        starsHtml +
        '<span class="gl-rating__value">' +
        numericValue +
        "/5</span>" +
        "</div>"
    );
}

export { renderNumber, renderMetric, renderRating };
