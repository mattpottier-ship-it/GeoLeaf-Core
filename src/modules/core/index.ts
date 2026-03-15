/*!
 * GeoLeaf Core – Core / Index (barl)
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

import { Log } from "../log/index.js";
import { CONSTANTS } from "../constants/index.js";
import {
    buildLeafletOptions,
    resolveMapContainer,
    createLeafletMap,
    applyThemeSafe,
    initLegendSafe,
} from "./map-factory.js";
import { setTheme, getTheme } from "./theme.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

let _mapInstance: any = null;
let _map: any = null;

// ---------------------------------------------------------
// init
// ---------------------------------------------------------
function init(options: any = {}) {
    const context = "[GeoLeaf.Core]";
    try {
        if (_mapInstance) {
            Log.warn(`${context} Map already initialized. Recycling existing instance.`);
            return _mapInstance;
        }

        const targetEl = resolveMapContainer(options.mapId);
        const leafletOptions = buildLeafletOptions(options);
        const theme = options.theme || "light";

        _mapInstance = createLeafletMap(targetEl, leafletOptions);
        _map = _mapInstance;

        applyThemeSafe(theme);
        initLegendSafe(_mapInstance);

        Log.info(`${context} Map initialized successfully.`);
        return _mapInstance;
    } catch (err: any) {
        Log.error(`${context} ERROR:`, err.message);

        if (typeof _g.GeoLeaf?.Core?.onError === "function") {
            try {
                _g.GeoLeaf.Core.onError(err);
            } catch (cbErr) {
                Log.error(`${context} Error in Core.onError():`, cbErr);
            }
        }

        _mapInstance = null;
        _map = null;
        return null;
    }
}

function _initMapFromConfig(): any {
    const mapCfg = _g.GeoLeaf.Config.get("map") ?? {};
    const uiCfg = _g.GeoLeaf.Config.get("ui") ?? {};
    return init({
        target: mapCfg.target ?? "geoleaf-map",
        center: mapCfg.center ?? CONSTANTS.DEFAULT_CENTER,
        zoom: typeof mapCfg.zoom === "number" ? mapCfg.zoom : CONSTANTS.DEFAULT_ZOOM,
        theme: uiCfg.theme ?? "light",
        mapOptions: mapCfg.mapOptions ?? {},
    });
}

// ---------------------------------------------------------
// initMap (compat descendante)
// ---------------------------------------------------------
function initMap(a: any, b: any, c: any, d: any) {
    Log.warn(
        "[GeoLeaf.Core] GeoLeaf.Core.initMap() is deprecated, use GeoLeaf.Core.init() instead."
    );

    if (_g.GeoLeaf?.Config?.get) {
        try {
            return _initMapFromConfig();
        } catch (err: any) {
            Log.error("[GeoLeaf.Core] initMap() could not build options:", err);
        }
    }

    if (a && typeof a === "object" && !Array.isArray(a)) return init(a);

    if (typeof a === "string" && Array.isArray(b) && typeof c === "number") {
        return init({ target: a, center: b, zoom: c, theme: d ?? "light" });
    }

    Log.error("[GeoLeaf.Core] initMap() called with an obsolete or invalid signature.");
    return null;
}

// ---------------------------------------------------------
// Accesseur
// ---------------------------------------------------------
function getMap() {
    return _map;
}

// ---------------------------------------------------------
// API public
// ---------------------------------------------------------
export const Core = {
    init,
    initMap,
    getMap,
    setTheme,
    getTheme,
};
