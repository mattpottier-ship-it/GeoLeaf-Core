/**
 * GeoLeaf Route Layer Manager Module
 * Gestion des layers Leaflet pour les itinéraires
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf._RouteLayerManager = GeoLeaf._RouteLayerManager || {};

    const Log = GeoLeaf.Log || console;

    /**
     * Appliquer un itinéraire complet (remplacement)
     * @param {Object} context - Context object with map, layerGroup, routeLayer, options
     * @param {number[][]} coords - Coordinates array
     * @param {Function} clearCallback - Callback to clear existing routes
     * @param {Function} fireEventsCallback - Callback to fire route loaded events
     */
    GeoLeaf._RouteLayerManager.applyRoute = function (context, coords, clearCallback, fireEventsCallback) {
        if (!Array.isArray(coords)) {
            coords = [];
        }

        if (typeof clearCallback === "function") {
            clearCallback();
        }

        if (!context.routeLayer && context.layerGroup && context.map) {
            // Applique le paramètre interactiveShapes de la config
            const interactiveShapes = GeoLeaf.Config.get('ui.interactiveShapes', false);
            const lineStyle = Object.assign({}, context.options.lineStyle, { interactive: interactiveShapes });
            context.routeLayer = global.L.polyline([], lineStyle).addTo(
                context.layerGroup
            );
        }

        if (context.routeLayer) {
            context.routeLayer.setLatLngs(coords);
        }

        if (context.options.fitBoundsOnLoad && coords.length > 1 && context.map) {
            const bounds = context.routeLayer.getBounds();
            const fitOpt = {};
            if (context.options.maxZoomOnFit) {
                fitOpt.maxZoom = context.options.maxZoomOnFit;
            }
            context.map.fitBounds(bounds, fitOpt);
        }

        if (typeof fireEventsCallback === "function") {
            fireEventsCallback(coords);
        }
    };

    /**
     * Ajouter un waypoint manuel
     * @param {L.LayerGroup} layerGroup - Layer group
     * @param {number[]} latlng - Coordinates [lat, lng]
     * @param {Object} waypointStyle - Waypoint style
     */
    GeoLeaf._RouteLayerManager.addWaypoint = function (layerGroup, latlng, waypointStyle) {
        if (!layerGroup) return;
        const interactiveShapes = GeoLeaf.Config.get('ui.interactiveShapes', false);
        const style = Object.assign({}, waypointStyle, { interactive: interactiveShapes });
        global.L.circleMarker(latlng, style).addTo(layerGroup);
    };

    /**
     * Ajouter un segment manuel
     * @param {L.Polyline} routeLayer - Route polyline
     * @param {number[][]} coords - Coordinates to add
     */
    GeoLeaf._RouteLayerManager.addSegment = function (routeLayer, coords) {
        if (!routeLayer) return;
        const current = routeLayer.getLatLngs();
        routeLayer.setLatLngs([...current, ...coords]);
    };

    /**
     * Émet les événements "geoleaf:route:loaded" (Leaflet + DOM)
     * @param {L.Map} map - Leaflet map
     * @param {L.Polyline} routeLayer - Route polyline
     * @param {number[][]} coords - Coordinates
     */
    GeoLeaf._RouteLayerManager.fireRouteLoadedEvents = function (map, routeLayer, coords) {
        // Événement Leaflet sur la carte
        try {
            if (map && typeof map.fire === "function") {
                map.fire("geoleaf:route:loaded", {
                    coords,
                    layer: routeLayer,
                    source: "geoleaf.route"
                });
            }
        } catch (e) {
            Log.warn(
                "[GeoLeaf.Route] Impossible d'émettre l'événement Leaflet geoleaf:route:loaded.",
                e
            );
        }

        // CustomEvent DOM
        if (typeof document !== "undefined" && typeof document.dispatchEvent === "function") {
            const detail = {
                coords: Array.isArray(coords) ? coords.slice() : [],
                map: map,
                layer: routeLayer,
                source: "geoleaf.route"
            };

            try {
                if (typeof CustomEvent === "function") {
                    const event = new CustomEvent("geoleaf:route:loaded", { detail });
                    document.dispatchEvent(event);
                } else {
                    const legacyEvent = document.createEvent("CustomEvent");
                    legacyEvent.initCustomEvent(
                        "geoleaf:route:loaded",
                        true,
                        true,
                        detail
                    );
                    document.dispatchEvent(legacyEvent);
                }
            } catch (err) {
                Log.warn(
                    "[GeoLeaf.Route] Impossible d'émettre le CustomEvent geoleaf:route:loaded.",
                    err
                );
            }
        }
    };

    Log.info("[GeoLeaf._RouteLayerManager] Module Layer Manager chargé");

})(window);
