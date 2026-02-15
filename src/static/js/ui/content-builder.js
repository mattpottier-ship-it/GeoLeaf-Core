/**
 * GeoLeaf UI Content Builder Module
 * Module central pour la construction du contenu des tooltips, popups et panneaux latéraux.
 * Unifie le rendu pour tous les types de sources (JSON, GeoJSON, GPX, routes).
 *
 * @module ui/content-builder
 * @version 1.0.0
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf._ContentBuilder = GeoLeaf._ContentBuilder || {};

    // ========================================
    //   CORE HELPERS (depuis Core module)
    // ========================================

    /**
     * Récupère les helpers depuis Core (avec fallback)
     */
    function getCore() {
        return GeoLeaf._ContentBuilder.Core || {
            getResolveField: function() {
                return GeoLeaf.Utils?.resolveField || (() => null);
            },
            getEscapeHtml: function() {
                return GeoLeaf.Security?.escapeHtml || function(str) {
                    if (str == null) return '';
                    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                };
            },
            getActiveProfile: function() {
                return GeoLeaf.Config?.getActiveProfile?.() || null;
            },
            getLog: function() {
                return GeoLeaf.Log || console;
            }
        };
    }

    // Raccourcis vers Core
    const getResolveField = () => getCore().getResolveField();
    const getEscapeHtml = () => getCore().getEscapeHtml();
    const getActiveProfile = () => getCore().getActiveProfile();
    const getLog = () => getCore().getLog();

    // ========================================
    //   RENDERERS PAR TYPE
    // ========================================

    /**
     * Construit un élément de type "text"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu (context: 'popup'|'tooltip'|'panel')
     * @returns {string} HTML
     */
    function renderText(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();

        // Tester le champ tel quel, puis avec fallback attributes si properties
        let value = resolveField(poi, config.field);

        // Si le champ commence par "properties." et n'a pas de valeur, essayer avec "attributes."
        if ((value == null || value === '') && config.field && config.field.startsWith('properties.')) {
            const attributesField = config.field.replace(/^properties\./, 'attributes.');
            value = resolveField(poi, attributesField);
        }

        // Si le champ commence par "attributes." et n'a pas de valeur, essayer avec "properties."
        if ((value == null || value === '') && config.field && config.field.startsWith('attributes.')) {
            const propertiesField = config.field.replace(/^attributes\./, 'properties.');
            value = resolveField(poi, propertiesField);
        }

        if (value == null || value === '') return '';

        const escaped = escapeHtml(String(value));
        const variant = config.variant || 'default';
        const context = options.context || 'popup';

        if (variant === 'title') {
            // Titre avec éventuelle icône
            let iconHtml = '';
            if (options.includeIcon && options.resolveCategoryDisplay) {
                const displayConfig = options.resolveCategoryDisplay(poi);
                if (displayConfig && displayConfig.iconId) {
                    const iconsConfig = (GeoLeaf.Config && typeof GeoLeaf.Config.getIconsConfig === "function")
                        ? GeoLeaf.Config.getIconsConfig()
                        : null;
                    const iconPrefix = (iconsConfig && iconsConfig.symbolPrefix) || 'gl-poi-cat-';
                    const iconIdNormalized = String(displayConfig.iconId).trim().toLowerCase().replace(/\s+/g, '-');
                    const symbolId = iconPrefix + iconIdNormalized;
                    iconHtml = '<svg class="gl-poi-popup__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">' +
                        '<circle cx="12" cy="12" r="10" fill="' + (displayConfig.colorFill || '#666') + '" stroke="' + (displayConfig.colorStroke || '#222') + '" stroke-width="1.5"/>' +
                        '<svg x="4" y="4" width="16" height="16"><use href="#' + symbolId + '" style="color: #ffffff"/></svg>' +
                        '</svg>';
                }
            }
            return '<h3 class="gl-poi-popup__title">' + iconHtml + '<span class="gl-poi-popup__title-text">' + escaped + '</span></h3>';
        }

        if (variant === 'short') {
            return '<p class="gl-poi-popup__desc">' + escaped + '</p>';
        }

        if (variant === 'long' || variant === 'paragraph') {
            return '<p class="gl-poi-popup__desc gl-poi-popup__desc--long">' + escaped + '</p>';
        }

        return '<p class="gl-poi-popup__desc">' + escaped + '</p>';
    }

    /**
     * Construit un élément de type "longtext"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderLongtext(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();

        let value = resolveField(poi, config.field);
        if ((value == null || value === '') && config.field && config.field.startsWith('properties.')) {
            value = resolveField(poi, config.field.replace(/^properties\./, 'attributes.'));
        }
        if ((value == null || value === '') && config.field && config.field.startsWith('attributes.')) {
            value = resolveField(poi, config.field.replace(/^attributes\./, 'properties.'));
        }
        if (value == null || value === '') return '';

        const escaped = escapeHtml(String(value));
        return '<div class="gl-content__longtext"><p>' + escaped.replace(/\n/g, '</p><p>') + '</p></div>';
    }

    /**
     * Construit un élément de type "number"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderNumber(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();

        let value = resolveField(poi, config.field);
        if ((value == null || value === '') && config.field && config.field.startsWith('properties.')) {
            value = resolveField(poi, config.field.replace(/^properties\./, 'attributes.'));
        }
        if ((value == null || value === '') && config.field && config.field.startsWith('attributes.')) {
            value = resolveField(poi, config.field.replace(/^attributes\./, 'properties.'));
        }
        if (value == null || value === '') return '';

        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numValue)) return '';

        const formatted = numValue.toLocaleString('fr-FR');
        const label = config.label ? escapeHtml(config.label) : '';
        const variant = config.variant || 'default';

        if (variant === 'stat') {
            return '<div class="gl-content__stat">' +
                (label ? '<span class="gl-content__stat-label">' + label + '</span>' : '') +
                '<span class="gl-content__stat-value">' + formatted + '</span>' +
                '</div>';
        }

        return '<p class="gl-content__number">' +
            (label ? '<strong>' + label + ':</strong> ' : '') +
            formatted + '</p>';
    }

    /**
     * Construit un élément de type "metric" (nombre avec unité/suffixe)
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderMetric(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();

        let value = resolveField(poi, config.field);
        if ((value == null || value === '') && config.field && config.field.startsWith('properties.')) {
            value = resolveField(poi, config.field.replace(/^properties\./, 'attributes.'));
        }
        if ((value == null || value === '') && config.field && config.field.startsWith('attributes.')) {
            value = resolveField(poi, config.field.replace(/^attributes\./, 'properties.'));
        }
        if (value == null || value === '') return '';

        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numValue)) return '';

        // Utiliser Templates si disponible, sinon fallback
        if (GeoLeaf._ContentBuilder && GeoLeaf._ContentBuilder.Templates) {
            return GeoLeaf._ContentBuilder.Templates.createMetricElement(numValue, config, escapeHtml);
        }

        // Fallback si Templates pas chargé
        const formatted = numValue.toLocaleString('fr-FR');
        const suffix = config.suffix ? escapeHtml(config.suffix) : '';
        const prefix = config.prefix ? escapeHtml(config.prefix) : '';
        const label = config.label ? escapeHtml(config.label) : '';
        return '<p class="gl-content__metric">' +
            (label ? '<strong>' + label + ':</strong> ' : '') +
            prefix + formatted + suffix + '</p>';
    }

    /**
     * Construit un élément de type "badge"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderBadge(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();
        const Core = getCore();

        let value = resolveField(poi, config.field);
        if ((value == null || value === '') && config.field && config.field.startsWith('properties.')) {
            value = resolveField(poi, config.field.replace(/^properties\./, 'attributes.'));
        }
        if ((value == null || value === '') && config.field && config.field.startsWith('attributes.')) {
            value = resolveField(poi, config.field.replace(/^attributes\./, 'properties.'));
        }
        if (value == null || value === '') return '';

        const variant = config.variant || 'default';

        // Utiliser le badge resolver de Core
        const badge = Core.resolveBadge ?
            Core.resolveBadge(poi, config.field, variant) :
            { displayValue: String(value), style: '' };

        const escaped = escapeHtml(badge.displayValue);
        const badgeClass = 'gl-poi-badge gl-poi-badge--' + variant;
        const styleAttr = badge.style ? ' style="' + badge.style + '"' : '';

        return '<span class="' + badgeClass + '"' + styleAttr + '>' + escaped + '</span>';
    }

    /**
     * Construit un élément de type "rating"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderRating(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();

        let value = resolveField(poi, config.field);
        if ((value == null || value === '') && config.field && config.field.startsWith('properties.')) {
            value = resolveField(poi, config.field.replace(/^properties\./, 'attributes.'));
        }
        if ((value == null || value === '') && config.field && config.field.startsWith('attributes.')) {
            value = resolveField(poi, config.field.replace(/^attributes\./, 'properties.'));
        }
        if (value == null || value === '') return '';

        const rating = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(rating) || rating < 0 || rating > 5) return '';

        // Variant stat avec layout spécial (conserver l'ancien)
        if (config.variant === 'stat') {
            const label = config.label ? escapeHtml(config.label) : '';
            let starsHtml = '<span class="gl-rating__stars">';
            for (let i = 1; i <= 5; i++) {
                const isFilled = i <= Math.round(rating);
                starsHtml += '<span class="gl-rating__star' + (isFilled ? ' gl-rating__star--filled' : '') + '">★</span>';
            }
            starsHtml += '</span>';
            const numericValue = rating.toFixed(1);
            return '<div class="gl-rating gl-rating--stat">' +
                (label ? '<span class="gl-rating__label">' + label + '</span>' : '') +
                '<div class="gl-rating__content">' +
                starsHtml +
                '<span class="gl-rating__value">' + numericValue + '/5</span>' +
                '</div>' +
                '</div>';
        }

        // Variante par défaut : utiliser template si disponible
        if (GeoLeaf._ContentBuilder && GeoLeaf._ContentBuilder.Templates) {
            return GeoLeaf._ContentBuilder.Templates.createRatingElement(rating, config, escapeHtml);
        }

        // Fallback si Templates pas chargé
        const label = config.label ? escapeHtml(config.label) : '';
        let starsHtml = '<span class="gl-rating__stars">';
        for (let i = 1; i <= 5; i++) {
            const isFilled = i <= Math.round(rating);
            starsHtml += '<span class="gl-rating__star' + (isFilled ? ' gl-rating__star--filled' : '') + '">★</span>';
        }
        starsHtml += '</span>';
        const numericValue = rating.toFixed(1);
        return '<div class="gl-rating">' +
            (label ? '<span class="gl-rating__label">' + label + ': </span>' : '') +
            starsHtml +
            '<span class="gl-rating__value">' + numericValue + '/5</span>' +
            '</div>';
    }

    /**
     * Construit un élément de type "image"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderImage(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();
        const Core = getCore();

        let value = resolveField(poi, config.field);
        if ((value == null || value === '') && config.field && config.field.startsWith('properties.')) {
            value = resolveField(poi, config.field.replace(/^properties\./, 'attributes.'));
        }
        if ((value == null || value === '') && config.field && config.field.startsWith('attributes.')) {
            value = resolveField(poi, config.field.replace(/^attributes\./, 'properties.'));
        }
        if (value == null || value === '') return '';

        // Utiliser le validator de Core
        const photoUrl = Core.validateImageUrl ?
            Core.validateImageUrl(value) :
            value;

        if (!photoUrl) return '';

        const alt = escapeHtml(config.label || 'Image');
        const variant = config.variant || 'default';

        if (variant === 'hero') {
            return '<div class="gl-poi-popup__photo"><img src="' + photoUrl + '" alt="' + alt + '" loading="lazy" /></div>';
        }

        return '<div class="gl-poi-popup__photo"><img src="' + photoUrl + '" alt="' + alt + '" loading="lazy" /></div>';
    }

    /**
     * Construit un élément de type "link"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderLink(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();

        let value = resolveField(poi, config.field);
        if ((value == null || value === '') && config.field && config.field.startsWith('properties.')) {
            value = resolveField(poi, config.field.replace(/^properties\./, 'attributes.'));
        }
        if ((value == null || value === '') && config.field && config.field.startsWith('attributes.')) {
            value = resolveField(poi, config.field.replace(/^attributes\./, 'properties.'));
        }
        if (value == null || value === '') return '';

        const label = escapeHtml(config.label || value);
        const variant = config.variant || 'default';

        if (variant === 'button') {
            return '<a href="' + escapeHtml(value) + '" target="_blank" rel="noopener noreferrer" class="gl-content__link gl-content__link--button">' + label + '</a>';
        }

        return '<a href="' + escapeHtml(value) + '" target="_blank" rel="noopener noreferrer" class="gl-content__link">' + label + '</a>';
    }

    /**
     * Construit un élément de type "list"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderList(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();

        let value = resolveField(poi, config.field);
        if ((value == null || value === '') && config.field && config.field.startsWith('properties.')) {
            value = resolveField(poi, config.field.replace(/^properties\./, 'attributes.'));
        }
        if ((value == null || value === '') && config.field && config.field.startsWith('attributes.')) {
            value = resolveField(poi, config.field.replace(/^attributes\./, 'properties.'));
        }
        if (value == null) return '';

        let items = [];
        if (Array.isArray(value)) {
            items = value;
        } else if (typeof value === 'object') {
            items = Object.entries(value).map(([k, v]) => k + ': ' + v);
        } else {
            return '';
        }

        if (items.length === 0) return '';

        // Utiliser Templates si disponible, sinon fallback
        if (GeoLeaf._ContentBuilder && GeoLeaf._ContentBuilder.Templates) {
            return GeoLeaf._ContentBuilder.Templates.createListElement(items, config, escapeHtml);
        }

        // Fallback si Templates pas chargé
        const variant = config.variant || 'disc';
        const listClass = 'gl-content__list gl-content__list--' + variant;
        let html = '<ul class="' + listClass + '">';
        items.forEach(item => {
            html += '<li>' + escapeHtml(String(item)) + '</li>';
        });
        html += '</ul>';
        return html;
    }

    /**
     * Construit un élément de type "table"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderTable(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();

        const value = resolveField(poi, config.field);
        if (value == null || !Array.isArray(value) || value.length === 0) return '';

        const columns = config.columns || [];
        if (columns.length === 0) return '';

        const borders = config.borders || {};
        let tableStyle = '';
        if (borders.color) {
            tableStyle += '--gl-table-border-color: ' + borders.color + ';';
        }

        let tableClass = 'gl-content__table';
        if (borders.outer) tableClass += ' gl-content__table--border-outer';
        if (borders.row) tableClass += ' gl-content__table--border-row';
        if (borders.column) tableClass += ' gl-content__table--border-column';

        let html = '<table class="' + tableClass + '"' + (tableStyle ? ' style="' + tableStyle + '"' : '') + '>';

        // Header
        html += '<thead><tr>';
        columns.forEach(col => {
            html += '<th>' + escapeHtml(col.label || col.key) + '</th>';
        });
        html += '</tr></thead>';

        // Body
        html += '<tbody>';
        value.forEach(row => {
            html += '<tr>';
            columns.forEach(col => {
                const cellValue = typeof row === 'object' ? (row[col.key] || '') : row;
                html += '<td>' + escapeHtml(String(cellValue)) + '</td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table>';

        return html;
    }

    /**
     * Construit un élément de type "tags"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderTags(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();

        const value = resolveField(poi, config.field);
        if (value == null || !Array.isArray(value) || value.length === 0) return '';

        const validTags = value.filter(tag => tag && typeof tag === 'string');
        if (validTags.length === 0) return '';

        // Utiliser Templates si disponible, sinon fallback
        if (GeoLeaf._ContentBuilder && GeoLeaf._ContentBuilder.Templates) {
            return GeoLeaf._ContentBuilder.Templates.createTagsElement(validTags, config, escapeHtml);
        }

        // Fallback si Templates pas chargé
        let html = '<div class="gl-content__tags">';
        validTags.forEach(tag => {
            html += '<span class="gl-content__tag">' + escapeHtml(tag) + '</span>';
        });
        html += '</div>';
        return html;
    }

    /**
     * Construit un élément de type "coordinates"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderCoordinates(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();
        const Core = getCore();

        const value = resolveField(poi, config.field);
        if (value == null) return '';

        // Utiliser le validator de Core
        const coords = Core.validateCoordinates ?
            Core.validateCoordinates(value) :
            null;

        if (!coords) return '';

        // Utiliser Templates si disponible, sinon fallback
        if (GeoLeaf._ContentBuilder && GeoLeaf._ContentBuilder.Templates) {
            return GeoLeaf._ContentBuilder.Templates.createCoordinatesElement(coords.lat, coords.lng, config, escapeHtml);
        }

        // Fallback si Templates pas chargé
        const label = config.label ? escapeHtml(config.label) : 'Coordonnées';
        const formatted = Core.formatCoordinates ?
            Core.formatCoordinates(coords.lat, coords.lng) :
            coords.lat.toFixed(6) + ', ' + coords.lng.toFixed(6);
        return '<div class="gl-content__coordinates">' +
            '<span class="gl-content__coordinates-label">' + label + ':</span> ' +
            '<span class="gl-content__coordinates-value">' + formatted + '</span>' +
            '</div>';
    }

    /**
     * Construit un élément de type "gallery"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderGallery(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();

        const value = resolveField(poi, config.field);
        if (value == null || !Array.isArray(value) || value.length === 0) return '';

        const validPhotos = value.filter(url => url && typeof url === 'string');
        if (validPhotos.length === 0) return '';

        // Utiliser Templates si disponible, sinon fallback
        if (GeoLeaf._ContentBuilder && GeoLeaf._ContentBuilder.Templates) {
            return GeoLeaf._ContentBuilder.Templates.createGalleryElement(validPhotos, config, escapeHtml);
        }

        // Fallback si Templates pas chargé
        let html = '<div class="gl-content__gallery">';
        validPhotos.forEach((imgUrl, index) => {
            html += '<div class="gl-content__gallery-item" data-index="' + index + '">' +
                '<img src="' + escapeHtml(imgUrl) + '" alt="Image ' + (index + 1) + '" loading="lazy" />' +
                '</div>';
        });
        html += '</div>';
        return html;
    }

    // ========================================
    //   REGISTRE DES RENDERERS
    // ========================================

    const RENDERERS = {
        text: renderText,
        longtext: renderLongtext,
        number: renderNumber,
        metric: renderMetric,
        badge: renderBadge,
        rating: renderRating,
        image: renderImage,
        link: renderLink,
        list: renderList,
        table: renderTable,
        tags: renderTags,
        coordinates: renderCoordinates,
        gallery: renderGallery
    };

    /**
     * Rend un élément selon son type
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderItem(poi, config, options = {}) {
        if (!config || !config.type) return '';

        const renderer = RENDERERS[config.type];
        if (!renderer) {
            getLog().warn('[ContentBuilder] Type de rendu non supporté:', config.type);
            return '';
        }

        return renderer(poi, config, options);
    }

    // ========================================
    //   ASSEMBLEURS (via module Assemblers)
    // ========================================

    function getAssemblers() {
        return global.GeoLeaf?._ContentBuilder?.Assemblers || null;
    }

    /**
     * Construit le HTML complet d'un popup
     * Délègue à Assemblers.buildPopupHTML si disponible
     */
    function buildPopupHTML(poi, config, options = {}) {
        const Assemblers = getAssemblers();

        // ...logs supprimés ([POPUP] wrapper buildPopupHTML)...
        if (Assemblers && Assemblers.buildPopupHTML) {
            return Assemblers.buildPopupHTML(poi, config, options);
        }
        // Fallback minimal
        if (!poi) return '';
        const escapeHtml = getEscapeHtml();
        const title = poi.title || poi.label || poi.name || 'Sans titre';
        return '<div class="gl-poi-popup"><div class="gl-poi-popup__body">' +
               '<h3 class="gl-poi-popup__title"><span class="gl-poi-popup__title-text">' +
               escapeHtml(title) + '</span></h3>' +
               '<a href="#" class="gl-poi-popup__link" data-poi-id="' + (poi.id || '') +
               '">Voir plus >>></a></div></div>';
    }

    /**
     * Construit le HTML d'un tooltip
     * Délègue à Assemblers.buildTooltipHTML si disponible
     */
    function buildTooltipHTML(poi, config, options = {}) {
        const Assemblers = getAssemblers();
        if (Assemblers && Assemblers.buildTooltipHTML) {
            return Assemblers.buildTooltipHTML(poi, config, options);
        }

        // Fallback minimal
        if (!poi) return '';
        const escapeHtml = getEscapeHtml();
        const resolveField = getResolveField();
        const title = poi.title || poi.label || poi.name ||
                      resolveField(poi, 'attributes.name', 'attributes.nom', 'properties.name', 'properties.nom') ||
                      'Sans titre';
        return escapeHtml(String(title));
    }

    /**
     * Construit les éléments DOM pour un panneau latéral
     * Délègue à Assemblers.buildPanelItems si disponible
     */
    function buildPanelItems(poi, config, options = {}) {
        const Assemblers = getAssemblers();
        if (Assemblers && Assemblers.buildPanelItems) {
            return Assemblers.buildPanelItems(poi, config, options);
        }

        // Fallback minimal
        return [];
    }

    // ========================================
    //   EXPORT
    // ========================================

    // Preserve existing Assemblers if it exists
    const existingAssemblers = global.GeoLeaf?._ContentBuilder?.Assemblers;

    GeoLeaf._ContentBuilder = {
        // Renderers individuels
        renderText,
        renderLongtext,
        renderNumber,
        renderBadge,
        renderImage,
        renderLink,
        renderList,
        renderTable,
        renderTags,
        renderCoordinates,
        renderGallery,
        renderItem,

        // Assembleurs
        buildPopupHTML,
        buildTooltipHTML,
        buildPanelItems,

        // Utilitaires exposés
        getResolveField,
        getEscapeHtml,
        getActiveProfile
    };

    // Restore Assemblers module reference
    if (existingAssemblers) {
        GeoLeaf._ContentBuilder.Assemblers = existingAssemblers;
    }

    global.GeoLeaf = GeoLeaf;

    getLog().info('[GeoLeaf._ContentBuilder] Module Content Builder chargé');

})(typeof window !== 'undefined' ? window : global);
