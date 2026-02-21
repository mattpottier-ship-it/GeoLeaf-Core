# profile.json - Référence Complète

**Version produit :** GeoLeaf Platform V1  
**Version:** 4.0.0  
**Date de dernière mise à jour:** 28 janvier 2026  
**Statut:** ✅ Production Ready

> Convention de versioning : **Platform V1** est le label produit ; le SemVer technique des packages/releases reste en **4.x**. Voir [VERSIONING_POLICY.md](VERSIONING_POLICY.md).

---

## Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Structure complète](#structure-complète)
3. [Paramètres racine](#paramètres-racine)
4. [Section map](#section-map)
5. [Section Files](#section-files)
6. [Section ui](#section-ui)
7. [Section basemaps](#section-basemaps)
8. [Section performance](#section-performance)
9. [Section search](#section-search)
10. [Section layerManagerConfig](#section-layermanagerconfig)
11. [Section legendConfig](#section-legendconfig)
12. [Section poiConfig](#section-poiconfig)
13. [Section brandingConfig](#section-brandingconfig)
14. [Section tableConfig](#section-tableconfig)
15. [Section scaleConfig](#section-scaleconfig)
16. [Section storage](#section-storage)
17. [Section poiAddConfig](#section-poiaddconfig)
18. [Paramètres obsolètes/dépréciés](#paramètres-obsolètesdépréciés)
19. [Architecture des fichiers de configuration](#architecture-des-fichiers-de-configuration)

---

## Vue d'ensemble

Le fichier `profile.json` est le **fichier de configuration principal** d'un profil GeoLeaf. Il définit :

- L'interface utilisateur (composants visibles)
- Les fonds de carte disponibles
- Les paramètres de performance
- La configuration des filtres et de la recherche
- Les réglages des composants (table, légende, gestionnaire de couches)

> **⚠️ Important:** Cette documentation est basée sur l'analyse du **code source réel** (src/modules/) et des **tests unitaires** (\_\_tests\_\_/).

### Emplacement

```
profiles/{profile-name}/profile.json
```

### Chargement

Le fichier est chargé par :

- **Fichier source:** [src/modules/config/profile.js](../src/modules/config/profile.js)
- **Fonction principale:** `loadActiveProfileResources()`
- **Événement émis:** `geoleaf:profile:loaded`

---

## Structure complète

Voici la structure complète avec tous les paramètres disponibles :

```json
{
  "id": "string",
  "label": "string",
  "description": "string",
  "version": "string",

  "map": {
    "bounds": [[number, number], [number, number]],
    "initialMaxZoom": number,
    "padding": [number, number],
    "positionFixed": boolean,
    "boundsMargin": number,
    "minZoom": number
  },

  "Files": {
    "taxonomyFile": "string",
    "themesFile": "string",
    "layersFile": "string"
  },

  "ui": {
    "theme": "string",
    "language": "string",
    "showBaseLayerControls": boolean,
    "showLayerManager": boolean,
    "showFilterPanel": boolean,
    "enableGeolocation": boolean,
    "showCoordinates": boolean,
    "showThemeSelector": boolean,
    "showLegend": boolean,
    "showCacheButton": boolean,
    "showAddPoi": boolean,
    "interactiveShapes": boolean
  },

  "basemaps": {
    "{basemap-id}": {
      "id": "string",
      "label": "string",
      "type": "string (\"raster\" | \"maplibre\")",
      "url": "string (tile URL template, also used as raster fallback for maplibre)",
      "style": "string (URL style JSON MapLibre)",
      "attribution": "string",
      "minZoom": number,
      "maxZoom": number,
      "defaultBasemap": boolean,
      "offline": boolean,
      "offlineBounds": {
        "north": number,
        "south": number,
        "east": number,
        "west": number
      },
      "cacheMinZoom": number,
      "cacheMaxZoom": number
    }
  },

  "performance": {
    "maxConcurrentLayers": number,
    "layerLoadDelay": number,
    "fitBoundsOnThemeChange": boolean
  },

  "search": {
    "title": "string",
    "radiusMin": number,
    "radiusMax": number,
    "radiusStep": number,
    "radiusDefault": number,
    "searchPlaceholder": "string",
    "filters": [
      {
        "id": "string",
        "type": "string",
        "label": "string",
        "placeholder": "string",
        "searchFields": ["string"],
        "buttonLabel": "string",
        "instructionText": "string",
        "field": "string"
      }
    ],
    "actions": {
      "applyLabel": "string",
      "resetLabel": "string"
    }
  },

  "layerManagerConfig": {
    "title": "string",
    "collapsedByDefault": boolean,
    "sections": [
      {
        "id": "string",
        "label": "string",
        "order": number,
        "collapsedByDefault": boolean
      }
    ]
  },

  "legendConfig": {
    "title": "string",
    "collapsedByDefault": boolean,
    "position": "string"
  },

  "poiConfig": {
    "clusterStrategy": "string"
  },

  "brandingConfig": {
    "enabled": boolean,
    "text": "string",
    "position": "string"
  },

  "tableConfig": {
    "enabled": boolean,
    "defaultVisible": boolean,
    "pageSize": number,
    "maxRowsPerLayer": number,
    "enableExportButton": boolean,
    "virtualScrolling": boolean,
    "defaultHeight": "string",
    "minHeight": "string",
    "maxHeight": "string",
    "resizable": boolean
  },

  "scaleConfig": {
    "scaleGraphic": boolean,
    "scaleNumeric": boolean,
    "scaleNumericEditable": boolean,
    "scaleNivel": boolean,
    "position": "string"
  },

  "storage": {
    "cache": {
      "enableProfileCache": boolean,
      "enableTileCache": boolean
    }
  },

  "poiAddConfig": {
    "enabled": boolean,
    "defaultPosition": "string"
  }
}
```

---

## Paramètres racine

### `id` (string, obligatoire)

**Description:** Identifiant unique du profil.

**Utilisation dans le code:**

- Utilisé pour charger le profil
- Référencé dans les événements
- Stocké dans `config.data.activeProfile`

**Fichiers source:**

- [src/modules/config/profile.js](../src/modules/config/profile.js) ligne 141

**Valeurs possibles:** Chaîne alphanumérique sans espaces (ex: `"tourism"`, `"my-custom-profile"`)

**Valeur par défaut:** Aucune (obligatoire)

**État:** ✅ Actif et fonctionnel

---

### `label` (string, obligatoire)

**Description:** Nom d'affichage du profil pour l'interface utilisateur.

**Utilisation dans le code:**

- Affiché dans les logs
- Peut être utilisé dans l'interface de sélection de profil

**Fichiers source:**

- [src/modules/config/profile.js](../src/modules/config/profile.js)

**Valeurs possibles:** Chaîne de caractères libre (ex: `"Profil tourisme"`, `"My Custom Profile"`)

**Valeur par défaut:** Aucune (obligatoire)

**État:** ✅ Actif et fonctionnel

---

### `description` (string, optionnel)

**Description:** Description détaillée du profil et de son usage.

**Utilisation dans le code:**

- Utilisé pour la documentation
- Peut être affiché dans une interface de sélection

**Fichiers source:**

- Stocké dans l'objet profile mais peu utilisé directement dans le code

**Valeurs possibles:** Texte libre

**Valeur par défaut:** Chaîne vide

**État:** ✅ Actif (principalement documentation)

---

### `version` (string, optionnel)

**Description:** Version du profil suivant le semantic versioning.

**Utilisation dans le code:**

- Utilisé pour la détection de version (v2.0 vs v3.0)
- Fonction `isModularProfile()` dans ProfileLoader

**Fichiers source:**

- [src/modules/config/profile-loader.js](../src/modules/config/profile-loader.js)

**Valeurs possibles:** Format "X.Y.Z" (ex: `"3.0.0"`, `"1.2.5"`)

**Valeur par défaut:** `"1.0.0"`

**État:** ✅ Actif et fonctionnel

---

## Section map

### `map` (object, obligatoire)

**Description:** Paramètres d'initialisation de la carte : emprise initiale, plafond de zoom au chargement, et restriction de navigation.

**Utilisation dans le code:**

- Chargé dans `src/app/init.js` lors de l'initialisation de la carte
- `bounds` est utilisé pour le `fitBounds()` initial et comme emprise de `maxBounds` si `positionFixed` est activé

#### `map.bounds` (array, obligatoire)

Emprise géographique initiale au format `[[sud, ouest], [nord, est]]` en WGS84.

```json
"bounds": [[-58.39, -73.58], [-21.78, -34.67]]
```

#### `map.initialMaxZoom` (integer, optionnel)

Zoom maximum utilisé par `fitBounds()` au démarrage. **Ne limite PAS** le zoom utilisateur — il empêche seulement le `fitBounds` initial de zoomer trop fort sur une petite emprise.

- **Valeur par défaut:** `12`
- **Valeurs possibles:** `1` à `20`
- **Rétrocompatibilité:** l'ancien nom `maxZoom` est toujours lu en fallback

> **⚠️ Note:** Ce paramètre ne remplace pas le `maxZoom` des basemaps (qui contrôle la disponibilité des tuiles) ni le zoom maximum Leaflet de la carte.

#### `map.padding` (array, optionnel)

Marge en pixels `[vertical, horizontal]` appliquée au `fitBounds()` initial. Évite que l'emprise colle aux bords du conteneur.

- **Valeur par défaut:** `[50, 50]`

#### `map.positionFixed` (boolean, optionnel)

Restreint le déplacement de la carte à l'emprise définie dans `bounds`. L'utilisateur ne peut pas naviguer trop loin de cette zone mais conserve une liberté de déplacement.

- **Valeur par défaut:** `false`
- **Avantage performance:** Leaflet ne chargera pas de tuiles hors emprise → réduction des requêtes réseau
- **Implémentation:** utilise `L.map({ maxBounds, maxBoundsViscosity: 0.85 })` avec une marge configurable via `boundsMargin` (défaut 30%)
- **Comportement:** effet élastique ("rubber-band") aux bords, pas un mur dur

#### `map.boundsMargin` (number, optionnel)

Marge supplémentaire autour des `bounds` lorsque `positionFixed` est `true`. Permet de contrôler la liberté de déplacement.

- **Valeur par défaut:** `0.3` (30% de marge)
- **Plage:** `0` (aucune marge, très restrictif) à `1` (100%, très libre)
- **Ignoré** si `positionFixed` est `false`

#### `map.minZoom` (integer, optionnel)

Zoom minimum lorsque `positionFixed` est `true`. Empêche l'utilisateur de dézoomer trop et voir le reste du monde.

- **Valeur par défaut:** `3` (si `positionFixed` est `true`)
- **Ignoré** si `positionFixed` est `false`

#### Exemple complet

```json
"map": {
  "bounds": [[-58.39, -73.58], [-21.78, -34.67]],
  "initialMaxZoom": 12,
  "padding": [50, 50],
  "positionFixed": true,
  "boundsMargin": 0.3,
  "minZoom": 3
}
```

---

## Section Files

### `Files` (object, obligatoire)

**Description:** Définit les chemins vers les fichiers de configuration associés au profil.

**Utilisation dans le code:**

- Chargés en parallèle lors de l'initialisation du profil modulaire
- [src/modules/config/profile-loader.js](../src/modules/config/profile-loader.js)

**État:** ✅ Actif et fonctionnel (profils v3.0)

---

#### `Files.taxonomyFile` (string, obligatoire)

**Description:** Chemin vers le fichier de taxonomie (catégories/sous-catégories).

**Utilisation dans le code:**

```javascript
// profile-loader.js ligne 67
const taxonomyUrl = `${baseUrl}/${profile.Files.taxonomyFile}?t=${timestamp}`;
```

**Fichiers source:**

- [src/modules/config/profile-loader.js](../src/modules/config/profile-loader.js) ligne 67

**Valeurs possibles:** Chemin relatif au répertoire du profil (ex: `"taxonomy.json"`)

**Valeur par défaut:** `"taxonomy.json"`

**État:** ✅ Actif et fonctionnel

---

#### `Files.themesFile` (string, obligatoire)

**Description:** Chemin vers le fichier de thèmes (presets de visibilité des couches).

**Utilisation dans le code:**

```javascript
// profile-loader.js ligne 68
const themesUrl = `${baseUrl}/${profile.Files.themesFile}?t=${timestamp}`;
```

**Fichiers source:**

- [src/modules/config/profile-loader.js](../src/modules/config/profile-loader.js) ligne 68

**Valeurs possibles:** Chemin relatif (ex: `"themes.json"`)

**Valeur par défaut:** `"themes.json"`

**État:** ✅ Actif et fonctionnel

---

#### `Files.layersFile` (string, optionnel)

**Description:** Chemin vers le fichier de définition des couches GeoJSON.

**Utilisation dans le code:**

```javascript
// profile-loader.js ligne 69
const layersUrl = `${baseUrl}/${profile.Files.layersFile}?t=${timestamp}`;
```

**Fichiers source:**

- [src/modules/config/profile-loader.js](../src/modules/config/profile-loader.js) ligne 69

**Valeurs possibles:** Chemin relatif (ex: `"layers.json"`)

**Valeur par défaut:** `"layers.json"`

**État:** ✅ Actif et fonctionnel

---

## Section ui

### `ui` (object, optionnel)

**Description:** Configuration de l'interface utilisateur et des composants visibles.

**État:** ✅ Actif et fonctionnel

---

#### `ui.theme` (string, optionnel)

**Description:** Thème visuel de l'application.

**Utilisation dans le code:**

```javascript
// geoleaf.core.js ligne 132
const uiConfig = global.GeoLeaf.Config.get("ui") || {};
const theme = uiConfig.theme || "light";
```

**Fichiers source:**

- [src/modules/geoleaf.core.js](../src/modules/geoleaf.core.js) ligne 132
- [src/modules/ui/theme.js](../src/modules/ui/theme.js)

**Valeurs possibles:**

- `"light"` - Thème clair
- `"dark"` - Thème sombre

**Valeur par défaut:** `"light"`

**État:** ✅ Actif et fonctionnel

---

#### `ui.language` (string, optionnel)

**Description:** Langue de l'interface utilisateur.

**Utilisation dans le code:**

- Stocké dans la configuration
- Peut influencer les labels et textes

**Fichiers source:**

- Pas d'utilisation directe détectée dans le code actuel

**Valeurs possibles:** Codes ISO 639-1 (ex: `"fr"`, `"en"`, `"es"`)

**Valeur par défaut:** `"fr"`

**État:** ⚠️ Défini mais peu utilisé directement (préparation i18n)

---

#### `ui.showBaseLayerControls` (boolean, optionnel)

**Description:** Affiche les contrôles de sélection des fonds de carte.

**Utilisation dans le code:**

```javascript
// geoleaf.baselayers.js ligne 217
const showControls = config && config.ui && config.ui.showBaseLayerControls !== false;
```

**Fichiers source:**

- [src/modules/geoleaf.baselayers.js](../src/modules/geoleaf.baselayers.js) ligne 217

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `false`

**État:** ✅ Actif et fonctionnel

**Tests:**

- [\_\_tests\_\_/baselayers/baselayers.test.js](../__tests__/baselayers/baselayers.test.js) ligne 307

---

#### `ui.showLayerManager` (boolean, optionnel)

**Description:** Affiche le gestionnaire de couches.

**Utilisation dans le code:**

- Utilisé pour conditionner l'affichage du composant LayerManager

**Fichiers source:**

- [src/modules/geoleaf.layer-manager.js](../src/modules/geoleaf.layer-manager.js)

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `ui.showFilterPanel` (boolean, optionnel)

**Description:** Affiche le panneau de filtrage des POI.

**Utilisation dans le code:**

```javascript
// filter-panel/renderer.test.js ligne 425
mockGeoLeaf.Config.get.mockReturnValue({ showFilterPanel: true });
```

**Fichiers source:**

- [src/modules/ui/filter-panel/renderer.js](../src/modules/ui/filter-panel/renderer.js)

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

**Tests:**

- [\_\_tests\_\_/ui/filter-panel/renderer.test.js](../__tests__/ui/filter-panel/renderer.test.js) ligne 424

---

#### `ui.enableGeolocation` (boolean, optionnel)

**Description:** Active le contrôle de géolocalisation.

**Utilisation dans le code:**

```javascript
// ui/controls.js (ligne 164 dans les tests)
const config = { ui: { enableGeolocation: true } };
```

**Fichiers source:**

- [src/modules/ui/controls.js](../src/modules/ui/controls.js)

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

**Tests:**

- [\_\_tests\_\_/ui/controls.test.js](../__tests__/ui/controls.test.js) ligne 164
- [\_\_tests\_\_/integration/controls-simple.test.js](../__tests__/integration/controls-simple.test.js) ligne 214

---

#### `ui.showCoordinates` (boolean, optionnel)

**Description:** Affiche l'indicateur de coordonnées.

**Utilisation dans le code:**

```javascript
// geoleaf.core.js ligne 132
const showCoordinates = uiConfig ? uiConfig.showCoordinates !== false : true;
```

**Fichiers source:**

- [src/modules/geoleaf.core.js](../src/modules/geoleaf.core.js)
- [src/modules/ui/coordinates-display.js](../src/modules/ui/coordinates-display.js)

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

**Tests:**

- [\_\_tests\_\_/ui/coordinates-display.test.js](../__tests__/ui/coordinates-display.test.js) ligne 144

---

#### `ui.showThemeSelector` (boolean, optionnel)

**Description:** Affiche le sélecteur de thèmes.

**Utilisation dans le code:**

```javascript
// themes/theme-selector.js ligne 124
const uiConfig = GeoLeaf.Config && GeoLeaf.Config.get ? GeoLeaf.Config.get("ui") : null;
```

**Fichiers source:**

- [src/modules/themes/theme-selector.js](../src/modules/themes/theme-selector.js) ligne 124

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `ui.showLegend` (boolean, optionnel)

**Description:** Affiche le composant de légende.

**Utilisation dans le code:**

```javascript
// geoleaf.core.js ligne 133
const showLegend = uiConfig ? uiConfig.showLegend !== false : true;
```

**Fichiers source:**

- [src/modules/geoleaf.core.js](../src/modules/geoleaf.core.js) ligne 133

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `ui.showCacheButton` (boolean, optionnel)

**Description:** Affiche le bouton de gestion du cache hors ligne.

**Utilisation dans le code:**

```javascript
// ui/cache-button.test.js ligne 154
const showCacheButton = cfg?.ui?.showCacheButton !== false;
```

**Fichiers source:**

- [src/modules/ui/cache-button.js](../src/modules/ui/cache-button.js)

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `false`

**État:** ✅ Actif et fonctionnel

**Tests:**

- [\_\_tests\_\_/ui/cache-button.test.js](../__tests__/ui/cache-button.test.js) ligne 152

---

#### `ui.showAddPoi` (boolean, optionnel)

**Description:** Affiche le bouton d'ajout de POI.

**Utilisation dans le code:**

```javascript
// integration/controls-simple.test.js ligne 287
const config = { ui: { showAddPoi: true } };
```

**Fichiers source:**

- [src/modules/ui/controls.js](../src/modules/ui/controls.js)

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `false`

**État:** ✅ Actif et fonctionnel

**Tests:**

- [\_\_tests\_\_/integration/controls-simple.test.js](../__tests__/integration/controls-simple.test.js) ligne 287

---

#### `ui.interactiveShapes` (boolean, optionnel)

**Description:** Rend les formes géométriques (polygones, lignes) interactives (cliquables).

**Utilisation dans le code:**

```javascript
// ui/filter-panel/proximity.js ligne 212
const interactiveShapes = GeoLeaf.Config.get("ui.interactiveShapes", false);
```

**Fichiers source:**

- [src/modules/ui/filter-panel/proximity.js](../src/modules/ui/filter-panel/proximity.js) ligne 212
- [src/modules/ui/controls.js](../src/modules/ui/controls.js) ligne 348
- [src/modules/geojson/layer-config-manager.js](../src/modules/geojson/layer-config-manager.js) ligne 115
- [src/modules/geoleaf.route.js](../src/modules/geoleaf.route.js) ligne 144

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `false`

**État:** ✅ Actif et fonctionnel

---

## Section basemaps

### `basemaps` (object, obligatoire)

**Description:** Définition des fonds de carte disponibles.

**Structure:** Objet avec clés = ID du fond de carte, valeurs = configuration du fond de carte.

**Utilisation dans le code:**

```javascript
// geoleaf.baselayers.js ligne 218
basemaps: global.GeoLeaf.Config.get("basemaps") || {};
```

**Fichiers source:**

- [src/modules/geoleaf.baselayers.js](../src/modules/geoleaf.baselayers.js)
- [src/modules/storage/cache/resource-enumerator.js](../src/modules/storage/cache/resource-enumerator.js) ligne 211

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.id` (string, obligatoire)

**Description:** Identifiant unique du fond de carte.

**Valeurs possibles:** Chaîne alphanumérique (ex: `"street"`, `"satellite"`, `"topo"`)

**Valeur par défaut:** Aucune (obligatoire)

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.label` (string, obligatoire)

**Description:** Nom d'affichage du fond de carte dans l'interface.

**Valeurs possibles:** Chaîne de caractères libre (ex: `"Street"`, `"Satellite"`, `"Topographique"`)

**Valeur par défaut:** Aucune (obligatoire)

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.url` (string, obligatoire)

**Description:** Template d'URL des tuiles du fond de carte.

**Format:** Utilise les placeholders `{s}`, `{z}`, `{x}`, `{y}`

**Exemple:**

```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

**Valeurs possibles:** URL valide avec placeholders Leaflet

**Valeur par défaut:** Aucune (obligatoire)

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.attribution` (string, obligatoire)

**Description:** Texte d'attribution/copyright du fond de carte (HTML autorisé).

**Exemple:**

```
&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors
```

**Valeurs possibles:** Chaîne HTML

**Valeur par défaut:** Aucune (obligatoire)

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.minZoom` (number, optionnel)

**Description:** Niveau de zoom minimum pour ce fond de carte.

**Utilisation dans le code:**

```javascript
// geoleaf.baselayers.js ligne 103
if (typeof definition.minZoom === "number") {
    opts.minZoom = definition.minZoom;
}
```

**Fichiers source:**

- [src/modules/geoleaf.baselayers.js](../src/modules/geoleaf.baselayers.js) ligne 100-107

**Valeurs possibles:** Nombre entier entre 0 et 20 (généralement 0-5 pour fonds de carte)

**Valeur par défaut:** 0

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.maxZoom` (number, optionnel)

**Description:** Niveau de zoom maximum pour ce fond de carte.

**Utilisation dans le code:**

```javascript
// geoleaf.baselayers.js ligne 108
opts.maxZoom = typeof definition.maxZoom === "number" ? definition.maxZoom : 19;
```

**Fichiers source:**

- [src/modules/geoleaf.baselayers.js](../src/modules/geoleaf.baselayers.js) ligne 108

**Valeurs possibles:** Nombre entier entre 1 et 20 (généralement 17-19 pour OSM)

**Valeur par défaut:** `19`

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.defaultBasemap` (boolean, optionnel)

**Description:** Indique si ce fond de carte est sélectionné par défaut au chargement.

**Utilisation dans le code:**

- Utilisé lors de l'initialisation de la carte pour sélectionner le fond par défaut

**Fichiers source:**

- [src/modules/geoleaf.baselayers.js](../src/modules/geoleaf.baselayers.js)

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `false`

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.offline` (boolean, optionnel)

**Description:** Indique si ce fond de carte est disponible en mode hors ligne (cache).

**Utilisation dans le code:**

- Utilisé par le système de cache pour déterminer si les tuiles doivent être mises en cache

**Fichiers source:**

- [src/modules/storage/cache/resource-enumerator.js](../src/modules/storage/cache/resource-enumerator.js)

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `false`

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.offlineBounds` (object, optionnel)

**Description:** Limites géographiques pour le cache hors ligne de ce fond de carte.

**Structure:**

```json
{
  "north": number,
  "south": number,
  "east": number,
  "west": number
}
```

**Prérequis:** `offline: true`

**Exemple:**

```json
{
    "north": -22.0,
    "south": -56.0,
    "east": -53.5,
    "west": -73.5
}
```

**Valeurs possibles:** Coordonnées WGS84 (latitude/longitude en degrés décimaux)

**Valeur par défaut:** Aucun

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.cacheMinZoom` (number, optionnel)

**Description:** Niveau de zoom minimum pour le cache hors ligne.

**Prérequis:** `offline: true`

**Valeurs possibles:** Nombre entier entre 0 et `cacheMaxZoom`

**Valeur par défaut:** `4`

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.cacheMaxZoom` (number, optionnel)

**Description:** Niveau de zoom maximum pour le cache hors ligne.

**Prérequis:** `offline: true`

**Valeurs possibles:** Nombre entier entre `cacheMinZoom` et 20

**Valeur par défaut:** `12`

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.type` (string, optionnel)

**Description:** Type de basemap. Permet de distinguer les basemaps raster classiques des basemaps vectorielles MapLibre GL.

**Valeurs possibles:**

- `"raster"` — Basemap raster classique via `L.tileLayer()` (défaut implicite)
- `"maplibre"` — Basemap vectorielle WebGL via `@maplibre/maplibre-gl-leaflet`

**Valeur par défaut:** `"raster"` (implicite quand absent)

**Comportement:** Si `type: "maplibre"` (ou si `style` est présent), le module Baselayers crée un layer MapLibre GL au lieu d'un `L.tileLayer`. Si le plugin MapLibre n'est pas chargé, un fallback raster est utilisé.

**Ajouté en:** v4.0.0 (Scénario B hybride)

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.style` (string, requis si type "maplibre")

**Description:** URL du style JSON MapLibre GL (ou objet style inline). Définit les sources de tuiles vectorielles et les layers de rendu.

**Prérequis:** `type: "maplibre"` (ou implicite si `style` est fourni)

**Exemple:**

```
https://tiles.openfreemap.org/styles/liberty
```

**Providers gratuits:**

- OpenFreeMap : `https://tiles.openfreemap.org/styles/liberty` (100% gratuit)
- OpenFreeMap Dark : `https://tiles.openfreemap.org/styles/dark`
- MapTiler (freemium) : `https://api.maptiler.com/maps/streets-v2/style.json?key=KEY`

**Valeur par défaut:** Aucune (requis pour les basemaps MapLibre)

**Ajouté en:** v4.0.0 (Scénario B hybride)

**État:** ✅ Actif et fonctionnel

---

#### `basemaps.{id}.fallbackUrl` (string, optionnel)

**Description:** URL de tuiles raster de secours, utilisée quand le plugin MapLibre GL Leaflet n'est pas disponible.

**Prérequis:** `type: "maplibre"` (ignoré pour les basemaps raster)

**Exemple:**

```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

**Comportement:** Si `L.maplibreGL` n'est pas chargé (CDN manquant, erreur réseau), la basemap utilise cette URL raster en fallback. Si `fallbackUrl` n'est pas fourni, le fallback utilise la basemap `street` par défaut (OSM).

**Valeur par défaut:** URL de la basemap `street` par défaut

**Ajouté en:** v4.0.0 (Scénario B hybride)

**État:** ✅ Actif et fonctionnel

---

## Section performance

### `performance` (object, optionnel)

**Description:** Paramètres d'optimisation de performance pour le chargement des couches.

**État:** ✅ Actif et fonctionnel

---

#### `performance.maxConcurrentLayers` (number, optionnel)

**Description:** Nombre maximum de couches pouvant être chargées en parallèle.

**Utilisation dans le code:**

```javascript
// themes/theme-applier.js ligne 102
const maxLayers = perfConfig.maxConcurrentLayers || 10;
```

**Fichiers source:**

- [src/modules/themes/theme-applier.js](../src/modules/themes/theme-applier.js) ligne 102

**Valeurs possibles:** Nombre entier > 0 (généralement 5-15)

**Valeur par défaut:** `10`

**État:** ✅ Actif et fonctionnel

---

#### `performance.layerLoadDelay` (number, optionnel)

**Description:** Délai en millisecondes entre le chargement de chaque couche pour éviter la surcharge.

**Utilisation dans le code:**

```javascript
// themes/theme-applier.js ligne 103
const loadDelay = perfConfig.layerLoadDelay || 200;
```

**Fichiers source:**

- [src/modules/themes/theme-applier.js](../src/modules/themes/theme-applier.js) ligne 103

**Valeurs possibles:** Nombre entier en millisecondes (généralement 100-500)

**Valeur par défaut:** `200`

**État:** ✅ Actif et fonctionnel

---

#### `performance.fitBoundsOnThemeChange` (boolean, optionnel)

**Description:** Ajuste automatiquement la vue de la carte aux limites des données lors du changement de thème.

**Utilisation dans le code:**

```javascript
// themes/theme-applier.js ligne 104
const enableFitBounds = perfConfig.fitBoundsOnThemeChange !== false;
```

**Fichiers source:**

- [src/modules/themes/theme-applier.js](../src/modules/themes/theme-applier.js) ligne 104

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `false`

**État:** ✅ Actif et fonctionnel

---

## Section search

### `search` (object, optionnel)

**Description:** Configuration du panneau de recherche et de filtrage des POI.

**Note:** Supporte aussi l'ancien format `profile.panels.search` pour la rétrocompatibilité.

**Utilisation dans le code:**

```javascript
// ui/filter-panel/renderer.js ligne 52
const searchPanel = (profile.panels && profile.panels.search) || profile.search;
```

**Fichiers source:**

- [src/modules/ui/filter-panel/renderer.js](../src/modules/ui/filter-panel/renderer.js) ligne 51-52
- [src/modules/ui/filter-control-builder.js](../src/modules/ui/filter-control-builder.js) ligne 385

**État:** ✅ Actif et fonctionnel

---

#### `search.title` (string, optionnel)

**Description:** Titre du panneau de filtrage.

**Utilisation dans le code:**

```javascript
// ui/filter-panel/renderer.js ligne 93
textContent: searchPanel.title || "Filtres";
```

**Fichiers source:**

- [src/modules/ui/filter-panel/renderer.js](../src/modules/ui/filter-panel/renderer.js) ligne 93

**Valeurs possibles:** Chaîne de caractères libre

**Valeur par défaut:** `"Filtres"`

**État:** ✅ Actif et fonctionnel

---

#### `search.radiusMin` (number, optionnel)

**Description:** Rayon minimum (en km) pour la recherche par proximité.

**Utilisation dans le code:**

```javascript
// ui/filter-control-builder.js ligne 387
if (typeof searchConfig.radiusMin === "number" && searchConfig.radiusMin > 0) {
    minRadius = searchConfig.radiusMin;
}
```

**Fichiers source:**

- [src/modules/ui/filter-control-builder.js](../src/modules/ui/filter-control-builder.js) ligne 387

**Valeurs possibles:** Nombre > 0 (généralement 1-10)

**Valeur par défaut:** `1`

**État:** ✅ Actif et fonctionnel

---

#### `search.radiusMax` (number, optionnel)

**Description:** Rayon maximum (en km) pour la recherche par proximité.

**Utilisation dans le code:**

```javascript
// ui/filter-control-builder.js ligne 390
if (typeof searchConfig.radiusMax === "number" && searchConfig.radiusMax > 0) {
    maxRadius = searchConfig.radiusMax;
}
```

**Fichiers source:**

- [src/modules/ui/filter-control-builder.js](../src/modules/ui/filter-control-builder.js) ligne 390

**Valeurs possibles:** Nombre > `radiusMin` (généralement 50-100)

**Valeur par défaut:** `50`

**État:** ✅ Actif et fonctionnel

---

#### `search.radiusStep` (number, optionnel)

**Description:** Pas d'incrémentation pour le curseur de rayon de recherche.

**Utilisation dans le code:**

```javascript
// ui/filter-control-builder.js ligne 393
if (typeof searchConfig.radiusStep === "number" && searchConfig.radiusStep > 0) {
    stepRadius = searchConfig.radiusStep;
}
```

**Fichiers source:**

- [src/modules/ui/filter-control-builder.js](../src/modules/ui/filter-control-builder.js) ligne 393

**Valeurs possibles:** Nombre > 0 (généralement 1-5)

**Valeur par défaut:** `1`

**État:** ✅ Actif et fonctionnel

---

#### `search.radiusDefault` (number, optionnel)

**Description:** Rayon par défaut (en km) pour la recherche par proximité.

**Utilisation dans le code:**

```javascript
// ui/filter-control-builder.js ligne 396
if (typeof searchConfig.radiusDefault === "number" && searchConfig.radiusDefault > 0) {
    defaultRadius = searchConfig.radiusDefault;
}
```

**Fichiers source:**

- [src/modules/ui/filter-control-builder.js](../src/modules/ui/filter-control-builder.js) ligne 396

**Valeurs possibles:** Nombre entre `radiusMin` et `radiusMax` (généralement 10-20)

**Valeur par défaut:** `10`

**État:** ✅ Actif et fonctionnel

---

#### `search.searchPlaceholder` (string, optionnel)

**Description:** Texte de placeholder pour le champ de recherche textuelle.

**Valeurs possibles:** Chaîne de caractères libre

**Valeur par défaut:** `"Rechercher un POI..."`

**État:** ✅ Actif et fonctionnel

---

#### `search.filters` (array, optionnel)

**Description:** Liste des filtres disponibles dans le panneau de recherche.

**Structure de chaque filtre:**

```json
{
    "id": "string",
    "type": "string",
    "label": "string",
    "placeholder": "string",
    "searchFields": ["string"],
    "buttonLabel": "string",
    "instructionText": "string",
    "field": "string"
}
```

**Types de filtres disponibles:**

- `"search"` - Recherche textuelle
- `"proximity"` - Recherche par proximité géographique
- `"tree"` - Arbre de catégories
- `"multiselect-tags"` - Sélection multiple de tags

**Utilisation dans le code:**

```javascript
// ui/filter-panel/renderer.js ligne 55
const filters = searchPanel && Array.isArray(searchPanel.filters) ? searchPanel.filters : null;
```

**Fichiers source:**

- [src/modules/ui/filter-panel/renderer.js](../src/modules/ui/filter-panel/renderer.js) ligne 55
- [src/modules/ui/filter-control-builder.js](../src/modules/ui/filter-control-builder.js)

**État:** ✅ Actif et fonctionnel

---

#### `search.actions` (object, optionnel)

**Description:** Labels des boutons d'action du panneau de filtrage.

**Structure:**

```json
{
    "applyLabel": "string",
    "resetLabel": "string"
}
```

**Valeurs par défaut:**

- `applyLabel`: `"Appliquer"`
- `resetLabel`: `"Réinitialiser"`

**État:** ✅ Actif et fonctionnel

---

## Section layerManagerConfig

### `layerManagerConfig` (object, optionnel)

**Description:** Configuration du gestionnaire de couches.

**Utilisation dans le code:**

```javascript
// geoleaf.layer-manager.js ligne 149
const layerManagerConfig = GeoLeaf.Config.get("layerManagerConfig");
```

**Fichiers source:**

- [src/modules/geoleaf.layer-manager.js](../src/modules/geoleaf.layer-manager.js) ligne 149

**État:** ✅ Actif et fonctionnel

---

#### `layerManagerConfig.title` (string, optionnel)

**Description:** Titre du gestionnaire de couches.

**Valeurs possibles:** Chaîne de caractères libre

**Valeur par défaut:** `"Couches"`

**État:** ✅ Actif et fonctionnel

---

#### `layerManagerConfig.collapsedByDefault` (boolean, optionnel)

**Description:** État replié initial du gestionnaire de couches.

**Utilisation dans le code:**

```javascript
// geoleaf.layer-manager.js ligne 152
collapsed: layerManagerConfig?.collapsedByDefault;
```

**Fichiers source:**

- [src/modules/geoleaf.layer-manager.js](../src/modules/geoleaf.layer-manager.js) ligne 152
- [src/modules/layer-manager/control.js](../src/modules/layer-manager/control.js) ligne 111

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `layerManagerConfig.sections` (array, optionnel)

**Description:** Liste des sections du gestionnaire de couches.

**Structure de chaque section:**

```json
{
  "id": "string",
  "label": "string",
  "order": number,
  "collapsedByDefault": boolean
}
```

**Utilisation dans le code:**

```javascript
// geoleaf.layer-manager.js ligne 173
collapsedByDefault: s.collapsedByDefault;
```

**Fichiers source:**

- [src/modules/geoleaf.layer-manager.js](../src/modules/geoleaf.layer-manager.js) ligne 162-176
- [src/modules/layer-manager/renderer.js](../src/modules/layer-manager/renderer.js) ligne 61-62

**État:** ✅ Actif et fonctionnel

---

## Section legendConfig

### `legendConfig` (object, optionnel)

**Description:** Configuration du composant de légende.

**Utilisation dans le code:**

```javascript
// geoleaf.legend.js ligne 158
const legendConfig = GeoLeaf.Config.get("legendConfig");
```

**Fichiers source:**

- [src/modules/geoleaf.legend.js](../src/modules/geoleaf.legend.js) ligne 158

**État:** ✅ Actif et fonctionnel

---

#### `legendConfig.title` (string, optionnel)

**Description:** Titre de la légende.

**Valeurs possibles:** Chaîne de caractères libre

**Valeur par défaut:** `"Légende"`

**État:** ✅ Actif et fonctionnel

---

#### `legendConfig.collapsedByDefault` (boolean, optionnel)

**Description:** État replié initial de la légende.

**Utilisation dans le code:**

```javascript
// geoleaf.legend.js ligne 163
collapsed: (legendConfig && legendConfig.collapsedByDefault) || false;
```

**Fichiers source:**

- [src/modules/geoleaf.legend.js](../src/modules/geoleaf.legend.js) ligne 163

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `legendConfig.position` (string, optionnel)

**Description:** Position de la légende sur la carte.

**Valeurs possibles:**

- `"topleft"`
- `"topright"`
- `"bottomleft"`
- `"bottomright"`

**Valeur par défaut:** `"bottomleft"`

**État:** ✅ Actif et fonctionnel

---

## Section poiConfig

### `poiConfig` (object, optionnel)

**Description:** Configuration des Points d'Intérêt (POI).

**Utilisation dans le code:**

```javascript
// geojson/clustering.js ligne 25
return Config.get("poiConfig") || {};
```

**Fichiers source:**

- [src/modules/geojson/clustering.js](../src/modules/geojson/clustering.js) ligne 25

**État:** ✅ Actif et fonctionnel

---

#### `poiConfig.clusterStrategy` (string, optionnel)

**Description:** Stratégie de clustering des POI.

**Utilisation dans le code:**

```javascript
// geojson/clustering.js ligne 123
const strategy = poiConfig.clusterStrategy || "unified";
```

**Fichiers source:**

- [src/modules/geojson/clustering.js](../src/modules/geojson/clustering.js) ligne 123, 131
- [src/modules/geojson/loader.js](../src/modules/geojson/loader.js) ligne 495

**Valeurs possibles:**

- `"unified"` - Cluster unique partagé entre toutes les couches (défaut)
- `"by-source"` - Cluster indépendant par source de données

**Valeur par défaut:** `"unified"`

**État:** ✅ Actif et fonctionnel

**Tests:**

- [\_\_tests\_\_/geojson/geojson-layers.test.js](../__tests__/geojson/geojson-layers.test.js) ligne 373

---

## Section brandingConfig

### `brandingConfig` (object, optionnel)

**Description:** Configuration du bandeau d'attribution/branding.

**Utilisation dans le code:**

```javascript
// ui/branding.js ligne 72
const brandingConfig = GeoLeaf.Config?.get("brandingConfig");
```

**Fichiers source:**

- [src/modules/ui/branding.js](../src/modules/ui/branding.js) ligne 72

**État:** ✅ Actif et fonctionnel

---

#### `brandingConfig.enabled` (boolean, optionnel)

**Description:** Active/désactive le bandeau de branding.

**Utilisation dans le code:**

```javascript
// ui/branding.js ligne 74
if (brandingConfig === false || (brandingConfig && brandingConfig.enabled === false)) {
    return;
}
```

**Fichiers source:**

- [src/modules/ui/branding.js](../src/modules/ui/branding.js) ligne 74

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `brandingConfig.text` (string, optionnel)

**Description:** Texte du bandeau de branding (HTML autorisé).

**Utilisation dans le code:**

```javascript
// ui/branding.js ligne 82
this._options.text = brandingConfig.text;
```

**Fichiers source:**

- [src/modules/ui/branding.js](../src/modules/ui/branding.js) ligne 81-82

**Valeurs possibles:** Chaîne HTML

**Valeur par défaut:** `"Propulsé par © GeoLeaf with Leaflet"`

**État:** ✅ Actif et fonctionnel

---

#### `brandingConfig.position` (string, optionnel)

**Description:** Position du bandeau de branding sur la carte.

**Utilisation dans le code:**

```javascript
// ui/branding.js ligne 85
this._options.position = brandingConfig.position;
```

**Fichiers source:**

- [src/modules/ui/branding.js](../src/modules/ui/branding.js) ligne 84-85

**Valeurs possibles:**

- `"topleft"`
- `"topright"`
- `"bottomleft"`
- `"bottomright"`

**Valeur par défaut:** `"bottomleft"`

**État:** ✅ Actif et fonctionnel

---

## Section tableConfig

### `tableConfig` (object, optionnel)

**Description:** Configuration de la table de données tabulaires.

**Utilisation dans le code:**

```javascript
// geoleaf.table.js ligne 90
const globalConfig = GeoLeaf.Config ? GeoLeaf.Config.get("tableConfig") : null;
```

**Fichiers source:**

- [src/modules/geoleaf.table.js](../src/modules/geoleaf.table.js) ligne 90
- [src/modules/table/panel.js](../src/modules/table/panel.js)
- [src/modules/table/renderer.js](../src/modules/table/renderer.js)

**État:** ✅ Actif et fonctionnel

---

#### `tableConfig.enabled` (boolean, optionnel)

**Description:** Active/désactive le module table.

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `tableConfig.defaultVisible` (boolean, optionnel)

**Description:** Table visible par défaut au chargement.

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `false`

**État:** ✅ Actif et fonctionnel

---

#### `tableConfig.pageSize` (number, optionnel)

**Description:** Nombre de lignes par page dans la table.

**Utilisation dans le code:**

```javascript
// geoleaf.table.js ligne 94
pageSize: 50;
```

**Fichiers source:**

- [src/modules/geoleaf.table.js](../src/modules/geoleaf.table.js) ligne 94
- [src/modules/table/renderer.js](../src/modules/table/renderer.js) ligne 84-85

**Valeurs possibles:** Nombre entier > 0 (généralement 25-100)

**Valeur par défaut:** `50`

**État:** ✅ Actif et fonctionnel

**Tests:**

- [\_\_tests\_\_/table/index.test.js](../__tests__/table/index.test.js) ligne 81

---

#### `tableConfig.maxRowsPerLayer` (number, optionnel)

**Description:** Nombre maximum de lignes à afficher par couche.

**Utilisation dans le code:**

```javascript
// geoleaf.table.js ligne 305
const maxRows = this._config.maxRowsPerLayer || 1000;
```

**Fichiers source:**

- [src/modules/geoleaf.table.js](../src/modules/geoleaf.table.js) ligne 95, 305

**Valeurs possibles:** Nombre entier > 0 (généralement 500-5000)

**Valeur par défaut:** `1000`

**État:** ✅ Actif et fonctionnel

**Tests:**

- [\_\_tests\_\_/table/index.test.js](../__tests__/table/index.test.js) ligne 82

---

#### `tableConfig.enableExportButton` (boolean, optionnel)

**Description:** Affiche le bouton d'export CSV/JSON.

**Utilisation dans le code:**

```javascript
// table/panel.js ligne 194
if (config.enableExportButton) {
```

**Fichiers source:**

- [src/modules/table/panel.js](../src/modules/table/panel.js) ligne 194

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

**Tests:**

- [\_\_tests\_\_/table/panel.test.js](../__tests__/table/panel.test.js) ligne 183

---

#### `tableConfig.virtualScrolling` (boolean, optionnel)

**Description:** Active le scrolling virtuel pour les grandes listes.

**Utilisation dans le code:**

```javascript
// table/renderer.js ligne 84
if (config.virtualScrolling && features.length > config.pageSize) {
```

**Fichiers source:**

- [src/modules/table/renderer.js](../src/modules/table/renderer.js) ligne 84

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `tableConfig.defaultHeight` (string, optionnel)

**Description:** Hauteur par défaut de la table.

**Utilisation dans le code:**

```javascript
// table/panel.js ligne 31
container.style.height = config.defaultHeight || "40%";
```

**Fichiers source:**

- [src/modules/table/panel.js](../src/modules/table/panel.js) ligne 31

**Valeurs possibles:** Valeur CSS (ex: `"40%"`, `"300px"`)

**Valeur par défaut:** `"40%"`

**État:** ✅ Actif et fonctionnel

**Tests:**

- [\_\_tests\_\_/table/index.test.js](../__tests__/table/index.test.js) ligne 83

---

#### `tableConfig.minHeight` (string, optionnel)

**Description:** Hauteur minimale de la table (pour redimensionnement).

**Utilisation dans le code:**

```javascript
// table/panel.js ligne 97
const minHeightPx = parseHeight(config.minHeight || "20%", viewportHeight);
```

**Fichiers source:**

- [src/modules/table/panel.js](../src/modules/table/panel.js) ligne 97

**Valeurs possibles:** Valeur CSS (ex: `"20%"`, `"150px"`)

**Valeur par défaut:** `"20%"`

**État:** ✅ Actif et fonctionnel

---

#### `tableConfig.maxHeight` (string, optionnel)

**Description:** Hauteur maximale de la table (pour redimensionnement).

**Utilisation dans le code:**

```javascript
// table/panel.js ligne 98
const maxHeightPx = parseHeight(config.maxHeight || "80%", viewportHeight);
```

**Fichiers source:**

- [src/modules/table/panel.js](../src/modules/table/panel.js) ligne 98

**Valeurs possibles:** Valeur CSS (ex: `"60%"`, `"600px"`)

**Valeur par défaut:** `"60%"`

**État:** ✅ Actif et fonctionnel

---

#### `tableConfig.resizable` (boolean, optionnel)

**Description:** Permet le redimensionnement manuel de la table par l'utilisateur.

**Utilisation dans le code:**

```javascript
// table/panel.js ligne 34
if (config.resizable) {
```

**Fichiers source:**

- [src/modules/table/panel.js](../src/modules/table/panel.js) ligne 34

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

## Section scaleConfig

### `scaleConfig` (object, optionnel)

**Description:** Configuration du contrôle d'échelle de la carte.

**Utilisation dans le code:**

```javascript
// map/scale-control.js ligne 435
? GeoLeaf.Config.get('scaleConfig')
```

**Fichiers source:**

- [src/modules/map/scale-control.js](../src/modules/map/scale-control.js) ligne 435

**Documentation:**

- [docs/config/SCALE_CONFIG.md](../docs/config/SCALE_CONFIG.md)

**État:** ✅ Actif et fonctionnel

---

#### `scaleConfig.scaleGraphic` (boolean, optionnel)

**Description:** Affiche l'échelle graphique (barre graduée).

**Utilisation dans le code:**

```javascript
// map/scale-control.js ligne 59
if (this._config.scaleGraphic !== false) {
```

**Fichiers source:**

- [src/modules/map/scale-control.js](../src/modules/map/scale-control.js) ligne 59, 438

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `scaleConfig.scaleNumeric` (boolean, optionnel)

**Description:** Affiche l'échelle numérique (ratio 1:xxxxx).

**Utilisation dans le code:**

```javascript
// map/scale-control.js ligne 65
if (this._config.scaleNumeric || this._config.scaleNivel) {
```

**Fichiers source:**

- [src/modules/map/scale-control.js](../src/modules/map/scale-control.js) ligne 65, 160, 438

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `scaleConfig.scaleNumericEditable` (boolean, optionnel)

**Description:** Permet l'édition manuelle de l'échelle numérique (zoom direct).

**Prérequis:** `scaleNumeric: true`

**Utilisation dans le code:**

```javascript
// map/scale-control.js ligne 161
if (this._config.scaleNumericEditable) {
```

**Fichiers source:**

- [src/modules/map/scale-control.js](../src/modules/map/scale-control.js) ligne 161, 285

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `scaleConfig.scaleNivel` (boolean, optionnel)

**Description:** Affiche l'indicateur de niveau de zoom.

**Utilisation dans le code:**

```javascript
// map/scale-control.js ligne 169
if (this._config.scaleNivel) {
```

**Fichiers source:**

- [src/modules/map/scale-control.js](../src/modules/map/scale-control.js) ligne 65, 169, 438

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `scaleConfig.position` (string, optionnel)

**Description:** Position du contrôle d'échelle sur la carte.

**Valeurs possibles:**

- `"topleft"`
- `"topright"`
- `"bottomleft"`
- `"bottomright"`

**Valeur par défaut:** `"bottomleft"`

**État:** ✅ Actif et fonctionnel

---

## Section storage

### `storage` (object, optionnel)

**Description:** Configuration du système de stockage et cache hors ligne.

**État:** ✅ Actif et fonctionnel

---

#### `storage.cache` (object, optionnel)

**Description:** Configuration du cache hors ligne.

---

##### `storage.cache.enableProfileCache` (boolean, optionnel)

**Description:** Active le cache des ressources du profil (fichiers JSON, GeoJSON).

**Utilisation dans le code:**

```javascript
// storage/cache/layer-selector.js ligne 97
const profileCacheEnabled = Config.get("storage.cache.enableProfileCache", false);
```

**Fichiers source:**

- [src/modules/storage/cache/layer-selector.js](../src/modules/storage/cache/layer-selector.js) ligne 97

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

##### `storage.cache.enableTileCache` (boolean, optionnel)

**Description:** Active le cache des tuiles des fonds de carte.

**Utilisation dans le code:**

```javascript
// storage/cache/layer-selector.js ligne 98
const tileCacheEnabled = Config.get("storage.cache.enableTileCache", false);
```

**Fichiers source:**

- [src/modules/storage/cache/layer-selector.js](../src/modules/storage/cache/layer-selector.js) ligne 98, 653

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

## Section poiAddConfig

### `poiAddConfig` (object, optionnel)

**Description:** Configuration de la fonctionnalité d'ajout de POI par l'utilisateur.

**État:** ✅ Actif et fonctionnel

---

#### `poiAddConfig.enabled` (boolean, optionnel)

**Description:** Active/désactive la fonctionnalité d'ajout de POI.

**Valeurs possibles:** `true` | `false`

**Valeur par défaut:** `true`

**État:** ✅ Actif et fonctionnel

---

#### `poiAddConfig.defaultPosition` (string, optionnel)

**Description:** Méthode par défaut pour positionner un nouveau POI.

**Utilisation dans le code:**

```javascript
// ui/controls.js ligne 532
const defaultPosition = config?.poiAddConfig?.defaultPosition || "placement-mode";
```

**Fichiers source:**

- [src/modules/ui/controls.js](../src/modules/ui/controls.js) ligne 532, 534

**Valeurs possibles:**

- `"geolocation"` - Utilise la position GPS de l'utilisateur
- `"placement-mode"` - Mode placement manuel sur la carte (clic)
- `"map-center"` - Centre actuel de la carte

**Valeur par défaut:** `"placement-mode"`

**État:** ✅ Actif et fonctionnel

**Tests:**

- Voir les tests unitaires dans `__tests__/poi/`

---

## Paramètres obsolètes/dépréciés

Ces paramètres existent dans le code pour assurer la rétrocompatibilité mais ne devraient plus être utilisés dans les nouveaux profils.

### ⚠️ `panels` (object, déprécié)

**Raison de dépréciation:** Remplacé par la structure plate au premier niveau

**Ancien format:**

```json
{
    "panels": {
        "search": {
            /* config */
        },
        "detail": {
            /* config */
        },
        "route": {
            /* config */
        },
        "poi": {
            /* config */
        }
    }
}
```

**Nouveau format:**

```json
{
    "search": {
        /* config */
    }
}
```

**Support actuel:**

```javascript
// ui/filter-panel/renderer.js ligne 52
const searchPanel = (profile.panels && profile.panels.search) || profile.search;
```

**État:** ⚠️ Supporté pour rétrocompatibilité mais déprécié

**Migration:** Déplacer `profile.panels.search` vers `profile.search`

---

### ⚠️ `defaultSettings.routeConfig` (object, déprécié)

**Raison de dépréciation:** Configuration de routes déplacée vers un autre système

**Utilisation dans le code:**

```javascript
// geoleaf.route.js ligne 371
if (activeProfile && activeProfile.defaultSettings && activeProfile.defaultSettings.routeConfig) {
```

**Fichiers source:**

- [src/modules/geoleaf.route.js](../src/modules/geoleaf.route.js) ligne 371-384

**État:** ⚠️ Supporté pour rétrocompatibilité

---

### ℹ️ Flags de mapping (rétrocompatibilité)

Ces paramètres ne sont PAS dans profile.json mais dans la configuration racine (geoleaf.config.json ou dans `config.data`).

**Noms supportés (par ordre de priorité):**

1. `config.data.enableProfilePoiMapping` ✅ **Recommandé** (utiliser celui-ci)
2. `config.data.useProfilePoiMapping` ⚠️ Rétrocompatibilité
3. `config.data.useMapping` ⚠️ Rétrocompatibilité

**Utilisation dans le code:**

```javascript
// config/profile.js ligne 87-101
isProfilePoiMappingEnabled() {
    // Cherche plusieurs noms pour rétrocompatibilité (priorité décroissante)
    if (typeof dataCfg.enableProfilePoiMapping === "boolean") {
        return dataCfg.enableProfilePoiMapping;  // Préféré
    }
    if (typeof dataCfg.useProfilePoiMapping === "boolean") {
        return dataCfg.useProfilePoiMapping;     // Fallback
    }
    if (typeof dataCfg.useMapping === "boolean") {
        return dataCfg.useMapping;               // Fallback
    }
    return true;
}
```

**Fichiers source:**

- [src/modules/config/profile.js](../src/modules/config/profile.js) ligne 87-101

**État:** ✅ Supportés pour rétrocompatibilité, mais utiliser `enableProfilePoiMapping`

---

## Paramètres manquants dans profile.json

CesArchitecture des fichiers de configuration

Cette section clarifie la structure et l'organisation des fichiers de configuration dans GeoLeaf pour éviter toute confusion entre les différents fichiers.

### 📁 Hiérarchie des fichiers de configuration

```
profiles/{profile-name}/
├── profile.json          ← Configuration principale du profil (THIS FILE)
├── taxonomy.json         ← Catégories, tags, métadonnées (SEPARATE)
├── themes.json          ← Présets de visibilité des couches (SEPARATE)
├── layers.json          ← Définition des couches GeoJSON (SEPARATE)
└── [autres fichiers]

geoleaf.config.json      ← Configuration globale de l'application (ROOT)
```

### 🔄 Responsabilités de chaque fichier

#### **profile.json** (Ce fichier)

- ✅ Configuration **UI**: Visibilité des composants, thèmes, langues
- ✅ Configuration **Performance**: Limites de chargement, délais
- ✅ Configuration **Basemaps**: Fonds de carte disponibles
- ✅ Configuration **Composants**: Tables, légende, gestionnaire de couches
- ✅ Configuration **Filtres/Recherche**: Paramètres de recherche et filtrage
- ✅ **Références** vers taxonomie/thèmes/couches (via `Files`)
- ⚠️ `defaultSettings.routeConfig` : Configuration de routage (déprécié)

#### **taxonomy.json**

- ✅ Catégories et hiérarchie
- ✅ **Métadonnées des icônes** (sprites, formats)
- ✅ Tags et classifications
- ✅ Propriétés de couches non spatiales

#### **themes.json**

- ✅ Presets de visibilité (groupes de couches)
- ✅ Thèmes cartographiques
- ✅ Configurations de styles alternatifs (par thème)

#### **layers.json**

- ✅ Définitions GeoJSON des couches
- ✅ **Métadonnées de chaque couche**: Styles, icônes, attributs
- ✅ Configuration spécifique par couche
- ✅ Chemins vers fichiers de données

### 🎨 Où vit chaque paramètre?

| Paramètre                     | Fichier           | Utilisation                                  |
| ----------------------------- | ----------------- | -------------------------------------------- |
| `icons`                       | **taxonomy.json** | Métadonnées des sprites/icônes               |
| `stylesConfig`                | **profile.json**  | Configuration globale des styles alternatifs |
| `Directory`                   | **layers.json**   | Templates de chemins (définis par couche)    |
| `defaultSettings.routeConfig` | **profile.json**  | Configuration de routage (déprécié)          |
| `ui.*`                        | **profile.json**  | Configuration UI                             |
| `basemaps`                    | **profile.json**  | Fonds de carte                               |
| Tous les autres               | **profile.json**  | Voir section structure                       |

### ✅ Validation

- profile.json contient **uniquement** les paramètres documentés dans ce fichier
- Chaque paramètre a un usage clair et vérifié dans le code source
- Aucun paramètre "fantôme" ou inutilisé
- Architecture cohérente et maintenabl

## Tableau récapitulatif

| Section            | Paramètre                | Type    | Défaut           | État | Obligatoire |
| ------------------ | ------------------------ | ------- | ---------------- | ---- | ----------- |
| Racine             | `id`                     | string  | -                | ✅   | Oui         |
| Racine             | `label`                  | string  | -                | ✅   | Oui         |
| Racine             | `description`            | string  | ""               | ✅   | Non         |
| Racine             | `version`                | string  | "1.0.0"          | ✅   | Non         |
| Files              | `taxonomyFile`           | string  | "taxonomy.json"  | ✅   | Oui         |
| Files              | `themesFile`             | string  | "themes.json"    | ✅   | Oui         |
| Files              | `layersFile`             | string  | "layers.json"    | ✅   | Non         |
| ui                 | `theme`                  | string  | "light"          | ✅   | Non         |
| ui                 | `language`               | string  | "fr"             | ⚠️   | Non         |
| ui                 | `showBaseLayerControls`  | boolean | false            | ✅   | Non         |
| ui                 | `showLayerManager`       | boolean | true             | ✅   | Non         |
| ui                 | `showFilterPanel`        | boolean | true             | ✅   | Non         |
| ui                 | `enableGeolocation`      | boolean | true             | ✅   | Non         |
| ui                 | `showCoordinates`        | boolean | true             | ✅   | Non         |
| ui                 | `showThemeSelector`      | boolean | true             | ✅   | Non         |
| ui                 | `showLegend`             | boolean | true             | ✅   | Non         |
| ui                 | `showCacheButton`        | boolean | false            | ✅   | Non         |
| ui                 | `showAddPoi`             | boolean | false            | ✅   | Non         |
| ui                 | `interactiveShapes`      | boolean | false            | ✅   | Non         |
| basemaps           | `{id}.id`                | string  | -                | ✅   | Oui         |
| basemaps           | `{id}.label`             | string  | -                | ✅   | Oui         |
| basemaps           | `{id}.url`               | string  | -                | ✅   | Oui         |
| basemaps           | `{id}.attribution`       | string  | -                | ✅   | Oui         |
| basemaps           | `{id}.minZoom`           | number  | 0                | ✅   | Non         |
| basemaps           | `{id}.maxZoom`           | number  | 19               | ✅   | Non         |
| basemaps           | `{id}.defaultBasemap`    | boolean | false            | ✅   | Non         |
| basemaps           | `{id}.offline`           | boolean | false            | ✅   | Non         |
| basemaps           | `{id}.offlineBounds`     | object  | -                | ✅   | Non         |
| basemaps           | `{id}.cacheMinZoom`      | number  | 4                | ✅   | Non         |
| basemaps           | `{id}.cacheMaxZoom`      | number  | 12               | ✅   | Non         |
| performance        | `maxConcurrentLayers`    | number  | 10               | ✅   | Non         |
| performance        | `layerLoadDelay`         | number  | 200              | ✅   | Non         |
| performance        | `fitBoundsOnThemeChange` | boolean | false            | ✅   | Non         |
| search             | `title`                  | string  | "Filtres"        | ✅   | Non         |
| search             | `radiusMin`              | number  | 1                | ✅   | Non         |
| search             | `radiusMax`              | number  | 50               | ✅   | Non         |
| search             | `radiusStep`             | number  | 1                | ✅   | Non         |
| search             | `radiusDefault`          | number  | 10               | ✅   | Non         |
| search             | `searchPlaceholder`      | string  | "Rechercher..."  | ✅   | Non         |
| search             | `filters`                | array   | []               | ✅   | Non         |
| search             | `actions`                | object  | {...}            | ✅   | Non         |
| layerManagerConfig | `title`                  | string  | "Couches"        | ✅   | Non         |
| layerManagerConfig | `collapsedByDefault`     | boolean | true             | ✅   | Non         |
| layerManagerConfig | `sections`               | array   | []               | ✅   | Non         |
| legendConfig       | `title`                  | string  | "Légende"        | ✅   | Non         |
| legendConfig       | `collapsedByDefault`     | boolean | true             | ✅   | Non         |
| legendConfig       | `position`               | string  | "bottomleft"     | ✅   | Non         |
| poiConfig          | `clusterStrategy`        | string  | "unified"        | ✅   | Non         |
| brandingConfig     | `enabled`                | boolean | true             | ✅   | Non         |
| brandingConfig     | `text`                   | string  | "..."            | ✅   | Non         |
| brandingConfig     | `position`               | string  | "bottomleft"     | ✅   | Non         |
| tableConfig        | `enabled`                | boolean | true             | ✅   | Non         |
| tableConfig        | `defaultVisible`         | boolean | false            | ✅   | Non         |
| tableConfig        | `pageSize`               | number  | 50               | ✅   | Non         |
| tableConfig        | `maxRowsPerLayer`        | number  | 1000             | ✅   | Non         |
| tableConfig        | `enableExportButton`     | boolean | true             | ✅   | Non         |
| tableConfig        | `virtualScrolling`       | boolean | true             | ✅   | Non         |
| tableConfig        | `defaultHeight`          | string  | "40%"            | ✅   | Non         |
| tableConfig        | `minHeight`              | string  | "20%"            | ✅   | Non         |
| tableConfig        | `maxHeight`              | string  | "60%"            | ✅   | Non         |
| tableConfig        | `resizable`              | boolean | true             | ✅   | Non         |
| scaleConfig        | `scaleGraphic`           | boolean | true             | ✅   | Non         |
| scaleConfig        | `scaleNumeric`           | boolean | true             | ✅   | Non         |
| scaleConfig        | `scaleNumericEditable`   | boolean | true             | ✅   | Non         |
| scaleConfig        | `scaleNivel`             | boolean | true             | ✅   | Non         |
| scaleConfig        | `position`               | string  | "bottomleft"     | ✅   | Non         |
| storage.cache      | `enableProfileCache`     | boolean | true             | ✅   | Non         |
| storage.cache      | `enableTileCache`        | boolean | true             | ✅   | Non         |
| poiAddConfig       | `enabled`                | boolean | true             | ✅   | Non         |
| poiAddConfig       | `defaultPosition`        | string  | "placement-mode" | ✅   | Non         |

**Légende:**

- ✅ : Actif et fonctionnel
- ⚠️ : Défini mais peu utilisé
- ❌ : Non présent/manquant
- 🔶 : Déprécié

---

## Notes finales

### Points d'attention

1. **Nomenclature des sections** : La section `Files` utilise des noms avec suffixe "File" (`taxonomyFile`, `themesFile`) ce qui est cohérent.

2. **Rétrocompatibilité** : Le code supporte l'ancienne structure `profile.panels.search` mais la nouvelle structure `profile.search` est recommandée.

3. **Paramètres data.\*** : Les paramètres comme `data.activeProfile`, `data.profilesBasePath`, `data.enableProfilePoiMapping` ne sont PAS dans profile.json mais dans geoleaf.config.json ou passés via init().

4. **Position Leaflet** : Toutes les positions utilisent les valeurs standard Leaflet : `"topleft"`, `"topright"`, `"bottomleft"`, `"bottomright"`.

5. **Cache hors ligne** : Les paramètres `offline`, `offlineBounds`, `cacheMinZoom`, `cacheMaxZoom` dans basemaps sont pleinement fonctionnels.

### Recommandations

1. **Ajouter `defaultSettings`** pour centraliser les paramètres par défaut de la carte.

2. **Documenter `Directory`** si ce pattern est utilisé pour les couches.

3. **Considérer l'ajout de `stylesConfig`** pour supporter les styles alternatifs.

4. **Maintenir la rétrocompatibilité** avec `panels.*` pendant au moins une version majeure.

5. **Migration `useMapping` → `enableProfilePoiMapping`** dans les exemples et documentation.

---

**Fichier généré automatiquement le 28 janvier 2026**  
**Basé sur l'analyse du code source GeoLeaf JS v3.0.0**
