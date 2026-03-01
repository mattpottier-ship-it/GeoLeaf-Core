# GeoLeaf JS — Module Contract (v4.0.0)

Product Version: GeoLeaf Platform V1

> **Référence :** `ROADMAP_PHASE8_FIXES.md` batch C15  
> **Dernière mise à jour :** 2026-02-19

Ce document définit la **frontière Core / Extension / Plugin** de GeoLeaf, les règles de dépendances entre couches, et le guide d'intégration pour les consommateurs.

---

## Niveaux d'architecture

```
┌───────────────────────────────────────────────────────────────────┐
│  CORE  (geoleaf.umd.js / geoleaf.min.js)                          │
│  Toujours chargé — aucune dépendance réseau après le bundle       │
├───────────────────────────────────────────────────────────────────┤
│  EXTENSIONS LAZY  (dist/chunks/*.js)                              │
│  Chargées à la demande via GeoLeaf._loadModule() ou GeoLeaf.boot  │
├───────────────────────────────────────────────────────────────────┤
│  PLUGINS  (geoleaf-*.plugin.js)                                   │
│  Fichiers séparés — chargés avant GeoLeaf.boot()                  │
└───────────────────────────────────────────────────────────────────┘
```

---

## Modules Core

> Toujours présents dans `geoleaf.umd.js`. Ne nécessitent pas d'import réseau supplémentaire.

| Module (`window.GeoLeaf.*`) | Source (`src/modules/`)  | Description                                     |
| --------------------------- | ------------------------ | ----------------------------------------------- |
| `Log`                       | `log/`                   | Système de log interne                          |
| `Errors`                    | `errors/`                | Catalogue d'erreurs                             |
| `CONSTANTS`                 | `constants/`             | Constantes globales                             |
| `Security`                  | `security/`              | Sanitisation, CSRF, XSS                         |
| `Utils`                     | `utils/`                 | ~15 utilitaires (fetch, animation, lazy, perf…) |
| `Config`                    | `config/`                | Chargement profil, taxonomie, normalisation     |
| `Core`                      | `geoleaf.core.js`        | Création map Leaflet, couches de base           |
| `Baselayers`                | `geoleaf.baselayers.js`  | Fonds de plan                                   |
| `Filters`                   | `geoleaf.filters.js`     | Système de filtres                              |
| `UI`                        | `geoleaf.ui.js` + `ui/`  | Interface (notifications, filtres, controls)    |
| `Helpers`                   | `geoleaf.helpers.js`     | Helpers publics                                 |
| `Validators`                | `geoleaf.validators.js`  | Validation données                              |
| `plugins`                   | `api/plugin-registry.js` | `GeoLeaf.plugins.*` — PluginRegistry            |
| `bootInfo`                  | `api/boot-info.js`       | Toast de démarrage                              |
| `_GeoJSONShared`            | `geojson/shared.js`      | État partagé GeoJSON                            |
| `_GeoJSONCore`              | `geojson/core.js`        | Chargement couches GeoJSON                      |
| `_GeoJSONLayerManager`      | `geojson/layer-manager/` | Gestion couches                                 |

> **Règle :** Les modules Core ne doivent PAS importer depuis les Extensions ou Plugins.

---

## Modules Extension (lazy chunks)

> Chargés **à la demande** — absents du bundle initial. En mode ESM ils produisent des chunks séparés dans `dist/chunks/`. En mode UMD ils sont inline (aucun chunk réseau).

| Clé `_loadModule()` | Fichiers lazy                                                | Description                  | Dépendances |
| ------------------- | ------------------------------------------------------------ | ---------------------------- | ----------- |
| `poi`               | `poi-core` → `poi-renderers` + `poi-extras` → `poi-add-form` | POI complet (ordre garanti)  | Core        |
| `poiCore`           | `lazy/poi-core.js`                                           | Affichage marqueurs POI      | Core        |
| `poiRenderers`      | `lazy/poi-renderers.js`                                      | Renderers popups/sidepanel   | poiCore     |
| `poiExtras`         | `lazy/poi-extras.js`                                         | Image upload, placement      | poiCore     |
| `poiAddForm`        | `lazy/poi-add-form.js`                                       | Formulaire ajout POI         | poiCore     |
| `basemapSelector`   | `lazy/basemap-selector.js`                                   | Sélecteur fond de plan       | Core        |
| `route`             | `lazy/route.js`                                              | Couches itinéraires          | Core        |
| `layerManager`      | `lazy/layer-manager.js`                                      | Panneau gestionnaire couches | Core        |
| `legend`            | `lazy/legend.js`                                             | Panneau légende              | Core        |
| `labels`            | `lazy/labels.js`                                             | Labels dynamiques sur carte  | Core        |
| `themes`            | `lazy/themes.js`                                             | Sélecteur de thèmes          | Core        |
| `table`             | `lazy/table.js`                                              | Tableau de données           | Core        |

### Chargement à la demande

```javascript
// Chargement d'un module unique
await GeoLeaf._loadModule("table");

// Ou via PluginRegistry
await GeoLeaf.plugins.load("legend");

// Chargement de tous les modules (appelé par _app.initApp())
await GeoLeaf._loadAllSecondaryModules();
```

### Vérification avant accès

Toujours vérifier qu'une extension est chargée avant usage :

```javascript
if (GeoLeaf.plugins.isLoaded("table")) {
    GeoLeaf.Table.show();
}

// Ou attendre le chargement
await GeoLeaf._loadModule("table");
GeoLeaf.Table.show();
```

---

## Modules Plugin

> Fichiers **séparés** du bundle principal. Doivent être inclus **avant** `GeoLeaf.boot()`.  
> Chaque plugin s'auto-enregistre dans `PluginRegistry` au chargement.

| Plugin  | Fichier dist                | Clé PluginRegistry | Description                              |
| ------- | --------------------------- | ------------------ | ---------------------------------------- |
| Storage | `geoleaf-storage.plugin.js` | `'storage'`        | Cache offline, IndexedDB, Service Worker |
| AddPOI  | `geoleaf-addpoi.plugin.js`  | `'addpoi'`         | Formulaire création/édition POI          |

### Intégration plugin

```html
<!-- 1. Bundle core -->
<script src="dist/geoleaf.umd.js"></script>

<!-- 2. Plugins optionnels (avant boot) -->
<script src="dist/geoleaf-storage.plugin.js"></script>
<script src="dist/geoleaf-addpoi.plugin.js"></script>

<!-- 3. Démarrage -->
<script>
    document.addEventListener("geoleaf:app:ready", () => {
        console.log("Plugins chargés :", GeoLeaf.plugins.getLoadedPlugins());
        // → ['core', 'storage', 'addpoi']
    });
    GeoLeaf.boot();
</script>
```

---

## API `GeoLeaf.plugins` (PluginRegistry)

Interface unifiée pour interroger les capacités disponibles :

```javascript
// Vérifier si un module/plugin est chargé
GeoLeaf.plugins.isLoaded("storage"); // → true
GeoLeaf.plugins.isLoaded("table"); // → false (avant lazy load)

// Lister les modules chargés
GeoLeaf.plugins.getLoadedPlugins();
// → ['core', 'storage', 'addpoi', 'poi', 'route']

// Tous les modules disponibles (chargés + lazy disponibles)
GeoLeaf.plugins.getAvailableModules();
// → ['core', 'storage', 'addpoi', 'poi', 'poiCore', 'route', 'table', ...]

// Vérifier les dépendances avant activation
GeoLeaf.plugins.canActivate("addpoi"); // → true si Core + Storage présents

// Charger un module lazy
await GeoLeaf.plugins.load("layerManager"); // → Promise<void>

// Métadonnées d'un plugin
GeoLeaf.plugins.getInfo("storage");
// → { name: 'storage', version: '4.0.0', loaded: true, loadedAt: 1708360000000, requires: [], optional: ['addpoi'] }
```

---

## Règles de dépendances

```
Core   →  (aucune dépendance vers Extension/Plugin)
           ↓
Extension  →  Core uniquement
           ↓
Plugin     →  Core + Extension (optionnel)
```

| Règle       | Description                |
| ----------- | -------------------------- |
| ✅ OK       | Core → Core                |
| ✅ OK       | Extension → Core           |
| ✅ OK       | Plugin → Core ou Extension |
| ❌ Interdit | Core → Extension           |
| ❌ Interdit | Core → Plugin              |
| ❌ Interdit | Extension → Plugin         |

---

## Ajout d'un nouveau plugin (`GeoLeaf.plugins.register`)

Un plugin doit s'auto-enregistrer **à la fin de son fichier** :

```javascript
// À la fin de geoleaf-monplugin.plugin.js
if (typeof globalThis !== "undefined" && globalThis.GeoLeaf?.plugins?.register) {
    globalThis.GeoLeaf.plugins.register("monPlugin", {
        version: globalThis.GeoLeaf._version,
        requires: ["core"], // dépendances obligatoires
        optional: ["storage"], // dépendances optionnelles
    });
}
```

---

## Ajout d'un nouveau module lazy

1. Créer `src/lazy/mon-module.js`
2. Ajouter le resolver dans `src/bundle-entry.js` :
    ```javascript
    ['monModule', () => import('./lazy/mon-module.js')],
    ```
3. `PluginRegistry.registerLazy()` est appelé automatiquement au démarrage.
4. _(Optionnel)_ Documenter la clé dans ce fichier.

---

## Configuration désactivation des fonctionnalités

Certains modules Core peuvent être désactivés via le profil JSON :

```json
{
    "debug": {
        "showBootInfo": false
    },
    "features": {
        "offline": false,
        "addPoi": false
    }
}
```

---

_Voir aussi : [BOOT_SEQUENCE.md](./BOOT_SEQUENCE.md) pour la séquence de démarrage complète._
