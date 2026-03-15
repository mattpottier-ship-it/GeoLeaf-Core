/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/poi/index.js — SHIM LEGACY
 * Backward compatibility : expose POI from src/poi/ → src/modules/geoleaf.poi.js
 * + fonctions individuelles from src/modules/poi/normalizers.js
 * @module src/poi
 */
import { POI } from "../modules/geoleaf.poi.js";
import { POINormalizers } from "../modules/poi/normalizers.js";

// Fonctions de normalisation (availables dans POINormalizers)
export const { normalizePoi, getFieldValue, extractCoordinates, generatePoiId } = POINormalizers;

export { POI };
