// @ts-nocheck — migration TS, typage progressif
/**
 * GeoLeaf UI Filter Panel - Proximity
 * Orchestrateur of the module de proximity (panel + toolbar).
 * The state and domain logic are delegated to sub-modules:
 *   - proximity-state.ts      : shared state
 *   - proximity-circle.ts     : creation/removal des elements cartographicals
 *   - proximity-gps-mode.ts   : activation GPS (panel + toolbar)
 *   - proximity-manual-mode.ts: activation manuelle (panel + toolbar)
 *   - proximity-deactivation.ts: deactivation/cleanup
 *
 * @module ui/filter-panel/proximity
 */
"use strict";

import { getLog } from "../../utils/general-utils.js";
import { getLabel } from "../../i18n/i18n.js";
import { events } from "../../utils/event-listener-manager.js";
import { ProximityState } from "./proximity-state.js";
import { removeCircleAndMarker } from "./proximity-circle.js";
import { activateGPSMode, hasRecentGPS } from "./proximity-gps-mode.js";
import { activateManualMode } from "./proximity-manual-mode.js";
import {
    cleanupMapElements,
    deactivatePanel,
    resetProximity as _resetProximity,
} from "./proximity-deactivation.js";

const FilterPanelProximity: any = {};

/**
 * Initializes the feature de proximity
 * @param {L.Map} map - Instance de carte Leaflet
 */
function _attachProximityEvents(Log: any, map: any): void {
    const inputHandler = function (evt: any) {
        const slider = evt.target.closest("[data-filter-proximity-radius]");
        if (!slider) return;
        const proximityControl = slider.closest(".gl-filter-panel__proximity");
        if (!proximityControl) return;
        const wrapper = proximityControl.closest("[data-gl-filter-id='proximity']");
        if (!wrapper) return;
        const newRadius = parseFloat(slider.value);
        wrapper.setAttribute("data-proximity-radius", newRadius);
        if (ProximityState.circle) ProximityState.circle.setRadius(newRadius * 1000);
    };
    const clickHandler = function (evt: any) {
        const btn = evt.target.closest("[data-filter-proximity-btn]");
        if (!btn) return;
        evt.preventDefault();
        FilterPanelProximity.toggleProximityMode(btn, map);
    };
    if (events) {
        ProximityState.eventCleanups.push(
            events.on(document, "input", inputHandler, false, "ProximityFilter.radiusInput")
        );
        ProximityState.eventCleanups.push(
            events.on(document, "click", clickHandler, false, "ProximityFilter.buttonClick")
        );
    } else {
        Log.warn(
            "[ProximityFilter] EventListenerManager not available - listeners will not be cleaned up"
        );
        document.addEventListener("input", inputHandler);
        document.addEventListener("click", clickHandler);
    }
}

FilterPanelProximity.initProximityFilter = function (map) {
    const Log = getLog();
    if (!map) {
        Log.warn("[GeoLeaf.UI.FilterPanel] Map not available for proximity filter");
        return;
    }
    ProximityState.mode = false;
    ProximityState.circle = null;
    ProximityState.marker = null;
    ProximityState.map = map;
    ProximityState.clickHandler = null;
    _attachProximityEvents(Log, map);
    Log.info("[GeoLeaf.UI.FilterPanel] Proximity filter initialized");
};

/**
 * Cleanup du proximity filter
 */
FilterPanelProximity.destroy = function () {
    const Log = getLog();

    if (ProximityState.eventCleanups && ProximityState.eventCleanups.length > 0) {
        ProximityState.eventCleanups.forEach((cleanup) => {
            if (typeof cleanup === "function") cleanup();
        });
        ProximityState.eventCleanups = [];
        Log.info("[ProximityFilter] Event listeners cleaned up");
    }

    if (ProximityState.map) {
        removeCircleAndMarker(ProximityState.map);
    }

    ProximityState.map = null;
    ProximityState.mode = false;
};

/**
 * Switches le mode de proximity from the panel de filtres
 * @param {HTMLElement} btn - Button de proximity
 * @param {L.Map} map - Instance de carte
 */
FilterPanelProximity.toggleProximityMode = function (btn, map) {
    ProximityState.mode = !ProximityState.mode;

    const container = btn.closest(".gl-filter-panel__proximity");
    const rangeWrapper = container.querySelector(".gl-filter-panel__proximity-range");
    const instruction = container.querySelector(".gl-filter-panel__proximity-instruction");

    if (ProximityState.mode) {
        btn.textContent = getLabel("ui.filter.disable");
        btn.classList.add("is-active");
        if (rangeWrapper) rangeWrapper.style.display = "block";
        if (instruction) instruction.style.display = "block";

        const wrapper = container.closest("[data-gl-filter-id='proximity']");
        const radiusInput = container.querySelector("[data-filter-proximity-radius]");
        const radiusKm = radiusInput ? parseFloat(radiusInput.value) : 10;

        if (hasRecentGPS()) {
            activateGPSMode(map, wrapper, radiusKm);
        } else {
            activateManualMode(map, wrapper, () => {
                const inp = container.querySelector("[data-filter-proximity-radius]");
                return inp ? parseFloat(inp.value) : 10;
            });
        }
    } else {
        deactivatePanel(btn, container, map);
    }
};

/**
 * Active le mode GPS automatic (API public preserved pour compatibility)
 * @param {HTMLElement} container - Container de proximity
 * @param {L.Map} map - Instance de carte
 */
FilterPanelProximity.activateGPSMode = function (container, map) {
    const wrapper = container.closest("[data-gl-filter-id='proximity']");
    if (!wrapper) return;
    const radiusInput = container.querySelector("[data-filter-proximity-radius]");
    const radiusKm = radiusInput ? parseFloat(radiusInput.value) : 10;
    activateGPSMode(map, wrapper, radiusKm);
};

/**
 * Active le mode manuel (API public preserved pour compatibility)
 * @param {HTMLElement} container - Container de proximity
 * @param {L.Map} map - Instance de carte
 */
FilterPanelProximity.activateManualMode = function (container, map) {
    const wrapper = container.closest("[data-gl-filter-id='proximity']");
    if (!wrapper) return;
    activateManualMode(map, wrapper, () => {
        const inp = container.querySelector("[data-filter-proximity-radius]");
        return inp ? parseFloat(inp.value) : 10;
    });
};

/**
 * Disables proximity mode (public API preserved for compatibility)
 * @param {HTMLElement} btn - Button de proximity
 * @param {HTMLElement} container - Container de proximity
 * @param {L.Map} map - Instance de carte
 */
FilterPanelProximity.deactivateProximityMode = function (btn, container, map) {
    deactivatePanel(btn, container, map);
};

/**
 * Reinitializes completement le mode proximity from l'outer (ex. button "Reset").
 */
FilterPanelProximity.resetProximity = _resetProximity;

/**
 * Active/deactivates la recherche par proximity from the bar mobile,
 * sans dependency au DOM du filter panels.
 * Utilise un wrapper DOM virtuel pour compatibility with the moteur de filtres.
 *
 * @param {L.Map} map - Instance de carte Leaflet
 * @param {number} [defaultRadius=10] - Radius by default en km
 * @returns {boolean} Nouvel state active
 */
FilterPanelProximity.toggleProximityToolbar = function (
    map,
    defaultRadius,
    options?: { onPointPlaced?: () => void }
) {
    const Log = getLog();
    defaultRadius = defaultRadius || 10;
    ProximityState.mode = !ProximityState.mode;

    const effectiveRadius = ProximityState.pendingRadius ?? defaultRadius;

    // Wrapper virtuel compatible with the moteur de filtres
    let wrapper = document.getElementById("gl-proximity-toolbar-wrapper");
    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = "gl-proximity-toolbar-wrapper";
        wrapper.setAttribute("data-gl-filter-id", "proximity");
        wrapper.style.display = "none";
        document.body.appendChild(wrapper);
    }
    wrapper.setAttribute("data-proximity-radius", String(effectiveRadius));

    if (ProximityState.mode) {
        if (hasRecentGPS()) {
            activateGPSMode(map, wrapper, effectiveRadius, options);
        } else {
            activateManualMode(
                map,
                wrapper,
                () => ProximityState.pendingRadius ?? defaultRadius,
                options
            );
        }
    } else {
        // Deactivation toolbar
        ProximityState.pendingRadius = null;
        cleanupMapElements(map);
        const existingWrapper = document.getElementById("gl-proximity-toolbar-wrapper");
        if (existingWrapper) {
            existingWrapper.removeAttribute("data-proximity-active");
            existingWrapper.removeAttribute("data-proximity-lat");
            existingWrapper.removeAttribute("data-proximity-lng");
        }
        Log.info("[GeoLeaf.Toolbar] Proximity disabled");
    }

    return ProximityState.mode;
};

/**
 * Updates the radius of the active proximity circle without recreating it.
 * Used by the mobile banner slider.
 * @param {number} radiusKm - New radius in kilometers
 */
FilterPanelProximity.setProximityRadius = function (radiusKm: number): void {
    /* Memorize the radius even if the circle doesn't exist yet (marker not placed) */
    ProximityState.pendingRadius = radiusKm;
    const wrapper = document.getElementById("gl-proximity-toolbar-wrapper");
    if (wrapper) wrapper.setAttribute("data-proximity-radius", String(radiusKm));
    if (!ProximityState.mode || !ProximityState.circle) return;
    ProximityState.circle.setRadius(radiusKm * 1000);
};

// Proxy _eventCleanups → ProximityState.eventCleanups pour compatibility tests
Object.defineProperty(FilterPanelProximity, "_eventCleanups", {
    get: () => ProximityState.eventCleanups,
    set: (v) => {
        ProximityState.eventCleanups = v;
    },
    configurable: true,
    enumerable: false,
});

export { FilterPanelProximity };
