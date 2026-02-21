/**
 * GeoLeaf – API publique unifiée (assemblage)
 * Phase 4.3 — Architecture Controller refactorisée robuste
 *
 * Construit l'objet GeoLeafAPI en déléguant vers APIController.
 * Ce module est chargé après globals.api.js (qui initialise _APIController).
 *
 * @module api/geoleaf-api
 */
"use strict";

import { Log } from "../log/index.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
_g.GeoLeaf = _g.GeoLeaf || {};

// Récupération de l'éventuel GeoLeaf déjà attaché par les modules
const existing = _g.GeoLeaf || {};

// ⚠️ Les vérifications d'APIController sont déplacées dans chaque fonction (accès lazy).
// Les throws au niveau module (avant Object.assign) empêchaient Rollup d'inclure l'API publique :
// avec propertyReadSideEffects:false, Rollup analysait statiquement APIController = undefined
// et concluait que le throw était inévitable → tout le code suivant = dead code éliminé.
//
// La validation s'effectue maintenant à l'exécution, dans _getAPIController().

// Accès lazy et validé à l'APIController (appelé dans chaque méthode publique)
function _getAPIController() {
    const ctrl = existing._APIController;
    if (!ctrl) {
        if (Log)
            Log.error(
                "[GeoLeaf.API] APIController non disponible. Les modules API Controller doivent être chargés avant geoleaf.api.js"
            );
        throw new Error("APIController manquant - vérifiez que les modules API sont chargés");
    }
    if (!ctrl.isInitialized) {
        if (Log)
            Log.error(
                "[GeoLeaf.API] APIController en état défaillant. Vérification de l'état :",
                ctrl.getHealthStatus()
            );
        throw new Error("APIController en état défaillant");
    }
    return ctrl;
}

// ---------------------------------------------------------------------
// API publique déléguée vers APIController
// ---------------------------------------------------------------------

function geoleafInit(options) {
    try {
        return _getAPIController().geoleafInit(options);
    } catch (error) {
        if (Log) Log.error("[GeoLeaf.init] Erreur lors de l'initialisation :", error);
        throw error;
    }
}

function geoleafSetTheme(theme) {
    try {
        return _getAPIController().geoleafSetTheme(theme);
    } catch (error) {
        if (Log) Log.error("[GeoLeaf.setTheme] Erreur lors de l'application du thème :", error);
        throw error;
    }
}

function geoleafLoadConfig(input) {
    if (
        input === null ||
        input === undefined ||
        (typeof input !== "string" && typeof input !== "object")
    ) {
        throw new TypeError(
            `[GeoLeaf.loadConfig] Invalid input: expected string URL or config object, got ${typeof input}`
        );
    }
    try {
        return _getAPIController().geoleafLoadConfig(input);
    } catch (error) {
        if (Log)
            Log.error("[GeoLeaf.loadConfig] Erreur lors du chargement de configuration :", error);
        throw error;
    }
}

// ---------------------------------------------------------------------
// Construction de l'API finale (mutation de l'objet global GeoLeaf)
// ---------------------------------------------------------------------

const GeoLeafAPI = Object.assign(existing, {
    // Méthodes principales
    init: geoleafInit,
    setTheme: geoleafSetTheme,
    loadConfig: geoleafLoadConfig,

    // Constantes (source unique : constants/index.js)
    CONSTANTS: _g.GeoLeaf.CONSTANTS || {},

    // Alias rétrocompat — BaseLayers = Baselayers
    get BaseLayers() {
        return this.Baselayers;
    },

    // Version (lue depuis le manifest ou les constantes)
    version: (_g.GeoLeaf.CONSTANTS && _g.GeoLeaf.CONSTANTS.VERSION) || "4.0.0",

    // Accès aux modules via APIController
    getModule: function (name) {
        const ctrl = existing._APIController;
        return ctrl && ctrl.moduleAccessFn ? ctrl.moduleAccessFn(name) : null;
    },

    hasModule: function (name) {
        const ctrl = existing._APIController;
        const mod = ctrl && ctrl.moduleAccessFn ? ctrl.moduleAccessFn(name) : null;
        return !!mod;
    },

    // Accès aux namespaces via APIController
    getNamespace: function (name) {
        // eslint-disable-next-line security/detect-object-injection
        return _g.GeoLeaf && name ? _g.GeoLeaf[name] || null : null;
    },

    // Gestion des instances de cartes via APIController
    createMap: function (id, options) {
        const ctrl = existing._APIController;
        return ctrl && ctrl.geoleafCreateMap ? ctrl.geoleafCreateMap(id, options) : null;
    },

    getMap: function (id) {
        const ctrl = existing._APIController;
        return ctrl && ctrl.managers && ctrl.managers.factory
            ? ctrl.managers.factory.getMapInstance(id)
            : null;
    },

    getAllMaps: function () {
        const ctrl = existing._APIController;
        return ctrl && ctrl.managers && ctrl.managers.factory
            ? ctrl.managers.factory.getAllMapInstances()
            : [];
    },

    removeMap: function (id) {
        const ctrl = existing._APIController;
        if (
            ctrl &&
            ctrl.managers &&
            ctrl.managers.factory &&
            typeof ctrl.managers.factory.removeMapInstance === "function"
        ) {
            return ctrl.managers.factory.removeMapInstance(id);
        }
        return false;
    },

    // Métriques et monitoring
    getHealth: function () {
        const ctrl = existing._APIController;
        return ctrl && ctrl.getHealthStatus ? ctrl.getHealthStatus() : null;
    },

    // Phase 4 dedup: getMetrics was identical to getHealth — now delegates
    getMetrics: function () {
        return this.getHealth();
    },
});

if (Log) {
    Log.info(`[GeoLeaf.API] API publique initialisée avec succès`);
    const _ctrl = existing._APIController;
    if (_ctrl) Log.info(`[GeoLeaf.API] Santé APIController :`, _ctrl.getHealthStatus());
}

export { GeoLeafAPI };
