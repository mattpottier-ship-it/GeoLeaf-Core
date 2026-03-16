/**
 * GeoLeaf GeoJSON Loader - Clustering Setup
 * Clustering helper functions extracted from single-layer.ts — Sprint 1 refactoring.
 * Handles cluster group creation, shared POI cluster resolution, and clustering strategy.
 *
 * @module geojson/loader/clustering-setup
 */

const _g: any =
    typeof globalThis !== "undefined"
        ? globalThis
        : typeof window !== "undefined"
          ? window
          : ({} as Window);

interface DefLike extends Record<string, unknown> {
    zIndex?: number;
    clusterRadius?: number;
    disableClusteringAtZoom?: number;
    clustering?: Record<string, unknown>;
    _profileId?: string;
}

/**
 * Reconciles top-level cluster options from the nested clustering config object.
 * @internal
 */
export function _adjustClusterOptions(def: DefLike): void {
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

/**
 * Creates a Leaflet markerClusterGroup for a layer.
 * @internal
 */
export function _createClusterGroup(
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

/**
 * Retries adding a layer to the shared POI cluster once it becomes available.
 * Called via setTimeout when the cluster was not available at load time.
 * @internal
 */
export function _resolveSharedClusterLater(
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

/**
 * Registers a layer as pending shared cluster and schedules the retry.
 * @internal
 */
export function _setupPendingSharedCluster(
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

/**
 * Attempts to add a layer to the shared POI cluster; schedules a retry if not yet available.
 * @internal
 */
export function _handleSharedCluster(
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
        "[GeoLeaf.GeoJSON] \uD83D\uDD04 Attempting to retrieve shared POI cluster for:",
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
