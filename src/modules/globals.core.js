/**
 * globals.core.js — Bridge UMD/ESM : B1 + B2 — runtime core
 * log, errors, constants, security, utils
 *
 * @see globals.js (orchestrateur)
 * @see docs/architecture/BOOT_SEQUENCE.md
 */

// B1 : log, errors, constants, security
import { Log } from './log/index.js';
import { Errors } from './errors/index.js';
import { CONSTANTS } from './constants/index.js';
import { Security } from './security/index.js';
import { CSRFToken } from './security/csrf-token.js';

// B2 : utils
import { Utils, validateUrl, deepMerge, debounce, throttle } from './utils/general-utils.js';
import { createElement } from './utils/dom-helpers.js';
import { AnimationHelper, getAnimationHelper } from './utils/animation-helper.js';
import { DOMSecurity } from './utils/dom-security.js';
import { ErrorLogger } from './utils/error-logger.js';
import { EventHelpers } from './utils/event-helpers.js';
import { EventListenerManager, globalEventManager, events as globalEvents } from './utils/event-listener-manager.js';
import { bus as _eventBus, createEventBus } from './utils/event-bus.js';
import { FetchHelper, FetchError } from './utils/fetch-helper.js';
import { FileValidator } from './utils/file-validator.js';
import { MapHelpers } from './utils/map-helpers.js';
import { PerformanceProfiler, getPerformanceProfiler } from './utils/performance-profiler.js';
import { LazyLoader, getLazyLoader } from './utils/lazy-loader.js';
import { TimerManager } from './utils/timer-manager.js';
import { getNestedValue, hasNestedPath, setNestedValue } from './utils/object-utils.js';
import { calculateMapScale, isScaleInRange, clearScaleCache } from './utils/scale-utils.js';

const _g = typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined' ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

// Version injectable au build — fallback pour le dev sans build
_g.GeoLeaf._version = typeof __GEOLEAF_VERSION__ !== 'undefined'
    ? __GEOLEAF_VERSION__
    : '4.0.0-dev';

// ── B1 assignations ──────────────────────────────────────────────────────────
_g.GeoLeaf.Log = Log;
_g.GeoLeaf.Errors = Errors;
_g.GeoLeaf.CONSTANTS = CONSTANTS;
if (!_g.GeoLeaf.Security) _g.GeoLeaf.Security = {};
Object.assign(_g.GeoLeaf.Security, Security);
_g.GeoLeaf.Security.CSRFToken = CSRFToken;

// ── B2 assignations ──────────────────────────────────────────────────────────
if (!_g.GeoLeaf.Utils) _g.GeoLeaf.Utils = {};
Object.assign(_g.GeoLeaf.Utils, Utils);
_g.GeoLeaf.Utils.AnimationHelper = AnimationHelper;
Object.defineProperty(_g.GeoLeaf.Utils, 'animationHelper', {
    get: () => getAnimationHelper(),
    configurable: true
});
_g.GeoLeaf.Utils.createElement = createElement;
_g.GeoLeaf.Utils.DOMSecurity = DOMSecurity;
_g.GeoLeaf.DOMSecurity = DOMSecurity;
_g.GeoLeaf.Utils.ErrorLogger = ErrorLogger;
_g.GeoLeaf.Utils.EventHelpers = EventHelpers;
_g.GeoLeaf.Utils.EventListenerManager = EventListenerManager;
_g.GeoLeaf.Utils.events = globalEvents;
_g.GeoLeaf.Utils.globalEventManager = globalEventManager;
_g.GeoLeaf.Bus = _eventBus;
_g.GeoLeaf.Utils.createEventBus = createEventBus;
_g.GeoLeaf.Utils.FetchHelper = FetchHelper;
_g.GeoLeaf.Utils.FetchError = FetchError;
_g.GeoLeaf.Utils.FileValidator = FileValidator;
_g.GeoLeaf.FileValidator = FileValidator;
_g.GeoLeaf.Utils.MapHelpers = MapHelpers;
_g.GeoLeaf.Utils.PerformanceProfiler = PerformanceProfiler;
Object.defineProperty(_g.GeoLeaf.Utils, 'performanceProfiler', {
    get: () => getPerformanceProfiler(),
    configurable: true
});
_g.GeoLeaf.Utils.LazyLoader = LazyLoader;
Object.defineProperty(_g.GeoLeaf.Utils, 'lazyLoader', {
    get: () => getLazyLoader(),
    configurable: true
});
_g.GeoLeaf.Utils.TimerManager = TimerManager;
_g.GeoLeaf.Utils.ObjectUtils = { getNestedValue, hasNestedPath, setNestedValue };
_g.GeoLeaf.Utils.getNestedValue = getNestedValue;
_g.GeoLeaf.Utils.hasNestedPath = hasNestedPath;
_g.GeoLeaf.Utils.setNestedValue = setNestedValue;
_g.GeoLeaf.Utils.ScaleUtils = { calculateMapScale, isScaleInRange, clearScaleCache };
// FetchHelper shortcuts
_g.GeoLeaf.fetch = FetchHelper.fetch.bind(FetchHelper);
_g.GeoLeaf.get   = FetchHelper.get.bind(FetchHelper);
_g.GeoLeaf.post  = FetchHelper.post.bind(FetchHelper);
// MapHelpers shortcuts
_g.GeoLeaf.ensureMap   = MapHelpers.ensureMap.bind(MapHelpers);
_g.GeoLeaf.requireMap  = MapHelpers.requireMap.bind(MapHelpers);
_g.GeoLeaf.hasMap      = MapHelpers.hasMap.bind(MapHelpers);
// Animation shortcuts
_g.GeoLeaf.animate  = (...args) => getAnimationHelper().animate(...args);
_g.GeoLeaf.fadeIn   = (...args) => getAnimationHelper().fadeIn(...args);
_g.GeoLeaf.fadeOut  = (...args) => getAnimationHelper().fadeOut(...args);
// PerformanceProfiler shortcuts
_g.GeoLeaf.mark               = (name) => getPerformanceProfiler().mark(name);
_g.GeoLeaf.measure            = (name, s, e) => getPerformanceProfiler().measure(name, s, e);
_g.GeoLeaf.getPerformanceReport = () => getPerformanceProfiler().generateReport();
_g.GeoLeaf.establishBaseline  = () => getPerformanceProfiler().establishBaseline();
// LazyLoader shortcuts
_g.GeoLeaf.loadModule        = (name, path, opts) => getLazyLoader().loadModule(name, path, opts);
_g.GeoLeaf.enableLazyImages  = (selector) => getLazyLoader().enableImageLazyLoading(selector);
// EventHelpers shortcuts
_g.GeoLeaf.dispatchEvent    = EventHelpers.dispatchCustomEvent.bind(EventHelpers);
_g.GeoLeaf.dispatchMapEvent = EventHelpers.dispatchMapEvent.bind(EventHelpers);
