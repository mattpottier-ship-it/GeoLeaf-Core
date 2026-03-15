declare const L: any;
/*!
 * GeoLeaf Core – App / Init
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Application Init
 * Main initialisation function for the application:
 * - Map initialisation
 * - Loading modules (POI, Routes, GeoJSON, etc.)
 * - UI component configuration
 * - Reveal mechanism (loader / spinner)
 *
 * @module app/init
 */
import "../modules/utils/runtime-metrics.js";
import { _g } from "../modules/globals.js";
import { initBasemaps, initPOI, initRoute, initGeoJSON } from "./init-feature-modules.js";
import { initI18n } from "../modules/i18n/i18n.js";

const GeoLeaf = _g.GeoLeaf;
const _app = (GeoLeaf._app = GeoLeaf._app || {});

// ============================================================
// Main function: initialise the application
// ============================================================
/* eslint-disable complexity, max-lines-per-function -- init orchestration */
_app.initApp = async function (cfg: any) {
    cfg = cfg || {};
    const AppLog = _app.AppLog;
    // perf 5 — benchmark: startup measurement
    if (typeof performance !== "undefined" && performance.mark) {
        performance.mark("geoleaf:initApp:start");
    }
    AppLog.log("Initializing with config:", cfg);
    initI18n();

    // Check plugins
    _app.checkPlugins(cfg);

    // ========================================================
    // Map initialisation
    // The map is created directly on the profile extent
    // (map.bounds is required in the profile).
    // ========================================================
    const mapTarget = (cfg.map && (cfg.map.target || cfg.map.id)) || "geoleaf-map";
    const uiTheme = (cfg.ui && cfg.ui.theme) || "light";

    // Required bounds — no world map fallback
    if (!cfg.map || !Array.isArray(cfg.map.bounds) || cfg.map.bounds.length !== 2) {
        AppLog.error(
            "[GeoLeaf] Active profile does not define valid map.bounds. " +
                "The extent (map.bounds) is required in profile.json. " +
                'Example: "bounds": [[43.0, 1.0], [44.0, 2.0]]'
        );
        return;
    }

    // Calculate the centre from the bounds to avoid the world map flash
    const profileBounds = cfg.map.bounds;
    const profileMaxZoom = cfg.map.initialMaxZoom || cfg.map.maxZoom || 12;
    const profilePadding = cfg.map.padding || [50, 50];
    const mapCenter = [
        (profileBounds[0][0] + profileBounds[1][0]) / 2,
        (profileBounds[0][1] + profileBounds[1][1]) / 2,
    ];

    let map: any = null;

    // Advanced Leaflet options (maxBounds for positionFixed, etc.)
    const mapOptions: any = {};
    if (cfg.map.positionFixed === true) {
        const boundsMargin = typeof cfg.map.boundsMargin === "number" ? cfg.map.boundsMargin : 0.3;
        mapOptions.maxBounds = L.latLngBounds(profileBounds).pad(boundsMargin);
        mapOptions.maxBoundsViscosity = 0.85;
        if (typeof cfg.map.minZoom === "number") {
            mapOptions.minZoom = cfg.map.minZoom;
        } else {
            mapOptions.minZoom = 3;
        }
    }

    try {
        map = GeoLeaf.init({
            map: {
                target: mapTarget,
                center: mapCenter,
                zoom: profileMaxZoom,
                mapOptions: mapOptions,
            },
            ui: {
                theme: uiTheme,
            },
        });
    } catch (e) {
        AppLog.error("GeoLeaf.init() threw an error:", e);
        return;
    }

    if (!map) {
        AppLog.error("GeoLeaf.init() did not return a valid map.");
        return;
    }

    // Preload secondary modules as early as possible to overlap
    // chunk network loading with UI/Storage initialisation.
    // We keep an await below before using the secondary modules in order to
    // preserve current behavior.
    let secondaryModulesPromise = null;
    if (typeof GeoLeaf._loadAllSecondaryModules === "function") {
        secondaryModulesPromise = GeoLeaf._loadAllSecondaryModules();
    }

    // Apply positionFixed directly after creation (safety net)
    if (cfg.map.positionFixed === true) {
        try {
            const boundsMargin =
                typeof cfg.map.boundsMargin === "number" ? cfg.map.boundsMargin : 0.3;
            const fixedBounds = L.latLngBounds(profileBounds).pad(boundsMargin);
            map.setMaxBounds(fixedBounds);
            map.options.maxBoundsViscosity = 0.85;
            if (typeof cfg.map.minZoom === "number") {
                map.setMinZoom(cfg.map.minZoom);
            } else {
                map.setMinZoom(3);
            }
            AppLog.log(
                "[GeoLeaf] positionFixed enabled — movement restricted to profile extent (margin: " +
                    boundsMargin * 100 +
                    "%)."
            );
        } catch (e) {
            AppLog.warn("[GeoLeaf] Error applying positionFixed:", e);
        }
    }

    // Precise positioning via fitBounds (adjusts zoom to real container dimensions)
    try {
        map.fitBounds(profileBounds, {
            maxZoom: profileMaxZoom,
            padding: profilePadding,
            animate: false,
        });
        AppLog.log("Map positioned via profile map.bounds.");
    } catch (e) {
        AppLog.warn("Error during fitBounds from profile map.bounds:", e);
    }

    // ========================================================
    // Service Worker core/lite — UNCONDITIONAL registration
    // The lite SW (sw-core.js) is part of the free core.
    // It will be replaced by the premium SW (sw.js) if the
    // Storage plugin is loaded AND enableServiceWorker = true.
    // ========================================================
    if (GeoLeaf._SWRegister) {
        GeoLeaf._SWRegister
            .register({ scope: "./" })
            .then(() => AppLog.log("Service Worker (core/lite) registered."))
            .catch((err: any) => AppLog.warn("Error registering core SW:", err.message));
    }

    // ========================================================
    // Initialise Storage with the profile config (if plugin loaded)
    // ========================================================
    const storageConfig = cfg.storage || {};

    if (GeoLeaf.Storage && typeof GeoLeaf.Storage.init === "function") {
        try {
            AppLog.log("Initializing Storage with config:", storageConfig);

            GeoLeaf.Storage.init({
                indexedDB: { name: "geoleaf-db", version: 2 },
                cache: storageConfig.cache || {
                    enableProfileCache: true,
                    enableTileCache: true,
                },
                offline: {},
                enableOfflineDetector: !!storageConfig.enableOfflineDetector,
                enableServiceWorker: !!storageConfig.enableServiceWorker,
            })
                .then(() => {
                    AppLog.log("Storage initialized successfully");
                })
                .catch((err: any) => {
                    AppLog.warn("Error initializing Storage:", err);
                });
        } catch (e) {
            AppLog.warn("Error during Storage initialization:", e);
        }
    } else {
        AppLog.log("Plugin Storage not loaded — running in standard browser cache mode.");

        // Initialize the Offline Detector for connectivity badge (core mode)
        if (storageConfig.enableOfflineDetector && GeoLeaf._OfflineDetector) {
            GeoLeaf._OfflineDetector.init({
                showBadge: true,
                badgePosition: "topleft",
                checkInterval: 30000,
            });
            AppLog.log("Offline Detector initialized (core mode).");
        }
    }

    // ========================================================
    // Initialise the UI notification system
    // ========================================================
    if (GeoLeaf._UINotifications && typeof GeoLeaf._UINotifications.init === "function") {
        try {
            let notificationContainer = document.getElementById("gl-notifications");
            if (!notificationContainer) {
                notificationContainer = document.createElement("div");
                notificationContainer.id = "gl-notifications";
                notificationContainer.className =
                    "gl-notifications gl-notifications--bottom-center";
                document.body.appendChild(notificationContainer);
            }

            GeoLeaf._UINotifications.init({
                container: "#gl-notifications",
                position: "bottom-center",
                maxVisible: 3,
                animations: true,
            });

            AppLog.log("Notification system initialized");
        } catch (e) {
            AppLog.warn("Error during notification system initialization:", e);
        }
    }

    // ========================================================
    // Persistent loading toast during layer loading
    // Shown as soon as ThemeApplier starts loading a theme,
    // dismissed when geoleaf:theme:applied is emitted.
    // ========================================================
    let _loadingToast: any = null;

    document.addEventListener("geoleaf:theme:applying", function () {
        // Display a persistent toast if the notification system is ready
        if (GeoLeaf._UINotifications && GeoLeaf._UINotifications.container) {
            _loadingToast = GeoLeaf._UINotifications.info("Loading data, please wait.", {
                persistent: true,
                dismissible: false,
            });
        }
    });

    // ========================================================
    // Event listeners (profile & theme notifications)
    // ========================================================
    let pendingProfileToastDetail: any = null;

    function notificationsReady() {
        try {
            if (
                GeoLeaf.UI &&
                GeoLeaf.UI.Notifications &&
                typeof GeoLeaf.UI.Notifications.getStatus === "function"
            ) {
                return !!GeoLeaf.UI.Notifications.getStatus().initialized;
            }
            if (GeoLeaf._UINotifications && GeoLeaf._UINotifications.container) {
                return true;
            }
        } catch (e) {
            void e;
        }
        return false;
    }

    function tryShowProfileToast(detail: any) {
        if (!detail || !detail.data) return false;
        const profile = detail.data.profile || {};
        const profileName =
            profile.label || profile.name || profile.title || detail.profileId || "Profile";
        const message = profileName + " loaded";
        if (!notificationsReady()) {
            pendingProfileToastDetail = detail;
            return false;
        }
        const shown = _app.showNotification(message);
        if (shown) pendingProfileToastDetail = null;
        else pendingProfileToastDetail = detail;
        return shown;
    }

    document.addEventListener("geoleaf:profile:loaded", function (event) {
        if (event && (event as any).detail) {
            pendingProfileToastDetail = (event as any).detail;
            tryShowProfileToast((event as any).detail);
        }
    });

    document.addEventListener("geoleaf:theme:applied", function (event) {
        // Close the persistent loading toast
        if (
            _loadingToast &&
            GeoLeaf._UINotifications &&
            typeof GeoLeaf._UINotifications.dismiss === "function"
        ) {
            GeoLeaf._UINotifications.dismiss(_loadingToast);
            _loadingToast = null;
        }
        if (event && (event as any).detail) {
            const detail = (event as any).detail;
            _app.showNotification(
                `Theme "${detail.themeName}" loaded (${detail.layerCount} visible layers)`,
                3500
            );
        }
    });

    // Listen for load completion to show pending notifications
    document.addEventListener("geoleaf:map:ready", function () {
        if (pendingProfileToastDetail) {
            tryShowProfileToast(pendingProfileToastDetail);
        }
    });

    // ========================================================
    // UI theme via GeoLeaf.setTheme() + UI initialisation
    // ========================================================
    try {
        if (typeof GeoLeaf.setTheme === "function") {
            GeoLeaf.setTheme(uiTheme);
        }
    } catch (e) {
        AppLog.warn("Error calling GeoLeaf.setTheme:", e);
    }

    if (GeoLeaf.UI && typeof GeoLeaf.UI.init === "function") {
        try {
            const mapContainer =
                document.querySelector(".gl-main") || document.getElementById(mapTarget);
            GeoLeaf.UI.init({
                buttonSelector: '[data-gl-role="theme-toggle"]',
                map: map,
                mapContainer: mapContainer,
                config: cfg,
            });
        } catch (e) {
            AppLog.warn("GeoLeaf.UI.init() threw an error:", e);
        }
    }

    // Build the filter panel
    // ui.showFilterPanel === false: hide the toggle button + panel and skip building it
    if (cfg.ui && cfg.ui.showFilterPanel === false) {
        const _toggleBtn = document.getElementById("gl-filter-toggle");
        if (_toggleBtn) _toggleBtn.style.display = "none";
        const _filterPanel = document.getElementById("gl-filter-panel");
        if (_filterPanel) _filterPanel.style.display = "none";
    } else if (GeoLeaf.UI && typeof GeoLeaf.UI.buildFilterPanelFromActiveProfile === "function") {
        try {
            let filterContainer = document.getElementById("gl-filter-panel");
            if (!filterContainer) {
                filterContainer = document.createElement("div");
                filterContainer.id = "gl-filter-panel";
                filterContainer.setAttribute("data-gl-role", "filter-panel");
                const glMain = document.querySelector(".gl-main");
                if (glMain) glMain.appendChild(filterContainer);
                else document.body.appendChild(filterContainer);
            }

            GeoLeaf.UI.buildFilterPanelFromActiveProfile({ container: filterContainer });

            if (typeof GeoLeaf.UI.initFilterToggle === "function") {
                GeoLeaf.UI.initFilterToggle();
            }
            if (typeof GeoLeaf.UI.initProximityFilter === "function") {
                GeoLeaf.UI.initProximityFilter(map);
            }
        } catch (e) {
            AppLog.warn("Error building the filter panel:", e);
        }
    }

    // Mobile utilities pill bar + sheet (Phase 2 Mobile Friendly)
    if (GeoLeaf.UI && typeof GeoLeaf.UI.initMobileToolbar === "function") {
        try {
            const glMain = document.querySelector(".gl-main") as HTMLElement | null;
            if (glMain) {
                GeoLeaf.UI.initMobileToolbar({
                    glMain,
                    map,
                    showAddPoi: cfg?.ui?.showAddPoi ?? false,
                    sheetTitles: {
                        ...(cfg.search?.title ? { filters: cfg.search.title } : {}),
                        ...(cfg.layerManagerConfig?.title
                            ? { layers: cfg.layerManagerConfig.title }
                            : {}),
                        ...(cfg.legendConfig?.title ? { legend: cfg.legendConfig.title } : {}),
                        ...(cfg.tableConfig?.title ? { table: cfg.tableConfig.title } : {}),
                    },
                    getFilterActiveState: () =>
                        (GeoLeaf as any)._UIFilterStateManager?.hasActiveFilters?.() ?? false,
                    onResetFilters: () => {
                        const panel = document.getElementById("gl-filter-panel");
                        const StateReader = (GeoLeaf as any)._UIFilterPanelStateReader;
                        const Applier = (GeoLeaf as any)._UIFilterPanelApplier;
                        if (panel && StateReader?.resetControls && Applier?.applyFiltersNow) {
                            StateReader.resetControls(panel);
                            Applier.applyFiltersNow(panel, true);
                        }
                    },
                });
                AppLog.log("Mobile pill bar and sheet initialized.");
            }
        } catch (e) {
            AppLog.warn("Error initializing mobile pill bar:", e);
        }
    }

    // Persistent right sidebar for desktop (>= 1440px) (Phase 9 Mobile Friendly)
    if (GeoLeaf.UI && typeof GeoLeaf.UI.initDesktopPanel === "function") {
        try {
            const glMainDesktop = document.querySelector(".gl-main") as HTMLElement | null;
            if (glMainDesktop) {
                GeoLeaf.UI.initDesktopPanel({
                    glMain: glMainDesktop,
                    titleFilters: cfg.search?.title,
                    titleLayers: cfg.layerManagerConfig?.title,
                    titleLegend: cfg.legendConfig?.title,
                    titleTable: cfg.tableConfig?.title,
                });
                AppLog.log("Right desktop sidebar initialized.");
            }
        } catch (e) {
            AppLog.warn("Error initializing right desktop panel:", e);
        }
    }

    // ========================================================
    // Sprint 6: Loading secondary modules (code splitting)
    // In ESM mode: loads network chunks in parallel.
    // In UMD mode: already inlined, immediate resolution.
    // ========================================================
    if (secondaryModulesPromise) {
        try {
            await secondaryModulesPromise;
            AppLog.log(
                "Secondary modules loaded (POI, Route, Legend, LayerManager, Labels, Themes, Table)."
            );
        } catch (e) {
            AppLog.warn("Error loading secondary modules:", e);
        }
    }

    // Initialise the Table module
    // ui.showTable !== false: same pattern as showLegend / showLayerManager
    if (
        cfg.ui &&
        cfg.ui.showTable !== false &&
        GeoLeaf.Table &&
        typeof GeoLeaf.Table.init === "function" &&
        cfg.tableConfig &&
        cfg.tableConfig.enabled !== false
    ) {
        try {
            GeoLeaf.Table.init({ map: map, config: cfg.tableConfig });
            AppLog.log("Table module initialized.");
        } catch (e) {
            AppLog.warn("Error during Table module initialization:", e);
        }
    }

    // Initialise the offline cache button (if Storage plugin loaded)
    if (GeoLeaf.UI && GeoLeaf.UI.CacheButton && typeof GeoLeaf.UI.CacheButton.init === "function") {
        try {
            GeoLeaf.UI.CacheButton.init(map, cfg);
            AppLog.log("Cache button initialized.");
        } catch (e) {
            AppLog.warn("Error during cache button initialization:", e);
        }
    }

    // ========================================================
    // Basemaps via GeoLeaf.BaseLayers
    // ========================================================
    initBasemaps({ GeoLeaf, cfg, map, AppLog });

    // ========================================================
    // POI via GeoLeaf.POI
    // ========================================================
    initPOI({ GeoLeaf, cfg, map, AppLog });

    // ========================================================
    // Routes via GeoLeaf.Route
    // ========================================================
    initRoute({ GeoLeaf, cfg, map, AppLog });

    // ========================================================
    // GeoJSON layers via GeoLeaf.GeoJSON
    // ========================================================
    initGeoJSON({ GeoLeaf, cfg, map, AppLog, _app: _app });

    // ========================================================
    // Branding
    // ========================================================
    if (GeoLeaf.UI && GeoLeaf.UI.Branding && typeof GeoLeaf.UI.Branding.init === "function") {
        try {
            GeoLeaf.UI.Branding.init(map);
        } catch (e) {
            AppLog.warn("GeoLeaf.UI.Branding.init() threw an error:", e);
        }
    }

    // ========================================================
    // Legend and layer manager
    // ========================================================
    if (
        cfg.ui &&
        cfg.ui.showLegend !== false &&
        GeoLeaf.Legend &&
        typeof GeoLeaf.Legend.init === "function"
    ) {
        try {
            GeoLeaf.Legend.init(map, {
                position: "bottomleft",
                collapsible: true,
                collapsed: false,
                title: "Legend",
            });
        } catch (e) {
            AppLog.warn("Error during Legend module initialization:", e);
        }
    }

    if (
        cfg.ui &&
        cfg.ui.showLayerManager !== false &&
        GeoLeaf.LayerManager &&
        typeof GeoLeaf.LayerManager.init === "function"
    ) {
        try {
            GeoLeaf.LayerManager.init({ map: map, position: "bottomright" });
        } catch (e) {
            AppLog.warn("GeoLeaf.LayerManager.init() threw an error:", e);
        }
    }
    // Activate the right desktop panel (after Legend + LayerManager + Table)
    if (GeoLeaf.UI && typeof GeoLeaf.UI.activateDesktopPanel === "function") {
        try {
            GeoLeaf.UI.activateDesktopPanel();
            AppLog.log("Right desktop panel activated.");
        } catch (e) {
            AppLog.warn("Error activating right desktop panel:", e);
        }
    }
    // ========================================================
    // Scale control
    // ========================================================
    if (GeoLeaf.initScaleControl && typeof GeoLeaf.initScaleControl === "function") {
        try {
            GeoLeaf.initScaleControl(map);
        } catch (e) {
            AppLog.warn("GeoLeaf.initScaleControl() threw an error:", e);
        }
    }

    // ========================================================
    // Label system
    // ========================================================
    if (GeoLeaf.Labels && typeof GeoLeaf.Labels.init === "function") {
        try {
            GeoLeaf.Labels.init({ map: map });
        } catch (e) {
            AppLog.warn("GeoLeaf.Labels.init() threw an error:", e);
        }
    }

    // ========================================================
    // Coordinates display
    // ========================================================
    if (
        cfg.ui &&
        cfg.ui.showCoordinates !== false &&
        GeoLeaf.UI &&
        GeoLeaf.UI.CoordinatesDisplay &&
        typeof GeoLeaf.UI.CoordinatesDisplay.init === "function"
    ) {
        try {
            GeoLeaf.UI.CoordinatesDisplay.init(map, { position: "bottomleft", decimals: 6 });
        } catch (e) {
            AppLog.warn("GeoLeaf.UI.CoordinatesDisplay.init() threw an error:", e);
        }
    }

    // ========================================================
    // Reveal the application when layers are ready
    // The #gl-loader spinner stays opaque while the map
    // and GeoJSON layers load in the background.
    // We wait for the geoleaf:theme:applied event (= all
    // visible layers loaded) before revealing.
    // ========================================================
    let _appRevealed = false;
    /* eslint-disable max-lines-per-function -- loader reveal + fitBounds + events */
    function revealApp(reason: any) {
        if (_appRevealed) return;
        _appRevealed = true;
        const loader = document.getElementById("gl-loader");
        if (loader) {
            loader.classList.add("gl-loader--fade");
            // Remove from DOM after the CSS transition (400ms)
            // { once: true } ensures hide() is not called multiple times
            loader.addEventListener(
                "transitionend",
                function () {
                    loader.style.display = "none";
                },
                { once: true }
            );
            // Fallback if transitionend does not fire — 800ms > transition duration
            // (value > transition duration to let transitionend execute first)
            setTimeout(function () {
                loader.style.display = "none";
            }, 800);
        }

        // Fix: the loader (#gl-loader) was covering the map (position: fixed; inset: 0)
        // causing Leaflet to calculate fitBounds on incorrect container dimensions.
        // Recalculate after removing the loader.
        if (map) {
            map.invalidateSize({ pan: false });
            setTimeout(function () {
                try {
                    map.fitBounds(profileBounds, {
                        maxZoom: profileMaxZoom,
                        padding: profilePadding,
                        animate: true,
                        duration: 0.6,
                    });
                } catch (e) {
                    AppLog.warn("[GeoLeaf] fitBounds correction at reveal:", e);
                }
            }, 120);
        }

        document.dispatchEvent(new CustomEvent("geoleaf:map:ready"));
        // Emit the application initialisation end event
        // (used by boot.js to display the boot toast via GeoLeaf.bootInfo)
        document.dispatchEvent(
            new CustomEvent("geoleaf:app:ready", {
                detail: {
                    version: GeoLeaf._version,
                    timestamp: Date.now(),
                },
            })
        );
        AppLog.info("Application ready: " + reason);
        // perf 5 — benchmark: total startup time measurement
        if (typeof performance !== "undefined" && performance.mark) {
            performance.mark("geoleaf:initApp:ready");
            try {
                performance.measure(
                    "geoleaf:startup-total",
                    "geoleaf:initApp:start",
                    "geoleaf:initApp:ready"
                );
                const entries = performance.getEntriesByName("geoleaf:startup-total", "measure");
                if (entries.length) {
                    AppLog.info(
                        "[Perf] ? Startup total: " +
                            entries[entries.length - 1].duration.toFixed(1) +
                            "ms"
                    );
                }
            } catch (error) {
                void error;
            }
        }
    }
    /* eslint-enable max-lines-per-function */

    // Wait for all theme layers to be loaded
    document.addEventListener(
        "geoleaf:theme:applied",
        function () {
            revealApp("theme applied, layers loaded");
        },
        { once: true }
    );

    // Safety: reveal after 5s max (slow network, error…) — perf 5.10: reduced from 15s to 5s
    setTimeout(function () {
        revealApp("safety timeout 5s");
    }, 5000);

    AppLog.info("Application initialized, loading layers in the background.");
};
/* eslint-enable complexity, max-lines-per-function */

export { _app };
