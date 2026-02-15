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
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const _app = GeoLeaf._app = GeoLeaf._app || {};

    // ============================================================
    // Fonction startApp : chargement config + lancement initApp
    // ============================================================
    _app.startApp = function () {
        const AppLog = _app.AppLog;

        if (!GeoLeaf) {
            AppLog.error("GeoLeaf global introuvable. Le bundle core doit être chargé avant GeoLeaf.boot().");
            return;
        }

        if (typeof GeoLeaf.loadConfig !== "function") {
            AppLog.error("GeoLeaf.loadConfig() est introuvable. Vérifiez que le bundle core est complet.");
            return;
        }

        AppLog.info("Démarrage de l'application...");

        let selectedProfile = null;
        try {
            selectedProfile = sessionStorage.getItem('gl-selected-profile');
            if (selectedProfile) {
                AppLog.log('Profil sélectionné depuis sessionStorage:', selectedProfile);
                sessionStorage.removeItem('gl-selected-profile');
            }
        } catch (e) {
            AppLog.warn('Impossible de lire sessionStorage:', e);
        }

        const profilesPath = _app.getProfilesBasePath();

        GeoLeaf.loadConfig({
            url: profilesPath + "geoleaf.config.json",
            profileId: selectedProfile,
            autoEvent: true,

            onLoaded: function (cfg) {
                AppLog.log("Configuration chargée via GeoLeaf.loadConfig :", cfg || {});

                if (GeoLeaf.Config && typeof GeoLeaf.Config.getCategories === "function") {
                    try { GeoLeaf.Config.getCategories(); } catch (e) {
                        AppLog.warn("Erreur lors de la lecture du mapping catégories :", e);
                    }
                }

                const baseCfg = cfg || {};

                if (GeoLeaf.Config && typeof GeoLeaf.Config.loadActiveProfileResources === "function") {
                    GeoLeaf.Config.loadActiveProfileResources()
                        .then(function (profileCfg) {
                            AppLog.info("Ressources du profil actif chargées.");
                            _app.initApp(profileCfg || baseCfg);
                        })
                        .catch(function (err) {
                            AppLog.warn("Erreur lors du chargement des ressources de profil :", err);
                            _app.initApp(baseCfg);
                        });
                } else {
                    _app.initApp(baseCfg);
                }
            },

            onError: function (err) {
                AppLog.error("Erreur chargement config via GeoLeaf.loadConfig :", err);
            }
        });
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
    GeoLeaf.boot = function() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', _app.startApp);
        } else {
            _app.startApp();
        }
    };

})(window);
