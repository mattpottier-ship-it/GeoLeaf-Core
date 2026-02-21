/*!
 * GeoLeaf Core – API / Boot Info
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

/**
 * Affiche un toast de démarrage listant la version GeoLeaf
 * et les plugins optionnels chargés.
 *
 * Appelé automatiquement à la fin de GeoLeaf.boot() si non désactivé.
 *
 * @module api/boot-info
 */

/**
 * Détecte les plugins chargés en interrogeant window.GeoLeaf.
 * @param {object} GeoLeaf - Le namespace global GeoLeaf
 * @returns {string[]} Liste des noms de plugins actifs
 */
function _detectLoadedPlugins(GeoLeaf) {
    // Source principale : PluginRegistry (fiable, auto-enregistrement par chaque plugin).
    // Si le registry est disponible, on s'y fie intégralement — même liste vide (Core seul).
    // Ne PAS tomber en fallback duck-typing : les facades Core (Storage, Labels, LayerManager)
    // existent même sans plugin premium, ce qui fausse la détection.
    if (GeoLeaf.plugins?.getLoadedPlugins) {
        return GeoLeaf.plugins.getLoadedPlugins().filter((n) => !['core'].includes(n));
    }

    // Fallback duck-typing si registry non disponible (compat ascendante)
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

/**
 * Construit le message du toast de démarrage.
 * @param {object} GeoLeaf
 * @returns {{ title: string, message: string }}
 */
function _buildBootMessage(GeoLeaf) {
    const version = GeoLeaf._version || "4.0.0";
    const plugins = _detectLoadedPlugins(GeoLeaf);

    // Distinguer modules premium des modules core
    const premiumKeys = ["storage", "addpoi"];
    const premiumLoaded = plugins.filter((p) =>
        premiumKeys.some((pk) => p.toLowerCase().startsWith(pk))
    );
    const coreModules = plugins.filter(
        (p) => !premiumKeys.some((pk) => p.toLowerCase().startsWith(pk))
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
 * Affiche le toast de démarrage.
 * Respecte la config `debug.showBootInfo` (défaut: true en dev, false en prod).
 *
 * @param {object} GeoLeaf - Le namespace global GeoLeaf
 * @param {object} [options]
 * @param {boolean} [options.force=false] - Forcer l'affichage même si désactivé en config
 * @param {number} [options.duration=4000] - Durée d'affichage en ms
 */
export function showBootInfo(GeoLeaf, options = {}) {
    if (!GeoLeaf) return;

    // Vérification config — désactivable via profil JSON : "debug": { "showBootInfo": false }
    if (!options.force) {
        try {
            const showFlag = GeoLeaf.Config?.get?.("debug.showBootInfo");
            // Si explicitement désactivé, ne pas afficher
            if (showFlag === false) return;
        } catch (_) {
            /* Config non disponible — afficher quand même */
        }
    }

    const { title, message } = _buildBootMessage(GeoLeaf);

    // Log only — toast désactivé (dev info uniquement)
    console.info(`[GeoLeaf] ${title} | ${message}`);
}

/**
 * API publique exposée sur GeoLeaf.bootInfo
 */
export const BootInfo = {
    show: showBootInfo,
    detectPlugins: _detectLoadedPlugins,
    buildMessage: _buildBootMessage,
};
