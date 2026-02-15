# Guide : Système de Couches GeoJSON Multi-Sources

**Date de création**: Décembre 2025  
**Dernière vérification**: 19 janvier 2026

---

## Vue d'ensemble

Le module `GeoLeaf.GeoJSON` a été étendu pour supporter **plusieurs couches GeoJSON indépendantes**, avec :
- ✅ Affichage/masquage par couche
- ✅ Intégration automatique dans la légende
- ✅ Popups unifiés compatibles avec le système POI existant
- ✅ Clustering intelligent pour les points
- ✅ Configuration par profil métier (tourism, etc.)

---

## Configuration dans `profile.json`

### Structure de Base

Ajoutez une section `geojsonLayers` dans votre fichier `data/profiles/[profile]/profile.json` :

```json
{
  "id": "tourism",
  "label": "Profil tourisme",
  
  "geojsonLayers": [
    {
      "id": "tourism-routes",
      "label": "Itinéraires touristiques",
      "url": "../data/profiles/tourism/geojson/itineraries.geojson",
      "visible": true,
      "fitBoundsOnLoad": false,
      "maxZoomOnFit": 12,
      "clustering": false,
      "style": {
        "color": "#FF9800",
        "weight": 3,
        "opacity": 0.9
      },
      "popupTemplate": "default",
      "detailProfileId": "route_default"
    },
    {
      "id": "tourism-zones",
      "label": "Zones touristiques",
      "url": "../data/profiles/tourism/geojson/zone-test.geojson",
      "visible": true,
      "clustering": false,
      "style": {
        "color": "#0066cc",
        "weight": 2,
        "fillColor": "#66ccff",
        "fillOpacity": 0.35
      },
      "popupTemplate": "default"
    },
    {
      "id": "tourism-poi-nature",
      "label": "POI Nature",
      "url": "../data/profiles/tourism/geojson/poi-naturels.geojson",
      "visible": true,
      "clustering": true,
      "pointStyle": {
        "radius": 8,
        "color": "#ffffff",
        "weight": 2,
        "fillColor": "#10b981",
        "fillOpacity": 0.9
      }
    }
  ]
}
```

### Propriétés des Couches

| Propriété | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `id` | `string` | ✅ | Identifiant unique de la couche |
| `label` | `string` | ✅ | Libellé affiché dans la légende |
| `url` | `string` | ✅ | Chemin vers le fichier GeoJSON |
| `visible` | `boolean` | ❌ (défaut: `true`) | Visibilité initiale |
| `fitBoundsOnLoad` | `boolean` | ❌ (défaut: `false`) | Adapter la vue sur la couche au chargement |
| `maxZoomOnFit` | `number` | ❌ (défaut: 16) | Zoom maximum lors du fitBounds |
| `clustering` | `boolean` | ❌ (défaut: auto) | Activer le clustering (POI uniquement) |
| `style` | `object` | ❌ | Style Leaflet pour polygones/lignes |
| `pointStyle` | `object` | ❌ | Style Leaflet pour points (CircleMarker) |
| `popupTemplate` | `string` | ❌ | Template de popup (non implémenté encore) |
| `detailProfileId` | `string` | ❌ | Profil du panneau de détail (non implémenté encore) |

---

## Configuration Globale : `applyToAllSources`

Dans `data/geoleaf.config.json`, ajoutez la propriété `applyToAllSources` :

```json
{
  "poiConfig": {
    "clustering": true,
    "clusterRadius": 80,
    "disableClusteringAtZoom": 18,
    "showIconsOnMap": true,
    "showPopup": true,
    "tooltipMode": "hover",
    "tooltipMinZoom": 11,
    "applyToAllSources": true  // ← applique ces paramètres à toutes les sources
  }
}
```

> **Note** : Le rayon de recherche par proximité est désormais configuré dans `profile.search` via les propriétés `radiusMin`, `radiusMax`, `radiusStep` et `radiusDefault`.

**Comportement** :
- Si `applyToAllSources: true` → les paramètres `poiConfig` s'appliquent à **tous les POI** (JSON, GeoJSON, GPX)
- Si `applyToAllSources: false` → comportement indépendant par source
- Override possible par couche avec `layerConfig.clustering: false`

---

## Utilisation de l'API

### Chargement Automatique depuis le Profil

```javascript
// Initialiser GeoLeaf
GeoLeaf.init({
  map: {
    target: "geoleaf-map",
    center: [-32.95, -60.65],
    zoom: 12
  }
});

// Charger les couches GeoJSON définies dans le profil actif
GeoLeaf.GeoJSON.loadFromProfile()
  .then((layers) => {
    console.log(`${layers.length} couche(s) chargée(s) :`, layers);
  });
```

### Gestion Manuelle de la Visibilité

```javascript
// Masquer une couche
GeoLeaf.GeoJSON.hideLayer('tourism-routes');

// Afficher une couche
GeoLeaf.GeoJSON.showLayer('tourism-routes');

// Toggle (bascule) la visibilité
GeoLeaf.GeoJSON.toggleLayer('tourism-routes');
```

### Récupération d'Informations

```javascript
// Lister toutes les couches
const allLayers = GeoLeaf.GeoJSON.getAllLayers();
console.log(allLayers);
// => [
//   { id: "tourism-routes", label: "Itinéraires touristiques", visible: true, type: "route", featureCount: 5 },
//   { id: "tourism-zones", label: "Zones touristiques", visible: true, type: "area", featureCount: 1 },
//   { id: "tourism-poi-nature", label: "POI Nature", visible: true, type: "poi", featureCount: 6 }
// ]

// Récupérer une couche spécifique
const layer = GeoLeaf.GeoJSON.getLayerById('tourism-poi-nature');
console.log(layer);
// => { id: "tourism-poi-nature", label: "POI Nature", layer: L.GeoJSON, visible: true, config: {...} }
```

---

## Intégration avec la Légende

Le système s'intègre **automatiquement** avec le module `GeoLeaf.LayerManager` :

1. **Section créée automatiquement** : "Couches GeoJSON"
2. **Items cliquables** : Checkbox/switch par couche
3. **Synchronisation bidirectionnelle** : Légende ↔ Carte

### Événements

```javascript
// Écouter les changements de visibilité
map.on('geoleaf:geojson:visibility-changed', (e) => {
  console.log(`Couche ${e.layerId} : ${e.visible ? 'visible' : 'masquée'}`);
});

// Écouter le chargement des couches
map.on('geoleaf:geojson:layers-loaded', (e) => {
  console.log(`${e.count} couche(s) chargée(s)`, e.layers);
});
```

---

## Popups et Panneau de Détail

### Popups Automatiques

Chaque feature affiche un popup avec :
- **Titre** : `properties.name`, `properties.label` ou `properties.title`
- **Description** : `properties.description` ou `properties.desc`
- **Bouton "Voir détails"** : Si `GeoLeaf.POI.openSidePanel()` disponible

### Format GeoJSON Recommandé

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "poi-001",
        "name": "Parc National",
        "description": "Magnifique parc naturel avec vue panoramique.",
        "category": "nature",
        "subcategory": "parc"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-60.6800, -32.9500]
      }
    }
  ]
}
```

### Panneau de Détail Latéral

Lors du clic sur une feature, le panneau de détail POI existant s'ouvre **automatiquement** avec les données adaptées.

---

## Clustering POI

### Activation Automatique

Le clustering s'active si :
1. La couche contient des géométries de type `Point`
2. `poiConfig.applyToAllSources === true` (config globale)
3. `poiConfig.clustering === true` (config globale)
4. `layerConfig.clustering !== false` (pas de désactivation explicite)

### Override par Couche

```json
{
  "id": "poi-sans-cluster",
  "label": "POI sans clustering",
  "url": "poi.geojson",
  "clustering": false  // ← Désactive le clustering pour cette couche uniquement
}
```

---

## Types de Géométries Supportés

| Type Geometry | Rendu | Style Config | Clustering |
|---------------|-------|--------------|------------|
| `Point` | CircleMarker ou Marker | `pointStyle` | ✅ Oui |
| `LineString` | Polyline | `style` | ❌ Non |
| `Polygon` | Polygon | `style` | ❌ Non |
| `MultiPoint` | Multiples CircleMarkers | `pointStyle` | ✅ Oui |
| `MultiLineString` | Multiples Polylines | `style` | ❌ Non |
| `MultiPolygon` | Multiples Polygons | `style` | ❌ Non |

---

## Limites et Performances

### Limite de Couches

- **Avertissement** si > 10 couches dans `geojsonLayers[]`
- **Recommandation** : 3-5 couches max pour performances optimales

### Limite de Features

- Aucune limite technique, mais surveiller les performances si > 5000 features/couche
- Utiliser le clustering pour les couches POI denses

### Optimisations Leaflet

- Chaque couche utilise un `L.featureGroup()` indépendant
- Clustering via `L.markerClusterGroup()` pour POI
- Removal/Add efficace via références Map

---

## Exemples Complets

### Exemple 1 : 3 Couches (POI, Routes, Zones)

```json
"geojsonLayers": [
  {
    "id": "poi-restaurants",
    "label": "Restaurants",
    "url": "../data/profiles/tourism/geojson/restaurants.geojson",
    "visible": true,
    "clustering": true,
    "pointStyle": {
      "radius": 8,
      "fillColor": "#f97316",
      "color": "#fff",
      "weight": 2,
      "fillOpacity": 0.9
    }
  },
  {
    "id": "routes-velo",
    "label": "Pistes cyclables",
    "url": "../data/profiles/tourism/geojson/routes-velo.geojson",
    "visible": false,
    "clustering": false,
    "style": {
      "color": "#10b981",
      "weight": 4,
      "opacity": 0.8
    }
  },
  {
    "id": "zones-protection",
    "label": "Zones protégées",
    "url": "../data/profiles/tourism/geojson/zones-protection.geojson",
    "visible": true,
    "style": {
      "color": "#3b82f6",
      "weight": 2,
      "fillColor": "#93c5fd",
      "fillOpacity": 0.3
    }
  }
]
```

### Exemple 2 : Contrôle Programmatique

```javascript
// Charger les couches
await GeoLeaf.GeoJSON.loadFromProfile();

// Masquer toutes les couches sauf une
const layers = GeoLeaf.GeoJSON.getAllLayers();
layers.forEach((layer) => {
  if (layer.id !== 'poi-restaurants') {
    GeoLeaf.GeoJSON.hideLayer(layer.id);
  }
});

// Afficher uniquement les POI visibles
const visibleLayers = layers.filter(l => l.visible && l.type === 'poi');
console.log('POI visibles :', visibleLayers.length);
```

---

## Migration depuis l'Ancien Système

### Avant (Module Simple)

```javascript
GeoLeaf.GeoJSON.init({ map });
GeoLeaf.GeoJSON.loadUrl('zones.geojson');
```

### Après (Multi-Couches)

```javascript
// Configuration dans profile.json
{
  "geojsonLayers": [
    {
      "id": "zones",
      "label": "Zones",
      "url": "zones.geojson",
      "visible": true
    }
  ]
}

// Chargement automatique
GeoLeaf.GeoJSON.init({ map });
await GeoLeaf.GeoJSON.loadFromProfile();
```

### Compatibilité Descendante

Les méthodes `loadUrl()`, `addData()`, `clear()`, `getLayer()` sont **conservées** pour compatibilité.

---

## Troubleshooting

### Problème : Les couches ne s'affichent pas

**Vérifier** :
1. URL des fichiers GeoJSON correcte (relative au profil)
2. `visible: true` dans la config
3. Console navigateur pour erreurs de chargement (404, JSON invalide)
4. Appel à `GeoLeaf.GeoJSON.init()` avant `loadFromProfile()`

### Problème : Le clustering ne fonctionne pas

**Vérifier** :
1. `leaflet.markerclusterGroup` chargé (dépendance externe)
2. `poiConfig.clustering: true` dans `geoleaf.config.json`
3. `poiConfig.applyToAllSources: true` dans `geoleaf.config.json`
4. Géométries de type `Point` (pas `Polygon` ou `LineString`)
5. Pas de `clustering: false` dans `layerConfig`

### Problème : La légende n'apparaît pas

**Vérifier** :
1. Module `GeoLeaf.LayerManager` initialisé
2. `ui.showLegend: true` dans config globale
3. Au moins une couche chargée avec succès

---

## Références

- **Module Core** : [`src/static/js/geoleaf.geojson.js`](../../src/static/js/geoleaf.geojson.js)
- **API Publique** : [`src/static/js/geoleaf.api.js`](../../src/static/js/geoleaf.api.js)
- **Tests** : [`__tests__/geojson-layers.test.js`](../../__tests__/geojson-layers.test.js)
- **Exemples Profile** : [`data/profiles/tourism/profile.json`](../../data/profiles/tourism/profile.json)

---

## Changelog

### v2.1.0 (Décembre 2025)

- ✅ Architecture multi-couches avec `Map<layerId, LayerObject>`
- ✅ Méthodes `showLayer()`, `hideLayer()`, `toggleLayer()`
- ✅ Intégration automatique avec Legend
- ✅ Popups unifiés compatibles POI
- ✅ Clustering intelligent via `applyToAllSources`
- ✅ Configuration par profil métier
- ✅ Tests unitaires complets
- ✅ API publique étendue
