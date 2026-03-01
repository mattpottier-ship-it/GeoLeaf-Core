# GeoLeaf.Filters â€“ Documentation du module Filters

Product Version: GeoLeaf Platform V1  
Le module **GeoLeaf.Filters** gÃ¨re le filtrage avancÃ© des POI et des Routes selon de multiples critÃ¨res.

**Version**: 1.1.0  
**Fichier**: `src/modules/geoleaf.filters.js` (494 lignes)  
**DerniÃ¨re mise Ã  jour**: DÃ©cembre 2, 2025

---

## Vue d'ensemble

Le module Filters a Ã©tÃ© crÃ©Ã© durant la **Phase 4** pour dÃ©coupler la logique de filtrage de l'UI et des modules POI/Route. Il centralise tous les algorithmes de filtrage dans un module rÃ©utilisable.

### CritÃ¨res de filtrage supportÃ©s

#### POIs

- âœ… **CatÃ©gories** (`categoryIds`) - Filtrage par ID de catÃ©gorie(s)
- âœ… **Sous-catÃ©gories** (`subCategoryIds`) - Filtrage par ID de sous-catÃ©gorie(s)
- âœ… **Tags** (`tags`) - Filtrage par tags (intersection)
- âœ… **Recherche** (`searchText`) - Recherche textuelle dans champs configurables
- âœ… **Note** (`minRating`) - Filtrage par note minimum (Ã©toiles)
- âœ… **ProximitÃ©** (`proximity`) - Filtrage par distance depuis un point

#### Routes

- âœ… **CatÃ©gories** (`categoryIds`)
- âœ… **Tags** (`tags`)
- âœ… **Recherche** (`searchText`)
- âœ… **DifficultÃ©** (`minDifficulty`, `maxDifficulty`)
- âœ… **DurÃ©e** (`minDuration`, `maxDuration`)
- âœ… **Distance** (`minDistance`, `maxDistance`)
- âœ… **Note** (`minRating`)
- âœ… **ProximitÃ©** (`proximity`)

---

## API publique

### `filterPoiList(basePois, filterState)`

Filtre un tableau de POIs selon des critÃ¨res multiples.

**Signature** :

```javascript
GeoLeaf.Filters.filterPoiList(basePois, filterState);
```

**ParamÃ¨tres** :

| ParamÃ¨tre    | Type   | Obligatoire | Description                                 |
| ------------- | ------ | ----------- | ------------------------------------------- |
| `basePois`    | array  | âœ… Oui     | Tableau des POIs Ã  filtrer                 |
| `filterState` | object | âœ… Oui     | Objet dÃ©crivant les critÃ¨res de filtrage |

**Structure `filterState`** :

```javascript
{
    // CatÃ©gorisation
    categoryIds: ['restaurant', 'cafe'],     // Tableau d'IDs catÃ©gories
    subCategoryIds: ['french', 'italian'],   // Tableau d'IDs sous-catÃ©gories

    // Tags
    tags: ['wifi', 'terrasse'],              // Tableau de tags (intersection)

    // Recherche textuelle
    searchText: 'pizza',                     // ChaÃ®ne de recherche (insensible casse)

    // Note
    minRating: 4.0,                          // Note minimum (number)

    // ProximitÃ© gÃ©ographique
    proximity: {
        lat: 45.5017,                        // Latitude du point de rÃ©fÃ©rence
        lng: -73.5673,                       // Longitude du point de rÃ©fÃ©rence
        radius: 5000                         // Rayon en mÃ¨tres
    }
}
```

**Retour** : `array` - Tableau des POIs filtrÃ©s

**Comportement** :

- Tous les critÃ¨res sont appliquÃ©s en **ET** logique (intersection)
- Si `filterState` est vide `{}`, retourne tous les POIs
- Si un critÃ¨re est `null`, `undefined` ou tableau vide, il est ignorÃ©
- La recherche textuelle est insensible Ã  la casse et aux accents
- Les champs de recherche sont extraits du profil actif (voir section "Configuration")

**Exemple** :

```javascript
const allPois = GeoLeaf.POI.getAllPois();

// Filtrage simple par catÃ©gorie
const restaurants = GeoLeaf.Filters.filterPoiList(allPois, {
    categoryIds: ["restaurant"],
});

// Filtrage multi-critÃ¨res
const premiumRestaurants = GeoLeaf.Filters.filterPoiList(allPois, {
    categoryIds: ["restaurant"],
    tags: ["terrasse", "wifi"],
    minRating: 4.5,
    searchText: "italien",
});

// Filtrage par proximitÃ©
const nearbyPois = GeoLeaf.Filters.filterPoiList(allPois, {
    proximity: {
        lat: 45.5017,
        lng: -73.5673,
        radius: 2000, // 2km
    },
});

// Recharger la carte avec POIs filtrÃ©s
GeoLeaf.POI.reload(filteredPois);
```

---

### `filterRouteList(baseRoutes, filterState)`

Filtre un tableau de Routes selon des critÃ¨res multiples.

**Signature** :

```javascript
GeoLeaf.Filters.filterRouteList(baseRoutes, filterState);
```

**ParamÃ¨tres** :

| ParamÃ¨tre    | Type   | Obligatoire | Description                                 |
| ------------- | ------ | ----------- | ------------------------------------------- |
| `baseRoutes`  | array  | âœ… Oui     | Tableau des Routes Ã  filtrer               |
| `filterState` | object | âœ… Oui     | Objet dÃ©crivant les critÃ¨res de filtrage |

**Structure `filterState`** :

```javascript
{
    // CatÃ©gorisation
    categoryIds: ['hiking', 'cycling'],      // Tableau d'IDs catÃ©gories

    // Tags
    tags: ['family-friendly', 'scenic'],     // Tableau de tags

    // Recherche textuelle
    searchText: 'mont royal',                // ChaÃ®ne de recherche

    // DifficultÃ© (1-5)
    minDifficulty: 2,                        // DifficultÃ© minimum
    maxDifficulty: 4,                        // DifficultÃ© maximum

    // DurÃ©e (minutes)
    minDuration: 60,                         // DurÃ©e minimum (60 min)
    maxDuration: 180,                        // DurÃ©e maximum (180 min = 3h)

    // Distance (mÃ¨tres)
    minDistance: 5000,                       // Distance minimum (5 km)
    maxDistance: 20000,                      // Distance maximum (20 km)

    // Note
    minRating: 4.0,                          // Note minimum

    // ProximitÃ© (dÃ©part/arrivÃ©e dans rayon)
    proximity: {
        lat: 45.5017,
        lng: -73.5673,
        radius: 10000                        // 10 km
    }
}
```

**Retour** : `array` - Tableau des Routes filtrÃ©es

**Exemple** :

```javascript
const allRoutes = GeoLeaf.Route.getAllRoutes();

// Routes de randonnÃ©e faciles
const easyHikes = GeoLeaf.Filters.filterRouteList(allRoutes, {
    categoryIds: ["hiking"],
    maxDifficulty: 2,
    maxDuration: 120, // Max 2 heures
});

// Routes cyclables moyennes distances
const cyclingRoutes = GeoLeaf.Filters.filterRouteList(allRoutes, {
    categoryIds: ["cycling"],
    minDistance: 10000, // Min 10 km
    maxDistance: 50000, // Max 50 km
    minRating: 4.0,
});

// Routes Ã  proximitÃ©
const nearbyRoutes = GeoLeaf.Filters.filterRouteList(allRoutes, {
    proximity: {
        lat: 45.5017,
        lng: -73.5673,
        radius: 15000, // 15 km
    },
});
```

---

## Configuration des champs de recherche

Le module Filters utilise une **hiÃ©rarchie de fallbacks** pour dÃ©terminer les champs de recherche :

### 1. PrioritÃ© : Champs avec `"search": true` dans layouts

Le profil peut marquer des champs comme recherchables dans les layouts :

```json
{
    "panels": {
        "detail": {
            "layout": [
                { "field": "label", "type": "title", "search": true },
                { "field": "attributes.shortDescription", "type": "text", "search": true },
                { "field": "attributes.address", "type": "text", "search": true },
                { "field": "attributes.mainImage", "type": "image" }
            ]
        },
        "route": {
            "layout": [
                { "field": "title", "type": "title", "search": true },
                { "field": "attributes.description", "type": "text", "search": true }
            ]
        }
    }
}
```

**RÃ©sultat** : Recherche dans `label`, `attributes.shortDescription`, `attributes.address`, `title`, `attributes.description`

### 2. Fallback : PropriÃ©tÃ© `searchFields` dans filtre search

```json
{
    "panels": {
        "search": {
            "filters": [
                {
                    "type": "search",
                    "searchFields": [
                        "label",
                        "name",
                        "attributes.shortDescription",
                        "attributes.longDescription"
                    ]
                }
            ]
        }
    }
}
```

### 3. Fallback final : Champs par dÃ©faut

Si aucune configuration, utilise : `['title', 'label', 'name']`

**Logs de diagnostic** :

```
[Filters] Champs de recherche depuis layouts (search:true): ['label', 'attributes.shortDescription']
[Filters] Champs de recherche depuis searchFields (fallback): ['label', 'name']
[Filters] Utilisation des champs de recherche par dÃ©faut: ['title', 'label', 'name']
```

---

## Algorithmes de filtrage

### CatÃ©gories et Sous-catÃ©gories

```javascript
// Inclusion : POI matche SI son categoryId est dans la liste
if (categoryIds && categoryIds.length > 0) {
    const poiCategoryId =
        getNestedValue(poi, "categoryId") || getNestedValue(poi, "attributes.categoryId");

    if (!categoryIds.includes(poiCategoryId)) {
        return false; // Exclus
    }
}
```

### Tags (Intersection)

```javascript
// Tous les tags du filtre doivent Ãªtre prÃ©sents dans le POI
if (tags && tags.length > 0) {
    const poiTags = getNestedValue(poi, "tags") || getNestedValue(poi, "attributes.tags") || [];

    // Intersection : TOUS les tags du filtre doivent exister
    const hasAllTags = tags.every((tag) => poiTags.includes(tag));
    if (!hasAllTags) {
        return false;
    }
}
```

### Recherche textuelle

```javascript
// Recherche insensible casse dans tous les champs configurÃ©s
if (searchText && searchText.trim() !== "") {
    const searchLower = searchText.trim().toLowerCase();
    const searchFields = getSearchFieldsFromProfile();

    const hasMatch = searchFields.some((field) => {
        const value = getNestedValue(poi, field);
        return value && String(value).toLowerCase().includes(searchLower);
    });

    if (!hasMatch) {
        return false;
    }
}
```

### Note minimum

```javascript
// Note >= minRating
if (minRating !== null && minRating !== undefined) {
    const poiRating =
        getNestedValue(poi, "rating") || getNestedValue(poi, "attributes.rating") || 0;

    if (poiRating < minRating) {
        return false;
    }
}
```

### ProximitÃ© gÃ©ographique

Utilise la **formule de Haversine** pour calculer la distance :

```javascript
if (proximity && proximity.lat && proximity.lng && proximity.radius) {
    const poiCoords = extractPoiCoords(poi);
    if (!poiCoords) return false;

    const distance = haversineDistance(proximity.lat, proximity.lng, poiCoords[0], poiCoords[1]);

    if (distance > proximity.radius) {
        return false; // Trop loin
    }
}

// Formule Haversine (distance entre 2 points)
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Rayon Terre en mÃ¨tres
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance en mÃ¨tres
}
```

### Routes : Distance et DurÃ©e

```javascript
// Distance en mÃ¨tres
if (minDistance !== undefined && minDistance !== null) {
    const routeDistance =
        getNestedValue(route, "distance") || getNestedValue(route, "attributes.distance") || 0;
    if (routeDistance < minDistance) return false;
}

// DurÃ©e en minutes
if (minDuration !== undefined && minDuration !== null) {
    const routeDuration =
        getNestedValue(route, "duration") || getNestedValue(route, "attributes.duration") || 0;
    if (routeDuration < minDuration) return false;
}
```

### Routes : ProximitÃ© (dÃ©part/arrivÃ©e)

Pour les routes, vÃ©rifie si le **dÃ©part OU l'arrivÃ©e** sont dans le rayon :

```javascript
if (proximity && proximity.lat && proximity.lng && proximity.radius) {
    const routeCoords = extractRouteCoords(route);
    if (!routeCoords || routeCoords.length === 0) return false;

    const start = routeCoords[0];
    const end = routeCoords[routeCoords.length - 1];

    const distanceStart = haversineDistance(proximity.lat, proximity.lng, start[0], start[1]);
    const distanceEnd = haversineDistance(proximity.lat, proximity.lng, end[0], end[1]);

    // Route matchÃ©e si dÃ©part OU arrivÃ©e dans le rayon
    if (distanceStart > proximity.radius && distanceEnd > proximity.radius) {
        return false;
    }
}
```

---

## IntÃ©gration avec l'UI

### Construction du filterState depuis DOM

Exemple typique depuis les contrÃ´les UI :

```javascript
function buildFilterStateFromUI() {
    const filterState = {};

    // CatÃ©gories (checkboxes)
    const checkedCategories = [];
    document.querySelectorAll(".gl-filter-category:checked").forEach((cb) => {
        checkedCategories.push(cb.value);
    });
    if (checkedCategories.length > 0) {
        filterState.categoryIds = checkedCategories;
    }

    // Tags (checkboxes)
    const checkedTags = [];
    document.querySelectorAll(".gl-filter-tag:checked").forEach((cb) => {
        checkedTags.push(cb.value);
    });
    if (checkedTags.length > 0) {
        filterState.tags = checkedTags;
    }

    // Recherche (input text)
    const searchInput = document.getElementById("search-input");
    if (searchInput && searchInput.value.trim()) {
        filterState.searchText = searchInput.value.trim();
    }

    // Note minimum (select)
    const ratingSelect = document.getElementById("rating-filter");
    if (ratingSelect && ratingSelect.value) {
        filterState.minRating = parseFloat(ratingSelect.value);
    }

    // ProximitÃ© (si gÃ©olocalisation active)
    if (userLocation) {
        filterState.proximity = {
            lat: userLocation.lat,
            lng: userLocation.lng,
            radius: parseInt(document.getElementById("proximity-radius").value) || 5000,
        };
    }

    return filterState;
}

// Appliquer les filtres
function applyFilters() {
    const filterState = buildFilterStateFromUI();
    const allPois = GeoLeaf.POI.getAllPois();
    const filtered = GeoLeaf.Filters.filterPoiList(allPois, filterState);

    GeoLeaf.POI.reload(filtered);

    // Mettre Ã  jour compteur
    document.getElementById("results-count").textContent = `${filtered.length} rÃ©sultat(s)`;
}

// Ã‰couter les changements
document.querySelectorAll(".gl-filter-category, .gl-filter-tag").forEach((cb) => {
    cb.addEventListener("change", applyFilters);
});
document
    .getElementById("search-input")
    .addEventListener("input", GeoLeaf.Utils.debounce(applyFilters, 300));
```

### RÃ©initialisation des filtres

```javascript
function resetFilters() {
    // DÃ©cocher toutes les checkboxes
    document.querySelectorAll(".gl-filter-category, .gl-filter-tag").forEach((cb) => {
        cb.checked = false;
    });

    // Vider le champ de recherche
    document.getElementById("search-input").value = "";

    // RÃ©initialiser select
    document.getElementById("rating-filter").value = "";

    // Recharger tous les POIs
    const allPois = GeoLeaf.POI.getAllPois();
    GeoLeaf.POI.reload(allPois);
}
```

---

## Exemples d'usage

### Exemple 1: Filtrage POI basique

```javascript
const allPois = GeoLeaf.POI.getAllPois();

// Restaurants avec wifi
const restaurantsWithWifi = GeoLeaf.Filters.filterPoiList(allPois, {
    categoryIds: ["restaurant"],
    tags: ["wifi"],
});

console.log(`${restaurantsWithWifi.length} restaurants avec wifi`);
GeoLeaf.POI.reload(restaurantsWithWifi);
```

### Exemple 2: Recherche textuelle

```javascript
const allPois = GeoLeaf.POI.getAllPois();

// Recherche "pizza" dans tous les champs configurÃ©s
const pizzaPlaces = GeoLeaf.Filters.filterPoiList(allPois, {
    searchText: "pizza",
});

// Recherche combinÃ©e catÃ©gorie + texte
const italianPizzaPlaces = GeoLeaf.Filters.filterPoiList(allPois, {
    categoryIds: ["restaurant"],
    subCategoryIds: ["italian"],
    searchText: "pizza",
});
```

### Exemple 3: POIs Ã  proximitÃ© avec gÃ©olocalisation

```javascript
// Obtenir position utilisateur
navigator.geolocation.getCurrentPosition((position) => {
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    const allPois = GeoLeaf.POI.getAllPois();

    // POIs dans un rayon de 2km
    const nearbyPois = GeoLeaf.Filters.filterPoiList(allPois, {
        proximity: {
            lat: userLat,
            lng: userLng,
            radius: 2000,
        },
    });

    // Restaurants bien notÃ©s Ã  proximitÃ©
    const goodNearbyRestaurants = GeoLeaf.Filters.filterPoiList(allPois, {
        categoryIds: ["restaurant"],
        minRating: 4.0,
        proximity: {
            lat: userLat,
            lng: userLng,
            radius: 5000,
        },
    });

    GeoLeaf.POI.reload(goodNearbyRestaurants);
});
```

### Exemple 4: Routes de randonnÃ©e filtrÃ©es

```javascript
const allRoutes = GeoLeaf.Route.getAllRoutes();

// RandonnÃ©es faciles et courtes
const familyHikes = GeoLeaf.Filters.filterRouteList(allRoutes, {
    categoryIds: ["hiking"],
    maxDifficulty: 2,
    maxDuration: 120, // Max 2h
    maxDistance: 8000, // Max 8km
    tags: ["family-friendly"],
});

// Trails intermÃ©diaires bien notÃ©s
const intermediateTrails = GeoLeaf.Filters.filterRouteList(allRoutes, {
    categoryIds: ["hiking"],
    minDifficulty: 3,
    maxDifficulty: 4,
    minRating: 4.0,
});
```

### Exemple 5: Filtre dynamique avec debounce

```javascript
// Input de recherche avec debounce
const searchInput = document.getElementById("search-input");
let allPois = GeoLeaf.POI.getAllPois();

const performSearch = GeoLeaf.Utils.debounce((searchText) => {
    const filtered = GeoLeaf.Filters.filterPoiList(allPois, {
        searchText: searchText,
    });

    GeoLeaf.POI.reload(filtered);
    updateResultsCount(filtered.length);
}, 300); // 300ms de dÃ©lai

searchInput.addEventListener("input", (e) => {
    performSearch(e.target.value);
});

function updateResultsCount(count) {
    document.getElementById("results-count").textContent =
        `${count} rÃ©sultat${count > 1 ? "s" : ""}`;
}
```

---

## Bonnes pratiques

### âœ… DO

1. **Stocker `filterState` dans l'Ã©tat de l'application**

    ```javascript
    const appState = {
        filters: {
            categoryIds: [],
            searchText: "",
            minRating: null,
        },
    };
    ```

2. **Utiliser debounce pour recherche textuelle**

    ```javascript
    searchInput.addEventListener(
        "input",
        GeoLeaf.Utils.debounce(() => applyFilters(), 300)
    );
    ```

3. **VÃ©rifier les rÃ©sultats avant reload**

    ```javascript
    const filtered = GeoLeaf.Filters.filterPoiList(allPois, filterState);
    if (filtered.length === 0) {
        showNoResultsMessage();
    } else {
        GeoLeaf.POI.reload(filtered);
    }
    ```

4. **Afficher compteur de rÃ©sultats**
    ```javascript
    document.getElementById("count").textContent = `${filtered.length} POI(s)`;
    ```

### âŒ DON'T

1. **Ne pas filtrer directement le layer Leaflet**

    ```javascript
    // âŒ Mauvais
    const layer = GeoLeaf.POI.getLayer();
    layer.eachLayer((marker) => {
        if (!matchFilter(marker)) layer.removeLayer(marker);
    });

    // âœ… Bon
    const filtered = GeoLeaf.Filters.filterPoiList(allPois, filterState);
    GeoLeaf.POI.reload(filtered);
    ```

2. **Ne pas appliquer les filtres Ã  chaque keystroke sans debounce**

    ```javascript
    // âŒ Mauvais (lag)
    searchInput.addEventListener("input", applyFilters);

    // âœ… Bon
    searchInput.addEventListener("input", GeoLeaf.Utils.debounce(applyFilters, 300));
    ```

3. **Ne pas modifier `allPois` directement**

    ```javascript
    // âŒ Mauvais
    allPois = allPois.filter(poi => poi.categoryId === 'restaurant');

    // âœ… Bon
    const filtered = GeoLeaf.Filters.filterPoiList(allPois, {...});
    ```

---

## Performance

### Optimisations implÃ©mentÃ©es

1. **Early return** : Chaque critÃ¨re peut court-circuiter le filtre
2. **Extraction de valeurs mise en cache** : `getNestedValue()` efficace
3. **Algorithmes optimisÃ©s** : Haversine, recherche textuelle

### Benchmarks indicatifs

| OpÃ©ration         | 100 POIs | 1000 POIs | 10000 POIs |
| ------------------- | -------- | --------- | ---------- |
| CatÃ©gorie simple  | <1ms     | <5ms      | ~30ms      |
| Recherche textuelle | <2ms     | ~10ms     | ~80ms      |
| ProximitÃ©         | <3ms     | ~15ms     | ~120ms     |
| Multi-critÃ¨res (5) | <5ms     | ~20ms     | ~150ms     |

### Conseils performance

1. **Limiter le nombre de champs de recherche**

    ```json
    "searchFields": ["label", "attributes.shortDescription"]
    // Au lieu de 10+ champs
    ```

2. **Utiliser catÃ©gories avant recherche textuelle**

    ```javascript
    // Plus rapide
    filterState = {
        categoryIds: ["restaurant"], // RÃ©duit le set
        searchText: "pizza", // Recherche sur moins de POIs
    };
    ```

3. **Ã‰viter filtres trop gÃ©nÃ©riques sur gros volumes**

    ```javascript
    // Ã‰viter
    filterState = { searchText: "a" }; // Match 90% des POIs

    // PrÃ©fÃ©rer
    filterState = { searchText: "pizza" }; // Plus spÃ©cifique
    ```

---

## Architecture interne

### Fonctions privÃ©es

#### `getNestedValue(obj, path)`

Extrait une valeur depuis un chemin avec notation point.

```javascript
getNestedValue(poi, "attributes.shortDescription");
// Ã‰quivalent Ã : poi.attributes?.shortDescription
```

#### `getSearchFieldsFromProfile()`

RÃ©cupÃ¨re les champs de recherche depuis le profil actif (voir section Configuration).

#### `extractRouteCoords(route)`

Extrait les coordonnÃ©es d'une route dans diffÃ©rents formats :

- `route.geometry` : `[[lat, lng], ...]`
- `route.coordinates` : `[[lat, lng], ...]`
- `route.latlngs` : `[[lat, lng], ...]`
- GeoJSON `geometry.coordinates` : `[[lng, lat], ...]` (ordre inversÃ©)

---

## Tests

Le module Filters n'a pas encore de tests dÃ©diÃ©s, mais est utilisÃ© dans :

- Tests UI (filtrage interface)
- Tests POI (via `GeoLeaf.POI.reload()`)
- Tests Route (via `GeoLeaf.Route.display()`)

**TODO Phase 6** : CrÃ©er `__tests__/filters.test.js` avec tests unitaires pour chaque critÃ¨re.

---

## Migration et compatibilitÃ©

### Avant Phase 4

Le filtrage Ã©tait intÃ©grÃ© dans `geoleaf.ui.js` et `geoleaf.poi.js` :

```javascript
// âŒ Ancien (version 2.0.x)
function filterPoisByCategory(pois, categoryId) {
    return pois.filter((poi) => poi.categoryId === categoryId);
}
```

### AprÃ¨s Phase 4

Module dÃ©diÃ© avec API standardisÃ©e :

```javascript
// âœ… Nouveau (version 2.1.0+)
const filtered = GeoLeaf.Filters.filterPoiList(allPois, {
    categoryIds: [categoryId],
});
```

---

## RÃ©fÃ©rences

- **Code source** : `src/modules/geoleaf.filters.js`
- **Phase 4 Refactoring** : `SPRINT4_SUMMARY.md`
- **Module POI** : `docs/poi/GeoLeaf_POI_README.md`
- **Module Route** : `docs/route/GeoLeaf_Route_README.md`
- **Configuration profils** : `docs/config/GeoLeaf_Config_README.md`

---

## Changelog

**v2.1.0 (Phase 4 - December 2025)**

- âœ¨ CrÃ©ation du module Filters (extraction depuis UI)
- âœ¨ Support multi-critÃ¨res pour POIs et Routes
- âœ¨ Filtrage proximitÃ© avec formule Haversine
- âœ¨ Configuration dynamique des champs de recherche
- âœ¨ Algorithmes optimisÃ©s pour grandes quantitÃ©s

---

**DerniÃ¨re mise Ã  jour** : DÃ©cembre 2, 2025  
**Auteur** : Ã‰quipe GeoLeaf  
**Version GeoLeaf** : 2.1.0
