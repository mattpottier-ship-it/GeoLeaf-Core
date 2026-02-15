# GeoLeaf — Architecture Plugin

> **Version** : 3.2.0 — **Date** : 15 février 2026

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Principe de chargement en 3 étapes](#2-principe-de-chargement-en-3-étapes)
3. [Plugin Storage](#3-plugin-storage)
4. [Plugin AddPOI](#4-plugin-addpoi)
5. [Guard system — Vérification des plugins](#5-guard-system--vérification-des-plugins)
6. [Modules future-ready (non bundlés)](#6-modules-future-ready-non-bundlés)
7. [Créer un plugin custom](#7-créer-un-plugin-custom)
8. [FAQ](#8-faq)
9. [Voir aussi](#9-voir-aussi)

---

## 1. Vue d'ensemble

GeoLeaf utilise une **architecture à plugins** depuis la v3.2.0. Le bundle core (`geoleaf.umd.js`) contient les modules essentiels (carte, configuration, UI, GeoJSON, thèmes, légende…). Les fonctionnalités avancées sont découpées en **plugins optionnels** chargés séparément :

| Plugin | Fichier | Rôle | Taille approx. |
|--------|---------|------|-----------------|
| **Storage** | `geoleaf-storage.plugin.js` | IndexedDB, cache offline, Service Worker, sync | ~45 modules |
| **AddPOI** | `geoleaf-addpoi.plugin.js` | Formulaire d'ajout/édition/suppression de POI | ~14 modules |

### Pourquoi une architecture plugin ?

- **Bundle core allégé** : seules les fonctionnalités essentielles sont chargées systématiquement
- **Chargement à la demande** : un site sans POI n'a pas besoin du plugin AddPOI
- **Dégradation gracieuse** : si un plugin n'est pas chargé, le core fonctionne normalement avec des guards automatiques
- **Maintenance simplifiée** : chaque plugin a son cycle de vie indépendant

---

## 2. Principe de chargement en 3 étapes

```
Étape 1 — Bundle Core           Étape 2 — Plugins (optionnels)       Étape 3 — Boot
─────────────────────────────    ─────────────────────────────────    ──────────────────
<script src="geoleaf.umd.js">   <script src="geoleaf-storage.       <script>
                                     plugin.js">                       GeoLeaf.boot();
  → Namespace GeoLeaf.*           → Enrichit GeoLeaf.Storage.*       </script>
  → Config, UI, GeoJSON,          <script src="geoleaf-addpoi.
    Themes, Legend, Route,             plugin.js">                     → Charge la config
    Labels, BaseLayers…             → Enrichit GeoLeaf.POI.*          → Initialise la carte
                                                                       → Active les modules
                                                                       → Vérifie les plugins
```

### Ordre de chargement (obligatoire)

```html
<!-- 1. Bundle core (OBLIGATOIRE) -->
<script src="dist/geoleaf.umd.js"></script>

<!-- 2. Plugins (OPTIONNELS — après le core, avant boot) -->
<script src="dist/geoleaf-storage.plugin.js"></script>
<script src="dist/geoleaf-addpoi.plugin.js"></script>

<!-- 3. Boot (OBLIGATOIRE — toujours en dernier) -->
<script>GeoLeaf.boot();</script>
```

> ⚠️ **Important** : les plugins doivent être chargés **après** `geoleaf.umd.js` et **avant** `GeoLeaf.boot()`. Ils enrichissent le namespace `GeoLeaf` avant que l'initialisation ne commence.

### Flow interne

1. `GeoLeaf.boot()` attend le `DOMContentLoaded` si nécessaire
2. Appelle `_app.startApp()` → charge la config via `GeoLeaf.loadConfig()`
3. Appelle `_app.initApp(cfg)` qui :
   - Exécute `_app.checkPlugins(cfg)` pour vérifier la cohérence plugins/config
   - Initialise la carte Leaflet
   - Initialise le Storage (si plugin chargé) via `GeoLeaf.Storage.init()`
   - Initialise tous les modules core (UI, BaseLayers, POI, GeoJSON, Themes…)
   - Révèle l'application (retire le loader)

---

## 3. Plugin Storage

**Fichier** : `src/plugins/geoleaf-storage.plugin.js`

### Modules importés (~45 fichiers)

Le plugin Storage regroupe tout ce qui concerne le stockage local, le cache offline et la synchronisation :

#### Storage — Modules racine

| Module | Fichier | Namespace | Rôle |
|--------|---------|-----------|------|
| StorageHelper | `storage-helper.js` | `GeoLeaf.Storage` | Utilitaires de base storage |
| IDBHelper | `idb-helper.js` | `GeoLeaf.Storage.IDBHelper` | Wrapper promise IndexedDB |
| IndexedDB | `indexeddb.js` | `GeoLeaf.StorageDB` | Module principal IndexedDB (5 object stores) |
| SchemaValidators | `schema-validators.js` | `GeoLeaf.Storage.Validators` | Validation schemas IDB (Layer, Preference, SyncQueue…) |
| OfflineDetector | `offline-detector.js` | `GeoLeaf.OfflineDetector` | Détection online/offline avec badge UI |
| CacheManager | `cache-manager.js` | `GeoLeaf.CacheManager` | Orchestrateur du cache offline |
| SyncManager | `sync-manager.js` | `GeoLeaf.SyncManager` | Synchronisation online/offline queue |
| Telemetry | `telemetry.js` | `GeoLeaf.Storage.Telemetry` | Métriques de performance cache |
| CacheControl | `cache-control.js` | `GeoLeaf.CacheControl` | Politique de contrôle du cache |
| SWRegister | `sw-register.js` | `GeoLeaf._SWRegister` | Enregistrement/mise à jour du Service Worker |
| StorageAPI | `geoleaf.storage.js` | `GeoLeaf.Storage` | Façade publique unifiée |

#### DB — Sous-modules IndexedDB spécialisés

| Module | Fichier | Rôle |
|--------|---------|------|
| Layers | `db/layers.js` | CRUD couches GeoJSON en cache |
| Preferences | `db/preferences.js` | Préférences utilisateur (key-value) |
| Sync | `db/sync.js` | File d'attente de synchronisation |
| Backups | `db/backups.js` | Sauvegardes automatiques |
| Images | `db/images.js` | Cache images/icônes POI |

#### Cache — Modules de téléchargement offline

| Module | Fichier | Rôle |
|--------|---------|------|
| CacheStorage | `cache/storage.js` | Couche d'abstraction Cache API |
| Calculator | `cache/calculator.js` | Estimation de taille avant téléchargement |
| Validator | `cache/validator.js` | Validation intégrité des données cached |
| Metrics | `cache/metrics.js` | Métriques de téléchargement (vitesse, progression) |
| ResourceEnumerator | `cache/resource-enumerator.js` | Énumération des ressources d'un profil |
| ProgressTracker | `cache/progress-tracker.js` | Suivi de progression UI |
| RetryHandler | `cache/retry-handler.js` | Logique de retry sur erreur réseau |
| FetchManager | `cache/fetch-manager.js` | Gestionnaire de requêtes fetch |
| DownloadHandler | `cache/download-handler.js` | Orchestration téléchargement par lot |
| Downloader | `cache/downloader.js` | Téléchargeur principal |

#### Cache — Layer Selector (UI de sélection des couches à cacher)

| Module | Fichier | Rôle |
|--------|---------|------|
| Core | `cache/layer-selector/core.js` | Initialisation, populate, cleanup |
| DataFetching | `cache/layer-selector/data-fetching.js` | Récupération type géométrie et taille |
| RowRendering | `cache/layer-selector/row-rendering.js` | Rendu des lignes de couches |
| SelectionCache | `cache/layer-selector/selection-cache.js` | Sauvegarde/restauration de la sélection |

#### UI — Bouton de cache offline

| Module | Fichier | Rôle |
|--------|---------|------|
| ButtonControl | `ui/cache-button/button-control.js` | Contrôle Leaflet du bouton |
| ModalManager | `ui/cache-button/modal-manager.js` | Modale de gestion du cache |
| ExportLogic | `ui/cache-button/export-logic.js` | Logique d'export des données |
| CacheButton | `ui/cache-button.js` | Orchestrateur du bouton cache |

### Service Worker

Le plugin charge aussi `sw-register.js` qui permet d'enregistrer le Service Worker (`sw.js`). Le SW lui-même n'est pas bundlé (il s'exécute dans un contexte séparé) — il est copié dans le dossier de déploiement.

```javascript
// Activation du Service Worker via config profil
{
  "storage": {
    "enableServiceWorker": true
  }
}
```

---

## 4. Plugin AddPOI

**Fichier** : `src/plugins/geoleaf-addpoi.plugin.js`

### Modules importés (~14 fichiers)

| Catégorie | Module | Fichier | Rôle |
|-----------|--------|---------|------|
| **Sync** | SyncHandler | `poi/sync-handler.js` | Pont vers Storage (guards si absent) |
| **Placement** | PlacementMode | `poi/placement-mode.js` | Sélection coordonnées sur carte |
| **Upload** | ImageUpload | `poi/image-upload.js` | Upload et preview d'images |
| **Renderers** | ModalRenderer | `poi/add-form/renderers/modal-renderer.js` | Structure modale HTML |
| | SectionsRenderer | `poi/add-form/renderers/sections-renderer.js` | Sections du formulaire |
| | FieldsRenderer | `poi/add-form/renderers/fields-renderer.js` | Champs de saisie |
| | ImagesRenderer | `poi/add-form/renderers/images-renderer.js` | Zone d'upload d'images |
| **Core** | StateManager | `poi/add-form/state-manager.js` | État du formulaire |
| | DataMapper | `poi/add-form/data-mapper.js` | Mapping données → formulaire |
| | Validator | `poi/add-form/validator.js` | Validation des champs |
| | FieldsManager | `poi/add-form/fields-manager.js` | Gestion dynamique des champs |
| | Renderer | `poi/add-form/renderer.js` | Rendu principal du formulaire |
| | SubmitHandler | `poi/add-form/submit-handler.js` | Soumission et envoi API |
| | RealtimeValidator | `poi/add-form/realtime-validator.js` | Validation en temps réel |
| | LazyLoader | `poi/add-form/lazy-loader.js` | Chargement différé des composants |
| **Orchestrator** | AddFormOrchestrator | `poi/add-form-orchestrator.js` | API publique du formulaire |

### Dégradation gracieuse

Le plugin AddPOI fonctionne **avec ou sans** le plugin Storage :

- **Avec Storage** : les POI ajoutés sont synchronisés via `SyncHandler` → `SyncManager` → IndexedDB → API backend
- **Sans Storage** : le `SyncHandler` détecte l'absence de `GeoLeaf.Storage` et passe en mode **online-only** (envoi direct à l'API)

---

## 5. Guard system — Vérification des plugins

Défini dans `src/app/helpers.js`, la fonction `_app.checkPlugins(cfg)` est appelée automatiquement au boot :

```javascript
// Extrait de app/helpers.js — _app.checkPlugins(cfg)
```

### Vérifications effectuées

| Condition dans le profil | Plugin attendu | Avertissement si absent |
|-------------------------|----------------|------------------------|
| `cfg.ui.showAddPoi === true` | `GeoLeaf.POI.AddForm` | "AddPOI plugin is not loaded" |
| `cfg.storage` (présent) | `GeoLeaf.Storage` | "Storage plugin is not loaded" |
| `cfg.storage.enableServiceWorker === true` | `GeoLeaf._SWRegister` | "SW Register module is not available" |
| `GeoLeaf.POI.SyncHandler` chargé | `GeoLeaf.Storage` | "SyncHandler loaded without Storage — sync disabled" |

Ces guards produisent des `console.warn()` mais n'empêchent **pas** le boot — l'application continue avec les fonctionnalités disponibles.

---

## 6. Modules future-ready (non bundlés)

Ces modules existent dans le code source mais ne sont **pas importés** dans les plugins. Ils sont prêts pour une intégration future :

### `storage/compression.js` — Compression des données cachées

- **Namespace** : `GeoLeaf.Storage.Compression`
- **API** : `init()`, `compress()`, `decompress()`, `shouldCompress()`
- **Technologie** : CompressionStream / DecompressionStream API (GZIP, DEFLATE)
- **Gain attendu** : 40-60% de réduction sur les données JSON/GeoJSON
- **Statut** : fonctionnel, en attente d'intégration dans le workflow `CacheManager.cacheProfile()`

### `storage/cache-strategy.js` — Stratégies de cache intelligentes

- **Namespace** : `GeoLeaf.Storage.CachingStrategy`
- **Stratégies** :
  - **LRU** (Least Recently Used) — éviction par ancienneté d'accès
  - **LFU** (Least Frequently Used) — éviction par fréquence d'accès
  - **TTL** (Time-To-Live) — expiration par durée de vie
  - **FIFO** (First In First Out) — éviction par ordre d'insertion
- **Classe de base** : `CacheStrategy` (abstraite, `add()`, `get()`, `evict()`, `getStats()`)
- **Statut** : fonctionnel, en attente d'intégration dans le `CacheManager` pour remplacer la stratégie d'éviction simple actuelle

> 💡 Pour intégrer ces modules, il suffit d'ajouter leur import dans `geoleaf-storage.plugin.js` et de les connecter au workflow existant.

---

## 7. Créer un plugin custom

### Structure minimale

```javascript
/*!
 * GeoLeaf Custom Plugin
 * Doit être chargé APRÈS geoleaf.umd.js et AVANT GeoLeaf.boot().
 */

// Importer les modules du plugin
import '../static/js/mon-module/core.js';
import '../static/js/mon-module/ui.js';
```

### Conventions

1. **Nommage** : `geoleaf-{nom}.plugin.js` (ex: `geoleaf-analytics.plugin.js`)
2. **Namespace** : enrichir `GeoLeaf.{NomPlugin}` (ex: `GeoLeaf.Analytics`)
3. **IIFE** : chaque module utilise le pattern IIFE de GeoLeaf :
   ```javascript
   (function (global) {
       "use strict";
       const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
       GeoLeaf.MonModule = { /* ... */ };
   })(window);
   ```
4. **Guards** : si votre plugin dépend d'un autre (ex: Storage), utilisez des guards :
   ```javascript
   if (!GeoLeaf.Storage) {
       console.warn('MonPlugin nécessite le plugin Storage.');
       return;
   }
   ```
5. **Build** : ajouter une entrée dans `rollup.config.mjs` pour générer le bundle plugin

### Rollup config (extrait)

```javascript
// rollup.config.mjs — ajouter une entrée pour le nouveau plugin
{
    input: 'src/plugins/geoleaf-monplugin.plugin.js',
    output: {
        file: 'dist/geoleaf-monplugin.plugin.js',
        format: 'iife'
    }
}
```

---

## 8. FAQ

### Q : Que se passe-t-il si je charge un plugin sans le core ?
Le plugin tente d'enrichir `GeoLeaf` mais le namespace sera presque vide. Au boot, les modules qui dépendent du core échoueront silencieusement. **Toujours charger `geoleaf.umd.js` en premier.**

### Q : Puis-je charger les plugins de manière asynchrone ?
Oui, avec `defer` ou un chargement dynamique, tant que `GeoLeaf.boot()` est appelé **après** que tous les scripts soient chargés :
```html
<script src="geoleaf.umd.js" defer></script>
<script src="geoleaf-storage.plugin.js" defer></script>
<script defer>
    document.addEventListener('DOMContentLoaded', () => GeoLeaf.boot());
</script>
```

### Q : Le plugin Storage est-il nécessaire pour le mode offline ?
Oui. Sans le plugin Storage, l'application fonctionne en mode **online-only**. Le cache navigateur standard est utilisé, mais il n'y a pas de cache IndexedDB, pas de Service Worker, et pas de synchronisation offline.

### Q : Comment savoir quels plugins sont chargés ?
Dans la console :
```javascript
console.log('Storage:', !!GeoLeaf.Storage);
console.log('AddPOI:', !!GeoLeaf.POI?.AddForm);
console.log('SW:', !!GeoLeaf._SWRegister);
```

---

## 9. Voir aussi

- [Architecture Guide](../ARCHITECTURE_GUIDE.md) — architecture globale et diagrammes
- [Storage README](../storage/GeoLeaf_Storage_README.md) — API publique du Storage
- [Cache README](../storage/GeoLeaf_Cache_README.md) — système de cache détaillé
- [IndexedDB](../storage/indexeddb.md) — module IndexedDB et IDBHelper
- [Core README](../core/GeoLeaf_core_README.md) — module core et `GeoLeaf.init()`
- [Init Flow](../core/GeoLeaf_INIT_FLOW.md) — diagramme de séquence complet
- [Developer Guide](../DEVELOPER_GUIDE.md) — guide de développement et build
