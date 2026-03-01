/**
 * globals-lite.ts — Orchestrateur bridge UMD/ESM allégé
 * PERF-02 : exclut Table (~26 KB min), Labels (~15 KB min), Route (~18 KB min)
 * Cible : gzip < 130 KB (vs 148 KB full)
 *
 * @see globals.ts pour la version complète
 */

// B1+B2 — runtime core (identique au build full)
import "./globals.core.js";
// B3+B4 — helpers, validators, renderers, data, config (identique)
import "./globals.config.js";
// B5 — GeoJSON uniquement (sans route)
import "./globals.geojson-lite.js";
// B6+B7+B9 — UI sans labels
import "./globals.ui-lite.js";
// B8 — storage (désactivé dans core open-source)
// import "./globals.storage.js";
// B10 — POI (identique)
import "./globals.poi.js";
// B11 — facades + API sans Route ni Table
import "./globals.api-lite.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

export { _g };
