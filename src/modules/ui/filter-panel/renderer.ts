/**
 * GeoLeaf UI Filter Panel - Renderer (Orchestrateur)
 * Assemble les sous-modules et expose l'API public unchanged.
 *
 * @module ui/filter-panel/renderer
 */
"use strict";

import { getLog } from "../../utils/general-utils.js";
import { setToggleIconOpen, setToggleIconClosed } from "./svg-helpers.js";
import { FilterPanelShared } from "../../ui/filter-panel/shared.js";
import { FilterPanelApplier } from "./applier.js";
import { events } from "../../utils/event-listener-manager.js";
import { buildFilterPanelFromActiveProfile as _buildPanel } from "./filter-panel-renderer-core.js";
import {
    refreshFilterTags as _refreshFilterTags,
    populateTagsBadges as _populateTagsBadges,
} from "./filter-panel-tags.js";
import { loadAccordionContentIfNeeded } from "./filter-panel-accordion.js";
import { getLabel } from "../../i18n/i18n.js";

const FilterPanelRenderer: any = {};
FilterPanelRenderer._eventCleanups = [];

/**
 * Builds the filter panels from the configuration of the profile active
 * @param {Object} options - Options
 * @param {HTMLElement} [options.container] - Conteneur cible
 */
FilterPanelRenderer.buildFilterPanelFromActiveProfile = function (options: any) {
    _buildPanel(
        options,
        FilterPanelRenderer._eventCleanups,
        FilterPanelRenderer.toggleFilterPanelVisibility.bind(FilterPanelRenderer)
    );
};

/**
 * Switches la visibility du filter panels.
 * @param {boolean} [forceState] - Force the state (true = open, false = closed)
 */
FilterPanelRenderer.toggleFilterPanelVisibility = function (forceState: any) {
    const container = FilterPanelShared.getFilterPanelElement();
    if (!container) return;

    const isOpen = container.classList.contains("is-open");
    let nextState;

    if (typeof forceState === "boolean") {
        nextState = forceState;
    } else {
        nextState = !isOpen;
    }

    if (nextState) {
        container.classList.add("is-open");
    } else {
        container.classList.remove("is-open");
    }

    // Mettre up to date l'icon du button toggle external
    const toggleBtn = document.getElementById("gl-filter-toggle");
    if (toggleBtn) {
        toggleBtn.setAttribute("aria-expanded", nextState ? "true" : "false"); // E1
        const icon = toggleBtn.querySelector(".gl-filter-toggle__icon") as HTMLElement | null;
        if (icon) {
            if (nextState) {
                setToggleIconOpen(icon);
                toggleBtn.setAttribute("aria-label", getLabel("aria.filter_panel.close"));
            } else {
                setToggleIconClosed(icon);
                toggleBtn.setAttribute("aria-label", getLabel("aria.filter_panel.open"));
            }
        }
    }
};

/**
 * Initializes le button toggle du filter panels
 */
FilterPanelRenderer.initFilterToggle = function () {
    const Log = getLog();

    const toggleBtn = document.getElementById("gl-filter-toggle");
    const panel = FilterPanelShared.getFilterPanelElement();

    if (!toggleBtn || !panel) {
        Log.info("[GeoLeaf.UI.FilterPanel] Bouton toggle ou panel filtres not found");
        return;
    }

    const toggleClickHandler = function () {
        const isOpen = panel.classList.contains("is-open");
        const icon = toggleBtn.querySelector(".gl-filter-toggle__icon") as HTMLElement | null;

        if (isOpen) {
            panel.classList.remove("is-open");
            if (icon) {
                setToggleIconClosed(icon);
            }
            toggleBtn.setAttribute("aria-expanded", "false"); // E1
            toggleBtn.setAttribute("aria-label", getLabel("aria.filter_panel.open"));
        } else {
            panel.classList.add("is-open");
            if (icon) {
                setToggleIconOpen(icon);
            }
            toggleBtn.setAttribute("aria-expanded", "true"); // E1
            toggleBtn.setAttribute("aria-label", getLabel("aria.filter_panel.close"));
        }
    };

    if (events) {
        FilterPanelRenderer._eventCleanups.push(
            events.on(toggleBtn, "click", toggleClickHandler, false, "FilterPanel.toggleButton")
        );
    } else {
        toggleBtn.addEventListener("click", toggleClickHandler);
    }

    Log.info("[GeoLeaf.UI.FilterPanel] Filter toggle button initialized");
};

/**
 * Refreshes les badges de tags dans the panel de filtres.
 * Must be called AFTER POIs have been loaded.
 */
FilterPanelRenderer.refreshFilterTags = function () {
    _refreshFilterTags(FilterPanelRenderer._eventCleanups);
};

/**
 * Peuple le conteneur de badges with thes tags fournis
 * @param {HTMLElement} panelEl - Element du filter panels
 * @param {Array} allTags - List des tags uniques
 */
FilterPanelRenderer.populateTagsBadges = function (panelEl: any, allTags: any) {
    _populateTagsBadges(panelEl, allTags, FilterPanelRenderer._eventCleanups);
};

/**
 * Cleanup method for event listners
 * Call this when destroying the filter panel
 * MEMORY LEAK FIX (Phase 2): Also cleanup timeouts in applier
 */
FilterPanelRenderer.destroy = function () {
    const Log = getLog();
    if (Log) Log.debug("[FilterPanel] Cleaning up event listeners");

    if (FilterPanelRenderer._eventCleanups) {
        FilterPanelRenderer._eventCleanups.forEach((cleanup: any) => {
            if (typeof cleanup === "function") {
                cleanup();
            }
        });
        FilterPanelRenderer._eventCleanups = [];
    }

    // MEMORY LEAK FIX (Phase 2): Cleanup applier timeouts
    if (FilterPanelApplier && FilterPanelApplier.destroy) {
        FilterPanelApplier.destroy();
    }
};

/**
 * Loads the contenu of a accordion to the demande (lazy loading)
 * @param {HTMLElement} accordionGroup - Element of the accordion
 * @param {Object} _filterDef - Setsion du filters (reservede pour usage futur)
 */
FilterPanelRenderer._loadAccordionContentIfNeeded = function (
    accordionGroup: any,
    _filterDef: any
) {
    loadAccordionContentIfNeeded(accordionGroup, _filterDef);
};

export { FilterPanelRenderer };
