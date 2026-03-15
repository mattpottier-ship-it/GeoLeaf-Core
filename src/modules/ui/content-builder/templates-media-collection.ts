/* eslint-disable security/detect-object-injection */
// @ts-nocheck — migration TS, typage progressif
"use strict";

/**
 * GeoLeaf Content Builder - Media & Collection Template Builders
 * Builders : createImageElement, createListElement, createTableElement,
 *            createTag, createTagsElement, createCoordinatesElement, createGalleryElement
 *
 * @module ui/content-builder/templates-media-collection
 */
import { CSS_CLASSES } from "./templates-css-classes.js";
import { buildClassAttr, wrapInParagraph, wrapInDiv } from "./templates-primitives.js";

/**
 * Cree un element image <img> avec class et alt.
 * @param {string} src
 * @param {Object} config
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createImageElement(src, config, escapeHtml) {
    const alt = config.alt ? escapeHtml(config.alt) : "";
    const classAttr = buildClassAttr(CSS_CLASSES.image, config.className);
    return "<img" + classAttr + ' src="' + escapeHtml(src) + '" alt="' + alt + '">';
}

/**
 * Cree un element list <ul> avec items.
 * @param {Array} items
 * @param {Object} config
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createListElement(items, config, escapeHtml) {
    const label = config.label ? "<p><strong>" + escapeHtml(config.label) + "</strong></p>" : "";
    let list = "<ul>";
    items.forEach((item) => {
        list += "<li>" + escapeHtml(String(item)) + "</li>";
    });
    list += "</ul>";
    const content = label + list;
    return wrapInDiv(content, CSS_CLASSES.list, config.className);
}

/**
 * Cree un element table <table> a partir d'an object cle/value.
 * @param {Object} data
 * @param {Object} config
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createTableElement(data, config, escapeHtml) {
    const label = config.label ? "<p><strong>" + escapeHtml(config.label) + "</strong></p>" : "";
    let table = "<table><tbody>";

    Object.keys(data).forEach((key) => {
        const keyLabel = escapeHtml(String(key));
        const value = escapeHtml(String(data[key]));
        table += "<tr><th>" + keyLabel + "</th><td>" + value + "</td></tr>";
    });

    table += "</tbody></table>";
    const content = label + table;
    return wrapInDiv(content, CSS_CLASSES.table, config.className);
}

/**
 * Cree un tag <span> unique.
 * @param {string|number} tag
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createTag(tag, escapeHtml) {
    return '<span class="' + CSS_CLASSES.tag + '">' + escapeHtml(String(tag)) + "</span>";
}

/**
 * Cree un element cloud de tags <div> avec plusieurs tags.
 * @param {Array} tags
 * @param {Object} config
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createTagsElement(tags, config, escapeHtml) {
    let content = "";
    tags.forEach((tag) => {
        content += createTag(tag, escapeHtml) + " ";
    });
    return wrapInDiv(content.trim(), CSS_CLASSES.tags, config.className);
}

/**
 * Cree un element coordonnees <p> with thet, lng.
 * @param {number} lat
 * @param {number} lng
 * @param {Object} config
 * @param {Function} _escapeHtml
 * @returns {string}
 */
function createCoordinatesElement(lat, lng, config, _escapeHtml) {
    const latFixed = lat.toFixed(6);
    const lngFixed = lng.toFixed(6);
    const content = "<strong>Coordonn\u00e9es:</strong> " + latFixed + ", " + lngFixed;
    return wrapInParagraph(content, CSS_CLASSES.coordinates, config.className);
}

/**
 * Cree un element gallery <div> avec plusieurs images.
 * @param {Array<string>} photos
 * @param {Object} config
 * @param {Function} escapeHtml
 * @returns {string}
 */
function createGalleryElement(photos, config, escapeHtml) {
    let gallery = "";
    photos.forEach((photo) => {
        gallery += '<img src="' + escapeHtml(photo) + '" alt="Photo">';
    });
    return wrapInDiv(gallery, CSS_CLASSES.gallery, config.className);
}

export {
    createImageElement,
    createListElement,
    createTableElement,
    createTag,
    createTagsElement,
    createCoordinatesElement,
    createGalleryElement,
};
