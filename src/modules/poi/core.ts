/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Core
 * Fonctions maines d'initialization, loading et gestion des POI
 */
import { Log } from "../log/index.js";
import { Config } from "../config/config-primitives.js";
import { StorageContract } from "../shared/storage-contract.js";
import { POIShared } from "./shared.ts";
import { POIMarkers } from "./markers.ts";
import { POISidepanel } from "./sidepanel.ts";
import { POINormalizers } from "./normalizers.ts";

// References to POI modules

/**
 * Fonction maine d'initialization of the module POI.
 *
 * @param {L.Map|object} mapOrOptions - Instance de the map Leaflet ou object {map, config}.
 * @param {object} config - Configuration POI from globalThis.GeoLeaf.config.json (optional si premier param est object).
 */
function _resolveInitParams(mapOrOptions: any, config?: any): { map: any; opts: any } {
    if (mapOrOptions && typeof mapOrOptions === "object" && mapOrOptions.map) {
        return { map: mapOrOptions.map, opts: mapOrOptions.config || mapOrOptions };
    }
    return { map: mapOrOptions, opts: config };
}

function _setupPoiClustering(state: any, constants: any, L: any): void {
    const clustering = state.poiConfig.clustering !== false;
    if (!clustering) return;
    if (typeof L === "undefined") return;
    if (typeof L.markerClusterGroup !== "function") return;
    state.poiClusterGroup = L.markerClusterGroup({
        maxClusterRadius: state.poiConfig.clusterRadius || 80,
        disableClusteringAtZoom: state.poiConfig.disableClusteringAtZoom || constants.POI_MAX_ZOOM,
        animate: false,
        showCoverageOnHover: false,
    });
    state.mapInstance.addLayer(state.poiClusterGroup);
    if (Log) Log.info("[POI] Clustering enabled (MarkerClusterGroup created).");
}

function _initPoiSidePanel(): void {
    if (!POISidepanel) return;
    if (typeof POISidepanel.createSidePanel !== "function") return;
    POISidepanel.createSidePanel();
}

async function _initPoiSprite(): Promise<void> {
    if (!POIMarkers) return;
    if (typeof POIMarkers.ensureProfileSpriteInjectedSync !== "function") return;
    await POIMarkers.ensureProfileSpriteInjectedSync();
}

function _validatePoiMap(map: any): boolean {
    if (!map) return false;
    if (typeof map.addLayer !== "function") return false;
    return true;
}

function _scheduleLoadOnStorageReady(): void {
    const onStorageReady = () => {
        document.removeEventListener("geoleaf:storage:ready", onStorageReady);
        loadAndDisplay();
    };
    document.addEventListener("geoleaf:storage:ready", onStorageReady, { once: true });
    if (document.readyState !== "loading") {
        Promise.resolve().then(() => {
            document.removeEventListener("geoleaf:storage:ready", onStorageReady);
            loadAndDisplay();
        });
        return;
    }
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            document.removeEventListener("geoleaf:storage:ready", onStorageReady);
            loadAndDisplay();
        },
        { once: true }
    );
}

async function init(mapOrOptions: any, config?: any) {
    const { map, opts } = _resolveInitParams(mapOrOptions, config);
    if (!_validatePoiMap(map)) {
        if (Log) Log.error("[POI] No valid Leaflet map provided. Cannot initialize POI module.");
        return;
    }
    const shared = POIShared;
    if (!shared) {
        if (Log) Log.error("[POI] Module shared not loaded.");
        return;
    }
    const state = shared.state;
    const constants = shared.constants;
    state.mapInstance = map;
    state.poiConfig = opts || {};
    if (Log) Log.info("[POI] Initializing POI module...");
    if (shared.ensureMapMaxZoom) shared.ensureMapMaxZoom(map, constants.POI_MAX_ZOOM);
    const L = (globalThis as any).L;
    state.poiLayerGroup = L.layerGroup().addTo(map);
    _setupPoiClustering(state, constants, L);
    _initPoiSidePanel();
    await _initPoiSprite();
    if (state.poiConfig.enabled === false) return;
    if (StorageContract.isAvailable()) {
        loadAndDisplay();
        return;
    }
    _scheduleLoadOnStorageReady();
}

/**
 * ✅ NEW FUNCTION: Loads and merges locally stored POIs with existing POIs
 */
function _detectWrappedPoiItem(
    item: any
): { isPoi: boolean; poiData: any; itemAction: string } | null {
    if (!item.data) return null;
    if (item.data.type !== "poi") return null;
    if (!item.action) return null;
    const actionStr = item.action as string;
    if (!actionStr.includes("add") && !actionStr.includes("update")) return null;
    return { isPoi: true, poiData: item.data, itemAction: item.action };
}

function _hasPoiCoords(item: any): boolean {
    if (item.latlng) return true;
    if (item.latitude) return true;
    return false;
}

function _detectHeuristicPoiInData(
    item: any
): { isPoi: boolean; poiData: any; itemAction: string } | null {
    if (!item.data) return null;
    const d = item.data;
    if (!d.id && !d.latlng && !d.latitude) return null;
    const hintId = d.id || "no-id";
    if (Log) Log.info(`[POI] Heuristic POI detection: ${hintId}`);
    return { isPoi: true, poiData: d, itemAction: item.action || "add" };
}

function _detectDirectPoiItem(
    item: any
): { isPoi: boolean; poiData: any; itemAction: string } | null {
    if (item.type === "poi")
        return { isPoi: true, poiData: item, itemAction: item.action || "add" };
    const heuristic = _detectHeuristicPoiInData(item);
    if (heuristic) return heuristic;
    if (!item.id) return null;
    if (!_hasPoiCoords(item)) return null;
    if (Log) Log.info(`[POI] Direct POI detection: ${item.id}`);
    return { isPoi: true, poiData: item, itemAction: "add" };
}

function _detectQueueItemFormat(item: any): {
    isPoi: boolean;
    poiData: any;
    itemAction: string | null;
} {
    if (!item) return { isPoi: false, poiData: null, itemAction: null };
    const wrapped = _detectWrappedPoiItem(item);
    if (wrapped) return wrapped;
    const direct = _detectDirectPoiItem(item);
    if (direct) return direct;
    return { isPoi: false, poiData: null, itemAction: null };
}

function _processPoiQueueItem(item: any, normalizers: any, cachedPois: any[]): void {
    const { isPoi, poiData, itemAction } = _detectQueueItemFormat(item);
    if (!isPoi || !poiData) {
        if (Log)
            Log.debug(
                `[POI] Item ignored - action: ${item.action}, type: ${item.type || (item.data && item.data.type)}, keys: ${Object.keys(item).join(",")}`
            );
        return;
    }
    const normalizedPoi = normalizers.normalizePoi(poiData);
    if (!normalizedPoi) {
        if (Log) Log.warn("[POI] Failed to normalize cached POI:", poiData);
        return;
    }
    cachedPois.push(normalizedPoi);
    if (Log)
        Log.info(
            `[POI] Cached POI normalized: ${normalizedPoi.id || "No ID"} (action: ${itemAction})`
        );
}

function _mergeWithoutDuplicates(existingPois: any[], cachedPois: any[]): any[] {
    const merged = [...existingPois];
    for (const cachedPoi of cachedPois) {
        const duplicate = merged.find((p: any) => p.id === cachedPoi.id);
        if (!duplicate) merged.push(cachedPoi);
    }
    return merged;
}

function _waitForStorage(checkStorageAvailable: () => boolean, existingPois: any, callback: any) {
    if (Log)
        Log.warn(
            "[POI] Module Storage pas encore pr\u00eat, attente \u00e9v\u00e9nement geoleaf:storage:ready..."
        );
    const onReady = () => {
        if (checkStorageAvailable()) {
            loadAndMergeStoredPois(existingPois, callback);
        } else {
            if (Log) Log.error("[POI] Storage module still not available, aborting.");
            callback(existingPois);
        }
    };
    document.addEventListener("geoleaf:storage:ready", onReady, { once: true });
    Promise.resolve().then(() => {
        if (!checkStorageAvailable()) {
            document.removeEventListener("geoleaf:storage:ready", onReady);
            callback(existingPois);
        }
    });
}

function _onStorageQueueLoaded(queueItems: any[], existingPois: any, callback: any) {
    if (Log) Log.info(`[POI] Cache retrieval: ${queueItems.length} items found`);
    if (!Array.isArray(queueItems) || queueItems.length === 0) {
        if (Log) Log.info("[POI] No POI found in the sync queue.");
        callback(existingPois);
        return;
    }
    if (Log) {
        const itemTypes = queueItems.map(
            (item: any) => `${item.action}:${item.data?.type || "no-type"}`
        );
        Log.info(`[POI] Item types in cache: [${itemTypes.join(", ")}]`);
        queueItems.slice(0, 2).forEach((item: any, i: number) => {
            Log.info(`[POI] DEBUG Item ${i}:`, {
                action: item.action,
                type: item.type,
                data_type: item.data?.type,
                keys: Object.keys(item),
                data_keys: item.data ? Object.keys(item.data) : "no data",
            });
        });
    }
    const cachedPois: any[] = [];
    const normalizers = POINormalizers;
    if (!normalizers) {
        if (Log) Log.error("[POI] Normalizers module not available for cached POIs.");
        callback(existingPois);
        return;
    }
    queueItems.forEach((item: any) => {
        _processPoiQueueItem(item, normalizers, cachedPois);
    });
    if (cachedPois.length > 0) {
        if (Log) Log.info(`[POI] ${cachedPois.length} POI(s) retrieved from local cache.`);
        callback(_mergeWithoutDuplicates(existingPois, cachedPois));
    } else {
        callback(existingPois);
    }
}

function loadAndMergeStoredPois(existingPois: any, callback: any) {
    if (typeof callback !== "function") {
        if (Log) Log.error("[POI] loadAndMergeStoredPois: callback required");
        return;
    }
    const StorageAny = StorageContract as any;
    const checkStorageAvailable = () =>
        StorageContract.isAvailable() && typeof StorageAny.DB?.getAllFromSyncQueue === "function";
    if (!checkStorageAvailable()) {
        _waitForStorage(checkStorageAvailable, existingPois, callback);
        return;
    }
    if (Log) Log.info("[POI] Storage module available, retrieving POIs...");
    StorageAny.DB.getAllFromSyncQueue()
        .then((queueItems: any[]) => _onStorageQueueLoaded(queueItems, existingPois, callback))
        .catch((err: any) => {
            if (Log) Log.error("[POI] Error retrieving cached POIs :", err);
            callback(existingPois);
        });
}

function _loadFromProfilePois(state: any): boolean {
    const ConfigAny = Config as any;
    if (!ConfigAny) return false;
    if (typeof ConfigAny.getActiveProfilePoi !== "function") return false;
    const profilePois = ConfigAny.getActiveProfilePoi();
    if (!Array.isArray(profilePois)) return false;
    if (profilePois.length === 0) return false;
    state.allPois = profilePois;
    if (Log) Log.info(`[POI] ${state.allPois.length} POI(s) from active profile.`);
    loadAndMergeStoredPois(state.allPois, (mergedPois: any) => {
        state.allPois = mergedPois;
        displayPois(state.allPois);
    });
    return true;
}

function _loadFromDataUrl(state: any): void {
    const dataUrl = state.poiConfig.dataUrl;
    if (!dataUrl) {
        if (Log) Log.info("[POI] No dataUrl specified and no cached POIs. Manual add mode.");
        return;
    }
    state.isLoading = true;
    if (Log) Log.info("[POI] Loading POI data from :", dataUrl);
    fetch(dataUrl)
        .then((response) => {
            if (!response.ok)
                throw new Error(`Erreur HTTP ${response.status} lors du loading de ${dataUrl}`);
            return response.json();
        })
        .then((data: any) => {
            if (Array.isArray(data)) {
                state.allPois = data;
            } else if (data && Array.isArray(data.pois)) {
                state.allPois = data.pois;
            } else {
                state.allPois = [];
            }
            if (Log) Log.info(`[POI] ${state.allPois.length} POI(s) loaded from dataUrl.`);
            displayPois(state.allPois);
        })
        .catch((err: any) => {
            if (Log) Log.error("[POI] Error loading POIs :", err);
        })
        .finally(() => {
            state.isLoading = false;
        });
}

function loadAndDisplay() {
    const shared = POIShared;
    if (!shared) return;
    const state = shared.state;
    if (state.isLoading) {
        if (Log) Log.warn("[POI] Loading already in progress...");
        return;
    }
    try {
        if (_loadFromProfilePois(state)) return;
    } catch (err: any) {
        if (Log) Log.error("[POI] Error retrieving POIs from active profile :", err);
    }
    loadAndMergeStoredPois([], (cachedPois: any[]) => {
        if (cachedPois.length > 0) {
            state.allPois = cachedPois;
            if (Log) Log.info(`[POI] ${cachedPois.length} POI(s) loaded from local cache.`);
            displayPois(cachedPois);
            return;
        }
        _loadFromDataUrl(state);
    });
}

function _clearPoiLayers(state: any): void {
    if (state.poiLayerGroup) state.poiLayerGroup.clearLayers();
    if (state.poiClusterGroup) state.poiClusterGroup.clearLayers();
}

function _getPoiMarkerKey(poi: any): string {
    if (poi.id) return poi.id;
    if (poi.title) return poi.title;
    return poi.label;
}

function _renderPoisClustered(pois: any[], state: any, markers: any): void {
    pois.forEach((poi: any) => {
        const marker = markers.createMarker(poi);
        if (!marker) return;
        state.poiClusterGroup.addLayer(marker);
        state.poiMarkers.set(_getPoiMarkerKey(poi), marker);
    });
    if (!state.mapInstance.hasLayer(state.poiClusterGroup))
        state.mapInstance.addLayer(state.poiClusterGroup);
    if (Log) Log.info("[POI] Display with clustering.");
}

function _renderPoisLayered(pois: any[], state: any, markers: any): void {
    pois.forEach((poi: any) => {
        const marker = markers.createMarker(poi);
        if (!marker) return;
        state.poiLayerGroup.addLayer(marker);
        state.poiMarkers.set(_getPoiMarkerKey(poi), marker);
    });
    if (!state.mapInstance.hasLayer(state.poiLayerGroup))
        state.mapInstance.addLayer(state.poiLayerGroup);
    if (Log) Log.info("[POI] Display without clustering.");
}

/**
 * Displays all POIs passed as parameter on the map.
 *
 * @param {array} pois - Array d'objects POI.
 */
function displayPois(pois: any) {
    if (!pois || !Array.isArray(pois)) {
        if (Log) Log.warn("[POI] displayPois() : No valid POI data to display.");
        return;
    }
    const shared = POIShared;
    if (!shared) return;
    const state = shared.state;
    _clearPoiLayers(state);
    const markers = POIMarkers;
    if (!markers || typeof markers.createMarker !== "function") {
        if (Log) Log.error("[POI] Module Markers not loaded.");
        return;
    }
    const clustering = state.poiConfig.clustering !== false;
    if (clustering && state.poiClusterGroup) {
        _renderPoisClustered(pois, state, markers);
    } else {
        _renderPoisLayered(pois, state, markers);
    }
}

function _validateAndNormalizePoi(poi: any, normalizers: any): any | null {
    const normalizedPoi = normalizers.normalizePoi(poi);
    if (!normalizedPoi) {
        if (Log) Log.warn("[POI] addPoi() : POI normalization failed.", poi);
        return null;
    }
    if (!normalizedPoi.id) normalizedPoi.id = normalizers.generatePoiId(normalizedPoi);
    return normalizedPoi;
}

function _logNormalizedPoiDebug(normalizedPoi: any): void {
    if (!Log) return;
    Log.info("[POI] Adding normalized POI:", normalizedPoi.id);
    Log.info("[POI] - Has _layerConfig:", !!normalizedPoi._layerConfig);
    Log.info("[POI] - Has _sidepanelConfig:", !!normalizedPoi._sidepanelConfig);
    Log.info("[POI] - Has _popupConfig:", !!normalizedPoi._popupConfig);
    Log.info("[POI] - Attributes keys:", Object.keys(normalizedPoi.attributes || {}));
}

function _addPoiToLayers(marker: any, state: any): void {
    const clustering = state.poiConfig.clustering !== false;
    if (clustering && state.poiClusterGroup) {
        state.poiClusterGroup.addLayer(marker);
    } else {
        state.poiLayerGroup.addLayer(marker);
    }
}

/**
 * Adds a POI manually sur the map.
 * FIXED V3: Systematic normalization of new POIs
 *
 * @param {object} poi - Data du POI.
 * @returns {L.Marker|null} Marqueur created ou null.
 */
function addPoi(poi: any) {
    if (!poi) {
        if (Log) Log.warn("[POI] addPoi() : POI invalide.");
        return null;
    }
    const shared = POIShared;
    if (!shared) return null;
    const state = shared.state;
    const normalizers = POINormalizers;
    const markers = POIMarkers;
    if (!normalizers) return null;
    if (!markers) return null;
    const normalizedPoi = _validateAndNormalizePoi(poi, normalizers);
    if (!normalizedPoi) return null;
    _logNormalizedPoiDebug(normalizedPoi);
    const marker = markers.createMarker(normalizedPoi);
    if (!marker) {
        if (Log)
            Log.warn(
                "[POI] addPoi() : Cannot create marker for this normalized POI.",
                normalizedPoi
            );
        return null;
    }
    _addPoiToLayers(marker, state);
    state.allPois.push(normalizedPoi);
    state.poiMarkers.set(normalizedPoi.id, marker);
    if (Log) Log.info("[POI] \u2705 Normalized POI added successfully :", normalizedPoi.id);
    return marker;
}

/**
 * Retrieves tous les POI loadeds.
 *
 * @returns {array} Array des POI.
 */
function getAllPois() {
    const shared = POIShared;
    return shared ? shared.state.allPois : [];
}

/**
 * Retrieves un POI par son ID.
 *
 * @param {string} id - ID du POI.
 * @returns {object|null} POI found ou null.
 */
function getPoiById(id: any) {
    const shared = POIShared;
    if (!shared) return null;
    const state = shared.state;

    return state.allPois.find((p: any) => p.id === id) || null;
}

/**
 * Reloads POIs (clears and re-displays).
 *
 * @param {array} pois - Nouveau array de POI (optional).
 */
function reload(pois?: any) {
    const shared = POIShared;
    if (!shared) return;
    const state = shared.state;

    if (pois && Array.isArray(pois)) {
        state.allPois = pois;
    }

    displayPois(state.allPois);

    if (Log) Log.info("[POI] POIs reloaded.");
}

// ========================================
//   EXPORT
// ========================================

const POICore = {
    init,
    loadAndDisplay,
    displayPois,
    addPoi,
    getAllPois,
    getPoiById,
    reload,
    getDisplayedPoisCount: function () {
        const shared = POIShared;
        return shared && shared.state ? (shared.state.allPois || []).length : 0;
    },
};

// ── ESM Export ──
export { POICore };
