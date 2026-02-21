/**
 * @fileoverview Example Renderer Implementation using AbstractRenderer
 * @description Demonstrates how to extend AbstractRenderer base class
 * @version 1.0.0
 * @phase Phase 5 - Code Optimization
 *
 * @example Usage
 * ```javascript
 * const renderer = new GeoLeaf._Renderers.SimpleTextRenderer({
 *     name: 'SimpleTextRenderer',
 *     debug: true
 * });
 *
 * const element = renderer.render({
 *     title: 'Hello World',
 *     description: 'This is a test'
 * });
 *
 * document.body.appendChild(element);
 * ```
 */
"use strict";

import { AbstractRenderer } from './abstract-renderer.js';

/**
 * @class SimpleTextRenderer
 * @extends AbstractRenderer
 * @description Simple renderer for text-based POI information
 *
 * Shows how to:
 * - Extend AbstractRenderer
 * - Use inherited utilities (createElement, log, etc.)
 * - Implement render() method
 * - Leverage dependency resolution
 * - Use state management
 * - Handle events with automatic cleanup
 */
class SimpleTextRenderer extends AbstractRenderer {
    /**
     * @constructor
     * @param {Object} [options={}] - Renderer options
     * @param {boolean} [options.showIcon=true] - Show icon in title
     * @param {string} [options.theme='light'] - Theme (light/dark)
     */
    constructor(options = {}) {
        super({
            name: 'SimpleTextRenderer',
            debug: options.debug || false,
            config: {
                showIcon: options.showIcon !== false,
                theme: options.theme || 'light'
            }
        });

        this.init();
    }

    /**
     * Override init for custom initialization
     * @protected
     */
    init() {
        super.init();
        this.debug('Initializing with config:', this._config);
    }

    /**
     * Render POI data as HTML element
     * @override
     * @param {Object} poi - POI data
     * @param {string} poi.title - POI title
     * @param {string} [poi.description] - POI description
     * @param {string} [poi.categoryId] - Category ID for icon
     * @param {Object} [options={}] - Render options
     * @param {string} [options.context='default'] - Render context
     * @returns {HTMLElement} Rendered element
     */
    render(poi, options = {}) {
        if (!poi) {
            this.warn('render: no POI data provided');
            return null;
        }

        this.debug('Rendering POI:', poi.title || poi.id);

        // Create container
        const container = this.createElement('div', 'simple-text-renderer', {
            'data-poi-id': poi.id || 'unknown',
            'data-context': options.context || 'default'
        });

        // Store state
        this.setState(container, {
            poi: poi,
            renderTime: Date.now(),
            context: options.context
        });

        // Render title
        const title = this._renderTitle(poi);
        if (title) container.appendChild(title);

        // Render description
        const description = this._renderDescription(poi);
        if (description) container.appendChild(description);

        // Add click handler example
        this.addEventListener(container, 'click', (e) => {
            this._handleClick(e, poi);
        });

        this.info('Rendered POI successfully');
        return container;
    }

    /**
     * Render title element
     * @private
     * @param {Object} poi - POI data
     * @returns {HTMLElement} Title element
     */
    _renderTitle(poi) {
        const utils = this.getUtils();
        const title = utils.resolveField(poi, 'title', 'label', 'name') || 'Untitled';

        const titleElement = this.createTextElement('h3', title, 'simple-text-renderer__title');

        // Add icon if enabled
        if (this._config.showIcon && poi.categoryId) {
            const icon = this._createIcon(poi.categoryId);
            if (icon) {
                titleElement.insertBefore(icon, titleElement.firstChild);
            }
        }

        return titleElement;
    }

    /**
     * Render description element
     * @private
     * @param {Object} poi - POI data
     * @returns {HTMLElement|null} Description element or null
     */
    _renderDescription(poi) {
        const utils = this.getUtils();
        const description = utils.resolveField(poi, 'description', 'desc');

        if (!description) return null;

        return this.createTextElement('p', description, 'simple-text-renderer__description');
    }

    /**
     * Create icon element
     * @private
     * @param {string} categoryId - Category ID
     * @returns {HTMLElement|null} Icon element or null
     */
    _createIcon(categoryId) {
        const profile = this.getActiveProfile();
        if (!profile || !profile.icons) return null;

        const iconSpan = this.createElement('span', 'simple-text-renderer__icon');
        iconSpan.textContent = '📍'; // Fallback emoji icon
        iconSpan.style.marginRight = '8px';

        return iconSpan;
    }

    /**
     * Handle container click
     * @private
     * @param {MouseEvent} event - Click event
     * @param {Object} poi - POI data
     */
    _handleClick(event, poi) {
        const state = this.getState(event.currentTarget);
        this.info('Clicked POI:', poi.title, 'State:', state);

        // Update state
        this.updateState(event.currentTarget, {
            lastClicked: Date.now(),
            clickCount: (state.clickCount || 0) + 1
        });

        // Dispatch custom event
        const customEvent = new CustomEvent('poi:click', {
            detail: { poi, state },
            bubbles: true
        });
        event.currentTarget.dispatchEvent(customEvent);
    }

    /**
     * Override destroy for custom cleanup
     * @override
     * @public
     */
    destroy() {
        this.debug('Destroying SimpleTextRenderer');
        super.destroy();
    }
}

export { SimpleTextRenderer };
