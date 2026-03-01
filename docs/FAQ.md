# â“ FAQ - GeoLeaf.js

> **Questions frÃ©quemment posÃ©es** et leurs rÃ©ponses

**Version produit**: GeoLeaf Platform V1  
**Version**: 4.0.0  
**DerniÃ¨re mise Ã  jour**: 14 fÃ©vrier 2026

> Convention de versioning : **Platform V1** est le label produit ; le SemVer technique des packages/releases reste en **4.x**. Voir [VERSIONING_POLICY.md](VERSIONING_POLICY.md).

---

## ðŸ“‹ Table des MatiÃ¨res

- [Installation & Configuration](#installation--configuration)
- [FonctionnalitÃ©s & Utilisation](#fonctionnalitÃ©s--utilisation)
- [POI (Points d'IntÃ©rÃªt)](#poi-points-dintÃ©rÃªt)
- [Layers & GeoJSON](#layers--geojson)
- [Cache & Mode Offline](#cache--mode-offline)
- [Performance & Optimisation](#performance--optimisation)
- [ThÃ¨mes & Personnalisation](#thÃ¨mes--personnalisation)
- [Troubleshooting](#troubleshooting)
- [CompatibilitÃ©](#compatibilitÃ©)
- [Migration & Updates](#migration--updates)

---

## ðŸ“¦ Installation & Configuration

### Q: Quelles sont les dÃ©pendances requises?

**R**: GeoLeaf.js nÃ©cessite:

- **Leaflet.js** v1.9.4 ou supÃ©rieur (obligatoire)
- **Navigateur moderne** avec support ES6+, IndexedDB

```html
<!-- Leaflet CSS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

<!-- GeoLeaf CSS -->
<link rel="stylesheet" href="https://cdn.geoleaf.js/3.0.0/geoleaf.min.css" />

<!-- Leaflet JS -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- GeoLeaf JS -->
<script src="https://cdn.geoleaf.js/3.0.0/geoleaf.min.js"></script>
```

---

### Q: Comment initialiser GeoLeaf avec configuration minimale?

**R**: Configuration minimale:

```javascript
GeoLeaf.init({
    target: "map", // ID du conteneur HTML
    center: [48.8566, 2.3522], // [latitude, longitude]
    zoom: 12,
});
```

âš ï¸ **Important**: Le conteneur doit avoir une hauteur dÃ©finie:

```html
<div id="map" style="height: 600px;"></div>
```

---

### Q: Quels sont les profils disponibles?

**R**: GeoLeaf propose **3 profils prÃ©configurÃ©s**:

| Profil      | Usage             | Layers                                   | FonctionnalitÃ©s                     |
| ----------- | ----------------- | ---------------------------------------- | ------------------------------------- |
| **tourism** | Tourisme, loisirs | 35+ layers climatiques, POI touristiques | Monuments, restaurants, itinÃ©raires |

```javascript
// Profil tourisme
GeoLeaf.init({ target: "map", profile: "tourism" });
```

---

### Q: Comment configurer plusieurs instances sur la mÃªme page?

**R**: CrÃ©er plusieurs conteneurs avec IDs uniques:

```html
<div id="map1" style="height: 400px;"></div>
<div id="map2" style="height: 400px;"></div>
```

```javascript
const map1 = GeoLeaf.init({
    target: "map1",
    profile: "tourism",
    center: [48.8566, 2.3522],
    zoom: 12,
});

const map2 = GeoLeaf.init({
    target: "map2",
    profile: "tourism",
    center: [45.764, 4.8357],
    zoom: 13,
});
```

---

### Q: Comment charger GeoLeaf avec NPM/Webpack?

**R**: Installation:

```bash
npm install geoleaf leaflet
```

Utilisation:

```javascript
import L from "leaflet";
import GeoLeaf from "geoleaf";

// CSS
import "leaflet/dist/leaflet.css";
import "geoleaf/dist/geoleaf.min.css";

// Initialisation
GeoLeaf.init({
    target: "map",
    center: [48.8566, 2.3522],
    zoom: 12,
});
```

---

## ðŸŽ¯ FonctionnalitÃ©s & Utilisation

### Q: Comment centrer la carte sur une position?

**R**: Plusieurs mÃ©thodes:

```javascript
// MÃ©thode 1: setCenter
GeoLeaf.setCenter(48.8566, 2.3522);

// MÃ©thode 2: centerOn avec zoom
GeoLeaf.centerOn(48.8566, 2.3522, 15);

// MÃ©thode 3: Via Leaflet directement
const map = GeoLeaf.getMap();
map.setView([48.8566, 2.3522], 15);

// MÃ©thode 4: Avec animation
map.flyTo([48.8566, 2.3522], 15, {
    duration: 2, // secondes
});
```

---

### Q: Comment gÃ©rer les Ã©vÃ©nements de carte?

**R**: Ã‰couter Ã©vÃ©nements via `GeoLeaf.on()`:

```javascript
// DÃ©placement carte
GeoLeaf.on("map:moveend", (event) => {
    const center = event.center;
    console.log(`Carte dÃ©placÃ©e: ${center.lat}, ${center.lng}`);
});

// Changement zoom
GeoLeaf.on("map:zoomend", (event) => {
    console.log(`Nouveau zoom: ${event.zoom}`);
});

// Clic sur carte
GeoLeaf.on("map:click", (event) => {
    console.log(`Clic: ${event.latlng.lat}, ${event.latlng.lng}`);
});

// POI ajoutÃ©
GeoLeaf.on("poi:added", (poi) => {
    console.log("POI ajoutÃ©:", poi);
});

// ThÃ¨me changÃ©
GeoLeaf.on("theme:changed", (theme) => {
    console.log("ThÃ¨me:", theme); // 'light' ou 'dark'
});
```

---

### Q: Comment obtenir les bounds (zone visible) de la carte?

**R**: RÃ©cupÃ©rer bounds:

```javascript
const map = GeoLeaf.getMap();
const bounds = map.getBounds();

console.log("Nord-Est:", bounds.getNorthEast());
console.log("Sud-Ouest:", bounds.getSouthWest());
console.log("Centre:", bounds.getCenter());

// Obtenir POI dans bounds
const visiblePOIs = await GeoLeaf.POI.getInBounds(bounds);
console.log(`${visiblePOIs.length} POI visibles`);
```

---

### Q: Comment afficher des notifications?

**R**: Utiliser `GeoLeaf.UI.notify()`:

```javascript
// Types: 'success', 'error', 'warning', 'info'
GeoLeaf.UI.notify("âœ… OpÃ©ration rÃ©ussie", "success");
GeoLeaf.UI.notify("âŒ Erreur survenue", "error");
GeoLeaf.UI.notify("âš ï¸ Attention!", "warning");
GeoLeaf.UI.notify("â„¹ï¸ Information", "info");

// Avec durÃ©e personnalisÃ©e (millisecondes)
GeoLeaf.UI.notify("Message temporaire", "info", 3000);
```

---

## ðŸ“ POI (Points d'IntÃ©rÃªt)

### Q: Comment ajouter un POI programmatiquement?

**R**: Utiliser `GeoLeaf.POI.add()`:

```javascript
const poi = await GeoLeaf.POI.add({
    // REQUIS
    type: "restaurant",
    name: "Le Bon Restaurant",
    lat: 48.8566,
    lng: 2.3522,

    // OPTIONNELS
    description: "Excellent restaurant franÃ§ais",
    address: "1 Rue de la Paix, 75001 Paris",
    phone: "+33 1 23 45 67 89",
    website: "https://example.com",
    email: "contact@example.com",
    tags: ["gastronomie", "terrasse", "wifi"],
    images: ["image1.jpg", "image2.jpg"],
    hours: {
        monday: "12:00-14:00, 19:00-22:00",
        tuesday: "12:00-14:00, 19:00-22:00",
        // ...
    },
    price: "â‚¬â‚¬â‚¬",
    rating: 4.5,

    // Champs personnalisÃ©s
    customFields: {
        capacity: 50,
        outdoor_seating: true,
    },
});

console.log("POI ajoutÃ© avec ID:", poi.id);
```

---

### Q: Comment modifier un POI existant?

**R**: Utiliser `GeoLeaf.POI.update()`:

```javascript
// RÃ©cupÃ©rer POI
const poi = await GeoLeaf.POI.get("poi-123");

// Modifier
const updated = await GeoLeaf.POI.update("poi-123", {
    name: "Nouveau Nom",
    description: "Nouvelle description",
    rating: 5.0,
    tags: [...poi.tags, "nouveau-tag"],
});
```

---

### Q: Comment supprimer un POI?

**R**: Utiliser `GeoLeaf.POI.delete()`:

```javascript
// Supprimer par ID
await GeoLeaf.POI.delete("poi-123");

// Supprimer plusieurs POI
const poisToDelete = ["poi-123", "poi-456", "poi-789"];
for (const id of poisToDelete) {
    await GeoLeaf.POI.delete(id);
}

// Supprimer tous les POI d'un type
const restaurants = await GeoLeaf.POI.getByType("restaurant");
for (const restaurant of restaurants) {
    await GeoLeaf.POI.delete(restaurant.id);
}
```

---

### Q: Comment rechercher des POI?

**R**: Plusieurs mÃ©thodes de recherche:

```javascript
// 1. Recherche textuelle (nom, description, tags)
const results = await GeoLeaf.POI.search("pizza");

// 2. Par type
const restaurants = await GeoLeaf.POI.getByType("restaurant");

// 3. Dans une zone (bounds)
const bounds = map.getBounds();
const poisInBounds = await GeoLeaf.POI.getInBounds(bounds);

// 4. Par proximitÃ© (rayon)
const nearby = await GeoLeaf.POI.getNearby(
    48.8566, // latitude
    2.3522, // longitude
    1000 // rayon en mÃ¨tres
);

// 5. Tous les POI
const allPOIs = await GeoLeaf.POI.getAll();

// 6. Recherche avancÃ©e (filtre custom)
const filtered = allPOIs.filter((poi) => {
    return poi.rating >= 4.5 && poi.tags.includes("terrasse") && poi.price === "â‚¬â‚¬";
});
```

---

### Q: Comment dÃ©sactiver le clustering de POI?

**R**: Configurer Ã  l'initialisation:

```javascript
GeoLeaf.init({
    target: "map",
    poi: {
        clustering: false, // DÃ©sactiver clustering
    },
});

// Ou modifier aprÃ¨s initialisation
GeoLeaf.POI.disableClustering();

// RÃ©activer
GeoLeaf.POI.enableClustering();
```

---

### Q: Comment personnaliser l'icÃ´ne d'un POI?

**R**: Utiliser icÃ´ne Leaflet personnalisÃ©e:

```javascript
// Ajouter POI
const poi = await GeoLeaf.POI.add({
    type: "custom",
    name: "Point Custom",
    lat: 48.8566,
    lng: 2.3522,
});

// RÃ©cupÃ©rer marker
const marker = GeoLeaf.POI.getMarker(poi.id);

// IcÃ´ne personnalisÃ©e
const customIcon = L.icon({
    iconUrl: "my-icon.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

marker.setIcon(customIcon);

// Ou DivIcon (HTML)
const divIcon = L.divIcon({
    html: '<div style="background: red; width: 30px; height: 30px; border-radius: 50%;"></div>',
    className: "custom-marker",
    iconSize: [30, 30],
});

marker.setIcon(divIcon);
```

---

### Q: Comment afficher/masquer des POI?

**R**: MÃ©thodes show/hide:

```javascript
// Masquer un POI
GeoLeaf.POI.hide("poi-123");

// Afficher un POI
GeoLeaf.POI.show("poi-123");

// Masquer tous les POI
GeoLeaf.POI.hideAll();

// Afficher tous les POI
GeoLeaf.POI.showAll();

// Masquer par type
const restaurants = await GeoLeaf.POI.getByType("restaurant");
restaurants.forEach((poi) => GeoLeaf.POI.hide(poi.id));
```

---

## ðŸ—ºï¸ Layers & GeoJSON

### Q: Comment charger un fichier GeoJSON?

**R**: Utiliser `GeoLeaf.GeoJSON.load()`:

```javascript
// Depuis URL
await GeoLeaf.GeoJSON.load({
    url: '/data/regions.geojson',
    layerId: 'regions',
    style: {
        color: '#3388ff',
        weight: 2,
        fillOpacity: 0.3
    },
    onEachFeature: (feature, layer) => {
        layer.bindPopup(feature.properties.name);
    }
});

// Depuis objet JavaScript
const geojson = {
    type: 'FeatureCollection',
    features: [...]
};

GeoLeaf.GeoJSON.addData(geojson, {
    layerId: 'my-layer'
});
```

---

### Q: Comment styler un layer GeoJSON dynamiquement?

**R**: Fonction style avec propriÃ©tÃ©s features:

```javascript
GeoLeaf.GeoJSON.load({
    url: "/data/departments.geojson",
    layerId: "departments",
    style: (feature) => {
        // Style basÃ© sur propriÃ©tÃ©s
        const population = feature.properties.population;

        return {
            fillColor:
                population > 1000000
                    ? "#800026"
                    : population > 500000
                      ? "#E31A1C"
                      : population > 200000
                        ? "#FD8D3C"
                        : "#FFEDA0",
            weight: 2,
            opacity: 1,
            color: "white",
            fillOpacity: 0.7,
        };
    },
});
```

---

### Q: Comment supprimer un layer?

**R**: Utiliser `GeoLeaf.GeoJSON.remove()`:

```javascript
// Supprimer layer par ID
GeoLeaf.GeoJSON.remove("regions");

// Supprimer tous les layers GeoJSON
const layers = GeoLeaf.GeoJSON.getAll();
layers.forEach((layer) => {
    GeoLeaf.GeoJSON.remove(layer.id);
});
```

---

### Q: Comment charger un fichier GPX (route)?

**R**: Utiliser `GeoLeaf.Route.load()`:

```javascript
await GeoLeaf.Route.load({
    url: "/tracks/randonnee.gpx",
    routeId: "rando-1",
    style: {
        color: "#ff0000",
        weight: 4,
        opacity: 0.7,
    },
    showMarkers: true, // Marqueurs dÃ©part/arrivÃ©e
    showWaypoints: true, // Waypoints intermÃ©diaires
    fitBounds: true, // Zoom auto sur route
    onLoad: (route) => {
        console.log("Distance:", route.distance, "km");
        console.log("DÃ©nivelÃ©:", route.elevation, "m");
    },
});
```

---

### Q: Comment afficher/masquer des layers?

**R**: ContrÃ´le de visibilitÃ©:

```javascript
// GeoJSON layer
const layer = GeoLeaf.GeoJSON.get("regions");
if (layer) {
    // Masquer
    layer.remove();

    // Afficher
    layer.addTo(map);
}

// Route GPX
GeoLeaf.Route.hide("rando-1");
GeoLeaf.Route.show("rando-1");
```

---

## ðŸ’¾ Cache & Mode Offline

### Q: Comment activer le cache offline?

**R**: Configuration Ã  l'initialisation:

```javascript
GeoLeaf.init({
    target: "map",
    storage: {
        enabled: true, // Activer cache
        quota: 200 * 1024 * 1024, // 200 MB
        ttl: 30 * 24 * 60 * 60 * 1000, // 30 jours
    },
});
```

---

### Q: Comment tÃ©lÃ©charger des layers pour utilisation offline?

**R**: Utiliser `GeoLeaf.Storage.downloadLayers()`:

```javascript
// Ouvrir UI sÃ©lection layers
GeoLeaf.Storage.openCacheModal();

// Ou tÃ©lÃ©charger programmatiquement
await GeoLeaf.Storage.downloadLayers(["tourism_poi_all", "tourism_itineraries", "base_osm_tiles"], {
    onProgress: (progress) => {
        console.log(`${progress.percent}% - ${progress.current}/${progress.total}`);
    },
    onComplete: () => {
        console.log("âœ… TÃ©lÃ©chargement terminÃ©");
    },
    onError: (error) => {
        console.error("âŒ Erreur:", error);
    },
});
```

---

### Q: Comment vÃ©rifier l'utilisation du cache?

**R**: Obtenir informations cache:

```javascript
const info = await GeoLeaf.Storage.getCacheInfo();

console.log("Taille totale:", (info.size / (1024 * 1024)).toFixed(2), "MB");
console.log("Layers en cache:", info.layers);
console.log("Dernier update:", new Date(info.lastUpdate));

// Par layer
info.layers.forEach((layer) => {
    console.log(`${layer.id}: ${(layer.size / 1024).toFixed(2)} KB`);
});
```

---

### Q: Comment vider le cache?

**R**: MÃ©thodes de nettoyage:

```javascript
// Vider tout le cache
await GeoLeaf.Storage.clearCache();

// Supprimer layer spÃ©cifique
await GeoLeaf.Storage.clearLayer("tourism_poi_all");

// Supprimer layers expirÃ©s (TTL dÃ©passÃ©)
await GeoLeaf.Storage.cleanExpired();

// Supprimer layers par pattern
const allLayers = await GeoLeaf.Storage.getCacheInfo();
const tourismLayers = allLayers.layers.filter((l) => l.id.startsWith("tourism_"));
for (const layer of tourismLayers) {
    await GeoLeaf.Storage.clearLayer(layer.id);
}
```

---

### Q: Comment dÃ©tecter si l'utilisateur est offline?

**R**: Utiliser `GeoLeaf.Storage.isOnline()` et events:

```javascript
// Ã‰tat actuel
const online = GeoLeaf.Storage.isOnline();
console.log("En ligne:", online);

// Ã‰couter changements
GeoLeaf.on("online", () => {
    console.log("âœ… Connexion rÃ©tablie");
    GeoLeaf.UI.notify("Connexion rÃ©tablie", "success");
});

GeoLeaf.on("offline", () => {
    console.log("ðŸ“´ Mode offline");
    GeoLeaf.UI.notify("Mode offline - Utilisation du cache", "warning");
});
```

---

### Q: Que se passe-t-il si un layer n'est pas en cache en mode offline?

**R**: GeoLeaf gÃ¨re automatiquement:

- **Layer en cache**: ChargÃ© depuis IndexedDB âœ…
- **Layer pas en cache**: Non affichÃ©, warning console âš ï¸
- **Fallback**: Tuiles de base toujours disponibles si tÃ©lÃ©chargÃ©es

```javascript
// VÃ©rifier si layer en cache avant utilisation
const isCached = await GeoLeaf.Storage.isLayerCached("tourism_poi_all");

if (!isCached && !GeoLeaf.Storage.isOnline()) {
    GeoLeaf.UI.notify("âš ï¸ Layer non disponible offline", "warning");
} else {
    await GeoLeaf.GeoJSON.load({
        url: "/data/pois.geojson",
        layerId: "tourism_poi_all",
    });
}
```

---

## âš¡ Performance & Optimisation

### Q: Comment optimiser les performances avec beaucoup de POI?

**R**: Bonnes pratiques:

```javascript
// 1. Activer clustering
GeoLeaf.init({
    poi: {
        clustering: true,
        clusterRadius: 80, // Ajuster selon densitÃ©
    },
});

// 2. Charger POI par zone (lazy loading)
GeoLeaf.on("map:moveend", async () => {
    const bounds = map.getBounds();
    const pois = await GeoLeaf.POI.getInBounds(bounds);
    // Afficher seulement POI visibles
});

// 3. Limiter nombre de POI affichÃ©s
const MAX_POIS = 500;
const allPOIs = await GeoLeaf.POI.getAll();
const limitedPOIs = allPOIs.slice(0, MAX_POIS);

// 4. Utiliser debounce pour recherche
let searchTimeout;
searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        GeoLeaf.POI.search(e.target.value);
    }, 500); // 500ms debounce
});

// 5. DÃ©sactiver POI non visibles
const zoom = map.getZoom();
if (zoom < 12) {
    GeoLeaf.POI.hideAll(); // Trop dÃ©zoomÃ©, masquer POI
}
```

---

### Q: Comment rÃ©duire la taille du cache offline?

**R**: StratÃ©gies d'optimisation:

```javascript
// 1. TÃ©lÃ©charger seulement layers essentiels
const essentialLayers = [
    "tourism_poi_restaurants", // Pas tourism_poi_all
    "base_osm_tiles_z12_z15", // Seulement zooms 12-15
];

// 2. Limiter zone gÃ©ographique
const bounds = L.latLngBounds(
    [48.8, 2.2], // Sud-Ouest
    [48.9, 2.4] // Nord-Est
);

await GeoLeaf.Storage.downloadLayers(essentialLayers, {
    bounds: bounds, // Seulement cette zone
});

// 3. Compresser donnÃ©es avant cache
// (GeoLeaf fait automatiquement)

// 4. Purger rÃ©guliÃ¨rement layers anciens
await GeoLeaf.Storage.cleanExpired();
```

---

### Q: Comment profiler les performances?

**R**: Utiliser outils intÃ©grÃ©s:

```javascript
// 1. Activer mode debug
GeoLeaf.init({
    target: "map",
    debug: true,
    logLevel: "debug",
});

// 2. Performance API
performance.mark("geoleaf-init-start");
await GeoLeaf.init({ target: "map" });
performance.mark("geoleaf-init-end");

performance.measure("geoleaf-init", "geoleaf-init-start", "geoleaf-init-end");
const measure = performance.getEntriesByName("geoleaf-init")[0];
console.log(`Init time: ${measure.duration.toFixed(2)}ms`);

// 3. Memory usage
if (performance.memory) {
    console.log("Heap size:", (performance.memory.usedJSHeapSize / 1048576).toFixed(2), "MB");
}

// 4. Network monitoring
if ("connection" in navigator) {
    console.log("Type connexion:", navigator.connection.effectiveType);
    console.log("Downlink:", navigator.connection.downlink, "Mbps");
}
```

---

## ðŸŽ¨ ThÃ¨mes & Personnalisation

### Q: Comment changer de thÃ¨me?

**R**: Utiliser `GeoLeaf.setTheme()`:

```javascript
// ThÃ¨me clair
GeoLeaf.setTheme("light");

// ThÃ¨me sombre
GeoLeaf.setTheme("dark");

// RÃ©cupÃ©rer thÃ¨me actuel
const theme = GeoLeaf.getTheme(); // 'light' ou 'dark'

// Toggle thÃ¨me
const currentTheme = GeoLeaf.getTheme();
GeoLeaf.setTheme(currentTheme === "light" ? "dark" : "light");
```

---

### Q: Comment crÃ©er un thÃ¨me personnalisÃ©?

**R**: Enregistrer thÃ¨me custom:

```javascript
GeoLeaf.UI.registerTheme("custom", {
    name: "Mon ThÃ¨me",
    colors: {
        primary: "#007bff",
        secondary: "#6c757d",
        success: "#28a745",
        danger: "#dc3545",
        warning: "#ffc107",
        info: "#17a2b8",
        background: "#ffffff",
        text: "#212529",
        border: "#dee2e6",
    },
    styles: {
        popup: {
            background: "#ffffff",
            color: "#212529",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        },
        control: {
            background: "rgba(255, 255, 255, 0.9)",
            color: "#212529",
            border: "1px solid #ccc",
        },
        marker: {
            default: "#007bff",
            hover: "#0056b3",
            selected: "#28a745",
        },
    },
});

// Activer thÃ¨me custom
GeoLeaf.setTheme("custom");
```

---

### Q: Comment personnaliser les popups POI?

**R**: Template HTML custom:

```javascript
// Lors de l'ajout POI
const poi = await GeoLeaf.POI.add({
    name: "Restaurant",
    lat: 48.8566,
    lng: 2.3522,
    // ...
});

// RÃ©cupÃ©rer marker
const marker = GeoLeaf.POI.getMarker(poi.id);

// Popup personnalisÃ©e
const customPopup = `
    <div style="padding: 15px; min-width: 250px;">
        <h3 style="margin: 0 0 10px 0; color: #007bff;">${poi.name}</h3>
        
        ${
            poi.images && poi.images[0]
                ? `
            <img src="${poi.images[0]}" style="width: 100%; border-radius: 4px; margin-bottom: 10px;">
        `
                : ""
        }
        
        <p style="margin: 5px 0;">${poi.description || ""}</p>
        
        ${
            poi.rating
                ? `
            <div style="margin: 10px 0;">
                ${"â­".repeat(Math.floor(poi.rating))} ${poi.rating}/5
            </div>
        `
                : ""
        }
        
        ${
            poi.address
                ? `
            <p style="margin: 5px 0; font-size: 12px; color: #666;">
                ðŸ“ ${poi.address}
            </p>
        `
                : ""
        }
        
        <button onclick="alert('RÃ©server ${poi.name}')" style="width: 100%; padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
            RÃ©server
        </button>
    </div>
`;

marker.bindPopup(customPopup, {
    maxWidth: 300,
    className: "custom-popup",
});
```

---

## ðŸ› Troubleshooting

### Q: La carte ne s'affiche pas (conteneur vide/gris)

**R**: Checklist debug:

```javascript
// 1. VÃ©rifier hauteur conteneur
<div id="map" style="height: 600px;"></div>  // âœ… OBLIGATOIRE

// 2. VÃ©rifier ordre scripts
<script src="leaflet.js"></script>     // D'abord Leaflet
<script src="geoleaf.min.js"></script> // Puis GeoLeaf

// 3. VÃ©rifier CSS chargÃ©s
<link rel="stylesheet" href="leaflet.css" />
<link rel="stylesheet" href="geoleaf.min.css" />

// 4. Attendre DOM ready
document.addEventListener('DOMContentLoaded', () => {
    GeoLeaf.init({ target: 'map' });
});

// 5. VÃ©rifier console errors
// F12 â†’ Console â†’ Chercher erreurs rouges
```

---

### Q: POI n'apparaissent pas sur la carte

**R**: Debug Ã©tapes:

```javascript
// 1. VÃ©rifier que POI sont ajoutÃ©s
const pois = await GeoLeaf.POI.getAll();
console.log("Nombre POI:", pois.length);

// 2. VÃ©rifier coordonnÃ©es valides
pois.forEach((poi) => {
    if (isNaN(poi.lat) || isNaN(poi.lng)) {
        console.error("CoordonnÃ©es invalides:", poi);
    }
});

// 3. VÃ©rifier bounds
const bounds = map.getBounds();
console.log("Bounds carte:", bounds);

const poisInBounds = await GeoLeaf.POI.getInBounds(bounds);
console.log("POI dans bounds:", poisInBounds.length);

// 4. VÃ©rifier zoom
const zoom = map.getZoom();
console.log("Zoom actuel:", zoom);
if (zoom < 10) {
    console.warn("Zoom trop faible pour voir POI");
}

// 5. VÃ©rifier filtres actifs
const filters = GeoLeaf.Filters.getActive();
console.log("Filtres actifs:", filters);

// 6. Forcer refresh
GeoLeaf.POI.refresh();
```

---

### Q: Erreur "CORS policy" lors du chargement de fichiers

**R**: Solutions CORS:

```javascript
// PROBLÃˆME: Server bloque requÃªtes cross-origin

// SOLUTION 1: Configurer server (Apache .htaccess)
// <IfModule mod_headers.c>
//     Header set Access-Control-Allow-Origin "*"
// </IfModule>

// SOLUTION 2: Proxy local pour dev
// npm install cors-anywhere
// node proxy-server.js

// SOLUTION 3: Charger donnÃ©es inline
const geojsonData = { type: 'FeatureCollection', features: [...] };
GeoLeaf.GeoJSON.addData(geojsonData, { layerId: 'inline' });

// SOLUTION 4: Utiliser fetch avec mode no-cors (limitÃ©)
fetch(url, { mode: 'no-cors' })
    .then(r => r.json())
    .then(data => GeoLeaf.GeoJSON.addData(data, { layerId: 'data' }));
```

---

### Q: Cache offline ne fonctionne pas

**R**: Debug storage:

```javascript
// 1. VÃ©rifier support IndexedDB
if ("indexedDB" in window) {
    console.log("âœ… IndexedDB supportÃ©");
} else {
    console.error("âŒ IndexedDB non supportÃ©");
    // Solution: utiliser browser moderne
}

// 2. VÃ©rifier quota storage
navigator.storage.estimate().then((estimate) => {
    console.log("Usage:", (estimate.usage / 1048576).toFixed(2), "MB");
    console.log("Quota:", (estimate.quota / 1048576).toFixed(2), "MB");
    console.log("Disponible:", ((estimate.quota - estimate.usage) / 1048576).toFixed(2), "MB");
});

// 3. Demander persistent storage
navigator.storage.persist().then((granted) => {
    console.log("Persistent storage:", granted ? "âœ… AccordÃ©" : "âŒ RefusÃ©");
});

// 4. VÃ©rifier permissions
navigator.permissions.query({ name: "persistent-storage" }).then((result) => {
    console.log("Permission:", result.state);
});

// 5. Tester Ã©criture/lecture
try {
    await GeoLeaf.Storage.test();
    console.log("âœ… Storage opÃ©rationnel");
} catch (error) {
    console.error("âŒ Erreur storage:", error);
}
```

---

### Q: Performance dÃ©gradÃ©e avec beaucoup de donnÃ©es

**R**: Optimisations:

```javascript
// 1. Activer clustering
GeoLeaf.init({
    poi: { clustering: true, clusterRadius: 80 },
});

// 2. Lazy loading par zone
let loadedBounds = null;

GeoLeaf.on("map:moveend", async () => {
    const currentBounds = map.getBounds();

    // Charger seulement si bounds changÃ©s significativement
    if (!loadedBounds || !loadedBounds.contains(currentBounds)) {
        const pois = await fetchPOIsInBounds(currentBounds);
        // Charger POI
        loadedBounds = currentBounds.pad(0.5); // Buffer 50%
    }
});

// 3. Throttle events
let lastMove = 0;
GeoLeaf.on("map:move", () => {
    const now = Date.now();
    if (now - lastMove < 100) return; // Max 10 fois/seconde
    lastMove = now;
    // Traitement
});

// 4. Virtualisation pour grandes listes
// Utiliser library comme react-window pour tables POI

// 5. Web Worker pour calculs lourds
const worker = new Worker("distance-calculator.js");
worker.postMessage({ pois, center });
worker.onmessage = (e) => {
    const sortedPOIs = e.data;
    // Afficher rÃ©sultats
};
```

---

## ðŸŒ CompatibilitÃ©

### Q: Quels navigateurs sont supportÃ©s?

**R**: Navigateurs modernes avec ES6+:

| Navigateur | Version Minimale | Support        |
| ---------- | ---------------- | -------------- |
| Chrome     | 90+              | âœ… Complet    |
| Firefox    | 88+              | âœ… Complet    |
| Safari     | 14+              | âœ… Complet    |
| Edge       | 90+              | âœ… Complet    |
| Opera      | 76+              | âœ… Complet    |
| IE 11      | âŒ               | Non supportÃ© |

**FonctionnalitÃ©s requises**:

- ES6 (let/const, arrow functions, classes)
- Promises & async/await
- IndexedDB (cache offline)
- Geolocation API (optionnel)

---

### Q: GeoLeaf fonctionne-t-il sur mobile?

**R**: âœ… Oui, responsive par dÃ©faut

```javascript
// Auto-dÃ©tection mobile
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

GeoLeaf.init({
    target: "map",
    // Adapter config pour mobile
    controls: {
        zoom: !isMobile, // DÃ©sactiver zoom buttons sur mobile (pinch-zoom suffit)
        fullscreen: isMobile,
    },
    poi: {
        clusterRadius: isMobile ? 60 : 80, // Clusters plus petits mobile
    },
});

// GÃ©olocalisation mobile
if (isMobile && "geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition((position) => {
        GeoLeaf.centerOn(position.coords.latitude, position.coords.longitude, 15);
    });
}
```

---

### Q: Comment gÃ©rer les vieux navigateurs?

**R**: Utiliser polyfills:

```html
<!-- Polyfills pour IE11 / vieux browsers -->
<script src="https://polyfill.io/v3/polyfill.min.js?features=es6,Promise,fetch,Array.from,Object.assign"></script>

<!-- Leaflet -->
<script src="leaflet.js"></script>

<!-- GeoLeaf -->
<script src="geoleaf.min.js"></script>
```

Ou transpiler avec Babel:

```bash
npm install @babel/core @babel/preset-env
```

```javascript
// babel.config.js
module.exports = {
    presets: [
        [
            "@babel/preset-env",
            {
                targets: { browsers: ["> 1%", "not dead", "not IE 11"] },
            },
        ],
    ],
};
```

---

## ðŸ”„ Migration & Updates

### Q: Comment migrer de v2.x vers v3.0?

**R**: Voir [MIGRATION_GUIDE_V3.md](MIGRATION_GUIDE_V3.md) complet.

**Changements majeurs**:

```javascript
// v2.x (ANCIEN)
geoleafMap.addPOI({ name: "POI", coordinates: [48.8, 2.3] });

// v3.0 (NOUVEAU)
GeoLeaf.POI.add({ name: "POI", lat: 48.8, lng: 2.3 });

// v2.x (ANCIEN)
geoleafMap.loadGeoJSON("/data.geojson", "layer-id");

// v3.0 (NOUVEAU)
GeoLeaf.GeoJSON.load({ url: "/data.geojson", layerId: "layer-id" });

// v2.x (ANCIEN)
geoleafMap.setMapTheme("dark");

// v3.0 (NOUVEAU)
GeoLeaf.setTheme("dark");
```

---

### Q: Comment checker la version de GeoLeaf?

**R**: AccÃ©der version:

```javascript
console.log("Version GeoLeaf:", GeoLeaf.version);
// Output: "3.0.0"

// Comparer versions
if (GeoLeaf.version.startsWith("3.")) {
    console.log("âœ… v3.x installÃ©e");
}
```

---

### Q: Les updates sont-elles rÃ©trocompatibles?

**R**: Semantic Versioning:

- **Major** (v2.x â†’ v3.0): âŒ Breaking changes
- **Minor** (v3.0 â†’ v3.1): âœ… Compatible (nouvelles features)
- **Patch** (v3.0.0 â†’ v3.0.1): âœ… Compatible (bug fixes)

**Exemple**:

- v3.0.0 â†’ v3.0.5 : âœ… Update safe (patches)
- v3.0.0 â†’ v3.1.0 : âœ… Update safe (features)
- v3.0.0 â†’ v4.0.0 : âš ï¸ Lire migration guide

---

## ðŸ“ž Support & Ressources

### Q: OÃ¹ trouver de l'aide?

**R**: Ressources disponibles:

- ðŸ“– **Documentation**: [docs.geoleaf.js](https://docs.geoleaf.js)
- ðŸ› **Issues GitHub**: [github.com/geonatwork/geoleaf-js/issues](https://github.com/geonatwork/geoleaf-js/issues)
- ðŸ’¬ **Discussions**: [github.com/geonatwork/geoleaf-js/discussions](https://github.com/geonatwork/geoleaf-js/discussions)
- ðŸ“§ **Email**: support@geonatwork.fr
- ðŸ“š **Guides**:
    - [Guide Utilisateur](USER_GUIDE.md)
    - [Cookbook](COOKBOOK.md)
    - [Guide de Configuration](CONFIGURATION_GUIDE.md)
    - [Guide de DÃ©marrage](GETTING_STARTED.md)
    - [Guide Contribution](CONTRIBUTING.md)

---

### Q: Comment reporter un bug?

**R**: CrÃ©er GitHub Issue:

````markdown
**Titre**: [Bug] Description courte

**Description**:
DÃ©crire le bug clairement

**Reproduction**:

1. Ã‰tape 1
2. Ã‰tape 2
3. Bug survient

**Comportement attendu**:
Ce qui devrait se passer

**Comportement actuel**:
Ce qui se passe rÃ©ellement

**Environnement**:

- GeoLeaf version: 3.0.0
- Browser: Chrome 120
- OS: Windows 11

**Code exemple** (si possible):

```javascript
GeoLeaf.init({ target: "map" });
// Code reproduisant bug
```
````

**Screenshots** (si pertinent):
[Ajouter captures]

````

---

### Q: Comment proposer une nouvelle fonctionnalitÃ©?

**R**: Ouvrir GitHub Discussion ou Issue:

```markdown
**Titre**: [Feature Request] Nom feature

**ProblÃ¨me**:
Quel problÃ¨me cette feature rÃ©sout?

**Solution proposÃ©e**:
Description de la feature

**Alternatives envisagÃ©es**:
Autres solutions possibles

**Contexte additionnel**:
Use cases, exemples d'utilisation

**BÃ©nÃ©fices**:
Pourquoi ajouter cette feature?
````

---

## ðŸ“š Ressources ComplÃ©mentaires

- **Cookbook**: [COOKBOOK.md](COOKBOOK.md) - Exemples pratiques
- **Best Practices**: [BEST_PRACTICES.md](BEST_PRACTICES.md) - Bonnes pratiques
- **Architecture**: [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) - Architecture v3.0
- **Contribution**: [CONTRIBUTING.md](CONTRIBUTING.md) - Contribuer au projet

---

**DerniÃ¨re mise Ã  jour**: 19 janvier 2026  
**Version**: 4.0.0  
**Auteurs**: Ã‰quipe GeoLeaf

---

**Votre question n'est pas listÃ©e?**  
ðŸ‘‰ Ouvrir une [Discussion GitHub](https://github.com/geonatwork/geoleaf-js/discussions) ou envoyer un email Ã  support@geonatwork.fr
