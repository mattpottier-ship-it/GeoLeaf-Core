/**
 * globals.config.js — Bridge UMD/ESM : B3 + B4 — helpers, validators, renderers, data, loaders, config
 *
 * @see globals.js (orchestrateur)
 */

// B3 : helpers, validators, renderers, data, loaders, map
import { StyleResolver, getColorsFromLayerStyle, resolvePoiColors } from './helpers/style-resolver.js';
import { StyleValidator } from './validators/style-validator.js';
import { StyleValidatorRules } from './validators/style-validator-rules.js';
import { AbstractRenderer } from './renderers/abstract-renderer.js';
import { SimpleTextRenderer } from './renderers/simple-text-renderer.js';
import { DataNormalizer } from './data/normalizer.js';
import { StyleLoader } from './loaders/style-loader.js';
import { ScaleControl, initScaleControl } from './map/scale-control.js';
// B4 : config
import { DataConverter } from './config/data-converter.js';
import { ProfileLoader as ConfigLoader } from './config/loader.js';
import { ConfigNormalizer } from './config/normalization.js';
import { ProfileLoader as ModularProfileLoader } from './config/profile-loader.js';
import { ProfileManager } from './config/profile.js';
import { StorageHelper } from './config/storage.js';
import { TaxonomyManager } from './config/taxonomy.js';
import { Config } from './config/geoleaf-config/config-core.js';
// Config sub-modules: side-effect imports that mutate the Config singleton.
// Must follow config-core.js.
import './config/geoleaf-config/config-loaders.js';
import './config/geoleaf-config/config-accessors.js';
import './config/geoleaf-config/config-validation.js';

const _g = typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined' ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

// ── B3 assignations ──────────────────────────────────────────────────────────
if (!_g.GeoLeaf.Helpers) _g.GeoLeaf.Helpers = {};
_g.GeoLeaf.Helpers.StyleResolver = StyleResolver;
_g.GeoLeaf.Helpers.getColorsFromLayerStyle = getColorsFromLayerStyle;
_g.GeoLeaf.Helpers.resolvePoiColors = resolvePoiColors;
if (!_g.GeoLeaf._Validators) _g.GeoLeaf._Validators = {};
_g.GeoLeaf._StyleValidator = StyleValidator;
_g.GeoLeaf._Validators.StyleValidator = StyleValidator;
_g.GeoLeaf._StyleValidatorRules = StyleValidatorRules;
_g.GeoLeaf._Validators.StyleValidatorRules = StyleValidatorRules;
if (!_g.GeoLeaf._Renderers) _g.GeoLeaf._Renderers = {};
_g.GeoLeaf._Renderers.AbstractRenderer = AbstractRenderer;
_g.GeoLeaf._Renderers.SimpleTextRenderer = SimpleTextRenderer;
_g.GeoLeaf._Normalizer = DataNormalizer;
_g.GeoLeaf._StyleLoader = StyleLoader;
_g.GeoLeaf.ScaleControl = ScaleControl;
_g.GeoLeaf.initScaleControl = initScaleControl;

// ── B4 assignations ──────────────────────────────────────────────────────────
if (!_g.GeoLeaf.Config) _g.GeoLeaf.Config = Config;
Object.assign(_g.GeoLeaf.Config, Config);
_g.GeoLeaf._DataConverter = DataConverter;
_g.GeoLeaf._ConfigLoader = ConfigLoader;
_g.GeoLeaf._ConfigNormalization = ConfigNormalizer;
_g.GeoLeaf._ProfileLoader = ModularProfileLoader;
_g.GeoLeaf._ConfigProfile = ProfileManager;
_g.GeoLeaf._ConfigStorage = StorageHelper;
_g.GeoLeaf._ConfigTaxonomy = TaxonomyManager;
