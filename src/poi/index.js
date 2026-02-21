/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/poi/index.js — SHIM LEGACY
 * Rétrocompatibilité : expose POI depuis src/poi/ → src/modules/geoleaf.poi.js
 * + fonctions individuelles depuis src/modules/poi/normalizers.js
 * @module src/poi
 */
import { POI } from '../modules/geoleaf.poi.js';
import { POINormalizers } from '../modules/poi/normalizers.js';

// Fonctions de normalisation (disponibles dans POINormalizers)
export const {
    normalizePoi,
    getFieldValue,
    extractCoordinates,
    generatePoiId
} = POINormalizers;

export { POI };
