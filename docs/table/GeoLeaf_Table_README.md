# GeoLeaf.Table â€“ Documentation du module Table
Product Version: GeoLeaf Platform V1  **Version**: 3.2.0  
**Fichier**: `src/static/js/geoleaf.table.js`  
**DerniÃ¨re mise Ã  jour**: 19 janvier 2026

---

Le module **GeoLeaf.Table** fournit une vue tabulaire des donnÃ©es cartographiques, complÃ©mentaire Ã  l'affichage sur la carte.

Il permet de :
- **Afficher** les attributs des entitÃ©s GeoJSON dans un tableau
- **Trier** les donnÃ©es par colonne (ascendant/descendant)
- **SÃ©lectionner** des entitÃ©s et synchroniser avec la carte
- **Rechercher** et filtrer les donnÃ©es
- **Exporter** la sÃ©lection
- **Zoomer** sur les entitÃ©s sÃ©lectionnÃ©es

---

## 1. RÃ´le fonctionnel du Table

GeoLeaf.Table a cinq responsabilitÃ©s principales :

1. **Afficher les donnÃ©es** des couches GeoJSON sous forme tabulaire
2. **Synchroniser** la sÃ©lection entre table et carte
3. **Permettre le tri** multi-colonnes avec cycles (asc â†’ desc â†’ null)
4. **GÃ©rer la sÃ©lection multiple** avec export et zoom
5. **S'intÃ©grer** avec les modules GeoJSON, Filters et Core

> Important : Le module Table nÃ©cessite que **GeoLeaf.GeoJSON** soit chargÃ© et configurÃ©.

---

## 2. API publique de GeoLeaf.Table

### 2.1 `GeoLeaf.Table.init(options)`

Initialise le module Table avec une instance de carte et des options.

```js
GeoLeaf.Table.init(options);
```

- **ParamÃ¨tres :**
  - `options` : objet de configuration **requis**
    - `options.map` : `L.Map` - instance de la carte Leaflet **(requis)**
    - `options.config` : `Object` - configuration personnalisÃ©e (optionnel)
      - `enabled` : `boolean` - activer le module (dÃ©faut : `true`)
      - `defaultVisible` : `boolean` - visible au dÃ©marrage (dÃ©faut : `false`)
      - `pageSize` : `number` - lignes par page (dÃ©faut : `50`)
      - `maxRowsPerLayer` : `number` - limite de lignes (dÃ©faut : `1000`)
      - `enableExportButton` : `boolean` - bouton export (dÃ©faut : `true`)
      - `virtualScrolling` : `boolean` - scroll virtuel (dÃ©faut : `true`)
      - `defaultHeight` : `string` - hauteur par dÃ©faut (dÃ©faut : `'40%'`)
      - `resizable` : `boolean` - redimensionnable (dÃ©faut : `false`)

- **Retour :** `void`

#### Exemple minimal

```js
const map = GeoLeaf.Core.getMap();

GeoLeaf.Table.init({
  map: map
});
```

#### Exemple avec configuration

```js
GeoLeaf.Table.init({
  map: map,
  config: {
    defaultVisible: true,
    pageSize: 100,
    maxRowsPerLayer: 2000,
    defaultHeight: '50%',
    resizable: true
  }
});
```

---

### 2.2 `GeoLeaf.Table.show()`

Affiche le tableau.

```js
GeoLeaf.Table.show();
```

- **Ã‰vÃ©nements Ã©mis :** `geoleaf:table:opened`

#### Exemple

```js
// Bouton pour afficher le tableau
document.getElementById('show-table-btn').addEventListener('click', () => {
  GeoLeaf.Table.show();
});
```

---

### 2.3 `GeoLeaf.Table.hide()`

Masque le tableau.

```js
GeoLeaf.Table.hide();
```

- **Ã‰vÃ©nements Ã©mis :** `geoleaf:table:closed`

#### Exemple

```js
// Bouton pour masquer le tableau
document.getElementById('hide-table-btn').addEventListener('click', () => {
  GeoLeaf.Table.hide();
});
```

---

### 2.4 `GeoLeaf.Table.toggle()`

Bascule la visibilitÃ© du tableau (affiche si cachÃ©, cache si affichÃ©).

```js
GeoLeaf.Table.toggle();
```

#### Exemple

```js
// Bouton toggle
document.getElementById('toggle-table-btn').addEventListener('click', () => {
  GeoLeaf.Table.toggle();
});
```

---

### 2.5 `GeoLeaf.Table.setLayer(layerId)`

DÃ©finit la couche GeoJSON Ã  afficher dans le tableau.

```js
GeoLeaf.Table.setLayer(layerId);
```

- **ParamÃ¨tres :**
  - `layerId` : `string` - ID de la couche GeoJSON (ou `null` pour vider)

- **Ã‰vÃ©nements Ã©mis :** `geoleaf:table:layerChanged` avec `{layerId}`

> Note : Seules les couches avec `table.enabled: true` dans leur configuration peuvent Ãªtre affichÃ©es.

#### Exemple

```js
// SÃ©lecteur de couche
document.getElementById('layer-select').addEventListener('change', (e) => {
  const layerId = e.target.value;
  GeoLeaf.Table.setLayer(layerId);
});
```

#### Configuration de couche pour Table

Dans `geoleaf.config.json` :

```json
{
  "geojson": {
    "layers": [
      {
        "id": "restaurants",
        "url": "data/restaurants.geojson",
        "table": {
          "enabled": true,
          "columns": [
            {"field": "properties.name", "label": "Nom", "width": "30%"},
            {"field": "properties.category", "label": "CatÃ©gorie", "width": "20%"},
            {"field": "properties.rating", "label": "Note", "width": "15%"}
          ],
          "defaultSort": {
            "field": "properties.name",
            "direction": "asc"
          }
        }
      }
    ]
  }
}
```

---

### 2.6 `GeoLeaf.Table.refresh()`

RafraÃ®chit les donnÃ©es affichÃ©es dans le tableau.

```js
GeoLeaf.Table.refresh();
```

Utilise la couche actuellement sÃ©lectionnÃ©e et rÃ©applique les filtres, le tri, etc.

#### Exemple

```js
// RafraÃ®chir aprÃ¨s un changement de filtre
map.on('geoleaf:filters:changed', () => {
  GeoLeaf.Table.refresh();
});
```

---

### 2.7 `GeoLeaf.Table.sortByField(field)`

Change le tri sur une colonne spÃ©cifique.

```js
GeoLeaf.Table.sortByField(field);
```

- **ParamÃ¨tres :**
  - `field` : `string` - chemin du champ (notation point : `properties.name`)

- **Comportement :** Cycle de tri sur la mÃªme colonne :
  1. Premier clic : tri ascendant
  2. DeuxiÃ¨me clic : tri descendant
  3. TroisiÃ¨me clic : pas de tri (ordre original)

- **Ã‰vÃ©nements Ã©mis :** `geoleaf:table:sortChanged` avec `{field, direction}`

#### Exemple

```js
// Click sur en-tÃªte de colonne
document.querySelectorAll('.table-header').forEach(header => {
  header.addEventListener('click', () => {
    const field = header.dataset.field;
    GeoLeaf.Table.sortByField(field);
  });
});
```

---

### 2.8 `GeoLeaf.Table.setSelection(ids, add)`

SÃ©lectionne ou dÃ©sÃ©lectionne des entitÃ©s.

```js
GeoLeaf.Table.setSelection(ids, add);
```

- **ParamÃ¨tres :**
  - `ids` : `Array<string>` - IDs des entitÃ©s Ã  sÃ©lectionner
  - `add` : `boolean` - ajouter Ã  la sÃ©lection existante (`true`) ou remplacer (`false`, dÃ©faut)

- **Ã‰vÃ©nements Ã©mis :** `geoleaf:table:selectionChanged` avec `{layerId, selectedIds}`

#### Exemple

```js
// SÃ©lectionner des entitÃ©s spÃ©cifiques
GeoLeaf.Table.setSelection(['poi-1', 'poi-5', 'poi-12']);

// Ajouter Ã  la sÃ©lection existante
GeoLeaf.Table.setSelection(['poi-20'], true);
```

---

### 2.9 `GeoLeaf.Table.getSelectedIds()`

Retourne les IDs des entitÃ©s sÃ©lectionnÃ©es.

```js
const selectedIds = GeoLeaf.Table.getSelectedIds();
```

- **Retour :** `Array<string>` - liste des IDs sÃ©lectionnÃ©s

#### Exemple

```js
const selected = GeoLeaf.Table.getSelectedIds();
console.log(`${selected.length} entitÃ©s sÃ©lectionnÃ©es:`, selected);
```

---

### 2.10 `GeoLeaf.Table.clearSelection()`

Efface toute la sÃ©lection.

```js
GeoLeaf.Table.clearSelection();
```

- **Ã‰vÃ©nements Ã©mis :** `geoleaf:table:selectionChanged` avec `{selectedIds: []}`

#### Exemple

```js
// Bouton "Tout dÃ©sÃ©lectionner"
document.getElementById('clear-selection-btn').addEventListener('click', () => {
  GeoLeaf.Table.clearSelection();
});
```

---

### 2.11 `GeoLeaf.Table.zoomToSelection()`

Zoom sur les entitÃ©s sÃ©lectionnÃ©es dans la carte.

```js
GeoLeaf.Table.zoomToSelection();
```

- **Ã‰vÃ©nements Ã©mis :** `geoleaf:table:zoomToSelection` avec `{layerId, selectedIds}`
- **Comportement :** Calcule les bounds des entitÃ©s sÃ©lectionnÃ©es et ajuste la vue de la carte

#### Exemple

```js
// Bouton "Zoom sur sÃ©lection"
document.getElementById('zoom-selection-btn').addEventListener('click', () => {
  const selected = GeoLeaf.Table.getSelectedIds();
  
  if (selected.length === 0) {
    alert('Aucune entitÃ© sÃ©lectionnÃ©e');
    return;
  }
  
  GeoLeaf.Table.zoomToSelection();
});
```

---

### 2.12 `GeoLeaf.Table.highlightSelection(active)`

Active/dÃ©sactive la surbrillance des entitÃ©s sÃ©lectionnÃ©es sur la carte.

```js
GeoLeaf.Table.highlightSelection(active);
```

- **ParamÃ¨tres :**
  - `active` : `boolean` - activer (`true`) ou dÃ©sactiver (`false`)

- **Ã‰vÃ©nements Ã©mis :** `geoleaf:table:highlightSelection` avec `{layerId, selectedIds, active}`

#### Exemple

```js
// Toggle surbrillance
let highlighted = false;

document.getElementById('highlight-btn').addEventListener('click', () => {
  highlighted = !highlighted;
  GeoLeaf.Table.highlightSelection(highlighted);
});
```

---

### 2.13 `GeoLeaf.Table.exportSelection()`

Ã‰met un Ã©vÃ©nement pour exporter la sÃ©lection.

```js
GeoLeaf.Table.exportSelection();
```

- **Ã‰vÃ©nements Ã©mis :** `geoleaf:table:exportSelection` avec `{layerId, selectedIds, rows}`

> Note : Le module Table Ã©met uniquement l'Ã©vÃ©nement. L'implÃ©mentation de l'export (CSV, JSON, etc.) doit Ãªtre gÃ©rÃ©e par l'application.

#### Exemple

```js
// Bouton export
document.getElementById('export-btn').addEventListener('click', () => {
  GeoLeaf.Table.exportSelection();
});

// Ã‰couter l'Ã©vÃ©nement pour implÃ©menter l'export
map.on('geoleaf:table:exportSelection', (e) => {
  const { rows } = e;
  
  // Export CSV
  const csv = convertToCSV(rows);
  downloadFile(csv, 'export.csv', 'text/csv');
});

function convertToCSV(rows) {
  // ImplÃ©mentation export CSV
  const headers = Object.keys(rows[0].properties);
  const csvLines = [headers.join(',')];
  
  rows.forEach(row => {
    const values = headers.map(h => row.properties[h] || '');
    csvLines.push(values.join(','));
  });
  
  return csvLines.join('\n');
}
```

---

## 3. Configuration dans geoleaf.config.json

### 3.1 Configuration globale du module

```json
{
  "ui": {
    "table": {
      "enabled": true,
      "defaultVisible": false,
      "pageSize": 50,
      "maxRowsPerLayer": 1000,
      "enableExportButton": true,
      "virtualScrolling": true,
      "defaultHeight": "40%",
      "minHeight": "20%",
      "maxHeight": "60%",
      "resizable": false
    }
  }
}
```

### 3.2 Configuration par couche

```json
{
  "geojson": {
    "layers": [
      {
        "id": "restaurants",
        "url": "data/restaurants.geojson",
        "table": {
          "enabled": true,
          "columns": [
            {
              "field": "properties.name",
              "label": "Nom",
              "width": "30%",
              "sortable": true
            },
            {
              "field": "properties.category",
              "label": "CatÃ©gorie",
              "width": "20%",
              "sortable": true
            },
            {
              "field": "properties.address",
              "label": "Adresse",
              "width": "35%",
              "sortable": false
            },
            {
              "field": "properties.rating",
              "label": "Note",
              "width": "15%",
              "sortable": true,
              "formatter": "rating"
            }
          ],
          "defaultSort": {
            "field": "properties.rating",
            "direction": "desc"
          },
          "searchFields": ["properties.name", "properties.category"]
        }
      }
    ]
  }
}
```

---

## 4. Ã‰vÃ©nements

Le module Table Ã©met les Ã©vÃ©nements suivants :

| Ã‰vÃ©nement | DÃ©tail | Description |
|-----------|--------|-------------|
| `geoleaf:table:opened` | - | Tableau affichÃ© |
| `geoleaf:table:closed` | - | Tableau masquÃ© |
| `geoleaf:table:layerChanged` | `{layerId}` | Couche affichÃ©e modifiÃ©e |
| `geoleaf:table:sortChanged` | `{field, direction}` | Tri modifiÃ© |
| `geoleaf:table:selectionChanged` | `{layerId, selectedIds}` | SÃ©lection modifiÃ©e |
| `geoleaf:table:zoomToSelection` | `{layerId, selectedIds}` | Zoom sur sÃ©lection dÃ©clenchÃ© |
| `geoleaf:table:highlightSelection` | `{layerId, selectedIds, active}` | Surbrillance activÃ©e/dÃ©sactivÃ©e |
| `geoleaf:table:exportSelection` | `{layerId, selectedIds, rows}` | Export demandÃ© |

### Exemple d'Ã©coute

```js
const map = GeoLeaf.Core.getMap();

// Ã‰couter les changements de sÃ©lection
map.on('geoleaf:table:selectionChanged', (e) => {
  console.log(`${e.selectedIds.length} entitÃ©s sÃ©lectionnÃ©es`);
  
  // Synchroniser avec la carte (exemple)
  highlightFeaturesOnMap(e.selectedIds);
});

// Ã‰couter les changements de couche
map.on('geoleaf:table:layerChanged', (e) => {
  console.log(`Couche affichÃ©e: ${e.layerId}`);
  updateUIControls(e.layerId);
});
```

---

## 5. IntÃ©gration avec d'autres modules

### 5.1 IntÃ©gration avec GeoJSON

Le module Table affiche les donnÃ©es des couches GeoJSON :

```js
// 1. Charger une couche GeoJSON
await GeoLeaf.GeoJSON.load({
  id: 'restaurants',
  url: 'data/restaurants.geojson',
  config: {
    table: {
      enabled: true,
      columns: [...]
    }
  }
});

// 2. Afficher dans le tableau
GeoLeaf.Table.setLayer('restaurants');
GeoLeaf.Table.show();
```

### 5.2 IntÃ©gration avec Filters

Le tableau se synchronise automatiquement avec les filtres :

```js
// Appliquer un filtre
GeoLeaf.Filters.filterPOI({
  category: 'restaurant',
  rating: { min: 4 }
});

// Le tableau se met Ã  jour automatiquement
// (Ã©coute l'Ã©vÃ©nement geoleaf:filters:changed)
```

### 5.3 Synchronisation bidirectionnelle carte â†” table

```js
// SÃ©lection dans le tableau â†’ surbrillance sur carte
map.on('geoleaf:table:selectionChanged', (e) => {
  const { selectedIds } = e;
  
  // Appliquer style de surbrillance
  const layer = GeoLeaf.GeoJSON.getLayerById('restaurants');
  layer.eachLayer((feature) => {
    if (selectedIds.includes(feature.feature.id)) {
      feature.setStyle({ fillColor: 'yellow', fillOpacity: 0.8 });
    } else {
      feature.setStyle({ fillColor: 'blue', fillOpacity: 0.5 });
    }
  });
});

// Clic sur carte â†’ sÃ©lection dans table
map.on('click', (e) => {
  const clickedFeature = e.layer;
  if (clickedFeature && clickedFeature.feature) {
    const featureId = clickedFeature.feature.id;
    GeoLeaf.Table.setSelection([featureId], true); // Ajouter Ã  la sÃ©lection
  }
});
```

---

## 6. Cas d'usage pratiques

### 6.1 Tableau avec recherche et tri

```js
// Initialiser
GeoLeaf.Table.init({ map: map });
GeoLeaf.Table.setLayer('restaurants');
GeoLeaf.Table.show();

// Ajouter recherche personnalisÃ©e
document.getElementById('search-input').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  
  // Filtrer les donnÃ©es
  const filteredData = allFeatures.filter(f => {
    const name = f.properties.name.toLowerCase();
    const category = f.properties.category.toLowerCase();
    return name.includes(searchTerm) || category.includes(searchTerm);
  });
  
  // Mettre Ã  jour l'affichage (nÃ©cessite accÃ¨s au renderer)
  GeoLeaf.Table.refresh();
});
```

### 6.2 Export multi-formats

```js
// Ã‰couter l'Ã©vÃ©nement d'export
map.on('geoleaf:table:exportSelection', (e) => {
  const { rows, layerId } = e;
  
  // Proposer format
  const format = prompt('Format d\'export (csv/json/geojson):', 'csv');
  
  switch (format) {
    case 'csv':
      exportCSV(rows, `${layerId}.csv`);
      break;
    case 'json':
      exportJSON(rows, `${layerId}.json`);
      break;
    case 'geojson':
      exportGeoJSON(rows, `${layerId}.geojson`);
      break;
  }
});

function exportCSV(rows, filename) {
  const headers = Object.keys(rows[0].properties);
  const csvContent = [
    headers.join(','),
    ...rows.map(row => headers.map(h => row.properties[h] || '').join(','))
  ].join('\n');
  
  downloadFile(csvContent, filename, 'text/csv');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 6.3 Pagination personnalisÃ©e

```js
// Configuration avec pagination
GeoLeaf.Table.init({
  map: map,
  config: {
    pageSize: 25,
    virtualScrolling: false
  }
});

// Ajouter contrÃ´les de pagination
let currentPage = 1;
const pageSize = 25;

document.getElementById('prev-page').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
  }
});

document.getElementById('next-page').addEventListener('click', () => {
  currentPage++;
  renderPage(currentPage);
});

function renderPage(page) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  // Logique de rendu de la page
}
```

---

## 7. Architecture interne

### 7.1 Modules composants

```
GeoLeaf.Table (API publique)
    â”œâ”€â”€ GeoLeaf._TablePanel (crÃ©ation conteneur DOM)
    â”‚   â””â”€â”€ MÃ©thodes:
    â”‚       â””â”€â”€ create(map, config)
    â”‚
    â”œâ”€â”€ GeoLeaf._TableRenderer (rendu tableau)
    â”‚   â””â”€â”€ MÃ©thodes:
    â”‚       â”œâ”€â”€ render(container, data)
    â”‚       â””â”€â”€ updateSelection(container, selectedIds)
    â”‚
    â””â”€â”€ Ã‰tat interne:
        â”œâ”€â”€ _map              (instance Leaflet)
        â”œâ”€â”€ _config           (configuration)
        â”œâ”€â”€ _currentLayerId   (couche affichÃ©e)
        â”œâ”€â”€ _selectedIds      (Set des IDs sÃ©lectionnÃ©s)
        â”œâ”€â”€ _cachedData       (donnÃ©es filtrÃ©es)
        â”œâ”€â”€ _sortState        (Ã©tat du tri)
        â””â”€â”€ _container        (Ã©lÃ©ment DOM)
```

### 7.2 Flux de donnÃ©es

```
1. Initialisation
   GeoLeaf.Table.init({map, config})
   â””â”€â”€ RÃ©cupÃ¨re config depuis GeoLeaf.Config.get('ui.table')
   â””â”€â”€ CrÃ©e conteneur DOM via _TablePanel.create()
   â””â”€â”€ Attache listeners Ã©vÃ©nements carte

2. Changement de couche
   GeoLeaf.Table.setLayer('restaurants')
   â””â”€â”€ VÃ©rifie que couche a table.enabled = true
   â””â”€â”€ RÃ©initialise sÃ©lection et tri
   â””â”€â”€ Appelle refresh()

3. RafraÃ®chissement
   GeoLeaf.Table.refresh()
   â””â”€â”€ RÃ©cupÃ¨re features via GeoLeaf.GeoJSON.getLayerData()
   â””â”€â”€ Applique tri si dÃ©fini
   â””â”€â”€ Appelle _TableRenderer.render()

4. Tri
   GeoLeaf.Table.sortByField('properties.name')
   â””â”€â”€ Met Ã  jour _sortState (cycle asc â†’ desc â†’ null)
   â””â”€â”€ Applique tri sur _cachedData
   â””â”€â”€ Appelle refresh()
   â””â”€â”€ Ã‰met: geoleaf:table:sortChanged

5. SÃ©lection
   GeoLeaf.Table.setSelection(['id1', 'id2'])
   â””â”€â”€ Met Ã  jour _selectedIds (Set)
   â””â”€â”€ Appelle _TableRenderer.updateSelection()
   â””â”€â”€ Ã‰met: geoleaf:table:selectionChanged
```

---

## 8. Bonnes pratiques

### âœ… Ã€ faire

- **Limiter le nombre de lignes** : utiliser `maxRowsPerLayer` (dÃ©faut: 1000)
- **Activer le scroll virtuel** pour grandes tables : `virtualScrolling: true`
- **DÃ©finir colonnes pertinentes** : sÃ©lectionner uniquement champs utiles
- **Utiliser tri par dÃ©faut** : `defaultSort` pour meilleur UX
- **Synchroniser avec carte** : Ã©couter Ã©vÃ©nements de sÃ©lection

### âŒ Ã€ Ã©viter

- âŒ Afficher toutes les propriÃ©tÃ©s sans filtrer les colonnes
- âŒ Charger + de 5000 lignes sans pagination
- âŒ Oublier `table.enabled: true` dans config de couche
- âŒ Appeler `refresh()` trop frÃ©quemment (utiliser debounce)

---

## 9. Performance

### Optimisations intÃ©grÃ©es

- **Limitation automatique** : `maxRowsPerLayer` empÃªche surcharge
- **Scroll virtuel** : affiche uniquement lignes visibles
- **Cache des donnÃ©es** : `_cachedData` Ã©vite requÃªtes rÃ©pÃ©tÃ©es
- **Tri optimisÃ©** : utilise `localeCompare` pour strings

### Recommandations

```js
// Pour trÃ¨s grandes tables (10k+ lignes)
GeoLeaf.Table.init({
  map: map,
  config: {
    maxRowsPerLayer: 5000,
    virtualScrolling: true,
    pageSize: 100
  }
});

// Debounce recherche
const searchInput = document.getElementById('search');
let searchTimeout;

searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applySearch(e.target.value);
  }, 300);
});
```

---

## 10. DÃ©pannage

### ProblÃ¨me : "Conteneur non initialisÃ©"

**Cause** : `GeoLeaf._TablePanel` non chargÃ©

**Solution** : VÃ©rifier que `table/panel.js` est chargÃ© dans `index.html`

### ProblÃ¨me : Colonnes vides

**Cause** : `field` ne correspond pas Ã  la structure GeoJSON

**Solution** : VÃ©rifier les chemins de propriÃ©tÃ©s
```js
// Structure GeoJSON
{
  "properties": {
    "name": "Restaurant X",
    "info": {
      "category": "Italian"
    }
  }
}

// Configuration colonnes
{
  "columns": [
    {"field": "properties.name", "label": "Nom"},           // âœ“
    {"field": "properties.info.category", "label": "Cat"},  // âœ“
    {"field": "category", "label": "Cat"}                   // âœ— Incorrect
  ]
}
```

### ProblÃ¨me : Tri ne fonctionne pas

**Cause** : Colonne non marquÃ©e comme `sortable`

**Solution** :
```json
{
  "columns": [
    {"field": "properties.name", "label": "Nom", "sortable": true}
  ]
}
```

---

## 11. Voir aussi

- **GeoJSON** : [docs/geojson/GeoLeaf_GeoJSON_README.md](../geojson/GeoLeaf_GeoJSON_README.md)
- **Filters** : [docs/filters/GeoLeaf_Filters_README.md](../filters/GeoLeaf_Filters_README.md)
- **UI** : [docs/ui/GeoLeaf_UI_README.md](../ui/GeoLeaf_UI_README.md)
- **Guide dÃ©veloppeur** : [docs/DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md)
