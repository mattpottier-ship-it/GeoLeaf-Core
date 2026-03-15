/*!
 * GeoLeaf Core — ESM Entry Point
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module bundle-esm-entry
 *
 * @description
 * GeoLeaf Bundle ESM Entry Point — Phase 7.
 *
 * This is the **exclusive entry point for ESM bundle generation** via Rollup
 * (`esmConfig` in `rollup.config.mjs`). It must NOT be used for UMD builds
 * (use `bundle-entry.ts` instead).
 *
 * Responsibilities:
 *   - Side-effects: `globals.js` (assigns `window.GeoLeaf.*`) + `app/` bootstrap
 *   - Dynamic `_loadModule` / `_loadAllSecondaryModules` helpers for lazy loading
 *   - ~50 named ESM exports intended for third-party bundlers (Vite, webpack, etc.)
 *
 * Lazy chunks (`dist/chunks/`) are produced via dynamic `import()` expressions.
 * In UMD mode Rollup inlines them (single bundle); in ESM mode each produces a
 * separate network chunk for optimal code splitting.
 *
 * @version 1.1.0
 * @see bundle-entry for the UMD entry point
 * @see modules/globals for the UMD/ESM bridge orchestrator
 * @see app/init for the application initialization sequence
 */

// ── Side-effects : globals.js + bootstrap applicatif ──
// globals.js assigne window.GeoLeaf.* pour compat CDN/UMD.
// app/* bootstrappe l'application.
import "./modules/globals.js";
import "./app/helpers.js";
import "./app/init.js";
import "./app/boot.js";

// ── Module loader pour code splitting ESM ──
// In mode ESM ces import() produisent des chunks separateds dans dist/chunks/.
const _gl: any = typeof globalThis !== "undefined" ? globalThis : window;
_gl.GeoLeaf = _gl.GeoLeaf || {};
/* eslint-disable complexity -- switch for dynamic module names */
_gl.GeoLeaf._loadModule = async function (moduleName: any) {
    switch (moduleName) {
        // POI : loading complete (core → renderers → extras)
        case "poi":
            await import("./lazy/poi-core.js");
            await Promise.all([import("./lazy/poi-renderers.js"), import("./lazy/poi-extras.js")]);
            break;
        // POI sub-chunks (loading granulaire)
        case "poiCore":
            await import("./lazy/poi-core.js");
            break;
        case "poiRenderers":
            await import("./lazy/poi-renderers.js");
            break;
        case "poiExtras":
            await import("./lazy/poi-extras.js");
            break;
        case "basemapSelector":
            await import("./lazy/basemap-selector.js");
            break;
        case "route":
            await import("./lazy/route.js");
            break;
        case "layerManager":
            await import("./lazy/layer-manager.js");
            break;
        case "legend":
            await import("./lazy/legend.js");
            break;
        case "labels":
            await import("./lazy/labels.js");
            break;
        case "themes":
            await import("./lazy/themes.js");
            break;
        case "table":
            await import("./lazy/table.js");
            break;
        default:
            console.warn("[GeoLeaf] Module inconnu:", moduleName);
    }
};
/* eslint-enable complexity */
_gl.GeoLeaf._loadAllSecondaryModules = async function () {
    // POI core en premier (poi-renderers/extras/add-form en depend)
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

// ── Named exports ESM publics (consommables par bundlers tiers) ──
// Facades haut niveau
export { Core } from "./modules/geoleaf.core.js";
export { GeoLeafAPI } from "./modules/geoleaf.api.js";
export { UI } from "./modules/geoleaf.ui.js";
export { POI } from "./modules/geoleaf.poi.js";
export { Route } from "./modules/geoleaf.route.js";
// Storage is now a Premium Plugin (GeoLeaf-Plugins/plugin-storage)
// export { Storage } removed — use GeoLeaf.Storage namespace after loading the plugin
export { Table } from "./modules/geoleaf.table.js";
export { Legend } from "./modules/geoleaf.legend.js";
export { LayerManager } from "./modules/geoleaf.layer-manager.js";
export { Filters } from "./modules/geoleaf.filters.js";
export { Baselayers } from "./modules/geoleaf.baselayers.js";
export { Helpers } from "./modules/geoleaf.helpers.js";
export { Validators } from "./modules/geoleaf.validators.js";
// API sub-modules — B4 [ARCH-02]: import from the barl api/index.js
export {
    APIController,
    APIFactoryManager,
    APIInitializationManager,
    APIModuleManager,
    PluginRegistry,
    BootInfo,
    showBootInfo,
} from "./modules/api/index.js";
// Core utilitaires frequently importeds
export { Log } from "./modules/log/index.js";
export { Errors } from "./modules/errors/index.js";
export { CONSTANTS } from "./modules/constants/index.js";
export { Utils } from "./modules/utils/general-utils.js";
export { Config } from "./modules/config/geoleaf-config/config-core.js";

export default typeof window !== "undefined" ? (window as any).GeoLeaf : {};
