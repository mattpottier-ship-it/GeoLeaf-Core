/**
 * LayerManager — Visibility Checker
 * Validates the visibility state logical d'a layer.
 *
 * Extrait de layer-manager/renderer.ts (split Sprint 1 roadmap).
 *
 * @module geoleaf.layer-manager.visibility-checker
 */
"use strict";

import { Log } from "../log/index.js";
import { GeoJSONCore } from "../geojson/core.js";

/**
 * Checks if a layer est visible.
 * Utilise logicalState (state du button ON/OFF) au lieu de current (state physical sur carte).
 * The button must reflect the user/theme intent, not zoom constraints.
 */
function checkLayerVisibility(layerId: string): boolean {
    try {
        if (layerId && GeoJSONCore) {
            const layerData = GeoJSONCore.getLayerById(layerId);

            const logicalState =
                layerData &&
                layerData._visibility &&
                typeof layerData._visibility.logicalState === "boolean"
                    ? layerData._visibility.logicalState
                    : layerData && layerData.visible === true;

            const result = logicalState;

            if (Log) {
                Log.debug(
                    `[LayerManager Renderer] _checkLayerVisibility(${layerId}): logicalState=${logicalState}`
                );
            }

            return result;
        }
    } catch (e) {
        if (Log) Log.error("[LayerManager Renderer] Error in _checkLayerVisibility:", e);
    }
    return false;
}

export { checkLayerVisibility };
