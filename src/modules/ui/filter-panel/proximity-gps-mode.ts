// @ts-nocheck — migration TS, typage progressif
/**
 * GeoLeaf UI Filter Panel - Proximity GPS Mode
 * Activation du mode proximity par position GPS — compatible panel ET toolbar.
 * Eliminates duplication between activateGPSMode() (panel) and GPS branch
 * de toggleProximityToolbar() (toolbar).
 *
 * @module ui/filter-panel/proximity-gps-mode
 */
"use strict";

import { getLog } from "../../utils/general-utils.js";
import { GeoLocationState } from "../geolocation-state.js";
import { ProximityState } from "./proximity-state.js";
import {
    createProximityCircle,
    createGPSMarker,
    removeCircleAndMarker,
} from "./proximity-circle.js";

interface GPSModeOptions {
    onPointPlaced?: () => void;
}

/**
 * Activates GPS mode on a given DOM wrapper.
 * Utilisable from the panel (wrapper via container.closest) comme from the toolbar
 * (wrapper virtuel via getElementById).
 *
 * @param map        - Instance de carte Leaflet
 * @param wrapper    - Element [data-gl-filter-id="proximity"] recevant les attributes data-proximity-*
 * @param radiusKm   - Radius in kilometers
 * @param options    - Callbacks optionals (onPointPlaced)
 */
export function activateGPSMode(
    map: any,
    wrapper: HTMLElement,
    radiusKm: number,
    options?: GPSModeOptions
): void {
    const Log = getLog();

    removeCircleAndMarker(map);

    const gpsLatLng = globalThis.L.latLng(
        GeoLocationState.userPosition.lat,
        GeoLocationState.userPosition.lng
    );

    createProximityCircle(gpsLatLng, radiusKm * 1000, map);

    if (!GeoLocationState.active) {
        // GPS non en suivi continu : create a marker GPS draggable
        createGPSMarker(gpsLatLng, map, wrapper);
    } else {
        ProximityState.marker = null;
        Log.info("[GeoLeaf.Proximity] Circle displayed around continuous tracking GPS marker");
    }

    if (!wrapper) {
        Log.warn("[GeoLeaf.Proximity] activateGPSMode: wrapper not found, attributes not updated");
        return;
    }

    wrapper.setAttribute("data-proximity-lat", String(gpsLatLng.lat));
    wrapper.setAttribute("data-proximity-lng", String(gpsLatLng.lng));
    wrapper.setAttribute("data-proximity-radius", String(radiusKm));
    wrapper.setAttribute("data-proximity-active", "true");

    map.setView(gpsLatLng, Math.max(map.getZoom(), 14), { animate: true, duration: 0.5 });

    // Pas de handler de click required in mode GPS
    ProximityState.clickHandler = null;

    Log.info("[GeoLeaf.Proximity] GPS mode enabled", {
        lat: gpsLatLng.lat,
        lng: gpsLatLng.lng,
        radius: radiusKm,
    });

    options?.onPointPlaced?.();
}

/**
 * Checks if a recent GPS position (< 5 minutes) is available.
 */
export function hasRecentGPS(): boolean {
    return (
        !!GeoLocationState.userPosition &&
        Date.now() - GeoLocationState.userPosition.timestamp < 300000
    );
}
