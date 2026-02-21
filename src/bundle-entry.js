/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Bundle Entry Point
 * Point d'entrée pour la génération du bundle UMD via Rollup
 *
 * Ce fichier charge tous les modules GeoLeaf dans l'ordre correct des dépendances.
 * Chaque module est un IIFE qui attache ses exports sur window.GeoLeaf.
 *
 * @version 3.1.0
 */

// Import des modules dans l'ordre des dépendances (identique à main.js ligne par ligne)

// Modules utilitaires (doivent être chargés en premier)
import './static/js/geoleaf.log.js';
import './static/js/geoleaf.log.config.js';
import './static/js/geoleaf.security.js';
import './static/js/geoleaf.constants.js';
import './static/js/geoleaf.utils.js';
import './static/js/utils/dom-security.js';
import './static/js/utils/dom-helpers.js';
import './static/js/utils/event-listener-manager.js';
import './static/js/utils/timer-manager.js';
import './static/js/utils/scale-utils.js';

// Helpers
import './static/js/helpers/style-resolver.js';

// Validators
import './static/js/validators/style-validator-rules.js';
import './static/js/validators/style-validator.js';

// Modules principaux
import './static/js/geoleaf.core.js';

// UI - Sous-modules
import './static/js/ui/theme.js';
import './static/js/ui/controls.js';
import './static/js/ui/panel-builder.js';
import './static/js/ui/dom-utils.js';
import './static/js/ui/coordinates-display.js';
import './static/js/ui/branding.js';

// UI - Content Builder
import './static/js/ui/content-builder/core.js';
import './static/js/ui/content-builder/templates.js';
import './static/js/ui/content-builder/assemblers.js';
import './static/js/ui/content-builder.js';
import './static/js/ui/components.js';
import './static/js/ui/notifications.js';

// UI - Sprint 4.4
import './static/js/ui/event-delegation.js';
import './static/js/ui/filter-state-manager.js';

// Map
import './static/js/map/scale-control.js';

// UI - Filter Control Builder
import './static/js/ui/filter-control-builder.js';

// UI - Filter Panel
import './static/js/ui/filter-panel/shared.js';
import './static/js/ui/filter-panel/state-reader.js';
import './static/js/ui/filter-panel/lazy-loader.js';
import './static/js/ui/filter-panel/applier.js';
import './static/js/ui/filter-panel/renderer.js';
import './static/js/ui/filter-panel/proximity.js';
import './static/js/ui/filter-panel/core.js';
import './static/js/ui/filter-panel.js';

// Main UI
import './static/js/geoleaf.ui.js';

// Data
import './static/js/data/normalizer.js';

// Loaders
import './static/js/loaders/style-loader.js';

// Config - Sous-modules
import './static/js/config/loader.js';
import './static/js/config/storage.js';
import './static/js/config/normalization.js';
import './static/js/config/taxonomy.js';
import './static/js/config/profile-v3-loader.js';
import './static/js/config/profile.js';
import './static/js/config/data-converter.js';
// Config - GeoLeaf.Config (éclaté en 4 sous-modules)
import './static/js/config/geoleaf-config/config-core.js';
import './static/js/config/geoleaf-config/config-validation.js';
import './static/js/config/geoleaf-config/config-loaders.js';
import './static/js/config/geoleaf-config/config-accessors.js';

// Autres modules
import './static/js/geoleaf.baselayers.js';
import './static/js/geoleaf.filters.js';

// POI - Sous-modules
import './static/js/poi/shared.js';
import './static/js/poi/normalizers.js';
import './static/js/poi/popup.js';
import './static/js/poi/markers.js';

// POI Renderers
import './static/js/renderers/abstract-renderer.js';
import './static/js/poi/renderers/field-renderers.js';
import './static/js/poi/renderers/media-renderers.js';
import './static/js/poi/renderers/lightbox-manager.js';
import './static/js/poi/renderers/ui-behaviors.js';
import './static/js/poi/renderers/component-renderers.js';
import './static/js/poi/renderers/section-orchestrator.js';
import './static/js/poi/renderers/links.js';
import './static/js/poi/renderers/core.js';
import './static/js/poi/renderers.js';
import './static/js/poi/sidepanel.js';
import './static/js/poi/core.js';
import './static/js/geoleaf.poi.js';

// POI Sync Handler + Placement Mode → chargés via geoleaf-addpoi.plugin.js (optionnel)

// GeoJSON - Sous-modules
import './static/js/geojson/shared.js';
import './static/js/geojson/style-resolver.js';
import './static/js/geojson/visibility-manager.js';

// GeoJSON Layer Manager (éclaté en 4 sous-modules)
import './static/js/geojson/layer-manager/store.js';
import './static/js/geojson/layer-manager/visibility.js';
import './static/js/geojson/layer-manager/style.js';
import './static/js/geojson/layer-manager/integration.js';
import './static/js/geojson/popup-tooltip.js';
import './static/js/geojson/clustering.js';
import './static/js/geojson/layer-config-manager.js';
import './static/js/geojson/feature-validator.js';
// GeoJSON Loader (éclaté en 4 sous-modules)
import './static/js/geojson/loader/config-helpers.js';
import './static/js/geojson/loader/data.js';
import './static/js/geojson/loader/single-layer.js';
import './static/js/geojson/loader/profile.js';
import './static/js/geojson/core.js';

// Route - Sous-modules
import './static/js/route/style-resolver.js';
import './static/js/route/popup-builder.js';
import './static/js/route/loaders.js';
import './static/js/route/layer-manager.js';
import './static/js/geoleaf.route.js';

// LayerManager - Sous-modules
import './static/js/layer-manager/shared.js';
import './static/js/layer-manager/renderer.js';
import './static/js/layer-manager/cache-section.js';
import './static/js/layer-manager/basemap-selector.js';
import './static/js/layer-manager/style-selector.js';
import './static/js/layer-manager/control.js';
import './static/js/geoleaf.layer-manager.js';

// Legend
import './static/js/legend/legend-generator.js';
import './static/js/legend/legend-renderer.js';
import './static/js/legend/legend-control.js';
import './static/js/geoleaf.legend.js';

// Labels
import './static/js/labels/label-renderer.js';
import './static/js/labels/label-button-manager.js';
import './static/js/labels/labels.js';

// Themes
import './static/js/themes/theme-loader.js';

// Theme Applier (éclaté en 4 sous-modules)
import './static/js/themes/theme-applier/core.js';
import './static/js/themes/theme-applier/visibility.js';
import './static/js/themes/theme-applier/deferred.js';
import './static/js/themes/theme-applier/ui-sync.js';

import './static/js/themes/theme-selector.js';

// Table
import './static/js/table/panel.js';
import './static/js/table/renderer.js';
import './static/js/geoleaf.table.js';

// Storage + Cache Button → chargés via geoleaf-storage.plugin.js (optionnel)

// POI Add Form → chargé via geoleaf-addpoi.plugin.js (optionnel)

// API Controller
import './static/js/api/module-manager.js';
import './static/js/api/initialization-manager.js';
import './static/js/api/namespace-manager.js';
import './static/js/api/factory-manager.js';
import './static/js/api/controller.js';

// API publique - Doit être chargé en dernier
import './static/js/geoleaf.api.js';

// Application bootstrap (éclaté en 3 sous-modules)
import './app/helpers.js';
import './app/init.js';
import './app/boot.js';

// Export du namespace global GeoLeaf
export default (typeof window !== 'undefined' ? window.GeoLeaf : {});
