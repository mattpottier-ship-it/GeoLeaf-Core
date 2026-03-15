declare const L: any;

/*!



 * GeoLeaf Core



 * © 2026 Mattieu Pottier



 * Released under the MIT License



 * https://geoleaf.dev



 */

import { Log } from "../log/index.js";

import { Config } from "../config/geoleaf-config/config-core.js";

import { getLabel } from "../i18n/i18n.js";

/**



 * Module GeoLeaf.UI.Branding



 *



 * Role :



 * - Displaysr un text de branding personnalisable



 * - Positionner the control based on the configuration



 * - Allowstre l'activation/deactivation via configuration



 */

function _applyBrandingOptions(opts: any, branding: any): void {
    if (branding.text) opts.text = branding.text;

    if (branding.position) opts.position = branding.position;
}

const Branding: any = {
    /**



     * Reference to the Leaflet map.



     * @type {L.Map|null}



     * @private



     */

    _map: null,

    /**



     * Reference to the Leaflet control de branding.



     * @type {L.Control|null}



     * @private



     */

    _control: null,

    /**



     * Options of the module



     * @type {Object}



     * @private



     */

    _options: {
        position: "bottomleft",

        text: getLabel("ui.branding.default_text"),
    },

    /**



     * Initializes the module de branding



     * @param {L.Map} map - Instance de the map Leaflet



     * @param {Object} options - Options de configuration



     */

    init(map: any, options: any = {}) {
        const context = "[GeoLeaf.UI.Branding]";

        try {
            if (!map) {
                throw new Error("Une instance de carte Leaflet est requirede.");
            }

            this._map = map;

            this._options = Object.assign({}, this._options, options);

            // Source unique : geoleaf.config.json → key "branding"

            // No fallback to profile.json (brandingConfig ignored)

            const branding = (Config as any)?.get("branding");

            if (branding === undefined || branding === null) {
                // Key absente → warning visible sur the map

                console.warn("[GeoLeaf] branding key missing in geoleaf.config.json");

                this._options.text = getLabel("ui.branding.not_configured");

                this._createControl();

                return;
            }

            if (branding === false || (branding && branding.enabled === false)) {
                Log.info(`${context} Branding disabled in configuration.`);

                return;
            }

            // text empty → silencieux

            if (branding.text === "") {
                Log.info(`${context} Branding text empty — nothing displayed.`);

                return;
            }

            // Appliesr les options from geoleaf.config.json

            _applyBrandingOptions(this._options, branding);

            // Createsr the control Leaflet

            this._createControl();

            Log.info(`${context} Module initialized successfully.`);
        } catch (err: any) {
            Log.error(`${context} Error during initialization:`, err.message);
        }
    },

    /**



     * Creates the controle Leaflet pour l'display du branding



     * @private



     */

    _createControl() {
        const context = "[GeoLeaf.UI.Branding]";

        try {
            // Define the custom Leaflet control

            const BrandingControl = L.Control.extend({
                options: {
                    position: this._options.position,
                },

                onAdd: () => {
                    // Createsr le conteneur main

                    const container = L.DomUtil.create("div", "geoleaf-branding");

                    // Prevent map events on this control

                    L.DomEvent.disableClickPropagation(container);

                    L.DomEvent.disableScrollPropagation(container);

                    // Createsr l'element d'display du text

                    const brandingElement = L.DomUtil.create("div", "branding-content", container);

                    // SAFE: Utilisation de textContent pour avoid XSS

                    brandingElement.textContent = this._options.text;

                    return container;
                },

                onRemove: () => {
                    // Rien to clean pour ce controle
                },
            });

            // Createsr et ajouter the control to the map

            this._control = new BrandingControl();

            this._control.addTo(this._map);

            Log.info(`${context} Branding control created and added to the map.`);
        } catch (err: any) {
            Log.error(`${context} Error creating branding control:`, err.message);
        }
    },

    /**



     * Destroyed the control et nettoie les ressources



     */

    destroy() {
        const context = "[GeoLeaf.UI.Branding]";

        try {
            if (this._control && this._map) {
                this._map.removeControl(this._control);

                this._control = null;
            }

            Log.info(`${context} Module destroyed successfully.`);
        } catch (err: any) {
            Log.error(`${context} Error during destruction:`, err.message);
        }
    },

    /**



     * Active l'display du branding



     */

    show() {
        if (this._control && !this._map.hasControl(this._control)) {
            this._control.addTo(this._map);
        }
    },

    /**



     * Disables the branding display



     */

    hide() {
        if (this._control && this._map) {
            this._map.removeControl(this._control);
        }
    },

    /**



     * Updates the text du branding



     * @param {string} text - Nouveau text



     */

    setText(text: any) {
        if (this._control) {
            const container = this._control.getContainer();

            if (container) {
                const brandingElement = container.querySelector(".branding-content");

                if (brandingElement) {
                    // SAFE: Utilisation de textContent pour avoid XSS

                    brandingElement.textContent = text;
                }
            }
        }
    },
};

// ── ESM Export ──

export { Branding };
