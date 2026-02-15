/**
 * @fileoverview Map Helpers - Utilities for Leaflet map instance management
 * @module utils/map-helpers
 * @requires geoleaf.core
 *
 * @description
 * Provides centralized functions for retrieving and validating Leaflet map instances.
 * Eliminates duplicate map retrieval patterns across 15+ modules.
 *
 * @author GeoLeaf
 * @version 2.1.0
 * @since Phase 3 - Code Deduplication
 */

(function (global) {
    "use strict";

    // Ensure GeoLeaf namespace
    if (typeof global.GeoLeaf === "undefined") {
        global.GeoLeaf = {};
    }
    if (typeof global.GeoLeaf.Utils === "undefined") {
        global.GeoLeaf.Utils = {};
    }

    /**
     * @namespace MapHelpers
     * @memberof GeoLeaf.Utils
     * @description Utilities for Leaflet map instance management
     */
    const MapHelpers = {

        /**
         * Safely retrieves a Leaflet map instance from various sources
         *
         * @param {L.Map|null} [explicitMap=null] - Explicitly provided map instance
         * @returns {L.Map|null} The map instance or null if not found
         *
         * @description
         * Resolution order:
         * 1. Explicit map parameter (if provided and valid)
         * 2. GeoLeaf.Core.getMap() (if Core module loaded)
         * 3. null (no map found)
         *
         * @example
         * // With explicit map
         * const map = MapHelpers.ensureMap(myMap);
         *
         * @example
         * // Auto-resolve from GeoLeaf.Core
         * const map = MapHelpers.ensureMap();
         * if (map) {
         *   map.setView([lat, lng], zoom);
         * }
         *
         * @example
         * // In module initialization
         * init(options = {}) {
         *   this._map = MapHelpers.ensureMap(options.map);
         *   if (!this._map) {
         *     // ...
         *   }
         * }
         */
        ensureMap(explicitMap = null) {
            // 1. Check explicit map parameter
            if (explicitMap && typeof explicitMap === "object") {
                // Validate it's a Leaflet map
                if (this._isLeafletMap(explicitMap)) {
                    return explicitMap;
                }
            }

            // 2. Try GeoLeaf.Core.getMap()
            if (global.GeoLeaf?.Core && typeof global.GeoLeaf.Core.getMap === "function") {
                const coreMap = global.GeoLeaf.Core.getMap();
                if (coreMap && this._isLeafletMap(coreMap)) {
                    return coreMap;
                }
            }

            // 3. No map found
            return null;
        },

        /**
         * Retrieves a Leaflet map instance and throws if not found (strict mode)
         *
         * @param {L.Map|null} [explicitMap=null] - Explicitly provided map instance
         * @param {string} [contextInfo='Unknown'] - Context for error message (module name)
         * @returns {L.Map} The map instance (never null)
         * @throws {Error} If no valid map instance found
         *
         * @description
         * Use this when map instance is REQUIRED for functionality.
         * Will throw descriptive error if map cannot be resolved.
         *
         * @example
         * // In critical initialization
         * init(options = {}) {
         *   try {
         *     this._map = MapHelpers.requireMap(options.map, 'Baselayers');
         *     this._setupControls();
         *   } catch (error) {
         *     // ...
         *   }
         * }
         *
         * @example
         * // Short form in methods
         * fitBounds(bounds) {
         *   const map = MapHelpers.requireMap(this._map, 'Table');
         *   map.fitBounds(bounds, { padding: [50, 50] });
         * }
         */
        requireMap(explicitMap = null, contextInfo = "Unknown") {
            const map = this.ensureMap(explicitMap);

            if (!map) {
                const sources = [];
                if (explicitMap !== null) sources.push("explicit parameter");
                if (global.GeoLeaf?.Core) sources.push("GeoLeaf.Core");

                throw new Error(
                    `[${contextInfo}] No Leaflet map instance found. ` +
                    `Tried: ${sources.length ? sources.join(", ") : "no sources available"}. ` +
                    `Ensure map is initialized or passed as option.`
                );
            }

            return map;
        },

        /**
         * Validates if an object is a Leaflet map instance
         *
         * @param {*} obj - Object to validate
         * @returns {boolean} True if valid Leaflet map
         *
         * @private
         * @description
         * Checks for Leaflet map duck-typing:
         * - Has getCenter() method
         * - Has setView() method
         * - Has getBounds() method
         *
         * @example
         * if (MapHelpers._isLeafletMap(obj)) {
         *   obj.setView([lat, lng], zoom);
         * }
         */
        _isLeafletMap(obj) {
            if (!obj || typeof obj !== "object") return false;

            // Duck-typing check for Leaflet map
            return (
                typeof obj.getCenter === "function" &&
                typeof obj.setView === "function" &&
                typeof obj.getBounds === "function" &&
                typeof obj.on === "function" &&
                typeof obj.off === "function"
            );
        },

        /**
         * Checks if a Leaflet map instance is currently available
         *
         * @param {L.Map|null} [explicitMap=null] - Explicitly provided map instance
         * @returns {boolean} True if map is available
         *
         * @description
         * Non-throwing version for conditional checks.
         * Useful in optional features or progressive enhancement.
         *
         * @example
         * // Conditional feature activation
         * if (MapHelpers.hasMap()) {
         *   this._enableMapFeatures();
         * } else {
         *   // ...
         * }
         *
         * @example
         * // Guard in event handlers
         * handleClick() {
         *   if (!MapHelpers.hasMap(this._map)) return;
         *   const map = MapHelpers.ensureMap(this._map);
         *   map.panTo([lat, lng]);
         * }
         */
        hasMap(explicitMap = null) {
            return this.ensureMap(explicitMap) !== null;
        },

        /**
         * Retrieves map instance with detailed diagnostic info for debugging
         *
         * @param {L.Map|null} [explicitMap=null] - Explicitly provided map instance
         * @returns {Object} Diagnostic object with map and status info
         *
         * @description
         * Returns object with:
         * - map: The map instance or null
         * - found: Boolean indicating if map was found
         * - source: Where map was found ('explicit', 'core', or 'none')
         * - isValid: Boolean indicating if map passes Leaflet validation
         *
         * @example
         * // Debug map resolution issues
         * const diagnostic = MapHelpers.getMapDiagnostic(options.map);
         * // ...
         * // {
         * //   map: L.Map {...},
         * //   found: true,
         * //   source: 'core',
         * //   isValid: true
         * // }
         */
        getMapDiagnostic(explicitMap = null) {
            const diagnostic = {
                map: null,
                found: false,
                source: "none",
                isValid: false
            };

            // Check explicit map
            if (explicitMap && typeof explicitMap === "object") {
                if (this._isLeafletMap(explicitMap)) {
                    diagnostic.map = explicitMap;
                    diagnostic.found = true;
                    diagnostic.source = "explicit";
                    diagnostic.isValid = true;
                    return diagnostic;
                }
            }

            // Check GeoLeaf.Core
            if (global.GeoLeaf?.Core && typeof global.GeoLeaf.Core.getMap === "function") {
                const coreMap = global.GeoLeaf.Core.getMap();
                if (coreMap && this._isLeafletMap(coreMap)) {
                    diagnostic.map = coreMap;
                    diagnostic.found = true;
                    diagnostic.source = "core";
                    diagnostic.isValid = true;
                    return diagnostic;
                }
            }

            return diagnostic;
        }
    };

    // Export to GeoLeaf namespace
    global.GeoLeaf.Utils.MapHelpers = MapHelpers;

    // Convenient aliases at root level
    global.GeoLeaf.ensureMap = MapHelpers.ensureMap.bind(MapHelpers);
    global.GeoLeaf.requireMap = MapHelpers.requireMap.bind(MapHelpers);
    global.GeoLeaf.hasMap = MapHelpers.hasMap.bind(MapHelpers);

    // Debug export
    if (typeof module !== "undefined" && module.exports) {
        module.exports = MapHelpers;
    }

})(typeof window !== "undefined" ? window : global);
