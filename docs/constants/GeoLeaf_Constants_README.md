# GeoLeaf.CONSTANTS – Documentation des constantes globales

Product Version: GeoLeaf Platform V1  
**Version**: 4.0.0  
**Fichier**: `src/modules/geoleaf.constants.js` (31 lignes)  
**Dernière mise à jour**: 19 janvier 2026

---

## 📌 Vue d'ensemble

Le module **GeoLeaf.CONSTANTS** centralise toutes les valeurs numériques et constantes utilisées dans le projet. Il fournit un **point unique de vérité** pour les paramètres par défaut, évitant ainsi la duplication de "magic numbers" dans le code.

### Avantages

- ✅ **Centralisation** - Toutes les constantes au même endroit
- ✅ **Maintenabilité** - Modification facile des valeurs par défaut
- ✅ **Documentation** - Référence claire des valeurs utilisées
- ✅ **Cohérence** - Garantit l'uniformité entre modules
- ✅ **Accessibilité** - Disponible globalement via `GeoLeaf.CONSTANTS`

---

## 📚 Constantes disponibles

### 🗺️ Carte (Map)

#### `DEFAULT_ZOOM`

**Valeur** : `12`  
**Type** : Number  
**Description** : Niveau de zoom par défaut lors de l'initialisation de la carte

**Usage** :

```js
GeoLeaf.Core.init({
    zoom: GeoLeaf.CONSTANTS.DEFAULT_ZOOM,
});
```

---

#### `DEFAULT_CENTER`

**Valeur** : `[-32.95, -60.65]`  
**Type** : Array[Number, Number]  
**Description** : Coordonnées par défaut [latitude, longitude] - Rosario, Argentine

**Usage** :

```js
GeoLeaf.Core.init({
    center: GeoLeaf.CONSTANTS.DEFAULT_CENTER,
});
```

---

#### `MAX_ZOOM_ON_FIT`

**Valeur** : `15`  
**Type** : Number  
**Description** : Zoom maximum appliqué lors d'un `fitBounds` automatique

**Usage** :

```js
map.fitBounds(bounds, {
    maxZoom: GeoLeaf.CONSTANTS.MAX_ZOOM_ON_FIT,
});
```

---

### 📍 POI (Points d'intérêt)

#### `POI_MARKER_SIZE`

**Valeur** : `12`  
**Type** : Number  
**Description** : Taille par défaut des marqueurs POI en pixels

**Usage** :

```js
L.circleMarker([lat, lng], {
    radius: GeoLeaf.CONSTANTS.POI_MARKER_SIZE,
});
```

---

#### `POI_MAX_ZOOM`

**Valeur** : `18`  
**Type** : Number  
**Description** : Niveau de zoom maximum pour les POI

**Usage** :

```js
if (map.getZoom() <= GeoLeaf.CONSTANTS.POI_MAX_ZOOM) {
    // Afficher POI
}
```

---

#### `POI_SWIPE_THRESHOLD`

**Valeur** : `50`  
**Type** : Number  
**Description** : Distance minimale (en pixels) pour détecter un swipe dans le panneau POI

**Usage** :

```js
if (Math.abs(deltaX) > GeoLeaf.CONSTANTS.POI_SWIPE_THRESHOLD) {
    // Déclencher swipe
}
```

---

#### `POI_LIGHTBOX_TRANSITION_MS`

**Valeur** : `300`  
**Type** : Number  
**Description** : Durée de la transition d'ouverture/fermeture du lightbox (en millisecondes)

**Usage** :

```js
lightbox.style.transition = `opacity ${GeoLeaf.CONSTANTS.POI_LIGHTBOX_TRANSITION_MS}ms`;
```

---

#### `POI_SIDEPANEL_DEFAULT_WIDTH`

**Valeur** : `420`  
**Type** : Number  
**Description** : Largeur par défaut du panneau latéral POI (en pixels)

**Usage** :

```js
sidePanel.style.width = `${GeoLeaf.CONSTANTS.POI_SIDEPANEL_DEFAULT_WIDTH}px`;
```

---

### 🛣️ Route (Itinéraires)

#### `ROUTE_MAX_ZOOM_ON_FIT`

**Valeur** : `14`  
**Type** : Number  
**Description** : Zoom maximum lors du fitBounds d'un itinéraire

**Usage** :

```js
map.fitBounds(routeBounds, {
    maxZoom: GeoLeaf.CONSTANTS.ROUTE_MAX_ZOOM_ON_FIT,
});
```

---

#### `ROUTE_WAYPOINT_RADIUS`

**Valeur** : `5`  
**Type** : Number  
**Description** : Rayon des marqueurs de waypoints (points de passage) en pixels

**Usage** :

```js
L.circleMarker(waypointCoords, {
    radius: GeoLeaf.CONSTANTS.ROUTE_WAYPOINT_RADIUS,
});
```

---

### 🌍 GeoJSON (Couches)

#### `GEOJSON_MAX_ZOOM_ON_FIT`

**Valeur** : `15`  
**Type** : Number  
**Description** : Zoom maximum lors du fitBounds d'une couche GeoJSON

**Usage** :

```js
map.fitBounds(geojsonBounds, {
    maxZoom: GeoLeaf.CONSTANTS.GEOJSON_MAX_ZOOM_ON_FIT,
});
```

---

#### `GEOJSON_POINT_RADIUS`

**Valeur** : `6`  
**Type** : Number  
**Description** : Rayon par défaut des points GeoJSON (en pixels)

**Usage** :

```js
L.geoJSON(data, {
    pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
            radius: GeoLeaf.CONSTANTS.GEOJSON_POINT_RADIUS,
        });
    },
});
```

---

### 🖥️ UI (Interface)

#### `FULLSCREEN_TRANSITION_MS`

**Valeur** : `10`  
**Type** : Number  
**Description** : Délai de transition pour le mode plein écran (en millisecondes)

**Usage** :

```js
setTimeout(() => {
    map.invalidateSize();
}, GeoLeaf.CONSTANTS.FULLSCREEN_TRANSITION_MS);
```

---

## 📊 Tableau récapitulatif

| Constante                     | Valeur             | Catégorie | Description                 |
| ----------------------------- | ------------------ | --------- | --------------------------- |
| `DEFAULT_ZOOM`                | `12`               | Map       | Zoom initial                |
| `DEFAULT_CENTER`              | `[-32.95, -60.65]` | Map       | Centre par défaut (Rosario) |
| `MAX_ZOOM_ON_FIT`             | `15`               | Map       | Zoom max sur fitBounds      |
| `POI_MARKER_SIZE`             | `12`               | POI       | Taille marqueur             |
| `POI_MAX_ZOOM`                | `18`               | POI       | Zoom maximum                |
| `POI_SWIPE_THRESHOLD`         | `50`               | POI       | Seuil détection swipe       |
| `POI_LIGHTBOX_TRANSITION_MS`  | `300`              | POI       | Durée transition lightbox   |
| `POI_SIDEPANEL_DEFAULT_WIDTH` | `420`              | POI       | Largeur panneau latéral     |
| `ROUTE_MAX_ZOOM_ON_FIT`       | `14`               | Route     | Zoom max itinéraire         |
| `ROUTE_WAYPOINT_RADIUS`       | `5`                | Route     | Rayon waypoint              |
| `GEOJSON_MAX_ZOOM_ON_FIT`     | `15`               | GeoJSON   | Zoom max GeoJSON            |
| `GEOJSON_POINT_RADIUS`        | `6`                | GeoJSON   | Rayon points                |
| `FULLSCREEN_TRANSITION_MS`    | `10`               | UI        | Délai fullscreen            |

---

## 💡 Exemples d'utilisation

### Exemple 1 : Initialisation avec constantes

```js
// Au lieu de "magic numbers"
GeoLeaf.Core.init({
    center: [-32.95, -60.65], // ❌ Mauvais
    zoom: 12, // ❌ Mauvais
});

// Utiliser les constantes
GeoLeaf.Core.init({
    center: GeoLeaf.CONSTANTS.DEFAULT_CENTER, // ✅ Bon
    zoom: GeoLeaf.CONSTANTS.DEFAULT_ZOOM, // ✅ Bon
});
```

### Exemple 2 : FitBounds cohérent

```js
// POI - zoom max 15
map.fitBounds(poiBounds, {
    maxZoom: GeoLeaf.CONSTANTS.MAX_ZOOM_ON_FIT,
});

// Route - zoom max 14 (moins proche)
map.fitBounds(routeBounds, {
    maxZoom: GeoLeaf.CONSTANTS.ROUTE_MAX_ZOOM_ON_FIT,
});

// GeoJSON - zoom max 15
map.fitBounds(geojsonBounds, {
    maxZoom: GeoLeaf.CONSTANTS.GEOJSON_MAX_ZOOM_ON_FIT,
});
```

### Exemple 3 : Styles de marqueurs

```js
// POI - grands marqueurs
L.circleMarker(poiCoords, {
    radius: GeoLeaf.CONSTANTS.POI_MARKER_SIZE, // 12px
});

// Waypoints - petits marqueurs
L.circleMarker(waypointCoords, {
    radius: GeoLeaf.CONSTANTS.ROUTE_WAYPOINT_RADIUS, // 5px
});

// Points GeoJSON - taille moyenne
L.circleMarker(geojsonCoords, {
    radius: GeoLeaf.CONSTANTS.GEOJSON_POINT_RADIUS, // 6px
});
```

### Exemple 4 : Animation avec constantes

```js
// Transition lightbox POI
const lightbox = document.querySelector(".poi-lightbox");
lightbox.style.transition = `
    opacity ${GeoLeaf.CONSTANTS.POI_LIGHTBOX_TRANSITION_MS}ms ease-in-out,
    transform ${GeoLeaf.CONSTANTS.POI_LIGHTBOX_TRANSITION_MS}ms ease-in-out
`;

// Délai après fullscreen
toggleFullscreen().then(() => {
    setTimeout(() => {
        map.invalidateSize();
    }, GeoLeaf.CONSTANTS.FULLSCREEN_TRANSITION_MS);
});
```

---

## 🔧 Modification des constantes

### ⚠️ Attention

Les constantes sont **en lecture seule** et ne doivent **pas** être modifiées directement par l'application :

```js
// ❌ NE PAS FAIRE
GeoLeaf.CONSTANTS.DEFAULT_ZOOM = 10;

// ✅ À LA PLACE
// Passer la valeur personnalisée directement
GeoLeaf.Core.init({
    zoom: 10, // Valeur custom
});
```

### Override dans la configuration

Si vous avez besoin de valeurs différentes, passez-les via la configuration :

```js
// profile.json ou options
{
    "map": {
        "zoom": 10,              // Override DEFAULT_ZOOM
        "center": [48.8566, 2.3522]  // Override DEFAULT_CENTER
    },
    "poi": {
        "markerSize": 14,        // Override POI_MARKER_SIZE
        "maxZoom": 17            // Override POI_MAX_ZOOM
    }
}
```

---

## 📝 Ajout de nouvelles constantes

Si vous développez un nouveau module et avez besoin d'ajouter des constantes :

```js
// Dans geoleaf.constants.js
GeoLeaf.CONSTANTS = {
    // ... constantes existantes

    // Nouvelles constantes pour votre module
    MY_MODULE_DEFAULT_VALUE: 42,
    MY_MODULE_THRESHOLD: 100,
    MY_MODULE_ANIMATION_DURATION: 500,
};
```

**Bonnes pratiques** :

- ✅ Nommer en `UPPER_SNAKE_CASE`
- ✅ Grouper par module/fonctionnalité
- ✅ Documenter dans ce README
- ✅ Valeur par défaut raisonnable
- ✅ Type cohérent (Number, String, Array)

---

## 🔗 Modules utilisant ces constantes

### Par catégorie

**Map** :

- `GeoLeaf.Core` - Initialisation
- `GeoLeaf.Baselayers` - Gestion du zoom

**POI** :

- `GeoLeaf.POI` - Création de marqueurs
- `poi/markers.js` - Styles de marqueurs
- `poi/sidepanel.js` - Dimensions panneau
- `poi/image-upload.js` - Lightbox

**Route** :

- `GeoLeaf.Route` - Affichage d'itinéraires
- `route/layer-manager.js` - Waypoints

**GeoJSON** :

- `GeoLeaf.GeoJSON` - Couches vectorielles
- `geojson/loader.js` - Points et polygones

**UI** :

- `GeoLeaf.UI` - Contrôles fullscreen
- `ui/controls.js` - Transitions

---

## 📈 Valeurs recommandées par cas d'usage

### Carte de ville (détail élevé)

```js
DEFAULT_ZOOM: 14;
MAX_ZOOM_ON_FIT: 16;
POI_MARKER_SIZE: 10;
```

### Carte régionale (vue d'ensemble)

```js
DEFAULT_ZOOM: 10;
MAX_ZOOM_ON_FIT: 13;
POI_MARKER_SIZE: 12;
```

### Carte mondiale (très large)

```js
DEFAULT_ZOOM: 4;
MAX_ZOOM_ON_FIT: 8;
POI_MARKER_SIZE: 14;
```

### Application mobile

```js
POI_SWIPE_THRESHOLD: 30; // Plus sensible
POI_SIDEPANEL_DEFAULT_WIDTH: 320; // Plus étroit
POI_MARKER_SIZE: 14; // Plus gros (tactile)
```

---

## ⚠️ Notes importantes

1. **Immutabilité** : Les constantes ne doivent jamais être modifiées après initialisation
2. **Cohérence** : Utilisez toujours les constantes plutôt que des valeurs en dur
3. **Documentation** : Documentez tout ajout de constante dans ce fichier
4. **Tests** : Les tests utilisent ces constantes pour validation
5. **Performance** : L'accès aux constantes est instantané (pas de calcul)

---

## 🔍 Code source complet

```js
/**
 * Constantes globales GeoLeaf
 * Centralise toutes les valeurs numériques utilisées dans le projet
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    GeoLeaf.CONSTANTS = {
        // Carte
        DEFAULT_ZOOM: 12,
        DEFAULT_CENTER: [-32.95, -60.65],
        MAX_ZOOM_ON_FIT: 15,

        // POI
        POI_MARKER_SIZE: 12,
        POI_MAX_ZOOM: 18,
        POI_SWIPE_THRESHOLD: 50,
        POI_LIGHTBOX_TRANSITION_MS: 300,
        POI_SIDEPANEL_DEFAULT_WIDTH: 420,

        // Route
        ROUTE_MAX_ZOOM_ON_FIT: 14,
        ROUTE_WAYPOINT_RADIUS: 5,

        // GeoJSON
        GEOJSON_MAX_ZOOM_ON_FIT: 15,
        GEOJSON_POINT_RADIUS: 6,

        // UI
        FULLSCREEN_TRANSITION_MS: 10,
    };
})(typeof window !== "undefined" ? window : global);
```

---

## 📝 Checklist pour développeurs

Lors de l'utilisation de valeurs numériques dans votre code :

- [ ] Vérifier si une constante existe déjà
- [ ] Utiliser `GeoLeaf.CONSTANTS.XXX` au lieu d'une valeur en dur
- [ ] Si nouvelle constante nécessaire, l'ajouter à `geoleaf.constants.js`
- [ ] Documenter la nouvelle constante dans ce README
- [ ] Utiliser la convention de nommage `UPPER_SNAKE_CASE`
- [ ] Ajouter des commentaires dans le code source
- [ ] Tester avec la nouvelle valeur

---

**Dernière mise à jour** : 19 janvier 2026  
**Version GeoLeaf** : 4.0.0
