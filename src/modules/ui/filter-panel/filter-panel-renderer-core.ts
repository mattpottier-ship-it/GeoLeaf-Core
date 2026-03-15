/**
 * GeoLeaf UI Filter Panel - Renderer Core
 * Building maine du squelette HTML du filter panels
 * (header, body with filters/accordions, footer, event wiring)
 *
 * @module ui/filter-panel/filter-panel-renderer-core
 */
"use strict";

import { $create } from "../../utils/dom-helpers.js";
import { getLog, getActiveProfile } from "../../utils/general-utils.js";
import { _buildFilterControl } from "../filter-control-builder.js";
import { FilterPanelShared } from "../../ui/filter-panel/shared.js";
import { FilterPanelStateReader } from "./state-reader.js";
import { FilterPanelApplier } from "./applier.js";
import { events } from "../../utils/event-listener-manager.js";
import { createAccordionGroup, loadAccordionContentIfNeeded } from "./filter-panel-accordion.js";
import { getLabel } from "../../i18n/i18n.js";

function _resolveSearchPanel(profile: any): any {
    if (profile.panels && profile.panels.search) return profile.panels.search;
    return profile.search || null;
}

function _resolveFilters(searchPanel: any): any[] | null {
    if (!searchPanel) return null;
    if (!Array.isArray(searchPanel.filters)) return null;
    return searchPanel.filters.length > 0 ? searchPanel.filters : null;
}

function _buildFilterPanelHeader(
    container: any,
    searchPanel: any,
    toggleVisibility: (forceState: boolean) => void
): void {
    const header = $create("div", { className: "gl-filter-panel__header" });
    const title = $create("h2", {
        className: "gl-filter-panel__title",
        textContent: searchPanel.title || getLabel("ui.filter_panel.title"),
    });
    header.appendChild(title);
    const toggleBtn = $create("button", {
        type: "button",
        className: "gl-filter-panel__toggle-btn",
        attributes: {
            "data-gl-action": "filter-close",
            "aria-label": getLabel("aria.filter_panel.close_inner"),
        },
    });
    const toggleIcon = $create("span", {
        className: "gl-filter-panel__toggle-icon",
        textContent: "◀",
    });
    toggleBtn.appendChild(toggleIcon);
    header.appendChild(toggleBtn);
    container.appendChild(header);
    void toggleVisibility; // referenced externally
}

function _buildFilterPanelBody(
    container: any,
    filters: any[],
    profile: any,
    eventCleanups: any[]
): void {
    const body = $create("div", { className: "gl-filter-panel__body" });
    const bodyFragment = document.createDocumentFragment();
    filters.forEach(function (filterDef: any) {
        if (filterDef.type === "search") return;
        const skipLabel =
            filterDef.id === "categories" ||
            filterDef.id === "tags" ||
            filterDef.type === "proximity";
        const groupEl = _buildFilterControl(filterDef, profile, skipLabel);
        if (!groupEl) return;
        if (filterDef.id === "categories" || filterDef.id === "tags") {
            bodyFragment.appendChild(
                createAccordionGroup(
                    filterDef,
                    groupEl,
                    eventCleanups,
                    loadAccordionContentIfNeeded
                )
            );
        } else {
            bodyFragment.appendChild(groupEl);
        }
    });
    body.appendChild(bodyFragment);
    container.appendChild(body);
}

function _buildFilterPanelFooter(container: any, searchPanel: any): void {
    const footer = $create("div", { className: "gl-filter-panel__footer" });
    const applyLabel =
        (searchPanel.actions && searchPanel.actions.applyLabel) ||
        getLabel("ui.filter_panel.apply");
    const resetLabel =
        (searchPanel.actions && searchPanel.actions.resetLabel) ||
        getLabel("ui.filter_panel.reset");
    footer.appendChild(
        $create("button", {
            type: "button",
            className: "gl-btn gl-btn--accent gl-filter-panel__btn-apply",
            textContent: applyLabel,
        })
    );
    footer.appendChild(
        $create("button", {
            type: "button",
            className: "gl-btn gl-btn--subtle gl-filter-panel__btn-reset",
            textContent: resetLabel,
        })
    );
    container.appendChild(footer);
}

function _addClickHandler(
    container: any,
    eventCleanups: any[],
    handler: (evt: any) => void,
    label: string
): void {
    if (events) {
        eventCleanups.push(events.on(container, "click", handler, false, label));
    } else {
        container.addEventListener("click", handler);
    }
}

function _addKeydownHandler(
    container: any,
    eventCleanups: any[],
    handler: (evt: any) => void,
    label: string
): void {
    if (events) {
        eventCleanups.push(events.on(container, "keydown", handler, false, label));
    } else {
        container.addEventListener("keydown", handler);
    }
}

function _wireFilterPanelEvents(
    container: any,
    eventCleanups: any[],
    toggleVisibility: (forceState: boolean) => void,
    Applier: any,
    StateReader: any
): void {
    if (container._glFilterHandlersBound) return;
    const containerClickHandler = function (evt: any) {
        const target = evt.target;
        if (target.closest("[data-gl-action='filter-close']")) {
            evt.preventDefault();
            toggleVisibility(false);
            return;
        }
        if (target.classList.contains("gl-filter-panel__btn-reset")) {
            evt.preventDefault();
            StateReader.resetCategoryTagControls(container);
            Applier.applyFiltersNow(container, true);
            return;
        }
        if (target.classList.contains("gl-filter-panel__btn-apply")) {
            evt.preventDefault();
            Applier.applyFiltersNow(container);
        }
    };
    const containerKeydownHandler = function (evt: any) {
        if (evt.key !== "Enter" && evt.keyCode !== 13) return;
        const searchInput = evt.target.closest(
            "[data-gl-filter-id='searchText'] input[type='text']"
        );
        if (!searchInput) return;
        evt.preventDefault();
        Applier.applyFiltersNow(container);
    };
    _addClickHandler(container, eventCleanups, containerClickHandler, "FilterPanel.containerClick");
    _addKeydownHandler(container, eventCleanups, containerKeydownHandler, "FilterPanel.enterKey");
    container._glFilterHandlersBound = true;
}

/**
 * Builds the filter panels from the configuration of the profile active.
 * @param options - Options (container optional)
 * @param eventCleanups - Array de fonctions de cleanup d'events (shared avec l'orchestrateur)
 * @param toggleVisibility - Callback pour basculer la visibility du panel
 */
export function buildFilterPanelFromActiveProfile(
    options: any,
    eventCleanups: any[],
    toggleVisibility: (forceState: boolean) => void
): void {
    const Log = getLog();
    const Shared = FilterPanelShared;
    const StateReader = FilterPanelStateReader;
    const Applier = FilterPanelApplier;
    const profile = getActiveProfile() as any;
    if (Log) Log.debug("[FilterPanel] buildFilterPanelFromActiveProfile CALLED, options:", options);
    if (!profile) {
        Log.warn("[GeoLeaf.UI.FilterPanel] No active profile found");
        return;
    }
    Log.info("[GeoLeaf.UI.FilterPanel] Profil actif:", profile.id || "unknown");
    const searchPanel = _resolveSearchPanel(profile);
    if (!searchPanel) {
        Log.warn(
            "[GeoLeaf.UI.FilterPanel] Aucune configuration search/panels.search dans le profile"
        );
        return;
    }
    const filters = _resolveFilters(searchPanel);
    if (!filters) {
        Log.warn(
            "[GeoLeaf.UI.FilterPanel] No filters defined in profile.search.filters for the active profile."
        );
        return;
    }
    Log.info("[GeoLeaf.UI.FilterPanel] Number of filters found:", filters.length);
    const container = (options && options.container) || Shared.getFilterPanelElement();
    if (!container) {
        Log.warn("[GeoLeaf.UI.FilterPanel] Conteneur de panel not found");
        return;
    }
    while (container.firstChild) container.removeChild(container.firstChild);
    container.classList.add("gl-filter-panel");
    _buildFilterPanelHeader(container, searchPanel, toggleVisibility);
    _buildFilterPanelBody(container, filters, profile, eventCleanups);
    _buildFilterPanelFooter(container, searchPanel);
    _wireFilterPanelEvents(container, eventCleanups, toggleVisibility, Applier, StateReader);
    container.classList.remove("is-open");
}
