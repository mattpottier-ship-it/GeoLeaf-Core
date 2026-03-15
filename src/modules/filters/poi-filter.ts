/*!
 * GeoLeaf Core — Filters / POI Filter
 * © 2026 Mattieu Pottier
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
 * Extracts rating from a reviews object or array.
 */
function _extractRatingFromReviews(reviewsObj: any): { avg: number; hasRating: boolean } | null {
    if (!Array.isArray(reviewsObj) && typeof reviewsObj === "object") {
        if (typeof reviewsObj.rating === "number")
            return { avg: reviewsObj.rating, hasRating: true };
        return null;
    }
    if (Array.isArray(reviewsObj) && reviewsObj.length > 0) {
        const sum = reviewsObj.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
        const avg = sum / reviewsObj.length;
        return { avg, hasRating: avg > 0 };
    }
    return null;
}

/**
 * Extrait la note moyenne d'un object (POI ou route).
 * @param {object} attrs - attributes
 * @param {object} item  - object root
 * @param {object} props - properties
 * @returns {{ avg: number, hasRating: boolean }}
 */
function _extractRating(attrs: any, item: any, props: any): { avg: number; hasRating: boolean } {
    const reviewsObj = attrs.reviews || item.reviews || props.reviews;
    if (reviewsObj) {
        const result = _extractRatingFromReviews(reviewsObj);
        if (result) return result;
    }
    if (typeof attrs.rating === "number") return { avg: attrs.rating, hasRating: true };
    if (typeof item.rating === "number") return { avg: item.rating, hasRating: true };
    if (typeof props.rating === "number") return { avg: props.rating, hasRating: true };
    return { avg: 0, hasRating: false };
}

/**
 * Normalise un array de tags (string CSV, array ou autre).
 * @param {*} rawTags
 * @returns {string[]}
 */
function _normalizeTags(rawTags: any): string[] {
    if (Array.isArray(rawTags)) return rawTags.map((t) => String(t).trim()).filter(Boolean);
    if (typeof rawTags === "string")
        return rawTags
            .split(/[,;]+/)
            .map((t) => t.trim())
            .filter(Boolean);
    return [];
}

/** Resolves the latitude coordinate from multiple possible source fields. */
function _resolveLat(poi: any, attrs: any, props: any): number | undefined {
    return (
        poi.lat ??
        poi.latitude ??
        attrs.latitude ??
        props.latitude ??
        poi.coordinates?.[1] ??
        poi.geometry?.coordinates?.[1]
    );
}

/** Resolves the longitude coordinate from multiple possible source fields. */
function _resolveLng(poi: any, attrs: any, props: any): number | undefined {
    return (
        poi.lng ??
        poi.longitude ??
        attrs.longitude ??
        props.longitude ??
        poi.coordinates?.[0] ??
        poi.geometry?.coordinates?.[0]
    );
}

function _resolvePoiCoords(poi: any): { lat: any; lng: any } {
    const attrs = poi.attributes || {};
    const props = poi.properties || {};
    if (poi.latlng && Array.isArray(poi.latlng) && poi.latlng.length === 2) {
        return { lat: poi.latlng[0], lng: poi.latlng[1] };
    }
    return { lat: _resolveLat(poi, attrs, props), lng: _resolveLng(poi, attrs, props) };
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

/** Resolves the category ID string from multiple possible source fields. */
function _resolveCatId(poi: any, attrs: any, props: any): string {
    return String(
        attrs.categoryId ??
            poi.categoryId ??
            poi.category ??
            props.categoryId ??
            props.category ??
            ""
    );
}

/** Resolves the sub-category ID string from multiple possible source fields. */
function _resolveSubId(poi: any, attrs: any, props: any): string {
    return String(
        attrs.subCategoryId ??
            poi.subCategoryId ??
            poi.subCategory ??
            poi.sub_category ??
            props.subCategoryId ??
            props.sub_category ??
            ""
    );
}

function _resolveCatIds(poi: any, attrs: any, props: any): { catId: string; subId: string } {
    return { catId: _resolveCatId(poi, attrs, props), subId: _resolveSubId(poi, attrs, props) };
}

function _passesCatSubFilter(
    hasCats: boolean,
    hasSubs: boolean,
    catId: string,
    subId: string,
    catsSel: string[],
    subsSel: string[]
): boolean {
    if (!hasCats && !hasSubs) return true;
    if (hasSubs) return !!subId && subsSel.includes(subId);
    return !!catId && catsSel.includes(catId);
}

function _passesRatingFilter(
    hasMinRating: boolean,
    attrs: any,
    poi: any,
    props: any,
    minRating: number
): boolean {
    if (!hasMinRating) return true;
    const { avg, hasRating } = _extractRating(attrs, poi, props);
    return hasRating && avg >= minRating;
}

function _passesTagFilter(
    hasTags: boolean,
    attrs: any,
    poi: any,
    props: any,
    selectedTags: string[]
): boolean {
    if (!hasTags) return true;
    const poiTags = _normalizeTags(attrs.tags ?? poi.tags ?? props.tags);
    return selectedTags.some((tag: any) => poiTags.includes(tag));
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
    if (!_passesCatSubFilter(hasCats, hasSubs, catId, subId, catsSel, subsSel)) return false;
    if (!_passesRatingFilter(hasMinRating, attrs, poi, props, minRating)) return false;
    if (!_passesTagFilter(hasTags, attrs, poi, props, selectedTags)) return false;

    return true;
}

function _buildFilterContext(filterState: any): Record<string, any> {
    const catsSel = filterState.categoriesTree || [];
    const subsSel = filterState.subCategoriesTree || [];
    return {
        catsSel,
        subsSel,
        hasCats: catsSel.length > 0,
        hasSubs: subsSel.length > 0,
        hasMinRating: !!filterState.hasMinRating,
        minRating: filterState.minRating,
        selectedTags: filterState.selectedTags || [],
        hasTags: filterState.hasTags,
        dataTypes: filterState.dataTypes || { poi: true, routes: true },
        searchText: (filterState.searchText || "").toLowerCase(),
        hasSearchText: filterState.hasSearchText || false,
        proximity: filterState.proximity || { active: false },
        filterState,
    };
}

export function filterPoiList(basePois: any, filterState: any): any[] {
    if (!Array.isArray(basePois) || basePois.length === 0) {
        Log.debug("[Filters] No POI to filter");
        return [];
    }

    const ctx = _buildFilterContext(filterState);
    Log.debug("[Filters] POI filtering start:", {
        totalPOI: basePois.length,
        hasCats: ctx.hasCats,
        hasSubs: ctx.hasSubs,
        hasSearchText: ctx.hasSearchText,
        proximityActive: ctx.proximity.active,
    });

    const getDistance = _g.GeoLeaf?.Utils?.getDistance ?? _haversine;
    return basePois.filter((poi) => _matchesSinglePoi(poi, { ...ctx, getDistance }));
}
