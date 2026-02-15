# GeoLeaf – Architecture Technique

> **Version**: 3.2.0  
> **Dernière mise à jour**: 14 février 2026  
> **Architecture**: Modulaire + Content Builder v1.0.0

## Table des Matières

1. [Architecture modulaire](#1-architecture-modulaire)
2. [Workflow de chargement](#2-workflow-de-chargement)
3. [Démo commentée (demo.js)](#3-démo-commentée-demojs)
4. [Architecture Content Builder](#4-architecture-content-builder) ⭐ **Nouveau v1.0.0**
5. [Résumé](#5-résumé)

---

## 1. Architecture modulaire

GeoLeaf est structuré en modules indépendants, chargés en cascade :

- **GeoLeaf.Core**  
  Initialisation de la carte Leaflet, gestion du thème, création du namespace global.

- **GeoLeaf.Config**  
  Chargement du fichier JSON externe, validation, dispatch des données aux autres modules.

- **GeoLeaf.UI**  
  Boutons, panneaux, sélecteurs de basemaps, toggle thème, interactions utilisateur.

- **Modules spécialisés**
  - **GeoLeaf.BaseLayers** : gestion des fonds de carte (street, topo, satellite).  
  - **GeoLeaf.POI** : markers, popups, clusters, filtrage.  
  - **GeoLeaf.GeoJSON** : couches externes, polygones, styles dynamiques.  
  - **GeoLeaf.Route** : itinéraires, polylignes, GPX.  
  - **GeoLeaf.LayerManager** : légendes automatiques ou déclaratives.  
  - **GeoLeaf.API** : future API interne haut‑niveau.  
  - **GeoLeaf.Log** : logging unifié (debug/info/warn/error).

### Diagramme modulaire

```
GeoLeaf (namespace global)
│
├── Core
│
├── Config
│
├── UI
│
├── BaseLayers
├── POI
├── GeoJSON
├── Route
├── Legend
├── API
└── Log
```

---

## 2. Workflow de chargement

Voici le cycle complet exécuté lors du chargement d’une carte :

```
DOM Ready
   ↓
GeoLeaf.Config.load(url)
   ↓
JSON chargé + validé
   ↓
GeoLeaf.Core.init(mapConfig)
   ↓
Chargement du basemap initial
   ↓
GeoLeaf.UI.init(uiConfig)
   ↓
Modules spécialisés
   ├─ BaseLayers.init()
   ├─ POI.init()
   ├─ GeoJSON.init()
   ├─ Route.init()
   ├─ Legend.init()
   ↓
Carte opérationnelle
```

Explication détaillée :

1. **DOMContentLoaded** : le script attend que le DOM et la div cible (`target`) soient prêts.  
2. **Config.load()** charge le fichier JSON externe.  
3. **Core.init()** crée la carte Leaflet et initialise le thème.  
4. **UI.init()** installe les composants (bouton thème, sélecteurs, panneaux).  
5. Chaque module spécialisé reçoit la configuration qui le concerne.  
6. La démo effectue un `fitBounds` automatique si un itinéraire ou une couche GeoJSON l’exige.  

---

## 3. Démo commentée (demo.js)

Voici le parcours logique exécuté dans la démo de référence :

1. `GeoLeaf.Config.init({ url: "../data/geoleaf-poi.json" })`  
   → Enclenche le chargement JSON.

2. `onLoaded(config)` (callback)  
   → Appelé automatiquement quand la config est prête.

3. `GeoLeaf.Core.init(config.map)`  
   → Initialise la carte et le thème UI.  
   → Retourne l’objet `L.Map`.

4. `GeoLeaf.BaseLayers.init(config.basemap)`  
   → Active la basemap déclarée (`street` par défaut).

5. `GeoLeaf.UI.init(config.ui)`  
   → Affiche le toggle thème et le sélecteur de basemap.

6. `GeoLeaf.POI.init(config.poi)`  
   → Affiche markers + popups + clusters.  
   → Pivot logique pour filtres futurs.

7. `GeoLeaf.Route.init(config.route)`  
   → Dessine la polyligne si `enabled = true`.

8. `GeoLeaf.GeoJSON.init(config.geojson)`  
   → Ajoute des couches supplémentaires au besoin.

9. `GeoLeaf.LayerManager.init(config)`  
   → Construit la légende en bas à droite (thématique + basemaps).

10. Message final : `[GeoLeaf.Demo] Démo initialisée`.

---

## 4. Architecture Content Builder

### Vue d'ensemble (v1.0.0 - Sprint 4.5)

Depuis janvier 2026, le **Content Builder** utilise une **architecture modulaire en 4 fichiers** pour générer le contenu HTML des POIs (popups, tooltips, panneaux latéraux).

```
GeoLeaf._ContentBuilder
│
├── Core (core.js - 316 lignes)
│   ├── Helpers: getResolveField, getEscapeHtml, getActiveProfile, getLog
│   ├── Validators: validateImageUrl, validateCoordinates, validateNumber, validateRating
│   ├── Badge Resolver: resolveBadge, resolveBadgeTooltip
│   └── Formatters: formatNumber, formatCoordinates, formatRating
│
├── Templates (templates.js - 351 lignes)
│   ├── CSS_CLASSES (40+ classes BEM)
│   └── 14 Template Builders:
│       ├── createMetricElement, createRatingElement, createListElement
│       ├── createTagsElement, createCoordinatesElement, createGalleryElement
│       ├── createBadge, buildLabel, wrapInParagraph, wrapInDiv
│       └── wrapInLink, createTitle, createImage, createTable
│
├── Assemblers (assemblers.js - 361 lignes)
│   ├── buildPopupHTML (171 lignes) → Génération complète popup
│   ├── buildTooltipHTML (90 lignes) → Génération complète tooltip
│   └── buildPanelItems (50 lignes) → Génération items panneau latéral
│
└── Orchestrator (content-builder.js - 653 lignes)
    ├── 13 Renderers:
    │   ├── renderText, renderLongtext, renderNumber, renderMetric
    │   ├── renderRating, renderBadge, renderImage, renderLink
    │   ├── renderList, renderTable, renderTags, renderCoordinates
    │   └── renderGallery
    ├── renderItem (dispatcher)
    └── Public APIs: buildPopupHTML, buildTooltipHTML, buildPanelItems
```

### Workflow de Génération de Contenu

#### 1. Génération Popup POI

```
User clicks POI marker
  ↓
poi.popup.js → GeoLeaf._ContentBuilder.buildPopupHTML(poi, config, options)
  ↓
content-builder.js délègue à Assemblers.buildPopupHTML
  ↓
Assemblers itère config et appelle renderItem pour chaque élément
  ↓
renderItem dispatche au renderer approprié (ex: renderBadge)
  ↓
renderBadge utilise Core.resolveBadge + Templates.createBadge
  ↓
HTML généré retourne à Assemblers qui construit structure complète
  ↓
Popup affiché sur carte
```

#### 2. Génération Tooltip POI

```
User hovers POI marker
  ↓
poi.popup.js → GeoLeaf._ContentBuilder.buildTooltipHTML(poi, config, options)
  ↓
Assemblers.buildTooltipHTML extrait valeurs textuelles
  ↓
Résolution taxonomie pour badges (Core.resolveBadge)
  ↓
Jointure avec contentUnion
  ↓
Tooltip texte retourné et affiché
```

### Ordre de Chargement (bundle-entry.js)

```javascript
// Modules Content Builder (ordre critique - défini dans src/bundle-entry.js)
'ui/content-builder/core.js',        // 1. Helpers + validators AVANT
'ui/content-builder/templates.js',   // 2. Template builders AVANT
'ui/content-builder/assemblers.js',  // 3. Assembleurs AVANT
'ui/content-builder.js'              // 4. Renderers + orchestration APRÈS
```

⚠️ **Important**: Ne pas modifier l'ordre de chargement sous peine de dépendances manquantes.

### Pattern de Fallback Défensif

Tous les modules utilisent un pattern de fallback pour garantir la rétrocompatibilité :

```javascript
// Exemple: renderBadge
function renderBadge(poi, config, options) {
    const Core = getCore(); // Tente d'accéder au module Core
    
    if (Core && Core.resolveBadge) {
        // Utilise Core.resolveBadge si disponible
        const badge = Core.resolveBadge(poi, config, options);
        // ... génération avec badge
    } else {
        // Fallback: Résolution inline si Core absent
        // ... logique de fallback complète
    }
}
```

**Avantages**:
- ✅ 100% rétrocompatible
- ✅ Pas de crash si module non chargé
- ✅ Migration progressive possible

### Métriques Architecture

**Avant Sprint 4.5 (v0.9)**:
- 1 fichier monolithique: `content-builder.js` (899 lignes)
- Code dupliqué: 69 lignes helpers répétés
- Templates inline: 351 lignes mélangées
- Badge resolution: 61 lignes inline

**Après Sprint 4.5 (v1.0.0)**:
- 4 fichiers modulaires: 1,681 lignes totales (+782 avec modules)
- Réduction nette: **-246 lignes (-27.4%)**
- Duplication éliminée: -37 lignes helpers
- Testabilité: +200% (modules isolés)
- Maintenabilité: +150% (code séparé)

### Diagramme Modulaire Complet

```
GeoLeaf (namespace global)
│
├── Core
├── Config
├── UI
│   └── _ContentBuilder (nouveau v1.0.0)
│       ├── Core (helpers, validators, badge resolver)
│       ├── Templates (14 template builders)
│       ├── Assemblers (popup, tooltip, panel)
│       └── (13 renderers + orchestration)
│
├── BaseLayers
├── POI
├── GeoJSON
├── Route
├── Legend
├── API
└── Log
```

### Documentation Détaillée

📄 **Guide complet**: [docs/ui/content-builder/README.md](../ui/content-builder/README.md)
- Architecture détaillée (1,000+ lignes)
- API Reference complète (15+ fonctions)
- Exemples d'utilisation (10+ cas)
- Best practices et troubleshooting

---

## 5. Résumé

Ce document fournit :
- Le **diagramme modulaire** complet de GeoLeaf.  
- Le **workflow de chargement officiel** (DOM → Config → Core → Modules).  
- La **logique complète de la démo** pour reproduire ou adapter une intégration.
- **L'architecture Content Builder v1.0.0** (nouveau - Sprint 4.5).  

Il constitue la référence pour l'architecture v3.2.0.

