/*!
 * GeoLeaf Core – Filters / POI Filter
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

import { Log } from "../log/index.js";
import { getNestedValue, getSearchFieldsFromProfile } from "./utils.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
/**
 * Fallback Haversine distance (metres) — used when GeoLeaf.Utils is not loaded.
 * @param {number} lat1 @param {number} lng1 @param {number} lat2 @param {number} lng2
 * @returns {number}
 */
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
/**
 * Extrait la note moyenne d'un objet (POI ou route).
 * @param {object} attrs - attributes
 * @param {object} item  - objet racine
 * @param {object} props - properties
 * @returns {{ avg: number, hasRating: boolean }}
 */
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

/**
 * Normalise un tableau de tags (string CSV, tableau ou autre).
 * @param {*} rawTags
 * @returns {string[]}
 */
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
 * Filtre une liste de POI selon les critères fournis.
 * @param {Array} basePois
 * @param {object} filterState
 * @returns {Array}
 */
export function filterPoiList(basePois, filterState) {
    const catsSel = filterState.categoriesTree || [];
    const subsSel = filterState.subCategoriesTree || [];
    const hasCats = catsSel.length > 0;
    const hasSubs = subsSel.length > 0;
    const hasMinRating = !!filterState.hasMinRating;
    const minRating = filterState.minRating;
    const selectedTags = filterState.selectedTags || [];
    const hasTags = filterState.hasTags;
    const dataTypes = filterState.dataTypes || { poi: true, routes: true };
    const searchText = (filterState.searchText || "").toLowerCase();
    const hasSearchText = filterState.hasSearchText || false;
    const proximity = filterState.proximity || { active: false };

    if (!Array.isArray(basePois) || basePois.length === 0) {
        Log.debug("[Filters] Aucun POI à filtrer");
        return [];
    }

    Log.debug("[Filters] Début filtrage POI:", {
        totalPOI: basePois.length,
        hasCats,
        hasSubs,
        hasSearchText,
        proximityActive: proximity.active,
    });

    const getDistance = _g.GeoLeaf?.Utils?.getDistance ?? _haversine;

    return basePois.filter((poi) => {
        const attrs = poi.attributes || {};
        const props = poi.properties || {};

        // Filtre type de données
        const poiType = poi.type || attrs.type || props.type || "poi";
        if (poiType === "route" || poiType === "routes") {
            if (!dataTypes.routes) return false;
        } else {
            if (!dataTypes.poi) return false;
        }

        // Filtre recherche textuelle
        if (hasSearchText) {
            const searchFields =
                filterState.searchFields?.length > 0
                    ? filterState.searchFields
                    : getSearchFieldsFromProfile();
            const matchFound = searchFields.some((fieldPath) => {
                const value = getNestedValue(poi, fieldPath);
                if (Array.isArray(value)) {
                    return value.some((v) => String(v).toLowerCase().includes(searchText));
                }
                return value && String(value).toLowerCase().includes(searchText);
            });
            if (!matchFound) return false;
        }

        // Filtre proximité
        if (proximity.active && proximity.center) {
            let lat, lng;
            if (poi.latlng && Array.isArray(poi.latlng) && poi.latlng.length === 2) {
                [lat, lng] = poi.latlng;
            } else {
                lat =
                    poi.lat ??
                    poi.latitude ??
                    attrs.latitude ??
                    props.latitude ??
                    poi.coordinates?.[1] ??
                    poi.geometry?.coordinates?.[1];
                lng =
                    poi.lng ??
                    poi.longitude ??
                    attrs.longitude ??
                    props.longitude ??
                    poi.coordinates?.[0] ??
                    poi.geometry?.coordinates?.[0];
            }
            if (lat && lng) {
                if (
                    getDistance(proximity.center.lat, proximity.center.lng, lat, lng) >
                    proximity.radius
                )
                    return false;
            } else {
                return false;
            }
        }

        // Résolution catégorie / sous-catégorie
        const catId = String(
            attrs.categoryId ??
                poi.categoryId ??
                poi.category ??
                props.categoryId ??
                props.category ??
                ""
        );
        const subId = String(
            attrs.subCategoryId ??
                poi.subCategoryId ??
                poi.subCategory ??
                poi.sub_category ??
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

        // Filtre note minimale
        if (hasMinRating) {
            const { avg, hasRating } = _extractRating(attrs, poi, props);
            if (!hasRating || avg < minRating) return false;
        }

        // Filtre tags
        if (hasTags) {
            const poiTags = _normalizeTags(attrs.tags ?? poi.tags ?? props.tags);
            if (!selectedTags.some((tag) => poiTags.includes(tag))) return false;
        }

        return true;
    });
}
