# GeoLeaf.POI â€“ Documentation du module POI
Product Version: GeoLeaf Platform V1  
Le module **GeoLeaf.POI** gÃ¨re l'ensemble de la logique liÃ©e aux **Points d'IntÃ©rÃªt (POI)** dans GeoLeaf.

**Version**: 3.2.0  
**DerniÃ¨re mise Ã  jour**: DÃ©cembre 2, 2025

---

## Architecture (Phase 4 - Module Split)

Depuis la version 2.1.0, le module POI est divisÃ© en **7 sous-modules spÃ©cialisÃ©s** :

| Sous-module | Fichier | ResponsabilitÃ© |
|-------------|---------|----------------|
| **Shared** | `poi/shared.js` | Ã‰tat partagÃ© et constantes |
| **Normalizers** | `poi/normalizers.js` | Normalisation et validation des donnÃ©es POI |
| **Popup** | `poi/popup.js` | GÃ©nÃ©ration de popups et tooltips |
| **Markers** | `poi/markers.js` | CrÃ©ation de marqueurs Leaflet (icÃ´nes, styles) |
| **SidePanel** | `poi/sidepanel.js` | Panneau latÃ©ral de dÃ©tails POI |
| **Renderers** | `poi/renderers.js` | Rendu du contenu HTML |
| **Core** | `poi/core.js` | Fonctions principales (init, load, display) |

Le fichier **`geoleaf.poi.js`** est un **agrÃ©gateur UMD** qui :
- Expose l'API publique du module POI
- DÃ©lÃ¨gue chaque fonction au sous-module appropriÃ©
- GÃ¨re les dÃ©pendances entre modules

> ðŸ“˜ **Pour l'architecture interne dÃ©taillÃ©e**, voir `docs/refactoring/POI_SPLIT_STRATEGY.md`

---

## FonctionnalitÃ©s principales

- âœ… CrÃ©ation et gestion de **LayerGroup** ou **ClusterGroup**
- âœ… Chargement POI depuis configuration JSON ou sources externes
- âœ… Marqueurs personnalisÃ©s (icÃ´nes SVG, couleurs dynamiques, catÃ©gories)
- âœ… Support clustering (Leaflet.MarkerCluster)
- âœ… Popups avec contenu riche (images, liens, mÃ©tadonnÃ©es)
- âœ… Panneau latÃ©ral dÃ©taillÃ© avec layouts personnalisables
- âœ… Normalisation et sanitization des donnÃ©es (XSS prevention)
- âœ… Gestion gracieuse des erreurs (logging sans exceptions)
- âœ… Filtrage par catÃ©gories, tags, recherche (via `GeoLeaf.Filters`)

---

## API publique GeoLeaf.POI

### Initialisation

#### `init(mapOrOptions, config)`
Initialise le module POI avec la carte et la configuration.

**Signatures supportÃ©es** :
```javascript
// Signature 1: Objet avec map + config
GeoLeaf.POI.init({
    map: leafletMap,
    clustering: true,
    showIconsOnMap: true
});

// Signature 2: Map + config sÃ©parÃ©s (legacy)
GeoLeaf.POI.init(leafletMap, {
    clustering: true
});
```

**ParamÃ¨tres** :
| ParamÃ¨tre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `map` | `L.Map` | âœ… Oui | Instance Leaflet de la carte |
| `clustering` | boolean | Non (dÃ©faut: `true`) | Active/dÃ©sactive le clustering |
| `showIconsOnMap` | boolean | Non (dÃ©faut: `true`) | Affiche les icÃ´nes SVG des POIs |
| `clusterOptions` | object | Non | Options Leaflet.MarkerCluster |
| `maxZoom` | number | Non | MaxZoom pour le clustering |

**Retour** : `undefined` (ou `undefined` si erreur)

**Comportement** :
- CrÃ©e un `L.layerGroup()` (ou `L.markerClusterGroup()` si clustering actif)
- Ajoute le layer Ã  la carte
- Initialise l'Ã©tat partagÃ© entre tous les sous-modules POI
- Log les erreurs sans lever d'exception

**Exemple** :
```javascript
const map = GeoLeaf.Core.getMap();
GeoLeaf.POI.init({
    map: map,
    clustering: true,
    clusterOptions: {
        disableClusteringAtZoom: 15,
        maxClusterRadius: 50
    }
});
```

---

### Chargement et affichage

#### `loadAndDisplay()`
Charge les POIs depuis la configuration JSON et les affiche sur la carte.

```javascript
GeoLeaf.POI.loadAndDisplay();
```

**Comportement** :
1. Lit les POIs depuis `GeoLeaf.Config.getConfig().poi` (si disponible)
2. Normalise chaque POI via `poi/normalizers.js`
3. CrÃ©e les marqueurs via `poi/markers.js`
4. Ajoute les marqueurs au layer group/cluster
5. Stocke les POIs dans l'Ã©tat partagÃ©

**Retour** : Aucun

---

#### `displayPois(pois)`
Affiche un tableau de POIs sur la carte.

```javascript
const customPois = [
    { id: 'poi-1', latlng: [45.5, -73.6], label: 'Montreal' },
    { id: 'poi-2', latlng: [48.8, 2.3], label: 'Paris' }
];
GeoLeaf.POI.displayPois(customPois);
```

**ParamÃ¨tres** :
| ParamÃ¨tre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `pois` | array | âœ… Oui | Tableau d'objets POI |

**Retour** : Aucun

---

#### `reload(pois)`
Efface tous les POIs existants et affiche un nouveau tableau (optionnel).

```javascript
// Recharger les POIs depuis la config
GeoLeaf.POI.reload();

// Recharger avec un nouveau tableau
const updatedPois = await fetchPoisFromAPI();
GeoLeaf.POI.reload(updatedPois);
```

**ParamÃ¨tres** :
| ParamÃ¨tre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `pois` | array | Non | Nouveau tableau de POIs (sinon recharge depuis config) |

**Retour** : Aucun

**Comportement** :
1. Efface tous les layers existants
2. RÃ©initialise l'Ã©tat (`allPois`, `poiMarkers`)
3. Affiche les nouveaux POIs (ou recharge depuis config)

---

### Gestion POI individuel

#### `addPoi(poi)`
Ajoute un POI manuellement Ã  la carte.

```javascript
const marker = GeoLeaf.POI.addPoi({
    id: 'custom-poi',
    latlng: [45.5, -73.6],
    label: 'Restaurant Chez Marie',
    description: 'Excellent restaurant franÃ§ais',
    attributes: {
        categoryId: 'restaurant',
        rating: 4.5,
        phone: '+1-514-123-4567',
        website: 'https://example.com'
    }
});

if (marker) {
    console.log('POI ajoutÃ© avec succÃ¨s');
} else {
    console.error('Ã‰chec ajout POI (coordonnÃ©es invalides?)');
}
```

**ParamÃ¨tres** :
| ParamÃ¨tre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `poi` | object | âœ… Oui | Objet POI avec au minimum `latlng` |

**Structure POI** :
```javascript
{
    id: string,              // GÃ©nÃ©rÃ© automatiquement si absent
    latlng: [lat, lng],      // âœ… REQUIS - CoordonnÃ©es [latitude, longitude]
    label: string,           // Titre du POI
    description: string,     // Description courte
    attributes: {            // MÃ©tadonnÃ©es (optionnel)
        categoryId: string,      // ID catÃ©gorie (ex: 'restaurant')
        subCategoryId: string,   // ID sous-catÃ©gorie
        rating: number,          // Note (1-5)
        phone: string,           // TÃ©lÃ©phone
        email: string,           // Email
        website: string,         // Site web
        mainImage: string,       // URL image principale
        gallery: [string],       // Tableau d'URLs images
        // ... autres champs personnalisÃ©s
    }
}
```

**Retour** : `L.Marker` (ou `null` si Ã©chec)

**Comportement** :
- Valide les coordonnÃ©es (`lat` entre -90 et 90, `lng` entre -180 et 180)
- GÃ©nÃ¨re un ID si manquant (`poi-without-id-{timestamp}-{random}`)
- Normalise les donnÃ©es (Ã©chappe HTML, sanitize URLs)
- CrÃ©e le marqueur avec icÃ´ne/couleur selon la catÃ©gorie
- Ajoute au layer group (cluster ou simple)
- Retourne `null` et log l'erreur si coordonnÃ©es invalides (NaN, hors limites)

---

#### `getAllPois()`
RÃ©cupÃ¨re tous les POIs chargÃ©s.

```javascript
const allPois = GeoLeaf.POI.getAllPois();
console.log(`${allPois.length} POIs chargÃ©s`);

allPois.forEach(poi => {
    console.log(`- ${poi.label} (${poi.id})`);
});
```

**Retour** : `array` - Tableau des objets POI

---

#### `getPoiById(id)`
RÃ©cupÃ¨re un POI par son ID.

```javascript
const poi = GeoLeaf.POI.getPoiById('restaurant-123');
if (poi) {
    console.log(`TrouvÃ©: ${poi.label}`);
    GeoLeaf.POI.showPoiDetails(poi);
} else {
    console.log('POI non trouvÃ©');
}
```

**ParamÃ¨tres** :
| ParamÃ¨tre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `id` | string | âœ… Oui | ID du POI recherchÃ© |

**Retour** : `object` POI trouvÃ©, ou `null` si introuvable

---

### Panneau latÃ©ral (Side Panel)

#### `showPoiDetails(poi, customLayout)`
Affiche le panneau latÃ©ral avec les dÃ©tails d'un POI.

```javascript
// Usage basique
const poi = GeoLeaf.POI.getPoiById('restaurant-123');
GeoLeaf.POI.showPoiDetails(poi);

// Avec layout personnalisÃ©
GeoLeaf.POI.showPoiDetails(poi, [
    { field: 'attributes.mainImage', type: 'image', fullWidth: true },
    { field: 'label', type: 'title' },
    { field: 'attributes.rating', type: 'rating' },
    { field: 'description', type: 'paragraph' },
    { field: 'attributes.phone', type: 'phone', icon: 'phone' },
    { field: 'attributes.website', type: 'link', label: 'Site web' }
]);
```

**ParamÃ¨tres** :
| ParamÃ¨tre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `poi` | object | âœ… Oui | Objet POI Ã  afficher |
| `customLayout` | array | Non | Layout personnalisÃ© (dÃ©faut: depuis profil) |

**Layout personnalisÃ©** : Voir `docs/ui/GeoLeaf_UI_PanelBuilder_README.md` pour format dÃ©taillÃ©

**Comportement** :
- CrÃ©e le panneau latÃ©ral si inexistant (lazy loading)
- GÃ©nÃ¨re le HTML via `GeoLeaf._UIPanelBuilder.buildPoiSidePanel()`
- Affiche le panneau avec animation slide-in
- GÃ¨re la fermeture via overlay ou bouton close

---

#### `hideSidePanel()`
Ferme le panneau latÃ©ral.

```javascript
GeoLeaf.POI.hideSidePanel();
```

**Retour** : Aucun

---

#### `openSidePanelWithLayout(poi, customLayout)`
Alias pour `showPoiDetails()` avec layout obligatoire.

```javascript
GeoLeaf.POI.openSidePanelWithLayout(poi, customLayout);
// Ã‰quivalent Ã :
// GeoLeaf.POI.showPoiDetails(poi, customLayout);
```

---

### AccÃ¨s layer Leaflet

#### `getLayer()`
Retourne le layer group Leaflet actif (cluster ou simple).

```javascript
const poiLayer = GeoLeaf.POI.getLayer();
if (poiLayer) {
    console.log(`Type: ${poiLayer instanceof L.MarkerClusterGroup ? 'Cluster' : 'LayerGroup'}`);
    console.log(`Markers: ${poiLayer.getLayers().length}`);
    
    // Manipulation directe Leaflet
    map.fitBounds(poiLayer.getBounds());
}
```

**Retour** : `L.LayerGroup` | `L.MarkerClusterGroup` | `null`

**Utilisation** :
- Compter les marqueurs
- RÃ©cupÃ©rer les bounds
- Manipulation avancÃ©e via API Leaflet

---

## Format des donnÃ©es POI

### Structure minimale

```javascript
{
    latlng: [45.5, -73.6]  // âœ… REQUIS
}
```

### Structure complÃ¨te

```javascript
{
    // Identification
    id: "poi-123",
    
    // Position âœ… REQUIS
    latlng: [45.5017, -73.5673],
    
    // Affichage basique
    label: "Restaurant Chez Marie",
    name: "Chez Marie",  // Alias de label
    title: "Chez Marie", // Alias de label
    description: "Restaurant franÃ§ais authentique",
    
    // MÃ©tadonnÃ©es (attributes)
    attributes: {
        // CatÃ©gorisation
        categoryId: "restaurant",
        subCategoryId: "french",
        
        // Ã‰valuation
        rating: 4.5,
        reviewCount: 234,
        priceRange: "$$",
        
        // Contact
        phone: "+1-514-123-4567",
        email: "contact@chezmarie.com",
        website: "https://chezmarie.com",
        
        // RÃ©seaux sociaux
        facebook: "https://facebook.com/chezmarie",
        instagram: "@chezmarie",
        
        // Images
        mainImage: "https://example.com/photo.jpg",
        gallery: [
            "https://example.com/photo1.jpg",
            "https://example.com/photo2.jpg"
        ],
        
        // Descriptions enrichies
        shortDescription: "Cuisine franÃ§aise",
        longDescription: "Restaurant familial depuis 1985...",
        
        // Localisation
        address: "123 Rue Saint-Laurent",
        city: "Montreal",
        postalCode: "H2X 2T3",
        
        // Horaires
        openingHours: "Lun-Ven: 11h-22h",
        
        // Tags
        tags: ["terrasse", "wifi", "parking"],
        
        // Champs personnalisÃ©s
        speciality: "Bouillabaisse",
        chefName: "Marie Dupont"
    }
}
```

---

## Validation et normalisation

### Validation des coordonnÃ©es

Le module valide automatiquement les coordonnÃ©es :

```javascript
// âœ… Valide
{ latlng: [45.5, -73.6] }
{ latlng: { lat: 45.5, lng: -73.6 } }
{ latitude: 45.5, longitude: -73.6 }

// âŒ Invalide (retourne null, log erreur)
{ latlng: [95, -73.6] }      // Latitude > 90
{ latlng: [45.5, 200] }       // Longitude > 180
{ latlng: [NaN, NaN] }        // CoordonnÃ©es NaN
{ latlng: null }              // CoordonnÃ©es manquantes
```

**Limites** :
- `latitude` : -90 Ã  90
- `longitude` : -180 Ã  180

### Sanitization HTML

Tous les champs texte sont Ã©chappÃ©s automatiquement :

```javascript
GeoLeaf.POI.addPoi({
    latlng: [45.5, -73.6],
    label: '<script>alert("XSS")</script>',
    description: '<img src=x onerror=alert(1)>'
});

// Rendu dans le popup:
// &lt;script&gt;alert("XSS")&lt;/script&gt;
// &lt;img src=x onerror=alert(1)&gt;
```

### Sanitization URLs

Les URLs sont validÃ©es :

```javascript
// âœ… AutorisÃ©
website: "https://example.com"
website: "http://example.com"
photo: "data:image/png;base64,iVBORw0KG..."

// âŒ RejetÃ© (devient null)
website: "javascript:alert(1)"
website: "data:text/html,<script>..."
```

**Protocoles autorisÃ©s** : `http:`, `https:`, `data:image/`

---

## Clustering

### Activation

```javascript
GeoLeaf.POI.init({
    map: map,
    clustering: true,
    clusterOptions: {
        disableClusteringAtZoom: 15,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false
    }
});
```

### Options clustering

| Option | Type | DÃ©faut | Description |
|--------|------|--------|-------------|
| `disableClusteringAtZoom` | number | `null` | DÃ©sactive clustering Ã  partir de ce zoom |
| `maxClusterRadius` | number | 80 | Rayon maximum du cluster (pixels) |
| `spiderfyOnMaxZoom` | boolean | true | Disperse les marqueurs au zoom max |
| `showCoverageOnHover` | boolean | false | Affiche zone cluster au survol |

### DÃ©tection automatique

Si `Leaflet.MarkerCluster` n'est pas chargÃ© :
- Fallback automatique sur `L.layerGroup()`
- Aucune erreur levÃ©e
- Log warning dans la console

---

## Gestion des erreurs

Le module POI suit le pattern **"Logging over Throwing"** (Phase 5):

```javascript
// âŒ ANCIEN comportement (exception)
try {
    GeoLeaf.POI.init({});
} catch (e) {
    console.error(e); // "No map provided"
}

// âœ… NOUVEAU comportement (return undefined + log)
const result = GeoLeaf.POI.init({});
if (result === undefined) {
    // Ã‰chec init, erreur loggÃ©e dans console
}
```

**Principe** :
- Les fonctions retournent `null` ou `undefined` en cas d'erreur
- Les erreurs sont loggÃ©es via `GeoLeaf.Log.error()`
- Aucune exception levÃ©e â†’ application ne crash pas

**Exemples** :
```javascript
// CoordonnÃ©es invalides
const marker = GeoLeaf.POI.addPoi({ latlng: [95, -73.6] });
// marker === null
// Console: "[POI] POI sans coordonnÃ©es valides"

// POI introuvable
const poi = GeoLeaf.POI.getPoiById('inexistant');
// poi === null

// Module non initialisÃ©
GeoLeaf.POI.displayPois([...]); // Avant init()
// Console: "[POI] Module non initialisÃ©"
```

---

## IntÃ©gration avec d'autres modules

### Avec GeoLeaf.Config

```javascript
// 1. Charger la configuration
await GeoLeaf.Config.load('/data/geoleaf.config.json');

// 2. Initialiser la carte
GeoLeaf.Core.init({ containerId: 'map' });

// 3. Initialiser POI
const map = GeoLeaf.Core.getMap();
GeoLeaf.POI.init({ map });

// 4. Charger et afficher les POIs depuis config
GeoLeaf.POI.loadAndDisplay();
```

### Avec GeoLeaf.Filters

```javascript
// Filtrer les POIs affichÃ©s
const allPois = GeoLeaf.POI.getAllPois();

const filteredPois = GeoLeaf.Filters.filterPois(allPois, {
    categoryId: 'restaurant',
    searchText: 'pizza',
    map: map // Pour filtrage par bounds visibles
});

GeoLeaf.POI.reload(filteredPois);
```

Voir `docs/filters/GeoLeaf_Filters_README.md` pour dÃ©tails.

### Avec GeoLeaf.UI

Le panneau latÃ©ral POI utilise `GeoLeaf._UIPanelBuilder` pour gÃ©nÃ©rer le HTML :

```javascript
// Automatique via showPoiDetails()
GeoLeaf.POI.showPoiDetails(poi);

// Manuel (usage avancÃ©)
const panelHTML = GeoLeaf._UIPanelBuilder.buildPoiSidePanel(poi, customLayout);
document.getElementById('my-container').innerHTML = panelHTML;
```

---

## Exemples d'usage

### Exemple 1: Chargement basique

```javascript
// Init carte
GeoLeaf.Core.init({ containerId: 'map', center: [45.5, -73.6], zoom: 12 });

// Init POI
const map = GeoLeaf.Core.getMap();
GeoLeaf.POI.init({ map, clustering: true });

// Charger POIs depuis config
GeoLeaf.POI.loadAndDisplay();
```

### Exemple 2: Ajout POI manuel

```javascript
// Ajouter un POI depuis une API
async function addPoiFromAPI(id) {
    const response = await fetch(`/api/pois/${id}`);
    const data = await response.json();
    
    const marker = GeoLeaf.POI.addPoi({
        id: data.id,
        latlng: [data.lat, data.lng],
        label: data.name,
        description: data.description,
        attributes: {
            categoryId: data.category,
            rating: data.rating,
            photo: data.image_url
        }
    });
    
    if (marker) {
        // Centrer sur le POI
        map.setView(marker.getLatLng(), 15);
    }
}
```

### Exemple 3: Panneau personnalisÃ©

```javascript
const poi = GeoLeaf.POI.getPoiById('restaurant-123');

const customLayout = [
    { field: 'attributes.mainImage', type: 'image', fullWidth: true },
    { field: 'label', type: 'title' },
    { field: 'attributes.rating', type: 'rating', maxStars: 5 },
    { field: 'attributes.priceRange', type: 'text', icon: 'dollar', label: 'Prix' },
    { field: 'description', type: 'paragraph' },
    { 
        type: 'section',
        title: 'Contact',
        fields: [
            { field: 'attributes.phone', type: 'phone' },
            { field: 'attributes.email', type: 'email' },
            { field: 'attributes.website', type: 'link', label: 'Site web' }
        ]
    },
    { field: 'attributes.gallery', type: 'gallery', columns: 3 }
];

GeoLeaf.POI.showPoiDetails(poi, customLayout);
```

### Exemple 4: Filtrage dynamique

```javascript
// Barre de recherche
document.getElementById('search').addEventListener('input', (e) => {
    const searchText = e.target.value;
    const allPois = GeoLeaf.POI.getAllPois();
    
    const filtered = GeoLeaf.Filters.filterPois(allPois, {
        searchText: searchText
    });
    
    GeoLeaf.POI.reload(filtered);
});

// Filtre catÃ©gorie
document.getElementById('category-select').addEventListener('change', (e) => {
    const categoryId = e.target.value;
    const allPois = GeoLeaf.POI.getAllPois();
    
    const filtered = GeoLeaf.Filters.filterPois(allPois, {
        categoryId: categoryId
    });
    
    GeoLeaf.POI.reload(filtered);
});
```

---

## Bonnes pratiques

### âœ… DO

1. **Toujours initialiser aprÃ¨s GeoLeaf.Core**
   ```javascript
   GeoLeaf.Core.init({...});
   const map = GeoLeaf.Core.getMap();
   GeoLeaf.POI.init({ map });
   ```

2. **VÃ©rifier les retours de fonction**
   ```javascript
   const marker = GeoLeaf.POI.addPoi(poi);
   if (!marker) {
       console.error('Ã‰chec ajout POI');
   }
   ```

3. **Utiliser attributes pour mÃ©tadonnÃ©es**
   ```javascript
   {
       latlng: [...],
       label: "...",
       attributes: {
           // Toutes les mÃ©tadonnÃ©es ici
       }
   }
   ```

4. **Activer clustering pour grands volumes**
   ```javascript
   GeoLeaf.POI.init({ map, clustering: true });
   ```

### âŒ DON'T

1. **Ne pas manipuler l'Ã©tat interne directement**
   ```javascript
   // âŒ Mauvais
   GeoLeaf._POIShared.state.allPois.push(poi);
   
   // âœ… Bon
   GeoLeaf.POI.addPoi(poi);
   ```

2. **Ne pas supposer que addPoi() rÃ©ussit toujours**
   ```javascript
   // âŒ Mauvais
   const marker = GeoLeaf.POI.addPoi(poi);
   marker.openPopup(); // Crash si marker === null
   
   // âœ… Bon
   const marker = GeoLeaf.POI.addPoi(poi);
   if (marker) {
       marker.openPopup();
   }
   ```

3. **Ne pas mÃ©langer anciennes et nouvelles APIs**
   ```javascript
   // âŒ Ces fonctions n'existent plus
   GeoLeaf.POI.addPoint(lat, lng, opt);
   GeoLeaf.POI.addFromConfigItem(item);
   GeoLeaf.POI.clear();
   
   // âœ… Utiliser plutÃ´t
   GeoLeaf.POI.addPoi(poi);
   GeoLeaf.POI.reload([]);
   ```

---

## Migration depuis version 2.0.x

### API dÃ©prÃ©ciÃ©e

| Ancienne fonction | Nouvelle fonction | Notes |
|-------------------|-------------------|-------|
| `addPoint(lat, lng, opt)` | `addPoi({ latlng: [lat, lng], ...opt })` | Nouvelle signature objet |
| `addFromConfigItem(item)` | `addPoi(item)` | MÃªme comportement |
| `clear()` | `reload([])` | Efface et rÃ©affiche |
| `getLayerGroup()` | `getLayer()` | Nom plus court |

### Exemple migration

```javascript
// âŒ Version 2.0.x
GeoLeaf.POI.addPoint(45.5, -73.6, {
    label: "Montreal",
    description: "Ville"
});

// âœ… Version 2.1.0+
GeoLeaf.POI.addPoi({
    latlng: [45.5, -73.6],
    label: "Montreal",
    description: "Ville"
});
```

---

## RÃ©fÃ©rences

- **Architecture interne** : `docs/refactoring/POI_SPLIT_STRATEGY.md`
- **Tests** : `__tests__/poi.test.js` (41 tests)
- **Filters** : `docs/filters/GeoLeaf_Filters_README.md`
- **Panel Builder** : `docs/ui/GeoLeaf_UI_PanelBuilder_README.md`
- **Phase 4 Refactoring** : `SPRINT4_SUMMARY.md`
- **Testing Guide** : `docs/testing/TESTING_GUIDE.md`

---

## Changelog

**v2.1.0 (Phase 4 - December 2025)**
- âœ¨ Split module en 7 sous-modules
- âœ¨ Nouveau pattern "Logging over Throwing"
- âœ¨ API simplifiÃ©e (`addPoi` remplace `addPoint` et `addFromConfigItem`)
- âœ¨ Support layouts personnalisÃ©s pour side panel
- âœ¨ Validation et normalisation amÃ©liorÃ©es
- ðŸ› Fix: 29 tests POI (100% passing)
- ðŸ“š Documentation complÃ¨te et Ã  jour

**v2.0.0**
- Initial release avec clustering et popups

---

**DerniÃ¨re mise Ã  jour** : DÃ©cembre 2, 2025  
**Auteur** : Ã‰quipe GeoLeaf  
**Version GeoLeaf** : 2.1.0

