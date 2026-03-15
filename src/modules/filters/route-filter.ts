/*!
 * GeoLeaf Core – Filters / Route Filter
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

import { Log } from "../log/index.js";
import { getNestedValue, getSearchFieldsFromProfile, extractRouteCoords } from "./utils.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
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
function _getReviewsObj(attrs: any, item: any, props: any): any {
    if (attrs.reviews !== undefined) return attrs.reviews;
    if (item.reviews !== undefined) return item.reviews;
    return props.reviews;
}

function _getDirectRating(attrs: any, item: any, props: any): number | undefined {
    if (typeof attrs.rating === "number") return attrs.rating;
    if (typeof item.rating === "number") return item.rating;
    if (typeof props.rating === "number") return props.rating;
    return undefined;
}

function _extractRating(attrs: any, item: any, props: any) {
    const reviewsObj = _getReviewsObj(attrs, item, props);
    if (reviewsObj && typeof reviewsObj === "object" && !Array.isArray(reviewsObj)) {
        if (typeof reviewsObj.rating === "number")
            return { avg: reviewsObj.rating, hasRating: true };
    }
    if (Array.isArray(reviewsObj) && reviewsObj.length > 0) {
        const sum = reviewsObj.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
        const avg = sum / reviewsObj.length;
        return { avg, hasRating: avg > 0 };
    }
    const direct = _getDirectRating(attrs, item, props);
    if (direct !== undefined) return { avg: direct, hasRating: true };
    return { avg: 0, hasRating: false };
}

function _normalizeTags(rawTags: any) {
    if (Array.isArray(rawTags)) return rawTags.map((t) => String(t).trim()).filter(Boolean);
    if (typeof rawTags === "string")
        return rawTags
            .split(/[,;]+/)
            .map((t) => t.trim())
            .filter(Boolean);
    return [];
}

function _defined(v: any): boolean {
    return v !== undefined && v !== null;
}
function _strVal(v: any): string {
    return _defined(v) ? String(v) : "";
}
function _firstDefined(...vals: any[]): any {
    for (const v of vals) {
        if (_defined(v)) return v;
    }
    return "";
}

function _resolveCatId(attrs: any, route: any, props: any): string {
    return _strVal(
        _firstDefined(
            attrs.categoryId,
            route.categoryId,
            route.category,
            props.categoryId,
            props.category
        )
    );
}

function _resolveSubId(attrs: any, route: any, props: any): string {
    return _strVal(
        _firstDefined(
            attrs.subCategoryId,
            route.subCategoryId,
            route.subCategory,
            route.sub_category,
            props.subCategoryId,
            props.sub_category
        )
    );
}

function _passesSearchFilter(route: any, searchText: string, searchFields: string[]): boolean {
    return searchFields.some((fieldPath: any) => {
        const value = getNestedValue(route, fieldPath);
        return value && String(value).toLowerCase().includes(searchText);
    });
}

function _passesCatFilter(
    catId: string,
    subId: string,
    catsSel: string[],
    subsSel: string[],
    hasCats: boolean,
    hasSubs: boolean
): boolean {
    if (hasSubs) return !!(subId && subsSel.includes(subId));
    if (hasCats) return !!(catId && catsSel.includes(catId));
    return true;
}

function _passesTagFilter(attrs: any, route: any, props: any, selectedTags: string[]): boolean {
    const raw =
        attrs.tags !== undefined ? attrs.tags : route.tags !== undefined ? route.tags : props.tags;
    const routeTags = _normalizeTags(raw);
    return selectedTags.some((tag: any) => routeTags.includes(tag));
}

function _passesProximityFilter(route: any, proximity: any, getDistance: any): boolean {
    const coords = extractRouteCoords(route);
    if (coords.length === 0) return false;
    return coords.some(
        ([lat, lng]: [any, any]) =>
            getDistance(proximity.center.lat, proximity.center.lng, lat, lng) <= proximity.radius
    );
}

function _parseFilterState(fs: any) {
    return {
        catsSel: Array.isArray(fs.categoriesTree) ? fs.categoriesTree : [],
        subsSel: Array.isArray(fs.subCategoriesTree) ? fs.subCategoriesTree : [],
        selectedTags: Array.isArray(fs.selectedTags) ? fs.selectedTags : [],
        hasTags: fs.hasTags,
        hasMinRating: !!fs.hasMinRating,
        minRating: fs.minRating,
        searchText: typeof fs.searchText === "string" ? fs.searchText.toLowerCase() : "",
        hasSearchText: fs.hasSearchText ? true : false,
        proximity:
            fs.proximity && typeof fs.proximity === "object" ? fs.proximity : { active: false },
    };
}

function _getSearchFields(filterState: any): string[] {
    if (filterState.searchFields && filterState.searchFields.length > 0)
        return filterState.searchFields;
    return getSearchFieldsFromProfile();
}

function _passesRatingFilter(attrs: any, route: any, props: any, minRating: number): boolean {
    const { avg, hasRating } = _extractRating(attrs, route, props);
    if (!hasRating) return false;
    if (avg < minRating) return false;
    return true;
}

function _resolveRouteIds(route: any): { attrs: any; props: any; catId: string; subId: string } {
    const attrs = route.attributes ? route.attributes : {};
    const props = route.properties ? route.properties : {};
    return {
        attrs,
        props,
        catId: _resolveCatId(attrs, route, props),
        subId: _resolveSubId(attrs, route, props),
    };
}

function _passesCatAndSubFilter(
    catId: string,
    subId: string,
    catsSel: string[],
    subsSel: string[]
): boolean {
    const hasCats = catsSel.length > 0;
    const hasSubs = subsSel.length > 0;
    if (!hasCats && !hasSubs) return true;
    return _passesCatFilter(catId, subId, catsSel, subsSel, hasCats, hasSubs);
}

function _passesActiveProximityFilter(route: any, proximity: any, getDistance: any): boolean {
    if (!proximity.center) return true;
    return _passesProximityFilter(route, proximity, getDistance);
}

function _filterSingleRoute(
    route: any,
    parsed: ReturnType<typeof _parseFilterState>,
    filterState: any,
    getDistance: any
): boolean {
    const {
        catsSel,
        subsSel,
        selectedTags,
        hasTags,
        hasMinRating,
        minRating,
        searchText,
        hasSearchText,
        proximity,
    } = parsed;
    const { attrs, props, catId, subId } = _resolveRouteIds(route);
    if (hasSearchText) {
        if (!_passesSearchFilter(route, searchText, _getSearchFields(filterState))) return false;
    }
    if (!_passesCatAndSubFilter(catId, subId, catsSel, subsSel)) return false;
    if (hasTags) {
        if (!_passesTagFilter(attrs, route, props, selectedTags)) return false;
    }
    if (hasMinRating) {
        if (!_passesRatingFilter(attrs, route, props, minRating)) return false;
    }
    if (proximity.active) {
        if (!_passesActiveProximityFilter(route, proximity, getDistance)) return false;
    }
    return true;
}

/**
 * Filtre a list de routes based on thes criteria fournis.
 * @param {Array} baseRoutes
 * @param {object} filterState
 * @returns {Array}
 */
export function filterRouteList(baseRoutes: any, filterState: any) {
    if (!Array.isArray(baseRoutes) || baseRoutes.length === 0) {
        Log.debug("[Filters] No routes to filter");
        return [];
    }
    const parsed = _parseFilterState(filterState);
    Log.debug("[Filters] Route filtering start:", {
        totalRoutes: baseRoutes.length,
        hasCats: parsed.catsSel.length > 0,
        hasSubs: parsed.subsSel.length > 0,
        hasMinRating: parsed.hasMinRating,
        minRating: parsed.minRating,
        hasSearchText: parsed.hasSearchText,
        proximityActive: parsed.proximity.active,
    });
    const getDistance =
        _g.GeoLeaf && _g.GeoLeaf.Utils && _g.GeoLeaf.Utils.getDistance
            ? _g.GeoLeaf.Utils.getDistance
            : _haversine;
    return baseRoutes.filter((route: any) =>
        _filterSingleRoute(route, parsed, filterState, getDistance)
    );
}
