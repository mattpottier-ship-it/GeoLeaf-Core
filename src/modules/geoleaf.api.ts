/*!
 * GeoLeaf Core - API (facade publique)
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

"use strict";

// Side-effect import — garantit que Object.assign(GeoLeaf, { loadConfig, init, ... })
// s'exécute dans le bundle UMD même avec tree-shaking agressif.
// Un re-export pur (export { X } from "...") ne suffit pas : Rollup peut l'éliminer
// si aucun consommateur n'importe X explicitement.
import "./api/geoleaf-api.js";
export { GeoLeafAPI } from "./api/geoleaf-api.js";
