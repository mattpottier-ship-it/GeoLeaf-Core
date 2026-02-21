/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Filter Panel (Aggregator)
 *
 * Ce fichier est un agrégateur pour la rétrocompatibilité.
 * La logique a été déplacée dans les sous-modules :
 * - filter-panel/shared.js       : Helpers de données partagés
 * - filter-panel/state-reader.js : Lecture de l'état des filtres
 * - filter-panel/applier.js      : Application des filtres
 * - filter-panel/renderer.js     : Construction du panneau HTML
 * - filter-panel/proximity.js    : Gestion des filtres de proximité
 * - filter-panel/core.js         : API publique et délégation
 *
 * @module ui/filter-panel
 */
"use strict";

// Direct ESM import (P3-DEAD-01 complete)
// All sub-modules are loaded transitively via core.js ESM imports
import { FilterPanel } from './filter-panel/core.js';

const FilterPanelAggregator = FilterPanel;
export { FilterPanelAggregator };
