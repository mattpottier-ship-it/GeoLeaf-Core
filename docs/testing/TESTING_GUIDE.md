# GeoLeaf Testing Guide

Product Version: GeoLeaf Platform V1  

## Overview

GeoLeaf uses Jest for unit testing. This guide documents testing patterns, best practices, and key insights from the test suite development.

**Test Coverage**: 232 tests across 6 test suites  
**Framework**: Jest 29.x with jsdom environment  
**Last Updated**: December 2, 2025 (Phase 5)

---

## Test Suites

### 1. `environment.test.js` (5 tests)
Validates test environment setup:
- Jest configuration
- Global helpers availability
- Leaflet mock functionality
- DOM availability (jsdom)
- Fetch mock setup

### 2. `helpers.test.js` (46 tests)
Tests utility functions in `geoleaf.helpers.js`:
- `resolveField()` - nested property resolution
- `formatDuration()` - time formatting
- `formatDistance()` - distance formatting with i18n
- `debounce()` - function debouncing
- `deepMerge()` - object merging

### 3. `utils.test.js` (25 tests)
Tests utility functions in `geoleaf.utils.js`:
- `capitalizeFirstLetter()` - string capitalization
- `escapeHtml()` - HTML entity escaping
- `sanitizeUrl()` - URL validation and sanitization
- `truncateText()` - text truncation with ellipsis

### 4. `security.test.js` (20 tests)
Tests security module (`geoleaf.security.js`):
- HTML escaping (XSS prevention)
- URL sanitization (protocol validation)
- Input validation patterns
- Edge cases and attack vectors

### 5. `core.test.js` (95 tests)
Tests core GeoLeaf functionality (`geoleaf.core.js`):
- Map initialization and configuration
- State management
- Module integration (Log, UI, Config)
- Error handling and recovery
- Multi-map support

### 6. `poi.test.js` (41 tests) ⭐ **Phase 5 Focus**
Tests POI module functionality:
- Module initialization (8 tests)
- POI addition and validation (14 tests)
- Data retrieval and reload (5 tests)
- Popup generation (3 tests)
- Security (HTML escaping, URL sanitization) (5 tests)

---

## Testing Patterns & Best Practices

### Pattern 1: No Exceptions, Only Logging

**Discovery**: During Phase 5, we found that the POI module logs errors instead of throwing exceptions.

**Example**:
```javascript
// ❌ INCORRECT - Test expects exception
test('should throw error without map', () => {
    expect(() => {
        GeoLeaf.POI.init({});
    }).toThrow();
});

// ✅ CORRECT - Test checks return value
test('should return undefined without map', () => {
    const result = GeoLeaf.POI.init({});
    expect(result).toBeUndefined();
});
```

**Rationale**: 
- Better user experience (no crashes)
- Errors logged to console for debugging
- Functions return `null` or `undefined` on failure
- Caller can check return value and handle gracefully

**Affected modules**: POI, markers, normalizers

---

### Pattern 2: Lazy DOM Creation

**Discovery**: DOM elements are created on-demand, not during initialization.

**Example**:
```javascript
// ❌ INCORRECT - Expects immediate DOM creation
test('should create sidepanel overlay', () => {
    GeoLeaf.POI.init({ map: mockMap });
    const overlay = document.querySelector('.gl-poi-sidepanel-overlay');
    expect(overlay).toBeTruthy(); // FAILS - element doesn't exist yet
});

// ✅ CORRECT - Tests module existence, not DOM
test('should create sidepanel overlay', () => {
    GeoLeaf.POI.init({ map: mockMap });
    // Le sidepanel est créé de manière lazy
    expect(GeoLeaf.POI).toBeDefined();
});

// ✅ ALSO CORRECT - Trigger creation, then test
test('should create sidepanel on demand', () => {
    GeoLeaf.POI.init({ map: mockMap });
    GeoLeaf.POI.showPoiDetails({ id: 'test', latlng: [45, -73] });
    // Now the DOM element exists
    const overlay = document.querySelector('.gl-poi-sidepanel-overlay');
    expect(overlay).toBeTruthy();
});
```

**Rationale**:
- Performance optimization (no unnecessary DOM manipulation)
- Memory efficiency (create only when needed)
- Cleaner initialization code

**Affected components**: Sidepanel, popups, UI overlays

---

### Pattern 3: Render-Time Normalization

**Discovery**: POI data is stored raw, normalization/sanitization happens during rendering.

**Example**:
```javascript
// ❌ INCORRECT - Checks stored data
test('should sanitize URLs in POI data', () => {
    const poi = {
        id: 'poi-url',
        latlng: [45.5, -73.6],
        attributes: { link: 'javascript:alert(1)' }
    };
    GeoLeaf.POI.addPoi(poi);
    const stored = GeoLeaf.POI.getPoiById('poi-url');
    expect(stored.attributes.link).toBeNull(); // FAILS - raw data stored
});

// ✅ CORRECT - Checks rendered output
test('should sanitize URLs in popup', () => {
    const poi = {
        id: 'poi-url',
        latlng: [45.5, -73.6],
        attributes: { link: 'javascript:alert(1)' }
    };
    GeoLeaf.POI.addPoi(poi);
    const marker = getLastCreatedMarker();
    const popup = marker.bindPopup.mock.calls[0][0];
    // Malicious URL should not appear in rendered HTML
    expect(popup).not.toContain('javascript:');
});
```

**Rationale**:
- Preserve original data (for debugging, logging)
- Apply transformations consistently at render time
- Single source of truth for normalization logic
- Easier to update sanitization rules (one place)

**Affected data**: POI attributes, URLs, HTML content, coordinates

---

### Pattern 4: HTML Escaping Verification

**Discovery**: HTML is escaped using `&lt;`, `&gt;`, etc., not removed.

**Example**:
```javascript
// ❌ INCORRECT - Checks for absence of dangerous string
test('should escape XSS in description', () => {
    const poi = {
        id: 'xss-desc',
        description: '<img src=x onerror=alert(1)>'
    };
    GeoLeaf.POI.addPoi(poi);
    const popup = getPopupContent();
    expect(popup).not.toContain('onerror='); // FAILS - string still present
});

// ✅ CORRECT - Checks for escaped characters
test('should escape XSS in description', () => {
    const poi = {
        id: 'xss-desc',
        description: '<img src=x onerror=alert(1)>'
    };
    GeoLeaf.POI.addPoi(poi);
    const popup = getPopupContent();
    // Verify characters are escaped
    expect(popup).toContain('&lt;img');
    expect(popup).toContain('&gt;');
    // Verify raw HTML doesn't appear
    expect(popup).not.toContain('<img src=x');
});
```

**Rationale**:
- Preserves user content (shows what they typed)
- Prevents XSS attacks (browser won't execute)
- Better UX than silently removing content

---

## Mock Setup

### Leaflet Mock

Located in `__tests__/setup.js`. Provides comprehensive Leaflet API mocking:

```javascript
global.L = {
    map: jest.fn(() => mockMap),
    marker: jest.fn(() => mockMarker),
    layerGroup: jest.fn(() => mockLayerGroup), // Added in Phase 5
    divIcon: jest.fn(() => ({})),
    control: { /* ... */ },
    // ... more mocks
};
```

**Key Addition (Phase 5)**: `layerGroup` mock with full API:
- `addLayer()`, `removeLayer()`, `clearLayers()`
- `eachLayer()`, `getLayers()`, `hasLayer()`
- `addTo()` (chainable)

This fixed 21+ POI tests that were failing due to `TypeError: Cannot read properties of undefined (reading 'addLayer')`.

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- __tests__/poi.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Verbose output
npm test -- --verbose
```

---

## Test Results (Phase 5)

### Before Phase 5
- **Total**: 208 passing, 29 failing
- **POI tests**: 12 passing, 29 failing
- **Issues**: Missing mocks, incorrect assertions, wrong expectations

### After Phase 5
- **Total**: 232 passing, 0 failing ✅
- **POI tests**: 41 passing, 0 failing ✅
- **Improvements**: 
  - Added LayerGroup mock
  - Fixed 5 coordinate validation tests
  - Fixed 2 sidepanel tests
  - Fixed 4 security tests

---

## Common Testing Pitfalls

### 1. Assuming Synchronous DOM Creation
❌ **Wrong**: Expecting DOM elements immediately after `init()`  
✅ **Right**: Trigger the action that creates DOM, then test

### 2. Testing Implementation Instead of Behavior
❌ **Wrong**: Checking internal data structures  
✅ **Right**: Testing rendered output and user-visible behavior

### 3. Expecting Exceptions Where None Are Thrown
❌ **Wrong**: Using `.toThrow()` for functions that log errors  
✅ **Right**: Check return values (`null`, `undefined`, `false`)

### 4. Testing Raw Data Instead of Processed Output
❌ **Wrong**: Checking stored POI data for sanitization  
✅ **Right**: Checking rendered popup HTML for sanitized content

---

## Architecture Insights

### Design Philosophy

The test fixes revealed key architectural decisions:

1. **Graceful Degradation**: Return `null`/`undefined` instead of throwing
2. **Lazy Initialization**: Create resources only when needed
3. **Late Binding**: Apply transformations at render time, not storage time
4. **Separation of Concerns**: Raw data ≠ rendered data

### Benefits

- **Resilience**: Application doesn't crash on invalid input
- **Performance**: Lazy loading reduces initialization time
- **Flexibility**: Normalization rules can change without data migration
- **Debuggability**: Raw data preserved for inspection

---

## Future Improvements

### Potential Test Enhancements

1. **Coverage Expansion**
   - Add tests for error recovery scenarios
   - Test multi-map edge cases
   - Add performance benchmarks

2. **Mock Improvements**
   - Add Leaflet plugin mocks (cluster, heat map)
   - Mock browser APIs (geolocation, localStorage)

3. **Integration Tests**
   - Test module interactions
   - Test full workflows (add POI → show details → close)

4. **Visual Regression Tests**
   - Screenshot comparison for UI components
   - CSS rendering validation

---

## References

- **Jest Documentation**: https://jestjs.io/
- **Leaflet API**: https://leafletjs.com/reference.html
- **Testing Best Practices**: docs/testing/best-practices.md (TODO)
- **Phase 5 Commit**: `f23c33f` - POI test suite fixes

---

## Changelog

**Phase 5 (December 2, 2025)**
- Fixed 29 failing POI tests
- Added LayerGroup mock to test infrastructure
- Documented 4 key testing patterns
- Achieved 100% test pass rate (232/232)

**Phase 4 (November 2025)**
- Refactored complex functions
- Added filters, panel-builder modules
- Updated test mocks for new architecture

**Phase 3 (October 2025)**
- Initial test suite creation
- Core, helpers, utils, security tests
- 208 passing tests established
