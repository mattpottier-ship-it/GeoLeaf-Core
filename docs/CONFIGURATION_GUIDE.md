# GeoLeaf Configuration Guide

**Version:** 3.2.0  
**Last Updated:** January 2026  
**Level:** Intermediate to Advanced

This comprehensive guide documents all JSON configuration files used by GeoLeaf JS to customize behavior, appearance, and data sources for different business profiles (Tourism, Custom…).

---

## Table of Contents

1. [Overview](#1-overview)
2. [geoleaf.config.json - Main Configuration](#2-geoleafconfigjson---main-configuration)
3. [profile.json - Profile Configuration](#3-profilejson---profile-configuration)
4. [taxonomy.json - Categories and Icons](#4-taxonomyjson---categories-and-icons)
5. [themes.json - Layer Visibility Presets](#5-themesjson---layer-visibility-presets)
6. [layers.json - Layer Definitions](#6-layersjson---layer-definitions)
7. [mapping.json - Data Normalization](#7-mappingjson---data-normalization)
8. [Style Files - Layer Styling](#8-style-files---layer-styling)
9. [POI Configuration](#9-poi-configuration)
10. [Route Configuration](#10-route-configuration)

---

## 1. Overview

### Configuration File Hierarchy

```
geoleaf.config.json              (Root - optional, defines active profile)
  └── profiles/
      └── {profile-name}/
          ├── profile.json       (REQUIRED - main profile config)
          ├── taxonomy.json      (REQUIRED - categories/icons)
          ├── themes.json        (REQUIRED - layer visibility presets)
          ├── mapping.json       (Optional - data normalization)
          ├── layers/            (Optional - GeoJSON layers)
          │   └── {layer-name}/
          │       ├── data.geojson
          │       ├── config.json
          │       └── styles/
          │           ├── default.json
          │           └── alternative.json
          └── data/              (Optional - POI/route data)
              ├── poi.json
              └── routes.json
```

### Load Order

1. **geoleaf.config.json** is loaded first (or defaults are used)
2. **profile.json** is loaded based on `activeProfile`
3. **taxonomy.json**, **themes.json**, **mapping.json** are loaded in parallel
4. **Layer configs** and **styles** are loaded on-demand when layers are activated
5. **POI/route data** loaded as configured in profile.json

### Configuration Principles

- **JSON Schema validation** - All files validated against schemas (see [schema/](../schema/))
- **Graceful fallbacks** - Missing optional files use sensible defaults
- **Profile isolation** - Each profile is self-contained
- **Hot-reloading** - Most configs can be updated without page reload
- **Type safety** - TypeScript definitions available in [index.d.ts](../index.d.ts)

---

## 2. geoleaf.config.json - Main Configuration

**Location:** Project root or custom path  
**Required:** No (uses defaults if missing)  
**Purpose:** Define which profile to load and debug settings

### Complete Structure

```json
{
  "debug": {
    "enabled": false,
    "modules": ["config", "poi", "geojson", "storage", "labels", "themes", "filters"],
    "logLevel": "info"
  },
  "data": {
    "activeProfile": "tourism",
    "profilesBasePath": "/profiles/"
  },
  "performance": {
    "enableClustering": true,
    "clusterThreshold": 100,
    "maxConcurrentLoads": 5
  }
}
```

### Field Reference

#### `debug` (object, optional)

Debug and logging configuration.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable debug mode with verbose console logging |
| `modules` | array<string> | `[]` | Modules to debug. Use `["*"]` for all. Available: `config`, `poi`, `geojson`, `storage`, `labels`, `themes`, `filters`, `ui`, `cache`, `security` |
| `logLevel` | string | `"info"` | Minimum log level: `"debug"`, `"info"`, `"warn"`, `"error"` |

**Example:**

```json
{
  "debug": {
    "enabled": true,
    "modules": ["poi", "geojson", "labels"],
    "logLevel": "debug"
  }
}
```

Console output:
```
[GeoLeaf:POI] Added POI: eiffel-tower
[GeoLeaf:Labels] Enabled labels for layer: cities
[GeoLeaf:GeoJSON] Loaded 150 features from cities.geojson
```

#### `data` (object, required)

Data loading configuration.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `activeProfile` | string | `"default"` | Profile name to load. Must match a directory in `profilesBasePath` |
| `profilesBasePath` | string | `"/profiles/"` | Base path to profiles directory (relative to HTML page or absolute URL) |

**Example:**

```json
{
  "data": {
    "activeProfile": "tourism",
    "profilesBasePath": "https://cdn.example.com/geoleaf-profiles/"
  }
}
```

#### `performance` (object, optional)

Performance optimization settings.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enableClustering` | boolean | `true` | Enable marker clustering for large POI datasets |
| `clusterThreshold` | number | `100` | Minimum POIs to trigger clustering |
| `maxConcurrentLoads` | number | `5` | Max parallel file downloads |

---

## 3. profile.json - Profile Configuration

**Location:** `profiles/{profile-name}/profile.json`  
**Required:** Yes (each profile must have this file)  
**Purpose:** Define UI, basemaps, file paths, and default settings

### Complete Structure

```json
{
  "name": "Tourism",
  "version": "1.0.0",
  "description": "Profile for tourism and travel applications",
  "author": "GeoNatWork",
  
  "ui": {
    "layerManager": {
      "enabled": true,
      "position": "topright",
      "collapsed": false,
      "title": "Layers"
    },
    "filterPanel": {
      "enabled": true,
      "position": "topleft",
      "collapsed": true,
      "title": "Filters"
    },
    "searchBar": {
      "enabled": true,
      "position": "topleft",
      "placeholder": "Search attractions...",
      "minChars": 2,
      "maxResults": 10
    },
    "cacheControls": {
      "enabled": true,
      "position": "bottomleft"
    },
    "themeSelector": {
      "enabled": true,
      "position": "topright"
    }
  },
  
  "basemaps": [
    {
      "id": "osm",
      "name": "Street Map",
      "url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "attribution": "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
      "maxZoom": 19,
      "minZoom": 1,
      "default": true
    },
    {
      "id": "satellite",
      "name": "Satellite",
      "url": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      "attribution": "Esri",
      "maxZoom": 18,
      "minZoom": 1,
      "default": false
    }
  ],
  
  "Files": {
    "taxonomy": "taxonomy.json",
    "themes": "themes.json",
    "layers": "layers/",
    "mapping": "mapping.json",
    "poi": "data/poi.json",
    "routes": "data/routes.json"
  },
  
  "Directory": {
    "styles": "layers/{layerId}/styles/",
    "data": "layers/{layerId}/data.geojson"
  },
  
  "poiAddConfig": {
    "enabled": true,
    "categories": ["restaurant", "hotel", "museum", "monument", "viewpoint"],
    "defaultCategory": "restaurant",
    "requiredFields": ["title", "latlng"],
    "optionalFields": ["description", "address", "phone", "website", "openingHours"],
    "allowCustomCategories": false,
    "validation": {
      "title": { "minLength": 3, "maxLength": 100 },
      "description": { "maxLength": 500 }
    }
  },
  
  "search": {
    "enabled": true,
    "sources": ["poi", "layers"],
    "fields": ["title", "description", "category", "address"],
    "fuzzyMatch": true,
    "fuzzyThreshold": 0.6
  },
  
  "icons": {
    "basePath": "assets/icons/",
    "defaultIcon": "marker-default.png",
    "format": "png"
  },
  
  "defaultSettings": {
    "map": {
      "center": [48.8566, 2.3522],
      "zoom": 12,
      "minZoom": 5,
      "maxZoom": 18
    },
    "theme": "light",
    "basemap": "osm",
    "language": "fr"
  }
}
```

### Field Reference

#### `ui` (object, optional)

UI component configuration. Each component has the same structure:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Whether component is visible |
| `position` | string | varies | Leaflet control position: `"topleft"`, `"topright"`, `"bottomleft"`, `"bottomright"` |
| `collapsed` | boolean | `false` | Initial collapsed state (if applicable) |
| `title` | string | varies | Component title/label |

**Available components:**
- `layerManager` - Layer visibility controls
- `filterPanel` - POI filtering UI
- `searchBar` - Search input with autocomplete
- `cacheControls` - Offline cache management buttons
- `themeSelector` - Theme dropdown selector

#### `basemaps` (array, required)

Background map definitions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique basemap identifier |
| `name` | string | ✅ | Display name in UI |
| `url` | string | ✅ | Tile URL template with `{z}`, `{x}`, `{y}` placeholders |
| `attribution` | string | ✅ | Copyright/attribution HTML |
| `maxZoom` | number | ❌ | Maximum zoom level (1-20) |
| `minZoom` | number | ❌ | Minimum zoom level (1-20) |
| `default` | boolean | ❌ | Whether this is the default basemap |
| `tileSize` | number | ❌ | Tile size in pixels (default: 256) |
| `subdomains` | array<string> | ❌ | Subdomains for load balancing (default: `["a","b","c"]`) |

**Common tile providers:**

```json
{
  "basemaps": [
    {
      "id": "osm",
      "name": "OpenStreetMap",
      "url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "attribution": "&copy; OpenStreetMap",
      "default": true
    },
    {
      "id": "topo",
      "name": "OpenTopoMap",
      "url": "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      "attribution": "&copy; OpenTopoMap",
      "maxZoom": 17
    },
    {
      "id": "cartodb-light",
      "name": "CartoDB Light",
      "url": "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "attribution": "&copy; CartoDB"
    }
  ]
}
```

#### `Files` (object, required)

Paths to configuration and data files (relative to profile directory).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taxonomy` | string | ✅ | Path to taxonomy.json |
| `themes` | string | ✅ | Path to themes.json |
| `layers` | string | ❌ | Directory containing layer folders |
| `mapping` | string | ❌ | Path to mapping.json |
| `poi` | string | ❌ | Path to POI data file |
| `routes` | string | ❌ | Path to routes data file |

#### `Directory` (object, optional)

Path templates for layer-specific files. Use `{layerId}` placeholder.

| Field | Type | Description |
|-------|------|-------------|
| `styles` | string | Path template to styles directory |
| `data` | string | Path template to GeoJSON data file |

**Example:**

```json
{
  "Directory": {
    "styles": "layers/{layerId}/styles/",
    "data": "layers/{layerId}/data.geojson"
  }
}
```

Resolved for layer `"cities"`:
- Styles: `profiles/tourism/layers/cities/styles/`
- Data: `profiles/tourism/layers/cities/data.geojson`

#### `poiAddConfig` (object, optional)

Configuration for POI creation form.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Allow users to add POIs |
| `categories` | array<string> | `[]` | Available categories in form |
| `defaultCategory` | string | first in array | Pre-selected category |
| `requiredFields` | array<string> | `["title","latlng"]` | Required form fields |
| `optionalFields` | array<string> | `[]` | Optional form fields |
| `allowCustomCategories` | boolean | `false` | Allow users to create new categories |
| `validation` | object | `{}` | Field validation rules |

**Validation rules:**

```json
{
  "validation": {
    "title": {
      "minLength": 3,
      "maxLength": 100,
      "pattern": "^[a-zA-Z0-9\\s-]+$"
    },
    "phone": {
      "pattern": "^\\+?[0-9\\s-]+$"
    },
    "website": {
      "pattern": "^https?://.*$"
    }
  }
}
```

#### `search` (object, optional)

Search configuration.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable search functionality |
| `sources` | array<string> | `["poi"]` | Data sources to search: `"poi"`, `"layers"` |
| `fields` | array<string> | `["title"]` | Fields to search in |
| `fuzzyMatch` | boolean | `false` | Enable fuzzy string matching |
| `fuzzyThreshold` | number | `0.6` | Fuzzy match threshold (0-1, lower = more strict) |

#### `defaultSettings` (object, optional)

Initial map state.

```json
{
  "defaultSettings": {
    "map": {
      "center": [48.8566, 2.3522],
      "zoom": 12,
      "minZoom": 5,
      "maxZoom": 18
    },
    "theme": "light",
    "basemap": "osm",
    "language": "fr"
  }
}
```

---

## 4. taxonomy.json - Categories and Icons

**Location:** `profiles/{profile-name}/taxonomy.json`  
**Required:** Yes  
**Purpose:** Define hierarchical categories, subcategories, and icon mappings

### Complete Structure

```json
{
  "icons": {
    "sprite": "assets/icons/tourism-sprite.png",
    "iconSize": [32, 32],
    "iconAnchor": [16, 32],
    "popupAnchor": [0, -32],
    "shadowUrl": "assets/icons/marker-shadow.png",
    "shadowSize": [41, 41],
    "shadowAnchor": [13, 41]
  },
  
  "categories": [
    {
      "id": "accommodation",
      "name": "Accommodation",
      "name_fr": "Hébergement",
      "icon": "bed",
      "color": "#e74c3c",
      "subcategories": [
        {
          "id": "hotel",
          "name": "Hotel",
          "name_fr": "Hôtel",
          "icon": "hotel",
          "description": "Hotels with rooms and services"
        },
        {
          "id": "hostel",
          "name": "Hostel",
          "name_fr": "Auberge",
          "icon": "hostel"
        },
        {
          "id": "camping",
          "name": "Camping",
          "name_fr": "Camping",
          "icon": "camping"
        }
      ]
    },
    {
      "id": "food",
      "name": "Food & Drink",
      "name_fr": "Restauration",
      "icon": "restaurant",
      "color": "#f39c12",
      "subcategories": [
        {
          "id": "restaurant",
          "name": "Restaurant",
          "name_fr": "Restaurant",
          "icon": "restaurant"
        },
        {
          "id": "cafe",
          "name": "Café",
          "name_fr": "Café",
          "icon": "cafe"
        },
        {
          "id": "bar",
          "name": "Bar",
          "name_fr": "Bar",
          "icon": "bar"
        }
      ]
    },
    {
      "id": "culture",
      "name": "Culture",
      "name_fr": "Culture",
      "icon": "museum",
      "color": "#9b59b6",
      "subcategories": [
        {
          "id": "museum",
          "name": "Museum",
          "name_fr": "Musée",
          "icon": "museum"
        },
        {
          "id": "monument",
          "name": "Monument",
          "name_fr": "Monument",
          "icon": "monument"
        },
        {
          "id": "theater",
          "name": "Theater",
          "name_fr": "Théâtre",
          "icon": "theater"
        }
      ]
    }
  ]
}
```

### Field Reference

#### `icons` (object, required)

Global icon configuration for POI markers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sprite` | string | ✅ | Path to icon sprite sheet (relative to profile) |
| `iconSize` | [number, number] | ✅ | Icon dimensions [width, height] in pixels |
| `iconAnchor` | [number, number] | ✅ | Anchor point relative to icon top-left [x, y] |
| `popupAnchor` | [number, number] | ❌ | Popup anchor relative to iconAnchor [x, y] |
| `shadowUrl` | string | ❌ | Path to marker shadow image |
| `shadowSize` | [number, number] | ❌ | Shadow dimensions |
| `shadowAnchor` | [number, number] | ❌ | Shadow anchor point |

**Icon sprite format:**

GeoLeaf supports CSS sprite sheets where icons are arranged in a grid. Each icon occupies a cell defined by `iconSize`.

```
[hotel][restaurant][museum][monument]
[cafe] [bar]      [theater][camping]
...
```

Icon position calculated as: `background-position: -{col * width}px -{row * height}px`

#### `categories` (array, required)

Top-level category definitions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique category identifier (lowercase, no spaces) |
| `name` | string | ✅ | Display name (English) |
| `name_fr` | string | ❌ | Display name (French) - supports other languages with `name_{lang}` |
| `icon` | string | ✅ | Icon identifier (matched in sprite) |
| `color` | string | ❌ | Category color (hex format) used in UI |
| `description` | string | ❌ | Category description |
| `subcategories` | array | ❌ | Array of subcategory objects |

#### `subcategories` (array, optional)

Fine-grained subcategories within a parent category.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique subcategory identifier |
| `name` | string | ✅ | Display name |
| `name_fr` | string | ❌ | Localized name |
| `icon` | string | ✅ | Icon identifier (can differ from parent) |
| `description` | string | ❌ | Subcategory description |

### Example: Custom Profile with Inline Taxonomy

Some profiles inline taxonomy in profile.json instead of separate file:

```json
{
  "name": "Custom",
  "taxonomy": {
    "icons": {
      "sprite": "assets/icons/custom-sprite.png",
      "iconSize": [24, 24],
      "iconAnchor": [12, 12]
    },
    "categories": [
      {
        "id": "building",
        "name": "Building",
        "icon": "building",
        "subcategories": [
          { "id": "office", "name": "Office", "icon": "office" },
          { "id": "warehouse", "name": "Warehouse", "icon": "warehouse" }
        ]
      },
      {
        "id": "equipment",
        "name": "Equipment",
        "icon": "equipment",
        "subcategories": [
          { "id": "hvac", "name": "HVAC", "icon": "hvac" },
          { "id": "electrical", "name": "Electrical", "icon": "electrical" }
        ]
      }
    ]
  }
}
```

---

## 5. themes.json - Layer Visibility Presets

**Location:** `profiles/{profile-name}/themes.json`  
**Required:** Yes  
**Purpose:** Define named presets that control which layers are visible

### Complete Structure

```json
{
  "config": {
    "defaultTheme": "default",
    "allowCustomThemes": true,
    "persistSelection": true
  },
  
  "themes": [
    {
      "id": "default",
      "name": "Default View",
      "name_fr": "Vue par défaut",
      "description": "Standard view with main layers",
      "type": "primary",
      "icon": "view-default",
      "layers": {
        "climate": true,
        "cities": true,
        "poi": true,
        "conservation-zones": false,
        "itineraries": false,
        "monuments": false
      }
    },
    {
      "id": "heritage",
      "name": "Heritage Sites",
      "name_fr": "Sites patrimoniaux",
      "description": "Focus on cultural heritage and monuments",
      "type": "secondary",
      "icon": "monument",
      "layers": {
        "climate": false,
        "cities": true,
        "poi": false,
        "conservation-zones": true,
        "itineraries": false,
        "monuments": true,
        "museums": true
      }
    },
    {
      "id": "tourism",
      "name": "Tourism",
      "name_fr": "Tourisme",
      "description": "All tourist attractions and itineraries",
      "type": "primary",
      "icon": "suitcase",
      "layers": {
        "climate": false,
        "cities": true,
        "poi": true,
        "conservation-zones": false,
        "itineraries": true,
        "monuments": true,
        "museums": true,
        "restaurants": true,
        "hotels": true
      }
    }
  ]
}
```

### Field Reference

#### `config` (object, optional)

Theme system configuration.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultTheme` | string | first theme ID | Theme loaded on initialization |
| `allowCustomThemes` | boolean | `false` | Allow users to create custom themes |
| `persistSelection` | boolean | `true` | Remember selected theme in localStorage |

#### `themes` (array, required)

Theme definitions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique theme identifier |
| `name` | string | ✅ | Display name (English) |
| `name_fr` | string | ❌ | Localized name |
| `description` | string | ❌ | Theme description |
| `type` | string | ✅ | `"primary"` (shown in selector) or `"secondary"` (programmatic only) |
| `icon` | string | ❌ | Icon identifier for theme button |
| `layers` | object | ✅ | Map of layerId → boolean (visible/hidden) |

**Theme types:**

- **primary** - Displayed in theme selector dropdown, user-accessible
- **secondary** - Hidden from UI, used programmatically or as presets

### Layer References

The `layers` object keys **must match** layer IDs defined in:
- Layer directories: `layers/{layerId}/`
- Layer config files: `layers/{layerId}/config.json`
- GeoJSON layer IDs added via `GeoLeaf.GeoJSON.add({ id: 'layer-id', ... })`

**Example matching:**

```
profiles/tourism/
  layers/
    climate/          ← ID: "climate"
    cities/           ← ID: "cities"
    monuments/        ← ID: "monuments"
  themes.json         ← References "climate", "cities", "monuments"
```

### Dynamic Theme Creation

```javascript
// Create custom theme programmatically
await GeoLeaf.Theme.create({
  id: 'my-custom',
  name: 'My Custom Theme',
  type: 'secondary',
  layers: {
    'poi': true,
    'cities': true,
    'climate': false
  }
});

// Activate it
await GeoLeaf.Theme.setActive('my-custom');
```

---

## 6. layers.json - Layer Definitions

**Location:** `profiles/{profile-name}/layers.json` OR `profiles/{profile-name}/layers/{layerId}/config.json`  
**Required:** No (layers can be defined inline or in separate files)  
**Purpose:** Define GeoJSON layer properties, data sources, and default styles

### Complete Structure (Single Layer Config)

```json
{
  "id": "climate",
  "name": "Climate Zones",
  "name_fr": "Zones climatiques",
  "description": "Köppen climate classification zones",
  "type": "polygon",
  "dataSource": "data.geojson",
  "defaultStyle": "default",
  "availableStyles": ["default", "detailed", "simplified"],
  "minZoom": 5,
  "maxZoom": 18,
  "attribution": "Climate data © MeteoFrance",
  "updateFrequency": "monthly",
  "metadata": {
    "lastUpdated": "2026-01-15",
    "featureCount": 150,
    "source": "https://www.meteofrance.fr/",
    "license": "CC-BY-4.0"
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique layer identifier (must match directory name) |
| `name` | string | ✅ | Display name (English) |
| `name_fr` | string | ❌ | Localized name |
| `description` | string | ❌ | Layer description |
| `type` | string | ✅ | Geometry type: `"point"`, `"line"`, `"polygon"`, `"multipolygon"` |
| `dataSource` | string | ✅ | Path to GeoJSON file (relative to layer directory) |
| `defaultStyle` | string | ✅ | Default style ID (must exist in `styles/` directory) |
| `availableStyles` | array<string> | ❌ | Array of available style IDs |
| `minZoom` | number | ❌ | Minimum zoom level for layer visibility |
| `maxZoom` | number | ❌ | Maximum zoom level for layer visibility |
| `attribution` | string | ❌ | Data attribution/copyright |
| `updateFrequency` | string | ❌ | Update frequency: `"realtime"`, `"daily"`, `"weekly"`, `"monthly"`, `"static"` |
| `metadata` | object | ❌ | Additional metadata |

### Multi-Layer Configuration File

To define all layers in one file (`layers.json`):

```json
{
  "layers": [
    {
      "id": "climate",
      "name": "Climate Zones",
      "type": "polygon",
      "dataSource": "layers/climate/data.geojson",
      "defaultStyle": "default"
    },
    {
      "id": "cities",
      "name": "Cities",
      "type": "point",
      "dataSource": "layers/cities/data.geojson",
      "defaultStyle": "default"
    }
  ]
}
```

---

## 7. mapping.json - Data Normalization

**Location:** `profiles/{profile-name}/mapping.json`  
**Required:** No  
**Purpose:** Map external data field names to GeoLeaf's internal structure

### Complete Structure

```json
{
  "version": "1.0",
  "description": "Field mappings for POI data normalization",
  
  "poi": {
    "source": "external_api",
    "mapping": {
      "id": "external_id",
      "title": "name",
      "latlng": {
        "lat": "latitude",
        "lng": "longitude"
      },
      "category": "poi_type",
      "subcategory": "poi_subtype",
      "description": "long_description",
      "properties": {
        "address": "full_address",
        "phone": "phone_number",
        "website": "web_url",
        "openingHours": "hours_of_operation",
        "rating": "user_rating"
      }
    }
  },
  
  "geojson": {
    "properties": {
      "name": "nom",
      "description": "desc",
      "category": "type"
    }
  },
  
  "transforms": {
    "category": {
      "type": "map",
      "mappings": {
        "resto": "restaurant",
        "hotel_2star": "hotel",
        "musee": "museum"
      }
    },
    "rating": {
      "type": "scale",
      "from": [0, 10],
      "to": [0, 5]
    }
  }
}
```

### Field Reference

#### `poi.mapping` (object)

Map external POI data fields to GeoLeaf structure.

**Target Structure:**

```javascript
{
  id: string,
  title: string,
  latlng: { lat: number, lng: number },
  category: string,
  subcategory: string,
  description: string,
  properties: {
    address: string,
    phone: string,
    website: string,
    openingHours: string,
    [key: string]: any
  }
}
```

**Example transformation:**

External data:
```json
{
  "external_id": "123",
  "name": "Eiffel Tower",
  "latitude": 48.8584,
  "longitude": 2.2945,
  "poi_type": "monument"
}
```

After mapping:
```json
{
  "id": "123",
  "title": "Eiffel Tower",
  "latlng": { "lat": 48.8584, "lng": 2.2945 },
  "category": "monument"
}
```

#### `transforms` (object)

Apply transformations to mapped values.

**Transform types:**

1. **map** - Map discrete values

```json
{
  "category": {
    "type": "map",
    "mappings": {
      "resto": "restaurant",
      "hotel": "hotel"
    },
    "default": "other"
  }
}
```

2. **scale** - Scale numeric values

```json
{
  "rating": {
    "type": "scale",
    "from": [0, 10],
    "to": [0, 5]
  }
}
```

3. **concat** - Combine multiple fields

```json
{
  "fullAddress": {
    "type": "concat",
    "fields": ["street", "city", "postalCode"],
    "separator": ", "
  }
}
```

4. **regex** - Extract via regular expression

```json
{
  "phone": {
    "type": "regex",
    "pattern": "\\+33\\s?[0-9\\s]+",
    "flags": "i"
  }
}
```

---

## 8. Style Files - Layer Styling

**Location:** `profiles/{profile-name}/layers/{layerId}/styles/{styleId}.json`  
**Required:** At least one style (usually `default.json`) per layer  
**Purpose:** Define visual appearance, labels, and legend for layer

### Complete Structure

```json
{
  "id": "default",
  "name": "Default Style",
  "name_fr": "Style par défaut",
  "description": "Standard visualization for climate zones",
  
  "label": {
    "enabled": true,
    "visibleByDefault": false,
    "field": "name",
    "format": "{name}",
    "minZoom": 10,
    "maxZoom": 18
  },
  
  "layerScale": {
    "minZoom": 5,
    "maxZoom": 18
  },
  
  "labelScale": {
    "minZoom": 10,
    "maxZoom": 18
  },
  
  "style": {
    "fillColor": "#3388ff",
    "fillOpacity": 0.2,
    "color": "#3388ff",
    "weight": 2,
    "opacity": 1,
    "dashArray": null
  },
  
  "styleRules": [
    {
      "condition": { "property": "climate_type", "equals": "Temperate" },
      "style": {
        "fillColor": "#66cc66",
        "color": "#44aa44"
      }
    },
    {
      "condition": { "property": "climate_type", "equals": "Mediterranean" },
      "style": {
        "fillColor": "#ff8833",
        "color": "#dd6611"
      }
    }
  ],
  
  "legend": {
    "enabled": true,
    "title": "Climate Types",
    "items": [
      {
        "label": "Temperate",
        "label_fr": "Tempéré",
        "color": "#66cc66",
        "icon": null
      },
      {
        "label": "Mediterranean",
        "label_fr": "Méditerranéen",
        "color": "#ff8833",
        "icon": null
      },
      {
        "label": "Continental",
        "label_fr": "Continental",
        "color": "#3388ff",
        "icon": null
      }
    ]
  }
}
```

### Field Reference

#### `label` (object, required)

Label configuration for this style.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | ✅ | Whether labels are supported for this style |
| `visibleByDefault` | boolean | ✅ | Initial label visibility when layer activated (⚠️ **BREAKING CHANGE** in v3.1 - see migration guide) |
| `field` | string | ❌ | GeoJSON property field to use for label text |
| `format` | string | ❌ | Label template with `{fieldName}` placeholders |
| `minZoom` | number | ❌ | Minimum zoom for label visibility (overrides `labelScale.minZoom`) |
| `maxZoom` | number | ❌ | Maximum zoom for label visibility |

**⚠️ CRITICAL:** As of v3.1.0, `visibleByDefault` **must** be in the style file, not in the layer config. See [LABELS_MIGRATION_GUIDE.md](LABELS_MIGRATION_GUIDE.md).

**Label format examples:**

```json
{
  "format": "{name}"                           // Simple field
}
{
  "format": "{name} ({population})"            // Multiple fields
}
{
  "format": "{name} - {climate_type}"          // With separator
}
```

#### `layerScale` (object, optional)

Zoom range for layer visibility (features are rendered).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `minZoom` | number | 1 | Minimum zoom level |
| `maxZoom` | number | 18 | Maximum zoom level |

#### `labelScale` (object, optional)

Zoom range for label visibility (typically narrower than `layerScale` to avoid clutter).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `minZoom` | number | 10 | Minimum zoom level for labels |
| `maxZoom` | number | 18 | Maximum zoom level for labels |

**Best practice:** Set `labelScale.minZoom` higher than `layerScale.minZoom`:

```json
{
  "layerScale": { "minZoom": 5, "maxZoom": 18 },   // Layer visible from zoom 5
  "labelScale": { "minZoom": 10, "maxZoom": 18 }    // Labels visible from zoom 10
}
```

#### `style` (object, required)

Leaflet path options for styling features.

**For polygons/multipolygons:**

| Field | Type | Description |
|-------|------|-------------|
| `fillColor` | string | Fill color (hex, rgb, or named color) |
| `fillOpacity` | number | Fill opacity (0-1) |
| `color` | string | Border color |
| `weight` | number | Border width in pixels |
| `opacity` | number | Border opacity (0-1) |
| `dashArray` | string | Dash pattern (e.g., `"5, 10"`) or `null` for solid |

**For lines:**

| Field | Type | Description |
|-------|------|-------------|
| `color` | string | Line color |
| `weight` | number | Line width in pixels |
| `opacity` | number | Line opacity (0-1) |
| `dashArray` | string | Dash pattern or `null` |
| `lineCap` | string | Line cap style: `"butt"`, `"round"`, `"square"` |
| `lineJoin` | string | Line join style: `"miter"`, `"round"`, `"bevel"` |

**For points (markers):**

Markers use taxonomy icon configuration, not style settings.

#### `styleRules` (array, optional)

Conditional styling based on feature properties.

**Rule structure:**

```json
{
  "condition": {
    "property": "field_name",
    "operator": "equals",  // equals, contains, gt, gte, lt, lte, in
    "value": "comparison_value"
  },
  "style": {
    // Override style properties
  }
}
```

**Operators:**

- `equals` - Exact match
- `contains` - String contains substring
- `gt` / `gte` - Greater than / greater than or equal
- `lt` / `lte` - Less than / less than or equal
- `in` - Value in array

**Examples:**

```json
{
  "styleRules": [
    {
      "condition": { "property": "population", "operator": "gt", "value": 1000000 },
      "style": { "fillColor": "#ff0000", "weight": 3 }
    },
    {
      "condition": { "property": "type", "operator": "in", "value": ["city", "town"] },
      "style": { "fillColor": "#ffff00" }
    }
  ]
}
```

#### `legend` (object, optional)

Legend configuration for this style.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | ✅ | Whether to display legend |
| `title` | string | ❌ | Legend title |
| `title_fr` | string | ❌ | Localized title |
| `items` | array | ✅ | Legend item definitions |

**Legend item:**

```json
{
  "label": "Item Label",
  "label_fr": "Libellé",
  "color": "#ff0000",
  "icon": null,           // Or icon identifier
  "description": "Optional description"
}
```

---

## 9. POI Configuration

**Location:** `profiles/{profile-name}/data/poi.json`  
**Required:** No (POIs can be added programmatically)  
**Purpose:** Initial POI data loaded on map initialization

### Structure

```json
{
  "version": "1.0",
  "lastUpdated": "2026-01-20",
  "count": 3,
  
  "pois": [
    {
      "id": "eiffel-tower",
      "latlng": [48.8584, 2.2945],
      "title": "Eiffel Tower",
      "description": "Iconic iron lattice tower",
      "category": "monument",
      "subcategory": "landmark",
      "properties": {
        "address": "Champ de Mars, 5 Avenue Anatole France, 75007 Paris",
        "phone": "+33 892 70 12 39",
        "website": "https://www.toureiffel.paris",
        "openingHours": "9:00-23:45",
        "ticketPrice": "26.80 EUR",
        "accessibility": "partial",
        "rating": 4.6
      }
    },
    {
      "id": "louvre",
      "latlng": [48.8606, 2.3376],
      "title": "Louvre Museum",
      "description": "World's largest art museum",
      "category": "museum",
      "subcategory": "art",
      "properties": {
        "address": "Rue de Rivoli, 75001 Paris",
        "phone": "+33 1 40 20 50 50",
        "website": "https://www.louvre.fr",
        "openingHours": "9:00-18:00",
        "closedDays": ["Tuesday"],
        "ticketPrice": "17 EUR",
        "accessibility": "full"
      }
    },
    {
      "id": "notre-dame",
      "latlng": [48.8530, 2.3499],
      "title": "Notre-Dame Cathedral",
      "description": "Medieval Catholic cathedral (under restoration)",
      "category": "monument",
      "subcategory": "religious",
      "properties": {
        "address": "6 Parvis Notre-Dame, 75004 Paris",
        "website": "https://www.notredamedeparis.fr",
        "status": "restoration",
        "reopening": "2024-12-08"
      }
    }
  ]
}
```

### Field Reference

**Root fields:**

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Data version |
| `lastUpdated` | string | ISO date of last update |
| `count` | number | Total POI count |
| `pois` | array | Array of POI objects |

**POI object (required fields):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique POI identifier |
| `latlng` | [number, number] | Coordinates `[latitude, longitude]` |
| `title` | string | POI name/title |
| `category` | string | Category ID (must match taxonomy) |

**POI object (optional fields):**

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | POI description |
| `subcategory` | string | Subcategory ID (must match taxonomy) |
| `properties` | object | Custom properties (address, phone, etc.) |

---

## 10. Route Configuration

**Location:** `profiles/{profile-name}/data/routes.json`  
**Required:** No  
**Purpose:** Define routes (paths, itineraries) with waypoints

### Structure

```json
{
  "version": "1.0",
  "routes": [
    {
      "id": "paris-tour",
      "name": "Paris Highlights Tour",
      "name_fr": "Tour des points forts de Paris",
      "description": "2-hour walking tour of major attractions",
      "type": "walking",
      "distance": 5200,
      "duration": 7200,
      "difficulty": "easy",
      
      "waypoints": [
        {
          "id": "eiffel-tower",
          "order": 1,
          "latlng": [48.8584, 2.2945],
          "title": "Eiffel Tower",
          "stopDuration": 1800
        },
        {
          "id": "trocadero",
          "order": 2,
          "latlng": [48.8620, 2.2876],
          "title": "Trocadéro",
          "stopDuration": 600
        },
        {
          "id": "arc-triomphe",
          "order": 3,
          "latlng": [48.8738, 2.2950],
          "title": "Arc de Triomphe",
          "stopDuration": 900
        }
      ],
      
      "path": [
        [48.8584, 2.2945],
        [48.8600, 2.2900],
        [48.8620, 2.2876],
        [48.8650, 2.2900],
        [48.8738, 2.2950]
      ],
      
      "style": {
        "color": "#e74c3c",
        "weight": 4,
        "opacity": 0.7,
        "dashArray": null
      },
      
      "properties": {
        "accessibility": "wheelchair-friendly",
        "highlights": ["Eiffel Tower", "Arc de Triomphe"],
        "bestTime": "morning"
      }
    }
  ]
}
```

### Field Reference

**Route object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique route identifier |
| `name` | string | ✅ | Route name |
| `type` | string | ✅ | Route type: `"walking"`, `"cycling"`, `"driving"`, `"transit"` |
| `distance` | number | ❌ | Total distance in meters |
| `duration` | number | ❌ | Estimated duration in seconds |
| `difficulty` | string | ❌ | Difficulty: `"easy"`, `"moderate"`, `"hard"` |
| `waypoints` | array | ✅ | Array of waypoint objects |
| `path` | array | ✅ | Array of `[lat, lng]` coordinates defining the route path |
| `style` | object | ❌ | Leaflet polyline style options |
| `properties` | object | ❌ | Custom properties |

**Waypoint object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Waypoint identifier (can reference POI ID) |
| `order` | number | ✅ | Stop order (1, 2, 3, ...) |
| `latlng` | [number, number] | ✅ | Coordinates |
| `title` | string | ✅ | Waypoint name |
| `stopDuration` | number | ❌ | Recommended stop duration in seconds |

---

## Configuration Best Practices

### 1. File Organization

```
profiles/
  tourism/
    profile.json              ← Main config (single source of truth)
    taxonomy.json             ← Categories
    themes.json               ← Themes
    mapping.json              ← Data mapping (optional)
    layers/
      climate/
        config.json           ← Layer config
        data.geojson          ← GeoJSON data
        styles/
          default.json        ← Default style
          detailed.json       ← Alternative style
      cities/
        ... (same structure)
    data/
      poi.json                ← Initial POIs
      routes.json             ← Routes
```

### 2. Validation

- **Always validate JSON** before deploying (use JSONLint, VS Code, or `npm run validate`)
- **Use JSON Schema** validation for strict type checking
- **Test with debug mode** enabled: `{ "debug": { "enabled": true } }`

### 3. Performance

- **Minimize file sizes** - Use minified GeoJSON, compress with gzip
- **Lazy load layers** - Don't load all layers on init, load on-demand
- **Use CDN** for static files when possible
- **Enable clustering** for 100+ POIs

### 4. Maintainability

- **Use descriptive IDs** - `"hotel-eiffel"` not `"h1"`
- **Add descriptions** - Future maintainers will thank you
- **Version your configs** - Include `version` field in all files
- **Document custom properties** - Add comments in separate README

### 5. Internationalization

- **Use `name_{lang}` pattern** for translations
- **Support fallback** - If `name_fr` missing, use `name`
- **Separate UI strings** from config when possible

---

## Migration Notes

### v3.0 → v3.1

**⚠️ BREAKING CHANGE:** Label `visibleByDefault` moved from layer config to style files.

**Before (v3.0):**

```json
// layers/cities/config.json
{
  "id": "cities",
  "labels": {
    "enabled": true,
    "visibleByDefault": false
  }
}
```

**After (v3.1):**

```json
// layers/cities/styles/default.json
{
  "id": "default",
  "label": {
    "enabled": true,
    "visibleByDefault": false  ← Moved here
  }
}
```

See [LABELS_MIGRATION_GUIDE.md](LABELS_MIGRATION_GUIDE.md) for full migration instructions.

---

## Next Steps

- **[Profiles Guide](PROFILES_GUIDE.md)** - Create custom profiles
- **[User Guide](USER_GUIDE.md)** - Learn how to use configured features
- **[API Reference](API_REFERENCE.md)** - Programmatic configuration APIs
- **[Schema Documentation](schema/README.md)** - JSON Schema definitions

---

<p align="center">
  <strong>Questions?</strong> Check <a href="FAQ.md">FAQ</a> or open an <a href="https://github.com/yourusername/geoleaf-js/issues">issue</a>
</p>
