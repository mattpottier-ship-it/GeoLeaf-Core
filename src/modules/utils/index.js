/**
 * @fileoverview Utils barrel — re-exports all utility modules
 * @module GeoLeaf.Utils
 * @description Central entry point for all GeoLeaf utility modules.
 */

// General utilities (deepMerge, debounce, throttle, etc.)
export {
    validateUrl,
    deepMerge,
    ensureMap,
    mergeOptions,
    fireMapEvent,
    debounce,
    throttle,
    getDistance,
    resolveField,
    Utils
} from './general-utils.js';

// Animation
export { AnimationHelper, getAnimationHelper } from './animation-helper.js';

// DOM helpers
export { createElement, appendChild, clearElement } from './dom-helpers.js';

// DOM security
export { DOMSecurity } from './dom-security.js';

// Error logger
export { ErrorLogger } from './error-logger.js';

// Event helpers
export { EventHelpers } from './event-helpers.js';

// Event listener manager
export { EventListenerManager } from './event-listener-manager.js';
export { bus, createEventBus } from './event-bus.js';

// Fetch helper
export { FetchHelper, FetchError } from './fetch-helper.js';

// File validator
export { FileValidator } from './file-validator.js';

// Formatters
export {
    formatDistance,
    formatDate,
    formatDateTime,
    formatNumber,
    formatFileSize
} from './formatters.js';

// Lazy loader
export { LazyLoader, getLazyLoader } from './lazy-loader.js';

// Map helpers
export { MapHelpers } from './map-helpers.js';

// Object utilities
export { getNestedValue, hasNestedPath, setNestedValue } from './object-utils.js';

// Performance profiler
export { PerformanceProfiler, getPerformanceProfiler } from './performance-profiler.js';

// Scale utilities
export { calculateMapScale, isScaleInRange, clearScaleCache } from './scale-utils.js';

// Timer manager
export { TimerManager } from './timer-manager.js';
