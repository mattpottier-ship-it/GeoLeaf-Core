# 🚀 GeoLeaf JS — Phase 4 : Migration ESM Complète → V4.0.0

> **Version** : 2.2  
> **Date** : 15 février 2026  
> **Prérequis** : Phases 1-3 terminées (sécurité, hygiène, refactorisation)  
> **Objectif** : Transformer 100% du codebase IIFE → ES Modules natifs, publier V4.0.0  
> **État post-Phase 3** : 6 fichiers monolithiques splittés en sous-répertoires (layer-manager/, loader/, theme-applier/, geoleaf-config/, layer-selector/, app/)  
> **Statut** : ✅ Prêt pour exécution — aucune migration de code commencée, seule la documentation est finalisée

---

## 📋 Table des matières

0. [🛫 Pré-vol Day 1 — Checklist de démarrage](#0-pré-vol-day-1--checklist-de-démarrage)
1. [Résumé exécutif](#1-résumé-exécutif)
2. [État pré-migration (post Phase 3)](#2-état-pré-migration-post-phase-3)
3. [Architecture cible V4](#3-architecture-cible-v4)
4. [Étapes de migration détaillées](#4-étapes-de-migration-détaillées)
5. [Transformation IIFE → ESM : Guide mécanique](#5-transformation-iife--esm--guide-mécanique)
6. [Ordre de migration des fichiers](#6-ordre-de-migration-des-fichiers)
7. [Configuration tooling V4](#7-configuration-tooling-v4)
8. [Migration des tests](#8-migration-des-tests)
9. [Migration des plugins](#9-migration-des-plugins)
10. [Migration des types TypeScript](#10-migration-des-types-typescript)
11. [Migration ESLint 8 → 9 (Phase 4b — après ESM)](#11-migration-eslint-8--9-à-faire-après-la-migration-esm)
12. [Documentation V4](#12-documentation-v4)
13. [Checklist de validation](#13-checklist-de-validation)
14. [Risques et mitigations](#14-risques-et-mitigations)
15. [Annexes](#15-annexes)

---

## 0. 🛫 Pré-vol Day 1 — Checklist de démarrage

> **Ce bloc est à exécuter en premier, AVANT toute migration de code.**
> Il garantit que l'environnement est prêt pour l'Étape 4.1.

### 0.1 État actuel vérifié (14 février 2026)

| Élément | État | Action requise |
|---------|------|----------------|
| `rollup.config.mjs` | ✅ Déjà `.mjs`, syntaxe ESM | Aucune |
| `postcss.config.mjs` | ✅ Déjà `.mjs`, syntaxe ESM | Aucune |
| Phase 3 splits | ✅ 6 sous-répertoires créés (`geoleaf-config/`, `layer-manager/`, `loader/`, `theme-applier/`, `layer-selector/`, `app/`) | Aucune |
| `src/static/js/` | ✅ 205 fichiers JS vérifiés | Renommer → `src/modules/` en 4.1.4 |
| `package.json` `"type"` | ❌ Absent (implicitement CJS) | Ajouter `"type": "module"` en 4.1.1 |
| `package.json` `"module"` | ❌ Absent | Ajouter en 4.1.1 |
| `package.json` `"exports"` | ❌ Absent | Ajouter en 4.1.1 |
| `package.json` `"sideEffects"` | ❌ Absent | Ajouter en 4.1.1 |
| Barrels `index.js` | ❌ Aucun (sauf `index.js` deprecated) | Créer en 4.4 |
| Sortie ESM Rollup | ❌ UMD uniquement | Ajouter en 4.1.2 |
| Jest ESM (`--experimental-vm-modules`) | ❌ Non configuré | Configurer en 4.1 |
| `__mocks__/leaflet.js` | ❌ N'existe pas | Créer en 4.1 |
| `.nvmrc` | ❌ Absent | Créer (Node ≥ 18.x) en 4.1 |
| `jsconfig.json` `moduleResolution` | ❌ Manquant | Ajouter `"bundler"` en 4.1.3 |
| `.eslintrc.json` `sourceType` | ⚠️ `"script"` (bloquant ESM) | Sera corrigé post-migration ESM (§11) |
| `geoleaf.logger-shim.js` | ⚠️ Encore présent | Supprimer en 4.1.5 si inutilisé |
| `src/static/js/index.js` | ⚠️ Deprecated module registry (160 lignes) | Supprimer en 4.1.5 |
| `src/load-modules.js` | ⚠️ Deprecated `<script>` loader (209 lignes) | Conserver comme référence, supprimer en dernière étape |
| 10 fichiers `.esm.test.js` | ⚠️ Prototypes, importent depuis `src/core/` et `src/config/` (chemins inexistants) | Corriger les chemins → `src/modules/` en 4.1 |

### 0.2 Décisions architecturales actées

| # | Décision | Choix | Justification |
|---|----------|-------|---------------|
| D1 | Nom du répertoire cible | **`src/modules/`** (pas `src/core/`) | Cohérent avec le roadmap. Les 10 tests ESM prototypes qui importent depuis `src/core/` seront corrigés vers `src/modules/` |
| D2 | Fichiers obsolètes (`load-modules.js`, `index.js`) | **Conserver jusqu'à la fin** comme référence de l'ordre de chargement | Utiles pour vérifier qu'aucun module n'est oublié pendant la migration |
| D3 | Migration ESLint 8 → 9 | **Après** la migration ESM | Éviter de mélanger deux gros changements. Faire en Phase 4b post-merge |
| D4 | `geoleaf.logger-shim.js` | **Supprimer en 4.1.5** | Vérifier s'il est importé dans `bundle-entry.js` — s'il ne l'est pas, il est mort |
| D5 | Stratégie de rollback | Branche `feature/esm-migration`, commit par tier, build UMD validé à chaque étape | Possibilité d'arrêter à tout moment et publier V3.x |

### 0.3 Ordre des tâches Day 1 (Étape 4.1)

```
1. Créer branche `feature/esm-migration` depuis `develop`
2. Créer `.nvmrc` avec `18` (minimum pour --experimental-vm-modules)
3. Renommer `src/static/js/` → `src/modules/` et `src/static/css/` → `src/css/`
4. Supprimer `src/static/` (vide après déplacement)
5. Supprimer `src/modules/index.js` (deprecated module registry)
6. Supprimer `src/modules/geoleaf.logger-shim.js` (si non utilisé dans bundle-entry.js)
7. Mettre à jour `package.json` : ajouter "type": "module", "module", "exports", "sideEffects"
8. Mettre à jour `rollup.config.mjs` : ESM + UMD dual output, input → src/index.js
9. Mettre à jour `jsconfig.json` : ajouter moduleResolution, baseUrl, paths, include
10. Créer `__mocks__/leaflet.js` et `__mocks__/leaflet.markercluster.js`
11. Mettre à jour `jest.config.js` → ESM format, --experimental-vm-modules, moduleNameMapper
12. Mettre à jour `bundle-entry.js` : corriger les chemins static/js/ → modules/
13. Corriger les 10 fichiers .esm.test.js : chemins src/core/ → src/modules/
14. npm run build → valider que le build UMD fonctionne encore
15. npm run test:jest → valider que les tests existants passent
16. Commit : "chore(esm): prepare infrastructure for Phase 4 migration"
```

### 0.4 Fichiers réels vérifiés — Inventaire complet (14 février 2026)

| Répertoire | Nb fichiers | Détail notable |
|------------|-------------|----------------|
| `static/js/` racine | 22 | Façades + index deprecated + logger-shim |
| `api/` | 5 | — |
| `config/` | 7 + 4 (geoleaf-config/) | = 11 total |
| `data/` | 1 | — |
| `geojson/` | 8 + 4 (layer-manager/) + 4 (loader/) | = 16 total |
| `helpers/` | 1 | — |
| `labels/` | 3 | — |
| `layer-manager/` | 6 | — |
| `legend/` | 4 | Inclut `geoleaf.legend.js` (façade) |
| `loaders/` | 1 | — |
| `map/` | 1 | `scale-control.js` |
| `poi/` | 11 + 9 (add-form/) + 4 (add-form/renderers/) + 10 (renderers/) | = 34 total |
| `renderers/` | 2 | `abstract-renderer.js`, `simple-text-renderer.js` |
| `route/` | 4 | — |
| `schema/` | 0 JS | 1 JSON (schema.json) — pas de migration |
| `security/` | 1 | `csrf-token.js` |
| `storage/` | 11 + 11 (cache/) + 9 (cache/layer-selector/) + 5 (db/) | = **36 total** |
| `table/` | 2 | — |
| `themes/` | 3 + 4 (theme-applier/) | = 7 total |
| `ui/` | 16 + 3 (cache-button/) + 5 (content-builder/) + 7 (filter-panel/) | = **31 total** |
| `utils/` | 15 | — |
| `validators/` | 2 | — |
| **TOTAL `static/js/`** | **205** | — |
| `src/app/` | 3 | `boot.js`, `helpers.js`, `init.js` |
| `src/plugins/` | 2 | `geoleaf-storage.plugin.js`, `geoleaf-addpoi.plugin.js` |
| **TOTAL à migrer** | **210** | — |

---

## 1. Résumé exécutif

| Métrique | Valeur |
|----------|--------|
| **Fichiers source à migrer** | 205 fichiers JS (vérifié) + 3 app/ + 2 plugins = **210 total** |
| **Fichiers de tests à adapter** | ~128 fichiers (+ 10 prototypes `.esm.test.js` existants) |
| **Pattern actuel** | IIFE → `window.GeoLeaf.*` |
| **Pattern cible** | ES Modules (`import`/`export`) |
| **Formats de sortie** | ESM (bundlers) + UMD (CDN rétrocompat) |
| **Breaking change** | Oui → V4.0.0 (semver) |
| **Effort estimé** | 15-20 jours |

### Bénéfices V4

- ✅ **Tree-shaking** : Les bundlers peuvent éliminer le code non utilisé
- ✅ **Import sélectif** : `import { Core, GeoJSON } from 'geoleaf'`
- ✅ **Typage natif** : Types co-localisés avec les modules
- ✅ **Pas de pollution globale** : Plus de `window.GeoLeaf` en mode ESM
- ✅ **Analyse statique** : Dépendances explicites, détection imports inutilisés
- ✅ **Lazy loading** : Possibilité de `import()` dynamique pour les gros modules

---

## 2. État pré-migration (post Phase 3)

### 2.1 Pattern IIFE actuel (tous les fichiers source)

Tous les ~207 fichiers sous `src/static/js/` suivent ce pattern :

```javascript
// Pattern A — Le plus courant (~130 fichiers)
(function (global) {
    "use strict";
    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    
    // ... code du module ...
    
    GeoLeaf.NomModule = { /* exports */ };
})(typeof window !== 'undefined' ? window : global);
```

```javascript
// Pattern B — Modules internes (~20 fichiers)
(function () {
    "use strict";
    const GeoLeaf = window.GeoLeaf;
    
    // ... code du module ...
    
    GeoLeaf._NomInterne = { /* exports internes */ };
})(window);
```

```javascript
// Pattern C — UMD (1 seul fichier : geoleaf.api.js)
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.GeoLeaf = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () { ... });
```

### 2.2 Conventions de nommage namespace

| Préfixe | Signification | Exemple | Visibilité cible ESM |
|---------|---------------|---------|---------------------|
| `GeoLeaf.Xxx` | API publique | `GeoLeaf.Core`, `GeoLeaf.API` | `export` |
| `GeoLeaf._Xxx` | Module interne | `GeoLeaf._POIShared`, `GeoLeaf._GeoJSONCore` | Non exporté (internal) |
| `GeoLeaf.Utils.Xxx` | Sous-namespace utilitaire | `GeoLeaf.Utils.DomHelpers` | `export` sélectif |

### 2.3 Dépendances externes

| Dépendance | Usage actuel | Usage cible ESM |
|------------|-------------|-----------------|
| Leaflet (`L`) | Global `window.L` | `import L from 'leaflet'` (peerDependency) |
| MarkerCluster | Global `L.markerClusterGroup` | `import 'leaflet.markercluster'` (peerDependency) |

### 2.4 Fichiers d'entrée actuels

| Fichier | Rôle | Devenir en V4 |
|---------|------|---------------|
| `src/bundle-entry.js` | Importe 90+ IIFEs en ordre | **Remplacé** par barrel `src/index.js` |
| `src/app/` (3 fichiers) | Bootstrap `GeoLeaf.boot()` (split v3.2.0) | **Migré** en ESM |
| `src/load-modules.js` | Loader `<script>` (deprecated) | **Conservé comme référence** pendant la migration, **supprimé en dernière étape** |
| ~~`src/static/js/main.js`~~ | ~~Module registry~~ | **Déjà supprimé** (v3.2.0) |
| `src/static/js/index.js` | Module registry (deprecated, 160 lignes) | **Supprimé en 4.1.5** |
| `src/static/js/geoleaf.logger-shim.js` | Logger shim (non importé dans bundle-entry) | **Supprimé en 4.1.5** |

### 2.5 Arborescence source actuelle (post Phase 3)

```
src/
├── bundle-entry.js           ← À REMPLACER
├── app/                      ← À MIGRER (split v3.2.0: helpers.js, init.js, boot.js)
├── load-modules.js           ← CONSERVER comme référence, SUPPRIMER en fin de migration
├── plugins/
│   ├── geoleaf-storage.plugin.js    ← À MIGRER
│   └── geoleaf-addpoi.plugin.js     ← À MIGRER
└── static/
    ├── css/                  ← DÉPLACER vers src/css/
    └── js/                   ← RENOMMER en src/modules/ (205 fichiers JS vérifiés)
        ├── api/              (5 fichiers)
        ├── config/           (7 fichiers + 1 sous-rép.)
        │   └── geoleaf-config/ (4 fichiers — split Phase 3)
        ├── data/             (1 fichier)
        ├── geojson/          (8 fichiers + 2 sous-rép.)
        │   ├── layer-manager/ (4 fichiers — split Phase 3)
        │   └── loader/        (4 fichiers — split Phase 3)
        ├── helpers/          (1 fichier)
        ├── labels/           (3 fichiers)
        ├── layer-manager/    (6 fichiers)
        ├── legend/           (4 fichiers, incl. geoleaf.legend.js façade)
        ├── loaders/          (1 fichier)
        ├── map/              (1 fichier : scale-control.js)
        ├── poi/              (11 fichiers + 3 sous-rép. = 34 total)
        │   ├── add-form/     (9 fichiers)
        │   │   └── renderers/ (4 fichiers)
        │   └── renderers/    (10 fichiers)
        ├── renderers/        (2 fichiers)
        ├── route/            (4 fichiers)
        ├── schema/           (1 JSON, pas de JS)
        ├── security/         (1 fichier : csrf-token.js)
        ├── storage/          (11 fichiers + 3 sous-rép. = **36 total**)
        │   ├── cache/        (11 fichiers)
        │   │   └── layer-selector/ (9 fichiers — split Phase 3)
        │   └── db/           (5 fichiers)
        ├── table/            (2 fichiers)
        ├── themes/           (3 fichiers + 1 sous-rép. = 7 total)
        │   └── theme-applier/ (4 fichiers — split Phase 3)
        ├── ui/               (16 fichiers + 3 sous-rép. = **31 total**)
        │   ├── cache-button/  (3 fichiers)
        │   ├── content-builder/ (5 fichiers : core.js, templates.js, assemblers.js, helpers.js, renderers-shared.js)
        │   └── filter-panel/  (7 fichiers)
        ├── utils/            (15 fichiers)
        ├── validators/       (2 fichiers)
        ├── geoleaf.api.js
        ├── geoleaf.baselayers.js
        ├── geoleaf.constants.js
        ├── geoleaf.core.js
        ├── geoleaf.errors.js
        ├── geoleaf.filters.js
        ├── geoleaf.geojson.js
        ├── geoleaf.helpers.js
        ├── geoleaf.layer-manager.js
        ├── geoleaf.legend.js
        ├── geoleaf.log.config.js
        ├── geoleaf.log.js
        ├── geoleaf.logger-shim.js    ← À SUPPRIMER en 4.1.5
        ├── geoleaf.poi.js
        ├── geoleaf.route.js
        ├── geoleaf.security.js
        ├── geoleaf.storage.js
        ├── geoleaf.table.js
        ├── geoleaf.ui.js
        ├── geoleaf.utils.js
        ├── geoleaf.validators.js
        └── index.js                  ← À SUPPRIMER en 4.1.5 (deprecated module registry)
```

---

## 3. Architecture cible V4

### 3.1 Nouvelle arborescence

```
src/
├── index.js                  ← NOUVEAU barrel principal (remplace bundle-entry.js)
├── boot.js                   ← NOUVEAU (remplace geoleaf.app.js)
├── boot/                     ← NOUVEAU pipeline de boot (post Phase 3.4)
│   ├── init-config.js
│   ├── init-map.js
│   ├── init-storage.js
│   ├── init-ui.js
│   ├── init-routes.js
│   └── init-themes.js
├── plugins/
│   ├── storage.plugin.js     ← Migré ESM
│   └── addpoi.plugin.js      ← Migré ESM
├── css/                      ← Déplacé de static/css/
│   └── (fichiers CSS inchangés)
└── modules/                  ← RENOMMÉ depuis static/js/
    ├── log/
    │   ├── index.js          ← barrel
    │   ├── logger.js         ← ex geoleaf.log.js
    │   └── log-config.js     ← ex geoleaf.log.config.js
    ├── errors/
    │   └── index.js          ← ex geoleaf.errors.js (exporte les classes)
    ├── constants/
    │   └── index.js          ← ex geoleaf.constants.js
    ├── security/
    │   ├── index.js          ← barrel (ex geoleaf.security.js)
    │   └── csrf-token.js     ← seul sous-module existant
    │   │ ℹ️ Phase 4 : extraire html-sanitizer, url-validator,
    │   │   coord-validator depuis geoleaf.security.js
    ├── utils/
    │   ├── index.js          ← barrel
    │   ├── core-utils.js     ← ex geoleaf.utils.js
    │   ├── dom-security.js
    │   ├── dom-helpers.js
    │   ├── event-listener-manager.js
    │   ├── timer-manager.js
    │   ├── scale-utils.js
    │   ├── animation-helper.js
    │   ├── error-logger.js
    │   ├── event-helpers.js
    │   ├── fetch-helper.js
    │   ├── file-validator.js
    │   ├── formatters.js
    │   ├── lazy-loader.js
    │   ├── map-helpers.js
    │   ├── object-utils.js
    │   └── performance-profiler.js
    ├── validators/
    │   ├── index.js          ← barrel
    │   ├── style-validator.js
    │   └── style-validator-rules.js
    ├── helpers/
    │   └── style-resolver.js
    ├── core/
    │   └── index.js          ← ex geoleaf.core.js
    ├── ui/
    │   ├── index.js          ← barrel (ex geoleaf.ui.js)
    │   ├── theme.js
    │   ├── controls.js
    │   ├── panel-builder.js
    │   ├── dom-utils.js
    │   ├── coordinates-display.js
    │   ├── branding.js
    │   ├── components.js
    │   ├── notifications.js
    │   ├── event-delegation.js
    │   ├── filter-state-manager.js
    │   ├── filter-control-builder.js
    │   ├── loading-screen.js
    │   ├── scale-control.js      ← déplacé depuis map/scale-control.js (regroupé avec UI)
    │   ├── cache-button/         ← 3 fichiers (manager.js, renderer.js, events.js)
    │   │   └── index.js
    │   ├── content-builder/
    │   │   ├── index.js
    │   │   ├── core.js
    │   │   ├── templates.js
    │   │   ├── assemblers.js
    │   │   ├── helpers.js
    │   │   └── renderers-shared.js
    │   └── filter-panel/
    │       ├── index.js
    │       ├── shared.js
    │       ├── state-reader.js
    │       ├── lazy-loader.js
    │       ├── applier.js
    │       ├── renderer.js
    │       ├── proximity.js
    │       └── core.js
    ├── data/
    │   └── normalizer.js
    ├── loaders/
    │   └── style-loader.js
    ├── config/
    │   ├── index.js          ← barrel (ex geoleaf.config.js)
    │   ├── loader.js
    │   ├── storage.js
    │   ├── normalization.js
    │   ├── taxonomy.js
    │   ├── profile.js
    │   ├── profile-v3-loader.js
    │   ├── data-converter.js
    │   └── geoleaf-config/      ← sous-rép. split Phase 3
    │       ├── config-accessors.js
    │       ├── config-core.js
    │       ├── config-loaders.js
    │       └── config-validation.js
    ├── baselayers/
    │   └── index.js          ← ex geoleaf.baselayers.js
    ├── filters/
    │   └── index.js          ← ex geoleaf.filters.js
    ├── map/
    │   └── scale-control.js
    ├── poi/
    │   ├── index.js          ← barrel (ex geoleaf.poi.js)
    │   ├── shared.js
    │   ├── normalizers.js
    │   ├── popup.js
    │   ├── markers.js
    │   ├── core.js
    │   ├── sidepanel.js
    │   ├── add-form-orchestrator.js
    │   ├── image-upload.js
    │   ├── placement-mode.js
    │   ├── sync-handler.js
    │   ├── renderers/
    │   │   ├── index.js
    │   │   ├── field-renderers.js
    │   │   ├── media-renderers.js
    │   │   ├── lightbox-manager.js
    │   │   ├── ui-behaviors.js
    │   │   ├── component-renderers.js
    │   │   ├── complex-renderers.js
    │   │   ├── accordion-utils.js
    │   │   ├── section-orchestrator.js
    │   │   ├── links.js
    │   │   └── core.js
    │   └── add-form/         ← (plugin-only, voir section 9)
    │       ├── controller.js
    │       ├── data-mapper.js
    │       ├── fields-manager.js
    │       ├── lazy-loader.js
    │       ├── realtime-validator.js
    │       ├── renderer.js
    │       ├── state-manager.js
    │       ├── submit-handler.js
    │       ├── validator.js
    │       └── renderers/
    │           ├── fields-renderer.js
    │           ├── images-renderer.js
    │           ├── modal-renderer.js
    │           └── sections-renderer.js
    ├── renderers/
    │   ├── abstract-renderer.js
    │   └── simple-text-renderer.js
    ├── geojson/
    │   ├── index.js          ← barrel (ex geoleaf.geojson.js)
    │   ├── shared.js
    │   ├── style-resolver.js
    │   ├── visibility-manager.js
    │   ├── layer-manager/       ← sous-rép. split Phase 3
    │   │   ├── integration.js
    │   │   ├── store.js
    │   │   ├── style.js
    │   │   └── visibility.js
    │   ├── popup-tooltip.js
    │   ├── clustering.js
    │   ├── layer-config-manager.js
    │   ├── feature-validator.js
    │   ├── loader/              ← sous-rép. split Phase 3
    │   │   ├── config-helpers.js
    │   │   ├── data.js
    │   │   ├── profile.js
    │   │   └── single-layer.js
    │   └── core.js
    ├── route/
    │   ├── index.js          ← barrel (ex geoleaf.route.js)
    │   ├── style-resolver.js
    │   ├── popup-builder.js
    │   ├── loaders.js
    │   └── layer-manager.js
    ├── layer-manager/
    │   ├── index.js          ← barrel (ex geoleaf.layer-manager.js)
    │   ├── shared.js
    │   ├── renderer.js
    │   ├── cache-section.js
    │   ├── basemap-selector.js
    │   ├── style-selector.js
    │   └── control.js
    ├── legend/
    │   ├── index.js          ← barrel (absorbe geoleaf.legend.js façade)
    │   ├── legend-generator.js
    │   ├── legend-renderer.js
    │   └── legend-control.js
    ├── labels/
    │   ├── index.js          ← barrel
    │   ├── label-renderer.js
    │   ├── label-button-manager.js
    │   └── labels.js            ← API publique
    ├── themes/
    │   ├── index.js          ← barrel
    │   ├── theme-loader.js
    │   ├── theme-applier/       ← sous-rép. split Phase 3
    │   │   ├── core.js
    │   │   ├── deferred.js
    │   │   ├── ui-sync.js
    │   │   └── visibility.js
    │   ├── theme-selector.js
    │   └── theme-cache.js
    ├── table/
    │   ├── index.js          ← barrel (ex geoleaf.table.js)
    │   ├── panel.js
    │   └── renderer.js
    ├── storage/              ← (plugin-only, voir section 9 — **36 fichiers** vérifiés)
    │   ├── index.js
    │   ├── (11 fichiers racine : cache-manager.js, compression.js, idb-helper.js, indexeddb.js, etc.)
    │   ├── cache/            (11 fichiers : calculator.js, downloader.js, manager.js, etc.)
    │   │   └── layer-selector/ (9 fichiers — split Phase 3)
    │   └── db/               (5 fichiers : backups.js, preferences.js, etc.)
    └── api/
        ├── index.js          ← barrel (ex geoleaf.api.js — plus de UMD)
        ├── controller.js
        ├── factory-manager.js
        ├── initialization-manager.js
        ├── module-manager.js
        └── namespace-manager.js
```

### 3.2 Barrel principal — `src/index.js` (nouveau)

```javascript
// src/index.js — Point d'entrée ESM GeoLeaf V4

// Foundation
export { Log } from './modules/log/index.js';
export { CONSTANTS } from './modules/constants/index.js';
export * from './modules/errors/index.js';
export { Security } from './modules/security/index.js';
export { Utils } from './modules/utils/index.js';
export { Validators } from './modules/validators/index.js';

// Core
export { Core } from './modules/core/index.js';
export { UI } from './modules/ui/index.js';
export { Config } from './modules/config/index.js';

// Data layers
export { Baselayers } from './modules/baselayers/index.js';
export { Filters } from './modules/filters/index.js';
export { GeoJSON } from './modules/geojson/index.js';
export { POI } from './modules/poi/index.js';
export { Route } from './modules/route/index.js';
export { Labels } from './modules/labels/index.js';

// UI Components
export { LayerManager } from './modules/layer-manager/index.js';
export { Legend } from './modules/legend/index.js';
export { Table } from './modules/table/index.js';
export { Themes } from './modules/themes/index.js';

// API
export { API } from './modules/api/index.js';

// Boot
export { boot } from './boot.js';

// Default export — rétrocompatibilité namespace
import { createGeoLeafNamespace } from './modules/api/namespace-manager.js';
export default createGeoLeafNamespace();
```

### 3.3 Outputs Rollup V4

| Format | Fichier | Usage |
|--------|---------|-------|
| **ESM** | `dist/geoleaf.esm.js` | `import` dans bundlers (Vite, Webpack, etc.) |
| **UMD** | `dist/geoleaf.umd.js` | `<script>` CDN (rétrocompat V3) |
| **UMD min** | `dist/geoleaf.min.js` | Production CDN |
| **ESM plugin** | `dist/geoleaf-storage.esm.js` | Plugin Storage ESM |
| **IIFE plugin** | `dist/geoleaf-storage.plugin.js` | Plugin Storage CDN |
| **ESM plugin** | `dist/geoleaf-addpoi.esm.js` | Plugin AddPOI ESM |
| **IIFE plugin** | `dist/geoleaf-addpoi.plugin.js` | Plugin AddPOI CDN |

---

## 4. Étapes de migration détaillées

### Étape 4.1 — Préparer l'infrastructure (jour 1-2)

**Objectif** : Configurer tooling pour supporter ESM sans casser le build existant.

#### 4.1.1 — package.json

> **État actuel** : v3.2.0, pas de `"type"`, `"main": "dist/geoleaf.umd.js"`, `"types": "index.d.ts"` (monolithique racine).
> Pas de `"module"`, `"exports"`, ni `"sideEffects"`.

```jsonc
{
  "name": "geoleaf",
  "version": "4.0.0",
  "type": "module",                          // ← AJOUTER
  "main": "dist/geoleaf.umd.js",            // ← CDN/CJS
  "module": "dist/geoleaf.esm.js",          // ← AJOUTER (bundlers)
  "exports": {                               // ← AJOUTER (Node.js ESM)
    ".": {
      "import": "./dist/geoleaf.esm.js",
      "require": "./dist/geoleaf.umd.js",
      "types": "./dist/types/index.d.ts"
    },
    "./plugins/storage": {
      "import": "./dist/geoleaf-storage.esm.js",
      "require": "./dist/geoleaf-storage.plugin.js"
    },
    "./plugins/addpoi": {
      "import": "./dist/geoleaf-addpoi.esm.js",
      "require": "./dist/geoleaf-addpoi.plugin.js"
    }
  },
  "types": "dist/types/index.d.ts",         // ← MODIFIER (splitté)
  "sideEffects": false,                      // ← AJOUTER (tree-shaking)
  "files": [
    "dist/",
    "README.md",
    "CHANGELOG.md"
  ]
}
```

#### 4.1.2 — rollup.config.mjs (V4)

> **État actuel** : `rollup.config.mjs` (239 lignes) produit uniquement UMD + UMD min.
> Input : `src/bundle-entry.js`. Preamble terser indique `v3.1.0` (obsolète → corriger en `v4.0.0`).
> Rollup ^4.12.0, plugins: terser, visualizer, resolve, commonjs, filesize.
> La config ci-dessous **remplace entièrement** l'actuelle.

```javascript
import terser from "@rollup/plugin-terser";
import { visualizer } from "rollup-plugin-visualizer";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import filesize from "rollup-plugin-filesize";
import fs from "node:fs";

const INPUT_FILE = "src/index.js";                   // ← NOUVEAU
const STORAGE_PLUGIN = "src/plugins/storage.plugin.js";
const ADDPOI_PLUGIN = "src/plugins/addpoi.plugin.js";

const external = ["leaflet", "leaflet.markercluster"];
const globals = { leaflet: "L", "leaflet.markercluster": "L" };

const basePlugins = [
  resolve({ browser: true, preferBuiltins: false }),
  commonjs(),
  filesize({ showMinifiedSize: true, showGzippedSize: true, showBrotliSize: true }),
];

// ─── ESM Build (pour bundlers) ───
const esmConfig = {
  input: INPUT_FILE,
  external,
  plugins: basePlugins,
  treeshake: {
    moduleSideEffects: false,          // ← CHANGÉ : ESM = pas de side-effects
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
    annotations: true,
  },
  output: {
    file: "dist/geoleaf.esm.js",
    format: "es",                      // ← ESM !
    sourcemap: true,
    exports: "named",
  },
};

// ─── UMD Build (pour CDN <script>) ───
const umdConfig = {
  input: INPUT_FILE,
  external,
  plugins: basePlugins,
  treeshake: {
    moduleSideEffects: true,           // UMD: conserver side-effects pour compat
    propertyReadSideEffects: false,
  },
  output: {
    file: "dist/geoleaf.umd.js",
    format: "umd",
    name: "GeoLeaf",
    sourcemap: true,
    globals,
    exports: "named",
  },
};

// ─── UMD Minifié (production CDN) ───
const umdMinConfig = {
  ...umdConfig,
  output: {
    ...umdConfig.output,
    file: "dist/geoleaf.min.js",
    compact: true,
  },
  plugins: [
    ...basePlugins,
    terser({
      compress: {
        dead_code: true,
        drop_console: true,            // ← V4 : supprimer console en prod
        drop_debugger: true,
        passes: 3,
        booleans_as_integers: true,
        arrows: true,
        collapse_vars: true,
        unused: true,
      },
      mangle: {
        toplevel: false,
        keep_classnames: true,
        reserved: ["GeoLeaf", "L"],
      },
      format: {
        comments: false,
        preamble: "/* GeoLeaf v4.0.0 | MIT License | geoleaf.dev */",
        ecma: 2020,
      },
    }),
    visualizer({
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
      title: "GeoLeaf V4 Bundle Analysis",
    }),
  ],
};

// ─── Plugins (conditionnels) ───
function pluginConfigs(input, outputBase, globalName) {
  if (!fs.existsSync(input)) return [];
  return [
    {
      input,
      external,
      plugins: basePlugins,
      output: {
        file: `dist/${outputBase}.esm.js`,
        format: "es",
        sourcemap: true,
      },
    },
    {
      input,
      external,
      plugins: [...basePlugins, terser({ compress: { drop_console: true } })],
      output: {
        file: `dist/${outputBase}.plugin.js`,
        format: "iife",
        name: globalName,
        sourcemap: true,
        globals,
      },
    },
  ];
}

export default [
  esmConfig,
  umdConfig,
  umdMinConfig,
  ...pluginConfigs(STORAGE_PLUGIN, "geoleaf-storage", "GeoLeafStoragePlugin"),
  ...pluginConfigs(ADDPOI_PLUGIN, "geoleaf-addpoi", "GeoLeafAddPoiPlugin"),
];
```

#### 4.1.3 — jsconfig.json (V4)

> **État actuel** : `target: "ES2020"`, `module: "ESNext"`, `allowJs: true`. 
> Manque : `moduleResolution`, `baseUrl`, `paths`, `include`, `exclude` incomplet.

```jsonc
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",     // ← AJOUTER
    "lib": ["ES2020", "DOM"],
    "allowJs": true,
    "checkJs": false,
    "baseUrl": ".",                     // ← AJOUTER
    "paths": {                          // ← AJOUTER (alias optionnels)
      "@geoleaf/*": ["src/modules/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 4.1.4 — Renommer le dossier source

```
src/static/js/  →  src/modules/
src/static/css/ →  src/css/
```

Commande :
```powershell
# Depuis la racine du projet
Move-Item src/static/js src/modules
Move-Item src/static/css src/css
Remove-Item src/static -Recurse -ErrorAction SilentlyContinue
```

#### 4.1.5 — Supprimer les fichiers obsolètes

```powershell
Remove-Item src/modules/index.js                    # Module registry deprecated (160 lignes)
Remove-Item src/modules/geoleaf.logger-shim.js     # Non importé dans bundle-entry.js
# Note : main.js et geoleaf.config.js déjà supprimés en v3.2.0
# Note : src/load-modules.js est CONSERVÉ comme référence de l'ordre de chargement
#        Il sera supprimé en dernière étape de la migration (après T12)
```

#### 4.1.6 — Créer `.nvmrc`

```
18
```

> Node.js ≥ 18.x est requis pour `--experimental-vm-modules` (Jest ESM).

#### 4.1.7 — Créer `__mocks__/leaflet.js` et `__mocks__/leaflet.markercluster.js`

Le dossier `__mocks__/` n'existe pas encore. Le créer avec les mocks Leaflet (voir §7.4 pour le contenu).

```powershell
New-Item -ItemType Directory -Path "__mocks__" -Force
# Créer leaflet.js et leaflet.markercluster.js (contenu en §7.4)
```

#### 4.1.8 — Mettre à jour `bundle-entry.js`

Après le renommage `static/js/` → `modules/`, tous les chemins d'import dans `bundle-entry.js` doivent être corrigés :

```
./static/js/  →  ./modules/
```

Ceci maintient le build UMD fonctionnel pendant toute la durée de la migration.

#### 4.1.9 — Corriger les 10 fichiers `.esm.test.js` prototypes

Les 10 fichiers ESM test existants importent depuis des chemins inexistants (`src/core/`, `src/config/`). Corriger vers `src/modules/` :

```
../../src/core/log.js       →  ../../src/modules/log/logger.js
../../src/core/errors.js    →  ../../src/modules/errors/index.js
../../src/core/constants.js →  ../../src/modules/constants/index.js
../../src/core/utils.js     →  ../../src/modules/utils/core-utils.js
../../src/config/loader.js  →  ../../src/modules/config/loader.js
```

> **Note** : ces tests ne fonctionneront qu'après que les fichiers source correspondants auront été migrés en ESM (T0–T5). Ce sont des prototypes forward-looking.

---

### Étape 4.2 — Migrer les modules fondation (jour 2-3)

**Ordre critique** : ces modules n'ont aucune dépendance GeoLeaf, ils sont migrés en premier.

#### Tier 0 — Logger

| Fichier actuel | Fichier cible | Exporte |
|---------------|---------------|---------|
| `geoleaf.log.js` | `src/modules/log/logger.js` | `Log` (objet avec méthodes info, warn, error, debug, group, etc.) |
| `geoleaf.log.config.js` | `src/modules/log/log-config.js` | `configureLog(options)` |
| — | `src/modules/log/index.js` | barrel `export { Log } from './logger.js'; export { configureLog } from './log-config.js';` |

#### Tier 1 — Constants, Errors, Security

| Fichier actuel | Fichier cible | Exporte |
|---------------|---------------|---------|
| `geoleaf.constants.js` | `src/modules/constants/index.js` | `CONSTANTS` (objet frozen) |
| `geoleaf.errors.js` | `src/modules/errors/index.js` | Classes: `GeoLeafError`, `GeoLeafConfigError`, `GeoLeafLayerError`, `GeoLeafSecurityError`, `GeoLeafValidationError`, `GeoLeafNetworkError`, `GeoLeafStorageError`, `GeoLeafRenderError`, `GeoLeafPluginError`, `GeoLeafAPIError` |
| `geoleaf.security.js` + `security/csrf-token.js` | `src/modules/security/` | `Security`, `escapeHtml`, `validateUrl`, `validateCoordinates`, `sanitizePoiProperties` |

> **Note Phase 4** : `geoleaf.security.js` est encore monolithique. Le split en sous-modules (`html-sanitizer.js`, `url-validator.js`, `coord-validator.js`) sera effectué pendant la migration ESM Phase 4.

#### Tier 2 — Utils, Validators, Helpers

| Fichier actuel | Fichier cible | Exporte |
|---------------|---------------|---------|
| `geoleaf.utils.js` | `src/modules/utils/core-utils.js` | `Utils` (debounce, throttle, deepMerge, etc.) |
| `utils/dom-security.js` | `src/modules/utils/dom-security.js` | `DOMSecurity`, `safeSetContent`, `safeCreateElement` |
| `utils/dom-helpers.js` | `src/modules/utils/dom-helpers.js` | `DomHelpers` |
| `utils/event-listener-manager.js` | `src/modules/utils/event-listener-manager.js` | `EventListenerManager` (classe) |
| `utils/timer-manager.js` | `src/modules/utils/timer-manager.js` | `TimerManager` |
| `utils/scale-utils.js` | `src/modules/utils/scale-utils.js` | `ScaleUtils` |
| `utils/animation-helper.js` | `src/modules/utils/animation-helper.js` | `AnimationHelper` |
| `utils/error-logger.js` | `src/modules/utils/error-logger.js` | `ErrorLogger` |
| `utils/event-helpers.js` | `src/modules/utils/event-helpers.js` | `EventHelpers` |
| `utils/fetch-helper.js` | `src/modules/utils/fetch-helper.js` | `FetchHelper` |
| `utils/file-validator.js` | `src/modules/utils/file-validator.js` | `FileValidator` |
| `utils/formatters.js` | `src/modules/utils/formatters.js` | `Formatters` |
| `utils/lazy-loader.js` | `src/modules/utils/lazy-loader.js` | `LazyLoader` |
| `utils/map-helpers.js` | `src/modules/utils/map-helpers.js` | `MapHelpers` |
| `utils/object-utils.js` | `src/modules/utils/object-utils.js` | `ObjectUtils` |
| `utils/performance-profiler.js` | `src/modules/utils/performance-profiler.js` | `PerformanceProfiler` |
| `validators/style-validator-rules.js` | `src/modules/validators/style-validator-rules.js` | `STYLE_RULES` |
| `validators/style-validator.js` | `src/modules/validators/style-validator.js` | `StyleValidator` |
| `helpers/style-resolver.js` | `src/modules/helpers/style-resolver.js` | `StyleResolver` |

---

### Étape 4.3 — Migrer les modules métier (jour 3-8)

**Ordre** : suivre le DAG de dépendances, du moins dépendant au plus dépendant.

#### Tier 3 — Core

| Fichier | Exporte | Dépend de |
|---------|---------|-----------|
| `geoleaf.core.js` | `Core` (init, map instance, destroy) | `Log`, `L` (Leaflet) |

#### Tier 4 — UI sous-modules (sans dépendances inter-modules)

Migrer dans cet ordre :
1. `ui/theme.js` → exporte `UITheme`
2. `ui/controls.js` → exporte `UIControls`
3. `ui/panel-builder.js` → exporte `PanelBuilder`
4. `ui/dom-utils.js` → exporte `DomUtils`
5. `ui/coordinates-display.js` → exporte `CoordinatesDisplay`
6. `ui/branding.js` → exporte `Branding`
7. `ui/content-builder/core.js`, `templates.js`, `assemblers.js`, `helpers.js`, `renderers-shared.js` → barrel `ui/content-builder/index.js`
8. `ui/content-builder.js` → exporte `ContentBuilder` (agrégateur)
9. `ui/components.js` → exporte `UIComponents`
10. `ui/notifications.js` → exporte `Notifications`
11. `ui/event-delegation.js` → exporte `EventDelegation`
12. `ui/filter-state-manager.js` → exporte `FilterStateManager`
13. `map/scale-control.js` → exporte `ScaleControl`
14. `ui/filter-control-builder.js` → exporte `FilterControlBuilder`
15. `ui/filter-panel/shared.js`, `state-reader.js`, `lazy-loader.js`, `applier.js`, `renderer.js`, `proximity.js`, `core.js` → barrel `ui/filter-panel/index.js`
16. `ui/filter-panel.js` → exporte `FilterPanel` (agrégateur)
17. `geoleaf.ui.js` → `ui/index.js` barrel final

#### Tier 5 — Config, Data, Loaders

1. `data/normalizer.js` → exporte `DataNormalizer`
2. `loaders/style-loader.js` → exporte `StyleLoader`
3. `config/loader.js` → exporte `ConfigLoader`
4. `config/storage.js` → exporte `ConfigStorage`
5. `config/normalization.js` → exporte `ConfigNormalization`
6. `config/taxonomy.js` → exporte `ConfigTaxonomy`
7. `config/profile-v3-loader.js` → exporte `ProfileV3Loader`
8. `config/profile.js` → exporte `ConfigProfile`
9. `config/data-converter.js` → exporte `DataConverter`
10. `config/geoleaf-config/` (sous-rép. Phase 3) : `config-accessors.js`, `config-core.js`, `config-loaders.js`, `config-validation.js` → barrel
11. `geoleaf.config.js` → `config/index.js` barrel (note : façade déjà splittée en `config/geoleaf-config/`)

#### Tier 6 — Baselayers, Filters

1. `geoleaf.baselayers.js` → `baselayers/index.js` exporte `Baselayers`
2. `geoleaf.filters.js` → `filters/index.js` exporte `Filters`

#### Tier 7 — POI, Renderers

1. `renderers/abstract-renderer.js` → exporte `AbstractRenderer` (classe)
2. `renderers/simple-text-renderer.js` → exporte `SimpleTextRenderer` (classe)
3. `poi/shared.js` → exporte `POIShared` (state + constants)
4. `poi/normalizers.js` → exporte `POINormalizers`
5. `poi/popup.js` → exporte `POIPopup`
6. `poi/markers.js` → exporte `POIMarkers`
7. `poi/renderers/` → tous les sous-modules (10 fichiers incl. `accordion-utils.js`, `complex-renderers.js`) + barrel
8. `poi/sidepanel.js` → exporte `POISidePanel`
9. `poi/core.js` → exporte `POICore`
10. `poi/add-form-orchestrator.js`, `image-upload.js`, `placement-mode.js`, `sync-handler.js` → plugin-related
11. `poi/add-form/` → 13 fichiers (incl. `renderers/` sous-rép.) → barrel
12. `geoleaf.poi.js` → `poi/index.js` barrel

#### Tier 8 — GeoJSON, Route

1. `geojson/shared.js` → exporte `GeoJSONShared`
2. `geojson/style-resolver.js` → exporte `GeoJSONStyleResolver`
3. `geojson/visibility-manager.js` → exporte `VisibilityManager`
4. `geojson/layer-manager/` (sous-rép. Phase 3) : `integration.js`, `store.js`, `style.js`, `visibility.js` → barrel `layer-manager/index.js`
5. `geojson/popup-tooltip.js` → exporte `GeoJSONPopupTooltip`
6. `geojson/clustering.js` → exporte `Clustering`
7. `geojson/layer-config-manager.js` → exporte `LayerConfigManager`
8. `geojson/feature-validator.js` → exporte `FeatureValidator`
9. `geojson/loader/` (sous-rép. Phase 3) : `config-helpers.js`, `data.js`, `profile.js`, `single-layer.js` → barrel `loader/index.js`
10. `geojson/core.js` → exporte `GeoJSONCore`
11. `geoleaf.geojson.js` → `geojson/index.js` barrel
12. `route/` : 4 fichiers (`layer-manager.js`, `loaders.js`, `popup-builder.js`, `style-resolver.js`) → barrel

#### Tier 9 — UI Composants haut-niveau

1. `layer-manager/` → tous sous-modules + barrel
2. `legend/` → tous sous-modules + barrel
3. `labels/` → 3 fichiers (`label-renderer.js`, `label-button-manager.js`, `labels.js`) + barrel
4. `themes/` → sous-modules + `theme-applier/` (sous-rép. Phase 3 : `core.js`, `deferred.js`, `ui-sync.js`, `visibility.js`) + barrel
5. `table/` → tous sous-modules + barrel

#### Tier 10 — API (en dernier)

1. `api/module-manager.js` → exporte `ModuleManager`
2. `api/initialization-manager.js` → exporte `InitializationManager`
3. `api/namespace-manager.js` → exporte `NamespaceManager`, `createGeoLeafNamespace`
4. `api/factory-manager.js` → exporte `FactoryManager`
5. `api/controller.js` → exporte `APIController` (classe)
6. `geoleaf.api.js` → `api/index.js` — **supprimer le wrapper UMD**, exporter en ESM pur

#### Tier 11 — Boot

1. Migrer `src/app/` (3 fichiers : `boot.js`, `helpers.js`, `init.js`) → `src/boot.js` en ESM
2. Les sous-modules `src/boot/init-*.js` sont créés en Phase 4 (pipeline de boot ESM)

---

### Étape 4.4 — Créer les barrels `index.js` (jour 8-9)

Chaque dossier de domaine reçoit un `index.js` qui re-exporte l'API publique.

**Pattern standard pour un barrel :**

```javascript
// src/modules/geojson/index.js
export { GeoJSONCore as Core } from './core.js';
export * as Loader from './loader/index.js';            // sous-rép. Phase 3
export * as LayerManager from './layer-manager/index.js'; // sous-rép. Phase 3
export { GeoJSONStyleResolver as StyleResolver } from './style-resolver.js';
export { VisibilityManager } from './visibility-manager.js';
export { Clustering } from './clustering.js';
export { FeatureValidator } from './feature-validator.js';

// Ré-export groupé pour import { GeoJSON } from 'geoleaf'
import * as _GeoJSON from './core.js';
export const GeoJSON = {
    ..._GeoJSON,
    // ... assembler l'objet façade pour rétrocompat
};
```

**Règle** : les modules préfixés `_` (internes) ne sont PAS réexportés dans le barrel — ils restent importables directement mais ne font pas partie de l'API publique.

---

### Étape 4.5 — Rétrocompatibilité UMD / `window.GeoLeaf` (jour 9-10)

Pour que le build UMD continue d'exposer `window.GeoLeaf` avec la même forme qu'en V3, créer un fichier d'entrée UMD dédié :

```javascript
// src/umd-entry.js — Entrée spécifique au build UMD
import * as GeoLeaf from './index.js';

// Attacher au global pour rétrocompat <script>
if (typeof window !== 'undefined') {
    window.GeoLeaf = window.GeoLeaf || {};
    Object.assign(window.GeoLeaf, GeoLeaf);
}

export default GeoLeaf;
```

Modifier `rollup.config.mjs` pour utiliser `src/umd-entry.js` comme input des builds UMD et `src/index.js` pour le build ESM.

---

## 5. Transformation IIFE → ESM : Guide mécanique

### 5.1 Procédure pour chaque fichier

#### Étape A — Supprimer le wrapper IIFE

```javascript
// AVANT
(function (global) {
    "use strict";
    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    
    // ... tout le code ...
    
    GeoLeaf.NomModule = { publicMethod1, publicMethod2 };
})(typeof window !== 'undefined' ? window : global);

// APRÈS
"use strict";

// ... tout le code (indenté d'un niveau en moins) ...

export const NomModule = { publicMethod1, publicMethod2 };
// ou pour les classes :
export class NomModule { ... }
```

#### Étape B — Remplacer les lectures `GeoLeaf.*` par des imports

```javascript
// AVANT (dans le corps du module)
const log = GeoLeaf.Log;
const { escapeHtml } = GeoLeaf.Security;
GeoLeaf.Utils.debounce(fn, 300);

// APRÈS
import { Log } from '../log/index.js';
import { escapeHtml } from '../security/index.js';
import { debounce } from '../utils/index.js';
```

#### Étape C — Remplacer les références Leaflet

```javascript
// AVANT
const map = L.map(element);
L.tileLayer(url).addTo(map);

// APRÈS
import L from 'leaflet';
const map = L.map(element);
L.tileLayer(url).addTo(map);
```

#### Étape D — Supprimer l'assignation namespace

```javascript
// AVANT (en fin de module)
GeoLeaf.NomModule = { method1, method2 };
// ou
GeoLeaf._NomInterne = { ... };

// APRÈS — remplacé par export en haut/bas du fichier
export { method1, method2 };
// ou
export const NomInterne = { ... };
```

### 5.2 Cas spéciaux

#### Modules avec état mutable (shared.js)

```javascript
// AVANT
GeoLeaf._POIShared = {
    state: { pois: [], map: null },
    CONSTANTS: { MAX_POIS: 1000 }
};

// APRÈS — l'état reste un singleton exporté
export const state = { pois: [], map: null };
export const POI_CONSTANTS = { MAX_POIS: 1000 };
// L'import ESM est un singleton par nature (évalué une seule fois)
```

#### Modules façade/agrégateur (geoleaf.ui.js, geoleaf.poi.js, etc.)

```javascript
// AVANT
(function () {
    const GeoLeaf = window.GeoLeaf;
    GeoLeaf.UI = {
        init: GeoLeaf._UICore.init,
        applyTheme: GeoLeaf._UITheme.applyTheme,
        // ...
    };
})();

// APRÈS — simple barrel re-export
export { init } from './core.js';
export { applyTheme } from './theme.js';
// ...
// Ou si on veut un objet façade :
import { init } from './core.js';
import { applyTheme } from './theme.js';
export const UI = { init, applyTheme };
```

#### Module UMD (geoleaf.api.js)

```javascript
// AVANT — wrapper UMD complet
(function (root, factory) {
    if (typeof define === 'function' && define.amd) { ... }
    else if (typeof module === 'object') { ... }
    else { root.GeoLeaf = factory(); }
})(self, function() { ... });

// APRÈS — ESM pur (Rollup génère le UMD automatiquement)
import { APIController } from './controller.js';
export const API = new APIController();
export default API;
```

#### Classes avec héritage

```javascript
// AVANT
class POIRenderer extends GeoLeaf.Renderers.AbstractRenderer { ... }
GeoLeaf._POIRenderer = POIRenderer;

// APRÈS
import { AbstractRenderer } from '../../renderers/abstract-renderer.js';
export class POIRenderer extends AbstractRenderer { ... }
```

### 5.3 Regex de recherche/remplacement utiles

```
# Trouver tous les wrappers IIFE à supprimer
^\(function\s*\((?:global|window|root)?\)\s*\{

# Trouver toutes les fermetures IIFE
\}\)\((?:typeof\s+(?:window|self)\b.*|window|global)\);$

# Trouver toutes les assignations namespace
GeoLeaf\.[\w.]+\s*=\s*\{

# Trouver toutes les lectures de dépendances
(?:const|let|var)\s+\w+\s*=\s*GeoLeaf\.[\w.]+

# Trouver les références directes GeoLeaf.*
GeoLeaf\.([\w.]+)
```

---

## 6. Ordre de migration des fichiers

### 6.1 Matrice complète des tiers (~207 fichiers)

L'ordre est CRITIQUE : chaque tier ne dépend que des tiers précédents.

| Tier | Nb fichiers | Modules | Dépend de |
|------|-------------|---------|-----------|
| **T0** | 3 | `log/logger.js`, `log/log-config.js`, `log/index.js` | Rien |
| **T1** | 3 | `constants/index.js`, `errors/index.js` | Rien |
| **T1b** | 2 | `security/csrf-token.js`, `security/index.js` (+ extraction depuis `geoleaf.security.js` en Phase 4) | T0 (Log) |
| **T2** | 17 | Tous les `utils/*.js` + `utils/index.js` (format-utils.js supprimé) | T0, T1, T1b |
| **T2b** | 3 | `validators/*.js` + `validators/index.js` | T1 (Errors) |
| **T2c** | 1 | `helpers/style-resolver.js` | Rien |
| **T3** | 1 | `core/index.js` | T0, Leaflet |
| **T4** | ~31 | Tous les `ui/**/*.js` + barrels (incl. `cache-button/`, `content-builder/`, `filter-panel/`) | T0, T2, T3 |
| **T5** | ~15 | Tous les `config/**/*.js` + `geoleaf-config/` (4 fichiers) + barrel | T0, T2 |
| **T5b** | 1 | `data/normalizer.js` | T0 |
| **T5c** | 1 | `loaders/style-loader.js` | T0 |
| **T6** | 2 | `baselayers/index.js`, `filters/index.js` | T0, T2, T3, Leaflet |
| **T6b** | 1 | `map/scale-control.js` | T3, Leaflet |
| **T7** | ~34 | Tous les `poi/**/*.js` + barrels (incl. `add-form/` 9 fichiers + `add-form/renderers/` 4 fichiers + `renderers/` 10 fichiers) | T0-T6, Leaflet |
| **T7b** | 2 | `renderers/abstract-renderer.js`, `simple-text-renderer.js` | T0, T1b, T2 |
| **T8** | ~17 | Tous les `geojson/**/*.js` + `layer-manager/` (4) + `loader/` (4) + barrel | T0-T6, Leaflet |
| **T8b** | ~5 | Tous les `route/**/*.js` + barrel | T0, T1b, T5, Leaflet |
| **T9** | ~8 | `layer-manager/**/*.js` + barrel | T0, T8 |
| **T9b** | ~5 | `legend/**/*.js` + barrel | T0, T5, Leaflet |
| **T9c** | ~4 | `labels/**/*.js` + barrel | T0, T8, Leaflet |
| **T9d** | ~8 | `themes/**/*.js` + `theme-applier/` (4 fichiers) + barrel | T0, T3, T8, T9 |
| **T9e** | ~3 | `table/**/*.js` + barrel | T0, Leaflet |
| **T10** | 6 | `api/**/*.js` + barrel | Tous les tiers |
| **T11** | 4+ | `src/app/` (3 fichiers) → `boot.js` + `boot/init-*.js` | Tous |
| **T12** | 1 | `src/index.js` (barrel principal) | Tous |

> **Total vérifié** : 205 fichiers source (`src/static/js/`) + 3 fichiers app (`src/app/`) + 2 plugins = **210 fichiers** à migrer + ~25 barrels `index.js` à créer.

### 6.2 Stratégie de migration progressive

**Option recommandée : migration par tier avec validation à chaque étape.**

Pour chaque tier :
1. Migrer tous les fichiers du tier en ESM
2. Créer le barrel `index.js`
3. Mettre à jour les imports dans les fichiers déjà migrés qui en dépendent
4. Exécuter `npm run build` → vérifier que le bundle UMD fonctionne toujours
5. Exécuter `npm run test:jest` → vérifier la couverture
6. Commit

---

## 7. Configuration tooling V4

### 7.1 package.json — scripts mis à jour

> **État actuel** : le script `test:jest` utilise `jest --config jest.config.js` sans `--experimental-vm-modules`.
> Le script `build:css` pointe vers `src/static/css/` → sera corrigé vers `src/css/`.

```jsonc
{
  "scripts": {
    "build": "rollup -c",
    "build:watch": "rollup -c -w",
    "build:css": "postcss src/css/geoleaf-main.css -o dist/geoleaf-main.min.css --map",
    "build:all": "rimraf dist && rollup -c && npm run build:css",
    "test": "node scripts/smoke-test.cjs",
    "test:jest": "node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js",
    "test:coverage": "node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js --coverage",
    "test:all": "npm run test && npm run test:jest",
    "lint": "eslint src/ __tests__/",
    "lint:fix": "eslint src/ __tests__/ --fix",
    "format": "prettier --write \"src/**/*.js\" \"__tests__/**/*.js\" \"*.{json,md}\"",
    "verify": "npm run build:all && npm run test:all",
    "prepublishOnly": "npm run lint && npm run build:all && npm run test:all"
  }
}
```

> **Note** : `--experimental-vm-modules` est nécessaire pour Jest avec ESM natif. Alternative : utiliser `@jest/globals` avec transform Babel.

### 7.2 jest.config.js (V4)

> **État actuel** : `jest.config.js` est en CJS (`module.exports`), pas de `transform`, pas de `extensionsToTreatAsEsm`, `collectCoverageFrom` pointe vers `static/js/`. Tout ceci sera remplacé par la config ci-dessous.

```javascript
/** @type {import('jest').Config} */
export default {
    testEnvironment: "jsdom",
    
    // ESM support
    transform: {},
    extensionsToTreatAsEsm: [],    // .js traité comme ESM via "type": "module"
    
    setupFilesAfterSetup: ["<rootDir>/__tests__/setup.js"],
    
    testMatch: [
        "**/__tests__/**/*.test.js",
    ],
    
    testPathIgnorePatterns: [
        "/node_modules/",
        "/dist/",
    ],
    
    // Coverage depuis les modules ESM
    collectCoverageFrom: [
        "src/modules/**/*.js",
        "src/boot.js",
        "src/boot/**/*.js",
        "!src/modules/**/index.js",    // Barrels exclus (pas de logique)
    ],
    
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    moduleFileExtensions: ["js", "json"],
    verbose: true,
    testTimeout: 10000,
};
```

### 7.3 __tests__/setup.js (V4)

```javascript
// Mock Leaflet — inchangé mais en ESM
import { jest } from '@jest/globals';

// Le mock L reste global pour les modules qui font `import L from 'leaflet'`
// Jest moduleNameMapper redirige 'leaflet' vers ce mock
global.L = {
    map: jest.fn(() => ({ /* ... même mock qu'avant ... */ })),
    tileLayer: jest.fn(() => ({ addTo: jest.fn(), remove: jest.fn() })),
    marker: jest.fn(() => ({ /* ... */ })),
    // ... (copier l'intégralité du mock existant)
};

// OU mieux : créer __mocks__/leaflet.js
// Voir section 8.2
```

### 7.4 Ajout `jest.config.js` → moduleNameMapper

```javascript
moduleNameMapper: {
    '^leaflet$': '<rootDir>/__mocks__/leaflet.js',
    '^leaflet\\.markercluster$': '<rootDir>/__mocks__/leaflet.markercluster.js',
},
```

Créer `__mocks__/leaflet.js` :
```javascript
// __mocks__/leaflet.js
const L = {
    map: jest.fn(() => ({
        setView: jest.fn().mockReturnThis(),
        remove: jest.fn(),
        getZoom: jest.fn(() => 12),
        getCenter: jest.fn(() => ({ lat: 45, lng: -73 })),
        on: jest.fn(),
        off: jest.fn(),
        addLayer: jest.fn(),
        removeLayer: jest.fn(),
        fitBounds: jest.fn(),
        getBounds: jest.fn(() => ({ isValid: () => true })),
    })),
    tileLayer: jest.fn(() => ({ addTo: jest.fn(), remove: jest.fn() })),
    marker: jest.fn(() => ({
        addTo: jest.fn(),
        remove: jest.fn(),
        bindPopup: jest.fn().mockReturnThis(),
        bindTooltip: jest.fn().mockReturnThis(),
        getPopup: jest.fn(),
        setIcon: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
    })),
    icon: jest.fn(() => ({})),
    divIcon: jest.fn(() => ({})),
    popup: jest.fn(() => ({ setContent: jest.fn(), getContent: jest.fn(() => "") })),
    latLng: jest.fn((lat, lng) => ({ lat, lng })),
    layerGroup: jest.fn(() => ({
        addTo: jest.fn(),
        addLayer: jest.fn(),
        removeLayer: jest.fn(),
        clearLayers: jest.fn(),
        eachLayer: jest.fn(),
    })),
    geoJSON: jest.fn(() => ({ addTo: jest.fn(), remove: jest.fn() })),
    DomUtil: { create: jest.fn(() => document.createElement('div')), addClass: jest.fn(), removeClass: jest.fn() },
    Tooltip: jest.fn(),
    polyline: jest.fn(() => ({ addTo: jest.fn(), getBounds: jest.fn() })),
    Control: { extend: jest.fn(() => jest.fn()) },
};

export default L;
export { L };
```

---

## 8. Migration des tests

### 8.1 Stratégie

Chaque test existant qui fait :

```javascript
// AVANT
const { GeoLeaf } = require('../../src/modules/geoleaf.utils.js');
// ou
require('../../src/modules/geoleaf.utils.js');
const Utils = window.GeoLeaf.Utils;
```

Devient :

```javascript
// APRÈS
import { Utils } from '../../src/modules/utils/index.js';
// ou import direct du module testé
import { debounce, throttle } from '../../src/modules/utils/core-utils.js';
```

### 8.2 Pattern de migration des tests

```javascript
// AVANT — test IIFE
require('../../src/modules/geoleaf.log.js');
require('../../src/modules/geoleaf.security.js');
require('../../src/modules/geoleaf.utils.js');

describe('Utils', () => {
    const Utils = window.GeoLeaf.Utils;
    
    test('debounce', () => {
        const fn = jest.fn();
        const debounced = Utils.debounce(fn, 100);
        // ...
    });
});
```

```javascript
// APRÈS — test ESM
import { Utils, debounce } from '../../src/modules/utils/index.js';

describe('Utils', () => {
    test('debounce', () => {
        const fn = jest.fn();
        const debounced = debounce(fn, 100);
        // ...
    });
});
```

### 8.3 Tests impactés — Inventaire

Tous les 128 fichiers de tests devront être migrés. L'ordre de migration suit le même tier que les sources :

| Tier | Tests à migrer |
|------|---------------|
| T0 | `__tests__/helpers/log.test.js` |
| T1 | `__tests__/constants/*.test.js`, `__tests__/security/*.test.js` |
| T2 | `__tests__/utils/*.test.js`, `__tests__/validators/*.test.js`, `__tests__/helpers/*.test.js` |
| T3 | `__tests__/core/*.test.js` |
| T4 | `__tests__/ui/*.test.js` |
| T5 | `__tests__/config/*.test.js` |
| T6 | `__tests__/baselayers/*.test.js`, `__tests__/filters/*.test.js` |
| T7 | `__tests__/poi/*.test.js`, `__tests__/renderers/*.test.js`, `__tests__/markers/*.test.js` |
| T8 | `__tests__/geojson/*.test.js`, `__tests__/route/*.test.js` |
| T9 | `__tests__/layers/*.test.js`, `__tests__/legend/*.test.js`, `__tests__/labels/*.test.js`, `__tests__/themes/*.test.js`, `__tests__/table/*.test.js` |
| T10 | `__tests__/api/*.test.js` |
| T11 | `__tests__/main.test.js`, `__tests__/integration/*.test.js` |
| T12 | `__tests__/bundle.test.js`, `__tests__/environment.test.js` |

### 8.4 Gestion de `window.GeoLeaf` dans les tests

En V4, le namespace `window.GeoLeaf` n'existe plus en mode ESM. Les tests doivent importer directement les modules.

**Exception** : `__tests__/bundle.test.js` teste le build UMD — il doit continuer à vérifier que `window.GeoLeaf` est correctement peuplé via le fichier `dist/geoleaf.umd.js`.

### 8.5 Tests ESM prototypes existants (10 fichiers) — État vérifié

> **⚠️ ATTENTION** : Ces 10 fichiers `.esm.test.js` sont des **prototypes forward-looking** créés avant la migration. Ils importent depuis des chemins qui **n'existent pas encore** (`src/core/`, `src/config/`). Ils doivent être corrigés en Étape 4.1.9.

| # | Fichier | Import actuel (FAUX) | Import corrigé (cible) | Tier source |
|---|---------|---------------------|------------------------|-------------|
| 1 | `__tests__/helpers/log.esm.test.js` | `../../src/core/log.js` | `../../src/modules/log/logger.js` | T0 |
| 2 | `__tests__/helpers/errors.esm.test.js` | `../../src/core/errors.js` | `../../src/modules/errors/index.js` | T1 |
| 3 | `__tests__/constants/constants.esm.test.js` | `../../src/core/constants.js` | `../../src/modules/constants/index.js` | T1 |
| 4 | `__tests__/security/security.esm.test.js` | `../../src/core/security.js` | `../../src/modules/security/index.js` | T1b |
| 5 | `__tests__/utils/utils.esm.test.js` | `../../src/core/utils.js` | `../../src/modules/utils/core-utils.js` | T2 |
| 6 | `__tests__/utils/dom-security.esm.test.js` | `../../src/core/utils.js` | `../../src/modules/utils/dom-security.js` | T2 |
| 7 | `__tests__/core/core.esm.test.js` | `../../src/core/core.js` | `../../src/modules/core/index.js` | T3 |
| 8 | `__tests__/config/data-converter.esm.test.js` | `../../src/config/data-converter.js` | `../../src/modules/config/data-converter.js` | T5 |
| 9 | `__tests__/config/loader.esm.test.js` | `../../src/config/loader.js` | `../../src/modules/config/loader.js` | T5 |
| 10 | `__tests__/config/geoleaf-config.esm.test.js` | fallback `global.GeoLeaf` | À réécrire complètement en ESM | T5 |

**Pattern d'import utilisé dans les prototypes** :
```javascript
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const modulePath = resolve(__dirname, '../../src/modules/log/logger.js'); // ← CORRIGÉ
const module = await import(modulePath); // top-level await
```

> **Stratégie** : corriger les chemins en 4.1.9, mais ces tests ne passeront qu'après migration du fichier source correspondant. Les marquer `describe.skip()` jusqu'au tier concerné.

---

## 9. Migration des plugins

### 9.1 Plugin Storage

Le fichier `src/plugins/geoleaf-storage.plugin.js` est déjà un agrégateur ESM d'imports. Il faut :

1. Migrer tous les modules sous `src/modules/storage/` en ESM (20+ fichiers)
2. Mettre à jour les imports du plugin pour pointer vers les nouveaux chemins
3. Créer un barrel `src/modules/storage/index.js`

```javascript
// src/plugins/storage.plugin.js (V4)
export { Storage } from '../modules/storage/index.js';
export { CacheManager } from '../modules/storage/cache-manager.js';
export { OfflineDetector } from '../modules/storage/offline-detector.js';
// ... etc.
```

### 9.2 Plugin AddPOI

Même approche :

1. Migrer `src/modules/poi/add-form/**` et `src/modules/poi/sync-handler.js`, `placement-mode.js`, `image-upload.js`
2. Mettre à jour le plugin pour imports ESM

```javascript
// src/plugins/addpoi.plugin.js (V4)
export { AddFormOrchestrator } from '../modules/poi/add-form-orchestrator.js';
export { PlacementMode } from '../modules/poi/placement-mode.js';
// ...
```

### 9.3 Build des plugins

Les plugins ont un dual output dans `rollup.config.mjs` :
- **ESM** : pour `import` dans un bundler
- **IIFE** : pour `<script>` après le bundle core UMD

---

## 10. Migration des types TypeScript

### 10.1 Split `index.d.ts` (772 lignes) → fichiers par module

```
dist/types/                    ← Généré ou copié au build
├── index.d.ts                 ← Barrel de types
├── log.d.ts
├── errors.d.ts
├── constants.d.ts
├── security.d.ts
├── utils.d.ts
├── core.d.ts
├── ui.d.ts
├── config.d.ts
├── baselayers.d.ts
├── filters.d.ts
├── poi.d.ts
├── geojson.d.ts
├── route.d.ts
├── legend.d.ts
├── labels.d.ts
├── layer-manager.d.ts
├── themes.d.ts
├── table.d.ts
├── api.d.ts
└── boot.d.ts
```

### 10.2 Pattern de chaque fichier `.d.ts`

```typescript
// dist/types/security.d.ts
export declare function escapeHtml(str: string): string;
export declare function validateUrl(url: string): string;
export declare function validateCoordinates(lat: number, lng: number): boolean;
export declare function sanitizePoiProperties(props: Record<string, unknown>): Record<string, string>;

export declare const Security: {
    escapeHtml: typeof escapeHtml;
    validateUrl: typeof validateUrl;
    validateCoordinates: typeof validateCoordinates;
    sanitizePoiProperties: typeof sanitizePoiProperties;
};
```

### 10.3 Barrel `dist/types/index.d.ts`

```typescript
export * from './log';
export * from './errors';
export * from './constants';
export * from './security';
export * from './utils';
export * from './core';
export * from './ui';
export * from './config';
export * from './baselayers';
export * from './filters';
export * from './poi';
export * from './geojson';
export * from './route';
export * from './legend';
export * from './labels';
export * from './layer-manager';
export * from './themes';
export * from './table';
export * from './api';
export * from './boot';
```

---

## 11. Migration ESLint 8 → 9 (À FAIRE APRÈS la migration ESM)

> **Décision D3** : La migration ESLint 8 → 9 est découplée de la migration ESM principale.
> Elle sera effectuée en **Phase 4b**, après le merge de `feature/esm-migration` dans `develop`.
> Pendant la migration ESM, `.eslintrc.json` reste en ESLint 8 avec `sourceType: "script"`.
> Ceci génèrera des warnings ESLint (import/export non reconnus) — c'est **attendu et accepté**.
> Alternative : ajouter temporairement `sourceType: "module"` dans `.eslintrc.json` dès l'Étape 4.1.

> **État actuel vérifié** : `.eslintrc.json` existe, ESLint 8.57.0, `sourceType: "script"`, `ecmaVersion: 2021`,
> globals `GeoLeaf: writable` et `L: readonly`. Plugin `eslint-plugin-security` 3.0.1.

### 11.1 Supprimer `.eslintrc.json`

### 11.2 Créer `eslint.config.js` (flat config)

```javascript
// eslint.config.js
import js from '@eslint/js';
import security from 'eslint-plugin-security';
import prettier from 'eslint-config-prettier';

export default [
    // Config de base
    js.configs.recommended,
    
    // Plugin sécurité
    {
        plugins: { security },
        rules: {
            'security/detect-object-injection': 'warn',
            'security/detect-non-literal-regexp': 'warn',
            'security/detect-unsafe-regex': 'error',
            'security/detect-buffer-noassert': 'error',
            'security/detect-eval-with-expression': 'error',
            'security/detect-no-csrf-before-method-override': 'error',
            'security/detect-possible-timing-attacks': 'warn',
        },
    },
    
    // Règles globales
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',        // ← ESM !
            globals: {
                // Plus de GeoLeaf: writable !
                // L reste pour les fichiers qui utilisent le global Leaflet (UMD entry)
            },
        },
        rules: {
            'no-var': 'error',
            'prefer-const': 'error',
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-script-url': 'error',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'complexity': ['warn', 10],
            'max-depth': ['warn', 4],
            'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
        },
    },
    
    // Override tests
    {
        files: ['__tests__/**/*.js'],
        languageOptions: {
            globals: {
                jest: 'readonly',
                describe: 'readonly',
                test: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
            },
        },
        rules: {
            'no-eval': 'off',
            'no-script-url': 'off',
            'security/detect-eval-with-expression': 'off',
            'max-lines-per-function': 'off',
        },
    },
    
    // Prettier en dernier (désactive les règles de formatage)
    prettier,
];
```

### 11.3 Mise à jour des devDependencies

```jsonc
{
  "devDependencies": {
    "eslint": "^9.0.0",                    // ← Upgrade
    "@eslint/js": "^9.0.0",                // ← NOUVEAU
    "eslint-config-prettier": "^10.0.0",   // ← Compatible ESLint 9
    "eslint-plugin-security": "^3.0.1",    // ← Vérifier compat ESLint 9
    // SUPPRIMER eslint-config-* hérités si présents
  }
}
```

---

## 12. Documentation V4

### 12.1 Documents à créer

| Document | Contenu |
|----------|---------|
| `docs/MIGRATION_V3_TO_V4.md` | Guide de migration pour les utilisateurs de la V3 |
| `docs/ARCHITECTURE_GUIDE.md` | Réécriture complète — architecture ESM, DAG de dépendances |
| `docs/API_REFERENCE.md` | Réécriture — imports ESM, exports nommés |
| `docs/DEVELOPER_GUIDE.md` | Mise à jour — comment contribuer en ESM |
| `README.md` | Mise à jour — installation, quick start V4 |

### 12.2 Guide de migration V3 → V4 (structure)

```markdown
# Migration GeoLeaf V3 → V4

## Breaking Changes
- `window.GeoLeaf` n'est plus le mode d'accès principal (mais reste disponible via UMD)
- Les imports changent : `import { Core, GeoJSON } from 'geoleaf'`
- Les plugins s'importent séparément : `import 'geoleaf/plugins/storage'`
- `type: "module"` requis dans package.json du projet consommateur (ou .mjs)

## Avant/Après — CDN (<script>)
### V3
<script src="geoleaf.min.js"></script>
<script>GeoLeaf.boot({ ... });</script>

### V4 — Identique ! (rétrocompat UMD)
<script src="geoleaf.min.js"></script>
<script>GeoLeaf.boot({ ... });</script>

## Avant/Après — NPM / Bundler
### V3
import GeoLeaf from 'geoleaf';
GeoLeaf.boot({ ... });

### V4
import { boot, Core, GeoJSON } from 'geoleaf';
boot({ ... });
// Ou import sélectif pour tree-shaking :
import { Core } from 'geoleaf';
import { GeoJSON } from 'geoleaf';
```

---

## 13. Checklist de validation

### 13.1 Validation Day 1 (Étape 4.1 — infrastructure)

- [ ] Branche `feature/esm-migration` créée depuis `develop`
- [ ] `.nvmrc` créé avec `18`
- [ ] `src/static/js/` renommé en `src/modules/` (205 fichiers)
- [ ] `src/static/css/` déplacé en `src/css/`
- [ ] `src/static/` supprimé (vide)
- [ ] `src/modules/index.js` (deprecated registry) supprimé
- [ ] `src/modules/geoleaf.logger-shim.js` supprimé
- [ ] `package.json` → `"type": "module"`, `"module"`, `"exports"`, `"sideEffects"` ajoutés
- [ ] `rollup.config.mjs` → ESM + UMD dual output, preamble `v4.0.0`
- [ ] `jsconfig.json` → `moduleResolution: "bundler"`, `baseUrl`, `paths`, `include` ajoutés
- [ ] `__mocks__/leaflet.js` et `__mocks__/leaflet.markercluster.js` créés
- [ ] `jest.config.js` → ESM format, `moduleNameMapper` Leaflet
- [ ] `bundle-entry.js` → chemins `static/js/` → `modules/` corrigés
- [ ] 10 fichiers `.esm.test.js` → chemins `src/core/` → `src/modules/` corrigés
- [ ] `npm run build` → pas d'erreur
- [ ] `npm run test:jest` → tests existants passent
- [ ] Commit initial : `chore(esm): prepare infrastructure for Phase 4 migration`

### 13.2 À chaque tier migré

- [ ] `npm run build` → pas d'erreur Rollup
- [ ] `npm run test:jest` → tous les tests passent
- [ ] `npm run lint` → pas d'erreur (warnings acceptés temporairement)
- [ ] Ouvrir `dist/geoleaf.umd.js` → vérifier que `window.GeoLeaf.*` est toujours peuplé
- [ ] Ouvrir `demo/index.html` → vérifier que la carte s'affiche correctement

### 13.3 Validation finale V4

- [ ] `npm run build:all` → ESM + UMD + UMD min + CSS + plugins
- [ ] `npm run test:all` → smoke + jest (128+ tests passent)
- [ ] `npm run lint` → 0 erreurs
- [ ] `dist/geoleaf.esm.js` existe et est importable
- [ ] `dist/geoleaf.umd.js` expose `window.GeoLeaf`
- [ ] `dist/geoleaf.min.js` < taille V3 (tree-shaking efficace)
- [ ] `dist/stats.html` → analyser, pas de module dupliqué
- [ ] Types : `dist/types/index.d.ts` résout correctement dans un projet TS
- [ ] Demo CDN : `demo/index.html` fonctionne avec le UMD
- [ ] Demo ESM : tester un `import { boot } from '../dist/geoleaf.esm.js'` dans un fichier module
- [ ] Plugins : Storage et AddPOI fonctionnent en ESM et IIFE
- [ ] `package.json` → `version: "4.0.0"`, `type: "module"`, `exports` configuré
- [ ] `CHANGELOG.md` → section V4.0.0 complète
- [ ] `README.md` → mis à jour
- [ ] `docs/MIGRATION_V3_TO_V4.md` → rédigé
- [ ] `docs/ARCHITECTURE_GUIDE.md` → réécrit

### 13.4 Suppression finale (après T12)

- [ ] `src/load-modules.js` supprimé
- [ ] `src/bundle-entry.js` supprimé (remplacé par `src/index.js`)
- [ ] Aucun pattern `(function` dans `src/modules/` (vérifier avec Annexe A)
- [ ] Aucun `GeoLeaf.*` assignment dans `src/modules/` (sauf `umd-entry.js`)
- [ ] Tous les fichiers `src/modules/**/*.js` ont au moins un `export`
- [ ] `npx madge --circular src/index.js` → 0 dépendance circulaire

---

## 14. Risques et mitigations

| # | Risque | Probabilité | Impact | Mitigation |
|---|--------|-------------|--------|------------|
| 1 | **Ordre de chargement cassé** — un module ESM importé avant sa dépendance | 🟡 Moyen | 🔴 Haut | Suivre strictement le DAG de tiers, tester à chaque étape |
| 2 | **Jest + ESM** — `--experimental-vm-modules` instable | 🟡 Moyen | 🟡 Moyen | Alternative : ajouter `@babel/preset-env` transform dans jest.config |
| 3 | **État singleton cassé** — les `shared.js` avec état mutable ne se comportent pas pareil | 🟢 Faible | 🔴 Haut | ESM évalue une seule fois par défaut = même comportement que IIFE singleton |
| 4 | **Leaflet non trouvé** — `import L from 'leaflet'` échoue si Leaflet est en global | 🟡 Moyen | 🔴 Haut | Rollup `external: ['leaflet']` + `globals: { leaflet: 'L' }` pour UMD |
| 5 | **Régression demo/** — la demo utilise `<script>` et `window.GeoLeaf` | 🟢 Faible | 🟡 Moyen | Le build UMD maintient `window.GeoLeaf` — tester à chaque tier |
| 6 | **Duplication dans le bundle** — un module importé par N modules = N copies | 🟢 Faible | 🟡 Moyen | Rollup fait du hoisting automatique pour ESM — vérifier avec visualizer |
| 7 | **Circular dependencies** — deux modules qui s'importent mutuellement | 🟡 Moyen | 🔴 Haut | Rollup affiche un warning — résoudre par extraction d'un module commun |
| 8 | **Taille bundle UMD augmente** — les `import`/`export` ajoutent du wrapper | 🟢 Faible | 🟢 Faible | Négligeable, Terser compresse efficacement |
| 9 | **10 tests ESM prototypes cassent** — importent depuis `src/core/` et `src/config/` (inexistants) | 🟠 Moyen | 🟠 Moyen | Corriger les chemins → `src/modules/` en 4.1.9, marquer `describe.skip()` jusqu'au tier concerné |
| 10 | **Node.js trop ancien** — `--experimental-vm-modules` requis pour Jest ESM | 🟠 Moyen | 🟠 Moyen | Créer `.nvmrc` avec `18` en 4.1.6, documenter dans README/CONTRIBUTING |
| 11 | **`sourceType: "script"` dans .eslintrc.json** — ESLint 8 ne reconnaît pas `import`/`export` | 🟢 Faible | 🟢 Faible | Warnings acceptés pendant migration. Option : basculer `sourceType: "module"` en 4.1 |

### Plan de rollback

Si la migration bloque à un tier donné :
1. Les tiers précédents sont déjà committé et stables
2. Le build UMD fonctionne à chaque étape
3. On peut arrêter la migration à n'importe quel tier et publier une V3.x intermédiaire
4. **Branche dédiée** : toute la Phase 4 se fait sur `feature/esm-migration`, merge dans `develop` uniquement quand 100% validé

---

## 15. Annexes

### A. Commandes utiles pendant la migration

```powershell
# Vérifier qu'aucun IIFE ne reste dans src/modules/
Select-String -Path "src\modules\**\*.js" -Pattern "^\(function" -Recurse

# Vérifier qu'aucun GeoLeaf.* assignment ne reste
Select-String -Path "src\modules\**\*.js" -Pattern "GeoLeaf\.\w+\s*=" -Recurse

# Vérifier que tous les fichiers ont des exports
Select-String -Path "src\modules\**\*.js" -Pattern "^export " -Recurse | Group-Object Path

# Lister les fichiers SANS export (problème)
$allFiles = Get-ChildItem -Path "src\modules" -Recurse -Filter "*.js"
$allFiles | Where-Object { !(Select-String -Path $_.FullName -Pattern "^export " -Quiet) }

# Chercher les dépendances circulaires
npx madge --circular src/index.js

# Analyser la taille du bundle
npx rollup -c && npx open-cli dist/stats.html

# Tester ESM avec Node.js directement
node --input-type=module -e "import { Core } from './dist/geoleaf.esm.js'; console.log(Core);"
```

### B. Template de commit pour chaque tier

```
feat(esm): migrate Tier X — [nom du domaine] to ES modules

- Convert N files from IIFE to ESM import/export
- Create barrel index.js for [domaine]
- Update N test files to use ESM imports
- Verify: build ✅ | tests ✅ | lint ✅ | demo ✅

Part of: ESM Migration Phase 4 → V4.0.0
```

### C. Dépendances npm à ajouter/mettre à jour pour V4

```jsonc
{
  "devDependencies": {
    // UPGRADE (Phase 4b — après la migration ESM, voir Décision D3)
    // "eslint": "^9.0.0",
    // "@eslint/js": "^9.0.0",
    
    // OPTIONNEL — si Jest ESM natif pose problème
    "@babel/core": "^7.24.0",
    "@babel/preset-env": "^7.24.0",
    "babel-jest": "^29.7.0",
    
    // RECOMMANDÉ — détection dépendances circulaires
    "madge": "^7.0.0"
  }
}
```

> **Note** : `eslint` et `@eslint/js` restent en v8 pendant la migration ESM.
> Ils seront mis à jour en Phase 4b avec la création de `eslint.config.js` (flat config).

### D. Mapping ancien → nouveau chemin (pour rechercher/remplacer dans les tests)

```
src/static/js/geoleaf.log.js           → src/modules/log/logger.js
src/static/js/geoleaf.log.config.js    → src/modules/log/log-config.js
src/static/js/geoleaf.constants.js     → src/modules/constants/index.js
src/static/js/geoleaf.errors.js        → src/modules/errors/index.js
src/static/js/geoleaf.security.js      → src/modules/security/index.js (barrel + extraction)
src/static/js/geoleaf.utils.js         → src/modules/utils/core-utils.js
src/static/js/geoleaf.core.js          → src/modules/core/index.js
src/static/js/geoleaf.ui.js            → src/modules/ui/index.js (barrel)
src/static/js/config/geoleaf-config/*  → src/modules/config/geoleaf-config/* (déjà splitté Phase 3)
src/static/js/geoleaf.baselayers.js    → src/modules/baselayers/index.js
src/static/js/geoleaf.filters.js       → src/modules/filters/index.js
src/static/js/geoleaf.poi.js           → src/modules/poi/index.js (barrel)
src/static/js/geoleaf.geojson.js       → src/modules/geojson/index.js (barrel)
src/static/js/geojson/layer-manager/*  → src/modules/geojson/layer-manager/* (déjà splitté Phase 3)
src/static/js/geojson/loader/*         → src/modules/geojson/loader/* (déjà splitté Phase 3)
src/static/js/geoleaf.route.js         → src/modules/route/index.js (barrel)
src/static/js/geoleaf.legend.js        → src/modules/legend/index.js (barrel)
src/static/js/geoleaf.layer-manager.js → src/modules/layer-manager/index.js (barrel)
src/static/js/geoleaf.table.js         → src/modules/table/index.js (barrel)
src/static/js/geoleaf.storage.js       → src/modules/storage/index.js (barrel)
src/static/js/storage/cache/layer-selector/* → src/modules/storage/cache/layer-selector/* (déjà splitté Phase 3)
src/static/js/geoleaf.api.js           → src/modules/api/index.js (barrel)
src/static/js/geoleaf.helpers.js       → src/modules/helpers/style-resolver.js
src/static/js/geoleaf.validators.js    → src/modules/validators/index.js (barrel)
src/static/js/themes/theme-applier/*   → src/modules/themes/theme-applier/* (déjà splitté Phase 3)

src/static/js/utils/*                  → src/modules/utils/* (même noms)
src/static/js/ui/*                     → src/modules/ui/* (même structure)
src/static/js/config/*                 → src/modules/config/* (même structure)
src/static/js/poi/*                    → src/modules/poi/* (même structure)
src/static/js/geojson/*                → src/modules/geojson/* (même structure)
src/static/js/route/*                  → src/modules/route/* (même structure)
src/static/js/layer-manager/*          → src/modules/layer-manager/* (même structure)
src/static/js/legend/*                 → src/modules/legend/* (même structure)
src/static/js/labels/*                 → src/modules/labels/* (même structure)
src/static/js/themes/*                 → src/modules/themes/* (même structure)
src/static/js/table/*                  → src/modules/table/* (même structure)
src/static/js/storage/*                → src/modules/storage/* (même structure)
src/static/js/api/*                    → src/modules/api/* (même structure)
src/static/js/renderers/*              → src/modules/renderers/* (même structure)
src/static/js/data/*                   → src/modules/data/* (même structure)
src/static/js/loaders/*                → src/modules/loaders/* (même structure)
src/static/js/map/*                    → src/modules/map/* (même structure)
src/static/js/security/*               → src/modules/security/* (même structure)
src/static/js/helpers/*                → src/modules/helpers/* (même structure)
src/static/js/schema/*                 → src/modules/schema/* (même structure)

src/app/ (3 fichiers : boot.js, helpers.js, init.js) → src/boot.js (fusion ESM)
src/bundle-entry.js                    → src/index.js (réécrit, barrel)
src/load-modules.js                    → CONSERVÉ comme référence → SUPPRIMÉ après T12
src/static/js/index.js                 → SUPPRIMÉ en 4.1.5 (deprecated module registry)
src/static/js/geoleaf.logger-shim.js   → SUPPRIMÉ en 4.1.5 (non utilisé)
```

### E. Dépendance DAG visuel (simplifié)

```
                    ┌──────────┐
                    │  boot.js │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │  api/    │
                    └────┬─────┘
                         │
         ┌───────────────┼───────────────────┐
         │               │                   │
    ┌────▼────┐    ┌─────▼─────┐    ┌───────▼───────┐
    │ themes/ │    │ labels/   │    │ layer-manager/ │
    └────┬────┘    └─────┬─────┘    └───────┬───────┘
         │               │                  │
    ┌────▼────┐    ┌─────▼─────┐    ┌──────▼──────┐
    │ legend/ │    │  table/   │    │   geojson/   │
    └────┬────┘    └───────────┘    └──────┬──────┘
         │                                 │
    ┌────▼────────────┬────────────────────┤
    │                 │                    │
    ▼            ┌────▼────┐          ┌───▼───┐
  route/         │  poi/   │          │filters│
                 └────┬────┘          └───┬───┘
                      │                   │
              ┌───────▼───────┐    ┌─────▼──────┐
              │  baselayers/  │    │   config/   │
              └───────┬───────┘    └─────┬──────┘
                      │                  │
                 ┌────▼────┐        ┌───▼───┐
                 │  core/  │        │  ui/  │
                 └────┬────┘        └───┬───┘
                      │                 │
              ┌───────▼─────────────────▼───────┐
              │            utils/               │
              │   validators/  helpers/          │
              └────────────────┬────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         ┌────▼────┐    ┌─────▼─────┐    ┌────▼──────┐
         │security/│    │constants/ │    │  errors/  │
         └────┬────┘    └───────────┘    └───────────┘
              │
         ┌────▼────┐
         │  log/   │
         └─────────┘
```

---

### F. Suppression finale (après T12, avant merge dans develop)

```powershell
# Fichiers de référence conservés pendant la migration
Remove-Item src/load-modules.js          # Loader <script> deprecated
Remove-Item src/bundle-entry.js          # Ancien point d'entrée IIFE (si non déjà supprimé)

# Vérification : aucun IIFE ne reste
Select-String -Path "src\modules\**\*.js" -Pattern "^\(function" -Recurse
# Attendu : 0 résultat

# Vérification : aucun GeoLeaf.* en dehors de umd-entry.js
Select-String -Path "src\modules\**\*.js" -Pattern "GeoLeaf\.\w+\s*=" -Recurse
# Attendu : 0 résultat

# Vérification : tous les fichiers ont des exports
$noExport = Get-ChildItem -Path "src\modules" -Recurse -Filter "*.js" |
  Where-Object { !(Select-String -Path $_.FullName -Pattern "^export " -Quiet) }
if ($noExport) { Write-Warning "Fichiers sans export : $($noExport.Name)" }
```

### G. Fichiers `.esm.test.js` prototypes — Liste complète

| # | Chemin complet | Lignes | Statut |
|---|----------------|--------|--------|
| 1 | `__tests__/helpers/log.esm.test.js` | 366 | Prototype — chemins à corriger en 4.1.9 |
| 2 | `__tests__/helpers/errors.esm.test.js` | 462 | Prototype — chemins à corriger en 4.1.9 |
| 3 | `__tests__/constants/constants.esm.test.js` | 521 | Prototype — chemins à corriger en 4.1.9 |
| 4 | `__tests__/security/security.esm.test.js` | 632 | Prototype — chemins à corriger en 4.1.9 |
| 5 | `__tests__/utils/utils.esm.test.js` | 764 | Prototype — chemins à corriger en 4.1.9 |
| 6 | `__tests__/utils/dom-security.esm.test.js` | 554 | Prototype — chemins à corriger en 4.1.9 |
| 7 | `__tests__/core/core.esm.test.js` | 526 | Prototype — chemins à corriger en 4.1.9 |
| 8 | `__tests__/config/data-converter.esm.test.js` | 391 | Prototype — chemins à corriger en 4.1.9 |
| 9 | `__tests__/config/loader.esm.test.js` | 535 | Prototype — chemins à corriger en 4.1.9 |
| 10 | `__tests__/config/geoleaf-config.esm.test.js` | 763 | Stub — à réécrire complètement |

---

*Ce document est le plan de migration complet. Il sera utilisé comme référence unique pour exécuter la Phase 4 de manière autonome.*

*Dernière mise à jour : 15 février 2026 — v2.2 (ajout §0 Pré-vol, inventaire vérifié, décisions architecturales, risques #9-11)*
