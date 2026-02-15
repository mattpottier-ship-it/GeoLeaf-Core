# GeoLeaf Documentation Index

**Version:** 3.2.0  
**Last Updated:** February 14, 2026

Welcome to the GeoLeaf documentation! This index provides quick access to all documentation resources organized by category.

---

## 📚 Table of Contents

- [Getting Started](#getting-started)
- [User Documentation](#user-documentation)
- [Developer Documentation](#developer-documentation)
- [Configuration & Setup](#configuration--setup)
- [API Reference](#api-reference)
- [Migration Guides](#migration-guides)
- [Module Documentation](#module-documentation)
- [Examples & Recipes](#examples--recipes)
- [Architecture & Design](#architecture--design)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

Start here if you're new to GeoLeaf!

| Document | Description | Audience |
|----------|-------------|----------|
| [README](../README.md) | Project overview and quick start | Everyone |
| [Getting Started Guide](GETTING_STARTED.md) | Your first map in 5 minutes | New users |
| [User Guide](USER_GUIDE.md) | Complete feature documentation | End users |
| [Installation Guide](guides/DISTRIBUTION_GUIDE_2026.md) | NPM, CDN, build from source | Integrators |

**Quick links:**
- 🎯 First time? → [Getting Started Guide](GETTING_STARTED.md)
- 🗺️ Need a feature? → [User Guide](USER_GUIDE.md)
- 💻 Want to integrate? → [API Reference](API_REFERENCE.md)
- 🛠️ Want to contribute? → [Developer Guide](DEVELOPER_GUIDE.md)

---

## 👥 User Documentation

Documentation for end users and integrators.

| Document | Description | Level |
|----------|-------------|-------|
| [User Guide](USER_GUIDE.md) | Complete feature guide with screenshots | Beginner |
| [Configuration Guide](CONFIGURATION_GUIDE.md) | JSON configuration reference (9 types) | Intermediate |
| [Profiles Guide](PROFILES_GUIDE.md) | Create custom business profiles | Advanced |
| [Cookbook](COOKBOOK.md) | Practical recipes and solutions | All levels |
| [FAQ](FAQ.md) | Frequently asked questions | All levels |
| [CDN Usage Guide](usage-cdn.md) | Using GeoLeaf via CDN | Beginner |

**Topics covered:**
- Map initialization and configuration
- POI management (add, edit, delete)
- GeoJSON layer loading and styling
- Labels system and visibility controls
- Theme switching (light/dark)
- Filters and search
- Offline cache and performance
- Security and XSS protection

---

## 💻 Developer Documentation

Documentation for contributors and advanced developers.

| Document | Description | Level |
|----------|-------------|-------|
| [Developer Guide](DEVELOPER_GUIDE.md) | Complete development workflow | Advanced |
| [API Reference](API_REFERENCE.md) | Complete API documentation (80+ methods) | All levels |
| [Contributing Guide](CONTRIBUTING.md) | Contribution guidelines and standards | Contributors |
| [Project Tree](PROJECT_TREE.md) | Complete project structure | All levels |
| [Architecture Guide](ARCHITECTURE_GUIDE.md) | System architecture and design | Advanced |
| [Demo System Guide](DEMO_SYSTEM_GUIDE.md) | Demo page and DemoLog API | Developers |

**Topics covered:**
- Development environment setup
- Build pipeline (Rollup, Terser, PostCSS)
- Testing (Jest, Playwright, 150+ tests)
- Code style (ESLint, Prettier, JSDoc)
- Branch strategy and PR process
- Module system and event bus
- Performance optimization
- Release process (SemVer, npm publish)

---

## ⚙️ Configuration & Setup

Configuration files and setup documentation.

| Document | Description | JSON Types |
|----------|-------------|------------|
| [Configuration Guide](CONFIGURATION_GUIDE.md) | Complete JSON reference | 9 types |
| [Profiles Guide](PROFILES_GUIDE.md) | Profile structure and creation | profile.json |
| [JSON Schemas](../schema/README.md) | Validation schemas for all config files | 7 schemas |
| [Examples](../examples/README.md) | Complete working examples | Tourism, Custom… |

**Configuration types:**
1. **geoleaf.config.json** - Main application config
2. **profile.json** - Profile metadata and UI settings
3. **taxonomy.json** - Category/subcategory structure
4. **themes.json** - Theme definitions (light/dark)
5. **layers.json** - Layer configurations
6. **mapping.json** - POI to layer mapping
7. **style/*.json** - Layer style files with labels
8. **basemaps.json** - Basemap tile providers
9. **layers.geojson** - GeoJSON data files

**JSON Schema validation:**
- [style.schema.json](../schema/style.schema.json) - Style file validation
- [taxonomy.schema.json](../schema/taxonomy.schema.json) - Taxonomy validation
- [themes.schema.json](../schema/themes.schema.json) - Theme validation
- [layers.schema.json](../schema/layers.schema.json) - Layer config validation
- [mapping.schema.json](../schema/mapping.schema.json) - Mapping validation
- [basemaps.schema.json](../schema/basemaps.schema.json) - Basemap validation
- [geoleaf-config.schema.json](../schema/geoleaf-config.schema.json) - Main config validation

---

## 📖 API Reference

Complete API documentation with examples.

| Document | APIs Covered | Methods |
|----------|--------------|---------|
| [API Reference](API_REFERENCE.md) | All public APIs | 80+ methods |

**API Categories:**
- **Core API** - `init()`, `getMap()`, `destroy()`
- **POI API** - `add()`, `update()`, `remove()`, `filter()`, `import()`
- **GeoJSON API** - `load()`, `add()`, `remove()`, `setLayerVisibility()`
- **Labels API** - `enable()`, `disable()`, `toggle()`, `setLabelField()`
- **Theme API** - `setActive()`, `getCurrent()`, `getAll()`, `create()`
- **Basemap API** - `setActive()`, `getCurrent()`, `getAll()`
- **Filters API** - `apply()`, `clear()`, `get()`
- **Cache API** - `save()`, `load()`, `clear()`, `getSize()`
- **Toast API** - `success()`, `error()`, `warning()`, `info()`
- **Config API** - `switchProfile()`, `get()`, `set()`, `getActiveProfile()`
- **Events API** - `on()`, `off()`, `once()`, `emit()` (15 events)
- **Security API** - `escapeHtml()`, `validateUrl()`, `sanitizePoiProperties()`
- **Errors API** - 11 error classes with context
- **Validators API** - `validateCoordinates()`, `validateRequiredFields()`
- **Helpers API** - `debounce()`, `throttle()`, `deepClone()`

**TypeScript support:**
- [index.d.ts](../index.d.ts) - TypeScript definitions (772 lines)

---

## 🔄 Migration Guides

Upgrade guides for breaking changes.

| Document | Versions | Breaking Changes |
|----------|----------|-----------------|
| [Labels Migration Guide](LABELS_MIGRATION_GUIDE.md) | v2.x → v3.0 → v3.1 | label.visibleByDefault config |

**Migration topics:**
- Label configuration moved from layers.json to style/*.json
- `label.visibleByDefault` property usage
- Backward compatibility (v3.0 → v3.1)
- Testing and validation
- Common errors and solutions

---

## 🧩 Module Documentation

Deep-dive documentation for individual modules.

### Core Modules

| Module | Description | Key Features |
|--------|-------------|--------------|
| [Core](core/GeoLeaf_Core_README.md) | Map initialization | Leaflet setup, events |
| [Configuration](config/GeoLeaf_Config_README.md) | Profile loading | JSON parsing, validation |
| [Storage](storage/GeoLeaf_Storage_README.md) | Offline cache | IndexedDB, TTL, compression |

### Data Modules

| Module | Description | Key Features |
|--------|-------------|--------------|
| [POI](poi/GeoLeaf_POI_README.md) | Points of Interest | Add/Edit/Delete, clustering |
| [GeoJSON](geojson/GEOJSON_LAYERS_GUIDE.md) | Vector layers | Loading, styling, events |
| [Loaders](loaders/GeoLeaf_Loaders_README.md) | Data loading | Async loading, caching |

### UI Modules

| Module | Description | Key Features |
|--------|-------------|--------------|
| [UI Components](ui/GeoLeaf_UI_README.md) | User interface | Panels, buttons, modals |
| [Labels](labels/GeoLeaf_Labels_README.md) | Map labels | Dynamic labels, visibility |
| [Legend](legend/GeoLeaf_Legend_README.md) | Layer legend | Icons, categories |
| [Themes](themes/GeoLeaf_Themes_README.md) | Theme system | Light/dark, presets |
| [Baselayers](baselayers/GeoLeaf_Baselayers_README.md) | Basemap switching | OSM, Satellite, terrain |

### Feature Modules

| Module | Description | Key Features |
|--------|-------------|--------------|
| [Filters](filters/GeoLeaf_Filters_README.md) | Data filtering | Category, tag, search |
| [Route](route/GeoLeaf_Route_README.md) | Routing | Directions, waypoints |
| [Table](table/GeoLeaf_Table_README.md) | Data table | Sortable, exportable |
| [Markers](markers/GeoLeaf_Markers_README.md) | Custom markers | Icons, clustering |

### Utility Modules

| Module | Description | Key Features |
|--------|-------------|--------------|
| [Helpers](helpers/GeoLeaf_Helpers_README.md) | Utility functions | Debounce, throttle, clone |
| [Validators](validators/GeoLeaf_Validators_README.md) | Input validation | Coordinates, GeoJSON |
| [Security](security/GeoLeaf_Security_README.md) | XSS protection | Sanitization, CSP |
| [Constants](constants/GeoLeaf_Constants_README.md) | App constants | Config values |
| [Utils](utils/GeoLeaf_Utils_README.md) | Utilities | DOM, array, object helpers |

---

## 📚 Examples & Recipes

Practical examples and code snippets.

| Document | Description | Topics |
|----------|-------------|--------|
| [Cookbook](COOKBOOK.md) | Practical recipes | Common tasks, solutions |
| [Examples](../examples/README.md) | Working examples | Tourism, Custom… |

**Example profiles:**
- **Tourism** - 35+ layers (parks, museums, routes)
- **Custom** - Build your own profile for any domain

**Example files:**
- [geoleaf.config.json](../examples/geoleaf.config.json)
- [profile.json](../examples/profile.json)
- [taxonomy.json](../examples/taxonomy.json)
- [themes.json](../examples/themes.json)
- [layers.json](../examples/layers.json)
- [mapping.json](../examples/mapping.json)
- [style-example.json](../examples/style-example.json)

---

## 🏗️ Architecture & Design

System architecture and design documentation.

| Document | Description | Topics |
|----------|-------------|--------|
| [Architecture Guide](ARCHITECTURE_GUIDE.md) | System architecture | Modules, patterns, design |
| [Developer Guide](DEVELOPER_GUIDE.md) | Development architecture | Build, test, deploy |
| [Performance Guide](performance/PERFORMANCE_GUIDE.md) | Optimization | Clustering, lazy loading |

**Architecture topics:**
- IIFE module pattern
- Event-driven architecture
- State management
- Storage layer (IndexedDB)
- Security layer (XSS protection)
- Build pipeline (Rollup, tree-shaking)
- Performance optimization

---

## 🐛 Troubleshooting

Help and debugging resources.

| Document | Description | Solutions |
|----------|-------------|-----------|
| [FAQ](FAQ.md) | Common questions | Answers & workarounds |
| [Developer Guide](DEVELOPER_GUIDE.md#getting-help) | Dev troubleshooting | Build/test issues |
| [Labels Migration Guide](LABELS_MIGRATION_GUIDE.md#troubleshooting) | Label errors | Config fixes |

**Common issues:**
- Build failures → Clean install
- Test failures → Clear cache
- Label visibility → Check visibleByDefault
- Performance → Enable clustering
- Security errors → Check CSP headers

---

## 🔍 Quick Reference

### File Paths

**Main configuration:**
- Root config: `geoleaf.config.json`
- Profile metadata: `profiles/{profile}/profile.json`

**Profile structure:**
```
profiles/{profile}/
├── profile.json          # Metadata & UI settings
├── taxonomy.json         # Categories/subcategories
├── themes.json           # Light/dark themes
├── layers.json           # Layer configurations
├── mapping.json          # POI to layer mapping
├── basemaps.json         # Basemap providers
├── layers/               # Layer-specific configs
│   └── {layerId}/
│       ├── data.geojson  # GeoJSON data
│       └── styles/
│           ├── default.json  # Default style
│           └── alt.json      # Alternative style
└── ui/                   # UI customizations
```

### Key Concepts

**Profile** - Business context (Tourism, Custom…) with:
- Taxonomy (categories/subcategories)
- Themes (light/dark presets)
- Layers (GeoJSON data and styles)
- UI configuration

**Layer** - GeoJSON layer with:
- Data file (data.geojson)
- Multiple style presets
- Label configuration
- Visibility settings

**Style** - Visual appearance with:
- Color, weight, opacity
- Icons and markers
- Label configuration (new in v3.1)
- Conditional rules

**Theme** - UI preset with:
- Layer visibility defaults
- Basemap selection
- Color scheme

### npm Commands

```bash
# Development
npm start                  # Dev server
npm run build:watch        # Watch mode

# Building
npm run build              # Build JS
npm run build:css          # Build CSS
npm run build:all          # Build everything

# Testing
npm test                   # Smoke test
npm run test:jest          # Unit tests
npm run test:coverage      # Coverage report
npm run test:e2e           # E2E tests

# Quality
npm run lint               # Lint code
npm run lint:fix           # Auto-fix
npm run format             # Format code

# Release
npm run prepublishOnly     # Full pipeline
```

---

## 📞 Getting Help

**Documentation issues?**
- Missing information → [Open GitHub issue](https://github.com/yourusername/geoleaf-js/issues)
- Unclear documentation → [Open discussion](https://github.com/yourusername/geoleaf-js/discussions)

**Technical questions?**
- Check [FAQ](FAQ.md) first
- Search [closed issues](https://github.com/yourusername/geoleaf-js/issues?q=is%3Aissue+is%3Aclosed)
- Ask in [Discussions](https://github.com/yourusername/geoleaf-js/discussions)

**Found a bug?**
- Check [existing issues](https://github.com/yourusername/geoleaf-js/issues)
- Create [new issue](https://github.com/yourusername/geoleaf-js/issues/new) with reproduction steps

**Want to contribute?**
- Read [Contributing Guide](CONTRIBUTING.md)
- Check [open issues](https://github.com/yourusername/geoleaf-js/issues)
- Submit a pull request

---

## 📊 Documentation Statistics

**Total documentation files:** 35+  
**Total lines:** 25,000+  
**Last major update:** v3.2.0 (January 2026)

**Coverage:**
- ✅ Getting started guides (3 files)
- ✅ User documentation (6 files)
- ✅ Developer documentation (5 files)
- ✅ API reference (1 file, 80+ methods)
- ✅ Module documentation (20+ modules)
- ✅ Configuration guides (7 JSON schemas)
- ✅ Migration guides (1 file)
- ✅ Examples (3 complete profiles)

---

## 🗺️ Documentation Roadmap

### v3.2 (Q2 2026)
- [ ] Video tutorials
- [ ] Interactive API playground
- [ ] More cookbook recipes
- [ ] Localization guides (i18n)

### v4.0 (Q4 2026)
- [ ] TypeScript migration guide
- [ ] Plugin development guide
- [ ] 3D visualization examples
- [ ] Cloud integration tutorials

---

<p align="center">
  <strong>GeoLeaf Documentation</strong><br>
  Version 3.2.0 • January 2026
</p>
