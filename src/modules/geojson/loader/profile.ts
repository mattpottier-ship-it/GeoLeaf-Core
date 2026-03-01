/**
 * GeoLeaf GeoJSON Loader - Profile
 * Orchestration du chargement par profil, batch loading, LayerManager population
 *
 * @module geojson/loader/profile
 */

import { GeoJSONShared } from '../shared.js';
import { getLog } from '../../utils/general-utils.js';

const _g: any = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {} as Window);

const getState = () => GeoJSONShared.state;

interface ProfileLike {
    id?: string;
    geojsonLayers?: unknown[];
    geojson?: { layers?: unknown[] };
    layers?: unknown[];
    themes?: { config?: { defautTheme?: string }; defaultTheme?: string; themes?: { id: string; layers?: { id: string; visible?: boolean }[] }[] };
}

const Loader: {
    loadFromActiveProfile: (options?: Record<string, unknown>) => Promise<unknown[]>;
    _loadLayersByBatch: (tasks: (() => Promise<unknown>)[], batchSize?: number, delayMs?: number) => Promise<unknown[]>;
    _getDefaultThemeLayerIds: (profile: ProfileLike) => Set<string>;
    _loadLayersInIdle: (tasks: (() => Promise<unknown>)[], batchSize?: number) => Promise<unknown[]>;
    loadAllLayersConfigsForLayerManager: (profile: ProfileLike) => Promise<unknown[]>;
    _resolveDataFilePath?: (dataFile: string, profile: ProfileLike, layerDirectory: string | null) => string | null;
} = {} as any;

Loader.loadFromActiveProfile = function (options: Record<string, unknown> = {}): Promise<unknown[]> {
    const state = getState();
    const Log = getLog();
    const Config = (_g as any).GeoLeaf && (_g as any).GeoLeaf.Config;
    if (!Config || typeof Config.getActiveProfile !== "function") {
        Log.warn("[GeoLeaf.GeoJSON] Module Config ou Config.getActiveProfile() non disponible ; chargement GeoJSON par profil impossible.");
        return Promise.resolve([]);
    }
    const profile = Config.getActiveProfile() as ProfileLike | null;
    if (!profile || typeof profile !== "object") {
        Log.warn("[GeoLeaf.GeoJSON] Aucun profil actif ou profil invalide ; aucun GeoJSON chargé.");
        return Promise.resolve([]);
    }
    let layersDef: unknown[] = [];
    if (Array.isArray(profile.geojsonLayers)) layersDef = profile.geojsonLayers;
    else if (profile.geojson && Array.isArray(profile.geojson.layers)) layersDef = profile.geojson.layers;
    else if (Array.isArray(profile.layers)) layersDef = profile.layers;
    else if (Config.Profile && typeof Config.Profile.getActiveProfileLayersConfig === "function") {
        const layersConfig = Config.Profile.getActiveProfileLayersConfig();
        if (Array.isArray(layersConfig)) {
            layersDef = layersConfig;
            Log.info("[GeoLeaf.GeoJSON] Utilisation du système v3.0 - " + layersConfig.length + " couches détectées");
        }
    }
    if (!layersDef.length) {
        Log.info("[GeoLeaf.GeoJSON] Aucun bloc geojsonLayers / geojson.layers / layers défini dans le profil actif ; rien à charger.");
        return Promise.resolve([]);
    }
    if (layersDef.length > 50) Log.warn("[GeoLeaf.GeoJSON] Beaucoup de couches GeoJSON détectées (" + layersDef.length + "). Cela peut affecter les performances.");
    else if (layersDef.length > 20) Log.info("[GeoLeaf.GeoJSON] " + layersDef.length + " couches GeoJSON détectées. Profil riche détecté.");
    const baseOptions = options || {};
    const batchSize = 3;
    const batchDelay = 200;
    const self = this as typeof Loader;
    const tasks = layersDef.map((def: unknown, index: number) => async () => {
        if (!def || typeof def !== "object") {
            Log.warn("[GeoLeaf.GeoJSON] Descripteur GeoJSON de profil invalide, ignoré :", { index, def });
            return null;
        }
        const d = def as Record<string, unknown>;
        if (typeof d.active === "boolean" && d.active === false) {
            Log.debug("[GeoLeaf.GeoJSON] Couche désactivée (active: false), ignorée :", d.id || "(sans ID)");
            return null;
        }
        const layerDirectory = (d._layerDirectory as string) || null;
        const layerUrl = (d.url as string) || (d.dataFile && self._resolveDataFilePath ? self._resolveDataFilePath(d.dataFile as string, profile, layerDirectory) : null);
        if (!layerUrl) {
            Log.warn("[GeoLeaf.GeoJSON] Descripteur GeoJSON sans URL ou dataFile, ignoré :", { index, id: d.id, label: d.label });
            return null;
        }
        const normalizedDef = { ...d, url: layerUrl } as Record<string, unknown>;
        normalizedDef._profileId = profile.id;
        normalizedDef._layerDirectory = layerDirectory;
        if (d.popup && typeof d.popup === 'object') {
            normalizedDef.showPopup = (d.popup as any).enabled !== false;
            if (Array.isArray((d.popup as any).fields)) normalizedDef.popupFields = (d.popup as any).fields;
            normalizedDef.popup = d.popup;
        }
        if (d.tooltip && typeof d.tooltip === 'object') {
            normalizedDef.showTooltip = (d.tooltip as any).enabled !== false;
            if (Array.isArray((d.tooltip as any).fields)) normalizedDef.tooltipFields = (d.tooltip as any).fields;
            if ((d.tooltip as any).mode) normalizedDef.tooltipMode = (d.tooltip as any).mode;
            normalizedDef.tooltip = d.tooltip;
        }
        if (d.sidepanel && typeof d.sidepanel === 'object') {
            if (Array.isArray((d.sidepanel as any).detailLayout)) normalizedDef.sidepanelFields = (d.sidepanel as any).detailLayout;
            normalizedDef.sidepanel = d.sidepanel;
        }
        if (d.clustering && typeof d.clustering === 'object') {
            normalizedDef.clustering = (d.clustering as any).enabled !== false;
            if (typeof (d.clustering as any).maxClusterRadius === 'number') {
                normalizedDef.maxClusterRadius = (d.clustering as any).maxClusterRadius;
                normalizedDef.clusterRadius = (d.clustering as any).maxClusterRadius;
            }
            if (typeof (d.clustering as any).disableClusteringAtZoom === 'number') normalizedDef.disableClusteringAtZoom = (d.clustering as any).disableClusteringAtZoom;
        }
        if (d.search && typeof d.search === 'object') normalizedDef.search = d.search;
        if (d.table && typeof d.table === 'object') normalizedDef.table = d.table;
        if (d.data && (d.data as any).vectorTiles && typeof (d.data as any).vectorTiles === 'object') normalizedDef.vectorTiles = (d.data as any).vectorTiles;
        if (d.vectorTiles && typeof d.vectorTiles === 'object') normalizedDef.vectorTiles = d.vectorTiles;
        const layerId = (d.id as string) || ("geojson-layer-" + (state.layerIdCounter++));
        const layerLabel = (d.label as string) || layerId;
        Log.debug("[GeoLeaf.GeoJSON] Chargement couche GeoJSON :", { profileId: profile.id || "(inconnu)", layerId, url: layerUrl });
        try {
            return await (_g as any).GeoLeaf._GeoJSONLoader._loadSingleLayer(layerId, layerLabel, normalizedDef, baseOptions);
        } catch (err) {
            Log.error("[GeoLeaf.GeoJSON] Échec chargement couche :", { layerId, url: layerUrl, error: err });
            return null;
        }
    });
    const defaultThemeLayerIds = self._getDefaultThemeLayerIds(profile);
    const immediateTasks: (() => Promise<unknown>)[] = [];
    const deferredTasks: (() => Promise<unknown>)[] = [];
    layersDef.forEach((def: unknown, index: number) => {
        const d = def as { id?: string };
        if (d && d.id && defaultThemeLayerIds.has(d.id)) immediateTasks.push(tasks[index]);
        else deferredTasks.push(tasks[index]);
    });
    Log.info(`[GeoLeaf.GeoJSON] Smart loading: ${immediateTasks.length} immédiate(s) (thème par défaut), ${deferredTasks.length} différée(s)`);
    return (this as typeof Loader)._loadLayersByBatch(immediateTasks, batchSize, batchDelay).then((layers: unknown[]) => {
        const loadedLayers = layers.filter(Boolean);
        Log.info("[GeoLeaf.GeoJSON] Phase 1 : " + loadedLayers.length + " couche(s) du thème par défaut chargée(s)");
        if (loadedLayers.length > 0 && (_g as any).GeoLeaf && (_g as any).GeoLeaf._GeoJSONLayerManager) {
            (_g as any).GeoLeaf._GeoJSONLayerManager.registerWithLayerManager();
        }
        if (baseOptions.fitBoundsOnLoad !== false && state.map && state.layerGroup) {
            const bounds = (state.layerGroup as any).getBounds();
            if (bounds.isValid()) {
                const fitOptions: { maxZoom?: number } = {};
                if (typeof (baseOptions as any).maxZoomOnFit === "number") fitOptions.maxZoom = (baseOptions as any).maxZoomOnFit;
                (state.map as any).fitBounds(bounds, fitOptions);
                Log.debug("[GeoLeaf.GeoJSON] Carte ajustée sur l'emprise des couches GeoJSON");
                const onMoveEnd = function () {
                    (state.map as any).off('moveend', onMoveEnd);
                    try { document.dispatchEvent(new CustomEvent('geoleaf:fitbounds:complete', { detail: { bounds } })); } catch (_e) { /* ignore */ }
                };
                (state.map as any).on('moveend', onMoveEnd);
            }
        }
        try { (state.map as any).fire("geoleaf:geojson:layers-loaded", { count: loadedLayers.length, layers: loadedLayers.map((l: any) => ({ id: l.id, label: l.label })) }); } catch (_e) { /* ignore */ }
        try { document.dispatchEvent(new CustomEvent('geoleaf:layers:initial-loaded', { detail: { count: loadedLayers.length, deferred: deferredTasks.length } })); } catch (_e) { /* ignore */ }
        if (deferredTasks.length > 0) {
            (self._loadLayersInIdle(deferredTasks) as Promise<unknown[]>).then((loadedDeferred: unknown[]) => {
                const loadedDeferredFiltered = loadedDeferred.filter(Boolean);
                Log.info("[GeoLeaf.GeoJSON] Phase 2 : " + loadedDeferredFiltered.length + " couche(s) différée(s) chargée(s) en arrière-plan");
                if (loadedDeferredFiltered.length > 0 && (_g as any).GeoLeaf && (_g as any).GeoLeaf._GeoJSONLayerManager) {
                    (_g as any).GeoLeaf._GeoJSONLayerManager.registerWithLayerManager();
                }
                try { (state.map as any).fire("geoleaf:geojson:deferred-layers-loaded", { count: loadedDeferredFiltered.length, layers: loadedDeferredFiltered.map((l: any) => ({ id: l.id, label: l.label })) }); } catch (_e) { /* ignore */ }
            }).catch((err: unknown) => Log.error("[GeoLeaf.GeoJSON] Erreur chargement couches différées :", err));
        }
        return loadedLayers;
    });
};

Loader._loadLayersByBatch = async function (tasks: (() => Promise<unknown>)[], batchSize = 3, delayMs = 200): Promise<unknown[]> {
    const results: unknown[] = [];
    const Log = getLog();
    for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const batchStart = Date.now();
        const batchResults = await Promise.all(batch.map(fn => fn()));
        results.push(...batchResults);
        Log.info(`[GeoLeaf.GeoJSON] Lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)} chargé en ${Date.now() - batchStart} ms`);
        if (i + batchSize < tasks.length && delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return results;
};

Loader._getDefaultThemeLayerIds = function (profile: ProfileLike): Set<string> {
    try {
        if (!profile || !profile.themes) return new Set();
        const themesData = profile.themes;
        const defaultThemeId = (themesData.config && themesData.config.defautTheme) || (themesData as any).defaultTheme || null;
        if (!defaultThemeId || !Array.isArray((themesData as any).themes)) return new Set();
        const defaultTheme = (themesData as any).themes.find((t: { id: string }) => t.id === defaultThemeId);
        if (!defaultTheme || !Array.isArray(defaultTheme.layers)) return new Set();
        return new Set(defaultTheme.layers.filter((l: { visible?: boolean }) => l.visible !== false).map((l: { id: string }) => l.id));
    } catch (_e) {
        return new Set();
    }
};

Loader._loadLayersInIdle = function (tasks: (() => Promise<unknown>)[], batchSize = 2): Promise<unknown[]> {
    const Log = getLog();
    return new Promise((resolve) => {
        const results: unknown[] = [];
        let index = 0;
        const schedule = typeof requestIdleCallback === 'function' ? (cb: () => void) => requestIdleCallback(cb, { timeout: 3000 }) : (cb: () => void) => setTimeout(cb, 60);
        const processNext = () => {
            if (index >= tasks.length) { resolve(results); return; }
            schedule(async () => {
                const batch = tasks.slice(index, index + batchSize);
                const batchResults = await Promise.all(batch.map(fn => fn()));
                results.push(...batchResults);
                Log.debug(`[GeoLeaf.GeoJSON] Idle: lot ${Math.floor(index / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)} (${results.length}/${tasks.length} traitées)`);
                index += batchSize;
                processNext();
            });
        };
        processNext();
    });
};

Loader.loadAllLayersConfigsForLayerManager = async function (profile: ProfileLike): Promise<unknown[]> {
    const Log = getLog();
    if (!profile || !(profile as any).layers || !Array.isArray((profile as any).layers)) {
        Log.warn("[GeoLeaf.GeoJSON] loadAllLayersConfigsForLayerManager: Pas de couches dans le profil");
        return [];
    }
    const layers = (profile as any).layers as { id: string; label?: string; layerManagerId?: string; configFile?: string; config?: { zIndex?: number; themes?: unknown; styles?: unknown; labels?: unknown }; styles?: unknown; labels?: unknown }[];
    Log.info(`[GeoLeaf.GeoJSON] Préparation de ${layers.length} configurations de couches pour LayerManager...`);
    const allConfigs = layers.map(layer => {
        let styles = null;
        let labels = null;
        if (layer.config && layer.config.styles) styles = layer.config.styles;
        else if (layer.styles) styles = layer.styles;
        if (layer.config && layer.config.labels) labels = layer.config.labels;
        else if (layer.labels) labels = layer.labels;
        return {
            id: layer.id,
            label: layer.label,
            layerManagerId: layer.layerManagerId || "geojson-default",
            configFile: layer.configFile,
            zIndex: (layer.config && layer.config.zIndex) || 0,
            themes: (layer.config && layer.config.themes) || null,
            styles,
            labels
        };
    });
    Log.info("[GeoLeaf.GeoJSON] " + allConfigs.length + " configurations prêtes pour LayerManager");
    (_g as any).GeoLeaf._allLayerConfigs = allConfigs;
    return allConfigs;
};

export { Loader as LoaderProfile };
