/*!
 * GeoLeaf Core – Filters / Route Filter
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

import { Log } from "../log/index.js";
import { getNestedValue, getSearchFieldsFromProfile, extractRouteCoords } from "./utils.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
function _haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function _extractRating(attrs, item, props) {
    let avg = 0;
    let hasRating = false;

    const reviewsObj = attrs.reviews || item.reviews || props.reviews;
    if (reviewsObj && typeof reviewsObj === "object" && !Array.isArray(reviewsObj)) {
        if (typeof reviewsObj.rating === "number") {
            avg = reviewsObj.rating;
            hasRating = true;
        }
    } else if (Array.isArray(reviewsObj) && reviewsObj.length > 0) {
        const sum = reviewsObj.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        avg = sum / reviewsObj.length;
        hasRating = avg > 0;
    } else if (typeof attrs.rating === "number") {
        avg = attrs.rating;
        hasRating = true;
    } else if (typeof item.rating === "number") {
        avg = item.rating;
        hasRating = true;
    } else if (typeof props.rating === "number") {
        avg = props.rating;
        hasRating = true;
    }
    return { avg, hasRating };
}

function _normalizeTags(rawTags) {
    if (Array.isArray(rawTags)) return rawTags.map((t) => String(t).trim()).filter(Boolean);
    if (typeof rawTags === "string")
        return rawTags
            .split(/[,;]+/)
            .map((t) => t.trim())
            .filter(Boolean);
    return [];
}

/**
 * Filtre une liste de routes selon les critères fournis.
 * @param {Array} baseRoutes
 * @param {object} filterState
 * @returns {Array}
 */
export function filterRouteList(baseRoutes, filterState) {
    const catsSel = filterState.categoriesTree || [];
    const subsSel = filterState.subCategoriesTree || [];
    const hasCats = catsSel.length > 0;
    const hasSubs = subsSel.length > 0;
    const selectedTags = filterState.selectedTags || [];
    const hasTags = filterState.hasTags;
    const hasMinRating = !!filterState.hasMinRating;
    const minRating = filterState.minRating;
    const searchText = (filterState.searchText || "").toLowerCase();
    const hasSearchText = filterState.hasSearchText || false;
    const proximity = filterState.proximity || { active: false };

    if (!Array.isArray(baseRoutes) || baseRoutes.length === 0) {
        Log.debug("[Filters] Aucune route à filtrer");
        return [];
    }

    Log.debug("[Filters] Début filtrage routes:", {
        totalRoutes: baseRoutes.length,
        hasCats,
        hasSubs,
        hasMinRating,
        minRating,
        hasSearchText,
        proximityActive: proximity.active,
    });

    const getDistance = _g.GeoLeaf?.Utils?.getDistance ?? _haversine;

    return baseRoutes.filter((route) => {
        const attrs = route.attributes || {};
        const props = route.properties || {};

        // Filtre recherche textuelle
        if (hasSearchText) {
            const searchFields =
                filterState.searchFields?.length > 0
                    ? filterState.searchFields
                    : getSearchFieldsFromProfile();
            const matchFound = searchFields.some((fieldPath) => {
                const value = getNestedValue(route, fieldPath);
                return value && String(value).toLowerCase().includes(searchText);
            });
            if (!matchFound) return false;
        }

        // Résolution catégorie / sous-catégorie
        const catId = String(
            attrs.categoryId ??
                route.categoryId ??
                route.category ??
                props.categoryId ??
                props.category ??
                ""
        );
        const subId = String(
            attrs.subCategoryId ??
                route.subCategoryId ??
                route.subCategory ??
                route.sub_category ??
                props.subCategoryId ??
                props.sub_category ??
                ""
        );

        if (hasCats || hasSubs) {
            if (hasSubs) {
                if (!subId || !subsSel.includes(subId)) return false;
            } else if (hasCats) {
                if (!catId || !catsSel.includes(catId)) return false;
            }
        }

        // Filtre tags
        if (hasTags) {
            const routeTags = _normalizeTags(attrs.tags ?? route.tags ?? props.tags);
            if (!selectedTags.some((tag) => routeTags.includes(tag))) return false;
        }

        // Filtre note minimale
        if (hasMinRating) {
            const { avg, hasRating } = _extractRating(attrs, route, props);
            if (!hasRating || avg < minRating) return false;
        }

        // Filtre proximité (au moins un point de l'itinéraire dans le rayon)
        if (proximity.active && proximity.center) {
            const coords = extractRouteCoords(route);
            if (coords.length === 0) return false;

            const isInRadius = coords.some(
                ([lat, lng]) =>
                    getDistance(proximity.center.lat, proximity.center.lng, lat, lng) <=
                    proximity.radius
            );
            if (!isInRadius) return false;
        }

        return true;
    });
}
