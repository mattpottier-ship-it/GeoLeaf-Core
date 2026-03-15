/**
 * GeoLeaf GeoJSON Loader - Single Layer
 * Pipeline complete de loading d'a layer individuelle
 * Sprint 7 : Web Worker fetch+parse + chunked addData via requestIdleCallback
 * Sprint 8 : Vector tiles — early-exit to VectorTiles module when configured
 *
 * @module geojson/loader/single-layer
 */

import { GeoJSONShared } from "../shared.js";
import { getLog } from "../../utils/general-utils.js";

const _g: any =
    typeof globalThis !== "undefined"
        ? globalThis
        : typeof window !== "undefined"
          ? window
          : ({} as Window);

const getState = () => GeoJSONShared.state;
const getVectorTiles = () => (_g as any).GeoLeaf && (_g as any).GeoLeaf._VectorTiles;

function _checkStyleDecorations(s: Record<string, unknown>): boolean {
    if (s.hatch && (s.hatch as any).enabled) return true;
    if (s.casing && (s.casing as any).enabled) return true;
    return false;
}

function _styleNeedsPostProcess(styleData: Record<string, unknown> | null | undefined): boolean {
    if (!styleData) return false;
    const defStyle = (styleData.defaultStyle || styleData.style || {}) as Record<string, unknown>;
    if (_checkStyleDecorations(defStyle)) return true;
    const rules = Array.isArray(styleData.styleRules) ? styleData.styleRules : [];
    for (const rule of rules) {
        const s = ((rule as any).style || {}) as Record<string, unknown>;
        if (_checkStyleDecorations(s)) return true;
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
    const _ric =
        typeof requestIdleCallback === "function"
            ? requestIdleCallback
            : (cb: () => void) => setTimeout(cb, 4);
    return new Promise((resolve) => {
        let offset = 0;
        function processChunk() {
            const end = Math.min(offset + chunkSize!, total);
            const slice = features.slice(offset, end);
            leafletLayer.addData({ type: "FeatureCollection", features: slice });
            offset = end;
            if (offset < total) _ric(processChunk);
            else {
                Log.debug("[GeoLeaf.GeoJSON] Chunked addData completed :", total, "features");
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

function _getDataPromise(
    fromCache: boolean,
    isGpx: boolean,
    useWorker: boolean,
    def: DefLike,
    WorkerMgr: any,
    layerId: string
): Promise<unknown> {
    if (fromCache) return Promise.resolve(def._cachedData);
    if (useWorker)
        return isGpx
            ? WorkerMgr.fetchText(def.url!, layerId)
            : WorkerMgr.fetchGeoJSON(def.url!, layerId);
    return fetch(def.url!).then((response) => {
        if (!response.ok) throw new Error("HTTP " + response.status + " pour " + def.url);
        return isGpx ? response.text() : response.json();
    });
}

function _convertRawData(
    rawData: unknown,
    isGpx: boolean,
    DataConverter: any
): { type?: string; features?: unknown[] } {
    if (isGpx) {
        return typeof rawData === "string" &&
            DataConverter &&
            typeof DataConverter.convertGpxToGeoJSON === "function"
            ? DataConverter.convertGpxToGeoJSON(rawData)
            : { type: "FeatureCollection", features: [] };
    }
    return DataConverter
        ? DataConverter.autoConvert(rawData)
        : (rawData as { type?: string; features?: unknown[] });
}

function _notifyStyleFail(layerLabel: string): void {
    if (
        (_g as any).GeoLeaf?.Notifications &&
        typeof (_g as any).GeoLeaf.Notifications.warning === "function"
    ) {
        (_g as any).GeoLeaf.Notifications.warning(
            `Default style not found for \u00ab ${layerLabel} \u00bb. Displaying with neutral style.`
        );
    }
}

function _applyPreloadedStyle(def: DefLike, psd: Record<string, unknown>): void {
    const resolvedDefault = psd.defaultStyle || psd.style;
    if (resolvedDefault) def.style = Object.assign({}, def.style || {}, resolvedDefault);
    if (Array.isArray(psd.styleRules) && (psd.styleRules as unknown[]).length)
        def.styleRules = psd.styleRules as unknown[];
}

async function _preloadStyle(
    def: DefLike,
    layerId: string,
    layerLabel: string,
    Log: any
): Promise<Record<string, unknown> | null> {
    if (!(def.styles && (def.styles as any).default)) return null;
    try {
        const psd = await (_g as any).GeoLeaf._GeoJSONLayerConfig.loadDefaultStyle(layerId, def);
        if (psd) {
            _applyPreloadedStyle(def, psd);
            Log.debug("[GeoLeaf.GeoJSON] Style preloaded for:", layerId);
        }
        return psd as Record<string, unknown> | null;
    } catch (err) {
        Log.warn("[GeoLeaf.GeoJSON] Failed to preload style for:", layerId, (err as Error).message);
        _notifyStyleFail(layerLabel);
        return null;
    }
}

function _getLayerPane(def: DefLike, state: any): string {
    const PaneHelpers = GeoJSONShared.PaneHelpers as {
        getPaneName: (z: number) => string;
        getOrCreatePane?: (z: number, m: unknown) => string;
    };
    const z = (def.zIndex ?? 0) as number;
    return PaneHelpers.getOrCreatePane
        ? PaneHelpers.getOrCreatePane(z, state.map)
        : PaneHelpers.getPaneName(z);
}

function _getNeedsSvgRenderer(def: DefLike, preloadedStyleData: any): boolean {
    const isInteractiveShape = def.interactiveShape === true;
    const isPolygonOrLine =
        def.geometry === "polygon" || def.geometry === "polyline" || def.geometry === "line";
    return _styleNeedsPostProcess(preloadedStyleData) || (isInteractiveShape && isPolygonOrLine);
}

function _setupLayerOptions(
    def: DefLike,
    baseOptions: Record<string, unknown>,
    preloadedStyleData: any,
    state: any
): Record<string, unknown> {
    const layerOptions = (_g as any).GeoLeaf._GeoJSONLayerConfig.buildLayerOptions(
        def,
        baseOptions
    );
    layerOptions.pane = _getLayerPane(def, state);
    if (_getNeedsSvgRenderer(def, preloadedStyleData) && (_g as any).L?.svg) {
        layerOptions.renderer = (_g as any).L.svg({ pane: layerOptions.pane });
    }
    if (def.interactiveShape === true) layerOptions.interactive = true;
    return layerOptions;
}

function _adjustClusterOptions(def: DefLike): void {
    if (!(def.clustering && typeof def.clustering === "object")) return;
    if (
        typeof def.clusterRadius !== "number" &&
        typeof (def.clustering as any).maxClusterRadius === "number"
    )
        def.clusterRadius = (def.clustering as any).maxClusterRadius;
    if (
        typeof def.disableClusteringAtZoom !== "number" &&
        typeof (def.clustering as any).disableClusteringAtZoom === "number"
    )
        def.disableClusteringAtZoom = (def.clustering as any).disableClusteringAtZoom;
}

function _createClusterGroup(
    def: DefLike,
    leafletLayer: any,
    PaneHelpers: any,
    extraOptions: Record<string, unknown>
): unknown {
    if (!(_g as any).L?.markerClusterGroup) return null;
    const cg = (_g as any).L.markerClusterGroup({
        maxClusterRadius: def.clusterRadius || 80,
        disableClusteringAtZoom: def.disableClusteringAtZoom || 18,
        animate: false,
        showCoverageOnHover: false,
        ...extraOptions,
    });
    (cg as any).on("layeradd", function (e: { layer: unknown }) {
        PaneHelpers.applyPaneToLayer(e.layer as { options?: { pane?: string } }, def.zIndex || 0);
    });
    (cg as any).addLayer(leafletLayer);
    return cg;
}

function _resolveSharedClusterLater(
    leafletLayer: any,
    tempLayerData: Record<string, unknown>,
    def: DefLike,
    layerId: string,
    Log: any,
    PaneHelpers: any,
    ClusteringModule: any,
    state: any
): void {
    const poiCluster = ClusteringModule ? ClusteringModule.getSharedPOICluster() : null;
    if (poiCluster) {
        (poiCluster as any).addLayer(leafletLayer);
        tempLayerData.clusterGroup = poiCluster;
        tempLayerData.useSharedCluster = true;
        tempLayerData.pendingSharedCluster = false;
    } else {
        Log.warn(
            "[GeoLeaf.GeoJSON] POI cluster still not available, creating independent cluster :",
            layerId
        );
        const independentCluster = _createClusterGroup(def, leafletLayer, PaneHelpers, {});
        if (independentCluster) {
            tempLayerData.clusterGroup = independentCluster;
            tempLayerData.useSharedCluster = false;
            tempLayerData.pendingSharedCluster = false;
            if (tempLayerData.visible) (state.map as any).addLayer(independentCluster);
        }
    }
}

function _setupPendingSharedCluster(
    def: DefLike,
    leafletLayer: any,
    layerId: string,
    layerLabel: string,
    features: unknown[],
    state: any,
    Log: any,
    PaneHelpers: any,
    ClusteringModule: any
): { clusterGroup: null; useSharedCluster: false; earlyReturn: unknown } {
    Log.debug(
        "[GeoLeaf.GeoJSON] POI cluster not available immediately, retrying after delay :",
        layerId
    );
    const tempLayerData: Record<string, unknown> = {
        id: layerId,
        label: layerLabel,
        layer: leafletLayer,
        visible: true,
        config: def,
        clusterGroup: null,
        useSharedCluster: false,
        pendingSharedCluster: true,
    };
    state.layers.set(layerId, tempLayerData);
    setTimeout(
        () =>
            _resolveSharedClusterLater(
                leafletLayer,
                tempLayerData,
                def,
                layerId,
                Log,
                PaneHelpers,
                ClusteringModule,
                state
            ),
        500
    );
    return {
        clusterGroup: null,
        useSharedCluster: false,
        earlyReturn: { id: layerId, label: layerLabel, featureCount: features.length },
    };
}

function _handleSharedCluster(
    def: DefLike,
    leafletLayer: any,
    layerId: string,
    layerLabel: string,
    features: unknown[],
    state: any,
    Log: any,
    PaneHelpers: any,
    ClusteringModule: any
): { clusterGroup: unknown; useSharedCluster: boolean; earlyReturn?: unknown } {
    Log.info(
        "[GeoLeaf.GeoJSON] \ud83d\udd04 Attempting to retrieve shared POI cluster for:",
        layerId
    );
    const poiCluster = ClusteringModule ? ClusteringModule.getSharedPOICluster() : null;
    if (poiCluster) {
        (poiCluster as any).addLayer(leafletLayer);
        Log.info(
            "[GeoLeaf.GeoJSON] \u2705 Layer added to shared POI cluster (strategy: unified) :",
            layerId
        );
        return { clusterGroup: poiCluster, useSharedCluster: true };
    }
    return _setupPendingSharedCluster(
        def,
        leafletLayer,
        layerId,
        layerLabel,
        features,
        state,
        Log,
        PaneHelpers,
        ClusteringModule
    );
}

async function _handleClustering(
    def: DefLike,
    leafletLayer: any,
    layerId: string,
    layerLabel: string,
    features: unknown[],
    state: any,
    Log: any,
    PaneHelpers: any,
    geojsonData: any,
    preloadedStyleData: any
): Promise<{ clusterGroup: unknown; useSharedCluster: boolean; earlyReturn?: unknown }> {
    const ClusteringModule = (_g as any).GeoLeaf?._GeoJSONClustering;
    const clusterStrategy = ClusteringModule
        ? ClusteringModule.getClusteringStrategy(def, geojsonData)
        : { shouldCluster: false, useSharedCluster: false };
    _adjustClusterOptions(def);
    const needsAwaitFeatures =
        clusterStrategy.shouldCluster || _styleNeedsPostProcess(preloadedStyleData);
    if (needsAwaitFeatures) await _addFeaturesChunked(leafletLayer, features, CHUNK_ADD_SIZE);
    else _addFeaturesChunked(leafletLayer, features, CHUNK_ADD_SIZE);
    if (!clusterStrategy.shouldCluster) {
        Log.debug("[GeoLeaf.GeoJSON] Layer without clustering :", layerId);
        return { clusterGroup: null, useSharedCluster: false };
    }
    if (clusterStrategy.useSharedCluster) {
        return _handleSharedCluster(
            def,
            leafletLayer,
            layerId,
            layerLabel,
            features,
            state,
            Log,
            PaneHelpers,
            ClusteringModule
        );
    }
    const cg = _createClusterGroup(def, leafletLayer, PaneHelpers, {
        spiderfyOnMaxZoom: false,
        zoomToBoundsOnClick: true,
    });
    if (cg)
        Log.debug(
            "[GeoLeaf.GeoJSON] Layer with independent cluster (strategy: by-source) :",
            layerId
        );
    return { clusterGroup: cg, useSharedCluster: false };
}

function _resolveZIndex(
    def: DefLike,
    state: any,
    PaneConfig: any,
    PaneHelpers: any,
    layerId: string,
    Log: any
): number {
    if (typeof def.zIndex !== "number") {
        const allLayerIds = Array.from(state.layers.keys());
        const z = Math.max(
            PaneConfig.MIN_LAYER_ZINDEX,
            PaneConfig.MAX_LAYER_ZINDEX - allLayerIds.length
        );
        Log.debug(`[GeoLeaf.GeoJSON] zIndex auto-assigned for ${layerId}: ${z}`);
        return z;
    }
    const validatedZIndex = PaneHelpers.validateZIndex(def.zIndex);
    if (validatedZIndex !== def.zIndex)
        Log.warn(
            `[GeoLeaf.GeoJSON] zIndex ${def.zIndex} clamped to ${validatedZIndex} for ${layerId}`
        );
    return validatedZIndex;
}

function _buildLayerDataRecord(
    def: DefLike,
    leafletLayer: any,
    layerId: string,
    layerLabel: string,
    features: unknown[],
    geojsonData: any,
    clusterGroup: unknown,
    useSharedCluster: boolean
): Record<string, unknown> {
    const Config = (_g as any).GeoLeaf?.Config;
    const dataCfg = Config?.get ? Config.get("data") : null;
    const profilesBasePath = (dataCfg && (dataCfg as any).profilesBasePath) || "profiles";
    const layerBasePath = `${profilesBasePath}/${def._profileId}/${def._layerDirectory}`;
    const inferredGeometry = (_g as any).GeoLeaf._GeoJSONLayerConfig.inferGeometryType(
        def,
        geojsonData
    );
    const layerData: Record<string, unknown> = {
        id: layerId,
        label: layerLabel,
        layer: leafletLayer,
        visible: true,
        config: def,
        clusterGroup,
        legendsConfig: def.legends,
        basePath: layerBasePath,
        useSharedCluster,
        features,
        geometryType: def.geometryType || inferredGeometry,
    };
    (layerData as any)._visibility = {
        current: false,
        logicalState: false,
        source: "system",
        userOverride: false,
        themeOverride: false,
        themeDesired: null,
        zoomConstrained: false,
    };
    return layerData;
}

function _finalizeLayerRegistration(
    layerData: Record<string, unknown>,
    layerId: string,
    def: DefLike,
    geojsonData: any,
    state: any
): void {
    state.layers.set(layerId, layerData);
    if (
        (_g as any).GeoLeaf?.ThemeCache &&
        typeof (_g as any).GeoLeaf.ThemeCache.store === "function"
    ) {
        (_g as any).GeoLeaf.ThemeCache.store(
            layerId,
            def._profileId || ((_g as any).GeoLeaf.Config?.getActiveProfileId?.() ?? null),
            geojsonData,
            { contentLength: def.contentLength }
        );
    }
    if ((_g as any).GeoLeaf?._GeoJSONLayerManager)
        (_g as any).GeoLeaf._GeoJSONLayerManager.updateLayerVisibilityByZoom();
    layerData.visible = false;
}

function _registerLayerData(
    def: DefLike,
    leafletLayer: any,
    layerId: string,
    layerLabel: string,
    features: unknown[],
    state: any,
    zIndex: number,
    geojsonData: any,
    clusterGroup: unknown,
    useSharedCluster: boolean
): Record<string, unknown> {
    const layerData = _buildLayerDataRecord(
        def,
        leafletLayer,
        layerId,
        layerLabel,
        features,
        geojsonData,
        clusterGroup,
        useSharedCluster
    );
    _finalizeLayerRegistration(layerData, layerId, def, geojsonData, state);
    return layerData;
}

function _applyLabels(def: DefLike, layerId: string, preloadedStyleData: any): void {
    const Labels = (_g as any).GeoLeaf?.Labels;
    const hasInitFn = Labels && typeof Labels.initializeLayerLabels === "function";
    if (preloadedStyleData) {
        if (hasInitFn) Labels.initializeLayerLabels(layerId);
    } else if (def.labels && (def.labels as any).enabled && hasInitFn) {
        Labels.initializeLayerLabels(layerId);
    }
    if ((_g as any).GeoLeaf?._LabelButtonManager)
        (_g as any).GeoLeaf._LabelButtonManager.syncImmediate(layerId);
}

function _applyStylePostProcess(
    preloadedStyleData: any,
    layerId: string,
    Log: any,
    state: any
): void {
    const layerDataForStyle = state.layers.get(layerId);
    if (layerDataForStyle) (layerDataForStyle as any).currentStyle = preloadedStyleData;
    if (_styleNeedsPostProcess(preloadedStyleData) && (_g as any).GeoLeaf?._GeoJSONLayerManager) {
        Log.debug("[GeoLeaf.GeoJSON] Post-process setLayerStyle (hatch/casing) for:", layerId);
        (_g as any).GeoLeaf._GeoJSONLayerManager.setLayerStyle(layerId, preloadedStyleData);
    }
}

async function _postLoadHooks(
    def: DefLike,
    leafletLayer: any,
    preloadedStyleData: any,
    layerId: string,
    state: any,
    Log: any
): Promise<void> {
    const shouldFitBounds = def.fitBoundsOnLoad && !(_g as any).GeoLeaf?.ThemeSelector;
    if (shouldFitBounds && leafletLayer.getBounds().isValid()) {
        const fitOptions: { maxZoom?: number } = {};
        if (typeof def.maxZoomOnFit === "number") fitOptions.maxZoom = def.maxZoomOnFit;
        (state.map as any).fitBounds(leafletLayer.getBounds(), fitOptions);
    }
    if (preloadedStyleData) _applyStylePostProcess(preloadedStyleData, layerId, Log, state);
    _applyLabels(def, layerId, preloadedStyleData);
}

const Loader: {
    _loadSingleLayer: (
        layerId: string,
        layerLabel: string,
        def: DefLike,
        baseOptions: Record<string, unknown>
    ) => Promise<{ id: string; label: string; featureCount: number }>;
} = {} as any;

async function _clusterAndRegisterLayer(
    def: DefLike,
    leafletLayer: any,
    layerId: string,
    layerLabel: string,
    features: any[],
    state: any,
    Log: any,
    geojsonData: any,
    preloadedStyleData: any
): Promise<{ id: string; label: string; featureCount: number } | null> {
    const PaneHelpers = GeoJSONShared.PaneHelpers;
    const PaneConfig = GeoJSONShared.PANE_CONFIG;
    const clusterRes = await _handleClustering(
        def,
        leafletLayer,
        layerId,
        layerLabel,
        features,
        state,
        Log,
        PaneHelpers,
        geojsonData,
        preloadedStyleData
    );
    if (clusterRes.earlyReturn)
        return clusterRes.earlyReturn as { id: string; label: string; featureCount: number };
    const zIndex = _resolveZIndex(def, state, PaneConfig, PaneHelpers, layerId, Log);
    def.zIndex = zIndex;
    _registerLayerData(
        def,
        leafletLayer,
        layerId,
        layerLabel,
        features,
        state,
        zIndex,
        geojsonData,
        clusterRes.clusterGroup,
        clusterRes.useSharedCluster
    );
    return null;
}

async function _doLoadSingleLayer(
    rawData: unknown,
    fromCache: boolean,
    isGpx: boolean,
    def: DefLike,
    layerId: string,
    layerLabel: string,
    baseOptions: Record<string, unknown>,
    state: any,
    Log: any
): Promise<{ id: string; label: string; featureCount: number }> {
    if (fromCache) delete def._cachedData;
    const DataConverter = (_g as any).GeoLeaf && (_g as any).GeoLeaf._DataConverter;
    const geojsonData = _convertRawData(rawData, isGpx, DataConverter);
    const featCount = geojsonData.features ? geojsonData.features.length : 0;
    Log.debug("[GeoLeaf.GeoJSON._loadSingleLayer] Data converted", {
        layerId,
        type: def.type,
        features: featCount,
        source: fromCache ? "cache" : "network",
    });
    const preloadedStyleData = await _preloadStyle(def, layerId, layerLabel, Log);
    const layerOptions = _setupLayerOptions(def, baseOptions, preloadedStyleData, state);
    const features = Array.isArray(geojsonData.features) ? geojsonData.features : [];
    const leafletLayer = (_g as any).L.geoJSON(null, layerOptions);
    const earlyRet = await _clusterAndRegisterLayer(
        def,
        leafletLayer,
        layerId,
        layerLabel,
        features,
        state,
        Log,
        geojsonData,
        preloadedStyleData
    );
    if (earlyRet) return earlyRet;
    await _postLoadHooks(def, leafletLayer, preloadedStyleData, layerId, state, Log);
    Log.debug(
        "[GeoLeaf.GeoJSON] Layer loaded successfully :",
        layerId,
        "(" + features.length + " features)"
    );
    return { id: layerId, label: layerLabel, featureCount: features.length };
}

Loader._loadSingleLayer = function (
    layerId: string,
    layerLabel: string,
    def: DefLike,
    baseOptions: Record<string, unknown>
): Promise<{ id: string; label: string; featureCount: number }> {
    const state = getState();
    const Log = getLog();
    const VT = getVectorTiles();
    if (VT && VT.shouldUseVectorTiles(def)) {
        Log.info(`[GeoLeaf.GeoJSON] ⧡ Layer "${layerId}" → vector tiles (Sprint 8)`);
        return VT.loadVectorTileLayer(layerId, layerLabel, def, baseOptions);
    }
    const fromCache = !!def._cachedData;
    const isGpx = def.type === "gpx" || !!(def.url && String(def.url).endsWith(".gpx"));
    const WorkerMgr = (_g as any).GeoLeaf && (_g as any).GeoLeaf._WorkerManager;
    const useWorker = !!(!fromCache && WorkerMgr && WorkerMgr.isAvailable());
    const dataPromise = _getDataPromise(fromCache, isGpx, useWorker, def, WorkerMgr, layerId);
    return dataPromise.then((rawData: unknown) =>
        _doLoadSingleLayer(
            rawData,
            fromCache,
            isGpx,
            def,
            layerId,
            layerLabel,
            baseOptions,
            state,
            Log
        )
    );
};

export { Loader as LoaderSingleLayer };
