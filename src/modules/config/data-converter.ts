/* eslint-disable security/detect-object-injection */
/*!



 * GeoLeaf Core



 * © 2026 Mattieu Pottier



 * Released under the MIT License



 * https://geoleaf.dev



 */

import { Log } from "../log/index.js";

/** GeoJSON Feature (minimum shape used by this module) */

interface GeoJSONFeature {
    type: "Feature";

    id?: string;

    geometry: { type: string; coordinates: number[] | number[][] | number[][][] };

    properties: Record<string, unknown>;
}

/** GeoJSON FeatureCollection */

export interface GeoJSONFeatureCollection {
    type: "FeatureCollection";

    features: GeoJSONFeature[];
}

/** POI-like input for conversion */

interface PoiInput {
    id?: string;

    title?: string;

    description?: string;

    latlng?: [number, number];

    location?: { lat: number; lng: number };

    attributes?: Record<string, unknown>;

    [key: string]: unknown;
}

/** Route-like input */

interface RouteInput {
    id?: string;

    title?: string;

    description?: string;

    categoryId?: string;

    subCategoryId?: string;

    geometry?: { type: string; coordinates?: number[][] };

    attributes?: Record<string, unknown>;

    [key: string]: unknown;
}

/** Zone-like input */

interface ZoneInput {
    id?: string;

    title?: string;

    siteName?: string;

    description?: string;

    geometry?: { type: string; coordinates?: number[][][] };

    attributes?: Record<string, unknown>;

    [key: string]: unknown;
}

const emptyFC = (): GeoJSONFeatureCollection => ({ type: "FeatureCollection", features: [] });

// ---------------------------------------------------------

// Module-level helpers (reduce cyclomatic complexity)

// ---------------------------------------------------------

function _resolvePoiCoordinates(poi: PoiInput): [number, number] | null {
    if (Array.isArray(poi.latlng) && poi.latlng.length === 2) return [poi.latlng[1], poi.latlng[0]];

    if (
        poi.location &&
        typeof poi.location.lat === "number" &&
        typeof poi.location.lng === "number"
    )
        return [poi.location.lng, poi.location.lat];

    return null;
}

function _getText(el: Element | undefined, fallback: string): string {
    return el?.textContent ?? fallback;
}

function _processExtChild(child: ChildNode, ext: Record<string, unknown>, tags: string[]): void {
    if (child.nodeType !== 1) return;

    const el = child as Element;

    const tagName = el.tagName;

    const localName = el.localName;

    const isGeoLeaf =
        tagName.toLowerCase().startsWith("geoleaf:") || !!el.namespaceURI?.includes("geoleaf");

    if (!(isGeoLeaf || tagName.includes(":"))) return;

    const val = el.textContent || "";

    if (localName === "tag" || localName === "tags") {
        if (val) tags.push(val);
    } else {
        ext[localName] = val;
    }
}

function _parseGpxExtensions(el: Element): Record<string, unknown> {
    const ext: Record<string, unknown> = {};

    const extEls = el.getElementsByTagName("extensions");

    if (extEls.length === 0) return ext;

    const extEl = extEls[0];

    const tags: string[] = [];

    for (let j = 0; j < extEl.childNodes.length; j++) {
        _processExtChild(extEl.childNodes[j], ext, tags);
    }

    if (tags.length > 0) ext.tags = tags;

    return ext;
}

function _processGpxWaypoints(gpxDoc: Document, features: GeoJSONFeature[]): void {
    const waypoints = gpxDoc.getElementsByTagName("wpt");

    for (let i = 0; i < waypoints.length; i++) {
        const wpt = waypoints[i];

        const lat = parseFloat(wpt.getAttribute("lat") || "");

        const lon = parseFloat(wpt.getAttribute("lon") || "");

        if (!isNaN(lat) && !isNaN(lon)) {
            const nameElem = wpt.getElementsByTagName("name")[0];

            const descElem = wpt.getElementsByTagName("desc")[0];

            const symElem = wpt.getElementsByTagName("sym")[0];

            const ext = _parseGpxExtensions(wpt);

            const id = (ext.id as string) || _getText(nameElem, `wpt-${i}`);

            features.push({
                type: "Feature",

                id,

                geometry: { type: "Point", coordinates: [lon, lat] },

                properties: {
                    id,

                    title: _getText(nameElem, `Waypoint ${i + 1}`),

                    description: _getText(descElem, ""),

                    symbol: _getText(symElem, ""),

                    ...ext,
                },
            });
        }
    }
}

function _processGpxTracks(gpxDoc: Document, features: GeoJSONFeature[]): void {
    const tracks = gpxDoc.getElementsByTagName("trk");

    for (let i = 0; i < tracks.length; i++) {
        const trk = tracks[i];

        const nameElem = trk.getElementsByTagName("name")[0];

        const descElem = trk.getElementsByTagName("desc")[0];

        const ext = _parseGpxExtensions(trk);

        const segments = trk.getElementsByTagName("trkseg");

        for (let j = 0; j < segments.length; j++) {
            const trkpts = segments[j].getElementsByTagName("trkpt");

            const coordinates: number[][] = [];

            for (let k = 0; k < trkpts.length; k++) {
                const trkpt = trkpts[k];

                const tlat = parseFloat(trkpt.getAttribute("lat") || "");

                const tlon = parseFloat(trkpt.getAttribute("lon") || "");

                if (!isNaN(tlat) && !isNaN(tlon)) coordinates.push([tlon, tlat]);
            }

            if (coordinates.length > 0) {
                const fid = nameElem ? `${nameElem.textContent}-${j}` : `trk-${i}-${j}`;

                features.push({
                    type: "Feature",

                    id: fid,

                    geometry: { type: "LineString", coordinates },

                    properties: {
                        id: fid,

                        title: _getText(nameElem, `Track ${i + 1}`),

                        description: _getText(descElem, ""),

                        segmentIndex: j,

                        pointCount: coordinates.length,

                        ...ext,
                    },
                });
            }
        }
    }
}

function _checkEarlyGeoJson(data: unknown): GeoJSONFeatureCollection | null {
    const d = data as { type?: string; features?: unknown[]; geometry?: unknown };

    if (d.type === "FeatureCollection" && Array.isArray(d.features)) {
        Log.debug("[DataConverter.autoConvert] Data already in GeoJSON, passing through");

        return data as GeoJSONFeatureCollection;
    }

    if (d.type === "Feature" && d.geometry) {
        Log.debug("[DataConverter.autoConvert] Single feature, converting to FeatureCollection");

        return { type: "FeatureCollection", features: [data as GeoJSONFeature] };
    }

    return null;
}

function _detectPoiType(firstItem: Record<string, unknown>): "poi" | "route" | "zone" | "unknown" {
    if (
        firstItem.latlng ||
        (firstItem.location && typeof (firstItem.location as { lat?: number }).lat === "number")
    )
        return "poi";

    const geom = firstItem.geometry as { type?: string; coordinates?: unknown } | undefined;

    if (geom?.type === "LineString" && Array.isArray(geom.coordinates)) return "route";

    if (geom?.type === "Polygon" && Array.isArray(geom.coordinates)) return "zone";

    return "unknown";
}

const DataConverterModule = {
    convertPoiArrayToGeoJSON(poiArray: unknown): GeoJSONFeatureCollection {
        if (!Array.isArray(poiArray)) {
            Log.warn(
                "[DataConverter.convertPoiArrayToGeoJSON] Input is not an array, returning empty FeatureCollection"
            );

            return emptyFC();
        }

        const features = (poiArray as PoiInput[])

            .map((poi) => {
                if (!poi || typeof poi !== "object") return null;

                if (!(poi as PoiInput).id) {
                    Log.warn(
                        "[DataConverter.convertPoiArrayToGeoJSON] POI without ID, skipped",
                        poi
                    );

                    return null;
                }

                const coordinates = _resolvePoiCoordinates(poi as PoiInput);

                if (!coordinates) {
                    Log.warn(
                        "[DataConverter.convertPoiArrayToGeoJSON] POI without valid coordinates, skipped",
                        { id: (poi as PoiInput).id }
                    );

                    return null;
                }

                return {
                    type: "Feature",

                    id: (poi as PoiInput).id,

                    geometry: { type: "Point", coordinates },

                    properties: {
                        id: (poi as PoiInput).id,

                        title: (poi as PoiInput).title || "Sans titre",

                        description: (poi as PoiInput).description || "",

                        ...((poi as PoiInput).attributes as Record<string, unknown>),
                    },
                } as GeoJSONFeature;
            })

            .filter((f): f is GeoJSONFeature => f !== null);

        Log.debug("[DataConverter.convertPoiArrayToGeoJSON] Converted", {
            input: poiArray.length,

            output: features.length,
        });

        return { type: "FeatureCollection", features };
    },

    convertRouteArrayToGeoJSON(routeArray: unknown): GeoJSONFeatureCollection {
        if (!Array.isArray(routeArray)) {
            Log.warn(
                "[DataConverter.convertRouteArrayToGeoJSON] Input is not an array, returning empty FeatureCollection"
            );

            return emptyFC();
        }

        const features = (routeArray as RouteInput[])

            .map((route) => {
                if (!route || typeof route !== "object") return null;

                if (!route.id) {
                    Log.warn(
                        "[DataConverter.convertRouteArrayToGeoJSON] Route without ID, skipped",
                        route
                    );

                    return null;
                }

                if (
                    !route.geometry ||
                    route.geometry.type !== "LineString" ||
                    !Array.isArray(route.geometry.coordinates)
                ) {
                    Log.warn(
                        "[DataConverter.convertRouteArrayToGeoJSON] Route without valid LineString geometry, skipped",

                        { id: route.id }
                    );

                    return null;
                }

                return {
                    type: "Feature",

                    id: route.id,

                    geometry: { type: "LineString", coordinates: route.geometry.coordinates },

                    properties: {
                        id: route.id,

                        title: route.title || "Sans titre",

                        description: route.description || "",

                        categoryId: route.categoryId,

                        subCategoryId: route.subCategoryId,

                        ...(route.attributes as Record<string, unknown>),
                    },
                } as GeoJSONFeature;
            })

            .filter((f): f is GeoJSONFeature => f !== null);

        Log.debug("[DataConverter.convertRouteArrayToGeoJSON] Converted", {
            input: routeArray.length,

            output: features.length,
        });

        return { type: "FeatureCollection", features };
    },

    convertZoneArrayToGeoJSON(zoneArray: unknown): GeoJSONFeatureCollection {
        if (!Array.isArray(zoneArray)) {
            Log.warn(
                "[DataConverter.convertZoneArrayToGeoJSON] Input is not an array, returning empty FeatureCollection"
            );

            return emptyFC();
        }

        const features = (zoneArray as ZoneInput[])

            .map((zone) => {
                if (!zone || typeof zone !== "object") return null;

                if (!zone.id) {
                    Log.warn(
                        "[DataConverter.convertZoneArrayToGeoJSON] Zone without ID, skipped",
                        zone
                    );

                    return null;
                }

                if (
                    !zone.geometry ||
                    zone.geometry.type !== "Polygon" ||
                    !Array.isArray(zone.geometry.coordinates)
                ) {
                    Log.warn(
                        "[DataConverter.convertZoneArrayToGeoJSON] Zone without valid Polygon geometry, skipped",

                        { id: zone.id }
                    );

                    return null;
                }

                return {
                    type: "Feature",

                    id: zone.id,

                    geometry: { type: "Polygon", coordinates: zone.geometry.coordinates },

                    properties: {
                        id: zone.id,

                        title: zone.title || zone.siteName || "Sans titre",

                        description: zone.description || "",

                        ...(zone.attributes as Record<string, unknown>),
                    },
                } as GeoJSONFeature;
            })

            .filter((f): f is GeoJSONFeature => f !== null);

        Log.debug("[DataConverter.convertZoneArrayToGeoJSON] Converted", {
            input: zoneArray.length,

            output: features.length,
        });

        return { type: "FeatureCollection", features };
    },

    convertGpxToGeoJSON(gpxString: string): GeoJSONFeatureCollection {
        if (!gpxString || typeof gpxString !== "string") {
            Log.warn("[DataConverter.convertGpxToGeoJSON] Invalid GPX string");

            return emptyFC();
        }

        try {
            const parser = new DOMParser();

            const gpxDoc = parser.parseFromString(gpxString, "text/xml");

            const parseErrors = gpxDoc.getElementsByTagName("parsererror");

            if (parseErrors.length > 0) {
                Log.error(
                    "[DataConverter.convertGpxToGeoJSON] XML parsing error:",
                    parseErrors[0].textContent
                );

                return emptyFC();
            }

            const features: GeoJSONFeature[] = [];

            _processGpxWaypoints(gpxDoc, features);

            _processGpxTracks(gpxDoc, features);

            Log.debug("[DataConverter.convertGpxToGeoJSON] Converted", {
                waypoints: gpxDoc.getElementsByTagName("wpt").length,

                tracks: gpxDoc.getElementsByTagName("trk").length,

                features: features.length,
            });

            return { type: "FeatureCollection", features };
        } catch (err) {
            Log.error("[DataConverter.convertGpxToGeoJSON] Error parsing GPX:", err);

            return emptyFC();
        }
    },

    autoConvert(data: unknown): GeoJSONFeatureCollection {
        if (!data) {
            Log.warn("[DataConverter.autoConvert] Null data, returning empty FeatureCollection");

            return emptyFC();
        }

        const early = _checkEarlyGeoJson(data);

        if (early) return early;

        if (!Array.isArray(data) || data.length === 0) {
            Log.warn("[DataConverter.autoConvert] Data is not an array or is empty");

            return emptyFC();
        }

        const firstItem = data[0] as Record<string, unknown>;

        if (!firstItem || typeof firstItem !== "object") {
            Log.warn("[DataConverter.autoConvert] First element is invalid");

            return emptyFC();
        }

        const type = _detectPoiType(firstItem);

        if (type === "poi") {
            Log.debug("[DataConverter.autoConvert] Detected as POI array");

            return this.convertPoiArrayToGeoJSON(data);
        }

        if (type === "route") {
            Log.debug("[DataConverter.autoConvert] Detected as route array");

            return this.convertRouteArrayToGeoJSON(data);
        }

        if (type === "zone") {
            Log.debug("[DataConverter.autoConvert] Detected as zone array");

            return this.convertZoneArrayToGeoJSON(data);
        }

        Log.warn("[DataConverter.autoConvert] Unrecognized data type");

        return emptyFC();
    },
};

const DataConverter = DataConverterModule;

export { DataConverter };
