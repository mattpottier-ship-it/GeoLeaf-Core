/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf GeoJSON Loader - Profile
 * Orchestration du loading par profile, batch loading, LayerManager population
 *
 * @module geojson/loader/profile
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

interface ProfileLike {
    id?: string;
    geojsonLayers?: unknown[];
    geojson?: { layers?: unknown[] };
    layers?: unknown[];
    themes?: {
        config?: { defautTheme?: string };
        defaultTheme?: string;
        themes?: { id: string; layers?: { id: string; visible?: boolean }[] }[];
    };
}

function _getLayersDef(profile: ProfileLike, Config: any, Log: any): unknown[] {
    if (Array.isArray(profile.geojsonLayers)) return profile.geojsonLayers;
    if (profile.geojson && Array.isArray(profile.geojson.layers)) return profile.geojson.layers;
    if (Array.isArray(profile.layers)) return profile.layers;
    if (Config.Profile && typeof Config.Profile.getActiveProfileLayersConfig === "function") {
        const lc = Config.Profile.getActiveProfileLayersConfig();
        if (Array.isArray(lc)) {
            Log.info("[GeoLeaf.GeoJSON] Using v3.0 system - " + lc.length + " layers detected");
            return lc;
        }
    }
    return [];
}

function _resolveLayerUrl(
    d: Record<string, unknown>,
    profile: ProfileLike,
    self: any
): string | null {
    if (d.url) return d.url as string;
    if (d.dataFile && self._resolveDataFilePath) {
        return self._resolveDataFilePath(
            d.dataFile as string,
            profile,
            (d._layerDirectory as string) || null
        );
    }
    return null;
}

function _applyPopupConfig(nd: Record<string, unknown>, d: Record<string, unknown>): void {
    if (!(d.popup && typeof d.popup === "object")) return;
    nd.showPopup = (d.popup as any).enabled !== false;
    if (Array.isArray((d.popup as any).fields)) nd.popupFields = (d.popup as any).fields;
    nd.popup = d.popup;
}

function _applyTooltipConfig(nd: Record<string, unknown>, d: Record<string, unknown>): void {
    if (!(d.tooltip && typeof d.tooltip === "object")) return;
    nd.showTooltip = (d.tooltip as any).enabled !== false;
    if (Array.isArray((d.tooltip as any).fields)) nd.tooltipFields = (d.tooltip as any).fields;
    if ((d.tooltip as any).mode) nd.tooltipMode = (d.tooltip as any).mode;
    nd.tooltip = d.tooltip;
}

function _applySidepanelConfig(nd: Record<string, unknown>, d: Record<string, unknown>): void {
    if (!(d.sidepanel && typeof d.sidepanel === "object")) return;
    if (Array.isArray((d.sidepanel as any).detailLayout))
        nd.sidepanelFields = (d.sidepanel as any).detailLayout;
    nd.sidepanel = d.sidepanel;
}

function _applyClusteringConfig(nd: Record<string, unknown>, d: Record<string, unknown>): void {
    if (!(d.clustering && typeof d.clustering === "object")) return;
    nd.clustering = (d.clustering as any).enabled !== false;
    if (typeof (d.clustering as any).maxClusterRadius === "number") {
        nd.maxClusterRadius = (d.clustering as any).maxClusterRadius;
        nd.clusterRadius = (d.clustering as any).maxClusterRadius;
    }
    if (typeof (d.clustering as any).disableClusteringAtZoom === "number")
        nd.disableClusteringAtZoom = (d.clustering as any).disableClusteringAtZoom;
}

function _applyVectorTilesConfig(nd: Record<string, unknown>, d: Record<string, unknown>): void {
    if (d.data && (d.data as any).vectorTiles && typeof (d.data as any).vectorTiles === "object")
        nd.vectorTiles = (d.data as any).vectorTiles;
    if (d.vectorTiles && typeof d.vectorTiles === "object") nd.vectorTiles = d.vectorTiles;
}

function _buildNormalizedDef(
    d: Record<string, unknown>,
    profile: ProfileLike,
    layerUrl: string
): Record<string, unknown> {
    const nd = { ...d, url: layerUrl } as Record<string, unknown>;
    nd._profileId = profile.id;
    nd._layerDirectory = (d._layerDirectory as string) || null;
    _applyPopupConfig(nd, d);
    _applyTooltipConfig(nd, d);
    _applySidepanelConfig(nd, d);
    if (d.clustering && typeof d.clustering === "object") _applyClusteringConfig(nd, d);
    if (d.search && typeof d.search === "object") nd.search = d.search;
    if (d.table && typeof d.table === "object") nd.table = d.table;
    _applyVectorTilesConfig(nd, d);
    return nd;
}

function _registerLayerManager(loadedLayers: unknown[]): void {
    if (
        loadedLayers.length > 0 &&
        (_g as any).GeoLeaf &&
        (_g as any).GeoLeaf._GeoJSONLayerManager
    ) {
        (_g as any).GeoLeaf._GeoJSONLayerManager.registerWithLayerManager();
    }
}

function _fitBoundsIfNeeded(baseOptions: Record<string, unknown>, state: any, Log: any): void {
    if (!(baseOptions.fitBoundsOnLoad !== false && state.map && state.layerGroup)) return;
    const bounds = (state.layerGroup as any).getBounds();
    if (!bounds.isValid()) return;
    const fitOptions: { maxZoom?: number } = {};
    if (typeof (baseOptions as any).maxZoomOnFit === "number")
        fitOptions.maxZoom = (baseOptions as any).maxZoomOnFit;
    (state.map as any).fitBounds(bounds, fitOptions);
    Log.debug("[GeoLeaf.GeoJSON] Map bounds fitted to GeoJSON layers");
    const onMoveEnd = function () {
        (state.map as any).off("moveend", onMoveEnd);
        try {
            document.dispatchEvent(
                new CustomEvent("geoleaf:fitbounds:complete", { detail: { bounds } })
            );
        } catch (_e) {
            /* ignore */
        }
    };
    (state.map as any).on("moveend", onMoveEnd);
}

function _resolveDefaultThemeId(themesData: ProfileLike["themes"]): string | null {
    const cfg = themesData && themesData.config;
    return (cfg && cfg.defautTheme) || (themesData as any).defaultTheme || null;
}

function _resolveStyleLabels(layer: any): { styles: unknown; labels: unknown } {
    return {
        styles: layer.config && layer.config.styles ? layer.config.styles : layer.styles || null,
        labels: layer.config && layer.config.labels ? layer.config.labels : layer.labels || null,
    };
}

function _buildLayerDefParams(
    d: Record<string, unknown>,
    profile: ProfileLike,
    state: any,
    layerUrl: string
): { normalizedDef: any; layerId: string; layerLabel: string } {
    const normalizedDef = _buildNormalizedDef(d, profile, layerUrl);
    const layerId = (d.id as string) || "geojson-layer-" + state.layerIdCounter++;
    const layerLabel = (d.label as string) || layerId;
    return { normalizedDef, layerId, layerLabel };
}

async function _processLayerDef(
    def: unknown,
    index: number,
    profile: ProfileLike,
    state: any,
    self: any,
    baseOptions: Record<string, unknown>,
    Log: any
): Promise<unknown> {
    if (!def || typeof def !== "object") {
        Log.warn("[GeoLeaf.GeoJSON] Invalid profile GeoJSON descriptor, ignored :", {
            index,
            def,
        });
        return null;
    }
    const d = def as Record<string, unknown>;
    if (typeof d.active === "boolean" && d.active === false) {
        Log.debug("[GeoLeaf.GeoJSON] Layer disabled (active: false), skipped :", d.id);
        return null;
    }
    const layerUrl = _resolveLayerUrl(d, profile, self);
    if (!layerUrl) {
        Log.warn("[GeoLeaf.GeoJSON] GeoJSON descriptor without URL or dataFile, ignored :", {
            index,
            id: d.id,
            label: d.label,
        });
        return null;
    }
    const params = _buildLayerDefParams(d, profile, state, layerUrl);
    const { normalizedDef, layerId, layerLabel } = params;
    const debugLoad = { profileId: profile.id, layerId, url: layerUrl };
    Log.debug("[GeoLeaf.GeoJSON] Loading GeoJSON layer :", debugLoad);
    try {
        const loadLayer = (_g as any).GeoLeaf._GeoJSONLoader._loadSingleLayer;
        return await loadLayer(layerId, layerLabel, normalizedDef, baseOptions);
    } catch (err) {
        Log.error("[GeoLeaf.GeoJSON] Failed to load layer :", {
            layerId,
            url: layerUrl,
            error: err,
        });
        return null;
    }
}

const Loader: {
    loadFromActiveProfile: (options?: Record<string, unknown>) => Promise<unknown[]>;
    _loadLayersByBatch: (
        tasks: (() => Promise<unknown>)[],
        batchSize?: number,
        delayMs?: number
    ) => Promise<unknown[]>;
    _getDefaultThemeLayerIds: (profile: ProfileLike) => Set<string>;
    _loadLayersInIdle: (
        tasks: (() => Promise<unknown>)[],
        batchSize?: number
    ) => Promise<unknown[]>;
    loadAllLayersConfigsForLayerManager: (profile: ProfileLike) => Promise<unknown[]>;
    _resolveDataFilePath?: (
        dataFile: string,
        profile: ProfileLike,
        layerDirectory: string | null
    ) => string | null;
} = {} as any;

function _splitTasksByTheme(
    layersDef: unknown[],
    profile: ProfileLike,
    state: any,
    self: typeof Loader,
    baseOptions: Record<string, unknown>,
    Log: any
): { immediateTasks: (() => Promise<unknown>)[]; deferredTasks: (() => Promise<unknown>)[] } {
    const tasks = layersDef.map(
        (def: unknown, index: number) => async () =>
            _processLayerDef(def, index, profile, state, self, baseOptions, Log)
    );
    const defaultThemeLayerIds = self._getDefaultThemeLayerIds(profile);
    const immediateTasks: (() => Promise<unknown>)[] = [];
    const deferredTasks: (() => Promise<unknown>)[] = [];
    layersDef.forEach((def: unknown, index: number) => {
        const d = def as { id?: string };
        if (d && d.id && defaultThemeLayerIds.has(d.id)) immediateTasks.push(tasks[index]);
        else deferredTasks.push(tasks[index]);
    });
    return { immediateTasks, deferredTasks };
}

function _scheduleDeferredLayers(
    deferredTasks: (() => Promise<unknown>)[],
    self: typeof Loader,
    state: any,
    Log: any
): void {
    (self._loadLayersInIdle(deferredTasks) as Promise<unknown[]>)
        .then((loadedDeferred: unknown[]) => {
            const loadedDeferredFiltered = loadedDeferred.filter(Boolean);
            Log.info(
                "[GeoLeaf.GeoJSON] Phase 2 : " +
                    loadedDeferredFiltered.length +
                    " deferred layer(s) loaded in background"
            );
            _registerLayerManager(loadedDeferredFiltered);
            try {
                (state.map as any).fire("geoleaf:geojson:deferred-layers-loaded", {
                    count: loadedDeferredFiltered.length,
                    layers: loadedDeferredFiltered.map((l: any) => ({ id: l.id, label: l.label })),
                });
            } catch (_e) {
                /* ignore */
            }
        })
        .catch((err: unknown) =>
            Log.error("[GeoLeaf.GeoJSON] Error loading deferred layers :", err)
        );
}

function _handlePhase1Loaded(
    loadedLayers: unknown[],
    deferredTasks: (() => Promise<unknown>)[],
    baseOptions: Record<string, unknown>,
    state: any,
    self: typeof Loader,
    Log: any
): unknown[] {
    Log.info(
        "[GeoLeaf.GeoJSON] Phase 1 : " + loadedLayers.length + " layer(s) from default theme loaded"
    );
    _registerLayerManager(loadedLayers);
    _fitBoundsIfNeeded(baseOptions, state, Log);
    try {
        (state.map as any).fire("geoleaf:geojson:layers-loaded", {
            count: loadedLayers.length,
            layers: loadedLayers.map((l: any) => ({ id: l.id, label: l.label })),
        });
    } catch (_e) {
        /* ignore */
    }
    try {
        document.dispatchEvent(
            new CustomEvent("geoleaf:layers:initial-loaded", {
                detail: { count: loadedLayers.length, deferred: deferredTasks.length },
            })
        );
    } catch (_e) {
        /* ignore */
    }
    if (deferredTasks.length > 0) _scheduleDeferredLayers(deferredTasks, self, state, Log);
    return loadedLayers;
}

function _warnLayerCount(layersDef: unknown[], Log: any): void {
    if (layersDef.length > 50)
        Log.warn(
            "[GeoLeaf.GeoJSON] Many GeoJSON layers detected (" +
                layersDef.length +
                "). This may impact performance."
        );
    else if (layersDef.length > 20)
        Log.info(
            "[GeoLeaf.GeoJSON] " +
                layersDef.length +
                " GeoJSON layers detected. Rich profile detected."
        );
}

Loader.loadFromActiveProfile = function (
    options: Record<string, unknown> = {}
): Promise<unknown[]> {
    const state = getState();
    const Log = getLog();
    const Config = (_g as any).GeoLeaf && (_g as any).GeoLeaf.Config;
    if (!Config || typeof Config.getActiveProfile !== "function") {
        Log.warn(
            "[GeoLeaf.GeoJSON] Config module or Config.getActiveProfile() not available; GeoJSON profile loading impossible."
        );
        return Promise.resolve([]);
    }
    const profile = Config.getActiveProfile() as ProfileLike | null;
    if (!profile || typeof profile !== "object") {
        Log.warn("[GeoLeaf.GeoJSON] No active profile or invalid profile; no GeoJSON loaded.");
        return Promise.resolve([]);
    }
    const layersDef = _getLayersDef(profile, Config, Log);
    if (!layersDef.length) {
        Log.info(
            "[GeoLeaf.GeoJSON] No geojsonLayers / geojson.layers / layers block defined in active profile; nothing to load."
        );
        return Promise.resolve([]);
    }
    _warnLayerCount(layersDef, Log);
    const baseOptions = options || {};
    const batchSize = 3;
    const batchDelay = 200;
    const self = this as typeof Loader;
    const { immediateTasks, deferredTasks } = _splitTasksByTheme(
        layersDef,
        profile,
        state,
        self,
        baseOptions,
        Log
    );
    Log.info(
        `[GeoLeaf.GeoJSON] Smart loading: ${immediateTasks.length} immediate(s) (default theme), ${deferredTasks.length} deferred`
    );
    const handleLoaded = (layers: unknown[]) =>
        _handlePhase1Loaded(layers.filter(Boolean), deferredTasks, baseOptions, state, self, Log);
    return self._loadLayersByBatch(immediateTasks, batchSize, batchDelay).then(handleLoaded);
};

Loader._loadLayersByBatch = async function (
    tasks: (() => Promise<unknown>)[],
    batchSize = 3,
    delayMs = 200
): Promise<unknown[]> {
    const results: unknown[] = [];
    const Log = getLog();
    for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const batchStart = Date.now();
        const batchResults = await Promise.all(batch.map((fn) => fn()));
        results.push(...batchResults);
        Log.info(
            `[GeoLeaf.GeoJSON] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)} loaded in ${Date.now() - batchStart} ms`
        );
        if (i + batchSize < tasks.length && delayMs > 0)
            await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return results;
};

Loader._getDefaultThemeLayerIds = function (profile: ProfileLike): Set<string> {
    try {
        if (!profile || !profile.themes) return new Set();
        const themesData = profile.themes;
        const defaultThemeId = _resolveDefaultThemeId(themesData);
        if (!defaultThemeId || !Array.isArray((themesData as any).themes)) return new Set();
        const defaultTheme = (themesData as any).themes.find(
            (t: { id: string }) => t.id === defaultThemeId
        );
        if (!defaultTheme || !Array.isArray(defaultTheme.layers)) return new Set();
        return new Set(
            defaultTheme.layers
                .filter((l: { visible?: boolean }) => l.visible !== false)
                .map((l: { id: string }) => l.id)
        );
    } catch (_e) {
        return new Set();
    }
};

Loader._loadLayersInIdle = function (
    tasks: (() => Promise<unknown>)[],
    batchSize = 2
): Promise<unknown[]> {
    const Log = getLog();
    return new Promise((resolve) => {
        const results: unknown[] = [];
        let index = 0;
        const schedule =
            typeof requestIdleCallback === "function"
                ? (cb: () => void) => requestIdleCallback(cb, { timeout: 3000 })
                : (cb: () => void) => setTimeout(cb, 60);
        const processNext = () => {
            if (index >= tasks.length) {
                resolve(results);
                return;
            }
            schedule(async () => {
                const batch = tasks.slice(index, index + batchSize);
                const batchResults = await Promise.all(batch.map((fn) => fn()));
                results.push(...batchResults);
                Log.debug(
                    `[GeoLeaf.GeoJSON] Idle: batch ${Math.floor(index / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)} (${results.length}/${tasks.length} processed)`
                );
                index += batchSize;
                processNext();
            });
        };
        processNext();
    });
};

Loader.loadAllLayersConfigsForLayerManager = async function (
    profile: ProfileLike
): Promise<unknown[]> {
    const Log = getLog();
    if (!profile || !(profile as any).layers || !Array.isArray((profile as any).layers)) {
        Log.warn("[GeoLeaf.GeoJSON] loadAllLayersConfigsForLayerManager: No layers in profile");
        return [];
    }
    const layers = (profile as any).layers as {
        id: string;
        label?: string;
        layerManagerId?: string;
        configFile?: string;
        config?: { zIndex?: number; themes?: unknown; styles?: unknown; labels?: unknown };
        styles?: unknown;
        labels?: unknown;
    }[];
    Log.info(
        `[GeoLeaf.GeoJSON] Preparing ${layers.length} layer configurations for LayerManager...`
    );
    const allConfigs = layers.map((layer) => {
        const { styles, labels } = _resolveStyleLabels(layer);
        return {
            id: layer.id,
            label: layer.label,
            layerManagerId: layer.layerManagerId || "geojson-default",
            configFile: layer.configFile,
            zIndex: (layer.config && layer.config.zIndex) || 0,
            themes: (layer.config && layer.config.themes) || null,
            styles,
            labels,
        };
    });
    Log.info("[GeoLeaf.GeoJSON] " + allConfigs.length + " configurations ready for LayerManager");
    (_g as any).GeoLeaf._allLayerConfigs = allConfigs;
    return allConfigs;
};

export { Loader as LoaderProfile };
