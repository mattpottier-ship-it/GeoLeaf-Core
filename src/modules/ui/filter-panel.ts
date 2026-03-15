/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Filter Panel (Aggregator)
 *
 * Ce file est un aggregator for the backward compatibility.
 * The logic has been moved into sub-modules:
 * - filter-panel/shared.js       : Helpers de data shareds
 * - filter-panel/state-reader.js : Read de the state des filtres
 * - filter-panel/applier.js      : Application des filtres
 * - filter-panel/renderer.js     : Building du panel HTML
 * - filter-panel/proximity.js    : Gestion des filtres de proximity
 * - filter-panel/core.js         : API public et delegation
 *
 * @module ui/filter-panel
 */
"use strict";

// Direct ESM import (P3-DEAD-01 completee)
// All sub-modules are loaded transitively via core.js ESM imports
import { FilterPanel } from "./filter-panel/core.js";

const FilterPanelAggregator = FilterPanel;
export { FilterPanelAggregator };
