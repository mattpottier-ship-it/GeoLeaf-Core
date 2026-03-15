/**
 * @module globals-lite
 *
 * @description
 * UMD/ESM bridge orchestrator — Lite (lightweight) variant.
 *
 * This runtime initialization module mirrors `globals.ts` but excludes heavy
 * optional modules to produce a smaller bundle (PERF-02):
 *   - **Excluded:** Table (~26 KB min), Labels (~15 KB min), Route (~18 KB min)
 *   - **Target:** gzip < 150 KB (vs ~174 KB for the full bundle)
 *
 * Import order (ESM depth-first):
 *   `globals.core` → `globals.config` → `globals.geojson-lite` →
 *   `globals.ui-lite` → `globals.poi` → `globals.api-lite`
 *
 * Storage sub-module is intentionally excluded from the open-source Lite build.
 *
 * @see globals for the full variant
 * @see bundle-core-lite-entry for the Lite UMD entry point
 */

// B1+B2 — runtime core (identique au build full)
import "./globals.core.js";
// B3+B4 — helpers, validators, renderers, data, config (identique)
import "./globals.config.js";
// B5 — GeoJSON only (sans route)
import "./globals.geojson-lite.js";
// B6+B7+B9 — UI without thebels
import "./globals.ui-lite.js";
// B8 — storage (deactivated dans core open-source)
// import "./globals.storage.js";
// B10 — POI (identique)
import "./globals.poi.js";
// B11 — facades + API sans Route ni Table
import "./globals.api-lite.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

export { _g };
