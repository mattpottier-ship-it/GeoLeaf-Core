/**
 * globals.ui-lite.ts — Bridge UMD/ESM : B6 + B7 + B9 — sans labels (~15 KB min)
 * PERF-02 build "core lite"
 *
 * @see globals.ui.ts pour la version complète
 */

// B6 : legend, layer-manager (labels exclu)
import { LegendControl } from "./legend/legend-control.js";
import { LegendGenerator } from "./legend/legend-generator.js";
import { LegendRenderer } from "./legend/legend-renderer.js";
import { BasemapSelector } from "./layer-manager/basemap-selector.js";
import { CacheSection } from "./layer-manager/cache-section.js";
import { LMControl } from "./layer-manager/control.js";
import { LMRenderer } from "./layer-manager/renderer.js";
import { LMShared } from "./layer-manager/shared.js";
import { StyleSelector } from "./layer-manager/style-selector.js";
// B7 : themes
import { ThemeCache } from "./themes/theme-cache.js";
import { ThemeLoader } from "./themes/theme-loader.js";
import { ThemeSelector } from "./themes/theme-selector.js";
import { ThemeApplierCore } from "./themes/theme-applier/core.js";
import { ThemeApplierDeferred } from "./themes/theme-applier/deferred.js";
import { ThemeApplierUISync } from "./themes/theme-applier/ui-sync.js";
import { ThemeApplierVisibility } from "./themes/theme-applier/visibility.js";
// B9 : ui
import { Branding } from "./ui/branding.js";
import { _UIComponents } from "./ui/components.js";
import { _UIControls } from "./ui/controls.js";
import { CoordinatesDisplay } from "./ui/coordinates-display.js";
import { _UIDomUtils } from "./ui/dom-utils.js";
import { _UIEventDelegation } from "./ui/event-delegation.js";
import { _buildFilterControl } from "./ui/filter-control-builder.js";
import { _UIFilterStateManager } from "./ui/filter-state-manager.js";
import { NotificationSystem, _UINotifications } from "./ui/notifications.js";
import { PanelBuilder } from "./ui/panel-builder.js";
import { ScaleControl as UIScaleControl } from "./ui/scale-control.js";
import { _UITheme } from "./ui/theme.js";
import { ContentBuilderCore } from "./ui/content-builder/core.js";
import { Helpers as ContentBuilderHelpers } from "./ui/content-builder/helpers.js";
import { ContentBuilderShared } from "./ui/content-builder/renderers-shared.js";
import { Templates as ContentBuilderTemplates } from "./ui/content-builder/templates.js";
import { Assemblers as ContentBuilderAssemblers } from "./ui/content-builder/assemblers.js";
import { FilterPanelShared } from "./ui/filter-panel/shared.js";
import { FilterPanelStateReader } from "./ui/filter-panel/state-reader.js";
import { FilterPanelApplier } from "./ui/filter-panel/applier.js";
import { FilterPanelRenderer } from "./ui/filter-panel/renderer.js";
import { FilterPanelProximity } from "./ui/filter-panel/proximity.js";
import { FilterPanelLazyLoader } from "./ui/filter-panel/lazy-loader.js";
import { FilterPanel } from "./ui/filter-panel/core.js";
import { FilterPanelAggregator } from "./ui/filter-panel.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

// B6 assignations (sans labels)
_g.GeoLeaf._LegendControl = LegendControl;
_g.GeoLeaf._LegendGenerator = LegendGenerator;
_g.GeoLeaf._LegendRenderer = LegendRenderer;
_g.GeoLeaf._LayerManagerBasemapSelector = BasemapSelector;
_g.GeoLeaf._LayerManagerCacheSection = CacheSection;
_g.GeoLeaf._LayerManagerControl = LMControl;
_g.GeoLeaf._LayerManagerRenderer = LMRenderer;
_g.GeoLeaf._LayerManagerShared = LMShared;
_g.GeoLeaf._LayerManagerStyleSelector = StyleSelector;

// B7 assignations
_g.GeoLeaf.ThemeCache = ThemeCache;
_g.GeoLeaf._ThemeLoader = ThemeLoader;
_g.GeoLeaf.ThemeSelector = ThemeSelector;
_g.GeoLeaf._ThemeApplier = Object.assign(
    {},
    ThemeApplierCore,
    ThemeApplierDeferred,
    ThemeApplierUISync,
    ThemeApplierVisibility
);

// B9 assignations : ui
if (!_g.GeoLeaf.UI) _g.GeoLeaf.UI = {};
_g.GeoLeaf.UI.Branding = Branding;
_g.GeoLeaf._UIComponents = _UIComponents;
_g.GeoLeaf._UIControls = _UIControls;
_g.GeoLeaf.UI.CoordinatesDisplay = CoordinatesDisplay;
_g.GeoLeaf._UIDomUtils = _UIDomUtils;
_g.GeoLeaf._UIEventDelegation = _UIEventDelegation;
_g.GeoLeaf.UI._buildFilterControl = _buildFilterControl;
_g.GeoLeaf._UIFilterStateManager = _UIFilterStateManager;
_g.GeoLeaf._UINotifications = _UINotifications;
_g.GeoLeaf.NotificationSystem = NotificationSystem;
if (!_g.GeoLeaf.UI) _g.GeoLeaf.UI = {};
_g.GeoLeaf.UI.notify = {
    info: (msg: any, opts: any) => _UINotifications?.info?.(msg, opts),
    warn: (msg: any, opts: any) => _UINotifications?.warning?.(msg, opts),
    error: (msg: any, opts: any) => _UINotifications?.error?.(msg, opts),
    success: (msg: any, opts: any) => _UINotifications?.success?.(msg, opts),
    dismiss: (id: any) => _UINotifications?.dismiss?.(id),
};
_g.GeoLeaf.UI.PanelBuilder = PanelBuilder;
_g.GeoLeaf.UI.ScaleControl = UIScaleControl;
_g.GeoLeaf._UITheme = _UITheme;
_g.GeoLeaf.UI.applyTheme = _UITheme.applyTheme;
_g.GeoLeaf.UI.setTheme = _UITheme.applyTheme;
_g.GeoLeaf.UI.toggleTheme = _UITheme.toggleTheme;
_g.GeoLeaf.UI.initThemeToggle = _UITheme.initThemeToggle;
_g.GeoLeaf.UI.getCurrentTheme = _UITheme.getCurrentTheme;
if (!_g.GeoLeaf._ContentBuilder) _g.GeoLeaf._ContentBuilder = {};
_g.GeoLeaf._ContentBuilder.Core = ContentBuilderCore;
_g.GeoLeaf._ContentBuilder.Helpers = ContentBuilderHelpers;
_g.GeoLeaf._ContentBuilder.Shared = ContentBuilderShared;
_g.GeoLeaf._ContentBuilder.Templates = ContentBuilderTemplates;
_g.GeoLeaf._ContentBuilder.Assemblers = ContentBuilderAssemblers;
_g.GeoLeaf._UIFilterPanelShared = FilterPanelShared;
_g.GeoLeaf._UIFilterPanelStateReader = FilterPanelStateReader;
_g.GeoLeaf._UIFilterPanelApplier = FilterPanelApplier;
_g.GeoLeaf._UIFilterPanelRenderer = FilterPanelRenderer;
_g.GeoLeaf._UIFilterPanelProximity = FilterPanelProximity;
_g.GeoLeaf._UIFilterPanelLazyLoader = FilterPanelLazyLoader;
_g.GeoLeaf._UIFilterPanel = FilterPanel;
_g.GeoLeaf._UIFilterPanelAggregator = FilterPanelAggregator;
