/**
 * GeoLeaf Route Loaders Module
 * Loadsment d'routes depuis different sources (GPX, GeoJSON, Config)
 */

import { Log } from "../log/index.js";
import type { RouteItem, GeoJSONRouteFeature, GeoJSONLineString } from "./route-types.js";

function _extractFromFlatArray(geom: any[]): [number, number][] | null {
    if (geom.length === 0) return null;
    const first = geom[0];
    if (Array.isArray(first) && typeof first[0] === "number" && typeof first[1] === "number") {
        return geom as [number, number][];
    }
    const geoLike = first as { type?: string; coordinates?: [number, number][] };
    if (!geoLike || typeof geoLike !== "object") return null;
    if (geoLike.type !== "LineString") return null;
    if (!Array.isArray(geoLike.coordinates)) return null;
    return geoLike.coordinates.map((c) => [c[1], c[0]]);
}

function _extractFromLineStringGeom(geo: any): [number, number][] | null {
    if (!geo || typeof geo !== "object") return null;
    if (geo.type !== "LineString") return null;
    if (!Array.isArray(geo.coordinates)) return null;
    if (geo.coordinates.length === 0) return null;
    return (geo.coordinates as Array<[number, number] | [number, number, number]>).map(
        (c) => [c[1], c[0]] as [number, number]
    );
}

function _extractFromMultiLineStringGeom(geo: any): [number, number][] | null {
    if (!geo || typeof geo !== "object") return null;
    if (geo.type !== "MultiLineString") return null;
    if (!Array.isArray(geo.coordinates)) return null;
    if (geo.coordinates.length === 0) return null;
    const allCoords: [number, number][] = [];
    for (const segment of geo.coordinates as [number, number][][]) {
        if (!Array.isArray(segment)) continue;
        for (const c of segment) allCoords.push([c[1], c[0]]);
    }
    return allCoords.length > 0 ? allCoords : null;
}

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
            Log.warn("[GeoLeaf.Route] Unsupported GeoJSON format.");
        }

        if (typeof applyRouteCallback === "function") {
            applyRouteCallback(coords);
        }
    },

    extractCoordsFromRouteItem(route: RouteItem): [number, number][] {
        const geom = route.geometry;
        if (Array.isArray(geom)) {
            const result = _extractFromFlatArray(geom);
            if (result) return result;
        }
        const lineResult = _extractFromLineStringGeom(geom);
        if (lineResult) return lineResult;
        const multiResult = _extractFromMultiLineStringGeom(geom);
        if (multiResult) return multiResult;
        return [];
    },
};

export { RouteLoaders };
