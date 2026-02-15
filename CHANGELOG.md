# Changelog

All notable changes to GeoLeaf will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.2.0] - 2026-02-01

### Security (Phase 1)

- **XSS prevention in filter-panel**: Escaped all dynamic values (`catId`, `cat.label`, `subId`, `sub.label`, `tag`) in `_buildCategoryTreeContent` and `_buildTagsListContent` using a new `esc()` helper based on `GeoLeaf.Security.escapeHtml`
- **Safe DOM fallback in dom-security.js**: Changed `setSafeHTML` fallback from `innerHTML` to `textContent` to prevent injection
- **Safe error rendering in filter-panel/renderer.js**: Replaced `innerHTML + err.message` with safe DOM creation using `textContent`
- **Fixed escapeHtml fallbacks**: Both `notifications.js._escapeHtml` and `content-builder.js.getEscapeHtml` fallbacks now use proper regex escaping instead of identity functions

### Changed (Phase 2 — Code Hygiene)

- **CI enforcement**: All 4 quality gates (`ESLint`, `Prettier`, `coverage threshold`, `security lint`) now fail the build on error (`continue-on-error: false`)
- **var → let/const**: Migrated remaining `var` declarations in `sidepanel.js` and `layer-manager/renderer.js`
- **Production log stripping**: Terser now strips `console.log` and `console.debug` via `pure_funcs` in rollup.config.mjs
- **Pre-commit hooks**: Added Husky + lint-staged configuration (ESLint + Prettier on staged files)

### Removed (Phase 2)

- `src/static/js/main.js` — deprecated loader (replaced by `bundle-entry.js`)
- `src/static/js/ui/early-loader.js` — deprecated spinner (marked `@deprecated`)
- `src/static/js/utils/format-utils.js` — consolidated into `formatters.js`

### Refactored (Phase 3 — Large File Splits)

Split 6 monolithic files (total ~5,900 lines) into 23 focused sub-modules:

- **`geojson/layer-manager.js`** (1,581 → 4 files): `store.js`, `visibility.js`, `style.js`, `integration.js`
- **`geojson/loader.js`** (918 → 4 files): `config-helpers.js`, `data.js`, `single-layer.js`, `profile.js`
- **`themes/theme-applier.js`** (862 → 4 files): `core.js`, `visibility.js`, `deferred.js`, `ui-sync.js`
- **`geoleaf.config.js`** (830 → 4 files): `config-core.js`, `config-validation.js`, `config-loaders.js`, `config-accessors.js`
- **`geoleaf.app.js`** (758 → 3 files): `helpers.js`, `init.js`, `boot.js`
- **`storage/cache/layer-selector.js`** (1,030 → 4 files): `core.js`, `data-fetching.js`, `row-rendering.js`, `selection-cache.js`

### Fixed

- **Bug in `updateLayerZIndex`**: Added missing `const newPane = state.map.getPane(newPaneName)` declaration that caused `newPane` to be undefined

---

## [3.1.0] - 2026-01-23

### Added

**Documentation (35+ files, 25,000+ lines):**
- Created comprehensive documentation suite covering all aspects of GeoLeaf
- [INDEX.md](docs/INDEX.md) - Master documentation index with quick navigation
- [GETTING_STARTED.md](docs/GETTING_STARTED.md) - 5-minute quick start guide
- [USER_GUIDE.md](docs/USER_GUIDE.md) - Complete user documentation (10 sections)
- [CONFIGURATION_GUIDE.md](docs/CONFIGURATION_GUIDE.md) - JSON configuration reference (9 types)
- [PROFILES_GUIDE.md](docs/PROFILES_GUIDE.md) - Custom profile creation guide (1,200+ lines)
- [API_REFERENCE.md](docs/API_REFERENCE.md) - Complete API documentation (1,900+ lines, 80+ methods)
- [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) - Development workflow and architecture (11,700+ lines)
- [LABELS_MIGRATION_GUIDE.md](docs/LABELS_MIGRATION_GUIDE.md) - Label system migration guide
- [DEMO_SYSTEM_GUIDE.md](docs/DEMO_SYSTEM_GUIDE.md) - Demo page and DemoLog API documentation
- [ARCHITECTURE_GUIDE.md](docs/ARCHITECTURE_GUIDE.md) - System architecture and design patterns

**JSON Schemas (7 schemas):**
- [style.schema.json](schema/style.schema.json) - Style file validation with conditional label rules
- [taxonomy.schema.json](schema/taxonomy.schema.json) - Taxonomy validation (categories/subcategories)
- [themes.schema.json](schema/themes.schema.json) - Theme validation (light/dark presets)
- [layers.schema.json](schema/layers.schema.json) - Layer configuration validation
- [mapping.schema.json](schema/mapping.schema.json) - POI to layer mapping validation
- [basemaps.schema.json](schema/basemaps.schema.json) - Basemap provider validation
- [geoleaf-config.schema.json](schema/geoleaf-config.schema.json) - Main config validation
- [schema/README.md](schema/README.md) - Schema usage guide

**Examples (complete profiles):**
- [examples/](examples/) - Complete working examples for Tourism profile
- Example JSON files for all configuration types
- Sample GeoJSON data files
- Style preset examples with label configurations

**Label System:**
- New `label.visibleByDefault` configuration in style files
- Scale-based label visibility controls
- Dynamic label field rendering
- Label toggle buttons in layer manager
- Debounced label updates (300ms) for performance

**Performance Optimizations:**
- Aggressive tree-shaking (moduleSideEffects: false) - 75.7% bundle size reduction
- Terser minification with 3 compression passes
- Bundle size tracking (visualizer + filesize plugins)
- Debounced updates (250ms label button, 300ms non-critical)
- Lazy layer loading (maxConcurrentLoads: 10, layerLoadDelay: 200ms)
- Clustering threshold (50 POIs) for marker clustering

**Security Enhancements:**
- XSS protection via `GeoLeaf.Security.escapeHtml()`
- URL validation with protocol whitelist
- POI property sanitization
- Content Security Policy (CSP) support in demo
- Input validation before DOM insertion

**TypeScript Support:**
- Complete TypeScript definitions (772 lines in index.d.ts)
- API interfaces for all modules
- Type definitions for events, errors, validators

### Changed

**Breaking Changes:**
- **Label configuration moved** from `layers.json` to `style/*.json` files
  - Old: `layers.json` → `layers[].label.visibleByDefault`
  - New: `styles/*.json` → `label.visibleByDefault`
  - See [LABELS_MIGRATION_GUIDE.md](docs/LABELS_MIGRATION_GUIDE.md) for migration steps

**Documentation Structure:**
- Standardized naming conventions (UPPERCASE_GUIDE.md for main guides)
- Moved `readme.architecture.md` → `ARCHITECTURE_GUIDE.md`
- Updated all internal links across 35+ documentation files
- Fixed broken links in COOKBOOK.md and FAQ.md

**Build Pipeline:**
- Updated Rollup configuration (Sprint 7.1 optimizations)
- Entry point: `src/static/js/geoleaf.api.js` (aggregates all modules)
- External dependencies: Leaflet 1.9.4 + leaflet.markercluster 1.5.3
- UMD output: `dist/geoleaf.umd.js` (dev) + `dist/geoleaf.min.js` (prod)
- Sourcemaps enabled for both dev and production bundles

**Testing:**
- Increased coverage threshold from baseline to 70% (all metrics)
- Target: 80% coverage post-refactoring
- Added 150+ unit tests with Jest + jsdom
- E2E tests with Playwright
- Coverage reports: text, lcov, html

### Fixed

- Label button synchronization issues when switching themes
- Label visibility not respecting `visibleByDefault` configuration
- Memory leaks in layer manager during rapid theme switching
- Build warnings for unused imports
- Documentation links pointing to renamed/moved files
- PROJECT_TREE.md accuracy issues (6 corrections)

### Deprecated

- **Legacy label configuration** in `layers.json` (v2.x style)
  - Still supported in v3.0 for backward compatibility
  - Will be removed in v4.0
  - Use `label.visibleByDefault` in style files instead

### Security

- Added XSS protection throughout application
- Implemented input sanitization for user-provided data
- Added URL validation for external resources
- Content Security Policy (CSP) headers in demo
- Secure cookie handling for cache storage

### Performance

- **Bundle size:** Reduced from ~500KB to ~120KB minified (75.7% reduction)
- **Gzipped:** ~35KB (Brotli: ~28KB)
- **Map initialization:** <100ms
- **POI rendering (100 items):** <50ms
- **Layer switching:** <200ms
- **Label updates:** <30ms (debounced)

---

## [3.0.0] - 2025-12-15

### Added

- Multi-profile system (Tourism, Custom…)
- Dynamic theme system (light/dark)
- Advanced POI management with clustering
- GeoJSON layer system with multiple style presets
- Offline cache with IndexedDB
- Filter panel with category/tag/search
- Data table view with CSV export
- Event-driven architecture
- Toast notification system
- Security layer with XSS protection

### Changed

- Complete rewrite from v2.x
- Modular architecture (200+ modules)
- JSON-based configuration system
- UMD bundle format
- Modern ES6+ syntax

### Breaking Changes

- Complete API redesign (not compatible with v2.x)
- New configuration format (JSON profiles)
- Changed initialization method
- Removed jQuery dependency

---

## [2.5.0] - 2025-06-10

### Added

- Basic profile system
- Simple theme switching
- POI categories
- Basic filtering

### Fixed

- Map rendering issues in Safari
- Memory leaks in layer switching
- Z-index conflicts

---

## [2.0.0] - 2024-12-01

### Added

- Initial public release
- Basic Leaflet integration
- POI markers
- Simple layer management
- Configuration via JavaScript objects

---

## Version History Summary

| Version | Release Date | Key Features | Breaking Changes |
|---------|--------------|--------------|------------------|
| 3.1.0 | 2026-01-23 | Labels system, comprehensive docs, 75.7% smaller bundle, XSS protection | Label config location |
| 3.0.0 | 2025-12-15 | Multi-profile system, themes, complete rewrite | Complete API redesign |
| 2.5.0 | 2025-06-10 | Basic profiles, themes | None |
| 2.0.0 | 2024-12-01 | Initial release | N/A |

---

## Upgrade Guides

### Upgrading to 3.1.0 from 3.0.0

**Label Configuration:**
1. Move `label.visibleByDefault` from `layers.json` to style files
2. Update style files for each layer
3. Test label visibility after migration
4. See [LABELS_MIGRATION_GUIDE.md](docs/LABELS_MIGRATION_GUIDE.md)

**Example:**
```json
// Before (v3.0): layers.json
{
  "layers": [
    {
      "id": "parks",
      "label": {
        "enabled": true,
        "visibleByDefault": true  // ❌ Old location
      }
    }
  ]
}

// After (v3.1): styles/default.json
{
  "label": {
    "enabled": true,
    "visibleByDefault": true  // ✅ New location
  }
}
```

### Upgrading to 3.0.0 from 2.x

**Complete migration required:**
1. Update configuration format (JS objects → JSON profiles)
2. Update initialization code (new API)
3. Update POI management calls (new methods)
4. Update event handling (new event system)
5. Remove jQuery dependency
6. Test thoroughly

Not backward compatible. See v3.0.0 migration guide (archived).

---

## Release Notes

### v3.1.0 Documentation Release

This release focuses on **comprehensive documentation** to make GeoLeaf accessible to all users:

**For New Users:**
- 5-minute quick start guide
- Complete user guide with screenshots
- Step-by-step configuration tutorials

**For Integrators:**
- Complete API reference (80+ methods)
- JSON schema validation
- Working examples for 3 business profiles

**For Developers:**
- Development workflow guide
- Architecture documentation
- Testing and contribution guidelines

**For Business Users:**
- Profile creation guide
- Custom taxonomy setup
- Theme customization

**Quality Improvements:**
- 75.7% smaller production bundle
- XSS protection throughout
- 70% test coverage (target 80%)
- TypeScript definitions

---

## Links

- **Documentation:** [docs/INDEX.md](docs/INDEX.md)
- **GitHub:** https://github.com/yourusername/geoleaf-js
- **npm:** https://www.npmjs.com/package/geoleaf
- **Issues:** https://github.com/yourusername/geoleaf-js/issues

---

## Contributors

Thank you to all contributors who made this release possible!

- Lead Developer: [Your Name]
- Documentation: [Contributors]
- Testing: [Contributors]
- Code Review: [Contributors]

See [CONTRIBUTORS.md](CONTRIBUTORS.md) for full list.

---

<p align="center">
  GeoLeaf • Open Source Mapping Platform<br>
  MIT License • Made with ❤️ for the geospatial community
</p>
