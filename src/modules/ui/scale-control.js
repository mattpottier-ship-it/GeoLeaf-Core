/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module GeoLeaf.UI.ScaleControl
 * @description Contrôle d'échelle pour la carte (graphique ou numérique)
 * @version 1.0.0
 */

import { Log } from '../log/index.js';
import { Config } from '../config/geoleaf-config/config-core.js';

    /**
     * Module de contrôle d'échelle
     * Affiche l'échelle de la carte en mode graphique (Leaflet) ou numérique (1:25000)
     */
    const ScaleControl = {
        _map: null,
        _control: null,
        _scaleElement: null,
        _options: {
            position: "bottomleft",
            scaleType: "graphic", // "graphic" (Leaflet) ou "numeric" (1:25000)
            metric: true,
            imperial: false,
            maxWidth: 150
        },

        /**
         * Initialise le contrôle d'échelle
         *
         * @param {L.Map} map - Instance de la carte Leaflet
         * @param {Object} [options={}] - Options de configuration
         * @param {string} [options.position='bottomleft'] - Position du contrôle
         * @param {string} [options.scaleType='graphic'] - Type d'échelle ('graphic' ou 'numeric')
         * @param {boolean} [options.metric=true] - Afficher échelle métrique
         * @param {boolean} [options.imperial=false] - Afficher échelle impériale
         * @param {number} [options.maxWidth=150] - Largeur max de l'échelle graphique
         *
         * @example
         * GeoLeaf.UI.ScaleControl.init(map, {
         *   scaleType: 'numeric',
         *   position: 'bottomright'
         * });
         */
        init(map, options = {}) {
            const context = "[GeoLeaf.UI.ScaleControl]";
            try {
                if (!map) {
                    throw new Error("Une instance de carte Leaflet est requise.");
                }
                this._map = map;
                this._options = { ...this._options, ...options };

                const showScale = Config?.get("ui.showScale");
                if (showScale === false) {
                    Log.info(`${context} Affichage de l'échelle désactivé dans la configuration.`);
                    return;
                }

                // Récupérer le type d'échelle depuis la config
                const scaleType = Config?.get("ui.scaleType");
                if (scaleType) {
                    this._options.scaleType = scaleType;
                }

                this._createControl();
                Log.info(`${context} Module initialisé avec succès (type: ${this._options.scaleType}).`);
            } catch (err) {
                Log.error(`${context} Erreur lors de l'initialisation :`, err.message);
            }
        },

        _createControl() {
            const context = "[GeoLeaf.UI.ScaleControl]";
            try {
                if (this._options.scaleType === "numeric") {
                    // Créer un contrôle personnalisé pour l'échelle numérique
                    this._createNumericScale();
                } else {
                    // Utiliser le contrôle Leaflet par défaut (graphique)
                    this._control = L.control.scale({
                        position: this._options.position,
                        metric: this._options.metric,
                        imperial: this._options.imperial,
                        maxWidth: this._options.maxWidth
                    });
                    this._control.addTo(this._map);
                }
                Log.info(`${context} Contrôle d'échelle créé et ajouté à la carte.`);
            } catch (err) {
                Log.error(`${context} Erreur lors de la création du contrôle :`, err.message);
            }
        },

        _createNumericScale() {
            const NumericScaleControl = L.Control.extend({
                options: {
                    position: this._options.position
                },

                onAdd: (map) => {
                    const container = L.DomUtil.create("div", "geoleaf-scale-numeric leaflet-control");

                    L.DomEvent.disableClickPropagation(container);
                    L.DomEvent.disableScrollPropagation(container);

                    // Créer un conteneur flex pour aligner échelle et zoom
                    const flexContainer = L.DomUtil.create("div", "scale-flex-container", container);
                    flexContainer.style.cssText = "display: flex; align-items: center; gap: 8px;";

                    // Élément pour l'échelle numérique (suit le thème)
                    this._scaleElement = L.DomUtil.create("div", "scale-content gl-scale-numeric", flexContainer);
                    this._scaleElement.textContent = "1:0";

                    // Élément pour le niveau de zoom (suit le thème)
                    this._zoomElement = L.DomUtil.create("div", "zoom-level gl-zoom-badge", flexContainer);
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

                onRemove: (map) => {
                    // MEMORY LEAK FIX (Phase 2): Use stored bound function references
                    // instead of creating new bind() which would not match
                    if (this._boundUpdateNumericScale) {
                        map.off("zoomend", this._boundUpdateNumericScale);
                        // Perf 6.2.1: matches 'moveend' listener registered in onAdd
                        map.off("moveend", this._boundUpdateNumericScale);
                        this._boundUpdateNumericScale = null; // Clean up reference
                    }
                }
            });

            this._control = new NumericScaleControl();
            this._control.addTo(this._map);
        },

        _updateNumericScale() {
            if (!this._scaleElement || !this._map) return;

            // Obtenir le centre de la carte
            const center = this._map.getCenter();
            const zoom = this._map.getZoom();

            // Mettre à jour le niveau de zoom
            if (this._zoomElement) {
                this._zoomElement.textContent = `Z${Number(zoom).toFixed(2)}`;
            }

            // Calculer la résolution en mètres par pixel au centre de la carte
            // Formule : résolution = (40075016.686 * Math.abs(Math.cos(center.lat * Math.PI / 180))) / Math.pow(2, zoom + 8)
            const metersPerPixel = 156543.03392 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, zoom);

            // Calculer l'échelle (1 pixel écran = X mètres réels)
            // Échelle = distance réelle / distance carte
            // Supposons 96 DPI (standard), donc 1 pouce = 96 pixels = 0.0254 mètres
            const scale = Math.round(metersPerPixel * 96 / 0.0254);

            // Formater l'échelle de manière lisible
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
         * Détruit le contrôle d'échelle et libère les ressources
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
            } catch (err) {
                Log.error(`${context} Erreur lors de la destruction :`, err.message);
            }
        },

        /**
         * Affiche le contrôle d'échelle (le crée s'il n'existe pas)
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
         * Masque le contrôle d'échelle
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
        }
    };

// ── ESM Export ──
export { ScaleControl };
