/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf Theme Applier - Visibility
 * Gestion de la visibility des layers et application des styles
 *
 * @module themes/theme-applier/visibility
 */
"use strict";

import { Log } from "../../log/index.js";
import { Config } from "../../config/config-primitives.js";
import { ThemeApplierCore as TA } from "../theme-applier/core.js";
import { GeoJSONShared } from "../../shared/geojson-state.js";
import { LayerVisibilityManager } from "../../shared/layer-visibility-state.js";
import { LayerManagerStyle } from "../../geojson/layer-manager/style.js";
import { StyleLoader } from "../../loaders/style-loader.js";
import { Labels } from "../../labels/labels.js";
import { LabelButtonManager } from "../../labels/label-button-manager.js";
import { LayerManager } from "../../geoleaf.layer-manager.js";
import { StyleSelector } from "../../layer-manager/style-selector.js";
const _Config: any = Config;

/**
 * Deactivates all GeoJSON layers
 * @private
 */
TA._hideAllLayers = function () {
    if (!GeoJSONShared.state.layers) {
        return;
    }

    const VisibilityManager: any = LayerVisibilityManager;
    if (!(VisibilityManager as any)) {
        return;
    }

    // Reset tous les overrides user for theisser the theme prendre the control
    (VisibilityManager as any).resetAllUserOverrides();

    // Iterate over all registered layers
    GeoJSONShared.getLayers().forEach((layerData: any, layerId: any) => {
        (VisibilityManager as any).setVisibility(
            layerId,
            false,
            (VisibilityManager as any).VisibilitySource.THEME
        );
    });
};

/**
 * Applies the configuration d'a layer (visible/hidden + style)
 * @param {Object} layerConfig - Configuration { id, visible, style }
 * @returns {Promise<void>}
 * @private
 */
TA._applyLayerConfig = function (layerConfig: any) {
    if (!layerConfig?.id) {
        return Promise.resolve();
    }

    const layerId = layerConfig.id;
    const visible = layerConfig.visible !== false;
    const styleId = layerConfig.style ? String(layerConfig.style).trim() : undefined;

    // Retrieve the layer from the registre
    const layerData = GeoJSONShared.state.layers?.get(layerId);

    // Si the layer n'existe pas, essayer de la load automaticment
    if (!layerData) {
        return TA._loadLayerFromProfile(layerId).then((loadedLayer: any) => {
            if (loadedLayer) {
                return TA._setLayerVisibilityAndStyle(layerId, visible, styleId);
            } else {
                return TA._scheduleLayerConfig(layerId, visible, styleId);
            }
        });
    }

    // The layer existe already, appliquer directly la visibility
    return TA._setLayerVisibilityAndStyle(layerId, visible, styleId);
};

function _resolveEffectiveStyleId(
    styleId: string,
    availableStyles: any[]
): { styleId: string; exists: boolean } {
    const styleExists = availableStyles.some((s: any) => s.id === styleId);
    if (styleExists) return { styleId, exists: true };
    const fallbackMap: Record<string, string> = { default: "default", defaut: "default" };
    const fallbackStyleId = fallbackMap[styleId];
    if (fallbackStyleId) {
        const fallbackExists = availableStyles.some((s: any) => s.id === fallbackStyleId);
        if (fallbackExists) return { styleId: fallbackStyleId, exists: true };
    }
    return { styleId, exists: false };
}

function _getProfileId(): string {
    if (_Config && typeof _Config.getActiveProfile === "function") {
        const activeProfile = _Config.getActiveProfile();
        return activeProfile?.id || "default";
    }
    return "default";
}

function _applyLayerHidden(layerId: string): void {
    (LayerVisibilityManager as any).setVisibility(
        layerId,
        false,
        (LayerVisibilityManager as any).VisibilitySource.THEME
    );
    if (Labels) Labels.disableLabels(layerId);
    if (LabelButtonManager) LabelButtonManager.syncImmediate(layerId);
}

function _onStyleLoaded(layerId: string, styleId: string | undefined, result: any): void {
    const styleConfig = result.styleData;
    (LayerManagerStyle as any).setLayerStyle(layerId, styleConfig);
    const layerDataForStyle = GeoJSONShared.state.layers?.get(layerId);
    if (layerDataForStyle) (layerDataForStyle as any).currentStyle = styleConfig;
    if (Labels && typeof Labels.initializeLayerLabels === "function")
        Labels.initializeLayerLabels(layerId);
    if (LabelButtonManager) LabelButtonManager.syncImmediate(layerId);
    if (LayerManager && typeof LayerManager.refresh === "function") LayerManager.refresh();
    if (StyleSelector) StyleSelector.setCurrentStyle(layerId, styleId!);
    TA._updateStyleSelector(layerId, styleId);
    TA._loadLegendForStyle(layerId, styleId);
}

function _applyLayerVisible(
    layerId: string,
    styleId: string | undefined,
    layerData: any
): Promise<any> {
    (LayerVisibilityManager as any).setVisibility(
        layerId,
        true,
        (LayerVisibilityManager as any).VisibilitySource.THEME
    );
    if (!styleId || !(LayerManagerStyle as any)?.setLayerStyle) return Promise.resolve();
    const availableStyles = (layerData as any).config?.styles?.available || [];
    const { styleId: effectiveStyleId, exists } = _resolveEffectiveStyleId(
        styleId,
        availableStyles
    );
    if (!exists) return Promise.resolve();
    const styleFile = availableStyles.find((s: any) => s.id === effectiveStyleId)?.file;
    if (!styleFile) return Promise.resolve();
    const profileId = _getProfileId();
    const layerDirectory = (layerData as any)._layerDirectory || layerId;
    const localStyleLoader = StyleLoader;
    if (!localStyleLoader) {
        Log?.error(`[ThemeApplier] StyleLoader non disponible`);
        return Promise.resolve();
    }
    return localStyleLoader
        .loadAndValidateStyle(
            profileId,
            layerId,
            effectiveStyleId,
            styleFile,
            `layers/${layerDirectory}`
        )
        .then((result) => {
            _onStyleLoaded(layerId, styleId, result);
            return result;
        })
        .catch((_err: any) => {
            // Silent — error already logged by StyleLoader
        });
}

/**
 * Sets the visibility et le style d'a layer
 * @param {string} layerId - ID de the layer
 * @param {boolean} visible - Desired visibility
 * @param {string} styleId - ID du style to appliquer
 * @returns {Promise<void>}
 * @private
 */
TA._setLayerVisibilityAndStyle = function (layerId: any, visible: any, styleId: any) {
    const layerData = GeoJSONShared.state.layers?.get(layerId);
    if (!layerData) return Promise.resolve();
    if (!LayerVisibilityManager) return Promise.resolve();
    if (visible) return _applyLayerVisible(layerId, styleId, layerData);
    _applyLayerHidden(layerId);
    return Promise.resolve();
};

export { TA as ThemeApplierVisibility };
