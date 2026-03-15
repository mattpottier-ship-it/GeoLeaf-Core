/*!
 * GeoLeaf Core – App / Boot
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Application Boot
 * Loads the configuration and launches initialization.
 * Exposess the public API GeoLeaf.boot().
 *
 * Usage : <script>GeoLeaf.boot();</script>
 *
 * @module app/boot
 */
import { _g } from "../modules/globals.js";

const GeoLeaf = _g.GeoLeaf;
const _app = (GeoLeaf._app = GeoLeaf._app || {});

// ============================================================
// Fonction startApp : loading config + lancement initApp
// ============================================================
/* eslint-disable complexity, max-lines-per-function -- boot sequence */
_app.startApp = async function () {
    const AppLog = _app.AppLog;

    if (!GeoLeaf) {
        AppLog.error(
            "GeoLeaf global not found. The core bundle must be loaded before GeoLeaf.boot()."
        );
        return;
    }

    if (typeof GeoLeaf.loadConfig !== "function") {
        AppLog.error("GeoLeaf.loadConfig() not found. Check that the core bundle is complete.");
        return;
    }

    AppLog.info("Starting application...");

    // Listen for app ready event to show boot toast
    // (after UI is ready — GeoLeaf.UI.notify may not be available yet)
    document.addEventListener(
        "geoleaf:app:ready",
        function _onAppReady() {
            if (GeoLeaf.bootInfo?.show) {
                GeoLeaf.bootInfo.show(GeoLeaf);
            }
        },
        { once: true }
    );

    let selectedProfile = null;
    try {
        const rawProfile = sessionStorage.getItem("gl-selected-profile");
        // Validate profile ID: alphanumeric, hyphens, underscores, max 50 chars
        if (rawProfile && /^[a-zA-Z0-9_-]{1,50}$/.test(rawProfile)) {
            selectedProfile = rawProfile;
            AppLog.log("Profile selected from sessionStorage:", selectedProfile);
        } else if (rawProfile) {
            AppLog.warn(
                "sessionStorage profile rejected (invalid format):",
                rawProfile.substring(0, 20)
            );
        }
        sessionStorage.removeItem("gl-selected-profile");
    } catch (e) {
        AppLog.warn("Unable to read sessionStorage:", e);
    }

    const profilesPath = _app.getProfilesBasePath();

    // perf 5.4: wrap loadConfig (callback) in a Promise to enable chaining
    const configPromise = new Promise((resolve, reject) => {
        GeoLeaf.loadConfig({
            url: profilesPath + "geoleaf.config.json",
            profileId: selectedProfile,
            autoEvent: true,
            onLoaded: resolve,
            onError: reject,
        });
    });

    let cfg;
    try {
        cfg = await configPromise;
        AppLog.log("Config loaded via GeoLeaf.loadConfig:", cfg || {});
    } catch (err) {
        AppLog.error("Error loading config via GeoLeaf.loadConfig:", err);
        return;
    }

    if (GeoLeaf.Config && typeof GeoLeaf.Config.getCategories === "function") {
        try {
            GeoLeaf.Config.getCategories();
        } catch (e) {
            AppLog.warn("Error reading category mapping:", e);
        }
    }

    const baseCfg = cfg || {};

    if (GeoLeaf.Config && typeof GeoLeaf.Config.loadActiveProfileResources === "function") {
        try {
            const profileCfg = await GeoLeaf.Config.loadActiveProfileResources();
            AppLog.info("Active profile resources loaded.");
            _app.initApp(profileCfg || baseCfg);
        } catch (err) {
            AppLog.warn("Error loading profile resources:", err);
            _app.initApp(baseCfg);
        }
    } else {
        _app.initApp(baseCfg);
    }
};
/* eslint-enable complexity, max-lines-per-function */

// ============================================================
// Exposesr GeoLeaf.boot() — API public
// ============================================================

/**
 * Starts the GeoLeaf application.
 * Loads the configuration, initializes the map and all modules.
 * Optional plugins (Storage, AddPOI) must be loaded before this call.
 *
 * @param options - Optional. { onPerformanceMetrics: (metrics) => void } to receive runtime metrics after geoleaf:app:ready.
 * @example
 * GeoLeaf.boot();
 * // or with metrics callback (prod / analytics)
 * GeoLeaf.boot({ onPerformanceMetrics: (m) => console.log(m.timeToMapReadyMs) });
 */
GeoLeaf.boot = function (options?: {
    onPerformanceMetrics?: (metrics: {
        timeToMapReadyMs: number | null;
        timeToAppReadyMs: number | null;
        startupTotalMs: number | null;
        capturedAt: string;
    }) => void;
}) {
    if (options?.onPerformanceMetrics) {
        GeoLeaf._perfCallback = options.onPerformanceMetrics;
    }
    // Premium plugin report — silent if none loaded (core only)
    GeoLeaf.plugins?.reportPremiumPlugins?.();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", _app.startApp);
    } else {
        _app.startApp();
    }
};

export { _app };
