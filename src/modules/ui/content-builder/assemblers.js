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
 * pour les popups (detailPopup), tooltips (contentUnion) et panneaux latéraux (items).
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
 * // Construction d'un popup complet
 * const popupHtml = Assemblers.buildPopupHTML(poi, config, options);
 *
 * @example
 * // Construction d'un tooltip
 * const tooltipHtml = Assemblers.buildTooltipHTML(poi, contentUnion);
 */

import { escapeHtml } from '../../security/index.js';
import { resolveField, compareByOrder, getLog, getActiveProfile } from '../../utils/general-utils.js';
import { Helpers } from './helpers.js';
import { ContentBuilderCore } from './core.js';
import { ContentBuilderShared } from './renderers-shared.js';

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

function getCore() {
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
    return '';
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
 * @returns {Array<{type: string, html?: string, items?: Array<string>}>} Grouped sections
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
        const isHeroImage = item.type === 'image' && item.variant === 'hero';
        const isBadge = item.type === 'badge';
        const nextItem = sortedConfig[index + 1];
        const nextIsBadge = nextItem && nextItem.type === 'badge';
        const itemHtml = renderItem(poi, item, renderOptions);
        if (isHeroImage) {
            sections.push({ type: 'hero', html: itemHtml });
        } else if (isBadge) {
            badgeGroup.push(itemHtml);
            if (!nextIsBadge) {
                sections.push({ type: 'badges', items: [...badgeGroup] });
                badgeGroup = [];
            }
        } else {
            sections.push({ type: 'content', html: itemHtml });
        }
    });

    return sections;
}

/**
 * Assemble popup HTML from grouped sections
 * Extracted from buildPopupHTML to reduce complexity
 *
 * @private
 * @param {Object} poi - POI data with id property
 * @param {Array<PopupSection>} sections - Grouped popup sections
 * @returns {string} Complete popup HTML
 */
function assemblePopupHTML(poi, sections) {
    let html = '<div class="gl-poi-popup">';
    let inBody = false;

    sections.forEach(section => {
        if (section.type === 'hero') {
            if (inBody) {
                html += '</div>';
                inBody = false;
            }
            html += section.html;
        } else {
            if (!inBody) {
                html += '<div class="gl-poi-popup__body">';
                inBody = true;
            }

            if (section.type === 'badges') {
                html += '<div class="gl-poi-popup__badges">';
                section.items.forEach(badgeHtml => {
                    html += badgeHtml;
                });
                html += '</div>';
            } else {
                html += section.html;
            }
        }
    });

    // Lien "Voir plus"
    if (!inBody) {
        html += '<div class="gl-poi-popup__body">';
        inBody = true;
    }
    html += '<a href="#" class="gl-poi-popup__link" data-poi-id="' + (poi.id || '') + '">Voir plus >>></a>';

    if (inBody) {
        html += '</div>';
    }
    html += '</div>';

    return html;
}

/**
 * Construit le HTML complet d'un popup avec structure et groupement de badges.
 *
 * Gère la structure HTML du popup:
 * 1. Images hero (en dehors du body)
 * 2. Body avec badges groupés + autres éléments
 * 3. Lien "Voir plus >>>" automatique
 *
 * Tri automatique par config.order, badges groupés si consécutifs.
 *
 * @function buildPopupHTML
 * @param {Object} poi - Données du POI normalisé
 * @param {Object} poi.id - ID du POI
 * @param {Object} poi.attributes - Attributs du POI
 * @param {Array<Object>} config - Configuration detailPopup (array de renderers)
 * @param {Object} config[].type - Type de renderer ('text', 'badge', 'image', etc.)
 * @param {number} config[].order - Ordre d'affichage (tri croissant)
 * @param {string} [config[].variant] - Variante (ex: 'hero' pour images)
 * @param {Object} [options={}] - Options de rendu
 * @param {Function} [options.resolveCategoryDisplay] - Résolution taxonomie personnalisée
 * @returns {string} HTML complet du popup
 *
 * @example
 * // Popup avec image hero + badges + texte
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
 * // Retourne:
 * // <div class="gl-poi-popup">
 * //   <img src="..." class="gl-poi-popup__hero"> (hero en dehors du body)
 * //   <div class="gl-poi-popup__body">
 * //     <div class="gl-poi-popup__badges">
 * //       <span class="gl-poi-badge">Restaurant</span>
 * //       <span class="gl-poi-badge">Ouvert</span>
 * //     </div>
 * //     <p>Description...</p>
 * //     <a href="#" class="gl-poi-popup__link" data-poi-id="123">Voir plus >>></a>
 * //   </div>
 * // </div>
 */
function buildPopupHTML(poi, config, options = {}) {
    // Get helpers and utilities FIRST
    const helpers = getHelpers();
    const escapeHtml = getEscapeHtml();

    if (!poi) {
        getLog().warn('[Assemblers] POI invalide pour buildPopupHTML');
        return '';
    }

    if (!config || !Array.isArray(config) || config.length === 0) {
        const title = helpers.getDefaultTitle ? helpers.getDefaultTitle(poi) : (poi.title || poi.label || poi.name || 'Sans titre');
        helpers.debugLog?.('popup', 'No config provided, using default popup');

        return '<div class="gl-poi-popup">' +
            '<div class="gl-poi-popup__body">' +
            '<h3 class="gl-poi-popup__title"><span class="gl-poi-popup__title-text">' + escapeHtml(title) + '</span></h3>' +
            '<a href="#" class="gl-poi-popup__link" data-poi-id="' + (poi.id || '') + '">Voir plus >>></a>' +
            '</div></div>';
    }

    // ...log supprimé ([POPUP] buildPopupHTML - config items)...

    // Use helpers for config sorting (Phase 4 dedup)
    const sortedConfig = helpers.sortConfigByOrder ? helpers.sortConfigByOrder(config) :
        [...config].sort(compareByOrder);

    const renderOptions = {
        context: 'popup',
        includeIcon: true,
        resolveCategoryDisplay: options.resolveCategoryDisplay
    };

    // ...log supprimé ([POPUP] buildPopupHTML - sorted config)...

    // Group sections and assemble HTML
    try {
        const sections = groupPopupSections(sortedConfig, poi, renderOptions);
        // ...log supprimé ([POPUP] buildPopupHTML - sections grouped)...

        const html = assemblePopupHTML(poi, sections);
        // ...log supprimé ([POPUP] buildPopupHTML - HTML length)...

        return html;
    } catch(err) {
        // ...log supprimé ([POPUP] ERROR in buildPopupHTML)...
        return '<div class="gl-poi-popup"><div class="gl-poi-popup__body">Erreur: ' + escapeHtml(err.message) + '</div></div>';
    }
}

/**
 * Construit le HTML d'un tooltip (texte uniquement, limité).
 *
 * Génère un tooltip simple avec valeurs textuelles séparées par " | ".
 * Pas de HTML complexe, optimisé pour tooltips Leaflet.
 *
 * Processus:
 * 1. Si pas de config => utilise title/label/name par défaut
 * 2. Sinon extrait les valeurs textuelles de chaque renderer
 * 3. Gère badge resolution via resolveBadgeTooltip
 * 4. Joint les parties avec " | "
 *
 * @function buildTooltipHTML
 * @param {Object} poi - Données du POI normalisé
 * @param {Object} poi.title - Titre par défaut
 * @param {Object} poi.attributes - Attributs du POI
 * @param {Array<Object>} config - Configuration detailTooltip (array de renderers)
 * @param {string} config[].type - Type de renderer ('text', 'badge', 'number', etc.)
 * @param {string} config[].field - Chemin du champ (ex: 'attributes.name')
 * @param {number} [config[].order] - Ordre d'affichage (tri croissant)
 * @param {Object} [options={}] - Options de rendu
 * @returns {string} Texte du tooltip (pas de HTML, texte plat)
 *
 * @example
 * // Tooltip simple sans config
 * const text1 = buildTooltipHTML({ title: 'Restaurant Le Gourmet' }, []);
 * // Retourne: 'Restaurant Le Gourmet'
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
 * // Retourne: 'Le Gourmet | Restaurant | 4.5'
 *
 * @example
 * // Tooltip avec valeurs manquantes (skipés)
 * const text3 = buildTooltipHTML(
 *   poi,
 *   [
 *     { type: 'text', field: 'attributes.name', order: 1 },
 *     { type: 'text', field: 'attributes.missingField', order: 2 }
 *   ]
 * );
 * // Retourne: 'Le Gourmet' (missingField skippé)
 */
function buildTooltipHTML(poi, config, options = {}) {
    if (!poi) {
        getLog().warn('[Assemblers] POI invalide pour buildTooltipHTML');
        return '';
    }

    const helpers = getHelpers();
    const escapeHtml = getEscapeHtml();
    const resolveField = getResolveField();

    // Si pas de config, tooltip par défaut - use helpers
    if (!config || !Array.isArray(config) || config.length === 0) {
        const title = helpers.getDefaultTitle ? helpers.getDefaultTitle(poi) :
            (poi.title || poi.label || poi.name ||
             resolveField(poi, 'attributes.name', 'attributes.nom', 'properties.name', 'properties.nom') ||
             'Sans titre');
        return escapeHtml(String(title));
    }

    // Use helpers for config sorting (Phase 4 dedup)
    const sortedConfig = helpers.sortConfigByOrder ? helpers.sortConfigByOrder(config) :
        [...config].sort(compareByOrder);

    const renderOptions = { context: 'tooltip' };
    const parts = [];

    sortedConfig.forEach((item, index) => {
        if (!item || !item.type || !item.field) return;

        const value = resolveField(poi, item.field);
        if (value == null || value === '') return;

        // Pour les tooltips, on extrait juste la valeur textuelle
        if (item.type === 'text' || item.type === 'badge') {
            let displayValue = value;

            // Use helpers for badge resolution
            if (item.type === 'badge' && helpers.resolveBadgeLabel) {
                displayValue = helpers.resolveBadgeLabel(poi, item.field, value);
            } else if (item.type === 'badge') {
                // Fallback to inline resolution
                const profile = getActiveProfile();
                const taxonomy = profile?.taxonomy;
                if (taxonomy) {
                    const attrs = poi.attributes || {};
                    if (item.field.includes('subCategoryId')) {
                        const catId = attrs.categoryId || attrs.category;
                        const catData = taxonomy.categories?.[catId];
                        const subCatData = catData?.subcategories?.[value];
                        if (subCatData?.label) displayValue = subCatData.label;
                    } else if (item.field.includes('categoryId')) {
                        const catData = taxonomy.categories?.[value];
                        if (catData?.label) displayValue = catData.label;
                    }
                }
            }

            parts.push(escapeHtml(String(displayValue)));
        }
        else if (item.type === 'number') {
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            if (!isNaN(numValue)) {
                parts.push(numValue.toLocaleString('fr-FR'));
            }
        }
        else if (item.type === 'image') {
            // Image en tooltip : afficher en ligne
            parts.push('<img src="' + escapeHtml(value) + '" alt="" style="max-width:150px;max-height:100px;display:block;margin:4px 0;" />');
        }
        else if (item.type === 'link') {
            const label = item.label || value;
            parts.push('<a href="' + escapeHtml(value) + '" target="_blank">' + escapeHtml(label) + '</a>');
        }
    });

    if (parts.length === 0) {
        const title = poi.title || poi.label || 'Sans titre';
        return escapeHtml(String(title));
    }

    // Joindre avec contentUnion ou espace
    let result = '';
    parts.forEach((part, index) => {
        result += part;
        if (index < parts.length - 1) {
            const item = sortedConfig[index];
            if (item && item.contentUnion) {
                result += ' ' + escapeHtml(item.contentUnion) + ' ';
            } else {
                result += ' ';
            }
        }
    });

    return result;
}

/**
 * Construit les éléments DOM pour un panneau latéral (side panel / accordion).
 *
 * Génère un tableau d'objets pour chaque élément du panneau:
 * - html: HTML rendu de l'élément
 * - config: Configuration renderer originale
 * - label: Label de l'élément (pour accordéon)
 * - accordion: Si true, élément dans un accordéon
 * - defaultOpen: Si true, accordéon ouvert par défaut
 *
 * Tri automatique par config.order, éléments sans valeur skipés.
 *
 * @function buildPanelItems
 * @param {Object} poi - Données du POI normalisé
 * @param {Object} poi.attributes - Attributs du POI
 * @param {Array<Object>} config - Configuration detailLayout (array de renderers)
 * @param {string} config[].type - Type de renderer ('text', 'list', 'image', etc.)
 * @param {string} config[].field - Chemin du champ (ex: 'attributes.description')
 * @param {number} [config[].order] - Ordre d'affichage (tri croissant)
 * @param {string} [config[].label] - Label de l'élément (pour accordéon)
 * @param {boolean} [config[].accordion] - Si true, élément dans un accordéon
 * @param {boolean} [config[].defaultOpen=true] - Si false, accordéon fermé par défaut
 * @param {Object} [options={}] - Options de rendu
 * @returns {Array<Object>} Tableau d'objets {html, config, label, accordion, defaultOpen}
 * @returns {string} returns[].html - HTML rendu de l'élément
 * @returns {Object} returns[].config - Configuration renderer originale
 * @returns {string} returns[].label - Label de l'élément
 * @returns {boolean} returns[].accordion - Si true, élément dans un accordéon
 * @returns {boolean} returns[].defaultOpen - Si true, accordéon ouvert par défaut
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
 * // Retourne: [
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
 * // Retourne: [
 * //   { html: '<p>...</p>', label: 'Nom', accordion: false, defaultOpen: true },
 * //   { html: '<ul>...</ul>', label: 'Tags', accordion: true, defaultOpen: true },
 * //   { html: '<div>...</div>', label: 'Photos', accordion: true, defaultOpen: false }
 * // ]
 */
function buildPanelItems(poi, config, options = {}) {
    if (!poi || !config || !Array.isArray(config)) {
        return [];
    }

    const resolveField = getResolveField();
    const renderOptions = { context: 'panel', ...options };

    // Trier par order (Phase 4 dedup)
    const sortedConfig = [...config].sort(compareByOrder);

    const items = [];

    sortedConfig.forEach(itemConfig => {
        if (!itemConfig || !itemConfig.type) return;

        // Vérifier si la valeur existe
        const value = resolveField(poi, itemConfig.field);
        const hasValue = value !== null && value !== undefined && value !== '' &&
                         !(Array.isArray(value) && value.length === 0);

        if (!hasValue && itemConfig.type !== 'coordinates') return;

        const html = renderItem(poi, itemConfig, renderOptions);
        if (html) {
            items.push({
                html: html,
                config: itemConfig,
                label: itemConfig.label || '',
                accordion: itemConfig.accordion === true,
                defaultOpen: itemConfig.defaultOpen !== false
            });
        }
    });

    return items;
}

// ========================================
//   EXPORT
// ========================================

const Assemblers = {
    buildPopupHTML,
    buildTooltipHTML,
    buildPanelItems
};

getLog().info('[GeoLeaf._ContentBuilder.Assemblers] Module Assemblers chargé');

export { Assemblers };
