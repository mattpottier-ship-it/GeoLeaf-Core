# GeoLeaf.Route â€“ Documentation du module Route (ItinÃ©raires / GPX)

Product Version: GeoLeaf Platform V1 **Version**: 4.0.0  
**Fichier**: `src/modules/geoleaf.route.js`  
**DerniÃ¨re mise Ã  jour**: 19 janvier 2026

---

Le module **GeoLeaf.Route** gÃ¨re lâ€™affichage des itinÃ©raires dans GeoLeaf.  
Il constitue la base du futur systÃ¨me avancÃ© dâ€™itinÃ©raires (v1.9), incluant :

- polylignes simples ;
- import GPX natif ;
- gestion de plusieurs segments ;
- waypoints ;
- fitBounds automatique ;
- styles personnalisÃ©s.

---

## 1. RÃ´le fonctionnel de GeoLeaf.Route

1. Charger et afficher des **itinÃ©raires linÃ©aires** sur une carte Leaflet.
2. Permettre deux modes de chargement :
    - via **un fichier GPX** (URL),
    - via **un tableau de coordonnÃ©es** (objet JS inline).
3. Convertir automatiquement les donnÃ©es en `L.Polyline`.
4. Proposer un style par dÃ©faut personnalisable.
5. Centrer automatiquement la carte (`fitBounds`) si demandÃ©.
6. PrÃ©parer le support multi-segments, waypoints, Ã©tapes (Phase 7 de la roadmap).

---

## 2. API publique de GeoLeaf.Route

Le module expose :

- `GeoLeaf.Route.init(options)`
- `GeoLeaf.Route.loadFromGPX(options)`
- `GeoLeaf.Route.loadFromCoordinates(coords, options)`
- `GeoLeaf.Route.clear()`
- `GeoLeaf.Route.getLayer()`

---

## 3. `GeoLeaf.Route.init(options)`

Initialise le module et prÃ©pare la couche d'itinÃ©raire.

```js
GeoLeaf.Route.init({
    map,
    style: {
        color: "#0066ff",
        weight: 4,
    },
});
```

### 3.1 ParamÃ¨tres

| ParamÃ¨tre | Type   | Obligatoire | Description                                     |
| ---------- | ------ | ----------- | ----------------------------------------------- |
| `map`      | L.Map  | oui         | Instance Leaflet                                |
| `style`    | object | non         | Style par dÃ©faut appliquÃ© aux itinÃ©raires |

### 3.2 Comportement

- Stocke la rÃ©fÃ©rence de la carte.
- CrÃ©e un groupe de couche `L.FeatureGroup()` pour y placer :
    - polylignes,
    - waypoints,
    - segments futurs.

---

## 4. `GeoLeaf.Route.loadFromGPX(options)`

Charge un itinÃ©raire depuis un fichier GPX externe.

```js
GeoLeaf.Route.loadFromGPX({
    url: "./data/route.gpx",
    map,
    fitBounds: true,
    style: {
        color: "#ff5500",
        weight: 4,
    },
});
```

### 4.1 ParamÃ¨tres

| ParamÃ¨tre  | Type    | Obligatoire | Description                       |
| ----------- | ------- | ----------- | --------------------------------- |
| `url`       | string  | oui         | Chemin du fichier GPX             |
| `map`       | L.Map   | oui         | Instance Leaflet                  |
| `fitBounds` | boolean | non         | Recentre automatiquement la carte |
| `style`     | object  | non         | Style de la polyline              |

### 4.2 Comportement

1. TÃ©lÃ©charge le GPX via `fetch`.
2. Parse le contenu XML â†’ extraction des points (lat/lng).
3. Construit une polyline Leaflet :
    ```js
    L.polyline(coords, style);
    ```
4. Ajoute la polyline au FeatureGroup.
5. Si `fitBounds = true` :
    ```js
    map.fitBounds(polyline.getBounds());
    ```

### 4.3 Gestion des erreurs

- GPX invalide â†’ log `[GeoLeaf.Route] GPX invalide`
- URL inaccessible â†’ fallback silencieux
- Aucun plantage de l'application

---

## 5. `GeoLeaf.Route.loadFromCoordinates(coords, options)`

Charge un itinÃ©raire Ã  partir dâ€™un tableau de coordonnÃ©es manuellement fourni.

```js
GeoLeaf.Route.loadFromCoordinates(
    [
        [-32.95, -60.65],
        [-32.96, -60.6],
        [-32.97, -60.58],
    ],
    {
        map,
        fitBounds: true,
    }
);
```

### 5.1 ParamÃ¨tres

| ParamÃ¨tre | Type   | Obligatoire | Description           |
| ---------- | ------ | ----------- | --------------------- |
| `coords`   | array  | oui         | Tableau `[lat, lng]`  |
| `options`  | object | non         | style, fitBounds, map |

### 5.2 Comportement

- VÃ©rifie la validitÃ© du tableau de coordonnÃ©es.
- CrÃ©e une polyline avec le style par dÃ©faut ou celui passÃ© dans `options`.
- Ajoute la polyline au FeatureGroup.
- Recentre la carte si demandÃ©.

---

## 6. Style des itinÃ©raires

La polyline accepte les attributs Leaflet classiques :

### Exemple de style

```js
{
  color: "#ff5500",
  weight: 4,
  opacity: 0.9,
  dashArray: "4, 8"
}
```

### Exemple complet

```js
GeoLeaf.Route.loadFromCoordinates(coords, {
    map,
    style: {
        color: "#00cc88",
        weight: 3,
        dashArray: "6, 6",
    },
});
```

---

## 7. FitBounds automatique

Utilisation :

```js
GeoLeaf.Route.loadFromCoordinates(coords, {
    map,
    fitBounds: true,
});
```

Effet :

- calcul de `bounds = polyline.getBounds()`
- recentrage automatique de la vue

---

## 8. Waypoints (prÃ©vu)

Ce module prÃ©pare lâ€™arrivÃ©e de fonctionnalitÃ©s avancÃ©es :

- waypoints (points obligatoires sur le tracÃ©),
- Ã©tapes,
- segments multiples,
- directions symbolisÃ©es,
- affichage dans un panneau dâ€™Ã©tapes.

Ces fonctionnalitÃ©s appartiennent Ã  la **Phase 7 de la roadmap**.

---

## 9. `GeoLeaf.Route.clear()`

Supprime toutes les polylignes et waypoints actuels.

```js
GeoLeaf.Route.clear();
```

- Ne supprime pas le FeatureGroup lui-mÃªme.
- Utile pour recharger un nouvel itinÃ©raire.

---

## 10. `GeoLeaf.Route.getLayer()`

Retourne la couche (FeatureGroup) contenant les polylignes.

```js
const routeLayer = GeoLeaf.Route.getLayer();
```

---

## 11. IntÃ©gration avec la configuration JSON

Exemple :

```json
{
    "route": {
        "enabled": true,
        "gpx": "./data/circuit1.gpx"
    }
}
```

Exemple dâ€™intÃ©gration :

```js
if (config.route?.enabled && config.route.gpx) {
    GeoLeaf.Route.init({ map });
    GeoLeaf.Route.loadFromGPX({
        map,
        url: config.route.gpx,
        fitBounds: true,
    });
}
```

---

## 12. SÃ©quence typique dâ€™utilisation

1. `GeoLeaf.Config` charge le JSON
2. `GeoLeaf.Core.init()` crÃ©e la carte
3. `GeoLeaf.Baselayers.init()` installe la basemap
4. `GeoLeaf.POI.init()` charge les POI
5. `GeoLeaf.Route.init()` prÃ©pare le module route
6. `GeoLeaf.Route.loadFromGPX()` ou `.loadFromCoordinates()`
7. `GeoLeaf.LayerManager.init()` complÃ¨te lâ€™interface

---

## 13. RÃ©sumÃ© rapide de lâ€™API Route

| MÃ©thode                          | RÃ´le                           |
| ---------------------------------- | ------------------------------- |
| `init(options)`                    | Initialise le module Route      |
| `loadFromGPX(options)`             | Charge un itinÃ©raire GPX      |
| `loadFromCoordinates(coords, opt)` | Charge un itinÃ©raire manuel   |
| `clear()`                          | Supprime lâ€™itinÃ©raire      |
| `getLayer()`                       | Retourne la couche FeatureGroup |

---

## 14. Bonnes pratiques

- Toujours appeler `init()` avant tout chargement de route.
- Ã‰viter les GPX trop lourds â†’ optimiser ou simplifier la trace.
- Toujours activer `fitBounds` pour une UX optimale.
- PrÃ©parer dÃ¨s maintenant une structure de donnÃ©es claire :
    - `properties.name`,
    - `properties.difficulty`,
    - `properties.duration`.
