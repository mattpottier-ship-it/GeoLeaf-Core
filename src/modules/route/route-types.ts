/*!
 * GeoLeaf Core – Route types
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/** Line style for route polyline (Leaflet Polyline options) */
export interface RouteLineStyle {
    color?: string;
    weight?: number;
    opacity?: number;
    dashArray?: string;
    interactive?: boolean;
    [key: string]: unknown;
}

/** Waypoint / circle marker style */
export interface RouteWaypointStyle {
    radius?: number;
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    weight?: number;
    [key: string]: unknown;
}

/** Init options for the Route module */
export interface RouteOptions {
    map?: unknown;
    lineStyle?: RouteLineStyle;
    waypointStyle?: RouteWaypointStyle;
    startWaypointStyle?: RouteWaypointStyle;
    endWaypointStyle?: RouteWaypointStyle;
    showStart?: boolean;
    showEnd?: boolean;
    fitBoundsOnLoad?: boolean;
    maxZoomOnFit?: number;
    [key: string]: unknown;
}

/** Route item from config (profile routes array) */
export interface RouteItem {
    id?: string;
    label?: string;
    name?: string;
    description?: string;
    geometry?: [number, number][] | GeoJSONLineString | GeoJSONMultiLineString;
    attributes?: RouteItemAttributes;
    properties?: RouteItemProperties;
    [key: string]: unknown;
}

export interface RouteItemAttributes {
    categoryId?: string;
    subCategoryId?: string;
    description?: string;
    photo?: string;
    distance_km?: string | number;
    duration_min?: string | number;
    difficulty?: string;
    tags?: string[];
    link?: string;
    [key: string]: unknown;
}

export interface RouteItemProperties {
    color?: string;
    weight?: number;
    opacity?: number;
    dashArray?: string;
    showStart?: boolean;
    showEnd?: boolean;
    startStyle?: RouteWaypointStyle;
    endStyle?: RouteWaypointStyle;
    [key: string]: unknown;
}

/** GeoJSON LineString geometry */
export interface GeoJSONLineString {
    type: "LineString";
    coordinates: [number, number][] | [number, number, number][];
}

/** GeoJSON MultiLineString geometry */
export interface GeoJSONMultiLineString {
    type: "MultiLineString";
    coordinates: ([number, number][] | [number, number, number][])[];
}

/** GeoJSON Feature with LineString (for loadGeoJSON) */
export interface GeoJSONRouteFeature {
    type: "Feature";
    geometry: GeoJSONLineString;
    properties?: Record<string, unknown>;
}

/** Raw GPX document (parsed XML) — minimal shape for route extraction */
export interface GPXData {
    getElementsByTagName(tagName: "trkpt"): HTMLCollectionOf<Element>;
    [key: string]: unknown;
}

/** Context passed to RouteLayerManager.applyRoute */
export interface RouteContext {
    map?: unknown;
    layerGroup?: unknown;
    routeLayer?: unknown;
    options?: {
        lineStyle?: RouteLineStyle;
        fitBoundsOnLoad?: boolean;
        maxZoomOnFit?: number;
        [key: string]: unknown;
    };
}
