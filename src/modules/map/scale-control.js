/**
 * GeoLeaf Scale Control
 * Gère l'affichage de l'échelle graphique, numérique et du niveau de zoom
 *
 * @module map/scale-control
 */
"use strict";

import { Log } from '../log/index.js';

// Lazy access to Config (not yet ESM — migrated in B4)
const _gl = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});


    /**
     * Contrôle d'échelle personnalisé
     */
    const ScaleControl = {
        _map: null,
        _config: null,
        _container: null,
        _scaleLineMetric: null,
        _numericElement: null,
        _zoomElement: null,
        _inputElement: null,
        _scalePrefix: null,
        _mainWrapper: null,
        _eventHandlers: {},

        /**
         * Initialise le contrôle d'échelle
         * @param {L.Map} map - Instance de la carte Leaflet
         * @param {Object} config - Configuration depuis scaleConfig
         */
        init(map, config) {
            if (!map) {
                Log.error("[GeoLeaf.ScaleControl] Carte non fournie");
                return;
            }

            this._map = map;
            this._config = config || {};

            // Créer un conteneur unique pour tout
            this._createMainContainer();

            Log.info("[GeoLeaf.ScaleControl] Contrôle d'échelle initialisé");
        },

        /**
         * Crée le conteneur principal avec échelle graphique et bloc personnalisé
         * @private
         */
        _createMainContainer() {
            const position = this._config.position || 'bottomleft';

            // Conteneur principal - disposition horizontale
            this._mainWrapper = L.DomUtil.create('div', 'gl-scale-main-wrapper');

            // 1. Échelle graphique
            if (this._config.scaleGraphic !== false) {
                const graphicWrapper = L.DomUtil.create('div', 'gl-scale-graphic-wrapper', this._mainWrapper);
                this._addGraphicScaleToContainer(graphicWrapper);
            }

            // 2. Bloc personnalisé (échelle numérique + zoom) sur la même ligne
            if (this._config.scaleNumeric || this._config.scaleNivel) {
                this._createCustomScaleBlock(this._mainWrapper);
            }

            // Ajouter le conteneur principal à la carte
            const CustomControl = L.Control.extend({
                options: {
                    position: position
                },
                onAdd: () => {
                    return this._mainWrapper;
                }
            });

            new CustomControl().addTo(this._map);
        },

        /**
         * Ajoute l'échelle graphique Leaflet dans un conteneur
         * @param {HTMLElement} container - Conteneur cible
         * @private
         */
        _addGraphicScaleToContainer(container) {
            // Créer l'échelle graphique manuellement (pas via L.control.scale)
            const scaleDiv = L.DomUtil.create('div', 'leaflet-control-scale leaflet-control', container);

            const scaleLineMetric = L.DomUtil.create('div', 'leaflet-control-scale-line', scaleDiv);
            this._scaleLineMetric = scaleLineMetric;

            // Fonction de mise à jour de l'échelle graphique
            const updateScale = () => {
                const y = this._map.getSize().y / 2;
                const maxMeters = this._map.distance(
                    this._map.containerPointToLatLng([0, y]),
                    this._map.containerPointToLatLng([150, y])
                );
                this._updateScaleLine(this._scaleLineMetric, maxMeters);
            };

            this._eventHandlers.graphicScaleUpdate = updateScale;
            this._map.on('zoomend moveend', updateScale);
            updateScale();

            Log.info("[GeoLeaf.ScaleControl] Échelle graphique ajoutée");
        },

        /**
         * Met à jour la ligne d'échelle graphique
         * @param {HTMLElement} scaleLine - Élément de la ligne d'échelle
         * @param {number} maxMeters - Distance maximale en mètres
         * @private
         */
        _updateScaleLine(scaleLine, maxMeters) {
            const maxKm = maxMeters / 1000;
            let scale, ratio;

            if (maxKm > 1) {
                const maxNiceKm = this._getRoundNum(maxKm);
                ratio = maxNiceKm / maxKm;
                scale = maxNiceKm + ' km';
            } else {
                const maxNiceM = this._getRoundNum(maxMeters);
                ratio = maxNiceM / maxMeters;
                scale = maxNiceM + ' m';
            }

            scaleLine.style.width = Math.round(150 * ratio) + 'px';
            scaleLine.textContent = scale;
        },

        /**
         * Arrondit un nombre à une valeur "propre" (1, 2, 5, 10, 20, 50, etc.)
         * @param {number} num - Nombre à arrondir
         * @returns {number} Nombre arrondi
         * @private
         */
        _getRoundNum(num) {
            const pow10 = Math.pow(10, (Math.floor(num) + '').length - 1);
            let d = num / pow10;

            d = d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1;

            return pow10 * d;
        },

        /**
         * Crée le bloc personnalisé (échelle numérique + niveau de zoom)
         * @param {HTMLElement} parentContainer - Conteneur parent
         * @private
         */
        _createCustomScaleBlock(parentContainer) {
            // Créer le conteneur - disposition horizontale
            this._container = L.DomUtil.create('div', 'gl-scale-control', parentContainer);

            // Échelle numérique
            if (this._config.scaleNumeric) {
                if (this._config.scaleNumericEditable) {
                    this._createEditableScale();
                } else {
                    this._createReadOnlyScale();
                }
            }

            // Niveau de zoom
            if (this._config.scaleNivel) {
                this._createZoomLevel();
            }

            // Événements de mise à jour
            const updateHandler = () => this._updateScale();
            this._eventHandlers.numericScaleUpdate = updateHandler;
            this._map.on('zoomend moveend', updateHandler);
            this._updateScale(); // Mise à jour initiale

            Log.info("[GeoLeaf.ScaleControl] Bloc personnalisé ajouté");
        },

        /**
         * Crée l'échelle numérique en lecture seule
         * @private
         */
        _createReadOnlyScale() {
            this._numericElement = L.DomUtil.create('div', 'gl-scale-numeric', this._container);
        },

        /**
         * Crée l'échelle numérique éditable avec input
         * @private
         */
        _createEditableScale() {
            // Créer un conteneur pour l'échelle éditable
            const wrapper = L.DomUtil.create('div', 'gl-scale-numeric-editable', this._container);

            // Créer le préfixe "1:" (toujours visible)
            this._scalePrefix = L.DomUtil.create('span', 'gl-scale-prefix', wrapper);
            this._scalePrefix.textContent = '1:';

            // Créer le span affiché initialement (souligné et cliquable) - contient uniquement le dénominateur
            this._numericElement = L.DomUtil.create('span', 'gl-scale-numeric-clickable', wrapper);
            this._numericElement.textContent = '0';

            // Créer l'input (caché initialement) - contient uniquement le dénominateur
            this._inputElement = L.DomUtil.create('input', 'gl-scale-numeric-input', wrapper);
            this._inputElement.type = 'text';
            this._inputElement.placeholder = '250000';
            this._inputElement.style.display = 'none';

            // Empêcher les interactions de la carte lors de l'édition
            L.DomEvent.disableClickPropagation(wrapper);
            L.DomEvent.disableScrollPropagation(wrapper);

            // Clic sur le span : passer en mode édition
            this._numericElement.addEventListener('click', () => {
                this._switchToEditMode();
            });

            // Validation avec Enter
            this._inputElement.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this._onScaleInputChange();
                    this._switchToDisplayMode();
                }
            });

            // Validation en cliquant à l'extérieur (blur)
            this._inputElement.addEventListener('blur', () => {
                this._onScaleInputChange();
                this._switchToDisplayMode();
            });
        },

        /**
         * Crée l'affichage du niveau de zoom
         * @private
         */
        _createZoomLevel() {
            this._zoomElement = L.DomUtil.create('div', 'gl-scale-zoom', this._container);
        },

        /**
         * Bascule en mode édition (affiche l'input)
         * @private
         */
        _switchToEditMode() {
            if (!this._numericElement || !this._inputElement) return;

            // Copier la valeur actuelle dans l'input
            this._inputElement.value = this._numericElement.textContent;

            // Cacher le span, afficher l'input
            this._numericElement.style.display = 'none';
            this._inputElement.style.display = 'inline-block';

            // Focus et sélection du texte
            this._inputElement.focus();
            this._inputElement.select();
        },

        /**
         * Bascule en mode affichage (affiche le span)
         * @private
         */
        _switchToDisplayMode() {
            if (!this._numericElement || !this._inputElement) return;

            // Cacher l'input, afficher le span
            this._inputElement.style.display = 'none';
            this._numericElement.style.display = 'inline';
        },

        /**
         * Met à jour l'affichage de l'échelle et du zoom
         * @private
         */
        _updateScale() {
            const zoom = this._map.getZoom();
            const scale = this._calculateScale(zoom);

            // Mettre à jour l'échelle numérique
            if (this._numericElement) {
                if (this._config.scaleNumericEditable) {
                    // Mettre à jour uniquement le dénominateur (sans '1:')
                    if (this._inputElement.style.display === 'none') {
                        this._numericElement.textContent = this._formatNumber(scale);
                    }
                } else {
                    // Mode non éditable : afficher "1:" + dénominateur
                    this._numericElement.textContent = `1:${this._formatNumber(scale)}`;
                }
            }

            // Mettre à jour le niveau de zoom
            if (this._zoomElement) {
                this._zoomElement.textContent = `Zoom: ${Number(zoom).toFixed(2)}`;
            }
        },

        /**
         * Calcule l'échelle approximative en fonction du niveau de zoom
         * @param {number} zoom - Niveau de zoom Leaflet
         * @param {number} [lat] - Latitude optionnelle (utilise le centre de la carte si non fournie)
         * @returns {number} Échelle (ex: 250000 pour 1:250000)
         * @private
         */
        _calculateScale(zoom, lat) {
            // Utiliser la latitude fournie ou celle du centre de la carte
            const latitude = lat !== undefined ? lat : this._map.getCenter().lat;
            // Formule approximative basée sur la taille des tuiles Web Mercator
            const metersPerPixel = 156543.03392 * Math.cos(latitude * Math.PI / 180) / Math.pow(2, zoom);
            const scale = metersPerPixel * 96 / 0.0254; // 96 DPI
            return Math.round(scale);
        },

        /**
         * Formate un nombre avec des espaces comme séparateurs de milliers
         * @param {number} num - Nombre à formater
         * @returns {string} Nombre formaté
         * @private
         */
        _formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        },

        /**
         * Gère le changement manuel de l'échelle
         * @private
         */
        _onScaleInputChange() {
            if (!this._inputElement) return;

            const input = this._inputElement.value.trim();
            // Parser uniquement le dénominateur (nombre avec espaces optionnels)
            const cleanedInput = input.replace(/\s/g, '');
            const targetScale = parseInt(cleanedInput, 10);

            if (!isNaN(targetScale) && targetScale > 0) {
                const targetZoom = this._calculateZoomFromScale(targetScale);
                // Utiliser setView avec zoomSnap: 0 pour permettre les zooms fractionnaires
                this._map.setView(this._map.getCenter(), targetZoom, {
                    animate: true,
                    zoomSnap: 0
                });
                Log.info(`[GeoLeaf.ScaleControl] Zoom ajusté à ${targetZoom} pour échelle 1:${targetScale}`);
            } else {
                Log.warn("[GeoLeaf.ScaleControl] Format d'échelle invalide:", input);
                this._updateScale(); // Réinitialiser la valeur
            }
        },

        /**
         * Calcule le niveau de zoom pour atteindre une échelle donnée
         * @param {number} targetScale - Échelle cible (ex: 250000)
         * @returns {number} Niveau de zoom (peut être décimal pour plus de précision)
         * @private
         */
        _calculateZoomFromScale(targetScale) {
            const lat = this._map.getCenter().lat;
            const metersPerPixel = targetScale * 0.0254 / 96;
            let zoom = Math.log2(156543.03392 * Math.cos(lat * Math.PI / 180) / metersPerPixel);

            // Affiner le zoom par itération pour obtenir l'échelle exacte
            // Utiliser une méthode de convergence précise
            for (let i = 0; i < 20; i++) {
                const currentScale = this._calculateScale(zoom, lat); // Passer lat pour éviter recalcul
                const diff = targetScale - currentScale;

                // Si l'erreur est inférieure à 1 (pratiquement identique), on arrête
                if (Math.abs(diff) < 1) {
                    break;
                }

                // Ajuster le zoom proportionnellement à l'erreur
                // Plus l'échelle est grande, plus on doit dézoomer (zoom plus petit)
                const adjustment = Math.log2(targetScale / currentScale);
                zoom -= adjustment * 0.95; // Facteur d'amortissement pour éviter les oscillations
            }

            // Arrondir à 4 décimales pour une précision maximale
            const preciseZoom = Math.round(zoom * 10000) / 10000;
            return Math.max(0, Math.min(22, preciseZoom));
        },

        /**
         * Détruit le contrôle et nettoie les ressources
         */
        destroy() {
            // Retirer les event listeners de la carte
            if (this._map && this._eventHandlers) {
                if (this._eventHandlers.graphicScaleUpdate) {
                    this._map.off('zoomend moveend', this._eventHandlers.graphicScaleUpdate);
                }
                if (this._eventHandlers.numericScaleUpdate) {
                    this._map.off('zoomend moveend', this._eventHandlers.numericScaleUpdate);
                }
            }

            // Supprimer le conteneur principal du DOM
            if (this._mainWrapper && this._mainWrapper.parentNode) {
                this._mainWrapper.parentNode.removeChild(this._mainWrapper);
            }

            // Nettoyer toutes les références
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

            Log.info("[GeoLeaf.ScaleControl] Contrôle détruit et ressources nettoyées");
        }
    };

    // Exposer le module (removed: migrated to globals.js in B3)

    /**
     * Initialise automatiquement le contrôle d'échelle si la configuration est présente
     */
    function initScaleControl(map) {
        if (!map) {
            Log.warn("[GeoLeaf.ScaleControl] Impossible d'initialiser : carte non fournie");
            return;
        }

        const config = _gl.GeoLeaf && _gl.GeoLeaf.Config && typeof _gl.GeoLeaf.Config.get === 'function'
            ? _gl.GeoLeaf.Config.get('scaleConfig')
            : null;

        if (config && (config.scaleGraphic || config.scaleNumeric || config.scaleNivel)) {
            ScaleControl.init(map, config);
        }
    }

export { ScaleControl, initScaleControl };
