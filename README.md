<div align="center">

# 🌿 GeoLeaf JS

**Modular JavaScript mapping library built on Leaflet**

**Product Line:** GeoLeaf Platform V1 (product naming)  
**Technical package SemVer in this repository:** 3.2.0

[![Version](https://img.shields.io/badge/version-3.2.0-blue.svg)](https://github.com/mattpottier-ship-it/GeoLeaf-Core/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900.svg)](https://leafletjs.com)

[Documentation](docs/INDEX.md) · [Getting Started](docs/GETTING_STARTED.md) · [API Reference](docs/API_REFERENCE.md) · [Live Demo](deploy/index.html)

</div>

---

## 🚀 Quick Start

### Via CDN

```html
<!-- Leaflet (peer dependency) -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- Optional: MarkerCluster -->
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />

<!-- GeoLeaf Core -->
<link rel="stylesheet" href="dist/geoleaf-main.min.css" />
<script src="dist/geoleaf.umd.js"></script>

<div id="geoleaf-map" style="height: 500px;"></div>
<script>GeoLeaf.boot();</script>
```

### Via NPM

```bash
npm install geoleaf
```

```javascript
import GeoLeaf from 'geoleaf';
GeoLeaf.boot();
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗺️ **Multi-Profile** | JSON-based configuration profiles for different use cases |
| 🎨 **Dynamic Theming** | Dark/light themes with CSS custom properties |
| 📍 **POI Management** | Display and manage Points of Interest |
| 🗂️ **GeoJSON Layers** | Load, style, and interact with GeoJSON data |
| 🔎 **Smart Filters** | Dynamic filter panels generated from profile config |
| 🛣️ **Route Display** | GPX/GeoJSON route rendering with elevation support |
| 📊 **Data Table** | Tabular view of map features with sorting & search |
| 📖 **Legend** | Auto-generated map legend from active layers |
| 🏷️ **Labels** | Configurable map labels with collision detection |
| 🔒 **Security** | Built-in XSS prevention and input sanitization |

---

## 🆚 Why GeoLeaf?

| Feature | GeoLeaf | Leaflet (raw) | Google Maps | Mapbox GL |
|---|---|---|---|---|
| Profile system | ✅ | ❌ | ❌ | ❌ |
| Zero-config boot | ✅ | ❌ | ❌ | ❌ |
| Filter panel | ✅ | ❌ | ❌ | ❌ |
| Built-in XSS protection | ✅ | ❌ | ❌ | ❌ |
| Free & open source | ✅ | ✅ | ❌ | Partial |
| No API key required | ✅ | ✅ | ❌ | ❌ |
| Bundle size (gzip) | ~128 KB | ~40 KB | N/A | ~200 KB |

---

## ⚙️ Configuration

GeoLeaf uses JSON profile files for configuration:

```json
{
  "map": {
    "center": [46.603354, 1.888334],
    "zoom": 6,
    "maxZoom": 18
  },
  "layers": [
    {
      "id": "cities",
      "label": "Villes",
      "type": "geojson",
      "url": "data/cities.geojson",
      "visible": true
    }
  ],
  "filters": {
    "enabled": true,
    "position": "left"
  },
  "theme": "dark"
}
```

See [Configuration Guide](docs/CONFIGURATION_GUIDE.md) and [Profile JSON Reference](docs/PROFILE_JSON_REFERENCE.md) for the full specification.

---

## 📁 Project Structure

```
GeoLeaf-Core/
├── dist/                   # Production-ready bundles
│   ├── geoleaf.umd.js     #   UMD bundle (development)
│   ├── geoleaf.min.js     #   Minified bundle (production)
│   ├── geoleaf.min.js.map #   Source map
│   └── geoleaf-main.min.css
├── src/                    # Source code (MIT)
│   ├── app/                #   Boot & initialization
│   │   ├── boot.js
│   │   ├── init.js
│   │   └── helpers.js
│   └── static/
│       ├── css/            #   All stylesheets
│       ├── icons/          #   Favicon, logo
│       └── js/             #   Core modules
│           ├── index.js
│           ├── geoleaf.core.js
│           ├── geoleaf.api.js
│           ├── geoleaf.ui.js
│           ├── geoleaf.filters.js
│           ├── geoleaf.poi.js
│           ├── geoleaf.route.js
│           ├── geoleaf.table.js
│           ├── geoleaf.legend.js
│           ├── geoleaf.security.js
│           └── ...
├── deploy/                 # Ready-to-deploy package
├── demo/                   # Interactive demo page
├── docs/                   # Complete documentation
├── profiles/               # Configuration profiles
├── index.d.ts              # TypeScript declarations
├── rollup.config.mjs       # Build configuration
├── package.json
├── LICENSE                  # MIT
├── NOTICE.txt
└── CHANGELOG.md
```

---

## 📖 Documentation

| Guide | Description |
|---|---|
| [Getting Started](docs/GETTING_STARTED.md) | Installation & your first map |
| [User Guide](docs/USER_GUIDE.md) | Complete usage documentation |
| [API Reference](docs/API_REFERENCE.md) | All public methods (80+) |
| [Configuration Guide](docs/CONFIGURATION_GUIDE.md) | JSON configuration system |
| [Profiles Guide](docs/PROFILES_GUIDE.md) | Multi-profile setup |
| [Architecture Guide](docs/ARCHITECTURE_GUIDE.md) | System design & modules |
| [Cookbook](docs/COOKBOOK.md) | Practical recipes & examples |
| [FAQ](docs/FAQ.md) | Common questions & answers |
| [CDN Usage](docs/usage-cdn.md) | Using GeoLeaf via CDN |

---

## 🏗️ Build from Source

```bash
git clone https://github.com/mattpottier-ship-it/GeoLeaf-Core.git
cd GeoLeaf-Core
npm install
npm run build
```

### Available Scripts

| Script | Description |
|---|---|
| `npm run build` | Build UMD + minified bundles |
| `npm run build:css` | Build & minify CSS |
| `npm run build:all` | Full build (JS + CSS) |
| `npm run build:deploy` | Generate deploy/ package |

---

## 📊 Performance

| Metric | Value |
|---|---|
| Bundle size (gzip) | ~128 KB |
| Tree-shaking efficiency | 75.7% |
| Init time | < 100ms |

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📝 License

**MIT** © 2026 [Mattieu Pottier](https://github.com/mattpottier-ship-it)

See [LICENSE](LICENSE) for the full license text.

---

## 🙏 Acknowledgments

- [Leaflet.js](https://leafletjs.com) — The mapping foundation
- [OpenStreetMap](https://www.openstreetmap.org) — Map data contributors
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) — Clustering support

---

## 🔗 Links

- [GitHub Repository](https://github.com/mattpottier-ship-it/GeoLeaf-Core)
- [Report a Bug](https://github.com/mattpottier-ship-it/GeoLeaf-Core/issues)
- [Changelog](CHANGELOG.md)
