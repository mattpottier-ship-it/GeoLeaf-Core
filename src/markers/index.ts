/**
 * src/markers/index.js — Shim: aggregates marker functions for legacy test paths
 * Tests expect: Markers, createMarker, createMarkerCluster, batchAddMarkers,
 *               removeMarkers, updateMarkerPosition, updateMarkerStyle, getMarkerData
 * @see src/modules/poi/markers.js
 */
import { POIMarkers } from "../modules/poi/markers.js";

/** Proxy onto POIMarkers.createMarker */
export const createMarker = (...args: any[]) => (POIMarkers.createMarker as any)(...args);

/** Create a marker cluster group (leaflet.markercluster) — stub when unavailable */
export const createMarkerCluster = (options: any = {}) => {
    if (
        typeof window !== "undefined" &&
        (window as any).L &&
        (window as any).L.markerClusterGroup
    ) {
        return (window as any).L.markerClusterGroup(options);
    }
    if (
        typeof globalThis !== "undefined" &&
        (globalThis as any).L &&
        (globalThis as any).L.markerClusterGroup
    ) {
        return (globalThis as any).L.markerClusterGroup(options);
    }
    // Stub cluster group
    const markers: any[] = [];
    return {
        addLayer: (m: any) => markers.push(m),
        removeLayers: (ms: any) =>
            ms.forEach((m: any) => {
                const i = markers.indexOf(m);
                if (i > -1) markers.splice(i, 1);
            }),
        clearLayers: () => markers.splice(0),
        getLayers: () => [...markers],
        addTo: (map: any) => {
            if (map && typeof map.addLayer === "function") map.addLayer({ _cluster: true });
        },
    };
};

/** Batch-add an array of POIs as markers to a map/cluster */
export const batchAddMarkers = (pois: any, map: any, options: any = {}) => {
    if (!Array.isArray(pois)) return [];
    return pois
        .map((poi: any) => {
            try {
                return createMarker(poi, options);
            } catch (_e) {
                return null;
            }
        })
        .filter(Boolean);
};

/** Remove an array of markers from the map */
export const removeMarkers = (markers: any, map: any) => {
    if (!Array.isArray(markers) || !map) return;
    markers.forEach((m: any) => {
        try {
            if (m && typeof m.remove === "function") m.remove();
        } catch (_e) {
            /* noop */
        }
    });
};

/** Update position of a Leaflet marker */
export const updateMarkerPosition = (marker: any, latlng: any) => {
    if (marker && typeof marker.setLatLng === "function") {
        marker.setLatLng(latlng);
    }
};

/** Update marker style (icon or options) */
export const updateMarkerStyle = (marker: any, style: any = {}) => {
    if (!marker) return;
    if (style.icon && typeof marker.setIcon === "function") {
        marker.setIcon(style.icon);
    }
    if (style.opacity !== undefined && typeof marker.setOpacity === "function") {
        marker.setOpacity(style.opacity);
    }
};

/** Retrieve POI data attached to a marker */
export const getMarkerData = (marker: any) => {
    if (!marker) return null;
    return marker._poiData || marker.options?.data || null;
};

/** Aggregate facade object */
export const Markers = {
    createMarkerCluster,
    batchAddMarkers,
    removeMarkers,
    updateMarkerPosition,
    updateMarkerStyle,
    getMarkerData,
    // Exposes internals from POIMarkers for advanced usage
    ...POIMarkers,
};
