// @ts-nocheck — migration TS, typage progressif
"use strict";

/**
 * GeoLeaf UI Content Builder - Shared Renderers
 * Orchestrateur — importe et re-exporte tous les renderers individuels.
 *
 * @module ui/content-builder/renderers-shared
 * @version 2.1.0
 * @phase Phase 3 - UI Refactoring
 */
import { escapeHtml } from "../../security/index.js";
import { resolveField, getLog, getActiveProfile } from "../../utils/general-utils.js";
import { renderText, renderLongtext, renderLink } from "./renderers-text.js";
import { renderNumber, renderMetric, renderRating } from "./renderers-numeric.js";
import { renderBadge, renderImage } from "./renderers-visual.js";
import {
    renderList,
    renderTable,
    renderTags,
    renderGallery,
    renderReviews,
} from "./renderers-collection.js";
import { renderCoordinates } from "./renderers-geo.js";

// ========================================
//   UTILITAIRES DE DEPENDANCES
// ========================================

/**
 * Phase 4 dedup: resolveField direct import wrapper
 * @returns {Function}
 */
function getResolveField() {
    return resolveField;
}

/**
 * Phase 4 dedup: escapeHtml direct import wrapper
 * @returns {Function}
 */
function getEscapeHtml() {
    return escapeHtml;
}

// ========================================
//   REGISTRE DES RENDERERS
// ========================================

const RENDERERS = {
    text: renderText,
    longtext: renderLongtext,
    number: renderNumber,
    metric: renderMetric,
    rating: renderRating,
    badge: renderBadge,
    image: renderImage,
    link: renderLink,
    list: renderList,
    table: renderTable,
    tags: renderTags,
    coordinates: renderCoordinates,
    gallery: renderGallery,
    reviews: renderReviews,
};

/**
 * Rend un element selon son type
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderItem(poi, config, options = {}) {
    if (!config || !config.type) return "";

    const renderer = RENDERERS[config.type];
    if (!renderer) {
        getLog().warn("[ContentBuilder.Shared] Unsupported render type:", config.type);
        return "";
    }

    return renderer(poi, config, options);
}

// ========================================
//   EXPORT
// ========================================

const ContentBuilderShared = {
    // Renderers individuels
    renderText,
    renderLongtext,
    renderNumber,
    renderMetric,
    renderRating,
    renderBadge,
    renderImage,
    renderLink,
    renderList,
    renderTable,
    renderTags,
    renderCoordinates,
    renderGallery,
    renderReviews,
    renderItem,

    // Utilitaires
    getResolveField,
    getEscapeHtml,
    getActiveProfile,
    getLog,
};

if (getLog().debug) {
    getLog().debug("[ContentBuilder.Shared] Renderers partages charges");
}

export { ContentBuilderShared };
