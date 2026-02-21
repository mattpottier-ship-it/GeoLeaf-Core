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

import { GeoJSONShared } from './shared.js';
import { normalizeStyleToLeaflet } from './style-utils.js';
import { getLog } from '../utils/general-utils.js';

const _g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

const getState = () => GeoJSONShared.state;

/**
 * VectorTiles module — manages VT layer creation, style mapping, and interactions.
 * Exposed as GeoLeaf._VectorTiles on the global namespace.
 */
const VectorTiles = {

    // ════════════════════════════════════════════════════════════════
    //   DETECTION
    // ════════════════════════════════════════════════════════════════

    /**
     * Check whether Leaflet.VectorGrid is loaded and usable.
     * @returns {boolean}
     */
    isAvailable() {
        return !!(
            _g.L &&
            _g.L.vectorGrid &&
            typeof _g.L.vectorGrid.protobuf === 'function'
        );
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
    shouldUseVectorTiles(def) {
        const vtConfig = this._getVTConfig(def);
        if (!vtConfig || vtConfig.enabled === false) return false;
        if (!this.isAvailable()) return false;

        // Layers requiring SVG hatch patterns cannot use VectorGrid (Canvas-based).
        // Check the inline style definition for hatch config.
        if (def.style && def.style.hatch && def.style.hatch.enabled) {
            const Log = getLog();
            Log.info(`[VectorTiles] Layer "${def.id}" has hatch patterns → falling back to GeoJSON/SVG renderer`);
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
    _getVTConfig(def) {
        if (!def) return null;
        if (def.vectorTiles && typeof def.vectorTiles === 'object') {
            return def.vectorTiles;
        }
        if (def.data && def.data.vectorTiles && typeof def.data.vectorTiles === 'object') {
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
    _resolveTileUrl(def, vtConfig) {
        // Absolute URL or explicit template
        if (vtConfig.url) {
            if (vtConfig.url.startsWith('http') || vtConfig.url.startsWith('//') || vtConfig.url.startsWith('/')) {
                return vtConfig.url;
            }
        }

        const Config = _g.GeoLeaf && _g.GeoLeaf.Config;
        const dataCfg = Config && Config.get ? Config.get('data') : null;
        const profilesBasePath = (dataCfg && dataCfg.profilesBasePath) || 'profiles';
        const profileId = def._profileId;
        const layerDir = def._layerDirectory;

        if (!profileId || !layerDir) {
            // Cannot resolve relative → try raw url fallback
            return vtConfig.url || null;
        }

        const tilesDir = vtConfig.tilesDirectory || 'tiles';
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
    _normalizeStyle(style) {
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
    convertStyleToVT(styleData, fallbackStyle) {
        const self = this;
        const base = this._normalizeStyle(fallbackStyle || {});

        if (!styleData) return base;

        // Merge defaultStyle from loaded style JSON
        const merged = Object.assign({}, base, this._normalizeStyle(styleData.defaultStyle));

        // If styleRules are present, return a function for per-feature evaluation
        if (styleData.styleRules && Array.isArray(styleData.styleRules) && styleData.styleRules.length > 0) {
            const rules = styleData.styleRules;

            return function vtStyleFunction(properties, zoom) {
                // Build a pseudo-feature for evaluateStyleRules
                const feature = { properties: properties || {} };

                const StyleResolver = _g.GeoLeaf && _g.GeoLeaf._GeoJSONStyleResolver;
                if (StyleResolver && typeof StyleResolver.evaluateStyleRules === 'function') {
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
    async loadVectorTileLayer(layerId, layerLabel, def, baseOptions) {
        const Log = getLog();
        const state = getState();
        const vtConfig = this._getVTConfig(def);

        if (!vtConfig) {
            throw new Error(`[VectorTiles] No vectorTiles config for ${layerId}`);
        }

        // 1. Resolve tile URL
        const tileUrl = this._resolveTileUrl(def, vtConfig);
        if (!tileUrl) {
            throw new Error(`[VectorTiles] Cannot resolve tile URL for ${layerId}`);
        }

        // 2. Load default style (same mechanism as GeoJSON layers)
        let styleData = null;
        try {
            if (def.styles && def.styles.default) {
                styleData = await (_g.GeoLeaf && _g.GeoLeaf._GeoJSONLayerConfig && _g.GeoLeaf._GeoJSONLayerConfig.loadDefaultStyle(layerId, def));
            }
        } catch (err) {
            Log.warn(`[VectorTiles] Could not load default style for ${layerId}:`, err.message);
        }

        // 3. Convert style
        const fallbackStyle = state.options.defaultStyle;
        const vtStyle = this.convertStyleToVT(styleData, fallbackStyle);

        // 4. Layer name in the vector tile (configured or defaults to layer id)
        const vtLayerName = vtConfig.layerName || def.id;

        // 5. Resolve pane
        const PaneHelpers = GeoJSONShared.PaneHelpers;
        const PaneConfig = GeoJSONShared.PANE_CONFIG;

        let zIndex = def.zIndex;
        if (typeof zIndex !== 'number') {
            const allLayerIds = Array.from(state.layers.keys());
            zIndex = Math.max(PaneConfig.MIN_LAYER_ZINDEX, PaneConfig.MAX_LAYER_ZINDEX - allLayerIds.length);
        } else {
            zIndex = PaneHelpers.validateZIndex(zIndex);
        }
        def.zIndex = zIndex;

        const paneName = PaneHelpers.getOrCreatePane
            ? PaneHelpers.getOrCreatePane(zIndex, state.map)
            : PaneHelpers.getPaneName(zIndex);

        // 6. Build VectorGrid options
        const vtOptions = {
            vectorTileLayerStyles: {},
            interactive: vtConfig.interactive !== false,
            maxNativeZoom: vtConfig.maxNativeZoom || 14,
            maxZoom: vtConfig.maxZoom || (state.options.maxZoomOnFit || 18),
            minZoom: vtConfig.minZoom || 0,
            pane: paneName,
            rendererFactory: _g.L && _g.L.canvas ? _g.L.canvas.tile : undefined,
            tolerance: vtConfig.tolerance || 3,
        };

        // Feature ID accessor (for setFeatureStyle)
        if (vtConfig.featureIdProperty) {
            vtOptions.getFeatureId = function (feature) {
                return feature.properties[vtConfig.featureIdProperty] || feature.id;
            };
        }

        vtOptions.vectorTileLayerStyles[vtLayerName] = vtStyle;

        Log.info(`[GeoLeaf.VectorTiles] ⬡ Creating VT layer: ${layerId} (tile layer: ${vtLayerName})`);
        Log.debug(`[GeoLeaf.VectorTiles] URL template: ${tileUrl}`);

        // 7. Create the VectorGrid layer
        const vtLayer = _g.L.vectorGrid.protobuf(tileUrl, vtOptions);

        // 8. Bind interactions (popup, tooltip)
        if (vtConfig.interactive !== false) {
            this._bindInteractions(vtLayer, def);
        }

        // 9. Store in state.layers (same structure as GeoJSON layers for LayerManager compat)
        const Config = _g.GeoLeaf && _g.GeoLeaf.Config;
        const dataCfg = Config && Config.get ? Config.get('data') : null;
        const profilesBasePath = (dataCfg && dataCfg.profilesBasePath) || 'profiles';
        const layerBasePath = `${profilesBasePath}/${def._profileId}/${def._layerDirectory}`;

        const layerData = {
            id: layerId,
            label: layerLabel,
            layer: vtLayer,
            visible: true,
            config: def,
            clusterGroup: null,
            legendsConfig: def.legends,
            basePath: layerBasePath,
            useSharedCluster: false,
            features: [],  // VT layers don't expose raw features
            geometryType: def.geometry || def.geometryType || 'polygon',
            // Sprint 8: VT-specific metadata
            isVectorTile: true,
            vtLayerName: vtLayerName,
            vtTileUrl: tileUrl,
            currentStyle: styleData
        };

        // Visibility metadata (same as GeoJSON layers)
        layerData._visibility = {
            current: false,
            logicalState: false,
            source: 'system',
            userOverride: false,
            themeOverride: false,
            themeDesired: null,
            zoomConstrained: false
        };

        state.layers.set(layerId, layerData);

        // VT layers do NOT go into ThemeCache (nothing to cache — tiles are streamed)

        // Apply zoom visibility if LayerManager is available
        if (_g.GeoLeaf && _g.GeoLeaf._GeoJSONLayerManager) {
            _g.GeoLeaf._GeoJSONLayerManager.updateLayerVisibilityByZoom();
        }

        // Don't auto-add to map — themes control visibility
        layerData.visible = false;

        Log.info(`[GeoLeaf.VectorTiles] ✅ VT layer loaded: ${layerId}`);

        return {
            id: layerId,
            label: layerLabel,
            featureCount: 0,  // VT: feature count unknown until tiles are rendered
            isVectorTile: true
        };
    },

    // ════════════════════════════════════════════════════════════════
    //   INTERACTIONS (POPUP / TOOLTIP)
    // ════════════════════════════════════════════════════════════════

    /**
     * Bind popup and tooltip interactions to a VectorGrid layer.
     * VectorGrid fires click/mouseover on individual tile features,
     * providing `e.layer.properties` from the PBF data.
     *
     * @param {L.VectorGrid} vtLayer - The VectorGrid layer
     * @param {Object} def - Layer definition (popup/tooltip config)
     * @private
     */
    _bindInteractions(vtLayer, def) {
        const Log = getLog();
        const PopupTooltip = _g.GeoLeaf && _g.GeoLeaf._GeoJSONPopupTooltip;

        // ── Click → popup ──
        if (def.popup && def.popup.enabled !== false) {
            vtLayer.on('click', function (e) {
                if (!e.layer || !e.layer.properties) return;

                const feature = {
                    type: 'Feature',
                    properties: e.layer.properties,
                    geometry: null  // Geometry not available from VT click events
                };

                // Build popup content the same way as GeoJSON layers
                if (PopupTooltip && typeof PopupTooltip._buildPopupContent === 'function') {
                    const content = PopupTooltip._buildPopupContent(feature, def);
                    if (content) {
                        _g.L.popup()
                            .setLatLng(e.latlng)
                            .setContent(content)
                            .openOn(getState().map);
                    }
                } else {
                    // Fallback: simple properties dump
                    const props = feature.properties;
                    const lines = Object.keys(props)
                        .filter(k => props[k] !== null && props[k] !== undefined)
                        .slice(0, 10)
                        .map(k => `<b>${k}:</b> ${props[k]}`);
                    if (lines.length > 0) {
                        _g.L.popup()
                            .setLatLng(e.latlng)
                            .setContent(lines.join('<br>'))
                            .openOn(getState().map);
                    }
                }
            });
        }

        // ── Hover → tooltip ──
        if (def.tooltip && def.tooltip.enabled !== false) {
            let tooltipLayer = null;

            vtLayer.on('mouseover', function (e) {
                if (!e.layer || !e.layer.properties) return;

                const fields = def.tooltip.fields;
                if (!fields || !Array.isArray(fields) || fields.length === 0) return;

                // Extract the first text field for tooltip
                const firstField = fields[0];
                const fieldPath = firstField.field || '';
                const propValue = _resolvePropertyPath(e.layer.properties, fieldPath);

                if (propValue) {
                    tooltipLayer = _g.L.tooltip({ sticky: true })
                        .setLatLng(e.latlng)
                        .setContent(String(propValue));
                    getState().map.addLayer(tooltipLayer);
                }
            });

            vtLayer.on('mouseout', function () {
                if (tooltipLayer) {
                    getState().map.removeLayer(tooltipLayer);
                    tooltipLayer = null;
                }
            });
        }
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
    updateLayerStyle(layerId, styleData) {
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
        if (typeof vtLayer.redraw === 'function') {
            vtLayer.redraw();
        }

        layerData.currentStyle = styleData;
        Log.debug(`[GeoLeaf.VectorTiles] Style updated for ${layerId}`);
    }
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
function _resolvePropertyPath(props, path) {
    if (!props || !path) return null;

    // Strip leading "properties." since VT features already provide flat properties
    const cleanPath = path.startsWith('properties.')
        ? path.substring('properties.'.length)
        : path;

    // Simple dot-notation resolution
    const parts = cleanPath.split('.');
    let current = props;
    for (const part of parts) {
        if (current === null || current === undefined) return null;
        current = current[part];
    }
    return current !== undefined ? current : null;
}


export { VectorTiles };
