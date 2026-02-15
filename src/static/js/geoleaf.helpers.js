/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Helpers - Performance optimization utilities
 * @module geoleaf.helpers
 * @requires geoleaf.log
 */

(function(global) {
    'use strict';

    // Initialize GeoLeaf namespace
    global.GeoLeaf = global.GeoLeaf || {};

    /**
     * ========================================
     * DOM HELPERS
     * ========================================
     */

    /**
     * Safely get element by ID
     * @param {string} id - Element ID
     * @returns {HTMLElement|null}
     */
    function getElementById(id) {
        if (!id || typeof id !== 'string') return null;
        return document.getElementById(id);
    }

    /**
     * Safely query selector
     * @param {string} selector - CSS selector
     * @param {HTMLElement} parent - Parent element (default: document)
     * @returns {HTMLElement|null}
     */
    function querySelector(selector, parent = document) {
        if (!selector || typeof selector !== 'string') return null;
        try {
            return parent.querySelector(selector);
        } catch (e) {
            return null;
        }
    }

    /**
     * Safely query all selectors
     * @param {string} selector - CSS selector
     * @param {HTMLElement} parent - Parent element (default: document)
     * @returns {Array<HTMLElement>}
     */
    function querySelectorAll(selector, parent = document) {
        if (!selector || typeof selector !== 'string') return [];
        try {
            return Array.from(parent.querySelectorAll(selector));
        } catch (e) {
            return [];
        }
    }

    /**
     * Create element with attributes and content
     * @param {string} tag - HTML tag name
     * @param {object} options - Element options
     * @returns {HTMLElement}
     */
    function createElement(tag, options = {}) {
        const element = document.createElement(tag);

        // Extract known properties
        const {
            className,
            id,
            attributes = {},
            dataset = {},
            styles = {},
            textContent,
            innerHTML,
            children = [],
            ...otherProps
        } = options;

        // Set basic properties
        if (className) element.className = className;
        if (id) element.id = id;

        // Set attributes
        Object.keys(attributes).forEach(key => {
            element.setAttribute(key, attributes[key]);
        });

        // Set dataset
        Object.keys(dataset).forEach(key => {
            element.dataset[key] = dataset[key];
        });

        // Set styles
        Object.keys(styles).forEach(key => {
            element.style[key] = styles[key];
        });

        // Set other properties (like title, ariaLabel, etc.)
        Object.keys(otherProps).forEach(key => {
            if (key === 'ariaLabel') {
                element.setAttribute('aria-label', otherProps[key]);
            } else if (key in element) {
                element[key] = otherProps[key];
            } else {
                element.setAttribute(key, otherProps[key]);
            }
        });

        // Set content
        if (innerHTML) {
            // Use DOMSecurity for safer HTML injection
            const DOMSecurity = global.GeoLeaf?.DOMSecurity;
            if (DOMSecurity && typeof DOMSecurity.setSafeHTML === 'function') {
                DOMSecurity.setSafeHTML(element, innerHTML);
            } else {
                // Fallback: direct innerHTML with warning
                if (Log) Log.warn('[GeoLeaf.Helpers] createElement with innerHTML - DOMSecurity not available');
                GeoLeaf.DOMSecurity.setSafeHTML(element, innerHTML);
            }
        } else if (textContent) {
            // SAFE: textContent escapes HTML automatically
            element.textContent = textContent;
        }

        // Append children
        if (children.length > 0) {
            children.forEach(child => {
                if (child instanceof HTMLElement) {
                    element.appendChild(child);
                }
            });
        }

        return element;
    }

    /**
     * Add class to element
     * @param {HTMLElement} element - Target element
     * @param {...string} classNames - Class names to add (space-separated or individual)
     */
    function addClass(element, ...classNames) {
        if (!element || !element.classList) return;
        const allClasses = classNames.flatMap(cn => cn.split(' ')).filter(Boolean);
        element.classList.add(...allClasses);
    }

    /**
     * Remove class from element
     * @param {HTMLElement} element - Target element
     * @param {...string} classNames - Class names to remove (space-separated or individual)
     */
    function removeClass(element, ...classNames) {
        if (!element || !element.classList) return;
        const allClasses = classNames.flatMap(cn => cn.split(' ')).filter(Boolean);
        element.classList.remove(...allClasses);
    }

    /**
     * Toggle class on element
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class name to toggle
     * @param {boolean} force - Force add/remove
     */
    function toggleClass(element, className, force) {
        if (!element || !element.classList) return;
        return element.classList.toggle(className, force);
    }

    /**
     * Check if element has class
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class name to check
     * @returns {boolean}
     */
    function hasClass(element, className) {
        if (!element || !element.classList) return false;
        return element.classList.contains(className);
    }

    /**
     * Remove element from DOM
     * @param {HTMLElement} element - Element to remove
     */
    function removeElement(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }

    /**
     * ========================================
     * PERFORMANCE HELPERS
     * ========================================
     */

    /**
     * Debounce function - delays execution until after wait time
     * @deprecated Use GeoLeaf.Utils.EventHelpers.debounce() instead (consolidated in Sprint 3.2)
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Execute immediately on leading edge
     * @returns {Function}
     */
    function debounce(func, wait = 300, immediate = false) {
        // Forward to EventHelpers (Sprint 3.2 consolidation)
        if (GeoLeaf.Utils?.EventHelpers?.debounce) {
            return GeoLeaf.Utils.EventHelpers.debounce(func, wait, immediate);
        }

        // Fallback if EventHelpers not loaded yet
        let timeout;
        return function debounced(...args) {
            const context = this;
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    /**
     * Throttle function - limits execution to once per interval
     * @deprecated Use GeoLeaf.Utils.EventHelpers.throttle() instead (consolidated in Sprint 3.2)
     * @param {Function} func - Function to throttle
     * @param {number} limit - Interval limit in milliseconds
     * @returns {Function}
     */
    function throttle(func, limit = 300) {
        // Forward to EventHelpers (Sprint 3.2 consolidation)
        if (GeoLeaf.Utils?.EventHelpers?.throttle) {
            return GeoLeaf.Utils.EventHelpers.throttle(func, limit);
        }

        // Fallback if EventHelpers not loaded yet
        let lastRan;
        return function throttled(...args) {
            const context = this;
            const now = Date.now();
            if (!lastRan) {
                func.apply(context, args);
                lastRan = now;
            } else if (now - lastRan >= limit) {
                func.apply(context, args);
                lastRan = now;
            }
        };
    }

    /**
     * Request animation frame wrapper for smooth animations
     * @param {Function} callback - Animation callback
     * @returns {number} Request ID
     */
    function requestFrame(callback) {
        const raf = window.requestAnimationFrame ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame ||
                    ((cb) => setTimeout(cb, 16));

        return raf(callback);
    }

    /**
     * Cancel animation frame
     * @param {number} id - Request ID
     */
    function cancelFrame(id) {
        const caf = window.cancelAnimationFrame ||
                    window.webkitCancelAnimationFrame ||
                    window.mozCancelAnimationFrame ||
                    clearTimeout;

        caf(id);
    }

    /**
     * ========================================
     * ABORT CONTROLLER HELPERS
     * ========================================
     */

    /**
     * Create abort controller with optional timeout
     * @param {number} timeout - Timeout in milliseconds (optional)
     * @returns {AbortController}
     */
    function createAbortController(timeout) {
        const controller = new AbortController();

        if (timeout) {
            setTimeout(() => controller.abort(), timeout);
        }

        return controller;
    }

    /**
     * Fetch with timeout using AbortController
     * @param {string} url - URL to fetch
     * @param {object} options - Fetch options
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise}
     */
    function fetchWithTimeout(url, options = {}, timeout = 5000) {
        const controller = createAbortController(timeout);

        return fetch(url, {
            ...options,
            signal: controller.signal
        });
    }

    /**
     * ========================================
     * LAZY LOADING HELPERS
     * ========================================
     */

    /**
     * Lazy load image when visible (uses IntersectionObserver)
     * @param {HTMLImageElement} img - Image element
     * @param {object} options - Observer options
     */
    function lazyLoadImage(img, options = { threshold: 0.1 }) {
        if (!('IntersectionObserver' in window)) {
            // Fallback: load immediately
            const src = img.dataset.src || img.getAttribute('data-src');
            if (src) img.src = src;
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const lazyImg = entry.target;
                    const src = lazyImg.dataset.src || lazyImg.getAttribute('data-src');
                    if (src) lazyImg.src = src;
                    observer.unobserve(lazyImg);
                }
            });
        }, options);

        observer.observe(img);
    }

    /**
     * Lazy execute callback when browser is idle
     * @param {Function} callback - Function to execute
     * @param {number} timeout - Timeout in milliseconds
     */
    function lazyExecute(callback, timeout = 100) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout });
        } else {
            setTimeout(callback, timeout);
        }
    }

    /**
     * ========================================
     * MEMORY OPTIMIZATION HELPERS
     * ========================================
     */

    /**
     * Clear all properties from object
     * @param {object} obj - Object to clear
     */
    function clearObject(obj) {
        if (!obj || typeof obj !== 'object') return;

        Object.keys(obj).forEach(key => {
            delete obj[key];
        });
    }

    /**
     * Batch DOM operations to minimize reflows/repaints
     * @param {Function} callback - Function with DOM operations
     * @returns {*} Result from callback
     */
    function batchDomOperations(callback) {
        if (!callback || typeof callback !== 'function') return null;
        // Execute callback synchronously - batching happens naturally when modifying DocumentFragment
        return callback();
    }

    /**
     * Create document fragment for efficient DOM updates
     * @param {Array<HTMLElement>} children - Children to add to fragment
     * @returns {DocumentFragment}
     */
    function createFragment(children = []) {
        const fragment = document.createDocumentFragment();

        children.forEach(child => {
            if (child instanceof HTMLElement) {
                fragment.appendChild(child);
            }
        });

        return fragment;
    }

    /**
     * ========================================
     * EVENT HELPERS
     * ========================================
     */

    /**
     * Add event listener with cleanup
     * @param {HTMLElement} element - Target element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {object} options - Event options
     * @returns {Function} Cleanup function
     */
    function addEventListener(element, event, handler, options) {
        if (!element || !event || !handler) return () => {};

        element.addEventListener(event, handler, options);

        return () => {
            element.removeEventListener(event, handler, options);
        };
    }

    /**
     * Add multiple event listeners
     * @param {HTMLElement} element - Target element
     * @param {object} events - Event name -> handler map
     * @param {object} options - Event options
     * @returns {Function} Cleanup function
     */
    function addEventListeners(element, events, options) {
        if (!element || !events) return () => {};

        const cleanups = [];

        Object.keys(events).forEach(eventName => {
            cleanups.push(addEventListener(element, eventName, events[eventName], options));
        });

        return () => {
            cleanups.forEach(cleanup => cleanup());
        };
    }

    /**
     * Delegate event to child elements matching selector
     * @param {HTMLElement} parent - Parent element
     * @param {string} event - Event name
     * @param {string} selector - Child selector
     * @param {Function} handler - Event handler
     * @returns {Function} Cleanup function
     */
    function delegateEvent(parent, event, selector, handler) {
        const delegatedHandler = (e) => {
            const target = e.target;
            if (target && target.matches && target.matches(selector)) {
                handler.call(target, e);
            }
        };

        return addEventListener(parent, event, delegatedHandler);
    }

    /**
     * ========================================
     * UTILITY HELPERS
     * ========================================
     */

    /**
     * Deep clone object (simple implementation)
     * @param {*} obj - Object to clone
     * @param {WeakMap} seen - Track circular references
     * @returns {*}
     */
    function deepClone(obj, seen = new WeakMap()) {
        // Primitives and null
        if (obj === null || typeof obj !== 'object') return obj;

        // Handle circular references
        if (seen.has(obj)) return seen.get(obj);

        // Handle Date
        if (obj instanceof Date) return new Date(obj.getTime());

        // Handle RegExp
        if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);

        // Handle Array
        if (obj instanceof Array) {
            const cloned = [];
            seen.set(obj, cloned);
            obj.forEach(item => cloned.push(deepClone(item, seen)));
            return cloned;
        }

        // Handle Object
        const cloned = {};
        seen.set(obj, cloned);
        Object.keys(obj).forEach(key => {
            cloned[key] = deepClone(obj[key], seen);
        });

        return cloned;
    }

    /**
     * Check if value is empty
     * @param {*} value - Value to check
     * @returns {boolean}
     */
    function isEmpty(value) {
        if (value == null) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    /**
     * Wait for specified time
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise}
     */
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry async operation with exponential backoff
     * @param {Function} fn - Async function to retry
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} delay - Initial delay in milliseconds
     * @returns {Promise}
     */
    async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
        let lastError;

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (i < maxRetries - 1) {
                    const backoffDelay = delay * Math.pow(2, i);
                    await wait(backoffDelay);
                }
            }
        }

        throw lastError;
    }

    /**
     * ========================================
     * PUBLIC API
     * ========================================
     */

    global.GeoLeaf.Helpers = {
        // DOM Helpers
        getElementById,
        querySelector,
        querySelectorAll,
        createElement,
        addClass,
        removeClass,
        toggleClass,
        hasClass,
        removeElement,

        // Performance Helpers
        debounce,
        throttle,
        requestFrame,
        cancelFrame,

        // AbortController Utilities
        createAbortController,
        fetchWithTimeout,

        // Lazy Loading
        lazyLoadImage,
        lazyExecute,

        // Memory Optimization
        clearObject,
        batchDomOperations,
        createFragment,

        // Event Helpers
        addEventListener,
        addEventListeners,
        delegateEvent,

        // Utility Functions
        deepClone,
        isEmpty,
        wait,
        retryWithBackoff
    };

})(typeof window !== 'undefined' ? window : this);
