# GeoLeaf API Reference

**Product Version:** GeoLeaf Platform V1  
**Version:** 4.0.0  
**Last Updated:** February 21, 2026  
**Audience:** Developers integrating GeoLeaf

> Versioning convention: **Platform V1** is the product label; technical package/release SemVer remains **4.x**. See [VERSIONING_POLICY.md](VERSIONING_POLICY.md).

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core API](#core-api)
3. [POI API](#poi-api)
4. [GeoJSON API](#geojson-api)
5. [Labels API](#labels-api)
6. [Theme API](#theme-api)
7. [Basemap API](#basemap-api)
8. [Filters API](#filters-api)
9. [Cache API](#cache-api)
10. [Toast API](#toast-api)
11. [Config API](#config-api)
12. [Events API](#events-api)
13. [Security API](#security-api)
14. [Errors API](#errors-api)
15. [Validators API](#validators-api)
16. [Helpers API](#helpers-api)

---

## Getting Started

### Installation

**Via CDN:**

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/geoleaf@4.0.0/dist/geoleaf.min.css" />

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/geoleaf@4.0.0/dist/geoleaf.min.js"></script>
```

**Via NPM:**

```bash
npm install geoleaf leaflet
```

```javascript
import GeoLeaf from "geoleaf";
import "leaflet/dist/leaflet.css";
import "geoleaf/dist/geoleaf.min.css";
```

### Basic Usage

```javascript
// Initialize map
const map = GeoLeaf.init({
    map: {
        target: "map",
        center: [48.8566, 2.3522],
        zoom: 12,
    },
    data: {
        activeProfile: "tourism",
        profilesBasePath: "/profiles/",
    },
});

// Access map instance
console.log("Map ready:", map);
```

---

## Core API

> License scope: this reference documents the MIT core API. Premium plugin namespaces are documented separately and require a commercial license.

### GeoLeaf.init(config)

Initializes the GeoLeaf application with configuration.

**Parameters:**

- `config` (Object, required) - Configuration object

**Configuration Structure:**

```javascript
{
  map: {
    target: 'map',              // DOM element ID
    center: [48.8566, 2.3522],  // [lat, lng]
    zoom: 12,                    // Initial zoom level (1-19)
    minZoom: 5,                  // Minimum zoom (optional)
    maxZoom: 19,                 // Maximum zoom (optional)
    maxBounds: [[lat, lng], [lat, lng]], // Restrict panning (optional)
    zoomControl: true,           // Show zoom controls (default: true)
    attributionControl: true     // Show attribution (default: true)
  },

  debug: {
    enabled: false,              // Enable debug logs
    modules: ['*'],              // Module filters: ['*'] or ['poi', 'labels']
    logLevel: 'debug'            // 'debug' | 'info' | 'warn' | 'error'
  },

  data: {
    activeProfile: 'tourism',    // Profile to load
    profilesBasePath: '/profiles/' // Path to profiles directory
  },

  performance: {
    enableClustering: true,      // Enable POI clustering
    clusterThreshold: 50,        // Cluster if >50 POIs
    maxConcurrentLoads: 10,      // Max concurrent layer loads
    debounceDelay: 250           // Debounce delay (ms)
  }
}
```

**Returns:** `L.Map` - Leaflet map instance

**Example:**

```javascript
const map = GeoLeaf.init({
    map: {
        target: "map",
        center: [46.8, 2.5],
        zoom: 6,
    },
    debug: {
        enabled: true,
        modules: ["poi", "geojson"],
    },
    data: {
        activeProfile: "custom-profile",
    },
});
```

**Throws:**

- `InitializationError` - If target element not found
- `ConfigError` - If configuration is invalid

---

### GeoLeaf.loadConfig(input)

Loads configuration from URL or object.

**Parameters:**

- `input` (String|Object, required) - Config URL or config object

**Returns:** `Promise<Object|null>`

---

### GeoLeaf.setTheme(theme)

Applies the active theme.

**Parameters:**

- `theme` (String, required) - Theme identifier

**Returns:** `Boolean`

---

### GeoLeaf.createMap(targetId, options)

Creates and registers a map instance for a target element.

**Parameters:**

- `targetId` (String, required) - Target DOM element ID
- `options` (Object, optional) - Map options

**Returns:** `L.Map | null`

---

### GeoLeaf.getMap(targetId)

Returns a registered map instance by target ID.

**Parameters:**

- `targetId` (String, required) - Target DOM element ID

**Returns:** `L.Map | null`

---

### GeoLeaf.getAllMaps()

Returns all registered map instances.

**Returns:** `Array<L.Map>`

---

### GeoLeaf.removeMap(targetId)

Removes a registered map instance.

**Parameters:**

- `targetId` (String, required) - Target DOM element ID

**Returns:** `Boolean`

---

### GeoLeaf.getModule(name)

Returns a GeoLeaf module by name.

**Parameters:**

- `name` (String, required) - Module name (`Core`, `POI`, `GeoJSON`, etc.)

**Returns:** `Object | null`

---

### GeoLeaf.hasModule(name)

Checks if a module is available.

**Parameters:**

- `name` (String, required) - Module name

**Returns:** `Boolean`

---

### GeoLeaf.getNamespace(name)

Returns a namespace from the global GeoLeaf object.

**Parameters:**

- `name` (String, required) - Namespace name

**Returns:** `Object | null`

---

### GeoLeaf.getHealth()

Returns API controller health status.

**Returns:** `Object | null`

---

### GeoLeaf.getMetrics()

Alias for `GeoLeaf.getHealth()`.

**Returns:** `Object | null`

---

## POI API

### GeoLeaf.POI.add(poi)

Adds a single POI to the map.

**Parameters:**

- `poi` (Object, required) - POI object

**POI Structure:**

```javascript
{
  id: 'poi-001',               // Unique identifier (optional, auto-generated)
  latlng: [48.8566, 2.3522],  // [lat, lng] (required)
  title: 'Eiffel Tower',      // Display name (required)
  description: 'Iron lattice tower', // Description (optional)
  category: 'landmarks',       // Category ID (required)
  subcategory: 'monuments',    // Subcategory ID (optional)
  properties: {                // Custom properties (optional)
    address: '5 Avenue Anatole France',
    phone: '+33 892 70 12 39',
    website: 'https://www.toureiffel.paris',
    openingHours: '9:30-23:45'
  }
}
```

**Returns:** `L.Marker` - Leaflet marker instance

**Example:**

```javascript
const marker = GeoLeaf.POI.add({
    id: "restaurant-001",
    latlng: [48.8584, 2.2945],
    title: "Le Jules Verne",
    description: "Michelin-starred restaurant",
    category: "restaurants",
    properties: {
        priceRange: "$$$$",
        cuisine: "French",
        rating: 4.6,
    },
});

// Access marker
marker.bindPopup("Custom popup content");
```

**Throws:**

- `POIError` - If POI structure is invalid
- `ValidationError` - If coordinates are out of bounds

---

### GeoLeaf.POI.update(id, updates)

Updates an existing POI.

**Parameters:**

- `id` (String|Number, required) - POI identifier
- `updates` (Object, required) - Properties to update

**Returns:** `Boolean` - `true` if updated, `false` if not found

**Example:**

```javascript
GeoLeaf.POI.update("restaurant-001", {
    title: "Le Jules Verne (Updated)",
    properties: {
        rating: 4.7,
    },
});
```

---

### GeoLeaf.POI.remove(id)

Removes a POI from the map.

**Parameters:**

- `id` (String|Number, required) - POI identifier

**Returns:** `Boolean` - `true` if removed, `false` if not found

**Example:**

```javascript
if (GeoLeaf.POI.remove("restaurant-001")) {
    console.log("POI removed");
}
```

---

### GeoLeaf.POI.getById(id)

Retrieves a POI by its ID.

**Parameters:**

- `id` (String|Number, required) - POI identifier

**Returns:** `Object | null` - POI object or null if not found

**Example:**

```javascript
const poi = GeoLeaf.POI.getById("restaurant-001");
if (poi) {
    console.log("POI:", poi.title, poi.latlng);
}
```

---

### GeoLeaf.POI.getAll()

Returns all POIs currently on the map.

**Returns:** `Array<Object>` - Array of POI objects

**Example:**

```javascript
const allPOIs = GeoLeaf.POI.getAll();
console.log(`Total POIs: ${allPOIs.length}`);

allPOIs.forEach((poi) => {
    console.log(poi.title, poi.category);
});
```

---

### GeoLeaf.POI.filter(criteria)

Filters POIs by criteria.

**Parameters:**

- `criteria` (Object, required) - Filter criteria

**Criteria Structure:**

```javascript
{
  category: 'restaurants',     // Filter by category
  subcategory: 'italian',      // Filter by subcategory
  properties: {                // Filter by properties
    rating: { gte: 4.5 },     // Greater than or equal
    priceRange: { in: ['$$', '$$$'] } // In array
  },
  bounds: [[lat, lng], [lat, lng]] // Within bounds
}
```

**Returns:** `Array<Object>` - Filtered POI array

**Example:**

```javascript
// Find highly-rated restaurants in current view
const bounds = map.getBounds();
const restaurants = GeoLeaf.POI.filter({
    category: "restaurants",
    properties: {
        rating: { gte: 4.5 },
    },
    bounds: [
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()],
    ],
});

console.log(`Found ${restaurants.length} top restaurants`);
```

---

### GeoLeaf.POI.clearAll()

Removes all POIs from the map.

**Returns:** `void`

**Example:**

```javascript
GeoLeaf.POI.clearAll();
console.log("All POIs cleared");
```

---

### GeoLeaf.POI.import(pois)

Imports multiple POIs at once.

**Parameters:**

- `pois` (Array, required) - Array of POI objects

**Returns:** `Object` - Import result

```javascript
{
  success: 42,   // Number of successfully imported POIs
  failed: 3,     // Number of failed imports
  errors: []     // Array of error objects
}
```

**Example:**

```javascript
const poisData = [
    { latlng: [48.8, 2.3], title: "POI 1", category: "landmarks" },
    { latlng: [48.9, 2.4], title: "POI 2", category: "restaurants" },
];

const result = GeoLeaf.POI.import(poisData);
console.log(`Imported ${result.success}/${poisData.length} POIs`);

if (result.failed > 0) {
    console.error("Errors:", result.errors);
}
```

---

## GeoJSON API

### GeoLeaf.GeoJSON.load(config)

Loads a GeoJSON layer onto the map.

**Parameters:**

- `config` (Object, required) - Layer configuration

**Configuration Structure:**

```javascript
{
  id: 'my-layer',              // Layer identifier (required)
  url: '/data/layer.geojson',  // GeoJSON file URL (required if no data)
  data: { /* GeoJSON */ },     // Inline GeoJSON (required if no url)
  style: {                     // Leaflet path options (optional)
    fillColor: '#3b82f6',
    fillOpacity: 0.6,
    color: '#1e40af',
    weight: 2
  },
  styleFn: (feature) => ({     // Dynamic styling (optional)
    fillColor: feature.properties.color
  }),
  minZoom: 8,                  // Minimum zoom to show layer (optional)
  maxZoom: 19,                 // Maximum zoom to show layer (optional)
  fitBounds: true              // Fit map to layer bounds (optional)
}
```

**Returns:** `L.GeoJSON` - Leaflet GeoJSON layer

**Example:**

```javascript
const layer = await GeoLeaf.GeoJSON.load({
    id: "parks",
    url: "/data/parks.geojson",
    style: {
        fillColor: "#22c55e",
        fillOpacity: 0.3,
        color: "#16a34a",
        weight: 2,
    },
    minZoom: 10,
    fitBounds: true,
});

console.log("Layer loaded:", layer.getLayers().length, "features");
```

---

### GeoLeaf.GeoJSON.add(id, geojson, style)

Adds inline GeoJSON data to the map.

**Parameters:**

- `id` (String, required) - Layer identifier
- `geojson` (Object, required) - GeoJSON FeatureCollection
- `style` (Object|Function, optional) - Style or style function

**Returns:** `L.GeoJSON`

**Example:**

```javascript
const geojsonData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Park 1' },
      geometry: {
        type: 'Polygon',
        coordinates: [[...]]
      }
    }
  ]
};

const layer = GeoLeaf.GeoJSON.add('custom-layer', geojsonData, {
  fillColor: '#f59e0b',
  weight: 3
});
```

---

### GeoLeaf.GeoJSON.remove(id)

Removes a GeoJSON layer from the map.

**Parameters:**

- `id` (String, required) - Layer identifier

**Returns:** `Boolean` - `true` if removed

**Example:**

```javascript
if (GeoLeaf.GeoJSON.remove("parks")) {
    console.log("Layer removed");
}
```

---

### GeoLeaf.GeoJSON.getLayerById(id)

Retrieves a layer by its ID.

**Parameters:**

- `id` (String, required) - Layer identifier

**Returns:** `Object | null` - Layer object with metadata

**Example:**

```javascript
const layer = GeoLeaf.GeoJSON.getLayerById("parks");
if (layer) {
    console.log("Layer:", layer.id, layer._visibility.current);
    console.log("Features:", layer.getLayers().length);
}
```

---

### GeoLeaf.GeoJSON.clearAll()

Removes all GeoJSON layers from the map.

**Returns:** `void`

**Example:**

```javascript
GeoLeaf.GeoJSON.clearAll();
```

---

### GeoLeaf.GeoJSON.setLayerVisibility(id, visible)

Shows or hides a layer.

**Parameters:**

- `id` (String, required) - Layer identifier
- `visible` (Boolean, required) - `true` to show, `false` to hide

**Returns:** `Boolean` - `true` if successful

**Example:**

```javascript
// Hide layer
GeoLeaf.GeoJSON.setLayerVisibility("parks", false);

// Show layer
GeoLeaf.GeoJSON.setLayerVisibility("parks", true);
```

---

## Labels API

### GeoLeaf.Labels.enable(layerId)

Enables labels for a specific layer.

**Parameters:**

- `layerId` (String, required) - Layer identifier

**Returns:** `Boolean` - `true` if successful

**Example:**

```javascript
GeoLeaf.Labels.enable("parks");
```

**Requirements:**

- Layer must exist
- Layer's current style must have `label.enabled: true`
- Layer must be visible

---

### GeoLeaf.Labels.disable(layerId)

Disables labels for a specific layer.

**Parameters:**

- `layerId` (String, required) - Layer identifier

**Returns:** `Boolean` - `true` if successful

**Example:**

```javascript
GeoLeaf.Labels.disable("parks");
```

---

### GeoLeaf.Labels.toggle(layerId)

Toggles label visibility for a layer.

**Parameters:**

- `layerId` (String, required) - Layer identifier

**Returns:** `Boolean` - New state (`true` = labels now visible)

**Example:**

```javascript
const nowVisible = GeoLeaf.Labels.toggle("parks");
console.log("Labels are now:", nowVisible ? "visible" : "hidden");
```

---

### GeoLeaf.Labels.areLabelsEnabled(layerId)

Checks if labels are currently visible for a layer.

**Parameters:**

- `layerId` (String, required) - Layer identifier

**Returns:** `Boolean`

**Example:**

```javascript
if (GeoLeaf.Labels.areLabelsEnabled("parks")) {
    console.log("Labels are visible");
}
```

---

### GeoLeaf.Labels.setLabelField(layerId, field)

Changes which property field is displayed in labels.

**Parameters:**

- `layerId` (String, required) - Layer identifier
- `field` (String, required) - Property field name

**Returns:** `Boolean` - `true` if successful

**Example:**

```javascript
// Show 'description' instead of 'name'
GeoLeaf.Labels.setLabelField("parks", "description");
```

---

## Theme API

### GeoLeaf.Theme.setActive(themeId)

Switches to a different theme.

**Parameters:**

- `themeId` (String, required) - Theme identifier

**Returns:** `Promise<void>`

**Example:**

```javascript
await GeoLeaf.Theme.setActive("heritage");
console.log("Theme changed to Heritage");
```

**Behavior:**

- Changes layer visibility according to theme config
- Updates UI components
- Persists selection (if `persistSelection: true`)

---

### GeoLeaf.Theme.getCurrent()

Returns the currently active theme.

**Returns:** `Object | null` - Theme object

```javascript
{
  id: 'default',
  label: 'Default View',
  layers: {
    'layer-1': true,
    'layer-2': false
  }
}
```

**Example:**

```javascript
const currentTheme = GeoLeaf.Theme.getCurrent();
console.log("Current theme:", currentTheme.label);
```

---

### GeoLeaf.Theme.getAll()

Returns all available themes.

**Returns:** `Array<Object>` - Array of theme objects

**Example:**

```javascript
const themes = GeoLeaf.Theme.getAll();
themes.forEach((theme) => {
    console.log(theme.id, theme.label);
});
```

---

### GeoLeaf.Theme.create(themeConfig)

Creates a custom theme at runtime.

**Parameters:**

- `themeConfig` (Object, required) - Theme configuration

**Returns:** `Object` - Created theme object

**Example:**

```javascript
const myTheme = GeoLeaf.Theme.create({
    id: "my-custom-theme",
    label: "My Custom View",
    layers: {
        parks: true,
        restaurants: true,
        hotels: false,
    },
});

// Activate it
await GeoLeaf.Theme.setActive("my-custom-theme");
```

---

## Basemap API

### GeoLeaf.Basemap.setActive(basemapId)

Switches to a different basemap.

**Parameters:**

- `basemapId` (String, required) - Basemap identifier ('street', 'satellite', 'topo')

**Returns:** `void`

**Example:**

```javascript
GeoLeaf.Basemap.setActive("satellite");
```

---

### GeoLeaf.Basemap.getCurrent()

Returns the currently active basemap.

**Returns:** `Object | null` - Basemap config

```javascript
{
  id: 'street',
  label: 'Street Map',
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '...'
}
```

**Example:**

```javascript
const basemap = GeoLeaf.Basemap.getCurrent();
console.log("Current basemap:", basemap.label);
```

---

### GeoLeaf.Basemap.getAll()

Returns all available basemaps.

**Returns:** `Array<Object>`

**Example:**

```javascript
const basemaps = GeoLeaf.Basemap.getAll();
basemaps.forEach((bm) => {
    console.log(bm.id, bm.label);
});
```

---

## Filters API

### GeoLeaf.Filters.apply(filters)

Applies filters to visible layers.

**Parameters:**

- `filters` (Object, required) - Filter criteria

**Filter Structure:**

```javascript
{
  category: ['restaurants', 'cafes'],  // Include these categories
  properties: {
    rating: { gte: 4.0 },             // rating >= 4.0
    priceRange: { in: ['$', '$$'] },  // In array
    hasWifi: { eq: true }             // Exact match
  },
  bounds: [[lat, lng], [lat, lng]]    // Geographic bounds
}
```

**Returns:** `Number` - Count of visible features after filtering

**Example:**

```javascript
const count = GeoLeaf.Filters.apply({
    category: ["restaurants"],
    properties: {
        rating: { gte: 4.5 },
        cuisine: { in: ["French", "Italian"] },
    },
});

console.log(`Showing ${count} restaurants`);
```

---

### GeoLeaf.Filters.clear()

Clears all active filters and shows all features.

**Returns:** `void`

**Example:**

```javascript
GeoLeaf.Filters.clear();
```

---

### GeoLeaf.Filters.get()

Returns currently active filters.

**Returns:** `Object | null`

**Example:**

```javascript
const activeFilters = GeoLeaf.Filters.get();
if (activeFilters) {
    console.log("Active filters:", activeFilters);
}
```

---

## Cache API

### GeoLeaf.Cache.save(key, data, options)

Saves data to IndexedDB cache.

**Parameters:**

- `key` (String, required) - Cache key
- `data` (Any, required) - Data to cache
- `options` (Object, optional) - Cache options

**Options:**

```javascript
{
  ttl: 3600000,  // Time to live (ms), default: 1 hour
  compress: false // Compress data (for large objects)
}
```

**Returns:** `Promise<void>`

**Example:**

```javascript
await GeoLeaf.Cache.save('my-data', { items: [...] }, {
  ttl: 86400000  // 24 hours
});
```

---

### GeoLeaf.Cache.load(key)

Loads data from cache.

**Parameters:**

- `key` (String, required) - Cache key

**Returns:** `Promise<Any | null>` - Cached data or null if not found/expired

**Example:**

```javascript
const cachedData = await GeoLeaf.Cache.load("my-data");
if (cachedData) {
    console.log("Cache hit:", cachedData);
} else {
    // Fetch fresh data
}
```

---

### GeoLeaf.Cache.clear(key)

Clears a specific cache entry.

**Parameters:**

- `key` (String, optional) - Cache key. If omitted, clears all cache.

**Returns:** `Promise<void>`

**Example:**

```javascript
// Clear specific cache
await GeoLeaf.Cache.clear("my-data");

// Clear all cache
await GeoLeaf.Cache.clear();
```

---

### GeoLeaf.Cache.getSize()

Returns total cache size.

**Returns:** `Promise<Number>` - Size in bytes

**Example:**

```javascript
const size = await GeoLeaf.Cache.getSize();
console.log(`Cache size: ${(size / 1024 / 1024).toFixed(2)} MB`);
```

---

## Toast API

### GeoLeaf.Toast.success(message, options)

Shows a success toast notification.

**Parameters:**

- `message` (String, required) - Message to display
- `options` (Object, optional) - Toast options

**Options:**

```javascript
{
  duration: 3000,     // Auto-hide after ms (0 = no auto-hide)
  position: 'top-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  dismissable: true   // Show close button
}
```

**Returns:** `String` - Toast ID

**Example:**

```javascript
GeoLeaf.Toast.success("POI added successfully!");
```

---

### GeoLeaf.Toast.error(message, options)

Shows an error toast notification.

**Example:**

```javascript
GeoLeaf.Toast.error("Failed to load layer", {
    duration: 5000,
    dismissable: true,
});
```

---

### GeoLeaf.Toast.warning(message, options)

Shows a warning toast notification.

**Example:**

```javascript
GeoLeaf.Toast.warning("Layer has no data", {
    duration: 4000,
});
```

---

### GeoLeaf.Toast.info(message, options)

Shows an info toast notification.

**Example:**

```javascript
GeoLeaf.Toast.info("Loading profile...", {
    duration: 2000,
});
```

---

### GeoLeaf.Toast.show(message, type, options)

Generic toast method.

**Parameters:**

- `message` (String, required)
- `type` (String, required) - 'success' | 'error' | 'warning' | 'info'
- `options` (Object, optional)

**Example:**

```javascript
GeoLeaf.Toast.show("Custom message", "info", {
    duration: 3000,
});
```

---

### GeoLeaf.Toast.dismiss(toastId)

Dismisses a specific toast.

**Parameters:**

- `toastId` (String, required) - Toast identifier

**Example:**

```javascript
const id = GeoLeaf.Toast.info("Processing...");

// Later...
GeoLeaf.Toast.dismiss(id);
```

---

### GeoLeaf.Toast.clearAll()

Dismisses all active toasts.

**Example:**

```javascript
GeoLeaf.Toast.clearAll();
```

---

## Config API

### GeoLeaf.Config.switchProfile(profileId)

Switches to a different profile.

**Parameters:**

- `profileId` (String, required) - Profile identifier

**Returns:** `Promise<void>`

**Example:**

```javascript
await GeoLeaf.Config.switchProfile("tourism");
console.log("Switched to Tourism profile");
```

**Behavior:**

- Clears current data
- Loads new profile config
- Re-initializes components
- Triggers `profile-changed` event

---

### GeoLeaf.Config.get(path)

Gets a configuration value by path.

**Parameters:**

- `path` (String, required) - Dot-notation path

**Returns:** `Any`

**Example:**

```javascript
const profileId = GeoLeaf.Config.get("data.activeProfile");
const maxLayers = GeoLeaf.Config.get("performance.maxConcurrentLoads");
const uiTheme = GeoLeaf.Config.get("ui.theme");
```

---

### GeoLeaf.Config.set(path, value)

Sets a configuration value.

**Parameters:**

- `path` (String, required) - Dot-notation path
- `value` (Any, required) - New value

**Returns:** `void`

**Example:**

```javascript
GeoLeaf.Config.set("debug.enabled", true);
GeoLeaf.Config.set("performance.maxConcurrentLoads", 5);
```

**Note:** Some config changes require re-initialization.

---

### GeoLeaf.Config.getActiveProfile()

Returns the current active profile ID.

**Returns:** `String`

**Example:**

```javascript
const profileId = GeoLeaf.Config.getActiveProfile();
console.log("Active profile:", profileId);
```

---

### GeoLeaf.Config.getTaxonomy()

Returns the taxonomy configuration.

**Returns:** `Object`

**Example:**

```javascript
const taxonomy = GeoLeaf.Config.getTaxonomy();
console.log("Categories:", Object.keys(taxonomy.categories));
```

---

### GeoLeaf.Config.setDebug(options)

Configures debug logging.

**Parameters:**

- `options` (Object, required)

```javascript
{
  enabled: true,
  modules: ['*'],  // Or ['poi', 'geojson', 'labels']
  logLevel: 'debug' // 'debug' | 'info' | 'warn' | 'error'
}
```

**Example:**

```javascript
GeoLeaf.Config.setDebug({
    enabled: true,
    modules: ["labels", "geojson"],
    logLevel: "debug",
});
```

---

## Events API

### GeoLeaf.Events.on(eventName, handler)

Subscribes to an event.

**Parameters:**

- `eventName` (String, required) - Event name
- `handler` (Function, required) - Event handler

**Returns:** `Function` - Unsubscribe function

**Available Events:**

| Event                      | Data                   | Description        |
| -------------------------- | ---------------------- | ------------------ |
| `map-ready`                | `{ map }`              | Map initialized    |
| `profile-loaded`           | `{ profileId }`        | Profile loaded     |
| `profile-changed`          | `{ from, to }`         | Profile switched   |
| `layer-added`              | `{ layerId, layer }`   | Layer added        |
| `layer-removed`            | `{ layerId }`          | Layer removed      |
| `layer-visibility-changed` | `{ layerId, visible }` | Layer shown/hidden |
| `labels-enabled`           | `{ layerId }`          | Labels enabled     |
| `labels-disabled`          | `{ layerId }`          | Labels disabled    |
| `theme-changed`            | `{ themeId }`          | Theme changed      |
| `basemap-changed`          | `{ basemapId }`        | Basemap changed    |
| `poi-added`                | `{ poi, marker }`      | POI added          |
| `poi-removed`              | `{ poiId }`            | POI removed        |
| `filters-applied`          | `{ filters, count }`   | Filters applied    |
| `filters-cleared`          | `{}`                   | Filters cleared    |
| `error`                    | `{ error }`            | Error occurred     |

**Example:**

```javascript
// Subscribe
const unsubscribe = GeoLeaf.Events.on("layer-added", (data) => {
    console.log("Layer added:", data.layerId);
});

// Unsubscribe later
unsubscribe();
```

---

### GeoLeaf.Events.off(eventName, handler)

Unsubscribes from an event.

**Parameters:**

- `eventName` (String, required)
- `handler` (Function, required) - Same handler reference

**Example:**

```javascript
function onLayerAdded(data) {
    console.log("Layer:", data.layerId);
}

GeoLeaf.Events.on("layer-added", onLayerAdded);

// Later...
GeoLeaf.Events.off("layer-added", onLayerAdded);
```

---

### GeoLeaf.Events.once(eventName, handler)

Subscribes to an event for one-time execution.

**Parameters:**

- `eventName` (String, required)
- `handler` (Function, required)

**Example:**

```javascript
GeoLeaf.Events.once("map-ready", (data) => {
    console.log("Map is ready, this runs only once");
});
```

---

### GeoLeaf.Events.emit(eventName, data)

Emits a custom event.

**Parameters:**

- `eventName` (String, required)
- `data` (Any, optional)

**Example:**

```javascript
GeoLeaf.Events.emit("custom-event", {
    message: "Something happened",
    value: 42,
});
```

---

## Security API

### GeoLeaf.Security.escapeHtml(str)

Escapes HTML special characters.

**Parameters:**

- `str` (String, required)

**Returns:** `String` - Escaped string

**Example:**

```javascript
const userInput = '<script>alert("XSS")</script>';
const safe = GeoLeaf.Security.escapeHtml(userInput);
// Result: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'

element.textContent = safe; // Safe to display
```

---

### GeoLeaf.Security.validateUrl(url, allowedProtocols)

Validates URL protocol.

**Parameters:**

- `url` (String, required)
- `allowedProtocols` (Array, optional) - Default: `['http', 'https', 'data']`

**Throws:** `SecurityError` if invalid

**Example:**

```javascript
try {
    GeoLeaf.Security.validateUrl("https://example.com");
    // URL is safe
} catch (error) {
    console.error("Invalid URL:", error.message);
}
```

---

### GeoLeaf.Security.validateCoordinates(lat, lng)

Validates geographic coordinates.

**Parameters:**

- `lat` (Number, required)
- `lng` (Number, required)

**Throws:** `ValidationError` if out of bounds

**Example:**

```javascript
try {
    GeoLeaf.Security.validateCoordinates(48.8566, 2.3522);
    // Coordinates are valid
} catch (error) {
    console.error("Invalid coordinates:", error.message);
}
```

---

### GeoLeaf.Security.sanitizePoiProperties(properties)

Sanitizes POI properties object.

**Parameters:**

- `properties` (Object, required)

**Returns:** `Object` - Sanitized properties

**Example:**

```javascript
const userProperties = {
    description: "<b>Bold text</b>",
    website: 'javascript:alert("XSS")',
    phone: "+33 1 23 45 67 89",
};

const safe = GeoLeaf.Security.sanitizePoiProperties(userProperties);
// safe.description = '&lt;b&gt;Bold text&lt;/b&gt;'
// safe.website throws SecurityError
```

---

## Errors API

### GeoLeaf.Errors.createError(message, code, context)

Creates a typed error.

**Parameters:**

- `message` (String, required)
- `code` (String, optional) - Error code
- `context` (Object, optional) - Additional context

**Returns:** `GeoLeafError`

**Example:**

```javascript
const error = GeoLeaf.Errors.createError("Layer not found", "LAYER_NOT_FOUND", {
    layerId: "parks",
});

throw error;
```

---

### Error Classes

All error classes extend `GeoLeafError`:

- `ValidationError` - Validation failures
- `SecurityError` - Security violations
- `ConfigError` - Configuration issues
- `NetworkError` - Network failures
- `InitializationError` - Initialization failures
- `MapError` - Map operation errors
- `DataError` - Data processing errors
- `POIError` - POI operation errors
- `RouteError` - Route operation errors
- `UIError` - UI component errors

**Example:**

```javascript
try {
    GeoLeaf.POI.add({
        /* invalid */
    });
} catch (error) {
    if (error instanceof GeoLeaf.Errors.POIError) {
        console.error("POI error:", error.message);
        console.log("Context:", error.context);
    }
}
```

---

## Validators API

### GeoLeaf.Validators.validateCoordinates(lat, lng, options)

Validates coordinates with custom bounds.

**Example:**

```javascript
GeoLeaf.Validators.validateCoordinates(48.8566, 2.3522, {
    minLat: -90,
    maxLat: 90,
    minLng: -180,
    maxLng: 180,
});
```

---

### GeoLeaf.Validators.validateRequiredFields(obj, fields)

Validates required fields in object.

**Example:**

```javascript
const poi = { title: "Test", latlng: [48, 2] };

GeoLeaf.Validators.validateRequiredFields(poi, ["title", "latlng", "category"]);
// Throws ValidationError: missing 'category'
```

---

### GeoLeaf.Validators.validateGeoJSON(geojson)

Validates GeoJSON structure.

**Example:**

```javascript
const geojson = {
  type: 'FeatureCollection',
  features: [...]
};

GeoLeaf.Validators.validateGeoJSON(geojson);
```

---

## Helpers API

### GeoLeaf.Helpers.debounce(func, wait)

Debounces a function.

**Example:**

```javascript
const debouncedSearch = GeoLeaf.Helpers.debounce((query) => {
    console.log("Searching:", query);
}, 300);

input.addEventListener("input", (e) => {
    debouncedSearch(e.target.value);
});
```

---

### GeoLeaf.Helpers.throttle(func, limit)

Throttles a function.

**Example:**

```javascript
const throttledScroll = GeoLeaf.Helpers.throttle(() => {
    console.log("Scrolling...");
}, 100);

window.addEventListener("scroll", throttledScroll);
```

---

### GeoLeaf.Helpers.deepClone(obj)

Deep clones an object.

**Example:**

```javascript
const original = { nested: { value: 42 } };
const copy = GeoLeaf.Helpers.deepClone(original);

copy.nested.value = 100;
console.log(original.nested.value); // Still 42
```

---

## TypeScript Support

GeoLeaf includes TypeScript definitions in `index.d.ts`.

**Example:**

```typescript
import GeoLeaf from "geoleaf";

const map = GeoLeaf.init({
    map: {
        target: "map",
        center: [48.8566, 2.3522],
        zoom: 12,
    },
    data: {
        activeProfile: "tourism",
    },
});

// Type-safe POI
interface Restaurant {
    id: string;
    latlng: [number, number];
    title: string;
    category: "restaurants";
    properties: {
        cuisine: string;
        rating: number;
    };
}

const poi: Restaurant = {
    id: "rest-001",
    latlng: [48.8584, 2.2945],
    title: "Le Jules Verne",
    category: "restaurants",
    properties: {
        cuisine: "French",
        rating: 4.6,
    },
};

GeoLeaf.POI.add(poi);
```

---

## Related Documentation

- **[Getting Started](GETTING_STARTED.md)** - 5-minute quickstart
- **[User Guide](USER_GUIDE.md)** - Feature walkthrough
- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - JSON configuration reference
- **[Profiles Guide](PROFILES_GUIDE.md)** - Creating custom profiles
- **[Developer Guide](DEVELOPER_GUIDE.md)** - Contributing to GeoLeaf

---

## Support

For API questions or issues:

1. Check [FAQ](FAQ.md) for common questions
2. Review [Cookbook](COOKBOOK.md) for practical examples
3. Enable debug mode for detailed logs
4. Open an [issue](https://github.com/yourusername/geoleaf-js/issues) on GitHub

---

**Last Updated:** February 21, 2026  
**GeoLeaf Version:** 4.0.0
