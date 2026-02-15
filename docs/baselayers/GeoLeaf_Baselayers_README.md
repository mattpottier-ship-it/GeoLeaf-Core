# GeoLeaf.Baselayers â€“ Documentation du module Baselayers
**Version**: 3.2.0  
**Fichier**: `src/static/js/geoleaf.baselayers.js`  
**DerniÃ¨re mise Ã  jour**: 19 janvier 2026

---
Le module **GeoLeaf.Baselayers** gÃ¨re lâ€™ensemble des **fonds de carte (basemaps)** dans GeoLeaf.  
Il fournit :

- un **registre interne** des basemaps disponibles ;
- lâ€™initialisation du fond par dÃ©faut ;
- le changement dynamique de basemap ;
- la crÃ©ation et la gestion de la couche Leaflet correspondante ;
- les liens avec lâ€™UI (attributs `data-gl-baselayer="street|topo|satellite"`).

GeoLeaf.Baselayers ne gÃ¨re **ni les POI**, **ni le thÃ¨me UI**, **ni la lÃ©gende**.  
Il se concentre exclusivement sur la logique cartographique des tuiles.

---

## 1. RÃ´le fonctionnel de GeoLeaf.Baselayers

1. **DÃ©finir les basemaps disponibles**, incluant :
   - Street (OSM)
   - Topo (OpenTopoMap)
   - Satellite (Esri World Imagery)
2. **CrÃ©er et attacher** la couche de tuiles Leaflet correspondant Ã  la basemap active.
3. **Permettre de changer dynamiquement** la basemap active :
   - depuis le code
   - depuis lâ€™UI (Ã©lÃ©ments HTML possÃ©dant `data-gl-baselayer="..."`)
4. Normaliser les options internes :
   - attribution,
   - maxZoom,
   - gestion dâ€™erreurs,
   - logs explicites.

---

## 2. API publique de GeoLeaf.Baselayers

Le module expose :

- `GeoLeaf.Baselayers.init(options)`
- `GeoLeaf.Baselayers.registerBaseLayer(key, definition)`
- `GeoLeaf.Baselayers.setBaseLayer(key)`
- `GeoLeaf.Baselayers.getActiveKey()`
- `GeoLeaf.Baselayers.getRegistry()`

---

## 3. `GeoLeaf.Baselayers.init(options)`

Initialise le module et active un fond de carte.

```js
GeoLeaf.Baselayers.init({
  map: map,                 // instance Leaflet
  defaultKey: "street"      // clÃ© du fond actif initial
});
```

### 3.1 ParamÃ¨tres

| ParamÃ¨tre    | Type     | Obligatoire | Description                               |
|--------------|----------|-------------|-------------------------------------------|
| `map`        | `L.Map`  | oui         | Instance Leaflet existante                |
| `defaultKey` | `string` | non         | Identifiant du baselayer initial          |

### 3.2 Comportement

- VÃ©rifie que `map` est une instance valide.
- Charge le registre interne des basemaps par dÃ©faut.
- DÃ©termine le baselayer initial :
  - celui fourni via `defaultKey`, ou
  - `"street"` par dÃ©faut.
- Monte la couche de tuiles sur la carte.

---

## 4. Registre interne des basemaps

Le module inclut trois basemaps par dÃ©faut :

```js
{
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    }
  },
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    options: {
      attribution: "&copy; OpenTopoMap contributors",
      maxZoom: 17
    }
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: {
      attribution: "Tiles &copy; Esri",
      maxZoom: 19
    }
  }
}
```

---

## 5. `GeoLeaf.Baselayers.registerBaseLayer(key, definition)`

Ajoute un fond de carte personnalisÃ© au registre.

```js
GeoLeaf.Baselayers.registerBaseLayer("mytiles", {
  url: "https://tiles.example.com/{z}/{x}/{y}.png",
  options: {
    attribution: "Â© Example Tiles",
    maxZoom: 20
  }
});
```

### 5.1 ParamÃ¨tres

| ParamÃ¨tre     | Type     | Obligatoire | Description                  |
|---------------|----------|-------------|------------------------------|
| `key`         | string   | oui         | Identifiant unique           |
| `definition`  | object   | oui         | Contient `url` + `options`   |

### 5.2 RÃ¨gles

- Si la clÃ© existe dÃ©jÃ , elle est Ã©crasÃ©e.
- La dÃ©finition doit contenir au minimum :
  - `url: string`
  - `options: object`

---

## 6. `GeoLeaf.Baselayers.setBaseLayer(key)`

Permet de changer dynamiquement le fond de carte.

```js
GeoLeaf.Baselayers.setBaseLayer("topo");
```

### 6.1 Comportement

- VÃ©rifie que la clÃ© existe dans le registre.
- DÃ©monte le fond actif (si existant).
- CrÃ©e une nouvelle instance `L.TileLayer` Ã  partir de la dÃ©finition.
- Attache la nouvelle couche Ã  la carte.
- Met Ã  jour `_activeKey`.

### 6.2 Gestion des erreurs

- Si la clÃ© nâ€™existe pas :
  - log `[GeoLeaf.Baselayers] baselayer introuvable : {key}`
  - aucun changement nâ€™est appliquÃ©.

---

## 7. IntÃ©gration avec lâ€™UI (HTML)

Les basemaps peuvent Ãªtre changÃ©s via le DOM  
en utilisant des Ã©lÃ©ments comportant :

```html
<button data-gl-baselayer="street">Street</button>
<button data-gl-baselayer="topo">Topo</button>
<button data-gl-baselayer="satellite">Satellite</button>
```

Lorsque GeoLeaf.Baselayers voit un clic sur lâ€™un de ces Ã©lÃ©ments :

1. lit la valeur `data-gl-baselayer` ;
2. appelle automatiquement `GeoLeaf.Baselayers.setBaseLayer(key)` ;
3. met Ã  jour lâ€™Ã©tat visuel (si un CSS de style actif est prÃ©vu).

---

## 8. Interaction avec la configuration JSON

Exemple JSON :

```json
{
  "basemap": {
    "id": "topo"
  }
}
```

Exemple intÃ©gration :

```js
GeoLeaf.Baselayers.init({
  map,
  defaultKey: config.basemap?.id || "street"
});
```

---

## 9. SÃ©quence complÃ¨te dâ€™initialisation (schÃ©ma)

1. `GeoLeaf.Config` charge le JSON
2. `GeoLeaf.Core.init()` crÃ©e la carte
3. `GeoLeaf.Baselayers.init({ map, defaultKey })` :
   - charge le registre interne
   - installe la basemap par dÃ©faut
4. Les contrÃ´les UI baselayers deviennent actifs
5. Les autres modules (POI, Route, Legendâ€¦) sâ€™appuient sur la carte dÃ©jÃ  initialisÃ©e

---

## 10. RÃ©sumÃ© rapide de lâ€™API

| MÃ©thode                                  | RÃ´le |
|------------------------------------------|------|
| `init(options)`                          | Initialise le module et active un fond |
| `registerBaseLayer(key, definition)`     | Ajoute un fond personnalisÃ© |
| `setBaseLayer(key)`                      | Change le fond de carte |
| `getActiveKey()`                         | Retourne la clÃ© du fond actif |
| `getRegistry()`                          | Retourne la liste des basemaps disponibles |

---

## 11. Bonnes pratiques

- Toujours initialiser Baselayers **aprÃ¨s** GeoLeaf.Core.
- Toujours fournir un `defaultKey` cohÃ©rent avec le JSON.
- PrÃ©voir des attributs `data-gl-baselayer="..."` dans lâ€™UI pour un changement fluide.
- Documenter les licences des fournisseurs de tuiles (OSM, Topo, Esriâ€¦).
