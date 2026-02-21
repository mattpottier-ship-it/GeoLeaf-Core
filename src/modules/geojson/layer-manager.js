/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf GeoJSON Module - Layer Manager
 *
 * # SHIM LEGACY — rétrocompatibilité chemins plats
 * Re-exporte les sous-modules du dossier geojson/layer-manager/ depuis
 * le chemin plat geojson/layer-manager.js (ancienne structure).
 *
 * @module geojson/layer-manager
 * @see src/modules/geojson/layer-manager/
 */

export { LayerManager as LayerManagerStore } from "./layer-manager/store.js";
export { LayerManager as LayerManagerStyle } from "./layer-manager/style.js";
export { LayerManager as LayerManagerVisibility } from "./layer-manager/visibility.js";
export { LayerManager as LayerManagerIntegration } from "./layer-manager/integration.js";
export {
    _createHatchPattern,
    _findLayerSvg,
    _applyHatchToLayer,
} from "./layer-manager/hatch-pattern.js";
