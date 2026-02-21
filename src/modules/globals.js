/**
 * globals.js  Orchestrateur du bridge UMD/ESM (Phase 9  refactorisé)
 * Ce fichier délègue aux sous-modules par domaine métier.
 * Chaque sous-module importe ses propres dépendances et appende _g.GeoLeaf.
 *
 * Ordre d'exécution garanti par ESM (depth-first) :
 *   core  config  geojson  ui  storage  poi  api
 *
 *  _namespace.js supprimé en Phase 8  tous les modules utilisent Pattern A pur
 *  globals.js découpé en sous-fichiers par domaine en Phase 9 (P3-DEAD-05)
 *
 * @see ROADMAP_PHASE7_ESM.md
 * @see docs/architecture/BOOT_SEQUENCE.md
 */

// B1+B2  runtime core : log, errors, constants, security, utils (DOIT être en premier)
import './globals.core.js';
// B3+B4  helpers, validators, renderers, data, loaders, map, config
import './globals.config.js';
// B5  geojson, route
import './globals.geojson.js';
// B6+B7+B9  labels, legend, layer-manager, themes, ui
import './globals.ui.js';
// B8  storage, cache, IndexedDB
import './globals.storage.js';
// B10  poi, add-form, renderers
import './globals.poi.js';
// B11  facades geoleaf.*.js + api/ + PluginRegistry (DOIT être en dernier)
import './globals.api.js';

// Re-exporter _g pour les consommateurs qui l'importent directement
const _g = typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined' ? window : {};

export { _g };
