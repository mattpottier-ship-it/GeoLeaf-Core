/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Bundle Entry Point — Phase 7 UMD Build
 * Point d'entrée pour la génération du bundle UMD via Rollup.
 *
 * Ce fichier est le point d'entrée EXCLUSIF pour les builds UMD (umdConfig, umdMinConfig).
 * Il ne doit PAS contenir de named ESM exports — ceux-ci sont dans bundle-esm-entry.js.
 *
 * Responsabilités :
 *   - Bootstrap applicatif (T12 : src/app/)
 *   - Module loader pour code splitting lazy
 *   - globals.js en DERNIER (side-effects window.GeoLeaf.* après tous les modules)
 *
 * @version 4.0.0
 * @see src/bundle-esm-entry.js pour les named exports ESM
 */

// ── T12: Application bootstrap (ESM) ──
// Ces modules importent directement leurs dépendances via ESM (Pattern A pur).
import "./app/helpers.js";
import "./app/init.js";
import "./app/boot.js";

// ── Sprint 6 / Phase 7: Module loader pour code splitting ──
// En mode ESM, ces import() produisent des chunks séparés dans dist/chunks/.
// En mode UMD, Rollup les inline (bundle unique, compatible backward).
const _gl = typeof globalThis !== "undefined" ? globalThis : window;
_gl.GeoLeaf = _gl.GeoLeaf || {};

/**
 * Table des resolvers lazy — Map extensible des modules GeoLeaf.
 * Remplace le switch-case statique (C8).
 * En mode UMD le code est déjà inliné → résolution immédiate.
 * En mode ESM → chunk réseau séparé.
 */
const _lazyModuleResolvers = new Map([
    // POI : chargement complet (core → renderers + extras en parallèle)
    [
        "poi",
        async () => {
            await import("./lazy/poi-core.js");
            await Promise.all([import("./lazy/poi-renderers.js"), import("./lazy/poi-extras.js")]);
        },
    ],
    // POI sub-chunks (chargement granulaire)
    ["poiCore", () => import("./lazy/poi-core.js")],
    ["poiRenderers", () => import("./lazy/poi-renderers.js")],
    ["poiExtras", () => import("./lazy/poi-extras.js")],
    ["basemapSelector", () => import("./lazy/basemap-selector.js")],
    ["route", () => import("./lazy/route.js")],
    ["layerManager", () => import("./lazy/layer-manager.js")],
    ["legend", () => import("./lazy/legend.js")],
    ["labels", () => import("./lazy/labels.js")],
    ["themes", () => import("./lazy/themes.js")],
    ["table", () => import("./lazy/table.js")],
]);

// Enregistrer les resolvers dans PluginRegistry (après globals.js via ESM hoisting)
if (_gl.GeoLeaf.plugins?.registerLazy) {
    for (const [name, resolver] of _lazyModuleResolvers) {
        _gl.GeoLeaf.plugins.registerLazy(name, resolver);
    }
}

/**
 * Charge un module secondaire à la demande.
 * @param {string} moduleName - Nom du module ('poi','route','table','legend','layerManager','labels','themes')
 * @returns {Promise<void>}
 */
_gl.GeoLeaf._loadModule = async function (moduleName) {
    const resolver = _lazyModuleResolvers.get(moduleName);
    if (!resolver) {
        console.warn(
            `[GeoLeaf] Module inconnu : "${moduleName}". Disponibles : ${[..._lazyModuleResolvers.keys()].join(", ")}`
        );
        return;
    }
    try {
        await resolver();
        _gl.GeoLeaf.plugins?.register(moduleName, { version: _gl.GeoLeaf._version });
    } catch (err) {
        console.error(`[GeoLeaf] Erreur lors du chargement du module "${moduleName}" :`, err);
        throw err;
    }
};

/**
 * Charge tous les modules secondaires en parallèle.
 * Appelé par init.js pour pré-charger avant l'initialisation.
 * @returns {Promise<void>}
 */
_gl.GeoLeaf._loadAllSecondaryModules = async function () {
    // POI core en premier (poi-renderers/extras/add-form en dépendent)
    await import("./lazy/poi-core.js");
    await Promise.all([
        import("./lazy/poi-renderers.js"),
        import("./lazy/poi-extras.js"),
        import("./lazy/route.js"),
        import("./lazy/layer-manager.js"),
        import("./lazy/legend.js"),
        import("./lazy/labels.js"),
        import("./lazy/themes.js"),
        import("./lazy/table.js"),
    ]);
};

// Point unique compat UMD/CDN — DERNIER import (side-effects window.GeoLeaf.*)
// globals.js importe tous les modules T0–T11 et les assigne sur _g.GeoLeaf.
import "./modules/globals.js";
// geoleaf.api.js — façade ESM (named exports uniquement).
// ⚠️ UMD : les méthodes publiques (loadConfig, init, setTheme, etc.) sont
//    assignées directement dans globals.api.js (fin de fichier) pour éviter
//    l'élimination par le DCE de Rollup (Object.assign sur objet dérivé de globalThis).
import "./modules/geoleaf.api.js";

// Export du namespace global GeoLeaf tel qu'assemblé par globals.js
// ⚠️ Ce `export default` est le SEUL export — PAS de named exports ici.
//    Ainsi le bundle UMD assigne window.GeoLeaf = l'objet GeoLeaf existant (pas un wrapper).
export default typeof window !== "undefined" ? window.GeoLeaf : {};
