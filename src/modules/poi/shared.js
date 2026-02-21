/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - État Partagé
 * Variables et constantes partagées entre tous les sous-modules POI
 */
import { CONSTANTS } from '../constants/index.js';

// ========================================
//   CONSTANTES
// ========================================

const POI_MARKER_SIZE = CONSTANTS.POI_MARKER_SIZE || 16;
const POI_MAX_ZOOM = CONSTANTS.POI_MAX_ZOOM || 18;

// Icône par défaut (cercle bleu SVG en base64)
const defaultIconUrl = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjNGE5MGU1IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==";

// ========================================
//   ÉTAT PARTAGÉ
// ========================================

/**
 * État mutable partagé entre tous les sous-modules POI
 */
const state = {
    // LayerGroup Leaflet contenant tous les marqueurs POI
    poiLayerGroup: null,


    // Cluster group (si activé)
    poiClusterGroup: null,

    // Tableau des données POI chargées
    allPois: [],

    // Map pour stocker les marqueurs Leaflet par ID de POI
    poiMarkers: new Map(),

    // Configuration du module POI
    poiConfig: {},

    // Référence vers la carte Leaflet
    mapInstance: null,

    // Indicateur de chargement en cours
    isLoading: false,

    // Élément DOM pour le panneau latéral POI
    sidePanelElement: null,

    // POI actuellement affiché dans le panneau
    currentPoiInPanel: null,

    // Overlay de fond sombre pour le side panel
    sidePanelOverlay: null,

    // Index de l'image courante dans la galerie
    currentGalleryIndex: 0
};

// ========================================
//   UTILITAIRES PARTAGÉS
// ========================================

/**
 * Helper interne : garantit qu'un maxZoom numérique est défini sur la carte.
 * Utilisé pour éviter les erreurs du plugin de clustering ("Map has no maxZoom specified").
 *
 * @param {L.Map} map - Instance de la carte Leaflet
 * @param {number} [fallback=18] - Valeur par défaut si map.options.maxZoom n'existe pas
 */
function ensureMapMaxZoom(map, fallback = 18) {
    if (!map || !map.options) return;
    if (typeof map.options.maxZoom !== 'number' || isNaN(map.options.maxZoom)) {
        map.options.maxZoom = fallback;
    }
}

// ========================================
//   EXPORT
// ========================================

const POIShared = {
    // Constantes (lecture seule)
    constants: Object.freeze({
        POI_MARKER_SIZE,
        POI_MAX_ZOOM,
        defaultIconUrl
    }),

    // État mutable (accessible en lecture/écriture par sous-modules)
    state,

    // Utilitaires
    ensureMapMaxZoom,

    // ── Getters publics (8.3.1) ────────────────────────────────────────────
    /** @public Retourne le tableau de tous les POI chargés */
    getAllPois() { return state.allPois; },

    /** @public Retourne la couche Leaflet active pour les marqueurs POI */
    getMarkerLayer() { return state.markerLayer || state.poiClusterGroup || state.poiLayerGroup; },

    /** @public Retourne l'instance de la carte Leaflet */
    getMapInstance() { return state.mapInstance; },

    /** @public Retourne la Map des marqueurs par ID */
    getPoiMarkers() { return state.poiMarkers; }
};

// ── ESM Export ──
export { POIShared };
