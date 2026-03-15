// @ts-nocheck — migration TS, typage progressif
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Content Builder - Templates Module
 * Orchestrateur — importe et re-exporte tous les template builders.
 *
 * @module ui/content-builder/templates
 * @version 2.0.0
 * @phase Phase 3 - UI Refactoring
 */
import { CSS_CLASSES } from "./templates-css-classes.js";
import {
    buildClassAttr,
    buildStyleAttr,
    buildLabel,
    wrapInParagraph,
    wrapInDiv,
} from "./templates-primitives.js";
import {
    createTextElement,
    createLongtextElement,
    createNumberElement,
    createMetricElement,
    createBadge,
    createStar,
    createRatingElement,
    createLinkElement,
} from "./templates-text-metric.js";
import {
    createImageElement,
    createListElement,
    createTableElement,
    createTag,
    createTagsElement,
    createCoordinatesElement,
    createGalleryElement,
} from "./templates-media-collection.js";

// ========================================
//   EXPORT
// ========================================

const Templates = {
    // Classes CSS
    CSS_CLASSES,

    // Helpers de base
    buildClassAttr,
    buildStyleAttr,
    buildLabel,
    wrapInParagraph,
    wrapInDiv,

    // Template builders
    createTextElement,
    createLongtextElement,
    createNumberElement,
    createMetricElement,
    createBadge,
    createStar,
    createRatingElement,
    createImageElement,
    createLinkElement,
    createListElement,
    createTableElement,
    createTag,
    createTagsElement,
    createCoordinatesElement,
    createGalleryElement,
};

export { Templates };
