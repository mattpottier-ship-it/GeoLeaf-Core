/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/validators/index.js — SHIM LEGACY
 * Backward compatibility : expose les validators individuellement from the path
 * plat src/validators/ (old structure) → src/modules/geoleaf.validators.js
 * @module src/validators
 */
import { Validators } from "../modules/geoleaf.validators.js";

export const {
    validateCoordinates,
    validateUrl,
    validateEmail,
    validatePhone,
    validateZoom,
    validateRequiredFields,
    validateGeoJSON,
    validateColor,
    validateBatch,
} = Validators;

export { Validators };
