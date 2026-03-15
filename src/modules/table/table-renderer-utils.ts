/* eslint-disable security/detect-object-injection */
/**



 * GeoLeaf Table - Renderer Utilities



 * Constants, synthetic ID counter, feature ID resolution, and value formatting.



 */

"use strict";

// Virtual scrolling constants

export const VIRTUAL_ROW_HEIGHT = 32;

export const VIRTUAL_BUFFER = 20;

export const VIRTUAL_THRESHOLD = 150;

/**



 * Counter for generating synthetic row IDs.



 * Must be reset via resetSyntheticIdCounter() before each full render.



 */

let _syntheticIdCounter = 0;

export function resetSyntheticIdCounter(): void {
    _syntheticIdCounter = 0;
}

/**



 * Shared event cleanup registry.



 * All cleanup functions/IDs registered during render are stored here so they can



 * be flushed before re-render or on destroy.



 */

export const _eventCleanups: any[] = [];

/**



 * Retrieves the ID of a feature reliably.



 * Parcourt plusieurs properties candidates puis generates un ID synthetic if needed.



 * @param {Object} feature - Feature GeoJSON



 * @returns {string}



 */

const _FEATURE_ID_PROPS = ["id", "fid", "osm_id", "OBJECTID", "SITE_ID", "code", "IN1"];

export function getFeatureId(feature: any): string {
    // 1. ID standard GeoJSON

    if (feature.id != null && feature.id !== "") return String(feature.id);

    const p = feature.properties;

    if (!p) return "__gl_row_" + _syntheticIdCounter++;

    // 2. Properties d'identifier currentes

    for (const key of _FEATURE_ID_PROPS) {
        const v = p[key];

        if (v != null && v !== "") return String(v);
    }

    // 3. Fallback: synthetic ID based on a counter

    return "__gl_row_" + _syntheticIdCounter++;
}

/**



 * Formats ae value selon son type of column.



 * @param {*} value - Value to formater



 * @param {string} type - Type of data (string, number, date)



 * @returns {string}



 */

export function formatValue(value: any, type: any): string {
    if (value == null || value === "") return "—";

    if (type === "number") {
        const num = Number(value);

        if (isNaN(num)) return String(value);

        return num.toLocaleString("fr-FR");
    }

    if (type === "date") {
        const date = new Date(value);

        if (isNaN(date.getTime())) return String(value);

        return date.toLocaleDateString("fr-FR");
    }

    return String(value);
}
