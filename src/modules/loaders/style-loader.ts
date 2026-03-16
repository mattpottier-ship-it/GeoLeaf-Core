/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */
/**
 * @fileoverview Aggregator for GeoLeaf style loader — re-exports from sub-modules.
 * Refactored in Sprint 1: 1549 lines split into style-cache.ts, label-extractor.ts,
 * style-loader-core.ts, style-from-layer.ts.
 * All consumers import { StyleLoader } unchanged.
 * @module loaders/style-loader
 */

"use strict";

import { styleCache, clearStyleCache } from "./style-cache.js";
import { extractLabelConfig } from "./label-extractor.js";
import {
    initStyleLoader,
    loadAndValidateStyle,
    loadStyleLenient,
    preloadStyles,
    getCacheStats,
} from "./style-loader-core.js";
import { loadStyleFromLayerConfig, getStylePath } from "./style-from-layer.js";

/**
 * Module Style Loader — exposes all public functions.
 */
const StyleLoader = {
    initStyleLoader,
    loadAndValidateStyle,
    extractLabelConfig,
    loadStyleLenient,
    preloadStyles,
    clearStyleCache,
    getCacheStats,
    loadStyleFromLayerConfig,
    getStylePath,
    styleCache,
};

export { StyleLoader };
