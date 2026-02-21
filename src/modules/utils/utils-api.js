/** GeoLeaf Utils API - implementation deplacee depuis geoleaf.utils.js */
/*!
 * GeoLeaf Core
 * Â© 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Utils API - Assembler
 * Compatibilite ascendante. Origine: geoleaf.utils.js (Phase 11).
 * Assigne _g.GeoLeaf.Utils pour les tests legacy.
 */
import {
    Utils as _UtilsBase,
    validateUrl,
    deepMerge,
    debounce,
    throttle,
    getDistance,
    resolveField,
    mergeOptions,
    fireMapEvent,
    compareByOrder,
} from "./general-utils.js";
import { DOMSecurity } from "./dom-security.js";
import { AnimationHelper } from "./animation-helper.js";
import { FetchHelper } from "./fetch-helper.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
_g.GeoLeaf = _g.GeoLeaf || {};

/**
 * Utils assemblee avec escapeHtml delegue a GeoLeaf.Security.
 * Retro-compatibilite des tests legacy qui appellent Utils.escapeHtml.
 */
export const Utils = Object.assign({}, _UtilsBase, {
    validateUrl,
    deepMerge,
    debounce,
    throttle,
    getDistance,
    resolveField,
    mergeOptions,
    fireMapEvent,
    compareByOrder,
    DOMSecurity,
    AnimationHelper,
    FetchHelper,
    /** @deprecated - delegue a GeoLeaf.Security.escapeHtml */
    escapeHtml(str) {
        const sec = _g.GeoLeaf && _g.GeoLeaf.Security;
        if (sec && typeof sec.escapeHtml === "function") return sec.escapeHtml(str);
        if (!str) return str;
        return String(str).replace(
            /[&<>"']/g,
            (c) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                })[c]
        );
    },
});

if (!_g.GeoLeaf.Utils) _g.GeoLeaf.Utils = {};
Object.assign(_g.GeoLeaf.Utils, Utils);
