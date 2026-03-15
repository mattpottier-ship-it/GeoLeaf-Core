/**
 * GeoLeaf GeoJSON - Style Utilities
 * @module geojson/style-utils
 */

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

type FillStyle = { color?: string; opacity?: number; pattern?: unknown };
type StrokeStyle = {
    color?: string;
    opacity?: number;
    widthPx?: number;
    dashArray?: string;
    lineCap?: string;
    lineJoin?: string;
};

function _applyFillOptions(
    normalized: Record<string, unknown>,
    fill: FillStyle,
    setFillFlag: boolean
): void {
    if (fill.color) normalized.fillColor = fill.color;
    normalized.fillOpacity = typeof fill.opacity === "number" ? fill.opacity : 0.4;
    if (fill.pattern) normalized.fillPattern = fill.pattern;
    if (setFillFlag) normalized.fill = true;
}

function _applyStrokeOptions(normalized: Record<string, unknown>, stroke: StrokeStyle): void {
    if (stroke.color) normalized.color = stroke.color;
    if (typeof stroke.opacity === "number") normalized.opacity = stroke.opacity;
    if (typeof stroke.widthPx === "number") normalized.weight = stroke.widthPx;
    if (stroke.dashArray) normalized.dashArray = stroke.dashArray;
    if (stroke.lineCap) normalized.lineCap = stroke.lineCap;
    if (stroke.lineJoin) normalized.lineJoin = stroke.lineJoin;
}

export function normalizeStyleToLeaflet(
    style: Record<string, unknown> | null | undefined,
    options: { setFillFlag?: boolean } = {}
): Record<string, unknown> {
    if (!style || typeof style !== "object") return {};

    const normalized: Record<string, unknown> = {};
    const fill = style.fill as FillStyle | undefined;
    const stroke = style.stroke as StrokeStyle | undefined;

    if (fill || stroke) {
        if (fill) _applyFillOptions(normalized, fill, !!options.setFillFlag);
        if (stroke) _applyStrokeOptions(normalized, stroke);
        if (style.shape) normalized.shape = style.shape;
        if (typeof style.sizePx === "number") {
            normalized.radius = style.sizePx;
            normalized.sizePx = style.sizePx;
        }
    } else {
        Object.assign(normalized, style);
    }

    return normalized;
}

const g = _g as {
    GeoLeaf?: { _StyleUtils?: { normalizeStyleToLeaflet: typeof normalizeStyleToLeaflet } };
};
if (!g.GeoLeaf) g.GeoLeaf = {};
g.GeoLeaf._StyleUtils = { normalizeStyleToLeaflet };
