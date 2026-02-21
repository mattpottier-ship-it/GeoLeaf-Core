/*!
 * GeoLeaf Core – App / Boot
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Application Boot
 * Chargement de la configuration et lancement de l'initialisation.
 * Expose l'API publique GeoLeaf.boot().
 *
 * Usage : <script>GeoLeaf.boot();</script>
 *
 * @module app/boot
 */
import { _g } from "../modules/globals.js";

const GeoLeaf = _g.GeoLeaf;
const _app = (GeoLeaf._app = GeoLeaf._app || {});

// ============================================================
// Fonction startApp : chargement config + lancement initApp
// ============================================================
_app.startApp = async function () {
    const AppLog = _app.AppLog;

    if (!GeoLeaf) {
        AppLog.error(
            "GeoLeaf global introuvable. Le bundle core doit être chargé avant GeoLeaf.boot()."
        );
        return;
    }

    if (typeof GeoLeaf.loadConfig !== "function") {
        AppLog.error(
            "GeoLeaf.loadConfig() est introuvable. Vérifiez que le bundle core est complet."
        );
        return;
    }

    AppLog.info("Démarrage de l'application...");

    // Écouter l'événement de fin d'initialisation pour afficher le boot toast
    // (après que l'UI soit prête — sinon GeoLeaf.UI.notify n'existe pas encore)
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
            AppLog.log("Profil sélectionné depuis sessionStorage:", selectedProfile);
        } else if (rawProfile) {
            AppLog.warn(
                "Profil sessionStorage rejeté (format invalide):",
                rawProfile.substring(0, 20)
            );
        }
        sessionStorage.removeItem("gl-selected-profile");
    } catch (e) {
        AppLog.warn("Impossible de lire sessionStorage:", e);
    }

    const profilesPath = _app.getProfilesBasePath();

    // perf 5.4 : wrapper loadConfig (callback) en Promise pour pouvoir chaîner
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
        AppLog.log("Configuration chargée via GeoLeaf.loadConfig :", cfg || {});
    } catch (err) {
        AppLog.error("Erreur chargement config via GeoLeaf.loadConfig :", err);
        return;
    }

    if (GeoLeaf.Config && typeof GeoLeaf.Config.getCategories === "function") {
        try {
            GeoLeaf.Config.getCategories();
        } catch (e) {
            AppLog.warn("Erreur lors de la lecture du mapping catégories :", e);
        }
    }

    const baseCfg = cfg || {};

    if (GeoLeaf.Config && typeof GeoLeaf.Config.loadActiveProfileResources === "function") {
        try {
            const profileCfg = await GeoLeaf.Config.loadActiveProfileResources();
            AppLog.info("Ressources du profil actif chargées.");
            _app.initApp(profileCfg || baseCfg);
        } catch (err) {
            AppLog.warn("Erreur lors du chargement des ressources de profil :", err);
            _app.initApp(baseCfg);
        }
    } else {
        _app.initApp(baseCfg);
    }
};

// ============================================================
// Exposer GeoLeaf.boot() — API publique
// ============================================================

/**
 * Démarre l'application GeoLeaf.
 * Charge la configuration, initialise la carte et tous les modules.
 * Les plugins optionnels (Storage, AddPOI) doivent être chargés avant cet appel.
 *
 * @example
 * <script src="dist/geoleaf.umd.js"></script>
 * <script src="dist/geoleaf-storage.plugin.js"></script>  <!-- optionnel -->
 * <script src="dist/geoleaf-addpoi.plugin.js"></script>   <!-- optionnel -->
 * <script>GeoLeaf.boot();</script>
 */
GeoLeaf.boot = function () {
    // Rapport plugins premium — silencieux si aucun chargé (core seul)
    GeoLeaf.plugins?.reportPremiumPlugins?.();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", _app.startApp);
    } else {
        _app.startApp();
    }
};

export { _app };
