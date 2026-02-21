/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/filters/index.js — SHIM LEGACY
 * Rétrocompatibilité : expose les filtres depuis src/filters/ (ancienne structure)
 * → src/modules/geoleaf.filters.js
 * @module src/filters
 */
import { Filters as _Filters } from "../modules/geoleaf.filters.js";

// Fonctions principales déléguées au module core
export const { filterPoiList, filterRouteList } = _Filters;

// ── Helpers internes ──────────────────────────────────────────────────────────

function _getCatId(item) {
    return item?.attributes?.categoryId ?? item?.properties?.categoryId ?? null;
}
function _getSubCatId(item) {
    return item?.attributes?.subCategoryId ?? item?.properties?.subCategoryId ?? null;
}
function _getTags(item) {
    const raw = item?.attributes?.tags ?? item?.properties?.tags;
    if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean);
    if (typeof raw === "string")
        return raw
            .split(/[,;]+/)
            .map((t) => t.trim())
            .filter(Boolean);
    return [];
}
function _extractRating(item) {
    const attrs = item?.attributes || {};
    const props = item?.properties || {};
    const reviewsObj = attrs.reviews || item.reviews || props.reviews;
    if (reviewsObj && typeof reviewsObj === "object" && !Array.isArray(reviewsObj)) {
        if (typeof reviewsObj.rating === "number") return reviewsObj.rating;
    }
    if (Array.isArray(reviewsObj) && reviewsObj.length > 0) {
        const sum = reviewsObj.reduce((a, r) => a + (Number(r.rating) || 0), 0);
        return sum / reviewsObj.length;
    }
    if (typeof attrs.rating === "number") return attrs.rating;
    if (typeof props.rating === "number") return props.rating;
    return null;
}

// ── Utility exports ────────────────────────────────────────────────────────────

export function getUniqueCategories(items = []) {
    if (!Array.isArray(items)) return [];
    return [...new Set(items.map(_getCatId).filter(Boolean))].sort();
}

export function getUniqueSubCategories(items = []) {
    if (!Array.isArray(items)) return [];
    return [...new Set(items.map(_getSubCatId).filter(Boolean))].sort();
}

export function getUniqueTags(items = []) {
    if (!Array.isArray(items)) return [];
    return [...new Set(items.flatMap(_getTags))].sort();
}

export function countByCategory(items = []) {
    if (!Array.isArray(items)) return {};
    return items.reduce((acc, item) => {
        const c = _getCatId(item);
        if (c) acc[c] = (acc[c] || 0) + 1;
        return acc;
    }, {});
}

export function countBySubCategory(items = []) {
    if (!Array.isArray(items)) return {};
    return items.reduce((acc, item) => {
        const c = _getSubCatId(item);
        if (c) acc[c] = (acc[c] || 0) + 1;
        return acc;
    }, {});
}

export function getRatingStats(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
        return { min: 0, max: 0, avg: 0, count: 0, withRating: 0, withoutRating: 0 };
    }
    const ratings = items.map(_extractRating);
    const defined = ratings.filter((r) => r !== null && r > 0);
    const withRating = defined.length;
    const withoutRating = items.length - withRating;
    if (withRating === 0) {
        return { min: 0, max: 0, avg: 0, count: items.length, withRating: 0, withoutRating };
    }
    const min = Math.min(...defined);
    const max = Math.max(...defined);
    const avg = defined.reduce((a, b) => a + b, 0) / withRating;
    return { min, max, avg, count: items.length, withRating, withoutRating };
}

// ── Namespace re-export (rétrocompat) ─────────────────────────────────────────
export const Filters = {
    ..._Filters,
    getUniqueCategories,
    getUniqueSubCategories,
    getUniqueTags,
    countByCategory,
    countBySubCategory,
    getRatingStats,
};
