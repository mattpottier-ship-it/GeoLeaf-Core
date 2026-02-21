/**
 * GeoLeaf GeoJSON Loader - Single Layer
 * Pipeline complet de chargement d'une couche individuelle
 *
 * Sprint 7 : Web Worker fetch+parse + chunked addData via requestIdleCallback
 * Sprint 8 : Vector tiles — early-exit to VectorTiles module when configured
 *
 * @module geojson/loader/single-layer
 */
"use strict";

import { GeoJSONShared } from '../shared.js';
import { getLog } from '../../utils/general-utils.js';

const _g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

const getState = () => GeoJSONShared.state;
const getVectorTiles = () => _g.GeoLeaf && _g.GeoLeaf._VectorTiles;

/**
 * Détermine si un style chargé nécessite un post-processing via setLayerStyle
 * (hatch patterns ou casing). Les styles simples (couleurs, opacités) sont
 * déjà injectés dans buildLayerOptions et ne nécessitent pas de passe supplémentaire.
 *
 * @param {Object} styleData - Données de style JSON chargées
 * @returns {boolean} true si setLayerStyle est nécessaire
 * @private
 */
function _styleNeedsPostProcess(styleData) {
    if (!styleData) return false;

    // Check default style for hatch
    const defStyle = styleData.defaultStyle || styleData.style || {};
    if (defStyle.hatch && defStyle.hatch.enabled) return true;
    if (defStyle.casing && defStyle.casing.enabled) return true;

    // Check styleRules for hatch/casing
    const rules = Array.isArray(styleData.styleRules) ? styleData.styleRules : [];
    for (const rule of rules) {
        const s = rule.style || {};
        if (s.hatch && s.hatch.enabled) return true;
        if (s.casing && s.casing.enabled) return true;
    }

    return false;
}

const Loader = {};

/** Nombre de features injectées par tick idle */
const CHUNK_ADD_SIZE = 200;

/**
 * Ajoute des features à un layer Leaflet par chunks via requestIdleCallback.
 * Évite de bloquer le thread principal lors de gros jeux de données.
 *
 * @param {L.GeoJSON} leafletLayer - Layer Leaflet cible (créé vide)
 * @param {Array} features - Tableau des features GeoJSON
 * @param {number} [chunkSize=200] - Nombre de features par tick
 * @returns {Promise<void>} Résolu quand toutes les features sont ajoutées
 * @private
 */
function _addFeaturesChunked(leafletLayer, features, chunkSize) {
    chunkSize = chunkSize || CHUNK_ADD_SIZE;
    var total = features.length;

    // Petit jeu de données → ajout direct (pas de surcoût scheduling)
    if (total <= chunkSize) {
        leafletLayer.addData({ type: "FeatureCollection", features: features });
        return Promise.resolve();
    }

    var Log = getLog();
    var _ric = typeof requestIdleCallback === "function"
        ? requestIdleCallback
        : function (cb) { return setTimeout(cb, 4); };

    return new Promise(function (resolve) {
        var offset = 0;

        function processChunk() {
            var end = Math.min(offset + chunkSize, total);
            var slice = features.slice(offset, end);

            leafletLayer.addData({ type: "FeatureCollection", features: slice });
            offset = end;

            if (offset < total) {
                _ric(processChunk);
            } else {
                Log.debug("[GeoLeaf.GeoJSON] Chunked addData terminé :", total, "features");
                resolve();
            }
        }

        _ric(processChunk);
    });
}

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
Loader._loadSingleLayer = function (layerId, layerLabel, def, baseOptions) {
    const state = getState();
    const Log = getLog();

    // ── Sprint 8: Vector tiles — early-exit ──────────────────────
    // If the layer has a vectorTiles config AND VectorGrid is available,
    // delegate entirely to the VT module (no GeoJSON fetch/parse).
    const VT = getVectorTiles();
    if (VT && VT.shouldUseVectorTiles(def)) {
        Log.info(`[GeoLeaf.GeoJSON] ⬡ Layer "${layerId}" → vector tiles (Sprint 8)`);
        return VT.loadVectorTileLayer(layerId, layerLabel, def, baseOptions);
    }

    const fromCache = !!def._cachedData;
    const isGpx = def.type === "gpx" || (def.url && def.url.endsWith(".gpx"));

    // Sprint 7 : utiliser le Web Worker pour le fetch+parse JSON (pas cache)
    // Perf 6.3.1: étendre le Worker au fetch GPX text (parse DOMParser reste main thread)
    const WorkerMgr = _g.GeoLeaf && _g.GeoLeaf._WorkerManager;
    const useWorker = !fromCache && WorkerMgr && WorkerMgr.isAvailable();

    const dataPromise = fromCache
        ? Promise.resolve(def._cachedData)
        : useWorker
            ? (isGpx
                ? WorkerMgr.fetchText(def.url, layerId)
                : WorkerMgr.fetchGeoJSON(def.url, layerId))
            : fetch(def.url).then((response) => {
                if (!response.ok) {
                    throw new Error("HTTP " + response.status + " pour " + def.url);
                }

                if (isGpx) {
                    return response.text();
                }

                return response.json();
            });

    return dataPromise
        .then(async (rawData) => {
            if (fromCache) {
                delete def._cachedData;
            }

            const DataConverter = _g.GeoLeaf && _g.GeoLeaf._DataConverter;
            let geojsonData;

            if (isGpx) {
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

            const PaneHelpers = GeoJSONShared.PaneHelpers;
            const PaneConfig = GeoJSONShared.PANE_CONFIG;

            // ── Style pre-loading: charger le JSON AVANT de créer le layer ──
            let preloadedStyleData = null;
            if (def.styles && def.styles.default) {
                try {
                    preloadedStyleData = await _g.GeoLeaf._GeoJSONLayerConfig.loadDefaultStyle(layerId, def);
                    if (preloadedStyleData) {
                        // Injecter le style résolu dans def pour que buildLayerOptions l'utilise
                        const resolvedDefault = preloadedStyleData.defaultStyle || preloadedStyleData.style;
                        if (resolvedDefault) {
                            def.style = Object.assign({}, def.style || {}, resolvedDefault);
                        }
                        if (Array.isArray(preloadedStyleData.styleRules) && preloadedStyleData.styleRules.length) {
                            def.styleRules = preloadedStyleData.styleRules;
                        }
                        Log.debug("[GeoLeaf.GeoJSON] Style pré-chargé pour:", layerId);
                    }
                } catch (err) {
                    Log.warn("[GeoLeaf.GeoJSON] Échec pré-chargement style pour:", layerId, err.message);
                    // Notification toast si le système est disponible
                    if (_g.GeoLeaf && _g.GeoLeaf.Notifications && typeof _g.GeoLeaf.Notifications.warning === 'function') {
                        _g.GeoLeaf.Notifications.warning(
                            `Style par défaut introuvable pour « ${layerLabel} ». Affichage avec style neutre.`
                        );
                    }
                }
            }

            const layerOptions = _g.GeoLeaf._GeoJSONLayerConfig.buildLayerOptions(def, baseOptions);
            // Use lazy pane factory if available, fallback to getPaneName
            layerOptions.pane = PaneHelpers.getOrCreatePane
                ? PaneHelpers.getOrCreatePane(def.zIndex, state.map)
                : PaneHelpers.getPaneName(def.zIndex);

            // ── NE PAS appeler enablePaneInteraction ici ──────────────────
            // Mettre pointer-events: auto sur le pane <div> est DESTRUCTIF :
            // le <div> couvre tout le viewport et intercepte TOUS les clics,
            // bloquant les panes à z-index inférieur. Avec les panes par couche,
            // plusieurs panes interactifs se superposent (ex: z454 au-dessus de
            // z453), et pointer-events: auto sur z454 empêche tout clic sur z453.
            //
            // Tous les panes restent à pointer-events: none. L'interactivité
            // est gérée au niveau des éléments enfants :
            //  - SVG <path> : Leaflet CSS `.leaflet-pane > svg path.leaflet-interactive`
            //    donne pointer-events: auto (fonctionne malgré le parent none)
            //  - Markers <div> : Leaflet CSS `.leaflet-marker-icon.leaflet-interactive`
            //    donne pointer-events: auto
            //  - Canvas : les couches non-interactives restent muettes (voulu)

            // ── Choix du renderer : SVG vs Canvas ──────────────────────────
            // Avec preferCanvas: true (défaut Sprint 7), Leaflet crée un <canvas>
            // par pane. Contrairement aux éléments SVG <path> (qui ne captent les
            // clics que sur leur tracé réel), un <canvas> est un rectangle opaque
            // pour les événements DOM : il intercepte TOUS les clics dans ses
            // limites, même sur les zones transparentes. Résultat : les panes
            // Canvas superposés plus haut en z-index bloquent les clics vers les
            // couches interactives en-dessous.
            //
            // Solution : forcer L.svg() pour toute couche interactive polygon/
            // polyline (pas les points, qui utilisent le markerPane ou les
            // clusters). Cela garantit que chaque polygone interactif est un
            // <path> SVG avec son propre pointer-events, tandis que les couches
            // non-interactives restent en Canvas pour la performance.
            const isInteractiveShape = def.interactiveShape === true;
            const isPolygonOrLine = def.geometry === 'polygon' || def.geometry === 'polyline' || def.geometry === 'line';
            const needsSvgRenderer = _styleNeedsPostProcess(preloadedStyleData) || (isInteractiveShape && isPolygonOrLine);

            if (needsSvgRenderer && _g.L && _g.L.svg) {
                layerOptions.renderer = _g.L.svg({ pane: layerOptions.pane });
                if (_styleNeedsPostProcess(preloadedStyleData)) {
                    Log.debug("[GeoLeaf.GeoJSON] SVG renderer forcé (hatch/casing) pour:", layerId);
                } else {
                    Log.debug("[GeoLeaf.GeoJSON] SVG renderer forcé (interactive polygon/line + preferCanvas) pour:", layerId);
                }
            }

            // ── Propager interactive au niveau du FeatureGroup L.geoJSON ──
            // Le style() callback définit interactive par feature, mais le
            // FeatureGroup parent doit aussi être marqué interactive pour que
            // Leaflet enregistre les event handlers sur le renderer.
            if (isInteractiveShape) {
                layerOptions.interactive = true;
            }

            // Sprint 7 : créer le layer vide puis injecter les features par chunks
            const features = Array.isArray(geojsonData.features) ? geojsonData.features : [];
            const leafletLayer = _g.L.geoJSON(null, layerOptions);

            // Déterminer la stratégie de clustering AVANT d'ajouter les features
            // pour savoir si on doit attendre la fin de l'injection (cas cluster).
            const ClusteringModule = _g.GeoLeaf && _g.GeoLeaf._GeoJSONClustering;
            const clusterStrategy = ClusteringModule
                ? ClusteringModule.getClusteringStrategy(def, geojsonData)
                : { shouldCluster: false, useSharedCluster: false };

            // Normaliser les paramètres de clustering depuis l'objet clustering si présents
            // (le thème applier ne fait pas cette normalisation contrairement à profile.js)
            if (def.clustering && typeof def.clustering === 'object') {
                if (typeof def.clusterRadius !== 'number' && typeof def.clustering.maxClusterRadius === 'number') {
                    def.clusterRadius = def.clustering.maxClusterRadius;
                }
                if (typeof def.disableClusteringAtZoom !== 'number' && typeof def.clustering.disableClusteringAtZoom === 'number') {
                    def.disableClusteringAtZoom = def.clustering.disableClusteringAtZoom;
                }
            }

            // Sprint 7+8 : addData chunked — ATTENDRE la fin si clustering actif
            // ou si le style nécessite un post-processing (hatch/casing).
            // MarkerClusterGroup.addLayer(featureGroup) prend un instantané des enfants ;
            // les features ajoutées après ne sont PAS visibles dans le cluster.
            // Pour hatch/casing, setLayerStyle doit itérer TOUTES les features
            // pour attacher les listeners 'add' → il faut que les features soient présentes.
            const needsAwaitFeatures = clusterStrategy.shouldCluster || _styleNeedsPostProcess(preloadedStyleData);
            if (needsAwaitFeatures) {
                await _addFeaturesChunked(leafletLayer, features, CHUNK_ADD_SIZE);
            } else {
                // Sans clustering ni hatch, on peut continuer sans attendre — Leaflet affiche
                // les features au fur et à mesure lorsque la couche est déjà sur la map.
                _addFeaturesChunked(leafletLayer, features, CHUNK_ADD_SIZE);
            }

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
                                if (_g.L && _g.L.markerClusterGroup) {
                                    const independentCluster = _g.L.markerClusterGroup({
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
                            featureCount: features.length
                        };
                    }
                } else {
                    // Créer un cluster indépendant (by-source)
                    if (_g.L && _g.L.markerClusterGroup) {
                        clusterGroup = _g.L.markerClusterGroup({
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
            const inferredGeometry = _g.GeoLeaf._GeoJSONLayerConfig.inferGeometryType(def, geojsonData);

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

            const Config = _g.GeoLeaf && _g.GeoLeaf.Config;
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
                // geojson raw data removed (Sprint 1) — saves ~243 MB on large profiles
                features: features,
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

            // featureCache removed (Sprint 1) — UI reads features directly from state.layers

            // Mettre en cache les données GeoJSON pour les chargements suivants
            if (_g.GeoLeaf && _g.GeoLeaf.ThemeCache && typeof _g.GeoLeaf.ThemeCache.store === 'function') {
                const profileId = def._profileId || (_g.GeoLeaf.Config && _g.GeoLeaf.Config.getActiveProfileId ? _g.GeoLeaf.Config.getActiveProfileId() : null);
                _g.GeoLeaf.ThemeCache.store(layerId, profileId, geojsonData, { contentLength: def.contentLength });
            }

            // Appliquer immédiatement les seuils de zoom pour cette couche
            if (_g.GeoLeaf && _g.GeoLeaf._GeoJSONLayerManager) {
                _g.GeoLeaf._GeoJSONLayerManager.updateLayerVisibilityByZoom();
            }

            // NE PAS ajouter automatiquement à la carte au chargement
            // Les thèmes contrôleront la visibilité des couches
            layerData.visible = false;

            // FitBounds UNIQUEMENT si pas de système de thèmes
            const shouldFitBounds = def.fitBoundsOnLoad && !(_g.GeoLeaf && _g.GeoLeaf.ThemeSelector);
            if (shouldFitBounds && leafletLayer.getBounds().isValid()) {
                const fitOptions = {};
                if (typeof def.maxZoomOnFit === "number") {
                    fitOptions.maxZoom = def.maxZoomOnFit;
                }
                state.map.fitBounds(leafletLayer.getBounds(), fitOptions);
            }

            // ── Post-processing: appliquer setLayerStyle uniquement si hatch/casing ──
            if (preloadedStyleData) {
                // Stocker currentStyle dans layerData pour les labels
                const layerDataForStyle = state.layers.get(layerId);
                if (layerDataForStyle) {
                    layerDataForStyle.currentStyle = preloadedStyleData;
                }

                const needsPostProcess = _styleNeedsPostProcess(preloadedStyleData);
                if (needsPostProcess && _g.GeoLeaf && _g.GeoLeaf._GeoJSONLayerManager) {
                    Log.debug("[GeoLeaf.GeoJSON] Post-process setLayerStyle (hatch/casing) pour:", layerId);
                    _g.GeoLeaf._GeoJSONLayerManager.setLayerStyle(layerId, preloadedStyleData);
                } else {
                    Log.debug("[GeoLeaf.GeoJSON] Style simple pré-injecté, setLayerStyle ignoré pour:", layerId);
                }

                // Initialiser les labels selon le style
                if (_g.GeoLeaf && _g.GeoLeaf.Labels && typeof _g.GeoLeaf.Labels.initializeLayerLabels === 'function') {
                    _g.GeoLeaf.Labels.initializeLayerLabels(layerId);
                }

                // Synchroniser le bouton de label
                if (_g.GeoLeaf && _g.GeoLeaf._LabelButtonManager) {
                    _g.GeoLeaf._LabelButtonManager.syncImmediate(layerId);
                }
            } else {
                // Pas de style par défaut: initialiser les labels depuis la config legacy si présents
                if (def.labels && def.labels.enabled && _g.GeoLeaf && _g.GeoLeaf.Labels && typeof _g.GeoLeaf.Labels.initializeLayerLabels === 'function') {
                    _g.GeoLeaf.Labels.initializeLayerLabels(layerId);
                }

                // Synchroniser le bouton de label
                if (_g.GeoLeaf && _g.GeoLeaf._LabelButtonManager) {
                    _g.GeoLeaf._LabelButtonManager.syncImmediate(layerId);
                }
            }
            Log.debug("[GeoLeaf.GeoJSON] Couche chargée avec succès :", layerId, "(" + features.length + " features)");

            return {
                id: layerId,
                label: layerLabel,
                featureCount: features.length
            };
        });
};

export { Loader as LoaderSingleLayer };
