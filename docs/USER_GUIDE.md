# GeoLeaf JS User Guide

**Product Version:** GeoLeaf Platform V1  
**Version:** 3.2.0  
**Last Updated:** January 2026  
**Target Audience:** Developers integrating GeoLeaf into applications

> Versioning convention: **Platform V1** is the product label; technical SemVer in this repository remains **3.2.0** for compatibility.

This comprehensive guide covers all features of GeoLeaf JS, from basic usage to advanced configurations.

---

## Table of Contents

1. [Introduction & Overview](#1-introduction--overview)
2. [Installation](#2-installation)
3. [Quick Start](#3-quick-start)
4. [Understanding Profiles](#4-understanding-profiles)
5. [Configuration Basics](#5-configuration-basics)
6. [Working with Maps](#6-working-with-maps)
7. [UI Components](#7-ui-components)
8. [Advanced Topics](#8-advanced-topics)
9. [Troubleshooting](#9-troubleshooting)
10. [Next Steps](#10-next-steps)

---

## 1. Introduction & Overview

### What is GeoLeaf?

GeoLeaf JS is a powerful JavaScript mapping library built on top of [Leaflet](https://leafletjs.com/), designed to simplify the creation of business-oriented mapping applications. It provides a high-level API for managing POIs (Points of Interest), GeoJSON layers, themes, filters, and offline caching.

### Key Features

- **ðŸ¢ Multi-Profile System** - Pre-configured profiles for Tourism and custom use cases
- **ðŸ“ POI Management** - Add, update, remove, search POIs with rich metadata
- **ðŸŽ¨ Theme System** - Light/dark themes with customizable layer visibility presets
- **ðŸ—ºï¸ GeoJSON Support** - Display polygons, lines, and complex geographic data
- **ðŸ’¾ Offline Cache** - IndexedDB-based caching for offline functionality
- **ðŸ·ï¸ Label System** - Dynamic labels with zoom-based visibility and button controls
- **ðŸ” Advanced Filters** - Multi-criteria filtering with taxonomies and categories
- **ðŸ“Š Data Table** - Built-in table view for POI data
- **ðŸ”’ Security** - XSS protection with DOMPurify integration

### When to Use GeoLeaf

**âœ… Good Use Cases:**
- Tourism mapping applications (attractions, hotels, restaurants)
- Real estate applications
- Event location management

**âŒ Not Recommended For:**
- Real-time GPS tracking with sub-second updates
- 3D terrain visualization or flight simulators
- Applications requiring 10,000+ simultaneous markers
- Weather radar or satellite imagery processing

### Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome/Edge | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Mobile Safari | iOS 14+ |
| Chrome Android | 90+ |

**Required JavaScript:** ES6+ (async/await, Promises, modules)

---

## 2. Installation

### Option A: NPM (Recommended for Production)

```bash
npm install geoleaf
```

In your JavaScript:

```javascript
import GeoLeaf from 'geoleaf';
import 'geoleaf/dist/geoleaf.min.css';

// Also install peer dependencies
npm install leaflet
```

### Option B: CDN (Quick Start)

Add to your HTML `<head>`:

```html
<!-- Leaflet (required) -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

<!-- GeoLeaf -->
<link rel="stylesheet" href="https://unpkg.com/geoleaf@3.2.0/dist/geoleaf.min.css" />
```

Before closing `</body>`:

```html
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/geoleaf@3.2.0/dist/geoleaf.min.js"></script>
```

### Option C: Self-Hosted

Download from [releases](https://github.com/yourusername/geoleaf-js/releases) and host files on your server:

```html
<link rel="stylesheet" href="/assets/geoleaf/geoleaf.min.css" />
<script src="/assets/geoleaf/geoleaf.min.js"></script>
```

### Verify Installation

Open browser console and type:

```javascript
console.log(GeoLeaf.version);
// Should output: "3.2.0"
```

---

## 3. Quick Start

### Minimal Example (30 seconds)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/geoleaf@3.2.0/dist/geoleaf.min.css" />
  <style>
    #map { width: 100%; height: 600px; }
  </style>
</head>
<body>
  <div id="map"></div>
  
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/geoleaf@3.2.0/dist/geoleaf.min.js"></script>
  <script>
    const map = GeoLeaf.init({
      map: { target: 'map', center: [46.2, 2.2], zoom: 6 }
    });
    
    GeoLeaf.POI.add({
      id: 'paris',
      latlng: [48.8566, 2.3522],
      title: 'Paris',
      description: 'Capital of France'
    });
  </script>
</body>
</html>
```

### Step-by-Step Tutorial

See [GETTING_STARTED.md](GETTING_STARTED.md) for a detailed 5-minute tutorial.

---

## 4. Understanding Profiles

### What Are Profiles?

Profiles are pre-configured setups that define:
- **UI layout** (layer manager visibility, filter panel, cache controls)
- **Basemaps** (available background maps)
- **POI configuration** (categories, icons, search)
- **File paths** (where to load JSON data)
- **Taxonomy** (category hierarchy and icons)
- **Default settings** (initial zoom, center, theme)

### Built-in Profiles

#### 4.1 Tourism Profile

**Purpose:** Tourist attractions, hotels, restaurants, events

**Features:**
- 35+ pre-configured layers (climate, conservation zones, cities, itineraries)
- Rich taxonomy with 50+ categories (museums, monuments, hotels, restaurants)
- Icon sprites optimized for tourism
- Search by attraction name, city, or category
- Sample data for major French cities

**Configuration:** `profiles/tourism/geoleaf.config.json`

**When to use:**
- Travel/tourism websites
- City guide applications
- Heritage site management
- Event location mapping

#### 4.2 Custom Profiles

You can create custom profiles for any business domain. See [PROFILES_GUIDE.md](PROFILES_GUIDE.md) for details on creating your own profile.

### Switching Profiles

#### At Initialization

```javascript
const map = GeoLeaf.init({
  map: { target: 'map', center: [48.8, 2.3], zoom: 10 },
  data: {
    activeProfile: 'tourism',
    profilesBasePath: '/profiles/'
  }
});
```

#### Runtime Profile Switch

```javascript
// Switch to another profile
await GeoLeaf.Config.switchProfile('tourism');
```

**Note:** Profile switching reloads the entire configuration and clears current POIs.

---

## 5. Configuration Basics

### 5.1 Main Configuration File

The main entry point is `geoleaf.config.json`:

```json
{
  "debug": {
    "enabled": false,
    "modules": ["config", "poi", "storage"]
  },
  "data": {
    "activeProfile": "tourism",
    "profilesBasePath": "/profiles/"
  }
}
```

**Key fields:**
- `debug.enabled` - Enable verbose console logging
- `debug.modules` - Array of modules to debug (or `["*"]` for all)
- `data.activeProfile` - Which profile to load (tourism/custom)
- `data.profilesBasePath` - Base path to profile directories

### 5.2 Profile Configuration File

Each profile has a `profile.json`:

```json
{
  "name": "Tourism",
  "version": "1.0",
  "ui": {
    "layerManager": { "enabled": true, "position": "topright" },
    "filterPanel": { "enabled": true, "position": "topleft" },
    "searchBar": { "enabled": true, "position": "topleft" },
    "cacheControls": { "enabled": true, "position": "bottomleft" }
  },
  "basemaps": [
    {
      "id": "osm",
      "name": "Street Map",
      "url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "attribution": "&copy; OpenStreetMap",
      "default": true
    }
  ],
  "Files": {
    "taxonomy": "taxonomy.json",
    "themes": "themes.json",
    "layers": "layers/",
    "poi": "data/poi.json"
  },
  "poiAddConfig": {
    "categories": ["restaurant", "hotel", "museum"],
    "defaultCategory": "restaurant",
    "requiredFields": ["title", "latlng"]
  },
  "defaultSettings": {
    "map": {
      "center": [48.8566, 2.3522],
      "zoom": 12,
      "minZoom": 5,
      "maxZoom": 18
    },
    "theme": "light"
  }
}
```

**Important sections:**
- `ui` - Which UI components to display and where
- `basemaps` - Available background maps
- `Files` - Paths to other JSON configuration files (relative to profile directory)
- `poiAddConfig` - Configuration for POI creation form
- `defaultSettings` - Initial map state

### 5.3 Taxonomy Configuration

Defines categories, subcategories, and icons in `taxonomy.json`:

```json
{
  "icons": {
    "sprite": "assets/icons/tourism-sprite.png",
    "iconSize": [32, 32],
    "iconAnchor": [16, 32]
  },
  "categories": [
    {
      "id": "accommodation",
      "name": "Accommodation",
      "icon": "bed",
      "subcategories": [
        { "id": "hotel", "name": "Hotel", "icon": "hotel" },
        { "id": "hostel", "name": "Hostel", "icon": "hostel" },
        { "id": "camping", "name": "Camping", "icon": "camping" }
      ]
    },
    {
      "id": "food",
      "name": "Food & Drink",
      "icon": "restaurant",
      "subcategories": [
        { "id": "restaurant", "name": "Restaurant", "icon": "restaurant" },
        { "id": "cafe", "name": "CafÃ©", "icon": "cafe" },
        { "id": "bar", "name": "Bar", "icon": "bar" }
      ]
    }
  ]
}
```

### 5.4 Theme Configuration

Defines layer visibility presets in `themes.json`:

```json
{
  "config": {
    "defaultTheme": "default",
    "allowCustomThemes": true
  },
  "themes": [
    {
      "id": "default",
      "name": "Default View",
      "type": "primary",
      "layers": {
        "climate": true,
        "cities": true,
        "poi": true,
        "conservation-zones": false
      }
    },
    {
      "id": "heritage",
      "name": "Heritage Sites",
      "type": "secondary",
      "layers": {
        "monuments": true,
        "conservation-zones": true,
        "museums": true,
        "cities": false
      }
    }
  ]
}
```

**Theme types:**
- `primary` - Main themes shown in theme selector
- `secondary` - Specialized themes for specific use cases

### 5.5 Layer Styles Configuration

Each layer can have multiple styles in `layers/<layer-name>/styles/<style-id>.json`:

```json
{
  "id": "default",
  "description": "Default style for climate layer",
  "label": {
    "enabled": true,
    "visibleByDefault": false
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
    "weight": 2
  },
  "legend": {
    "enabled": true,
    "items": [
      { "label": "Temperate", "color": "#3388ff" },
      { "label": "Mediterranean", "color": "#ff8833" }
    ]
  }
}
```

**Key fields:**
- `label.enabled` - Whether labels are supported for this layer
- `label.visibleByDefault` - Initial label visibility state when layer is activated
- `layerScale` - Zoom range for layer visibility
- `labelScale` - Zoom range for label visibility (usually narrower than layerScale)
- `style` - Leaflet style options for the layer
- `legend` - Legend configuration

**âš ï¸ Important:** As of v3.1, `visibleByDefault` **must** be in the style file, not in the layer configuration. See [LABELS_MIGRATION_GUIDE.md](LABELS_MIGRATION_GUIDE.md) for details.

---

## 6. Working with Maps

### 6.1 POI Management

#### Adding POIs

```javascript
// Add single POI
GeoLeaf.POI.add({
  id: 'eiffel-tower',
  latlng: [48.8584, 2.2945],
  title: 'Eiffel Tower',
  description: 'Iconic iron tower',
  category: 'monument',
  subcategory: 'landmark',
  properties: {
    address: 'Champ de Mars, Paris',
    phone: '+33 1 23 45 67 89',
    website: 'https://www.toureiffel.paris',
    openingHours: '9:00-23:45'
  }
});

// Add multiple POIs
const pois = [
  { id: 'poi-1', latlng: [48.8, 2.3], title: 'POI 1' },
  { id: 'poi-2', latlng: [48.9, 2.4], title: 'POI 2' }
];

pois.forEach(poi => GeoLeaf.POI.add(poi));
```

#### Updating POIs

```javascript
// Update specific fields
GeoLeaf.POI.update('eiffel-tower', {
  description: 'Updated description',
  properties: { phone: '+33 9 87 65 43 21' }
});
```

#### Removing POIs

```javascript
// Remove single POI
GeoLeaf.POI.remove('eiffel-tower');

// Remove all POIs
GeoLeaf.POI.clearAll();
```

#### Searching POIs

```javascript
// Get single POI by ID
const poi = GeoLeaf.POI.getById('eiffel-tower');

// Get all POIs
const allPois = GeoLeaf.POI.getAll();

// Filter POIs by category
const monuments = GeoLeaf.POI.filter({ category: 'monument' });

// Filter by multiple criteria
const results = GeoLeaf.POI.filter({
  category: 'restaurant',
  subcategory: 'italian',
  bounds: L.latLngBounds([48.8, 2.2], [48.9, 2.4])
});
```

### 6.2 Basemaps

#### Switching Basemaps

```javascript
// Programmatically change basemap
GeoLeaf.Basemap.setActive('satellite');

// Get current basemap
const current = GeoLeaf.Basemap.getCurrent();
console.log(current.id); // "satellite"
```

#### Custom Basemaps

Add to `profile.json`:

```json
{
  "basemaps": [
    {
      "id": "custom-map",
      "name": "My Custom Map",
      "url": "https://tiles.myserver.com/{z}/{x}/{y}.png",
      "attribution": "&copy; My Company",
      "maxZoom": 18,
      "minZoom": 5,
      "default": false
    }
  ]
}
```

### 6.3 GeoJSON Layers

#### Loading GeoJSON

```javascript
// From URL
await GeoLeaf.GeoJSON.load({
  id: 'cities',
  url: '/data/cities.geojson',
  style: {
    fillColor: '#ff7800',
    color: '#000',
    weight: 1,
    fillOpacity: 0.5
  }
});

// From object
const geojsonData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
      properties: { name: 'Paris' }
    }
  ]
};

GeoLeaf.GeoJSON.add({
  id: 'my-layer',
  data: geojsonData,
  style: { color: '#3388ff', weight: 2 }
});
```

#### Removing Layers

```javascript
// Remove specific layer
GeoLeaf.GeoJSON.remove('cities');

// Clear all GeoJSON layers
GeoLeaf.GeoJSON.clearAll();
```

### 6.4 Themes

#### Switching Themes

```javascript
// Switch to heritage theme
await GeoLeaf.Theme.setActive('heritage');

// Get current theme
const theme = GeoLeaf.Theme.getCurrent();
console.log(theme.name); // "Heritage Sites"
```

#### Creating Custom Themes

```javascript
// Define custom theme
await GeoLeaf.Theme.create({
  id: 'my-theme',
  name: 'My Custom Theme',
  type: 'secondary',
  layers: {
    'poi': true,
    'climate': false,
    'cities': true
  }
});

// Activate it
await GeoLeaf.Theme.setActive('my-theme');
```

### 6.5 Labels

#### Enabling/Disabling Labels

```javascript
// Enable labels for a layer
GeoLeaf.Labels.enable('cities');

// Disable labels
GeoLeaf.Labels.disable('cities');

// Toggle labels
GeoLeaf.Labels.toggle('cities');

// Check if labels are enabled
const enabled = GeoLeaf.Labels.areLabelsEnabled('cities');
```

#### Label Configuration

Labels are configured in layer style files. See section 5.5 above.

**Zoom-based visibility:**
- Labels only appear within the `labelScale` zoom range
- `labelScale.minZoom` is typically higher than `layerScale.minZoom` to avoid clutter
- Users can toggle labels on/off via button in layer manager

---

## 7. UI Components

### 7.1 Layer Manager

**Purpose:** Control visibility of layers (POI categories, GeoJSON layers)

**Configuration in profile.json:**

```json
{
  "ui": {
    "layerManager": {
      "enabled": true,
      "position": "topright",
      "collapsed": false
    }
  }
}
```

**User actions:**
- Toggle layer visibility (checkbox)
- Toggle labels for layers that support them (button)
- Collapse/expand layer groups

**Programmatic control:**

```javascript
// Show layer manager
GeoLeaf.UI.LayerManager.show();

// Hide layer manager
GeoLeaf.UI.LayerManager.hide();

// Refresh layer list
GeoLeaf.UI.LayerManager.refresh();
```

### 7.2 Filter Panel

**Purpose:** Filter POIs by multiple criteria (category, subcategory, custom properties)

**Configuration:**

```json
{
  "ui": {
    "filterPanel": {
      "enabled": true,
      "position": "topleft",
      "collapsed": true
    }
  }
}
```

**Programmatic filtering:**

```javascript
// Apply filter
GeoLeaf.Filters.apply({
  category: ['restaurant', 'cafe'],
  subcategory: ['italian', 'french'],
  properties: {
    rating: { min: 4, max: 5 }
  }
});

// Clear filters
GeoLeaf.Filters.clear();

// Get current filters
const activeFilters = GeoLeaf.Filters.get();
```

### 7.3 Search Bar

**Purpose:** Search POIs by name, category, or address

**Configuration:**

```json
{
  "ui": {
    "searchBar": {
      "enabled": true,
      "position": "topleft",
      "placeholder": "Search locations...",
      "minChars": 2
    }
  }
}
```

**Events:**

```javascript
// Listen to search events
GeoLeaf.on('search:result', (event) => {
  console.log('Selected:', event.result);
  // event.result = { id, title, latlng, category }
});

// Programmatic search
const results = await GeoLeaf.Search.query('eiffel');
console.log(results); // Array of matching POIs
```

### 7.4 Cache Controls

**Purpose:** Manage offline cache (IndexedDB storage)

**Configuration:**

```json
{
  "ui": {
    "cacheControls": {
      "enabled": true,
      "position": "bottomleft"
    }
  }
}
```

**Programmatic cache management:**

```javascript
// Save current state to cache
await GeoLeaf.Cache.save('my-cache-key', {
  pois: GeoLeaf.POI.getAll(),
  layers: GeoLeaf.GeoJSON.getAll(),
  center: map.getCenter(),
  zoom: map.getZoom()
});

// Load from cache
const cached = await GeoLeaf.Cache.load('my-cache-key');

// Clear cache
await GeoLeaf.Cache.clear();

// Get cache size
const size = await GeoLeaf.Cache.getSize();
console.log(`Cache size: ${(size / 1024 / 1024).toFixed(2)} MB`);
```

### 7.5 Toast Notifications

**Purpose:** Display temporary messages to users

**Usage:**

```javascript
// Success message (green, 3s)
GeoLeaf.Toast.success('POI added successfully!');

// Error message (red, 5s)
GeoLeaf.Toast.error('Failed to load data');

// Warning message (orange, 4s)
GeoLeaf.Toast.warning('Connection unstable');

// Info message (blue, 3s)
GeoLeaf.Toast.info('Loading data...');

// Custom duration
GeoLeaf.Toast.success('Saved', 2000); // 2 seconds

// With options
GeoLeaf.Toast.show('Custom message', {
  type: 'info',
  duration: 5000,
  persistent: false
});
```

See [docs/ui/notifications.md](ui/notifications.md) for complete documentation.

---

## 8. Advanced Topics

### 8.1 Custom Profiles

Create your own profile by copying the structure of an existing profile:

```
profiles/
  my-custom-profile/
    geoleaf.config.json    # Optional, uses root config if missing
    profile.json           # Required
    taxonomy.json          # Required
    themes.json            # Required
    layers/                # Optional, for GeoJSON layers
    data/                  # Your POI data files
```

See [PROFILES_GUIDE.md](PROFILES_GUIDE.md) for detailed instructions.

### 8.2 Offline Mode

Enable offline functionality:

```javascript
// Enable offline mode
await GeoLeaf.Offline.enable({
  cacheBasemaps: true,        // Cache basemap tiles
  cachePOIs: true,            // Cache POI data
  cacheGeoJSON: true,         // Cache GeoJSON layers
  maxCacheSize: 50 * 1024 * 1024  // 50 MB
});

// Check if offline
const isOffline = GeoLeaf.Offline.isEnabled();

// Sync when online
GeoLeaf.on('online', async () => {
  await GeoLeaf.Offline.sync();
});
```

### 8.3 Custom Themes (CSS)

Override default styles by loading a custom CSS file after geoleaf.css:

```html
<link rel="stylesheet" href="https://unpkg.com/geoleaf@3.2.0/dist/geoleaf.min.css" />
<link rel="stylesheet" href="/my-custom-theme.css" />
```

Example custom theme:

```css
/* Change primary color */
.geoleaf-button-primary {
  background-color: #e74c3c;
  border-color: #c0392b;
}

/* Change layer manager background */
.geoleaf-layer-manager {
  background-color: #2c3e50;
  color: #ecf0f1;
}

/* Custom icon colors */
.geoleaf-icon-restaurant {
  color: #e74c3c;
}
```

### 8.4 Events API

Listen to GeoLeaf events:

```javascript
// POI events
GeoLeaf.on('poi:added', (event) => {
  console.log('POI added:', event.poi);
});

GeoLeaf.on('poi:removed', (event) => {
  console.log('POI removed:', event.id);
});

GeoLeaf.on('poi:updated', (event) => {
  console.log('POI updated:', event.poi);
});

// Layer events
GeoLeaf.on('layer:shown', (event) => {
  console.log('Layer shown:', event.layerId);
});

GeoLeaf.on('layer:hidden', (event) => {
  console.log('Layer hidden:', event.layerId);
});

// Theme events
GeoLeaf.on('theme:changed', (event) => {
  console.log('Theme changed to:', event.theme.name);
});

// Filter events
GeoLeaf.on('filter:applied', (event) => {
  console.log('Filters applied:', event.filters);
});

// Cache events
GeoLeaf.on('cache:saved', (event) => {
  console.log('Cache saved:', event.key);
});

// Remove listener
const handler = (event) => console.log(event);
GeoLeaf.on('poi:added', handler);
GeoLeaf.off('poi:added', handler);
```

### 8.5 Data Import/Export

```javascript
// Export all POIs to JSON
const poisJSON = GeoLeaf.Export.poisToJSON();
const blob = new Blob([poisJSON], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'pois.json';
a.click();

// Import POIs from JSON file
const fileInput = document.querySelector('#file-input');
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const text = await file.text();
  const pois = JSON.parse(text);
  
  GeoLeaf.POI.clearAll();
  pois.forEach(poi => GeoLeaf.POI.add(poi));
});

// Export to GeoJSON
const geojson = GeoLeaf.Export.toGeoJSON({
  includePOIs: true,
  includeLayers: true
});
```

---

## 9. Troubleshooting

### Common Issues

#### 9.1 Map Doesn't Appear

**Symptoms:** Blank white space where map should be

**Solutions:**
1. Check `#map` div has explicit height in CSS:
   ```css
   #map { height: 600px; }
   ```
2. Ensure Leaflet CSS is loaded before GeoLeaf CSS
3. Check browser console for errors (F12)
4. Verify container ID matches `target` in config

#### 9.2 POIs Not Showing

**Symptoms:** Map appears but no markers visible

**Solutions:**
1. Verify coordinates are in `[latitude, longitude]` format (not reversed)
2. Check POI category matches taxonomy categories
3. Ensure layer is enabled in layer manager
4. Check zoom level is within layer's `layerScale` range
5. Look for JavaScript errors in console

#### 9.3 Profile Not Loading

**Symptoms:** Error "Failed to load profile" in console

**Solutions:**
1. Check `profilesBasePath` in geoleaf.config.json
2. Verify `profile.json` exists in profile directory
3. Check all file paths in `profile.json` are correct
4. Ensure JSON files are valid (use JSONLint.com)
5. Check network tab in DevTools for 404 errors

#### 9.4 Labels Not Appearing

**Symptoms:** Layer visible but no labels shown

**Solutions:**
1. Check `label.enabled: true` in layer style file
2. Verify zoom level is within `labelScale` range
3. Toggle label button in layer manager
4. Check style file has `label.visibleByDefault` property
5. See [LABELS_MIGRATION_GUIDE.md](LABELS_MIGRATION_GUIDE.md) if upgrading from older versions

#### 9.5 Theme Not Switching

**Symptoms:** Theme selector doesn't change map appearance

**Solutions:**
1. Verify `themes.json` exists in profile directory
2. Check theme IDs match layer IDs in layer definitions
3. Look for errors in console related to theme loading
4. Ensure layers referenced in theme actually exist

#### 9.6 Cache Not Working

**Symptoms:** Data not persisting offline

**Solutions:**
1. Check browser supports IndexedDB (all modern browsers do)
2. Verify cache controls are enabled in UI config
3. Check browser storage quota hasn't been exceeded
4. Ensure HTTPS is used (some browsers restrict IndexedDB on HTTP)
5. Check for Private/Incognito mode (cache disabled in some browsers)

### Debug Mode

Enable detailed logging:

```javascript
const map = GeoLeaf.init({
  map: { target: 'map', center: [48.8, 2.3], zoom: 10 },
  debug: {
    enabled: true,
    modules: ['*']  // Or specific: ['poi', 'config', 'storage']
  }
});
```

Check console for detailed logs prefixed with `[GeoLeaf]`.

### Performance Issues

**Symptoms:** Map sluggish with many POIs

**Solutions:**
1. Enable clustering for large POI datasets (1000+ markers)
2. Reduce `maxZoom` to prevent rendering at very high zoom levels
3. Use layer visibility based on zoom ranges
4. Paginate POI loading (load only visible area)
5. Consider using vector tiles for very large datasets

---

## 10. Next Steps

### ðŸ“š Documentation

- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - Deep dive into all JSON configuration files
- **[Profiles Guide](PROFILES_GUIDE.md)** - Create custom business profiles
- **[Developer Guide](DEVELOPER_GUIDE.md)** - Contributing, building, testing
- **[API Reference](API_REFERENCE.md)** - Complete API documentation
- **[Cookbook](COOKBOOK.md)** - 8 practical recipes for common scenarios
- **[Migration Guide](MIGRATION_GUIDE.md)** - Upgrading from older versions

### ðŸŽ“ Tutorials

- [Creating a Custom Profile](guides/custom-profile-tutorial.md)
- [Offline-First Applications](guides/offline-tutorial.md)
- [Advanced Filtering](guides/advanced-filtering.md)
- [Custom Icons and Styling](guides/custom-styling.md)

### ðŸ’» Examples

- **[Demo Application](../demo/index.html)** - Full-featured example
- **[Tourism Example](../demo/tourism-example.html)** - Tourism profile showcase

### ðŸ¤ Community

- **[GitHub Repository](https://github.com/yourusername/geoleaf-js)** - Source code, issues, discussions
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/geoleaf)** - Ask questions (tag: `geoleaf`)
- **[Discord Server](https://discord.gg/geoleaf)** - Chat with other developers

### ðŸš€ Roadmap

See [README.md](../README.md#roadmap) for upcoming features in v3.2 and v4.0.

---

<p align="center">
  <strong>Need Help?</strong><br>
  Check <a href="FAQ.md">FAQ</a> Â· Report <a href="https://github.com/yourusername/geoleaf-js/issues">Issues</a> Â· Read <a href="COOKBOOK.md">Cookbook</a>
</p>
