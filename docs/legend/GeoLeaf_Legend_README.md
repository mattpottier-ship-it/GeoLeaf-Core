# GeoLeaf.LayerManager â€“ Documentation du module Legend (LÃ©gende)

Product Version: GeoLeaf Platform V1 **Version**: 4.0.0  
**Fichier**: `src/modules/geoleaf.legend.js`  
**DerniÃ¨re mise Ã  jour**: 19 janvier 2026

---

Le module **GeoLeaf.LayerManager** gÃ¨re lâ€™affichage de la **lÃ©gende graphique** dans GeoLeaf, placÃ©e en bas Ã  droite de la carte.  
Il constitue un composant dâ€™interface essentiel permettant Ã  lâ€™utilisateur dâ€™identifier facilement :

- les **basemaps** disponibles (Street / Topo / Satellite),
- les catÃ©gories de **POI**,
- les couches **GeoJSON** actives,
- les Ã©lÃ©ments dâ€™itinÃ©raire (dans les versions futures).

Ce module est conÃ§u pour Ãªtre **lÃ©ger, modulaire et entiÃ¨rement UI**, sans interaction directe avec Leaflet.

---

## 1. RÃ´le fonctionnel de GeoLeaf.LayerManager

1. CrÃ©er et afficher un **bloc UI** de lÃ©gende.
2. Afficher dynamiquement :
    - les basemaps disponibles,
    - les couches GeoJSON dÃ©clarÃ©es,
    - les catÃ©gories de POI (future v1.7),
    - les Ã©lÃ©ments dâ€™itinÃ©raire (future v1.9).
3. GÃ©rer les interactions :
    - changement de basemap via clic sur lâ€™item de lÃ©gende,
    - activation/dÃ©sactivation de couches (future v1.8).
4. Utiliser une structure HTML / CSS propre, isolÃ©e et thÃ©mable.

---

## 2. API publique de GeoLeaf.LayerManager

Le module expose :

- `GeoLeaf.LayerManager.init(options)`
- `GeoLeaf.LayerManager.updateBasemaps(list)`
- `GeoLeaf.LayerManager.updateLayers(list)`
- `GeoLeaf.LayerManager.clear()`

---

## 3. Structure HTML gÃ©nÃ©rÃ©e

La lÃ©gende gÃ©nÃ¨re automatiquement un conteneur semblable Ã  :

```html
<div class="gl-legend gl-legend-bottomright">
    <div class="gl-legend-section" data-section="basemaps">
        <div class="gl-legend-title">Fonds de carte</div>
        <ul class="gl-legend-list">
            <li data-gl-baselayer="street">Street</li>
            <li data-gl-baselayer="topo">Topo</li>
            <li data-gl-baselayer="satellite">Satellite</li>
        </ul>
    </div>
</div>
```

Cette structure est ensuite stylÃ©e via `geoleaf-legend.css`.

---

## 4. `GeoLeaf.LayerManager.init(options)`

Initialise la lÃ©gende en crÃ©ant le conteneur et en lâ€™insÃ©rant dans la carte.

```js
GeoLeaf.LayerManager.init({
    position: "bottomright", // bottomright, bottomleft, topright, topleft
    basemaps: ["street", "topo", "satellite"],
});
```

### 4.1 ParamÃ¨tres

| ParamÃ¨tre | Type     | Obligatoire | Description                                 |
| ---------- | -------- | ----------- | ------------------------------------------- |
| `position` | string   | non         | Position CSS du bloc (default: bottomright) |
| `basemaps` | string[] | non         | Liste des fonds de carte Ã  afficher        |
| `layers`   | array    | non         | Liste de couches GeoJSON/itinÃ©raires      |

### 4.2 Comportement

- CrÃ©e un conteneur `<div>` principal.
- Ajoute automatiquement la section basemaps si fournie.
- Ajoute la section layers si prÃ©sente.
- InsÃ¨re le bloc dans le conteneur de la carte (DOM only).
- N'interagit pas directement avec Leaflet.

---

## 5. `GeoLeaf.LayerManager.updateBasemaps(list)`

Actualise uniquement la section â€œFonds de carteâ€.

```js
GeoLeaf.LayerManager.updateBasemaps(["street", "topo"]);
```

Chaque entrÃ©e gÃ©nÃ¨re un `<li>` portant `data-gl-baselayer="..."`.

Ces Ã©lÃ©ments permettent un **plugin UI** qui dÃ©clenche ensuite :

```js
GeoLeaf.Baselayers.setBaseLayer(...)
```

(via un handler dÃ©fini dans le module UI gÃ©nÃ©ral).

---

## 6. `GeoLeaf.LayerManager.updateLayers(list)`

Actualise dynamiquement la section â€œCouchesâ€.

```js
GeoLeaf.LayerManager.updateLayers([
    { id: "zones", label: "Zones" },
    { id: "parcs", label: "Parcs" },
]);
```

Cette fonction prÃ©pare le support :

- des couches GeoJSON multiples (v1.8),
- de la lÃ©gende interactive,
- de lâ€™activation/dÃ©sactivation de couches.

---

## 7. `GeoLeaf.LayerManager.clear()`

RÃ©initialise complÃ¨tement la lÃ©gende.

```js
GeoLeaf.LayerManager.clear();
```

Utile lorsque lâ€™on recharge un fichier de configuration JSON.

---

## 8. IntÃ©gration avec la configuration JSON

Exemple JSON :

```json
{
    "basemap": {
        "id": "topo"
    },
    "legend": {
        "enabled": true,
        "basemaps": ["street", "topo", "satellite"]
    }
}
```

Exemple dâ€™intÃ©gration :

```js
if (config.legend?.enabled) {
    GeoLeaf.LayerManager.init({
        basemaps: config.legend.basemaps,
    });
}
```

---

## 9. SÃ©quence complÃ¨te dâ€™utilisation

1. `GeoLeaf.Config.load()` lit le fichier JSON.
2. `GeoLeaf.Core.init()` crÃ©e la carte.
3. `GeoLeaf.Baselayers.init()` installe la basemap initiale.
4. `GeoLeaf.LayerManager.init()` affiche la lÃ©gende.
5. Lâ€™utilisateur clique sur un item â†’ dÃ©clenche un changement de basemap.
6. Les futures couches GeoJSON apparaissent dans la liste â€œCouchesâ€.

---

## 10. RÃ©sumÃ© rapide de lâ€™API Legend

| MÃ©thode              | RÃ´le                           |
| ---------------------- | ------------------------------- |
| `init(options)`        | Initialise la lÃ©gende         |
| `updateBasemaps(list)` | Met Ã  jour la section basemaps |
| `updateLayers(list)`   | Met Ã  jour la section couches  |
| `clear()`              | Vide entiÃ¨rement la lÃ©gende  |

---

## 11. Bonnes pratiques

- Toujours initialiser la lÃ©gende **aprÃ¨s** GeoLeaf.Core et GeoLeaf.Baselayers.
- Ne jamais Ã©crire de HTML manuel dans la lÃ©gende â†’ utiliser les mÃ©thodes `init` et `update...`.
- Garder les labels courts (â€œStreetâ€, â€œTopoâ€, â€œSat.â€).
- PrÃ©voir un style actif visuel pour la basemap courante.
- PrÃ©parer les entrÃ©es `layers` pour la future version 1.8 (multi-couches GeoJSON).
