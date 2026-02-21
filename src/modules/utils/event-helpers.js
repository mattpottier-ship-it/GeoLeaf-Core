/**
 * @fileoverview Event Helpers - Utilities for custom event dispatching
 * @module utils/event-helpers
 *
 * @description
 * Provides cross-browser compatible event dispatching utilities.
 * Eliminates duplicate CustomEvent patterns and provides consistent error handling.
 *
 * @author GeoLeaf
 * @version 2.1.0
 * @since Phase 3 - Code Deduplication
 */

import { Log } from "../log/index.js";

/**
 * @namespace EventHelpers
 * @memberof GeoLeaf.Utils
 * @description Utilities for custom event management
 */
export const EventHelpers = {
    /**
     * Dispatches a custom event on document with cross-browser compatibility
     *
     * @param {string} eventName - Event name (ex: 'geoleaf:poi:loaded')
     * @param {Object} [detail={}] - Event detail payload
     * @param {Object} [options={}] - Additional options
     * @param {boolean} [options.bubbles=true] - Event bubbles up DOM tree
     * @param {boolean} [options.cancelable=true] - Event can be cancelled
     * @param {EventTarget} [options.target=document] - Event target (default: document)
     * @returns {boolean} True if event was dispatched successfully
     *
     * @description
     * Uses modern CustomEvent constructor with IE11 fallback.
     * Provides consistent error handling and logging.
     *
     * @example
     * // Simple event dispatch
     * EventHelpers.dispatchCustomEvent('geoleaf:data:loaded', {
     *   count: 42,
     *   source: 'api'
     * });
     *
     * @example
     * // With custom options
     * EventHelpers.dispatchCustomEvent('geoleaf:ui:changed',
     *   { theme: 'dark' },
     *   { bubbles: false, target: window }
     * );
     *
     * @example
     * // Error handling
     * const success = EventHelpers.dispatchCustomEvent('my:event', data);
     * if (!success) {
     *   console.warn('Event dispatch failed');
     * }
     */
    dispatchCustomEvent(eventName, detail = {}, options = {}) {
        const { bubbles = true, cancelable = true, target = document } = options;

        try {
            const event = new CustomEvent(eventName, {
                detail,
                bubbles,
                cancelable,
            });

            target.dispatchEvent(event);
            return true;
        } catch (error) {
            if (Log.error) {
                Log.error(`[EventHelpers] Failed to dispatch event '${eventName}':`, error);
            }
            return false;
        }
    },

    /**
     * Dispatches a Leaflet map event with fallback
     *
     * @param {L.Map} map - Leaflet map instance
     * @param {string} eventName - Event name (ex: 'geoleaf:filters:changed')
     * @param {Object} [detail={}] - Event detail payload
     * @returns {boolean} True if event was dispatched successfully
     *
     * @description
     * Uses Leaflet's map.fire() method for map-specific events.
     * Validates map instance before dispatch.
     *
     * @example
     * // Dispatch map event
     * const map = globalThis.GeoLeaf?.Core?.getMap();
     * EventHelpers.dispatchMapEvent(map, 'geoleaf:layer:added', {
     *   layerId: 'my-layer',
     *   type: 'geojson'
     * });
     *
     * @example
     * // With validation
     * if (this._map) {
     *   EventHelpers.dispatchMapEvent(this._map, 'custom:event', data);
     * }
     */
    dispatchMapEvent(map, eventName, detail = {}) {
        if (!map || typeof map.fire !== "function") {
            if (Log.warn) {
                Log.warn(`[EventHelpers] Invalid map instance, cannot fire '${eventName}'`);
            }
            return false;
        }

        try {
            map.fire(eventName, detail);
            return true;
        } catch (error) {
            if (Log.error) {
                Log.error(`[EventHelpers] Failed to fire map event '${eventName}':`, error);
            }
            return false;
        }
    },

    /**
     * Dispatches both document and map events simultaneously
     *
     * @param {string} eventName - Event name (without 'geoleaf:' prefix)
     * @param {Object} [detail={}] - Event detail payload
     * @param {L.Map|null} [map=null] - Optional map instance
     * @returns {Object} Dispatch results { document: boolean, map: boolean }
     *
     * @description
     * Convenience method to dispatch to both document and map.
     * Automatically adds 'geoleaf:' prefix to event name.
     *
     * @example
     * // Dispatch to both targets
     * const results = EventHelpers.dispatchBoth('poi:loaded', {
     *   count: 10,
     *   source: 'api'
     * }, this._map);
     *
     * console.log(`Document: ${results.document}, Map: ${results.map}`);
     *
     * @example
     * // Without map (document only)
     * EventHelpers.dispatchBoth('data:loaded', { count: 42 });
     */
    dispatchBoth(eventName, detail = {}, map = null) {
        // Ensure geoleaf: prefix
        const fullEventName = eventName.startsWith("geoleaf:") ? eventName : `geoleaf:${eventName}`;

        const results = {
            document: false,
            map: false,
        };

        // Dispatch to document
        results.document = this.dispatchCustomEvent(fullEventName, detail);

        // Dispatch to map if available
        if (map) {
            results.map = this.dispatchMapEvent(map, fullEventName, detail);
        }

        return results;
    },

    /**
     * Creates an event listener with automatic cleanup tracking
     *
     * @param {EventTarget} target - Event target (element, document, window)
     * @param {string} eventName - Event name to listen for
     * @param {Function} handler - Event handler function
     * @param {Object} [options={}] - addEventListener options
     * @returns {Function} Cleanup function to remove listener
     *
     * @description
     * Wraps addEventListener with automatic cleanup function.
     * Useful for component lifecycle management.
     *
     * @example
     * // In component initialization
     * this._cleanup = EventHelpers.addEventListener(
     *   document,
     *   'geoleaf:data:loaded',
     *   (e) => this.handleDataLoaded(e.detail)
     * );
     *
     * // In component cleanup
     * if (this._cleanup) this._cleanup();
     *
     * @example
     * // Multiple listeners
     * this._cleanups = [
     *   EventHelpers.addEventListener(map, 'moveend', this.onMove),
     *   EventHelpers.addEventListener(document, 'geoleaf:refresh', this.onRefresh)
     * ];
     *
     * // Cleanup all
     * this._cleanups.forEach(fn => fn());
     */
    addEventListener(target, eventName, handler, options = {}) {
        if (!target || typeof target.addEventListener !== "function") {
            if (Log.warn) {
                Log.warn(`[EventHelpers] Invalid target for addEventListener '${eventName}'`);
            }
            return () => {}; // noop cleanup
        }

        target.addEventListener(eventName, handler, options);

        // Return cleanup function
        return () => {
            try {
                target.removeEventListener(eventName, handler, options);
            } catch (error) {
                if (Log.error) {
                    Log.error(`[EventHelpers] Failed to remove listener '${eventName}':`, error);
                }
            }
        };
    },

    /**
     * Creates multiple event listeners with batch cleanup
     *
     * @param {Array<Object>} listeners - Array of listener configurations
     * @returns {Function} Cleanup function to remove all listeners
     *
     * @description
     * Batch version of addEventListener for multiple listeners.
     * Returns single cleanup function for all.
     *
     * @example
     * // Batch listener setup
     * this._cleanup = EventHelpers.addEventListeners([
     *   { target: document, event: 'geoleaf:data:loaded', handler: this.onLoad },
     *   { target: this._map, event: 'moveend', handler: this.onMove },
     *   { target: window, event: 'resize', handler: this.onResize }
     * ]);
     *
     * // Single cleanup call
     * this._cleanup();
     */
    addEventListeners(listeners = []) {
        const cleanups = listeners.map(({ target, event, handler, options }) => {
            return this.addEventListener(target, event, handler, options);
        });

        // Return batch cleanup function
        return () => {
            cleanups.forEach((cleanup) => cleanup());
        };
    },

    /**
     * Debounce function - delays execution until after wait time
     *
     * @param {Function} func - Function to debounce
     * @param {number} [wait=300] - Wait time in milliseconds
     * @param {boolean} [immediate=false] - Execute immediately on leading edge
     * @returns {Function} Debounced function
     *
     * @description
     * Delays function execution until after wait time has elapsed since last call.
     * Useful for expensive operations like search, resize, scroll handlers.
     *
     * @example
     * // Search with debounce
     * const debouncedSearch = EventHelpers.debounce((query) => {
     *   fetchResults(query);
     * }, 300);
     *
     * input.addEventListener('input', (e) => debouncedSearch(e.target.value));
     *
     * @example
     * // Immediate execution (leading edge)
     * const saveImmediate = EventHelpers.debounce(saveData, 1000, true);
     */
    debounce(func, wait = 300, immediate = false) {
        let timeout;

        return function debounced(...args) {
            const context = this;

            const later = () => {
                timeout = null;
                if (!immediate) {
                    func.apply(context, args);
                }
            };

            const callNow = immediate && !timeout;

            clearTimeout(timeout);
            timeout = setTimeout(later, wait);

            if (callNow) {
                func.apply(context, args);
            }
        };
    },

    /**
     * Throttle function - limits execution to once per interval
     *
     * @param {Function} func - Function to throttle
     * @param {number} [limit=300] - Interval limit in milliseconds
     * @returns {Function} Throttled function
     *
     * @description
     * Limits function execution to once per interval, executing immediately.
     * First call executes immediately, subsequent calls wait for interval.
     * Useful for scroll, resize, mousemove handlers.
     *
     * @example
     * // Scroll handler with throttle
     * const throttledScroll = EventHelpers.throttle(() => {
     *   updateScrollPosition();
     * }, 100);
     *
     * window.addEventListener('scroll', throttledScroll);
     *
     * @example
     * // Mouse move tracking (limited to 60fps)
     * const trackMouse = EventHelpers.throttle((e) => {
     *   updateCursor(e.clientX, e.clientY);
     * }, 16); // ~60fps
     */
    throttle(func, limit = 300) {
        let lastRan;

        return function throttled(...args) {
            const context = this;
            const now = Date.now();

            if (!lastRan) {
                func.apply(context, args);
                lastRan = now;
            } else {
                if (now - lastRan >= limit) {
                    func.apply(context, args);
                    lastRan = now;
                }
            }
        };
    },
};

// Export to GeoLeaf namespace

// Convenient aliases at root level

// Utility aliases (Sprint 3.2 - consolidated from helpers.js)
