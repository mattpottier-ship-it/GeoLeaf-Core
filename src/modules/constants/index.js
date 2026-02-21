/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module constants
 * @description Constantes globales GeoLeaf — valeurs numériques centralisées.
 */

export const CONSTANTS = Object.freeze({
    // Carte — vue neutre, le fitBounds positionne après chargement des couches
    DEFAULT_ZOOM: 3,
    DEFAULT_CENTER: [0, 0],
    MAX_ZOOM_ON_FIT: 15,

    // POI
    POI_MARKER_SIZE: 12,
    POI_MAX_ZOOM: 18,
    POI_SWIPE_THRESHOLD: 50,
    POI_LIGHTBOX_TRANSITION_MS: 300,
    POI_SIDEPANEL_DEFAULT_WIDTH: 420,

    // Route
    ROUTE_MAX_ZOOM_ON_FIT: 14,
    ROUTE_WAYPOINT_RADIUS: 5,

    // GeoJSON
    GEOJSON_MAX_ZOOM_ON_FIT: 15,
    GEOJSON_POINT_RADIUS: 6,

    // UI
    FULLSCREEN_TRANSITION_MS: 10
});

// ── Backward compatibility moved to globals.js ──
