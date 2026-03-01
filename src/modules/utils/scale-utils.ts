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
 * Calcule l'échelle (1:X) de la carte pour le zoom et la latitude actuels.
 * Retourne la valeur mise en cache si zoom/latitude inchangés.
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
            `[ScaleUtils] Calcul échelle: zoom=${zoom}, lat=${center.lat.toFixed(2)}, échelle=1:${scale.toLocaleString()}`
        );
    }

    return scale;
}

/**
 * Vérifie si l'échelle courante est dans l'intervalle [maxScale ; minScale].
 */
export function isScaleInRange(
    currentScale: number,
    minScale: number | null | undefined,
    maxScale: number | null | undefined,
    logger?: { debug?: (msg: string) => void }
): boolean {
    const normalizedMin = typeof minScale === "number" && minScale > 0 ? minScale : null;
    const normalizedMax = typeof maxScale === "number" && maxScale > 0 ? maxScale : null;

    if (normalizedMin !== null && currentScale > normalizedMin) {
        if (logger?.debug) {
            logger.debug(
                `[ScaleUtils] ${currentScale} > minScale ${normalizedMin} → invisible (trop dézoomé)`
            );
        }
        return false;
    }

    if (normalizedMax !== null && currentScale < normalizedMax) {
        if (logger?.debug) {
            logger.debug(
                `[ScaleUtils] ${currentScale} < maxScale ${normalizedMax} → invisible (trop zoomé)`
            );
        }
        return false;
    }

    if (logger?.debug) {
        logger.debug(
            `[ScaleUtils] ${currentScale} dans [${normalizedMax ?? "∞"} ; ${normalizedMin ?? "∞"}] → visible`
        );
    }

    return true;
}

export function clearScaleCache(): void {
    _scaleCache.zoom = null;
    _scaleCache.lat = null;
    _scaleCache.scale = null;
}
