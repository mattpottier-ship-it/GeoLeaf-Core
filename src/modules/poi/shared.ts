/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - STATE Shared
 * Variables et constantes sharedes entre tous les sous-modules POI
 */
import { CONSTANTS } from "../constants/index.js";

// ========================================
//   CONSTANTES
// ========================================

const POI_MARKER_SIZE = CONSTANTS.POI_MARKER_SIZE || 16;
const POI_MAX_ZOOM = CONSTANTS.POI_MAX_ZOOM || 18;

// Icon by default (circle bleu SVG en base64)
const defaultIconUrl =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjNGE5MGU1IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==";

// ========================================
//   SHARED STATE
// ========================================

/**
 * STATE mutable shared entre tous les sous-modules POI
 */
const state: any = {
    // LayerGroup Leaflet contenant tous the markers POI
    poiLayerGroup: null,

    // Cluster group (si activated)
    poiClusterGroup: null,

    // Array des data POI loadedes
    allPois: [],

    // Map pour stocker the markers Leaflet par ID de POI
    poiMarkers: new Map(),

    // Configuration of the module POI
    poiConfig: {},

    // Reference vers the map Leaflet
    mapInstance: null,

    // Indicator de loading en cours
    isLoading: false,

    // Element DOM pour the panel side POI
    sidePanelElement: null,

    // POI currentlement displayed dans the panel
    currentPoiInPanel: null,

    // Overlay de fond sombre for the side panel
    sidePanelOverlay: null,

    // Index of the image currente in the gallery
    currentGalleryIndex: 0,
};

// ========================================
//   SHARED UTILITIES
// ========================================

/**
 * Helper internal : garantit qu'un maxZoom numeric est defined sur the map.
 * Used to avoid errors from the clustering plugin ("Map has no maxZoom specified").
 *
 * @param {L.Map} map - Instance de the map Leaflet
 * @param {number} [fallback=18] - Value by default si map.options.maxZoom n'existe pas
 */
function ensureMapMaxZoom(map: any, fallback: any = 18) {
    if (!map || !map.options) return;
    if (typeof map.options.maxZoom !== "number" || isNaN(map.options.maxZoom)) {
        map.options.maxZoom = fallback;
    }
}

// ========================================
//   EXPORT
// ========================================

const POIShared = {
    // Constantes (read seule)
    constants: Object.freeze({
        POI_MARKER_SIZE,
        POI_MAX_ZOOM,
        defaultIconUrl,
    }),

    // STATE mutable (accessible en read/write par sous-modules)
    state,

    // Utilitaires
    ensureMapMaxZoom,

    // ── Getters publics (8.3.1) ────────────────────────────────────────────
    /** @public Returns the array de tous les POI loadeds */
    getAllPois() {
        return state.allPois;
    },

    /** @public Returns the layer Leaflet active pour the markers POI */
    getMarkerLayer() {
        return (state as any).markerLayer || state.poiClusterGroup || state.poiLayerGroup;
    },

    /** @public Returns the instance de the map Leaflet */
    getMapInstance() {
        return state.mapInstance;
    },

    /** @public Returns the Map des markers par ID */
    getPoiMarkers() {
        return state.poiMarkers;
    },
};

// ── ESM Export ──
export { POIShared };
