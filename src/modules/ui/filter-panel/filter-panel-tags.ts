/**
 * GeoLeaf UI Filter Panel - Tags Populator
 * Peuplement des badges/tags dans the panel de filtres
 *
 * @module ui/filter-panel/filter-panel-tags
 */
"use strict";

import { $create } from "../../utils/dom-helpers.js";
import { getLog } from "../../utils/general-utils.js";
import { FilterPanelShared } from "../../ui/filter-panel/shared.js";
import { events } from "../../utils/event-listener-manager.js";

/**
 * Refreshes les badges de tags dans the panel de filtres.
 * Must be called AFTER POIs have been loaded.
 * @param eventCleanups - Array de fonctions de cleanup d'events
 */
export function refreshFilterTags(eventCleanups: any[]): void {
    const Log = getLog();
    const Shared = FilterPanelShared;

    const container = Shared.getFilterPanelElement();
    if (!container) {
        Log.warn("[GeoLeaf.UI.FilterPanel.refreshFilterTags] Filter panel not found");
        return;
    }

    // Retrieve POI et routes
    const basePois = Shared.getBasePois();
    const baseRoutes = Shared.getBaseRoutes();
    const allItems = basePois.concat(baseRoutes);

    Log.debug(
        "[GeoLeaf.UI.FilterPanel.refreshFilterTags] Items:",
        basePois.length,
        "POI,",
        baseRoutes.length,
        "routes"
    );

    // Collecter tous les tags
    const allTags = Shared.collectAllTags(allItems);

    // Peupler les badges
    populateTagsBadges(container, allTags, eventCleanups);
}

/**
 * Peuple le conteneur de badges with thes tags fournis
 * @param panelEl - Element du filter panels
 * @param allTags - List des tags uniques
 * @param eventCleanups - Array de fonctions de cleanup d'events
 */
function _onTagBadgeClick(this: any): void {
    this.classList.toggle("is-selected");
}

function _buildTagBadges(tags: any[], eventCleanups: any[]): DocumentFragment {
    const tagsFragment = document.createDocumentFragment();
    tags.forEach(function (tag: any) {
        const badge = $create("span", {
            className: "gl-filter-panel__tag-badge",
            textContent: tag,
            attributes: { "data-tag-value": tag },
        });
        if (events) {
            eventCleanups.push(
                events.on(badge, "click", _onTagBadgeClick, false, "FilterPanel.tagBadge")
            );
        } else {
            badge.addEventListener("click", _onTagBadgeClick);
        }
        tagsFragment.appendChild(badge);
    });
    return tagsFragment;
}

export function populateTagsBadges(panelEl: any, allTags: any[], eventCleanups: any[]): void {
    const Log = getLog();
    const wrapper = panelEl.querySelector("[data-gl-filter-id='tags']");
    if (!wrapper) {
        Log.debug(
            "[GeoLeaf.UI.FilterPanel] Tags wrapper not found — probably not used in this profile"
        );
        return;
    }

    const tagsContainer = wrapper.querySelector(".gl-filter-panel__tags-container");
    if (!tagsContainer) {
        Log.warn("[GeoLeaf.UI.FilterPanel] Tags container not found");
        return;
    }

    // Trouver l'accordion parent par l'attribut data-accordion-for
    const accordionGroup = panelEl.querySelector("[data-accordion-for='tags']");
    Log.debug("[GeoLeaf.UI.FilterPanel] Looking for accordion with [data-accordion-for='tags']");
    Log.debug("[GeoLeaf.UI.FilterPanel] Accordion found:", accordionGroup);

    // Emptyr le container
    while (tagsContainer.firstChild) {
        tagsContainer.removeChild(tagsContainer.firstChild);
    }

    // Si pas de tags, cacher completement l'accordion parent
    if (!allTags.length) {
        Log.debug("[GeoLeaf.UI.FilterPanel] Pas de tags (count:", allTags.length, ")");
        if (accordionGroup) {
            accordionGroup.style.display = "none";
            Log.info("[GeoLeaf.UI.FilterPanel] Tags accordion HIDDEN (display: none)");
        } else {
            Log.warn("[GeoLeaf.UI.FilterPanel] Tags accordion not found to hide it");
        }
        return;
    }

    // S'il y a des tags, s'assurer que l'accordion est visible
    Log.debug("[GeoLeaf.UI.FilterPanel] Tags detected (count:", allTags.length, ")");
    if (accordionGroup) {
        accordionGroup.style.display = "";
        Log.info("[GeoLeaf.UI.FilterPanel] Tags accordion SHOWN");
    }

    // Createsr les badges
    tagsContainer.appendChild(_buildTagBadges(allTags, eventCleanups));
}
