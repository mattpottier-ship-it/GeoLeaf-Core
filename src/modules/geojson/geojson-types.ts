/*!
 * GeoLeaf Core – GeoJSON types
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/** GeoJSON Feature (geometry + properties) */
export interface GeoJSONFeature {
    type: "Feature";
    id?: string | number;
    geometry: GeoJSONGeometry;
    properties?: Record<string, unknown> | null;
}

/** GeoJSON geometry (minimal union for layer handling) */
export type GeoJSONGeometry =
    | { type: "Point"; coordinates: [number, number] | [number, number, number] }
    | { type: "LineString"; coordinates: [number, number][] | [number, number, number][] }
    | { type: "Polygon"; coordinates: [number, number][][] | [number, number, number][][] }
    | { type: "MultiPoint"; coordinates: ([number, number] | [number, number, number])[] }
    | { type: "MultiLineString"; coordinates: ([number, number][] | [number, number, number][])[] }
    | {
          type: "MultiPolygon";
          coordinates: ([number, number][][] | [number, number, number][][])[];
      };

/** GeoJSON FeatureCollection */
export interface GeoJSONFeatureCollection {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
}

/** Style rule condition (when) */
export interface GeoJSONStyleRuleCondition {
    field?: string;
    operator?: string;
    value?: unknown;
    all?: GeoJSONStyleRuleCondition[];
}

/** Style rule (when + style) */
export interface GeoJSONStyleRule {
    when: GeoJSONStyleRuleCondition;
    style: GeoJSONStyle;
}

/** GeoJSON layer style (nested fill/stroke or flat) */
export interface GeoJSONStyle {
    fill?: { color?: string; opacity?: number; pattern?: unknown };
    stroke?: {
        color?: string;
        opacity?: number;
        widthPx?: number;
        dashArray?: string;
        lineCap?: string;
        lineJoin?: string;
    };
    shape?: string;
    sizePx?: number;
    hatch?: { enabled?: boolean; renderMode?: string; [key: string]: unknown };
    [key: string]: unknown;
}

/** Options for a GeoJSON layer (config layer entry) */
export interface GeoJSONLayerOptions {
    id?: string;
    label?: string;
    url?: string;
    data?: unknown;
    defaultStyle?: GeoJSONStyle;
    defaultPointStyle?: Record<string, unknown>;
    styleRules?: GeoJSONStyleRule[];
    pointToLayer?: (feature: GeoJSONFeature, latlng: unknown) => unknown;
    onEachFeature?: (feature: GeoJSONFeature, layer: unknown) => void;
    interactiveShape?: boolean;
    fitBoundsOnLoad?: boolean;
    maxZoomOnFit?: number;
    popup?: { fields?: unknown[] };
    tooltip?: { fields?: unknown[] };
    sidepanel?: { detailLayout?: unknown[] };
    popupFields?: unknown[];
    tooltipFields?: unknown[];
    sidepanelFields?: unknown[];
    [key: string]: unknown;
}

/** Single layer state entry (state.layers Map value) */
export interface GeoJSONLayerStateEntry {
    id: string;
    label?: string;
    layer: unknown;
    visible: boolean;
    config: GeoJSONLayerOptions;
    clusterGroup?: unknown;
}
