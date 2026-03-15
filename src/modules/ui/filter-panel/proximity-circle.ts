// @ts-nocheck — migration TS, typage progressif
/**
 * GeoLeaf UI Filter Panel - Proximity Circle
 * Creation et removal des elements cartographicals shareds (circle + markers).
 * Eliminates duplication between activateGPSMode (panel) and toggleProximityToolbar (toolbar).
 *
 * @module ui/filter-panel/proximity-circle
 */
"use strict";

import { Config } from "../../config/geoleaf-config/config-core.js";
import { ProximityState } from "./proximity-state.js";

/**
 * Builds thes options du circle de proximity (color orange, style commun).
 */
function buildCircleOptions(radiusMeters: number): object {
    return {
        radius: radiusMeters,
        color: "#c2410c",
        fillColor: "#c2410c",
        fillOpacity: 0.2,
        weight: 2,
        interactive: Config.get("ui.interactiveShapes", false),
    };
}

/**
 * Creates the circle de proximity et le stocke dans ProximityState.circle.
 */
export function createProximityCircle(latlng: any, radiusMeters: number, map: any): void {
    ProximityState.circle = globalThis.L.circle(latlng, buildCircleOptions(radiusMeters)).addTo(
        map
    );
}

/**
 * Creates the marker GPS (bleu, draggable) et le stocke dans ProximityState.marker.
 * Attache le dragend pour synchronize le circle et le wrapper.
 */
export function createGPSMarker(latlng: any, map: any, wrapper: HTMLElement): void {
    ProximityState.marker = globalThis.L.marker(latlng, {
        draggable: true,
        icon: globalThis.L.divIcon({
            className: "gl-proximity-gps-marker",
            html: '<div style="width: 20px; height: 20px; background: #2563eb; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
        }),
    }).addTo(map);

    ProximityState.marker.on("dragend", function () {
        const ll = ProximityState.marker.getLatLng();
        if (ProximityState.circle) ProximityState.circle.setLatLng(ll);
        wrapper.setAttribute("data-proximity-lat", ll.lat);
        wrapper.setAttribute("data-proximity-lng", ll.lng);
    });
}

/**
 * Creates the manual marker (default Leaflet, draggable) and stores it in ProximityState.marker.
 * Attache le dragend pour synchronize le circle et le wrapper.
 */
export function createManualMarker(latlng: any, map: any, wrapper: HTMLElement): void {
    ProximityState.marker = globalThis.L.marker(latlng, { draggable: true }).addTo(map);

    ProximityState.marker.on("dragend", function () {
        const ll = ProximityState.marker.getLatLng();
        if (ProximityState.circle) ProximityState.circle.setLatLng(ll);
        wrapper.setAttribute("data-proximity-lat", ll.lat);
        wrapper.setAttribute("data-proximity-lng", ll.lng);
    });
}

/**
 * Retire le circle ET the marker de the map et reinitializes les references.
 */
export function removeCircleAndMarker(map: any): void {
    if (ProximityState.circle) {
        map.removeLayer(ProximityState.circle);
        ProximityState.circle = null;
    }
    if (ProximityState.marker) {
        map.removeLayer(ProximityState.marker);
        ProximityState.marker = null;
    }
}
