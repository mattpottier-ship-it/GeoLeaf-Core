// @ts-nocheck — migration TS, typage progressif
"use strict";

/**
 * GeoLeaf Content Builder - Primitives
 * Helpers de base : buildClassAttr, buildStyleAttr, buildLabel, wrapInParagraph, wrapInDiv.
 *
 * @module ui/content-builder/templates-primitives
 */

/**
 * Builds a attribut HTML class="..." avec classes de base et personnalisees.
 * @param {string} baseClass
 * @param {string} [customClass]
 * @returns {string}
 */
function buildClassAttr(baseClass, customClass) {
    const classes = [baseClass];
    if (customClass) classes.push(customClass);
    return ' class="' + classes.join(" ") + '"';
}

/**
 * Builds a attribut HTML style="..." si un style est fourni.
 * @param {string} [style]
 * @returns {string}
 */
function buildStyleAttr(style) {
    return style ? ' style="' + style + '"' : "";
}

/**
 * Builds a label HTML <strong>Label:</strong>.
 * @param {string} label
 * @param {Function} escapeHtml
 * @param {string} [_icon]
 * @returns {string}
 */
function buildLabel(label, escapeHtml, _icon) {
    if (!label) return "";
    return "<strong>" + escapeHtml(label) + ":</strong> ";
}

/**
 * Enveloppe du contenu HTML dans un paragraph <p> avec classes.
 * @param {string} content
 * @param {string} className
 * @param {string} [customClass]
 * @returns {string}
 */
function wrapInParagraph(content, className, customClass) {
    return "<p" + buildClassAttr(className, customClass) + ">" + content + "</p>";
}

/**
 * Enveloppe du contenu HTML dans un div <div> avec classes.
 * @param {string} content
 * @param {string} className
 * @param {string} [customClass]
 * @returns {string}
 */
function wrapInDiv(content, className, customClass) {
    return "<div" + buildClassAttr(className, customClass) + ">" + content + "</div>";
}

export { buildClassAttr, buildStyleAttr, buildLabel, wrapInParagraph, wrapInDiv };
