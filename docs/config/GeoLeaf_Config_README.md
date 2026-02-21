# GeoLeaf.Config – Documentation du module Config (Chargement JSON)

Product Version: GeoLeaf Platform V1  
**Version**: 3.2.0  
**Fichiers**: `src/static/js/config/geoleaf-config/` (4 sous-modules : config-core.js, config-validation.js, config-loaders.js, config-accessors.js)  
**Dernière mise à jour**: 14 février 2026

---

Le module **GeoLeaf.Config** est responsable du chargement et de la validation de la **configuration JSON externe** utilisée par GeoLeaf.

Il fournit :

- le chargement d’un fichier JSON externe (via URL) ;
- la validation minimale du schéma ;
- l’exposition des données au reste des modules ;
- un événement interne indiquant que la configuration est prête ;
- l’appel automatique à un callback utilisateur (`onLoaded`) ;
- le support du mode `autoEvent` pour déclencher un événement DOM personnalisé.

Ce module pilote la **séquence d’initialisation complète** de GeoLeaf.

---

## 1. Rôle fonctionnel de GeoLeaf.Config

1. Charger une configuration JSON depuis :
   - un fichier distant (`url`),
   - un objet JS inline (`data`).
2. Valider les blocs essentiels :
   - `map`,
   - `ui`,
   - `basemap`,
   - `poi`,
   - `geojson`,
   - `route`.
3. Exposer l’objet de configuration aux autres modules (Core, UI, Baselayers, POI…).
4. Déclencher un callback `onLoaded(config)` lorsque tout est prêt.
5. Émettre un événement DOM `"geoleaf:config:loaded"` si `autoEvent` est activé.

Ce module constitue le **point d’entrée** de toute la logique GeoLeaf.

---

## 2. API publique du module Config

- `GeoLeaf.Config.init(options)`
- `GeoLeaf.Config.load(url)`
- `GeoLeaf.Config.get()`
- `GeoLeaf.Config.onLoaded(callback)`

---

## 3. `GeoLeaf.Config.init(options)`

Initialise le module en précisant la source de la configuration.

```js
GeoLeaf.Config.init({
  url: "../data/geoleaf-poi.json",
  autoEvent: true,
  onLoaded: (config) => {
    console.log("Config chargée :", config);
  }
});
```

### 3.1 Paramètres

| Paramètre  | Type     | Obligatoire | Description |
|------------|----------|-------------|-------------|
| `url`      | string   | non (si `data` fourni) | Chemin du fichier JSON |
| `data`     | object   | non (si `url` fourni)  | Configuration inline |
| `autoEvent`| boolean  | non         | Émet l’événement `"geoleaf:config:loaded"` |
| `onLoaded` | function | non         | Callback appelé après chargement |

### 3.2 Comportement

- Si `data` est fourni → la configuration est utilisée immédiatement.
- Si `url` est fourni → appel `GeoLeaf.Config.load(url)` via `fetch`.
- Après chargement :
  - stockage interne de la configuration,
  - appel du callback `onLoaded`,
  - émission de l’événement DOM (si `autoEvent = true`).

---

## 4. `GeoLeaf.Config.load(url)`

Charge la configuration JSON depuis une URL.

```js
GeoLeaf.Config.load("../data/config.json");
```

### 4.1 Comportement

- effectue un `fetch(url)` en mode asynchrone ;
- parse le JSON ;
- stocke les données dans le module ;
- déclenche automatiquement la suite (`onLoaded` + événement).

### 4.2 Gestion d’erreurs

Le module protège entièrement la séquence :

- JSON invalide → log contrôlé
- URL inaccessible → fallback silencieux + message explicite
- aucune interruption de l’application

---

## 5. `GeoLeaf.Config.get()`

Retourne la configuration complète actuellement chargée.

```js
const config = GeoLeaf.Config.get();
```

Utile lorsque :

- un autre module (POI, GeoJSON, Route, Legend) veut accéder au JSON,
- on souhaite debugger la configuration dans la console.

---

## 6. `GeoLeaf.Config.onLoaded(callback)`

Permet d’ajouter dynamiquement un callback qui sera exécuté lorsque la config est prête.

```js
GeoLeaf.Config.onLoaded(cfg => {
  console.log("Configuration prête :", cfg);
});
```

- Les callbacks sont placés dans une file interne.
- Tous sont exécutés après le chargement du JSON.

---

## 7. Structure JSON officielle supportée

Voici la structure minimale recommandée :

```json
{
  "map": {
    "target": "geoleaf-map",
    "center": [-32.95, -60.65],
    "zoom": 12
  },
  "ui": {
    "theme": "light"
  },
  "basemap": {
    "id": "street"
  },
  "poi": [
    {
      "id": "poi-1",
      "latlng": [-32.95, -60.65],
      "label": "Titre",
      "description": "Texte",
      "iconId": "default",
      "properties": {}
    }
  ],
  "geojson": {
    "enabled": true,
    "url": "./data/zones.geojson"
  },
  "route": {
    "enabled": false
  }
}
```

Tous ces blocs sont optionnels **sauf `map`**.

---

## 8. Séquence complète d’initialisation (schéma)

1. `GeoLeaf.Config.init({ url })`  
2. `fetch()` du fichier JSON  
3. JSON chargé → stockage interne  
4. Appel des callbacks `onLoaded(config)`  
5. Émission éventuelle de `geoleaf:config:loaded`  
6. Initialisation des modules :
   - `GeoLeaf.Core.init(config.map)`
   - `GeoLeaf.UI.initThemeToggle()`
   - `GeoLeaf.Baselayers.init({ defaultKey: config.basemap.id })`
   - `GeoLeaf.POI.init()` + chargement des POI
   - `GeoLeaf.GeoJSON.load(config.geojson)`
   - `GeoLeaf.Route.loadFromGPX/Coordinates`
   - `GeoLeaf.LayerManager.init(config.legend)`

---

## 9. Résumé rapide de l’API Config

| Méthode | Rôle |
|--------|------|
| `init(options)` | Démarre le chargement du JSON ou data inline |
| `load(url)` | Charge un fichier JSON externe |
| `get()` | Retourne la configuration courante |
| `onLoaded(cb)` | Ajoute un callback au chargement |

---

## 10. Bonnes pratiques

- Toujours initialiser **Config** avant tous les autres modules.
- Préférer une configuration JSON unique et centralisée.
- Utiliser `autoEvent` pour intégrer GeoLeaf dans des frameworks externes.
- Toujours valider vos fichiers JSON via un formatteur avant utilisation.
- Ne jamais mettre de commentaires dans le JSON (non supporté nativement).

