/**
 * GeoLeaf App – Feature Module Initializers
 * Extracted from app/init.js (Phase 8.2.3)
 * Each function initializes one feature domain after secondary modules are loaded.
 *
 * @module app/init-feature-modules
 */
"use strict";

// Note: L (Leaflet) is a browser global accessed directly.

/**
 * @typedef {Object} InitDeps
 * @property {Object} GeoLeaf  - The global GeoLeaf object
 * @property {Object} cfg      - The active profile configuration
 * @property {Object} map      - The Leaflet map instance
 * @property {Object} AppLog   - Logger instance
 * @property {Object} [_app]   - The _app namespace (required for initGeoJSON)
 */

/**
 * Initialize base tile layers from profile cfg.basemaps.
 * @param {InitDeps} deps
 */
export function initBasemaps({ GeoLeaf, cfg, map, AppLog }) {
    const baseLayersModule = GeoLeaf.BaseLayers || GeoLeaf.Baselayers;
    if (!baseLayersModule || typeof baseLayersModule.init !== "function") {
        AppLog.warn("Module BaseLayers introuvable.");
        return;
    }

    let activeKey = "street";
    const basemapsFromConfig = {};
    if (cfg.basemaps && typeof cfg.basemaps === "object") {
        Object.keys(cfg.basemaps).forEach(function (key) {
            const def = cfg.basemaps[key];
            if (def.defaultBasemap === true) activeKey = def.id || key;
            const entry = {
                id: def.id || key,
                label: def.label || key,
                url: def.url || def.fallbackUrl,
                options: {
                    minZoom: def.minZoom || 0,
                    maxZoom: def.maxZoom || 19,
                    attribution: def.attribution || "",
                },
            };
            // MapLibre vector basemap support
            if (def.type) entry.type = def.type;
            if (def.style) entry.style = def.style;
            if (def.attribution) entry.attribution = def.attribution;
            // Propagate minZoom/maxZoom at top level for MapLibre path
            if (typeof def.minZoom === "number") entry.minZoom = def.minZoom;
            if (typeof def.maxZoom === "number") entry.maxZoom = def.maxZoom;

            basemapsFromConfig[key] = entry;
        });
    }

    try {
        baseLayersModule.init({
            map: map,
            baselayers: basemapsFromConfig,
            activeKey: activeKey,
            ui: cfg.ui,
            basemaps: cfg.basemaps,
        });
    } catch (e) {
        AppLog.warn("BaseLayers.init a levé une exception :", e);
    }
}

/**
 * Initialize POI markers from profile cfg.poi.
 * @param {InitDeps} deps
 */
export function initPOI({ GeoLeaf, cfg, map, AppLog }) {
    const poiApi = GeoLeaf.POI;
    if (!poiApi || typeof poiApi.add !== "function") {
        AppLog.warn("GeoLeaf.POI.add() indisponible, aucun POI ne sera affiché.");
        return;
    }

    try {
        if (typeof poiApi.init === "function") {
            poiApi.init({ map: map, config: cfg.poiConfig || {} });

            // Chargement des légendes POI
            if (
                GeoLeaf.Legend &&
                typeof GeoLeaf.Legend.loadLayerLegend === "function" &&
                cfg.layers &&
                Array.isArray(cfg.layers)
            ) {
                cfg.layers.forEach(function (layerRef) {
                    if (layerRef.id && layerRef.id.includes("poi") && layerRef.configFile) {
                        fetch(layerRef.configFile)
                            .then((response) => response.json())
                            .then((layerConfig) => {
                                let styleId = "default";
                                if (
                                    layerConfig.styles &&
                                    layerConfig.styles.available &&
                                    layerConfig.styles.available.length > 0
                                ) {
                                    styleId = layerConfig.styles.available[0].id || "default";
                                }
                                GeoLeaf.Legend.loadLayerLegend(layerRef.id, styleId, layerConfig);
                                if (typeof GeoLeaf.Legend.setLayerVisibility === "function") {
                                    GeoLeaf.Legend.setLayerVisibility(layerRef.id, true);
                                }
                            })
                            .catch((err) =>
                                AppLog.warn(`Erreur chargement config couche ${layerRef.id}:`, err)
                            );
                    }
                });
            }
        }
    } catch (e) {
        AppLog.warn("GeoLeaf.POI.init() a levé une erreur :", e);
    }

    const showFilterPanel = cfg.ui && cfg.ui.showFilterPanel === true;
    if (showFilterPanel) {
        AppLog.info(
            "Panneau de filtres activé : les POI seront chargés via le système de filtres."
        );
        if (GeoLeaf.UI && typeof GeoLeaf.UI.applyFiltersInitial === "function") {
            GeoLeaf.UI.applyFiltersInitial();
        }
        return;
    }

    if (!Array.isArray(cfg.poi) || cfg.poi.length === 0) {
        return;
    }

    const bounds = [];
    cfg.poi.forEach(function (poiItem) {
        let latlng = null;
        if (poiItem.latlng && Array.isArray(poiItem.latlng) && poiItem.latlng.length === 2) {
            latlng = poiItem.latlng;
        } else if (
            poiItem.location &&
            typeof poiItem.location.lat === "number" &&
            typeof poiItem.location.lng === "number"
        ) {
            latlng = [poiItem.location.lat, poiItem.location.lng];
        }
        if (latlng) bounds.push(latlng);
    });

    if (bounds.length > 0) {
        // fitBounds POI uniquement si pas de bounds dans le profil ET pas de couches GeoJSON
        const hasBoundsFromProfile =
            cfg.map && Array.isArray(cfg.map.bounds) && cfg.map.bounds.length === 2;
        const hasGeoJSONLayers = cfg.layers && Array.isArray(cfg.layers) && cfg.layers.length > 0;
        if (!hasBoundsFromProfile && !hasGeoJSONLayers) {
            try {
                map.fitBounds(L.latLngBounds(bounds), {
                    padding: [80, 80],
                    maxZoom: 12,
                    animate: false,
                });
            } catch (e) {
                AppLog.warn("Erreur lors de fitBounds :", e);
            }
        }
        if (GeoLeaf.UI && typeof GeoLeaf.UI.refreshFilterTags === "function") {
            GeoLeaf.UI.refreshFilterTags();
        }
    }
}

/**
 * Initialize route display from profile cfg.routes.
 * @param {InitDeps} deps
 */
export function initRoute({ GeoLeaf, cfg, map, AppLog }) {
    const routeApi = GeoLeaf.Route;
    if (
        !routeApi ||
        typeof routeApi.init !== "function" ||
        typeof routeApi.loadFromConfig !== "function"
    ) {
        return;
    }
    try {
        routeApi.init({ map: map, fitBoundsOnLoad: false, maxZoomOnFit: 12 });
    } catch (e) {
        AppLog.warn("GeoLeaf.Route.init() a levé une erreur :", e);
        return;
    }
    if (Array.isArray(cfg.routes) && cfg.routes.length > 0) {
        try {
            routeApi.loadFromConfig(cfg.routes);
            AppLog.log("Itinéraires chargés.");
        } catch (e) {
            AppLog.warn("GeoLeaf.Route.loadFromConfig() a levé une erreur :", e);
        }
    }
}

/**
 * Initialize GeoJSON layers and theme selector from profile cfg.layers.
 * @param {InitDeps} deps
 */
export function initGeoJSON({ GeoLeaf, _cfg, map, AppLog, _app }) {
    const geoJsonApi = GeoLeaf.GeoJSON;
    if (!geoJsonApi || typeof geoJsonApi.init !== "function") {
        AppLog.log("GeoLeaf.GeoJSON.init() indisponible — pas de couches GeoJSON.");
        return;
    }

    try {
        geoJsonApi.init({ map: map, fitBoundsOnLoad: false, maxZoomOnFit: 12 });
    } catch (e) {
        AppLog.warn("GeoLeaf.GeoJSON.init() a levé une erreur :", e);
        return;
    }

    if (map && typeof map.on === "function") {
        map.on("geoleaf:geojson:layers-loaded", function (event) {
            if (event && event.detail && typeof event.detail.count === "number") {
                const count = event.detail.count;
                const message =
                    count === 1 ? "1 couche GeoJSON chargée" : count + " couches GeoJSON chargées";
                if (_app && typeof _app.showNotification === "function") {
                    _app.showNotification(message, 3000);
                }
            }
        });
    }

    // Initialisation du système de thèmes
    // B5 [ESM-02]: IIFE remplacée par fonction nommée — scoping inutile en ESM
    function buildLoadAllConfigsPromise() {
        if (
            GeoLeaf._GeoJSONLoader &&
            typeof GeoLeaf._GeoJSONLoader.loadAllLayersConfigsForLayerManager === "function"
        ) {
            const activeProfile =
                GeoLeaf.Config && typeof GeoLeaf.Config.getActiveProfile === "function"
                    ? GeoLeaf.Config.getActiveProfile()
                    : null;
            if (activeProfile) {
                return GeoLeaf._GeoJSONLoader
                    .loadAllLayersConfigsForLayerManager(activeProfile)
                    .catch((err) => {
                        AppLog.warn("Erreur chargement configs couches:", err);
                        return [];
                    });
            }
        }
        return Promise.resolve();
    }
    const loadAllConfigsPromise = buildLoadAllConfigsPromise();

    loadAllConfigsPromise.then(function () {
        if (!GeoLeaf.ThemeSelector || typeof GeoLeaf.ThemeSelector.init !== "function") {
            AppLog.warn("ThemeSelector non disponible");
            return;
        }

        let currentProfileId = null;
        if (GeoLeaf.Config && typeof GeoLeaf.Config.getActiveProfileId === "function") {
            currentProfileId = GeoLeaf.Config.getActiveProfileId();
        }

        const primaryContainer = document.getElementById("gl-theme-primary-container");
        const secondaryContainer = document.getElementById("gl-theme-secondary-container");

        if (!currentProfileId || !primaryContainer || !secondaryContainer) {
            AppLog.warn("ThemeSelector : conteneurs ou profil manquants");
            return;
        }

        GeoLeaf.ThemeSelector.init({
            profileId: currentProfileId,
            primaryContainer: primaryContainer,
            secondaryContainer: secondaryContainer,
        })
            .then(function () {
                AppLog.log("ThemeSelector initialisé et thème appliqué");

                if (
                    GeoLeaf._GeoJSONLayerManager &&
                    typeof GeoLeaf._GeoJSONLayerManager.populateLayerManagerWithAllConfigs ===
                        "function"
                ) {
                    const activeThemeConfig = GeoLeaf.ThemeSelector.getActiveTheme
                        ? GeoLeaf.ThemeSelector.getActiveTheme()
                        : null;
                    GeoLeaf._GeoJSONLayerManager.populateLayerManagerWithAllConfigs(
                        activeThemeConfig
                    );
                }

                document.addEventListener("geoleaf:theme:applied", function () {
                    if (
                        GeoLeaf._GeoJSONLayerManager &&
                        typeof GeoLeaf._GeoJSONLayerManager.populateLayerManagerWithAllConfigs ===
                            "function"
                    ) {
                        const activeThemeConfig = GeoLeaf.ThemeSelector.getActiveTheme
                            ? GeoLeaf.ThemeSelector.getActiveTheme()
                            : null;
                        GeoLeaf._GeoJSONLayerManager.populateLayerManagerWithAllConfigs(
                            activeThemeConfig
                        );
                    }
                });
            })
            .catch(function (e) {
                AppLog.warn("Erreur initialisation ThemeSelector:", e);
            });
    });
}
