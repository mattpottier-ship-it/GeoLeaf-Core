/**
 * Module Renderer pour LayerManager — Orchestrateur
 * Delegates aux sous-modules specialized (split Sprint 1 roadmap).
 *
 * Sous-modules:
 * - visibility-checker.ts : _checkLayerVisibility
 * - toggle-handler.ts     : _attachToggleHandler
 * - item-controls.ts      : _renderItems, _renderToggleControls, _createToggleFallback, interfaces
 * - section-renderer.ts   : renderSections
 *
 * EXPOSE:
 * - LMRenderer (object)
 * - LMSection, LMItem (re-export interfaces pour compatibility control.ts)
 */
"use strict";

import { Log } from "../log/index.js";
import { GeoJSONShared } from "../shared/geojson-state.js";
import { GeoJSONCore } from "../geojson/core.js";
import { renderSections } from "./section-renderer.js";
import { renderItems, renderToggleControls, createToggleFallback } from "./item-controls.js";
import type { LMSection, LMItem } from "./item-controls.js";
import { attachToggleHandler } from "./toggle-handler.js";
import { checkLayerVisibility } from "./visibility-checker.js";

// Re-exporter les interfaces pour compatibility (control.ts importe from ./renderer.js)
export type { LMSection, LMItem };

const _LayerManagerRenderer = {
    renderSections(bodyEl: HTMLElement | null, sections: LMSection[]) {
        renderSections(bodyEl, sections);
    },

    /**
     * Synchronise the state des toggles existings sans re-generate le DOM.
     * Used after applying a theme to update the toggles.
     * @public
     */
    syncToggles() {
        // Trouver tous les items de layer in the DOM
        const layerItems = document.querySelectorAll("[data-layer-id]");

        if (Log) Log.debug(`[LayerManager Renderer] Synchronizing ${layerItems.length} toggles`);

        layerItems.forEach((itemEl) => {
            const layerId = itemEl.getAttribute("data-layer-id");
            if (!layerId) return;

            // Retrieve les infos de visibility for the log
            const layerData = GeoJSONCore?.getLayerById(layerId);
            const isVisible = checkLayerVisibility(layerId);

            if (Log)
                Log.debug(`[LayerManager Renderer] Layer ${layerId}:`, {
                    isVisible,
                    hasLayerData: !!layerData,
                    hasVisibility: !!(layerData && layerData._visibility),
                    currentValue: layerData?._visibility?.current,
                    onMap:
                        layerData?.layer &&
                        (GeoJSONShared.state as { map?: { hasLayer: (l: unknown) => boolean } }).map
                            ? (
                                  GeoJSONShared.state as {
                                      map: { hasLayer: (l: unknown) => boolean };
                                  }
                              ).map.hasLayer(layerData.layer)
                            : false,
                });

            // Mettre up to date la class gl-layer--hidden
            if (isVisible) {
                itemEl.classList.remove("gl-layer--hidden");
            } else {
                itemEl.classList.add("gl-layer--hidden");
            }

            // Trouver et update le toggle button
            const toggleBtn = itemEl.querySelector(".gl-layer-manager__item-toggle");
            if (toggleBtn) {
                toggleBtn.setAttribute("aria-pressed", isVisible ? "true" : "false");

                const onClass = "gl-layer-manager__item-toggle--on";
                if (isVisible) {
                    toggleBtn.classList.add(onClass);
                } else {
                    toggleBtn.classList.remove(onClass);
                }
            }
        });

        if (Log) Log.debug("[LayerManager Renderer] Toggle states synchronized");
    },

    _renderItems(section: LMSection, sectionEl: HTMLElement) {
        renderItems(section, sectionEl);
    },

    _renderToggleControls(item: LMItem, mainRow: HTMLElement, itemEl: HTMLElement) {
        renderToggleControls(item, mainRow, itemEl);
    },

    _checkLayerVisibility(layerId: string): boolean {
        return checkLayerVisibility(layerId);
    },

    _attachToggleHandler(
        toggleBtn: HTMLButtonElement & { _toggleHandlerAttached?: boolean; _isToggling?: boolean },
        itemId: string
    ) {
        attachToggleHandler(toggleBtn, itemId, checkLayerVisibility);
    },

    _createToggleFallback(container: HTMLElement, isActive: boolean): HTMLElement {
        return createToggleFallback(container, isActive);
    },
};

const LMRenderer = _LayerManagerRenderer;
export { LMRenderer };
