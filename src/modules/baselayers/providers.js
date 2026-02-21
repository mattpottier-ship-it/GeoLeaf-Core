/*!
 * GeoLeaf Core – Baselayers / Providers
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

/**
 * Définitions des couches tuiles par défaut (100 % utilisables sans clé API).
 * @type {Object.<string, {label: string, url: string, options: object}>}
 */
export const DEFAULT_BASELAYERS = {
    street: {
        label: "Street",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        options: {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
        },
    },
    topo: {
        label: "Topo",
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        options: {
            maxZoom: 17,
            attribution:
                "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap",
        },
    },
    satellite: {
        label: "Satellite",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        options: {
            maxZoom: 19,
            attribution:
                "Tiles &copy; Esri — Source: Esri, Earthstar Geographics, and the GIS user community",
        },
    },
};

/**
 * Normalise les options Leaflet pour une définition de couche.
 * @param {object} definition
 * @returns {object} Options normalisées
 */
export function normalizeOptions(definition) {
    const opts = Object.assign({}, definition.options || {});
    if (typeof opts.minZoom !== "number" && typeof definition.minZoom === "number") {
        opts.minZoom = definition.minZoom;
    }
    if (typeof opts.maxZoom !== "number") {
        opts.maxZoom = typeof definition.maxZoom === "number" ? definition.maxZoom : 19;
    }
    if (!opts.attribution && definition.attribution) {
        opts.attribution = definition.attribution;
    }
    return opts;
}

/**
 * Silence MapLibre GL v5 "Expected value to be of type number, but found null"
 * warnings emitted by the Liberty (OpenFreeMap) basemap style.
 * Applique des filtres corrigés via setFilter() — aucun rechargement de tuiles.
 * @param {object} glMap - Instance live MapLibre Map
 */
export function applyLibertyFilters(glMap) {
    const PATCHES = {
        boundary_3: { admin_level: -1, maritime: 0, disputed: 0 },
        road_motorway_link: { ramp: 0 },
        road_motorway_link_casing: { ramp: 0 },
        road_link: { ramp: 0 },
        road_link_casing: { ramp: 0 },
        bridge_motorway_link: { ramp: 0 },
        bridge_motorway_link_casing: { ramp: 0 },
        tunnel_motorway_link: { ramp: 0 },
        tunnel_motorway_link_casing: { ramp: 0 },
        tunnel_link: { ramp: 0 },
        tunnel_link_casing: { ramp: 0 },
        road_one_way_arrow: { oneway: 0 },
        road_one_way_arrow_opposite: { oneway: 0 },
        label_city: { capital: 0 },
        label_city_capital: { capital: 0 },
        poi_r1: { rank: 0 },
        poi_r7: { rank: 0 },
        poi_r20: { rank: 0 },
        label_country_1: { rank: 0 },
        label_country_2: { rank: 0 },
        label_country_3: { rank: 0 },
    };

    function _patchExpr(expr, propMap) {
        if (!Array.isArray(expr)) return expr;
        if (expr[0] === "get" && expr.length === 2 && typeof expr[1] === "string") {
            if (Object.prototype.hasOwnProperty.call(propMap, expr[1])) {
                return ["coalesce", expr, propMap[expr[1]]];
            }
        }
        return expr.map((item) => (Array.isArray(item) ? _patchExpr(item, propMap) : item));
    }

    for (const [layerId, propMap] of Object.entries(PATCHES)) {
        try {
            if (!glMap.getLayer(layerId)) continue;
            const currentFilter = glMap.getFilter(layerId);
            if (!currentFilter) continue;
            glMap.setFilter(layerId, _patchExpr(currentFilter, propMap));
        } catch (_e) {
            // layer absent from this style — skip silently
        }
    }
}
