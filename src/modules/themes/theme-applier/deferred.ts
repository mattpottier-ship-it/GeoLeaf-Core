/**
 * GeoLeaf Theme Applier - Deferred
 * Loadsment deferred de layers, resolution de profile, gestion du cache
 *
 * @module themes/theme-applier/deferred
 */
"use strict";

import { ThemeApplierCore as TA } from "../theme-applier/core.js";
import { Config } from "../../config/config-primitives.js";
import { GeoJSONShared } from "../../shared/geojson-state.js";
import { LoaderSingleLayer } from "../../geojson/loader/single-layer.js";
import { ThemeCache } from "../theme-cache.js";
import { Log } from "../../log/index.js";
const _Config: any = Config;

/**
 * Programme l'application of a configuration de layer pour plus tard
 * @param {string} layerId - ID de the layer
 * @param {boolean} visible - Desired visibility
 * @param {string} styleId - ID du style to appliquer
 * @returns {Promise<void>}
 * @private
 */
TA._scheduleLayerConfig = function (layerId: any, visible: any, styleId: any) {
    if (!TA._pendingLayerConfigs) {
        TA._pendingLayerConfigs = new Map();
    }

    TA._pendingLayerConfigs.set(layerId, { visible, styleId });

    // Schedule a periodic check
    TA._schedulePendingCheck();

    return Promise.resolve();
};

/**
 * Planifie une verification des layers en attente
 * @private
 */
TA._schedulePendingCheck = function () {
    if (TA._pendingCheckTimer) {
        return; // Already scheduled
    }

    TA._pendingCheckTimer = setTimeout(() => {
        TA._checkPendingLayerConfigs();
        TA._pendingCheckTimer = null;
    }, 1000);
};

/**
 * Checks and applies pending layer configurations
 * @private
 */
TA._checkPendingLayerConfigs = function () {
    if (!TA._pendingLayerConfigs || TA._pendingLayerConfigs.size === 0) {
        return;
    }

    const appliedLayers = [];

    for (const [layerId, config] of TA._pendingLayerConfigs) {
        const layerData = GeoJSONShared.state.layers?.get(layerId);
        if (layerData) {
            TA._setLayerVisibilityAndStyle(layerId, config.visible, config.styleId);
            appliedLayers.push(layerId);
        }
    }

    // Removes processed layers
    appliedLayers.forEach((layerId) => {
        TA._pendingLayerConfigs.delete(layerId);
    });

    // S'il reste des layers en attente, programmer une nouvelle verification
    if (TA._pendingLayerConfigs.size > 0) {
        TA._schedulePendingCheck();
    }
};

function _getProfileLayers(activeProfile: any): any[] {
    if (Array.isArray(activeProfile.geojsonLayers)) return activeProfile.geojsonLayers;
    if (activeProfile.geojson && Array.isArray(activeProfile.geojson.layers))
        return activeProfile.geojson.layers;
    if (Array.isArray(activeProfile.layers)) return activeProfile.layers;
    if (Array.isArray(activeProfile.Layers)) return activeProfile.Layers;
    return [];
}

function _layerType(lc: any): string {
    if (lc.geometryType) return lc.geometryType;
    if (lc.type) return lc.type;
    return "geojson";
}

function _applyDeferredClusteringNorm(layerDef: any, normalizedDef: any): void {
    if (!(layerDef.clustering && typeof layerDef.clustering === "object")) return;
    normalizedDef.clustering = layerDef.clustering.enabled !== false;
    if (typeof layerDef.clustering.maxClusterRadius === "number") {
        normalizedDef.maxClusterRadius = layerDef.clustering.maxClusterRadius;
        normalizedDef.clusterRadius = layerDef.clustering.maxClusterRadius;
    }
    if (typeof layerDef.clustering.disableClusteringAtZoom === "number") {
        normalizedDef.disableClusteringAtZoom = layerDef.clustering.disableClusteringAtZoom;
    }
}

function _normalizeDeferredLayerDef(layerDef: any, cachedData: any): any {
    const normalizedDef = { ...layerDef };
    if (layerDef.popup && layerDef.popup.fields) normalizedDef.popupFields = layerDef.popup.fields;
    if (layerDef.tooltip && layerDef.tooltip.fields)
        normalizedDef.tooltipFields = layerDef.tooltip.fields;
    if (layerDef.sidepanel && layerDef.sidepanel.detailLayout)
        normalizedDef.sidepanelFields = layerDef.sidepanel.detailLayout;
    _applyDeferredClusteringNorm(layerDef, normalizedDef);
    if (cachedData) normalizedDef._cachedData = cachedData;
    return normalizedDef;
}

async function _loadAndCache(
    loader: any,
    layerId: any,
    layerLabel: any,
    normalizedDef: any,
    profileId: any,
    cachedData: any
): Promise<any> {
    const layer = await loader.call(LoaderSingleLayer, layerId, layerLabel, normalizedDef, {});
    if (cachedData && ThemeCache && typeof ThemeCache.store === "function") {
        ThemeCache.store(layerId, profileId, cachedData);
    }
    return layer;
}

async function _getCachedData(layerId: any, profileId: any): Promise<any> {
    if (ThemeCache && typeof ThemeCache.get === "function") {
        return await ThemeCache.get(layerId, profileId);
    }
    return null;
}

async function _buildAndLoadLayer(
    loader: any,
    layerId: any,
    layerConfig: any,
    dataUrl: any,
    profileId: any
): Promise<any> {
    const layerLabel = layerConfig.label ? layerConfig.label : layerId;
    const cachedData = await _getCachedData(layerId, profileId);
    const layerDef = {
        ...layerConfig,
        url: dataUrl,
        type: _layerType(layerConfig),
        _profileId: profileId,
        _layerDirectory: layerConfig._layerDirectory,
    };
    const normalizedDef = _normalizeDeferredLayerDef(layerDef, cachedData);
    try {
        return await _loadAndCache(
            loader,
            layerId,
            layerLabel,
            normalizedDef,
            profileId,
            cachedData
        );
    } catch (err: any) {
        Log.warn(
            `[ThemeApplier._loadLayerFromProfile] Erreur loading layer "${layerId}":`,
            err ? err.message : err
        );
        return null;
    }
}

function _getActiveProfileAndLayers(
    layerId: any
): { layerConfig: any; dataUrl: any; profileId: any } | null {
    const activeProfile = (Config as any).getActiveProfile();
    if (!activeProfile || typeof activeProfile !== "object") return null;
    const profileLayersConfig = _getProfileLayers(activeProfile);
    if (profileLayersConfig.length === 0) return null;
    const layerConfig = profileLayersConfig.find((config: any) => config.id === layerId);
    if (!layerConfig) return null;
    const dataUrl = TA._resolveDataFilePath(layerConfig);
    if (!dataUrl) return null;
    return { layerConfig, dataUrl, profileId: activeProfile.id ?? null };
}

/**
 * Loads a layer from the active profile (with error tolerance)
 * @param {string} layerId - ID de the layer to load
 * @returns {Promise<Object|null>} - Couche loadede ou null si error
 * @private
 */
TA._loadLayerFromProfile = async function (layerId: any) {
    if (!Config || typeof (Config as any).getActiveProfile !== "function") return null;
    try {
        const found = _getActiveProfileAndLayers(layerId);
        if (!found) return null;
        const loader = LoaderSingleLayer._loadSingleLayer;
        if (!loader) return null;
        return await _buildAndLoadLayer(
            loader,
            layerId,
            found.layerConfig,
            found.dataUrl,
            found.profileId
        );
    } catch (error: any) {
        Log.warn(
            `[ThemeApplier._loadLayerFromProfile] Erreur inexpectede pour "${layerId}":`,
            error ? error.message : error
        );
        return null;
    }
};

/**
 * Resolves le path du file de data d'a layer
 * @param {Object} layerConfig - Configuration de the layer
 * @returns {string|null} - URL complete du file de data
 * @private
 */
TA._resolveDataFilePath = function (layerConfig: any) {
    if (!layerConfig.dataFile || !layerConfig._layerDirectory) {
        return null;
    }

    if (!Config || !(Config as any).getActiveProfile) {
        return null;
    }

    const activeProfile = (Config as any).getActiveProfile();
    if (!activeProfile) {
        return null;
    }

    const profileId = activeProfile.id;
    const profileBasePath = TA._getProfilesBasePath(activeProfile);

    return `${profileBasePath}/${profileId}/${layerConfig._layerDirectory}/${layerConfig.dataFile}`;
};

/**
 * Resolves le path de base des profiles
 * @private
 */
TA._getProfilesBasePath = function (activeProfile: any) {
    const configured = _Config?.get?.("data.profilesBasePath");

    if (typeof configured === "string" && configured.trim().length > 0) {
        return TA._normalizeBasePath(configured);
    }

    if (activeProfile && typeof activeProfile.profilesBasePath === "string") {
        return TA._normalizeBasePath(activeProfile.profilesBasePath);
    }

    return "profiles";
};

/**
 * Normalise un path (trim + supprime le / final)
 * @private
 */
TA._normalizeBasePath = function (path: any) {
    const trimmed = path.trim();
    return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

export { TA as ThemeApplierDeferred };
