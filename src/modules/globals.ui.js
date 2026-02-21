/**
 * globals.ui.js — Bridge UMD/ESM : B6 + B7 + B9 — labels, legend, layer-manager, themes, ui
 *
 * @see globals.js (orchestrateur)
 */

// B6 : labels, legend, layer-manager
import { LabelButtonManager } from "./labels/label-button-manager.js";
import { LabelRenderer } from "./labels/label-renderer.js";
import { Labels } from "./labels/labels.js";
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
// B9 : ui — fichiers directs
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
// B9 : ui/content-builder/
import { ContentBuilderCore } from "./ui/content-builder/core.js";
import { Helpers as ContentBuilderHelpers } from "./ui/content-builder/helpers.js";
import { ContentBuilderShared } from "./ui/content-builder/renderers-shared.js";
import { Templates as ContentBuilderTemplates } from "./ui/content-builder/templates.js";
import { Assemblers as ContentBuilderAssemblers } from "./ui/content-builder/assemblers.js";
// B9 : ui/filter-panel/ (ordre important : sub-modules avant aggregateurs)
import { FilterPanelShared } from "./ui/filter-panel/shared.js";
import { FilterPanelStateReader } from "./ui/filter-panel/state-reader.js";
import { FilterPanelApplier } from "./ui/filter-panel/applier.js";
import { FilterPanelRenderer } from "./ui/filter-panel/renderer.js";
import { FilterPanelProximity } from "./ui/filter-panel/proximity.js";
import { FilterPanelLazyLoader } from "./ui/filter-panel/lazy-loader.js";
import { FilterPanel } from "./ui/filter-panel/core.js";
import { FilterPanelAggregator } from "./ui/filter-panel.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

// ── B6 assignations ──────────────────────────────────────────────────────────
_g.GeoLeaf._LabelButtonManager = LabelButtonManager;
_g.GeoLeaf._LabelRenderer = LabelRenderer;
_g.GeoLeaf.Labels = Labels;
_g.GeoLeaf._LegendControl = LegendControl;
_g.GeoLeaf._LegendGenerator = LegendGenerator;
_g.GeoLeaf._LegendRenderer = LegendRenderer;
_g.GeoLeaf._LayerManagerBasemapSelector = BasemapSelector;
_g.GeoLeaf._LayerManagerCacheSection = CacheSection;
_g.GeoLeaf._LayerManagerControl = LMControl;
_g.GeoLeaf._LayerManagerRenderer = LMRenderer;
_g.GeoLeaf._LayerManagerShared = LMShared;
_g.GeoLeaf._LayerManagerStyleSelector = StyleSelector;

// ── B7 assignations ──────────────────────────────────────────────────────────
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

// ── B9 assignations : ui ─────────────────────────────────────────────────────
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
// Alias UI.notify → _UINotifications (utilisé par boot-info.js et les intégrateurs)
// GeoLeaf.UI est déjà initialisé plus haut, on complète sans écraser
if (!_g.GeoLeaf.UI) _g.GeoLeaf.UI = {};
_g.GeoLeaf.UI.notify = {
    info: (msg, opts) => _UINotifications?.info?.(msg, opts),
    warn: (msg, opts) => _UINotifications?.warn?.(msg, opts),
    error: (msg, opts) => _UINotifications?.error?.(msg, opts),
    success: (msg, opts) => _UINotifications?.success?.(msg, opts),
    dismiss: (id) => _UINotifications?.dismiss?.(id),
};
_g.GeoLeaf.UI.PanelBuilder = PanelBuilder;
_g.GeoLeaf.UI.ScaleControl = UIScaleControl;
_g.GeoLeaf._UITheme = _UITheme;
// Wire theme methods directly onto UI (geoleaf.ui.js body runs at import time,
// before globals.js body assigns _g.GeoLeaf._UITheme, so its conditional block
// was skipped — we re-apply here to ensure applyTheme/setTheme exist at boot)
_g.GeoLeaf.UI.applyTheme = _UITheme.applyTheme;
_g.GeoLeaf.UI.setTheme = _UITheme.applyTheme;
_g.GeoLeaf.UI.toggleTheme = _UITheme.toggleTheme;
_g.GeoLeaf.UI.initThemeToggle = _UITheme.initThemeToggle;
_g.GeoLeaf.UI.getCurrentTheme = _UITheme.getCurrentTheme;
// content-builder
if (!_g.GeoLeaf._ContentBuilder) _g.GeoLeaf._ContentBuilder = {};
_g.GeoLeaf._ContentBuilder.Core = ContentBuilderCore;
_g.GeoLeaf._ContentBuilder.Helpers = ContentBuilderHelpers;
_g.GeoLeaf._ContentBuilder.Shared = ContentBuilderShared;
_g.GeoLeaf._ContentBuilder.Templates = ContentBuilderTemplates;
_g.GeoLeaf._ContentBuilder.Assemblers = ContentBuilderAssemblers;
// filter-panel
_g.GeoLeaf._UIFilterPanelShared = FilterPanelShared;
_g.GeoLeaf._UIFilterPanelStateReader = FilterPanelStateReader;
_g.GeoLeaf._UIFilterPanelApplier = FilterPanelApplier;
_g.GeoLeaf._UIFilterPanelRenderer = FilterPanelRenderer;
_g.GeoLeaf._UIFilterPanelProximity = FilterPanelProximity;
_g.GeoLeaf._UIFilterPanelLazyLoader = FilterPanelLazyLoader;
_g.GeoLeaf._UIFilterPanel = FilterPanel;
_g.GeoLeaf.FilterPanel = FilterPanelAggregator;
