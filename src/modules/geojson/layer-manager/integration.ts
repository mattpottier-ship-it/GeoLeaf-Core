/**
 * GeoLeaf GeoJSON Layer Manager - Integration
 * Layer Manager UI registration, legend loading, populate with all configs
 *
 * @module geojson/layer-manager/integration
 */
"use strict";

import { GeoJSONShared } from "../shared.js";
import { getLog } from "../../utils/general-utils.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

const getState = () => GeoJSONShared.state;

const LayerManager: any = {};

function _resolveLegendType(type: string): string {
    if (type === "poi") return "circle";
    if (type === "route") return "line";
    return "fill";
}

function _resolveLayerColor(layerData: any): string {
    const defaultColor = "#3388ff";
    if (layerData.config.style) {
        return layerData.config.style.fillColor || layerData.config.style.color || defaultColor;
    }
    if (layerData.config.pointStyle) return layerData.config.pointStyle.fillColor || defaultColor;
    return defaultColor;
}

function _resolveLayerLabels(layerData: any): { hasLabels: boolean; labelsConfig: any } {
    if (layerData.config.labels && layerData.config.labels.enabled) {
        return { hasLabels: true, labelsConfig: layerData.config.labels };
    }
    if (layerData.currentStyle?.label?.enabled) {
        return { hasLabels: true, labelsConfig: { enabled: true } };
    }
    return { hasLabels: false, labelsConfig: null };
}

function _logLayerPreparation(id: string, layerData: any, Log: any): void {
    if (!Log) return;
    Log.info(`[GeoJSON LayerManager] Preparing layer item ${id}:`, {
        hasConfig: !!layerData.config,
        hasStyles: !!(layerData.config && layerData.config.styles),
        styles: layerData.config ? layerData.config.styles : "NO CONFIG",
        configKeys: layerData.config ? Object.keys(layerData.config).sort() : [],
    });
}

function _processLayerForSection(
    layerData: any,
    id: string,
    sectionMap: Map<string, any>,
    Log: any
): void {
    const sectionId = layerData.config.layerManagerId || "geojson-default";
    if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, { id: sectionId, order: 99, items: [] });
    }
    const type = LayerManager.detectLayerType(layerData.layer);
    const legendType = _resolveLegendType(type);
    const color = _resolveLayerColor(layerData);
    const { hasLabels, labelsConfig } = _resolveLayerLabels(layerData);
    _logLayerPreparation(id, layerData, Log);
    sectionMap.get(sectionId).items.push({
        id: id,
        label: layerData.label,
        type: legendType,
        color: color,
        visible: layerData.visible,
        toggleable: true,
        order: 0,
        zIndex: layerData.config.zIndex || 0,
        themes: layerData.config.themes || null,
        labels: hasLabels ? labelsConfig : null,
        styles: layerData.config.styles || null,
    });
}

/**
 * Registers thes layers dans the module LayerManager.
 */
LayerManager.registerWithLayerManager = function () {
    const state = getState();
    const Log = getLog();
    const LMgr = _g.GeoLeaf && _g.GeoLeaf.LayerManager;

    Log.info(
        `[GeoLeaf.GeoJSON] registerWithLayerManager() called with ${state.layers.size} layer(s)`
    );

    if (!LMgr || typeof LMgr._registerGeoJsonLayer !== "function") {
        Log.warn("[GeoLeaf.GeoJSON] Module LayerManager unavailable, no layer manager integration");
        return;
    }

    // Groupr les layers par idSection
    const sectionMap = new Map();

    state.layers.forEach((layerData, id) => {
        _processLayerForSection(layerData, id, sectionMap, Log);
    });

    // Addsr chaque section au manager for layers
    sectionMap.forEach((section) => {
        // Sort items by descending zIndex (high zIndex = on top = displayed above)
        section.items.sort((a: any, b: any) => (b.zIndex || 0) - (a.zIndex || 0));

        // Registersr chaque layer in the LayerManager
        section.items.forEach((item: any) => {
            Log.debug(
                `[GeoLeaf.GeoJSON] Registering layer "${item.id}" in section "${section.id}"`
            );
            LMgr._registerGeoJsonLayer(item.id, {
                layerManagerId: section.id,
                label: item.label,
                themes: item.themes,
                styles: item.styles,
                labels: item.labels,
            });
        });

        Log.debug(
            "[GeoLeaf.GeoJSON] Layer section '" +
                section.id +
                "' créée avec " +
                section.items.length +
                " layer(s)"
        );
    });
};

/**
 * Loads the légende d'a layer si available
 * @param {string} layerId - ID de the layer
 * @param {Object} layerData - Données de the layer
 * @private
 */
function _resolveStyleIdFromAvailable(config: any): string | null {
    if (!config.styles) return null;
    if (!Array.isArray(config.styles.available)) return null;
    const available = config.styles.available;
    const defaultFile = config.styles.default;
    const defaultByFile = defaultFile ? available.find((s: any) => s.file === defaultFile) : null;
    if (defaultByFile && defaultByFile.id) return defaultByFile.id;
    if (available[0] && available[0].id) return available[0].id;
    return "default";
}

function _resolveStyleId(layerId: any, layerData: any, config: any): string {
    const styleSelector = _g.GeoLeaf && _g.GeoLeaf._LayerManagerStyleSelector;
    if (styleSelector && typeof styleSelector.getCurrentStyle === "function") {
        const sid = styleSelector.getCurrentStyle(layerId);
        if (sid) return sid;
    }
    if (layerData.currentStyleMetadata && layerData.currentStyleMetadata.id) {
        return layerData.currentStyleMetadata.id;
    }
    return _resolveStyleIdFromAvailable(config) || "default";
}

LayerManager._loadLayerLegend = function (layerId: any, layerData: any) {
    const config = layerData.config || {};
    const GeoLeaf = _g.GeoLeaf;
    if (!GeoLeaf) return;
    if (!GeoLeaf.Legend) return;
    if (typeof GeoLeaf.Legend.loadLayerLegend !== "function") return;
    const styleId = _resolveStyleId(layerId, layerData, config);
    GeoLeaf.Legend.loadLayerLegend(layerId, styleId, config);
};

/**
 * Peuple le LayerManager avec TOUTES les configurations de layers availables.
 * Contrairement — registerWithLayerManager() qui ne montre que the layers chargées (thème active),
 * cette fonction displays TOUTES the layers et met à jour l'état coché based on the thème active.
 *
 * @param {Object} activeThemeConfig - Configuration du thème active (contient list des layers visibles)
 * @returns {void}
 */
function _getActiveThemeLayers(activeThemeConfig: any): string[] {
    if (!activeThemeConfig) return [];
    if (!Array.isArray(activeThemeConfig.layers)) return [];
    return activeThemeConfig.layers.map((l: any) => l.id || l);
}

function _triggerLayerManagerUIUpdate(LMgr: any, Log: any): void {
    if (!LMgr._updateUI) return;
    if (typeof LMgr._updateUI !== "function") return;
    Log.debug("[GeoLeaf.GeoJSON] Calling LayerManager._updateUI()");
    LMgr._updateUI();
}

function _buildPopulateConfigSectionMap(
    allConfigs: any[],
    activeThemeLayers: string[]
): Map<string, any> {
    const sectionMap = new Map<string, any>();

    allConfigs.forEach((config: any) => {
        const sectionId = config.layerManagerId || "geojson-default";

        if (!sectionMap.has(sectionId)) {
            sectionMap.set(sectionId, { id: sectionId, items: [] });
        }

        const isActive = activeThemeLayers.includes(config.id);

        sectionMap.get(sectionId).items.push({
            id: config.id,
            label: config.label,
            layerManagerId: sectionId,
            themes: config.themes || null,
            isActive: isActive,
            zIndex: config.zIndex || 0,
            styles: config.styles || null,
            labels: config.labels || null,
        });
    });

    return sectionMap;
}

function _registerPopulateSectionMap(sectionMap: Map<string, any>, LMgr: any, Log: any): void {
    sectionMap.forEach((section) => {
        section.items.sort((a: any, b: any) => (b.zIndex || 0) - (a.zIndex || 0));

        section.items.forEach((item: any) => {
            Log.debug(
                `[GeoLeaf.GeoJSON] Registering layer "${item.id}" in section "${section.id}" (active: ${item.isActive})`
            );
            LMgr._registerGeoJsonLayer(item.id, {
                layerManagerId: section.id,
                label: item.label,
                themes: item.themes,
                checked: item.isActive,
                styles: item.styles,
                labels: item.labels,
            });
        });

        Log.debug(
            `[GeoLeaf.GeoJSON] Section "${section.id}" populated with ${section.items.length} layer(s)`
        );
    });
}

LayerManager.populateLayerManagerWithAllConfigs = function (activeThemeConfig: any) {
    const Log = getLog();
    const LMgr = _g.GeoLeaf && _g.GeoLeaf.LayerManager;

    if (!LMgr || typeof LMgr._registerGeoJsonLayer !== "function") {
        Log.warn(
            "[GeoLeaf.GeoJSON] populateLayerManagerWithAllConfigs: LayerManager module unavailable"
        );
        return;
    }

    if (
        !_g.GeoLeaf ||
        !_g.GeoLeaf._allLayerConfigs ||
        !Array.isArray(_g.GeoLeaf._allLayerConfigs)
    ) {
        Log.warn(
            "[GeoLeaf.GeoJSON] populateLayerManagerWithAllConfigs: GeoLeaf._allLayerConfigs unavailable"
        );
        return;
    }

    Log.info(
        `[GeoLeaf.GeoJSON] Populating LayerManager with ${_g.GeoLeaf._allLayerConfigs.length} layer configs...`
    );

    const activeThemeLayers = _getActiveThemeLayers(activeThemeConfig);

    Log.debug(`[GeoLeaf.GeoJSON] Active layers for theme: ${activeThemeLayers.join(", ")}`);

    const sectionMap = _buildPopulateConfigSectionMap(
        _g.GeoLeaf._allLayerConfigs,
        activeThemeLayers
    );

    _registerPopulateSectionMap(sectionMap, LMgr, Log);

    Log.info(`[GeoLeaf.GeoJSON] LayerManager populated successfully`);

    _triggerLayerManagerUIUpdate(LMgr, Log);
};
export { LayerManager as LayerManagerIntegration };
