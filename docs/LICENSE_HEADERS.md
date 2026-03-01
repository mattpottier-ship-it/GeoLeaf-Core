# License Headers in GeoLeaf

Product Version: GeoLeaf Platform V1

This guide explains how license headers are used in GeoLeaf and how to add them to new files.

**Monorepo:** Core sources are under `packages/core/src/` (TypeScript). Paths below are logical; prefix with `packages/core/src/` to locate files in the repo.

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

- ✅ Add headers to all `.ts` / `.js` files in `packages/core/src/`
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

- `packages/core/src/bundle-entry.ts` - UMD bundle entry point
- `packages/core/src/app/` - Application bootstrap
- `packages/core/src/modules/core/` - Map initialization
- `packages/core/src/modules/config/` - Configuration system
- `packages/core/src/modules/log/` - Logging
- `packages/core/src/modules/security/` - Security framework
- `packages/core/src/modules/utils/` - Core utilities
- `packages/core/src/modules/constants/` - Global constants
- `packages/core/src/modules/errors/` - Error definitions
- `packages/core/src/modules/validators/` - Validation system

**Action**: Add headers immediately and verify in all releases.

### Category 2: Feature Modules (HIGH PRIORITY)

These files implement major GeoLeaf features:

- `packages/core/src/modules/ui/` - UI system
- `packages/core/src/modules/poi/` - Points of Interest
- `packages/core/src/modules/baselayers/` - Basemap switching
- `packages/core/src/modules/geojson/` - GeoJSON support
- `packages/core/src/modules/route/` - Routing
- `packages/core/src/modules/storage/` - Offline caching
- `packages/core/src/modules/layer-manager/` - Layer management
- `packages/core/src/modules/legend/` - Legend system
- `packages/core/src/modules/table/` - Data table
- `packages/core/src/modules/filters/` - Filtering system

**Action**: Add headers in first pass after core files.

### Category 3: Subsystems (MEDIUM PRIORITY)

These are subdirectory modules that support features:

- `packages/core/src/modules/ui/` - Content builder, panels
- `packages/core/src/modules/storage/` - Cache management
- `packages/core/src/modules/poi/` - POI subsystem
- `packages/core/src/modules/config/` - Configuration
- `packages/core/src/modules/loaders/` - Resource loaders

**Action**: Add headers in second pass after Category 1 and 2.

### Category 4: Utilities and Helpers (LOWER PRIORITY)

General utility files that support the framework:

- `packages/core/src/modules/utils/` - General utilities
- `packages/core/src/modules/helpers/` - Helper modules
- `packages/core/src/modules/validators/` - Validation rules
- `packages/core/src/modules/security/` - Security utilities

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

1. ✅ Add the standard MIT license header to all new `.ts` and `.js` files in `packages/core/src/`
2. ✅ Ensure header is at the very top, before all other content
3. ✅ Do not modify or remove existing headers
4. ✅ For non-Core modules, coordinate with maintainers about appropriate headers

---

## Verification

To verify headers are correctly applied:

```bash
# Check if a file has a license header
grep -l "GeoLeaf Core" packages/core/src/modules/log/*.ts

# Find all TS/JS files without headers (in core)
find packages/core/src -name "*.ts" -o -name "*.js" | xargs -I {} sh -c 'grep -L "GeoLeaf Core" "{}" 2>/dev/null'
```

---

## Questions?

See [NOTICE.md](./NOTICE.md) for more information about licensing, or [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.
