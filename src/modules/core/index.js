/*!
 * GeoLeaf Core – Core / Index (barrel)
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

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

let _mapInstance = null;
let _map = null;

// ---------------------------------------------------------
// init
// ---------------------------------------------------------
function init(options = {}) {
    const context = "[GeoLeaf.Core]";
    try {
        if (_mapInstance) {
            Log.warn(`${context} Carte déjà initialisée. Recyclage de l'instance existante.`);
            return _mapInstance;
        }

        const targetEl = resolveMapContainer(options.mapId);
        const leafletOptions = buildLeafletOptions(options);
        const theme = options.theme || "light";

        _mapInstance = createLeafletMap(targetEl, leafletOptions);
        _map = _mapInstance;

        applyThemeSafe(theme);
        initLegendSafe(_mapInstance);

        Log.info(`${context} Carte initialisée avec succès.`);
        return _mapInstance;
    } catch (err) {
        Log.error(`${context} ERREUR :`, err.message);

        if (typeof _g.GeoLeaf?.Core?.onError === "function") {
            try {
                _g.GeoLeaf.Core.onError(err);
            } catch (cbErr) {
                Log.error(`${context} Erreur dans Core.onError() :`, cbErr);
            }
        }

        _mapInstance = null;
        _map = null;
        return null;
    }
}

// ---------------------------------------------------------
// initMap (compat descendante)
// ---------------------------------------------------------
function initMap(a, b, c, d) {
    Log.warn("[GeoLeaf.Core] GeoLeaf.Core.initMap() est obsolète, utilisez GeoLeaf.Core.init().");

    if (_g.GeoLeaf?.Config?.get) {
        try {
            const mapCfg = _g.GeoLeaf.Config.get("map") || {};
            const uiCfg = _g.GeoLeaf.Config.get("ui") || {};
            return init({
                target: mapCfg.target || "geoleaf-map",
                center: mapCfg.center || CONSTANTS.DEFAULT_CENTER,
                zoom: typeof mapCfg.zoom === "number" ? mapCfg.zoom : CONSTANTS.DEFAULT_ZOOM,
                theme: uiCfg.theme || "light",
                mapOptions: mapCfg.mapOptions || {},
            });
        } catch (err) {
            Log.error("[GeoLeaf.Core] initMap() n'a pas pu construire les options :", err);
        }
    }

    if (a && typeof a === "object" && !Array.isArray(a)) return init(a);

    if (typeof a === "string" && Array.isArray(b) && typeof c === "number") {
        return init({ target: a, center: b, zoom: c, theme: d || "light" });
    }

    Log.error("[GeoLeaf.Core] initMap() appelé avec une signature obsolète ou invalide.");
    return null;
}

// ---------------------------------------------------------
// Accesseur
// ---------------------------------------------------------
function getMap() {
    return _map;
}

// ---------------------------------------------------------
// API publique
// ---------------------------------------------------------
export const Core = {
    init,
    initMap,
    getMap,
    setTheme,
    getTheme,
};
