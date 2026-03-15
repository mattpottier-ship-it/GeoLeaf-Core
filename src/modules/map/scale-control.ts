/**
 * GeoLeaf Scale Control
 * Manages the display of graphical scale, numeric scale and zoom level
 *
 * @module map/scale-control
 */
"use strict";

import { Log } from "../log/index.js";

declare const L: any;

// Lazy access to Config (not yet ESM — migrated in B4)
const _gl: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

/**
 * Custom scale control
 */
const ScaleControl: any = {
    _map: null as any,
    _config: null as any,
    _container: null as any,
    _scaleLineMetric: null as any,
    _numericElement: null as any,
    _zoomElement: null as any,
    _inputElement: null as any,
    _scalePrefix: null as any,
    _mainWrapper: null as any,
    _eventHandlers: {} as Record<string, any>,

    /**
     * Initializes the scale control
     * @param {L.Map} map - Leaflet map instance
     * @param {Object} config - Configuration from scaleConfig
     */
    init(map: any, config: any) {
        if (!map) {
            Log.error("[GeoLeaf.ScaleControl] Map not provided");
            return;
        }

        this._map = map;
        this._config = config || {};

        // Create a single container for everything
        this._createMainContainer();

        Log.info("[GeoLeaf.ScaleControl] Scale control initialized");
    },

    /**
     * Creates the main container with graphical scale and custom block
     * @private
     */
    _createMainContainer() {
        const position = this._config.position || "bottomleft";

        // Conteneur main - disposition horizontale
        this._mainWrapper = L.DomUtil.create("div", "gl-scale-main-wrapper");

        // 1. Graphical scale
        if (this._config.scaleGraphic !== false) {
            const graphicWrapper = L.DomUtil.create(
                "div",
                "gl-scale-graphic-wrapper",
                this._mainWrapper
            );
            this._addGraphicScaleToContainer(graphicWrapper);
        }

        // 2. Custom block (numeric scale + zoom) on the same line
        if (this._config.scaleNumeric || this._config.scaleNivel) {
            this._createCustomScaleBlock(this._mainWrapper);
        }

        // Add main container to the map
        const CustomControl = L.Control.extend({
            options: {
                position: position,
            },
            onAdd: () => {
                return this._mainWrapper;
            },
        });

        new CustomControl().addTo(this._map);
    },

    /**
     * Adds the Leaflet graphical scale into a container
     * @param {HTMLElement} container - Target container
     * @private
     */
    _addGraphicScaleToContainer(container: any) {
        // Create graphical scale manually (not via L.control.scale)
        const scaleDiv = L.DomUtil.create(
            "div",
            "leaflet-control-scale leaflet-control",
            container
        );

        const scaleLineMetric = L.DomUtil.create("div", "leaflet-control-scale-line", scaleDiv);
        this._scaleLineMetric = scaleLineMetric;

        // Update function for the graphical scale
        const updateScale = () => {
            const y = this._map.getSize().y / 2;
            const maxMeters = this._map.distance(
                this._map.containerPointToLatLng([0, y]),
                this._map.containerPointToLatLng([150, y])
            );
            this._updateScaleLine(this._scaleLineMetric, maxMeters);
        };

        this._eventHandlers.graphicScaleUpdate = updateScale;
        this._map.on("zoomend moveend", updateScale);
        updateScale();

        Log.info("[GeoLeaf.ScaleControl] Graphical scale added");
    },

    /**
     * Updates the graphical scale line
     * @param {HTMLElement} scaleLine - Scale line element
     * @param {number} maxMeters - Maximum distance in meters
     * @private
     */
    _updateScaleLine(scaleLine: any, maxMeters: any) {
        const maxKm = maxMeters / 1000;
        let scale, ratio;

        if (maxKm > 1) {
            const maxNiceKm = this._getRoundNum(maxKm);
            ratio = maxNiceKm / maxKm;
            scale = maxNiceKm + " km";
        } else {
            const maxNiceM = this._getRoundNum(maxMeters);
            ratio = maxNiceM / maxMeters;
            scale = maxNiceM + " m";
        }

        scaleLine.style.width = Math.round(150 * ratio) + "px";
        scaleLine.textContent = scale;
    },

    /**
     * Rounds a number to a "clean" value (1, 2, 5, 10, 20, 50, etc.)
     * @param {number} num - Number to round
     * @returns {number} Rounded number
     * @private
     */
    _getRoundNum(num: any) {
        const pow10 = Math.pow(10, (Math.floor(num) + "").length - 1);
        let d = num / pow10;

        d = d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1;

        return pow10 * d;
    },

    /**
     * Creates the custom block (numeric scale + zoom level)
     * @param {HTMLElement} parentContainer - Parent container
     * @private
     */
    _createCustomScaleBlock(parentContainer: any) {
        // Create container — horizontal layout
        this._container = L.DomUtil.create("div", "gl-scale-control", parentContainer);

        // Numeric scale
        if (this._config.scaleNumeric) {
            if (this._config.scaleNumericEditable) {
                this._createEditableScale();
            } else {
                this._createReadOnlyScale();
            }
        }

        // Zoom level
        if (this._config.scaleNivel) {
            this._createZoomLevel();
        }

        // Update events
        const updateHandler = () => this._updateScale();
        this._eventHandlers.numericScaleUpdate = updateHandler;
        this._map.on("zoomend moveend", updateHandler);
        this._updateScale(); // Initial update

        Log.info("[GeoLeaf.ScaleControl] Custom block added");
    },

    /**
     * Creates read-only numeric scale
     * @private
     */
    _createReadOnlyScale() {
        this._numericElement = L.DomUtil.create("div", "gl-scale-numeric", this._container);
    },

    /**
     * Creates editable numeric scale with input
     * @private
     */
    _createEditableScale() {
        // Create container for editable scale
        const wrapper = L.DomUtil.create("div", "gl-scale-numeric-editable", this._container);

        // Create "1:" prefix (always visible)
        this._scalePrefix = L.DomUtil.create("span", "gl-scale-prefix", wrapper);
        this._scalePrefix.textContent = "1:";

        // Create the initially displayed span (underlined and clickkable) - contains only the denominator
        this._numericElement = L.DomUtil.create("span", "gl-scale-numeric-clickable", wrapper);
        this._numericElement.textContent = "0";

        // Create the input (hidden initially) - contains only the denominator
        this._inputElement = L.DomUtil.create("input", "gl-scale-numeric-input", wrapper);
        this._inputElement.type = "text";
        this._inputElement.placeholder = "250000";
        this._inputElement.style.display = "none";

        // Prevent map interactions during editing
        L.DomEvent.disableClickPropagation(wrapper);
        L.DomEvent.disableScrollPropagation(wrapper);

        // Span clickk: switch to edit mode
        this._numericElement.addEventListener("click", () => {
            this._switchToEditMode();
        });

        // Validate with Enter
        this._inputElement.addEventListener("keypress", (e: any) => {
            if (e.key === "Enter") {
                this._onScaleInputChange();
                this._switchToDisplayMode();
            }
        });

        // Validation en cliquant to the outer (blur)
        this._inputElement.addEventListener("blur", () => {
            this._onScaleInputChange();
            this._switchToDisplayMode();
        });
    },

    /**
     * Creates zoom level display
     * @private
     */
    _createZoomLevel() {
        this._zoomElement = L.DomUtil.create("div", "gl-scale-zoom", this._container);
    },

    /**
     * Switches to edit mode (shows input)
     * @private
     */
    _switchToEditMode() {
        if (!this._numericElement || !this._inputElement) return;

        // Copy current value into the input
        this._inputElement.value = this._numericElement.textContent;

        // Hide the span, show the input
        this._numericElement.style.display = "none";
        this._inputElement.style.display = "inline-block";

        // Focus and select text
        this._inputElement.focus();
        this._inputElement.select();
    },

    /**
     * Switches to display mode (shows span)
     * @private
     */
    _switchToDisplayMode() {
        if (!this._numericElement || !this._inputElement) return;

        // Hide the input, show the span
        this._inputElement.style.display = "none";
        this._numericElement.style.display = "inline";
    },

    /**
     * Updates the scale and zoom display
     * @private
     */
    _updateScale() {
        const zoom = this._map.getZoom();
        const scale = this._calculateScale(zoom);

        // Update numeric scale
        if (this._numericElement) {
            if (this._config.scaleNumericEditable) {
                // Update only the denominator (without '1:')
                if (this._inputElement.style.display === "none") {
                    this._numericElement.textContent = this._formatNumber(scale);
                }
            } else {
                // Non-editable mode: display "1:" + denominator
                this._numericElement.textContent = `1:${this._formatNumber(scale)}`;
            }
        }

        // Update zoom level
        if (this._zoomElement) {
            this._zoomElement.textContent = `Zoom: ${Number(zoom).toFixed(2)}`;
        }
    },

    /**
     * Calculates approximate scale based on zoom level
     * @param {number} zoom - Leaflet zoom level
     * @param {number} [lat] - Optional latitude (uses map center if not provided)
     * @returns {number} Scale (e.g. 250000 for 1:250000)
     * @private
     */
    _calculateScale(zoom: any, lat: any) {
        // Use provided latitude or map center latitude
        const latitude = lat !== undefined ? lat : this._map.getCenter().lat;
        // Approximate formula based on Web Mercator tile size
        const metersPerPixel =
            (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
        const scale = (metersPerPixel * 96) / 0.0254; // 96 DPI
        return Math.round(scale);
    },

    /**
     * Formats a number with spaces as thousands separators
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     * @private
     */
    _formatNumber(num: any) {
        /* eslint-disable-next-line security/detect-unsafe-regex -- fixed pattern for thousands separator */
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    },

    /**
     * Handles manual scale change
     * @private
     */
    _onScaleInputChange() {
        if (!this._inputElement) return;

        const input = this._inputElement.value.trim();
        // Parse only the denominator (number with optional spaces)
        const cleanedInput = input.replace(/\s/g, "");
        const targetScale = parseInt(cleanedInput, 10);

        if (!isNaN(targetScale) && targetScale > 0) {
            const targetZoom = this._calculateZoomFromScale(targetScale);
            // Utiliser setView avec zoomSnap: 0 pour permettre les zooms fractionnaires
            this._map.setView(this._map.getCenter(), targetZoom, {
                animate: true,
                zoomSnap: 0,
            });
            Log.info(
                `[GeoLeaf.ScaleControl] Zoom adjusted to ${targetZoom} for scale 1:${targetScale}`
            );
        } else {
            Log.warn("[GeoLeaf.ScaleControl] Invalid scale format:", input);
            this._updateScale(); // Reset value
        }
    },

    /**
     * Calculates the zoom level to reach a given scale
     * @param {number} targetScale - Target scale (e.g. 250000)
     * @returns {number} Zoom level (may be fractional for precision)
     * @private
     */
    _calculateZoomFromScale(targetScale: any) {
        const lat = this._map.getCenter().lat;
        const metersPerPixel = (targetScale * 0.0254) / 96;
        let zoom = Math.log2((156543.03392 * Math.cos((lat * Math.PI) / 180)) / metersPerPixel);

        // Refine zoom by iteration to get the exact scale
        // Use a precise convergence method
        for (let i = 0; i < 20; i++) {
            const currentScale = this._calculateScale(zoom, lat); // Passer lat pour avoid recalcul
            const diff = targetScale - currentScale;

            // Stop if error is less than 1 (essentially identical)
            if (Math.abs(diff) < 1) {
                break;
            }

            // Adjust zoom proportionally to the error
            // The larger the scale, the more we need to zoom out
            const adjustment = Math.log2(targetScale / currentScale);
            zoom -= adjustment * 0.95; // Damping factor to avoid oscillations
        }

        // Round to 4 decimal places for maximum precision
        const preciseZoom = Math.round(zoom * 10000) / 10000;
        return Math.max(0, Math.min(22, preciseZoom));
    },

    /**
     * Destroys the control and cleans up resources
     */
    destroy() {
        // Remove event listners from the map
        if (this._map && this._eventHandlers) {
            if (this._eventHandlers.graphicScaleUpdate) {
                this._map.off("zoomend moveend", this._eventHandlers.graphicScaleUpdate);
            }
            if (this._eventHandlers.numericScaleUpdate) {
                this._map.off("zoomend moveend", this._eventHandlers.numericScaleUpdate);
            }
        }

        // Remove main container from the DOM
        if (this._mainWrapper && this._mainWrapper.parentNode) {
            this._mainWrapper.parentNode.removeChild(this._mainWrapper);
        }

        // Clean up all references
        this._map = null;
        this._config = null;
        this._container = null;
        this._scaleLineMetric = null;
        this._numericElement = null;
        this._zoomElement = null;
        this._inputElement = null;
        this._scalePrefix = null;
        this._mainWrapper = null;
        this._eventHandlers = {};

        Log.info("[GeoLeaf.ScaleControl] Control destroyed and resources cleaned up");
    },
};

// Exposesr the module (removed: migrated to globals.js in B3)

/**
 * Initialise automaticment the control d'scale si la configuration est presents
 */
function initScaleControl(map: any) {
    if (!map) {
        Log.warn("[GeoLeaf.ScaleControl] Cannot initialize: map not provided");
        return;
    }

    const config =
        _gl.GeoLeaf && _gl.GeoLeaf.Config && typeof _gl.GeoLeaf.Config.get === "function"
            ? _gl.GeoLeaf.Config.get("scaleConfig")
            : null;

    if (config && (config.scaleGraphic || config.scaleNumeric || config.scaleNivel)) {
        ScaleControl.init(map, config);
    }
}

export { ScaleControl, initScaleControl };
