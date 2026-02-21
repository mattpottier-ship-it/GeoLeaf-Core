# 🎨 GeoLeaf UI Components - Documentation Détaillée

Product Version: GeoLeaf Platform V1  

**Modules** : `GeoLeaf._UIComponents`, `GeoLeaf._UIDomUtils`, `GeoLeaf.UI.Notifications`, et composants UI  
**Version** : 3.2.0  
**Fichiers source** : `src/static/js/ui/*.js` (19 fichiers)  
**Dernière mise à jour** : 19 janvier 2026

---

## 📋 Vue d'ensemble

Le système de **composants UI** GeoLeaf fournit des **briques réutilisables** pour construire l'interface utilisateur de la cartographie. Ces composants standardisent :
- La création d'éléments DOM avec cleanup automatique
- Les patterns d'accordéons et panneaux
- Les notifications toast
- Les symboles de légende (cercles, lignes, polygones)
- Les contrôles Leaflet (échelle, coordonnées)
- La gestion d'événements et états UI

---

## 🗂️ Architecture des composants UI

```
ui/
├── components.js                   // Composants réutilisables (accordéons, symboles)
├── dom-utils.js                    // Utilitaires DOM (résolution champs, taxonomie)
├── notifications.js                // Système de toast notifications
├── coordinates-display.js          // Affichage coordonnées curseur
├── scale-control.js                // Contrôle d'échelle carte
├── branding.js                     // Gestion branding client
├── event-delegation.js             // Délégation d'événements
├── theme.js                        // Gestion thèmes (light/dark)
├── controls.js                     // Contrôles Leaflet (fullscreen)
├── panel-builder.js                // Construction panneaux POI
├── content-builder.js              // Construction contenu dynamique
├── filter-control-builder.js       // Construction contrôles filtres
├── filter-state-manager.js         // Gestion états filtres
├── filter-panel/                   // Système de filtrage (6 fichiers)
│   ├── core.js                     // Logique principale
│   ├── renderer.js                 // Rendu UI filtres
│   ├── state-reader.js             // Lecture états filtres
│   ├── applier.js                  // Application des filtres
│   ├── proximity.js                // Filtres de proximité
│   └── shared.js                   // Utilitaires partagés
└── cache-button/                   // Bouton de cache offline
    ├── button-handler.js
    ├── progress-tracker.js
    └── toast-manager.js
```

---

## 🧩 Module 1 : `GeoLeaf._UIComponents` (components.js)

### Rôle

Fournit des **composants réutilisables** pour Legend et LayerManager : accordéons, symboles de légende, éléments de style.

### API Principale

#### `createAccordion(container, config)`

Crée un accordéon avec header cliquable et body collapsible.

**Paramètres** :
- `container` (HTMLElement) : Conteneur parent
- `config` (Object) :
  - `layerId` : ID de la couche
  - `label` : Titre de l'accordéon
  - `collapsed` : État initial (replié ou non)
  - `visible` : Couche visible (grise si false)
  - `onToggle` : Callback lors du toggle

**Retourne** : `{ accordionEl, headerEl, bodyEl, toggleEl }`

**Exemple** :

```javascript
const legendContainer = document.querySelector('.gl-legend__body');

const { accordionEl, bodyEl } = GeoLeaf._UIComponents.createAccordion(
  legendContainer,
  {
    layerId: 'parcs',
    label: 'Parcs et Jardins',
    collapsed: false,
    visible: true,
    onToggle: (layerId, isExpanded) => {
      console.log(`Accordéon ${layerId} est maintenant ${isExpanded ? 'ouvert' : 'fermé'}`);
    }
  }
);

// Ajouter du contenu dans le body
bodyEl.appendChild(document.createTextNode('Contenu de la légende'));
```

#### `renderCircleSymbol(container, config)`

Rend un symbole circulaire (pour POI/markers) avec icône SVG optionnelle.

**Paramètres** :
- `container` : Conteneur du symbole
- `config` :
  - `radius` : Rayon en pixels (défaut: 8)
  - `fillColor` : Couleur de remplissage
  - `color` : Couleur de bordure
  - `weight` : Épaisseur bordure
  - `fillOpacity` : Opacité
  - `icon` : ID d'icône SVG sprite (ex: `'#tree'`)
  - `iconColor` : Couleur de l'icône

**Exemple** :

```javascript
const symbolContainer = document.createElement('div');

// Cercle simple
GeoLeaf._UIComponents.renderCircleSymbol(symbolContainer, {
  radius: 10,
  fillColor: '#228B22',
  color: '#006400',
  weight: 2,
  fillOpacity: 0.8
});

// Cercle avec icône
GeoLeaf._UIComponents.renderCircleSymbol(symbolContainer, {
  radius: 12,
  fillColor: '#FF5733',
  icon: '#restaurant',
  iconColor: '#FFFFFF'
});
```

#### `renderLineSymbol(container, config)`

Rend un symbole de ligne (pour routes/LineString).

```javascript
GeoLeaf._UIComponents.renderLineSymbol(symbolContainer, {
  color: '#3388ff',
  weight: 3,
  opacity: 1,
  dashArray: '5, 10' // Ligne pointillée
});
```

#### `renderPolygonSymbol(container, config)`

Rend un symbole de polygone (pour zones/Polygon).

```javascript
GeoLeaf._UIComponents.renderPolygonSymbol(symbolContainer, {
  fillColor: '#3388ff',
  fillOpacity: 0.4,
  color: '#0066cc',
  weight: 2
});
```

#### `clearElement(element)`

Vide un élément DOM de manière sécurisée (évite innerHTML).

```javascript
const container = document.getElementById('legend-body');
GeoLeaf._UIComponents.clearElement(container);
// Tous les enfants sont retirés
```

#### `createEmptyMessage(container, message, className)`

Crée un message d'état vide (aucune donnée, chargement, etc.).

```javascript
GeoLeaf._UIComponents.createEmptyMessage(
  container,
  'Aucune couche à afficher.',
  'gl-legend__empty'
);
```

#### `attachEventHandler(element, eventType, handler)`

Attache un event listener avec cleanup automatique.

```javascript
const cleanup = GeoLeaf._UIComponents.attachEventHandler(
  button,
  'click',
  () => console.log('Clicked!')
);

// Plus tard : retirer le listener
cleanup();
```

---

## 🧩 Module 2 : `GeoLeaf._UIDomUtils` (dom-utils.js)

### Rôle

Utilitaires DOM pour résolution de champs, taxonomie, et manipulation UI.

### API Principale

#### `resolveField(obj, fieldPath)`

Résout une valeur via un chemin de propriété (dot notation).

**Paramètres** :
- `obj` : Objet source (POI, route, etc.)
- `fieldPath` : Chemin séparé par des points (ex: `'attributes.reviews.rating'`)

**Retourne** : Valeur trouvée ou `undefined`

**Exemple** :

```javascript
const poi = {
  id: 'poi_123',
  title: 'Restaurant',
  attributes: {
    address: '10 rue Paris',
    reviews: {
      rating: 4.5,
      count: 127
    }
  }
};

// Résoudre des champs imbriqués
const rating = GeoLeaf._UIDomUtils.resolveField(poi, 'attributes.reviews.rating');
// → 4.5

const address = GeoLeaf._UIDomUtils.resolveField(poi, 'attributes.address');
// → '10 rue Paris'

const missing = GeoLeaf._UIDomUtils.resolveField(poi, 'attributes.website');
// → undefined
```

#### `attachAccordionBehavior(container)`

Attache le comportement d'accordéon à un conteneur (délégation d'événements).

```javascript
const panelContainer = document.querySelector('.gl-panel');
GeoLeaf._UIDomUtils.attachAccordionBehavior(panelContainer);

// Tous les éléments .gl-accordion__header deviennent cliquables
```

#### `getActiveProfileConfig()`

Récupère le profil actif depuis `GeoLeaf.Config`.

```javascript
const profile = GeoLeaf._UIDomUtils.getActiveProfileConfig();
console.log('Profile ID:', profile.id);
console.log('Layers:', profile.layers);
```

#### `populateSelectOptionsFromTaxonomy(selectEl, profile, optionsFrom)`

Peuple un `<select>` avec des options depuis la taxonomie du profil.

**Chemins supportés** :
- `'taxonomy.categories'` : Toutes les catégories
- `'taxonomy.categories[*].subcategories'` : Toutes les sous-catégories

**Exemple** :

```javascript
const selectEl = document.createElement('select');
const profile = GeoLeaf._UIDomUtils.getActiveProfileConfig();

// Peupler avec les catégories
GeoLeaf._UIDomUtils.populateSelectOptionsFromTaxonomy(
  selectEl,
  profile,
  'taxonomy.categories'
);

// HTML généré :
// <option value="">— Tous —</option>
// <option value="restaurant">Restaurants</option>
// <option value="hotel">Hôtels</option>
// ...
```

---

## 🧩 Module 3 : `GeoLeaf.UI.Notifications` (notifications.js)

### Rôle

Système de **toast notifications** avec animations et auto-dismiss.

### Architecture

```javascript
class NotificationSystem {
  constructor() {
    this.container = null;
    this.maxVisible = 3;
    this.durations = {
      success: 3000,
      error: 5000,
      warning: 4000,
      info: 3000
    };
  }
}
```

### API Principale

#### `init(config)`

Initialise le système de notifications.

**Config** :
- `container` : Sélecteur du conteneur (défaut: `'#gl-notifications'`)
- `maxVisible` : Nombre max de toasts visibles (défaut: 3)
- `durations` : Durées par type (ms)
- `position` : Position (`'bottom-center'`, `'top-right'`, etc.)
- `animations` : Activer animations (défaut: true)

**Exemple** :

```javascript
GeoLeaf.UI.Notifications.init({
  container: '#gl-notifications',
  maxVisible: 5,
  position: 'top-right',
  durations: {
    success: 2000,
    error: 7000
  }
});
```

#### `success(message, duration)`

Affiche une notification de succès.

```javascript
GeoLeaf.UI.Notifications.success('Données chargées avec succès !');
GeoLeaf.UI.Notifications.success('Sauvegarde réussie', 5000); // Durée personnalisée
```

#### `error(message, duration)`

Affiche une notification d'erreur.

```javascript
GeoLeaf.UI.Notifications.error('Impossible de charger les données');
GeoLeaf.UI.Notifications.error('Erreur réseau', 10000);
```

#### `warning(message, duration)`

Affiche une notification d'avertissement.

```javascript
GeoLeaf.UI.Notifications.warning('Connexion instable');
```

#### `info(message, duration)`

Affiche une notification d'information.

```javascript
GeoLeaf.UI.Notifications.info('Chargement en cours...');
```

#### `clear()`

Retire toutes les notifications actives.

```javascript
GeoLeaf.UI.Notifications.clear();
```

### Structure HTML générée

```html
<div id="gl-notifications" class="gl-notifications gl-notifications--bottom-center">
  <div class="gl-toast gl-toast--success" role="alert" aria-live="polite">
    <div class="gl-toast__icon">✓</div>
    <div class="gl-toast__content">
      <div class="gl-toast__message">Données chargées avec succès !</div>
    </div>
    <button class="gl-toast__close" aria-label="Fermer">×</button>
  </div>
</div>
```

### Styles CSS

```css
.gl-toast {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  animation: slideIn 0.3s ease-out;
}

.gl-toast--success {
  background-color: #10B981;
  color: white;
}

.gl-toast--error {
  background-color: #EF4444;
  color: white;
}

.gl-toast--warning {
  background-color: #F59E0B;
  color: white;
}

.gl-toast--info {
  background-color: #3B82F6;
  color: white;
}
```

---

## 🧩 Module 4 : `GeoLeaf.UI.CoordinatesDisplay` (coordinates-display.js)

### Rôle

Affiche les **coordonnées du curseur** en temps réel sur la carte.

### API Principale

#### `init(map, options)`

Initialise l'affichage des coordonnées.

**Options** :
- `position` : Position Leaflet (défaut: `'bottomleft'`)
- `decimals` : Nombre de décimales (défaut: 6)

**Exemple** :

```javascript
const map = L.map('map');

GeoLeaf.UI.CoordinatesDisplay.init(map, {
  position: 'bottomleft',
  decimals: 4
});

// Affichage : "Lat: 48.8566, Lng: 2.3522"
```

### Intégration avec ScaleControl

Le module s'intègre automatiquement au wrapper d'échelle si disponible :

```html
<div class="gl-scale-main-wrapper">
  <div class="gl-scale-numeric">1:25000 Z12</div>
  <div class="gl-scale-separator"></div>
  <div class="gl-scale-coordinates">Lat: 48.8566, Lng: 2.3522</div>
</div>
```

### Configuration dans profile.json

```json
{
  "ui": {
    "showCoordinates": true
  }
}
```

---

## 🧩 Module 5 : `GeoLeaf.UI.ScaleControl` (scale-control.js)

### Rôle

Contrôle d'échelle de la carte (graphique ou numérique).

### API Principale

#### `init(map, options)`

Initialise le contrôle d'échelle.

**Options** :
- `position` : Position (défaut: `'bottomleft'`)
- `scaleType` : Type d'échelle (`'graphic'` ou `'numeric'`)
  - `'graphic'` : Échelle Leaflet classique (barre avec distances)
  - `'numeric'` : Échelle numérique (1:25000 Z12)
- `metric` : Afficher échelle métrique (défaut: true)
- `imperial` : Afficher échelle impériale (défaut: false)
- `maxWidth` : Largeur max barre graphique (défaut: 150)

**Exemples** :

```javascript
const map = L.map('map');

// Échelle graphique (Leaflet par défaut)
GeoLeaf.UI.ScaleControl.init(map, {
  scaleType: 'graphic',
  metric: true,
  imperial: false
});

// Échelle numérique (1:25000 Z12)
GeoLeaf.UI.ScaleControl.init(map, {
  scaleType: 'numeric',
  position: 'bottomright'
});
```

### Configuration dans profile.json

```json
{
  "ui": {
    "showScale": true,
    "scaleType": "numeric"
  }
}
```

### Échelle numérique : Calcul

Le calcul de l'échelle numérique se base sur la formule :

```
résolution = (40075016.686 * |cos(lat * π/180)|) / 2^(zoom + 8)
échelle = résolution / 0.00028
```

**Exemple** :
- Zoom 12 à Paris (48.8566°N) : 1:27000
- Zoom 15 à Paris : 1:3400

---

## 🧩 Module 6 : Système de filtrage (filter-panel/)

### Architecture

Le système de filtrage est divisé en **6 modules** :

```
filter-panel/
├── core.js           // Logique principale, initialisation
├── renderer.js       // Rendu UI (contrôles, sections)
├── state-reader.js   // Lecture états filtres depuis UI
├── applier.js        // Application des filtres aux données
├── proximity.js      // Filtres de proximité géographique
└── shared.js         // Utilitaires partagés
```

### Composants UI générés

**1. Recherche textuelle**

```html
<div class="gl-filter-control gl-filter-control--search">
  <label for="search-input">Recherche</label>
  <input type="text" id="search-input" placeholder="Rechercher...">
</div>
```

**2. Sélecteur de catégorie**

```html
<div class="gl-filter-control gl-filter-control--select">
  <label for="category-select">Catégorie</label>
  <select id="category-select">
    <option value="">— Tous —</option>
    <option value="restaurant">Restaurants</option>
    <option value="hotel">Hôtels</option>
  </select>
</div>
```

**3. Checkboxes multi-sélection**

```html
<div class="gl-filter-control gl-filter-control--checkboxes">
  <label>Tags</label>
  <div class="gl-filter-checkboxes">
    <label><input type="checkbox" value="parking"> Parking</label>
    <label><input type="checkbox" value="wifi"> WiFi</label>
    <label><input type="checkbox" value="terrasse"> Terrasse</label>
  </div>
</div>
```

**4. Filtre de proximité**

```html
<div class="gl-filter-control gl-filter-control--proximity">
  <label>Proximité</label>
  <input type="range" min="0" max="5000" step="100" value="1000">
  <span class="proximity-value">1.0 km</span>
  <button class="proximity-center-btn">📍 Centrer ici</button>
</div>
```

**5. Tags actifs**

```html
<div class="gl-filter-active-tags">
  <span class="gl-filter-tag" data-filter-type="category" data-filter-value="restaurant">
    Restaurant
    <button class="gl-filter-tag__remove">×</button>
  </span>
  <span class="gl-filter-tag" data-filter-type="tag" data-filter-value="wifi">
    WiFi
    <button class="gl-filter-tag__remove">×</button>
  </span>
  <button class="gl-filter-clear-all">Tout effacer</button>
</div>
```

### État des filtres

```javascript
const filterState = {
  search: 'restaurant',
  category: 'food',
  subcategory: '',
  tags: ['parking', 'wifi'],
  proximity: {
    enabled: true,
    radius: 1000, // mètres
    center: [48.8566, 2.3522]
  }
};
```

---

## 🎭 Thématisation CSS

Tous les composants UI utilisent des **classes CSS BEM** pour faciliter la personnalisation.

### Variables CSS

```css
:root {
  /* Notifications */
  --gl-toast-success: #10B981;
  --gl-toast-error: #EF4444;
  --gl-toast-warning: #F59E0B;
  --gl-toast-info: #3B82F6;
  
  /* Accordéons */
  --gl-accordion-header-bg: #f5f5f5;
  --gl-accordion-header-bg-hover: #e0e0e0;
  --gl-accordion-border: #ddd;
  
  /* Symboles */
  --gl-symbol-size: 16px;
  --gl-symbol-border: #666;
  
  /* Filtres */
  --gl-filter-bg: white;
  --gl-filter-border: #ddd;
  --gl-filter-tag-bg: #3B82F6;
  --gl-filter-tag-color: white;
}

/* Thème sombre */
[data-theme="dark"] {
  --gl-accordion-header-bg: #2C3E50;
  --gl-accordion-header-bg-hover: #34495E;
  --gl-accordion-border: #555;
  --gl-filter-bg: #2C3E50;
  --gl-filter-border: #555;
}
```

### Classes principales

```css
/* Accordéons */
.gl-legend__accordion { }
.gl-legend__accordion--collapsed { }
.gl-legend__accordion--inactive { }
.gl-legend__accordion-header { }
.gl-legend__accordion-body { }
.gl-legend__accordion-toggle { }

/* Symboles */
.gl-legend__circle { }
.gl-legend__line { }
.gl-legend__polygon { }

/* Notifications */
.gl-toast { }
.gl-toast--success { }
.gl-toast--error { }
.gl-toast--warning { }
.gl-toast--info { }
.gl-toast--removing { }

/* Filtres */
.gl-filter-control { }
.gl-filter-control--search { }
.gl-filter-control--select { }
.gl-filter-control--checkboxes { }
.gl-filter-control--proximity { }
.gl-filter-active-tags { }
.gl-filter-tag { }
.gl-filter-tag__remove { }

/* Échelle et coordonnées */
.gl-scale-main-wrapper { }
.gl-scale-numeric { }
.gl-scale-coordinates { }
.gl-zoom-badge { }
```

---

## 🔗 Intégration inter-modules

### Exemple 1 : Légende avec accordéons

```javascript
// Dans legend-renderer.js
const { accordionEl, bodyEl } = GeoLeaf._UIComponents.createAccordion(
  container,
  {
    layerId: 'parcs',
    label: 'Parcs et Jardins',
    collapsed: false,
    visible: true
  }
);

// Ajouter des symboles dans le body
const items = [
  { label: 'Parc urbain', color: '#228B22' },
  { label: 'Jardin public', color: '#90EE90' }
];

items.forEach(item => {
  const itemEl = L.DomUtil.create('div', 'gl-legend__item', bodyEl);
  GeoLeaf._UIComponents.renderCircleSymbol(itemEl, {
    fillColor: item.color,
    radius: 8
  });
  const labelEl = L.DomUtil.create('span', 'gl-legend__item-label', itemEl);
  labelEl.textContent = item.label;
});
```

### Exemple 2 : Panel POI avec résolution de champs

```javascript
// panel-builder.js
const panelLayout = {
  sections: [
    {
      type: 'plain',
      fields: [
        { type: 'title', field: 'title' },
        { type: 'text', label: 'Adresse', field: 'attributes.address' },
        { type: 'rating', field: 'attributes.reviews.rating' }
      ]
    }
  ]
};

function renderPanel(poi, layout) {
  layout.sections.forEach(section => {
    section.fields.forEach(fieldDef => {
      // Résoudre la valeur du champ
      const value = GeoLeaf._UIDomUtils.resolveField(poi, fieldDef.field);
      
      // Rendu selon le type
      if (fieldDef.type === 'rating') {
        renderRating(value); // 4.5 → ★★★★☆
      }
    });
  });
}
```

### Exemple 3 : Notifications après chargement

```javascript
// geojson-loader.js
GeoLeaf.GeoJSON.load({
  id: 'parcs',
  url: '/data/parcs.geojson'
}).then(() => {
  GeoLeaf.UI.Notifications.success('Couche "Parcs" chargée avec succès !');
}).catch(error => {
  GeoLeaf.UI.Notifications.error(`Erreur de chargement : ${error.message}`);
});
```

---

## ⚠️ Limitations

1. **Notifications** : Maximum 3 toasts simultanés (configurable)
2. **Accordéons** : Pas de support d'imbrication multiple (accordéons dans accordéons)
3. **Symboles** : Icônes SVG requièrent sprite SVG défini
4. **Filtres de proximité** : Calcul côté client (peut être lent avec +10k POIs)

---

## 🔗 Modules liés

- **[GeoLeaf.Utils](../utils/GeoLeaf_Utils_README.md)** : DomHelpers, EventHelpers utilisés par les composants
- **[GeoLeaf.Legend](../legend/GeoLeaf_Legend_README.md)** : Utilise accordéons et symboles
- **[GeoLeaf.LayerManager](../layer-manager/GeoLeaf_LayerManager_README.md)** : Utilise composants UI
- **[GeoLeaf.Filters](../filters/GeoLeaf_Filters_README.md)** : Système de filtrage backend
- **[GeoLeaf.POI](../poi/GeoLeaf_POI_README.md)** : Panel builder pour affichage POI

---

## 🚀 Améliorations futures

### Phase 1 (Q1 2026)
- [ ] Notifications empilables (queuing system)
- [ ] Thèmes de notifications personnalisables
- [ ] Accordéons imbriqués (support récursif)

### Phase 2 (Q2 2026)
- [ ] Composant Modal réutilisable
- [ ] Composant Dropdown menu
- [ ] Composant Tooltip avancé

### Phase 3 (Q3 2026)
- [ ] Web Components API (Custom Elements)
- [ ] Framework-agnostic (React/Vue adapters)
- [ ] Storybook pour showcase composants

---

**Version** : 3.2.0  
**Dernière mise à jour** : 19 janvier 2026  
**Sprint 3** : Documentation complète des composants UI ✅
