/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Content Builder - Helpers
 * Fonctions utilitaires partagées pour tous les renderers/assemblers
 *
 * @module ui/content-builder/helpers
 * @version 3.0.0
 * @phase Phase 3 - Code Quality
 */

import { escapeHtml } from '../../security/index.js';
import { resolveField, compareByOrder, getLog, getActiveProfile } from '../../utils/general-utils.js';

    // ========================================
    //   DEPENDENCY RESOLUTION (Phase 4 dedup — direct imports)
    // ========================================

    function getResolveField() {
        return resolveField;
    }

    function getEscapeHtml() {
        return escapeHtml;
    }

    // getActiveProfile and getLog imported from general-utils.js (Phase 4 dedup)

    // ========================================
    //   CONFIG SORTING
    // ========================================

    /**
     * Sort config array by order property (Phase 4 dedup: delegates to compareByOrder)
     * @param {Array<Object>} config - Config array with optional order property
     * @returns {Array<Object>} Sorted config array
     */
    function sortConfigByOrder(config) {
        if (!Array.isArray(config)) return [];
        return [...config].sort(compareByOrder);
    }

    // ========================================
    //   BADGE TAXONOMY RESOLUTION
    // ========================================

    /**
     * Resolve string|number} value - Raw field value
     * @returns {string} Resolved label or original value
     *
     * @typedef {Object} POI
     * @property {string} id - POI identifier
     * @property {string} title - POI title
     * @property {Object} [attributes] - POI attributes
     * @property {string} [attributes.categoryId] - Category identifier
     * @property {string} [attributes.subCategoryId] - Subcategory identifier (duplicated 3 times)
     *
     * @param {Object} poi - POI data
     * @param {string} field - Field path (e.g., 'attributes.categoryId')
     * @param {any} value - Raw field value
     * @returns {string} Resolved label or original value
     *
     * @example
     * const label = resolveBadgeLabel(
     *   { attributes: { categoryId: 'restaurant' } },
     *   'attributes.categoryId',
     *   'restaurant'
     * );
     * // Returns: "Restaurants" (from taxonomy)
     */
    function resolveBadgeLabel(poi, field, value) {
        const profile = getActiveProfile();
        const taxonomy = profile?.taxonomy;
        if (!taxonomy) return value;

        const attrs = poi.attributes || {};

        // Subcategory resolution
        if (field.includes('subCategoryId')) {
            const catId = attrs.categoryId || attrs.category;
            const catData = taxonomy.categories?.[catId];
            const subCatData = catData?.subcategories?.[value];
            return subCatData?.label || value;
        }

        // Category resolution
        if (field.includes('categoryId')) {
            const catData = taxonomy.categories?.[value];
            return catData?.label || value;
        }

        return value;
    }

    // ========================================
    //   DEFAULT TITLE EXTRACTION
    // ========================================

    /**
     * Extract default title from POI (various field names)
     * Extracted from popup/tooltip/panel renderers (duplicated 3 times)
     *
     * @param {Object} poi - POI data
     * @returns {string} POI title or 'Sans titre'
     *
     * @example
     * getDefaultTitle({ title: 'Restaurant ABC' }); // 'Restaurant ABC'
     * getDefaultTitle({ label: 'Musée' }); // 'Musée'
     * getDefaultTitle({}); // 'Sans titre'
     */
    function getDefaultTitle(poi) {
        if (!poi) return 'Sans titre';

        const resolveField = getResolveField();

        return poi.title ||
               poi.label ||
               poi.name ||
               resolveField(poi, 'attributes.name', 'attributes.nom', 'properties.name', 'properties.nom') ||
               'Sans titre';
    }

    // ========================================
    //   DEBUG LOGGING
    // ========================================

    // For testing purposes only
    let _testWindow = null;

    /**
     * Check if debug mode is enabled for content builder
     * Extracted from assemblers.js (repeated pattern)
     *
     * @param {string} [context='popup'] - Context identifier (popup/tooltip/panel)
     * @returns {boolean}
     */
    function isDebugEnabled(context = 'popup') {
        const win = _testWindow || (typeof window !== 'undefined' ? window : null);
        if (!win) return false;

        const debugFlags = {
            popup: win.__GEOLEAF_DEBUG_POPUP__,
            tooltip: win.__GEOLEAF_DEBUG_TOOLTIP__,
            panel: win.__GEOLEAF_DEBUG_PANEL__
        };

        return !!debugFlags[context];
    }

    /**
     * Log debug message if debug enabled
     * @param {string} context - Context identifier
     * @param {string} message - Message to log
     * @param {*} [data] - Optional data to log
     */
    function debugLog(context, message, data) {
        if (!isDebugEnabled(context)) return;

        const log = getLog();
        if (data !== undefined) {
            log.warn(`[ContentBuilder.${context}] ${message}`, data);
        } else {
            log.warn(`[ContentBuilder.${context}] ${message}`);
        }
    }

    // ========================================
    //   FIELD VALUE VALIDATION
    // ========================================

    /**
     * Check if field value is empty/invalid
     * @param {*} value - Value to check
     * @param {Object} [options] - Validation options
     * @param {boolean} [options.allowZero=true] - Allow 0 as valid value
     * @param {boolean} [options.allowEmptyArray=false] - Allow [] as valid value
     * @param {boolean} [options.allowEmptyString=false] - Allow '' as valid value
     * @returns {boolean} True if value is empty/invalid
     */
    function isEmptyValue(value, options = {}) {
        const {
            allowZero = true,
            allowEmptyArray = false,
            allowEmptyString = false
        } = options;

        // Null/undefined
        if (value === null || value === undefined) return true;

        // Zero
        if (value === 0) return !allowZero;

        // Empty string
        if (value === '') return !allowEmptyString;

        // Empty array
        if (Array.isArray(value) && value.length === 0) return !allowEmptyArray;

        return false;
    }

    /**
     * Get field value from POI and validate
     * @param {Object} poi - POI data
     * @param {string} field - Field path
     * @param {Object} [options] - Validation options
     * @returns {*|null} Field value or null if invalid
     */
    function getValidFieldValue(poi, field, options = {}) {
        const resolveField = getResolveField();
        const value = resolveField(poi, field);

        return isEmptyValue(value, options) ? null : value;
    }

    // ========================================
    //   HTML BUILDER UTILITIES
    // ========================================

    /**
     * Wrap content in div with className
     * @param {string} content - HTML content
     * @param {string} className - CSS class name
     * @returns {string} Wrapped HTML
     */
    function wrapInDiv(content, className) {
        return `<div class="${className}">${content}</div>`;
    }

    /**
     * Create badge HTML element
     * @param {string} text - Badge text
     * @param {string} [style=''] - Inline style attribute
     * @returns {string} Badge HTML
     */
    function createBadge(text, style = '') {
        const escapeHtml = getEscapeHtml();
        const escapedText = escapeHtml(text);
        const styleAttr = style ? ` style="${style}"` : '';
        return `<span class="gl-poi-badge"${styleAttr}>${escapedText}</span>`;
    }

    /**
     * Create image HTML element
     * @param {string} src - Image source URL
     * @param {string} alt - Alt text
     * @param {string} [className='gl-poi-popup__photo'] - CSS class name
     * @returns {string} Image HTML
     */
    function createImage(src, alt, className = 'gl-poi-popup__photo') {
        const escapeHtml = getEscapeHtml();
        const escapedSrc = escapeHtml(src);
        const escapedAlt = escapeHtml(alt);
        return `<div class="${className}"><img src="${escapedSrc}" alt="${escapedAlt}" loading="lazy" /></div>`;
    }

    /**
     * Create link HTML element
     * @param {string} href - Link URL
     * @param {string} text - Link text
     * @param {Object} [options] - Link options
     * @param {boolean} [options.external=false] - Open in new tab
     * @param {string} [options.className='gl-poi-link'] - CSS class name
     * @returns {string} Link HTML
     */
    function createLink(href, text, options = {}) {
        const escapeHtml = getEscapeHtml();
        const {
            external = false,
            className = 'gl-poi-link'
        } = options;

        const escapedHref = escapeHtml(href);
        const escapedText = escapeHtml(text);
        const targetAttr = external ? ' target="_blank" rel="noopener noreferrer"' : '';

        return `<a href="${escapedHref}" class="${className}"${targetAttr}>${escapedText}</a>`;
    }

    // ========================================
    //   EXPORTS
    // ========================================

    const Helpers = {
        // Dependency resolution
        getResolveField,
        getEscapeHtml,
        getActiveProfile,
        getLog,

        // Config sorting
        sortConfigByOrder,

        // Badge resolution
        resolveBadgeLabel,

        // Title extraction
        getDefaultTitle,

        // Debug logging
        isDebugEnabled,
        debugLog,

        // Field validation
        isEmptyValue,
        getValidFieldValue,

        // HTML builders
        wrapInDiv,
        createBadge,
        createImage,
        createLink,

        // Test utilities (only in test environments)
        __setDebugWindow: (win) => { _testWindow = win; }
    };

// ── ESM Export ──
export { Helpers };
