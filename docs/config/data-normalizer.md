# 🔄 GeoLeaf - Système de Normalisation de Données

Product Version: GeoLeaf Platform V1

**Modules** : `GeoLeaf._Normalizer`, `GeoLeaf.Config.Normalization`, `GeoLeaf.Config.DataConverter`  
**Version** : 4.0.0  
**Fichiers source** :

- `src/modules/data/normalizer.js`
- `src/modules/config/normalization.js`
- `src/modules/config/data-converter.js`

**Dernière mise à jour** : 19 janvier 2026

---

## 📋 Vue d'ensemble

Le **système de normalisation de données** GeoLeaf convertit des formats de données variés vers le **format POI unifié** utilisé par l'ensemble de l'écosystème GeoLeaf. Il comprend 3 modules complémentaires :

### 🎯 Objectifs

1. **Normalisation structurelle** : Transformation de données brutes → format GeoLeaf standard
2. **Mapping configurable** : Application de `mapping.json` pour correspondance champs source ↔ cibles
3. **Conversion GeoJSON** : POI/Routes → GeoJSON FeatureCollection
4. **Multi-sources** : Support JSON, GeoJSON, Routes (GPX futur)
5. **Rétrocompatibilité** : Sans mapping.json, les POI passent tels quels (comportement v2)

---

## 🧩 Architecture des modules

```
┌─────────────────────────────────────────────────────────┐
│                    DONNÉES EXTERNES                     │
│  JSON brut │ GeoJSON │ Routes │ GPX (futur)            │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
    ┌─────▼──────┐              ┌──────▼────────┐
    │  Normalizer │              │ DataConverter │
    │   (data/)   │              │   (config/)   │
    └─────┬───────┘              └───────┬───────┘
          │                              │
          │    mapping.json              │
          │         ↓                    │
    ┌─────▼────────────┐                │
    │  Normalization   │                │
    │    (config/)     │                │
    └─────┬────────────┘                │
          │                             │
          └──────────────┬──────────────┘
                         │
                ┌────────▼────────┐
                │   FORMAT POI    │
                │    UNIFIÉ       │
                │  GeoLeaf v3     │
                └─────────────────┘
                         │
          ┌──────────────┴─────────────┐
          │                            │
    ┌─────▼─────┐              ┌──────▼──────┐
    │  POI.js   │              │ GeoJSON.js  │
    │ (markers) │              │  (layers)   │
    └───────────┘              └─────────────┘
```

---

## 📦 Format POI Unifié (GeoLeaf v3)

Le format POI standard utilisé dans tout GeoLeaf :

```javascript
{
  // REQUIS
  id: "poi_123",                    // Identifiant unique (string)
  title: "Restaurant La Bonne Table", // Titre/nom (string)

  // COORDONNÉES (2 formats supportés)
  latlng: [48.8566, 2.3522],       // Format préféré [lat, lng]
  // OU
  location: {                       // Format legacy
    lat: 48.8566,
    lng: 2.3522
  },

  // OPTIONNELS
  description: "Restaurant gastronomique...", // Description courte
  categoryId: "restaurant",         // Catégorie principale
  subCategoryId: "gastronomique",   // Sous-catégorie

  attributes: {                     // Métadonnées extensibles
    address: "123 rue de Paris",
    phone: "+33 1 23 45 67 89",
    website: "https://example.com",
    opening_hours: "9h-18h",
    reviews: {                      // Avis (format v3)
      rating: 4.5,
      count: 127,
      summary: "Excellent restaurant",
      recent: [
        { author: "Jean", rating: 5, comment: "Parfait !" },
        // ...
      ]
    }
    // ... toute autre propriété métier
  }
}
```

---

## 🔧 Module 1 : `GeoLeaf._Normalizer` (data/normalizer.js)

### Rôle

Normalise des données depuis différentes sources (JSON, GeoJSON, Routes, GPX) vers le format POI unifié.

### API Principale

#### `normalizeFromJSON(data, layerConfig)`

Normalise un objet JSON brut en POI.

**Paramètres** :

- `data` (Object) : Données JSON brutes
- `layerConfig` (Object) : Configuration du layer avec mapping
    - `dataMapping` : Correspondance des champs (`{ title: 'nom', lat: 'latitude', ... }`)

**Retourne** : POI normalisé ou `null`

**Exemple** :

```javascript
// Données JSON brutes (API externe)
const rawData = {
    uid: "ext_123",
    nom: "Café de la Gare",
    latitude: 48.8566,
    longitude: 2.3522,
    type: "cafe",
    adresse: "10 rue de la Gare",
};

// Configuration du mapping
const layerConfig = {
    dataMapping: {
        title: "nom",
        lat: "latitude",
        lng: "longitude",
        categoryId: "type",
    },
};

// Normalisation
const poi = GeoLeaf._Normalizer.normalizeFromJSON(rawData, layerConfig);

// Résultat :
// {
//   id: "ext_123",
//   title: "Café de la Gare",
//   latlng: [48.8566, 2.3522],
//   location: { lat: 48.8566, lng: 2.3522 },
//   categoryId: "cafe",
//   attributes: {
//     adresse: "10 rue de la Gare",
//     // ... tous les autres champs
//   }
// }
```

#### `normalizeFromGeoJSON(feature, layerConfig)`

Normalise une Feature GeoJSON en POI.

**Paramètres** :

- `feature` (Object) : GeoJSON Feature (Point/Polygon/LineString)
- `layerConfig` (Object) : Configuration du layer

**Retourne** : POI normalisé

**Exemple** :

```javascript
// GeoJSON Feature
const geoFeature = {
    type: "Feature",
    id: "geoj_456",
    geometry: {
        type: "Point",
        coordinates: [2.3522, 48.8566], // [lng, lat] en GeoJSON
    },
    properties: {
        name: "Tour Eiffel",
        height: 330,
        type: "monument",
    },
};

const poi = GeoLeaf._Normalizer.normalizeFromGeoJSON(geoFeature);

// Résultat :
// {
//   id: "geoj_456",
//   title: "Tour Eiffel",
//   latlng: [48.8566, 2.3522],  // Inversion pour format GeoLeaf
//   geometryType: "Point",
//   attributes: {
//     height: 330,
//     type: "monument"
//   }
// }
```

#### `normalizeFromRoute(routeData, layerConfig)`

Normalise une route (GPX/LineString) en POI.

**Exemple** :

```javascript
const route = {
    id: "route_789",
    name: "Chemin des Vignes",
    coordinates: [
        [48.8566, 2.3522],
        [48.857, 2.353],
        // ...
    ],
    distance: 5200, // mètres
    elevation_gain: 120,
};

const poi = GeoLeaf._Normalizer.normalizeFromRoute(route);
```

#### `normalize(data, sourceType, layerConfig)`

**Méthode générique** qui détermine le type de source et normalise en conséquence.

**Paramètres** :

- `data` : Données brutes (Object/Array)
- `sourceType` (string) : `'json'`, `'geojson'`, `'route'`, `'gpx'`
- `layerConfig` (Object) : Configuration

**Exemple** :

```javascript
// Détection automatique du type
const poi = GeoLeaf._Normalizer.normalize(rawData, "json", layerConfig);

// Type GeoJSON
const poiGeo = GeoLeaf._Normalizer.normalize(geoFeature, "geojson");

// Routes
const poiRoute = GeoLeaf._Normalizer.normalize(routeData, "route");
```

---

## 🔧 Module 2 : `GeoLeaf.Config.Normalization` (config/normalization.js)

### Rôle

Applique un fichier `mapping.json` pour normaliser structurellement des POI non conformes au format GeoLeaf.

### Workflow

```
POI brut                mapping.json              POI normalisé
┌─────────┐            ┌────────────┐            ┌──────────┐
│ {       │            │ {          │            │ {        │
│  nom:   │  ───────>  │  "title":  │  ───────>  │  title:  │
│  "Café" │  applique  │  "nom"     │  résultat  │  "Café"  │
│ }       │            │ }          │            │ }        │
└─────────┘            └────────────┘            └──────────┘
```

### API Principale

#### `isPoiStructNormalized(poi)`

Vérifie si un POI est déjà conforme au format GeoLeaf.

**Critères de validation** :

- ✅ `id` (string non vide)
- ✅ `title` ou `label` (string non vide)
- ✅ Coordonnées : `latlng: [lat, lng]` OU `location: { lat, lng }`

**Exemple** :

```javascript
const poi1 = {
    id: "123",
    title: "Restaurant",
    latlng: [48.8566, 2.3522],
};
console.log(GeoLeaf.Config.Normalization.isPoiStructNormalized(poi1));
// → true

const poi2 = {
    nom: "Restaurant",
    coords: [48.8566, 2.3522],
};
console.log(GeoLeaf.Config.Normalization.isPoiStructNormalized(poi2));
// → false (manque id, title, latlng)
```

#### `mapRawPoiToNormalized(rawPoi, mappingDef)`

Applique un mapping pour transformer un POI brut.

**Paramètres** :

- `rawPoi` (Object) : POI non normalisé
- `mappingDef` (Object) : Définition du mapping (`mapping.json`)

**Exemple de `mapping.json`** :

```json
{
    "mapping": {
        "id": "uid",
        "title": "name",
        "location.lat": "coordinates.latitude",
        "location.lng": "coordinates.longitude",
        "attributes.address": "full_address",
        "attributes.phone": "contact.phone"
    }
}
```

**Utilisation** :

```javascript
const rawPoi = {
    uid: "ext_001",
    name: "Boulangerie Dupont",
    coordinates: {
        latitude: 48.8566,
        longitude: 2.3522,
    },
    full_address: "5 rue du Pain",
    contact: {
        phone: "0123456789",
    },
};

const mapping = {
    id: "uid",
    title: "name",
    "location.lat": "coordinates.latitude",
    "location.lng": "coordinates.longitude",
    "attributes.address": "full_address",
    "attributes.phone": "contact.phone",
};

const normalized = GeoLeaf.Config.Normalization.mapRawPoiToNormalized(rawPoi, mapping);

// Résultat :
// {
//   id: "ext_001",
//   title: "Boulangerie Dupont",
//   location: {
//     lat: 48.8566,
//     lng: 2.3522
//   },
//   attributes: {
//     address: "5 rue du Pain",
//     phone: "0123456789"
//   }
// }
```

#### `normalizePoiWithMapping(rawPoiArray, mappingConfig)`

Normalise un tableau de POI avec `mapping.json`.

**Comportement** :

1. **Sans `mapping.json`** : POI passent tels quels (100% rétrocompatible v2)
2. **Avec `mapping.json`** :
    - POI déjà normalisé → conservé tel quel
    - POI non normalisé → application du mapping
    - POI non normalisé après mapping → ignoré (warning)

**Exemple** :

```javascript
const rawPois = [
    // POI déjà normalisé (conservé)
    {
        id: "001",
        title: "Café A",
        latlng: [48.8566, 2.3522],
    },
    // POI non normalisé (sera mappé)
    {
        uid: "ext_002",
        nom: "Café B",
        lat: 48.857,
        lng: 2.353,
    },
];

const mappingConfig = {
    mapping: {
        id: "uid",
        title: "nom",
        "location.lat": "lat",
        "location.lng": "lng",
    },
};

const normalized = GeoLeaf.Config.Normalization.normalizePoiWithMapping(rawPois, mappingConfig);

// Résultat : 2 POI normalisés (le 1er inchangé, le 2ème mappé)
```

#### `normalizePoiArray(poiArray)`

Normalise le format des avis (reviews) dans un tableau de POI.

**Support de 2 formats** :

```javascript
// FORMAT ANCIEN (v2) : tableau simple
poi.attributes.reviews = [
    { author: "Jean", rating: 5, comment: "Super !" },
    { author: "Marie", rating: 4, comment: "Bien" },
];

// FORMAT NOUVEAU (v3) : objet structuré
poi.attributes.reviews = {
    rating: 4.5, // Note moyenne
    count: 127, // Nombre total
    summary: "Très bon", // Résumé
    recent: [
        // Avis récents
        { author: "Jean", rating: 5, comment: "Super !" },
    ],
};
```

**Exemple** :

```javascript
const pois = [
    {
        id: "001",
        title: "Restaurant A",
        latlng: [48.8566, 2.3522],
        attributes: {
            reviews: [
                // Format ancien
                { author: "Jean", rating: 5 },
                { author: "Marie", rating: 4 },
            ],
        },
    },
];

const normalized = GeoLeaf.Config.Normalization.normalizePoiArray(pois);

// → reviews converti automatiquement en format v3
```

---

## 🔧 Module 3 : `GeoLeaf.Config.DataConverter` (config/data-converter.js)

### Rôle

Convertit des POI/Routes normalisés vers **GeoJSON FeatureCollection** pour affichage par `GeoLeaf.GeoJSON`.

### API Principale

#### `convertPoiArrayToGeoJSON(poiArray)`

Convertit un tableau de POI en GeoJSON FeatureCollection.

**Paramètres** :

- `poiArray` (Array) : Tableau de POI normalisés

**Retourne** : GeoJSON FeatureCollection

**Exemple** :

```javascript
const pois = [
    {
        id: "poi_001",
        title: "Café Central",
        latlng: [48.8566, 2.3522],
        description: "Bar convivial",
        attributes: {
            address: "10 rue Paris",
            phone: "0123456789",
        },
    },
    {
        id: "poi_002",
        title: "Boulangerie",
        location: { lat: 48.857, lng: 2.353 },
    },
];

const geoJSON = GeoLeaf.Config.DataConverter.convertPoiArrayToGeoJSON(pois);

// Résultat :
// {
//   type: "FeatureCollection",
//   features: [
//     {
//       type: "Feature",
//       id: "poi_001",
//       geometry: {
//         type: "Point",
//         coordinates: [2.3522, 48.8566]  // [lng, lat] GeoJSON
//       },
//       properties: {
//         id: "poi_001",
//         title: "Café Central",
//         description: "Bar convivial",
//         address: "10 rue Paris",
//         phone: "0123456789"
//       }
//     },
//     // ... poi_002
//   ]
// }
```

#### `convertRoutesToGeoJSON(routesArray)`

Convertit des routes/GPX en GeoJSON LineString.

**Exemple** :

```javascript
const routes = [
    {
        id: "route_001",
        name: "Sentier des Vignes",
        coordinates: [
            [48.8566, 2.3522],
            [48.857, 2.353],
            [48.8575, 2.3535],
        ],
        distance: 1200,
        attributes: {
            difficulty: "easy",
            duration: "30min",
        },
    },
];

const geoJSON = GeoLeaf.Config.DataConverter.convertRoutesToGeoJSON(routes);

// Résultat : LineString GeoJSON
```

---

## 🎨 Configuration : mapping.json

Le fichier `mapping.json` définit la correspondance entre champs sources et format GeoLeaf.

### Structure

```json
{
    "version": "1.0",
    "description": "Mapping pour API externe XYZ",
    "mapping": {
        "id": "uid",
        "title": "name",
        "description": "short_description",
        "location.lat": "coordinates.latitude",
        "location.lng": "coordinates.longitude",
        "categoryId": "type",
        "attributes.address": "full_address",
        "attributes.phone": "contact.telephone",
        "attributes.website": "links.web",
        "attributes.opening_hours": "horaires"
    }
}
```

### Syntaxe des chemins

- **Chemin simple** : `"title": "nom"` → `source.nom` → `target.title`
- **Chemin imbriqué** : `"location.lat": "coords.latitude"` → `source.coords.latitude` → `target.location.lat`
- **Arrays** : `"attributes.tags": "categories[0]"` → Premier élément du tableau

### Placement du fichier

```
profiles/
└── tourism/
    ├── geoleaf.config.json
    └── mapping.json          ← Fichier de mapping
```

### Activation dans profile

```json
{
  "layers": [
    {
      "id": "pois-externes",
      "type": "poi",
      "url": "https://api.example.com/pois",
      "normalized": false,      ← Active le mapping
      "mappingFile": "mapping.json"
    }
  ]
}
```

---

## 🔄 Flux complet de normalisation

### Scénario : Chargement POI depuis API externe

```javascript
// 1. Récupération des données brutes
const response = await fetch("https://api.example.com/pois");
const rawData = await response.json();
// rawData = [{ uid: "001", nom: "Café", coords: {...} }, ...]

// 2. Chargement du mapping.json
const mappingConfig = await fetch("profiles/tourism/mapping.json");
const mapping = await mappingConfig.json();

// 3. Normalisation structurelle (mapping.json)
const structurallyNormalized = GeoLeaf.Config.Normalization.normalizePoiWithMapping(
    rawData,
    mapping
);
// → Format POI GeoLeaf basique (id, title, location)

// 4. Normalisation sémantique (reviews, etc.)
const fullyNormalized = GeoLeaf.Config.Normalization.normalizePoiArray(structurallyNormalized);
// → Format POI GeoLeaf complet (reviews v3, etc.)

// 5. Conversion en GeoJSON (si affichage comme layer)
const geoJSON = GeoLeaf.Config.DataConverter.convertPoiArrayToGeoJSON(fullyNormalized);
// → FeatureCollection prête pour Leaflet

// 6. Affichage sur la carte
GeoLeaf.GeoJSON.load({
    id: "pois-externes",
    data: geoJSON,
    // ...
});
```

---

## 📊 Exemples pratiques

### Exemple 1 : API de restaurants

**Données brutes** :

```json
[
    {
        "restaurant_id": "rest_123",
        "restaurant_name": "Le Petit Bistrot",
        "geo": {
            "lat": 48.8566,
            "lon": 2.3522
        },
        "contact_info": {
            "tel": "0123456789",
            "web": "https://petitbistrot.fr"
        },
        "rating": {
            "average": 4.5,
            "total_reviews": 127
        }
    }
]
```

**mapping.json** :

```json
{
    "mapping": {
        "id": "restaurant_id",
        "title": "restaurant_name",
        "location.lat": "geo.lat",
        "location.lng": "geo.lon",
        "attributes.phone": "contact_info.tel",
        "attributes.website": "contact_info.web",
        "attributes.reviews.rating": "rating.average",
        "attributes.reviews.count": "rating.total_reviews"
    }
}
```

### Exemple 2 : GeoJSON externe

**Données GeoJSON** :

```json
{
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "id": "monument_456",
            "geometry": {
                "type": "Point",
                "coordinates": [2.3522, 48.8566]
            },
            "properties": {
                "name": "Arc de Triomphe",
                "height": 50,
                "year_built": 1836
            }
        }
    ]
}
```

**Normalisation** :

```javascript
const geoFeature = geoJSON.features[0];
const poi = GeoLeaf._Normalizer.normalizeFromGeoJSON(geoFeature);

// Résultat :
// {
//   id: "monument_456",
//   title: "Arc de Triomphe",
//   latlng: [48.8566, 2.3522],
//   geometryType: "Point",
//   attributes: {
//     height: 50,
//     year_built: 1836
//   }
// }
```

---

## ⚠️ Limitations

1. **GPX** : Support prévu mais non implémenté (Q1 2026)
2. **Validation stricte** : POI sans `id` ou `title` sont ignorés (pas de fallback automatique)
3. **Mapping complexe** : Pas de support pour transformations complexes (calculs, concatenations)
4. **Performance** : Arrays de +10k POI peuvent être lents (optimisation à venir)

---

## 🔗 Modules liés

- **[GeoLeaf.Config](../config/GeoLeaf_Config_README.md)** : Chargement profile + mapping.json
- **[GeoLeaf.POI](../poi/GeoLeaf_POI_README.md)** : Utilise POI normalisés pour markers
- **[GeoLeaf.GeoJSON](../geojson/GeoLeaf_GeoJSON_README.md)** : Affiche GeoJSON converti
- **[GeoLeaf.Route](../route/GeoLeaf_Route_README.md)** : Normalise routes/GPX
- **[GeoLeaf.Storage](../storage/GeoLeaf_Storage_README.md)** : Utilitaires getValueByPath/setValueByPath

---

## 🚀 Améliorations futures

### Phase 1 (Q1 2026)

- [ ] Support GPX natif (import fichiers .gpx)
- [ ] Validation avec JSON Schema pour mapping.json
- [ ] Fallbacks automatiques pour champs manquants

### Phase 2 (Q2 2026)

- [ ] Transformations avancées (calculs, concatenations)
- [ ] Support formats supplémentaires (KML, CSV)
- [ ] Cache de normalisation (éviter re-normalisation)

### Phase 3 (Q3 2026)

- [ ] Web Worker pour normalisation asynchrone
- [ ] Streaming pour gros datasets (+100k POI)
- [ ] TypeScript definitions

---

**Version** : 4.0.0  
**Dernière mise à jour** : 19 janvier 2026  
**Sprint 2** : Documentation complète du système de normalisation ✅
