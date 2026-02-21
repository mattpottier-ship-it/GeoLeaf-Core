# Configuration POI (poiConfig)

Product Version: GeoLeaf Platform V1  
**Date de création**: Décembre 2025  
**Dernière vérification**: 19 janvier 2026

---

## Description

Le paramètre `poiConfig` dans le fichier profile.json configure le comportement des Points d'Intérêt (POI), notamment le clustering des marqueurs sur la carte.

## Localisation dans le code

- **Lecture**: `src/static/js/geojson/clustering.js` (lignes 123, 131)
- **Utilisation**: `src/static/js/poi/core.js`, `src/static/js/poi/markers.js`, `src/static/js/geojson/loader.js`

## Structure minimale

```json
{
  "poiConfig": {
    "clusterStrategy": "unified"
  }
}
```

## Paramètres disponibles

### clusterStrategy (requis)

Définit la stratégie de regroupement des marqueurs POI.

**Valeurs possibles:**

#### `"unified"` (recommandé)
Un seul cluster partagé pour tous les POI (JSON + GeoJSON).

**Comportement:**
- Tous les POI sont regroupés dans un seul MarkerClusterGroup
- Performance optimale
- Vue d'ensemble claire de la densité des POI

**Quand utiliser:** Pour la plupart des cas d'usage standard.

```json
{
  "poiConfig": {
    "clusterStrategy": "unified"
  }
}
```

#### `"by-source"`
Un cluster séparé par type de source (JSON vs GeoJSON).

**Comportement:**
- Les POI JSON sont groupés ensemble
- Les POI GeoJSON sont groupés séparément
- Permet de distinguer visuellement les sources de données

**Configuration complète:**
```json
{
  "poiConfig": {
    "clusterStrategy": "by-source",
    "sources": {
      "json": true,
      "geojson": true
    }
  }
}
```

**Quand utiliser:** Quand vous avez des sources de données distinctes à différencier visuellement.

#### `"json-only"`
Cluster uniquement pour les POI provenant de fichiers JSON.

**Comportement:**
- Les POI JSON sont groupés en clusters
- Les POI GeoJSON restent individuels (pas de clustering)
- Utile quand les données GeoJSON sont déjà agrégées

**Configuration complète:**
```json
{
  "poiConfig": {
    "clusterStrategy": "json-only",
    "jsonClustering": true,
    "geojsonClustering": false
  }
}
```

**Quand utiliser:** Quand vos POI GeoJSON ne doivent pas être regroupés (déjà agrégés, faible densité, etc.).

### Autres paramètres poiConfig

Ces paramètres sont également supportés par le module POI:

```json
{
  "poiConfig": {
    "clusterStrategy": "unified",
    
    // Clustering
    "clustering": true,              // Activer/désactiver le clustering (défaut: true)
    "clusterRadius": 80,              // Rayon de regroupement en pixels (défaut: 80)
    "disableClusteringAtZoom": 18,   // Niveau de zoom où le clustering s'arrête (défaut: 18)
    
    // Affichage
    "showIconsOnMap": true,           // Afficher les icônes sur la carte (défaut: true)
    "showPopup": true,                // Afficher les popups au clic (défaut: true)
    
    // Données
    "dataUrl": "path/to/poi.json",   // URL des données POI (optionnel)
    "enabled": true                   // Activer/désactiver le module POI (défaut: true)
  }
}
```

## Exemples d'utilisation

### Configuration minimaliste (recommandée)
```json
{
  "poiConfig": {
    "clusterStrategy": "unified"
  }
}
```

### Configuration avancée
```json
{
  "poiConfig": {
    "clusterStrategy": "unified",
    "clustering": true,
    "clusterRadius": 100,
    "disableClusteringAtZoom": 16,
    "showIconsOnMap": true,
    "showPopup": true
  }
}
```

### Désactiver le clustering complètement
```json
{
  "poiConfig": {
    "clustering": false,
    "showIconsOnMap": true,
    "showPopup": true
  }
}
```

## Notes techniques

- Le code lit `poiConfig.clusterStrategy` avec fallback sur `"unified"` si non spécifié
- Les clusters sont gérés par Leaflet.markercluster
- La stratégie peut être surchargée au niveau de chaque couche via les paramètres de layer.json
- L'objet `clusterStrategies` avec descriptions était uniquement documentaire et peut être supprimé du profile.json

## Fichiers concernés

- `src/static/js/geojson/clustering.js` - Logique de stratégie de clustering
- `src/static/js/geojson/loader.js` - Chargement et application du clustering
- `src/static/js/poi/core.js` - Initialisation du module POI
- `src/static/js/poi/markers.js` - Création des marqueurs
- `src/static/js/poi/shared.js` - État partagé incluant poiConfig

## Historique

- **v3.0.0**: Ajout du support des stratégies de clustering multiples
- **v2.x**: Clustering unifié par défaut uniquement
