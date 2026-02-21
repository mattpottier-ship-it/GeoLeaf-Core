# 🗂️ GeoLeaf.LayerManager & Legend - Documentation Détaillée

Product Version: GeoLeaf Platform V1

**Modules** : `GeoLeaf.LayerManager` (alias `GeoLeaf.Legend`), `GeoLeaf._LayerManagerControl`, `GeoLeaf._LayerManagerRenderer`  
**Version** : 4.0.0  
**Fichiers source** :

- `src/modules/geoleaf.legend.js` (API publique)
- `src/modules/layer-manager/*.js` (6 modules internes)

**Dernière mise à jour** : 14 février 2026

---

## 📋 Vue d'ensemble

### ⚠️ Clarification terminologique importante

**GeoLeaf utilise deux noms pour le MÊME module** :

```javascript
GeoLeaf.LayerManager === GeoLeaf.Legend; // true (alias)
```

**Historique** :

- **v1.x-v2.x** : Module nommé `GeoLeaf.Legend` (légende graphique)
- **v3.x** : Rebaptisé `GeoLeaf.LayerManager` (gestionnaire de couches)
- **Alias maintenu** : `GeoLeaf.Legend` reste disponible pour rétrocompatibilité

**Recommendation** : Utiliser `GeoLeaf.LayerManager` pour nouveau code (nom officiel v3).

---

## 🎯 Rôle du module

Le **LayerManager** (ex-Legend) est un **contrôle UI Leaflet** qui affiche une **légende interactive** en bas de la carte (position configurable). Il permet à l'utilisateur de :

1. **Visualiser** les fonds de carte disponibles (Street, Topo, Satellite)
2. **Changer** de fond de carte par clic
3. **Voir** les couches GeoJSON actives avec leur légende
4. **Basculer** la visibilité des couches (toggle on/off)
5. **Changer** le style d'une couche (si multi-styles)
6. **Gérer** les thèmes visuels (thème primaire/secondaire)
7. **Cacher/afficher** la légende (collapsible)

---

## 🏗️ Architecture modulaire

Le LayerManager est divisé en **6 modules internes** :

```
geoleaf.legend.js (API publique)
        │
        ├─→ layer-manager/control.js        (Contrôle Leaflet)
        ├─→ layer-manager/renderer.js       (Rendu des sections/items)
        ├─→ layer-manager/basemap-selector.js  (Sélection fonds de carte)
        ├─→ layer-manager/style-selector.js   (Sélection styles couches)
        ├─→ layer-manager/cache-section.js    (Section cache offline)
        └─→ layer-manager/shared.js           (Utilitaires partagés)
```

### Flux de données

```
geoleaf.config.json
        │
        ├─→ legendConfig: { position, collapsed, ... }
        ├─→ baselayers: ["street", "topo", "satellite"]
        └─→ layers: [{ id, configFile, styles, ... }]
                    │
                    └─→ GeoLeaf.LayerManager.init()
                            │
                            ├─→ _LayerManagerControl (Leaflet Control)
                            │       │
                            │       └─→ _LayerManagerRenderer.renderSections()
                            │               │
                            │               ├─→ Section "basemap" → BasemapSelector
                            │               ├─→ Section "geojson" → Items + StyleSelector
                            │               ├─→ Section "poi" (deprecated)
                            │               └─→ Section "cache" → CacheSection
                            │
                            └─→ _allLayers Map (tracking toutes les couches)
```

---

## 🔌 API Publique : `GeoLeaf.LayerManager`

### `init(mapInstance, options)`

Initialise le gestionnaire de couches et l'ajoute à la carte.

**Paramètres** :

- `mapInstance` (L.Map) : Instance Leaflet **requis**
- `options` (Object) : Configuration
    - `position` : `"bottomleft"` (défaut), `"bottomright"`, `"topleft"`, `"topright"`
    - `collapsible` : `true` (défaut) - Légende repliable
    - `collapsed` : `false` (défaut) - État initial replié
    - `title` : `"Légende"` (défaut) - Titre de la légende

**Retourne** : `boolean` (succès)

**Exemples** :

```javascript
// Initialisation minimale (position depuis config)
const map = L.map("map");
GeoLeaf.LayerManager.init(map);

// Avec options personnalisées
GeoLeaf.LayerManager.init(map, {
    position: "bottomright",
    collapsible: true,
    collapsed: false,
    title: "Layers",
});

// Chargement auto depuis profile.json
// Si profile contient :
// "legendConfig": {
//   "position": "bottomleft",
//   "collapsedByDefault": true,
//   "title": "Légende des couches"
// }
GeoLeaf.LayerManager.init(map);
// → Applique automatiquement les paramètres du profile
```

### `addLayer(layerId, label, legendData, options)`

Ajoute une couche à la légende.

**Paramètres** :

- `layerId` (string) : Identifiant unique de la couche
- `label` (string) : Nom affiché dans la légende
- `legendData` (Object) : Données de la légende (générées depuis style)
    - `type` : `'simple'`, `'choropleth'`, `'categorized'`, `'graduated'`
    - `items` : Array d'items de légende `[{ label, color, icon, ... }]`
- `options` (Object) :
    - `visible` : `true` (défaut) - Couche visible
    - `styleId` : ID du style actif
    - `geometryType` : `'Point'`, `'LineString'`, `'Polygon'`

**Exemple** :

```javascript
// Légende simple (une seule couleur)
GeoLeaf.LayerManager.addLayer(
    "zones-industrielles",
    "Zones Industrielles",
    {
        type: "simple",
        items: [
            {
                label: "Zone industrielle",
                color: "#FF5733",
                geometryType: "Polygon",
            },
        ],
    },
    {
        visible: true,
        styleId: "default",
    }
);

// Légende catégorisée (par type)
GeoLeaf.LayerManager.addLayer(
    "parcs",
    "Parcs et Jardins",
    {
        type: "categorized",
        items: [
            { label: "Parc urbain", color: "#228B22", icon: "tree" },
            { label: "Jardin public", color: "#90EE90", icon: "flower" },
            { label: "Espace vert", color: "#32CD32", icon: "grass" },
        ],
    },
    {
        visible: true,
        styleId: "by-type",
    }
);

// Légende graduée (par densité)
GeoLeaf.LayerManager.addLayer(
    "densite-pop",
    "Densité de Population",
    {
        type: "graduated",
        items: [
            { label: "0 - 100", color: "#FFEDA0", min: 0, max: 100 },
            { label: "100 - 500", color: "#FED976", min: 100, max: 500 },
            { label: "500 - 1000", color: "#FEB24C", min: 500, max: 1000 },
            { label: "1000+", color: "#BD0026", min: 1000 },
        ],
    },
    {
        visible: true,
        styleId: "density-gradient",
    }
);
```

### `removeLayer(layerId)`

Retire une couche de la légende.

```javascript
GeoLeaf.LayerManager.removeLayer("zones-industrielles");
```

### `updateLayer(layerId, updates)`

Met à jour les propriétés d'une couche.

```javascript
// Changer la visibilité
GeoLeaf.LayerManager.updateLayer("parcs", {
    visible: false,
});

// Changer le style actif
GeoLeaf.LayerManager.updateLayer("parcs", {
    styleId: "by-size",
    legendData: {
        /* nouvelle légende */
    },
});

// Changer le label
GeoLeaf.LayerManager.updateLayer("parcs", {
    label: "Espaces Verts",
});
```

### `toggleLayerVisibility(layerId)`

Bascule la visibilité d'une couche (on/off).

```javascript
// Cacher la couche si visible, afficher si cachée
GeoLeaf.LayerManager.toggleLayerVisibility("parcs");

// Écouter l'événement de changement
document.addEventListener("geoleaf:layer:visibility:changed", (event) => {
    console.log(
        `Layer ${event.detail.layerId} is now ${event.detail.visible ? "visible" : "hidden"}`
    );
});
```

### `setLayerStyle(layerId, styleId)`

Change le style actif d'une couche (si multi-styles).

```javascript
// Couche avec 3 styles définis :
// - 'default' : Style par défaut
// - 'by-type' : Coloré par type
// - 'by-size' : Taille par surface

GeoLeaf.LayerManager.setLayerStyle("parcs", "by-type");

// Dispatch automatiquement l'événement :
// 'geoleaf:layer:style:changed'
```

### `refresh()`

Rafraîchit l'affichage de la légende (utile après changement de thème).

```javascript
// Changer le thème, puis rafraîchir la légende
GeoLeaf.Themes.setTheme("dark");
GeoLeaf.LayerManager.refresh();
```

### `clear()`

Réinitialise complètement la légende (supprime toutes les couches).

```javascript
GeoLeaf.LayerManager.clear();
```

### `destroy()`

Détruit le contrôle et retire la légende de la carte.

```javascript
GeoLeaf.LayerManager.destroy();
```

---

## 🎨 Configuration : legendConfig

La configuration de la légende dans `geoleaf.config.json` :

```json
{
    "legendConfig": {
        "position": "bottomleft",
        "collapsedByDefault": false,
        "title": "Légende des couches",
        "sections": [
            {
                "id": "basemap",
                "label": "Fonds de carte",
                "collapsedByDefault": false
            },
            {
                "id": "geojson",
                "label": "Couches vectorielles",
                "collapsedByDefault": true
            },
            {
                "id": "cache",
                "label": "Cache offline",
                "collapsedByDefault": true
            }
        ]
    },
    "baselayers": {
        "default": "street",
        "available": [
            {
                "id": "street",
                "label": "Plan",
                "url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            },
            {
                "id": "topo",
                "label": "Topographique",
                "url": "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            },
            {
                "id": "satellite",
                "label": "Satellite",
                "url": "https://server.arcgisonline.com/..."
            }
        ]
    },
    "layers": [
        {
            "id": "parcs",
            "type": "geojson",
            "configFile": "layers/parcs.config.json",
            "visibleByDefault": true,
            "styles": [
                {
                    "id": "default",
                    "label": "Par défaut",
                    "config": {
                        /* style config */
                    }
                },
                {
                    "id": "by-type",
                    "label": "Par type",
                    "config": {
                        /* style config */
                    }
                }
            ]
        }
    ]
}
```

---

## 🧩 Modules internes

### 1. **Control** (`layer-manager/control.js`)

Définit le **contrôle Leaflet personnalisé** (`L.Control.extend`).

**Responsabilités** :

- Créer le conteneur DOM du contrôle
- Gérer le positionnement sur la carte
- Empêcher la propagation des événements click/scroll
- Gérer l'état collapsed/expanded
- Appeler le renderer pour générer le contenu

**Méthodes clés** :

- `onAdd(map)` : Callback Leaflet lors de l'ajout à la carte
- `onRemove()` : Callback lors du retrait
- `_buildStructure()` : Construction de la structure HTML
- `_toggleCollapsed()` : Basculer l'état replié
- `updateSections(sections)` : Mettre à jour les sections affichées

---

### 2. **Renderer** (`layer-manager/renderer.js`)

Génère le **HTML des sections et items** de la légende.

**Responsabilités** :

- Rendu des sections (basemap, geojson, cache, etc.)
- Support des accordéons (sections repliables)
- Génération des items de légende (couleurs, icônes, patterns)
- Gestion des états visibles/cachés

**Méthodes clés** :

- `renderSections(bodyEl, sections)` : Rend toutes les sections
- `_renderItems(section, sectionEl)` : Rend les items d'une section
- `_createLegendItem(item, geometryType)` : Crée un item de légende HTML

**Exemple d'item généré** :

```html
<div class="gl-layer-manager__item" data-layer-id="parcs">
    <div class="gl-layer-manager__item-toggle">
        <input type="checkbox" checked />
    </div>
    <div class="gl-layer-manager__item-symbol">
        <!-- Symbole : couleur/icône/pattern -->
        <div class="gl-legend-symbol" style="background-color: #228B22"></div>
    </div>
    <div class="gl-layer-manager__item-label">Parc urbain</div>
</div>
```

---

### 3. **BasemapSelector** (`layer-manager/basemap-selector.js`)

Gère la **section fonds de carte** avec sélection par clic.

**Responsabilités** :

- Afficher les fonds de carte disponibles
- Highlighter le fond actif
- Dispatch événement `geoleaf:basemap:changed` lors du clic

**Exemple de rendu** :

```html
<div class="gl-layer-manager__section" data-section="basemap">
    <div class="gl-layer-manager__section-title">Fonds de carte</div>
    <div class="gl-basemap-selector">
        <div class="gl-basemap-item gl-basemap-item--active" data-basemap-id="street">Plan</div>
        <div class="gl-basemap-item" data-basemap-id="topo">Topographique</div>
        <div class="gl-basemap-item" data-basemap-id="satellite">Satellite</div>
    </div>
</div>
```

**Événement dispatch** :

```javascript
document.addEventListener("geoleaf:basemap:changed", (event) => {
    const newBasemap = event.detail.basemapId; // 'topo'
    // GeoLeaf.Baselayers écoute cet événement et change le fond
});
```

---

### 4. **StyleSelector** (`layer-manager/style-selector.js`)

Affiche un **dropdown de sélection de style** pour les couches multi-styles.

**Responsabilités** :

- Créer un `<select>` avec les styles disponibles
- Appliquer le style sélectionné
- Mettre à jour la légende après changement

**Exemple** :

```html
<div class="gl-layer-manager__style-selector">
    <select class="gl-layer-manager__style-select" data-layer-id="parcs">
        <option value="default">Par défaut</option>
        <option value="by-type" selected>Par type</option>
        <option value="by-size">Par taille</option>
    </select>
</div>
```

**Événement dispatch** :

```javascript
document.addEventListener("geoleaf:layer:style:changed", (event) => {
    console.log("Layer:", event.detail.layerId);
    console.log("New style:", event.detail.styleId);
    // Couche GeoJSON se recharge avec le nouveau style
});
```

---

### 5. **CacheSection** (`layer-manager/cache-section.js`)

Section spéciale pour le **cache offline** (Service Worker).

**Responsabilités** :

- Afficher le statut du cache (activé/désactivé)
- Permettre d'activer/désactiver le cache
- Afficher la taille du cache et le nombre de tuiles

**Exemple** :

```html
<div class="gl-layer-manager__section" data-section="cache">
    <div class="gl-layer-manager__section-title">Cache offline</div>
    <div class="gl-cache-section">
        <div class="gl-cache-status">
            <span class="gl-cache-status__icon">✓</span>
            Cache actif (1.2 MB, 342 tuiles)
        </div>
        <button class="gl-cache-btn" data-action="clear">Vider le cache</button>
    </div>
</div>
```

---

### 6. **Shared** (`layer-manager/shared.js`)

Utilitaires partagés entre modules.

**Fonctions** :

- `getLayerData(layerId)` : Récupère les données d'une couche
- `updateLayerData(layerId, updates)` : Met à jour une couche
- `getAllLayers()` : Retourne toutes les couches
- `dispatchEvent(eventName, detail)` : Dispatch un CustomEvent

---

## 📊 Génération automatique des légendes

Le LayerManager génère **automatiquement** les légendes depuis les **styles des couches**.

### Exemple : Style catégorisé

**Configuration de style** (`layers/parcs.config.json`) :

```json
{
    "styles": [
        {
            "id": "by-type",
            "label": "Par type de parc",
            "type": "categorized",
            "property": "type",
            "categories": [
                {
                    "value": "urban_park",
                    "label": "Parc urbain",
                    "style": {
                        "fillColor": "#228B22",
                        "fillOpacity": 0.6,
                        "color": "#006400",
                        "weight": 2
                    }
                },
                {
                    "value": "garden",
                    "label": "Jardin public",
                    "style": {
                        "fillColor": "#90EE90",
                        "fillOpacity": 0.6,
                        "color": "#228B22",
                        "weight": 2
                    }
                }
            ]
        }
    ]
}
```

**Légende générée automatiquement** :

```
Parcs et Jardins [▼]           [Style: Par type ▼]
├─ 🟩 Parc urbain
└─ 🟢 Jardin public
```

---

## 🎭 Thématisation CSS

Le LayerManager utilise des **classes CSS BEM** pour faciliter la personnalisation.

### Structure des classes

```css
.gl-layer-manager                     /* Conteneur principal */
.gl-layer-manager__wrapper            /* Wrapper interne */
.gl-layer-manager__header             /* En-tête (titre + toggle) */
.gl-layer-manager__title              /* Titre de la légende */
.gl-layer-manager__toggle             /* Bouton collapse/expand */
.gl-layer-manager__body               /* Corps de la légende */

.gl-layer-manager__section            /* Section (basemap, geojson, etc.) */
.gl-layer-manager__section-title      /* Titre de section */
.gl-layer-manager__section--accordion /* Section accordéon */
.gl-layer-manager__section--collapsed /* Section repliée */

.gl-layer-manager__item               /* Item de légende */
.gl-layer-manager__item-toggle        /* Checkbox visibilité */
.gl-layer-manager__item-symbol        /* Symbole (couleur/icône) */
.gl-layer-manager__item-label         /* Label de l'item */

.gl-layer-manager--collapsed          /* Légende repliée */
```

### Personnalisation CSS

```css
/* Thème sombre */
.gl-layer-manager {
    background-color: #2c3e50;
    color: #ecf0f1;
}

.gl-layer-manager__title {
    font-weight: bold;
    font-size: 16px;
    color: #3498db;
}

.gl-layer-manager__item:hover {
    background-color: rgba(52, 152, 219, 0.1);
}

/* Position personnalisée */
.leaflet-bottom.leaflet-left .gl-layer-manager {
    bottom: 50px; /* Décalage pour éviter attribution */
    left: 10px;
}
```

---

## ⚙️ Événements dispatched

Le LayerManager dispatch des **CustomEvent** pour communication inter-modules.

### `geoleaf:basemap:changed`

Dispatché lors du changement de fond de carte.

```javascript
document.addEventListener("geoleaf:basemap:changed", (event) => {
    console.log("Nouveau fond:", event.detail.basemapId);
    // → GeoLeaf.Baselayers.setBaseLayer() écoute cet événement
});
```

### `geoleaf:layer:visibility:changed`

Dispatché lors du toggle de visibilité d'une couche.

```javascript
document.addEventListener("geoleaf:layer:visibility:changed", (event) => {
    console.log("Couche:", event.detail.layerId);
    console.log("Visible:", event.detail.visible);
    // → GeoLeaf.GeoJSON.toggleLayer() écoute cet événement
});
```

### `geoleaf:layer:style:changed`

Dispatché lors du changement de style.

```javascript
document.addEventListener("geoleaf:layer:style:changed", (event) => {
    console.log("Couche:", event.detail.layerId);
    console.log("Nouveau style:", event.detail.styleId);
    // → GeoLeaf.GeoJSON.setLayerStyle() écoute cet événement
});
```

---

## ⚠️ Différences LayerManager vs Legend

| Aspect                 | `GeoLeaf.Legend` (v2) | `GeoLeaf.LayerManager` (v3)  |
| ---------------------- | --------------------- | ---------------------------- |
| **Nom officiel**       | GeoLeaf.Legend        | GeoLeaf.LayerManager         |
| **Alias**              | -                     | GeoLeaf.Legend (rétrocompat) |
| **Sections POI/Route** | Affichées             | Deprecated (filtrées)        |
| **Multi-styles**       | Non supporté          | Dropdown de sélection        |
| **Accordéons**         | Non                   | Sections repliables          |
| **Génération auto**    | Manuelle              | Depuis styles couches        |
| **Cache offline**      | Non                   | Section dédiée               |
| **Architecture**       | Monolithique          | Modulaire (6 fichiers)       |

---

## 🔗 Modules liés

- **[GeoLeaf.Core](../core/GeoLeaf_core_README.md)** : Initialisation carte
- **[GeoLeaf.Baselayers](../baselayers/GeoLeaf_Baselayers_README.md)** : Écoute événements basemap
- **[GeoLeaf.GeoJSON](../geojson/GeoLeaf_GeoJSON_README.md)** : Écoute événements layer visibility/style
- **[GeoLeaf.Themes](../themes/GeoLeaf_Themes_README.md)** : Thèmes visuels appliqués à la légende
- **[GeoLeaf.UI](../ui/GeoLeaf_UI_README.md)** : Composants UI réutilisables

---

## 🚀 Améliorations futures

### Phase 1 (Q1 2026)

- [ ] Drag & drop pour réordonner les couches
- [ ] Slider d'opacité par couche
- [ ] Export de légende en image (PNG)

### Phase 2 (Q2 2026)

- [ ] Groupes de couches imbriqués
- [ ] Filtres par attributs depuis la légende
- [ ] Zoom sur l'étendue d'une couche (bbox)

### Phase 3 (Q3 2026)

- [ ] API de customisation avancée (hooks)
- [ ] Support de légendes complexes (heatmaps, etc.)
- [ ] Mode "mini" compact pour petits écrans

---

**Version** : 4.0.0  
**Dernière mise à jour** : 19 janvier 2026  
**Sprint 2** : Documentation complète LayerManager vs Legend ✅
