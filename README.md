# GeoLeaf JS

**Product Version:** GeoLeaf Platform V1
**Version:** 4.0.0
**License:** MIT
**Description:** Modern JavaScript mapping library built on Leaflet with advanced features for interactive web mapping applications.

> **Versioning policy**
>
> - Product label: **GeoLeaf Platform V1**
> - Technical SemVer (packages/releases): **4.x**
> - Details: [docs/VERSIONING_POLICY.md](docs/VERSIONING_POLICY.md)

> **Licence scope (important)**
>
> - **GeoLeaf Core (`geoleaf`, ce dépôt)** : licence **MIT** (usage, modification, redistribution autorisés selon MIT)
> - **Plugins premium (`@geoleaf-plugins/storage`, `@geoleaf-plugins/addpoi`)** : **licence commerciale** distincte
> - Les plugins premium ne sont **pas** couverts par la licence MIT du core

[![npm version](https://img.shields.io/npm/v/geoleaf.svg)](https://www.npmjs.com/package/geoleaf)
[![npm downloads](https://img.shields.io/npm/dm/geoleaf.svg)](https://www.npmjs.com/package/geoleaf)
[![GitHub license](https://img.shields.io/github/license/mattpottier-ship-it/geoleaf-js)](LICENCE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENCE)

---

## 🚀 Quick Start

Get started with GeoLeaf in less than 5 minutes:

### Installation

**Via NPM (recommended — ESM):**

```bash
npm install geoleaf
```

```javascript
// ES Modules (recommended)
import { Core, GeoJSON, POI, Filters } from "geoleaf";
import "geoleaf/dist/geoleaf.min.css";

Core.init({
    map: { target: "map", center: [46.5, 2.5], zoom: 6 },
});
```

**Via CDN (UMD — legacy):**

```html
<!-- Leaflet (required dependency) -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- GeoLeaf -->
<link rel="stylesheet" href="https://unpkg.com/geoleaf@latest/dist/geoleaf.min.css" />
<script src="https://unpkg.com/geoleaf@latest/dist/geoleaf.min.js"></script>
```

### Your First Map

```html
<!DOCTYPE html>
<html>
    <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/geoleaf@latest/dist/geoleaf.min.css" />
        <style>
            #map {
                height: 600px;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>

        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/geoleaf@latest/dist/geoleaf.min.js"></script>
        <script>
            // Initialize map
            const map = GeoLeaf.init({
                map: {
                    target: "map",
                    center: [46.5, 2.5],
                    zoom: 6,
                },
            });

            // Add a POI marker
            GeoLeaf.POI.add({
                id: "poi-1",
                latlng: [48.8566, 2.3522],
                title: "Paris",
                category: "city",
            });
        </script>
    </body>
</html>
```

---

## ❓ Why GeoLeaf?

### GeoLeaf vs Popular Alternatives

| Feature                       | Leaflet       | Google Maps    | Mapbox GL      | **GeoLeaf**         |
| ----------------------------- | ------------- | -------------- | -------------- | ------------------- |
| **Security (XSS Protection)** | ⚠️ Basic      | ✅ Built-in    | ⚠️ Basic       | ✅ Advanced         |
| **GeoJSON Multi-Style**       | ⚠️ Limited    | ✅ Full        | ✅ Full        | ✅ Full             |
| **Offline Support**           | ❌ No         | ❌ No          | ⚠️ Partial     | ✅ Full (IndexedDB) |
| **POI Clustering**            | ⚠️ Via Plugin | ✅ Built-in    | ✅ Built-in    | ✅ Built-in         |
| **Label System**              | ❌ No         | ✅ Built-in    | ✅ Built-in    | ✅ Built-in         |
| **Business Profiles**         | ❌ No         | ❌ No          | ❌ No          | ✅ Multi-profile    |
| **Open Source**               | ✅ BSD-2      | ❌ Proprietary | ✅ Proprietary | ✅ MIT              |
| **Free for Production**       | ✅ Yes        | ⚠️ Paid API    | ⚠️ Paid        | ✅ Yes              |
| **Offline-First Ready**       | ❌ No         | ❌ No          | ❌ No          | ✅ Yes              |
| **TypeScript Support**        | ⚠️ Community  | ✅ Official    | ✅ Official    | ✅ Full             |

### Best For

**Choose GeoLeaf if you need:**

- ✅ Security-first mapping (XSS protection built-in)
- ✅ Offline-first applications (mobile, unreliable networks)
- ✅ Business context switching (profiles)
- ✅ Complex styling rules per layer
- ✅ Open source with MIT licensing
- ✅ Professional mapping without vendor lock-in

**Use Leaflet if:**

- Lightweight, no-frills mapping
- Maximum plugin ecosystem
- Minimal dependencies

**Use Google Maps if:**

- Enterprise support needed
- Extensive street view/Street Data
- Google services integration essential

---

## ✨ Features

### 🗺️ **Multi-Profile System**

Switch between different business contexts (Tourism, Custom…) with dedicated configurations, taxonomies, and UI presets.

### 📍 **Advanced POI Management**

- Category-based organization with icons
- Custom sidepanel layouts (JSON-driven)
- Search, filters, and clustering
- Add/Edit/Delete with validation

### 🎨 **Dynamic Theming**

- Light/Dark mode with system detection
- Primary & secondary theme switchers
- Layer visibility presets per theme
- CSS custom properties integration

### 📊 **GeoJSON Layers**

- Load multiple GeoJSON layers from configuration
- Style system with multiple presets per layer
- Labels with scale-based visibility
- Interactive shapes with tooltips/popups

### 🔄 **Offline Cache**

_(via plugin premium Storage)_

- IndexedDB storage for profiles and data
- Basemap tile caching for offline usage
- Automatic cache management
- Progress tracking and notifications

### 🏷️ **Integrated Labels System**

- Style-based label configuration
- Scale-dependent visibility
- Dynamic field rendering
- Toggle controls in layer manager

### 🎯 **Smart Filters**

- Category/subcategory filtering
- Tag-based filtering
- Full-text search
- Proximity/radius filtering
- Result counters

### 📋 **Data Table**

- Tabular view of layer features
- Sortable columns
- Export to CSV/Excel
- Synchronized with map selection

### 🔒 **Security**

- XSS protection via Content Security Policy
- Input sanitization
- Safe HTML rendering
- CORS headers support

---

## 📖 Documentation

**📚 [Complete Documentation Index](docs/INDEX.md)** - Browse all documentation organized by category

### Getting Started

- **[Getting Started Guide](docs/GETTING_STARTED.md)** - Your first map in 5 minutes
- **[User Guide](docs/USER_GUIDE.md)** - Complete user documentation (10 sections)
- **[Configuration Guide](docs/CONFIGURATION_GUIDE.md)** - JSON configuration reference (9 types)
- **[Profiles Guide](docs/PROFILES_GUIDE.md)** - Create custom business profiles (1,200+ lines)

### Development

- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Complete development workflow (build, test, deploy)
- **[API Reference](docs/API_REFERENCE.md)** - Complete API documentation (80+ methods)
- **[Contributing Guide](docs/CONTRIBUTING.md)** - Contribution guidelines and standards
- **[Architecture Guide](docs/ARCHITECTURE_GUIDE.md)** - System architecture and design patterns

### Guides & References

- **[Profiles Guide](docs/PROFILES_GUIDE.md)** - Create custom business profiles (1,200+ lines)
- **[Demo System Guide](docs/DEMO_SYSTEM_GUIDE.md)** - Demo page and DemoLog API
- **[JSON Schemas](docs/schema/)** - Validation schemas for profiles
- **[Cookbook](docs/COOKBOOK.md)** - Practical recipes and solutions
- **[FAQ](docs/FAQ.md)** - Frequently asked questions
- **[Project Structure](docs/PROJECT_TREE.md)** - Complete project tree

### Module Documentation

- [Baselayers](docs/baselayers/GeoLeaf_Baselayers_README.md) - Basemap management
- [Configuration](docs/config/GeoLeaf_Config_README.md) - Profile loading
- [POI Management](docs/poi/GeoLeaf_POI_README.md) - Points of Interest
- [GeoJSON Layers](docs/geojson/GEOJSON_LAYERS_GUIDE.md) - Vector layers
- [Labels System](docs/labels/GeoLeaf_Labels_README.md) - Map labels
- [Themes](docs/themes/GeoLeaf_Themes_README.md) - Theme system
- [Storage & Cache](docs/storage/GeoLeaf_Storage_README.md) - Offline storage
- [UI Components](docs/ui/GeoLeaf_UI_README.md) - User interface
- [View all modules →](docs/)

---

## ⚡ Performance Metrics

GeoLeaf is optimized for production performance:

- **Bundle Size**: See build output in `packages/core/dist/` (UMD/ESM; size depends on features and tree-shaking)
- **Tree-Shaking**: 75.7% code reduction in production build
- **Initialization**: < 100ms on modern devices
- **Runtime Performance**: Smooth interactions with 1000+ POI markers
- **Offline Support**: Full app functionality without network
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ (ES2020+)

### Code Quality

- **Test Coverage**: 70% Jest + Playwright e2e
- **Security**: XSS protection, input sanitization, CSP headers
- **TypeScript**: Full type definitions (772 lines)
- **ESLint**: 0 warnings in production code

---

## 🏗️ Architecture

GeoLeaf is developed in a **Turborepo monorepo** (GeoLeaf-Js). The core library lives in `packages/core/` (TypeScript, 250+ source files); optional plugins are in `packages/plugin-storage` and `packages/plugin-addpoi`.

```
GeoLeaf-Js/
├── packages/
│   ├── core/                 # @geoleaf/core (MIT) — main library
│   │   └── src/              # TypeScript: app/, poi/, geojson/, ui/, filters/, route/, table/, ...
│   ├── plugin-storage/       # Storage / cache plugin (commercial)
│   └── plugin-addpoi/        # Add/Edit POI plugin (commercial)
├── apps/demo/                # Demo application
├── deploy/                   # Deploy variants (deploy-core, deploy-storage, deploy-storage-addpoi) — npm run build:deploy
├── profiles/                 # Business profiles (e.g. tourism)
└── docs/                     # Documentation
```

See [Developer Guide](docs/DEVELOPER_GUIDE.md) and [PROJECT_TREE](docs/PROJECT_TREE.md) for structure and build details.

---

## 🎯 Use Cases

### Tourism & Heritage

Display points of interest, tourist routes, climate data, and protected areas with category-based filtering and rich popups.

### Custom Applications

Build your own business-specific mapping application using the flexible profile system.

---

## 🔧 Configuration

GeoLeaf uses a **profile-based configuration system** with JSON files:

### Main Configuration (`geoleaf.config.json`)

```json
{
    "debug": false,
    "data": {
        "activeProfile": "tourism",
        "profilesBasePath": "./profiles"
    }
}
```

### Profile Configuration (`profiles/tourism/profile.json`)

```json
{
  "id": "tourism",
  "label": "Tourism",
  "version": "1.0.0",
  "ui": {
    "showLegend": true,
    "showLayerManager": true,
    "showFilterPanel": true
  },
  "basemaps": { ... },
  "layers": { ... },
  "taxonomy": { ... },
  "themes": { ... }
}
```

See [Configuration Guide](docs/CONFIGURATION_GUIDE.md) for complete reference.

---

## 🛠️ Development

### Prerequisites

- Node.js 18+ and npm
- Modern browser with ES6+ support

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/geoleaf-js.git
cd geoleaf-js

# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Project Scripts

- `npm start` - Start development server
- `npm test` - Run test suite (Jest)
- `npm run test:e2e` - Run E2E tests (Playwright)
- `npm run build` - Build production bundle
- `npm run lint` - Lint code
- `npm run coverage` - Generate coverage report

See [Developer Guide](docs/DEVELOPER_GUIDE.md) for detailed setup instructions.

---

## 📦 Distribution

### NPM Package

```bash
npm install geoleaf
```

```javascript
import GeoLeaf from "geoleaf";
import "geoleaf/dist/geoleaf.min.css";
```

### CDN (jsDelivr)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geoleaf@4.0.0/dist/geoleaf.min.css" />
<script src="https://cdn.jsdelivr.net/npm/geoleaf@4.0.0/dist/geoleaf.min.js"></script>
```

### Build from Source

See [Distribution Guide](docs/guides/DISTRIBUTION_GUIDE_2026.md) for packaging instructions.

---

## 🧪 Testing

- **Unit tests:** Jest (4500+ tests in core)
- **Integration tests:** Jest with mock DOM
- **E2E tests:** Playwright
- **Coverage:** 80%+ target

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Generate coverage report
npm run test:e2e            # E2E tests
```

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/CONTRIBUTING.md) for:

- Code standards and conventions
- Branch naming and PR process
- Testing requirements
- Documentation guidelines

---

## 📄 License

MIT License - see [LICENCE](LICENCE) file for details.

---

## 🙏 Credits

### Built With

- [Leaflet](https://leafletjs.com/) - Interactive maps
- [Turf.js](https://turfjs.org/) - Geospatial analysis
- Modern JavaScript (ES6+)

### Maintainers

- **Lead Developer:** [Your Name]

---

## 📞 Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/geoleaf-js/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/geoleaf-js/discussions)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for:

- **How to contribute:** Bug reports, features, documentation
- **Development setup:** Local development environment
- **Code standards:** ESLint, Prettier, JSDoc formatting
- **Testing requirements:** 75% coverage minimum
- **Pull request process:** Code review and merge guidelines
- **Versioning:** Semantic versioning and conventional commits
- **Publishing:** Release process and npm automation

### Quick Start Contributing

```bash
# Clone and setup
git clone https://github.com/yourusername/geoleaf-js.git
cd geoleaf-js
npm install

# Run tests
npm run test:watch

# Check code quality
npm run lint

# Build production bundle
npm run build
```

---

## 📄 License & Legal

**License:** MIT (Open Source)

GeoLeaf Core is released under the **MIT License** - free for commercial and personal use.

- **Core only:** This repository and its published documentation describe **only** GeoLeaf Core (MIT). They do not cover plugin features or commercial licensing.
- **Plugins:** Optional packages (`@geoleaf-plugins/storage`, `@geoleaf-plugins/addpoi`) are separately licensed (commercial). See each plugin's package and documentation for their terms.
- See [LICENCE](LICENCE) for the complete license text
- See [NOTICE.md](docs/NOTICE.md) for core vs modules and third-party attributions
- See [LICENSE_HEADERS.md](docs/LICENSE_HEADERS.md) for code header requirements

### Using GeoLeaf

✅ **You can:**

- Use in commercial projects
- Modify and redistribute
- Use for private projects
- Include in open source projects

⚠️ **You must:**

- Include license and copyright notice
- Document changes

❌ **You cannot:**

- Hold the author liable
- Use the author's name for endorsement

---

## 🗺️ Roadmap

### Version 3.3 (Q3 2026)

- [ ] Enhanced mobile support
- [ ] WebGL renderer for large datasets
- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard

### **[CHANGELOG.md](CHANGELOG.md)** for complete version history and upgrade guides

- [ ] TypeScript migration
- [ ] Plugin system
- [ ] 3D visualization support
- [ ] Cloud storage integration

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## License

GeoLeaf Core is released under the MIT License.  
© 2026 Mattieu Pottier

For licensing and the distinction between GeoLeaf Core (MIT) and optional commercial plugins, see [NOTICE.md](docs/NOTICE.md).

---

<p align="center">
  Made with ❤️ for the geospatial community
</p>
