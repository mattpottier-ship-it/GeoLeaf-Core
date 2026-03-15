/**
 * GeoLeaf GeoJSON Layer Manager - Visibility
 * Show/hide/toggle layers, zoom-based visibility
 *
 * @module geojson/layer-manager/visibility
 */
"use strict";

import { GeoJSONShared } from "../shared.js";
import { getLog } from "../../utils/general-utils.js";
import { calculateMapScale, isScaleInRange } from "../../utils/scale-utils.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

const getState = () => GeoJSONShared.state;
const ScaleUtils = { calculateMapScale, isScaleInRange };

function _normalizeScaleValue(value: any): number | null {
    if (typeof value !== "number") return null;
    return value <= 0 ? null : value;
}

function _resolveBaseVisibility(meta: any): boolean {
    if (meta && meta.userOverride) return meta.logicalState;
    if (meta && meta.themeOverride) return meta.themeDesired;
    return true;
}

const LayerManager: any = {};

/**
 * Displays a layer (rend visible).
 *
 * @param {string} layerId - ID de the layer
 */
/* eslint-disable complexity -- visibility state branchs */
LayerManager.showLayer = function (layerId: any) {
    const state = getState();
    const Log = getLog();
    const layerData: any = state.layers.get(layerId);

    if (!layerData) {
        Log.warn("[GeoLeaf.GeoJSON] showLayer: layer not found:", layerId);
        return;
    }

    // Utiliser le manager for visibility centralized
    const VisibilityManager = _g.GeoLeaf && _g.GeoLeaf._LayerVisibilityManager;
    if (!VisibilityManager) {
        Log.error("[GeoLeaf.GeoJSON] LayerVisibilityManager not available");
        return;
    }

    const changed = VisibilityManager.setVisibility(
        layerId,
        true,
        VisibilityManager.VisibilitySource.USER
    );

    // IMPORTANT: Recalculer la visibility physical en fonction du zoom
    // setVisibility met up to date logicalState (button), mais il faut aussi recalculer current
    LayerManager.updateLayerVisibilityByZoom();

    // Load the legend if available (only if change was made)
    if (changed) {
        // _loadLayerLegend est defined dans integration.ts sur an object LayerManager separated.
        // After Object.assign in globals.geojson.ts, the method exists on _GeoJSONLayerManager.
        // Resolved via the global rather than the local object to avoid "is not a function".
        const _unifiedMgr = _g.GeoLeaf?._GeoJSONLayerManager;
        if (_unifiedMgr && typeof _unifiedMgr._loadLayerLegend === "function") {
            _unifiedMgr._loadLayerLegend(layerId, layerData);
        }

        // Handle les labels au moment of the activation
        if (_g.GeoLeaf && _g.GeoLeaf.Labels && _g.GeoLeaf.Labels.hasLabelConfig(layerId)) {
            // Check si visibleByDefault est true for thes labels
            const visibleByDefault = layerData.currentStyle?.label?.visibleByDefault === true;

            if (visibleByDefault) {
                // Activer et display les labels immediately
                _g.GeoLeaf.Labels.enableLabels(layerId, {}, true);
            } else if (_g.GeoLeaf.Labels.areLabelsEnabled(layerId)) {
                // Sinon, juste refresh si already activateds
                _g.GeoLeaf.Labels.refreshLabels(layerId);
            }
        }
        if (_g.GeoLeaf && _g.GeoLeaf._LabelButtonManager) {
            _g.GeoLeaf._LabelButtonManager.syncImmediate(layerId);
        }

        Log.debug("[GeoLeaf.GeoJSON] Layer shown:", layerId);
    }
};
/* eslint-enable complexity */

/**
 * Masque a layer (rend invisible).
 *
 * @param {string} layerId - ID de the layer
 */
LayerManager.hideLayer = function (layerId: any) {
    const state = getState();
    const Log = getLog();
    const layerData: any = state.layers.get(layerId);

    if (!layerData) {
        Log.warn("[GeoLeaf.GeoJSON] hideLayer: layer not found:", layerId);
        return;
    }

    // Utiliser le manager for visibility centralized
    const VisibilityManager = _g.GeoLeaf && _g.GeoLeaf._LayerVisibilityManager;
    if (!VisibilityManager) {
        Log.error("[GeoLeaf.GeoJSON] LayerVisibilityManager not available");
        return;
    }

    const changed = VisibilityManager.setVisibility(
        layerId,
        false,
        VisibilityManager.VisibilitySource.USER
    );

    // IMPORTANT: Recalculer la visibility physical (even on hide, to ensure consistency)
    LayerManager.updateLayerVisibilityByZoom();

    if (changed) {
        // Masquer les labels et update le button
        if (_g.GeoLeaf && _g.GeoLeaf.Labels) {
            _g.GeoLeaf.Labels.disableLabels(layerId);
        }
        if (_g.GeoLeaf && _g.GeoLeaf._LabelButtonManager) {
            _g.GeoLeaf._LabelButtonManager.syncImmediate(layerId);
        }

        Log.debug("[GeoLeaf.GeoJSON] Layer hidden:", layerId);
    }
};

/**
 * Toggle la visibility d'a layer.
 *
 * @param {string} layerId - ID de the layer
 */
LayerManager.toggleLayer = function (layerId: any) {
    const state = getState();
    const Log = getLog();
    const layerData: any = state.layers.get(layerId);

    if (!layerData) {
        Log.warn("[GeoLeaf.GeoJSON] toggleLayer: layer not found:", layerId);
        return;
    }

    // Obtenir the state current via le manager for visibility
    const VisibilityManager = _g.GeoLeaf && _g.GeoLeaf._LayerVisibilityManager;
    if (!VisibilityManager) {
        Log.error("[GeoLeaf.GeoJSON] LayerVisibilityManager not available");
        return;
    }

    const visState = VisibilityManager.getVisibilityState(layerId);
    const currentlyVisible = visState ? visState.current : layerData.visible;

    // Toggle
    if (currentlyVisible) {
        LayerManager.hideLayer(layerId);
    } else {
        LayerManager.showLayer(layerId);
    }
};

/**
 * Updates the visibility des layers en fonction de layerScale du style active.
 * Respecte les preferences user (deactivation manuelle ou par theme).
 * Utilise le manager for visibility centralized avec source 'zoom'.
 * Immediate execution for reactivity during zoom (LayerManager.refresh debounce avoids UI jitter).
 */
LayerManager.updateLayerVisibilityByZoom = function () {
    const state = getState();
    const Log = getLog();
    if (!state.map) return;

    const VisibilityManager = _g.GeoLeaf && _g.GeoLeaf._LayerVisibilityManager;
    if (!VisibilityManager) {
        Log.error("[GeoLeaf.GeoJSON] LayerVisibilityManager non disponible");
        return;
    }

    const currentScale =
        ScaleUtils && typeof ScaleUtils.calculateMapScale === "function"
            ? ScaleUtils.calculateMapScale(state.map, { logger: Log })
            : 0;

    /* eslint-disable complexity -- per-layer visibility rules */
    state.layers.forEach((layerData: any, layerId: any) => {
        const config = layerData.config;
        if (!config) return;

        const hasCurrentStyle = !!layerData.currentStyle;
        const styleScale = hasCurrentStyle ? layerData.currentStyle.layerScale : null;
        if (!styleScale && hasCurrentStyle) {
            if (Log && typeof Log.warn === "function") {
                Log.warn(
                    `[GeoLeaf.GeoJSON] layerScale missing for ${layerId}, layer left visible by default`
                );
            }
        }

        const minScale = _normalizeScaleValue(styleScale && styleScale.minScale);
        const maxScale = _normalizeScaleValue(styleScale && styleScale.maxScale);

        const shouldBeVisibleByScale =
            ScaleUtils && typeof ScaleUtils.isScaleInRange === "function"
                ? ScaleUtils.isScaleInRange(currentScale, minScale, maxScale, Log)
                : true;

        const baseVisible = _resolveBaseVisibility(layerData._visibility);

        const shouldBeVisible = baseVisible && shouldBeVisibleByScale;

        VisibilityManager.setVisibility(
            layerId,
            shouldBeVisible,
            VisibilityManager.VisibilitySource.ZOOM
        );
    });
    /* eslint-enable complexity */
};

/**
 * Emits an event de changement de visibility.
 *
 * @param {string} layerId
 * @param {boolean} visible
 * @private
 */
LayerManager._fireLayerVisibilityEvent = function (layerId: any, visible: any) {
    const state = getState();
    if (!state.map) return;

    try {
        (state.map as any).fire("geoleaf:geojson:visibility-changed", {
            layerId: layerId,
            visible: visible,
        });
    } catch (_e) {
        // Silencieux
    }
};

export { LayerManager as LayerManagerVisibility };
