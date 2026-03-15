// @ts-nocheck — migration TS, typage progressif
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI - Controls
 * Barl index des controles UI Leaflet.
 * Chaque controle est defini dans son propre module.
 *
 * @module ui/controls
 */
import { initFullscreenControl } from "./control-fullscreen.js";
import { initGeolocationControl } from "./control-geolocation.js";
import { initPoiAddControl } from "./control-poi-add.js";

const _UIControls = {
    initFullscreenControl,
    initGeolocationControl,
    initPoiAddControl,
};

// ESM Export
export { _UIControls };
