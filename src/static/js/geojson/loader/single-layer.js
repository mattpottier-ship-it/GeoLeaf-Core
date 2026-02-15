/**
 * GeoLeaf GeoJSON Loader - Single Layer
 * Pipeline complet de chargement d'une couche individuelle
 *
 * @module geojson/loader/single-layer
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Dépendances lazy
    const getState = () => GeoLeaf._GeoJSONShared.state;
    const getLog = () => (GeoLeaf.Log || console);

    GeoLeaf._GeoJSONLoader = GeoLeaf._GeoJSONLoader || {};

    /**
     * Charge une couche GeoJSON individuelle.
     *
     * @param {string} layerId - ID unique de la couche
     * @param {string} layerLabel - Libellé de la couche
     * @param {Object} def - Définition de la couche depuis le profil
     * @param {Object} baseOptions - Options de base
     * @returns {Promise<Object>} - Métadonnées de la couche chargée
     * @private
     */
    GeoLeaf._GeoJSONLoader._loadSingleLayer = function (layerId, layerLabel, def, baseOptions) {
        const state = getState();
        const Log = getLog();

        const fromCache = !!def._cachedData;
        const dataPromise = fromCache
            ? Promise.resolve(def._cachedData)
            : fetch(def.url).then((response) => {
                if (!response.ok) {
                    throw new Error("HTTP " + response.status + " pour " + def.url);
                }

                if (def.type === "gpx" || def.url.endsWith(".gpx")) {
                    return response.text();
                }

                return response.json();
            });

        return dataPromise
            .then((rawData) => {
                if (fromCache) {
                    delete def._cachedData;
                }

                const DataConverter = GeoLeaf._DataConverter;
                let geojsonData;

                if (def.type === "gpx" || def.url.endsWith(".gpx")) {
                    if (typeof rawData === "string") {
                        geojsonData = DataConverter && typeof DataConverter.convertGpxToGeoJSON === "function"
                            ? DataConverter.convertGpxToGeoJSON(rawData)
                            : { type: "FeatureCollection", features: [] };
                    } else {
                        Log.warn("[GeoLeaf.GeoJSON._loadSingleLayer] GPX n'est pas un string", layerId);
                        geojsonData = { type: "FeatureCollection", features: [] };
                    }
                } else {
                    geojsonData = DataConverter ? DataConverter.autoConvert(rawData) : rawData;
                }

                Log.debug("[GeoLeaf.GeoJSON._loadSingleLayer] Données converties", {
                    layerId: layerId,
                    type: def.type,
                    features: geojsonData.features ? geojsonData.features.length : 0,
                    source: fromCache ? "cache" : "network"
                });

                const PaneHelpers = GeoLeaf._GeoJSONShared.PaneHelpers;
                const PaneConfig = GeoLeaf._GeoJSONShared.PANE_CONFIG;

                const layerOptions = GeoLeaf._GeoJSONLoader._buildLayerOptions(def, baseOptions);
                layerOptions.pane = PaneHelpers.getPaneName(def.zIndex);
                const leafletLayer = global.L.geoJSON(geojsonData, layerOptions);

                // Déterminer la stratégie de clustering
                const ClusteringModule = GeoLeaf._GeoJSONClustering;
                const clusterStrategy = ClusteringModule
                    ? ClusteringModule.getClusteringStrategy(def, geojsonData)
                    : { shouldCluster: false, useSharedCluster: false };

                let clusterGroup = null;
                let useSharedCluster = false;

                if (clusterStrategy.shouldCluster) {
                    if (clusterStrategy.useSharedCluster) {
                        // Utiliser le cluster POI partagé
                        Log.info("[GeoLeaf.GeoJSON] 🔄 Tentative récupération cluster POI partagé pour:", layerId);
                        let poiCluster = ClusteringModule ? ClusteringModule.getSharedPOICluster() : null;

                        if (poiCluster) {
                            clusterGroup = poiCluster;
                            clusterGroup.addLayer(leafletLayer);
                            useSharedCluster = true;
                            Log.info("[GeoLeaf.GeoJSON] ✅ Couche ajoutée au cluster POI partagé (stratégie: unified) :", layerId);
                        } else {
                            // Le cluster POI n'est pas encore créé, attendre un peu et réessayer
                            Log.debug("[GeoLeaf.GeoJSON] Cluster POI non disponible immédiatement, tentative après délai :", layerId);

                            // Stocker temporairement sans cluster
                            const tempLayerData = {
                                id: layerId,
                                label: layerLabel,
                                layer: leafletLayer,
                                visible: true,
                                config: def,
                                clusterGroup: null,
                                useSharedCluster: false,
                                pendingSharedCluster: true
                            };

                            state.layers.set(layerId, tempLayerData);

                            // Réessayer après un court délai
                            setTimeout(() => {
                                poiCluster = ClusteringModule ? ClusteringModule.getSharedPOICluster() : null;

                                if (poiCluster) {
                                    poiCluster.addLayer(leafletLayer);
                                    tempLayerData.clusterGroup = poiCluster;
                                    tempLayerData.useSharedCluster = true;
                                    tempLayerData.pendingSharedCluster = false;
                                    Log.debug("[GeoLeaf.GeoJSON] Couche ajoutée au cluster POI partagé (après délai) :", layerId);
                                } else {
                                    Log.warn("[GeoLeaf.GeoJSON] Cluster POI toujours non disponible, création cluster indépendant :", layerId);
                                    if (global.L.markerClusterGroup) {
                                        const independentCluster = global.L.markerClusterGroup({
                                            maxClusterRadius: def.clusterRadius || 80,
                                            disableClusteringAtZoom: def.disableClusteringAtZoom || 18,
                                            animate: false,
                                            showCoverageOnHover: false
                                        });

                                        // Forcer le pane sur tous les markers du cluster
                                        independentCluster.on('layeradd', function(e) {
                                            PaneHelpers.applyPaneToLayer(e.layer, def.zIndex || 0);
                                        });

                                        independentCluster.addLayer(leafletLayer);
                                        tempLayerData.clusterGroup = independentCluster;
                                        tempLayerData.useSharedCluster = false;
                                        tempLayerData.pendingSharedCluster = false;

                                        if (tempLayerData.visible) {
                                            state.map.addLayer(independentCluster);
                                        }
                                    }
                                }
                            }, 500);

                            return {
                                id: layerId,
                                label: layerLabel,
                                featureCount: leafletLayer.getLayers().length
                            };
                        }
                    } else {
                        // Créer un cluster indépendant (by-source)
                        if (global.L.markerClusterGroup) {
                            clusterGroup = global.L.markerClusterGroup({
                                maxClusterRadius: def.clusterRadius || 80,
                                disableClusteringAtZoom: def.disableClusteringAtZoom || 18,
                                animate: false,
                                spiderfyOnMaxZoom: false,
                                showCoverageOnHover: false,
                                zoomToBoundsOnClick: true
                            });

                            // Forcer le pane sur tous les markers du cluster
                            const paneName = PaneHelpers.getPaneName(def.zIndex);
                            clusterGroup.on('layeradd', function(e) {
                                PaneHelpers.applyPaneToLayer(e.layer, def.zIndex || 0);
                            });

                            clusterGroup.addLayer(leafletLayer);
                            Log.debug("[GeoLeaf.GeoJSON] Couche avec cluster indépendant (stratégie: by-source) :", layerId);
                        }
                    }
                } else {
                    Log.debug("[GeoLeaf.GeoJSON] Couche sans clustering :", layerId);
                }

                // Stocker la couche
                const inferredGeometry = GeoLeaf._GeoJSONLoader._inferGeometryType(def, geojsonData);

                // Calculer le zIndex si non défini
                let zIndex = def.zIndex;
                if (typeof zIndex !== 'number') {
                    // Calculer automatiquement basé sur l'ordre d'apparition
                    const allLayerIds = Array.from(state.layers.keys());
                    zIndex = Math.max(PaneConfig.MIN_LAYER_ZINDEX, PaneConfig.MAX_LAYER_ZINDEX - allLayerIds.length);
                    Log.debug(`[GeoLeaf.GeoJSON] zIndex auto-assigné pour ${layerId}: ${zIndex}`);
                } else {
                    // Validation et clamping 0-99
                    const validatedZIndex = PaneHelpers.validateZIndex(zIndex);
                    if (validatedZIndex !== def.zIndex) {
                        Log.warn(`[GeoLeaf.GeoJSON] zIndex ${def.zIndex} clamped to ${validatedZIndex} pour ${layerId}`);
                    }
                    zIndex = validatedZIndex;
                }
                def.zIndex = zIndex;

                const Config = GeoLeaf.Config;
                const dataCfg = Config && Config.get ? Config.get('data') : null;
                const profilesBasePath = (dataCfg && dataCfg.profilesBasePath) || "profiles";
                const layerBasePath = `${profilesBasePath}/${def._profileId}/${def._layerDirectory}`;

                const layerData = {
                    id: layerId,
                    label: layerLabel,
                    layer: leafletLayer,
                    visible: true,
                    config: def,
                    clusterGroup: clusterGroup,
                    legendsConfig: def.legends,
                    basePath: layerBasePath,
                    useSharedCluster: useSharedCluster,
                    geojson: geojsonData,
                    features: Array.isArray(geojsonData.features) ? geojsonData.features : [],
                    geometryType: def.geometryType || inferredGeometry
                };

                // Initialiser les métadonnées de visibilité AVANT d'ajouter à la map
                layerData._visibility = {
                    current: false,
                    logicalState: false,
                    source: 'system',
                    userOverride: false,
                    themeOverride: false,
                    themeDesired: null,
                    zoomConstrained: false
                };

                state.layers.set(layerId, layerData);

                // Mettre en cache pour l'UI (filtre, recherche)
                state.featureCache.set(layerId, {
                    features: layerData.features,
                    geometryType: layerData.geometryType
                });

                // Mettre en cache les données GeoJSON pour les chargements suivants
                if (GeoLeaf.ThemeCache && typeof GeoLeaf.ThemeCache.store === 'function') {
                    const profileId = def._profileId || (GeoLeaf.Config && GeoLeaf.Config.getActiveProfileId ? GeoLeaf.Config.getActiveProfileId() : null);
                    GeoLeaf.ThemeCache.store(layerId, profileId, geojsonData, { contentLength: def.contentLength });
                }

                // Appliquer immédiatement les seuils de zoom pour cette couche
                if (GeoLeaf._GeoJSONLayerManager) {
                    GeoLeaf._GeoJSONLayerManager.updateLayerVisibilityByZoom();
                }

                // NE PAS ajouter automatiquement à la carte au chargement
                // Les thèmes contrôleront la visibilité des couches
                layerData.visible = false;

                // FitBounds UNIQUEMENT si pas de système de thèmes
                const shouldFitBounds = def.fitBoundsOnLoad && !GeoLeaf.ThemeSelector;
                if (shouldFitBounds && leafletLayer.getBounds().isValid()) {
                    const fitOptions = {};
                    if (typeof def.maxZoomOnFit === "number") {
                        fitOptions.maxZoom = def.maxZoomOnFit;
                    }
                    state.map.fitBounds(leafletLayer.getBounds(), fitOptions);
                }

                // Charger le style par défaut si styles.default est défini
                if (def.styles && def.styles.default) {
                    GeoLeaf._GeoJSONLoader._loadDefaultStyle(layerId, def)
                        .then((styleData) => {
                            if (styleData && GeoLeaf._GeoJSONLayerManager) {
                                Log.debug("[GeoLeaf.GeoJSON] Application du style par défaut pour:", layerId);

                                // Stocker currentStyle dans layerData pour les labels
                                const layerDataForStyle = state.layers.get(layerId);
                                if (layerDataForStyle) {
                                    layerDataForStyle.currentStyle = styleData;
                                    Log.debug("[GeoLeaf.GeoJSON] currentStyle stocké pour:", layerId);
                                }

                                GeoLeaf._GeoJSONLayerManager.setLayerStyle(layerId, styleData);

                                // Initialiser les labels selon le style
                                if (GeoLeaf.Labels && typeof GeoLeaf.Labels.initializeLayerLabels === 'function') {
                                    GeoLeaf.Labels.initializeLayerLabels(layerId);
                                }

                                // Synchroniser le bouton de label maintenant que currentStyle est défini
                                if (GeoLeaf._LabelButtonManager) {
                                    GeoLeaf._LabelButtonManager.syncImmediate(layerId);
                                }
                            }
                        })
                        .catch((err) => {
                            Log.warn("[GeoLeaf.GeoJSON] Erreur chargement style par défaut:", layerId, err.message);
                        });
                } else {
                    // Pas de style par défaut: initialiser les labels depuis la config legacy si présents
                    if (def.labels && def.labels.enabled && GeoLeaf.Labels && typeof GeoLeaf.Labels.initializeLayerLabels === 'function') {
                        GeoLeaf.Labels.initializeLayerLabels(layerId);
                    }

                    // Synchroniser le bouton de label
                    if (GeoLeaf._LabelButtonManager) {
                        GeoLeaf._LabelButtonManager.syncImmediate(layerId);
                    }
                }
                Log.debug("[GeoLeaf.GeoJSON] Couche chargée avec succès :", layerId, "(" + leafletLayer.getLayers().length + " features)");

                return {
                    id: layerId,
                    label: layerLabel,
                    featureCount: leafletLayer.getLayers().length
                };
            });
    };

})(window);
