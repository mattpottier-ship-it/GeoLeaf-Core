# GeoLeaf JS — Boot Sequence (v4.0.0)

Product Version: GeoLeaf Platform V1

> **Référence :** `ROADMAP_PHASE8_FIXES.md` batch C15  
> **Dernière mise à jour :** 2026-02-19

Ce document décrit la séquence complète du démarrage de GeoLeaf, depuis l'évaluation du bundle jusqu'à l'émission de l'événement `geoleaf:app:ready`.

---

## Vue d'ensemble

```
bundle-entry.js (Rollup entry)
    │
    ├── T12 : src/app/helpers.js
    ├── T12 : src/app/init.js
    ├── T12 : src/app/boot.js
    │
    ├── lazy resolvers Map (_lazyModuleResolvers)
    │       poi, poiCore, poiRenderers, poiExtras, poiAddForm
    │       basemapSelector, route, layerManager, legend, labels, themes, table
    │
    ├── modules/globals.js  ← side-effect : assigne window.GeoLeaf.*
    └── modules/geoleaf.api.js  ← étend window.GeoLeaf (loadConfig, init, boot…)
```

---

## Étape 1 — Évaluation du bundle (`bundle-entry.js`)

### Imports T12 — Bootstrap applicatif

| Ordre | Fichier              | Responsabilité                                    |
| :---: | -------------------- | ------------------------------------------------- |
|   1   | `src/app/helpers.js` | Utilitaires partagés `_app.*`                     |
|   2   | `src/app/init.js`    | `GeoLeaf.init()`, `_app.initApp()`, `revealApp()` |
|   3   | `src/app/boot.js`    | `GeoLeaf.boot()`, `_app.startApp()`               |

> **Note :** Ces modules utilisent le **Pattern A pur** — leurs dépendances sont importées directement via ESM, sans passer par `globals.js`.

### Table de resolvers lazy

```javascript
// bundle-entry.js — Map extensible (ajout possible sans modifier le core)
const _lazyModuleResolvers = new Map([
    [
        "poi",
        async () => {
            /* poi-core → poi-renderers+extras → poi-add-form */
        },
    ],
    ["poiCore", () => import("./lazy/poi-core.js")],
    ["poiRenderers", () => import("./lazy/poi-renderers.js")],
    ["poiExtras", () => import("./lazy/poi-extras.js")],
    ["poiAddForm", () => import("./lazy/poi-add-form.js")],
    ["basemapSelector", () => import("./lazy/basemap-selector.js")],
    ["route", () => import("./lazy/route.js")],
    ["layerManager", () => import("./lazy/layer-manager.js")],
    ["legend", () => import("./lazy/legend.js")],
    ["labels", () => import("./lazy/labels.js")],
    ["themes", () => import("./lazy/themes.js")],
    ["table", () => import("./lazy/table.js")],
]);
```

Après la Map, les resolvers sont enregistrés dans `PluginRegistry.registerLazy()`.  
`GeoLeaf._loadModule(name)` est ensuite exposé comme API publique.

---

## Étape 2 — `globals.js` : assemblage du namespace `window.GeoLeaf`

`globals.js` est importé en **dernier** par `bundle-entry.js` (après les app files et la lazy Map) pour garantir que tous les modules sont bien définis quand les assignations `window.GeoLeaf.*` s'exécutent.

### Batches d'importation et assignation (B1–B11)

|  Batch  | Périmètre                               | Modules clés assignés sur `window.GeoLeaf`                                                                     |
| :-----: | --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **B1**  | Log, Errors, Constants, Security        | `Log`, `Errors`, `CONSTANTS`, `Security`, `Security.CSRFToken`                                                 |
| **B2**  | Utils (15 modules)                      | `Utils`, `Utils.AnimationHelper`, `Utils.FetchHelper`, `Utils.LazyLoader`, `Utils.PerformanceProfiler`…        |
| **B3**  | Helpers, Validators, Renderers, Loaders | `StyleResolver`, `StyleLoader`, `DataNormalizer`, `_ScaleControl`                                              |
| **B4**  | Config                                  | `Config`, `Config.Loader`, `Config.ProfileManager`, `Config.TaxonomyManager`…                                  |
| **B5**  | GeoJSON, Route                          | `_GeoJSONShared`, `_GeoJSONCore`, `_GeoJSONLayerManager`, `Route.*`                                            |
| **B6**  | Labels, Legend, LayerManager            | `Labels`, `Legend`, `_LayerManager*`, `_LabelButtonManager`                                                    |
| **B7**  | Themes                                  | `Themes`, `ThemeLoader`, `ThemeSelector`, `ThemeApplier`                                                       |
| **B8**  | Storage (core)                          | Modules internes storage — exposés sur `window.GeoLeaf.Storage` via plugin                                     |
| **B9**  | UI (25+ modules)                        | `UI`, `UI.FilterPanel`, `UI.notifications`, `UI.ContentBuilder`…                                               |
| **B10** | POI + AddForm                           | `POI.*`, `POI.AddForm.*`, `POISyncHandler`                                                                     |
| **B11** | API facades + PluginRegistry + BootInfo | `GeoLeaf.plugins` (PluginRegistry), `GeoLeaf.bootInfo` (BootInfo), `Core`, `Baselayers`, `Filters`, `Helpers`… |

### Version injectable (C0)

```javascript
// globals.js — injecté par Rollup replace() au build
_g.GeoLeaf._version =
    typeof __GEOLEAF_VERSION__ !== "undefined" ? __GEOLEAF_VERSION__ : "4.0.0-dev";
```

### `geoleaf.api.js` — dernier import

`geoleaf.api.js` est importé **après** `globals.js` car il a besoin que `_APIController` soit configuré (par `api/controller.js` importé dans B11).  
Il étend `window.GeoLeaf` avec : `loadConfig()`, `init()`, `setTheme()`, `setLanguage()`…

---

## Étape 3 — `GeoLeaf.boot()` : démarrage de l'application

### Déclenchement

```html
<!-- Usage intégrateur — après les scripts du bundle -->
<script>
    GeoLeaf.boot();
</script>
```

`GeoLeaf.boot()` est exposé dans `src/app/boot.js`. Il délègue à `_app.startApp()` en respectant le `readyState` du DOM :

```javascript
GeoLeaf.boot = function () {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", _app.startApp);
    } else {
        _app.startApp();
    }
};
```

### `_app.startApp()` — séquence détaillée

```
startApp()
    │
    ├── 1. Écoute { once: true } → 'geoleaf:app:ready' → GeoLeaf.bootInfo.show()
    │
    ├── 2. Lit sessionStorage 'gl-selected-profile' (validation regex)
    │
    ├── 3. GeoLeaf.loadConfig({ url, profileId, autoEvent, onLoaded, onError })
    │       └── fetch geoleaf.config.json
    │           ├── Config.init()
    │           ├── Config.getCategories()
    │           └── → resolve(cfg)
    │
    ├── 4. GeoLeaf.Config.loadActiveProfileResources()
    │       ├── fetch profile.json
    │       ├── fetch mapping.json (si normalized=false)
    │       ├── normalisation taxonomie
    │       └── → profileCfg
    │
    └── 5. _app.initApp(profileCfg || baseCfg)
```

### `_app.initApp()` — `src/app/init.js`

| Étape | Action                               | Remarque                                    |
| :---: | ------------------------------------ | ------------------------------------------- |
|   1   | `_loadAllSecondaryModules()`         | Charge les lazy chunks POI, Route, LM, etc. |
|   2   | `Core.init({ mapId, center, zoom })` | Crée l'instance Leaflet                     |
|   3   | `UI.init()`                          | Construit les contrôles, panneaux, filtres  |
|   4   | `loadLayers()`                       | Charge les couches GeoJSON selon le profil  |
|   5   | `revealApp()`                        | Masque le loader, émet `geoleaf:app:ready`  |

---

## Étape 4 — Événement `geoleaf:app:ready`

Émis dans `src/app/init.js` → `revealApp()` **après** que le loader est masqué et la carte visible :

```javascript
// src/app/init.js — revealApp()
document.dispatchEvent(
    new CustomEvent("geoleaf:app:ready", {
        detail: {
            version: GeoLeaf._version,
            timestamp: Date.now(),
        },
    })
);
```

**Abonnés internes :**

- `boot.js` → `GeoLeaf.bootInfo.show(GeoLeaf)` — affiche le toast de démarrage

**Usage intégrateur :**

```javascript
document.addEventListener("geoleaf:app:ready", (e) => {
    console.log("GeoLeaf prêt — version :", e.detail.version);
    // Ici : actions post-init sûres (la carte et l'UI sont disponibles)
});
```

---

## Étape 5 — Chargement lazy via `_loadModule()` et `PluginRegistry`

### `GeoLeaf._loadModule(name)`

Charge un module secondaire à la demande. Exécute le resolver de `_lazyModuleResolvers` puis enregistre le module dans `PluginRegistry`.

```javascript
await GeoLeaf._loadModule("table");
// → import('./lazy/table.js') en ESM
// → GeoLeaf.plugins.register('table', { version })
```

### `GeoLeaf.plugins` (PluginRegistry)

```javascript
GeoLeaf.plugins.isLoaded("storage"); // → true/false
GeoLeaf.plugins.getLoadedPlugins(); // → ['core', 'storage', 'poi', ...]
GeoLeaf.plugins.canActivate("addpoi"); // → true si dépendances présentes
await GeoLeaf.plugins.load("layerManager"); // → charge via _lazyResolver
GeoLeaf.plugins.getAvailableModules(); // → tous les modules enregistrés
```

### Diagramme complet

```
window.GeoLeaf.boot()
        │
        ▼
 _app.startApp()
        │
        ├─── loadConfig() ──────────────────────────────────── geoleaf:config:loaded
        │
        ├─── loadActiveProfileResources() ─────────────────── geoleaf:profile:loaded
        │
        └─── _app.initApp()
                │
                ├─── _loadAllSecondaryModules()
                │        (poi, route, layerManager, legend, labels, themes, table)
                │
                ├─── Core.init() ────────────────────────────── Leaflet map créée
                ├─── UI.init()
                ├─── loadLayers()
                │
                └─── revealApp() ────────────────────────────── geoleaf:app:ready
                                                                       │
                                                              bootInfo.show() (toast)
```

---

## Événements du cycle de vie

| Événement                    | Émis par                    | Moment                                             |
| ---------------------------- | --------------------------- | -------------------------------------------------- |
| `geoleaf:config:loaded`      | `Config` / `geoleaf.api.js` | Après `loadConfig()`                               |
| `geoleaf:profile:loaded`     | `ProfileLoader`             | Après `loadActiveProfileResources()`               |
| `geoleaf:app:ready`          | `init.js` → `revealApp()`   | Carte visible, UI prête                            |
| `geoleaf:online`             | `OfflineDetector`           | Retour réseau (déclenche `SyncHandler.autoSync()`) |
| `geoleaf:poi:queued`         | `SyncHandler`               | POI mis en file sync                               |
| `geoleaf:poi:sync-completed` | `SyncHandler`               | Sync terminée                                      |

---

_Voir aussi : [MODULE_CONTRACT.md](./MODULE_CONTRACT.md) pour la frontière Core / Extension / Plugin._
