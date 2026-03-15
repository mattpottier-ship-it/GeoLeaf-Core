/**
 * GeoLeaf Legend API (assemblage namespace Legend)
 * @module legend/legend-api
 */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * Module main GeoLeaf.Legend
 * Manager for legend cartographical multi-layers avec accordions
 */

"use strict";

import { Log } from "../log/index.js";
import type { LegendData } from "./legend-generator.js";

const _g: any =
    typeof globalThis !== "undefined"
        ? globalThis
        : typeof window !== "undefined"
          ? window
          : ({} as Window);

interface GeoLeafGlobal {
    GeoLeaf?: {
        Config?: {
            get: (key: string) => unknown;
            getAll: () => Record<string, unknown>;
            getActiveProfile?: () => ProfileConfig;
        };
        _LegendControl?: { create: (opts: LegendInitOptions) => unknown };
        _LegendGenerator?: {
            generateLegendFromStyle: (
                styleData: unknown,
                geometryType: string,
                taxonomyData: unknown
            ) => LegendData | null;
        };
        _POIMarkers?: { ensureProfileSpriteInjectedSync: () => Promise<void> };
        _POIShared?: unknown;
        _LayerVisibilityManager?: {
            getVisibilityState: (layerId: string) => { current?: boolean } | null;
        };
    };
}

(_g as GeoLeafGlobal).GeoLeaf = (_g as GeoLeafGlobal).GeoLeaf || {};

function _getGeoLeaf(): NonNullable<GeoLeafGlobal["GeoLeaf"]> {
    return (_g as GeoLeafGlobal).GeoLeaf!;
}

interface LegendInitOptions {
    position?: string;
    collapsible?: boolean;
    collapsed?: boolean;
    title?: string;
}

interface ProfileConfig {
    id?: string;
    layers?: { id: string; configFile?: string }[];
}

interface LayerInfo {
    label: string;
    styleId: string | null;
    legendData: LegendData | null;
    visible: boolean;
    order: number;
    geometryType: string;
    configFile?: string;
}

let _map: unknown = null;
let _control: {
    _container?: HTMLElement;
    hide?: () => void;
    updateMultiLayerContent?: (arr: unknown[]) => void;
} | null = null;
let _options: LegendInitOptions = {};
let _profileConfig: ProfileConfig | null = null;
let _taxonomyData: Record<string, unknown> | null = null;

let _rebuildTimer: ReturnType<typeof setTimeout> | null = null;
const REBUILD_DEBOUNCE_MS = 150;
let _loadingOverlayEl: HTMLElement | null = null;
let _loadingOverlayTimer: ReturnType<typeof setTimeout> | null = null;
const LOADING_OVERLAY_TIMEOUT_MS = 12000;

const _allLayers = new Map<string, LayerInfo>();

function _normalizeGeometryType(rawGeometry: string | undefined): string {
    const value = (rawGeometry || "").toLowerCase();
    if (value === "polyline" || value === "line") return "line";
    if (value === "polygon") return "polygon";
    return "point";
}

function _scheduleRebuild(): void {
    if (_rebuildTimer) {
        clearTimeout(_rebuildTimer);
    }
    _rebuildTimer = setTimeout(() => {
        _rebuildTimer = null;
        LegendModule._rebuildDisplay();
    }, REBUILD_DEBOUNCE_MS);
}

function _ensureSpinnerStyles(): void {
    if (document.getElementById("gl-legend-spinner-style")) return;
    const styleEl = document.createElement("style");
    styleEl.id = "gl-legend-spinner-style";
    styleEl.textContent =
        "@keyframes gl-legend-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }";
    document.head.appendChild(styleEl);
}

function _clearOverlayTimeout(): void {
    if (_loadingOverlayTimer) {
        clearTimeout(_loadingOverlayTimer);
        _loadingOverlayTimer = null;
    }
}

function _showLoadingOverlay(): void {
    if (!_control?._container) return;

    _ensureSpinnerStyles();
    _clearOverlayTimeout();

    const container = _control._container;
    if (!container.style.position) {
        container.style.position = "relative";
    }

    if (!_loadingOverlayEl) {
        const overlay = document.createElement("div");
        overlay.className = "gl-map-legend__loading-overlay";
        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.background = "rgba(255,255,255,0.6)";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.pointerEvents = "auto";
        overlay.style.zIndex = "2";
        overlay.setAttribute("aria-hidden", "false");

        const spinner = document.createElement("div");
        spinner.className = "gl-map-legend__spinner";
        spinner.style.width = "34px";
        spinner.style.height = "34px";
        spinner.style.border = "3px solid rgba(0,0,0,0.12)";
        spinner.style.borderTop = "3px solid rgba(0,0,0,0.55)";
        spinner.style.borderRadius = "50%";
        spinner.style.animation = "gl-legend-spin 1s linear infinite";

        overlay.appendChild(spinner);
        _loadingOverlayEl = overlay;
    }

    if (!_loadingOverlayEl.parentElement) {
        container.appendChild(_loadingOverlayEl);
    }

    container.setAttribute("aria-busy", "true");
    container.setAttribute("aria-live", "polite");

    _loadingOverlayTimer = setTimeout(() => {
        _loadingOverlayTimer = null;
        _hideLoadingOverlay();
    }, LOADING_OVERLAY_TIMEOUT_MS);
}

function _hideLoadingOverlay(): void {
    _clearOverlayTimeout();
    if (_loadingOverlayEl?.parentElement) {
        _loadingOverlayEl.parentElement.removeChild(_loadingOverlayEl);
    }
    if (_control?._container) {
        _control._container.removeAttribute("aria-busy");
        _control._container.removeAttribute("aria-live");
    }
}

interface LayerConfigForLegend {
    label?: string;
    geometryType?: string;
    geometry?: string;
    _profileId?: string;
    _layerDirectory?: string;
    styles?: { directory?: string; available?: { id: string; file?: string }[]; default?: string };
    showIconsOnMap?: boolean;
}

function _resolveProfileConfig(
    Config: NonNullable<GeoLeafGlobal["GeoLeaf"]>["Config"]
): ProfileConfig | null {
    if (!Config) return null;
    if (typeof Config.getActiveProfile === "function") return Config.getActiveProfile();
    const allConfig = Config.getAll() as { id?: string; layers?: unknown[] };
    return {
        id: allConfig.id ?? (Config.get("id") as string),
        layers: ((allConfig.layers ?? Config.get("layers")) as ProfileConfig["layers"]) ?? [],
    };
}

function _ensureLegendControl(): void {
    if (_control) return;
    const ControlFactory = _getGeoLeaf()._LegendControl?.create;
    if (ControlFactory) {
        _control = ControlFactory(_options) as typeof _control;
        if (_control) (_map as { addControl: (c: unknown) => void }).addControl(_control);
    }
}

function _updateLegendContent(
    ctrl: NonNullable<typeof _control>,
    self: { _rebuildDisplay: () => void }
): void {
    const visibilityManager = _getGeoLeaf()._LayerVisibilityManager;
    const legendsArray: {
        layerId: string;
        label: string;
        collapsed: boolean;
        order: number;
        visible: boolean;
        sections: LegendData["sections"];
    }[] = [];

    _allLayers.forEach((data, layerId) => {
        if (!data.legendData) return;
        const visState =
            typeof visibilityManager?.getVisibilityState === "function"
                ? visibilityManager.getVisibilityState(layerId)
                : null;
        const isVisible = visState?.current ?? data.visible;
        if (!isVisible) return;
        legendsArray.push({
            layerId,
            label: data.label,
            collapsed: true,
            order: data.order,
            visible: true,
            sections: data.legendData.sections ?? [],
        });
    });

    legendsArray.sort((a, b) => a.order - b.order);
    ctrl.updateMultiLayerContent!(legendsArray);

    const hasIcons = legendsArray.some((legend) =>
        legend.sections.some((section) =>
            section.items?.some((item) => (item as { icon?: string }).icon)
        )
    );
    if (hasIcons && !document.querySelector('svg[data-geoleaf-sprite="profile"]')) {
        Log?.info("[Legend] Icons detected but sprite missing - scheduling retry");
        setTimeout(() => {
            if (document.querySelector('svg[data-geoleaf-sprite="profile"]')) {
                Log?.info("[Legend] Sprite available - re-rendering legend");
                self._rebuildDisplay();
            }
        }, 2000);
    }
}

function _resolveStyleFilePath(
    profileId: string | undefined,
    layerDir: string | undefined,
    layerConfig: LayerConfigForLegend,
    styleId: string
): string | null {
    if (!layerConfig.styles?.directory) return null;
    const stylesDir = layerConfig.styles.directory;
    const styleFile =
        layerConfig.styles.available?.find((s) => s.id === styleId)?.file ??
        layerConfig.styles.default;
    const Config = _getGeoLeaf().Config;
    const dataCfg = Config?.get
        ? (Config.get("data") as { profilesBasePath?: string } | null)
        : null;
    const profilesBasePath = dataCfg?.profilesBasePath ?? "profiles";
    return `${profilesBasePath}/${profileId}/${layerDir}/${stylesDir}/${styleFile}`;
}

function _resolveLayerGeometryType(
    layerConfig: LayerConfigForLegend,
    layerInfo: LayerInfo
): string {
    const raw =
        layerConfig.geometryType ?? layerConfig.geometry ?? layerInfo.geometryType ?? "point";
    return _normalizeGeometryType(raw);
}

function _applyStyleToLegend(
    layerId: string,
    layerInfo: LayerInfo,
    layerConfig: LayerConfigForLegend,
    styleData: Record<string, unknown>
): void {
    const GeoLeaf = _getGeoLeaf();
    const Generator = GeoLeaf._LegendGenerator;
    if (!Generator) {
        Log?.error("[Legend] LegendGenerator non disponible");
        return;
    }

    const originalPOIShared = GeoLeaf._POIShared;
    if (layerConfig.showIconsOnMap !== undefined) {
        GeoLeaf._POIShared = {
            state: { poiConfig: { showIconsOnMap: layerConfig.showIconsOnMap } },
        };
    }

    const legendData = Generator.generateLegendFromStyle(
        styleData,
        layerInfo.geometryType,
        _taxonomyData
    );

    if (layerConfig.showIconsOnMap !== undefined) {
        GeoLeaf._POIShared = originalPOIShared;
    }

    if (legendData) {
        layerInfo.legendData = legendData;
        _allLayers.set(layerId, layerInfo);
        Log?.debug(`[Legend] Legend generated for ${layerId}`);
        _scheduleRebuild();
    }
}

const LegendModule = {
    init(mapInstance: unknown, options?: LegendInitOptions): boolean {
        if (!mapInstance) {
            Log?.error("[Legend] Carte Leaflet requirede pour initialize Legend");
            return false;
        }

        _map = mapInstance;

        const Config = _getGeoLeaf().Config;
        if (Config && typeof Config.get === "function") {
            const legendConfig = Config.get("legendConfig") as
                | { position?: string; collapsedByDefault?: boolean; title?: string }
                | undefined;
            _options = Object.assign(
                {
                    position: legendConfig?.position ?? "bottomleft",
                    collapsible: true,
                    collapsed: legendConfig?.collapsedByDefault ?? false,
                    title: legendConfig?.title ?? "Legend",
                },
                options ?? {}
            );
            _profileConfig = _resolveProfileConfig(Config);
        } else {
            _options = Object.assign(
                { position: "bottomleft", collapsible: true, collapsed: false, title: "Legend" },
                options ?? {}
            );
        }

        this._loadTaxonomy();
        this._initializeAllLayers();

        Log?.info("[Legend] Legend module initialized with automatic generation from styles");
        return true;
    },

    _loadTaxonomy(): void {
        if (!_profileConfig) return;

        const Config = _getGeoLeaf().Config;
        const dataCfg = Config?.get
            ? (Config.get("data") as { profilesBasePath?: string } | null)
            : null;
        const profilesBasePath = dataCfg?.profilesBasePath ?? "profiles";
        const profileId = _profileConfig.id;

        if (!profileId) {
            if (Log) Log.warn("[Legend] Cannot load taxonomy without profileId");
            return;
        }

        const taxonomyPath = `${profilesBasePath}/${profileId}/taxonomy.json`;

        fetch(taxonomyPath)
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((data: Record<string, unknown>) => {
                _taxonomyData = data;
                if (Log) Log.debug("[Legend] Taxonomy loaded");
            })
            .catch((err: Error) => {
                if (Log) Log.warn(`[Legend] Taxonomy loading error: ${err.message}`);
            });
    },

    _initializeAllLayers(): void {
        if (!_profileConfig?.layers?.length) {
            if (Log) Log.warn("[Legend] No layer defined in the profile");
            return;
        }

        _profileConfig.layers.forEach((layerDef, index) => {
            _allLayers.set(layerDef.id, {
                label: layerDef.id,
                styleId: null,
                legendData: null,
                visible: false,
                order: index + 1,
                geometryType: "",
                configFile: layerDef.configFile,
            });
        });

        if (Log) Log.debug(`[Legend] ${_allLayers.size} layer(s) initialized`);
    },

    loadLayerLegend(layerId: string, styleId: string, layerConfig: LayerConfigForLegend): void {
        if (!_map) {
            Log?.warn("[Legend] Module not initialized");
            return;
        }

        const layerInfo = _allLayers.get(layerId);
        if (!layerInfo) {
            Log?.warn(`[Legend] Layer ${layerId} not found in profile`);
            return;
        }

        const POIMarkers = _getGeoLeaf()._POIMarkers;
        if (
            typeof (POIMarkers as { ensureProfileSpriteInjectedSync?: () => void })
                ?.ensureProfileSpriteInjectedSync === "function"
        ) {
            (
                POIMarkers as { ensureProfileSpriteInjectedSync: () => void }
            ).ensureProfileSpriteInjectedSync();
            Log?.debug(`[Legend] SVG sprite requested for layer ${layerId}`);
        }

        layerInfo.label = layerConfig.label ?? layerId;
        layerInfo.geometryType = _resolveLayerGeometryType(layerConfig, layerInfo);
        layerInfo.styleId = styleId;

        const profileId = layerConfig._profileId ?? _profileConfig?.id;
        const layerDir = layerConfig._layerDirectory;
        const stylePath = _resolveStyleFilePath(profileId, layerDir, layerConfig, styleId);

        if (!stylePath) {
            Log?.warn(`[Legend] Configuration styles manquante pour ${layerId}`);
            return;
        }

        Log?.debug(`[Legend] Chargement style: ${stylePath}`);

        fetch(stylePath)
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((styleData: Record<string, unknown>) => {
                _applyStyleToLegend(layerId, layerInfo, layerConfig, styleData);
            })
            .catch((err: Error) => {
                Log?.warn(`[Legend] Erreur loading style: ${err.message}`);
            });
    },

    setLayerVisibility(layerId: string, visible: boolean): void {
        const layerInfo = _allLayers.get(layerId);
        if (layerInfo) {
            layerInfo.visible = visible;
            _allLayers.set(layerId, layerInfo);
            _scheduleRebuild();
            if (Log) Log.debug(`[Legend] Visibility of ${layerId}: ${visible}`);
        }
    },

    _rebuildDisplay(): void {
        if (!_map) return;

        if (_allLayers.size === 0) {
            if (_control && _map) {
                (_map as { removeControl: (c: unknown) => void }).removeControl(_control);
                _control = null;
            }
            return;
        }

        _ensureLegendControl();

        if (_control?.updateMultiLayerContent) {
            _updateLegendContent(_control, this);
        }
    },

    toggleAccordion(_layerId: string): void {
        // Managed visually by the renderer
    },

    getAllLayers(): Map<string, LayerInfo> {
        return _allLayers;
    },

    hideLegend(): void {
        if (_control?.hide) {
            _control.hide();
        }
    },

    removeLegend(): void {
        _allLayers.forEach((layerInfo) => {
            layerInfo.legendData = null;
            layerInfo.visible = false;
        });

        if (_control && _map) {
            (_map as { removeControl: (c: unknown) => void }).removeControl(_control);
            _control = null;
            if (Log) Log.debug("[Legend] All legends removed");
        }
    },

    isLegendVisible(): boolean {
        return _control !== null && _allLayers.size > 0;
    },

    showLoadingOverlay(): void {
        _showLoadingOverlay();
    },

    hideLoadingOverlay(): void {
        _hideLoadingOverlay();
    },
};

const Legend = LegendModule;

export { Legend };
