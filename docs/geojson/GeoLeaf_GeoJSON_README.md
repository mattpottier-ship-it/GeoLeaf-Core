# GeoLeaf.GeoJSON – Documentation du module GeoJSON

**Version**: 3.2.0  
**Fichiers**: `src/static/js/geoleaf.geojson.js` + sous-modules `geojson/` (incl. `layer-manager/` et `loader/`)  
**Dernière mise à jour**: 14 février 2026

---

Le module **GeoLeaf.GeoJSON** gère le chargement, le rendu et la gestion des **couches GeoJSON** dans GeoLeaf.

Il permet :

- d'afficher des lignes, polygones ou points issus d’un GeoJSON ;
- de charger des données soit **inline**, soit via **une URL externe** ;
- d’appliquer des **styles statiques ou dynamiques** ;
- de gérer les interactions (`onEachFeature`) ;
- de déclencher automatiquement un `fitBounds` ;
- de servir de base pour les futurs systèmes avancés (multi-couches, légende dynamique, style par propriétés, etc.).

---

## 1. Rôle fonctionnel de GeoLeaf.GeoJSON

1. Charger du GeoJSON depuis :
   - un objet JavaScript,
   - une URL distante,
   - une configuration JSON externe.

2. Convertir automatiquement les données en :
   - `L.GeoJSON`,
   - avec styles et interactions personnalisables.

3. Gérer :
   - ajout/suppression de couches GeoJSON,
   - centrage automatique (`fitBounds`),
   - styles par défaut ou transmis par l’utilisateur.

4. Préparer la future gestion multi-couches et la légende avancée (Phase 1.8 de la roadmap).

---

## 2. API publique de GeoLeaf.GeoJSON

Le module expose :

- `GeoLeaf.GeoJSON.load(options)`
- `GeoLeaf.GeoJSON.fromObject(geojson, options)`
- `GeoLeaf.GeoJSON.clear()`
- `GeoLeaf.GeoJSON.getLayers()`

---

## 3. `GeoLeaf.GeoJSON.load(options)`

Charge un GeoJSON depuis une URL ou un objet.

```js
GeoLeaf.GeoJSON.load({
  map,
  url: "./data/zones.geojson",
  style: feature => ({
    color: feature.properties.color || "#2288ff",
    weight: 2
  }),
  fitBounds: true
});
```

### 3.1 Paramètres

| Paramètre    | Type     | Obligatoire | Description                                    |
|--------------|----------|-------------|------------------------------------------------|
| `map`        | L.Map    | oui         | Instance Leaflet                               |
| `url`        | string   | non         | Charge un GeoJSON externe                      |
| `data`       | object   | non         | GeoJSON inline (objet JS)                      |
| `style`      | function | non         | Style statique ou dynamique                    |
| `onEach`     | function | non         | Callback pour chaque feature                   |
| `fitBounds`  | boolean  | non         | Centre la carte automatiquement                |

### 3.2 Règles

- Au moins l’un de ces champs doit être fourni :
  - `url`
  - `data`
- Si `url` est fourni → un `fetch()` est exécuté.
- Le chargement est protégé par try/catch → pas d’impact sur les autres modules.

---

## 4. `GeoLeaf.GeoJSON.fromObject(geojson, options)`

Charge un GeoJSON directement sous forme d'objet JavaScript.

```js
GeoLeaf.GeoJSON.fromObject(myGeoJSON, {
  map,
  style: { color: "#ff8800", weight: 3 },
  fitBounds: true
});
```

### 4.1 Cas d’usage

- Données déjà chargées via une API externe.
- Données générées dynamiquement (itinéraire, zones, clusters…).

### 4.2 Comportement

- Crée un `L.GeoJSON` avec :
  - style (optionnel),
  - `onEachFeature` (optionnel).
- Ajoute la couche à la carte.
- Ajoute la couche au registre interne (`_layers`).

---

## 5. Styles statiques et dynamiques

### 5.1 Style statique

```js
style: {
  color: "#0099cc",
  weight: 2,
  fillColor: "#88ccee",
  fillOpacity: 0.5
}
```

### 5.2 Style dynamique

```js
style: feature => ({
  color: feature.properties.type === "river" ? "#4499ff" : "#55aa55",
  weight: 2
})
```

### 5.3 Exemple complet

```js
GeoLeaf.GeoJSON.load({
  map,
  url: "./zones.geojson",
  style: f => ({
    color: f.properties.zoneColor,
    fillOpacity: 0.6
  }),
  onEach: (feature, layer) => {
    layer.bindPopup(`<b>${feature.properties.name}</b>`);
  }
});
```

---

## 6. `onEachFeature` (interactions)

Callback exécuté pour chaque entité du GeoJSON :

```js
onEach: (feature, layer) => {
  layer.bindPopup(feature.properties.name);
  layer.on("mouseover", () => layer.setStyle({ weight: 4 }));
  layer.on("mouseout", () => layer.setStyle({ weight: 2 }));
}
```

Permet de créer :

- popups personnalisées,
- interactions (hover, click…),
- événements personnalisés.

---

## 7. FitBounds automatique

Si l'option `fitBounds: true` est activée :

- après l’ajout de la couche,
- le module calcule les limites (`layer.getBounds()`)
- applique `map.fitBounds(bounds)`.

```js
GeoLeaf.GeoJSON.load({
  map,
  data: myGeoJson,
  fitBounds: true
});
```

---

## 8. `GeoLeaf.GeoJSON.clear()`

Supprime toutes les couches GeoJSON ajoutées par ce module.

```js
GeoLeaf.GeoJSON.clear();
```

- Utile pour recharger des données dynamiques.
- Les couches sont retirées de la carte et du registre interne.

---

## 9. `GeoLeaf.GeoJSON.getLayers()`

Retourne la liste des couches GeoJSON actuellement actives.

```js
const layers = GeoLeaf.GeoJSON.getLayers();
```

---

## 10. Intégration avec la configuration JSON

Exemple de configuration :

```json
{
  "geojson": {
    "enabled": true,
    "url": "./data/polygones.geojson"
  }
}
```

Exemple d’intégration :

```js
if (config.geojson?.enabled) {
  GeoLeaf.GeoJSON.load({
    map,
    url: config.geojson.url,
    fitBounds: true
  });
}
```

---

## 11. Séquence d’utilisation typique

1. `GeoLeaf.Config` charge la configuration JSON.  
2. `GeoLeaf.Core.init()` crée la carte.  
3. `GeoLeaf.Baselayers.init()` active le fond de carte.  
4. `GeoLeaf.POI.init()` ajoute les POI.  
5. `GeoLeaf.GeoJSON.load()` charge les couches GeoJSON.  
6. `GeoLeaf.LayerManager.init()` complète l’interface légende.  

---

## 12. Résumé rapide de l’API GeoLeaf.GeoJSON

| Méthode | Rôle |
|--------|------|
| `load(options)` | Charge un GeoJSON depuis URL ou objet |
| `fromObject(obj, options)` | Charge depuis un objet JS |
| `clear()` | Supprime toutes les couches |
| `getLayers()` | Retourne les couches actives |

---

## 13. Bonnes pratiques

- Toujours fournir un style minimal (surtout pour polygones).
- Activer `fitBounds` pour centrer automatiquement la carte.
- Utiliser des styles dynamiques pour refléter les propriétés du GeoJSON.
- Prévoir une clé `properties` cohérente dans vos données.
- Pour gros fichiers :
  - compresser le GeoJSON,
  - utiliser un simplificateur de géométries,
  - passer à un chargement progressif (Phase 1.8+).

