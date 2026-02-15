/**
 * GeoLeaf Data Normalizer Module
 * Module central pour la normalisation des données provenant de différentes sources.
 * Convertit JSON, GeoJSON, GPX (future) et Routes vers un format POI unifié.
 *
 * @module data/normalizer
 * @version 1.0.0
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf._Normalizer = GeoLeaf._Normalizer || {};

    // ========================================
    //   TYPES DE SOURCES
    // ========================================

    const SOURCE_TYPES = {
        JSON: 'json',
        GEOJSON: 'geojson',
        GPX: 'gpx',
        ROUTE: 'route'
    };

    // ========================================
    //   UTILITAIRES
    // ========================================

    /**
     * Récupère le Log
     * @returns {Object}
     */
    function getLog() {
        return GeoLeaf.Log || console;
    }

    /**
     * Génère un ID unique
     * @returns {string}
     */
    function generateUniqueId() {
        return 'poi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Détermine le type de géométrie à partir des coordonnées Leaflet
     * @param {Object} layer - Layer Leaflet
     * @returns {string} 'Point', 'Polygon', 'LineString' ou 'Unknown'
     */
    function detectGeometryType(layer) {
        if (!layer) return 'Unknown';

        if (typeof layer.getLatLng === 'function') {
            return 'Point';
        }
        if (typeof layer.getLatLngs === 'function') {
            const latLngs = layer.getLatLngs();
            // Polygon : tableau de tableaux de points (anneau extérieur + trous éventuels)
            // LineString : tableau de points
            if (Array.isArray(latLngs) && latLngs.length > 0) {
                if (Array.isArray(latLngs[0]) && Array.isArray(latLngs[0][0])) {
                    return 'Polygon';
                }
                if (Array.isArray(latLngs[0])) {
                    // Peut être Polygon ou LineString selon si fermé
                    return 'Polygon';
                }
                return 'LineString';
            }
        }
        return 'Unknown';
    }

    /**
     * Extrait les coordonnées d'un layer Leaflet
     * @param {Object} layer - Layer Leaflet
     * @returns {Array|null} Coordonnées [lat, lng] ou null
     */
    function extractCoordinates(layer) {
        if (!layer) return null;

        if (typeof layer.getLatLng === 'function') {
            const ll = layer.getLatLng();
            return ll ? [ll.lat, ll.lng] : null;
        }

        if (typeof layer.getCenter === 'function') {
            const center = layer.getCenter();
            return center ? [center.lat, center.lng] : null;
        }

        if (typeof layer.getBounds === 'function') {
            try {
                const bounds = layer.getBounds();
                if (bounds && bounds.isValid()) {
                    const center = bounds.getCenter();
                    return center ? [center.lat, center.lng] : null;
                }
            } catch (e) {
                // Bounds invalides
            }
        }

        return null;
    }

    // ========================================
    //   NORMALISEURS PAR TYPE DE SOURCE
    // ========================================

    /**
     * Normalise une entrée JSON en POI
     * @param {Object} data - Données JSON brutes
     * @param {Object} layerConfig - Configuration du layer
     * @returns {Object} POI normalisé
     */
    function normalizeFromJSON(data, layerConfig = {}) {
        if (!data) return null;

        const id = data.id || data.uid || data.guid || generateUniqueId();
        const dataMapping = layerConfig.dataMapping || {};

        // Extraction du titre
        const titleField = dataMapping.title || 'title';
        const title = data[titleField] || data.title || data.name || data.label || data.nom || 'Sans titre';

        // Extraction de la description
        const descField = dataMapping.description || 'description';
        const description = data[descField] || data.description || data.shortDescription || '';

        // Extraction des coordonnées
        const latField = dataMapping.lat || 'lat';
        const lngField = dataMapping.lng || 'lng';
        let lat = data[latField];
        let lng = data[lngField];

        // Fallbacks pour coordonnées
        if (lat === undefined) lat = data.latitude || data.y;
        if (lng === undefined) lng = data.longitude || data.lng || data.x;

        // Extraction catégorie/sous-catégorie
        const catField = dataMapping.categoryId || 'categoryId';
        const subCatField = dataMapping.subCategoryId || 'subCategoryId';
        const categoryId = data[catField] || data.categoryId || data.category || null;
        const subCategoryId = data[subCatField] || data.subCategoryId || data.subcategory || null;

        // Construction des attributs (toutes les propriétés)
        const attributes = { ...data };

        return {
            id: String(id),
            sourceType: SOURCE_TYPES.JSON,
            geometryType: 'Point',
            title: String(title),
            description: String(description || ''),
            lat: lat !== undefined ? parseFloat(lat) : null,
            lng: lng !== undefined ? parseFloat(lng) : null,
            categoryId: categoryId,
            subCategoryId: subCategoryId,
            attributes: attributes,
            rawData: data
        };
    }

    /**
     * Normalise une feature GeoJSON en POI
     * @param {Object} feature - Feature GeoJSON
     * @param {Object} layerConfig - Configuration du layer
     * @param {Object} layer - Layer Leaflet (optionnel, pour coordonnées)
     * @returns {Object} POI normalisé
     */
    function normalizeFromGeoJSON(feature, layerConfig = {}, layer = null) {
        if (!feature) return null;

        const props = feature.properties || {};
        const geometry = feature.geometry || {};
        const dataMapping = layerConfig.dataMapping || {};

        // ID
        const id = feature.id || props.id || props.uid || props.guid || generateUniqueId();

        // Type de géométrie
        let geometryType = geometry.type || 'Unknown';
        if (layer && geometryType === 'Unknown') {
            geometryType = detectGeometryType(layer);
        }

        // Extraction du titre
        const titleField = dataMapping.title || 'title';
        const titlePath = titleField.includes('.') ? titleField.split('.').pop() : titleField;
        const title = props[titlePath] || props.name || props.nom || props.title || props.label || 'Sans titre';

        // Extraction de la description
        const descField = dataMapping.description || 'description';
        const descPath = descField.includes('.') ? descField.split('.').pop() : descField;
        const description = props[descPath] || props.description || props.shortDescription || '';

        // Coordonnées
        let lat = null, lng = null;
        if (geometry.coordinates) {
            if (geometryType === 'Point') {
                // GeoJSON : [lng, lat]
                lng = geometry.coordinates[0];
                lat = geometry.coordinates[1];
            } else if (layer) {
                const coords = extractCoordinates(layer);
                if (coords) {
                    lat = coords[0];
                    lng = coords[1];
                }
            } else if (geometry.coordinates.length > 0) {
                // Calculer le centre approximatif
                const flatCoords = flattenCoordinates(geometry.coordinates, geometry.type);
                if (flatCoords.length > 0) {
                    let sumLat = 0, sumLng = 0;
                    flatCoords.forEach(c => {
                        sumLng += c[0];
                        sumLat += c[1];
                    });
                    lng = sumLng / flatCoords.length;
                    lat = sumLat / flatCoords.length;
                }
            }
        } else if (layer) {
            const coords = extractCoordinates(layer);
            if (coords) {
                lat = coords[0];
                lng = coords[1];
            }
        }

        // Catégorie/sous-catégorie
        const catField = dataMapping.categoryId || 'categoryId';
        const catPath = catField.includes('.') ? catField.split('.').pop() : catField;
        const subCatField = dataMapping.subCategoryId || 'subCategoryId';
        const subCatPath = subCatField.includes('.') ? subCatField.split('.').pop() : subCatField;

        const categoryId = props[catPath] || props.categoryId || props.category || null;
        const subCategoryId = props[subCatPath] || props.subCategoryId || props.subcategory || null;

        // Construction des attributs
        const attributes = { ...props };

        return {
            id: String(id),
            sourceType: SOURCE_TYPES.GEOJSON,
            geometryType: geometryType,
            title: String(title),
            description: String(description || ''),
            lat: lat !== null ? parseFloat(lat) : null,
            lng: lng !== null ? parseFloat(lng) : null,
            categoryId: categoryId,
            subCategoryId: subCategoryId,
            attributes: attributes,
            properties: props, // Conserve aussi properties pour compatibilité
            rawData: feature
        };
    }

    /**
     * Aplatit les coordonnées GeoJSON selon le type de géométrie
     * @param {Array} coords - Coordonnées imbriquées
     * @param {string} type - Type de géométrie
     * @returns {Array} Tableau de [lng, lat]
     */
    function flattenCoordinates(coords, type) {
        if (!coords || !Array.isArray(coords)) return [];

        switch (type) {
            case 'Point':
                return [coords];
            case 'MultiPoint':
            case 'LineString':
                return coords;
            case 'MultiLineString':
            case 'Polygon':
                return coords.flat();
            case 'MultiPolygon':
                return coords.flat(2);
            default:
                // Aplatir récursivement
                const flat = [];
                const flatten = (arr) => {
                    if (!Array.isArray(arr)) return;
                    if (typeof arr[0] === 'number') {
                        flat.push(arr);
                    } else {
                        arr.forEach(flatten);
                    }
                };
                flatten(coords);
                return flat;
        }
    }

    /**
     * Normalise un waypoint GPX en POI (placeholder pour futur module)
     * @param {Object} waypoint - Waypoint GPX
     * @param {Object} layerConfig - Configuration du layer
     * @returns {Object} POI normalisé
     */
    function normalizeFromGPX(waypoint, layerConfig = {}) {
        if (!waypoint) return null;

        getLog().info('[Normalizer] GPX normalization - placeholder for future implementation');

        // Structure de base pour GPX
        const id = waypoint.name || waypoint.sym || generateUniqueId();
        const title = waypoint.name || waypoint.cmt || 'Point GPX';
        const description = waypoint.desc || waypoint.cmt || '';

        return {
            id: String(id),
            sourceType: SOURCE_TYPES.GPX,
            geometryType: 'Point',
            title: String(title),
            description: String(description),
            lat: waypoint.lat !== undefined ? parseFloat(waypoint.lat) : null,
            lng: waypoint.lon !== undefined ? parseFloat(waypoint.lon) : null,
            categoryId: waypoint.type || null,
            subCategoryId: null,
            attributes: { ...waypoint },
            rawData: waypoint
        };
    }

    /**
     * Normalise un point de route en POI
     * @param {Object} routePoint - Point de route
     * @param {Object} routeConfig - Configuration de la route
     * @returns {Object} POI normalisé
     */
    function normalizeFromRoute(routePoint, routeConfig = {}) {
        if (!routePoint) return null;

        const id = routePoint.id || routePoint.placeId || generateUniqueId();
        const title = routePoint.name || routePoint.title || routePoint.address || 'Point de route';
        const description = routePoint.description || routePoint.comment || '';

        let lat = null, lng = null;
        if (routePoint.latLng) {
            lat = routePoint.latLng.lat;
            lng = routePoint.latLng.lng;
        } else if (routePoint.lat !== undefined && routePoint.lng !== undefined) {
            lat = routePoint.lat;
            lng = routePoint.lng;
        }

        return {
            id: String(id),
            sourceType: SOURCE_TYPES.ROUTE,
            geometryType: 'Point',
            title: String(title),
            description: String(description),
            lat: lat !== null ? parseFloat(lat) : null,
            lng: lng !== null ? parseFloat(lng) : null,
            categoryId: routePoint.type || 'route-point',
            subCategoryId: routePoint.order !== undefined ? `stop-${routePoint.order}` : null,
            order: routePoint.order,
            address: routePoint.address,
            attributes: { ...routePoint },
            rawData: routePoint
        };
    }

    // ========================================
    //   FONCTION PRINCIPALE
    // ========================================

    /**
     * Normalise des données selon leur type de source
     * @param {string} sourceType - Type de source ('json', 'geojson', 'gpx', 'route')
     * @param {Object} data - Données brutes
     * @param {Object} layerConfig - Configuration du layer
     * @param {Object} options - Options additionnelles (layer Leaflet, etc.)
     * @returns {Object} POI normalisé
     */
    function normalizeFeature(sourceType, data, layerConfig = {}, options = {}) {
        if (!data) {
            getLog().warn('[Normalizer] Données nulles pour normalisation');
            return null;
        }

        switch (sourceType) {
            case SOURCE_TYPES.JSON:
                return normalizeFromJSON(data, layerConfig);

            case SOURCE_TYPES.GEOJSON:
                return normalizeFromGeoJSON(data, layerConfig, options.layer);

            case SOURCE_TYPES.GPX:
                return normalizeFromGPX(data, layerConfig);

            case SOURCE_TYPES.ROUTE:
                return normalizeFromRoute(data, layerConfig);

            default:
                getLog().warn('[Normalizer] Type de source non reconnu:', sourceType);
                // Tenter une détection automatique
                return autoDetectAndNormalize(data, layerConfig, options);
        }
    }

    /**
     * Détecte automatiquement le type de source et normalise
     * @param {Object} data - Données brutes
     * @param {Object} layerConfig - Configuration du layer
     * @param {Object} options - Options additionnelles
     * @returns {Object} POI normalisé
     */
    function autoDetectAndNormalize(data, layerConfig = {}, options = {}) {
        // Détection GeoJSON
        if (data.type === 'Feature' && data.geometry) {
            return normalizeFromGeoJSON(data, layerConfig, options.layer);
        }

        // Détection GPX (waypoint)
        if (data.lat !== undefined && data.lon !== undefined && (data.name || data.sym)) {
            return normalizeFromGPX(data, layerConfig);
        }

        // Détection Route
        if (data.latLng || (data.order !== undefined && data.address)) {
            return normalizeFromRoute(data, layerConfig);
        }

        // Par défaut : JSON
        return normalizeFromJSON(data, layerConfig);
    }

    /**
     * Normalise un tableau de données
     * @param {string} sourceType - Type de source
     * @param {Array} dataArray - Tableau de données brutes
     * @param {Object} layerConfig - Configuration du layer
     * @param {Object} options - Options additionnelles
     * @returns {Array} Tableau de POIs normalisés
     */
    function normalizeCollection(sourceType, dataArray, layerConfig = {}, options = {}) {
        if (!Array.isArray(dataArray)) {
            getLog().warn('[Normalizer] normalizeCollection attend un tableau');
            return [];
        }

        return dataArray
            .map(data => normalizeFeature(sourceType, data, layerConfig, options))
            .filter(poi => poi !== null);
    }

    // ========================================
    //   EXPORT
    // ========================================

    GeoLeaf._Normalizer = {
        // Types de sources
        SOURCE_TYPES,

        // Normaliseurs par type
        normalizeFromJSON,
        normalizeFromGeoJSON,
        normalizeFromGPX,
        normalizeFromRoute,

        // Fonctions principales
        normalizeFeature,
        autoDetectAndNormalize,
        normalizeCollection,

        // Utilitaires
        detectGeometryType,
        extractCoordinates,
        generateUniqueId
    };

    getLog().info('[GeoLeaf._Normalizer] Module Normalizer chargé');

})(typeof window !== 'undefined' ? window : global);
