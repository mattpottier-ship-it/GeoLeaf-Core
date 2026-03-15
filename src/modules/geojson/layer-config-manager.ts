/**
 * GeoLeaf GeoJSON Module - Layer Configuration Manager
 * Gestion de la configuration et des options des layers
 *
 * @module geojson/layer-config-manager
 */
"use strict";

import { GeoJSONShared } from "./shared.js";
import { getLog } from "../utils/general-utils.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

// DEPENDENCIES lazy — fallback pour tests (resolution module Jest)
const _defaultState = {
    options: {
        defaultStyle: {},
        defaultPointStyle: {},
        onEachFeature: null,
        pointToLayer: null,
        fitBoundsOnLoad: true,
        maxZoomOnFit: 18,
    },
};
const getState = () => (GeoJSONShared && GeoJSONShared.state ? GeoJSONShared.state : _defaultState);

const LayerConfigManager: any = {};

/**
 * Resolves le path absolu of a file de data
 *
 * @param {string} dataFile - Nom du file de data
 * @param {Object} profile - Profil active
 * @param {string} [layerDirectory] - Folder de the layer
 * @returns {string} Path absolu resolved
 */
function _resolveProfileBasePath(profile: any): { profilesBasePath: string; profileId: string } {
    const Config = _g.GeoLeaf && _g.GeoLeaf.Config;
    const dataCfg = Config && Config.get ? Config.get("data") : null;
    return {
        profilesBasePath: (dataCfg && dataCfg.profilesBasePath) || "profiles",
        profileId: (dataCfg && dataCfg.activeProfile) || profile.id,
    };
}

LayerConfigManager.resolveDataFilePath = function (
    dataFile: any,
    profile: any,
    layerDirectory: any
) {
    const { profilesBasePath, profileId } = _resolveProfileBasePath(profile);

    // Si dataFile commence par ../, on resolves relative to the folder of the profile
    if (dataFile.startsWith("../")) {
        // dataFile = "../raw/file.json" -> "profiles/tourism/raw/file.json"
        const relativePath = dataFile.replace("../", "");
        return `${profilesBasePath}/${profileId}/${relativePath}`;
    }

    // Si dataFile commence par /, c'est un path absolu
    if (dataFile.startsWith("/")) {
        return dataFile;
    }

    // Sinon, relatif au folder de the layer (layers/tourism_poi_all/data/file.json)
    if (layerDirectory) {
        return `${profilesBasePath}/${profileId}/${layerDirectory}/${dataFile}`;
    }

    // Fallback: relatif au folder of the profile
    return `${profilesBasePath}/${profileId}/${dataFile}`;
};

/**
 * Infers the geometry type of a layer
 *
 * @param {Object} def - Setsion de the layer
 * @param {Object} geojsonData - Data GeoJSON
 * @returns {string} Type of geometry ('point', 'line', 'polygon', 'unknown')
 */
LayerConfigManager.inferGeometryType = function (def: any, geojsonData: any) {
    if (def && typeof def.geometryType === "string") return def.geometryType;
    const features = geojsonData && Array.isArray(geojsonData.features) ? geojsonData.features : [];
    const first = features.find((f: any) => f && f.geometry && f.geometry.type);
    if (!first) return "unknown";
    const geometryType = first.geometry.type.toLowerCase();
    if (geometryType.includes("point")) return "point";
    if (geometryType.includes("line")) return "line";
    if (geometryType.includes("polygon")) return "polygon";
    return "unknown";
};

/**
 * Builds thes options Leaflet pour a layer specific
 * Configure pointToLayer, onEachFeature, styles, popups, tooltips et panes
 *
 * @param {Object} def - Setsion de the layer from profile.json
 * @param {string} def.id - ID unique de the layer
 * @param {number} [def.zIndex] - Index z for the positionnement
 * @param {Object} [def.style] - Style by default de the layer
 * @param {Array} [def.styleRules] - Conditional style rules
 * @param {boolean} [def.interactiveShape=false] - Rendre les formes interactives
 * @param {boolean} [def.showIconsOnMap=false] - Displaysr icons SVG for thes points
 * @param {Object} baseOptions - Options de base of the module GeoJSON
 * @returns {Object} Configured Leaflet options (pointToLayer, onEachFeature, style, etc.)
 * @example
 * const options = GeoLeaf._GeoJSONLayerConfig.buildLayerOptions(
 *   { id: 'poi_tourism', zIndex: 100, showIconsOnMap: true },
 *   { defaultPointStyle: { radius: 8 } }
 * );
 */
function _applyMergedLayerStyles(def: any, mergedOptions: any): void {
    if (def.style && typeof def.style === "object") {
        mergedOptions.defaultStyle = Object.assign({}, mergedOptions.defaultStyle, def.style);
    }
    if (Array.isArray(def.styleRules) && def.styleRules.length > 0) {
        mergedOptions.styleRules = def.styleRules;
    }
    mergedOptions.interactiveShape =
        typeof def.interactiveShape === "boolean"
            ? def.interactiveShape
            : _g.GeoLeaf && _g.GeoLeaf.Config && _g.GeoLeaf.Config.get
              ? _g.GeoLeaf.Config.get("ui.interactiveShapes", false)
              : false;
}

function _buildPopupConfig(def: any) {
    const popupConfig = def.popup || {};
    return {
        enabled: popupConfig.enabled,
        detailPopup: popupConfig.detailPopup || popupConfig.fields || [],
        detailTooltip:
            popupConfig.detailTooltip || (popupConfig.tooltip && popupConfig.tooltip.fields) || [],
    };
}

function _buildIconPoiData(feature: any, def: any, mergedOptions: any) {
    const PopupTooltip = _g.GeoLeaf && _g.GeoLeaf._GeoJSONPopupTooltip;
    const poiData = PopupTooltip ? PopupTooltip.convertFeatureToPOI(feature, def) : null;
    if (poiData) {
        poiData._layerConfig = {
            style: mergedOptions.defaultStyle || {},
            popup: _buildPopupConfig(def),
            tooltip: def.tooltip || {},
            sidepanelConfig: def.sidepanelConfig || {},
        };
    }
    return poiData;
}

function _iconPointToLayerFn(def: any, mergedOptions: any, paneName: string) {
    return function (feature: any, latlng: any) {
        const poiData = _buildIconPoiData(feature, def, mergedOptions);
        const markers = _g.GeoLeaf && _g.GeoLeaf._POIMarkers;
        if (markers && typeof markers.createMarker === "function" && poiData) {
            const attachEvents = mergedOptions.interactiveShape !== false;
            const marker = markers.createMarker(poiData, { attachEvents, pane: paneName });
            if (marker && marker.options) marker.options.pane = paneName;
            return marker;
        }
        const pointStyle = Object.assign({}, mergedOptions.defaultPointStyle, def.pointStyle, {
            interactive: mergedOptions.interactiveShape,
            pane: paneName,
        });
        return _g.L.circleMarker(latlng, pointStyle);
    };
}

function _finalizeLayerOptions(mergedOptions: any, paneName: string) {
    if (mergedOptions.defaultPointStyle) {
        mergedOptions.defaultPointStyle = Object.assign({}, mergedOptions.defaultPointStyle, {
            pane: paneName,
        });
    } else {
        mergedOptions.defaultPointStyle = { pane: paneName };
    }
    if (
        _g.GeoLeaf &&
        _g.GeoLeaf._GeoJSONStyleResolver &&
        _g.GeoLeaf._GeoJSONStyleResolver.buildLeafletOptions
    ) {
        return _g.GeoLeaf._GeoJSONStyleResolver.buildLeafletOptions(mergedOptions);
    }
    return mergedOptions;
}

LayerConfigManager.buildLayerOptions = function (def: any, baseOptions: any) {
    const state = getState();
    const mergedOptions = Object.assign({}, state.options, baseOptions);

    _applyMergedLayerStyles(def, mergedOptions);

    const showIconsOnMap = typeof def.showIconsOnMap === "boolean" ? def.showIconsOnMap : false;
    const PaneHelpers = GeoJSONShared?.PaneHelpers ?? {
        getPaneName: (z: number) => `geoleaf-layer-${z || 0}`,
    };
    const paneName = PaneHelpers.getPaneName(def.zIndex);

    if (showIconsOnMap) {
        mergedOptions.pointToLayer = _iconPointToLayerFn(def, mergedOptions, paneName);
    } else if (def.pointStyle && typeof def.pointStyle === "object") {
        const pointStyle = Object.assign({}, mergedOptions.defaultPointStyle, def.pointStyle, {
            interactive: mergedOptions.interactiveShape,
            pane: paneName,
        });
        mergedOptions.pointToLayer = function (_feature: any, latlng: any) {
            return _g.L.circleMarker(latlng, pointStyle);
        };
    }

    const originalOnEachFeature =
        typeof def.onEachFeature === "function" ? def.onEachFeature : null;

    mergedOptions.onEachFeature = function (feature: any, layer: any) {
        const PopupTooltip = _g.GeoLeaf && _g.GeoLeaf._GeoJSONPopupTooltip;
        if (PopupTooltip) {
            PopupTooltip.bindUnifiedPopup(feature, layer, def);
            PopupTooltip.bindUnifiedTooltip(feature, layer, def);
        }
        if (originalOnEachFeature) {
            originalOnEachFeature(feature, layer);
        }
    };

    return _finalizeLayerOptions(mergedOptions, paneName);
};

/**
 * Loads the legend
 * Resolves automaticment le path based on the style active et la config of the profile
 *
 * @param {Object} profile - Profil contenant la configuration
 * @param {string} profile.id - ID of the profile (ex: 'tourism')
 * @param {string} [profile.basePath] - Path de base of the profile
 * @param {Object} layerDef - Setsion de the layer from profile.json
 * @param {string} layerDef.id - ID de the layer
 * @param {string} [layerDef.style='default'] - Style active de the layer
 * @param {Object} [layerDef.legends] - Configuration des legends
 * @param {string} [layerDef.legends.directory='legends'] - Folder des legends
 * @param {string} [layerDef.legends.default] - File legend by default
 * @returns {void} Loads et displays the legend via GeoLeaf.Legend.loadLegend()
 * @example
 * GeoLeaf._GeoJSONLayerConfig.loadLayerLegend(
 *   { id: 'tourism', basePath: '../profiles/tourism' },
 *   { id: 'poi_all', style: 'par_categorie', legends: { directory: 'legends' } }
 * );
 */
function _buildLegendPath(
    profile: any,
    layerDef: any,
    legendsConfig: any,
    activeStyle: string
): string {
    const legendDirectory = legendsConfig.directory || "legends";
    const legendFile =
        activeStyle === "default" && legendsConfig.default
            ? legendsConfig.default
            : `${activeStyle}.legend.json`;
    const profileBasePath = profile.basePath || "./profiles/" + profile.id;
    const layerDirectory = layerDef._layerDirectory || "layers/" + layerDef.id;
    return `${profileBasePath}/${layerDirectory}/${legendDirectory}/${legendFile}`;
}

function _invokeLegendModule(layerDef: any, activeStyle: string, Log: any): void {
    if (
        _g.GeoLeaf &&
        _g.GeoLeaf.Legend &&
        typeof _g.GeoLeaf.Legend.loadLayerLegend === "function"
    ) {
        try {
            _g.GeoLeaf.Legend.loadLayerLegend(layerDef.id, activeStyle, layerDef);
            if (Log)
                Log.info(
                    `[GeoLeaf.GeoJSON] Legend shown for ${layerDef.id} (style: ${activeStyle})`
                );
        } catch (error: any) {
            if (Log) Log.warn(`[GeoLeaf.GeoJSON] Error loading legend: ${error.message}`);
        }
    } else {
        if (Log) Log.warn("[GeoLeaf.GeoJSON] Legend module not available");
    }
}

LayerConfigManager.loadLayerLegend = function (profile: any, layerDef: any) {
    const Log = getLog();

    if (!layerDef) {
        if (Log) Log.debug("[GeoLeaf.GeoJSON] No layer definition");
        return;
    }

    const layerConfig = layerDef.legends ? layerDef : null;

    if (!layerConfig || !layerConfig.legends) {
        if (Log) Log.debug("[GeoLeaf.GeoJSON] No legend config for this layer");
        return;
    }

    const activeStyle = layerDef.style || "default";
    const legendPath = _buildLegendPath(profile, layerDef, layerConfig.legends, activeStyle);

    if (Log)
        Log.debug(`[GeoLeaf.GeoJSON] Loading legend for style "${activeStyle}": ${legendPath}`);

    _invokeLegendModule(layerDef, activeStyle, Log);
};

/**
 * Loads the style by default d'a layer from son file styles/*.style.json
 * Fonction asynchrone utilisant fetch() pour load le JSON
 *
 * @async
 * @param {string} layerId - ID de the layer (used for the logging)
 * @param {Object} layerDef - Setsion de the layer
 * @param {Object} layerDef.styles - Configuration des styles
 * @param {string} layerDef.styles.default - Nom du file de style by default
 * @param {string} [layerDef.styles.directory='styles'] - Folder des styles
 * @param {string} layerDef._profileId - ID of the profile (metadata internal)
 * @param {string} layerDef._layerDirectory - Folder de the layer (metadata internal)
 * @returns {Promise<Object>} Style loaded (object JSON parsed)
 * @throws {Error} "Pas de style by default defined" si styles.default manquant
 * @throws {Error} "Metadata manquantes" si _profileId ou _layerDirectory absent
 * @throws {Error} "HTTP {status}" if fetch fails
 * @example
 * try {
 *   const style = await GeoLeaf._GeoJSONLayerConfig.loadDefaultStyle(
 *     'provincia_ar',
 *     { styles: { default: 'default.json' }, _profileId: 'tourism', _layerDirectory: 'layers/provincia_ar' }
 *   );
 *   console.log('Style loaded:', style);
 * } catch (err: any) {
 *   console.error('Error loading style:', err);
 * }
 */
LayerConfigManager.loadDefaultStyle = async function (layerId: any, layerDef: any) {
    const Log = getLog();

    if (!layerDef.styles || !layerDef.styles.default) {
        throw new Error("No default style defined");
    }

    const profileId = layerDef._profileId;
    const layerDirectory = layerDef._layerDirectory;

    if (!profileId || !layerDirectory) {
        throw new Error("Missing metadata (profileId or layerDirectory)");
    }

    const { profilesBasePath } = _resolveProfileBasePath({ id: profileId });

    const styleDirectory = layerDef.styles.directory || "styles";
    const styleFile = layerDef.styles.default;
    const stylePath = `${profilesBasePath}/${profileId}/${layerDirectory}/${styleDirectory}/${styleFile}`;

    Log.debug("[GeoLeaf.GeoJSON] Loading default style:", stylePath);

    const response = await fetch(stylePath);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const styleData = await response.json();
    Log.debug("[GeoLeaf.GeoJSON] Style loaded:", styleData);
    return styleData;
};

LayerConfigManager._getTestState = () => _defaultState;

export { LayerConfigManager };
