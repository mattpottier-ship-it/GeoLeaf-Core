/*!
 * GeoLeaf Core — Filters / POI Filter
 * ┬® 2026 Mattieu Pottier
 * Released under the MIT License
 */

import { Log } from "../log/index.js";
import { getNestedValue, getSearchFieldsFromProfile } from "./utils.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
/**
 * Fallback Haversine distance (metres) — used when GeoLeaf.Utils is not loaded.
 * @param {number} lat1 @param {number} lng1 @param {number} lat2 @param {number} lng2
 * @returns {number}
 */
function _haversine(lat1: any, lng1: any, lat2: any, lng2: any) {
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
 * Extrait la note moyenne d'an object (POI ou route).
 * @param {object} attrs - attributes
 * @param {object} item  - object root
 * @param {object} props - properties
 * @returns {{ avg: number, hasRating: boolean }}
 */
function _extractRating(attrs: any, item: any, props: any) {
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
 * Normalise un array de tags (string CSV, array ou autre).
 * @param {*} rawTags
 * @returns {string[]}
 */
function _normalizeTags(rawTags: any) {
    if (Array.isArray(rawTags)) return rawTags.map((t) => String(t).trim()).filter(Boolean);
    if (typeof rawTags === "string")
        return rawTags
            .split(/[,;]+/)
            .map((t) => t.trim())
            .filter(Boolean);
    return [];
}

/**
 * Filtre a list de POI based on thes criteria fournis.
 * @param {Array} basePois
 * @param {object} filterState
 * @returns {Array}
 */
function _resolvePoiCoords(poi: any) {
    const attrs = poi.attributes || {};
    const props = poi.properties || {};
    if (poi.latlng && Array.isArray(poi.latlng) && poi.latlng.length === 2) {
        return { lat: poi.latlng[0], lng: poi.latlng[1] };
    }
    return {
        lat:
            poi.lat ??
            poi.latitude ??
            attrs.latitude ??
            props.latitude ??
            poi.coordinates?.[1] ??
            poi.geometry?.coordinates?.[1],
        lng:
            poi.lng ??
            poi.longitude ??
            attrs.longitude ??
            props.longitude ??
            poi.coordinates?.[0] ??
            poi.geometry?.coordinates?.[0],
    };
}

function _passesTypeFilter(poi: any, attrs: any, props: any, dataTypes: any): boolean {
    const poiType = poi.type || attrs.type || props.type || "poi";
    if (poiType === "route" || poiType === "routes") {
        return !!dataTypes.routes;
    }
    return !!dataTypes.poi;
}

function _passesSearchFilter(
    poi: any,
    hasSearchText: boolean,
    searchText: string,
    filterState: any
): boolean {
    if (!hasSearchText) return true;
    const searchFields =
        filterState.searchFields?.length > 0
            ? filterState.searchFields
            : getSearchFieldsFromProfile();
    return searchFields.some((fieldPath: any) => {
        const value = getNestedValue(poi, fieldPath);
        if (Array.isArray(value))
            return value.some((v) => String(v).toLowerCase().includes(searchText));
        return value && String(value).toLowerCase().includes(searchText);
    });
}

function _passesProximityFilter(poi: any, proximity: any, getDistance: any): boolean {
    if (!proximity.active || !proximity.center) return true;
    const { lat, lng } = _resolvePoiCoords(poi);
    if (!lat || !lng) return false;
    return getDistance(proximity.center.lat, proximity.center.lng, lat, lng) <= proximity.radius;
}

function _resolveCatIds(poi: any, attrs: any, props: any) {
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
    return { catId, subId };
}

function _matchesSinglePoi(poi: any, ctx: any): boolean {
    const {
        hasCats,
        hasSubs,
        hasMinRating,
        minRating,
        selectedTags,
        hasTags,
        dataTypes,
        searchText,
        hasSearchText,
        proximity,
        catsSel,
        subsSel,
        getDistance,
        filterState,
    } = ctx;
    const attrs = poi.attributes || {};
    const props = poi.properties || {};

    if (!_passesTypeFilter(poi, attrs, props, dataTypes)) return false;
    if (!_passesSearchFilter(poi, hasSearchText, searchText, filterState)) return false;
    if (!_passesProximityFilter(poi, proximity, getDistance)) return false;

    const { catId, subId } = _resolveCatIds(poi, attrs, props);

    if (hasCats || hasSubs) {
        if (hasSubs) {
            if (!subId || !subsSel.includes(subId)) return false;
        } else if (hasCats) {
            if (!catId || !catsSel.includes(catId)) return false;
        }
    }

    if (hasMinRating) {
        const { avg, hasRating } = _extractRating(attrs, poi, props);
        if (!hasRating || avg < minRating) return false;
    }

    if (hasTags) {
        const poiTags = _normalizeTags(attrs.tags ?? poi.tags ?? props.tags);
        if (!selectedTags.some((tag: any) => poiTags.includes(tag))) return false;
    }

    return true;
}

export function filterPoiList(basePois: any, filterState: any) {
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
        Log.debug("[Filters] No POI to filter");
        return [];
    }

    Log.debug("[Filters] POI filtering start:", {
        totalPOI: basePois.length,
        hasCats,
        hasSubs,
        hasSearchText,
        proximityActive: proximity.active,
    });

    const getDistance = _g.GeoLeaf?.Utils?.getDistance ?? _haversine;
    const ctx = {
        hasCats,
        hasSubs,
        hasMinRating,
        minRating,
        selectedTags,
        hasTags,
        dataTypes,
        searchText,
        hasSearchText,
        proximity,
        catsSel,
        subsSel,
        getDistance,
        filterState,
    };

    return basePois.filter((poi) => _matchesSinglePoi(poi, ctx));
}
