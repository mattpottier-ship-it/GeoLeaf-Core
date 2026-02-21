/**
 * src/markers/index.js — Shim: aggregates marker functions for legacy test paths
 * Tests expect: Markers, createMarker, createMarkerCluster, batchAddMarkers,
 *               removeMarkers, updateMarkerPosition, updateMarkerStyle, getMarkerData
 * @see src/modules/poi/markers.js
 */
import { POIMarkers } from '../modules/poi/markers.js';

/** Proxy onto POIMarkers.createMarker */
export const createMarker = (...args) => POIMarkers.createMarker(...args);

/** Create a marker cluster group (leaflet.markercluster) — stub when unavailable */
export const createMarkerCluster = (options = {}) => {
    if (typeof window !== 'undefined' && window.L && window.L.markerClusterGroup) {
        return window.L.markerClusterGroup(options);
    }
    if (typeof globalThis !== 'undefined' && globalThis.L && globalThis.L.markerClusterGroup) {
        return globalThis.L.markerClusterGroup(options);
    }
    // Stub cluster group
    const markers = [];
    return {
        addLayer: (m) => markers.push(m),
        removeLayers: (ms) => ms.forEach(m => { const i = markers.indexOf(m); if (i > -1) markers.splice(i, 1); }),
        clearLayers: () => markers.splice(0),
        getLayers: () => [...markers],
        addTo: (map) => { if (map && typeof map.addLayer === 'function') map.addLayer({ _cluster: true }); },
    };
};

/** Batch-add an array of POIs as markers to a map/cluster */
export const batchAddMarkers = (pois, map, options = {}) => {
    if (!Array.isArray(pois)) return [];
    return pois.map(poi => {
        try { return createMarker(poi, options); } catch (_) { return null; }
    }).filter(Boolean);
};

/** Remove an array of markers from the map */
export const removeMarkers = (markers, map) => {
    if (!Array.isArray(markers) || !map) return;
    markers.forEach(m => {
        try { if (m && typeof m.remove === 'function') m.remove(); } catch (_) { /* noop */ }
    });
};

/** Update position of a Leaflet marker */
export const updateMarkerPosition = (marker, latlng) => {
    if (marker && typeof marker.setLatLng === 'function') {
        marker.setLatLng(latlng);
    }
};

/** Update marker style (icon or options) */
export const updateMarkerStyle = (marker, style = {}) => {
    if (!marker) return;
    if (style.icon && typeof marker.setIcon === 'function') {
        marker.setIcon(style.icon);
    }
    if (style.opacity !== undefined && typeof marker.setOpacity === 'function') {
        marker.setOpacity(style.opacity);
    }
};

/** Retrieve POI data attached to a marker */
export const getMarkerData = (marker) => {
    if (!marker) return null;
    return marker._poiData || marker.options?.data || null;
};

/** Aggregate facade object */
export const Markers = {
    createMarker,
    createMarkerCluster,
    batchAddMarkers,
    removeMarkers,
    updateMarkerPosition,
    updateMarkerStyle,
    getMarkerData,
    // Expose internals from POIMarkers for advanced usage
    ...POIMarkers,
};
