# GeoLeaf Profiles Guide

**Product Version:** GeoLeaf Platform V1  
**Version:** 3.2.0  
**Last Updated:** January 2026  
**Audience:** Developers creating custom business profiles

> Versioning convention: **Platform V1** is the product label; technical SemVer in this repository remains **3.2.0** for compatibility.

---

## Table of Contents

1. [What are Profiles?](#what-are-profiles)
2. [Profile Structure](#profile-structure)
3. [Built-in Profiles](#built-in-profiles)
4. [Creating Custom Profiles](#creating-custom-profiles)
5. [Profile Best Practices](#profile-best-practices)
6. [Profile Migration](#profile-migration)
7. [Troubleshooting](#troubleshooting)

---

## What are Profiles?

### Definition

A **GeoLeaf Profile** is a self-contained configuration package that defines the complete behavior and appearance of a GeoLeaf map application for a specific business domain or use case.

Think of profiles as **themes on steroids** — they control not just visual styling, but also:

- Available POI categories and icons
- Map layers and data sources
- UI components and controls
- Search and filter capabilities
- Basemap options
- Default settings

### Use Cases

| Profile Type | Best For | Example Applications |
|-------------|----------|---------------------|
| **Tourism** | Public-facing discovery | Tourist attractions, hiking trails, accommodations |
| **Real Estate** | Property management | Properties, buildings, land parcels |
| **Emergency** | Crisis response | Shelters, hospitals, emergency routes |
| **Retail** | Store management | Store locations, inventory, service areas |

### When to Create Custom vs Use Built-in

**Use Built-in Profile** if:
- ✅ Your use case closely matches Tourism
- ✅ You only need minor customization (colors, labels)
- ✅ You want to start quickly

**Create Custom Profile** if:
- ✅ You have unique business domain requirements
- ✅ You need custom POI categories (e.g., medical facilities, schools)
- ✅ You require specific data sources or layers
- ✅ You need specialized UI components
- ✅ You want complete control over behavior

---

## Profile Structure

### Directory Layout

```
profiles/
├── geoleaf.config.json          # Root config (profile selection)
└── {profile-name}/              # Your profile directory
    ├── profile.json             # ✅ REQUIRED - Main profile config
    ├── taxonomy.json            # ✅ REQUIRED - Categories & icons
    ├── themes.json              # ✅ REQUIRED - Layer visibility themes
    ├── mapping.json             # ⚪ Optional - Data normalization
    ├── poi.json                 # ⚪ Optional - POI data (if any)
    ├── routes.json              # ⚪ Optional - Route data (if any)
    ├── layers/                  # ⚪ Optional - GeoJSON layers
    │   ├── layer-1/
    │   │   ├── config.json      # Layer metadata
    │   │   ├── data.geojson     # Layer data
    │   │   └── styles/
    │   │       ├── default.json # Default style
    │   │       └── alt.json     # Alternative styles
    │   └── layer-2/
    │       └── ...
    ├── data/                    # ⚪ Optional - External data files
    │   └── sample.json
    └── assets/                  # ⚪ Optional - Profile-specific assets
        └── icons/
            └── sprite.svg
```

### Required Files

#### 1. profile.json

**Purpose:** Main configuration file defining UI, basemaps, and behavior.

**Key Sections:**

```json
{
  "id": "my-profile",
  "label": "My Custom Profile",
  "description": "Profile description",
  "version": "1.0.0",
  
  "ui": {
    "showLayerManager": true,
    "showFilterPanel": true,
    "showThemeSelector": true
  },
  
  "basemaps": {
    "street": { /* basemap config */ }
  },
  
  "Files": {
    "taxonomyFile": "taxonomy.json",
    "themesFile": "themes.json"
  },
  
  "Directory": {
    "layers": "layers/{layerId}/"
  }
}
```

**See:** [Configuration Guide - profile.json](CONFIGURATION_GUIDE.md#2-profilejson)

---

#### 2. taxonomy.json

**Purpose:** Defines POI categories, subcategories, and icon configuration.

**Key Sections:**

```json
{
  "icons": {
    "spriteUrl": "path/to/sprite.svg",
    "symbolPrefix": "my-prefix-",
    "defaultIcon": "default-icon"
  },
  
  "categories": {
    "category-1": {
      "label": "Category 1",
      "icon": "icon-name",
      "subcategories": {
        "subcat-1": {
          "label": "Subcategory 1",
          "icon": "icon-name"
        }
      }
    }
  }
}
```

**See:** [Configuration Guide - taxonomy.json](CONFIGURATION_GUIDE.md#3-taxonomyjson)

---

#### 3. themes.json

**Purpose:** Defines layer visibility presets (themes).

**Key Sections:**

```json
{
  "config": {
    "defaultTheme": "default",
    "allowCustomThemes": true
  },
  
  "themes": [
    {
      "id": "default",
      "label": "Default View",
      "icon": "view-all",
      "layers": {
        "layer-1": true,
        "layer-2": false
      }
    }
  ]
}
```

**See:** [Configuration Guide - themes.json](CONFIGURATION_GUIDE.md#4-themesjson)

---

### Optional Files

#### mapping.json

**Purpose:** Normalizes external data to GeoLeaf's internal format.

**Use When:**
- Loading data from external APIs
- Converting CSV/Excel to GeoJSON
- Transforming property names
- Applying data transformations (scale, regex, concat)

**Example:**

```json
{
  "poi": {
    "mapping": {
      "id": "feature_id",
      "title": "name",
      "latlng": {
        "lat": "latitude",
        "lng": "longitude"
      },
      "category": "poi_category",
      "properties": {
        "description": "desc",
        "phone": "contact.phone"
      }
    }
  },
  
  "transforms": [
    {
      "field": "poi_category",
      "type": "map",
      "mappings": {
        "hotel": "hebergements",
        "restaurant": "food"
      }
    }
  ]
}
```

**See:** [Configuration Guide - mapping.json](CONFIGURATION_GUIDE.md#6-mappingjson)

---

#### layers/ Directory

**Purpose:** GeoJSON layer configurations and data.

**Structure for each layer:**

```
layers/{layer-id}/
├── config.json          # Layer metadata (optional if in layers.json)
├── data.geojson         # GeoJSON data
└── styles/
    ├── default.json     # Default style (REQUIRED)
    └── *.json           # Additional styles (optional)
```

**See:** [Configuration Guide - layers.json](CONFIGURATION_GUIDE.md#5-layersjson)

---

## Built-in Profiles

GeoLeaf includes three production-ready profiles that showcase different use cases.

### Tourism Profile

**Use Case:** Tourist attractions, activities, accommodations, nature sites

**Structure:**

```
profiles/tourism/
├── profile.json         (214 lines)
├── taxonomy.json        (categories: activites, culture, nature, hebergements)
├── themes.json          (4+ themes)
├── mapping.json         (data normalization)
├── layers.json          (35+ layer configs)
└── layers/              (35+ directories)
    ├── activites-aquatiques/
    │   ├── data.geojson
    │   └── styles/
    │       ├── default.json
    │       └── detailed.json
    ├── culture-musees/
    ├── hebergements-hotels/
    └── ...
```

**Key Features:**

- **35+ layers** organized by category
- **46 migrated styles** (v3.2.0 with `label.visibleByDefault`)
- **Icon sprite** with 50+ tourism symbols
- **Sample data** for major French cities
- **4 category groups:** Activités, Culture, Nature, Hébergements
- **Multiple themes:** Default, Heritage, Nature Focus

**Configuration Highlights:**

```json
{
  "ui": {
    "showLayerManager": true,
    "showFilterPanel": true,
    "showThemeSelector": true,
    "showLegend": true,
    "showCacheButton": true
  },
  
  "basemaps": {
    "street": { "defaultBasemap": true, "offline": true },
    "satellite": { "offline": false },
    "topo": { "offline": false }
  },
  
  "performance": {
    "maxConcurrentLayers": 10,
    "layerLoadDelay": 200
  }
}
```

**Best For:**
- Tourism boards
- Travel apps
- Hiking/outdoor applications
- Cultural heritage sites

---

---

## Creating Custom Profiles

Follow these steps to create a new profile from scratch.

### Step 1: Create Profile Directory

```bash
mkdir -p profiles/my-profile
cd profiles/my-profile
```

### Step 2: Create profile.json

Start with a minimal template:

```json
{
  "id": "my-profile",
  "label": "My Custom Profile",
  "description": "Brief description of your profile",
  "version": "1.0.0",
  
  "ui": {
    "showLayerManager": true,
    "showFilterPanel": true,
    "showThemeSelector": false,
    "showLegend": true,
    "showCacheButton": false,
    "enableGeolocation": true
  },
  
  "basemaps": {
    "street": {
      "id": "street",
      "label": "Street Map",
      "url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "attribution": "&copy; OpenStreetMap contributors",
      "minZoom": 3,
      "maxZoom": 19,
      "defaultBasemap": true,
      "offline": false
    }
  },
  
  "Files": {
    "taxonomyFile": "taxonomy.json",
    "themesFile": "themes.json"
  },
  
  "Directory": {
    "layers": "layers/{layerId}/"
  },
  
  "defaultSettings": {
    "map": {
      "center": [46.8, 2.5],
      "zoom": 6
    }
  }
}
```

**Customization checklist:**
- ✅ Set unique `id` (lowercase, no spaces)
- ✅ Configure `ui` components needed
- ✅ Define at least one basemap
- ✅ Set default map `center` and `zoom`

---

### Step 3: Create taxonomy.json

Define your POI categories:

```json
{
  "icons": {
    "spriteUrl": "assets/icons/sprite.svg",
    "symbolPrefix": "my-prefix-",
    "defaultIcon": "default-icon"
  },
  
  "defaults": {
    "icon": "default-icon"
  },
  
  "categories": {
    "category-1": {
      "label": "Category 1",
      "icon": "icon-1",
      "subcategories": {
        "subcat-1": {
          "label": "Subcategory 1",
          "icon": "icon-1a"
        },
        "subcat-2": {
          "label": "Subcategory 2",
          "icon": "icon-1b"
        }
      }
    },
    "category-2": {
      "label": "Category 2",
      "icon": "icon-2",
      "subcategories": {}
    }
  }
}
```

**Tips:**
- Keep category IDs lowercase with hyphens
- Limit depth to 2 levels (category → subcategory)
- Use semantic icon names
- Plan for 5-15 top-level categories max

---

### Step 4: Create themes.json

Define layer visibility presets:

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
      "label": "Default View",
      "icon": "view-all",
      "layers": {
        "layer-1": true,
        "layer-2": true,
        "layer-3": true
      }
    },
    {
      "id": "minimal",
      "label": "Minimal View",
      "icon": "view-minimal",
      "layers": {
        "layer-1": true,
        "layer-2": false,
        "layer-3": false
      }
    }
  ]
}
```

**Tips:**
- Start with 2-4 themes
- Include an "All Layers" theme
- Name themes by purpose, not technical details
- Keep theme switching fast (avoid >20 layers per theme)

---

### Step 5: Add Layers (Optional)

If you have GeoJSON layers:

**A. Create layers directory:**

```bash
mkdir -p layers/my-layer/styles
```

**B. Add layer data:**

`layers/my-layer/data.geojson`

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Location 1",
        "category": "category-1"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [2.5, 46.8]
      }
    }
  ]
}
```

**C. Add default style:**

`layers/my-layer/styles/default.json`

```json
{
  "$schema": "../../../../schema/style.schema.json",
  "id": "default",
  "name": "Default Style",
  
  "label": {
    "enabled": true,
    "visibleByDefault": false,
    "field": "name"
  },
  
  "style": {
    "fillColor": "#3b82f6",
    "fillOpacity": 0.6,
    "color": "#1e40af",
    "weight": 2,
    "opacity": 1.0
  },
  
  "legend": {
    "enabled": true,
    "title": "My Layer",
    "items": [
      {
        "label": "Feature",
        "color": "#3b82f6"
      }
    ]
  }
}
```

**D. Register layer in layers.json:**

`layers.json`

```json
{
  "layers": [
    {
      "id": "my-layer",
      "name": "My Layer",
      "type": "point",
      "dataSource": "layers/my-layer/data.geojson",
      "defaultStyle": "default",
      "availableStyles": ["default"],
      "minZoom": 8,
      "maxZoom": 19
    }
  ]
}
```

---

### Step 6: Prepare Sample Data (Optional)

If you have POI data, create `poi.json`:

```json
{
  "version": "1.0",
  "count": 2,
  "source": "Sample data",
  
  "pois": [
    {
      "id": "poi-001",
      "latlng": [46.8, 2.5],
      "title": "Sample POI 1",
      "category": "category-1",
      "subcategory": "subcat-1",
      "properties": {
        "description": "Description here",
        "address": "123 Main St"
      }
    },
    {
      "id": "poi-002",
      "latlng": [46.9, 2.6],
      "title": "Sample POI 2",
      "category": "category-2",
      "properties": {}
    }
  ]
}
```

---

### Step 7: Update Root Config

Add your profile to `profiles/geoleaf.config.json`:

```json
{
  "data": {
    "activeProfile": "my-profile",
    "profilesBasePath": "/profiles/"
  },
  
  "profiles": [
    {
      "id": "tourism",
      "label": "Tourism",
      "description": "Tourist attractions and activities"
    },
    {
      "id": "my-profile",
      "label": "My Custom Profile",
      "description": "Brief description"
    }
  ]
}
```

---

### Step 8: Test Your Profile

**A. Start dev server:**

```bash
npm start
```

**B. Load your profile:**

```
http://localhost:8080/demo/?profile=my-profile
```

**C. Enable debug mode:**

```javascript
// In browser console
GeoLeaf.Config.setDebug({
  enabled: true,
  modules: ['*']
});
```

**D. Check console for errors:**

Look for:
- ❌ Profile loading errors
- ❌ Missing files (taxonomy, themes)
- ❌ Invalid JSON syntax
- ❌ Icon sprite not found

---

### Step 9: Validate Configuration

**A. Validate JSON with schemas:**

```bash
# Install AJV CLI
npm install -g ajv-cli

# Validate profile.json (if you have schema)
ajv validate -s schema/geoleaf.profile.schema.json -d profiles/my-profile/profile.json

# Validate taxonomy.json
ajv validate -s schema/taxonomy.schema.json -d profiles/my-profile/taxonomy.json

# Validate themes.json
ajv validate -s schema/themes.schema.json -d profiles/my-profile/themes.json
```

**B. Test in VS Code:**

Add `$schema` reference to each file:

```json
{
  "$schema": "../../schema/taxonomy.schema.json",
  "icons": { /* ... */ }
}
```

---

## Profile Best Practices

### Naming Conventions

**Profile IDs:**
- ✅ Use lowercase with hyphens: `my-profile`
- ❌ Avoid spaces or special chars: `My Profile!`
- ✅ Be descriptive: `retail-store-locator`
- ❌ Don't be generic: `profile1`

**Category IDs:**
- ✅ Use semantic names: `restaurants`, `hotels`
- ❌ Avoid abbreviations: `rest`, `htl`
- ✅ Pluralize categories: `museums`, not `museum`
- ❌ Don't use generic names: `type1`, `category-a`

**Layer IDs:**
- ✅ Use descriptive names: `heritage-sites`, `bike-routes`
- ❌ Avoid technical names: `layer1`, `geojson-data`
- ✅ Include type if helpful: `zones-nature`, `routes-bike`

---

### Icon Sprite Optimization

**SVG Sprite Structure:**

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <symbol id="my-prefix-icon-1" viewBox="0 0 24 24">
    <path d="..." />
  </symbol>
  <symbol id="my-prefix-icon-2" viewBox="0 0 24 24">
    <path d="..." />
  </symbol>
</svg>
```

**Best Practices:**

1. **Consistent prefix:** All symbol IDs start with same prefix
   ```json
   "symbolPrefix": "my-prefix-"
   ```

2. **Standardize viewBox:** Use 24x24 for consistency
   ```xml
   viewBox="0 0 24 24"
   ```

3. **Optimize file size:**
   - Remove unnecessary groups
   - Simplify paths
   - Use SVGO: `svgo sprite.svg -o sprite.optimized.svg`

4. **Limit icon count:** 50-100 icons max per sprite
   - Split into multiple sprites if needed
   - Load sprites on-demand

5. **Use semantic names:** `hotel`, not `icon-01`

---

### Taxonomy Hierarchy

**Recommended Depth:**

```
Category (Level 1)
└── Subcategory (Level 2)
    └── ❌ DON'T GO DEEPER
```

**Why?**
- UI becomes cluttered with >2 levels
- Filter panel complexity increases
- User confusion increases

**Good Example:**

```json
{
  "categories": {
    "food": {
      "label": "Food & Drink",
      "subcategories": {
        "restaurant": { "label": "Restaurants" },
        "cafe": { "label": "Cafés" },
        "bar": { "label": "Bars" }
      }
    }
  }
}
```

**Bad Example (too deep):**

```json
{
  "categories": {
    "food": {
      "subcategories": {
        "restaurant": {
          "subcategories": {
            "italian": {
              "subcategories": {
                "pizza": {}  // ❌ Too deep!
              }
            }
          }
        }
      }
    }
  }
}
```

---

### Theme Count Recommendations

| Profile Size | Recommended Themes | Why |
|--------------|-------------------|-----|
| Small (5-10 layers) | 2-3 themes | Keep it simple |
| Medium (10-20 layers) | 3-5 themes | Balance flexibility & simplicity |
| Large (20+ layers) | 4-6 themes | Help users navigate complexity |

**Theme Strategy:**

1. **Always include "All Layers"** - Users want to see everything
2. **Create purpose-based themes** - "Heritage Sites", not "Theme A"
3. **Group related layers** - Don't scatter similar layers across themes
4. **Test switching performance** - Keep <1 second to switch

---

### Performance Considerations

#### For Large Profiles (100+ layers)

**Problem:** Slow loading, memory issues, UI lag

**Solutions:**

1. **Lazy load layers:**
   ```json
   {
     "performance": {
       "maxConcurrentLayers": 5,
       "layerLoadDelay": 300
     }
   }
   ```

2. **Use layer visibility themes strategically:**
   - Don't enable all layers by default
   - Create focused themes with 5-10 layers max

3. **Enable clustering for dense POI layers:**
   ```json
   {
     "defaultSettings": {
       "clustering": {
         "enabled": true,
         "maxClusterRadius": 80
       }
     }
   }
   ```

4. **Optimize GeoJSON:**
   - Simplify geometries (reduce precision)
   - Remove unnecessary properties
   - Use `.geojson` instead of inline JSON

5. **Split large layers:**
   - Instead of one "Restaurants" layer with 10,000 POIs
   - Create regional layers: "Restaurants Paris", "Restaurants Lyon"

---

#### For POI-heavy Profiles

**If you have 1000+ POIs:**

1. **Enable clustering** (essential)
2. **Set appropriate zoom levels:**
   ```json
   {
     "minZoom": 10,  // Don't render at country-level zoom
     "maxZoom": 19
   }
   ```

3. **Use vector tiles** (advanced) if available
4. **Implement search/filter** to narrow results

---

## Profile Migration

### v2.x to v3.0

**Key Changes:**

1. **Modular structure** - Split monolithic config
2. **New file structure** - Separate taxonomy, themes, layers
3. **Layer manager** - New UI component
4. **Profile object** - New top-level structure

**Migration Steps:**

**Before (v2.x):**

```json
{
  "pois": [ /* all POIs inline */ ],
  "categories": { /* inline taxonomy */ },
  "basemaps": { /* ... */ }
}
```

**After (v3.0):**

```
profiles/my-profile/
├── profile.json       # basemaps, UI config
├── taxonomy.json      # categories (extracted)
├── themes.json        # NEW
└── poi.json           # POIs (extracted)
```

**See:** [Refactoring v3 Guide](REFACTORING_V3_GUIDE.md) for complete migration

---

### v3.0 to v3.1

**Key Changes:**

1. **Label configuration moved** - `visibleByDefault` now in style files
2. **Breaking change** - Layer config `label.visibleByDefault` deprecated

**Migration Steps:**

**Before (v3.0) - Layer config:**

```json
{
  "layers": [
    {
      "id": "my-layer",
      "label": {
        "enabled": true,
        "visibleByDefault": true,  // ❌ DEPRECATED
        "field": "name"
      }
    }
  ]
}
```

**After (v3.1) - Style file:**

```json
{
  "id": "default",
  "label": {
    "enabled": true,
    "visibleByDefault": true,  // ✅ NOW HERE
    "field": "name"
  },
  "style": { /* ... */ }
}
```

**Automated Migration:**

```bash
# Run migration script
node scripts/migrate-label-config.cjs

# Or manually use label migrator
node scripts/add-missing-label-config.cjs
```

**See:** [Labels Migration Guide](LABELS_MIGRATION_GUIDE.md) for complete details

---

## Troubleshooting

### Profile Not Loading

**Symptom:** Blank map, console error "Profile not found"

**Causes & Solutions:**

1. **Incorrect profile ID in config**
   ```javascript
   // Check console
   console.log(GeoLeaf.Config.getActiveProfile());
   
   // Should match profile directory name
   ```

2. **Wrong profilesBasePath**
   ```json
   {
     "data": {
       "profilesBasePath": "/profiles/"  // Check this path
     }
   }
   ```

3. **profile.json syntax error**
   - Use JSON validator: https://jsonlint.com/
   - Check for trailing commas (invalid in JSON)
   - Check for missing quotes

4. **CORS issues (if using file:// protocol)**
   - Use a local web server: `npm start`
   - Or run Chrome with: `--allow-file-access-from-files`

---

### Icons Not Showing

**Symptom:** Generic markers instead of custom icons

**Causes & Solutions:**

1. **Sprite URL incorrect**
   ```json
   {
     "icons": {
       "spriteUrl": "../path/to/sprite.svg"  // Check path relative to profile.json
     }
   }
   ```

2. **Symbol ID mismatch**
   ```json
   // taxonomy.json
   "icon": "hotel"  // Must match symbol ID in sprite
   
   // sprite.svg
   <symbol id="my-prefix-hotel">  // Prefix + icon name
   ```

3. **Sprite not loading (check Network tab)**
   - 404: Incorrect spriteUrl path
   - CORS: Sprite on different domain
   - 200 but still not showing: Check symbol IDs

4. **Missing defaultIcon**
   ```json
   {
     "icons": {
       "defaultIcon": "generic"  // Fallback if icon not found
     }
   }
   ```

---

### Layers Empty

**Symptom:** Layer loads but shows 0 features

**Causes & Solutions:**

1. **Invalid GeoJSON**
   - Validate at: https://geojsonlint.com/
   - Check coordinates format: `[lng, lat]` NOT `[lat, lng]`

2. **Data outside map bounds**
   ```javascript
   // Check feature bounds
   const layer = GeoLeaf.GeoJSON.getLayerById('my-layer');
   console.log(layer.getBounds());
   ```

3. **Incorrect dataSource path**
   ```json
   {
     "dataSource": "layers/my-layer/data.geojson"  // Relative to profile root
   }
   ```

4. **Zoom level out of range**
   ```json
   {
     "minZoom": 8,   // Layer only visible at zoom 8-19
     "maxZoom": 19
   }
   ```
   - Zoom to correct level or adjust min/maxZoom

5. **Layer hidden by theme**
   - Check current theme settings
   - Verify layer ID in themes.json

---

### Themes Not Working

**Symptom:** Theme selector shows themes but switching doesn't change layers

**Causes & Solutions:**

1. **Layer IDs don't match**
   ```json
   // themes.json
   "layers": {
     "my-layer": true  // Must match layer ID exactly
   }
   
   // layers.json
   {
     "id": "my-layer"  // Must match
   }
   ```

2. **Theme persistence conflict**
   ```json
   {
     "config": {
       "persistSelection": false  // Try disabling persistence
     }
   }
   ```

3. **Cache issue**
   ```javascript
   // Clear theme cache
   localStorage.removeItem('geoleaf-theme-selection');
   location.reload();
   ```

---

### Labels Not Showing

**Symptom:** Labels configured but not appearing

**Causes & Solutions:**

1. **label.enabled = false in style**
   ```json
   {
     "label": {
       "enabled": true,  // ✅ Must be true
       "visibleByDefault": true,
       "field": "name"
     }
   }
   ```

2. **Label field missing in data**
   ```javascript
   // Check if field exists
   const layer = GeoLeaf.GeoJSON.getLayerById('my-layer');
   layer.eachLayer(feature => {
     console.log(feature.properties.name);  // Should exist
   });
   ```

3. **Zoom level below labelScale.minZoom**
   ```json
   {
     "labelScale": {
       "minZoom": 14,  // Labels only show at zoom 14+
       "maxZoom": 19
     }
   }
   ```

4. **visibleByDefault = false**
   - Click label button in Layer Manager to enable

5. **v3.0 config still in use**
   - Migrate to v3.1: [Labels Migration Guide](LABELS_MIGRATION_GUIDE.md)

---

### Performance Issues

**Symptom:** Map slow, browser hangs, high memory usage

**Causes & Solutions:**

1. **Too many layers enabled**
   ```json
   {
     "performance": {
       "maxConcurrentLayers": 5  // Limit concurrent layers
     }
   }
   ```

2. **Large GeoJSON files**
   - Simplify geometries
   - Split into regional layers
   - Use clustering for POIs

3. **No clustering for dense POI layers**
   ```json
   {
     "defaultSettings": {
       "clustering": {
         "enabled": true,
         "maxClusterRadius": 80
       }
     }
   }
   ```

4. **Too many label updates**
   - Check console for "[LabelButtonManager] Bouton créé" spam
   - Labels module should debounce updates (300ms)

5. **Memory leak from layers**
   ```javascript
   // Clear layers before switching profiles
   GeoLeaf.GeoJSON.clearAll();
   ```

---

## Related Documentation

- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - Complete JSON reference
- **[Getting Started](GETTING_STARTED.md)** - Quick 5-minute tutorial
- **[User Guide](USER_GUIDE.md)** - Using GeoLeaf features
- **[Examples](../examples/README.md)** - Working profile examples
- **[Schema Documentation](../schema/README.md)** - JSON Schema validation
- **[Labels Migration Guide](LABELS_MIGRATION_GUIDE.md)** - v3.0 to v3.1 migration

---

## Support

For help with profile creation:

1. **Check examples:** [examples/](../examples/) directory has complete working profile
2. **Review built-in profiles:** Tourism in `profiles/` directory
3. **Validate your JSON:** Use JSON Schema validation
4. **Enable debug mode:** See detailed logs in console
5. **Open an issue:** [GitHub Issues](https://github.com/yourusername/geoleaf-js/issues)

---

**Last Updated:** January 23, 2026  
**GeoLeaf Version:** 3.2.0
