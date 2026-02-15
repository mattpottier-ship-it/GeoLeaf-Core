/**
 * GeoLeaf UI Filter Panel - Shared Helpers
 * Fonctions utilitaires partagées pour le panneau de filtres
 *
 * @module ui/filter-panel/shared
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Dépendances lazy
    const getLog = () => (GeoLeaf.Log || console);

    GeoLeaf._UIFilterPanelShared = GeoLeaf._UIFilterPanelShared || {};

    // ========================================
    //   CONVERSION DE FEATURES
    // ========================================

    /**
     * Convertit une feature GeoJSON Point en objet POI-like
     * @param {Object} feature - Feature GeoJSON
     * @returns {Object|null} - POI-like ou null
     */
    GeoLeaf._UIFilterPanelShared.featureToPoiLike = function(feature) {
        if (!feature || !feature.geometry || !feature.properties) return null;

        const geom = feature.geometry;
        if (!geom || geom.type?.toLowerCase().indexOf("point") === -1) return null;

        const coords = Array.isArray(geom.coordinates) ? geom.coordinates : null;
        const latlng = coords && coords.length >= 2 ? [coords[1], coords[0]] : null;
        const props = feature.properties || {};
        const poi = Object.assign({}, props);

        if (!poi.title && props.name) poi.title = props.name;
        if (!poi.id && feature.id) poi.id = feature.id;
        if (!poi.latlng && latlng) poi.latlng = latlng;
        if (!poi.attributes && props.attributes) poi.attributes = props.attributes;

        return poi;
    };

    /**
     * Convertit une feature GeoJSON LineString en objet Route-like
     * @param {Object} feature - Feature GeoJSON
     * @returns {Object|null} - Route-like ou null
     */
    GeoLeaf._UIFilterPanelShared.featureToRouteLike = function(feature) {
        if (!feature || !feature.geometry || !feature.properties) return null;

        const geom = feature.geometry;
        if (!geom || geom.type?.toLowerCase().indexOf("line") === -1) return null;

        const props = feature.properties || {};

        // Exclude protected areas (aires_protégées_nationales) - they should not be treated as routes/itineraries
        // Protected areas have minimal properties: fid, Name, region only
        const hasOtherProperties = Object.keys(props).some(key =>
            !['fid', 'name', 'Name', 'region', 'REGION', 'Region'].includes(key)
        );
        if (!hasOtherProperties && (props.fid !== undefined || props.Name)) {
            // Likely a protected area, not an itinerary
            return null;
        }

        const route = Object.assign({}, props);

        if (!route.title && props.name) route.title = props.name;
        if (!route.id && feature.id) route.id = feature.id;
        route.geometry = geom;

        return route;
    };

    // ========================================
    //   RÉCUPÉRATION DES DONNÉES
    // ========================================

    /**
     * Récupère tous les POI depuis les différentes sources
     * @returns {Array} - Liste des POI
     */
    GeoLeaf._UIFilterPanelShared.getBasePois = function() {
        const Log = getLog();
        const featureToPoiLike = GeoLeaf._UIFilterPanelShared.featureToPoiLike;

        // 1) Prendre depuis GeoJSON (mode layers-only) si dispo
        try {
            if (GeoLeaf.GeoJSON && typeof GeoLeaf.GeoJSON.getFeatures === "function") {
                const feats = GeoLeaf.GeoJSON.getFeatures({ geometryTypes: ["point"] }) || [];
                const pois = feats.map(featureToPoiLike).filter(Boolean);
                if (pois.length) return pois;
            }
        } catch (err) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Erreur récupération POI via GeoJSON:", err);
        }

        // 2) Config active (legacy)
        try {
            if (GeoLeaf.Config) {
                if (typeof GeoLeaf.Config.get === "function") {
                    const fromGet = GeoLeaf.Config.get("poi");
                    if (Array.isArray(fromGet)) return fromGet;
                }
                if (Array.isArray(GeoLeaf.Config._activeProfileData?.poi)) {
                    return GeoLeaf.Config._activeProfileData.poi;
                }
            }
        } catch (err) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Erreur récupération POI via Config:", err);
        }

        // 3) Fallback démo
        if (global.cfg && Array.isArray(global.cfg.poi)) {
            return global.cfg.poi;
        }

        return [];
    };

    /**
     * Récupère toutes les routes depuis les différentes sources
     * @returns {Array} - Liste des routes
     */
    GeoLeaf._UIFilterPanelShared.getBaseRoutes = function() {
        const Log = getLog();
        const featureToRouteLike = GeoLeaf._UIFilterPanelShared.featureToRouteLike;

        // 1) Via GeoJSON (layers-only)
        try {
            if (GeoLeaf.GeoJSON && typeof GeoLeaf.GeoJSON.getFeatures === "function") {
                const feats = GeoLeaf.GeoJSON.getFeatures({ geometryTypes: ["line", "linestring", "multilinestring"] }) || [];
                const routes = feats.map(featureToRouteLike).filter(Boolean);
                if (routes.length) return routes;
            }
        } catch (err) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Erreur récupération routes via GeoJSON:", err);
        }

        // 2) Config active (legacy)
        try {
            if (GeoLeaf.Config) {
                if (typeof GeoLeaf.Config.get === "function") {
                    const fromGet = GeoLeaf.Config.get("routes");
                    if (Array.isArray(fromGet)) return fromGet;
                }
                if (Array.isArray(GeoLeaf.Config._activeProfileData?.routes)) {
                    return GeoLeaf.Config._activeProfileData.routes;
                }
            }
        } catch (err) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Erreur récupération routes via Config:", err);
        }

        // 3) Fallback démo
        if (global.cfg && Array.isArray(global.cfg.routes)) {
            return global.cfg.routes;
        }

        return [];
    };

    // ========================================
    //   UTILITAIRES
    // ========================================

    /**
     * Retourne l'élément DOM du panneau de filtres.
     * Priorité au conteneur flottant #gl-filter-panel, puis fallback #gl-left-panel.
     * @returns {HTMLElement|null}
     */
    GeoLeaf._UIFilterPanelShared.getFilterPanelElement = function() {
        let el = document.getElementById("gl-filter-panel");
        if (el) return el;

        el = document.getElementById("gl-left-panel");
        if (el) return el;

        const Log = getLog();
        Log.warn("[GeoLeaf.UI.FilterPanel] Aucun conteneur de panneau de filtres trouvé (#gl-filter-panel / #gl-left-panel).");

        return null;
    };

    /**
     * Accède à une propriété imbriquée (ex: "attributes.nom")
     * @param {Object} obj - Objet source
     * @param {string} path - Chemin vers la propriété
     * @returns {*} - Valeur ou null
     */
    GeoLeaf._UIFilterPanelShared.getNestedValue = function(obj, path) {
        if (!obj || !path) return null;
        const keys = path.split('.');
        let value = obj;
        for (let i = 0; i < keys.length; i++) {
            if (value === null || value === undefined) return null;
            value = value[keys[i]];
        }
        return value;
    };

    /**
     * Extrait un point représentatif d'une géométrie (pour calcul de distance)
     * @param {Object} geometry - Géométrie GeoJSON
     * @returns {Object|null} - { lat, lng } ou null
     */
    GeoLeaf._UIFilterPanelShared.getRepresentativePoint = function(geometry) {
        if (!geometry || !geometry.coordinates) return null;

        if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
            // Pour un polygone, utiliser le premier point du premier anneau
            const coords = geometry.type === 'Polygon'
                ? geometry.coordinates[0][0]
                : geometry.coordinates[0][0][0];
            return coords ? { lng: coords[0], lat: coords[1] } : null;

        } else if (geometry.type === 'LineString') {
            // Pour une ligne, utiliser le point du milieu
            const coords = geometry.coordinates;
            if (coords && coords.length > 0) {
                const midIndex = Math.floor(coords.length / 2);
                return { lng: coords[midIndex][0], lat: coords[midIndex][1] };
            }

        } else if (geometry.type === 'MultiLineString') {
            // Pour multi-ligne, utiliser le point du milieu de la première ligne
            const coords = geometry.coordinates[0];
            if (coords && coords.length > 0) {
                const midIndex = Math.floor(coords.length / 2);
                return { lng: coords[midIndex][0], lat: coords[midIndex][1] };
            }

        } else if (geometry.type === 'Point') {
            return { lng: geometry.coordinates[0], lat: geometry.coordinates[1] };

        } else if (geometry.type === 'MultiPoint') {
            // Pour multi-point, utiliser le premier point
            const coords = geometry.coordinates[0];
            return coords ? { lng: coords[0], lat: coords[1] } : null;
        }

        return null;
    };

    /**
     * Collecte tous les tags uniques depuis une liste d'items
     * @param {Array} items - Liste d'items (POI, routes)
     * @returns {Array} - Tags uniques triés
     */
    GeoLeaf._UIFilterPanelShared.collectAllTags = function(items) {
        const tagSet = new Set();

        items.forEach(function(item) {
            // Support GeoJSON properties.attributes.tags, item.attributes.tags, et item.tags
            const props = item.properties || item;
            const attrs = props.attributes || item.attributes || {};
            const tags = attrs.tags || props.tags || item.tags;

            if (Array.isArray(tags) && tags.length > 0) {
                tags.forEach(function(t) {
                    if (t && typeof t === "string") {
                        tagSet.add(t);
                    }
                });
            }
        });

        const arr = Array.from(tagSet);
        arr.sort();
        return arr;
    };

})(window);
