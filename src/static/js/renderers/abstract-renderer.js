/**
 * @fileoverview Abstract Renderer Base Class
 * @description Base class providing common functionality for all renderers
 * @version 1.0.0
 * @phase Phase 5 - Code Optimization
 *
 * @author GeoLeaf Team
 * @since 3.1.0
 *
 * @benefits
 * - Eliminates ~20% code duplication across renderers
 * - Unified dependency resolution pattern
 * - Consistent error handling and logging
 * - Easier testing and maintenance
 */

(function (global) {
    'use strict';

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    if (!GeoLeaf._Renderers) GeoLeaf._Renderers = {};

    /**
     * @class AbstractRenderer
     * @description Base class for all renderer implementations
     *
     * Common Patterns Extracted:
     * - Dependency resolution (Log, Security, Config, Utils)
     * - DOM element creation helpers
     * - Event handler registration/cleanup
     * - State management
     * - Error handling and logging
     *
     * @example
     * class MyCustomRenderer extends AbstractRenderer {
     *     constructor(options) {
     *         super(options);
     *         this.init();
     *     }
     *
     *     render(data) {
     *         this.log('info', 'Rendering data', data);
     *         const element = this.createElement('div', 'my-class');
     *         // ... custom rendering logic
     *         return element;
     *     }
     * }
     */
    class AbstractRenderer {
        /**
         * @constructor
         * @param {Object} [options={}] - Renderer configuration options
         * @param {string} [options.name='Renderer'] - Renderer name for logging
         * @param {Object} [options.config={}] - Custom configuration
         * @param {boolean} [options.debug=false] - Enable debug logging
         */
        constructor(options = {}) {
            /**
             * @private
             * @type {string}
             */
            this._name = options.name || 'Renderer';

            /**
             * @private
             * @type {Object}
             */
            this._config = options.config || {};

            /**
             * @private
             * @type {boolean}
             */
            this._debug = options.debug || false;

            /**
             * @private
             * @type {Array<Function>}
             */
            this._eventListeners = [];

            /**
             * @private
             * @type {boolean}
             */
            this._initialized = false;

            /**
             * @private
             * @type {WeakMap<HTMLElement, Object>}
             */
            this._stateMap = new WeakMap();
        }

        // ========================================
        //   DEPENDENCY RESOLUTION
        // ========================================

        /**
         * Get Log utility with fallback
         * @protected
         * @returns {Object} Log object
         */
        getLog() {
            return GeoLeaf.Log || console;
        }

        /**
         * Get Security utilities with fallback
         * @protected
         * @returns {Object} Security object with escapeHtml function
         */
        getSecurity() {
            if (GeoLeaf.Security && typeof GeoLeaf.Security.escapeHtml === 'function') {
                return GeoLeaf.Security;
            }
            // Fallback security utilities
            return {
                escapeHtml: (str) => {
                    if (str == null) return '';
                    const div = document.createElement('div');
                    div.textContent = String(str);
                    return div.innerHTML;
                },
                setSafeHTML: (element, html) => {
                    if (!element) return;
                    if (GeoLeaf.DOMSecurity && typeof GeoLeaf.DOMSecurity.setSafeHTML === 'function') {
                        GeoLeaf.DOMSecurity.setSafeHTML(element, html);
                    } else {
                        element.textContent = html; // Safe fallback
                    }
                }
            };
        }

        /**
         * Get Utils with field resolution
         * @protected
         * @returns {Object} Utils object with resolveField function
         */
        getUtils() {
            if (GeoLeaf.Utils && typeof GeoLeaf.Utils.resolveField === 'function') {
                return GeoLeaf.Utils;
            }
            // Fallback resolveField implementation
            return {
                resolveField: (obj, ...paths) => {
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
                }
            };
        }

        /**
         * Get active profile configuration
         * @protected
         * @returns {Object|null} Active profile or null
         */
        getActiveProfile() {
            if (GeoLeaf.Config && typeof GeoLeaf.Config.getActiveProfile === 'function') {
                return GeoLeaf.Config.getActiveProfile() || null;
            }
            return null;
        }

        // ========================================
        //   LOGGING UTILITIES
        // ========================================

        /**
         * Log message with level
         * @protected
         * @param {string} level - Log level (debug, info, warn, error)
         * @param {string} message - Log message
         * @param {...*} args - Additional arguments
         */
        log(level, message, ...args) {
            if (level === 'debug' && !this._debug) return;

            const log = this.getLog();
            const prefix = `[${this._name}]`;

            switch (level) {
                case 'debug':
                case 'info':
                    log.info(prefix, message, ...args);
                    break;
                case 'warn':
                    log.warn(prefix, message, ...args);
                    break;
                case 'error':
                    log.error(prefix, message, ...args);
                    break;
                default:
                    log.info(prefix, message, ...args);
            }
        }

        /**
         * Log debug message (if debug enabled)
         * @protected
         * @param {string} message - Debug message
         * @param {...*} args - Additional arguments
         */
        debug(message, ...args) {
            this.log('debug', message, ...args);
        }

        /**
         * Log info message
         * @protected
         * @param {string} message - Info message
         * @param {...*} args - Additional arguments
         */
        info(message, ...args) {
            this.log('info', message, ...args);
        }

        /**
         * Log warning message
         * @protected
         * @param {string} message - Warning message
         * @param {...*} args - Additional arguments
         */
        warn(message, ...args) {
            this.log('warn', message, ...args);
        }

        /**
         * Log error message
         * @protected
         * @param {string} message - Error message
         * @param {...*} args - Additional arguments
         */
        error(message, ...args) {
            this.log('error', message, ...args);
        }

        // ========================================
        //   DOM BUILDERS
        // ========================================

        /**
         * Create DOM element with class and attributes
         * @protected
         * @param {string} tagName - HTML tag name
         * @param {string|Array<string>} [className] - CSS class name(s)
         * @param {Object} [attributes={}] - HTML attributes
         * @returns {HTMLElement} Created element
         *
         * @example
         * const div = this.createElement('div', 'my-class', { id: 'my-id', 'data-value': '123' });
         * const button = this.createElement('button', ['btn', 'btn-primary'], { type: 'button' });
         */
        createElement(tagName, className, attributes = {}) {
            const element = document.createElement(tagName);

            if (className) {
                if (Array.isArray(className)) {
                    element.classList.add(...className);
                } else {
                    element.className = className;
                }
            }

            Object.keys(attributes).forEach(key => {
                element.setAttribute(key, attributes[key]);
            });

            return element;
        }

        /**
         * Create text node with safe content
         * @protected
         * @param {string} text - Text content
         * @returns {Text} Text node
         */
        createTextNode(text) {
            return document.createTextNode(text || '');
        }

        /**
         * Create element with safe text content
         * @protected
         * @param {string} tagName - HTML tag name
         * @param {string} text - Text content
         * @param {string} [className] - CSS class name
         * @returns {HTMLElement} Element with text
         */
        createTextElement(tagName, text, className) {
            const element = this.createElement(tagName, className);
            element.textContent = text || '';
            return element;
        }

        /**
         * Create element with safe HTML content
         * @protected
         * @param {string} tagName - HTML tag name
         * @param {string} html - HTML content (will be sanitized)
         * @param {string} [className] - CSS class name
         * @returns {HTMLElement} Element with HTML
         */
        createHTMLElement(tagName, html, className) {
            const element = this.createElement(tagName, className);
            const security = this.getSecurity();
            security.setSafeHTML(element, html);
            return element;
        }

        /**
         * Append multiple children to parent element
         * @protected
         * @param {HTMLElement} parent - Parent element
         * @param {...HTMLElement} children - Child elements to append
         * @returns {HTMLElement} Parent element (for chaining)
         */
        appendChildren(parent, ...children) {
            children.forEach(child => {
                if (child) parent.appendChild(child);
            });
            return parent;
        }

        // ========================================
        //   EVENT HANDLING
        // ========================================

        /**
         * Register event listener with automatic cleanup
         * @protected
         * @param {HTMLElement} element - Target element
         * @param {string} event - Event name
         * @param {Function} handler - Event handler
         * @param {Object} [options] - Event listener options
         * @returns {Function} Cleanup function
         */
        addEventListener(element, event, handler, options) {
            if (!element || !event || !handler) {
                this.warn('addEventListener: invalid parameters');
                return () => {};
            }

            const boundHandler = handler.bind(this);
            element.addEventListener(event, boundHandler, options);

            // Store for cleanup
            const cleanup = () => {
                element.removeEventListener(event, boundHandler, options);
            };
            this._eventListeners.push(cleanup);

            return cleanup;
        }

        /**
         * Remove all registered event listeners
         * @protected
         */
        removeAllEventListeners() {
            this._eventListeners.forEach(cleanup => cleanup());
            this._eventListeners = [];
        }

        // ========================================
        //   STATE MANAGEMENT
        // ========================================

        /**
         * Set element state
         * @protected
         * @param {HTMLElement} element - Element to store state for
         * @param {Object} state - State data
         */
        setState(element, state) {
            if (element) {
                this._stateMap.set(element, { ...state });
            }
        }

        /**
         * Get element state
         * @protected
         * @param {HTMLElement} element - Element to get state from
         * @returns {Object|null} Element state or null
         */
        getState(element) {
            return element ? this._stateMap.get(element) || null : null;
        }

        /**
         * Update element state (merge with existing)
         * @protected
         * @param {HTMLElement} element - Element to update state for
         * @param {Object} updates - State updates to merge
         */
        updateState(element, updates) {
            if (element) {
                const currentState = this.getState(element) || {};
                this.setState(element, { ...currentState, ...updates });
            }
        }

        /**
         * Delete element state
         * @protected
         * @param {HTMLElement} element - Element to delete state for
         */
        deleteState(element) {
            if (element) {
                this._stateMap.delete(element);
            }
        }

        // ========================================
        //   LIFECYCLE METHODS
        // ========================================

        /**
         * Initialize renderer (called in constructor or manually)
         * Override in subclasses for custom initialization
         * @protected
         */
        init() {
            if (this._initialized) {
                this.warn('Renderer already initialized');
                return;
            }

            this.debug('Initializing renderer');
            this._initialized = true;
        }

        /**
         * Check if renderer is initialized
         * @public
         * @returns {boolean} true if initialized
         */
        isInitialized() {
            return this._initialized;
        }

        /**
         * Destroy renderer and cleanup resources
         * @public
         */
        destroy() {
            this.debug('Destroying renderer');
            this.removeAllEventListeners();
            this._stateMap = new WeakMap();
            this._initialized = false;
        }

        // ========================================
        //   ABSTRACT METHODS (to be overridden)
        // ========================================

        /**
         * Render content (must be implemented by subclasses)
         * @abstract
         * @param {*} data - Data to render
         * @param {Object} [options] - Render options
         * @returns {HTMLElement|string|null} Rendered content
         * @throws {Error} If not implemented
         */
        render(data, options) {
            throw new Error(`${this._name}.render() must be implemented by subclass`);
        }
    }

    // Export to GeoLeaf namespace
    GeoLeaf._Renderers.AbstractRenderer = AbstractRenderer;

    if (GeoLeaf.Log) {
        GeoLeaf.Log.info('[GeoLeaf._Renderers.AbstractRenderer] Base class loaded');
    }

})(window);
