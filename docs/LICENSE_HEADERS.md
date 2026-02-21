# License Headers in GeoLeaf

Product Version: GeoLeaf Platform V1  

This guide explains how license headers are used in GeoLeaf and how to add them to new files.

---

## Standard MIT License Header

All JavaScript files in GeoLeaf Core should include the following header at the top of the file, before any code:

```javascript
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */
```

### Format Rules

1. **Placement**: Header must be the **first thing** in the file, before all other code and comments
2. **Format**: Use the exact JSDoc-style format shown above
3. **No variations**: Keep the copyright and URL consistent across all files
4. **One per file**: Add only one license header at the top

---

## Implementation Guide

### Step 1: Verify File Type

- ✅ Add headers to all `.js` files in `src/`
- ✅ Add headers to all `.mjs` files in `src/`
- ❌ Do NOT add headers to:
  - Minified files (`.min.js`)
  - Configuration files (`.json`, `.config.js` used only for bundling)
  - Test files (use same header for consistency)

### Step 2: Insert at Top of File

**Before:**
```javascript
/**
 * Module description...
 */
const myVar = 1;
```

**After:**
```javascript
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * Module description...
 */
const myVar = 1;
```

---

## File Categories

### Category 1: Core Framework (CRITICAL)

These files are essential to GeoLeaf's core functionality:

- `src/bundle-entry.js` - UMD bundle entry point
- `src/app/` - Application bootstrap (helpers.js, init.js, boot.js)
- `src/static/js/core/geoleaf.map.js` - Map initialization
- `src/static/js/config/geoleaf-config/` - Configuration system (4 sous-modules)
- `src/static/js/geoleaf.logger.js` - Logging system
- `src/static/js/geoleaf.security.js` - Security framework
- `src/static/js/geoleaf.utils.js` - Core utilities
- `src/static/js/geoleaf.constants.js` - Global constants
- `src/static/js/geoleaf.errors.js` - Error definitions
- `src/static/js/geoleaf.validators.js` - Validation system

**Action**: Add headers immediately and verify in all releases.

### Category 2: Feature Modules (HIGH PRIORITY)

These files implement major GeoLeaf features:

- `src/static/js/ui/geoleaf.ui.js` - UI system
- `src/static/js/poi/geoleaf.poi.js` - Points of Interest
- `src/static/js/baselayers/geoleaf.baselayers.js` - Basemap switching
- `src/static/js/geojson/core.js` - GeoJSON support
- `src/static/js/route/geoleaf.route.js` - Routing
- `src/static/js/storage/geoleaf.storage.js` - Offline caching
- `src/static/js/layer-manager/geoleaf.layermanager.js` - Layer management
- `src/static/js/legend/geoleaf.legend.js` - Legend system
- `src/static/js/table/geoleaf.table.js` - Data table
- `src/static/js/filters/geoleaf.filters.js` - Filtering system

**Action**: Add headers in first pass after core files.

### Category 3: Subsystems (MEDIUM PRIORITY)

These are subdirectory modules that support features:

- `src/static/js/ui/content-builder/*` - Content builder (v1.0.0)
- `src/static/js/storage/*` - Cache management subsystem
- `src/static/js/poi/*` - POI subsystem (popup, markers, etc.)
- `src/static/js/config/*` - Configuration subdirectory
- `src/static/js/loaders/*` - Resource loaders
- And other organized subsystems

**Action**: Add headers in second pass after Category 1 and 2.

### Category 4: Utilities and Helpers (LOWER PRIORITY)

General utility files that support the framework:

- `src/static/js/utils/*` - General utilities (100+ files)
- `src/static/js/helpers/*` - Helper modules
- `src/static/js/validators/*` - Validation rules
- `src/static/js/security/*` - Security utilities

**Action**: Add headers when refactoring or on request; not blocking.

---

## Future Modules Policy

When GeoLeaf creates new modules under different licenses:

1. **Keep Core headers unchanged** - Core remains MIT with current header
2. **Use module-specific headers** - Future modules should clearly indicate their own license
3. **Document separately** - Future modules should be in separate directories with separate license files
4. **Maintain distinction** - Ensure users understand Core vs. Module differences

Example future module header:
```javascript
/*!
 * GeoLeaf [ModuleName]
 * © 2026 Mattieu Pottier
 * Released under the [License Name]
 * https://geoleaf.dev/[module-path]
 */
```

---

## Contributing

When contributing new files to GeoLeaf Core:

1. ✅ Add the standard MIT license header to all new `.js` and `.mjs` files
2. ✅ Ensure header is at the very top, before all other content
3. ✅ Do not modify or remove existing headers
4. ✅ For non-Core modules, coordinate with maintainers about appropriate headers

---

## Verification

To verify headers are correctly applied:

```bash
# Check if a file has a license header
grep -l "GeoLeaf Core" src/static/js/geoleaf.logger.js

# Find all files without headers (in a specific directory)
find src/static/js -name "*.js" ! -exec grep -l "GeoLeaf Core" {} \;
```

---

## Questions?

See [NOTICE.md](./NOTICE.md) for more information about licensing, or [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.
