# GeoLeaf Developer Guide

**Product Version:** GeoLeaf Platform V1  
**Version:** 3.2.0  
**Last Updated:** February 2026  
**Audience:** Contributors and advanced developers

> Versioning convention: **Platform V1** is the product label; technical SemVer in this repository remains **3.2.0** for compatibility.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Building GeoLeaf](#building-geoleaf)
4. [Testing](#testing)
5. [Code Style](#code-style)
6. [Contributing](#contributing)
7. [Architecture Deep Dive](#architecture-deep-dive)
8. [Performance](#performance)
9. [Release Process](#release-process)

---

## Getting Started

### Prerequisites

**Required:**
- Node.js 18+ (recommend 20+)
- npm 7+
- Git

**Recommended:**
- VS Code with ESLint and Prettier extensions
- Chrome/Firefox DevTools for debugging

### Clone Repository

```bash
git clone https://github.com/yourusername/geoleaf-js.git
cd geoleaf-js
```

### Install Dependencies

```bash
npm install
```

This installs:
- **Rollup** - Build tool
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Leaflet** - Peer dependency (development)

### Project Structure

```
geoleaf-js/
├── src/
│   ├── bundle-entry.js      # Rollup entry point
│   ├── app/                 # Boot system
│   │   ├── boot.js          # Main entry — checkPlugins() + geoleaf:ready
│   │   ├── init.js          # Module initialization
│   │   └── helpers.js       # Shared utilities (DOM, events)
│   ├── plugins/             # Plugin entry points
│   │   ├── geoleaf-storage.plugin.js  # Storage plugin (~45 modules)
│   │   └── geoleaf-addpoi.plugin.js   # AddPOI plugin (~14 modules)
│   └── static/
│       ├── js/              # Source code (200+ modules)
│       │   ├── geoleaf.api.js      # Entry point
│       │   ├── geoleaf.core.js     # Core initialization
│       │   ├── geoleaf.poi.js      # POI module
│       │   ├── geoleaf.geojson.js  # GeoJSON module
│       │   ├── storage/            # Storage system (32 files)
│       │   ├── labels/             # Labels system
│       │   ├── ui/                 # UI components
│       │   └── ...
│       └── css/             # Stylesheets
│           ├── geoleaf-main.css    # Main styles
│           └── components/         # Component styles
│
├── dist/                    # Build output (generated)
│   ├── geoleaf.umd.js           # UMD bundle core (dev)
│   ├── geoleaf.min.js           # Minified core (prod)
│   ├── geoleaf-storage.plugin.js # Storage plugin bundle
│   ├── geoleaf-addpoi.plugin.js  # AddPOI plugin bundle
│   └── geoleaf-main.min.css     # Minified CSS
│
├── __tests__/               # Test files (150+ tests)
│   ├── setup.js            # Jest setup
│   ├── api/                # API tests
│   ├── labels/             # Label system tests
│   └── ...
│
├── profiles/                # Business profiles
│   └── tourism/            # Tourism profile (35+ layers)
│
├── docs/                    # Documentation
│   ├── README.md           # Project overview
│   ├── GETTING_STARTED.md  # Quick start guide
│   ├── API_REFERENCE.md    # API documentation
│   └── ...
│
├── schema/                  # JSON Schemas
│   ├── style.schema.json   # Style validation
│   ├── taxonomy.schema.json # Taxonomy validation
│   └── ...
│
├── examples/                # Example profiles
├── scripts/                 # Build/utility scripts
├── index.d.ts              # TypeScript definitions
├── package.json            # Dependencies & scripts
├── rollup.config.mjs       # Build configuration
├── jest.config.js          # Test configuration
└── .eslintrc.json          # Linting rules
```

### First Build

```bash
# Build UMD bundles
npm run build

# Build CSS
npm run build:css

# Build everything
npm run build:all
```

**Output:**
- `dist/geoleaf.umd.js` - Development bundle (~500KB)
- `dist/geoleaf.min.js` - Production bundle (~120KB minified)
- `dist/geoleaf-main.min.css` - Minified CSS

---

## Development Workflow

### npm Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `npm start` | Start dev server | Development |
| `npm run build` | Build JS bundles | After code changes |
| `npm run build:watch` | Watch mode build | Active development |
| `npm run build:css` | Build CSS | After style changes |
| `npm run build:all` | Build JS + CSS | Before commit |
| `npm test` | Run smoke tests | Quick validation |
| `npm run test:jest` | Run Jest tests | Full test suite |
| `npm run test:watch` | Watch mode tests | TDD workflow |
| `npm run test:coverage` | Generate coverage | Before PR |
| `npm run lint` | Lint code | Find issues |
| `npm run lint:fix` | Auto-fix lint | Fix formatting |
| `npm run format` | Format code | Prettier formatting |
| `npm run benchmark` | Run benchmarks | Performance testing |

### Development Server

**Start server:**

```bash
npm start
```

**Access demo:**

```
http://localhost:8080/demo/
http://localhost:8080/demo/?profile=tourism
http://localhost:8080/demo/?profile=tourism
http://localhost:8080/demo/?verbose=true
```

**Server features:**
- Auto-reload on file changes (manual in browser)
- Serves static files from root
- CORS enabled for local development

### Development Workflow

**1. Create feature branch:**

```bash
git checkout -b feature/my-new-feature
```

**2. Make changes:**

Edit files in `src/static/js/`

**3. Build and test:**

```bash
npm run build
npm run test:jest
npm run lint
```

**4. Test in demo:**

```bash
npm start
# Open http://localhost:8080/demo/
```

**5. Commit changes:**

```bash
git add .
git commit -m "feat: add new feature"
```

**6. Push and create PR:**

```bash
git push origin feature/my-new-feature
```

### Hot Reload Setup

For faster development, use watch mode:

**Terminal 1:**
```bash
npm run build:watch
```

**Terminal 2:**
```bash
npm start
```

**Workflow:**
1. Edit `src/static/js/*.js`
2. Rollup auto-rebuilds to `dist/`
3. Refresh browser to see changes

---

## Building GeoLeaf

### Build Pipeline

**Architecture:**

```
src/static/js/geoleaf.api.js (entry)
          ↓
     Rollup bundler
          ↓
   [resolve, commonjs]
          ↓
   Tree-shaking (aggressive)
          ↓
   [UMD wrapper, globals]
          ↓
   Output: dist/geoleaf.umd.js
          ↓
   [Terser minification]
          ↓
   Output: dist/geoleaf.min.js
          ↓
   [Sourcemaps, filesize report]
```

### Rollup Configuration

**File:** `rollup.config.mjs`

**Key features:**

1. **Entry point:** `src/static/js/geoleaf.api.js`
2. **External dependencies:** Leaflet, MarkerCluster (peer deps)
3. **Tree-shaking:** Aggressive dead code elimination
4. **Output formats:** UMD (browser global)
5. **Minification:** Terser with aggressive compression
6. **Sourcemaps:** Enabled for debugging

**Tree-shaking config:**

```javascript
treeshake: {
  moduleSideEffects: false,        // No module side effects
  propertyReadSideEffects: false,  // Property reads safe
  tryCatchDeoptimization: false,   // Optimize try/catch
  unknownGlobalSideEffects: false, // No unknown globals
  annotations: true                // Respect @__PURE__ comments
}
```

**Minification (Terser):**

```javascript
{
  compress: {
    drop_console: false,      // Keep console.log in prod
    drop_debugger: true,      // Remove debugger statements
    pure_funcs: ['console.debug'],  // Remove debug logs
    passes: 3                 // Multiple compression passes
  },
  mangle: {
    properties: {
      regex: /^_/             // Mangle private properties
    }
  },
  format: {
    comments: false           // Remove all comments
  }
}
```

### Output Formats

**UMD Bundle (geoleaf.umd.js):**
- **Purpose:** Development, debugging
- **Size:** ~500KB uncompressed
- **Features:** Readable code, sourcemaps
- **Usage:** CDN development, local testing

**Minified Bundle (geoleaf.min.js):**
- **Purpose:** Production deployment
- **Size:** ~120KB minified, ~35KB gzipped
- **Features:** Compressed, mangled, optimized
- **Usage:** CDN production, npm package

### CSS Build

**Input:** `src/static/css/geoleaf-main.css`  
**Tool:** PostCSS + cssnano  
**Output:** `dist/geoleaf-main.min.css`

**Features:**
- Autoprefixer for browser compatibility
- cssnano minification
- Sourcemaps

**Build:**

```bash
npm run build:css
```

### Bundle Analysis

**Visualizer plugin:**

```bash
npm run build
# Opens stats.html in browser
```

**Shows:**
- Module sizes
- Dependency tree
- Largest modules
- Tree-shaking effectiveness

**Filesize plugin output:**

```
dist/geoleaf.min.js
  Minified: 120 KB
  Gzipped:  35 KB
  Brotli:   28 KB
```

---

## Testing

### Test Structure

**Framework:** Jest 29+ with jsdom

**Test files:** `__tests__/**/*.test.js`

**Categories:**
- **Unit tests:** Module-level testing
- **Integration tests:** Multi-module workflows
- **API tests:** Public API validation

### Running Tests

**All tests:**

```bash
npm run test:jest
```

**Watch mode:**

```bash
npm run test:watch
```

**Coverage:**

```bash
npm run test:coverage
```

**Coverage opens:** `coverage/index.html`

### Coverage Thresholds

**Current:** 70% (all metrics)  
**Target:** 80% post-refactoring

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

### Writing Tests

**Test template:**

```javascript
/**
 * @jest-environment jsdom
 */
import GeoLeaf from '../src/static/js/geoleaf.api.js';

describe('ModuleName', () => {
  beforeEach(() => {
    // Setup
    document.body.innerHTML = '<div id="map"></div>';
  });

  afterEach(() => {
    // Cleanup
    document.body.innerHTML = '';
  });

  test('should do something', () => {
    // Arrange
    const config = { /* ... */ };

    // Act
    const result = GeoLeaf.SomeMethod(config);

    // Assert
    expect(result).toBeDefined();
    expect(result.value).toBe(expected);
  });
});
```

### Testing Best Practices

1. **Test behavior, not implementation**
   ```javascript
   // ❌ Bad
   expect(module._internalState).toBe(true);
   
   // ✅ Good
   expect(module.getState()).toBe('active');
   ```

2. **Use descriptive test names**
   ```javascript
   // ❌ Bad
   test('test1', () => { /* ... */ });
   
   // ✅ Good
   test('should show labels when layer is visible and label.enabled is true', () => {
     /* ... */
   });
   ```

3. **Arrange-Act-Assert pattern**
   ```javascript
   test('should add POI to map', () => {
     // Arrange
     const poi = { latlng: [48, 2], title: 'Test' };
     
     // Act
     const marker = GeoLeaf.POI.add(poi);
     
     // Assert
     expect(marker).toBeDefined();
     expect(marker.getLatLng()).toEqual([48, 2]);
   });
   ```

4. **Mock external dependencies**
   ```javascript
   jest.mock('leaflet', () => ({
     Map: jest.fn(),
     Marker: jest.fn()
   }));
   ```

### E2E Tests

**Framework:** Playwright (in `tests/e2e/`)

**Run E2E tests:**

```bash
npx playwright test
```

**Features:**
- Browser automation (Chrome, Firefox, Safari)
- Visual regression testing
- Network mocking
- Screenshot comparison

---

## Code Style

### ESLint Configuration

**File:** `.eslintrc.json`

**Rules:**
- **airbnb-base** - Base style guide
- **security** - Security best practices
- **prettier** - Code formatting

**Run linter:**

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

### Prettier Configuration

**File:** `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 120
}
```

**Format code:**

```bash
npm run format
```

### Naming Conventions

**Variables:**
- `camelCase` for variables and functions
- `PascalCase` for classes and constructors
- `UPPER_SNAKE_CASE` for constants

```javascript
// Variables
const mapCenter = [48, 2];
const layerData = { /* ... */ };

// Functions
function calculateBounds() { /* ... */ }
const renderMarker = () => { /* ... */ };

// Classes
class GeoLeafError extends Error { /* ... */ }

// Constants
const DEFAULT_ZOOM = 12;
const MAX_POI_COUNT = 1000;
```

**Files:**
- `kebab-case.js` for modules
- `PascalCase.test.js` for test files

```
src/static/js/
  geoleaf.core.js
  label-button-manager.js
  
__tests__/
  Core.test.js
  LabelButtonManager.test.js
```

**Private members:**
- Prefix with `_` for internal/private

```javascript
const _internalState = {};

function _privateHelper() { /* ... */ }

class MyClass {
  _privateProperty = null;
  
  _privateMethod() { /* ... */ }
}
```

### JSDoc Comments

**Module header:**

```javascript
/**
 * GeoLeaf POI Module
 * 
 * Manages point-of-interest markers on the map.
 * 
 * @module POI
 * @since 3.0.0
 * @example
 * GeoLeaf.POI.add({
 *   latlng: [48, 2],
 *   title: 'Eiffel Tower'
 * });
 */
```

**Function documentation:**

```javascript
/**
 * Adds a POI to the map.
 * 
 * @param {Object} poi - POI object
 * @param {Array<number>} poi.latlng - [latitude, longitude]
 * @param {string} poi.title - POI title
 * @param {string} [poi.category] - POI category (optional)
 * @returns {L.Marker} Leaflet marker instance
 * @throws {ValidationError} If coordinates are invalid
 * @example
 * const marker = GeoLeaf.POI.add({
 *   latlng: [48.8566, 2.3522],
 *   title: 'Eiffel Tower',
 *   category: 'landmarks'
 * });
 */
function add(poi) {
  // Implementation
}
```

### Code Organization

**IIFE pattern for modules:**

```javascript
(function (global) {
  "use strict";

  const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
  const Log = GeoLeaf.Log;

  // Module implementation
  GeoLeaf.MyModule = {
    init() { /* ... */ },
    method1() { /* ... */ }
  };

})(window);
```

**Module exports:**

```javascript
// Public API
GeoLeaf.POI = {
  add: function(poi) { /* ... */ },
  remove: function(id) { /* ... */ }
};

// Private helpers (not exported)
function _internalHelper() { /* ... */ }
```

---

## Contributing

### Branch Strategy

**Main branches:**
- `main` - Production-ready code
- `develop` - Integration branch for features

**Feature branches:**
- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/update-name` - Documentation
- `refactor/module-name` - Code refactoring
- `perf/optimization-name` - Performance improvements

**Branch workflow:**

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/my-feature
```

### Commit Messages

**Format:** [Conventional Commits](https://www.conventionalcommits.org/)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Add/update tests
- `chore` - Build/tooling changes

**Examples:**

```bash
feat(labels): add debounced label updates

Implement 300ms debounce for label button state updates to improve
performance when switching themes with many layers.

Closes #123

---

fix(poi): validate coordinates before adding marker

Prevents invalid coordinates from causing map errors.

Fixes #456

---

docs(api): add GeoLeaf.Cache API documentation

Complete Cache API reference with examples and usage patterns.
```

### Pull Request Checklist

**Before submitting PR:**

- [ ] Code follows style guide (ESLint passes)
- [ ] Code is formatted (Prettier)
- [ ] Tests added/updated
- [ ] Tests pass (`npm run test:jest`)
- [ ] Coverage maintained (>70%)
- [ ] Documentation updated
- [ ] Build succeeds (`npm run build:all`)
- [ ] Manually tested in demo
- [ ] No console errors/warnings
- [ ] TypeScript definitions updated (if API changed)

**PR template:**

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested in demo
- [ ] Unit tests added
- [ ] Coverage maintained

## Checklist
- [ ] Lint passes
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Documentation updated
```

### Code Review Process

**Review guidelines:**

1. **Check functionality** - Does it work as intended?
2. **Review tests** - Are edge cases covered?
3. **Verify style** - Follows conventions?
4. **Check performance** - Any regressions?
5. **Review docs** - Clear and accurate?

**Approval:**
- 1+ approvals required
- CI must pass
- No merge conflicts

---

## Architecture Deep Dive

### Module System

**IIFE-based modules:**

Each module is wrapped in an IIFE (Immediately Invoked Function Expression) to avoid global scope pollution:

```javascript
(function (global) {
  "use strict";
  
  const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
  
  // Module implementation
  GeoLeaf.MyModule = { /* ... */ };
  
})(window);
```

**Benefits:**
- No global scope pollution
- Clear dependency management
- Compatible with UMD bundling

### Event Bus

**Event-driven architecture:**

```javascript
// Subscribe to event
GeoLeaf.Events.on('layer-added', (data) => {
  console.log('Layer added:', data.layerId);
});

// Emit event
GeoLeaf.Events.emit('layer-added', {
  layerId: 'parks',
  layer: layerInstance
});

// Unsubscribe
GeoLeaf.Events.off('layer-added', handler);
```

**Core events:**
- `map-ready` - Map initialized
- `profile-loaded` - Profile config loaded
- `layer-added` / `layer-removed` - Layer management
- `labels-enabled` / `labels-disabled` - Label visibility
- `theme-changed` - Theme switched
- `error` - Error occurred

### State Management

**Centralized state per module:**

```javascript
const GeoLeaf = {
  // Core state
  _map: null,
  _config: {},
  
  // POI state
  POI: {
    _markers: new Map(),
    _data: []
  },
  
  // GeoJSON state
  GeoJSON: {
    _layers: new Map()
  }
};
```

**State access patterns:**

```javascript
// Getter
function getMap() {
  return GeoLeaf._map;
}

// Setter with validation
function setConfig(config) {
  validateConfig(config);
  GeoLeaf._config = config;
  emit('config-changed', config);
}
```

### Storage Layer

**IndexedDB wrapper:**

```javascript
// Save to cache
await GeoLeaf.Cache.save('my-data', data, {
  ttl: 3600000  // 1 hour
});

// Load from cache
const cached = await GeoLeaf.Cache.load('my-data');

// Clear cache
await GeoLeaf.Cache.clear('my-data');
```

**Implementation:**

```javascript
const CacheStorage = {
  async save(key, value, options = {}) {
    const ttl = options.ttl || 3600000;
    const expires = Date.now() + ttl;
    
    await idb.put('cache', {
      key,
      value,
      expires
    });
  },
  
  async load(key) {
    const item = await idb.get('cache', key);
    
    if (!item) return null;
    if (Date.now() > item.expires) {
      await this.clear(key);
      return null;
    }
    
    return item.value;
  }
};
```

### Security Layer

**XSS Protection:**

```javascript
// Escape HTML
const safe = GeoLeaf.Security.escapeHtml(userInput);

// Validate URL
GeoLeaf.Security.validateUrl(url);

// Sanitize POI properties
const cleanProps = GeoLeaf.Security.sanitizePoiProperties(props);
```

**Implementation:**

```javascript
const Security = {
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  
  validateUrl(url, allowedProtocols = ['http', 'https', 'data']) {
    try {
      const parsed = new URL(url);
      if (!allowedProtocols.includes(parsed.protocol.replace(':', ''))) {
        throw new SecurityError('Invalid protocol');
      }
    } catch (err) {
      throw new SecurityError('Invalid URL', { url });
    }
  }
};
```

---

## Performance

### Optimization Techniques

**1. Debouncing:**

```javascript
const debouncedSync = GeoLeaf.Helpers.debounce((layerId) => {
  syncLabelButton(layerId);
}, 300);

// Multiple rapid calls → single execution after 300ms
debouncedSync('layer-1');
debouncedSync('layer-1');
debouncedSync('layer-1');
```

**2. Throttling:**

```javascript
const throttledScroll = GeoLeaf.Helpers.throttle(() => {
  updateVisibleFeatures();
}, 100);

map.on('move', throttledScroll);
```

**3. Clustering:**

Large POI datasets automatically clustered:

```javascript
{
  performance: {
    enableClustering: true,
    clusterThreshold: 50  // Cluster if >50 POIs
  }
}
```

**4. Lazy Loading:**

Layers loaded on-demand:

```javascript
{
  performance: {
    maxConcurrentLayers: 5,
    layerLoadDelay: 200
  }
}
```

**5. Virtual Scrolling:**

Large lists use virtual scrolling to render only visible items.

### Bundle Size Optimization

**Tree-shaking:**
- Remove unused code automatically
- Mark pure functions with `/* @__PURE__ */`

**Code splitting:**
- Separate dev and prod bundles
- Load profiles on-demand

**Minification:**
- Terser compression (3 passes)
- Property mangling for private members
- Dead code elimination

**Current sizes:**
- Development: ~500KB unminified
- Production: ~120KB minified, ~35KB gzipped

### Runtime Performance

**Benchmarks:**

```bash
npm run benchmark
```

**Metrics:**
- Map initialization: <100ms
- POI rendering (100 items): <50ms
- Layer switching: <200ms
- Label updates: <30ms (debounced)

**Performance tips:**

1. **Limit concurrent layers** - Max 10-15 visible layers
2. **Use clustering** - For >50 POIs
3. **Optimize GeoJSON** - Simplify geometries, reduce properties
4. **Cache data** - Use IndexedDB cache for repeated loads
5. **Debounce updates** - Batch state changes

---

## Release Process

### Versioning

**Semantic Versioning (SemVer):**

```
MAJOR.MINOR.PATCH

3.2.0
│ │ │
│ │ └─ Patch: Bug fixes
│ └─── Minor: New features (backward compatible)
└───── Major: Breaking changes
```

**Examples:**
- `3.1.0` → `3.1.1` - Bug fix
- `3.1.1` → `3.2.0` - New feature (Phase 1-3 refactoring)
- `3.2.0` → `4.0.0` - Breaking API change (ESM migration)

### Changelog

**File:** `CHANGELOG.md`

**Format:**

```markdown
## [3.1.0] - 2026-01-15

### Added
- Label system with visibleByDefault config
- Comprehensive JSON schemas for validation
- 35+ new documentation files

### Changed
- Moved label config from layer to style files
- Optimized bundle size (75% reduction)

### Fixed
- Label button sync issues
- Memory leaks in layer manager

### Breaking Changes
- `label.visibleByDefault` now in style files (see LABELS_MIGRATION_GUIDE.md)
```

### Release Steps

**1. Update version:**

```bash
npm version minor  # or major/patch
```

**2. Update changelog:**

Edit `CHANGELOG.md` with new version section.

**3. Build and test:**

```bash
npm run build:all
npm run test:ci
npm run lint
```

**4. Commit changes:**

```bash
git add .
git commit -m "chore: release v3.1.0"
```

**5. Create tag:**

```bash
git tag v3.1.0
git push origin main --tags
```

**6. Publish to npm:**

```bash
npm publish
```

**7. Create GitHub release:**

- Go to GitHub Releases
- Create new release from tag
- Copy changelog content
- Attach build artifacts

### Pre-release Checklist

- [ ] Version updated in `package.json`
- [ ] Changelog updated
- [ ] All tests pass
- [ ] Lint passes
- [ ] Build succeeds
- [ ] Documentation updated
- [ ] Demo tested
- [ ] No console errors
- [ ] TypeScript definitions updated
- [ ] Breaking changes documented

---

## Additional Resources

### Documentation

- **[README](../README.md)** - Project overview
- **[Getting Started](GETTING_STARTED.md)** - Quick start guide
- **[User Guide](USER_GUIDE.md)** - Feature documentation
- **[API Reference](API_REFERENCE.md)** - Complete API docs
- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - JSON configuration
- **[Profiles Guide](PROFILES_GUIDE.md)** - Custom profiles
- **[Contributing](CONTRIBUTING.md)** - Contribution guidelines

### Tools

- **Rollup:** https://rollupjs.org/
- **Jest:** https://jestjs.io/
- **ESLint:** https://eslint.org/
- **Prettier:** https://prettier.io/
- **Leaflet:** https://leafletjs.com/

### Community

- **GitHub Issues:** Report bugs and request features
- **Pull Requests:** Contribute code
- **Discussions:** Ask questions and share ideas

---

## Getting Help

### Common Issues

**Build fails:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build:all
```

**Tests fail:**
```bash
npm run test:jest -- --clearCache
npm run test:jest
```

**Linting errors:**
```bash
npm run lint:fix
npm run format
```

### Contact

- **GitHub Issues:** https://github.com/yourusername/geoleaf-js/issues
- **Email:** your-email@example.com
- **Docs:** https://geoleaf.dev

---

**Thank you for contributing to GeoLeaf!** 🗺️

---

**Last Updated:** February 14, 2026  
**GeoLeaf Version:** 3.2.0
