/**
 * GeoLeaf UI — Barl export
 * Point d'input unique for the sous-module ui/
 *
 * Note : UI (namespace orchestrateur, stateful) n'est PAS exported ici.
 * Utiliser la facade geoleaf.ui.js ou importer directly ui/ui-api.js.
 *
 * @module ui
 */

// Composants purs (stateless / classes utilitaires)
export { Branding } from "./branding.js";
export { _UIComponents } from "./components.js";
export { _UIControls } from "./controls.js";
export { CoordinatesDisplay } from "./coordinates-display.js";
export { _UIDomUtils } from "./dom-utils.js";
export { _UIEventDelegation } from "./event-delegation.js";
export { FilterPanelAggregator } from "./filter-panel.js";
export { _UIFilterStateManager } from "./filter-state-manager.js";
export { GeoLocationState } from "./geolocation-state.js";
export { NotificationSystem, _UINotifications } from "./notifications.js";
export { PanelBuilder } from "./panel-builder.js";
export { ScaleControl } from "./scale-control.js";
export { _UITheme } from "./theme.js";

// Filter control builder (functions)
export {
    buildCategoryTreeContent,
    buildTagsListContent,
    attachCategoryTreeListeners,
    attachTagsListeners,
} from "./filter-control-builder.js";

// Content builder (re-exports from sub-barl content-builder.js)
export {
    ContentBuilderCore,
    ContentBuilderHelpers,
    ContentBuilderShared,
    ContentBuilderTemplates,
    ContentBuilderAssemblers,
} from "./content-builder.js";
