/**
 * GeoLeaf UI Content Builder - Shared Renderers
 * Fonctions de rendu individuelles réutilisables par tous les contextes.
 *
 * @module ui/content-builder/renderers-shared
 * @version 2.0.0
 * @phase Phase 3 - UI Refactoring
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    if (!GeoLeaf._ContentBuilder) GeoLeaf._ContentBuilder = {};

    // ========================================
    //   UTILITAIRES DE DÉPENDANCES
    // ========================================

    /**
     * Récupère la fonction resolveField depuis Utils
     * @returns {Function}
     */
    function getResolveField() {
        if (GeoLeaf.Utils && typeof GeoLeaf.Utils.resolveField === 'function') {
            return GeoLeaf.Utils.resolveField;
        }
        // Fallback minimal si Utils non chargé
        return function (obj, ...paths) {
            if (!obj) return null;
            for (const path of paths) {
                if (!path) continue;
                const parts = String(path).split('.');
                let current = obj;
                let found = true;
                for (const part of parts) {
                    if (current && typeof current === 'object' && part in current) {
                        current = current[part];
                    } else {
                        found = false;
                        break;
                    }
                }
                if (found && current !== undefined && current !== null) {
                    return current;
                }
            }
            return null;
        };
    }

    /**
     * Récupère la fonction escapeHtml depuis Security
     * @returns {Function}
     */
    function getEscapeHtml() {
        if (GeoLeaf.Security && typeof GeoLeaf.Security.escapeHtml === 'function') {
            return GeoLeaf.Security.escapeHtml;
        }
        // Fallback minimal si Security non chargé
        return function (str) {
            if (str == null) return '';
            const div = document.createElement('div');
            div.textContent = String(str);
            return div.innerHTML;
        };
    }

    /**
     * Récupère le profil actif
     * @returns {Object|null}
     */
    function getActiveProfile() {
        if (GeoLeaf.Config && typeof GeoLeaf.Config.getActiveProfile === 'function') {
            return GeoLeaf.Config.getActiveProfile() || null;
        }
        return null;
    }

    /**
     * Récupère le Log
     * @returns {Object}
     */
    function getLog() {
        return GeoLeaf.Log || console;
    }

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

        const value = resolveField(poi, config.field);
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
                        '<svg x="4" y="4" width="16" height="16" viewBox="0 0 32 32"><use href="#' + symbolId + '" style="color: #ffffff"/></svg>' +
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

        const value = resolveField(poi, config.field);
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

        const value = resolveField(poi, config.field);
        if (value == null || value === '') return '';

        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numValue)) return '';

        // Formater le nombre
        if (GeoLeaf.Utils && GeoLeaf.Utils.formatNumber) {
            return GeoLeaf.Utils.formatNumber(numValue);
        }
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
     * Construit un élément de type "rating" (note avec étoiles)
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderRating(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();

        const value = resolveField(poi, config.field);
        if (value == null || value === '') return '';

        const rating = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(rating)) return '';

        const label = config.label ? escapeHtml(config.label) : '';
        const variant = config.variant || 'default';
        const context = options.context || 'popup';

        // Affichage des étoiles (sur 5)
        let starsHtml = '<span class="gl-rating__stars">';
        for (let i = 1; i <= 5; i++) {
            const isFilled = i <= Math.round(rating);
            starsHtml += '<span class="gl-rating__star' + (isFilled ? ' gl-rating__star--filled' : '') + '">★</span>';
        }
        starsHtml += '</span>';

        // Affichage de la note numérique
        const numericValue = rating.toFixed(1);

        if (variant === 'stat') {
            return '<div class="gl-rating gl-rating--stat">' +
                (label ? '<span class="gl-rating__label">' + label + '</span>' : '') +
                '<div class="gl-rating__content">' +
                starsHtml +
                '<span class="gl-rating__value">' + numericValue + '/5</span>' +
                '</div>' +
                '</div>';
        }

        // Variant par défaut (compact)
        return '<div class="gl-rating">' +
            (label ? '<span class="gl-rating__label">' + label + ': </span>' : '') +
            starsHtml +
            '<span class="gl-rating__value">' + numericValue + '/5</span>' +
            '</div>';
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

        const value = resolveField(poi, config.field);
        if (value == null || value === '') return '';

        const profile = getActiveProfile();
        const taxonomy = profile?.taxonomy;
        const variant = config.variant || 'default';

        let displayValue = value;
        let style = '';

        // Résolution du label (taxonomy) et des couleurs (depuis styleRules de la couche)
        if (taxonomy && config.field) {
            const attrs = poi.attributes || {};

            if (config.field.includes('categoryId') && !config.field.includes('subCategoryId')) {
                // Catégorie principale
                const catData = taxonomy.categories?.[value];
                if (catData?.label) displayValue = catData.label;

                // Couleurs depuis les styleRules de la couche
                if (GeoLeaf.Helpers && GeoLeaf.Helpers.StyleResolver && poi._layerConfig) {
                    const styleColors = GeoLeaf.Helpers.StyleResolver.getColorsFromLayerStyle(poi, poi._layerConfig.id);
                    if (styleColors && styleColors.fillColor) {
                        style += 'background-color: ' + styleColors.fillColor + ';';
                    }
                    if (styleColors && styleColors.color) {
                        style += 'border-color: ' + styleColors.color + ';';
                    }
                }
            } else if (config.field.includes('subCategoryId')) {
                // Sous-catégorie
                const catId = attrs.categoryId || attrs.category;
                const catData = taxonomy.categories?.[catId];
                const subCatData = catData?.subcategories?.[value];

                if (subCatData?.label) displayValue = subCatData.label;

                // Couleurs depuis les styleRules de la couche
                if (GeoLeaf.Helpers && GeoLeaf.Helpers.StyleResolver && poi._layerConfig) {
                    const styleColors = GeoLeaf.Helpers.StyleResolver.getColorsFromLayerStyle(poi, poi._layerConfig.id);
                    if (styleColors && styleColors.fillColor) {
                        style += 'background-color: ' + styleColors.fillColor + ';';
                    }
                    if (styleColors && styleColors.color) {
                        style += 'border-color: ' + styleColors.color + ';';
                    }
                }
            }
        }

        const escaped = escapeHtml(String(displayValue));
        const badgeClass = 'gl-poi-badge gl-poi-badge--' + variant;

        return '<span class="' + badgeClass + '"' + (style ? ' style="' + style + '"' : '') + '>' + escaped + '</span>';
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

        const value = resolveField(poi, config.field);
        if (value == null || value === '') return '';

        // Validation basique de l'URL
        let photoUrl = null;
        if (GeoLeaf.Security && typeof GeoLeaf.Security.validateUrl === 'function') {
            try {
                photoUrl = GeoLeaf.Security.validateUrl(value);
            } catch (e) {
                getLog().warn('[ContentBuilder.Shared] URL image invalide:', e.message);
                return '';
            }
        } else if (/^https?:\/\//i.test(value) || /^data:image\//i.test(value) || value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
            photoUrl = value;
        }

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

        const value = resolveField(poi, config.field);
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

        const value = resolveField(poi, config.field);
        if (value == null) return '';

        const variant = config.variant || 'disc';
        let items = [];

        if (Array.isArray(value)) {
            items = value;
        } else if (typeof value === 'object') {
            // Objet clé-valeur (ex: price)
            items = Object.entries(value).map(([k, v]) => k + ': ' + v);
        } else {
            return '';
        }

        if (items.length === 0) return '';

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

        let html = '<div class="gl-content__tags">';
        value.forEach(tag => {
            if (tag && typeof tag === 'string') {
                html += '<span class="gl-content__tag">' + escapeHtml(tag) + '</span>';
            }
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

        const value = resolveField(poi, config.field);
        if (value == null) return '';

        let lat, lng;

        if (Array.isArray(value) && value.length >= 2) {
            [lat, lng] = value;
        } else if (typeof value === 'object' && value.lat !== undefined && value.lng !== undefined) {
            lat = value.lat;
            lng = value.lng;
        } else {
            return '';
        }

        const label = config.label ? escapeHtml(config.label) : 'Coordonnées';
        const formatted = lat.toFixed(6) + ', ' + lng.toFixed(6);

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

        let html = '<div class="gl-content__gallery">';
        value.forEach((imgUrl, index) => {
            if (imgUrl && typeof imgUrl === 'string') {
                html += '<div class="gl-content__gallery-item" data-index="' + index + '">' +
                    '<img src="' + escapeHtml(imgUrl) + '" alt="Image ' + (index + 1) + '" loading="lazy" />' +
                    '</div>';
            }
        });
        html += '</div>';

        return html;
    }

    /**
     * Construit un élément de type "reviews"
     * @param {Object} poi - Données du POI
     * @param {Object} config - Configuration de l'élément
     * @param {Object} options - Options de rendu
     * @returns {string} HTML
     */
    function renderReviews(poi, config, options = {}) {
        const resolveField = getResolveField();
        const escapeHtml = getEscapeHtml();

        const value = resolveField(poi, config.field);
        if (value == null || !Array.isArray(value) || value.length === 0) return '';

        let html = '<div class="gl-content__reviews">';
        value.forEach(review => {
            if (!review) return;

            html += '<div class="gl-content__review">';

            // Rating (étoiles)
            if (review.rating !== undefined) {
                const rating = parseFloat(review.rating) || 0;
                html += '<div class="gl-content__review-rating">';
                for (let i = 1; i <= 5; i++) {
                    html += '<span class="gl-content__review-star' + (i <= rating ? ' gl-content__review-star--filled' : '') + '">★</span>';
                }
                html += '</div>';
            }

            // Texte
            if (review.text || review.comment) {
                html += '<p class="gl-content__review-text">' + escapeHtml(review.text || review.comment) + '</p>';
            }

            // Auteur et date
            if (review.author || review.date) {
                html += '<div class="gl-content__review-meta">';
                if (review.author) {
                    html += '<span class="gl-content__review-author">' + escapeHtml(review.author) + '</span>';
                }
                if (review.date) {
                    html += '<span class="gl-content__review-date">' + escapeHtml(review.date) + '</span>';
                }
                html += '</div>';
            }

            html += '</div>';
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
        rating: renderRating,
        badge: renderBadge,
        image: renderImage,
        link: renderLink,
        list: renderList,
        table: renderTable,
        tags: renderTags,
        coordinates: renderCoordinates,
        gallery: renderGallery,
        reviews: renderReviews
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
            getLog().warn('[ContentBuilder.Shared] Type de rendu non supporté:', config.type);
            return '';
        }

        return renderer(poi, config, options);
    }

    // ========================================
    //   EXPORT
    // ========================================

    GeoLeaf._ContentBuilder.Shared = {
        // Renderers individuels
        renderText,
        renderLongtext,
        renderNumber,
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
        getLog
    };

    if (getLog().debug) {
        getLog().debug('[ContentBuilder.Shared] Renderers partagés chargés');
    }

})(typeof window !== 'undefined' ? window : global);
