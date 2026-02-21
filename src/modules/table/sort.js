/**
 * GeoLeaf Table – Sort Utilities
 * Pure sort helpers extracted from geoleaf.table.js (Phase 8.2.2)
 *
 * @module table/sort
 */
"use strict";

/**
 * Trie le tableau `cachedData` en place selon `sortState`.
 * Ne fait rien si aucun champ de tri n'est défini.
 *
 * @param {Array}    cachedData      - Données GeoJSON features en cache (mutées en place)
 * @param {{field:string|null, direction:string|null}} sortState - État de tri courant
 * @param {Function} getNestedValue  - Fonction `(obj, path) => value`
 */
export function sortInPlace(cachedData, sortState, getNestedValue) {
    if (!sortState.field || !sortState.direction) return;

    const { field, direction } = sortState;

    cachedData.sort((a, b) => {
        const valA = getNestedValue(a, field);
        const valB = getNestedValue(b, field);

        if (valA == null && valB == null) return 0;
        if (valA == null) return direction === "asc" ? 1 : -1;
        if (valB == null) return direction === "asc" ? -1 : 1;

        let result = 0;
        if (typeof valA === "number" && typeof valB === "number") {
            result = valA - valB;
        } else {
            result = String(valA).localeCompare(String(valB));
        }

        return direction === "asc" ? result : -result;
    });
}

/**
 * Calcule le prochain état de tri d'après un clic sur une colonne.
 * Cycle : (aucun) → asc → desc → (aucun).
 *
 * @param {{field:string|null, direction:string|null}} sortState - État courant
 * @param {string} field - Champ cliqué
 * @returns {{field:string|null, direction:string|null}} Nouvel état (immutable)
 */
export function nextSortState(sortState, field) {
    if (sortState.field === field) {
        if (sortState.direction === "asc") return { field, direction: "desc" };
        if (sortState.direction === "desc") return { field: null, direction: null };
        return { field, direction: "asc" };
    }
    return { field, direction: "asc" };
}
