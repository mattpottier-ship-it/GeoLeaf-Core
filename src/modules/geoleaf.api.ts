/*!
 * GeoLeaf Core - API (facade public)
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */
/**
 * @module geoleaf.api
 * @description Point d'input main de GeoLeaf. Exposes {@link GeoLeafAPI}
 * qui regroup the methods `init`, `loadConfig`, `setTheme`, `createMap`,
 * `getMap`, `getAllMaps`, `removeMap`, `getModule`, `hasModule`, `getHealth`
 * et les utilitaires de cycle de vie de the map.
 *
 * @remarks
 * This file uses a side-effect import (`import "./api/geoleaf-api.js"`)
 * pour garantir que l'assignation `Object.assign(GeoLeaf, ...)` s'executes dans
 * le bundle UMD same with a tree-shaking agressif. Un re-export pur serait
 * eliminated par Rollup si aucun consommateur n'importe explicitement le symbole.
 *
 * @see {@link GeoLeafAPI}
 */
"use strict";

// Side-effect import — garantit que Object.assign(GeoLeaf, { loadConfig, init, ... })
// s'executes in the bundle UMD same avec tree-shaking agressif.
// A pure re-export (export { X } from "...") is insufficient: Rollup may eliminate it
// si aucun consommateur n'importe X explicitement.
import "./api/geoleaf-api.js";
export { GeoLeafAPI } from "./api/geoleaf-api.js";
