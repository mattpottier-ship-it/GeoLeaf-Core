/**
 * Centralized manager for the button de label in the Layer Manager
 * @module labels/label-button-manager
 */

import { Log } from "../log/index.js";
import { _UIComponents } from "../ui/components.js";
import { GeoJSONCore } from "../geojson/core.js";
import { Labels } from "./labels.js";
import { getLabel } from "../i18n/i18n.js";

interface SyncState {
    layerId: string;
    layerExists: boolean;
    layerVisible: boolean;
    labelEnabled: boolean;
    areLabelsActive: boolean;
}

function _buildLabelToggleButton(L: any): HTMLButtonElement {
    const labelToggle = L.DomUtil.create(
        "button",
        "gl-layer-manager__label-toggle"
    ) as HTMLButtonElement;
    labelToggle.type = "button";
    labelToggle.setAttribute("aria-label", getLabel("aria.labels.toggle"));
    labelToggle.disabled = true;
    labelToggle.classList.add("gl-layer-manager__label-toggle--disabled");
    const iconSpan = document.createElement("span");
    iconSpan.className = "gl-layer-manager__label-toggle-icon";
    iconSpan.textContent = "🏷️";
    labelToggle.appendChild(iconSpan);
    labelToggle.title = getLabel("aria.labels.toggle");
    return labelToggle;
}

function _buildLabelToggleHandler(
    labelToggle: HTMLButtonElement,
    layerId: string,
    L: any
): (ev: Event) => void {
    return function (ev: Event) {
        if (L?.DomEvent) L.DomEvent.stopPropagation(ev);
        ev.preventDefault();
        if (labelToggle.disabled) return;
        try {
            const layerData = (GeoJSONCore as any)?.getLayerById?.(layerId);
            const labelEnabled = (layerData as any)?.currentStyle?.label?.enabled === true;
            if (!labelEnabled) return;
            if (Labels?.toggleLabels) {
                const newState = Labels.toggleLabels(layerId);
                if (newState) {
                    labelToggle.classList.add("gl-layer-manager__label-toggle--on");
                    labelToggle.setAttribute("aria-pressed", "true");
                } else {
                    labelToggle.classList.remove("gl-layer-manager__label-toggle--on");
                    labelToggle.setAttribute("aria-pressed", "false");
                }
            }
        } catch (err) {
            if (Log) Log.warn("[LabelButtonManager] Error toggling labels:", err);
        }
    };
}

const LabelButtonManager: {
    createButton(layerId: string, controlsContainer: HTMLElement): HTMLElement | null;
    sync(layerId: string): void;
    _doSync(layerId: string): void;
    _getState(layerId: string): SyncState;
    _applyState(button: HTMLElement, state: SyncState): void;
    syncImmediate(layerId: string): void;
    _syncTimeouts?: Map<string, ReturnType<typeof setTimeout>>;
} = {
    createButton(layerId: string, controlsContainer: HTMLElement): HTMLElement | null {
        if (!layerId || !controlsContainer) {
            if (Log)
                Log.warn("[LabelButtonManager] createButton: missing parameters", {
                    layerId,
                    hasContainer: !!controlsContainer,
                });
            return null;
        }
        const existingButton = controlsContainer.querySelector(".gl-layer-manager__label-toggle");
        if (existingButton) return existingButton as HTMLElement;
        const L = (globalThis as any).L;
        if (!L?.DomUtil) return null;
        const labelToggle = _buildLabelToggleButton(L);
        const onLabelToggle = _buildLabelToggleHandler(labelToggle, layerId, L);
        _UIComponents.attachEventHandler(labelToggle, "click", onLabelToggle);
        const visibilityToggle = controlsContainer.querySelector(".gl-layer-manager__item-toggle");
        if (visibilityToggle) controlsContainer.insertBefore(labelToggle, visibilityToggle);
        else controlsContainer.appendChild(labelToggle);
        return labelToggle;
    },

    sync(layerId: string): void {
        if (!layerId) return;
        if (this._syncTimeouts?.has(layerId)) {
            clearTimeout(this._syncTimeouts.get(layerId)!);
        }
        if (!this._syncTimeouts) this._syncTimeouts = new Map();
        const timeout = setTimeout(() => {
            this._syncTimeouts!.delete(layerId);
            this._doSync(layerId);
        }, 300);
        this._syncTimeouts.set(layerId, timeout);
    },

    _doSync(layerId: string): void {
        if (!layerId) return;
        let button = document.querySelector(
            `[data-layer-id="${layerId}"] .gl-layer-manager__label-toggle`
        ) as HTMLElement | null;
        if (!button) {
            const layerItem = document.querySelector(`[data-layer-id="${layerId}"]`);
            if (!layerItem) return;
            const controlsContainer = layerItem.querySelector(".gl-layer-manager__item-controls");
            if (controlsContainer) {
                button = controlsContainer.querySelector(
                    ".gl-layer-manager__label-toggle"
                ) as HTMLElement | null;
                if (!button) button = this.createButton(layerId, controlsContainer as HTMLElement);
            }
        }
        if (!button) return;
        const state = this._getState(layerId);
        this._applyState(button as HTMLButtonElement, state);
    },

    _getState(layerId: string): SyncState {
        const layerData = (GeoJSONCore as any)?.getLayerById?.(layerId);
        return {
            layerId,
            layerExists: !!layerData,
            layerVisible: (layerData as any)?._visibility?.current === true,
            labelEnabled: (layerData as any)?.currentStyle?.label?.enabled === true,
            areLabelsActive: Labels?.areLabelsEnabled?.(layerId) || false,
        };
    },

    _applyState(button: HTMLButtonElement, state: SyncState): void {
        const canUseLabels = state.labelEnabled && state.layerVisible;
        if (canUseLabels) {
            button.disabled = false;
            button.classList.remove("gl-layer-manager__label-toggle--disabled");
            const shouldAppearOn = state.areLabelsActive && state.layerVisible;
            if (shouldAppearOn) {
                button.classList.add("gl-layer-manager__label-toggle--on");
                button.setAttribute("aria-pressed", "true");
            } else {
                button.classList.remove("gl-layer-manager__label-toggle--on");
                button.setAttribute("aria-pressed", "false");
            }
        } else {
            button.disabled = true;
            button.classList.add("gl-layer-manager__label-toggle--disabled");
            button.classList.remove("gl-layer-manager__label-toggle--on");
            button.setAttribute("aria-pressed", "false");
        }
    },

    syncImmediate(layerId: string): void {
        if (!layerId) return;
        if (this._syncTimeouts?.has(layerId)) {
            clearTimeout(this._syncTimeouts.get(layerId)!);
            this._syncTimeouts.delete(layerId);
        }
        this._doSync(layerId);
    },
};

export { LabelButtonManager };
