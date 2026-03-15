/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module log/log-config
 * @description Configuration globale des logs pour GeoLeaf.
 * Applies automaticment les bonnes configurations de log selon l'environment.
 */

import { Log } from "./logger.js";

export interface LogConfigOptions {
    level?: "debug" | "info" | "warn" | "error" | "production";
    quietMode?: boolean;
}

function _scheduleStartupSummary(isProduction: boolean, isDebug: boolean): void {
    if (typeof setTimeout === "undefined" || typeof performance === "undefined") return;
    setTimeout(() => {
        if (Log.showSummary) {
            Log.showSummary();
        }

        const endTime = performance.now();
        const g =
            typeof globalThis !== "undefined"
                ? (globalThis as unknown as { GeoLeaf?: { _moduleCount?: number } })
                : undefined;
        const moduleCount =
            g?.GeoLeaf && typeof g.GeoLeaf._moduleCount === "number" ? g.GeoLeaf._moduleCount : "?";
        Log.info("🎯 [GeoLeaf] Startup complete:", {
            "⏱️ Total time": Math.round(endTime) + "ms",
            "📦 Modules": String(moduleCount) + " loaded",
            "🔇 Logs": isProduction ? "production mode" : isDebug ? "debug mode" : "optimized mode",
            "💡 Tip": isDebug ? "" : "Add ?debug=true for detailed logs",
        });
    }, 3000);
}

/**
 * Configures the logger based on the detected environment or provided options.
 */
export function configureLogging(options: LogConfigOptions = {}): void {
    // If explicit options are provided, use them
    if (options.level) {
        Log.setLevel(options.level);
        if (typeof options.quietMode === "boolean") {
            Log.setQuietMode(options.quietMode);
        }
        return;
    }

    // Auto-detect environment (browser only)
    if (typeof location === "undefined") return;

    const isProduction =
        location.hostname !== "localhost" &&
        !location.hostname.includes("127.0.0.1") &&
        !location.search.includes("debug=true");
    const isDebug =
        location.search.includes("debug=true") || location.search.includes("verbose=true");

    if (isProduction) {
        // Production: warnings and errors only + quiet mode
        Log.setLevel("production");
        Log.info("🔧 [GeoLeaf] Production mode enabled - reduced logs");
    } else if (isDebug) {
        // Explicit debug mode: all logs
        Log.setLevel("debug");
        Log.setQuietMode(false);
        Log.info("🔧 [GeoLeaf] Debug mode enabled - all logs visible");
    } else {
        // Development: informational logs with quiet mode
        Log.setLevel("info");
        Log.setQuietMode(true);
        Log.info("🔧 [GeoLeaf] Development mode - optimized logs");
    }

    // Show startup summary after full load
    _scheduleStartupSummary(isProduction, isDebug);
}

// ── Auto-configuration au loading (side-effect, backward compat) ──
// In mode browser, configure automaticment au loading of the module.
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => configureLogging());
    } else {
        configureLogging();
    }
}
