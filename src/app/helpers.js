/*!
 * GeoLeaf Core – App / Helpers
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Application Helpers
 * Système de logs production, détection de chemin, vérification des plugins,
 * et helper de notification.
 *
 * Ce fichier crée le namespace partagé GeoLeaf._app utilisé par
 * app/init.js et app/boot.js.
 *
 * @module app/helpers
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    /**
     * Namespace interne pour le module Application Bootstrap.
     * Partagé entre app/helpers.js, app/init.js et app/boot.js.
     * @namespace GeoLeaf._app
     * @private
     */
    const _app = GeoLeaf._app = GeoLeaf._app || {};

    // ============================================================
    // Système de logs production
    // ============================================================
    _app.AppLog = {
        log(...args) {
            if (location.search.includes('debug=true')) {
                console.log('[GeoLeaf]', ...args);
            }
        },
        info(...args) {
            console.info('[GeoLeaf]', ...args);
        },
        error(...args) {
            console.error('[GeoLeaf]', ...args);
        },
        warn(...args) {
            console.warn('[GeoLeaf]', ...args);
        }
    };

    // ============================================================
    // Détection automatique du chemin vers profiles/
    // ============================================================
    /**
     * Détecte automatiquement le chemin de base vers le dossier profiles/
     * en fonction de l'URL courante.
     * @returns {string} Chemin relatif vers profiles/
     */
    _app.getProfilesBasePath = function () {
        const currentPath = global.location.pathname;
        if (currentPath.includes('/demo/')) {
            return '../profiles/';
        }
        return './profiles/';
    };

    // ============================================================
    // Vérification des plugins au boot
    // ============================================================
    /**
     * Vérifie que les plugins requis par la configuration sont bien chargés
     * et affiche des avertissements dans la console si ce n'est pas le cas.
     * @param {Object} cfg - Configuration du profil actif
     */
    _app.checkPlugins = function (cfg) {
        const AppLog = _app.AppLog;

        // Avertissement si config attend AddPOI mais plugin non chargé
        if (cfg && cfg.ui && cfg.ui.showAddPoi === true) {
            if (!GeoLeaf.POI || !GeoLeaf.POI.AddForm) {
                AppLog.warn(
                    '⚠️ Config has showAddPoi=true but AddPOI plugin is not loaded. ' +
                    'Load geoleaf-addpoi.plugin.js before calling GeoLeaf.boot().'
                );
            }
        }

        // Avertissement si config attend Storage mais plugin non chargé
        if (cfg && cfg.storage) {
            if (!GeoLeaf.Storage) {
                AppLog.warn(
                    '⚠️ Config references storage but Storage plugin is not loaded. ' +
                    'Load geoleaf-storage.plugin.js before calling GeoLeaf.boot().'
                );
            }

            // Avertissement si enableServiceWorker mais sw-register absent
            if (cfg.storage.enableServiceWorker && !GeoLeaf._SWRegister) {
                AppLog.warn(
                    '⚠️ Config has enableServiceWorker=true but SW Register module is not available. ' +
                    'Ensure sw-register.js is included in the Storage plugin bundle.'
                );
            }
        }

        // Avertissement si SyncHandler est chargé sans Storage
        if (GeoLeaf.POI && GeoLeaf.POI.SyncHandler && !GeoLeaf.Storage) {
            AppLog.warn(
                '⚠️ SyncHandler loaded without Storage plugin — sync operations will be disabled. ' +
                'POI add/edit/delete will work in online-only mode.'
            );
        }
    };

    // ============================================================
    // Helper : afficher une notification
    // ============================================================
    /**
     * Affiche une notification via le système UI de GeoLeaf.
     * Tente d'abord GeoLeaf.UI.Notifications, puis GeoLeaf._UINotifications.
     * @param {string} message - Message à afficher
     * @param {number} [duration=3500] - Durée d'affichage en millisecondes
     * @returns {boolean} true si la notification a été affichée
     */
    _app.showNotification = function (message, duration) {
        duration = duration || 3500;
        if (GeoLeaf.UI && GeoLeaf.UI.Notifications && typeof GeoLeaf.UI.Notifications.success === "function") {
            try { GeoLeaf.UI.Notifications.success(message, duration); return true; } catch (e) {}
        }
        if (GeoLeaf._UINotifications && typeof GeoLeaf._UINotifications.success === "function") {
            try { GeoLeaf._UINotifications.success(message, duration); return true; } catch (e) {}
        }
        _app.AppLog.log(message + " (notifications indisponibles)");
        return false;
    };

})(window);
