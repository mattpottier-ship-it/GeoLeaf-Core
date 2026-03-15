/**
 * @module globals.storage
 *
 * @description
 * UMD/ESM bridge — B8 — Storage initialization (core MIT subset).
 *
 * This runtime initialization module registers the storage-related services that
 * remain in the open-source core after Phase 7. It is imported as a side-effect
 * by `globals.ts`.
 *
 * Registers (core only):
 *   - `_OfflineDetector` — detects online/offline state transitions
 *   - `_SWRegister` — Service Worker registration wrapper
 *   - `Storage` namespace stub (enriched at runtime by the premium plugin)
 *
 * The full storage plugin (`CacheManager`, `CacheStrategy`, `IDBHelper`, …)
 * is distributed separately as `GeoLeaf-Plugins/plugin-storage`.
 *
 * @see globals for the orchestrator and import order
 */
import { OfflineDetector } from "./storage/offline-detector.js";
import { SWRegister } from "./storage/sw-register.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

_g.GeoLeaf._OfflineDetector = OfflineDetector;
_g.GeoLeaf._SWRegister = SWRegister;
// Namespace stub — enrichi par le plugin Storage au loading
if (!_g.GeoLeaf.Storage) _g.GeoLeaf.Storage = {};
