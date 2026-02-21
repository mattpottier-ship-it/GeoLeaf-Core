/*!
 * GeoLeaf Core – Baselayers / Registry
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

import { Log } from "../log/index.js";
import { DEFAULT_BASELAYERS, normalizeOptions, applyLibertyFilters } from "./providers.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

// ---------------------------------------------------------
// État interne partagé
// ---------------------------------------------------------
let _map = null;
let _activeKey = null;
export const _baseLayers = Object.create(null);

// ---------------------------------------------------------
// Résolution de la carte
// ---------------------------------------------------------
export function ensureMap(explicitMap) {
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

export function setMap(mapInstance) {
    _map = mapInstance;
}

export function getInternalMap() {
    return _map;
}

// ---------------------------------------------------------
// Enregistrement des couches
// ---------------------------------------------------------
export function registerDefaultBaseLayers() {
    const L = _g.L;
    if (!L) return;
    Object.keys(DEFAULT_BASELAYERS).forEach((key) => {
        if (!_baseLayers[key]) registerBaseLayer(key, DEFAULT_BASELAYERS[key]);
    });
}

export function registerBaseLayer(key, definition) {
    const L = _g.L;
    if (!key) {
        Log.warn("[GeoLeaf.Baselayers] registerBaseLayer appelé sans clé.");
        return;
    }
    if (!definition) {
        Log.warn("[GeoLeaf.Baselayers] Définition manquante pour la couche :", key);
        return;
    }

    const actualKey = definition.id || key;
    let layerInstance = null;
    const label = definition.label || actualKey;

    if (definition instanceof L.TileLayer) {
        layerInstance = definition;
    } else if (definition.layer && definition.layer instanceof L.TileLayer) {
        layerInstance = definition.layer;
    } else if (definition.type === "maplibre" || definition.style) {
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
            layerInstance = L.maplibreGL(mlOptions);
            layerInstance.once("add", function () {
                const glMap = layerInstance.getMaplibreMap && layerInstance.getMaplibreMap();
                if (glMap) {
                    glMap.once("styledata", function () {
                        applyLibertyFilters(glMap);
                    });
                }
            });
            Log.info("[GeoLeaf.Baselayers] Basemap vectorielle MapLibre créée :", actualKey);
        } else {
            Log.warn(
                "[GeoLeaf.Baselayers] MapLibre GL plugin non chargé. Fallback raster pour :",
                actualKey
            );
            const fallbackUrl = definition.url || definition.fallbackUrl;
            layerInstance = fallbackUrl
                ? L.tileLayer(fallbackUrl, normalizeOptions(definition))
                : L.tileLayer(DEFAULT_BASELAYERS.street.url, DEFAULT_BASELAYERS.street.options);
        }
    } else if (definition.url) {
        layerInstance = L.tileLayer(definition.url, normalizeOptions(definition));
    } else {
        Log.warn(
            "[GeoLeaf.Baselayers] Définition invalide pour la couche :",
            actualKey,
            "(aucune url / aucun layer fourni)"
        );
        return;
    }

    _baseLayers[actualKey] = { key: actualKey, label, layer: layerInstance };
}

export function registerBaseLayers(definitions) {
    if (!definitions || typeof definitions !== "object") {
        Log.warn("[GeoLeaf.Baselayers] registerBaseLayers attend un objet de définitions.");
        return;
    }
    Object.keys(definitions).forEach((key) => registerBaseLayer(key, definitions[key]));
}

// ---------------------------------------------------------
// Activation de couche
// ---------------------------------------------------------
export function setBaseLayer(key, options) {
    options = options || {};
    if (!key) {
        Log.warn("[GeoLeaf.Baselayers] setBaseLayer appelé sans clé.");
        return;
    }

    const previousKey = _activeKey;
    ensureMap();

    Log.info("[GeoLeaf.Baselayers] setBaseLayer:", key, "_map=", !!_map);

    if (!_map) {
        Log.warn("[GeoLeaf.Baselayers] Aucun L.Map disponible.");
        return;
    }

    if (!_baseLayers[key]) {
        Log.warn("[GeoLeaf.Baselayers] Couche inconnue :", key);
        const keys = Object.keys(_baseLayers);
        if (!previousKey && keys.length > 0) {
            setBaseLayer(keys[0], { silent: true });
        }
        return;
    }

    if (_activeKey === key) {
        // Signal UI refresh — ui.js écoute via l'export refreshUI
        return;
    }

    if (previousKey && _baseLayers[previousKey]) {
        const prev = _baseLayers[previousKey].layer;
        try {
            if (prev && _map && typeof _map.hasLayer === "function" && _map.hasLayer(prev)) {
                _map.removeLayer(prev);
            }
        } catch (e) {
            Log.warn("[GeoLeaf.Baselayers] Impossible de retirer la couche précédente:", e);
        }
    }

    const nextLayer = _baseLayers[key].layer;
    if (!nextLayer || typeof nextLayer.addTo !== "function") {
        Log.error("[GeoLeaf.Baselayers] Couche invalide pour la clé:", key);
        return;
    }

    try {
        nextLayer.addTo(_map);
    } catch (e) {
        Log.error("[GeoLeaf.Baselayers] Impossible d'ajouter la couche:", e);
        return;
    }

    _activeKey = key;
    Log.info("[GeoLeaf.Baselayers] Couche active :", key);

    if (!options.silent) {
        _dispatchBasemapChange(key, previousKey, nextLayer);
    }
}

function _dispatchBasemapChange(key, previousKey, layer) {
    if (typeof document === "undefined" || typeof document.dispatchEvent !== "function") return;
    const detail = { key, previousKey, map: _map, layer, source: "geoleaf.baselayers" };
    try {
        document.dispatchEvent(new CustomEvent("geoleaf:basemap:change", { detail }));
    } catch (err) {
        Log.warn("[GeoLeaf.Baselayers] Impossible d'émettre geoleaf:basemap:change.", err);
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
