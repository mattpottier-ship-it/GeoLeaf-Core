/**
 * GeoLeaf GeoJSON - Style Utilities
 * Shared style normalization helpers (Phase 4 dedup — extracted from style.js + vector-tiles.js)
 *
 * @module geojson/style-utils
 * @version 1.0.0
 */
"use strict";

const _g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

/**
 * Normalise a GeoLeaf style object (fill/stroke nested format) into
 * flat Leaflet Path options.
 *
 * Handles:
 * - Nested fill/stroke → flat Leaflet props
 * - Already-flat passthrough
 * - fillOpacity default (0.4 when unspecified)
 *
 * Does NOT handle hatch patterns or casing — those are layered on by the
 * caller (layer-manager/style.js) when a layerId is available.
 *
 * @param {Object} style - Style in GeoLeaf format
 * @param {Object} [options={}] - Extra options
 * @param {boolean} [options.setFillFlag=false] - Set `fill: true` when fill block present
 * @returns {Object} Flat Leaflet Path options
 */
export function normalizeStyleToLeaflet(style, options = {}) {
    if (!style || typeof style !== 'object') return {};

    const normalized = {};

    if (style.fill || style.stroke) {
        // Fill (remplissage)
        if (style.fill) {
            if (style.fill.color) normalized.fillColor = style.fill.color;
            normalized.fillOpacity = typeof style.fill.opacity === 'number'
                ? style.fill.opacity
                : 0.4;
            if (style.fill.pattern) normalized.fillPattern = style.fill.pattern;
            if (options.setFillFlag) normalized.fill = true;
        }

        // Stroke (contour)
        if (style.stroke) {
            if (style.stroke.color) normalized.color = style.stroke.color;
            if (typeof style.stroke.opacity === 'number') normalized.opacity = style.stroke.opacity;
            if (typeof style.stroke.widthPx === 'number') normalized.weight = style.stroke.widthPx;
            if (style.stroke.dashArray) normalized.dashArray = style.stroke.dashArray;
            if (style.stroke.lineCap) normalized.lineCap = style.stroke.lineCap;
            if (style.stroke.lineJoin) normalized.lineJoin = style.stroke.lineJoin;
        }

        // Shape & size (common)
        if (style.shape) normalized.shape = style.shape;
        if (typeof style.sizePx === 'number') {
            normalized.radius = style.sizePx;
            normalized.sizePx = style.sizePx;
        }
    } else {
        // Already flat Leaflet format — passthrough
        Object.assign(normalized, style);
    }

    return normalized;
}

// ── Backward compat ──
if (!_g.GeoLeaf) _g.GeoLeaf = {};
_g.GeoLeaf._StyleUtils = { normalizeStyleToLeaflet };
