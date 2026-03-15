/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module GeoLeaf.UI.ScaleControl
 * @description Controle d'scale pour the map (graphical ou numeric)
 * @version 1.0.0
 */

import { Log } from "../log/index.js";
import { Config as _Config } from "../config/geoleaf-config/config-core.js";
const Config: any = _Config;
declare const L: any;

/**
 * Module de controle d'scale
 * Displays l'scale de the map in mode graphical (Leaflet) ou numeric (1:25000)
 */
const ScaleControl: any = {
    _map: null,
    _control: null,
    _scaleElement: null,
    _options: {
        position: "bottomleft",
        scaleType: "graphic", // "graphic" (Leaflet) ou "numeric" (1:25000)
        metric: true,
        imperial: false,
        maxWidth: 150,
    },

    /**
     * Initializes the control d'scale
     *
     * @param {L.Map} map - Instance de the map Leaflet
     * @param {Object} [options={}] - Options de configuration
     * @param {string} [options.position='bottomleft'] - Position du controle
     * @param {string} [options.scaleType='graphic'] - Type d'scale ('graphic' ou 'numeric')
     * @param {boolean} [options.metric=true] - Displaysr scale metric
     * @param {boolean} [options.imperial=false] - Display imperial scale
     * @param {number} [options.maxWidth=150] - Width max of the scale graphical
     *
     * @example
     * GeoLeaf.UI.ScaleControl.init(map, {
     *   scaleType: 'numeric',
     *   position: 'bottomright'
     * });
     */
    init(map: any, options: any = {}) {
        const context = "[GeoLeaf.UI.ScaleControl]";
        try {
            if (!map) {
                throw new Error("Une instance de carte Leaflet est requirede.");
            }
            this._map = map;
            this._options = { ...this._options, ...options };

            const showScale = Config?.get("ui.showScale");
            if (showScale === false) {
                Log.info(`${context} Scale display disabled in configuration.`);
                return;
            }

            // Retrieve the type d'scale from the config
            const scaleType = Config?.get("ui.scaleType");
            if (scaleType) {
                this._options.scaleType = scaleType;
            }

            this._createControl();
            Log.info(
                `${context} Module initialized successfully (type: ${this._options.scaleType}).`
            );
        } catch (err: any) {
            Log.error(`${context} Error during initialization:`, err.message);
        }
    },

    _createControl() {
        const context = "[GeoLeaf.UI.ScaleControl]";
        try {
            if (this._options.scaleType === "numeric") {
                // Createsr un controle custom pour l'scale numeric
                this._createNumericScale();
            } else {
                // Utiliser the control Leaflet by default (graphical)
                this._control = L.control.scale({
                    position: this._options.position,
                    metric: this._options.metric,
                    imperial: this._options.imperial,
                    maxWidth: this._options.maxWidth,
                });
                this._control.addTo(this._map);
            }
            Log.info(`${context} Scale control created and added to the map.`);
        } catch (err: any) {
            Log.error(`${context} Error creating scale control:`, err.message);
        }
    },

    _createNumericScale() {
        const NumericScaleControl = L.Control.extend({
            options: {
                position: this._options.position,
            },

            onAdd: (map: any) => {
                const container = L.DomUtil.create("div", "geoleaf-scale-numeric leaflet-control");

                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);

                // Createsr un conteneur flex pour aliner scale et zoom
                const flexContainer = L.DomUtil.create("div", "scale-flex-container", container);
                flexContainer.style.cssText = "display: flex; align-items: center; gap: 8px;";

                // Element pour l'scale numeric (suit the theme)
                this._scaleElement = L.DomUtil.create(
                    "div",
                    "scale-content gl-scale-numeric",
                    flexContainer
                );
                this._scaleElement.textContent = "1:0";

                // Element for the zoom level (suit the theme)
                this._zoomElement = L.DomUtil.create(
                    "div",
                    "zoom-level gl-zoom-badge",
                    flexContainer
                );
                this._zoomElement.textContent = "Z0";

                // MEMORY LEAK FIX (Phase 2): Store bound function references
                // to use same reference in onRemove
                this._boundUpdateNumericScale = this._updateNumericScale.bind(this);

                this._updateNumericScale();
                map.on("zoomend", this._boundUpdateNumericScale);
                // Perf 6.2.1: 'moveend' instead of 'move' — fires once per pan, not per pixel
                map.on("moveend", this._boundUpdateNumericScale);

                return container;
            },

            onRemove: (_map: any) => {
                // MEMORY LEAK FIX (Phase 2): Use stored bound function references
                // instead of creating new bind() which would not match
                if (this._boundUpdateNumericScale) {
                    _map.off("zoomend", this._boundUpdateNumericScale);
                    // Perf 6.2.1: matches 'moveend' listner registered in onAdd
                    _map.off("moveend", this._boundUpdateNumericScale);
                    this._boundUpdateNumericScale = null; // Clean up reference
                }
            },
        });

        this._control = new NumericScaleControl();
        this._control.addTo(this._map);
    },

    _updateNumericScale() {
        if (!this._scaleElement || !this._map) return;

        // Obtenir le centre de the map
        const center = this._map.getCenter();
        const zoom = this._map.getZoom();

        // Mettre up to date le zoom level
        if (this._zoomElement) {
            this._zoomElement.textContent = `Z${Number(zoom).toFixed(2)}`;
        }

        // Calculatesr la resolution en meters par pixel au centre de the map
        // Formule : resolution = (40075016.686 * Math.abs(Math.cos(center.lat * Math.PI / 180))) / Math.pow(2, zoom + 8)
        const metersPerPixel =
            (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom);

        // Calculates the scale (1 screen pixel = X real meters)
        // Scale = distance real / distance carte
        // Supposons 96 DPI (standard), donc 1 pouce = 96 pixels = 0.0254 meters
        const scale = Math.round((metersPerPixel * 96) / 0.0254);

        // Formats the scale readably
        let scaleText;
        if (scale >= 1000000) {
            scaleText = `1:${(scale / 1000000).toFixed(1)}M`;
        } else if (scale >= 1000) {
            scaleText = `1:${(scale / 1000).toFixed(0)}K`;
        } else {
            scaleText = `1:${scale}`;
        }

        this._scaleElement.textContent = scaleText;
    },

    /**
     * Destroys the scale control and frees resources
     *
     * @example
     * GeoLeaf.UI.ScaleControl.destroy();
     */
    destroy() {
        const context = "[GeoLeaf.UI.ScaleControl]";
        try {
            if (this._control && this._map) {
                this._map.removeControl(this._control);
                this._control = null;
            }
            this._scaleElement = null;
            this._map = null;
        } catch (err: any) {
            Log.error(`${context} Error during destruction:`, err.message);
        }
    },

    /**
     * Displays the scale control (creates it if it doesn't exist)
     *
     * @example
     * GeoLeaf.UI.ScaleControl.show();
     */
    show() {
        if (!this._control && this._map) {
            this._createControl();
        }
    },

    /**
     * Masque the control d'scale
     *
     * @example
     * GeoLeaf.UI.ScaleControl.hide();
     */
    hide() {
        if (this._control && this._map) {
            this._map.removeControl(this._control);
            this._control = null;
            this._scaleElement = null;
        }
    },
};

// ── ESM Export ──
export { ScaleControl };
