/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Legend Module - Basemap Selector
 *
 * # SHIM LEGACY — redirect de path
 * This file redirects to the canonical module located in layer-manager/.
 * The old API assumed this component was under legend/, but it is actually
 * dans src/modules/layer-manager/basemap-selector.js.
 *
 * @module legend/basemap-selector
 * @deprecated Utiliser src/modules/layer-manager/basemap-selector.js directly
 * @see src/modules/layer-manager/basemap-selector.js
 */

export { BasemapSelector } from "../layer-manager/basemap-selector.js";
