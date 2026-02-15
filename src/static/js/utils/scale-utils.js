/**
 * @fileoverview Scale utilities - compute map scale and test visibility ranges
 * @module utils/scale-utils
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
    GeoLeaf.Utils = GeoLeaf.Utils || {};

    // Cache basé sur le zoom et la latitude pour éviter des recalculs coûteux
    const _scaleCache = {
        zoom: null,
        lat: null,
        scale: null
    };

    /**
     * Calcule l'échelle (1:X) de la carte pour le zoom et la latitude actuels.
     * Retourne la valeur mise en cache si zoom/latitude inchangés.
     * @param {L.Map} map
     * @param {Object} [options]
     * @param {boolean} [options.force=false] - Ignore le cache et recalcule
     * @param {Object} [options.logger] - Logger optionnel pour debug
     * @returns {number} échelle (ex: 5000000 pour 1:5M)
     */
    function calculateMapScale(map, options = {}) {
        if (!map) return 0;

        const logger = options.logger;
        const center = map.getCenter?.();
        const zoom = map.getZoom?.();

        if (!center || typeof zoom !== "number") {
            return 0;
        }

        // Utiliser le cache si possible
        if (!options.force && _scaleCache.zoom === zoom && _scaleCache.lat === center.lat) {
            return _scaleCache.scale || 0;
        }

        const METERS_PER_PIXEL_AT_ZOOM_0 = 156543.04;
        const metersPerPixel = METERS_PER_PIXEL_AT_ZOOM_0 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, zoom);

        const METERS_PER_INCH = 0.0254;
        const DPI = 96;
        const metersPerInch = metersPerPixel * DPI;

        const scale = Math.round(metersPerInch / METERS_PER_INCH);

        _scaleCache.zoom = zoom;
        _scaleCache.lat = center.lat;
        _scaleCache.scale = scale;

        if (logger && typeof logger.debug === "function") {
            logger.debug(`[ScaleUtils] Calcul échelle: zoom=${zoom}, lat=${center.lat.toFixed(2)}, échelle=1:${scale.toLocaleString()}`);
        }

        return scale;
    }

    /**
     * Vérifie si l'échelle courante est dans l'intervalle [maxScale ; minScale].
     * @param {number} currentScale
     * @param {number|null|undefined} minScale - échelle la plus large (dézoom)
     * @param {number|null|undefined} maxScale - échelle la plus détaillée (zoom)
     * @param {Object} [logger]
     * @returns {boolean}
     */
    function isScaleInRange(currentScale, minScale, maxScale, logger) {
        const normalizedMin = (typeof minScale === "number" && minScale > 0) ? minScale : null;
        const normalizedMax = (typeof maxScale === "number" && maxScale > 0) ? maxScale : null;

        if (normalizedMin !== null && currentScale > normalizedMin) {
            if (logger && typeof logger.debug === "function") {
                logger.debug(`[ScaleUtils] ${currentScale} > minScale ${normalizedMin} → invisible (trop dézoomé)`);
            }
            return false;
        }

        if (normalizedMax !== null && currentScale < normalizedMax) {
            if (logger && typeof logger.debug === "function") {
                logger.debug(`[ScaleUtils] ${currentScale} < maxScale ${normalizedMax} → invisible (trop zoomé)`);
            }
            return false;
        }

        if (logger && typeof logger.debug === "function") {
            logger.debug(`[ScaleUtils] ${currentScale} dans [${normalizedMax ?? '∞'} ; ${normalizedMin ?? '∞'}] → visible`);
        }

        return true;
    }

    function clearScaleCache() {
        _scaleCache.zoom = null;
        _scaleCache.lat = null;
        _scaleCache.scale = null;
    }

    GeoLeaf.Utils.ScaleUtils = {
        calculateMapScale,
        isScaleInRange,
        clearScaleCache
    };

})(window);
