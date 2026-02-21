/*!
 * GeoLeaf Core — ESM Entry Point
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Bundle ESM Entry Point — Phase 7
 * Point d'entrée EXCLUSIF pour le build ESM (esmConfig dans rollup.config.mjs).
 *
 * Ce fichier NE doit PAS être utilisé pour le build UMD (utiliser bundle-entry.js).
 * Il expose les ~50 named exports ESM publics destinés aux bundlers tiers (Vite, webpack...).
 *
 * Les lazy chunks (dist/chunks/) sont produits via les import() dynamiques.
 *
 * @version 4.0.0
 * @see src/bundle-entry.js pour le build UMD
 */

// ── Side-effects : globals.js + bootstrap applicatif ──
// globals.js assigne window.GeoLeaf.* pour compat CDN/UMD.
// app/* bootstrappe l'application.
import "./modules/globals.js";
import "./app/helpers.js";
import "./app/init.js";
import "./app/boot.js";

// ── Module loader pour code splitting ESM ──
// En mode ESM ces import() produisent des chunks séparés dans dist/chunks/.
const _gl = typeof globalThis !== "undefined" ? globalThis : window;
_gl.GeoLeaf = _gl.GeoLeaf || {};
_gl.GeoLeaf._loadModule = async function (moduleName) {
    switch (moduleName) {
        // POI : chargement complet (core → renderers → extras)
        case "poi":
            await import("./lazy/poi-core.js");
            await Promise.all([import("./lazy/poi-renderers.js"), import("./lazy/poi-extras.js")]);
            break;
        // POI sub-chunks (chargement granulaire)
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
_gl.GeoLeaf._loadAllSecondaryModules = async function () {
    // POI core en premier (poi-renderers/extras/add-form en dépendent)
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
// Façades haut niveau
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
// API sub-modules — B4 [ARCH-02]: import depuis le barrel api/index.js
export {
    APIController,
    APIFactoryManager,
    APIInitializationManager,
    APIModuleManager,
    PluginRegistry,
    BootInfo,
    showBootInfo,
} from "./modules/api/index.js";
// Core utilitaires fréquemment importés
export { Log } from "./modules/log/index.js";
export { Errors } from "./modules/errors/index.js";
export { CONSTANTS } from "./modules/constants/index.js";
export { Utils } from "./modules/utils/general-utils.js";
export { Config } from "./modules/config/geoleaf-config/config-core.js";

export default typeof window !== "undefined" ? window.GeoLeaf : {};
