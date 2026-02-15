/**
 * GeoLeaf - Barrel File (Index)
 * Exporte tous les modules publics GeoLeaf
 *
 * @version 2.0.0
 * @description Point d'entrée centralisé pour l'import de tous les modules GeoLeaf
 *
 * Usage (ES6):
 *   import GeoLeaf from './src/static/js/index.js';
 *
 * Usage (UMD/Browser):
 *   Les modules sont automatiquement attachés à window.GeoLeaf via main.js
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf || {};

    /**
     * Liste des modules publics exposés par GeoLeaf
     */
    const PUBLIC_MODULES = [
        // Core modules
        'Log',
        'Security',
        'Constants',
        'Utils',
        'Core',
        'Helpers',
        'Errors',

        // Configuration
        'Config',

        // UI modules
        'UI',

        // Data modules
        'POI',
        'GeoJSON',
        'Filters',
        'BaseLayers',
        'Route',
        'Themes',

        // Display modules
        'Legend',
        'Table',

        // Public API
        'API'
    ];

    /**
     * Liste des sous-modules internes (_prefixés)
     */
    const INTERNAL_MODULES = [
        // Config sub-modules
        '_ConfigLoader',
        '_ConfigStorage',
        '_ConfigNormalization',
        '_ConfigTaxonomy',
        '_ConfigProfile',
        '_ConfigDataConverter',

        // UI sub-modules
        '_UITheme',
        '_UIControls',
        '_UIPanelBuilder',
        '_UIDomUtils',
        '_UICoordinatesDisplay',
        '_UIBranding',
        '_UIContentBuilder',

        // UI Filter Panel sub-modules
        '_UIFilterPanelShared',
        '_UIFilterPanelStateReader',
        '_UIFilterPanelApplier',
        '_UIFilterPanelRenderer',
        '_UIFilterPanelProximity',
        '_UIFilterPanelCore',

        // POI sub-modules
        '_POIShared',
        '_POINormalizers',
        '_POIPopup',
        '_POIMarkers',
        '_POIRenderers',
        '_POISidePanel',
        '_POICore',

        // GeoJSON sub-modules
        '_GeoJSONShared',
        '_GeoJSONStyleResolver',
        '_LayerVisibilityManager',
        '_GeoJSONLayerManager',
        '_GeoJSONPopupTooltip',
        '_GeoJSONClustering',
        '_GeoJSONLoader',
        '_GeoJSONCore',

        // Route sub-modules
        '_RouteStyleResolver',
        '_RoutePopupBuilder',
        '_RouteLoaders',
        '_RouteLayerManager',

        // Table sub-modules
        '_TablePanel',
        '_TableRenderer'
    ];

    /**
     * Vérifie que tous les modules publics sont chargés
     * @returns {Object} Statut des modules
     */
    GeoLeaf.checkModules = function () {
        const status = {
            loaded: [],
            missing: [],
            internal: []
        };

        PUBLIC_MODULES.forEach(name => {
            if (GeoLeaf[name]) {
                status.loaded.push(name);
            } else {
                status.missing.push(name);
            }
        });

        INTERNAL_MODULES.forEach(name => {
            if (GeoLeaf[name]) {
                status.internal.push(name);
            }
        });

        return status;
    };

    /**
     * Version de la bibliothèque
     */
    GeoLeaf.VERSION = '2.0.0';

    /**
     * Liste des modules publics disponibles
     */
    GeoLeaf.MODULES = PUBLIC_MODULES;

    // Export global
    global.GeoLeaf = GeoLeaf;

    // Support CommonJS / Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GeoLeaf;
    }

})(typeof window !== "undefined" ? window : global);
