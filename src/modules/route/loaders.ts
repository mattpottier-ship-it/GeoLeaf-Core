/**
 * GeoLeaf Route Loaders Module
 * Chargement d'itinéraires depuis différentes sources (GPX, GeoJSON, Config)
 */

import { Log } from "../log/index.js";
import type { RouteItem, GeoJSONRouteFeature, GeoJSONLineString } from "./route-types.js";

const RouteLoaders = {
    loadGeoJSON(
        geojson:
            | GeoJSONRouteFeature
            | {
                  type: string;
                  geometry?: { type: string; coordinates: [number, number][] };
                  coordinates?: [number, number][];
              },
        applyRouteCallback: (coords: [number, number][]) => void
    ): void {
        if (!geojson || !geojson.type) {
            Log.error("[GeoLeaf.Route] GeoJSON invalide.");
            return;
        }

        let coords: [number, number][] = [];

        if (
            geojson.type === "Feature" &&
            (geojson as GeoJSONRouteFeature).geometry?.type === "LineString"
        ) {
            const geom = (geojson as GeoJSONRouteFeature).geometry as GeoJSONLineString;
            coords = geom.coordinates.map((c) => [c[1], c[0]]);
        } else if (
            geojson.type === "LineString" &&
            Array.isArray((geojson as { coordinates: [number, number][] }).coordinates)
        ) {
            coords = (geojson as { coordinates: [number, number][] }).coordinates.map((c) => [
                c[1],
                c[0],
            ]);
        } else {
            Log.warn("[GeoLeaf.Route] Format GeoJSON non géré.");
        }

        if (typeof applyRouteCallback === "function") {
            applyRouteCallback(coords);
        }
    },

    extractCoordsFromRouteItem(route: RouteItem): [number, number][] {
        const geom = route.geometry;

        if (Array.isArray(geom) && geom.length > 0) {
            const first = geom[0];
            if (
                Array.isArray(first) &&
                typeof (first as [number, number])[0] === "number" &&
                typeof (first as [number, number])[1] === "number"
            ) {
                return geom as [number, number][];
            }
            const geoLike = first as { type?: string; coordinates?: [number, number][] };
            if (
                geoLike &&
                typeof geoLike === "object" &&
                geoLike.type === "LineString" &&
                Array.isArray(geoLike.coordinates)
            ) {
                return geoLike.coordinates.map((c) => [c[1], c[0]]);
            }
        }

        const geomObj = geom as {
            type?: string;
            coordinates?: [number, number][] | [number, number][][];
        };
        if (
            geomObj &&
            typeof geomObj === "object" &&
            geomObj.type === "LineString" &&
            Array.isArray(geomObj.coordinates) &&
            geomObj.coordinates.length > 0
        ) {
            return (geomObj.coordinates as Array<[number, number] | [number, number, number]>).map(
                (c) => [c[1], c[0]] as [number, number]
            );
        }

        if (
            geomObj &&
            typeof geomObj === "object" &&
            geomObj.type === "MultiLineString" &&
            Array.isArray(geomObj.coordinates) &&
            geomObj.coordinates.length > 0
        ) {
            const allCoords: [number, number][] = [];
            for (const segment of geomObj.coordinates as [number, number][][]) {
                if (Array.isArray(segment) && segment.length > 0) {
                    for (const c of segment) {
                        allCoords.push([c[1], c[0]]);
                    }
                }
            }
            if (allCoords.length > 0) return allCoords;
        }

        return [];
    },
};

export { RouteLoaders };
