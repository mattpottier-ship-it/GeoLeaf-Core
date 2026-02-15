/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

(function (global) {
    "use strict";

    /**
     * Namespace global GeoLeaf
     */
    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf.UI = GeoLeaf.UI || {};

    /**
     * Logger unifié
     */
    const Log = GeoLeaf.Log;

    /**
     * Module GeoLeaf.UI.Branding
     *
     * Rôle :
     * - Afficher un texte de branding personnalisable
     * - Positionner le contrôle selon la configuration
     * - Permettre l'activation/désactivation via configuration
     */
    const Branding = {
        /**
         * Référence à la carte Leaflet.
         * @type {L.Map|null}
         * @private
         */
        _map: null,

        /**
         * Référence au contrôle Leaflet de branding.
         * @type {L.Control|null}
         * @private
         */
        _control: null,

        /**
         * Options du module
         * @type {Object}
         * @private
         */
        _options: {
            position: "bottomleft",
            text: "Propulsé par © GeoLeaf with Leaflet"
        },

        /**
         * Initialise le module de branding
         * @param {L.Map} map - Instance de la carte Leaflet
         * @param {Object} options - Options de configuration
         */
        init(map, options = {}) {
            const context = "[GeoLeaf.UI.Branding]";

            try {
                if (!map) {
                    throw new Error("Une instance de carte Leaflet est requise.");
                }

                this._map = map;
                this._options = Object.assign({}, this._options, options);

                // Vérifier si le module est activé dans la config
                const brandingConfig = GeoLeaf.Config?.get("brandingConfig");

                if (brandingConfig === false || (brandingConfig && brandingConfig.enabled === false)) {
                    Log.info(`${context} Branding désactivé dans la configuration.`);
                    return;
                }

                // Utiliser les paramètres de config si disponibles
                if (brandingConfig && typeof brandingConfig === "object") {
                    if (brandingConfig.text) {
                        this._options.text = brandingConfig.text;
                    }
                    if (brandingConfig.position) {
                        this._options.position = brandingConfig.position;
                    }
                }

                // Créer le contrôle Leaflet
                this._createControl();

                Log.info(`${context} Module initialisé avec succès.`);

            } catch (err) {
                Log.error(`${context} Erreur lors de l'initialisation :`, err.message);
            }
        },

        /**
         * Crée le contrôle Leaflet pour l'affichage du branding
         * @private
         */
        _createControl() {
            const context = "[GeoLeaf.UI.Branding]";

            try {
                // Définir le contrôle Leaflet personnalisé
                const BrandingControl = L.Control.extend({
                    options: {
                        position: this._options.position
                    },

                    onAdd: () => {
                        // Créer le conteneur principal
                        const container = L.DomUtil.create("div", "geoleaf-branding");

                        // Empêcher les événements de la carte sur ce contrôle
                        L.DomEvent.disableClickPropagation(container);
                        L.DomEvent.disableScrollPropagation(container);

                        // Créer l'élément d'affichage du texte
                        const brandingElement = L.DomUtil.create("div", "branding-content", container);
                        // SAFE: Utilisation de textContent pour éviter XSS
                        brandingElement.textContent = this._options.text;

                        return container;
                    },

                    onRemove: () => {
                        // Rien à nettoyer pour ce contrôle
                    }
                });

                // Créer et ajouter le contrôle à la carte
                this._control = new BrandingControl();
                this._control.addTo(this._map);

                Log.info(`${context} Contrôle de branding créé et ajouté à la carte.`);

            } catch (err) {
                Log.error(`${context} Erreur lors de la création du contrôle :`, err.message);
            }
        },

        /**
         * Détruit le contrôle et nettoie les ressources
         */
        destroy() {
            const context = "[GeoLeaf.UI.Branding]";

            try {
                if (this._control && this._map) {
                    this._map.removeControl(this._control);
                    this._control = null;
                }

                Log.info(`${context} Module détruit avec succès.`);

            } catch (err) {
                Log.error(`${context} Erreur lors de la destruction :`, err.message);
            }
        },

        /**
         * Active l'affichage du branding
         */
        show() {
            if (this._control && !this._map.hasControl(this._control)) {
                this._control.addTo(this._map);
            }
        },

        /**
         * Désactive l'affichage du branding
         */
        hide() {
            if (this._control && this._map) {
                this._map.removeControl(this._control);
            }
        },

        /**
         * Met à jour le texte du branding
         * @param {string} text - Nouveau texte
         */
        setText(text) {
            if (this._control) {
                const container = this._control.getContainer();
                if (container) {
                    const brandingElement = container.querySelector(".branding-content");
                    if (brandingElement) {
                        // SAFE: Utilisation de textContent pour éviter XSS
                        brandingElement.textContent = text;
                    }
                }
            }
        }
    };

    // Export du module
    GeoLeaf.UI.Branding = Branding;

})(typeof globalThis !== "undefined" ? globalThis : window);
