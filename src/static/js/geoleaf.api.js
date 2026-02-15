/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/*!
 * GeoLeaf – API publique unifiée
 * Point d'entrée pour futurs bundles (CDN / UMD / ESM)
 * Phase 4.3 — Architecture Controller refactorisée robuste
 */
/* global define */
(function (root, factory) {
    "use strict";

    // UMD minimal : AMD, CommonJS, global
    if (typeof define === "function" && define.amd) {
        define([], function () {
            return factory(root);
        });
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory(root);
    } else {
        root.GeoLeaf = factory(root);
    }
}(typeof self !== "undefined" ? self : this, function (root) {
    "use strict";

    // ---------------------------------------------------------------------
    // Architecture Controller - Délégation robuste vers APIController
    // ---------------------------------------------------------------------

    // Récupération de l'éventuel GeoLeaf déjà attaché par les modules
    const existing = root.GeoLeaf || {};

    // Logger unifié (défini par geoleaf.logger-shim.js)
    const Log = existing.Log;

    // Vérification de la disponibilité d'APIController
    const APIController = existing._APIController;

    if (!APIController) {
        Log.error("[GeoLeaf.API] APIController non disponible. Les modules API Controller doivent être chargés avant geoleaf.api.js");
        throw new Error("APIController manquant - vérifiez que les modules API sont chargés");
    }

    // Validation de l'état de l'APIController
    if (!APIController.isInitialized) {
        Log.error("[GeoLeaf.API] APIController en état défaillant. Vérification de l'état :", APIController.getHealthStatus());
        throw new Error("APIController en état défaillant");
    }

    // ---------------------------------------------------------------------
    // API publique déléguée vers APIController
    // ---------------------------------------------------------------------

    /**
     * GeoLeaf.init(options) - Initialisation complète
     * Délègue vers APIController.geoleafInit()
     */
    function geoleafInit(options) {
        try {
            return APIController.geoleafInit(options);
        } catch (error) {
            Log.error("[GeoLeaf.init] Erreur lors de l'initialisation :", error);
            throw error;
        }
    }

    /**
     * GeoLeaf.setTheme(theme) - Application de thème
     * Délègue vers APIController.geoleafSetTheme()
     */
    function geoleafSetTheme(theme) {
        try {
            return APIController.geoleafSetTheme(theme);
        } catch (error) {
            Log.error("[GeoLeaf.setTheme] Erreur lors de l'application du thème :", error);
            throw error;
        }
    }

    /**
     * GeoLeaf.loadConfig(input) - Chargement de configuration
     * Délègue vers APIController.geoleafLoadConfig()
     */
    function geoleafLoadConfig(input) {
        try {
            return APIController.geoleafLoadConfig(input);
        } catch (error) {
            Log.error("[GeoLeaf.loadConfig] Erreur lors du chargement de configuration :", error);
            throw error;
        }
    }

    // ---------------------------------------------------------------------
    // Constantes et utilitaires
    // ---------------------------------------------------------------------

    const CONSTANTS = {
        VERSION: "4.3.0-robust",
        DEFAULT_CENTER: [0, 0],
        DEFAULT_ZOOM: 3,
        THEMES: ["light", "dark", "satellite", "custom"]
    };

    // ---------------------------------------------------------------------
    // Construction de l'API finale
    // ---------------------------------------------------------------------

    const GeoLeaf = Object.assign(existing, {
        // Méthodes principales
        init: geoleafInit,
        setTheme: geoleafSetTheme,
        loadConfig: geoleafLoadConfig,

        // Constantes
        CONSTANTS,

        // Accès aux modules via APIController
        getModule: function(name) {
            return APIController.moduleAccessFn ? APIController.moduleAccessFn(name) : null;
        },

        hasModule: function(name) {
            const module = APIController.moduleAccessFn ? APIController.moduleAccessFn(name) : null;
            return !!module;
        },

        // Accès aux namespaces via APIController
        getNamespace: function(name) {
            return APIController.managers && APIController.managers.namespace ?
                APIController.managers.namespace.get(name) : null;
        },

        // Gestion des instances de cartes via APIController
        createMap: function(id, options) {
            return APIController.geoleafCreateMap ? APIController.geoleafCreateMap(id, options) : null;
        },

        getMap: function(id) {
            return APIController.managers && APIController.managers.factory ?
                APIController.managers.factory.get(id) : null;
        },

        getAllMaps: function() {
            return APIController.managers && APIController.managers.factory ?
                APIController.managers.factory.getAll() : {};
        },

        removeMap: function(id) {
            return APIController.managers && APIController.managers.factory ?
                APIController.managers.factory.remove(id) : false;
        },

        // Métriques et monitoring
        getHealth: function() {
            return APIController.getHealthStatus ? APIController.getHealthStatus() : null;
        },

        getMetrics: function() {
            return APIController.getHealthStatus ? APIController.getHealthStatus() : null;
        },

        // Accès interne pour modules (ne pas utiliser publiquement)
        _APIController: APIController
    });

    // Log de l'initialisation réussie
    if (Log) {
        Log.info(`[GeoLeaf.API] API publique v${CONSTANTS.VERSION} initialisée avec succès`);
        Log.info(`[GeoLeaf.API] Santé APIController :`, APIController.getHealthStatus());
    }

    return GeoLeaf;
}));
