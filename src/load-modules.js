/**
 * @deprecated Remplacé par dist/geoleaf.umd.js (bundle Rollup). Utilise document.write() synchrone — à ne plus utiliser.
 * Conservé temporairement comme référence. À supprimer après validation complète.
 *
 * GeoLeaf Module Loader - XHR Synchronous
 * Charge tous les modules GeoLeaf de manière véritablement synchrone
 * Ce fichier doit être chargé AVANT geoleaf.app.js
 */
(function() {
    "use strict";

    const basePath = '../src/static/js/';
    const modules = [
        // Core utilities (MUST BE FIRST)
        'geoleaf.log.js',
        'geoleaf.log.config.js',
        'geoleaf.security.js',
        'geoleaf.constants.js',
        'geoleaf.utils.js',
        'utils/dom-security.js',
        'utils/dom-helpers.js',
        'utils/event-listener-manager.js',
        'utils/timer-manager.js',

        // Helpers
        'helpers/style-resolver.js',

        // Validators
        'validators/style-validator-rules.js',
        'validators/style-validator.js',

        // Core
        'geoleaf.core.js',

        // UI modules
        'ui/theme.js',
        'ui/controls.js',
        'ui/panel-builder.js',
        'ui/dom-utils.js',
        'ui/coordinates-display.js',
        'ui/branding.js',
        'ui/content-builder/core.js',
        'ui/content-builder/renderers-shared.js',
        'ui/content-builder/assemblers.js',
        'ui/content-builder/helpers.js',
        'ui/content-builder/templates.js',
        'ui/content-builder.js',
        'ui/loading-screen.js',
        'ui/notifications.js',
        'ui/filter-control-builder.js',

        // Filter Panel modules
        'ui/filter-panel/shared.js',
        'ui/filter-panel/state-reader.js',
        'ui/filter-panel/applier.js',
        'ui/filter-panel/lazy-loader.js',
        'ui/filter-panel/renderer.js',
        'ui/filter-panel/proximity.js',
        'ui/filter-panel/core.js',
        'ui/filter-panel.js',

        // Main UI
        'geoleaf.ui.js',

        // GeoJSON modules MUST BE LOADED BEFORE CONFIG (because config needs Loader)
        'geojson/shared.js',
        'geojson/style-resolver.js',
        'geojson/visibility-manager.js',
        'geojson/layer-manager.js',
        'geojson/popup-tooltip.js',
        'geojson/clustering.js',
        'geojson/layer-config-manager.js',
        'geojson/feature-validator.js',
        'geojson/loader.js',
        'geojson/core.js',
        'geoleaf.geojson.js',

        // Config modules (NOW after GeoJSON)
        'config/normalization.js',
        'config/taxonomy.js',
        'config/profile-v3-loader.js',
        'config/profile.js',
        'config/data-converter.js',
        'geoleaf.config.js',

        // Other modules
        'geoleaf.baselayers.js',
        'geoleaf.filters.js',

        // POI modules
        'poi/shared.js',
        'poi/normalizers.js',
        'poi/popup.js',
        'poi/markers.js',
        'renderers/abstract-renderer.js',
        'poi/renderers/field-renderers.js',
        'poi/renderers/media-renderers.js',
        'poi/renderers/lightbox-manager.js',
        'poi/renderers/ui-behaviors.js',
        'poi/renderers/component-renderers.js',
        'poi/renderers/section-orchestrator.js',
        'poi/renderers/links.js',
        'poi/renderers/core.js',
        'poi/renderers.js',
        'poi/sidepanel.js',
        'poi/core.js',
        'geoleaf.poi.js',
        'poi/sync-handler.js',
        'poi/placement-mode.js',

        // Route modules
        'route/style-resolver.js',
        'route/popup-builder.js',
        'route/loaders.js',
        'route/layer-manager.js',
        'geoleaf.route.js',

        // Layer Manager modules
        'layer-manager/shared.js',
        'layer-manager/renderer.js',
        'layer-manager/cache-section.js',
        'layer-manager/basemap-selector.js',
        'layer-manager/style-selector.js',
        'layer-manager/control.js',
        'geoleaf.layer-manager.js',

        // Legend modules
        'legend/legend-generator.js',
        'legend/legend-renderer.js',
        'legend/legend-control.js',
        'geoleaf.legend.js',

        // Labels
        'labels/label-renderer.js',
        'labels/label-button-manager.js',
        'labels/labels.js',

        // Themes
        'themes/theme-loader.js',
        'themes/theme-applier.js',
        'themes/theme-selector.js',

        // Table
        'table/panel.js',
        'table/renderer.js',
        'geoleaf.table.js',

        // Storage
        'storage/storage-helper.js',
        'storage/indexeddb.js',
        'storage/db/layers.js',
        'storage/db/preferences.js',
        'storage/db/sync.js',
        'storage/db/backups.js',
        'storage/db/images.js',
        'storage/offline-detector.js',
        'storage/cache/storage.js',
        'storage/cache/calculator.js',
        'storage/cache/validator.js',
        'storage/cache/metrics.js',
        'storage/cache/resource-enumerator.js',
        'storage/cache/progress-tracker.js',
        'storage/cache/retry-handler.js',
        'storage/cache/fetch-manager.js',
        'storage/cache/download-handler.js',
        'storage/cache/layer-selector.js',
        'storage/cache/downloader.js',
        'storage/cache-manager.js',
        'storage/sync-manager.js',
        'storage/cache-control.js',
        'geoleaf.storage.js',

        // UI Cache Button
        'ui/cache-button/button-control.js',
        'ui/cache-button/modal-manager.js',
        'ui/cache-button/export-logic.js',
        'ui/cache-button.js',

        // POI Add Form
        'poi/add-form/renderers/modal-renderer.js',
        'poi/add-form/renderers/sections-renderer.js',
        'poi/add-form/renderers/fields-renderer.js',
        'poi/add-form/renderers/images-renderer.js',
        'poi/add-form/state-manager.js',
        'poi/add-form/data-mapper.js',
        'poi/add-form/validator.js',
        'poi/add-form/fields-manager.js',
        'poi/add-form/renderer.js',
        'poi/add-form/submit-handler.js',
        'poi/add-form/realtime-validator.js',
        'poi/add-form/lazy-loader.js',
        'poi/add-form-orchestrator.js',

        // API (MUST BE LAST - before app boots)
        'api/module-manager.js',
        'api/initialization-manager.js',
        'api/namespace-manager.js',
        'api/factory-manager.js',
        'api/controller.js',
        'geoleaf.api.js'  // THIS MUST BE LAST
    ];

    // Load modules using document.write() for truly synchronous loading
    // This blocks HTML parsing until all modules are loaded, ensuring proper order
    modules.forEach(function(module) {
        document.write('<script src="' + basePath + module + '"><\/script>');
    });
})();
