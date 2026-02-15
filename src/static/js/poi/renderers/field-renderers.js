/**
 * POI Renderers - Field Renderers Module (Migrated to AbstractRenderer)
 * Rendu des champs simples: texte, badges, liens, tags
 *
 * @module poi/renderers/field-renderers
 * @requires renderers/abstract-renderer
 * @version 2.0.0 - Migrated to AbstractRenderer base class
 */
((global) => {
    'use strict';

    const GeoLeaf = global.GeoLeaf || {};

    // Ensure AbstractRenderer is loaded
    if (!GeoLeaf._Renderers || !GeoLeaf._Renderers.AbstractRenderer) {
        if (GeoLeaf.Log) {
            GeoLeaf.Log.error('[FieldRenderers] AbstractRenderer not loaded! Load abstract-renderer.js first.');
        }
        return;
    }

    const AbstractRenderer = GeoLeaf._Renderers.AbstractRenderer;

    /**
     * @class FieldRenderers
     * @extends AbstractRenderer
     * @description Renders simple POI fields: text, badges, links, tags
     */
    class FieldRenderers extends AbstractRenderer {
        constructor(options = {}) {
            super({
                name: 'FieldRenderers',
                debug: options.debug || false,
                config: options.config || {}
            });
            this.init();
        }

        /**
         * Render method (required by AbstractRenderer)
         * Delegates to specific render methods
         * @param {Object} data - Render data {section, poi, value, type}
         * @returns {HTMLElement|null} Rendered element
         */
        render(data) {
            const { section, poi, value, type } = data;

            switch (type) {
                case 'text':
                    return this.renderText(section, poi, value);
                case 'badge':
                    return this.renderBadge(section, value, poi);
                case 'link':
                    return this.renderLink(section, value);
                case 'tags':
                    return this.renderTags(section, value);
                default:
                    this.warn('Unknown render type:', type);
                    return null;
            }
        }

        /**
         * Rend un champ texte (title, description, etc.)
         * @param {Object} section - Section config
         * @param {Object} poi - POI data
         * @param {string} value - Text value
         * @returns {HTMLElement|null}
         */
        async renderText(section, poi, value) {
            const security = this.getSecurity();

            // Cas spécial pour le titre avec icône
            if (section.style === 'title' || section.variant === 'title') {
                return await this._renderTitleWithIcon(poi, value);
            }

            // Texte normal ou multiline
            if (!value) {
                this.warn('renderText: no value provided');
                return null;
            }

            const element = this.createElement(
                section.variant === 'multiline' ? 'div' : 'p',
                'gl-poi-sidepanel__desc'
            );

            if (section.variant === 'multiline') {
                element.style.whiteSpace = 'pre-wrap';
                element.style.lineHeight = '1.6';
            }

            element.textContent = value;
            this.info('renderText: element created, variant:', section.variant || 'normal');

            return element;
        }

        /**
         * Rend un titre avec icône SVG
         * @private
         * @param {Object} poi - POI data
         * @param {string} value - Title text
         * @returns {HTMLElement}
         */
        async _renderTitleWithIcon(poi, value) {
            const titleH2 = this.createElement('h2', 'gl-poi-sidepanel__title');

            // Ajouter l'icône SVG au titre
            const markers = this._getMarkers();
            if (markers && markers.resolveCategoryDisplay && markers.ensureProfileSpriteInjectedSync) {
                const displayInfo = markers.resolveCategoryDisplay(poi);
                this.debug('_renderTitleWithIcon: displayInfo =', displayInfo);

                if (displayInfo.iconId) {
                    await markers.ensureProfileSpriteInjectedSync();

                    const svgIcon = this._createCategoryIcon(displayInfo);
                    if (svgIcon) {
                        this.debug('_renderTitleWithIcon: SVG icon created successfully');
                        titleH2.appendChild(svgIcon);
                    } else {
                        this.warn('_renderTitleWithIcon: SVG icon creation failed');
                    }
                } else {
                    this.debug('_renderTitleWithIcon: No iconId in displayInfo');
                }
            } else {
                this.warn('_renderTitleWithIcon: Markers or required methods not available');
            }

            // Ajouter le texte du titre
            const titleSpan = this.createTextElement('span',
                value || poi.title || poi.label || poi.name || 'POI',
                'gl-poi-sidepanel__title-text'
            );
            titleH2.appendChild(titleSpan);

            this.info('renderText: title element created with icon');
            return titleH2;
        }

        /**
         * Crée une icône SVG de catégorie
         * @private
         * @param {Object} displayInfo - Display information {iconId, colorFill, colorStroke}
         * @returns {SVGElement|null}
         */
        _createCategoryIcon(displayInfo) {
            // Récupérer la config d'icônes depuis GeoLeaf.Config
            const iconsConfig = (GeoLeaf.Config && typeof GeoLeaf.Config.getIconsConfig === 'function')
                ? GeoLeaf.Config.getIconsConfig()
                : null;

            const iconPrefix = (iconsConfig && iconsConfig.symbolPrefix) || "gl-poi-cat-";
            const iconIdNormalized = String(displayInfo.iconId).trim().toLowerCase().replace(/\s+/g, '-');
            const symbolId = iconPrefix + iconIdNormalized;

            this.debug('_createCategoryIcon: symbolId =', symbolId, ', colors =', displayInfo.colorFill, displayInfo.colorStroke);
            this.debug('_createCategoryIcon: iconPrefix from config =', iconPrefix);

            // Vérifier si le sprite existe dans le DOM
            const sprite = document.querySelector('svg[data-geoleaf-sprite="profile"]');
            if (!sprite) {
                this.warn('_createCategoryIcon: Sprite SVG non trouvé dans le DOM! Le sprite doit être chargé avant.');
            } else {
                this.debug('_createCategoryIcon: Sprite trouvé, nombre de symboles:', sprite.querySelectorAll('symbol').length);
            }

            // Vérifier si le symbole existe dans le sprite
            const spriteSymbol = sprite ? sprite.querySelector(`#${symbolId}`) : null;
            if (!spriteSymbol) {
                this.warn('_createCategoryIcon: Symbole non trouvé dans le sprite:', symbolId);
                if (sprite) {
                    // Lister les symboles disponibles pour debug
                    const availableSymbols = Array.from(sprite.querySelectorAll('symbol')).map(s => s.id).slice(0, 5);
                    this.debug('_createCategoryIcon: Premiers symboles disponibles:', availableSymbols);
                }
            }

            const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgIcon.setAttribute('width', '32');
            svgIcon.setAttribute('height', '32');
            svgIcon.setAttribute('viewBox', '0 0 24 24');
            svgIcon.setAttribute('class', 'gl-poi-sidepanel__icon');
            svgIcon.style.marginRight = '10px';
            svgIcon.style.flexShrink = '0';

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '12');
            circle.setAttribute('cy', '12');
            circle.setAttribute('r', '10');
            circle.setAttribute('fill', displayInfo.colorFill || '#3388ff');
            circle.setAttribute('stroke', displayInfo.colorStroke || '#fff');
            circle.setAttribute('stroke-width', '1.5');

            svgIcon.appendChild(circle);

            // Ajouter le symbole uniquement s'il existe
            if (spriteSymbol) {
                // SVG imbriqué pour le symbole (comme dans le popup)
                const innerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                innerSvg.setAttribute('x', '4');
                innerSvg.setAttribute('y', '4');
                innerSvg.setAttribute('width', '16');
                innerSvg.setAttribute('height', '16');
                innerSvg.setAttribute('viewBox', '0 0 32 32');

                const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + symbolId);
                use.setAttribute('href', '#' + symbolId);
                use.style.color = '#ffffff';

                innerSvg.appendChild(use);
                svgIcon.appendChild(innerSvg);
            }

            this.debug('_createCategoryIcon: SVG structure created');
            return svgIcon;
        }

        /**
         * Rend un badge (catégorie, sous-catégorie)
         * @param {Object} section - Section config
         * @param {string} value - Badge text
         * @param {Object} poi - POI data
         * @returns {HTMLElement|null}
         */
        renderBadge(section, value, poi) {
            if (!value) return null;

            const container = this.createElement('div', 'gl-poi-badge-container');
            const badge = this.createTextElement('span', value, 'gl-poi-badge');

            // Récupérer les couleurs depuis la taxonomie
            const markers = this._getMarkers();
            if (markers && markers.resolveCategoryDisplay) {
                const displayInfo = markers.resolveCategoryDisplay(poi);
                if (displayInfo.colorFill) {
                    badge.style.background = displayInfo.colorFill;
                    badge.style.color = '#fff';
                }
            }

            container.appendChild(badge);
            return container;
        }

        /**
         * Rend un lien (website, etc.)
         * @param {Object} section - Section config
         * @param {string} url - URL
         * @returns {HTMLElement|null}
         */
        renderLink(section, url) {
            if (!url) return null;

            const linkP = this.createElement('p', 'gl-poi-sidepanel__link');
            const anchor = this.createElement('a', null, {
                href: url,
                target: '_blank',
                rel: 'noopener noreferrer'
            });

            anchor.textContent = section.linkText || url;
            linkP.appendChild(anchor);

            return linkP;
        }

        /**
         * Rend une liste de tags
         * @param {Object} section - Section config
         * @param {Array<string>} tags - Tags array
         * @returns {HTMLElement|null}
         */
        renderTags(section, tags) {
            if (!tags || !Array.isArray(tags) || tags.length === 0) return null;

            const tagsDiv = this.createElement('div', 'gl-poi-sidepanel__tags');

            tags.forEach(tag => {
                if (tag) {
                    const tagSpan = this.createTextElement('span', tag, 'gl-poi-tag');
                    tagsDiv.appendChild(tagSpan);
                }
            });

            return tagsDiv;
        }

        /**
         * Get POI Markers module
         * @private
         * @returns {Object|null}
         */
        _getMarkers() {
            return GeoLeaf._POIMarkers || null;
        }
    }

    // Export to namespace
    if (!GeoLeaf.POI) GeoLeaf.POI = {};
    if (!GeoLeaf.POI.Renderers) GeoLeaf.POI.Renderers = {};

    GeoLeaf.POI.Renderers.FieldRenderers = FieldRenderers;

    // Lazy singleton instance for backward compatibility
    let instance = null;
    const getInstance = () => {
        if (!instance) {
            instance = new FieldRenderers();
        }
        return instance;
    };

    GeoLeaf.POI.Renderers.renderText = (section, poi, value) =>
        getInstance().renderText(section, poi, value);

    GeoLeaf.POI.Renderers.renderBadge = (section, value, poi) =>
        getInstance().renderBadge(section, value, poi);

    GeoLeaf.POI.Renderers.renderLink = (section, url) =>
        getInstance().renderLink(section, url);

    GeoLeaf.POI.Renderers.renderTags = (section, tags) =>
        getInstance().renderTags(section, tags);

    if (GeoLeaf.Log) {
        GeoLeaf.Log.info('[POI.Renderers.FieldRenderers] Loaded (v2.0 - AbstractRenderer)');
    }

})(window);
