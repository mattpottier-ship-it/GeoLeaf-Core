/**
 * GeoLeaf GeoJSON Module - Shared State & Constants
 * État partagé et constantes pour le module GeoJSON
 *
 * @module geojson/shared
 */
"use strict";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

/**
 * État partagé du module GeoJSON
 * Accessible via GeoJSONShared.state
 */
const GeoJSONShared = {};

/**
 * État interne partagé entre les sous-modules
 */
GeoJSONShared.state = {
    /**
     * Référence vers la carte Leaflet.
     * @type {L.Map|null}
     */
    map: null,

    /**
     * Groupe contenant toutes les couches GeoJSON (conteneur parent).
     * @type {L.LayerGroup|null}
     */
    layerGroup: null,

    /**
     * LEGACY: Couche L.GeoJSON principale (pour compatibilité descendante).
     * @deprecated depuis v4.0.0 — utiliser `layers` (Map). Suppression prévue en v4.1.0.
     * Migration : remplacer `state.geoJsonLayer` par `state.layers.get(layerId)?.layer`.
     * @type {L.GeoJSON|null}
     */
    geoJsonLayer: null,

    /**
     * Map des couches individuelles par ID.
     * Structure: Map<layerId, {id, label, layer, visible, config, clusterGroup}>
     * Remplace le champ `geoJsonLayer` (désormais @deprecated).
     * Migration : remplacer `state.geoJsonLayer` par `state.layers.get(layerId)?.layer`.
     * @type {Map<string, Object>}
     */
    layers: new Map(),

    /**
     * Compteur pour générer des IDs uniques si non fourni.
     * @type {number}
     */
    layerIdCounter: 0,

    // featureCache removed (Sprint 1) — features accessed via state.layers

    /**
     * Options par défaut du module GeoJSON.
     */
    options: {
        /**
         * Style par défaut des géométries (polygones / lignes).
         * Neutral transparent fallback — real style loaded from JSON before layer creation.
         */
        defaultStyle: {
            color: "#999999",
            weight: 2,
            opacity: 0.9,
            fillColor: "#cccccc",
            fillOpacity: 0.15,
        },
        /**
         * Style des points (circleMarker).
         */
        defaultPointStyle: {
            radius: 6,
            color: "#999999",
            weight: 2,
            fillColor: "#cccccc",
            fillOpacity: 0.9,
        },
        /**
         * Fonction de rappel pour chaque feature.
         * @param {Object} feature
         * @param {L.Layer} layer
         */
        onEachFeature: null,
        /**
         * Fonction pointToLayer personnalisée (si fournie).
         * @param {Object} feature
         * @param {L.LatLng} latlng
         * @returns {L.Layer}
         */
        pointToLayer: null,
        /**
         * Adapter automatiquement la vue sur les données chargées.
         */
        fitBoundsOnLoad: true,
        /**
         * ZOOM max lors du fitBounds (facultatif).
         */
        maxZoomOnFit:
            _g.GeoLeaf && _g.GeoLeaf.CONSTANTS ? _g.GeoLeaf.CONSTANTS.GEOJSON_MAX_ZOOM_ON_FIT : 18,
    },
};

/**
 * Configuration des panes Leaflet pour le z-ordering des couches.
 */
GeoJSONShared.PANE_CONFIG = {
    BASEMAP_NAME: "geoleaf-basemap",
    BASEMAP_ZINDEX: 200,
    LAYER_PREFIX: "geoleaf-layer-",
    LAYER_BASE_ZINDEX: 400,
    MIN_LAYER_ZINDEX: 0,
    MAX_LAYER_ZINDEX: 99,
};

/**
 * Helpers pour la gestion des panes
 */
GeoJSONShared.PaneHelpers = {
    /**
     * Génère le nom du pane pour un zIndex donné
     * @param {number} zIndex - zIndex de la couche (0-99)
     * @returns {string} Nom du pane
     */
    getPaneName(zIndex) {
        const config = GeoJSONShared.PANE_CONFIG;
        return `${config.LAYER_PREFIX}${zIndex || 0}`;
    },

    /**
     * Valide et clamp un zIndex dans la plage autorisée
     * @param {number} zIndex - zIndex à valider
     * @returns {number} zIndex valide (0-99)
     */
    validateZIndex(zIndex) {
        const config = GeoJSONShared.PANE_CONFIG;
        return Math.max(
            config.MIN_LAYER_ZINDEX,
            Math.min(config.MAX_LAYER_ZINDEX, Math.floor(zIndex))
        );
    },

    /**
     * Applique le pane à un layer ou marker
     * @param {L.Layer} layer - Layer Leaflet
     * @param {number} zIndex - zIndex de la couche
     */
    applyPaneToLayer(layer, zIndex) {
        if (layer && layer.options) {
            layer.options.pane = this.getPaneName(zIndex);
        }
    },
};

/**
 * Map des opérateurs de comparaison pour styleRules.
 * Supporte : >, >=, <, <=, ==, ===, eq (alias ==), !=, !==, contains, startsWith, endsWith, in, notIn, between
 */
GeoJSONShared.STYLE_OPERATORS = {
    ">": (a, b) => Number(a) > Number(b),
    ">=": (a, b) => Number(a) >= Number(b),
    "<": (a, b) => Number(a) < Number(b),
    "<=": (a, b) => Number(a) <= Number(b),
    "==": (a, b) => a == b,
    "===": (a, b) => a === b,
    eq: (a, b) => a == b, // Alias pour ==
    "!=": (a, b) => a != b,
    "!==": (a, b) => a !== b,
    neq: (a, b) => a != b, // Alias pour !=
    contains: (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
    startsWith: (a, b) => String(a).toLowerCase().startsWith(String(b).toLowerCase()),
    endsWith: (a, b) => String(a).toLowerCase().endsWith(String(b).toLowerCase()),
    in: (a, b) => Array.isArray(b) && b.includes(a),
    notIn: (a, b) => Array.isArray(b) && !b.includes(a),
    between: (a, b) => {
        if (!Array.isArray(b) || b.length !== 2) return false;
        const num = Number(a);
        const min = Number(b[0]);
        const max = Number(b[1]);
        return num >= min && num <= max;
    },
};

/**
 * Réinitialise l'état partagé (utile pour les tests)
 */
GeoJSONShared.reset = function () {
    const state = GeoJSONShared.state;
    state.map = null;
    state.layerGroup = null;
    state.geoJsonLayer = null;
    state.layers = new Map();
    state.layerIdCounter = 0;
    // featureCache removed (Sprint 1)
    // Réinitialiser les options par défaut
    state.options = {
        defaultStyle: {
            color: "#999999",
            weight: 2,
            opacity: 0.9,
            fillColor: "#cccccc",
            fillOpacity: 0.15,
        },
        defaultPointStyle: {
            radius: 6,
            color: "#999999",
            weight: 2,
            fillColor: "#cccccc",
            fillOpacity: 0.9,
        },
        onEachFeature: null,
        pointToLayer: null,
        fitBoundsOnLoad: true,
        maxZoomOnFit:
            _g.GeoLeaf && _g.GeoLeaf.CONSTANTS ? _g.GeoLeaf.CONSTANTS.GEOJSON_MAX_ZOOM_ON_FIT : 18,
    };
};

/**
 * Getter pour le Log (lazy loading)
 */
GeoJSONShared.getLog = function () {
    return _g.GeoLeaf && _g.GeoLeaf.Log ? _g.GeoLeaf.Log : console;
};

// ── Getters publics (8.3.2) ─────────────────────────────────────────────────

/**
 * @public Retourne la Map des couches GeoJSON actives.
 * @returns {Map<string, Object>}
 */
GeoJSONShared.getLayers = function () {
    return GeoJSONShared.state.layers;
};

/**
 * @public Retourne les données d'une couche par son ID.
 * @param {string} layerId
 * @returns {Object|undefined}
 */
GeoJSONShared.getLayerById = function (layerId) {
    return GeoJSONShared.state.layers.get(layerId);
};

export { GeoJSONShared };
