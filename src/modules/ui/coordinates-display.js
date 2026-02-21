/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from '../log/index.js';
import { Config } from '../config/geoleaf-config/config-core.js';

    /**
     * Contexte pour les logs
     * @const
     */
    const CONTEXT = "[GeoLeaf.UI.CoordinatesDisplay]";

    /**
     * Texte par défaut des coordonnées
     * @const
     */
    const DEFAULT_COORDS_TEXT = "Lat: --, Lng: --";

    /**
     * Module GeoLeaf.UI.CoordinatesDisplay
     *
     * Rôle :
     * - Afficher les coordonnées du curseur en temps réel
     * - Positionner le contrôle en bas à droite à côté de la légende
     * - Permettre l'activation/désactivation via configuration
     */
    const CoordinatesDisplay = {
        /**
         * Référence à la carte Leaflet.
         * @type {L.Map|null}
         * @private
         */
        _map: null,

        /**
         * Référence au contrôle Leaflet des coordonnées.
         * @type {L.Control|null}
         * @private
         */
        _control: null,

        /**
         * Element DOM pour l'affichage des coordonnées
         * @type {HTMLElement|null}
         * @private
         */
        _coordsElement: null,

        /**
         * Référence bound du listener mousemove (pour pouvoir le retirer)
         * @type {Function|null}
         * @private
         */
        _boundMouseMoveHandler: null,

        /**
         * Options du module
         * @type {Object}
         * @private
         */
        _options: {
            position: "bottomleft",
            decimals: 6
        },

        /**
         * Initialise le module de coordonnées
         * @param {L.Map} map - Instance de la carte Leaflet
         * @param {Object} options - Options de configuration
         */
        init(map, options = {}) {
            try {
                if (!map) {
                    throw new Error("Une instance de carte Leaflet est requise.");
                }

                this._map = map;
                this._options = Object.assign({}, this._options, options);

                // Vérifier si le module est activé dans la config
                const showCoordinates = Config?.get("ui.showCoordinates");

                if (showCoordinates === false) {
                    Log.info(`${CONTEXT} Affichage des coordonnées désactivé dans la configuration.`);
                    return;
                }

                // Stocker la référence bound du listener
                this._boundMouseMoveHandler = this._onMouseMove.bind(this);

                // Créer le contrôle Leaflet
                this._createControl();

                Log.info(`${CONTEXT} Module initialisé avec succès.`);

            } catch (err) {
                Log.error(`${CONTEXT} Erreur lors de l'initialisation :`, err.message);
            }
        },

        /**
         * Crée le contrôle Leaflet pour l'affichage des coordonnées
         * @private
         */
        _createControl() {
            try {
                // Perf 6.2.4: MutationObserver instead of setTimeout(100) for robustness
                // Wait for .gl-scale-main-wrapper to appear in DOM without a fixed delay
                const scaleWrapper = document.querySelector('.gl-scale-main-wrapper');

                if (scaleWrapper) {
                    this._attachToScaleWrapper(scaleWrapper);
                } else {
                    // Wrapper not yet in DOM: observe body until it appears
                    const observer = new MutationObserver((_mutations, obs) => {
                        const el = document.querySelector('.gl-scale-main-wrapper');
                        if (el) {
                            obs.disconnect();
                            this._attachToScaleWrapper(el);
                        }
                    });
                    observer.observe(document.body || document.documentElement, {
                        childList: true,
                        subtree: true
                    });
                    // Safety timeout: fallback to standalone after 5s if wrapper never appears
                    setTimeout(() => {
                        observer.disconnect();
                        if (!this._coordsElement) {
                            Log.warn(`${CONTEXT} Wrapper d'échelle non trouvé après 5s, utilisation du mode classique.`);
                            this._createStandaloneControl();
                        }
                    }, 5000);
                }

            } catch (err) {
                Log.error(`${CONTEXT} Erreur lors de la création du contrôle :`, err.message);
            }
        },

        /**
         * Attache les coordonnées au wrapper d'échelle existant
         * @param {HTMLElement} scaleWrapper - Wrapper d'échelle
         * @private
         */
        _attachToScaleWrapper(scaleWrapper) {
            // Ajouter un séparateur avant les coordonnées
            L.DomUtil.create('div', 'gl-scale-separator', scaleWrapper);

            // Créer l'élément d'affichage des coordonnées directement dans le wrapper
            this._coordsElement = L.DomUtil.create('div', 'gl-scale-coordinates', scaleWrapper);
            this._coordsElement.textContent = DEFAULT_COORDS_TEXT;

            // Ajouter l'écouteur d'événement mousemove avec référence stockée
            this._map.on('mousemove', this._boundMouseMoveHandler);

            Log.info(`${CONTEXT} Coordonnées intégrées au wrapper d'échelle.`);
        },

        /**
         * Crée un contrôle standalone en fallback
         * @private
         */
        _createStandaloneControl() {
            const CoordinatesControl = L.Control.extend({
                options: {
                    position: this._options.position
                },

                onAdd: (map) => {
                    const container = L.DomUtil.create("div", "geoleaf-coordinates-display");
                    L.DomEvent.disableClickPropagation(container);
                    L.DomEvent.disableScrollPropagation(container);
                    this._coordsElement = L.DomUtil.create("div", "coordinates-content", container);
                    this._coordsElement.textContent = DEFAULT_COORDS_TEXT;
                    map.on("mousemove", this._boundMouseMoveHandler);
                    return container;
                },

                onRemove: (map) => {
                    map.off("mousemove", this._boundMouseMoveHandler);
                }
            });

            this._control = new CoordinatesControl();
            this._control.addTo(this._map);
        },

        /**
         * Gestionnaire d'événement pour le mouvement de la souris
         * @param {Object} e - Événement Leaflet
         * @private
         */
        _onMouseMove(e) {
            if (!this._coordsElement) return;

            const lat = e.latlng.lat.toFixed(this._options.decimals);
            const lng = e.latlng.lng.toFixed(this._options.decimals);

            this._coordsElement.textContent = `Lat: ${lat}, Lng: ${lng}`;
        },

        /**
         * Détruit le contrôle et nettoie les ressources
         */
        destroy() {
            try {
                // Nettoyer l'écouteur d'événements avec la référence stockée
                if (this._map && this._boundMouseMoveHandler) {
                    this._map.off('mousemove', this._boundMouseMoveHandler);
                    this._boundMouseMoveHandler = null;
                }

                // Retirer l'élément du DOM s'il existe
                if (this._coordsElement && this._coordsElement.parentNode) {
                    this._coordsElement.parentNode.removeChild(this._coordsElement);
                    this._coordsElement = null;
                }

                // Retirer le contrôle standalone s'il existe
                if (this._control && this._map) {
                    this._map.removeControl(this._control);
                    this._control = null;
                }

                Log.info(`${CONTEXT} Module détruit avec succès.`);

            } catch (err) {
                Log.error(`${CONTEXT} Erreur lors de la destruction :`, err.message);
            }
        }
    };

// ── ESM Export ──
export { CoordinatesDisplay };
