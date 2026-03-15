/*!
 * GeoLeaf Core Lite — ESM Entry Point
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Core Lite — Lightweight build without heavy optional modules.
 * Excludes: Table (~26 KB min), Labels (~8 KB min), Route (~18 KB min), VectorTiles (~20 KB min).
 * Target: bundle gzip < 130 KB (vs 148 KB full).
 *
 * Included modules: Core, UI, POI, Legend, LayerManager, Baselayers, Themes, GeoJSON, Config,
 *                   Utils, Log, Security, Errors, Validators, Filters, Helpers.
 *
 * @version 1.1.0
 * @see src/bundle-esm-entry.ts for the full build
 */

// ── Side-effects : globals lite + bootstrap ──
import "./modules/globals-lite.js";
import "./app/helpers.js";
import "./app/init.js";
import "./app/boot.js";

// ── Lightweight module loader (without table / labels / route) ──
const _gl: any = typeof globalThis !== "undefined" ? globalThis : window;
_gl.GeoLeaf = _gl.GeoLeaf || {};
_gl.GeoLeaf._loadModule = async function (moduleName: any) {
    switch (moduleName) {
        case "poi":
            await import("./lazy/poi-core.js");
            await Promise.all([import("./lazy/poi-renderers.js"), import("./lazy/poi-extras.js")]);
            break;
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
        case "layerManager":
            await import("./lazy/layer-manager.js");
            break;
        case "legend":
            await import("./lazy/legend.js");
            break;
        case "themes":
            await import("./lazy/themes.js");
            break;
        // table / labels / route volontairement absents du build lite
        default:
            console.warn("[GeoLeaf Lite] Module non disponible dans le build lite:", moduleName);
    }
};
_gl.GeoLeaf._loadAllSecondaryModules = async function () {
    await import("./lazy/poi-core.js");
    await Promise.all([
        import("./lazy/poi-renderers.js"),
        import("./lazy/poi-extras.js"),
        import("./lazy/layer-manager.js"),
        import("./lazy/legend.js"),
        import("./lazy/themes.js"),
    ]);
};

// ── Named exports ESM (subset lite) ──
export { Core } from "./modules/geoleaf.core.js";
export { GeoLeafAPI } from "./modules/geoleaf.api.js";
export { UI } from "./modules/geoleaf.ui.js";
export { POI } from "./modules/geoleaf.poi.js";
export { Legend } from "./modules/geoleaf.legend.js";
export { LayerManager } from "./modules/geoleaf.layer-manager.js";
export { Filters } from "./modules/geoleaf.filters.js";
export { Baselayers } from "./modules/geoleaf.baselayers.js";
export { Helpers } from "./modules/geoleaf.helpers.js";
export { Validators } from "./modules/geoleaf.validators.js";
export {
    APIController,
    APIFactoryManager,
    APIInitializationManager,
    APIModuleManager,
    PluginRegistry,
    BootInfo,
    showBootInfo,
} from "./modules/api/index.js";
export { Log } from "./modules/log/index.js";
export { Errors } from "./modules/errors/index.js";
export { CONSTANTS } from "./modules/constants/index.js";
export { Utils } from "./modules/utils/general-utils.js";
export { Config } from "./modules/config/geoleaf-config/config-core.js";

export default typeof window !== "undefined" ? (window as any).GeoLeaf : {};
