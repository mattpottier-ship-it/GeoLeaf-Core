/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module config/debug-flag
 * @description Centralized debug mode accessor.
 *
 * Phase 10-A: Extracts the `globalThis.GeoLeaf.DEBUG` lookup into a dedicated
 * utility so modules can declare the dependency explicitly rather than
 * reading the global namespace directly.
 *
 * NOTE: This still reads `globalThis.GeoLeaf.DEBUG` at call time to support
 * the use case where end users set `window.GeoLeaf.DEBUG = true` after init.
 * A future Phase 10-D migration could replace this with a build-time replace()
 * plugin (Rollup) or a proper ESM-level init function.
 */

/**
 * Returns whether GeoLeaf debug mode is currently active.
 * Reads the runtime flag set by end users via `window.GeoLeaf.DEBUG = true`.
 * @returns {boolean}
 */
export function getDebugMode() {
    return globalThis.GeoLeaf?.DEBUG === true;
}
