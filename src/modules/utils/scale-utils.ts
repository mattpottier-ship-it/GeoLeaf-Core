/**
 * @fileoverview Scale utilities - compute map scale and test visibility ranges
 * @module utils/scale-utils
 */

// L.Map-like interface for scale calculation (Leaflet map)
interface MapLike {
    getCenter?: () => { lat: number };
    getZoom?: () => number;
}

interface ScaleOptions {
    force?: boolean;
    logger?: { debug?: (msg: string) => void };
}

interface ScaleCache {
    zoom: number | null;
    lat: number | null;
    scale: number | null;
}

const _scaleCache: ScaleCache = {
    zoom: null,
    lat: null,
    scale: null,
};

/**
 * Calculates the scale (1:X) de the map for the zoom et la latitude currents.
 * Returns the cached value if zoom/latitude unchanged.
 */
export function calculateMapScale(
    map: MapLike | null | undefined,
    options: ScaleOptions = {}
): number {
    if (!map) return 0;

    const logger = options.logger;
    const center = map.getCenter?.();
    const zoom = map.getZoom?.();

    if (!center || typeof zoom !== "number") {
        return 0;
    }

    if (!options.force && _scaleCache.zoom === zoom && _scaleCache.lat === center.lat) {
        return _scaleCache.scale ?? 0;
    }

    const METERS_PER_PIXEL_AT_ZOOM_0 = 156543.04;
    const metersPerPixel =
        (METERS_PER_PIXEL_AT_ZOOM_0 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom);

    const METERS_PER_INCH = 0.0254;
    const DPI = 96;
    const metersPerInch = metersPerPixel * DPI;

    const scale = Math.round(metersPerInch / METERS_PER_INCH);

    _scaleCache.zoom = zoom;
    _scaleCache.lat = center.lat;
    _scaleCache.scale = scale;

    if (logger && typeof logger.debug === "function") {
        logger.debug(
            `[ScaleUtils] Scale calculation: zoom=${zoom}, lat=${center.lat.toFixed(2)}, scale=1:${scale.toLocaleString()}`
        );
    }

    return scale;
}

/**
 * Checks if l'scale currente est dans l'interval [maxScale ; minScale].
 */
function _logScale(logger: { debug?: (msg: string) => void } | undefined, msg: string) {
    logger?.debug?.(msg);
}

function _normalizeScaleBound(val: number | null | undefined): number | null {
    return typeof val === "number" && val > 0 ? val : null;
}

export function isScaleInRange(
    currentScale: number,
    minScale: number | null | undefined,
    maxScale: number | null | undefined,
    logger?: { debug?: (msg: string) => void }
): boolean {
    const normalizedMin = _normalizeScaleBound(minScale);
    const normalizedMax = _normalizeScaleBound(maxScale);

    if (normalizedMin !== null && currentScale > normalizedMin) {
        _logScale(
            logger,
            `[ScaleUtils] ${currentScale} > minScale ${normalizedMin} → invisible (too zoomed out)`
        );
        return false;
    }

    if (normalizedMax !== null && currentScale < normalizedMax) {
        _logScale(
            logger,
            `[ScaleUtils] ${currentScale} < maxScale ${normalizedMax} → invisible (too zoomed in)`
        );
        return false;
    }

    _logScale(
        logger,
        `[ScaleUtils] ${currentScale} dans [${normalizedMax ?? "∞"} ; ${normalizedMin ?? "∞"}] → visible`
    );

    return true;
}

export function clearScaleCache(): void {
    _scaleCache.zoom = null;
    _scaleCache.lat = null;
    _scaleCache.scale = null;
}
