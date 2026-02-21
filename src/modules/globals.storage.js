/**
 * globals.storage.js — Core only (MIT)
 *
 * Après Phase 7 : seuls offline-detector et sw-register restent dans le core.
 * Tout le reste → GeoLeaf-Plugins/plugin-storage
 *
 * @see globals.js
 */
import { OfflineDetector } from "./storage/offline-detector.js";
import { SWRegister } from "./storage/sw-register.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

_g.GeoLeaf._OfflineDetector = OfflineDetector;
_g.GeoLeaf._SWRegister = SWRegister;
// Namespace stub — enrichi par le plugin Storage au chargement
if (!_g.GeoLeaf.Storage) _g.GeoLeaf.Storage = {};
