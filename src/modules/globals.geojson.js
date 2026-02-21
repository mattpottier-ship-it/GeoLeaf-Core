/**
 * globals.geojson.js — Bridge UMD/ESM : B5 — geojson, route
 *
 * @see globals.js (orchestrateur)
 */

// B5 : geojson, route
import { GeoJSONShared } from './geojson/shared.js';
import { GeoJSONClustering } from './geojson/clustering.js';
import { FeatureValidator } from './geojson/feature-validator.js';
import { normalizeStyleToLeaflet } from './geojson/style-utils.js';
import { GeoJSONStyleResolver } from './geojson/style-resolver.js';
import { VectorTiles } from './geojson/vector-tiles.js';
import { VisibilityManager as LayerVisibilityManager } from './geojson/visibility-manager.js';
import { WorkerManager } from './geojson/worker-manager.js';
import { LayerConfigManager } from './geojson/layer-config-manager.js';
import { PopupTooltip } from './geojson/popup-tooltip.js';
import { LayerManagerStore } from './geojson/layer-manager/store.js';
import { LayerManagerVisibility } from './geojson/layer-manager/visibility.js';
import { LayerManagerStyle } from './geojson/layer-manager/style.js';
import { LayerManagerIntegration } from './geojson/layer-manager/integration.js';
import { LoaderConfigHelpers } from './geojson/loader/config-helpers.js';
import { LoaderData } from './geojson/loader/data.js';
import { LoaderProfile } from './geojson/loader/profile.js';
import { LoaderSingleLayer } from './geojson/loader/single-layer.js';
import { GeoJSONCore } from './geojson/core.js';
import { RouteLayerManager } from './route/layer-manager.js';
import { RouteLoaders } from './route/loaders.js';
import { RoutePopupBuilder } from './route/popup-builder.js';
import { RouteStyleResolver } from './route/style-resolver.js';

const _g = typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined' ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

// ── B5 assignations ──────────────────────────────────────────────────────────
const _GeoJSONLayerManager = Object.assign({}, LayerManagerStore, LayerManagerVisibility, LayerManagerStyle, LayerManagerIntegration);
const _GeoJSONLoader = Object.assign({}, LoaderConfigHelpers, LoaderData, LoaderProfile, LoaderSingleLayer);
// Délégation manquante : _resolveDataFilePath n'est défini dans aucun sous-module du Loader.
// LayerConfigManager.resolveDataFilePath résout le chemin d'un fichier de données GeoJSON.
_GeoJSONLoader._resolveDataFilePath = LayerConfigManager.resolveDataFilePath.bind(LayerConfigManager);
_g.GeoLeaf._GeoJSONShared = GeoJSONShared;
_g.GeoLeaf._GeoJSONClustering = GeoJSONClustering;
_g.GeoLeaf._GeoJSONFeatureValidator = FeatureValidator;
_g.GeoLeaf._StyleUtils = { normalizeStyleToLeaflet };
_g.GeoLeaf._GeoJSONStyleResolver = GeoJSONStyleResolver;
_g.GeoLeaf._StyleRules = {
    evaluate: GeoJSONStyleResolver.evaluateStyleRules,
    operators: GeoJSONShared.STYLE_OPERATORS,
    getNestedValue: GeoJSONStyleResolver.getNestedValue
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
