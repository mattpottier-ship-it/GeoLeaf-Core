/**
 * @module globals.geojson-lite
 *
 * @description
 * UMD/ESM bridge — B5 Lite — GeoJSON only (Route and VectorTiles excluded).
 *
 * This runtime initialization module is the Lite variant of `globals.geojson.ts`.
 * It is imported as a side-effect by `globals-lite.ts` (PERF-02 build).
 *
 * Excluded vs full variant:
 *   - `Route` module (~18 KB min) — `RouteLayerManager`, `RouteLoaders`,
 *     `RoutePopupBuilder`, `RouteStyleResolver`
 *   - `VectorTiles` (~20 KB min)
 *
 * Registers (GeoJSON core only):
 *   - `GeoJSON` core, clustering, shared, feature validator
 *   - Style utilities, visibility manager, worker manager, layer config manager
 *   - Popup/tooltip, layer manager sub-modules, loader sub-modules
 *
 * @see globals.geojson for the full variant (includes Route and VectorTiles)
 * @see globals-lite for the Lite orchestrator
 */

import { GeoJSONShared } from "./geojson/shared.js";
import { GeoJSONClustering } from "./geojson/clustering.js";
import { FeatureValidator } from "./geojson/feature-validator.js";
import { normalizeStyleToLeaflet } from "./geojson/style-utils.js";
import { GeoJSONStyleResolver } from "./geojson/style-resolver.js";
// VectorTiles volontairement exclu in the build lite (~20 KB min)
import { VisibilityManager as LayerVisibilityManager } from "./geojson/visibility-manager.js";
import { WorkerManager } from "./geojson/worker-manager.js";
import { LayerConfigManager } from "./geojson/layer-config-manager.js";
import { PopupTooltip } from "./geojson/popup-tooltip.js";
import { LayerManagerStore } from "./geojson/layer-manager/store.js";
import { LayerManagerVisibility } from "./geojson/layer-manager/visibility.js";
import { LayerManagerStyle } from "./geojson/layer-manager/style.js";
import { LayerManagerIntegration } from "./geojson/layer-manager/integration.js";
import { LoaderConfigHelpers } from "./geojson/loader/config-helpers.js";
import { LoaderData } from "./geojson/loader/data.js";
import { LoaderProfile } from "./geojson/loader/profile.js";
import { LoaderSingleLayer } from "./geojson/loader/single-layer.js";
import { GeoJSONCore } from "./geojson/core.js";
// Route volontairement exclu in the build lite

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

const _GeoJSONLayerManager = Object.assign(
    {},
    LayerManagerStore,
    LayerManagerVisibility,
    LayerManagerStyle,
    LayerManagerIntegration
);
const _GeoJSONLoader: any = Object.assign(
    {},
    LoaderConfigHelpers,
    LoaderData,
    LoaderProfile,
    LoaderSingleLayer
);
_GeoJSONLoader._resolveDataFilePath = (LayerConfigManager as any).resolveDataFilePath?.bind(
    LayerConfigManager
);
_g.GeoLeaf._GeoJSONShared = GeoJSONShared;
_g.GeoLeaf._GeoJSONClustering = GeoJSONClustering;
_g.GeoLeaf._GeoJSONFeatureValidator = FeatureValidator;
_g.GeoLeaf._StyleUtils = { normalizeStyleToLeaflet };
_g.GeoLeaf._GeoJSONStyleResolver = GeoJSONStyleResolver;
_g.GeoLeaf._StyleRules = {
    evaluate: GeoJSONStyleResolver.evaluateStyleRules,
    operators: GeoJSONShared.STYLE_OPERATORS,
    getNestedValue: GeoJSONStyleResolver.getNestedValue,
};
// _VectorTiles volontairement absent du build lite
_g.GeoLeaf._LayerVisibilityManager = LayerVisibilityManager;
_g.GeoLeaf._WorkerManager = WorkerManager;
_g.GeoLeaf._GeoJSONLayerConfig = LayerConfigManager;
_g.GeoLeaf._GeoJSONPopupTooltip = PopupTooltip;
_g.GeoLeaf._GeoJSONLayerManager = _GeoJSONLayerManager;
_g.GeoLeaf._GeoJSONLoader = _GeoJSONLoader;
_g.GeoLeaf.GeoJSON = GeoJSONCore;
