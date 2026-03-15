/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module bundle-entry
 *
 * @description
 * GeoLeaf Bundle Entry Point — UMD Build (Phase 7).
 *
 * This is the **exclusive entry point for UMD bundle generation** via Rollup
 * (configs: `umdConfig`, `umdMinConfig`). It must NOT contain named ESM exports —
 * those are declared in `bundle-esm-entry.ts`.
 *
 * Responsibilities:
 *   - Application bootstrap via `app/` (helpers → init → boot)
 *   - Lazy module resolver Map (replaces static switch-case — C8)
 *   - `globals.js` imported LAST to assign `window.GeoLeaf.*` side-effects
 *     after all sub-modules are registered
 *
 * The `export default` at the bottom is the single UMD export: it re-exports
 * the existing `window.GeoLeaf` object assembled by `globals.js`, so that
 * Rollup assigns it as `window.GeoLeaf = GeoLeaf` without creating a wrapper.
 *
 * @version 1.1.0
 * @see bundle-esm-entry for named ESM exports consumed by third-party bundlers
 * @see app/init for the application initialization sequence
 * @see modules/globals for the UMD/ESM bridge orchestrator
 */

// ── T12: Application bootstrap (ESM) ──
// These modules directly import their dependencies via ESM (pure Pattern A).
import "./app/helpers.js";
import "./app/init.js";
import "./app/boot.js";

// ── Sprint 6 / Phase 7: Module loader for code splitting ──
// In ESM mode, these import() produce separate chunks in dist/chunks/.
// In UMD mode, Rollup inlines them (single bundle, backward compatible).
const _gl: any = typeof globalThis !== "undefined" ? globalThis : window;
_gl.GeoLeaf = _gl.GeoLeaf || {};

/**
 * Lazy resolver lookup table — extensible Map of GeoLeaf modules.
 * Replaces the static switch-casee (C8).
 * In UMD mode the code is already inlined → immediate resolution.
 * In ESM mode → separate network chunk.
 */
const _lazyModuleResolvers = new Map<string, any>([
    // POI: full loading (core → renderers + extras in parallel)
    [
        "poi",
        async () => {
            await import("./lazy/poi-core.js");
            await Promise.all([import("./lazy/poi-renderers.js"), import("./lazy/poi-extras.js")]);
        },
    ],
    // POI sub-chunks (granular loading)
    ["poiCore", () => import("./lazy/poi-core.js")],
    ["poiRenderers", () => import("./lazy/poi-renderers.js")],
    ["poiExtras", () => import("./lazy/poi-extras.js")],
    ["basemapSelector", () => import("./lazy/basemap-selector.js")],
    ["route", () => import("./lazy/route.js")],
    ["layerManager", () => import("./lazy/layer-manager.js")],
    ["legend", () => import("./lazy/legend.js")],
    ["labels", () => import("./lazy/labels.js")],
    ["themes", () => import("./lazy/themes.js")],
    ["table", () => import("./lazy/table.js")],
]);

// Register resolvers in PluginRegistry (after globals.js via ESM hoisting)
if (_gl.GeoLeaf.plugins?.registerLazy) {
    for (const [name, resolver] of _lazyModuleResolvers) {
        _gl.GeoLeaf.plugins.registerLazy(name, resolver);
    }
}

/**
 * Loads a module secondary to the demande.
 * @param {string} moduleName - Nom of the module ('poi','route','table','legend','layerManager','labels','themes')
 * @returns {Promise<void>}
 */
_gl.GeoLeaf._loadModule = async function (moduleName: any) {
    const resolver = _lazyModuleResolvers.get(moduleName);
    if (!resolver) {
        console.warn(
            `[GeoLeaf] Module inconnu : "${moduleName}". Disponibles : ${[..._lazyModuleResolvers.keys()].join(", ")}`
        );
        return;
    }
    try {
        await resolver();
        _gl.GeoLeaf.plugins?.register(moduleName, { version: _gl.GeoLeaf._version });
    } catch (err) {
        console.error(`[GeoLeaf] Error loading module "${moduleName}":`, err);
        throw err;
    }
};

/**
 * Loads tous the modules secondarys en parallel.
 * Called by init.js to pre-load before initialization.
 * @returns {Promise<void>}
 */
_gl.GeoLeaf._loadAllSecondaryModules = async function () {
    // POI core first (poi-renderers/extras/add-form depend on it)
    await import("./lazy/poi-core.js");
    await Promise.all([
        import("./lazy/poi-renderers.js"),
        import("./lazy/poi-extras.js"),
        import("./lazy/route.js"),
        import("./lazy/layer-manager.js"),
        import("./lazy/legend.js"),
        import("./lazy/labels.js"),
        import("./lazy/themes.js"),
        import("./lazy/table.js"),
    ]);
};

// Point unique compat UMD/CDN — DERNIER import (side-effects (window as any).GeoLeaf.*)
// globals.js importe tous the modules T0–T11 et les assigne sur _g.GeoLeaf.
import "./modules/globals.js";
// geoleaf.api.js — ESM facade (named exports only).
// ⚠️ UMD: public methods (loadConfig, init, setTheme, etc.) are
//    assigned directly in globals.api.js (end of file) to prevent
//    elimination by Rollup DCE (Object.assign on an object derived from globalThis).
import "./modules/geoleaf.api.js";

// Export of the global GeoLeaf namespace as assembled by globals.js
// ⚠️ This `export default` is the ONLY export — NO named exports here.
//    This way the UMD bundle assigns (window as any).GeoLeaf = the existing GeoLeaf object (not a wrapper).
export default typeof window !== "undefined" ? (window as any).GeoLeaf : {};
