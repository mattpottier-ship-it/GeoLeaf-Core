/**
 * GeoLeaf GeoJSON Loader - Single Layer
 * Pipeline complet de chargement d'une couche individuelle
 * Sprint 7 : Web Worker fetch+parse + chunked addData via requestIdleCallback
 * Sprint 8 : Vector tiles — early-exit to VectorTiles module when configured
 *
 * @module geojson/loader/single-layer
 */

import { GeoJSONShared } from '../shared.js';
import { getLog } from '../../utils/general-utils.js';

const _g: any = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {} as Window);

const getState = () => GeoJSONShared.state;
const getVectorTiles = () => (_g as any).GeoLeaf && (_g as any).GeoLeaf._VectorTiles;

function _styleNeedsPostProcess(styleData: Record<string, unknown> | null | undefined): boolean {
    if (!styleData) return false;
    const defStyle = (styleData.defaultStyle || styleData.style || {}) as Record<string, unknown>;
    if (defStyle.hatch && (defStyle.hatch as any).enabled) return true;
    if (defStyle.casing && (defStyle.casing as any).enabled) return true;
    const rules = Array.isArray(styleData.styleRules) ? styleData.styleRules : [];
    for (const rule of rules) {
        const s = ((rule as any).style || {}) as Record<string, unknown>;
        if (s.hatch && (s.hatch as any).enabled) return true;
        if (s.casing && (s.casing as any).enabled) return true;
    }
    return false;
}

const CHUNK_ADD_SIZE = 200;

function _addFeaturesChunked(
    leafletLayer: { addData: (data: { type: string; features: unknown[] }) => void },
    features: unknown[],
    chunkSize?: number
): Promise<void> {
    chunkSize = chunkSize || CHUNK_ADD_SIZE;
    const total = features.length;
    if (total <= chunkSize) {
        leafletLayer.addData({ type: "FeatureCollection", features });
        return Promise.resolve();
    }
    const Log = getLog();
    const _ric = typeof requestIdleCallback === "function" ? requestIdleCallback : (cb: () => void) => setTimeout(cb, 4);
    return new Promise((resolve) => {
        let offset = 0;
        function processChunk() {
            const end = Math.min(offset + chunkSize!, total);
            const slice = features.slice(offset, end);
            leafletLayer.addData({ type: "FeatureCollection", features: slice });
            offset = end;
            if (offset < total) _ric(processChunk);
            else {
                Log.debug("[GeoLeaf.GeoJSON] Chunked addData terminé :", total, "features");
                resolve();
            }
        }
        _ric(processChunk);
    });
}

interface DefLike extends Record<string, unknown> {
    url?: string;
    type?: string;
    zIndex?: number;
    clusterRadius?: number;
    disableClusteringAtZoom?: number;
    clustering?: Record<string, unknown>;
    _profileId?: string;
    _layerDirectory?: string;
    _cachedData?: unknown;
    styles?: { default?: unknown };
    style?: Record<string, unknown>;
    styleRules?: unknown[];
    interactiveShape?: boolean;
    geometry?: string;
    geometryType?: string;
    legends?: unknown;
    fitBoundsOnLoad?: boolean;
    maxZoomOnFit?: number;
    labels?: { enabled?: boolean };
    contentLength?: number;
}

const Loader: { _loadSingleLayer: (layerId: string, layerLabel: string, def: DefLike, baseOptions: Record<string, unknown>) => Promise<{ id: string; label: string; featureCount: number }> } = {} as any;

Loader._loadSingleLayer = function (layerId: string, layerLabel: string, def: DefLike, baseOptions: Record<string, unknown>): Promise<{ id: string; label: string; featureCount: number }> {
    const state = getState();
    const Log = getLog();
    const VT = getVectorTiles();
    if (VT && VT.shouldUseVectorTiles(def)) {
        Log.info(`[GeoLeaf.GeoJSON] ⬡ Layer "${layerId}" → vector tiles (Sprint 8)`);
        return VT.loadVectorTileLayer(layerId, layerLabel, def, baseOptions);
    }
    const fromCache = !!def._cachedData;
    const isGpx = def.type === "gpx" || (def.url && String(def.url).endsWith(".gpx"));
    const WorkerMgr = (_g as any).GeoLeaf && (_g as any).GeoLeaf._WorkerManager;
    const useWorker = !fromCache && WorkerMgr && WorkerMgr.isAvailable();
    const dataPromise = fromCache
        ? Promise.resolve(def._cachedData)
        : useWorker
            ? (isGpx ? WorkerMgr.fetchText(def.url!, layerId) : WorkerMgr.fetchGeoJSON(def.url!, layerId))
            : fetch(def.url!).then((response) => {
                if (!response.ok) throw new Error("HTTP " + response.status + " pour " + def.url);
                return isGpx ? response.text() : response.json();
            });

    return dataPromise.then(async (rawData: unknown) => {
        if (fromCache) delete def._cachedData;
        const DataConverter = (_g as any).GeoLeaf && (_g as any).GeoLeaf._DataConverter;
        let geojsonData: { type?: string; features?: unknown[] };
        if (isGpx) {
            geojsonData = typeof rawData === "string" && DataConverter && typeof DataConverter.convertGpxToGeoJSON === "function"
                ? DataConverter.convertGpxToGeoJSON(rawData)
                : { type: "FeatureCollection", features: [] };
        } else {
            geojsonData = DataConverter ? DataConverter.autoConvert(rawData) : (rawData as { type?: string; features?: unknown[] });
        }
        Log.debug("[GeoLeaf.GeoJSON._loadSingleLayer] Données converties", { layerId, type: def.type, features: geojsonData.features ? geojsonData.features.length : 0, source: fromCache ? "cache" : "network" });
        const PaneHelpers = GeoJSONShared.PaneHelpers;
        const PaneConfig = GeoJSONShared.PANE_CONFIG;
        let preloadedStyleData: Record<string, unknown> | null = null;
        if (def.styles && (def.styles as any).default) {
            try {
                preloadedStyleData = await (_g as any).GeoLeaf._GeoJSONLayerConfig.loadDefaultStyle(layerId, def);
                if (preloadedStyleData) {
                    const resolvedDefault = preloadedStyleData.defaultStyle || preloadedStyleData.style;
                    if (resolvedDefault) def.style = Object.assign({}, def.style || {}, resolvedDefault);
                    if (Array.isArray(preloadedStyleData.styleRules) && preloadedStyleData.styleRules.length) def.styleRules = preloadedStyleData.styleRules;
                    Log.debug("[GeoLeaf.GeoJSON] Style pré-chargé pour:", layerId);
                }
            } catch (err) {
                Log.warn("[GeoLeaf.GeoJSON] Échec pré-chargement style pour:", layerId, (err as Error).message);
                if ((_g as any).GeoLeaf?.Notifications && typeof (_g as any).GeoLeaf.Notifications.warning === 'function') {
                    (_g as any).GeoLeaf.Notifications.warning(`Style par défaut introuvable pour « ${layerLabel} ». Affichage avec style neutre.`);
                }
            }
        }
        const layerOptions = (_g as any).GeoLeaf._GeoJSONLayerConfig.buildLayerOptions(def, baseOptions);
        const ph = PaneHelpers as { getPaneName: (z: number) => string; getOrCreatePane?: (z: number, m: unknown) => string };
        layerOptions.pane = ph.getOrCreatePane ? ph.getOrCreatePane(def.zIndex ?? 0, state.map) : ph.getPaneName(def.zIndex ?? 0);
        const isInteractiveShape = def.interactiveShape === true;
        const isPolygonOrLine = def.geometry === 'polygon' || def.geometry === 'polyline' || def.geometry === 'line';
        const needsSvgRenderer = _styleNeedsPostProcess(preloadedStyleData) || (isInteractiveShape && isPolygonOrLine);
        if (needsSvgRenderer && (_g as any).L?.svg) {
            layerOptions.renderer = (_g as any).L.svg({ pane: layerOptions.pane });
        }
        if (isInteractiveShape) layerOptions.interactive = true;
        const features = Array.isArray(geojsonData.features) ? geojsonData.features : [];
        const leafletLayer = (_g as any).L.geoJSON(null, layerOptions);
        const ClusteringModule = (_g as any).GeoLeaf?._GeoJSONClustering;
        const clusterStrategy = ClusteringModule ? ClusteringModule.getClusteringStrategy(def, geojsonData) : { shouldCluster: false, useSharedCluster: false };
        if (def.clustering && typeof def.clustering === 'object') {
            if (typeof def.clusterRadius !== 'number' && typeof (def.clustering as any).maxClusterRadius === 'number') def.clusterRadius = (def.clustering as any).maxClusterRadius;
            if (typeof def.disableClusteringAtZoom !== 'number' && typeof (def.clustering as any).disableClusteringAtZoom === 'number') def.disableClusteringAtZoom = (def.clustering as any).disableClusteringAtZoom;
        }
        const needsAwaitFeatures = clusterStrategy.shouldCluster || _styleNeedsPostProcess(preloadedStyleData);
        if (needsAwaitFeatures) await _addFeaturesChunked(leafletLayer, features, CHUNK_ADD_SIZE);
        else _addFeaturesChunked(leafletLayer, features, CHUNK_ADD_SIZE);
        let clusterGroup: unknown = null;
        let useSharedCluster = false;
        if (clusterStrategy.shouldCluster) {
            if (clusterStrategy.useSharedCluster) {
                Log.info("[GeoLeaf.GeoJSON] 🔄 Tentative récupération cluster POI partagé pour:", layerId);
                let poiCluster = ClusteringModule ? ClusteringModule.getSharedPOICluster() : null;
                if (poiCluster) {
                    clusterGroup = poiCluster;
                    (clusterGroup as any).addLayer(leafletLayer);
                    useSharedCluster = true;
                    Log.info("[GeoLeaf.GeoJSON] ✅ Couche ajoutée au cluster POI partagé (stratégie: unified) :", layerId);
                } else {
                    Log.debug("[GeoLeaf.GeoJSON] Cluster POI non disponible immédiatement, tentative après délai :", layerId);
                    const tempLayerData: Record<string, unknown> = { id: layerId, label: layerLabel, layer: leafletLayer, visible: true, config: def, clusterGroup: null, useSharedCluster: false, pendingSharedCluster: true };
                    state.layers.set(layerId, tempLayerData);
                    setTimeout(() => {
                        poiCluster = ClusteringModule ? ClusteringModule.getSharedPOICluster() : null;
                        if (poiCluster) {
                            (poiCluster as any).addLayer(leafletLayer);
                            tempLayerData.clusterGroup = poiCluster;
                            tempLayerData.useSharedCluster = true;
                            tempLayerData.pendingSharedCluster = false;
                        } else {
                            Log.warn("[GeoLeaf.GeoJSON] Cluster POI toujours non disponible, création cluster indépendant :", layerId);
                            if ((_g as any).L?.markerClusterGroup) {
                                const independentCluster = (_g as any).L.markerClusterGroup({ maxClusterRadius: def.clusterRadius || 80, disableClusteringAtZoom: def.disableClusteringAtZoom || 18, animate: false, showCoverageOnHover: false });
                                independentCluster.on('layeradd', function (e: { layer: unknown }) { PaneHelpers.applyPaneToLayer(e.layer as { options?: { pane?: string } }, def.zIndex || 0); });
                                independentCluster.addLayer(leafletLayer);
                                tempLayerData.clusterGroup = independentCluster;
                                tempLayerData.useSharedCluster = false;
                                tempLayerData.pendingSharedCluster = false;
                                if (tempLayerData.visible) (state.map as any).addLayer(independentCluster);
                            }
                        }
                    }, 500);
                    return { id: layerId, label: layerLabel, featureCount: features.length };
                }
            } else {
                if ((_g as any).L?.markerClusterGroup) {
                    clusterGroup = (_g as any).L.markerClusterGroup({ maxClusterRadius: def.clusterRadius || 80, disableClusteringAtZoom: def.disableClusteringAtZoom || 18, animate: false, spiderfyOnMaxZoom: false, showCoverageOnHover: false, zoomToBoundsOnClick: true });
                    (clusterGroup as any).on('layeradd', function (e: { layer: unknown }) { PaneHelpers.applyPaneToLayer(e.layer as { options?: { pane?: string } }, def.zIndex || 0); });
                    (clusterGroup as any).addLayer(leafletLayer);
                    Log.debug("[GeoLeaf.GeoJSON] Couche avec cluster indépendant (stratégie: by-source) :", layerId);
                }
            }
        } else Log.debug("[GeoLeaf.GeoJSON] Couche sans clustering :", layerId);
        const inferredGeometry = (_g as any).GeoLeaf._GeoJSONLayerConfig.inferGeometryType(def, geojsonData);
        let zIndex = def.zIndex;
        if (typeof zIndex !== 'number') {
            const allLayerIds = Array.from(state.layers.keys());
            zIndex = Math.max(PaneConfig.MIN_LAYER_ZINDEX, PaneConfig.MAX_LAYER_ZINDEX - allLayerIds.length);
            Log.debug(`[GeoLeaf.GeoJSON] zIndex auto-assigné pour ${layerId}: ${zIndex}`);
        } else {
            const validatedZIndex = PaneHelpers.validateZIndex(zIndex);
            if (validatedZIndex !== def.zIndex) Log.warn(`[GeoLeaf.GeoJSON] zIndex ${def.zIndex} clamped to ${validatedZIndex} pour ${layerId}`);
            zIndex = validatedZIndex;
        }
        def.zIndex = zIndex;
        const Config = (_g as any).GeoLeaf?.Config;
        const dataCfg = Config?.get ? Config.get('data') : null;
        const profilesBasePath = (dataCfg && (dataCfg as any).profilesBasePath) || "profiles";
        const layerBasePath = `${profilesBasePath}/${def._profileId}/${def._layerDirectory}`;
        const layerData: Record<string, unknown> = {
            id: layerId, label: layerLabel, layer: leafletLayer, visible: true, config: def, clusterGroup, legendsConfig: def.legends, basePath: layerBasePath, useSharedCluster, features, geometryType: def.geometryType || inferredGeometry
        };
        (layerData as any)._visibility = { current: false, logicalState: false, source: 'system', userOverride: false, themeOverride: false, themeDesired: null, zoomConstrained: false };
        state.layers.set(layerId, layerData);
        if ((_g as any).GeoLeaf?.ThemeCache && typeof (_g as any).GeoLeaf.ThemeCache.store === 'function') {
            (_g as any).GeoLeaf.ThemeCache.store(layerId, def._profileId || ((_g as any).GeoLeaf.Config?.getActiveProfileId?.() ?? null), geojsonData, { contentLength: def.contentLength });
        }
        if ((_g as any).GeoLeaf?._GeoJSONLayerManager) (_g as any).GeoLeaf._GeoJSONLayerManager.updateLayerVisibilityByZoom();
        layerData.visible = false;
        const shouldFitBounds = def.fitBoundsOnLoad && !(_g as any).GeoLeaf?.ThemeSelector;
        if (shouldFitBounds && leafletLayer.getBounds().isValid()) {
            const fitOptions: { maxZoom?: number } = {};
            if (typeof def.maxZoomOnFit === "number") fitOptions.maxZoom = def.maxZoomOnFit;
            (state.map as any).fitBounds(leafletLayer.getBounds(), fitOptions);
        }
        if (preloadedStyleData) {
            const layerDataForStyle = state.layers.get(layerId);
            if (layerDataForStyle) (layerDataForStyle as any).currentStyle = preloadedStyleData;
            if (_styleNeedsPostProcess(preloadedStyleData) && (_g as any).GeoLeaf?._GeoJSONLayerManager) {
                Log.debug("[GeoLeaf.GeoJSON] Post-process setLayerStyle (hatch/casing) pour:", layerId);
                (_g as any).GeoLeaf._GeoJSONLayerManager.setLayerStyle(layerId, preloadedStyleData);
            }
            if ((_g as any).GeoLeaf?.Labels && typeof (_g as any).GeoLeaf.Labels.initializeLayerLabels === 'function') (_g as any).GeoLeaf.Labels.initializeLayerLabels(layerId);
            if ((_g as any).GeoLeaf?._LabelButtonManager) (_g as any).GeoLeaf._LabelButtonManager.syncImmediate(layerId);
        } else {
            if (def.labels && (def.labels as any).enabled && (_g as any).GeoLeaf?.Labels && typeof (_g as any).GeoLeaf.Labels.initializeLayerLabels === 'function') (_g as any).GeoLeaf.Labels.initializeLayerLabels(layerId);
            if ((_g as any).GeoLeaf?._LabelButtonManager) (_g as any).GeoLeaf._LabelButtonManager.syncImmediate(layerId);
        }
        Log.debug("[GeoLeaf.GeoJSON] Couche chargée avec succès :", layerId, "(" + features.length + " features)");
        return { id: layerId, label: layerLabel, featureCount: features.length };
    });
};

export { Loader as LoaderSingleLayer };
