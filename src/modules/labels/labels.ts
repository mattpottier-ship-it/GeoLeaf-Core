/**
 * Module Labels pour GeoLeaf
 * Gestion des étiquettes flottantes sur les entités
 * @namespace Labels
 */

import { Log } from '../log/index.js';
import { Config } from '../config/config-primitives.js';
import { LabelRenderer } from './label-renderer.js';
import { isScaleInRange as _isScaleInRange, calculateMapScale as _calculateMapScale } from '../utils/scale-utils.js';
import { Core } from '../geoleaf.core.js';
import { GeoJSONCore } from '../geojson/core.js';

const ScaleUtils = { isScaleInRange: _isScaleInRange, calculateMapScale: _calculateMapScale };

interface LayerLabelState {
    enabled: boolean;
    config: Record<string, unknown>;
    labelStyle: Record<string, unknown>;
    tooltips: Map<string, unknown>;
}

const _state: { layers: Map<string, LayerLabelState>; zoomListenerAttached: boolean } = {
    layers: new Map(),
    zoomListenerAttached: false
};

const Labels = {
    init(options: Record<string, unknown> = {}): void {
        if (Log) Log.debug("[Labels] Initialisation du module Labels");
        (this as any)._attachLayerEvents();
        if (Log) Log.debug("[Labels] Module Labels initialisé");
    },

    initializeLayerLabels(layerId: string): void {
        if (!layerId) return;
        const layerData = (this as any)._getLayerData(layerId);
        if (!layerData) return;
        (this as any)._hideLabelsForLayer(layerId);
        _state.layers.delete(layerId);
        if ((layerData as any).currentStyle?.label?.enabled !== true) {
            if (Log) Log.debug("[Labels.initialize] Style sans labels ou labels désactivés pour", layerId);
            return;
        }
        const visibleByDefault = (layerData as any).currentStyle.label.visibleByDefault === true;
        if (!visibleByDefault) {
            if (Log) Log.debug("[Labels.initialize] Labels désactivés par défaut pour", layerId);
            return (this as any).enableLabels(layerId, {}, false);
        }
        const isLayerVisible = (layerData as any)._visibility?.current === true;
        if (!isLayerVisible) {
            if (Log) Log.debug("[Labels.initialize] Labels configurés mais couche invisible pour", layerId);
            return (this as any).enableLabels(layerId, {}, false);
        }
        if (Log) Log.debug("[Labels.initialize] Initialisation labels visibles pour", layerId);
        return (this as any).enableLabels(layerId, {}, true);
    },

    async enableLabels(layerId: string, labelConfig: Record<string, unknown> = {}, showImmediately = true): Promise<void> {
        if (!layerId) {
            if (Log) Log.warn("[Labels] enableLabels: layerId manquant");
            return;
        }
        if (labelConfig && (labelConfig as any).styleFile) {
            console.error("Configuration obsolète: labels.styleFile détecté pour", layerId);
            throw new Error(`Configuration obsolète: labels.styleFile détecté dans la couche ${layerId}`);
        }
        if (Log) Log.debug("[Labels] Préparation labels pour", layerId, "showImmediately:", showImmediately);
        try {
            const layerData = (this as any)._getLayerData(layerId);
            let labelStyleConfig: Record<string, unknown> | null = null;
            if (layerData?.currentStyle?.label) {
                const integratedLabel = (layerData.currentStyle as any).label;
                if (integratedLabel.enabled === true) {
                    labelStyleConfig = integratedLabel;
                    if ((layerData.currentStyle as any).labelScale)
                        (labelStyleConfig as any).labelScale = (layerData.currentStyle as any).labelScale;
                } else {
                    if (Log) Log.debug("[Labels] Labels intégrés désactivés pour", layerId);
                    return;
                }
            } else if (labelConfig && (labelConfig as any).enabled && (labelConfig as any).labelId) {
                labelStyleConfig = {
                    enabled: true,
                    field: (labelConfig as any).labelId,
                    font: (labelConfig as any).font || { family: "Arial", sizePt: 10, weight: 50, bold: false, italic: false },
                    color: (labelConfig as any).color || "#000000",
                    opacity: (labelConfig as any).opacity || 1.0,
                    buffer: (labelConfig as any).buffer || { enabled: false },
                    background: (labelConfig as any).background || { enabled: false },
                    offset: (labelConfig as any).offset || { distancePx: 0 }
                };
            } else {
                if (Log) Log.debug("[Labels] Aucun label configuré pour", layerId);
                return;
            }
            const effectiveShowImmediately = (labelStyleConfig as any).visibleByDefault !== undefined
                ? (labelStyleConfig as any).visibleByDefault : showImmediately;
            _state.layers.set(layerId, {
                enabled: effectiveShowImmediately,
                config: labelConfig,
                labelStyle: labelStyleConfig as Record<string, unknown>,
                tooltips: new Map()
            });
            let shouldShowLabels = effectiveShowImmediately;
            if (layerData && (layerData as any)._visibility) {
                shouldShowLabels = effectiveShowImmediately && (layerData as any)._visibility.current === true;
            }
            if (shouldShowLabels) await (this as any)._createLabelsForLayer(layerId);
            (this as any)._ensureZoomListener();
            if (Log) Log.debug("[Labels] Config labels préparée pour", layerId);
        } catch (err) {
            if (Log) Log.error("[Labels] Erreur préparation labels:", err);
            console.error("[Labels] Stack trace:", (err as Error).stack);
        }
    },

    disableLabels(layerId: string): void {
        if (!layerId) return;
        const layerState = _state.layers.get(layerId);
        if (!layerState) return;
        if (Log) Log.debug("[Labels] Désactivation des labels pour", layerId);
        if (layerState.tooltips) {
            layerState.tooltips.forEach((t: unknown) => { try { if ((t as any)?.remove) (t as any).remove(); } catch (_e) { /* ignore */ } });
            layerState.tooltips.clear();
        }
        layerState.enabled = false;
    },

    _hideLabelsForLayer(layerId: string): void {
        if (!layerId) return;
        const layerState = _state.layers.get(layerId);
        if (!layerState) return;
        if (layerState.tooltips) {
            layerState.tooltips.forEach((t: unknown) => { try { if ((t as any)?.remove) (t as any).remove(); } catch (_e) { /* ignore */ } });
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

    hasLabelConfig(layerId: string): boolean { return _state.layers.has(layerId); },

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
            layerState.tooltips.forEach((t: unknown) => { try { if ((t as any)?.remove) (t as any).remove(); } catch (_e) { /* ignore */ } });
            layerState.tooltips.clear();
        }
        (this as any)._createLabelsForLayer(layerId);
    },

    async _createLabelsForLayer(layerId: string): Promise<void> {
        const layerState = _state.layers.get(layerId);
        if (!layerState || !layerState.enabled) return;
        const layerData = (this as any)._getLayerData(layerId);
        if (!(layerData as any)?._visibility?.current) return;
        if (!(layerData as any).layer) {
            if (Log) Log.warn("[Labels] Couche GeoJSON non trouvée:", layerId);
            return;
        }
        const { config, labelStyle } = layerState;
        const map = Core && (Core as any).getMap ? (Core as any).getMap() : null;
        if (map && (labelStyle as any).labelScale) {
            const { minScale, maxScale } = (labelStyle as any).labelScale;
            if (minScale != null || maxScale != null) {
                const currentScale = (this as any)._calculateMapScale(map);
                if (!(this as any)._isScaleInRange(currentScale, minScale as number | null, maxScale as number | null)) return;
            }
        } else if (map && (config as any).minZoom !== undefined && (config as any).maxZoom !== undefined) {
            const currentZoom = (map as any).getZoom();
            if (currentZoom < (config as any).minZoom || currentZoom > (config as any).maxZoom) return;
        }
        if (LabelRenderer) {
            LabelRenderer.createTooltipsForLayer(
                layerId,
                (layerData as any).layer,
                { labelId: (labelStyle as any).field || (config as any).labelId, minZoom: (config as any).minZoom, maxZoom: (config as any).maxZoom },
                labelStyle as any,
                layerState.tooltips
            );
        } else {
            if (Log) Log.error("[Labels] GeoLeaf._LabelRenderer non disponible!");
        }
    },

    _getLayerData(layerId: string): unknown {
        if (!GeoJSONCore || typeof (GeoJSONCore as any).getLayerById !== "function") return null;
        return (GeoJSONCore as any).getLayerById(layerId);
    },

    _ensureZoomListener(): void {
        if (_state.zoomListenerAttached) return;
        const map = Core && (Core as any).getMap ? (Core as any).getMap() : null;
        if (map) {
            (map as any).on('zoomend', () => { (this as any)._handleZoomChange({ zoom: (map as any).getZoom() }); });
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
        const map = Core && (Core as any).getMap ? (Core as any).getMap() : null;
        if (!map) return;
        const currentScale = (this as any)._calculateMapScale(map);
        _state.layers.forEach((layerState, layerId) => {
            if (!layerState.enabled) return;
            const layerData = (this as any)._getLayerData(layerId);
            if (!(layerData as any)?._visibility?.current) {
                if (layerState.tooltips?.size) {
                    layerState.tooltips.forEach((t: unknown) => { if ((t as any)?.remove) (t as any).remove(); });
                    layerState.tooltips.clear();
                }
                return;
            }
            const { labelStyle, config } = layerState;
            let shouldShow = true;
            if ((labelStyle as any)?.labelScale) {
                const { minScale, maxScale } = (labelStyle as any).labelScale;
                shouldShow = (this as any)._isScaleInRange(currentScale, minScale as number | null, maxScale as number | null);
            } else if ((config as any).minZoom !== undefined && (config as any).maxZoom !== undefined) {
                const zoom = detail.zoom !== undefined ? detail.zoom : (map as any).getZoom();
                shouldShow = zoom >= (config as any).minZoom && zoom <= (config as any).maxZoom;
            }
            const isShowing = layerState.tooltips && layerState.tooltips.size > 0;
            if (shouldShow && !isShowing) (this as any)._createLabelsForLayer(layerId);
            else if (!shouldShow && isShowing) {
                layerState.tooltips.forEach((t: unknown) => { if ((t as any)?.remove) (t as any).remove(); });
                layerState.tooltips.clear();
            }
        });
    },

    async _handleLayerLoaded(layerId: string): Promise<void> {
        const layerState = _state.layers.get(layerId);
        if (layerState?.enabled) await (this as any)._createLabelsForLayer(layerId);
    },

    _calculateMapScale(map: unknown): number {
        if (ScaleUtils && typeof ScaleUtils.calculateMapScale === "function") return ScaleUtils.calculateMapScale(map as any, { logger: Log as any });
        if (Log) Log.warn('[Labels] ScaleUtils.calculateMapScale unavailable');
        return 0;
    },

    _isScaleInRange(currentScale: number, minScale: number | null, maxScale: number | null): boolean {
        if (ScaleUtils && typeof ScaleUtils.isScaleInRange === "function") return ScaleUtils.isScaleInRange(currentScale, minScale, maxScale, Log as any);
        if (Log) Log.warn('[Labels] ScaleUtils.isScaleInRange unavailable');
        return true;
    },

    destroy(): void {
        if (Log) Log.debug("[Labels] Destruction du module Labels");
        _state.layers.forEach((_, layerId) => (this as any).disableLabels(layerId));
        _state.layers.clear();
    }
};

export { Labels };
