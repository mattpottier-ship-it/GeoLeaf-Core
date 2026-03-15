/**
 * GeoLeaf GeoJSON Module - Visibility Manager
 * Centralised visibility manager for layers with priority management
 *
 * Manages three sources of visibility change:
 * - 'user': Manual user action (toggle, explicit show/hide)
 * - 'theme': Change via theme application
 * - 'zoom': Automatic change based on the zoom level
 *
 * Priority rules:
 * 1. user > theme > zoom (the user always has the final say)
 * 2. A 'user' action cancels 'theme' and 'zoom' flags
 * 3. A 'theme' action can override 'zoom' but not 'user'
 * 4. A 'zoom' action never changes the state if 'user' or 'theme' is active
 *
 * @module geojson/visibility-manager
 */
"use strict";

import { GeoJSONShared } from "./shared.js";
import { getLog } from "../utils/general-utils.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

// Lazy dependencies — fallback for tests where shared may be resolved differently
const _defaultState = {
    map: null as any,
    layers: new Map<string, any>(),
};
const getState = () => (GeoJSONShared && GeoJSONShared.state ? GeoJSONShared.state : _defaultState);

const VisibilityManager: any = {};

/**
 * Possible visibility states
 * @private
 */
const VisibilitySource = {
    USER: "user",
    THEME: "theme",
    ZOOM: "zoom",
    SYSTEM: "system", // Initial load, etc.
};

/**
 * Initialises visibility metadata for a layer
 * @param {Object} layerData - Layer data
 * @private
 */
function initVisibilityMetadata(layerData: any) {
    if (!layerData._visibility) {
        layerData._visibility = {
            current: false, // current physical state on the map (true/false)
            logicalState: false, // logical state (button ON/OFF, independent of zoom)
            source: VisibilitySource.SYSTEM, // Last modification source
            userOverride: false, // User has forced a state
            themeOverride: false, // A theme has forced a state
            themeDesired: null, // Visibility desired by the theme (true/false)
            zoomConstrained: false, // Layer is constrained by zoom
        };
    }
}

/**
 * Sets the visibility of a layer with priority management
 *
 * @param {string} layerId - Layer ID
 * @param {boolean} visible - Desired visibility state
 * @param {string} source - Source of the change ('user' | 'theme' | 'zoom' | 'system')
 * @returns {boolean} - true if visibility was changed, false otherwise
 */
VisibilityManager.setVisibility = function (layerId: any, visible: any, source: any) {
    const state = getState();
    const Log = getLog();
    const layerData = state.layers.get(layerId);

    if (!layerData) {
        Log.warn("[VisibilityManager] Layer not found:", layerId);
        return false;
    }

    // Initialise metadata if needed
    initVisibilityMetadata(layerData);

    const meta = layerData._visibility;
    const oldVisible = meta.current;
    const oldSource = meta.source;

    // Apply priority rules
    const canChange = this._canChangeVisibility(meta, source, visible);

    if (!canChange) {
        Log.debug(
            `[VisibilityManager] Changement refusé pour ${layerId}: ` +
                `source=${source}, userOverride=${meta.userOverride}, themeOverride=${meta.themeOverride}`
        );
        return false;
    }

    // Update flags based on the source
    this._updateVisibilityFlags(meta, source, visible);

    // Apply the effective change
    const changed = this._applyVisibilityChange(layerId, layerData, visible);

    if (changed) {
        meta.current = visible;
        meta.source = source;

        Log.debug(
            `[VisibilityManager] ${layerId}: ${oldVisible} ? ${visible} ` +
                `(source: ${oldSource} ? ${source})`
        );

        // Update legacy flags for compatibility
        layerData.visible = visible;
        layerData.userDisabled = meta.userOverride && !visible;
        layerData.themeHidden = meta.themeOverride && !visible;

        // Notify the legend
        this._notifyLegend(layerId, visible);

        // Emit the event
        this._fireVisibilityEvent(layerId, visible, source);
    }

    return changed;
};

/**
 * Checks whether visibility can be changed based on priority rules
 * @param {Object} meta - Visibility metadata
 * @param {string} source - Source of the change
 * @returns {boolean}
 * @private
 */
VisibilityManager._canChangeVisibility = function (meta: any, source: any, desiredVisible: any) {
    // User can always change
    if (source === VisibilitySource.USER) {
        return true;
    }

    // IMPORTANT: Zoom MUST ALWAYS be able to modify the physical display (current)
    // even if userOverride is true. This allows show/hide based on zoom thresholds
    // while keeping logicalState independent.
    if (source === VisibilitySource.ZOOM) {
        return true;
    }

    // If user has set an override, only the user can change the logical state
    if (meta.userOverride) {
        return false;
    }

    // Never re-enable what a theme has explicitly hidden
    if (
        source === VisibilitySource.ZOOM &&
        meta.themeOverride &&
        meta.themeDesired === false &&
        desiredVisible === true
    ) {
        return false;
    }

    // Themes can override zoom but not the user
    if (source === VisibilitySource.THEME) {
        return true;
    }

    // Default: allow (for 'system' and others)
    return true;
};

/**
 * Updates visibility flags based on the source
 * @param {Object} meta - Visibility metadata
 * @param {string} source - Source of the change
 * @param {boolean} visible - Visibility state
 * @private
 */
VisibilityManager._updateVisibilityFlags = function (meta: any, source: any, visible: any) {
    switch (source) {
        case VisibilitySource.USER:
            meta.userOverride = true;
            meta.themeOverride = false; // Reset theme override
            meta.zoomConstrained = false;
            meta.logicalState = visible; // Update the logical state
            break;

        case VisibilitySource.THEME:
            // Do not override userOverride if already set
            if (!meta.userOverride) {
                meta.themeOverride = true;
                meta.themeDesired = visible;
                meta.zoomConstrained = false;
                meta.logicalState = visible; // Update the logical state
            }
            break;

        case VisibilitySource.ZOOM:
            // Mark zoom constraint (except user override)
            // DO NOT modify logicalState — zoom does not affect logical state
            if (!meta.userOverride) {
                meta.zoomConstrained = true;
            }
            break;

        case VisibilitySource.SYSTEM:
            // Reset all overrides for a clean load
            meta.userOverride = false;
            meta.themeOverride = false;
            meta.themeDesired = null;
            meta.zoomConstrained = false;
            meta.logicalState = visible; // Initialise the logical state
            break;
    }
};

function _reFilterChildLayers(layer: any): void {
    if (!layer || typeof layer.eachLayer !== "function") return;
    layer.eachLayer(function (child: any) {
        if (!child._geoleafFiltered) return;
        const el = child.getElement?.();
        if (el) {
            el.style.display = "none";
            return;
        }
        if (typeof child.setStyle === "function" && child.options._originalOpacity !== undefined) {
            child.setStyle({ opacity: 0, fillOpacity: 0 });
        }
        if (!child._casingLayer) return;
        const casingEl = child._casingLayer.getElement?.();
        if (casingEl) {
            casingEl.style.display = "none";
            return;
        }
        if (typeof child._casingLayer.setStyle === "function")
            child._casingLayer.setStyle({ opacity: 0 });
    });
}

function _addLayerWithCluster(layerData: any, state: any): void {
    if (layerData.useSharedCluster && layerData.clusterGroup) {
        layerData.clusterGroup.addLayer(layerData.layer);
        return;
    }
    if (layerData.clusterGroup) {
        state.map.addLayer(layerData.clusterGroup);
        if (layerData.clusterGroup.refreshClusters) layerData.clusterGroup.refreshClusters();
        return;
    }
    state.map.addLayer(layerData.layer);
    _reFilterChildLayers(layerData.layer);
}

function _removeLayerWithCluster(layerData: any, state: any): void {
    if (layerData.useSharedCluster && layerData.clusterGroup) {
        layerData.clusterGroup.removeLayer(layerData.layer);
        return;
    }
    if (layerData.clusterGroup) {
        state.map.removeLayer(layerData.clusterGroup);
        return;
    }
    state.map.removeLayer(layerData.layer);
}

function _syncVisibilityUI(layerId: any): void {
    const GeoLeaf = _g.GeoLeaf;
    if (!GeoLeaf) return;
    if (GeoLeaf.LayerManager && typeof GeoLeaf.LayerManager.refresh === "function") {
        GeoLeaf.LayerManager.refresh();
    }
    if (
        GeoLeaf._LabelButtonManager &&
        typeof GeoLeaf._LabelButtonManager.syncImmediate === "function"
    ) {
        GeoLeaf._LabelButtonManager.syncImmediate(layerId);
    }
}

/**
 * Physically applies the visibility change (add/remove layer)
 * @param {string} layerId - Layer ID
 * @param {Object} layerData - Layer data
 * @param {boolean} visible - Desired visibility state
 * @returns {boolean} - true if a change was made
 * @private
 */
VisibilityManager._applyVisibilityChange = function (layerId: any, layerData: any, visible: any) {
    const state = getState();
    const Log = getLog();
    if (!layerData.layer) {
        Log.warn("[VisibilityManager] Leaflet layer missing for:", layerId);
        return false;
    }
    const layerToManage = layerData.clusterGroup || layerData.layer;
    const isCurrentlyOnMap = state.map && state.map.hasLayer(layerToManage);
    if (visible && isCurrentlyOnMap) return false;
    if (!visible && !isCurrentlyOnMap) return false;
    try {
        if (visible) {
            _addLayerWithCluster(layerData, state);
        } else {
            _removeLayerWithCluster(layerData, state);
        }
        _syncVisibilityUI(layerId);
        return true;
    } catch (err) {
        Log.error("[VisibilityManager] Visibility change error for " + layerId + ":", err);
        return false;
    }
};

function _notifyLabelsModule(layerId: any, visible: any): void {
    const Labels = _g.GeoLeaf && _g.GeoLeaf.Labels;
    if (!Labels) return;
    if (visible && typeof Labels.refreshLabels === "function") {
        Labels.refreshLabels(layerId);
        return;
    }
    if (!visible && typeof Labels._hideLabelsForLayer === "function") {
        Labels._hideLabelsForLayer(layerId);
    }
}

/**
 * Notifies the Legend module of a visibility change
 * @param {string} layerId - Layer ID
 * @param {boolean} visible - Visibility state
 * @private
 */
VisibilityManager._notifyLegend = function (layerId: any, visible: any) {
    const GeoLeaf = _g.GeoLeaf;
    if (!GeoLeaf) return;
    if (GeoLeaf.Legend && typeof GeoLeaf.Legend.setLayerVisibility === "function") {
        GeoLeaf.Legend.setLayerVisibility(layerId, visible);
    }
    _notifyLabelsModule(layerId, visible);
    if (
        GeoLeaf._LabelButtonManager &&
        typeof GeoLeaf._LabelButtonManager.syncImmediate === "function"
    ) {
        GeoLeaf._LabelButtonManager.syncImmediate(layerId);
    }
};

/**
 * Emits a visibility change event
 * @param {string} layerId - Layer ID
 * @param {boolean} visible - Visibility state
 * @param {string} source - Source of the change
 * @private
 */
VisibilityManager._fireVisibilityEvent = function (layerId: any, visible: any, source: any) {
    const state = getState();
    if (!state.map) return;

    try {
        state.map.fire("geoleaf:geojson:visibility-changed", {
            layerId: layerId,
            visible: visible,
            source: source,
        });
    } catch (_e) {
        // Silent
    }
};

/**
 * Resets user overrides for a layer
 * Used by themes to regain control
 *
 * @param {string} layerId - Layer ID
 */
VisibilityManager.resetUserOverride = function (layerId: any) {
    const state = getState();
    const layerData = state.layers.get(layerId);

    if (layerData && layerData._visibility) {
        layerData._visibility.userOverride = false;
        getLog().debug(`[VisibilityManager] User override reset for ${layerId}`);
    }
};

/**
 * Resets all user overrides
 * Used by themes during a complete theme change
 */
VisibilityManager.resetAllUserOverrides = function () {
    const state = getState();
    let count = 0;

    state.layers.forEach((layerData: any, _layerId) => {
        if (layerData._visibility && layerData._visibility.userOverride) {
            layerData._visibility.userOverride = false;
            count++;
        }
    });

    if (count > 0) {
        getLog().debug(`[VisibilityManager] ${count} user override(s) reset`);
    }
};

/**
 * Gets the complete visibility state of a layer
 * @param {string} layerId - Layer ID
 * @returns {Object|null} - Visibility metadata or null
 */
VisibilityManager.getVisibilityState = function (layerId: any) {
    const state = getState();
    const layerData = state.layers.get(layerId);

    if (!layerData) {
        return null;
    }

    initVisibilityMetadata(layerData);

    return {
        current: layerData._visibility.current,
        source: layerData._visibility.source,
        userOverride: layerData._visibility.userOverride,
        themeOverride: layerData._visibility.themeOverride,
        zoomConstrained: layerData._visibility.zoomConstrained,
    };
};

/**
 * Exports constants for external use
 */
VisibilityManager.VisibilitySource = VisibilitySource;
/** Exposed for tests where GeoJSONShared is not injected (different module resolution) */
VisibilityManager._getTestState = () => _defaultState;

getLog().info("[GeoLeaf._LayerVisibilityManager] Module loaded");

export { VisibilityManager };
