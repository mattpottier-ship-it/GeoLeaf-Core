declare const L: any;
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from "../log/index.js";
import { Config } from "../config/geoleaf-config/config-core.js";

/**
 * Context for thes logs
 * @const
 */
const CONTEXT = "[GeoLeaf.UI.CoordinatesDisplay]";

/**
 * Text by default des coordinates
 * @const
 */
const DEFAULT_COORDS_TEXT = "Lat: --, Lng: --";

/**
 * Module GeoLeaf.UI.CoordinatesDisplay
 *
 * Role :
 * - Displaysr les coordinates du cursor en temps real
 * - Positionner the control en bas to droite to side de the legend
 * - Allowstre l'activation/deactivation via configuration
 */
const CoordinatesDisplay: any = {
    /**
     * Reference to the Leaflet map.
     * @type {L.Map|null}
     * @private
     */
    _map: null,

    /**
     * Reference to the Leaflet control des coordinates.
     * @type {L.Control|null}
     * @private
     */
    _control: null,

    /**
     * Element DOM pour l'display des coordinates
     * @type {HTMLElement|null}
     * @private
     */
    _coordsElement: null,

    /**
     * Bound reference to the mousemove listener (so it can be removed)
     * @type {Function|null}
     * @private
     */
    _boundMouseMoveHandler: null,

    /**
     * Options of the module
     * @type {Object}
     * @private
     */
    _options: {
        position: "bottomleft",
        decimals: 6,
    },

    /**
     * Initializes the module de coordinates
     * @param {L.Map} map - Instance de the map Leaflet
     * @param {Object} options - Options de configuration
     */
    init(map: any, options: any = {}) {
        try {
            if (!map) {
                throw new Error("Une instance de carte Leaflet est requirede.");
            }

            this._map = map;
            this._options = Object.assign({}, this._options, options);

            // Check si the module est activated in the config
            const showCoordinates = (Config as any)?.get("ui.showCoordinates");

            if (showCoordinates === false) {
                Log.info(`${CONTEXT} Coordinate display disabled in configuration.`);
                return;
            }

            // Stocker la reference bound du listner
            this._boundMouseMoveHandler = this._onMouseMove.bind(this);

            // Createsr the control Leaflet
            this._createControl();

            Log.info(`${CONTEXT} Module initialized successfully.`);
        } catch (err: any) {
            Log.error(`${CONTEXT} Error during initialization:`, err.message);
        }
    },

    /**
     * Creates the controle Leaflet pour l'display des coordinates
     * @private
     */
    _createControl() {
        try {
            // Perf 6.2.4: MutationObserver instead of setTimeout(100) for robustness
            // Wait for .gl-scale-main-wrapper to appear in DOM without a fixed delay
            const scaleWrapper = document.querySelector(".gl-scale-main-wrapper");

            if (scaleWrapper) {
                this._attachToScaleWrapper(scaleWrapper);
            } else {
                // Wrapper not yet in DOM: observe body until it appears
                const observer = new MutationObserver((_mutations, obs) => {
                    const el = document.querySelector(".gl-scale-main-wrapper");
                    if (el) {
                        obs.disconnect();
                        this._attachToScaleWrapper(el);
                    }
                });
                observer.observe(document.body || document.documentElement, {
                    childList: true,
                    subtree: true,
                });
                // Safety timeout: fallback to standalone after 5s if wrapper never appears
                setTimeout(() => {
                    observer.disconnect();
                    if (!this._coordsElement) {
                        Log.warn(
                            `${CONTEXT} Scale wrapper not found after 5s, using classic mode.`
                        );
                        this._createStandaloneControl();
                    }
                }, 5000);
            }
        } catch (err: any) {
            Log.error(`${CONTEXT} Error creating control:`, err.message);
        }
    },

    /**
     * Attache les coordinates au wrapper d'scale existing
     * @param {HTMLElement} scaleWrapper - Wrapper d'scale
     * @private
     */
    _attachToScaleWrapper(scaleWrapper: any) {
        // Addsr un separator before thes coordinates
        L.DomUtil.create("div", "gl-scale-separator", scaleWrapper);

        // Createsr l'element d'display des coordinates directly in the wrapper
        this._coordsElement = L.DomUtil.create("div", "gl-scale-coordinates", scaleWrapper);
        this._coordsElement.textContent = DEFAULT_COORDS_TEXT;

        // Adds the mousemove event listener with stored reference
        this._map.on("mousemove", this._boundMouseMoveHandler);

        Log.info(`${CONTEXT} Coordinates integrated into scale wrapper.`);
    },

    /**
     * Creates a controle standalone en fallback
     * @private
     */
    _createStandaloneControl() {
        const CoordinatesControl = L.Control.extend({
            options: {
                position: this._options.position,
            },

            onAdd: (map: any) => {
                const container = L.DomUtil.create("div", "geoleaf-coordinates-display");
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);
                this._coordsElement = L.DomUtil.create("div", "coordinates-content", container);
                this._coordsElement.textContent = DEFAULT_COORDS_TEXT;
                map.on("mousemove", this._boundMouseMoveHandler);
                return container;
            },

            onRemove: (map: any) => {
                map.off("mousemove", this._boundMouseMoveHandler);
            },
        });

        this._control = new CoordinatesControl();
        this._control.addTo(this._map);
    },

    /**
     * Manager d'event for the mouvement de la souris
     * @param {Object} e - Event Leaflet
     * @private
     */
    _onMouseMove(e: any) {
        if (!this._coordsElement) return;

        const lat = e.latlng.lat.toFixed(this._options.decimals);
        const lng = e.latlng.lng.toFixed(this._options.decimals);

        this._coordsElement.textContent = `Lat: ${lat}, Lng: ${lng}`;
    },

    /**
     * Destroyed the control et nettoie les ressources
     */
    destroy() {
        try {
            // Remove the event listener with stored reference
            if (this._map && this._boundMouseMoveHandler) {
                this._map.off("mousemove", this._boundMouseMoveHandler);
                this._boundMouseMoveHandler = null;
            }

            // Retirer l'element du DOM s'il existe
            if (this._coordsElement && this._coordsElement.parentNode) {
                this._coordsElement.parentNode.removeChild(this._coordsElement);
                this._coordsElement = null;
            }

            // Retirer the control standalone s'il existe
            if (this._control && this._map) {
                this._map.removeControl(this._control);
                this._control = null;
            }

            Log.info(`${CONTEXT} Module destroyed successfully.`);
        } catch (err: any) {
            Log.error(`${CONTEXT} Error during destruction:`, err.message);
        }
    },
};

// ── ESM Export ──
export { CoordinatesDisplay };
