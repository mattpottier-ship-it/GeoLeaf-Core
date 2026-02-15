/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf GeoJSON Module - Aggregator (Legacy Entry Point)
 *
 * Ce fichier est conservé pour la rétrocompatibilité.
 * Le code a été scindé en sous-modules dans geojson/:
 * - shared.js        : État partagé, constantes
 * - style-resolver.js: Évaluation styleRules
 * - layer-manager.js : Gestion couches
 * - loader.js        : Chargement données
 * - popup-tooltip.js : Popups et tooltips
 * - clustering.js    : Stratégies de clustering
 * - core.js          : Module principal (agrégateur)
 *
 * @module geoleaf.geojson
 * @deprecated Charger les sous-modules via demo/index.html
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log || console;

    // Vérifier si les sous-modules sont chargés
    if (GeoLeaf._GeoJSONShared && GeoLeaf.GeoJSON) {
        Log.debug("[GeoLeaf.GeoJSON] Sous-modules déjà chargés, agrégateur legacy ignoré.");
        return;
    }

    // Si les sous-modules ne sont pas chargés, afficher un avertissement
    Log.warn("[GeoLeaf.GeoJSON] Les sous-modules geojson/*.js ne sont pas chargés. " +
             "Veuillez mettre à jour demo/index.html pour charger les nouveaux modules.");

    // Créer un module stub qui affiche des erreurs utiles
    if (!GeoLeaf.GeoJSON) {
        GeoLeaf.GeoJSON = {
            init() {
                Log.error("[GeoLeaf.GeoJSON] Module non initialisé. " +
                          "Chargez les sous-modules geojson/*.js avant d'appeler init().");
                return null;
            },
            loadUrl() {
                Log.error("[GeoLeaf.GeoJSON] Module non initialisé.");
                return Promise.resolve(null);
            },
            loadFromActiveProfile() {
                Log.error("[GeoLeaf.GeoJSON] Module non initialisé.");
                return Promise.resolve([]);
            },
            addData() {
                Log.error("[GeoLeaf.GeoJSON] Module non initialisé.");
            },
            getLayer() { return null; },
            getAllLayers() { return []; },
            getFeatures() { return []; },
            filterFeatures() { return { filtered: 0, total: 0, visible: 0 }; },
            clear() {}
        };
    }

})(window);
