/**
 * src/layers/index.js — Shim: aggregates layer management functions for legacy test paths
 * Tests expect: Layers, createGeoJSONLayer, createRouteLayer, getLayer, getAllLayers,
 *               showLayer, hideLayer, toggleLayer, removeLayer, fitLayerBounds,
 *               updateLayerStyle, filterLayerFeatures, batchAddLayers
 * @see src/modules/geoleaf.layer-manager.js
 */

// Internal registry for layers added via this module
const _layers = new Map();

export const createGeoJSONLayer = (config: any = {}) => {
    const id = config.id || `layer_${Date.now()}`;
    const L =
        (typeof globalThis !== "undefined" && (globalThis as any).L) ||
        (typeof window !== "undefined" && (window as any).L);
    const layer = L ? L.geoJSON(config.data || null, config.options || {}) : { _stub: true, id };
    _layers.set(id, { id, layer, config, visible: true });
    return layer;
};

export const createRouteLayer = (config: any = {}) => {
    const id = config.id || `route_${Date.now()}`;
    const L =
        (typeof globalThis !== "undefined" && (globalThis as any).L) ||
        (typeof window !== "undefined" && (window as any).L);
    const layer = L ? L.featureGroup() : { _stub: true, id };
    _layers.set(id, { id, layer, config, visible: true });
    return layer;
};

export const getLayer = (id: any) => {
    const entry = _layers.get(id);
    return entry ? entry.layer : null;
};

export const getAllLayers = () => {
    return Array.from(_layers.values());
};

export const showLayer = (id: any, map: any) => {
    const entry = _layers.get(id);
    if (!entry) return;
    entry.visible = true;
    if (map && entry.layer && typeof entry.layer.addTo === "function") entry.layer.addTo(map);
};

export const hideLayer = (id: any, map: any) => {
    const entry = _layers.get(id);
    if (!entry) return;
    entry.visible = false;
    if (map && entry.layer && typeof map.removeLayer === "function") map.removeLayer(entry.layer);
};

export const toggleLayer = (id: any, map: any) => {
    const entry = _layers.get(id);
    if (!entry) return;
    if (entry.visible) hideLayer(id, map);
    else showLayer(id, map);
};

export const removeLayer = (id: any, map: any) => {
    const entry = _layers.get(id);
    if (!entry) return;
    if (map && entry.layer && typeof map.removeLayer === "function") map.removeLayer(entry.layer);
    _layers.delete(id);
};

export const fitLayerBounds = (id: any, map: any) => {
    const entry = _layers.get(id);
    if (!entry || !map) return;
    try {
        const bounds = typeof entry.layer.getBounds === "function" ? entry.layer.getBounds() : null;
        if (bounds && typeof map.fitBounds === "function") map.fitBounds(bounds);
    } catch (_) {
        /* noop */
    }
};

export const updateLayerStyle = (id: any, style: any = {}) => {
    const entry = _layers.get(id);
    if (!entry) return;
    if (typeof entry.layer.setStyle === "function") entry.layer.setStyle(style);
};

export const filterLayerFeatures = (id: any, predicate: any) => {
    const entry = _layers.get(id);
    if (!entry || typeof entry.layer.getLayers !== "function") return [];
    return entry.layer.getLayers().filter((l: any) => predicate(l.feature || l));
};

export const batchAddLayers = (configs: any[] = [], map: any) => {
    return configs.map((config: any) => {
        const layer =
            config.type === "route" ? createRouteLayer(config) : createGeoJSONLayer(config);
        if (map && layer && typeof layer.addTo === "function") layer.addTo(map);
        return layer;
    });
};

/** Aggregate facade */
export const Layers = {
    createGeoJSONLayer,
    createRouteLayer,
    getLayer,
    getAllLayers,
    showLayer,
    hideLayer,
    toggleLayer,
    removeLayer,
    fitLayerBounds,
    updateLayerStyle,
    filterLayerFeatures,
    batchAddLayers,
    _registry: _layers,
};
