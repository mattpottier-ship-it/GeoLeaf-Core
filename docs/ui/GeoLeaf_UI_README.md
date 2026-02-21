# GeoLeaf.UI – Documentation du module UI

Product Version: GeoLeaf Platform V1  
**Version :** 2.1.0 (Phase 4)  
**Module :** `geoleaf.ui.js` + sous-modules spécialisés

Le module **GeoLeaf.UI** gère tous les aspects d'interface utilisateur de GeoLeaf. Depuis la Phase 4, il adopte une **architecture modulaire** avec des sous-modules spécialisés pour des responsabilités spécifiques.

---

## 📦 Architecture Phase 4 – Module UI

Le module UI est organisé en **4 composants principaux** :

| Fichier | Responsabilités |
|---------|----------------|
| **`geoleaf.ui.js`** (2600+ lignes) | Module principal : gestion thème, contrôles fullscreen, construction panneaux filtres, rendu panneaux POI |
| **`ui/theme.js`** (250 lignes) | Sous-module thème : détection système, persistance, application des classes CSS |
| **`ui/panel-builder.js`** (485 lignes) | Sous-module construction panneaux : rendu POI side panel avec layouts personnalisables |
| **`ui/controls.js`** (165 lignes) | Sous-module contrôles : intégration contrôle fullscreen Leaflet |

**Total :** ~3500 lignes de code UI

> 📘 **Documentation détaillée par composant :**
> - [GeoLeaf_UI_Theme_README.md](./GeoLeaf_UI_Theme_README.md) - Gestion des thèmes
> - [GeoLeaf_UI_PanelBuilder_README.md](./GeoLeaf_UI_PanelBuilder_README.md) - Construction panneaux POI
> - [GeoLeaf_UI_Controls_README.md](./GeoLeaf_UI_Controls_README.md) - Contrôles Leaflet

---

## 🎯 Responsabilités du module UI

GeoLeaf.UI gère **5 domaines fonctionnels** :

### 1. **Gestion des thèmes visuels**
- Application thème light/dark sur `<body>`
- Détection préférence système (`prefers-color-scheme`)
- Persistance dans `localStorage`
- Toggle interactif (bouton soleil/lune)

### 2. **Construction de panneaux POI**
- Rendu side panel POI avec layouts JSON personnalisables
- Résolution de champs dynamiques (dot notation : `attributes.rating`)
- 15 types de champs supportés (title, text, image, gallery, rating, etc.)
- Sections accordéon/plain

### 3. **Panneaux de filtres**
- Construction interface filtres depuis configuration profil
- Intégration avec `GeoLeaf.Filters`
- Gestion états filtres (catégories, tags, recherche, proximité)
- Compteurs résultats dynamiques
- Tags filtres actifs avec suppression

### 4. **Contrôles Leaflet**
- Contrôle fullscreen personnalisé
- Intégration API Fullscreen (W3C)
- Gestion événements enter/exit fullscreen

### 5. **Utilitaires DOM**
- Escape HTML (prévention XSS)
- Génération IDs uniques
- Manipulation classes CSS

> ⚠️ **Ce que GeoLeaf.UI NE gère PAS** :
> - Fonds de carte (voir `GeoLeaf.BaseLayers`)
> - Données POI/Routes (voir `GeoLeaf.POI` / `GeoLeaf.Route`)
> - Logique de filtrage (voir `GeoLeaf.Filters`)
> - GeoJSON (voir `GeoLeaf.GeoJSON`)
> - Légende (voir `GeoLeaf.LayerManager`)

---

## 📚 API Publique

### **API Thème**

| Fonction | Description | Retour |
|----------|-------------|--------|
| `getCurrentTheme()` | Retourne le thème actif (`"light"` ou `"dark"`) | `string` |
| `applyTheme(theme)` | Applique un thème (`"light"`, `"dark"`, `"auto"`) | `void` |
| `toggleTheme()` | Bascule entre light/dark | `void` |
| `initThemeToggle(options)` | Initialise le bouton toggle thème | `void` |

**Exemple :**
```js
// Appliquer thème sombre
GeoLeaf.UI.applyTheme("dark");

// Récupérer thème actuel
const theme = GeoLeaf.UI.getCurrentTheme(); // "dark"

// Toggle
GeoLeaf.UI.toggleTheme(); // Passe à "light"
```

### **API Contrôles**

| Fonction | Description | Paramètres |
|----------|-------------|------------|
| `initFullscreenControl(map, container)` | Initialise contrôle fullscreen | `map`: L.Map<br>`container`: HTMLElement |

**Exemple :**
```js
const map = L.map("map");
const container = document.getElementById("map");
GeoLeaf.UI.initFullscreenControl(map, container);
```

### **API Panneaux POI**

| Fonction | Description | Paramètres |
|----------|-------------|------------|
| `renderPoiPanelWithLayout(poi, layout, container)` | Rend un panneau POI avec layout personnalisé | `poi`: objet<br>`layout`: array<br>`container`: HTMLElement |

**Exemple :**
```js
const layout = [
  { type: "title", field: "label" },
  { type: "rating", field: "attributes.rating" },
  { type: "image", field: "attributes.image" }
];

GeoLeaf.UI.renderPoiPanelWithLayout(poi, layout, document.getElementById("side-panel"));
```

### **API Panneaux Filtres**

| Fonction | Description | Paramètres |
|----------|-------------|------------|
| `buildFilterPanelFromActiveProfile(options)` | Construit le panneau filtres depuis profil actif | `options.container`: selector/HTMLElement<br>`options.onFilterChange`: callback |

**Exemple :**
```js
GeoLeaf.UI.buildFilterPanelFromActiveProfile({
  container: "#filters-panel",
  onFilterChange: (filterState) => {
    const filteredPois = GeoLeaf.Filters.filterPoiList(allPois, filterState);
    GeoLeaf.POI.displayPois(filteredPois);
  }
});
```

### **API Utilitaires**

| Fonction | Description | Retour |
|----------|-------------|--------|
| `_resolveField(poi, fieldPath)` | Résout un chemin de champ (`"attributes.rating"`) | `any` |
| `_escapeHtml(text)` | Escape HTML (prévention XSS) | `string` |

---

## 🔧 Initialisation

### Méthode `init()`

Fonction wrapper pour initialiser tous les composants UI :

```js
GeoLeaf.UI.init({
  buttonSelector: '[data-gl-role="theme-toggle"]', // Sélecteur bouton thème
  autoInitOnDomReady: true,                        // Init auto sur DOMContentLoaded
  map: mapInstance,                                // Instance Leaflet
  mapContainer: document.getElementById("map")     // Conteneur pour fullscreen
});
```

**Retourne un objet avec :**
```js
{
  applyTheme: Function,
  toggleTheme: Function,
  getCurrentTheme: Function,
  initFullscreenControl: Function
}
```

---

## 🎨 Intégration Configuration JSON

Le module UI lit la configuration depuis `GeoLeaf.Config` (profil actif) :

```json
{
  "ui": {
    "theme": "auto"
  },
  "layouts": {
    "poiSidePanel": [
      { "type": "title", "field": "label" },
      { "type": "rating", "field": "attributes.rating" }
    ]
  },
  "filters": [
    {
      "id": "categories",
      "type": "select",
      "label": "Catégorie",
      "field": "categoryId"
    }
  ]
}
```

---

## 🔗 Intégration avec autres modules

### **UI ↔ Theme** (sous-module)
```js
// geoleaf.ui.js délègue à ui/theme.js
GeoLeaf.UI.applyTheme("dark");
// → ui/theme.js applique les classes CSS
```

### **UI ↔ PanelBuilder** (sous-module)
```js
// geoleaf.ui.js délègue à ui/panel-builder.js
GeoLeaf.UI.renderPoiPanelWithLayout(poi, layout, container);
// → ui/panel-builder.js construit le HTML
```

### **UI ↔ Filters**
```js
// UI construit l'interface, Filters exécute la logique
const filterState = { categoryIds: ["restaurant"], searchText: "pizza" };
const filtered = GeoLeaf.Filters.filterPoiList(allPois, filterState);
GeoLeaf.POI.displayPois(filtered);
```

### **UI ↔ POI**
```js
// UI affiche détails POI dans side panel
GeoLeaf.POI.showPoiDetails(poi); // Appelle internement renderPoiPanelWithLayout
```

### **UI ↔ Config**
```js
// UI lit profil actif pour layouts et filtres
const profile = GeoLeaf.Config.getActiveProfile();
const layout = profile.layouts?.poiSidePanel || [];
```

---

## 📊 Fonctionnalités Phase 4

### **Nouveautés Phase 4**

✅ **Architecture modulaire** : Séparation theme/panel-builder/controls  
✅ **Layouts POI personnalisables** : 15 types de champs  
✅ **Filtres dynamiques** : Construction depuis configuration  
✅ **Thème auto** : Détection `prefers-color-scheme`  
✅ **Tags filtres** : Affichage/suppression filtres actifs  
✅ **Proximité géolocalisée** : Cercle/marker sur carte  
✅ **Accordéons** : Sections repliables dans panneaux  

### **Améliorations vs Phase 3**

| Aspect | Phase 3 | Phase 4 |
|--------|---------|---------|
| **Architecture** | Monolithique (1 fichier) | Modulaire (4 fichiers) |
| **Panneaux POI** | Template fixe | Layouts JSON personnalisables |
| **Filtres** | Markup statique HTML | Construction dynamique depuis config |
| **Thème** | light/dark manuel | + auto (détection système) |
| **Documentation** | README unique | 4 READMEs spécialisés |

---

## 🛠️ Bonnes Pratiques

### ✅ **À FAIRE**

```js
// 1. Utiliser applyTheme pour changements programmatiques
GeoLeaf.UI.applyTheme("dark");

// 2. Construire filtres depuis configuration
GeoLeaf.UI.buildFilterPanelFromActiveProfile({ 
  container: "#filters",
  onFilterChange: handleFilter 
});

// 3. Utiliser layouts pour personnaliser panneaux POI
const layout = profile.layouts.poiSidePanel;
GeoLeaf.UI.renderPoiPanelWithLayout(poi, layout, container);

// 4. Déléguer logique filtrage à GeoLeaf.Filters
const filtered = GeoLeaf.Filters.filterPoiList(pois, filterState);
```

### ❌ **À ÉVITER**

```js
// 1. Manipuler directement les classes CSS thème
document.body.classList.add("gl-theme-dark"); // ❌ Utiliser applyTheme()

// 2. Construire HTML POI manuellement
container.innerHTML = `<h2>${poi.label}</h2>`; // ❌ Utiliser renderPoiPanelWithLayout()

// 3. Implémenter filtres personnalisés dans UI
// ❌ UI doit construire l'interface, Filters exécute la logique

// 4. Accéder directement aux sous-modules
import theme from "ui/theme.js"; // ❌ Utiliser GeoLeaf.UI.applyTheme()
```

---

## 🔍 Résumé API Complète

| Catégorie | Fonctions | Documentation |
|-----------|-----------|---------------|
| **Thème** | `getCurrentTheme()`, `applyTheme()`, `toggleTheme()`, `initThemeToggle()` | [GeoLeaf_UI_Theme_README.md](./GeoLeaf_UI_Theme_README.md) |
| **Panneaux POI** | `renderPoiPanelWithLayout()`, `_resolveField()` | [GeoLeaf_UI_PanelBuilder_README.md](./GeoLeaf_UI_PanelBuilder_README.md) |
| **Contrôles** | `initFullscreenControl()` | [GeoLeaf_UI_Controls_README.md](./GeoLeaf_UI_Controls_README.md) |
| **Filtres** | `buildFilterPanelFromActiveProfile()`, `refreshFilterTags()` | Ce README (section Panneaux Filtres) |
| **Init** | `init()` | Ce README (section Initialisation) |
| **Utilitaires** | `_escapeHtml()`, `_resolveField()` | Privés (préfixe `_`) |

---

## 📖 Voir Aussi

- [GeoLeaf_POI_README.md](../poi/GeoLeaf_POI_README.md) - Module POI
- [GeoLeaf_Filters_README.md](../filters/GeoLeaf_Filters_README.md) - Module Filters
- [GeoLeaf_Config_README.md](../config/GeoLeaf_Config_README.md) - Configuration
- [GeoLeaf_Core_README.md](../core/GeoLeaf_core_README.md) - Module Core
