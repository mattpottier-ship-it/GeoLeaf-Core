# GeoLeaf Notice and License Attribution

Product Version: GeoLeaf Platform V1

## License

**GeoLeaf Core** is released under the **MIT License**.

```
© 2026 Mattieu Pottier
Released under the MIT License
https://geoleaf.dev
```

See the [LICENCE](../LICENCE) file for the complete license text.

---

## Core vs Modules

### GeoLeaf Core (Open Source)

GeoLeaf Core is an open-source JavaScript mapping library. It includes:

- **Framework bootstrap** - Application initialization and configuration
- **Core mapping** - Leaflet wrapper and map management
- **Configuration system** - Configuration loading and validation
- **Logging and errors** - Unified logging and error handling
- **UI components** - Base UI system, controls, panels
- **Security** - XSS protection and input sanitization
- **Utilities** - Helper functions and utility library

**Perpetual Status**: The GeoLeaf Core library is and will remain permanently open-source under the MIT License.

### Optional Plugins (Separate Licensing)

GeoLeaf offers **optional** plugin packages that extend Core functionality. These plugins are **not** covered by the MIT License applied to GeoLeaf Core:

- **@geoleaf-plugins/storage** — Offline cache, IndexedDB, sync (commercial license)
- **@geoleaf-plugins/addpoi** — Add/Edit POI form, placement, image upload (commercial license)

Plugin modules:

- ✅ Are **optional** — Core works fully without them
- ✅ Are **independently licensed** — see each package and its documentation for terms
- ✅ Do **not** affect the MIT License of GeoLeaf Core

**Important**: This NOTICE and the MIT License apply only to GeoLeaf Core. For plugin licensing, refer to the respective plugin package and its legal documentation.

---

## Dependencies

GeoLeaf depends on the following open-source libraries:

- **Leaflet.js** (https://leafletjs.com) - MIT License
- **Additional dependencies** - See `package.json` for complete list

---

## Attribution and Acknowledgments

GeoLeaf thanks the following communities and projects:

- **Leaflet.js** - Foundational mapping library
- **OpenStreetMap** - Mapping data and community
- **JavaScript mapping community** - Design patterns and best practices

---

## Contributing

When contributing to GeoLeaf, please ensure all new code includes the appropriate license header. See [LICENSE_HEADERS.md](./LICENSE_HEADERS.md) for details.

---

## Questions

For questions about licensing, see [CONTRIBUTING.md](./CONTRIBUTING.md#licensing) or visit https://geoleaf.dev.
