/**
 * @module globals
 *
 * @description
 * UMD/ESM bridge orchestrator — Phase 9 refactor.
 *
 * This runtime initialization module delegates to domain-specific sub-modules,
 * each of which imports its own dependencies and appends to `_g.GeoLeaf`.
 * It is imported as a **side-effect** by both `bundle-entry.ts` (UMD) and
 * `bundle-esm-entry.ts` (ESM) to populate `window.GeoLeaf.*`.
 *
 * Guaranteed execution order (ESM depth-first resolution):
 *   `globals.core` → `globals.config` → `globals.geojson` →
 *   `globals.ui` → `globals.storage` → `globals.poi` → `globals.api`
 *
 * History:
 *   - `_namespace.js` removed in Phase 8 — all modules use pure Pattern A
 *   - `globals.js` split into domain sub-files in Phase 9 (P3-DEAD-05)
 *
 * @see globals.core for runtime core (log, errors, utils)
 * @see globals.api for public facades and PluginRegistry
 * @see docs/architecture/BOOT_SEQUENCE.md
 */

// B1+B2  runtime core : log, errors, constants, security, utils (DOIT être en premier)
import "./globals.core.js";
// B3+B4  helpers, validators, renderers, data, loaders, map, config
import "./globals.config.js";
// B5  geojson, route
import "./globals.geojson.js";
// B6+B7+B9  labels, legend, layer-manager, themes, ui
import "./globals.ui.js";
// B8  storage, cache, IndexedDB
import "./globals.storage.js";
// B10  poi, add-form, renderers
import "./globals.poi.js";
// B11  facades geoleaf.*.js + api/ + PluginRegistry (DOIT être en dernier)
import "./globals.api.js";

// Re-exporter _g for thes consommateurs qui l'importent directly
const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

export { _g };
