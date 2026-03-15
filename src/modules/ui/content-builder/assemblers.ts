/* eslint-disable security/detect-object-injection */
// @ts-nocheck — migration TS, typage progressif
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */
"use strict";

/**
 * GeoLeaf Content Builder - Assemblers Module
 *
 * Gère l'assemblage des éléments de contenu en structures complètes
 * for thes popups (detailPopup), tooltips (contentUnion) et panneaux latéraux (items).
 *
 * Organisation:
 * - Helpers: getCore, getRenderers, getResolveField, getEscapeHtml, etc.
 * - Assembleurs: buildPopupHTML, buildTooltipHTML, buildPanelItems
 *
 * @module ui/content-builder/assemblers
 * @author Assistant
 * @version 1.0.0
 * @since 2026-01-18 (Sprint 4.5 - Modularisation)
 *
 * @example
 * // Import des assembleurs
 * const Assemblers = GeoLeaf._ContentBuilder.Assemblers;
 *
 * @example
 * // Building of a popup complete
 * const popupHtml = Assemblers.buildPopupHTML(poi, config, options);
 *
 * @example
 * // Building of a tooltip
 * const tooltipHtml = Assemblers.buildTooltipHTML(poi, contentUnion);
 */

import { escapeHtml } from "../../security/index.js";
import {
    resolveField,
    compareByOrder,
    getLog,
    getActiveProfile,
} from "../../utils/general-utils.js";
import { Helpers } from "./helpers.ts";
import { ContentBuilderCore } from "./core.ts";
import { ContentBuilderShared } from "./renderers-shared.ts";

// ========================================
//   ACCÈS AUX MODULES
// ========================================

/**
 * Get Helpers module (centralized utilities)
 * @returns {Object}
 */
function getHelpers() {
    return Helpers || {};
}

function _getCore() {
    return ContentBuilderCore || null;
}

function getRenderers() {
    return ContentBuilderShared || {};
}

// Phase 4 dedup: direct imports for resolveField, escapeHtml
function getResolveField() {
    return resolveField;
}

function getEscapeHtml() {
    return escapeHtml;
}

// getActiveProfile and getLog imported from general-utils.js (Phase 4 dedup)

function renderItem(poi, config, options = {}) {
    const renderers = getRenderers();
    if (renderers && renderers.renderItem) {
        return renderers.renderItem(poi, config, options);
    }
    return "";
}

// ========================================
//   ASSEMBLEURS
// ========================================

// ========================================
//   BUILD POPUP HTML
// ========================================

/**
 * Group popup sections by type (hero images, badges, other)
 * Extracted from buildPopupHTML to reduce complexity
 *
 * @private
 * @param {Array<Object>} sortedConfig - Sorted config array
 * @param {Object} poi - POI data
 * @param {Object} renderOptions - Render options
 * @returns {Array<{type: string, html?: string, items?: Array<string>}>} Groupd sections
 *
 * @typedef {Object} PopupSection
 * @property {'hero'|'badges'|'content'} type - Section type
 * @property {string} [html] - HTML content for hero/content sections
 * @property {Array<string>} [items] - Badge HTML items for badges section
 */
function groupPopupSections(sortedConfig, poi, renderOptions) {
    const sections = [];
    let badgeGroup = [];
    // ...logs [POPUP] supprimés...
    sortedConfig.forEach((item, index) => {
        const isHeroImage = item.type === "image" && item.variant === "hero";
        const isBadge = item.type === "badge";
        const nextItem = sortedConfig[index + 1];
        const nextIsBadge = nextItem && nextItem.type === "badge";
        const itemHtml = renderItem(poi, item, renderOptions);
        if (isHeroImage) {
            sections.push({ type: "hero", html: itemHtml });
        } else if (isBadge) {
            badgeGroup.push(itemHtml);
            if (!nextIsBadge) {
                sections.push({ type: "badges", items: [...badgeGroup] });
                badgeGroup = [];
            }
        } else {
            sections.push({ type: "content", html: itemHtml });
        }
    });

    return sections;
}

/**
 * Assemble popup HTML from groupd sections
 * Extracted from buildPopupHTML to reduce complexity
 *
 * @private
 * @param {Object} poi - POI data with id property
 * @param {Array<PopupSection>} sections - Groupd popup sections
 * @returns {string} Completee popup HTML
 */
function assemblePopupHTML(poi, sections) {
    let html = '<div class="gl-poi-popup">';
    let inBody = false;

    sections.forEach((section) => {
        if (section.type === "hero") {
            if (inBody) {
                html += "</div>";
                inBody = false;
            }
            html += section.html;
        } else {
            if (!inBody) {
                html += '<div class="gl-poi-popup__body">';
                inBody = true;
            }

            if (section.type === "badges") {
                html += '<div class="gl-poi-popup__badges">';
                section.items.forEach((badgeHtml) => {
                    html += badgeHtml;
                });
                html += "</div>";
            } else {
                html += section.html;
            }
        }
    });

    // Link "See plus"
    if (!inBody) {
        html += '<div class="gl-poi-popup__body">';
        inBody = true;
    }
    html +=
        '<a href="#" class="gl-poi-popup__link" data-poi-id="' +
        (poi.id || "") +
        '">Voir plus >>></a>';

    if (inBody) {
        html += "</div>";
    }
    html += "</div>";

    return html;
}

/**
 * Builds the HTML complete of a popup avec structure et groupment de badges.
 *
 * Gère la structure HTML du popup:
 * 1. Images hero (en dehors du body)
 * 2. Body avec badges groupés + autres éléments
 * 3. Link "See plus >>>" automatic
 *
 * Tri automatic par config.order, badges groupés si consécutifs.
 *
 * @function buildPopupHTML
 * @param {Object} poi - Données du POI normalisé
 * @param {Object} poi.id - ID du POI
 * @param {Object} poi.attributes - Attributes du POI
 * @param {Array<Object>} config - Configuration detailPopup (array de renderers)
 * @param {Object} config[].type - Type of renderer ('text', 'badge', 'image', etc.)
 * @param {number} config[].order - Ordre d'display (tri croissant)
 * @param {string} [config[].variant] - Variante (ex: 'hero' pour images)
 * @param {Object} [options={}] - Options de rendu
 * @param {Function} [options.resolveCategoryDisplay] - Résolution taxonomy personnalisée
 * @returns {string} HTML complete du popup
 *
 * @example
 * // Popup avec image hero + badges + text
 * const html = buildPopupHTML(
 *   poi,
 *   [
 *     { type: 'image', field: 'attributes.photo', variant: 'hero', order: 1 },
 *     { type: 'badge', field: 'attributes.categoryId', order: 2 },
 *     { type: 'badge', field: 'attributes.status', order: 3 },
 *     { type: 'text', field: 'attributes.description', order: 4 }
 *   ],
 *   {}
 * );
 * // Returns:
 * // <div class="gl-poi-popup">
 * //   <img src="..." class="gl-poi-popup__hero"> (hero en dehors du body)
 * //   <div class="gl-poi-popup__body">
 * //     <div class="gl-poi-popup__badges">
 * //       <span class="gl-poi-badge">Restaurant</span>
 * //       <span class="gl-poi-badge">Open</span>
 * //     </div>
 * //     <p>Description...</p>
 * //     <a href="#" class="gl-poi-popup__link" data-poi-id="123">See plus >>></a>
 * //   </div>
 * // </div>
 *//**
 * Returns the HTML popup par defaut (sans config).
 * @private
 */
function _getDefaultPopupHTML(poi, helpers, escapeHtml) {
    const title = helpers.getDefaultTitle
        ? helpers.getDefaultTitle(poi)
        : poi.title || poi.label || poi.name || "Sans titre";
    helpers.debugLog?.("popup", "No config provided, using default popup");
    return (
        '<div class="gl-poi-popup">' +
        '<div class="gl-poi-popup__body">' +
        '<h3 class="gl-poi-popup__title"><span class="gl-poi-popup__title-text">' +
        escapeHtml(title) +
        "</span></h3>" +
        '<a href="#" class="gl-poi-popup__link" data-poi-id="' +
        (poi.id || "") +
        '">Voir plus >>></a>' +
        "</div></div>"
    );
}

function buildPopupHTML(poi, config, options = {}) {
    // Get helpers and utilities FIRST
    const helpers = getHelpers();
    const escapeHtml = getEscapeHtml();

    if (!poi) {
        getLog().warn("[Assemblers] Invalid POI for buildPopupHTML");
        return "";
    }

    if (!config || !Array.isArray(config) || config.length === 0) {
        return _getDefaultPopupHTML(poi, helpers, escapeHtml);
    }

    // ...log supprimé ([POPUP] buildPopupHTML - config items)...

    // Use helpers for config sorting (Phase 4 dedup)
    const sortedConfig = helpers.sortConfigByOrder
        ? helpers.sortConfigByOrder(config)
        : [...config].sort(compareByOrder);

    const renderOptions = {
        context: "popup",
        includeIcon: true,
        resolveCategoryDisplay: options.resolveCategoryDisplay,
    };

    // ...log supprimé ([POPUP] buildPopupHTML - sorted config)...

    // Group sections and assemble HTML
    try {
        const sections = groupPopupSections(sortedConfig, poi, renderOptions);
        // ...log supprimé ([POPUP] buildPopupHTML - sections groupd)...

        const html = assemblePopupHTML(poi, sections);
        // ...log supprimé ([POPUP] buildPopupHTML - HTML length)...

        return html;
    } catch (err) {
        // ...log supprimé ([POPUP] ERROR in buildPopupHTML)...
        return (
            '<div class="gl-poi-popup"><div class="gl-poi-popup__body">Erreur: ' +
            escapeHtml(err.message) +
            "</div></div>"
        );
    }
}

/**
 * Builds the HTML of a tooltip (text only, limité).
 *
 * Génère un tooltip simple avec values textualles séparées par " | ".
 * Pas de HTML complexe, optimisé pour tooltips Leaflet.
 *
 * Process:
 * 1. Si pas de config => utilise title/label/name par défaut
 * 2. Sinon extrait the values textualles de chaque renderer
 * 3. Gère badge resolution via resolveBadgeTooltip
 * 4. Joint les parties avec " | "
 *
 * @function buildTooltipHTML
 * @param {Object} poi - Données du POI normalisé
 * @param {Object} poi.title - Title par défaut
 * @param {Object} poi.attributes - Attributes du POI
 * @param {Array<Object>} config - Configuration detailTooltip (array de renderers)
 * @param {string} config[].type - Type of renderer ('text', 'badge', 'number', etc.)
 * @param {string} config[].field - Path du field (ex: 'attributes.name')
 * @param {number} [config[].order] - Ordre d'display (tri croissant)
 * @param {Object} [options={}] - Options de rendu
 * @returns {string} Text du tooltip (pas de HTML, text plat)
 *
 * @example
 * // Tooltip simple sans config
 * const text1 = buildTooltipHTML({ title: 'Restaurant Le Gourmet' }, []);
 * // Returns: 'Restaurant Le Gourmet'
 *
 * @example
 * // Tooltip avec config (name + category + rating)
 * const text2 = buildTooltipHTML(
 *   poi,
 *   [
 *     { type: 'text', field: 'attributes.name', order: 1 },
 *     { type: 'badge', field: 'attributes.categoryId', order: 2 },
 *     { type: 'number', field: 'attributes.rating', order: 3 }
 *   ]
 * );
 * // Returns: 'Le Gourmet | Restaurant | 4.5'
 *
 * @example
 * // Tooltip avec values manquantes (skipés)
 * const text3 = buildTooltipHTML(
 *   poi,
 *   [
 *     { type: 'text', field: 'attributes.name', order: 1 },
 *     { type: 'text', field: 'attributes.missingField', order: 2 }
 *   ]
 * );
 * // Returns: 'Le Gourmet' (missingField skippé)
 *//**
 * Returns the tooltip par defaut (sans config).
 * @private
 */
function _getDefaultTooltip(poi, helpers, resolveField, escapeHtml) {
    const title = helpers.getDefaultTitle
        ? helpers.getDefaultTitle(poi)
        : poi.title ||
          poi.label ||
          poi.name ||
          resolveField(
              poi,
              "attributes.name",
              "attributes.nom",
              "properties.name",
              "properties.nom"
          ) ||
          "Sans titre";
    return escapeHtml(String(title));
}

/**
 * Returns the value affichable of a field badge dans un tooltip.
 * @private
 */
function _resolveTooltipBadgeValue(item, poi, value, helpers, _resolveField) {
    if (helpers.resolveBadgeLabel) return helpers.resolveBadgeLabel(poi, item.field, value);
    const profile = getActiveProfile();
    const taxonomy = profile?.taxonomy;
    if (!taxonomy) return value;
    const attrs = poi.attributes || {};
    if (item.field.includes("subCategoryId")) {
        const catId = attrs.categoryId || attrs.category;
        const catData = taxonomy.categories?.[catId];
        const subCatData = catData?.subcategories?.[value];
        if (subCatData?.label) return subCatData.label;
    } else if (item.field.includes("categoryId")) {
        const catData = taxonomy.categories?.[value];
        if (catData?.label) return catData.label;
    }
    return value;
}

/**
 * Adds the representation of a item dans the table parts of a tooltip.
 * @private
 */
function _addTooltipPart(item, poi, value, helpers, resolveField, escapeHtml, parts) {
    if (item.type === "text" || item.type === "badge") {
        const displayValue =
            item.type === "badge"
                ? _resolveTooltipBadgeValue(item, poi, value, helpers, resolveField)
                : value;
        parts.push(escapeHtml(String(displayValue)));
    } else if (item.type === "number") {
        const numValue = typeof value === "number" ? value : parseFloat(value);
        if (!isNaN(numValue)) parts.push(numValue.toLocaleString("fr-FR"));
    } else if (item.type === "image") {
        parts.push(
            '<img src="' +
                escapeHtml(value) +
                '" alt="" style="max-width:150px;max-height:100px;display:block;margin:4px 0;" />'
        );
    } else if (item.type === "link") {
        const label = item.label || value;
        parts.push(
            '<a href="' + escapeHtml(value) + '" target="_blank">' + escapeHtml(label) + "</a>"
        );
    }
}

function buildTooltipHTML(poi, config, _options = {}) {
    if (!poi) {
        getLog().warn("[Assemblers] Invalid POI for buildTooltipHTML");
        return "";
    }

    const helpers = getHelpers();
    const escapeHtml = getEscapeHtml();
    const resolveField = getResolveField();

    // Si pas de config, tooltip par défaut - use helpers
    if (!config || !Array.isArray(config) || config.length === 0) {
        return _getDefaultTooltip(poi, helpers, resolveField, escapeHtml);
    }

    // Use helpers for config sorting (Phase 4 dedup)
    const sortedConfig = helpers.sortConfigByOrder
        ? helpers.sortConfigByOrder(config)
        : [...config].sort(compareByOrder);

    const _renderOptions = { context: "tooltip" };
    const parts = [];

    sortedConfig.forEach((item, _index) => {
        if (!item || !item.type || !item.field) return;
        const value = resolveField(poi, item.field);
        if (value == null || value === "") return;
        _addTooltipPart(item, poi, value, helpers, resolveField, escapeHtml, parts);
    });

    if (parts.length === 0) return escapeHtml(String(poi.title || poi.label || "Sans titre"));

    // Joindre avec contentUnion ou espace
    let result = "";
    parts.forEach((part, index) => {
        result += part;
        if (index < parts.length - 1) {
            const item = sortedConfig[index];
            if (item && item.contentUnion) {
                result += " " + escapeHtml(item.contentUnion) + " ";
            } else {
                result += " ";
            }
        }
    });

    return result;
}

/**
 * Builds thes éléments DOM pour a panel latéral (side panel / accordion).
 *
 * Génère un array d'objects pour chaque élément du panel:
 * - html: HTML rendu of the élément
 * - config: Configuration renderer originale
 * - label: Label of the élément (pour accordéon)
 * - accordion: Si true, élément dans un accordéon
 * - defaultOpen: Si true, accordéon open par défaut
 *
 * Tri automatic par config.order, éléments sans value skipés.
 *
 * @function buildPanelItems
 * @param {Object} poi - Données du POI normalisé
 * @param {Object} poi.attributes - Attributes du POI
 * @param {Array<Object>} config - Configuration detailLayout (array de renderers)
 * @param {string} config[].type - Type of renderer ('text', 'list', 'image', etc.)
 * @param {string} config[].field - Path du field (ex: 'attributes.description')
 * @param {number} [config[].order] - Ordre d'display (tri croissant)
 * @param {string} [config[].label] - Label of the élément (pour accordéon)
 * @param {boolean} [config[].accordion] - Si true, élément dans un accordéon
 * @param {boolean} [config[].defaultOpen=true] - Si false, accordéon fermé par défaut
 * @param {Object} [options={}] - Options de rendu
 * @returns {Array<Object>} Array d'objects {html, config, label, accordion, defaultOpen}
 * @returns {string} returns[].html - HTML rendu of the élément
 * @returns {Object} returns[].config - Configuration renderer originale
 * @returns {string} returns[].label - Label of the élément
 * @returns {boolean} returns[].accordion - Si true, élément dans un accordéon
 * @returns {boolean} returns[].defaultOpen - Si true, accordéon open par défaut
 *
 * @example
 * // Panel simple sans accordéon
 * const items1 = buildPanelItems(
 *   poi,
 *   [
 *     { type: 'text', field: 'attributes.name', label: 'Nom', order: 1 },
 *     { type: 'longtext', field: 'attributes.description', label: 'Description', order: 2 }
 *   ]
 * );
 * // Returns: [
 * //   { html: '<p>...</p>', config: {...}, label: 'Nom', accordion: false, defaultOpen: true },
 * //   { html: '<div>...</div>', config: {...}, label: 'Description', accordion: false, defaultOpen: true }
 * // ]
 *
 * @example
 * // Panel avec accordéons
 * const items2 = buildPanelItems(
 *   poi,
 *   [
 *     { type: 'text', field: 'attributes.name', label: 'Nom', order: 1 },
 *     { type: 'list', field: 'attributes.tags', label: 'Tags', accordion: true, defaultOpen: true, order: 2 },
 *     { type: 'gallery', field: 'attributes.photos', label: 'Photos', accordion: true, defaultOpen: false, order: 3 }
 *   ]
 * );
 * // Returns: [
 * //   { html: '<p>...</p>', label: 'Nom', accordion: false, defaultOpen: true },
 * //   { html: '<ul>...</ul>', label: 'Tags', accordion: true, defaultOpen: true },
 * //   { html: '<div>...</div>', label: 'Photos', accordion: true, defaultOpen: false }
 * // ]
 */ /** @private Returns true if the field value is considered non-empty. */
function _itemHasValue(value) {
    return (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0)
    );
}

/** @private Builds a single panel item object, or null if it should be skipped. */
function _processPanelItem(poi, itemConfig, renderOptions, resolveField) {
    if (!itemConfig?.type) return null;
    const value = resolveField(poi, itemConfig.field);
    if (!_itemHasValue(value) && itemConfig.type !== "coordinates") return null;
    const html = renderItem(poi, itemConfig, renderOptions);
    if (!html) return null;
    return {
        html,
        config: itemConfig,
        label: itemConfig.label || "",
        accordion: itemConfig.accordion === true,
        defaultOpen: itemConfig.defaultOpen !== false,
    };
}

function buildPanelItems(poi, config, options = {}) {
    if (!poi || !config || !Array.isArray(config)) {
        return [];
    }

    const resolveField = getResolveField();
    const renderOptions = { context: "panel", ...options };

    // Trier par order (Phase 4 dedup)
    const sortedConfig = [...config].sort(compareByOrder);

    const items = [];

    sortedConfig.forEach((itemConfig) => {
        const item = _processPanelItem(poi, itemConfig, renderOptions, resolveField);
        if (item) items.push(item);
    });

    return items;
}

// ========================================
//   EXPORT
// ========================================

const Assemblers = {
    buildPopupHTML,
    buildTooltipHTML,
    buildPanelItems,
};

getLog().info("[GeoLeaf._ContentBuilder.Assemblers] Module Assemblers chargé");

export { Assemblers };
