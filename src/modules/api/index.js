/**
 * GeoLeaf API — Barrel export
 * B4 [ARCH-02]: point d'entrée unique pour le sous-module api/
 *
 * @module api
 */
export { APIController } from "./controller.js";
export { APIFactoryManager } from "./factory-manager.js";
export { APIInitializationManager } from "./initialization-manager.js";
export { APIModuleManager } from "./module-manager.js";
export { PluginRegistry } from "./plugin-registry.js";
export { BootInfo, showBootInfo } from "./boot-info.js";
// Note: GeoLeafAPI is NOT exported from the barrel — it is a stateful assembler
// with load-order dependencies. Import directly from ./geoleaf-api.js when needed.
