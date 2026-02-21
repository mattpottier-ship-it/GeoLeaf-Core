/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

"use strict";

import { Log } from '../log/index.js';


/**
 * Logger unifié
 */

/**
 * Module DataConverter
 *
 * Responsabilités :
 * - Convertir les données brutes (Array de POI, Array de routes) vers GeoJSON FeatureCollection
 * - Normaliser les géométries
 * - Gérer les différents formats : POI, LineString, Polygon
 *
 * Utilisé par GeoLeaf.GeoJSON lors du chargement depuis profile.json
 */
const DataConverterModule = {
    /**
     * Convertit un array de POI en GeoJSON FeatureCollection.
     *
     * Chaque POI doit avoir :
     * - id (string)
     * - latlng (array [lat, lng])
     * - title (string)
     * - attributes (object)
     *
     * @param {Array} poiArray - Array de POI
     * @returns {Object} FeatureCollection GeoJSON
     */
    convertPoiArrayToGeoJSON(poiArray) {
        if (!Array.isArray(poiArray)) {
            Log.warn("[DataConverter.convertPoiArrayToGeoJSON] Input n'est pas un array, retour FeatureCollection vide");
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        const features = poiArray
            .map((poi) => {
                if (!poi || typeof poi !== "object") {
                    return null;
                }

                if (!poi.id) {
                    Log.warn("[DataConverter.convertPoiArrayToGeoJSON] POI sans ID, ignoré", poi);
                    return null;
                }

                // Valider latlng
                let coordinates = null;
                if (Array.isArray(poi.latlng) && poi.latlng.length === 2) {
                    // GeoJSON utilise [lon, lat], mais les données utilisent [lat, lon]
                    coordinates = [poi.latlng[1], poi.latlng[0]];
                } else if (
                    poi.location &&
                    typeof poi.location.lat === "number" &&
                    typeof poi.location.lng === "number"
                ) {
                    coordinates = [poi.location.lng, poi.location.lat];
                } else {
                    Log.warn(
                        "[DataConverter.convertPoiArrayToGeoJSON] POI sans coordonnées valides, ignoré",
                        { id: poi.id }
                    );
                    return null;
                }

                // Construire la feature GeoJSON
                const feature = {
                    type: "Feature",
                    id: poi.id,
                    geometry: {
                        type: "Point",
                        coordinates: coordinates
                    },
                    properties: {
                        id: poi.id,
                        title: poi.title || "Sans titre",
                        description: poi.description || "",
                        ...poi.attributes // Fusionner les attributs
                    }
                };

                return feature;
            })
            .filter((f) => f !== null);

        Log.debug("[DataConverter.convertPoiArrayToGeoJSON] Converti", {
            input: poiArray.length,
            output: features.length
        });

        return {
            type: "FeatureCollection",
            features: features
        };
    },

    /**
     * Convertit un array de routes (LineString) en GeoJSON FeatureCollection.
     *
     * Chaque route doit avoir :
     * - id (string)
     * - geometry avec type: "LineString" et coordinates
     * - attributes (object optionnel)
     *
     * @param {Array} routeArray - Array de routes
     * @returns {Object} FeatureCollection GeoJSON
     */
    convertRouteArrayToGeoJSON(routeArray) {
        if (!Array.isArray(routeArray)) {
            Log.warn("[DataConverter.convertRouteArrayToGeoJSON] Input n'est pas un array, retour FeatureCollection vide");
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        const features = routeArray
            .map((route) => {
                if (!route || typeof route !== "object") {
                    return null;
                }

                if (!route.id) {
                    Log.warn("[DataConverter.convertRouteArrayToGeoJSON] Route sans ID, ignorée", route);
                    return null;
                }

                // Valider la géométrie
                if (!route.geometry || route.geometry.type !== "LineString" || !Array.isArray(route.geometry.coordinates)) {
                    Log.warn(
                        "[DataConverter.convertRouteArrayToGeoJSON] Route sans géométrie LineString valide, ignorée",
                        { id: route.id }
                    );
                    return null;
                }

                // Construire la feature GeoJSON
                const feature = {
                    type: "Feature",
                    id: route.id,
                    geometry: {
                        type: "LineString",
                        coordinates: route.geometry.coordinates
                    },
                    properties: {
                        id: route.id,
                        title: route.title || "Sans titre",
                        description: route.description || "",
                        categoryId: route.categoryId,
                        subCategoryId: route.subCategoryId,
                        ...route.attributes // Fusionner les attributs
                    }
                };

                return feature;
            })
            .filter((f) => f !== null);

        Log.debug("[DataConverter.convertRouteArrayToGeoJSON] Converti", {
            input: routeArray.length,
            output: features.length
        });

        return {
            type: "FeatureCollection",
            features: features
        };
    },

    /**
     * Convertit un array de zones (Polygon) en GeoJSON FeatureCollection.
     *
     * Chaque zone doit avoir :
     * - id (string)
     * - geometry avec type: "Polygon" et coordinates
     * - attributes (object optionnel)
     *
     * @param {Array} zoneArray - Array de zones
     * @returns {Object} FeatureCollection GeoJSON
     */
    convertZoneArrayToGeoJSON(zoneArray) {
        if (!Array.isArray(zoneArray)) {
            Log.warn("[DataConverter.convertZoneArrayToGeoJSON] Input n'est pas un array, retour FeatureCollection vide");
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        const features = zoneArray
            .map((zone) => {
                if (!zone || typeof zone !== "object") {
                    return null;
                }

                if (!zone.id) {
                    Log.warn("[DataConverter.convertZoneArrayToGeoJSON] Zone sans ID, ignorée", zone);
                    return null;
                }

                // Valider la géométrie
                if (!zone.geometry || zone.geometry.type !== "Polygon" || !Array.isArray(zone.geometry.coordinates)) {
                    Log.warn(
                        "[DataConverter.convertZoneArrayToGeoJSON] Zone sans géométrie Polygon valide, ignorée",
                        { id: zone.id }
                    );
                    return null;
                }

                // Construire la feature GeoJSON
                const feature = {
                    type: "Feature",
                    id: zone.id,
                    geometry: {
                        type: "Polygon",
                        coordinates: zone.geometry.coordinates
                    },
                    properties: {
                        id: zone.id,
                        title: zone.title || zone.siteName || "Sans titre",
                        description: zone.description || "",
                        ...zone.attributes // Fusionner les attributs
                    }
                };

                return feature;
            })
            .filter((f) => f !== null);

        Log.debug("[DataConverter.convertZoneArrayToGeoJSON] Converti", {
            input: zoneArray.length,
            output: features.length
        });

        return {
            type: "FeatureCollection",
            features: features
        };
    },

    /**
     * Convertit un string GPX en GeoJSON FeatureCollection.
     *
     * Parse les éléments waypoints et tracks, crée des Points ou LineStrings.
     *
     * @param {string} gpxString - Contenu XML du fichier GPX
     * @returns {Object} FeatureCollection GeoJSON
     */
    convertGpxToGeoJSON(gpxString) {
        if (!gpxString || typeof gpxString !== "string") {
            Log.warn("[DataConverter.convertGpxToGeoJSON] GPX string invalide");
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        try {
            // Parser le XML
            const parser = new DOMParser();
            const gpxDoc = parser.parseFromString(gpxString, "text/xml");

            const parseErrors = gpxDoc.getElementsByTagName("parsererror");
            if (parseErrors.length > 0) {
                Log.error("[DataConverter.convertGpxToGeoJSON] Erreur parsing XML:", parseErrors[0].textContent);
                return {
                    type: "FeatureCollection",
                    features: []
                };
            }

            const features = [];

            // 1. Parser les waypoints (wpt)
            const waypoints = gpxDoc.getElementsByTagName("wpt");
            for (let i = 0; i < waypoints.length; i++) {
                const wpt = waypoints[i];
                const lat = parseFloat(wpt.getAttribute("lat"));
                const lon = parseFloat(wpt.getAttribute("lon"));

                if (!isNaN(lat) && !isNaN(lon)) {
                    const nameElem = wpt.getElementsByTagName("name")[0];
                    const descElem = wpt.getElementsByTagName("desc")[0];
                    const symElem = wpt.getElementsByTagName("sym")[0];

                    // Extraire les extensions GeoLeaf si présentes
                    const geoLeafExt = {};
                    const tagsList = []; // Accumulateur pour les tags multiples
                    const extensions = wpt.getElementsByTagName("extensions");
                    if (extensions.length > 0) {
                        const ext = extensions[0];
                        // Utiliser childNodes pour être sûr d'avoir tous les éléments
                        for (let j = 0; j < ext.childNodes.length; j++) {
                            const child = ext.childNodes[j];
                            // Ignorer les nœuds texte
                            if (child.nodeType !== 1) continue;

                            // Récupérer le nom du tag (gère les namespaces)
                            const tagName = child.tagName || child.nodeName || '';
                            const localName = child.localName || tagName.split(':').pop();

                            // Vérifier si c'est une extension GeoLeaf
                            const isGeoLeaf = tagName.toLowerCase().startsWith("geoleaf:") ||
                                (child.namespaceURI && child.namespaceURI.includes("geoleaf"));

                            if (isGeoLeaf || tagName.includes(':')) {
                                // Utiliser localName comme clé (sans préfixe)
                                const key = localName || tagName.replace(/^[^:]+:/, '');
                                const value = child.textContent || '';

                                // Cas spécial : les tags sont accumulés dans un tableau
                                if (key === 'tag' || key === 'tags') {
                                    if (value) tagsList.push(value);
                                } else {
                                    geoLeafExt[key] = value;
                                }
                            }
                        }
                    }

                    // Ajouter les tags comme tableau si présents
                    if (tagsList.length > 0) {
                        geoLeafExt.tags = tagsList;
                    }

                    const feature = {
                        type: "Feature",
                        id: geoLeafExt.id || (nameElem ? nameElem.textContent : `wpt-${i}`),
                        geometry: {
                            type: "Point",
                            coordinates: [lon, lat]
                        },
                        properties: {
                            id: geoLeafExt.id || (nameElem ? nameElem.textContent : `wpt-${i}`),
                            title: nameElem ? nameElem.textContent : `Waypoint ${i + 1}`,
                            description: descElem ? descElem.textContent : "",
                            symbol: symElem ? symElem.textContent : "",
                            ...geoLeafExt // Inclure les extensions GeoLeaf
                        }
                    };

                    features.push(feature);
                }
            }

            // 2. Parser les tracks (trk)
            const tracks = gpxDoc.getElementsByTagName("trk");
            for (let i = 0; i < tracks.length; i++) {
                const trk = tracks[i];
                const nameElem = trk.getElementsByTagName("name")[0];
                const descElem = trk.getElementsByTagName("desc")[0];

                // Extraire les extensions GeoLeaf pour le track
                const trkGeoLeafExt = {};
                const trkTagsList = []; // Accumulateur pour les tags multiples
                const trkExtensions = trk.getElementsByTagName("extensions");
                if (trkExtensions.length > 0) {
                    const ext = trkExtensions[0];
                    for (let m = 0; m < ext.childNodes.length; m++) {
                        const child = ext.childNodes[m];
                        if (child.nodeType !== 1) continue;

                        const tagName = child.tagName || child.nodeName || '';
                        const localName = child.localName || tagName.split(':').pop();

                        const isGeoLeaf = tagName.toLowerCase().startsWith("geoleaf:") ||
                            (child.namespaceURI && child.namespaceURI.includes("geoleaf"));

                        if (isGeoLeaf || tagName.includes(':')) {
                            const key = localName || tagName.replace(/^[^:]+:/, '');
                            const value = child.textContent || '';

                            // Cas spécial : les tags sont accumulés dans un tableau
                            if (key === 'tag' || key === 'tags') {
                                if (value) trkTagsList.push(value);
                            } else {
                                trkGeoLeafExt[key] = value;
                            }
                        }
                    }
                }

                // Ajouter les tags comme tableau si présents
                if (trkTagsList.length > 0) {
                    trkGeoLeafExt.tags = trkTagsList;
                }

                const segments = trk.getElementsByTagName("trkseg");
                for (let j = 0; j < segments.length; j++) {
                    const segment = segments[j];
                    const trkpts = segment.getElementsByTagName("trkpt");

                    const coordinates = [];
                    for (let k = 0; k < trkpts.length; k++) {
                        const trkpt = trkpts[k];
                        const lat = parseFloat(trkpt.getAttribute("lat"));
                        const lon = parseFloat(trkpt.getAttribute("lon"));

                        if (!isNaN(lat) && !isNaN(lon)) {
                            coordinates.push([lon, lat]);
                        }
                    }

                    if (coordinates.length > 0) {
                        const feature = {
                            type: "Feature",
                            id: nameElem ? `${nameElem.textContent}-${j}` : `trk-${i}-${j}`,
                            geometry: {
                                type: "LineString",
                                coordinates: coordinates
                            },
                            properties: {
                                id: nameElem ? `${nameElem.textContent}-${j}` : `trk-${i}-${j}`,
                                title: nameElem ? nameElem.textContent : `Track ${i + 1}`,
                                description: descElem ? descElem.textContent : "",
                                segmentIndex: j,
                                pointCount: coordinates.length,
                                ...trkGeoLeafExt // Inclure les extensions GeoLeaf du track
                            }
                        };

                        features.push(feature);
                    }
                }
            }

            Log.debug("[DataConverter.convertGpxToGeoJSON] Converti", {
                waypoints: waypoints.length,
                tracks: tracks.length,
                features: features.length
            });

            return {
                type: "FeatureCollection",
                features: features
            };
        } catch (err) {
            Log.error("[DataConverter.convertGpxToGeoJSON] Erreur lors du parsing GPX:", err);
            return {
                type: "FeatureCollection",
                features: []
            };
        }
    },

    /**
     * Détecte automatiquement le type de données et les convertit en GeoJSON.
     *
     * Stratégie de détection :
     * 1. Si déjà GeoJSON (type: "FeatureCollection"), retourner tel quel
     * 2. Si array : analyser le premier élément
     *    - S'il a "latlng" ou "location" → POI
     *    - S'il a "geometry.type === 'LineString'" → Route
     *    - S'il a "geometry.type === 'Polygon'" → Zone
     * 3. Sinon : retourner vide
     *
     * @param {*} data - Données à convertir
     * @returns {Object} FeatureCollection GeoJSON
     */
    autoConvert(data) {
        if (!data) {
            Log.warn("[DataConverter.autoConvert] Données nulles, retour FeatureCollection vide");
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        // Cas 1 : Déjà GeoJSON
        if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
            Log.debug("[DataConverter.autoConvert] Données déjà en GeoJSON, passage direct");
            return data;
        }

        if (data.type === "Feature" && data.geometry) {
            Log.debug("[DataConverter.autoConvert] Feature unique, conversion en FeatureCollection");
            return {
                type: "FeatureCollection",
                features: [data]
            };
        }

        // Cas 2 : Array
        if (!Array.isArray(data) || data.length === 0) {
            Log.warn("[DataConverter.autoConvert] Données ne sont pas un array ou array vide");
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        const firstItem = data[0];

        if (!firstItem || typeof firstItem !== "object") {
            Log.warn("[DataConverter.autoConvert] Premier élément invalide");
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        // Analyser le type
        if (firstItem.latlng || (firstItem.location && typeof firstItem.location.lat === "number")) {
            // POI
            Log.debug("[DataConverter.autoConvert] Détecté comme array de POI");
            return this.convertPoiArrayToGeoJSON(data);
        } else if (
            firstItem.geometry &&
            firstItem.geometry.type === "LineString" &&
            Array.isArray(firstItem.geometry.coordinates)
        ) {
            // Route
            Log.debug("[DataConverter.autoConvert] Détecté comme array de routes");
            return this.convertRouteArrayToGeoJSON(data);
        } else if (
            firstItem.geometry &&
            firstItem.geometry.type === "Polygon" &&
            Array.isArray(firstItem.geometry.coordinates)
        ) {
            // Zone
            Log.debug("[DataConverter.autoConvert] Détecté comme array de zones");
            return this.convertZoneArrayToGeoJSON(data);
        } else {
            Log.warn("[DataConverter.autoConvert] Type de données non reconnu");
            return {
                type: "FeatureCollection",
                features: []
            };
        }
    }
};

// Exposition de l'API
const DataConverter = DataConverterModule;
export { DataConverter };
