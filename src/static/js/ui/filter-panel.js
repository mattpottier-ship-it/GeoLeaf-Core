/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Filter Panel (Aggregator)
 *
 * Ce fichier est un agrégateur pour la rétrocompatibilité.
 * La logique a été déplacée dans les sous-modules :
 * - filter-panel/shared.js       : Helpers de données partagés
 * - filter-panel/state-reader.js : Lecture de l'état des filtres
 * - filter-panel/applier.js      : Application des filtres
 * - filter-panel/renderer.js     : Construction du panneau HTML
 * - filter-panel/proximity.js    : Gestion des filtres de proximité
 * - filter-panel/core.js         : API publique et délégation
 *
 * @module ui/filter-panel
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Vérifier que les sous-modules sont chargés
    const requiredModules = [
        '_UIFilterPanelShared',
        '_UIFilterPanelStateReader',
        '_UIFilterPanelApplier',
        '_UIFilterPanelRenderer',
        '_UIFilterPanelProximity',
        '_UIFilterPanel'
    ];

    const missingModules = requiredModules.filter(m => !GeoLeaf[m]);

    if (missingModules.length > 0) {
        const Log = GeoLeaf.Log || console;
        Log.error("[GeoLeaf.UI.FilterPanel] Sous-modules manquants:", missingModules.join(', '));
        Log.error("[GeoLeaf.UI.FilterPanel] Assurez-vous de charger les modules filter-panel/*.js avant filter-panel.js");
    }

    // L'API publique est exposée via GeoLeaf._UIFilterPanel (dans core.js)
    // Ce fichier sert uniquement de point de validation

})(window);
