/**
 * Module Labels pour GeoLeaf
 * Gestion des labels flottantes sur les entities
 * @namespace Labels
 */

import { Log } from "../log/index.js";
import { LabelRenderer } from "./label-renderer.js";
import {
    isScaleInRange as _isScaleInRange,
    calculateMapScale as _calculateMapScale,
} from "../utils/scale-utils.js";
import { Core } from "../geoleaf.core.js";
import { GeoJSONCore } from "../geojson/core.js";

const ScaleUtils = { isScaleInRange: _isScaleInRange, calculateMapScale: _calculateMapScale };

interface LayerLabelState {
    enabled: boolean;
    config: Record<string, unknown>;
    labelStyle: Record<string, unknown>;
    tooltips: Map<string, unknown>;
}

const _state: { layers: Map<string, LayerLabelState>; zoomListenerAttached: boolean } = {
    layers: new Map(),
    zoomListenerAttached: false,
};

function _getIntegratedLabel(layerData: any): any {
    if (!layerData) return null;
    if (!layerData.currentStyle) return null;
    if (!layerData.currentStyle.label) return null;
    return layerData.currentStyle.label;
}

function _hasConfigLabel(labelConfig: any): boolean {
    if (!labelConfig) return false;
    if (!labelConfig.enabled) return false;
    if (!labelConfig.labelId) return false;
    return true;
}

function _resolveLabelStyleConfig(
    layerData: any,
    labelConfig: Record<string, unknown>,
    _layerId: string
): Record<string, unknown> | null | "disabled" {
    const integratedLabel = _getIntegratedLabel(layerData);
    if (integratedLabel) {
        if (integratedLabel.enabled !== true) return "disabled";
        const result: any = Object.assign({}, integratedLabel);
        if (layerData.currentStyle && layerData.currentStyle.labelScale) {
            result.labelScale = layerData.currentStyle.labelScale;
        }
        return result;
    }
    if (_hasConfigLabel(labelConfig as any)) return _buildLabelStyleFromConfig(labelConfig);
    return null;
}

function _buildLabelStyleFromConfig(labelConfig: Record<string, unknown>): Record<string, unknown> {
    const cfg = labelConfig as any;
    const font = cfg.font
        ? cfg.font
        : { family: "Arial", sizePt: 10, weight: 50, bold: false, italic: false };
    const color = cfg.color ? cfg.color : "#000000";
    const opacity = cfg.opacity ? cfg.opacity : 1.0;
    const buffer = cfg.buffer ? cfg.buffer : { enabled: false };
    const background = cfg.background ? cfg.background : { enabled: false };
    const offset = cfg.offset ? cfg.offset : { distancePx: 0 };
    return { enabled: true, field: cfg.labelId, font, color, opacity, buffer, background, offset };
}

function _resolveLabelEffectiveShow(labelStyleConfig: any, showImmediately: boolean): boolean {
    if (labelStyleConfig.visibleByDefault !== undefined) return labelStyleConfig.visibleByDefault;
    return showImmediately;
}

function _computeShouldShow(effectiveShowImmediately: boolean, layerData: any): boolean {
    if (!layerData) return effectiveShowImmediately;
    if (!layerData._visibility) return effectiveShowImmediately;
    return effectiveShowImmediately && layerData._visibility.current === true;
}

async function _doEnableLabels(
    self: any,
    layerId: string,
    labelConfig: Record<string, unknown>,
    showImmediately: boolean
): Promise<void> {
    const layerData = self._getLayerData(layerId);
    const labelStyleConfig = _resolveLabelStyleConfig(layerData, labelConfig, layerId);
    if (labelStyleConfig === "disabled") {
        if (Log) Log.debug("[Labels] Embedded labels disabled for", layerId);
        return;
    }
    if (!labelStyleConfig) {
        if (Log) Log.debug("[Labels] No label configured for", layerId);
        return;
    }
    const effectiveShowImmediately = _resolveLabelEffectiveShow(
        labelStyleConfig as any,
        showImmediately
    );
    _state.layers.set(layerId, {
        enabled: effectiveShowImmediately,
        config: labelConfig,
        labelStyle: labelStyleConfig as Record<string, unknown>,
        tooltips: new Map(),
    });
    const shouldShowLabels = _computeShouldShow(effectiveShowImmediately, layerData);
    if (shouldShowLabels) await self._createLabelsForLayer(layerId);
    self._ensureZoomListener();
    if (Log) Log.debug("[Labels] Label config prepared for", layerId);
}

function _getMap(): any {
    if (Core && (Core as any).getMap) return (Core as any).getMap();
    return null;
}

function _isLayerVisible(layerData: any): boolean {
    if (!layerData) return false;
    if (!layerData._visibility) return false;
    return layerData._visibility.current === true;
}

function _isOutOfRange(self: any, map: any, config: any, labelStyle: any): boolean {
    if (!map) return false;
    if (labelStyle.labelScale) {
        const { minScale, maxScale } = labelStyle.labelScale;
        if (minScale == null && maxScale == null) return false;
        const currentScale = self._calculateMapScale(map);
        return !self._isScaleInRange(
            currentScale,
            minScale as number | null,
            maxScale as number | null
        );
    }
    if (config.minZoom === undefined) return false;
    if (config.maxZoom === undefined) return false;
    const currentZoom = map.getZoom();
    if (currentZoom < config.minZoom) return true;
    if (currentZoom > config.maxZoom) return true;
    return false;
}

function _renderTooltipsForLayer(
    layerId: string,
    layerData: any,
    config: any,
    labelStyle: any,
    tooltips: Map<string, unknown>
): void {
    if (!LabelRenderer) {
        if (Log) Log.error("[Labels] GeoLeaf._LabelRenderer not available!");
        return;
    }
    LabelRenderer.createTooltipsForLayer(
        layerId,
        layerData.layer,
        {
            labelId: labelStyle.field || config.labelId,
            minZoom: config.minZoom,
            maxZoom: config.maxZoom,
        },
        labelStyle,
        tooltips
    );
}

function _clearTooltips(tooltips: Map<string, unknown>): void {
    tooltips.forEach((t: unknown) => {
        if ((t as any) && (t as any).remove) (t as any).remove();
    });
    tooltips.clear();
}

function _processZoomLayerItem(
    self: any,
    layerState: LayerLabelState,
    layerId: string,
    currentScale: number,
    detail: { zoom?: number },
    map: any
): void {
    if (!layerState.enabled) return;
    if (!_isLayerVisible(self._getLayerData(layerId))) {
        if (layerState.tooltips && layerState.tooltips.size) _clearTooltips(layerState.tooltips);
        return;
    }
    const { labelStyle, config } = layerState;
    const shouldShow = _resolveShouldShowForZoom(
        self,
        currentScale,
        detail,
        map,
        config as any,
        labelStyle as any
    );
    const isShowing = layerState.tooltips && layerState.tooltips.size > 0;
    if (shouldShow && !isShowing) self._createLabelsForLayer(layerId);
    else if (!shouldShow && isShowing) _clearTooltips(layerState.tooltips);
}

function _resolveShouldShowForZoom(
    self: any,
    currentScale: number,
    detail: { zoom?: number },
    map: any,
    config: any,
    labelStyle: any
): boolean {
    if (labelStyle.labelScale) {
        const { minScale, maxScale } = labelStyle.labelScale;
        return self._isScaleInRange(
            currentScale,
            minScale as number | null,
            maxScale as number | null
        );
    }
    if (config.minZoom === undefined) return true;
    if (config.maxZoom === undefined) return true;
    const zoom = detail.zoom !== undefined ? detail.zoom : map.getZoom();
    if (zoom < config.minZoom) return false;
    if (zoom > config.maxZoom) return false;
    return true;
}

const Labels = {
    init(_options: Record<string, unknown> = {}): void {
        if (Log) Log.debug("[Labels] Initializing Labels module");
        (this as any)._attachLayerEvents();
        if (Log) Log.debug("[Labels] Labels module initialized");
    },

    initializeLayerLabels(layerId: string): void {
        if (!layerId) return;
        const layerData = (this as any)._getLayerData(layerId);
        if (!layerData) return;
        (this as any)._hideLabelsForLayer(layerId);
        _state.layers.delete(layerId);
        if ((layerData as any).currentStyle?.label?.enabled !== true) {
            if (Log)
                Log.debug(
                    "[Labels.initialize] Style without labels or labels disabled for",
                    layerId
                );
            return;
        }
        const visibleByDefault = (layerData as any).currentStyle.label.visibleByDefault === true;
        if (!visibleByDefault) {
            if (Log) Log.debug("[Labels.initialize] Labels disabled by default for", layerId);
            return (this as any).enableLabels(layerId, {}, false);
        }
        const isLayerVisible = (layerData as any)._visibility?.current === true;
        if (!isLayerVisible) {
            if (Log)
                Log.debug("[Labels.initialize] Labels configured but layer hidden for", layerId);
            return (this as any).enableLabels(layerId, {}, false);
        }
        if (Log) Log.debug("[Labels.initialize] Initializing visible labels for", layerId);
        return (this as any).enableLabels(layerId, {}, true);
    },

    async enableLabels(
        layerId: string,
        labelConfig: Record<string, unknown> = {},
        showImmediately = true
    ): Promise<void> {
        if (!layerId) {
            if (Log) Log.warn("[Labels] enableLabels: layerId missing");
            return;
        }
        if ((labelConfig as any).styleFile) {
            throw new Error(
                `Obsolete configuration: labels.styleFile detected in layer ${layerId}`
            );
        }
        if (Log)
            Log.debug(
                "[Labels] Preparing labels for",
                layerId,
                "showImmediately:",
                showImmediately
            );
        try {
            await _doEnableLabels(this, layerId, labelConfig, showImmediately);
        } catch (err) {
            if (Log) Log.error("[Labels] Error preparing labels:", err);
            console.error("[Labels] Stack trace:", (err as Error).stack);
        }
    },

    disableLabels(layerId: string): void {
        if (!layerId) return;
        const layerState = _state.layers.get(layerId);
        if (!layerState) return;
        if (Log) Log.debug("[Labels] Disabling labels for", layerId);
        if (layerState.tooltips) {
            layerState.tooltips.forEach((t: unknown) => {
                try {
                    if ((t as any)?.remove) (t as any).remove();
                } catch (_e) {
                    /* ignore */
                }
            });
            layerState.tooltips.clear();
        }
        layerState.enabled = false;
    },

    _hideLabelsForLayer(layerId: string): void {
        if (!layerId) return;
        const layerState = _state.layers.get(layerId);
        if (!layerState) return;
        if (layerState.tooltips) {
            layerState.tooltips.forEach((t: unknown) => {
                try {
                    if ((t as any)?.remove) (t as any).remove();
                } catch (_e) {
                    /* ignore */
                }
            });
            layerState.tooltips.clear();
        }
    },

    toggleLabels(layerId: string): boolean {
        if (!layerId) return false;
        const layerState = _state.layers.get(layerId);
        if (!layerState) return false;
        const layerData = (this as any)._getLayerData(layerId);
        if ((layerData as any)?.currentStyle?.label?.enabled !== true) return false;
        if (layerState.enabled) {
            (this as any)._hideLabelsForLayer(layerId);
            layerState.enabled = false;
            return false;
        }
        layerState.enabled = true;
        (this as any).refreshLabels(layerId);
        return true;
    },

    hasLabelConfig(layerId: string): boolean {
        return _state.layers.has(layerId);
    },

    areLabelsEnabled(layerId: string): boolean {
        const layerState = _state.layers.get(layerId);
        return layerState ? layerState.enabled : false;
    },

    refreshLabels(layerId: string): void {
        if (!layerId) return;
        const layerState = _state.layers.get(layerId);
        if (!layerState || !layerState.enabled) return;
        const layerData = (this as any)._getLayerData(layerId);
        if (!(layerData as any)?._visibility?.current) return;
        if (layerState.tooltips) {
            layerState.tooltips.forEach((t: unknown) => {
                try {
                    if ((t as any)?.remove) (t as any).remove();
                } catch (_e) {
                    /* ignore */
                }
            });
            layerState.tooltips.clear();
        }
        (this as any)._createLabelsForLayer(layerId);
    },

    async _createLabelsForLayer(layerId: string): Promise<void> {
        const layerState = _state.layers.get(layerId);
        if (!layerState) return;
        if (!layerState.enabled) return;
        const layerData = (this as any)._getLayerData(layerId);
        if (!_isLayerVisible(layerData)) return;
        if (!(layerData as any).layer) {
            if (Log) Log.warn("[Labels] GeoJSON layer not found:", layerId);
            return;
        }
        const map = _getMap();
        if (_isOutOfRange(this, map, layerState.config, layerState.labelStyle)) return;
        _renderTooltipsForLayer(
            layerId,
            layerData,
            layerState.config,
            layerState.labelStyle,
            layerState.tooltips
        );
    },

    _getLayerData(layerId: string): unknown {
        if (!GeoJSONCore || typeof (GeoJSONCore as any).getLayerById !== "function") return null;
        return (GeoJSONCore as any).getLayerById(layerId);
    },

    _ensureZoomListener(): void {
        if (_state.zoomListenerAttached) return;
        const map = Core && (Core as any).getMap ? (Core as any).getMap() : null;
        if (map) {
            (map as any).on("zoomend", () => {
                (this as any)._handleZoomChange({ zoom: (map as any).getZoom() });
            });
            _state.zoomListenerAttached = true;
        }
    },

    _attachLayerEvents(): void {
        if (typeof globalThis.addEventListener === "function") {
            globalThis.addEventListener("geoleaf:layer-loaded", (evt: Event) => {
                const d = (evt as CustomEvent).detail;
                if (d?.layerId) (this as any)._handleLayerLoaded(d.layerId);
            });
        }
    },

    _handleZoomChange(detail: { zoom?: number }): void {
        if (!detail) return;
        const map = _getMap();
        if (!map) return;
        const currentScale = (this as any)._calculateMapScale(map);
        _state.layers.forEach((layerState, layerId) => {
            _processZoomLayerItem(this, layerState, layerId, currentScale, detail, map);
        });
    },

    async _handleLayerLoaded(layerId: string): Promise<void> {
        const layerState = _state.layers.get(layerId);
        if (layerState?.enabled) await (this as any)._createLabelsForLayer(layerId);
    },

    _calculateMapScale(map: unknown): number {
        if (ScaleUtils && typeof ScaleUtils.calculateMapScale === "function")
            return ScaleUtils.calculateMapScale(map as any, { logger: Log as any });
        if (Log) Log.warn("[Labels] ScaleUtils.calculateMapScale unavailable");
        return 0;
    },

    _isScaleInRange(
        currentScale: number,
        minScale: number | null,
        maxScale: number | null
    ): boolean {
        if (ScaleUtils && typeof ScaleUtils.isScaleInRange === "function")
            return ScaleUtils.isScaleInRange(currentScale, minScale, maxScale, Log as any);
        if (Log) Log.warn("[Labels] ScaleUtils.isScaleInRange unavailable");
        return true;
    },

    destroy(): void {
        if (Log) Log.debug("[Labels] Destroying Labels module");
        _state.layers.forEach((_, layerId) => (this as any).disableLabels(layerId));
        _state.layers.clear();
    },
};

export { Labels };
