// @ts-nocheck — migration TS, typage progressif
"use strict";

/**
 * GeoLeaf Content Builder - Text & Metric Template Builders
 * Builders : createTextElement, createLongtextElement, createNumberElement,
 *            createMetricElement, createBadge, createStar, createRatingElement, createLinkElement
 *
 * @module ui/content-builder/templates-text-metric
 */
import { CSS_CLASSES } from "./templates-css-classes.js";
import { buildStyleAttr, buildLabel, wrapInParagraph, wrapInDiv } from "./templates-primitives.js";

/**
 * Cree un element de text simple <p> with thebel optional.
 * @param {string} value
 * @param {Object} config
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createTextElement(value, config, escapeHtml) {
    const label = buildLabel(config.label, escapeHtml);
    const content = label + escapeHtml(value);
    return wrapInParagraph(content, CSS_CLASSES.text, config.className);
}

/**
 * Cree un element de text long <div> with thebel separe.
 * @param {string} value
 * @param {Object} config
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createLongtextElement(value, config, escapeHtml) {
    const label = config.label ? "<p><strong>" + escapeHtml(config.label) + "</strong></p>" : "";
    const content = label + "<p>" + escapeHtml(value) + "</p>";
    return wrapInDiv(content, CSS_CLASSES.longtext, config.className);
}

/**
 * Cree un element numerique <p> avec formatage locale FR.
 * @param {number} value
 * @param {Object} config
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createNumberElement(value, config, escapeHtml) {
    const formatted = value.toLocaleString("fr-FR");
    const label = buildLabel(config.label, escapeHtml);
    const suffix = config.suffix ? " " + escapeHtml(config.suffix) : "";
    const prefix = config.prefix ? escapeHtml(config.prefix) + " " : "";
    const content = label + prefix + formatted + suffix;
    return wrapInParagraph(content, CSS_CLASSES.number, config.className);
}

/**
 * Cree un element metrique <p> avec formatage (similaire a number).
 * @param {number} value
 * @param {Object} config
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createMetricElement(value, config, escapeHtml) {
    const formatted = value.toLocaleString("fr-FR");
    const label = buildLabel(config.label, escapeHtml);
    const suffix = config.suffix ? escapeHtml(config.suffix) : "";
    const prefix = config.prefix ? escapeHtml(config.prefix) : "";
    const content = label + prefix + formatted + suffix;
    return wrapInParagraph(content, CSS_CLASSES.metric, config.className);
}

/**
 * Cree un badge <span> avec variante et style inline.
 * @param {string} value
 * @param {string} [variant='default']
 * @param {string} [style]
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createBadge(value, variant, style, escapeHtml) {
    variant = variant || "default";
    const badgeClass =
        CSS_CLASSES.badge +
        " " +
        CSS_CLASSES["badge" + variant.charAt(0).toUpperCase() + variant.slice(1)];
    const styleAttr = buildStyleAttr(style);
    return '<span class="' + badgeClass + '"' + styleAttr + ">" + escapeHtml(value) + "</span>";
}

/**
 * Cree une etoile <span> de notation avec class CSS.
 * @param {string} type - 'full', 'half', 'empty'
 * @returns {string}
 */
function createStar(type) {
    const starClass =
        CSS_CLASSES.star + " " + CSS_CLASSES["star" + type.charAt(0).toUpperCase() + type.slice(1)];
    return '<span class="' + starClass + '">\u2605</span>';
}

/**
 * Cree un element de notation <div> avec etoiles (0-5).
 * @param {number} rating
 * @param {Object} config
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createRatingElement(rating, config, escapeHtml) {
    let stars = "";
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
        stars += createStar("full");
    }
    if (hasHalfStar) {
        stars += createStar("half");
    }
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        stars += createStar("empty");
    }

    const ratingText = " (" + rating.toFixed(1) + "/5)";
    const label = buildLabel(config.label, escapeHtml);
    const content = label + stars + ratingText;
    return wrapInDiv(content, CSS_CLASSES.rating, config.className);
}

/**
 * Cree un element link <a> avec target="_blank" et securite.
 * @param {string} href
 * @param {Object} config
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createLinkElement(href, config, escapeHtml) {
    const text = config.text ? escapeHtml(config.text) : escapeHtml(href);
    const label = buildLabel(config.label, escapeHtml);
    const link =
        '<a href="' +
        escapeHtml(href) +
        '" target="_blank" rel="noopener noreferrer">' +
        text +
        "</a>";
    const content = label + link;
    return wrapInParagraph(content, CSS_CLASSES.link, config.className);
}

export {
    createTextElement,
    createLongtextElement,
    createNumberElement,
    createMetricElement,
    createBadge,
    createStar,
    createRatingElement,
    createLinkElement,
};
