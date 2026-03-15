/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Markers
 * Factory + orchestrateur — API public POIMarkers unchanged.
 */
import { Log } from "../log/index.js";
import { POINormalizers } from "./normalizers.ts";
import { getPoiBaseConfig } from "./markers-config.ts";
import { resolveCategoryDisplay } from "./markers-styling.ts";
import { buildMarkerIcon } from "./markers-icon-html.ts";
import { ensureProfileSpriteInjectedSync } from "./markers-sprite-loader.ts";
import { attachMarkerEvents } from "./markers-events.ts";

/**
 * Extrait les coordinates of a POI for the creation de marker.
 *
 * @param {object} poi - Data du POI.
 * @returns {[number, number]|null} [latitude, longitude] ou null si invalids.
 */
function extractMarkerCoordinates(poi: any) {
    if (!poi) {
        if (Log) Log.warn("[POI] extractMarkerCoordinates() : Invalid POI.", poi);
        return null;
    }

    const normalizers = POINormalizers;
    if (!normalizers) {
        if (Log) Log.error("[POI] extractMarkerCoordinates() : Normalizers module not loaded.");
        return null;
    }

    const coords = normalizers.extractCoordinates(poi);
    if (!coords) {
        if (Log) Log.warn("[POI] extractMarkerCoordinates() : POI with no valid coordinates.", poi);
        return null;
    }

    return coords;
}

/**
 * Creates a marker Leaflet for a POI.
 * Orchestrateur main : coordinates → display → icon → events.
 *
 * @param {object} poi - Data du POI.
 * @param {object} [options] - Options de creation.
 * @param {boolean} [options.attachEvents=true] - Si false, ne pas attach the events (popup, tooltip).
 * @param {string} [options.pane] - Nom du pane Leaflet to utiliser for the z-index.
 * @returns {L.Marker|null} Marqueur Leaflet ou null si invalid.
 */
function createMarker(poi: any, options: any = {}) {
    if (!poi) {
        if (Log) Log.warn("[POI] createMarker() : Invalid POI.", poi);
        return null;
    }

    const { attachEvents = true, pane } = options;

    // Extraction coordinates
    const coords = extractMarkerCoordinates(poi);
    if (!coords) {
        return null;
    }

    const [lat, lon] = coords;

    // Resolution of the display (icon et colors)
    const displayConfig = resolveCategoryDisplay(poi);

    // Building of the icon Leaflet
    const customIcon = buildMarkerIcon(displayConfig);

    // Options du marker avec pane si fourni
    const markerOptions: any = { icon: customIcon };
    if (pane) {
        markerOptions.pane = pane;
    }

    // Creation du marker Leaflet with the pane
    const L = (globalThis as any).L;
    const marker = L.marker([lat, lon], markerOptions);

    // Attacher events et behaviors (sauf si deactivated)
    if (attachEvents) {
        attachMarkerEvents(marker, poi);
    }

    return marker;
}

// ========================================
//   EXPORT
// ========================================

const POIMarkers = {
    getPoiBaseConfig,
    resolveCategoryDisplay,
    ensureProfileSpriteInjectedSync,
    extractMarkerCoordinates,
    buildMarkerIcon,
    attachMarkerEvents,
    createMarker,
};

// ── ESM Export ──
export { POIMarkers };
