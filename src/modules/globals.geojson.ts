/**
 * @module globals.geojson
 *
 * @description
 * UMD/ESM bridge — B5 — GeoJSON layers and Route module initialization.
 *
 * This runtime initialization module registers all GeoJSON and Route internals
 * on `globalThis.GeoLeaf`. It is imported as a side-effect by `globals.ts`.
 *
 * Registers:
 *   - `GeoJSON` core (`GeoJSONCore`, clustering, shared, feature validator)
 *   - Style utilities (`_StyleUtils`, `_GeoJSONStyleResolver`, `_StyleRules`)
 *   - Vector tiles (`_VectorTiles`), visibility manager, worker manager
 *   - Layer config manager, popup/tooltip, layer manager sub-modules (store,
 *     visibility, style, integration), loader sub-modules (config, data, profile, single-layer)
 *   - Route internals (`_RouteLayerManager`, `_RouteLoaders`, `_RoutePopupBuilder`,
 *     `_RouteStyleResolver`)
 *
 * @see globals for the orchestrator and import order
 * @see globals-lite.geojson for the Lite variant (route excluded)
 */

// B5 : geojson, route
import { GeoJSONShared } from "./geojson/shared.js";
import { GeoJSONClustering } from "./geojson/clustering.js";
import { FeatureValidator } from "./geojson/feature-validator.js";
import { normalizeStyleToLeaflet } from "./geojson/style-utils.js";
import { GeoJSONStyleResolver } from "./geojson/style-resolver.js";
import { VectorTiles } from "./geojson/vector-tiles.js";
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
import { RouteLayerManager } from "./route/layer-manager.js";
import { RouteLoaders } from "./route/loaders.js";
import { RoutePopupBuilder } from "./route/popup-builder.js";
import { RouteStyleResolver } from "./route/style-resolver.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

// ── B5 assignations ──────────────────────────────────────────────────────────
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
// Missing delegation: _resolveDataFilePath is not defined in any Loader sub-module.
// LayerConfigManager.resolveDataFilePath resolves le path of a file de data GeoJSON.
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
_g.GeoLeaf._VectorTiles = VectorTiles;
_g.GeoLeaf._LayerVisibilityManager = LayerVisibilityManager;
_g.GeoLeaf._WorkerManager = WorkerManager;
_g.GeoLeaf._GeoJSONLayerConfig = LayerConfigManager;
_g.GeoLeaf._GeoJSONPopupTooltip = PopupTooltip;
_g.GeoLeaf._GeoJSONLayerManager = _GeoJSONLayerManager;
_g.GeoLeaf._GeoJSONLoader = _GeoJSONLoader;
_g.GeoLeaf.GeoJSON = GeoJSONCore;
_g.GeoLeaf._RouteLayerManager = RouteLayerManager;
_g.GeoLeaf._RouteLoaders = RouteLoaders;
_g.GeoLeaf._RoutePopupBuilder = RoutePopupBuilder;
_g.GeoLeaf._RouteStyleResolver = RouteStyleResolver;
