/**
 * GeoLeaf Utils API - Assembler
 * Compatibilite ascendante. Origine: geoleaf.utils.js (Phase 11).
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
} from "./general-utils";
import { DOMSecurity } from "./dom-security";
import { AnimationHelper } from "./animation-helper";
import { FetchHelper } from "./fetch-helper";

const _g = (
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {}
) as Window & { GeoLeaf?: Record<string, unknown> };

if (!_g.GeoLeaf) _g.GeoLeaf = {};

/**
 * Utils assemblee avec escapeHtml delegue a GeoLeaf.Security.
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
    escapeHtml(str: string | null | undefined): string {
        const sec = _g.GeoLeaf?.Security as { escapeHtml?: (s: string) => string } | undefined;
        if (sec && typeof sec.escapeHtml === "function") return sec.escapeHtml(String(str ?? ""));
        if (str == null) return "";
        return String(str).replace(
            /[&<>"']/g,
            (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c
        );
    },
});

const utilsTarget = (_g.GeoLeaf!.Utils ?? {}) as Record<string, unknown>;
Object.assign(utilsTarget, Utils);
_g.GeoLeaf!.Utils = utilsTarget;
