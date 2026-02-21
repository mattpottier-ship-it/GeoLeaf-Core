# GeoLeaf-JS - Arborescence Complète du Projet

**Version produit**: GeoLeaf Platform V1  
**Date**: 15 février 2026  
**Version**: 3.2.0 (Audit Phases 1-3 + Plugin Architecture)

> Convention de versioning : **Platform V1** est le label produit ; le SemVer technique de ce dépôt reste en **3.2.0**.

> **Note v3.2.0**: 6 fichiers monolithiques éclatés en 23 sous-modules (voir CHANGELOG.md).
> Fichiers supprimés: `main.js`, `early-loader.js`, `format-utils.js`.
> Nouveaux dossiers: `geojson/layer-manager/`, `geojson/loader/`, `themes/theme-applier/`,
> `config/geoleaf-config/`, `app/`, `storage/cache/layer-selector/`, `plugins/`.
>
> **Note v3.2.0 (fév 2026)**: Architecture plugin ajoutée (`src/plugins/`).
> Nettoyage code mort Sprint 4.2 : suppression de 6 fichiers abandonnés (~3 310 lignes)
> dans `storage/cache/` (5 fichiers class-based layer-selector + fetch-pool.js).
> Renommage `storage/validators.js` → `storage/schema-validators.js`.

---

## 📦 Vue d'ensemble

GeoLeaf-JS est une bibliothèque JavaScript de cartographie interactive avec support multi-profils, gestion POI avancée, système de cache offline, et architecture modulaire refactorisée.

### Statistiques du projet
- **~200 fichiers JavaScript** (modules, utilitaires)
- **~150 tests** (unitaires Jest + E2E Playwright + manuels)
- **~100 documentations** (guides, rapports, audits)
- **1 profil** (Tourism avec 35+ layers)
- **Architecture modulaire v3.0** (Content Builder, Filter Panel, POI Add Form, Storage Cache)

---

## 📂 Structure Racine

```
geoleaf-js/
├── 📄 Configuration (14 fichiers)
│   ├── .benchmark-baseline.json
│   ├── .editorconfig
│   ├── .eslintignore
│   ├── .eslintrc.json
│   ├── .gitignore
│   ├── .prettierignore
│   ├── .prettierrc.json
│   ├── index.d.ts
│   ├── jest.config.js
│   ├── jsconfig.json
│   ├── nyc.config.js
│   ├── package.json
│   ├── playwright.config.js
│   ├── postcss.config.mjs
│   └── rollup.config.mjs
│
├── 📄 Scripts (5 fichiers)
│   ├── cleanup-legacy-files.ps1
│   ├── ouvrir-demo.bat
│   ├── quick-layer-check.js
│   ├── start-dev-server.bat
│   └── start-geoleaf.ps1
│
├── 📄 Documentation Racine (~35 fichiers .md)
│   ├── PROJECT_TREE.md (ce fichier)
│   ├── README.md ✅ (créé v3.1.0 - jan 2026)
│   ├── INTEGRATION.md
│   ├── EXECUTIVE_SUMMARY.md
│   ├── INDEX_AUDIT_REFACTORISATION.md
│   ├── CONTENT_BUILDER_MODULES_ARCHITECTURE.md
│   ├── GUIDE_SELECTION_MULTIPLE.md
│   ├── QUICK_LOGS_GUIDE.md
│   ├── QUICK_START_TEST.md
│   ├── QUICK_TEST_GUIDE.md
│   ├── SECURITY_HEADERS_CORS_CSP_GUIDE.md
│   ├── CORRECTIFS_*.md (7 fichiers)
│   ├── PHASE_*.md (3 fichiers)
│   ├── SPRINT_*.md (11 fichiers)
│   └── ...
│
├── 📁 .github/workflows/
│   └── ci.yml
│
├── 📁 demo/ (5 fichiers)
├── 📁 docs/ (25+ sous-dossiers)
├── 📁 profiles/ (3 profils configurés)
├── 📁 schema/ ✅ (7 schemas JSON + README - créés jan 2026)
├── 📁 reports/ (12 catégories de rapports)
├── 📁 scripts/ (8 scripts automatisation)
├── 📁 src/ (code source principal)
├── 📁 tests/ (tests manuels + E2E)
└── 📁 __tests__/ (tests unitaires Jest)
```

---

## 🎭 demo/ - Démos interactives

```
demo/
├── index.html (279 lignes - page principale avec CSP)
├── demo-header.html (164 lignes - sélecteurs profil/thème)
└── demo.extensions.js (217 lignes - DemoLog + verbose mode)

Note: Nettoyé en jan 2026 - suppression demo.js, demo.log.js, index-minimal.html (legacy)
```

---

## 📚 docs/ - Documentation complète (25+ dossiers)

```
docs/
├── GETTING_STARTED.md ✅ (créé jan 2026 - tutoriel 5 min)
├── USER_GUIDE.md ✅ (créé jan 2026 - guide complet 10 sections)
├── CONFIGURATION_GUIDE.md ✅ (créé jan 2026 - 9 types JSON)
├── LABELS_MIGRATION_GUIDE.md ✅ (créé jan 2026 - breaking change v3.1)
├── BASEMAP_CACHE_PARAMETERS.md
├── POI_STYLE_PARAMETERS.md
├── readme.config-json.md
├── REFACTORING_V3_GUIDE.md
├── STYLE_SELECTOR.md
├── usage-cdn.md
│
├── api/
│   ├── GeoLeaf_API_README.md
│   └── multi-maps-guide.md
│
├── ARCHITECTURE_GUIDE.md ✅ (307 lignes)
├── architecture/
│   └── INITIALIZATION_FLOW.md
│
├── baselayers/, config/, core/, errors/, filters/
├── geojson/, helpers/, legend/, log/, poi/, route/
├── schema/geoleaf.profile.schema.json
├── security/, storage/, table/, testing/
│
├── ui/
│   ├── cache-button.md
│   ├── GeoLeaf_UI_*.md (4 fichiers)
│   └── content-builder/
│       └── README.md ⭐ (Content Builder v1.0)
│
└── validators/
```

---

## 🗂️ profiles/ - Configurations multi-profils

```
profiles/
├── geoleaf.config.json
│
└── tourism/ (35+ layers climatiques et touristiques)
    ├── layers.json
    ├── mapping.json
    ├── profile.json
    ├── taxonomy.json
    ├── themes.json
    └── layers/ (35+ dossiers)
        ├── aires_protégées_nationales/
        ├── département/
        ├── pluviométrie_*, température_* (24 layers climatiques)
        ├── tourism_itineraries/ (config + data + styles)
        ├── tourism_poi_all/ (config + data + styles)
        └── ...
```

---



## 📊 reports/ - Rapports et audits (12 catégories)

```
reports/
├── audit/ (6 rapports: AUDIT_COMPLET, STORAGE, STYLES, SECURITY, etc.)
├── basemap-cache/ (5 guides implémentation cache)
├── changelogs/ (3 changelogs)
├── esm-analysis/ (6 analyses modules ESM)
├── features/ (10 rapports fonctionnalités: ADDFORM, POI, etc.)
├── fixes/ (14 rapports corrections: CORS, STORAGE, POI, etc.)
├── implementation/ (3 guides: STORAGE, TOURISM)
├── legacy/ (6 guides nettoyage legacy)
├── optimization/ (4 plans optimisation)
├── phases/ (13 rapports phases refactoring)
├── sprints/ (3 rapports sprints)
└── v3-migration/ (11 documents migration v3.0)
```

---

## 🛠️ scripts/ - Automatisation

```
scripts/
├── audit-innerhtml.cjs
├── benchmark.cjs
├── build-deploy.cjs
├── migrate-legend-structure.cjs
├── reformat-layer-configs.py
├── smoke-test.cjs
├── sync-to-public.ps1
└── update-layer-labels.py
```

---

## 💻 src/ - Code source principal

### Structure globale

```
src/
├── app/ ⭐ (v3.2.0 - split de geoleaf.app.js)
│   ├── helpers.js (AppLog, getProfilesBasePath, checkPlugins, showNotification)
│   ├── init.js (initApp — orchestrateur d'initialisation, 648 lignes)
│   └── boot.js (startApp, GeoLeaf.boot() — API publique)
├── bundle-entry.js ⭐ (point d'entrée Rollup — bundle core)
├── load-modules.js
├── plugins/ ⭐ (v3.2.0 - architecture plugin)
│   ├── geoleaf-storage.plugin.js (~45 imports — Storage, Cache, SW, UI)
│   └── geoleaf-addpoi.plugin.js (~14 imports — POI Add Form, Sync, Upload)
└── static/
    ├── css/ (24 fichiers + components/)
    ├── icons/ (logos + profiles/sprites SVG)
    └── js/ (modules JavaScript)
```

### CSS (24 fichiers)

```
static/css/
├── cache-modal.css
├── geoleaf-baselayers.css
├── geoleaf-branding.css
├── geoleaf-cache.css
├── geoleaf-controls.css
├── geoleaf-coordinates.css
├── geoleaf-core.css
├── geoleaf-geojson.css
├── geoleaf-layer-manager.css
├── geoleaf-legend.css
├── geoleaf-main.css ⭐
├── geoleaf-poi.css
├── geoleaf-route.css
├── geoleaf-scale.css
├── geoleaf-table.css
├── geoleaf-theme-alt.css
├── geoleaf-theme-green.css
├── geoleaf-theme.css
├── geoleaf-ui.css
├── notifications.css
├── poi-form.css
├── poi-realtime-validation.css
└── components/
    ├── _labels.css
    └── _theme-selector.css
```

### Icons

```
static/icons/
├── fav.png
├── logo.png
└── profiles/
    └── tourism/sprite_tourism.svg
```

### JavaScript - Architecture modulaire

```
static/js/
│
├── 📄 POINTS D'ENTRÉE
│   └── index.js
│
├── 📄 MODULES MONOLITHIQUES (21 modules)
│   ├── geoleaf.api.js
│   ├── geoleaf.baselayers.js
│   ├── geoleaf.constants.js
│   ├── geoleaf.core.js
│   ├── geoleaf.errors.js
│   ├── geoleaf.filters.js
│   ├── geoleaf.geojson.js
│   ├── geoleaf.helpers.js
│   ├── geoleaf.layer-manager.js
│   ├── geoleaf.legend.js
│   ├── geoleaf.log.config.js
│   ├── geoleaf.log.js
│   ├── geoleaf.logger-shim.js
│   ├── geoleaf.poi.js
│   ├── geoleaf.route.js
│   ├── geoleaf.security.js
│   ├── geoleaf.storage.js
│   ├── geoleaf.table.js
│   ├── geoleaf.ui.js
│   ├── geoleaf.utils.js
│   └── geoleaf.validators.js
│
├── 📁 api/ (5 modules)
│   ├── controller.js
│   ├── factory-manager.js
│   ├── initialization-manager.js
│   ├── module-manager.js
│   └── namespace-manager.js
│
├── 📁 config/ (6 modules + 4 sous-modules)
│   ├── data-converter.js
│   ├── loader.js
│   ├── normalization.js
│   ├── profile.js
│   ├── storage.js
│   ├── taxonomy.js
│   └── geoleaf-config/ ⭐ (v3.2.0 - split de geoleaf.config.js)
│       ├── config-core.js
│       ├── config-validation.js
│       ├── config-loaders.js
│       └── config-accessors.js
│
├── 📁 data/
│   └── normalizer.js
│
├── 📁 geojson/ (7 modules + 8 sous-modules)
│   ├── clustering.js
│   ├── core.js
│   ├── popup-tooltip.js
│   ├── shared.js
│   ├── style-resolver.js
│   ├── visibility-manager.js
│   ├── layer-manager/ ⭐ (v3.2.0 - split de layer-manager.js)
│   │   ├── store.js
│   │   ├── visibility.js
│   │   ├── style.js
│   │   └── integration.js
│   └── loader/ ⭐ (v3.2.0 - split de loader.js)
│       ├── config-helpers.js
│       ├── data.js
│       ├── single-layer.js
│       └── profile.js
│
├── 📁 helpers/
│   └── style-resolver.js
│
├── 📁 labels/ (4 modules + doc)
│   ├── LABEL_BUTTON_MANAGER.md ✅ (créé jan 2026 - doc complète)
│   ├── labels.js (707 lignes - orchestrateur principal)
│   ├── label-renderer.js (rendu Leaflet tooltips)
│   ├── label-button-manager.js ✅ (267 lignes - gestion boutons avec debounce 250ms)
│   └── label-style-loader.js (validation + fallback)
│
├── 📁 layer-manager/ (6 modules)
│   ├── basemap-selector.js
│   ├── cache-section.js
│   ├── control.js
│   ├── renderer.js
│   ├── shared.js
│   └── style-selector.js
│
├── 📁 legend/ (4 modules)
│   ├── geoleaf.legend.js
│   ├── legend-control.js
│   ├── legend-generator.js
│   └── legend-renderer.js
│
├── 📁 map/
│   └── scale-control.js
│
├── 📁 poi/ (13+ modules) ⭐
│   ├── core.js
│   ├── image-upload.js
│   ├── markers.js
│   ├── normalizers.js
│   ├── placement-mode.js
│   ├── popup.js
│   ├── renderers.js
│   ├── shared.js
│   ├── sidepanel.js
│   ├── sync-handler.js
│   ├── add-form-orchestrator.js
│   │
│   ├── add-form/ (10 modules - Architecture MVC)
│   │   ├── controller.js
│   │   ├── data-mapper.js
│   │   ├── fields-manager.js
│   │   ├── lazy-loader.js
│   │   ├── realtime-validator.js
│   │   ├── renderer.js
│   │   ├── state-manager.js
│   │   ├── submit-handler.js
│   │   ├── validator.js
│   │   └── renderers/
│   │       ├── fields-renderer.js
│   │       ├── images-renderer.js
│   │       ├── modal-renderer.js
│   │       └── sections-renderer.js
│   │
│   └── renderers/ (9 modules)
│       ├── accordion-utils.js
│       ├── complex-renderers.js
│       ├── core.js
│       ├── field-renderers.js
│       ├── fields.js
│       ├── links.js
│       ├── media-renderers.js
│       └── media.js
│
├── 📁 route/ (4 modules)
│   ├── layer-manager.js
│   ├── loaders.js
│   ├── popup-builder.js
│   └── style-resolver.js
│
├── 📁 storage/ (14 modules + cache/ + db/) ⭐
│   ├── cache-control.js
│   ├── cache-manager.js
│   ├── cache-strategy.js ⏳ (future-ready — non bundlé, LRU/LFU/TTL/FIFO)
│   ├── compression.js ⏳ (future-ready — non bundlé, CompressionStream API)
│   ├── idb-helper.js (wrapper promise IndexedDB)
│   ├── indexeddb.js (5 object stores, 507 lignes)
│   ├── offline-detector.js
│   ├── schema-validators.js (renommé de validators.js — schemas IDB)
│   ├── storage-helper.js
│   ├── sw.js (Service Worker — 4 stratégies de cache, 456 lignes)
│   ├── sw-register.js (register/update/unregister SW)
│   ├── sync-manager.js
│   ├── telemetry.js (métriques performance cache)
│   │
│   ├── cache/ (11 modules + layer-selector/)
│   │   ├── calculator.js
│   │   ├── download-handler.js
│   │   ├── downloader.js
│   │   ├── fetch-manager.js
│   │   ├── metrics.js
│   │   ├── progress-tracker.js
│   │   ├── resource-enumerator.js
│   │   ├── retry-handler.js
│   │   ├── storage.js
│   │   ├── validator.js
│   │   └── layer-selector/ (4 modules — Object.assign pattern)
│   │       ├── core.js (init, populate, cleanup)
│   │       ├── data-fetching.js (getLayerGeometryType, estimateSize)
│   │       ├── row-rendering.js (createLayerRow, createBasemapRow)
│   │       └── selection-cache.js (loadSelection, saveSelection)
│   │
│   └── db/ (5 modules IndexedDB spécialisés)
│       ├── backups.js
│       ├── images.js
│       ├── layers.js
│       ├── preferences.js
│       └── sync.js
│
├── 📁 table/ (2 modules)
│   ├── panel.js
│   └── renderer.js
│
├── 📁 themes/ (2 modules + 4 sous-modules)
│   ├── theme-loader.js
│   ├── theme-selector.js
│   └── theme-applier/ ⭐ (v3.2.0 - split de theme-applier.js)
│       ├── core.js
│       ├── visibility.js
│       ├── deferred.js
│       └── ui-sync.js
│
├── 📁 ui/ (18+ modules) ⭐
│   ├── branding.js
│   ├── cache-button.js
│   ├── components.js
│   ├── content-builder.js
│   ├── controls.js
│   ├── coordinates-display.js
│   ├── dom-utils.js
│   ├── event-delegation.js
│   ├── filter-control-builder.js
│   ├── filter-panel.js
│   ├── filter-state-manager.js
│   ├── notifications.js
│   ├── panel-builder.js
│   ├── scale-control.js
│   ├── theme.js
│   │
│   ├── cache-button/ (3 modules)
│   │   ├── button-control.js
│   │   ├── export-logic.js
│   │   └── modal-manager.js
│   │
│   ├── content-builder/ (7 modules) ⭐ v1.0
│   │   ├── assemblers.js (buildPopupHTML, buildTooltipHTML, buildPanelItems)
│   │   ├── core.js (helpers, validators, badge resolver, formatters)
│   │   ├── panel-renderer.js
│   │   ├── popup-renderer.js
│   │   ├── renderers-shared.js
│   │   ├── templates.js (14 template builders + CSS_CLASSES)
│   │   ├── tooltip-renderer.js
│   │   └── renderers/ (vide - architecture modulaire)
│   │
│   └── filter-panel/ (6 modules)
│       ├── applier.js
│       ├── core.js
│       ├── proximity.js
│       ├── renderer.js
│       ├── shared.js
│       └── state-reader.js
│
└── 📁 utils/ (13 modules)
    ├── dom-helpers.js
    ├── dom-security.js
    ├── error-logger.js
    ├── event-helpers.js
    ├── event-listener-manager.js
    ├── fetch-helper.js
    ├── formatters.js
    ├── lazy-loader.js
    ├── map-helpers.js
    ├── object-utils.js
    ├── performance-profiler.js
    └── timer-manager.js
```

---

## 🧪 tests/ - Tests manuels + E2E

```
tests/
├── e2e/ (4 specs Playwright)
│   ├── 00-debug-console.spec.js
│   ├── 01-basic-loading.spec.js
│   ├── 02-poi-workflows.spec.js
│   ├── 03-api-debug.spec.js
│   └── README.md
│
└── manual/ (30+ fichiers HTML)
    ├── diagnostic-*.html (3 fichiers)
    ├── test-*.html (27+ fichiers)
    └── README.md
```

---

## 🧪 __tests__/ - Tests unitaires Jest (150+ fichiers)

```
__tests__/
├── environment.test.js
├── main.test.js
├── setup.js
│
├── api/ (3 tests)
├── baselayers/ (1 test)
├── config/ (12 tests - ESM + standalone)
├── constants/ (1 test)
├── core/ (14 tests - log, errors, utils, timers, etc.)
├── filters/ (2 tests)
├── geojson/ (4 tests)
├── helpers/ (4 tests + test-helpers)
├── integration/ (6 tests d'intégration)
├── layers/ (1 test)
├── legend/ (5 tests - ESM + extended)
├── markers/ (1 test)
│
├── poi/ (7 tests + add-form/)
│   ├── normalizer, renderers, markers
│   └── add-form/ (5 tests: orchestrator, fields-manager, validator, etc.)
│
├── route/ (8 tests complets)
├── security/ (3 tests + extended)
├── storage/ (2 tests + cache/)
│   └── cache/ (calculator, metrics)
│
├── table/ (4 tests)
├── themes/ (3 tests - ESM + manager)
│
├── ui/ (14 tests + filter-panel/)
│   ├── content-builder, controls, cache-button, notifications, etc.
│   └── filter-panel/ (6 tests: applier, core, proximity, renderer, shared, state-reader)
│
├── utils/ (4 tests)
└── validators/ (2 tests)
```

---

## 🏗️ Architecture Modulaire v3.0

### Modules Refactorisés (2026)

#### 1. Content Builder v1.0 (Sprint 4.5) ⭐
- **core.js**: Helpers, validators, badge resolver, formatters (13 fonctions)
- **templates.js**: 14 template builders + CSS_CLASSES library
- **assemblers.js**: buildPopupHTML, buildTooltipHTML, buildPanelItems (3 assembleurs)
- **Documentation**: JSDoc complet IntelliSense-ready (1,050+ lignes doc inline)

#### 2. Filter Panel (Sprint 2.x)
- 6 modules: applier, core, proximity, renderer, shared, state-reader
- Support filtres GPS/proximité
- Gestion état centralisé

#### 3. POI Add Form (Phase 2)
- Architecture MVC avec state-manager
- Validation temps réel
- Lazy loading des ressources
- 10 modules + 4 renderers spécialisés

#### 4. Storage Cache System (Phase 1) + Plugin Architecture (v3.2.0)
- Architecture plugin : chargement optionnel (`geoleaf-storage.plugin.js`)
- Service Worker avec 4 stratégies de cache (Cache-First, Network-First, Tile, BG Sync)
- IndexedDB structuré (5 stores) + IDBHelper (wrapper promise)
- ~30 modules bundlés dans le plugin Storage
- Layer selector avec Object.assign pattern (4 modules)
- 2 modules future-ready non bundlés : `compression.js`, `cache-strategy.js`

### Modules en cours de modularisation

- `geoleaf.api.js` → `api/` (5 modules)
- `geoleaf.config.js` → `config/` (6 modules)
- `geoleaf.geojson.js` → `geojson/` (9 modules)
- `geoleaf.route.js` → `route/` (4 modules)
- `geoleaf.legend.js` → `legend/` (4 modules)

---

## 📋 Conventions et Notes

### Répertoires exclus
- `node_modules/` (~50k fichiers)
- `dist/` (build production)
- `coverage/` (rapports Jest)
- `.git/` (historique)

### Conventions de nommage
- **Modules principaux**: `geoleaf.<module>.js`
- **Modules modularisés**: `<module>/<submodule>.js`
- **Tests unitaires**: `<module>.test.js`
- **Tests E2E**: `<spec-name>.spec.js`
- **Documentation**: `<MODULE>_README.md` ou `readme.<module>.md`
- **Rapports**: `<SUJET>_REPORT.md`

### Points d'entrée
- **Build CDN (core)**: `src/bundle-entry.js` → `dist/geoleaf.umd.js` (Rollup)
- **Build Plugin Storage**: `src/plugins/geoleaf-storage.plugin.js` → `dist/geoleaf-storage.plugin.js`
- **Build Plugin AddPOI**: `src/plugins/geoleaf-addpoi.plugin.js` → `dist/geoleaf-addpoi.plugin.js`
- **Index build**: `src/static/js/index.js`
- **Démo**: `demo/index.html`
- **Tests E2E**: `tests/e2e/`
- **Tests unitaires**: `__tests__/`

### Progression Refactoring v3.0
- ✅ **Phase 0**: Préparation
- ✅ **Phase 1**: Standalone NPM + Déduplication
- ✅ **Phase 2**: POI Add Form (State Manager, Lazy Loading, Realtime Validation)
- ✅ **Phase 3**: Performance Optimization
- ✅ **Phase 4**: Storage Cache + Content Builder v1.0
- ⏭️ **Phase 5**: Tests (skipped)
- 🔄 **Phase 6**: Documentation (50% - Sprint 6.1 complete)

### Modules Prioritaires Documentés
1. ⭐ **Content Builder v1.0**: docs/ui/content-builder/README.md (1,028 lignes)
2. ⭐ **Architecture v3.0**: docs/ARCHITECTURE_GUIDE.md ✅ (307 lignes - déplacé)
3. ⭐ **Developer Guide**: docs/DEVELOPER_GUIDE.md (à créer - 380 lignes prévues)

---

## 📊 Statistiques Détaillées

### Code Source (src/static/js/)
- **~200 modules JavaScript**
- **~30k lignes de code** (hors tests)
- **21 modules monolithiques** (en cours de modularisation)
- **~120 modules modularisés** (v3.2.0 incluant 23 sous-modules Phase 3)

### Tests
- **150+ tests unitaires** Jest
- **4 suites E2E** Playwright
- **30+ tests manuels** HTML
- **Couverture**: ~70% (en amélioration)

### Documentation
- **100+ fichiers Markdown**
- **25+ dossiers docs/**
- **12 catégories reports/**
- **~50k lignes documentation**

### Profils et Données
- **1 profil**: Tourism
- **35+ layers Tourism** (climatiques + POI)
- **~15k lignes JSON** (configs + données)

---

**Dernière mise à jour**: 15 février 2026  
**Version**: 3.2.0 (Audit Phases 1-3 + Plugin Architecture)  
**Responsable**: Assistant AI + Équipe GeoLeaf
