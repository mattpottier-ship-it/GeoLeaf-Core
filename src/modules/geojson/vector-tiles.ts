/* eslint-disable security/detect-object-injection */
/**

 * GeoLeaf GeoJSON Module — Vector Tiles

 * Support for protobuf vector tiles via Leaflet.VectorGrid

 *

 * Sprint 8: Replace heavy GeoJSON polygon/line layers with pre-generated

 * vector tiles for near-zero memory consumption. Tiles are served as

 * static PBF files ({z}/{x}/{y}.pbf) — no tile server required.

 *

 * Requires: leaflet.vectorgrid (optional peer dependency)

 *   <script src="https://unpkg.com/leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.min.js"></script>

 *

 * Fallback: if VectorGrid is not available, the layer falls back to

 * standard GeoJSON loading (single-layer.js pipeline).

 *

 * @module geojson/vector-tiles

 */

"use strict";

import { GeoJSONShared } from "./shared.js";

import { normalizeStyleToLeaflet } from "./style-utils.js";

import { getLog } from "../utils/general-utils.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

const getState = () => GeoJSONShared.state;

/**

 * VectorTiles module — manages VT layer creation, style mapping, and interactions.

 * Exposesd as GeoLeaf._VectorTiles on the global namespace.

 */

function _resolveProfileBasePath(
    def: any,
    g: any
): { basePath: string; profileId: any; layerDir: any } {
    const Config = g.GeoLeaf && g.GeoLeaf.Config;

    const dataCfg = Config && Config.get ? Config.get("data") : null;

    const basePath = (dataCfg && dataCfg.profilesBasePath) || "profiles";

    return { basePath, profileId: def._profileId, layerDir: def._layerDirectory };
}

async function _loadVtStyle(layerId: any, def: any, Log: any, g: any): Promise<any> {
    if (!def.styles || !def.styles.default) return null;

    try {
        return await g.GeoLeaf?._GeoJSONLayerConfig?.loadDefaultStyle(layerId, def);
    } catch (err) {
        Log.warn(
            `[VectorTiles] Could not load default style for ${layerId}:`,
            (err as any).message
        );

        return null;
    }
}

function _buildVtOptions(
    vtConfig: any,
    vtLayerName: string,
    vtStyle: any,
    paneName: string,
    state: any,
    g: any
): any {
    const vtOptions: any = {
        vectorTileLayerStyles: {},

        interactive: vtConfig.interactive !== false,

        maxNativeZoom: vtConfig.maxNativeZoom || 14,

        maxZoom: vtConfig.maxZoom || state.options.maxZoomOnFit || 18,

        minZoom: vtConfig.minZoom || 0,

        pane: paneName,

        rendererFactory: g.L && g.L.canvas ? g.L.canvas.tile : undefined,

        tolerance: vtConfig.tolerance || 3,
    };

    if (vtConfig.featureIdProperty) {
        vtOptions.getFeatureId = (feature: any) =>
            feature.properties[vtConfig.featureIdProperty] || feature.id;
    }

    vtOptions.vectorTileLayerStyles[vtLayerName] = vtStyle;

    return vtOptions;
}

function _buildVtLayerData(
    layerId: any,
    layerLabel: any,
    vtLayer: any,
    vtLayerName: string,

    tileUrl: string,
    styleData: any,
    def: any,
    state: any,
    g: any
): any {
    const { basePath: profilesBasePath } = _resolveProfileBasePath(def, g);

    const layerBasePath = `${profilesBasePath}/${def._profileId}/${def._layerDirectory}`;

    const layerData: any = {
        id: layerId,
        label: layerLabel,
        layer: vtLayer,
        visible: true,

        config: def,
        clusterGroup: null,
        legendsConfig: def.legends,
        basePath: layerBasePath,

        useSharedCluster: false,
        features: [],

        geometryType: def.geometry || def.geometryType || "polygon",

        isVectorTile: true,
        vtLayerName,
        vtTileUrl: tileUrl,
        currentStyle: styleData,
    };

    layerData._visibility = {
        current: false,
        logicalState: false,
        source: "system",

        userOverride: false,
        themeOverride: false,
        themeDesired: null,
        zoomConstrained: false,
    };

    return layerData;
}

function _resolveVtPane(def: any, state: any): string {
    const PaneHelpers = GeoJSONShared.PaneHelpers;
    const PaneConfig = GeoJSONShared.PANE_CONFIG;
    let zIndex = def.zIndex;
    if (typeof zIndex !== "number") {
        zIndex = Math.max(
            PaneConfig.MIN_LAYER_ZINDEX,
            PaneConfig.MAX_LAYER_ZINDEX - Array.from(state.layers.keys()).length
        );
    } else {
        zIndex = PaneHelpers.validateZIndex(zIndex);
    }
    def.zIndex = zIndex;
    return (PaneHelpers as any).getOrCreatePane
        ? (PaneHelpers as any).getOrCreatePane(zIndex, state.map)
        : PaneHelpers.getPaneName(zIndex);
}

function _bindVtClickPopup(vtLayer: any, def: any): void {
    if (!def.popup || def.popup.enabled === false) return;
    vtLayer.on("click", function (e: any) {
        if (!e.layer || !e.layer.properties) return;
        const feature = { type: "Feature", properties: e.layer.properties, geometry: null };
        const PopupTooltip = _g.GeoLeaf && _g.GeoLeaf._GeoJSONPopupTooltip;
        if (PopupTooltip && typeof PopupTooltip._buildPopupContent === "function") {
            const content = PopupTooltip._buildPopupContent(feature, def);
            if (content)
                _g.L.popup().setLatLng(e.latlng).setContent(content).openOn(getState().map);
        } else {
            const props = feature.properties;
            const lines = Object.keys(props)
                .filter((k) => props[k] !== null && props[k] !== undefined)
                .slice(0, 10)
                .map((k) => `<b>${k}:</b> ${props[k]}`);
            if (lines.length > 0)
                _g.L.popup()
                    .setLatLng(e.latlng)
                    .setContent(lines.join("<br>"))
                    .openOn(getState().map);
        }
    });
}

function _bindVtHoverTooltip(vtLayer: any, def: any): void {
    if (!def.tooltip || def.tooltip.enabled === false) return;
    let tooltipLayer: any = null;
    vtLayer.on("mouseover", function (e: any) {
        if (!e.layer || !e.layer.properties) return;
        const fields = def.tooltip.fields;
        if (!fields || !Array.isArray(fields) || fields.length === 0) return;
        const propValue = _resolvePropertyPath(e.layer.properties, fields[0].field || "");
        if (propValue) {
            tooltipLayer = _g.L.tooltip({ sticky: true })
                .setLatLng(e.latlng)
                .setContent(String(propValue));
            getState().map.addLayer(tooltipLayer);
        }
    });
    vtLayer.on("mouseout", function () {
        if (tooltipLayer) {
            getState().map.removeLayer(tooltipLayer);
            tooltipLayer = null;
        }
    });
}

const VectorTiles = {
    // ════════════════════════════════════════════════════════════════

    //   DETECTION

    // ════════════════════════════════════════════════════════════════

    /**

     * Check whether Leaflet.VectorGrid is loaded and usable.

     * @returns {boolean}

     */

    isAvailable() {
        return !!(_g.L && _g.L.vectorGrid && typeof _g.L.vectorGrid.protobuf === "function");
    },

    /**

     * Determine if a layer definition should use vector tiles.

     * Returns true only when:

     * 1. The layer has a vectorTiles config with enabled !== false

     * 2. Leaflet.VectorGrid is loaded

     * 3. The layer's default style does NOT use SVG hatch patterns

     *    (VectorGrid uses Canvas tiles — SVG patterns are incompatible)

     *

     * @param {Object} def - Normalised layer definition

     * @returns {boolean}

     */

    shouldUseVectorTiles(def: any) {
        const vtConfig = this._getVTConfig(def);

        if (!vtConfig || vtConfig.enabled === false) return false;

        if (!this.isAvailable()) return false;

        // Layers requiring SVG hatch patterns cannot use VectorGrid (Canvas-based).

        // Check the inline style definition for hatch config.

        if (def.style && def.style.hatch && def.style.hatch.enabled) {
            const Log = getLog();

            Log.info(
                `[VectorTiles] Layer "${def.id}" has hatch patterns → falling back to GeoJSON/SVG renderer`
            );

            return false;
        }

        return true;
    },

    // ════════════════════════════════════════════════════════════════

    //   CONFIG HELPERS

    // ════════════════════════════════════════════════════════════════

    /**

     * Extract the vectorTiles config block from a layer definition.

     * Supports both `def.vectorTiles` and `def.data.vectorTiles`.

     *

     * @param {Object} def

     * @returns {Object|null}

     * @private

     */

    _getVTConfig(def: any) {
        if (!def) return null;

        if (def.vectorTiles && typeof def.vectorTiles === "object") {
            return def.vectorTiles;
        }

        if (def.data && def.data.vectorTiles && typeof def.data.vectorTiles === "object") {
            return def.data.vectorTiles;
        }

        return null;
    },

    /**

     * Resolve the full tile URL template from the layer definition.

     * If the config provides an absolute URL, returns it as-is.

     * Otherwise builds a relative path: `{profilesBasePath}/{profileId}/{layerDir}/{tilesDir}/{z}/{x}/{y}.pbf`

     *

     * @param {Object} def - Layer definition (must contain _profileId + _layerDirectory)

     * @param {Object} vtConfig - The vectorTiles config block

     * @returns {string|null}

     * @private

     */

    _resolveTileUrl(def: any, vtConfig: any) {
        // Absolute URL or explicit template

        if (vtConfig.url) {
            if (
                vtConfig.url.startsWith("http") ||
                vtConfig.url.startsWith("//") ||
                vtConfig.url.startsWith("/")
            ) {
                return vtConfig.url;
            }
        }

        const {
            basePath: profilesBasePath,
            profileId,
            layerDir,
        } = _resolveProfileBasePath(def, _g);

        if (!profileId || !layerDir) {
            // Cannot resolve relative → try raw url fallback

            return vtConfig.url || null;
        }

        const tilesDir = vtConfig.tilesDirectory || "tiles";

        return `${profilesBasePath}/${profileId}/${layerDir}/${tilesDir}/{z}/{x}/{y}.pbf`;
    },

    // ════════════════════════════════════════════════════════════════

    //   STYLE CONVERSION

    // ════════════════════════════════════════════════════════════════

    /**

     * Normalise a GeoLeaf style object into flat Leaflet Path options.

     * Phase 4 dedup: delegates to shared style-utils.

     * @private

     */

    _normalizeStyle(style: any) {
        return normalizeStyleToLeaflet(style, { setFillFlag: true });
    },

    /**

     * Convert a full GeoLeaf style definition (defaultStyle + styleRules)

     * into a VectorGrid-compatible style value.

     *

     * If styleRules are present, returns a **function(properties, zoom)**

     * that evaluates rules per-feature (called by VectorGrid for each tile feature).

     *

     * If only a static defaultStyle is present, returns a flat style object.

     *

     * @param {Object|null} styleData - Loaded style JSON ({defaultStyle, styleRules, ...})

     * @param {Object|null} fallbackStyle - Fallback default style (GeoLeaf defaults)

     * @returns {Object|Function} VectorGrid style value

     */

    convertStyleToVT(styleData: any, fallbackStyle: any) {
        const self = this;

        const base = this._normalizeStyle(fallbackStyle || {});

        if (!styleData) return base;

        // Merge defaultStyle from loaded style JSON

        const merged = Object.assign({}, base, this._normalizeStyle(styleData.defaultStyle));

        // If styleRules are present, return a function for per-feature evaluation

        if (
            styleData.styleRules &&
            Array.isArray(styleData.styleRules) &&
            styleData.styleRules.length > 0
        ) {
            const rules = styleData.styleRules;

            return function vtStyleFunction(properties: any, _zoom: any) {
                // Build a pseudo-feature for evaluateStyleRules

                const feature = { properties: properties || {} };

                const StyleResolver = _g.GeoLeaf && _g.GeoLeaf._GeoJSONStyleResolver;

                if (StyleResolver && typeof StyleResolver.evaluateStyleRules === "function") {
                    const matched = StyleResolver.evaluateStyleRules(feature, rules);

                    if (matched) {
                        return Object.assign({}, merged, self._normalizeStyle(matched));
                    }
                }

                return merged;
            };
        }

        return merged;
    },

    // ════════════════════════════════════════════════════════════════

    //   LAYER CREATION

    // ════════════════════════════════════════════════════════════════

    /**

     * Create and return a L.vectorGrid.protobuf layer for a VT-enabled definition.

     * This is the main entry point called from single-layer.js.

     *

     * @param {string} layerId - Unique layer ID

     * @param {string} layerLabel - Display label

     * @param {Object} def - Normalised layer definition (must include vectorTiles block)

     * @param {Object} baseOptions - Base options from GeoJSON module

     * @returns {Promise<Object>} Layer metadata (id, label, featureCount, isVectorTile)

     */

    async loadVectorTileLayer(layerId: any, layerLabel: any, def: any, _baseOptions: any) {
        const Log = getLog();
        const state = getState();
        const vtConfig = this._getVTConfig(def);
        if (!vtConfig) throw new Error(`[VectorTiles] No vectorTiles config for ${layerId}`);
        const tileUrl = this._resolveTileUrl(def, vtConfig);
        if (!tileUrl) throw new Error(`[VectorTiles] Cannot resolve tile URL for ${layerId}`);
        const styleData = await _loadVtStyle(layerId, def, Log, _g);
        const vtStyle = this.convertStyleToVT(styleData, state.options.defaultStyle);
        const vtLayerName = vtConfig.layerName || def.id;
        const paneName = _resolveVtPane(def, state);
        const vtOptions = _buildVtOptions(vtConfig, vtLayerName, vtStyle, paneName, state, _g);
        Log.info(
            `[GeoLeaf.VectorTiles] ⭡ Creating VT layer: ${layerId} (tile layer: ${vtLayerName})`
        );
        Log.debug(`[GeoLeaf.VectorTiles] URL template: ${tileUrl}`);
        const vtLayer = _g.L.vectorGrid.protobuf(tileUrl, vtOptions);
        if (vtConfig.interactive !== false) this._bindInteractions(vtLayer, def);
        const layerData = _buildVtLayerData(
            layerId,
            layerLabel,
            vtLayer,
            vtLayerName,
            tileUrl,
            styleData,
            def,
            state,
            _g
        );
        state.layers.set(layerId, layerData);
        if (_g.GeoLeaf && _g.GeoLeaf._GeoJSONLayerManager)
            _g.GeoLeaf._GeoJSONLayerManager.updateLayerVisibilityByZoom();
        layerData.visible = false;
        Log.info(`[GeoLeaf.VectorTiles] ✅ VT layer loaded: ${layerId}`);
        return { id: layerId, label: layerLabel, featureCount: 0, isVectorTile: true };
    },

    // ════════════════════════════════════════════════════════════════

    //   INTERACTIONS (POPUP / TOOLTIP)

    // ════════════════════════════════════════════════════════════════

    /**

     * Bind popup and tooltip interactions to a VectorGrid layer.

     * VectorGrid fires clickk/mouseover on individual tile features,

     * providing `e.layer.properties` from the PBF data.

     *

     * @param {L.VectorGrid} vtLayer - The VectorGrid layer

     * @param {Object} def - Layer definition (popup/tooltip config)

     * @private

     */

    _bindInteractions(vtLayer: any, def: any) {
        _bindVtClickPopup(vtLayer, def);
        _bindVtHoverTooltip(vtLayer, def);
    },

    // ════════════════════════════════════════════════════════════════

    //   STYLE UPDATES (for theme changes)

    // ════════════════════════════════════════════════════════════════

    /**

     * Update the style of an existing VT layer.

     * Called by the LayerManager / Themes when the active style changes.

     *

     * @param {string} layerId - Layer ID

     * @param {Object} styleData - New style JSON ({defaultStyle, styleRules, ...})

     */

    updateLayerStyle(layerId: any, styleData: any) {
        const Log = getLog();

        const state = getState();

        const layerData = state.layers.get(layerId);

        if (!layerData || !layerData.isVectorTile) return;

        const vtLayerName = layerData.vtLayerName;

        const vtLayer = layerData.layer;

        if (!vtLayer || !vtLayer.options) return;

        const fallbackStyle = state.options.defaultStyle;

        const newStyle = this.convertStyleToVT(styleData, fallbackStyle);

        vtLayer.options.vectorTileLayerStyles[vtLayerName] = newStyle;

        // Force redraw to apply new styles

        if (typeof vtLayer.redraw === "function") {
            vtLayer.redraw();
        }

        layerData.currentStyle = styleData;

        Log.debug(`[GeoLeaf.VectorTiles] Style updated for ${layerId}`);
    },
};

// ════════════════════════════════════════════════════════════════

//   PRIVATE HELPERS

// ════════════════════════════════════════════════════════════════

/**

 * Resolve a dot-notation property path against a flat properties object.

 * Handles "properties.Name" → looks up "Name" (strips "properties." prefix).

 *

 * @param {Object} props - Flat properties from vector tile feature

 * @param {string} path - Dot-notation path (e.g. "properties.Name")

 * @returns {*} Resolved value or null

 * @private

 */

function _resolvePropertyPath(props: any, path: any) {
    if (!props || !path) return null;

    // Strip leading "properties." since VT features already provide flat properties

    const cleanPath = path.startsWith("properties.") ? path.substring("properties.".length) : path;

    // Simple dot-notation resolution

    const parts = cleanPath.split(".");

    let current = props;

    for (const part of parts) {
        if (current === null || current === undefined) return null;

        current = current[part];
    }

    return current !== undefined ? current : null;
}

export { VectorTiles };
