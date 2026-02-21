/*!
 * GeoLeaf Core – Filters / Utils
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

import { Log } from "../log/index.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

/**
 * Extrait une valeur depuis un chemin (ex: "attributes.shortDescription").
 * @param {object} obj
 * @param {string} path
 * @returns {*}
 */
export function getNestedValue(obj, path) {
    return path
        .split(".")
        .reduce(
            (current, prop) => (current && current[prop] !== undefined ? current[prop] : null),
            obj
        );
}

/**
 * Récupère les champs de recherche depuis le profil actif.
 * Priorité : layouts (search:true) → searchFields → défauts.
 * @returns {Array<string>}
 */
export function getSearchFieldsFromProfile() {
    try {
        if (_g.GeoLeaf?.Config && typeof _g.GeoLeaf.Config.getActiveProfile === "function") {
            const profile = _g.GeoLeaf.Config.getActiveProfile();
            const searchableFieldsSet = new Set();

            if (profile?.panels?.detail?.layout) {
                profile.panels.detail.layout
                    .filter((item) => item.search === true && item.field)
                    .forEach((item) => searchableFieldsSet.add(item.field));
            }
            if (profile?.panels?.route?.layout) {
                profile.panels.route.layout
                    .filter((item) => item.search === true && item.field)
                    .forEach((item) => searchableFieldsSet.add(item.field));
            }

            if (searchableFieldsSet.size > 0) {
                const fields = Array.from(searchableFieldsSet);
                Log.debug("[Filters] Champs de recherche depuis layouts (search:true):", fields);
                return fields;
            }

            if (Array.isArray(profile?.panels?.search?.filters)) {
                const searchFilter = profile.panels.search.filters.find((f) => f.type === "search");
                if (searchFilter?.searchFields?.length > 0) {
                    Log.debug(
                        "[Filters] Champs de recherche depuis searchFields (fallback):",
                        searchFilter.searchFields
                    );
                    return searchFilter.searchFields;
                }
            }
        }
    } catch (err) {
        Log.warn("[Filters] Erreur extraction searchFields du profil:", err);
    }

    const defaultFields = ["title", "label", "name"];
    Log.debug("[Filters] Champs de recherche par défaut:", defaultFields);
    return defaultFields;
}

/**
 * Extrait les coordonnées [lat, lng] d'un objet route (multi-format).
 * @param {object} route
 * @returns {Array<[number, number]>}
 */
export function extractRouteCoords(route) {
    if (Array.isArray(route.geometry) && route.geometry.length > 0) {
        if (Array.isArray(route.geometry[0]) && typeof route.geometry[0][0] === "number") {
            return route.geometry.map((pair) => [pair[0], pair[1]]);
        }
        if (
            route.geometry[0]?.type === "LineString" &&
            Array.isArray(route.geometry[0].coordinates)
        ) {
            return route.geometry[0].coordinates.map((c) => [c[1], c[0]]);
        }
    }
    if (route.geometry?.type === "LineString" && Array.isArray(route.geometry.coordinates)) {
        return route.geometry.coordinates.map((c) => [c[1], c[0]]);
    }
    return [];
}
