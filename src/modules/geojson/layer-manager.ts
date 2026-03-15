/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf GeoJSON Module - Layer Manager
 * SHIM LEGACY — re-exporte les sous-modules du folder geojson/layer-manager/
 * @module geojson/layer-manager
 */

export { LayerManagerStore } from "./layer-manager/store.js";
export { LayerManagerStyle } from "./layer-manager/style.js";
export { LayerManagerVisibility } from "./layer-manager/visibility.js";
export { LayerManagerIntegration } from "./layer-manager/integration.js";
export {
    _createHatchPattern,
    _findLayerSvg,
    _applyHatchToLayer,
} from "./layer-manager/hatch-pattern.js";
