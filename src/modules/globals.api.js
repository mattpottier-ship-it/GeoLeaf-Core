/**
 * globals.api.js — Bridge UMD/ESM : B11 — facades geoleaf.*.js + api, PluginRegistry
 *
 * @see globals.js (orchestrateur)
 */

// B11 : facades geoleaf.*.js + api/
// Note: api/ must be imported before geoleaf.api.js (controller sets up _APIController getter)
import { Log } from "./log/index.js";
import { APIController } from "./api/controller.js";
import { APIFactoryManager } from "./api/factory-manager.js";
import { APIInitializationManager } from "./api/initialization-manager.js";
import { APIModuleManager } from "./api/module-manager.js";
import { Baselayers } from "./geoleaf.baselayers.js";
import { Core } from "./geoleaf.core.js";
import { Filters } from "./geoleaf.filters.js";
import { Helpers } from "./geoleaf.helpers.js";
import { LayerManager } from "./geoleaf.layer-manager.js";
import { Legend } from "./geoleaf.legend.js";
import { POI } from "./geoleaf.poi.js";
import { Route } from "./geoleaf.route.js";
// Storage facade lives in GeoLeaf-Plugins (Phase 7 — premium separation)
import { Table } from "./geoleaf.table.js";
import { UI } from "./geoleaf.ui.js";
import { Validators } from "./geoleaf.validators.js";
import { BootInfo } from "./api/boot-info.js";
import { PluginRegistry } from "./api/plugin-registry.js";
// Re-import renderers to re-set them AFTER Object.assign(_g.GeoLeaf.POI, POI) (see comment below)
import { FieldRenderers } from "./poi/renderers/field-renderers.js";
import { MediaRenderers } from "./poi/renderers/media-renderers.js";
// geoleaf.api.js is imported last in bundle-entry.js (requires _APIController to be set up first)

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

// ── B11 assignations : facades + api ─────────────────────────────────────────
if (!_g.GeoLeaf.API) _g.GeoLeaf.API = {};
_g.GeoLeaf.API.Controller = APIController;
_g.GeoLeaf.API.FactoryManager = APIFactoryManager;
_g.GeoLeaf.API.InitializationManager = APIInitializationManager;
_g.GeoLeaf.API.ModuleManager = APIModuleManager;
// Aliases expected by api/controller.js._getManagerClass() (Phase 7 key mismatch fix)
_g.GeoLeaf.API.APIModuleManager = APIModuleManager;
_g.GeoLeaf.API.APIInitializationManager = APIInitializationManager;
_g.GeoLeaf.API.APIFactoryManager = APIFactoryManager;
// Top-level facade modules
_g.GeoLeaf.Baselayers = Baselayers;
_g.GeoLeaf.BaseLayers = Baselayers; // alias stabilisé Phase 7
_g.GeoLeaf.Core = Core;
_g.GeoLeaf.Filters = Filters;
_g.GeoLeaf.Helpers = Helpers;
_g.GeoLeaf.LayerManager = LayerManager;
_g.GeoLeaf.Legend = Legend;
if (!_g.GeoLeaf.POI || !_g.GeoLeaf.POI.init)
    _g.GeoLeaf.POI = Object.assign(_g.GeoLeaf.POI || {}, POI);
// Renderers must be (re-)set AFTER the Object.assign above because geoleaf.poi.js
// historically shipped a Renderers:{} key that would overwrite them if set earlier.
if (!_g.GeoLeaf.POI.Renderers) _g.GeoLeaf.POI.Renderers = {};
_g.GeoLeaf.POI.Renderers.FieldRenderers = FieldRenderers;
_g.GeoLeaf.POI.Renderers.MediaRenderers = MediaRenderers;
_g.GeoLeaf.Route = Route;
// Storage: namespace ensured by globals.storage.js; facade methods injected by the premium plugin at runtime
_g.GeoLeaf.Storage = _g.GeoLeaf.Storage || {};
_g.GeoLeaf.Table = Table;
// UI: geoleaf.ui.js built _g.GeoLeaf.UI directly via mutations — re-sync reference
_g.GeoLeaf.UI = UI || _g.GeoLeaf.UI;
// Validators: override B8 SchemaValidators with full public Validators facade
_g.GeoLeaf.Validators = Validators;
_g.GeoLeaf.plugins = PluginRegistry;
_g.GeoLeaf.bootInfo = BootInfo;
// Enregistrer le core comme chargé
PluginRegistry.register("core", { version: _g.GeoLeaf._version });

// ── Public API entry points ──────────────────────────────────────────────────
// Note: api/geoleaf-api.js is excluded by Rollup DCE in the UMD build because
// Object.assign(existing, {...}) where existing = _g.GeoLeaf||{} is treated as
// operating on a "local" object (propertyReadSideEffects:false + globalThis).
// Methods are assigned directly here to guarantee inclusion in the UMD bundle.
// See ROADMAP_PHASE11_LEGACY_TESTS_2026-02.md for context.

_g.GeoLeaf.init = function (options) {
    try {
        return _g.GeoLeaf._APIController.geoleafInit(options);
    } catch (error) {
        if (Log) Log.error("[GeoLeaf.init]", error);
        throw error;
    }
};
_g.GeoLeaf.setTheme = function (theme) {
    try {
        return _g.GeoLeaf._APIController.geoleafSetTheme(theme);
    } catch (error) {
        if (Log) Log.error("[GeoLeaf.setTheme]", error);
        throw error;
    }
};
_g.GeoLeaf.loadConfig = function (input) {
    if (
        input === null ||
        input === undefined ||
        (typeof input !== "string" && typeof input !== "object")
    ) {
        throw new TypeError(
            `[GeoLeaf.loadConfig] Invalid input: expected string URL or config object, got ${typeof input}`
        );
    }
    try {
        return _g.GeoLeaf._APIController.geoleafLoadConfig(input);
    } catch (error) {
        if (Log) Log.error("[GeoLeaf.loadConfig]", error);
        throw error;
    }
};
_g.GeoLeaf.createMap = function (id, options) {
    const ctrl = _g.GeoLeaf._APIController;
    return ctrl && ctrl.geoleafCreateMap ? ctrl.geoleafCreateMap(id, options) : null;
};
_g.GeoLeaf.getMap = function (id) {
    const ctrl = _g.GeoLeaf._APIController;
    return ctrl && ctrl.managers && ctrl.managers.factory
        ? ctrl.managers.factory.getMapInstance(id)
        : null;
};
_g.GeoLeaf.getAllMaps = function () {
    const ctrl = _g.GeoLeaf._APIController;
    return ctrl && ctrl.managers && ctrl.managers.factory
        ? ctrl.managers.factory.getAllMapInstances()
        : [];
};
_g.GeoLeaf.removeMap = function (id) {
    const ctrl = _g.GeoLeaf._APIController;
    if (
        ctrl &&
        ctrl.managers &&
        ctrl.managers.factory &&
        typeof ctrl.managers.factory.removeMapInstance === "function"
    ) {
        return ctrl.managers.factory.removeMapInstance(id);
    }
    return false;
};
_g.GeoLeaf.getModule = function (name) {
    const ctrl = _g.GeoLeaf._APIController;
    return ctrl && ctrl.moduleAccessFn ? ctrl.moduleAccessFn(name) : null;
};
_g.GeoLeaf.hasModule = function (name) {
    const ctrl = _g.GeoLeaf._APIController;
    const mod = ctrl && ctrl.moduleAccessFn ? ctrl.moduleAccessFn(name) : null;
    return !!mod;
};
_g.GeoLeaf.getNamespace = function (name) {
    // eslint-disable-next-line security/detect-object-injection
    return _g.GeoLeaf && name ? _g.GeoLeaf[name] || null : null;
};
_g.GeoLeaf.getHealth = function () {
    const ctrl = _g.GeoLeaf._APIController;
    return ctrl && ctrl.getHealthStatus ? ctrl.getHealthStatus() : null;
};
_g.GeoLeaf.getMetrics = function () {
    return _g.GeoLeaf.getHealth();
};
// Alias version / CONSTANTS (set also by geoleaf-api.js for ESM — harmless duplicate)
if (!_g.GeoLeaf.version) {
    _g.GeoLeaf.version = (_g.GeoLeaf.CONSTANTS && _g.GeoLeaf.CONSTANTS.VERSION) || "4.0.0";
}
// geoleaf.api.js (ESM facade) also sets these; globals.api.js provides the UMD fallback.
