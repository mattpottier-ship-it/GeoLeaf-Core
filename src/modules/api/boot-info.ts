/*!
 * GeoLeaf Core – API / Boot Info
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

/**
 * Displays un toast de startup listant la version GeoLeaf
 * et les plugins optionals loadeds.
 *
 * Called automatically at the end of GeoLeaf.boot() if not deactivated.
 *
 * @module api/boot-info
 */

/**
 * Detects les plugins loadeds en interrogeant window.GeoLeaf.
 * @param {object} GeoLeaf - Le namespace global GeoLeaf
 * @returns {string[]} List des noms de plugins actives
 */
/* eslint-disable complexity -- plugin detection branchs */
function _detectLoadedPlugins(GeoLeaf: any) {
    // Source maine : PluginRegistry (fiable, auto-enregistrement par chaque plugin).
    // If the registry is available, it is fully trusted — even if the list is empty (Core only).
    // Ne PAS tomber en fallback duck-typing : les facades Core (Storage, Labels, LayerManager)
    // existent same sans plugin premium, ce qui fausse la detection.
    if (GeoLeaf.plugins?.getLoadedPlugins) {
        return GeoLeaf.plugins.getLoadedPlugins().filter((n: any) => !["core"].includes(n));
    }

    // Fallback duck-typing si registry non available (compat ascendante)
    const plugins = [];
    if (GeoLeaf.Storage && typeof GeoLeaf.Storage === "object") {
        const hasDB = GeoLeaf.Storage.DB && typeof GeoLeaf.Storage.DB === "object";
        plugins.push(hasDB ? "storage (offline + IndexedDB)" : "storage (cache)");
    }
    if (GeoLeaf.POI?.AddForm && typeof GeoLeaf.POI.AddForm === "object") {
        plugins.push("addpoi");
    }
    if (GeoLeaf._LayerManagerControl || GeoLeaf._LMRenderer) {
        plugins.push("layer-manager");
    }
    if (GeoLeaf.Route && typeof GeoLeaf.Route.load === "function") {
        plugins.push("route");
    }
    if (GeoLeaf.Labels && typeof GeoLeaf.Labels.init === "function") {
        plugins.push("labels");
    }
    return plugins;
}
/* eslint-enable complexity */

/**
 * Builds the message du toast de startup.
 * @param {object} GeoLeaf
 * @returns {{ title: string, message: string }}
 */
function _buildBootMessage(GeoLeaf: any) {
    const version = GeoLeaf._version || "1.1.0";
    const plugins = _detectLoadedPlugins(GeoLeaf);

    // Distinguer modules premium des modules core
    const premiumKeys = ["storage", "addpoi"];
    const premiumLoaded = plugins.filter((p: any) =>
        premiumKeys.some((pk) => p.toLowerCase().startsWith(pk))
    );
    const coreModules = plugins.filter(
        (p: any) => !premiumKeys.some((pk: any) => p.toLowerCase().startsWith(pk))
    );

    let message = "";
    if (premiumLoaded.length > 0) {
        message = `Core MIT • Premium: ${premiumLoaded.join(" + ")}`;
        if (coreModules.length > 0) message += ` • ${coreModules.join(" • ")}`;
    } else {
        message =
            plugins.length > 0 ? `Core MIT — ${coreModules.join(" • ")}` : "Core MIT — open source";
    }

    return {
        title: `GeoLeaf JS ${version}`,
        message,
    };
}

/**
 * Displays le toast de startup.
 * Respects the `debug.showBootInfo` config (default: true in dev, false in prod).
 *
 * @param {object} GeoLeaf - Le namespace global GeoLeaf
 * @param {object} [options]
 * @param {boolean} [options.force=false] - Forcer l'display same si deactivated en config
 * @param {number} [options.duration=4000] - Duration d'display en ms
 */
export function showBootInfo(GeoLeaf: any, options: any = {}) {
    if (!GeoLeaf) return;

    // Config check — can be disabled via JSON profile: "debug": { "showBootInfo": false }
    if (!options.force) {
        try {
            const showFlag = GeoLeaf.Config?.get?.("debug.showBootInfo");
            // Si explicitement deactivated, ne pas display
            if (showFlag === false) return;
        } catch (_) {
            /* Config non available — display quand same */
        }
    }

    const { title, message } = _buildBootMessage(GeoLeaf);

    // Log only — toast deactivated (dev info only)
    console.info(`[GeoLeaf] ${title} | ${message}`);
}

/**
 * API public exposede sur GeoLeaf.bootInfo
 */
export const BootInfo = {
    show: showBootInfo,
    detectPlugins: _detectLoadedPlugins,
    buildMessage: _buildBootMessage,
};
