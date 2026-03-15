/* eslint-disable security/detect-object-injection */
/*!

 * GeoLeaf Core – Baselayers / Registry

 * © 2026 Mattieu Pottier

 * Released under the MIT License

 */

import { Log } from "../log/index.js";

import { DEFAULT_BASELAYERS, normalizeOptions, applyLibertyFilters } from "./providers.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

// ---------------------------------------------------------

// STATE internal shared

// ---------------------------------------------------------

let _map: any = null;

let _activeKey: any = null;

export const _baseLayers = Object.create(null);

// ---------------------------------------------------------

// Resolution de the map

// ---------------------------------------------------------

export function ensureMap(explicitMap?: any) {
    if (explicitMap && typeof explicitMap.setView === "function") {
        _map = explicitMap;

        Log.info("[GeoLeaf.Baselayers] ensureMap: using explicit map passed to init().");

        return;
    }

    if (_map && typeof _map.setView === "function") return;

    const mh = _g.GeoLeaf?.Utils?.MapHelpers;

    const resolved = mh && typeof mh.ensureMap === "function" ? mh.ensureMap() : null;

    if (resolved) {
        _map = resolved;

        Log.info("[GeoLeaf.Baselayers] ensureMap: acquired via MapHelpers.ensureMap().");
    }
}

export function setMap(mapInstance: any) {
    _map = mapInstance;
}

export function getInternalMap() {
    return _map;
}

// ---------------------------------------------------------

// Registersment des layers

// ---------------------------------------------------------

// Registersment des layers (helpers)

// ---------------------------------------------------------

function _buildMaplibreLayer(L: any, definition: any, actualKey: any): any {
    if (typeof L.maplibreGL === "function") {
        const mlOptions = {
            style: definition.style,

            attribution: definition.attribution || "",

            interactive: false,

            padding: 0.25,

            maplibreOptions: {
                preserveDrawingBuffer: true,

                trackResize: true,

                fadeDuration: 0,
            },
        };

        const layerInstance = L.maplibreGL(mlOptions);

        layerInstance.once("add", function () {
            const glMap = layerInstance.getMaplibreMap && layerInstance.getMaplibreMap();

            if (glMap) {
                glMap.once("styledata", function () {
                    applyLibertyFilters(glMap);
                });
            }
        });

        Log.info("[GeoLeaf.Baselayers] MapLibre vector basemap created:", actualKey);

        return layerInstance;
    } else {
        Log.warn(
            "[GeoLeaf.Baselayers] MapLibre GL plugin not loaded. Raster fallback for :",

            actualKey
        );

        const fallbackUrl = definition.url || definition.fallbackUrl;

        return fallbackUrl
            ? L.tileLayer(fallbackUrl, normalizeOptions(definition))
            : L.tileLayer(DEFAULT_BASELAYERS.street.url, DEFAULT_BASELAYERS.street.options);
    }
}

function _resolveLayerInstance(L: any, definition: any, actualKey: any): any {
    if (definition instanceof L.TileLayer) return definition;

    if (definition.layer && definition.layer instanceof L.TileLayer) return definition.layer;

    if (definition.type === "maplibre" || definition.style)
        return _buildMaplibreLayer(L, definition, actualKey);

    if (definition.url) return L.tileLayer(definition.url, normalizeOptions(definition));

    Log.warn(
        "[GeoLeaf.Baselayers] Invalid definition for layer :",
        actualKey,
        "(no url / no layer provided)"
    );

    return null;
}

export function registerBaseLayer(key: any, definition: any) {
    const L = _g.L;

    if (!key) {
        Log.warn("[GeoLeaf.Baselayers] registerBaseLayer called without key.");

        return;
    }

    if (!definition) {
        Log.warn("[GeoLeaf.Baselayers] Missing definition for layer:", key);

        return;
    }

    const actualKey = definition.id || key;

    const label = definition.label || actualKey;

    const layerInstance = _resolveLayerInstance(L, definition, actualKey);

    if (!layerInstance) return;

    _baseLayers[actualKey] = { key: actualKey, label, layer: layerInstance };
}

export function registerBaseLayers(definitions: any) {
    if (!definitions || typeof definitions !== "object") {
        Log.warn("[GeoLeaf.Baselayers] registerBaseLayers expects a definitions object.");

        return;
    }

    Object.keys(definitions).forEach((key) => registerBaseLayer(key, definitions[key]));
}

export function registerDefaultBaseLayers() {
    const L = _g.L;

    if (!L) return;

    Object.keys(DEFAULT_BASELAYERS).forEach((key) => {
        if (!_baseLayers[key]) registerBaseLayer(key, DEFAULT_BASELAYERS[key]);
    });
}

// ---------------------------------------------------------

// Activation de layer (helpers)

// ---------------------------------------------------------

function _removePreviousBaseLayer(previousKey: any): void {
    if (!previousKey || !_baseLayers[previousKey]) return;

    const prev = _baseLayers[previousKey].layer;

    try {
        if (prev && _map && typeof _map.hasLayer === "function" && _map.hasLayer(prev)) {
            _map.removeLayer(prev);
        }
    } catch (e) {
        Log.warn("[GeoLeaf.Baselayers] Cannot remove previous layer:", e);
    }
}

export function setBaseLayer(key: any, options: any = {}) {
    if (!key) {
        Log.warn("[GeoLeaf.Baselayers] setBaseLayer called without key.");

        return;
    }

    const previousKey = _activeKey;

    ensureMap();

    Log.info("[GeoLeaf.Baselayers] setBaseLayer:", key, "_map=", !!_map);

    if (!_map) {
        Log.warn("[GeoLeaf.Baselayers] No L.Map available.");

        return;
    }

    if (!_baseLayers[key]) {
        Log.warn("[GeoLeaf.Baselayers] Unknown layer :", key);

        const keys = Object.keys(_baseLayers);

        if (!previousKey && keys.length > 0) {
            setBaseLayer(keys[0], { silent: true });
        }

        return;
    }

    if (_activeKey === key) {
        // Signal UI refresh

        return;
    }

    _removePreviousBaseLayer(previousKey);

    const nextLayer = _baseLayers[key].layer;

    if (typeof nextLayer?.addTo !== "function") {
        Log.error("[GeoLeaf.Baselayers] Invalid layer for key:", key);

        return;
    }

    try {
        nextLayer.addTo(_map);
    } catch (e) {
        Log.error("[GeoLeaf.Baselayers] Cannot add layer:", e);

        return;
    }

    _activeKey = key;

    Log.info("[GeoLeaf.Baselayers] Active layer :", key);

    if (!options.silent) {
        _dispatchBasemapChange(key, previousKey, nextLayer);
    }
}

function _dispatchBasemapChange(key: any, previousKey: any, layer: any) {
    if (typeof document === "undefined" || typeof document.dispatchEvent !== "function") return;

    const detail = { key, previousKey, map: _map, layer, source: "geoleaf.baselayers" };

    try {
        document.dispatchEvent(new CustomEvent("geoleaf:basemap:change", { detail }));
    } catch (err) {
        Log.warn("[GeoLeaf.Baselayers] Cannot dispatch geoleaf:basemap:change.", err);
    }
}

// ---------------------------------------------------------

// Accesseurs

// ---------------------------------------------------------

export function getBaseLayers() {
    return Object.assign({}, _baseLayers);
}

export function getActiveKey() {
    return _activeKey;
}

export function getActiveLayer() {
    return _activeKey && _baseLayers[_activeKey] ? _baseLayers[_activeKey].layer : null;
}
