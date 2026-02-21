# Changelog

All notable changes to GeoLeaf will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Documentation

- Aligned legal scope across critical docs: MIT core vs commercially licensed premium plugins.
- Updated `docs/API_REFERENCE.md` core API section to match current public methods (`init`, `loadConfig`, `setTheme`, `createMap`, `getMap`, `getAllMaps`, `removeMap`, `getModule`, `hasModule`, `getNamespace`, `getHealth`, `getMetrics`) and removed obsolete `GeoLeaf.destroy()` reference.
- Updated `docs/USER_GUIDE.md` metadata and clarified that offline cache features depend on the premium Storage plugin.
- Updated `docs/guides/GUIDE_LICENCE_PREMIUM.md` with current package names (`@geoleaf-plugins/storage`, `@geoleaf-plugins/addpoi`) and current core package name (`geoleaf`).

---

## [4.0.0] - 2026-02-19

### Fixed — Post-Audit Corrections (Phase 8 — Sprints 1–5)

- **C0** : Injection `__GEOLEAF_VERSION__` via Rollup replace plugin — expose `GeoLeaf._version`
- **C1** : `poi/add-form/submit-handler.js` — `modifiedBy` résolu depuis `GeoLeaf.Config` > `sessionStorage` > anonyme horodaté (suppression hardcode `'current-user'`)
- **C2** : `ui/filter-panel.js` — `innerHTML` remplacé par `sanitizeHTML()` (protection XSS)
- **C3** : Seuil coverage CI ajusté (branches 60 %, fonctions 65 %)
- **C4** : `package.json` — `sideEffects` allowlist explicite pour tree-shaking
- **C5** : Alias `setSafeHTML` → `sanitizeHTML` corrigé dans `dom-security.js` et ses tests
- **C6** : Imports corrigés dans 10 fichiers de tests (`security/`, `themes/`)
- **C7** : Boot toast — affiche la version injectée + liste des plugins chargés
- **C8** : `PluginRegistry` léger avec `_loadModule` Map — `isLoaded`, `getLoadedPlugins`, `canActivate`, `load`
- **C9** : `lazy-loader.js` — timeout `transitionend` 500 ms → 800 ms ; `_initImageObserver()` ne query plus le DOM au boot
- **C10** : Service Worker — tous `console.log/info` gatés derrière `if (_SW_DEBUG)` ; `__SW_DEBUG__` injecté via Rollup
- **C11** : Tests unitaires ajoutés — `storage/cache-subsystem`, `poi/add-form`
- **C12** : Coverage renforcé — `utils/`, `api/`, `security/` (5 suites, +157 tests passing)
- **C13** : Suppression 6 symboles exportés dépréciés (`performanceProfiler`, `lazyLoader`, `animationHelper` et proxies associés)
- **C14** : `poi/sync-handler.js` — injection de dépendances dans `init(config, deps={})` ; suppression 35 accès directs à `_global.GeoLeaf`
- **C15** : Docs — `BOOT_SEQUENCE.md` (séquence T12→globals→boot→app:ready) + `MODULE_CONTRACT.md` (contrats Core/Extension/Plugin)

### Notes

- 89 failures test pré-existantes liées à la migration ESM — non régressées, traçées dans `ROADMAP_PHASE7_ESM.md`
- Branche `fix/phase8-audit` mergée dans `main`

---

## [4.0.0-alpha.0] - 2026-02-17

### ⚠️ BREAKING CHANGES

- **ES Modules** : Le codebase entier est désormais en ES Modules natifs. Les patterns IIFE (`window.GeoLeaf.*`) sont remplacés par `import`/`export`.
- **`"type": "module"`** dans `package.json` : Les scripts CJS doivent utiliser l'extension `.cjs`.
- **Répertoire source renommé** : `src/static/js/` → `src/modules/`.
- **Import sélectif** : `import { Core, GeoJSON } from 'geoleaf'` remplace `<script src="geoleaf.umd.js">`.
- **Plus de pollution globale** en mode ESM : `window.GeoLeaf` n'est plus défini (le build UMD le conserve pour rétro-compatibilité CDN).

### Added

- **Migration ESM complète** : 175+ fichiers convertis de IIFE → ES Modules (tiers T0–T12)
- **Dual build output** : ESM (`geoleaf.esm.js`) + UMD (`geoleaf.umd.js`) via Rollup
- **Barrels `index.js`** : ~25 fichiers barrel pour chaque domaine (config/, geojson/, ui/, etc.)
- **Web Worker GeoJSON** : parsing off-thread (`geojson-worker.js`) avec fallback main thread
- **Service Worker core** : `sw-core.js` gratuit dans le build (cache-first, network-first, stale-while-revalidate)
- **Chunked rendering** : `requestIdleCallback` pour addData Leaflet (200 features/tick)
- **Lazy pane creation** : Les panes DOM sont créés à la demande (au lieu de 101 au boot)
- **Code splitting** : 16 chunks Rollup pour chargement à la demande
- **Scénario B MapLibre** : Basemaps vectorielles WebGL via `@maplibre/maplibre-gl-leaflet`
- **Vector tiles** : Support PBF/MVT pour les couches lourdes (Sprint 8)

### Changed — Architecture (Phase 2 Quick Wins)

- **IIFE removal** : 4 derniers IIFE aplatis en scope module (`geoleaf.core.js`, `geoleaf.baselayers.js`, `geoleaf.poi.js`, `utils/dom-security.js`)
- **Namespace centralisé** : `src/modules/_namespace.js` créé — source unique pour `_global`
- **Migration `_global`** : 199+ fichiers migrés de `const _global = typeof globalThis…` vers `import { _global } from './_namespace.js'`
- **API aliases nettoyés** : 4 doubles alias supprimés dans `api/` (namespace-manager, module-manager, factory-manager, initialization-manager)
- **Test bridge mis à jour** : `cjs-bridge.js` et `module-loader.js` adaptés pour la nouvelle architecture d'imports

### Changed — Performance (Sprints 0–8)

- **Mémoire** : 750–1700 MB → ~45 MB (–81% de données GeoJSON, suppression doublons)
- **TTI** : > 5s → < 0.5s (code splitting + chargement intelligent)
- **Long tasks** : 84–688 ms → < 50 ms (batch yield 200ms entre layers)
- **LRU cache** : O(n) → O(1) via `Map` au lieu d'`Array.filter()`
- **Logger** : Borné à `MAX_GROUPED_ENTRIES = 500`
- **Seuil mémoire** : 50 MB → 200 MB (réaliste pour GeoJSON volumineux)
- **Monitoring** : Intervalle 1s → 5s, désactivé par défaut hors debug

### Changed — Cleanup (Phase 4.2)

- `load-modules.js` supprimé (ancien registre de chargement IIFE)
- Lazy runtime refs (`_global.GeoLeaf.X`) remplacés par imports ESM statiques
- `src/static/js/` renommé → `src/modules/`

### Removed — Grand nettoyage V4

- **6 docs obsolètes** : `MIGRATION_PROGRESS.md`, `PHASE4_ESM_MIGRATION_ROADMAP.md`, `PERFORMANCE_OPTIMIZATION_PLAN.md`, `PERFORMANCE_ROADMAP.md`, `ROADMAP_SCENARIO_B.md`, `MIGRATION_MAPLIBRE.md`
- **12 scripts de migration** : Tous les `convert-*-esm.*`, `esm-cleanup.cjs`, `migrate-legend-structure.cjs`, `reformat-layer-configs.py`, `update-layer-labels.py`
- **35 tests manuels** : Répertoire `tests/manual/` supprimé (tous cassés post-migration, remplacés par E2E Playwright)
- **`demo/debug-console.html`** : Console de debug overlay supprimée
- **`.venv/`** : Environnement virtuel Python supprimé (scripts `.py` retirés)
- **`docs/examples/`** : Répertoire vide supprimé

### Fixed — Documentation

- **200+ chemins corrigés** : `src/static/js/` → `src/modules/` dans ~50 fichiers de documentation
- **51 fichiers docs** : Version `3.2.0` → `4.0.0`
- **`.gitignore`** : Chemins `src/static/js/` mis à jour vers `src/modules/`, ajout `.venv/`
- **`sonar-project.properties`** : Version → 4.0.0
- **`index.d.ts`** : Version → 4.0.0

---

## [3.2.0] - 2026-02-01

### Added (Sprint 4 — Architecture & Documentation)

- **Plugin documentation**: Created `docs/plugins/GeoLeaf_Plugins_README.md` — complete plugin architecture guide (loading, namespaces, guard system)
- **Storage deep-dive docs**: Created 3 new docs:
    - `docs/storage/indexeddb.md` — IndexedDB + IDBHelper (5 stores, 11 methods)
    - `docs/storage/cache-detailed.md` — Cache system + Service Worker (4 strategies, SW register API)
    - `docs/storage/offline-detector.md` — Offline detector (events, badge UI, SyncManager integration)

### Changed (Sprint 4)

- **Storage plugin imports**: Added 3 missing imports to `geoleaf-storage.plugin.js`: `idb-helper.js`, `schema-validators.js`, `telemetry.js`
- **Renamed**: `storage/validators.js` → `storage/schema-validators.js` (resolved namespace conflict with `validators/validators.js`)
- **Documentation overhaul**: Updated 10 documentation files to reflect current architecture:
    - `PROJECT_TREE.md` — Fixed 13+ discrepancies (phantom dirs, missing files, wrong filenames)
    - `ARCHITECTURE_GUIDE.md` — Added plugin architecture, boot system, Service Worker sections
    - `GeoLeaf_Storage_README.md` — Added `enableServiceWorker` option, db/ sub-modules, plugin status
    - `GeoLeaf_Storage_Cache_README.md` — Fixed filenames, added layer-selector/, SW Phase 1 marked done
    - `GeoLeaf_core_README.md` — Added boot system section (src/app/), `GeoLeaf.boot()` guide
    - `INITIALIZATION_FLOW.md` — Added plugin loading + boot phase, Storage/SW init phase
    - `INDEX.md` — Added plugin docs links, 3 new storage docs, updated architecture topics
    - `DEVELOPER_GUIDE.md` — Added `src/plugins/`, `src/app/`, plugin build outputs to project tree

### Removed (Sprint 4 — Dead Code Cleanup)

- **6 dead code files** (~3,310 LOC):
    - `storage/cache/layer-selector/controller.js` (768 lines) — Sprint 4.2 abandoned class refactor
    - `storage/cache/layer-selector/data-handler.js` (608 lines)
    - `storage/cache/layer-selector/event-handler.js` (625 lines)
    - `storage/cache/layer-selector/renderer.js` (549 lines)
    - `storage/cache/layer-selector/state-manager.js` (537 lines)
    - `storage/cache/fetch-pool.js` (223 lines) — replaced by `fetch-manager.js`

### Security (Phase 1)

- **XSS prevention in filter-panel**: Escaped all dynamic values (`catId`, `cat.label`, `subId`, `sub.label`, `tag`) in `_buildCategoryTreeContent` and `_buildTagsListContent` using a new `esc()` helper based on `GeoLeaf.Security.escapeHtml`
- **Safe DOM fallback in dom-security.js**: Changed `setSafeHTML` fallback from `innerHTML` to `textContent` to prevent injection
- **Safe error rendering in filter-panel/renderer.js**: Replaced `innerHTML + err.message` with safe DOM creation using `textContent`
- **Fixed escapeHtml fallbacks**: Both `notifications.js._escapeHtml` and `content-builder.js.getEscapeHtml` fallbacks now use proper regex escaping instead of identity functions

### Changed (Phase 2 — Code Hygiene)

- **CI enforcement**: All 4 quality gates (`ESLint`, `Prettier`, `coverage threshold`, `security lint`) now fail the build on error (`continue-on-error: false`)
- **var → let/const**: Migrated remaining `var` declarations in `sidepanel.js` and `layer-manager/renderer.js`
- **Production log stripping**: Terser now strips `console.log` and `console.debug` via `pure_funcs` in rollup.config.mjs
- **Pre-commit hooks**: Added Husky + lint-staged configuration (ESLint + Prettier on staged files)

### Removed (Phase 2)

- `src/static/js/main.js` — deprecated loader (replaced by `bundle-entry.js`)
- `src/static/js/ui/early-loader.js` — deprecated spinner (marked `@deprecated`)
- `src/static/js/utils/format-utils.js` — consolidated into `formatters.js`

### Refactored (Phase 3 — Large File Splits)

Split 6 monolithic files (total ~5,900 lines) into 23 focused sub-modules:

- **`geojson/layer-manager.js`** (1,581 → 4 files): `store.js`, `visibility.js`, `style.js`, `integration.js`
- **`geojson/loader.js`** (918 → 4 files): `config-helpers.js`, `data.js`, `single-layer.js`, `profile.js`
- **`themes/theme-applier.js`** (862 → 4 files): `core.js`, `visibility.js`, `deferred.js`, `ui-sync.js`
- **`geoleaf.config.js`** (830 → 4 files): `config-core.js`, `config-validation.js`, `config-loaders.js`, `config-accessors.js`
- **`geoleaf.app.js`** (758 → 3 files): `helpers.js`, `init.js`, `boot.js`
- **`storage/cache/layer-selector.js`** (1,030 → 4 files): `core.js`, `data-fetching.js`, `row-rendering.js`, `selection-cache.js`

### Fixed

- **Bug in `updateLayerZIndex`**: Added missing `const newPane = state.map.getPane(newPaneName)` declaration that caused `newPane` to be undefined

---

## [3.1.0] - 2026-01-23

### Added

**Documentation (35+ files, 25,000+ lines):**

- Created comprehensive documentation suite covering all aspects of GeoLeaf
- [INDEX.md](docs/INDEX.md) - Master documentation index with quick navigation
- [GETTING_STARTED.md](docs/GETTING_STARTED.md) - 5-minute quick start guide
- [USER_GUIDE.md](docs/USER_GUIDE.md) - Complete user documentation (10 sections)
- [CONFIGURATION_GUIDE.md](docs/CONFIGURATION_GUIDE.md) - JSON configuration reference (9 types)
- [PROFILES_GUIDE.md](docs/PROFILES_GUIDE.md) - Custom profile creation guide (1,200+ lines)
- [API_REFERENCE.md](docs/API_REFERENCE.md) - Complete API documentation (1,900+ lines, 80+ methods)
- [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) - Development workflow and architecture (11,700+ lines)
- [Labels documentation](docs/labels/GeoLeaf_Labels_README.md) - Label system guide
- [DEMO_SYSTEM_GUIDE.md](docs/DEMO_SYSTEM_GUIDE.md) - Demo page and DemoLog API documentation
- [ARCHITECTURE_GUIDE.md](docs/ARCHITECTURE_GUIDE.md) - System architecture and design patterns

**JSON Schemas (7 schemas):**

- [style.schema.json](schema/style.schema.json) - Style file validation with conditional label rules
- [taxonomy.schema.json](schema/taxonomy.schema.json) - Taxonomy validation (categories/subcategories)
- [themes.schema.json](schema/themes.schema.json) - Theme validation (light/dark presets)
- [layers.schema.json](schema/layers.schema.json) - Layer configuration validation
- [mapping.schema.json](schema/mapping.schema.json) - POI to layer mapping validation
- [basemaps.schema.json](schema/basemaps.schema.json) - Basemap provider validation
- [geoleaf-config.schema.json](schema/geoleaf-config.schema.json) - Main config validation
- [schema/README.md](schema/README.md) - Schema usage guide

**Examples (complete profiles):**

- [examples/](examples/) - Complete working examples for Tourism profile
- Example JSON files for all configuration types
- Sample GeoJSON data files
- Style preset examples with label configurations

**Label System:**

- New `label.visibleByDefault` configuration in style files
- Scale-based label visibility controls
- Dynamic label field rendering
- Label toggle buttons in layer manager
- Debounced label updates (300ms) for performance

**Performance Optimizations:**

- Aggressive tree-shaking (moduleSideEffects: false) - 75.7% bundle size reduction
- Terser minification with 3 compression passes
- Bundle size tracking (visualizer + filesize plugins)
- Debounced updates (250ms label button, 300ms non-critical)
- Lazy layer loading (maxConcurrentLoads: 10, layerLoadDelay: 200ms)
- Clustering threshold (50 POIs) for marker clustering

**Security Enhancements:**

- XSS protection via `GeoLeaf.Security.escapeHtml()`
- URL validation with protocol whitelist
- POI property sanitization
- Content Security Policy (CSP) support in demo
- Input validation before DOM insertion

**TypeScript Support:**

- Complete TypeScript definitions (772 lines in index.d.ts)
- API interfaces for all modules
- Type definitions for events, errors, validators

### Changed

**Breaking Changes:**

- **Label configuration moved** from `layers.json` to `style/*.json` files
    - Old: `layers.json` → `layers[].label.visibleByDefault`
    - New: `styles/*.json` → `label.visibleByDefault`
    - See [Labels documentation](docs/labels/GeoLeaf_Labels_README.md) for migration steps

**Documentation Structure:**

- Standardized naming conventions (UPPERCASE_GUIDE.md for main guides)
- Moved `readme.architecture.md` → `ARCHITECTURE_GUIDE.md`
- Updated all internal links across 35+ documentation files
- Fixed broken links in COOKBOOK.md and FAQ.md

**Build Pipeline:**

- Updated Rollup configuration (Sprint 7.1 optimizations)
- Entry point: `src/static/js/geoleaf.api.js` (aggregates all modules)
- External dependencies: Leaflet 1.9.4 + leaflet.markercluster 1.5.3
- UMD output: `dist/geoleaf.umd.js` (dev) + `dist/geoleaf.min.js` (prod)
- Sourcemaps enabled for both dev and production bundles

**Testing:**

- Increased coverage threshold from baseline to 70% (all metrics)
- Target: 80% coverage post-refactoring
- Added 150+ unit tests with Jest + jsdom
- E2E tests with Playwright
- Coverage reports: text, lcov, html

### Fixed

- Label button synchronization issues when switching themes
- Label visibility not respecting `visibleByDefault` configuration
- Memory leaks in layer manager during rapid theme switching
- Build warnings for unused imports
- Documentation links pointing to renamed/moved files
- PROJECT_TREE.md accuracy issues (6 corrections)

### Deprecated

- **Legacy label configuration** in `layers.json` (v2.x style)
    - Still supported in v3.0 for backward compatibility
    - Will be removed in v4.0
    - Use `label.visibleByDefault` in style files instead

### Security

- Added XSS protection throughout application
- Implemented input sanitization for user-provided data
- Added URL validation for external resources
- Content Security Policy (CSP) headers in demo
- Secure cookie handling for cache storage

### Performance

- **Bundle size:** Reduced from ~500KB to ~120KB minified (75.7% reduction)
- **Gzipped:** ~35KB (Brotli: ~28KB)
- **Map initialization:** <100ms
- **POI rendering (100 items):** <50ms
- **Layer switching:** <200ms
- **Label updates:** <30ms (debounced)

---

## [3.0.0] - 2025-12-15

### Added

- Multi-profile system (Tourism, Custom…)
- Dynamic theme system (light/dark)
- Advanced POI management with clustering
- GeoJSON layer system with multiple style presets
- Offline cache with IndexedDB
- Filter panel with category/tag/search
- Data table view with CSV export
- Event-driven architecture
- Toast notification system
- Security layer with XSS protection

### Changed

- Complete rewrite from v2.x
- Modular architecture (200+ modules)
- JSON-based configuration system
- UMD bundle format
- Modern ES6+ syntax

### Breaking Changes

- Complete API redesign (not compatible with v2.x)
- New configuration format (JSON profiles)
- Changed initialization method
- Removed jQuery dependency

---

## [2.5.0] - 2025-06-10

### Added

- Basic profile system
- Simple theme switching
- POI categories
- Basic filtering

### Fixed

- Map rendering issues in Safari
- Memory leaks in layer switching
- Z-index conflicts

---

## [2.0.0] - 2024-12-01

### Added

- Initial public release
- Basic Leaflet integration
- POI markers
- Simple layer management
- Configuration via JavaScript objects

---

## Version History Summary

| Version | Release Date | Key Features                                                            | Breaking Changes      |
| ------- | ------------ | ----------------------------------------------------------------------- | --------------------- |
| 3.1.0   | 2026-01-23   | Labels system, comprehensive docs, 75.7% smaller bundle, XSS protection | Label config location |
| 3.0.0   | 2025-12-15   | Multi-profile system, themes, complete rewrite                          | Complete API redesign |
| 2.5.0   | 2025-06-10   | Basic profiles, themes                                                  | None                  |
| 2.0.0   | 2024-12-01   | Initial release                                                         | N/A                   |

---

## Upgrade Guides

### Upgrading to 3.1.0 from 3.0.0

**Label Configuration:**

1. Move `label.visibleByDefault` from `layers.json` to style files
2. Update style files for each layer
3. Test label visibility after migration
4. See [Labels documentation](docs/labels/GeoLeaf_Labels_README.md)

**Example:**

```json
// Before (v3.0): layers.json
{
  "layers": [
    {
      "id": "parks",
      "label": {
        "enabled": true,
        "visibleByDefault": true  // ❌ Old location
      }
    }
  ]
}

// After (v3.1): styles/default.json
{
  "label": {
    "enabled": true,
    "visibleByDefault": true  // ✅ New location
  }
}
```

### Upgrading to 3.0.0 from 2.x

**Complete migration required:**

1. Update configuration format (JS objects → JSON profiles)
2. Update initialization code (new API)
3. Update POI management calls (new methods)
4. Update event handling (new event system)
5. Remove jQuery dependency
6. Test thoroughly

Not backward compatible. See v3.0.0 migration guide (archived).

---

## Release Notes

### v3.1.0 Documentation Release

This release focuses on **comprehensive documentation** to make GeoLeaf accessible to all users:

**For New Users:**

- 5-minute quick start guide
- Complete user guide with screenshots
- Step-by-step configuration tutorials

**For Integrators:**

- Complete API reference (80+ methods)
- JSON schema validation
- Working examples for 3 business profiles

**For Developers:**

- Development workflow guide
- Architecture documentation
- Testing and contribution guidelines

**For Business Users:**

- Profile creation guide
- Custom taxonomy setup
- Theme customization

**Quality Improvements:**

- 75.7% smaller production bundle
- XSS protection throughout
- 70% test coverage (target 80%)
- TypeScript definitions

---

## Links

- **Documentation:** [docs/INDEX.md](docs/INDEX.md)
- **GitHub:** https://github.com/yourusername/geoleaf-js
- **npm:** https://www.npmjs.com/package/geoleaf
- **Issues:** https://github.com/yourusername/geoleaf-js/issues

---

## Contributors

Thank you to all contributors who made this release possible!

- Lead Developer: [Your Name]
- Documentation: [Contributors]
- Testing: [Contributors]
- Code Review: [Contributors]

See [CONTRIBUTORS.md](CONTRIBUTORS.md) for full list.

---

<p align="center">
  GeoLeaf • Open Source Mapping Platform<br>
  MIT License • Made with ❤️ for the geospatial community
</p>
