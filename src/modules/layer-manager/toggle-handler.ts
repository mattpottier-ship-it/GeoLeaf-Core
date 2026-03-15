/**
 * LayerManager — Toggle Handler
 * Gestion du click sur le button toggle d'a layer (show/hide, lazy-load, label-btn sync).
 *
 * Extrait de layer-manager/renderer.ts (split Sprint 1 roadmap).
 *
 * @module geoleaf.layer-manager.toggle-handler
 */
"use strict";

import { Log } from "../log/index.js";
import { GeoJSONCore } from "../geojson/core.js";
import { ThemeApplierCore } from "../themes/theme-applier/core.js";

const L =
    typeof globalThis !== "undefined"
        ? (
              globalThis as unknown as {
                  L?: {
                      DomUtil: {
                          create: (tag: string, cls: string, parent?: HTMLElement) => HTMLElement;
                      };
                      DomEvent: {
                          on: (el: HTMLElement, ev: string, fn: (ev: Event) => void) => void;
                          stopPropagation: (ev: Event) => void;
                          preventDefault: (ev: Event) => void;
                          disableClickPropagation: (el: HTMLElement) => void;
                      };
                  };
              }
          ).L
        : undefined;

type ToggleBtn = HTMLButtonElement & { _toggleHandlerAttached?: boolean; _isToggling?: boolean };

function _stopEventPropagation(ev: Event) {
    if (L && L.DomEvent) {
        L.DomEvent.stopPropagation(ev);
        L.DomEvent.preventDefault(ev);
    }
}

function _findLabelBtn(layerItem: Element | null, toggleBtn: ToggleBtn): Element | null {
    if (layerItem) {
        const btn = layerItem.querySelector(".gl-layer-manager__label-toggle");
        if (btn) return btn;
    }
    if (toggleBtn.parentElement) {
        return toggleBtn.parentElement.querySelector(".gl-layer-manager__label-toggle");
    }
    return null;
}

function _enableLabelBtnIfApplicable(labelBtn: Element, itemId: string) {
    const ld =
        GeoJSONCore && (GeoJSONCore as any).getLayerById
            ? (GeoJSONCore as any).getLayerById(itemId)
            : null;
    if (!ld) return;
    const labelEnabled =
        ld.currentStyle && ld.currentStyle.label && ld.currentStyle.label.enabled === true;
    if (!labelEnabled) return;
    (labelBtn as HTMLButtonElement).disabled = false;
    labelBtn.classList.remove("gl-layer-manager__label-toggle--disabled");
}

function _handleLayerHide(toggleBtn: ToggleBtn, layerItem: Element | null, itemId: string) {
    GeoJSONCore.hideLayer(itemId);
    toggleBtn.setAttribute("aria-pressed", "false");
    toggleBtn.classList.remove("gl-layer-manager__item-toggle--on");
    if (layerItem) layerItem.classList.add("gl-layer--hidden");
    const labelBtn = _findLabelBtn(layerItem, toggleBtn);
    if (labelBtn) {
        (labelBtn as HTMLButtonElement).disabled = true;
        labelBtn.classList.add("gl-layer-manager__label-toggle--disabled");
        labelBtn.classList.remove("gl-layer-manager__label-toggle--on");
        labelBtn.setAttribute("aria-pressed", "false");
    } else {
        if (Log) Log.warn("[LayerManager] Label button NOT FOUND for deactivation:", itemId);
    }
}

function _handleLayerShow(toggleBtn: ToggleBtn, layerItem: Element | null, itemId: string) {
    GeoJSONCore.showLayer(itemId);
    toggleBtn.setAttribute("aria-pressed", "true");
    toggleBtn.classList.add("gl-layer-manager__item-toggle--on");
    if (layerItem) layerItem.classList.remove("gl-layer--hidden");
    const labelBtn = _findLabelBtn(layerItem, toggleBtn);
    if (labelBtn) {
        _enableLabelBtnIfApplicable(labelBtn, itemId);
    }
}

function _afterLazyLoadSuccess(toggleBtn: ToggleBtn, itemId: string, loadedLayer: unknown) {
    toggleBtn.classList.remove("gl-layer-manager__item-toggle--loading");
    toggleBtn.disabled = false;
    if (!loadedLayer) {
        if (Log) Log.warn("[LayerManager] Layer loading failed:", itemId);
        return;
    }
    if (Log) Log.info("[LayerManager] Layer loaded successfully:", itemId);
    GeoJSONCore.showLayer(itemId);
    toggleBtn.setAttribute("aria-pressed", "true");
    toggleBtn.classList.add("gl-layer-manager__item-toggle--on");
    const layerItem = document.querySelector('[data-layer-id="' + itemId + '"]');
    if (layerItem) layerItem.classList.remove("gl-layer--hidden");
    const labelBtn = _findLabelBtn(layerItem, toggleBtn);
    if (labelBtn) _enableLabelBtnIfApplicable(labelBtn, itemId);
}

function _handleLazyLoad(toggleBtn: ToggleBtn, itemId: string) {
    if (Log) Log.info("[LayerManager] Layer not loaded, loading on demand:", itemId);
    toggleBtn.classList.add("gl-layer-manager__item-toggle--loading");
    toggleBtn.disabled = true;
    const loader =
        ThemeApplierCore && typeof (ThemeApplierCore as any)._loadLayerFromProfile === "function"
            ? (ThemeApplierCore as any)._loadLayerFromProfile
            : null;
    if (!loader) {
        toggleBtn.classList.remove("gl-layer-manager__item-toggle--loading");
        toggleBtn.disabled = false;
        if (Log) Log.warn("[LayerManager] ThemeApplierCore not available for loading:", itemId);
        return;
    }
    loader
        .call(ThemeApplierCore, itemId)
        .then((loadedLayer: unknown) => {
            _afterLazyLoadSuccess(toggleBtn, itemId, loadedLayer);
        })
        .catch((err: unknown) => {
            toggleBtn.classList.remove("gl-layer-manager__item-toggle--loading");
            toggleBtn.disabled = false;
            if (Log) Log.error("[LayerManager] Error loading layer:", itemId, err);
        });
}

/**
 * Attache le manager for toggle pour a layer.
 * @param toggleBtn - Le button HTML
 * @param itemId - The identifier de the layer
 * @param checkVisibility - Callback injected pour verify la visibility (avoids dependency circulaire)
 */
function attachToggleHandler(
    toggleBtn: ToggleBtn,
    itemId: string,
    checkVisibility: (id: string) => boolean
) {
    // GUARD: Check si un manager est already attached
    if (toggleBtn._toggleHandlerAttached) {
        return;
    }

    // Marquer comme attached AVANT de create le manager
    toggleBtn._toggleHandlerAttached = true;

    const onToggle = function (ev: Event) {
        if (toggleBtn._isToggling) {
            if (Log) Log.warn("[LayerManager] Toggle already in progress, blocked:", itemId);
            _stopEventPropagation(ev);
            return;
        }
        toggleBtn._isToggling = true;
        _stopEventPropagation(ev);
        setTimeout(() => {
            toggleBtn._isToggling = false;
        }, 100);
        try {
            if (!itemId || !GeoJSONCore) return;
            const layerData = GeoJSONCore.getLayerById(itemId);
            if (!layerData) {
                _handleLazyLoad(toggleBtn, itemId);
                return;
            }
            const isCurrentlyVisible = checkVisibility(itemId);
            const layerItem = document.querySelector(`[data-layer-id="${itemId}"]`);
            if (isCurrentlyVisible) {
                _handleLayerHide(toggleBtn, layerItem, itemId);
            } else {
                _handleLayerShow(toggleBtn, layerItem, itemId);
            }
        } catch (err) {
            if (Log) Log.warn("Legend toggle error :", err);
        }
    };

    // Utiliser L.DomEvent si available
    if (L && L.DomEvent) {
        L.DomEvent.on(toggleBtn, "click", onToggle);
        L.DomEvent.disableClickPropagation(toggleBtn);
    } else {
        toggleBtn.addEventListener("click", onToggle);
    }
}

export { attachToggleHandler };
export type { ToggleBtn };
