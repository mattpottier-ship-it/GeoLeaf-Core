// @ts-nocheck — migration TS, typage progressif
"use strict";

/**
 * GeoLeaf UI Content Builder - Collection Renderers
 * Renderers : list, table, tags, gallery, reviews
 *
 * @module ui/content-builder/renderers-collection
 */
import { escapeHtml } from "../../security/index.js";
import { resolveField } from "../../utils/general-utils.js";

/**
 * Builds a element de type "list"
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderList(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null) return "";

    const variant = config.variant || "disc";
    let items = [];

    if (Array.isArray(value)) {
        items = value;
    } else if (typeof value === "object") {
        // Object cle-value (ex: price)
        items = Object.entries(value).map(([k, v]) => k + ": " + v);
    } else {
        return "";
    }

    if (items.length === 0) return "";

    const listClass = "gl-content__list gl-content__list--" + variant;
    let html = '<ul class="' + listClass + '">';
    items.forEach((item) => {
        html += "<li>" + escapeHtml(String(item)) + "</li>";
    });
    html += "</ul>";

    return html;
}

/** @private Builds the opening <table> tag with borders and style. */
function _buildTableOpenTag(config) {
    const borders = config.borders || {};
    const styleAttr = borders.color
        ? ' style="--gl-table-border-color: ' + borders.color + ';"'
        : "";
    let cls = "gl-content__table";
    if (borders.outer) cls += " gl-content__table--border-outer";
    if (borders.row) cls += " gl-content__table--border-row";
    if (borders.column) cls += " gl-content__table--border-column";
    return '<table class="' + cls + '"' + styleAttr + ">";
}

/** @private Builds the <thead> element for a table. */
function _buildTableHead(columns) {
    let html = "<thead><tr>";
    columns.forEach((col) => {
        html += "<th>" + escapeHtml(col.label || col.key) + "</th>";
    });
    return html + "</tr></thead>";
}

/** @private Builds the <tbody> element for a table. */
function _buildTableBody(value, columns) {
    let html = "<tbody>";
    value.forEach((row) => {
        html += "<tr>";
        columns.forEach((col) => {
            const cellValue = typeof row === "object" ? row[col.key] || "" : row;
            html += "<td>" + escapeHtml(String(cellValue)) + "</td>";
        });
        html += "</tr>";
    });
    return html + "</tbody></table>";
}

/**
 * Builds a element de type "table"
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderTable(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null || !Array.isArray(value) || value.length === 0) return "";
    const columns = config.columns || [];
    if (columns.length === 0) return "";
    return _buildTableOpenTag(config) + _buildTableHead(columns) + _buildTableBody(value, columns);
}

/**
 * Builds a element de type "tags"
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderTags(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null || !Array.isArray(value) || value.length === 0) return "";

    let html = '<div class="gl-content__tags">';
    value.forEach((tag) => {
        if (tag && typeof tag === "string") {
            html += '<span class="gl-content__tag">' + escapeHtml(tag) + "</span>";
        }
    });
    html += "</div>";

    return html;
}

/**
 * Builds a element de type "gallery"
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderGallery(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null || !Array.isArray(value) || value.length === 0) return "";

    let html = '<div class="gl-content__gallery">';
    value.forEach((imgUrl, index) => {
        if (imgUrl && typeof imgUrl === "string") {
            html +=
                '<div class="gl-content__gallery-item" data-index="' +
                index +
                '">' +
                '<img src="' +
                escapeHtml(imgUrl) +
                '" alt="Image ' +
                (index + 1) +
                '" loading="lazy" />' +
                "</div>";
        }
    });
    html += "</div>";

    return html;
}

/** @private Renders the star rating sub-block of a review. */
function _renderReviewRating(review) {
    if (review.rating === undefined) return "";
    const rating = parseFloat(review.rating) || 0;
    let html = '<div class="gl-content__review-rating">';
    for (let i = 1; i <= 5; i++) {
        html +=
            '<span class="gl-content__review-star' +
            (i <= rating ? " gl-content__review-star--filled" : "") +
            '">\u2605</span>';
    }
    return html + "</div>";
}

/** @private Renders the author/date meta sub-block of a review. */
function _renderReviewMeta(review, escapeHtml) {
    const reviewAuthor = review.author || review.authorName;
    const reviewDate = review.date || review.createdAt;
    if (!(reviewAuthor || reviewDate)) return "";
    let html = '<div class="gl-content__review-meta">';
    if (reviewAuthor) {
        const verifiedMark = review.verified
            ? ' <span class="gl-content__review-verified">\u2714</span>'
            : "";
        html +=
            '<span class="gl-content__review-author">' +
            escapeHtml(reviewAuthor) +
            verifiedMark +
            "</span>";
    }
    if (reviewDate) {
        html += '<span class="gl-content__review-date">' + escapeHtml(reviewDate) + "</span>";
    }
    return html + "</div>";
}

/** @private Renders a single review item. */
function _renderSingleReview(review, escapeHtml) {
    if (!review) return "";
    let html = '<div class="gl-content__review">';
    html += _renderReviewRating(review);
    if (review.text || review.comment) {
        html +=
            '<p class="gl-content__review-text">' +
            escapeHtml(review.text || review.comment) +
            "</p>";
    }
    html += _renderReviewMeta(review, escapeHtml);
    return html + "</div>";
}

/**
 * Builds a element de type "reviews"
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderReviews(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null || !Array.isArray(value) || value.length === 0) return "";

    let html = '<div class="gl-content__reviews">';
    value.forEach((review) => {
        html += _renderSingleReview(review, escapeHtml);
    });
    html += "</div>";

    return html;
}

export { renderList, renderTable, renderTags, renderGallery, renderReviews };
