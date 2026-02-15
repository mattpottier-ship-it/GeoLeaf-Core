/**
 * GeoLeaf Route Loaders Module
 * Chargement d'itinéraires depuis différentes sources (GPX, GeoJSON, Config)
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf._RouteLoaders = GeoLeaf._RouteLoaders || {};

    const Log = GeoLeaf.Log || console;

    /**
     * Charger un fichier GPX depuis une URL
     * @param {string} url - URL du fichier GPX
     * @param {Function} applyRouteCallback - Callback pour appliquer les coordonnées
     * @returns {Promise}
     */
    GeoLeaf._RouteLoaders.loadGPX = async function (url, applyRouteCallback) {
        if (!url) {
            Log.warn("[GeoLeaf.Route] URL GPX manquante.");
            return;
        }

        try {
            const res = await fetch(url);
            const xmlText = await res.text();
            const gpx = new DOMParser().parseFromString(xmlText, "application/xml");

            const coords = Array.from(gpx.getElementsByTagName("trkpt")).map(
                (pt) => [
                    parseFloat(pt.getAttribute("lat") || "0"),
                    parseFloat(pt.getAttribute("lon") || "0")
                ]
            );

            if (typeof applyRouteCallback === "function") {
                applyRouteCallback(coords);
            }
        } catch (err) {
            Log.error("[GeoLeaf.Route] Erreur GPX :", err);
        }
    };

    /**
     * Charger un itinéraire GeoJSON (LineString)
     * @param {Object} geojson - Objet GeoJSON
     * @param {Function} applyRouteCallback - Callback pour appliquer les coordonnées
     */
    GeoLeaf._RouteLoaders.loadGeoJSON = function (geojson, applyRouteCallback) {
        if (!geojson || !geojson.type) {
            Log.error("[GeoLeaf.Route] GeoJSON invalide.");
            return;
        }

        let coords = [];

        if (geojson.type === "Feature" && geojson.geometry.type === "LineString") {
            coords = geojson.geometry.coordinates.map((c) => [c[1], c[0]]);
        } else if (geojson.type === "LineString") {
            coords = geojson.coordinates.map((c) => [c[1], c[0]]);
        } else {
            Log.warn("[GeoLeaf.Route] Format GeoJSON non géré.");
        }

        if (typeof applyRouteCallback === "function") {
            applyRouteCallback(coords);
        }
    };

    /**
     * Extraire un tableau de [lat, lng] à partir d'un item de cfg.routes.
     * @param {Object} route - Route data
     * @returns {number[][]} Coordinates array
     */
    GeoLeaf._RouteLoaders.extractCoordsFromRouteItem = function (route) {
        // Cas 1 : tableau direct de [lat, lng]
        if (Array.isArray(route.geometry) && route.geometry.length > 0) {
            if (
                Array.isArray(route.geometry[0]) &&
                typeof route.geometry[0][0] === "number" &&
                typeof route.geometry[0][1] === "number"
            ) {
                return route.geometry.map((pair) => [pair[0], pair[1]]);
            }

            // Cas 2 : GeoJSON-like dans un tableau
            if (
                route.geometry[0] &&
                typeof route.geometry[0] === "object" &&
                route.geometry[0].type === "LineString" &&
                Array.isArray(route.geometry[0].coordinates)
            ) {
                return route.geometry[0].coordinates.map((c) => [c[1], c[0]]);
            }
        }

        // Cas 3 : objet GeoJSON LineString
        if (
            route.geometry &&
            typeof route.geometry === "object" &&
            route.geometry.type === "LineString" &&
            Array.isArray(route.geometry.coordinates) &&
            route.geometry.coordinates.length > 0
        ) {
            return route.geometry.coordinates.map((c) => [c[1], c[0]]);
        }

        // Cas 4 : objet GeoJSON MultiLineString - fusionner tous les segments
        if (
            route.geometry &&
            typeof route.geometry === "object" &&
            route.geometry.type === "MultiLineString" &&
            Array.isArray(route.geometry.coordinates) &&
            route.geometry.coordinates.length > 0
        ) {
            // Prendre le premier segment (linéaire le plus long) ou fusionner tous
            const allCoords = route.geometry.coordinates.reduce((acc, segment) => {
                if (Array.isArray(segment) && segment.length > 0) {
                    return acc.concat(segment.map((c) => [c[1], c[0]]));
                }
                return acc;
            }, []);

            if (allCoords.length > 0) {
                return allCoords;
            }
        }

        // Aucune géométrie valide trouvée - DEBUG au lieu de WARN
        // car il peut y avoir des features sans coordonnées valides
        return [];
    };

    Log.info("[GeoLeaf._RouteLoaders] Module Loaders chargé");

})(window);
