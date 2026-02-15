/**
 * GeoLeaf GeoJSON Module - Aggregator
 * Module principal qui délègue aux sous-modules spécialisés
 *
 * Architecture Phase 3.5:
 * - geojson/shared.js        : État partagé, constantes, STYLE_OPERATORS
 * - geojson/style-resolver.js: Évaluation styleRules, buildLeafletOptions
 * - geojson/layer-manager.js : Gestion couches (show/hide/toggle/remove)
 * - geojson/loader.js        : Chargement (loadUrl, loadFromActiveProfile)
 * - geojson/popup-tooltip.js : Popups et tooltips unifiés
 * - geojson/clustering.js    : Stratégies de clustering
 *
 * @module geoleaf.geojson
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log || console;

    // ========================================
    //   GETTERS LAZY POUR SOUS-MODULES
    // ========================================

    const getShared = () => GeoLeaf._GeoJSONShared;
    const getState = () => GeoLeaf._GeoJSONShared && GeoLeaf._GeoJSONShared.state;
    const getStyleResolver = () => GeoLeaf._GeoJSONStyleResolver;
    const getLayerManager = () => GeoLeaf._GeoJSONLayerManager;
    const getLoader = () => GeoLeaf._GeoJSONLoader;
    const getPopupTooltip = () => GeoLeaf._GeoJSONPopupTooltip;
    const getClustering = () => GeoLeaf._GeoJSONClustering;

    // ========================================
    //   MODULE GEOJSON (AGRÉGATEUR)
    // ========================================

    const GeoJSONModule = {
        /**
         * Getters pour accès direct à l'état (compatibilité)
         */
        get _map() { return getState() ? getState().map : null; },
        get _layerGroup() { return getState() ? getState().layerGroup : null; },
        get _geoJsonLayer() { return getState() ? getState().geoJsonLayer : null; },
        get _layers() { return getState() ? getState().layers : new Map(); },
        get _featureCache() { return getState() ? getState().featureCache : new Map(); },
        get _options() { return getState() ? getState().options : {}; },

        /**
         * Valide les options passées à init()
         * @param {Object} options
         * @private
         */
        _validateOptions(options) {
            if (options.map && typeof options.map.addLayer !== 'function') {
                Log.warn("[GeoLeaf.GeoJSON] options.map ne semble pas être une carte Leaflet valide.");
            }

            if (options.defaultStyle && typeof options.defaultStyle !== 'object') {
                Log.warn("[GeoLeaf.GeoJSON] options.defaultStyle doit être un objet.");
                delete options.defaultStyle;
            }

            if (options.onEachFeature && typeof options.onEachFeature !== 'function') {
                Log.warn("[GeoLeaf.GeoJSON] options.onEachFeature doit être une fonction.");
                delete options.onEachFeature;
            }

            if (options.pointToLayer && typeof options.pointToLayer !== 'function') {
                Log.warn("[GeoLeaf.GeoJSON] options.pointToLayer doit être une fonction.");
                delete options.pointToLayer;
            }

            if (options.maxZoomOnFit !== undefined &&
                (typeof options.maxZoomOnFit !== 'number' || options.maxZoomOnFit < 1 || options.maxZoomOnFit > 20)) {
                Log.warn("[GeoLeaf.GeoJSON] options.maxZoomOnFit doit être un nombre entre 1 et 20.");
                options.maxZoomOnFit = GeoLeaf.CONSTANTS ? GeoLeaf.CONSTANTS.GEOJSON_MAX_ZOOM_ON_FIT : 18;
            }

            return options;
        },

        /**
         * Initialise le module GeoJSON.
         *
         * @param {Object} options
         * @param {L.Map} [options.map] - Carte Leaflet. Si absent, tentative via GeoLeaf.Core.getMap().
         * @param {Object} [options.defaultStyle]
         * @param {Object} [options.defaultPointStyle]
         * @param {Function} [options.onEachFeature]
         * @param {Function} [options.pointToLayer]
         * @param {boolean} [options.fitBoundsOnLoad]
         * @param {number} [options.maxZoomOnFit]
         * @returns {L.GeoJSON|null} - La couche GeoJSON ou null si échec.
         */
        init(options = {}) {
            const state = getState();
            if (!state) {
                Log.error("[GeoLeaf.GeoJSON] Module shared.js non chargé.");
                return null;
            }

            // Validation
            options = this._validateOptions(options);

            if (typeof global.L === "undefined" || !global.L || typeof global.L.geoJSON !== "function") {
                Log.error("[GeoLeaf.GeoJSON] Leaflet (L) est requis mais introuvable.");
                return null;
            }

            // Utiliser l'helper partagé
            const map = GeoLeaf.Utils ? GeoLeaf.Utils.ensureMap(options.map) : (options.map || null);

            if (!map) {
                Log.error(
                    "[GeoLeaf.GeoJSON] Aucune carte Leaflet disponible. Passe une instance de carte dans init({ map })."
                );
                return null;
            }

            state.map = map;

            // Fusionner les options
            state.options = GeoLeaf.Utils && GeoLeaf.Utils.mergeOptions
                ? GeoLeaf.Utils.mergeOptions(state.options, options)
                : Object.assign({}, state.options, options);

            // Créer les panes pour contrôler le z-index des couches
            const PaneConfig = getShared().PANE_CONFIG;
            const PaneHelpers = getShared().PaneHelpers;

            // Basemap: z-index 200 (toujours en dessous)
            const basemapPane = state.map.createPane(PaneConfig.BASEMAP_NAME);
            basemapPane.style.zIndex = PaneConfig.BASEMAP_ZINDEX;

            // Couches GeoJSON/WMS: z-index 400-499 (0-99 dans config)
            for (let i = PaneConfig.MIN_LAYER_ZINDEX; i <= PaneConfig.MAX_LAYER_ZINDEX; i++) {
                const pane = state.map.createPane(PaneHelpers.getPaneName(i));
                pane.style.zIndex = PaneConfig.LAYER_BASE_ZINDEX + i;
            }

            Log.info(`[GeoLeaf.GeoJSON] Panes créés : ${PaneConfig.BASEMAP_NAME} (z:${PaneConfig.BASEMAP_ZINDEX}), ${PaneConfig.LAYER_PREFIX}0 à ${PaneConfig.LAYER_PREFIX}${PaneConfig.MAX_LAYER_ZINDEX} (z:${PaneConfig.LAYER_BASE_ZINDEX}-${PaneConfig.LAYER_BASE_ZINDEX + PaneConfig.MAX_LAYER_ZINDEX})`);

            // Créer un groupe pour encapsuler TOUTES les couches GeoJSON
            state.layerGroup = global.L.featureGroup().addTo(state.map);

            // Initialiser la Map des couches
            state.layers = new Map();

            // Ajouter un écouteur pour gérer les seuils de zoom
            const LayerManager = getLayerManager();
            if (LayerManager) {
                state.map.on('zoomend', () => {
                    LayerManager.updateLayerVisibilityByZoom();
                });
            }

            // LEGACY: Créer la couche GeoJSON vide (pour compatibilité)
            const StyleResolver = getStyleResolver();
            const leafletOptions = StyleResolver
                ? StyleResolver.buildLeafletOptions(state.options)
                : {};

            state.geoJsonLayer = global.L.geoJSON(null, leafletOptions);
            state.geoJsonLayer.addTo(state.layerGroup);

            Log.info("[GeoLeaf.GeoJSON] Module initialisé en mode multi-couches");

            return state.geoJsonLayer;
        },

        /**
         * Retourne la couche GeoJSON principale (LEGACY).
         * @returns {L.GeoJSON|null}
         */
        getLayer() {
            const state = getState();
            return state ? state.geoJsonLayer : null;
        },

        // ========================================
        //   DÉLÉGATION VERS LAYER MANAGER
        // ========================================

        getLayerById(layerId) {
            const LayerManager = getLayerManager();
            return LayerManager ? LayerManager.getLayerById(layerId) : null;
        },

        getLayerData(layerId) {
            const LayerManager = getLayerManager();
            return LayerManager ? LayerManager.getLayerData(layerId) : null;
        },

        getAllLayers() {
            const LayerManager = getLayerManager();
            return LayerManager ? LayerManager.getAllLayers() : [];
        },

        showLayer(layerId) {
            const LayerManager = getLayerManager();
            if (LayerManager) LayerManager.showLayer(layerId);
        },

        hideLayer(layerId) {
            const LayerManager = getLayerManager();
            if (LayerManager) LayerManager.hideLayer(layerId);
        },

        toggleLayer(layerId) {
            const LayerManager = getLayerManager();
            if (LayerManager) LayerManager.toggleLayer(layerId);
        },

        removeLayer(layerId) {
            const LayerManager = getLayerManager();
            if (LayerManager) LayerManager.removeLayer(layerId);
        },

        updateLayerZIndex(layerId, newZIndex) {
            const LayerManager = getLayerManager();
            return LayerManager ? LayerManager.updateLayerZIndex(layerId, newZIndex) : false;
        },

        setLayerStyle(layerId, styleConfig) {
            const LayerManager = getLayerManager();
            return LayerManager ? LayerManager.setLayerStyle(layerId, styleConfig) : false;
        },

        // ========================================
        //   DÉLÉGATION VERS LOADER
        // ========================================

        loadUrl(url, options = {}) {
            const Loader = getLoader();
            return Loader ? Loader.loadUrl(url, options) : Promise.resolve(null);
        },

        addData(geojsonData, options = {}) {
            const Loader = getLoader();
            if (Loader) Loader.addData(geojsonData, options);
        },

        loadFromActiveProfile(options = {}) {
            const Loader = getLoader();
            return Loader ? Loader.loadFromActiveProfile(options) : Promise.resolve([]);
        },

        // ========================================
        //   FILTRAGE DES FEATURES
        // ========================================

        /**
         * Filtre les features de toutes les couches GeoJSON.
         * Montre uniquement les features qui passent le prédicat.
         *
         * @param {Function} filterFn - Fonction (feature, layerId) => boolean
         * @param {Object} [options] - Options supplémentaires
         * @returns {Object} - { filtered: number, total: number, visible: number }
         */
        filterFeatures(filterFn, options = {}) {
            const state = getState();
            if (typeof filterFn !== 'function') {
                Log.warn("[GeoLeaf.GeoJSON] filterFeatures: filterFn doit être une fonction");
                return { filtered: 0, total: 0, visible: 0 };
            }

            const stats = { filtered: 0, total: 0, visible: 0 };

            // Déterminer les couches à filtrer
            let layerIds = [];
            if (options.layerIds) {
                layerIds = Array.isArray(options.layerIds) ? options.layerIds : [options.layerIds];
            } else {
                layerIds = Array.from(state.layers.keys());
            }

            // Filtrer par type de géométrie si spécifié (avec aliases)
            if (options.geometryType) {
                const geoType = options.geometryType.toLowerCase();
                const typeAliases = {
                    'poi': 'point',
                    'route': 'line',
                    'linestring': 'line',
                    'area': 'polygon'
                };
                const normalizedType = typeAliases[geoType] || geoType;

                layerIds = layerIds.filter(id => {
                    const data = state.layers.get(id);
                    if (!data) return false;
                    const layerGeoType = (data.geometryType || '').toLowerCase();
                    const normalizedLayerType = typeAliases[layerGeoType] || layerGeoType;
                    return normalizedLayerType === normalizedType;
                });
            }

            layerIds.forEach(layerId => {
                const layerData = state.layers.get(layerId);
                if (!layerData || !layerData.layer) return;

                // Si search.enabled === false, la couche n'est pas concernée par le filtrage
                const bypassFilter = layerData.config?.search?.enabled === false;

                // Initialiser le Set des layers filtrées si pas encore fait
                if (!layerData._filteredOutLayers) {
                    layerData._filteredOutLayers = new Set();
                }

                const toShow = [];
                const toHide = [];

                // Itérer sur chaque feature
                layerData.layer.eachLayer(leafletLayer => {
                    if (!leafletLayer.feature) return;

                    stats.total++;

                    const shouldShow = bypassFilter || filterFn(leafletLayer.feature, layerId);

                    if (shouldShow) {
                        toShow.push(leafletLayer);
                        stats.visible++;
                    } else {
                        toHide.push(leafletLayer);
                        stats.filtered++;
                    }
                });

                // Appliquer les changements de visibilité
                const clusterGroup = layerData.clusterGroup;

                toHide.forEach(leafletLayer => {
                    leafletLayer._geoleafFiltered = true;

                    if (clusterGroup) {
                        if (!layerData._filteredOutLayers.has(leafletLayer)) {
                            clusterGroup.removeLayer(leafletLayer);
                            layerData._filteredOutLayers.add(leafletLayer);
                        }
                    } else {
                        if (leafletLayer.getElement) {
                            const layerElement = leafletLayer.getElement();
                            if (layerElement) layerElement.style.display = 'none';
                        } else if (leafletLayer.setStyle) {
                            if (leafletLayer.options._originalOpacity === undefined) {
                                leafletLayer.options._originalOpacity = leafletLayer.options.opacity;
                                leafletLayer.options._originalFillOpacity = leafletLayer.options.fillOpacity;
                            }
                            leafletLayer.setStyle({ opacity: 0, fillOpacity: 0 });
                        }
                    }
                });

                toShow.forEach(leafletLayer => {
                    leafletLayer._geoleafFiltered = false;

                    if (clusterGroup) {
                        if (layerData._filteredOutLayers.has(leafletLayer)) {
                            clusterGroup.addLayer(leafletLayer);
                            layerData._filteredOutLayers.delete(leafletLayer);
                        }
                    } else {
                        if (leafletLayer.getElement) {
                            const layerElement = leafletLayer.getElement();
                            if (layerElement) layerElement.style.display = '';
                        } else if (leafletLayer.setStyle) {
                            leafletLayer.setStyle({
                                opacity: leafletLayer.options._originalOpacity !== undefined
                                    ? leafletLayer.options._originalOpacity : 1,
                                fillOpacity: leafletLayer.options._originalFillOpacity !== undefined
                                    ? leafletLayer.options._originalFillOpacity : 0.4
                            });
                        }
                    }
                });
            });

            Log.debug(`[GeoLeaf.GeoJSON] filterFeatures: ${stats.visible}/${stats.total} features visibles`);
            return stats;
        },

        /**
         * Réinitialise le filtre sur les features (montre tout).
         *
         * @param {Object} [options] - Mêmes options que filterFeatures
         */
        clearFeatureFilter(options = {}) {
            return this.filterFeatures(() => true, options);
        },

        /**
         * Retourne toutes les features chargées.
         * @param {Object} [options]
         * @returns {Array<Object>} features GeoJSON enrichies de { _layerId }
         */
        getFeatures(options = {}) {
            const state = getState();
            if (!state) return [];

            const geometrySet = Array.isArray(options.geometryTypes)
                ? new Set(options.geometryTypes.map(t => t.toLowerCase()))
                : null;
            const layerSet = Array.isArray(options.layerIds) ? new Set(options.layerIds) : null;

            const result = [];
            state.featureCache.forEach((entry, layerId) => {
                if (layerSet && !layerSet.has(layerId)) return;
                const geoType = (entry.geometryType || "").toLowerCase();
                if (geometrySet && !geometrySet.has(geoType)) return;

                (entry.features || []).forEach((f) => {
                    if (f && typeof f === "object") {
                        const clone = Object.assign({}, f, { _layerId: layerId });
                        result.push(clone);
                    }
                });
            });
            return result;
        },

        /**
         * Supprime toutes les entités GeoJSON de la couche legacy.
         */
        clear() {
            const state = getState();
            if (state && state.geoJsonLayer) {
                state.geoJsonLayer.clearLayers();
            }
        },

        // ========================================
        //   MÉTHODES INTERNES EXPOSÉES
        // ========================================

        _updateLayerVisibilityByZoom() {
            const LayerManager = getLayerManager();
            if (LayerManager) LayerManager.updateLayerVisibilityByZoom();
        },

        _registerWithLayerManager() {
            const LayerManager = getLayerManager();
            if (LayerManager) LayerManager.registerWithLayerManager();
        },

        _convertFeatureToPOI(feature, def) {
            const PopupTooltip = getPopupTooltip();
            return PopupTooltip ? PopupTooltip.convertFeatureToPOI(feature, def) : null;
        },

        _getClusteringStrategy(def, geojsonData) {
            const Clustering = getClustering();
            return Clustering
                ? Clustering.getClusteringStrategy(def, geojsonData)
                : { shouldCluster: false, useSharedCluster: false };
        },

        _getSharedPOICluster() {
            const Clustering = getClustering();
            return Clustering ? Clustering.getSharedPOICluster() : null;
        },

        _getPoiConfig() {
            const Clustering = getClustering();
            return Clustering ? Clustering.getPoiConfig() : {};
        },

        _detectLayerType(layer) {
            const LayerManager = getLayerManager();
            return LayerManager ? LayerManager.detectLayerType(layer) : "mixed";
        },

        _buildLeafletOptions(options) {
            const StyleResolver = getStyleResolver();
            return StyleResolver ? StyleResolver.buildLeafletOptions(options) : {};
        }
    };

    // Exposer _StyleRules pour compatibilité avec le module Themes
    // (déjà fait dans style-resolver.js, mais on s'assure que c'est accessible)
    if (!GeoLeaf._StyleRules && getStyleResolver()) {
        GeoLeaf._StyleRules = {
            evaluate: getStyleResolver().evaluateStyleRules,
            operators: getShared() ? getShared().STYLE_OPERATORS : {},
            getNestedValue: getStyleResolver().getNestedValue
        };
    }

    // Expose le module dans l'espace de nom GeoLeaf
    GeoLeaf.GeoJSON = GeoJSONModule;

})(window);
