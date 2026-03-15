// @ts-nocheck — migration TS, typage progressif
"use strict";

/**
 * GeoLeaf UI Content Builder - Geo Renderers
 * Renderers : coordinates
 *
 * @module ui/content-builder/renderers-geo
 */
import { escapeHtml } from "../../security/index.js";
import { resolveField } from "../../utils/general-utils.js";

/**
 * Builds a element de type "coordinates"
 * @param {Object} poi - Donnees du POI
 * @param {Object} config - Configuration of the element
 * @param {Object} options - Options de rendu
 * @returns {string} HTML
 */
function renderCoordinates(poi, config, _options = {}) {
    const value = resolveField(poi, config.field);
    if (value == null) return "";

    let lat, lng;

    if (Array.isArray(value) && value.length >= 2) {
        [lat, lng] = value;
    } else if (typeof value === "object" && value.lat !== undefined && value.lng !== undefined) {
        lat = value.lat;
        lng = value.lng;
    } else {
        return "";
    }

    const label = config.label ? escapeHtml(config.label) : "Coordonn\u00e9es";
    const formatted = lat.toFixed(6) + ", " + lng.toFixed(6);

    return (
        '<div class="gl-content__coordinates">' +
        '<span class="gl-content__coordinates-label">' +
        label +
        ":</span> " +
        '<span class="gl-content__coordinates-value">' +
        formatted +
        "</span>" +
        "</div>"
    );
}

export { renderCoordinates };
