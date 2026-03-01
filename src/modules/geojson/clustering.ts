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
                Log.debug?.("[GeoLeaf.GeoJSON] Module POI non disponible ou getLayer() manquant");
                return null;
            }
            const poiLayer = POI.getLayer();
            if (!poiLayer) {
                Log.debug?.("[GeoLeaf.GeoJSON] POI.getLayer() retourne null/undefined");
                return null;
            }
            const layer = poiLayer as { addLayer?: unknown; removeLayer?: unknown };
            if (
                layer &&
                typeof layer.addLayer === "function" &&
                typeof layer.removeLayer === "function"
            ) {
                Log.debug?.("[GeoLeaf.GeoJSON] Cluster/Layer POI récupéré avec succès");
                return poiLayer;
            }
            Log.warn?.(
                "[GeoLeaf.GeoJSON] POI.getLayer() ne retourne pas un layer valide (checks failed)"
            );
        } catch (e) {
            (getLog() as { error?: (a: string, b: unknown) => void }).error?.(
                "[GeoLeaf.GeoJSON] Impossible de récupérer le cluster POI :",
                e
            );
        }
        return null;
    },

    getClusteringStrategy(
        def: LayerDef,
        geojsonData: GeoJSONData
    ): { shouldCluster: boolean; useSharedCluster: boolean } {
        const Log = getLog();
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

        const clusteringConfig: ClusteringConfig =
            typeof def.clustering === "object"
                ? def.clustering
                : { enabled: def.clustering as boolean };
        const isClusteringEnabled = clusteringConfig.enabled === true;
        const isClusteringDisabled = clusteringConfig.enabled === false;

        if (isClusteringDisabled) {
            return { shouldCluster: false, useSharedCluster: false };
        }
        if (!poiConfig.clustering && !isClusteringEnabled) {
            return { shouldCluster: false, useSharedCluster: false };
        }

        const hasPoints =
            geojsonData.features?.some((f) => f?.geometry?.type?.includes("Point")) ?? false;
        if (!hasPoints) {
            return { shouldCluster: false, useSharedCluster: false };
        }

        if (isClusteringEnabled) {
            const clusterRadius =
                clusteringConfig.maxClusterRadius ??
                (typeof def.clusterRadius === "number" ? def.clusterRadius : null);
            const disableAtZoom =
                clusteringConfig.disableClusteringAtZoom ??
                (typeof def.disableClusteringAtZoom === "number"
                    ? def.disableClusteringAtZoom
                    : null);
            const hasCustomClusterParams =
                (clusterRadius !== null && clusterRadius !== (poiConfig.clusterRadius ?? 80)) ||
                (disableAtZoom !== null &&
                    disableAtZoom !== (poiConfig.disableClusteringAtZoom ?? 18));

            if (hasCustomClusterParams) {
                return { shouldCluster: true, useSharedCluster: false };
            }
            const strategy = poiConfig.clusterStrategy ?? "unified";
            return {
                shouldCluster: true,
                useSharedCluster: strategy === "unified",
            };
        }

        const strategy = poiConfig.clusterStrategy ?? "unified";
        switch (strategy) {
            case "unified":
                return { shouldCluster: true, useSharedCluster: true };
            case "by-layer":
                return {
                    shouldCluster: isClusteringEnabled,
                    useSharedCluster: false,
                };
            case "by-source": {
                const sourceConfig = poiConfig.clusterStrategies?.["by-source"]?.sources ?? {};
                const shouldClusterGeoJSON = sourceConfig.geojson !== false;
                return {
                    shouldCluster: shouldClusterGeoJSON,
                    useSharedCluster: false,
                };
            }
            case "json-only": {
                const jsonOnlyConfig = poiConfig.clusterStrategies?.["json-only"] ?? {};
                return {
                    shouldCluster:
                        (jsonOnlyConfig as { geojsonClustering?: boolean }).geojsonClustering ===
                        true,
                    useSharedCluster: false,
                };
            }
            default:
                Log.warn?.(
                    "[GeoLeaf.GeoJSON] Stratégie de clustering inconnue: " +
                        strategy +
                        ". Utilisation de 'unified'."
                );
                return { shouldCluster: true, useSharedCluster: true };
        }
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
