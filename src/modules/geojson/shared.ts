/**
 * GeoLeaf GeoJSON Module - Shared State & Constants
 * @module geojson/shared
 */

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

interface GeoLeafConstants {
    GEOJSON_MAX_ZOOM_ON_FIT?: number;
}
interface GeoLeafGlobal {
    GeoLeaf?: { CONSTANTS?: GeoLeafConstants; Log?: { warn?: (a: string, b?: unknown) => void } };
}

const defaultOptions = () => ({
    defaultStyle: {
        color: "#999999",
        weight: 2,
        opacity: 0.9,
        fillColor: "#cccccc",
        fillOpacity: 0.15,
    },
    defaultPointStyle: {
        radius: 6,
        color: "#999999",
        weight: 2,
        fillColor: "#cccccc",
        fillOpacity: 0.9,
    },
    onEachFeature: null as ((feature: unknown, layer: unknown) => void) | null,
    pointToLayer: null as ((feature: unknown, latlng: unknown) => unknown) | null,
    fitBoundsOnLoad: true,
    maxZoomOnFit: (_g as GeoLeafGlobal).GeoLeaf?.CONSTANTS?.GEOJSON_MAX_ZOOM_ON_FIT ?? 18,
});

const GeoJSONShared = {
    state: {
        map: null as any,
        layerGroup: null as unknown,
        geoJsonLayer: null as unknown,
        layers: new Map<string, any>(),
        layerIdCounter: 0,
        options: defaultOptions(),
    },

    PANE_CONFIG: {
        BASEMAP_NAME: "geoleaf-basemap",
        BASEMAP_ZINDEX: 200,
        LAYER_PREFIX: "geoleaf-layer-",
        LAYER_BASE_ZINDEX: 400,
        MIN_LAYER_ZINDEX: 0,
        MAX_LAYER_ZINDEX: 99,
    },

    PaneHelpers: {
        getPaneName(zIndex: number): string {
            const config = GeoJSONShared.PANE_CONFIG;
            return `${config.LAYER_PREFIX}${zIndex || 0}`;
        },
        validateZIndex(zIndex: number): number {
            const config = GeoJSONShared.PANE_CONFIG;
            return Math.max(
                config.MIN_LAYER_ZINDEX,
                Math.min(config.MAX_LAYER_ZINDEX, Math.floor(zIndex))
            );
        },
        applyPaneToLayer(layer: { options?: { pane?: string } }, zIndex: number): void {
            if (layer?.options) {
                layer.options.pane = this.getPaneName(zIndex);
            }
        },
    },

    STYLE_OPERATORS: {
        ">": (a: unknown, b: unknown) => Number(a) > Number(b),
        ">=": (a: unknown, b: unknown) => Number(a) >= Number(b),
        "<": (a: unknown, b: unknown) => Number(a) < Number(b),
        "<=": (a: unknown, b: unknown) => Number(a) <= Number(b),
        "==": (a: unknown, b: unknown) => a == b,
        "===": (a: unknown, b: unknown) => a === b,
        eq: (a: unknown, b: unknown) => a == b,
        "!=": (a: unknown, b: unknown) => a != b,
        "!==": (a: unknown, b: unknown) => a !== b,
        neq: (a: unknown, b: unknown) => a != b,
        contains: (a: unknown, b: unknown) =>
            String(a).toLowerCase().includes(String(b).toLowerCase()),
        startsWith: (a: unknown, b: unknown) =>
            String(a).toLowerCase().startsWith(String(b).toLowerCase()),
        endsWith: (a: unknown, b: unknown) =>
            String(a).toLowerCase().endsWith(String(b).toLowerCase()),
        in: (a: unknown, b: unknown) => Array.isArray(b) && b.includes(a),
        notIn: (a: unknown, b: unknown) => Array.isArray(b) && !b.includes(a),
        between: (a: unknown, b: unknown) => {
            if (!Array.isArray(b) || b.length !== 2) return false;
            const num = Number(a);
            const min = Number(b[0]);
            const max = Number(b[1]);
            return num >= min && num <= max;
        },
    } as Record<string, (a: unknown, b: unknown) => boolean>,

    reset(): void {
        const state = GeoJSONShared.state;
        state.map = null;
        state.layerGroup = null;
        state.geoJsonLayer = null;
        state.layers = new Map();
        state.layerIdCounter = 0;
        state.options = defaultOptions();
    },

    getLog(): typeof console | { warn?: (a: string, b?: unknown) => void } {
        return (_g as GeoLeafGlobal).GeoLeaf?.Log ?? console;
    },

    getLayers(): Map<string, unknown> {
        return GeoJSONShared.state.layers;
    },

    getLayerById(layerId: string): unknown {
        return GeoJSONShared.state.layers.get(layerId);
    },
};

export { GeoJSONShared };
