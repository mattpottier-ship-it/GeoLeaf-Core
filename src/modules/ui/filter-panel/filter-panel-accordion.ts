/**
 * GeoLeaf UI Filter Panel - Accordion Manager
 * Creation des groups accordion (categories/tags), deployment/repli et lazy loading
 *
 * @module ui/filter-panel/filter-panel-accordion
 */
"use strict";

import { $create } from "../../utils/dom-helpers.js";
import { getLog } from "../../utils/general-utils.js";
import { DOMSecurity } from "../../utils/dom-security.js";
import { getLabel } from "../../i18n/i18n.js";
import {
    buildCategoryTreeContent,
    buildTagsListContent,
    attachCategoryTreeListeners,
    attachTagsListeners,
} from "../filter-control-builder.js";
import { FilterPanelLazyLoader } from "./lazy-loader.js";
import { events } from "../../utils/event-listener-manager.js";
import { ThemeSelector } from "../../themes/theme-selector.js";
import { Config } from "../../config/geoleaf-config/config-core.js";

/**
 * Creates a group accordion (categories ou tags) avec header, body et gestion d'state.
 * @param filterDef - Setsion du filters
 * @param groupEl - Element de contenu (checkboxes, etc.)
 * @param eventCleanups - Array de fonctions de cleanup d'events
 * @param onExpand - Callback called during the deployment (passe accordionGroup et filterDef)
 */
function _createAccordionHeader(filterDef: any, _accordionGroup: any): any {
    const accordionHeader = $create("div", { className: "gl-filter-panel__accordion-header" });
    const contentId = "gl-fp-accordion-body-" + filterDef.id;
    // D1: semantic <button> inside heading — native keyboard, aria-expanded, aria-controls
    const accordionBtn = $create("button", {
        className: "gl-filter-panel__accordion-title",
        attributes: {
            type: "button",
            "aria-expanded": "false",
            "aria-controls": contentId,
        },
        textContent:
            filterDef.label ||
            (filterDef.id === "categories"
                ? getLabel("ui.filter_panel.categories_title_fallback")
                : getLabel("ui.filter_panel.tags_title_fallback")),
    });
    const accordionArrow = $create("span", {
        className: "gl-filter-panel__accordion-arrow",
        textContent: "\u25b6",
        attributes: { "aria-hidden": "true" }, // D5
    });
    accordionBtn.appendChild(accordionArrow);
    accordionHeader.appendChild(accordionBtn);
    return { accordionHeader, accordionBtn, contentId };
}

function _createAccordionBody(groupEl: any, contentId: string): any {
    const accordionBody = $create("div", {
        className: "gl-filter-panel__accordion-body",
        attributes: { id: contentId },
    });
    const accordionWrapper = $create("div");
    accordionWrapper.appendChild(groupEl);
    accordionBody.appendChild(accordionWrapper);
    return accordionBody;
}

function _setupAccordionToggle(
    accordionBtn: any,
    accordionGroup: any,
    eventCleanups: any[],
    onExpand: (accordionGroup: any, filterDef: any) => void,
    filterDef: any
): void {
    const accordionClickHandler = function () {
        requestAnimationFrame(function () {
            accordionGroup.classList.toggle("is-expanded");
            const isExpanded = accordionGroup.classList.contains("is-expanded");
            accordionBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false"); // D2
            if (isExpanded) {
                onExpand(accordionGroup, filterDef);
            } else {
                const LazyLoader = FilterPanelLazyLoader;
                if (LazyLoader) LazyLoader.markAccordionClosed(accordionGroup);
            }
        });
    };
    if (events) {
        eventCleanups.push(
            events.on(
                accordionBtn,
                "click",
                accordionClickHandler,
                false,
                "FilterPanel.accordionToggle"
            )
        );
    } else {
        accordionBtn.addEventListener("click", accordionClickHandler);
    }
}

export function createAccordionGroup(
    filterDef: any,
    groupEl: any,
    eventCleanups: any[],
    onExpand: (accordionGroup: any, filterDef: any) => void
): any {
    const accordionGroup = $create("div", {
        className: "gl-filter-panel__group--accordion",
        attributes: { "data-accordion-for": filterDef.id },
    });
    const { accordionHeader, accordionBtn, contentId } = _createAccordionHeader(
        filterDef,
        accordionGroup
    );
    const body = _createAccordionBody(groupEl, contentId);
    _setupAccordionToggle(accordionBtn, accordionGroup, eventCleanups, onExpand, filterDef);
    accordionGroup.appendChild(accordionHeader);
    accordionGroup.appendChild(body);
    return accordionGroup;
}

/**
 * Remplace le contenu of a element via un fragment HTML parsed.
 * Le contenu est generated en internal par buildCategoryTreeContent / buildTagsListContent
 * which escape all user values via Security.escapeHtml.
 * Insertion always goes through DOMSecurity.setSafeHTML (defense in depth).
 */
function _setHtmlContent(area: any, html: any): void {
    DOMSecurity.setSafeHTML(area, typeof html === "string" ? html : String(html || ""));
}

/**
 * Displays un message simple (state empty, error)
 */
function _setMessage(area: any, className: any, text: any): void {
    while (area.firstChild) area.removeChild(area.firstChild);
    const div = document.createElement("div");
    div.className = className;
    div.textContent = text;
    area.appendChild(div);
}

function _resolveCurrentTheme(): string {
    let theme = ThemeSelector.getCurrentTheme();
    if (!theme) {
        const profile =
            Config && typeof (Config as any).getActiveProfile === "function"
                ? (Config as any).getActiveProfile()
                : null;
        if (
            profile &&
            profile.themes &&
            profile.themes.config &&
            profile.themes.config.defautTheme
        ) {
            theme = profile.themes.config.defautTheme;
        }
    }
    return theme || "defaut";
}

/**
 * Loads the contenu of a accordion to the demande (lazy loading).
 * @param accordionGroup - Element of the accordion
 * @param _filterDef - Setsion du filters (reservede pour usage futur)
 */
function _handleLazyLoad(
    LazyLoader: any,
    Log: any,
    lazyType: string,
    contentArea: any,
    accordionGroup: any,
    currentTheme: string
): void {
    try {
        if (lazyType === "categories") {
            const result = LazyLoader.loadCategories(currentTheme);
            if (!result.usedIds || result.usedIds.size === 0) {
                _setMessage(
                    contentArea,
                    "gl-filter-panel__empty",
                    getLabel("ui.filter_panel.no_categories")
                );
                accordionGroup.dataset.lazyLoaded = "true";
                return;
            }
            const htmlContent = buildCategoryTreeContent(result);
            // Use createContextualFragment (strips scripts only) to preserve <input>, <label>,
            // <div> and all attributes (class, data-*, type, value, name) that
            // DOMSecurity.setSafeHTML/sanitizeHTML whitelist would strip, breaking checkboxes.
            contentArea.textContent = "";
            const catFrag = document
                .createRange()
                .createContextualFragment(htmlContent.replace(/<script[\s\S]*?<\/script>/gi, ""));
            contentArea.appendChild(catFrag);
            attachCategoryTreeListeners(contentArea);
            LazyLoader.markAccordionOpen("categories", accordionGroup);
        } else if (lazyType === "tags") {
            const tags = LazyLoader.loadTags(currentTheme);
            if (!tags || tags.length === 0) {
                _setMessage(
                    contentArea,
                    "gl-filter-panel__empty",
                    getLabel("ui.filter_panel.no_tags")
                );
                accordionGroup.dataset.lazyLoaded = "true";
                return;
            }
            const htmlContent = buildTagsListContent(tags);
            // Use createContextualFragment (strips scripts only) to preserve class and
            // data-tag-value on <span> badges — sanitizeHTML whitelist stripped these
            // attributes, making tags non-selectable and unreadable by the state-reader.
            contentArea.textContent = "";
            const tagFrag = document
                .createRange()
                .createContextualFragment(htmlContent.replace(/<script[\s\S]*?<\/script>/gi, ""));
            contentArea.appendChild(tagFrag);
            attachTagsListeners(contentArea);
            LazyLoader.markAccordionOpen("tags", accordionGroup);
        }
        accordionGroup.dataset.lazyLoaded = "true";
    } catch (err: unknown) {
        Log.error("[FilterPanel] Erreur durant le loading lazy:", err);
        _setMessage(contentArea, "gl-filter-panel__error", "Erreur: " + (err as any)?.message);
    }
}

export function loadAccordionContentIfNeeded(accordionGroup: any, _filterDef: any): void {
    const Log = getLog();
    const LazyLoader = FilterPanelLazyLoader;
    if (!LazyLoader) {
        Log.warn("[FilterPanel] LazyLoader non disponible");
        return;
    }
    if (accordionGroup.dataset.lazyLoaded === "true") {
        Log.debug("[FilterPanel] Accordion already loaded for this theme, skip");
        return;
    }
    const contentArea = accordionGroup.querySelector("[data-lazy-type]");
    if (!contentArea) {
        Log.debug("[FilterPanel] No lazy zone in this accordion");
        return;
    }
    const lazyType = contentArea.dataset.lazyType;
    Log.info(`[FilterPanel] Chargement lazy du contenu: ${lazyType}`);
    const currentTheme = _resolveCurrentTheme();
    (function setLoading(area: any) {
        while (area.firstChild) area.removeChild(area.firstChild);
        const loader = document.createElement("div");
        loader.className = "gl-filter-panel__loading";
        loader.textContent = getLabel("ui.filter_panel.loading");
        area.appendChild(loader);
    })(contentArea);
    setTimeout(
        () => _handleLazyLoad(LazyLoader, Log, lazyType, contentArea, accordionGroup, currentTheme),
        10
    );
}
