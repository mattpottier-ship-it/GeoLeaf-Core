# GeoLeaf Demo System Guide

**Version:** 3.2.0  
**Last Updated:** January 2026  
**Target Audience:** Developers testing and demonstrating GeoLeaf features

This guide documents the GeoLeaf demo system architecture, including the demo page structure, DemoLog system, profile/theme selectors, and verbose debugging mode.

---

## Table of Contents

1. [Overview](#overview)
2. [Demo Files Structure](#demo-files-structure)
3. [DemoLog System](#demolog-system)
4. [Profile & Theme Selectors](#profile--theme-selectors)
5. [Verbose Debug Mode](#verbose-debug-mode)
6. [CSP Configuration](#csp-configuration)
7. [Usage Examples](#usage-examples)

---

## Overview

The GeoLeaf demo system consists of 3 main files designed to showcase library features while maintaining separation from production code:

```
demo/
├── index.html (279 lines)           # Main demo page with CSP headers
├── demo-header.html (164 lines)     # Profile/theme selector UI
└── demo.extensions.js (217 lines)   # DemoLog + verbose mode
```

**Key Features:**
- 🎨 **Visual profile switching** - Tourism and custom profiles
- 🌗 **Theme switching** - Default/Green/Alt themes with localStorage persistence
- 📊 **Verbose logging** - Detailed console output for debugging
- 🔒 **CSP headers** - Content Security Policy demonstration
- 🧪 **Testing environment** - Isolated from production code

---

## Demo Files Structure

### 1. index.html (Main Demo Page)

**Purpose:** Primary demo page loading GeoLeaf with all features enabled

**Key Sections:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- CSP Meta Tag -->
  <meta http-equiv="Content-Security-Policy" content="...">
  
  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  
  <!-- GeoLeaf CSS -->
  <link rel="stylesheet" href="../dist/geoleaf.min.css">
  
  <!-- Demo-specific styles -->
  <style>
    /* Map container, branding, selectors */
  </style>
</head>
<body>
  <!-- Profile/Theme Selectors (loaded from demo-header.html) -->
  <div id="demo-header"></div>
  
  <!-- Map Container -->
  <div id="map"></div>
  
  <!-- Scripts -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="../dist/geoleaf.min.js"></script>
  <script src="demo.extensions.js"></script>
  <script>
    // Demo initialization code
  </script>
</body>
</html>
```

**Configuration:**

```javascript
// Initialize GeoLeaf
const map = GeoLeaf.init({
  map: {
    target: 'map',
    center: [46.2276, 2.2137],  // Center of France
    zoom: 6
  },
  data: {
    activeProfile: 'tourism',      // default profile
    profilesBasePath: '../profiles/'
  },
  debug: {
    enabled: true,
    modules: ['*']
  }
});
```

---

### 2. demo-header.html (Selector UI)

**Purpose:** Reusable header component with profile and theme selectors

**Structure:**

```html
<div class="demo-header">
  <!-- Branding -->
  <div class="demo-branding">
    <h1>GeoLeaf JS Demo</h1>
    <p>Version 3.2.0 | Interactive Mapping Library</p>
  </div>
  
  <!-- Profile Selector -->
  <div class="demo-selector">
    <label for="profile-selector">Profile:</label>
    <select id="profile-selector">
      <option value="tourism" selected>Tourism</option>
    </select>
  </div>
  
  <!-- Theme Selector -->
  <div class="demo-selector">
    <label for="theme-selector">Theme:</label>
    <select id="theme-selector">
      <option value="default" selected>Default</option>
      <option value="green">Green</option>
      <option value="alt">Alternative</option>
    </select>
  </div>
  
  <!-- Debug Toggle -->
  <div class="demo-toggle">
    <label>
      <input type="checkbox" id="verbose-toggle">
      Verbose Mode
    </label>
  </div>
</div>
```

**Loading in index.html:**

```javascript
// Load demo header
fetch('demo-header.html')
  .then(response => response.text())
  .then(html => {
    document.getElementById('demo-header').innerHTML = html;
    initializeDemoControls();
  });
```

---

### 3. demo.extensions.js (DemoLog & Utilities)

**Purpose:** Demo-specific functionality including verbose logging and selectors

**Key Features:**

1. **DemoLog System** - Conditional logging with verbose mode
2. **Profile Selector** - Switch between profiles with page reload
3. **Theme Selector** - Switch CSS themes with localStorage persistence
4. **Verbose Mode** - Enable/disable detailed console output

---

## DemoLog System

### API Reference

**Namespace:** `window.DemoLog`

#### Methods

##### `setVerbose(enabled)`

Enable or disable verbose logging mode.

**Parameters:**
- `enabled` (boolean) - Whether to enable verbose mode

**Example:**

```javascript
DemoLog.setVerbose(true);   // Enable verbose logging
DemoLog.setVerbose(false);  // Disable verbose logging
```

##### `log(message, ...args)`

Log message only if verbose mode is enabled.

**Parameters:**
- `message` (string) - Message to log
- `...args` (any) - Additional arguments to log

**Example:**

```javascript
DemoLog.log('POI loaded', poiData);
// Console output (if verbose enabled):
// [Demo] POI loaded { id: '123', title: 'Example' }

DemoLog.log('Loading profile', profileName);
// Console output (if verbose enabled):
// [Demo] Loading profile tourism
```

**Note:** If verbose mode is **disabled**, `log()` calls are silently ignored (no console output).

##### `info(message, ...args)`

Always log informational message (independent of verbose mode).

**Parameters:**
- `message` (string) - Message to log
- `...args` (any) - Additional arguments

**Example:**

```javascript
DemoLog.info('Demo initialized');
// Console output (always):
// [Demo] Demo initialized

DemoLog.info('Profile switched to:', profileName);
// Console output (always):
// [Demo] Profile switched to: tourism
```

##### `progress(message, current, total)`

Log progress updates (always shown).

**Parameters:**
- `message` (string) - Progress message
- `current` (number) - Current progress value
- `total` (number) - Total progress value

**Example:**

```javascript
DemoLog.progress('Loading layers', 5, 10);
// Console output:
// [Demo] Loading layers (5/10)

DemoLog.progress('Processing POIs', 250, 1000);
// Console output:
// [Demo] Processing POIs (250/1000)
```

##### `warn(message, ...args)`

Log warning message (always shown).

**Parameters:**
- `message` (string) - Warning message
- `...args` (any) - Additional context

**Example:**

```javascript
DemoLog.warn('Profile not found, using default');
// Console output:
// ⚠️ [Demo] Profile not found, using default
```

##### `error(message, ...args)`

Log error message (always shown).

**Parameters:**
- `message` (string) - Error message
- `...args` (any) - Error details

**Example:**

```javascript
DemoLog.error('Failed to load profile', error);
// Console output:
// ❌ [Demo] Failed to load profile Error: ...
```

---

### DemoLog Implementation

```javascript
// demo.extensions.js

window.DemoLog = (function() {
  let verboseEnabled = false;
  
  return {
    setVerbose(enabled) {
      verboseEnabled = enabled;
      console.log(`[Demo] Verbose mode: ${enabled ? 'ON' : 'OFF'}`);
    },
    
    log(message, ...args) {
      if (verboseEnabled) {
        console.log(`[Demo] ${message}`, ...args);
      }
    },
    
    info(message, ...args) {
      console.log(`[Demo] ${message}`, ...args);
    },
    
    progress(message, current, total) {
      console.log(`[Demo] ${message} (${current}/${total})`);
    },
    
    warn(message, ...args) {
      console.warn(`⚠️ [Demo] ${message}`, ...args);
    },
    
    error(message, ...args) {
      console.error(`❌ [Demo] ${message}`, ...args);
    }
  };
})();
```

---

## Profile & Theme Selectors

### Profile Selector

**Functionality:** Switch between available profiles

**Implementation:**

```javascript
// Profile selector event handler
document.getElementById('profile-selector').addEventListener('change', (e) => {
  const selectedProfile = e.target.value;
  
  DemoLog.info('Switching to profile:', selectedProfile);
  
  // Save to sessionStorage
  sessionStorage.setItem('geoleaf-demo-profile', selectedProfile);
  
  // Reload page to load new profile
  window.location.reload();
});

// On page load, check for saved profile
window.addEventListener('DOMContentLoaded', () => {
  const savedProfile = sessionStorage.getItem('geoleaf-demo-profile');
  
  if (savedProfile) {
    document.getElementById('profile-selector').value = savedProfile;
    
    // Initialize GeoLeaf with saved profile
    GeoLeaf.init({
      data: {
        activeProfile: savedProfile,
        profilesBasePath: '../profiles/'
      }
    });
  }
});
```

**Storage:** Uses `sessionStorage` (cleared when tab closes)

---

### Theme Selector

**Functionality:** Switch between CSS themes (Default, Green, Alternative)

**Implementation:**

```javascript
// Theme selector event handler
document.getElementById('theme-selector').addEventListener('change', (e) => {
  const selectedTheme = e.target.value;
  
  DemoLog.info('Switching to theme:', selectedTheme);
  
  // Remove existing theme classes
  document.body.classList.remove('theme-default', 'theme-green', 'theme-alt');
  
  // Add new theme class
  if (selectedTheme !== 'default') {
    document.body.classList.add(`theme-${selectedTheme}`);
  }
  
  // Save to localStorage
  localStorage.setItem('geoleaf-demo-theme', selectedTheme);
});

// On page load, restore saved theme
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('geoleaf-demo-theme') || 'default';
  
  document.getElementById('theme-selector').value = savedTheme;
  
  if (savedTheme !== 'default') {
    document.body.classList.add(`theme-${savedTheme}`);
  }
});
```

**Storage:** Uses `localStorage` (persists across sessions)

**Theme CSS Files:**
- `geoleaf-theme.css` - Default theme
- `geoleaf-theme-green.css` - Green theme
- `geoleaf-theme-alt.css` - Alternative theme

---

## Verbose Debug Mode

### Activation Methods

**Method 1: URL Parameter**

Add `?verbose=true` or `?debug=true` to the URL:

```
http://localhost:8080/demo/?verbose=true
```

**Method 2: Checkbox Toggle**

Use the "Verbose Mode" checkbox in demo-header.html

**Method 3: Console Command**

```javascript
DemoLog.setVerbose(true);
```

---

### URL Parameter Detection

**Implementation:**

```javascript
// Auto-enable verbose mode from URL
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const verboseParam = urlParams.get('verbose') || urlParams.get('debug');
  
  if (verboseParam === 'true' || verboseParam === '1') {
    DemoLog.setVerbose(true);
    
    // Check checkbox if present
    const verboseToggle = document.getElementById('verbose-toggle');
    if (verboseToggle) {
      verboseToggle.checked = true;
    }
  }
});
```

---

### Verbose Mode Output Examples

**With verbose mode OFF:**

```javascript
DemoLog.log('Loading POI data');       // No output
DemoLog.log('POI count:', 150);        // No output
DemoLog.info('Map initialized');       // [Demo] Map initialized ✅
DemoLog.warn('Cache disabled');        // ⚠️ [Demo] Cache disabled ✅
```

**With verbose mode ON:**

```javascript
DemoLog.log('Loading POI data');       // [Demo] Loading POI data ✅
DemoLog.log('POI count:', 150);        // [Demo] POI count: 150 ✅
DemoLog.info('Map initialized');       // [Demo] Map initialized ✅
DemoLog.warn('Cache disabled');        // ⚠️ [Demo] Cache disabled ✅
```

---

## CSP Configuration

### Content Security Policy Headers

**Purpose:** Demonstrate secure CSP configuration for GeoLeaf applications

**Meta Tag in index.html:**

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://unpkg.com;
  style-src 'self' 'unsafe-inline' https://unpkg.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https:;
  font-src 'self' data:;
  worker-src 'self' blob:;
">
```

**Directives Explained:**

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Default policy: only same-origin resources |
| `script-src` | `'self' 'unsafe-inline' https://unpkg.com` | Allow scripts from same origin, inline scripts, and unpkg CDN |
| `style-src` | `'self' 'unsafe-inline' https://unpkg.com` | Allow styles from same origin, inline styles, and unpkg |
| `img-src` | `'self' data: https: blob:` | Allow images from same origin, data URIs, HTTPS, and blobs |
| `connect-src` | `'self' https:` | Allow fetch/XHR to same origin and HTTPS endpoints |
| `font-src` | `'self' data:` | Allow fonts from same origin and data URIs |
| `worker-src` | `'self' blob:` | Allow service workers from same origin and blob URLs |

**Note:** `'unsafe-inline'` is used for demo convenience. Production apps should use nonces or hashes.

---

## Usage Examples

### Example 1: Basic Demo Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GeoLeaf Demo</title>
  
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <link rel="stylesheet" href="../dist/geoleaf.min.css">
  
  <style>
    body { margin: 0; font-family: Arial, sans-serif; }
    #map { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="../dist/geoleaf.min.js"></script>
  <script src="demo.extensions.js"></script>
  <script>
    // Enable verbose mode
    DemoLog.setVerbose(true);
    
    DemoLog.log('Initializing demo...');
    
    // Initialize map
    const map = GeoLeaf.init({
      map: {
        target: 'map',
        center: [48.8566, 2.3522],
        zoom: 12
      },
      data: {
        activeProfile: 'tourism',
        profilesBasePath: '../profiles/'
      }
    });
    
    DemoLog.info('Demo initialized successfully');
    
    // Add sample POI
    GeoLeaf.POI.add({
      id: 'eiffel-tower',
      latlng: [48.8584, 2.2945],
      title: 'Eiffel Tower',
      category: 'monument'
    });
    
    DemoLog.log('Added sample POI');
  </script>
</body>
</html>
```

---

### Example 2: Profile Switching Demo

```javascript
// Create profile switcher
function createProfileSwitcher() {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:10px;right:10px;background:white;padding:10px;border-radius:5px;box-shadow:0 2px 5px rgba(0,0,0,0.2);z-index:1000;';
  
  const label = document.createElement('label');
  label.textContent = 'Profile: ';
  
  const select = document.createElement('select');
  select.innerHTML = `
    <option value="tourism">Tourism</option>
  `;
  
  select.addEventListener('change', (e) => {
    DemoLog.info('Switching to profile:', e.target.value);
    sessionStorage.setItem('demo-profile', e.target.value);
    window.location.reload();
  });
  
  // Restore saved selection
  const saved = sessionStorage.getItem('demo-profile');
  if (saved) select.value = saved;
  
  container.appendChild(label);
  container.appendChild(select);
  document.body.appendChild(container);
  
  return saved || 'tourism';
}

// Use in demo
window.addEventListener('DOMContentLoaded', () => {
  const activeProfile = createProfileSwitcher();
  
  GeoLeaf.init({
    data: { activeProfile, profilesBasePath: '../profiles/' }
  });
});
```

---

### Example 3: Verbose Logging Demo

```javascript
// Demo with detailed logging
window.addEventListener('DOMContentLoaded', () => {
  // Check URL for verbose mode
  const urlParams = new URLSearchParams(window.location.search);
  const verbose = urlParams.get('verbose') === 'true';
  
  DemoLog.setVerbose(verbose);
  DemoLog.info(`Demo starting (verbose: ${verbose})`);
  
  // Initialize
  DemoLog.log('Loading GeoLeaf configuration...');
  const map = GeoLeaf.init({
    map: { target: 'map', center: [46.2, 2.2], zoom: 6 }
  });
  
  DemoLog.log('Map initialized', map);
  
  // Load POIs
  DemoLog.log('Loading POIs...');
  fetch('../profiles/tourism/data/poi.json')
    .then(r => r.json())
    .then(data => {
      DemoLog.progress('Loading POIs', 0, data.pois.length);
      
      data.pois.forEach((poi, index) => {
        GeoLeaf.POI.add(poi);
        
        if ((index + 1) % 50 === 0) {
          DemoLog.progress('Loading POIs', index + 1, data.pois.length);
        }
      });
      
      DemoLog.info('All POIs loaded successfully');
    })
    .catch(error => {
      DemoLog.error('Failed to load POIs', error);
    });
});
```

---

## Best Practices

### 1. Separation of Concerns

**DO:**
- Keep demo-specific code in `demo.extensions.js`
- Use `window.DemoLog` for all demo logging
- Load demo UI from `demo-header.html`

**DON'T:**
- Mix demo code with production library code
- Use `console.log()` directly (use `DemoLog` instead)
- Include demo files in production builds

---

### 2. Verbose Mode Usage

**DO:**
- Use `DemoLog.log()` for detailed debugging info
- Use `DemoLog.info()` for important events (always shown)
- Use `DemoLog.progress()` for long-running operations

**DON'T:**
- Log sensitive data (API keys, user info)
- Log inside tight loops (causes performance issues)
- Leave verbose mode ON in production demos

---

### 3. Profile Switching

**DO:**
- Save profile selection to `sessionStorage`
- Show loading indicator during profile switch
- Clear old map state before loading new profile

**DON'T:**
- Use `localStorage` for profile (persists too long)
- Switch profiles without page reload (causes state issues)
- Forget to update UI selector after reload

---

## Troubleshooting

### DemoLog Not Working

**Problem:** `DemoLog.log()` produces no output

**Solutions:**
1. Check verbose mode is enabled: `DemoLog.setVerbose(true)`
2. Use `DemoLog.info()` instead (always shown)
3. Check browser console filters (ensure "Verbose" level is visible)

---

### Profile Switch Not Working

**Problem:** Profile selector changes but map doesn't update

**Solutions:**
1. Ensure page reloads after selection: `window.location.reload()`
2. Check `sessionStorage` is not disabled (incognito mode)
3. Verify profile exists in `../profiles/{profileName}/`

---

### Theme Not Applying

**Problem:** Theme selector changes but colors don't update

**Solutions:**
1. Check theme CSS file is loaded: `<link href="geoleaf-theme-green.css">`
2. Verify theme class is added to body: `document.body.classList.add('theme-green')`
3. Clear browser cache (Ctrl+Shift+R)

---

## Additional Resources

- **[User Guide](USER_GUIDE.md)** - Complete GeoLeaf features
- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - Profile and JSON configuration
- **[Developer Guide](DEVELOPER_GUIDE.md)** - Building and testing
- **[Security Guide](SECURITY_HEADERS_CORS_CSP_GUIDE.md)** - CSP configuration

---

<p align="center">
  <strong>Demo Questions?</strong><br>
  Check <a href="FAQ.md">FAQ</a> or open an <a href="https://github.com/yourusername/geoleaf-js/issues">issue</a>
</p>
