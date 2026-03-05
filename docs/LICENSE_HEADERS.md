# License Headers in GeoLeaf

Product Version: GeoLeaf Platform V1

This guide explains how license headers are used in GeoLeaf and how to add them to new files.

Core sources are under `src/` (JavaScript). Paths below are relative to the repository root.

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

- `src/bundle-entry.ts` - UMD bundle entry point
- `src/app/` - Application bootstrap
- `src/modules/core/` - Map initialization
- `src/modules/config/` - Configuration system
- `src/modules/log/` - Logging
- `src/modules/security/` - Security framework
- `src/modules/utils/` - Core utilities
- `src/modules/constants/` - Global constants
- `src/modules/errors/` - Error definitions
- `src/modules/validators/` - Validation system

**Action**: Add headers immediately and verify in all releases.

### Category 2: Feature Modules (HIGH PRIORITY)

These files implement major GeoLeaf features:

- `src/modules/ui/` - UI system
- `src/modules/poi/` - Points of Interest
- `src/modules/baselayers/` - Basemap switching
- `src/modules/geojson/` - GeoJSON support
- `src/modules/route/` - Routing
- `src/modules/storage/` - Offline caching
- `src/modules/layer-manager/` - Layer management
- `src/modules/legend/` - Legend system
- `src/modules/table/` - Data table
- `src/modules/filters/` - Filtering system

**Action**: Add headers in first pass after core files.

### Category 3: Subsystems (MEDIUM PRIORITY)

These are subdirectory modules that support features:

- `src/modules/ui/` - Content builder, panels
- `src/modules/storage/` - Cache management
- `src/modules/poi/` - POI subsystem
- `src/modules/config/` - Configuration
- `src/modules/loaders/` - Resource loaders

**Action**: Add headers in second pass after Category 1 and 2.

### Category 4: Utilities and Helpers (LOWER PRIORITY)

General utility files that support the framework:

- `src/modules/utils/` - General utilities
- `src/modules/helpers/` - Helper modules
- `src/modules/validators/` - Validation rules
- `src/modules/security/` - Security utilities

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

1. ✅ Add the standard MIT license header to all new `.ts` and `.js` files in `src/`
2. ✅ Ensure header is at the very top, before all other content
3. ✅ Do not modify or remove existing headers
4. ✅ For non-Core modules, coordinate with maintainers about appropriate headers

---

## Verification

To verify headers are correctly applied:

```bash
# Check if a file has a license header
grep -l "GeoLeaf Core" src/modules/log/*.js

# Find all TS/JS files without headers (in core)
find src -name "*.js" | xargs -I {} sh -c 'grep -L "GeoLeaf Core" "{}" 2>/dev/null'
```

---

## Questions?

See [NOTICE.md](./NOTICE.md) for more information about licensing, or [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.
