/*!
 * GeoLeaf Core – App / Helpers
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Application Helpers
 * Production logging, path detection, plugin verification,
 * and notification helper.
 *
 * This file creates the shared GeoLeaf._app namespace used by
 * app/init.js and app/boot.js.
 *
 * @module app/helpers
 */
import { _g } from "../modules/globals.js";
import { Log } from "../modules/log/index.js";

const GeoLeaf = _g.GeoLeaf;

/**
 * Internal namespace for the Application Bootstrap module.
 * Shared between app/helpers.js, app/init.js and app/boot.js.
 * @namespace GeoLeaf._app
 * @private
 */
const _app = (GeoLeaf._app = GeoLeaf._app || {});

// ============================================================
// Production logging system
// ============================================================
_app.AppLog = {
    log(...args: any[]) {
        if (location.search.includes("debug=true")) {
            // eslint-disable-next-line no-console -- intentional debug output when ?debug=true
            console.debug("[GeoLeaf]", ...args);
        }
    },
    info(...args: any[]) {
        console.info("[GeoLeaf]", ...args);
    },
    error(...args: any[]) {
        console.error("[GeoLeaf]", ...args);
    },
    warn(...args: any[]) {
        console.warn("[GeoLeaf]", ...args);
    },
};

// ============================================================
// Automatic path detection for profiles/
// ============================================================
/**
 * Automatically detects the base path to the profiles/ folder
 * based on the current URL.
 * @returns {string} Relative path to profiles/
 */
_app.getProfilesBasePath = function () {
    const currentPath = _g.location.pathname;
    if (currentPath.includes("/demo/")) {
        return "../profiles/";
    }
    return "./profiles/";
};

// ============================================================
// Plugin verification at boot
// ============================================================
/**
 * Verifies that required plugins for the configuration are loaded
 * and prints console warnings if they are missing.
 * @param {Object} cfg - Active profile configuration
 */
/* eslint-disable complexity -- sequential plugin checks */
_app.checkPlugins = function (cfg: any) {
    const AppLog = _app.AppLog;

    // Warning if config expects AddPOI but plugin is not loaded
    if (cfg && cfg.ui && cfg.ui.showAddPoi === true) {
        if (!GeoLeaf.POI || !GeoLeaf.POI.AddForm) {
            AppLog.warn(
                "⚠️ Config has showAddPoi=true but AddPOI plugin is not loaded. " +
                    "Load geoleaf-addpoi.plugin.js before calling GeoLeaf.boot()."
            );
        }
    }

    // Warning if config expects Storage but plugin is not loaded
    if (cfg && cfg.storage) {
        if (!GeoLeaf.Storage) {
            AppLog.warn(
                "⚠️ Config references storage but Storage plugin is not loaded. " +
                    "Advanced features (IndexedDB, CacheManager, sync) require geoleaf-storage.plugin.js. " +
                    "Basic offline caching via SW core is always available without the plugin."
            );
        }

        // SW lite (sw-core.js) is always registered at boot — no check needed.
        // Only warn if user expects PREMIUM SW without the Storage plugin.
        if (cfg.storage.enableServiceWorker && !GeoLeaf.Storage) {
            AppLog.warn(
                "⚠️ Config has enableServiceWorker=true but Storage plugin is not loaded. " +
                    "Premium SW (IndexedDB tiles, background sync) requires geoleaf-storage.plugin.js. " +
                    "Core/lite SW remains active for basic offline caching."
            );
        }
    }

    // Warning if SyncHandler is loaded without Storage
    if (GeoLeaf.POI && GeoLeaf.POI.SyncHandler && !GeoLeaf.Storage) {
        AppLog.warn(
            "⚠️ SyncHandler loaded without Storage plugin — sync operations will be disabled. " +
                "POI add/edit/delete will work in online-only mode."
        );
    }
};
/* eslint-enable complexity */

// ============================================================
// Helper : display une notification
// ============================================================
/**
 * Displays a notification via the GeoLeaf UI system.
 * Tries GeoLeaf.UI.Notifications first, then GeoLeaf._UINotifications.
 * @param {string} message - Message to display
 * @param {number} [duration=3500] - Display duration in milliseconds
 * @returns {boolean} true if the notification was shown
 */
/* eslint-disable complexity -- fallback notification paths */
_app.showNotification = function (message: any, duration: any) {
    duration = duration || 3500;
    if (
        GeoLeaf.UI &&
        GeoLeaf.UI.Notifications &&
        typeof GeoLeaf.UI.Notifications.success === "function"
    ) {
        try {
            GeoLeaf.UI.Notifications.success(message, duration);
            return true;
        } catch (_) {
            /* notification API may not be ready */
        }
    }
    if (GeoLeaf._UINotifications && typeof GeoLeaf._UINotifications.success === "function") {
        try {
            GeoLeaf._UINotifications.success(message, duration);
            return true;
        } catch (_) {
            /* notification API may not be ready */
        }
    }
    if (Log && typeof Log.debug === "function") {
        Log.debug(message + " (notifications indisponibles)");
    }
    return false;
};
/* eslint-enable complexity */

// ============================================================
// Sprint 6: Lazy module loader helper
// ============================================================
/**
 * Ensures a secondary module is loaded.
 * In UMD mode the module is already available (inlined) → immediate resolution.
 * In ESM mode, triggers network chunk loading if needed.
 *
 * @param {string} globalName - Name on window.GeoLeaf (e.g. 'POI', 'Route')
 * @param {string} chunkName  - Chunk identifier (e.g. 'poi', 'route')
 * @returns {Promise<void>}
 */
/* eslint-disable security/detect-object-injection -- intentional GeoLeaf[globalName] lookup */
_app._ensureModule = async function (globalName: any, chunkName: any) {
    if (GeoLeaf[globalName]) return; // already loaded (UMD or already imported)
    if (typeof GeoLeaf._loadModule === "function") {
        await GeoLeaf._loadModule(chunkName);
    }
};
/* eslint-enable security/detect-object-injection */

export { _app };
