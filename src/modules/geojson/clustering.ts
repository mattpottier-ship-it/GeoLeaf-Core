/**
 * GeoLeaf GeoJSON Module - Clustering
 * @module geojson/clustering
 */

import { getLog } from "../utils/general-utils.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

interface ClusteringConfig {
    enabled?: boolean;
    maxClusterRadius?: number;
    disableClusteringAtZoom?: number;
}

interface LayerDef {
    clustering?: boolean | ClusteringConfig;
    clusterRadius?: number;
    disableClusteringAtZoom?: number;
}

interface GeoJSONData {
    features?: { geometry?: { type?: string } }[];
}

const _CLUSTER_NONE = { shouldCluster: false, useSharedCluster: false };
const _CLUSTER_UNIFIED = { shouldCluster: true, useSharedCluster: true };

function _resolveClusteringConfig(def: LayerDef): ClusteringConfig {
    if (typeof def.clustering === "object") return def.clustering;
    return { enabled: def.clustering as boolean };
}

function _resolveCustomClusterCheck(
    clusteringConfig: ClusteringConfig,
    def: LayerDef,
    poiConfig: Record<string, unknown>
): boolean {
    const clusterRadius =
        clusteringConfig.maxClusterRadius ??
        (typeof def.clusterRadius === "number" ? def.clusterRadius : null);
    const disableAtZoom =
        clusteringConfig.disableClusteringAtZoom ??
        (typeof def.disableClusteringAtZoom === "number" ? def.disableClusteringAtZoom : null);
    if (clusterRadius !== null && clusterRadius !== (poiConfig.clusterRadius ?? 80)) return true;
    if (disableAtZoom === null) return false;
    return disableAtZoom !== (poiConfig.disableClusteringAtZoom ?? 18);
}

function _resolveStrategyResult(
    strategy: string,
    isClusteringEnabled: boolean,
    poiConfig: Record<string, unknown>
): { shouldCluster: boolean; useSharedCluster: boolean } {
    const Log = getLog();
    switch (strategy) {
        case "unified":
            return _CLUSTER_UNIFIED;
        case "by-layer":
            return { shouldCluster: isClusteringEnabled, useSharedCluster: false };
        case "by-source": {
            const sourceConfig = (poiConfig.clusterStrategies as any)?.["by-source"]?.sources ?? {};
            return { shouldCluster: sourceConfig.geojson !== false, useSharedCluster: false };
        }
        case "json-only": {
            const jsonOnlyConfig = (poiConfig.clusterStrategies as any)?.["json-only"] ?? {};
            return {
                shouldCluster: (jsonOnlyConfig as any).geojsonClustering === true,
                useSharedCluster: false,
            };
        }
        default:
            Log.warn?.(
                "[GeoLeaf.GeoJSON] Unknown clustering strategy: " +
                    strategy +
                    ". Defaulting to 'unified'."
            );
            return _CLUSTER_UNIFIED;
    }
}

const GeoJSONClustering = {
    getPoiConfig(): Record<string, unknown> {
        const Config = (_g as { GeoLeaf?: { Config?: { get: (path: string) => unknown } } }).GeoLeaf
            ?.Config;
        if (Config && typeof Config.get === "function") {
            return (Config.get("poiConfig") as Record<string, unknown>) || {};
        }
        return {};
    },

    getSharedPOICluster(): unknown {
        const Log = getLog();
        try {
            const POI = (_g as { GeoLeaf?: { POI?: { getLayer: () => unknown } } }).GeoLeaf?.POI;
            if (!POI || typeof POI.getLayer !== "function") {
                Log.debug?.("[GeoLeaf.GeoJSON] POI module not available or getLayer() missing");
                return null;
            }
            const poiLayer = POI.getLayer();
            if (!poiLayer) {
                Log.debug?.("[GeoLeaf.GeoJSON] POI.getLayer() returns null/undefined");
                return null;
            }
            const layer = poiLayer as { addLayer?: unknown; removeLayer?: unknown };
            if (
                layer &&
                typeof layer.addLayer === "function" &&
                typeof layer.removeLayer === "function"
            ) {
                Log.debug?.("[GeoLeaf.GeoJSON] POI Cluster/Layer retrieved successfully");
                return poiLayer;
            }
            Log.warn?.(
                "[GeoLeaf.GeoJSON] POI.getLayer() does not return a valid layer (checks failed)"
            );
        } catch (e) {
            (getLog() as { error?: (a: string, b: unknown) => void }).error?.(
                "[GeoLeaf.GeoJSON] Unable to retrieve the POI cluster:",
                e
            );
        }
        return null;
    },

    getClusteringStrategy(
        def: LayerDef,
        geojsonData: GeoJSONData
    ): { shouldCluster: boolean; useSharedCluster: boolean } {
        const poiConfig = GeoJSONClustering.getPoiConfig() as {
            clustering?: boolean;
            clusterRadius?: number;
            disableClusteringAtZoom?: number;
            clusterStrategy?: string;
            clusterStrategies?: Record<
                string,
                { sources?: { geojson?: boolean }; geojsonClustering?: boolean }
            >;
        };
        const clusteringConfig = _resolveClusteringConfig(def);
        const isClusteringEnabled = clusteringConfig.enabled === true;
        const isClusteringDisabled = clusteringConfig.enabled === false;
        if (isClusteringDisabled) return _CLUSTER_NONE;
        if (!poiConfig.clustering && !isClusteringEnabled) return _CLUSTER_NONE;
        const hasPoints =
            geojsonData.features?.some((f) => f?.geometry?.type?.includes("Point")) ?? false;
        if (!hasPoints) return _CLUSTER_NONE;
        if (isClusteringEnabled) {
            if (_resolveCustomClusterCheck(clusteringConfig, def, poiConfig))
                return { shouldCluster: true, useSharedCluster: false };
            const strategy = poiConfig.clusterStrategy ?? "unified";
            return { shouldCluster: true, useSharedCluster: strategy === "unified" };
        }
        const strategy = poiConfig.clusterStrategy ?? "unified";
        return _resolveStrategyResult(strategy, isClusteringEnabled, poiConfig);
    },

    createIndependentCluster(
        options: {
            clusterRadius?: number;
            disableClusteringAtZoom?: number;
            animate?: boolean;
            spiderfyOnMaxZoom?: boolean;
            showCoverageOnHover?: boolean;
            zoomToBoundsOnClick?: boolean;
        } = {}
    ): unknown {
        const L = (_g as { L?: { markerClusterGroup: (opts: unknown) => unknown } }).L;
        if (!L?.markerClusterGroup) return null;
        return L.markerClusterGroup({
            maxClusterRadius: options.clusterRadius ?? 80,
            disableClusteringAtZoom: options.disableClusteringAtZoom ?? 18,
            animate: options.animate !== undefined ? options.animate : false,
            spiderfyOnMaxZoom:
                options.spiderfyOnMaxZoom !== undefined ? options.spiderfyOnMaxZoom : false,
            showCoverageOnHover:
                options.showCoverageOnHover !== undefined ? options.showCoverageOnHover : false,
            zoomToBoundsOnClick:
                options.zoomToBoundsOnClick !== undefined ? options.zoomToBoundsOnClick : true,
        });
    },
};

export { GeoJSONClustering };
