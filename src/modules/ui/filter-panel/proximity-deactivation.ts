// @ts-nocheck — migration TS, typage progressif
/**
 * GeoLeaf UI Filter Panel - Proximity Deactivation
 * Deactivation et cleanup du mode proximity — shared panel + toolbar.
 *
 * @module ui/filter-panel/proximity-deactivation
 */
"use strict";

import { getLog } from "../../utils/general-utils.js";
import { getLabel } from "../../i18n/i18n.js";
import { ProximityState } from "./proximity-state.js";
import { removeCircleAndMarker } from "./proximity-circle.js";

/**
 * Nettoie les elements cartographicals : circle, marker, handler de click, cursor.
 * N'agit pas sur le DOM du panel.
 */
export function cleanupMapElements(map: any): void {
    map.getContainer().style.cursor = "";

    if (ProximityState.clickHandler) {
        map.off("click", ProximityState.clickHandler);
        ProximityState.clickHandler = null;
    }

    removeCircleAndMarker(map);
}

/**
 * Deactivates le mode proximity from the panel de filtres.
 * Remet l'UI panel to son initial state et nettoie the map.
 */
export function deactivatePanel(btn: HTMLElement, container: HTMLElement, map: any): void {
    const Log = getLog();

    btn.textContent = getLabel("ui.filter.activate");
    btn.classList.remove("is-active");

    const rangeWrapper = container.querySelector(
        ".gl-filter-panel__proximity-range"
    ) as HTMLElement | null;
    const instruction = container.querySelector(
        ".gl-filter-panel__proximity-instruction"
    ) as HTMLElement | null;

    if (rangeWrapper) rangeWrapper.style.display = "none";
    if (instruction) instruction.style.display = "none";

    cleanupMapElements(map);

    // Reset le slider to sa value by default
    const radiusInput = container.querySelector(
        "[data-filter-proximity-radius]"
    ) as HTMLInputElement | null;
    if (radiusInput) {
        const defaultVal =
            radiusInput.getAttribute("data-proximity-radius-default") || radiusInput.min || "10";
        radiusInput.value = defaultVal;
        const rangeValueSpan = radiusInput
            .closest(".gl-filter-panel__range-wrapper")
            ?.querySelector(".gl-filter-panel__range-value") as HTMLElement | null;
        if (rangeValueSpan) rangeValueSpan.textContent = defaultVal;
    }

    // Retirer les attributes data-proximity-* du wrapper
    const wrapper = container.closest("[data-gl-filter-id='proximity']");
    if (wrapper) {
        wrapper.removeAttribute("data-proximity-active");
        wrapper.removeAttribute("data-proximity-lat");
        wrapper.removeAttribute("data-proximity-lng");
        wrapper.removeAttribute("data-proximity-radius");
    }

    ProximityState.pendingRadius = null;

    Log.info("[GeoLeaf.Proximity] Proximity mode disabled (panel)");
}

/**
 * Reinitializes le mode proximity from l'outer (ex. button "Reset").
 * Ne key qu'aux elements cartographicals, pas au DOM du panel.
 */
export function resetProximity(): void {
    if (!ProximityState.map) return;
    cleanupMapElements(ProximityState.map);
    ProximityState.mode = false;
}
