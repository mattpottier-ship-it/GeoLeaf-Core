/**
 * GeoLeaf UI – Mobile toolbar: pill DOM creation, nav arrows, tooltip and filter state.
 * @module ui/mobile-toolbar-pill
 */

import { DOMSecurity } from "../utils/dom-security.js";
import { domState } from "./mobile-toolbar-state.js";
import { getLabel } from "../i18n/i18n.js";

export function createSvgIcon(pathData: string, size = 22): SVGElement {
    const opts = { stroke: "currentColor", strokeWidth: "2", fill: "none" as const };
    return DOMSecurity.createSVGIcon(size, size, pathData, opts);
}

/**
 * Updates nav arrow visibility according to current scroll position.
 * Arrows appear only when the content overflows the visible area.
 */
export function updateNavVisibility(): void {
    if (!domState.scrollEl || !domState.navUp || !domState.navDown) return;
    const { scrollTop, scrollHeight, clientHeight } = domState.scrollEl;
    const hasOverflow = scrollHeight > clientHeight + 2;
    const canScrollUp = scrollTop > 2;
    const canScrollDown = scrollTop + clientHeight < scrollHeight - 2;

    domState.navUp.classList.toggle("is-visible", hasOverflow && canScrollUp);
    domState.navDown.classList.toggle("is-visible", hasOverflow && canScrollDown);
}

/**
 * Refreshes the visual state of the filter button (active / reset).
 */
export function refreshFilterButtonState(): void {
    let active = domState.options?.getFilterActiveState?.() ?? false;
    if (!active) {
        const panel = document.querySelector("#gl-filter-panel");
        if (panel) {
            const checkedCats = panel.querySelectorAll(
                ".gl-filter-tree__checkbox--category:checked, .gl-filter-tree__checkbox--subcategory:checked"
            ).length;
            const selectedTags = panel.querySelectorAll(
                ".gl-filter-panel__tag-badge.is-selected"
            ).length;
            active = checkedCats > 0 || selectedTags > 0;
        }
    }
    domState.filterBtn?.classList.toggle("gl-map-toolbar__btn--active", active);
    domState.filterGroup?.classList.toggle("has-active-filters", active);
}

function _getNavItems() {
    return [
        {
            id: "",
            label: getLabel("aria.toolbar.fullscreen"),
            tooltip: getLabel("aria.toolbar.fullscreen"),
            path: "M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6",
            action: "fullscreen",
        },
        {
            id: "",
            label: getLabel("aria.toolbar.zoom_in"),
            tooltip: getLabel("aria.toolbar.zoom_in"),
            path: "M12 5v14M5 12h14",
            action: "zoom-in",
        },
        {
            id: "",
            label: getLabel("aria.toolbar.zoom_out"),
            tooltip: getLabel("aria.toolbar.zoom_out"),
            path: "M5 12h14",
            action: "zoom-out",
        },
        {
            id: "geoloc",
            label: getLabel("aria.toolbar.geoloc"),
            tooltip: getLabel("aria.toolbar.geoloc"),
            path: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 7a3 3 0 100 6 3 3 0 000-6z",
        },
    ];
}

function _getMapToolItems() {
    return [
        {
            id: "",
            label: getLabel("aria.toolbar.themes"),
            tooltip: getLabel("tooltip.toolbar.themes"),
            path: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
            action: "themes",
        },
        {
            id: "legend",
            label: getLabel("aria.toolbar.legend"),
            tooltip: getLabel("tooltip.toolbar.legend"),
            path: "M4 6h16M4 10h10M4 14h8M4 18h6",
        },
        {
            id: "layers",
            label: getLabel("aria.toolbar.layers"),
            tooltip: getLabel("tooltip.toolbar.layers"),
            path: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
        },
        {
            id: "table",
            label: getLabel("aria.toolbar.table"),
            tooltip: getLabel("aria.toolbar.table"),
            path: "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
        },
    ];
}

function _getToolbarItems() {
    return [
        ..._getNavItems(),
        ...(domState.options?.showAddPoi
            ? [
                  {
                      id: "",
                      label: getLabel("aria.toolbar.poi_add"),
                      tooltip: getLabel("tooltip.toolbar.poi_add"),
                      path: "M12 2 C 6.5 2 2 6.5 2 12 C 2 17.5 6.5 22 12 22 C 17.5 22 22 17.5 22 12 C 22 6.5 17.5 2 12 2 M12 8 L12 16 M8 12 L16 12",
                      action: "poi-add",
                  },
              ]
            : []),
        {
            id: "",
            label: getLabel("aria.toolbar.search"),
            tooltip: getLabel("tooltip.toolbar.search"),
            path: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
            action: "search",
        },
        {
            id: "proximity",
            label: getLabel("aria.toolbar.proximity"),
            tooltip: getLabel("tooltip.toolbar.proximity"),
            path: "M12 2v2M12 20v2M2 12h2M20 12h2M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0",
        },
        ..._getMapToolItems(),
    ];
}

function _buildToolbarButton(
    b: { id: string; label: string; path: string; action?: string; tooltip: string },
    index: number,
    filterGroup: HTMLElement,
    scroll: HTMLElement
): void {
    if (index === 6) scroll.appendChild(filterGroup);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gl-map-toolbar__btn";
    if (b.id) btn.setAttribute("data-gl-sheet", b.id);
    btn.setAttribute("aria-label", b.label);
    btn.setAttribute("data-tooltip", b.tooltip);
    if (b.action) btn.setAttribute("data-gl-toolbar-action", b.action);
    if ((b.id && !["geoloc", "proximity"].includes(b.id)) || b.action === "themes")
        btn.setAttribute("aria-expanded", "false");
    btn.appendChild(createSvgIcon(b.path));
    scroll.appendChild(btn);
}

function _attachNavScroll(btn: HTMLButtonElement, direction: number): void {
    const SCROLL_STEP = 80;
    btn.addEventListener("click", () => {
        if (domState.scrollEl) {
            domState.scrollEl.scrollBy({ top: direction * SCROLL_STEP, behavior: "smooth" });
        }
    });
}

function _createFilterGroup(): HTMLElement {
    const filterGroup = document.createElement("div");
    filterGroup.className = "gl-map-toolbar__group";
    domState.filterGroup = filterGroup;
    const filterBtn = document.createElement("button");
    filterBtn.type = "button";
    filterBtn.className = "gl-map-toolbar__btn";
    filterBtn.setAttribute("data-gl-sheet", "filters");
    filterBtn.setAttribute("data-gl-toolbar-action", "filters");
    filterBtn.setAttribute("aria-label", getLabel("aria.toolbar.filters"));
    filterBtn.setAttribute("aria-expanded", "false");
    filterBtn.appendChild(createSvgIcon("M4 4h16v2.5l-6 6v6l-4 2v-8l-6-6V4z"));
    domState.filterBtn = filterBtn;
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "gl-map-toolbar__reset";
    resetBtn.setAttribute("aria-label", getLabel("aria.toolbar.reset_filters"));
    resetBtn.setAttribute("data-gl-toolbar-action", "reset-filters");
    resetBtn.appendChild(createSvgIcon("M4 6h16M4 12h16M4 18h16M3 3l18 18", 18));
    domState.resetBtn = resetBtn;
    filterGroup.appendChild(filterBtn);
    filterGroup.appendChild(resetBtn);
    filterBtn.setAttribute("data-tooltip", getLabel("tooltip.toolbar.filters"));
    return filterGroup;
}

/** Creates the pill wrapper, nav buttons, scroll container and icon buttons. */
export function createToolbarDom(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "gl-map-toolbar-wrapper";

    const navUp = document.createElement("button");
    navUp.type = "button";
    navUp.className = "gl-map-toolbar__nav";
    navUp.setAttribute("aria-label", getLabel("aria.toolbar.scroll_up"));
    navUp.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>';
    wrapper.appendChild(navUp);
    domState.navUp = navUp;

    const toolbar = document.createElement("div");
    toolbar.className = "gl-map-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", getLabel("aria.toolbar.root"));
    domState.toolbar = toolbar;

    const scroll = document.createElement("div");
    scroll.className = "gl-map-toolbar__scroll";
    domState.scrollEl = scroll;

    const filterGroup = _createFilterGroup();

    _getToolbarItems().forEach((b, index) => _buildToolbarButton(b, index, filterGroup, scroll));
    toolbar.appendChild(scroll);
    wrapper.appendChild(toolbar);

    const navDown = document.createElement("button");
    navDown.type = "button";
    navDown.className = "gl-map-toolbar__nav";
    navDown.setAttribute("aria-label", getLabel("aria.toolbar.scroll_down"));
    navDown.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    wrapper.appendChild(navDown);
    domState.navDown = navDown;

    _attachNavScroll(navUp, -1);
    _attachNavScroll(navDown, 1);

    scroll.addEventListener("scroll", updateNavVisibility, { passive: true });

    if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => updateNavVisibility());
        ro.observe(scroll);
    }

    return wrapper;
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

/** Creates the floating tooltip div (outside the pill, inside glMain). */
export function createTooltipDom(): HTMLElement {
    const tip = document.createElement("div");
    tip.className = "gl-toolbar-tooltip";
    tip.setAttribute("aria-hidden", "true");
    domState.tooltipEl = tip;
    return tip;
}

function _showTooltip(btn: HTMLElement, glMain: HTMLElement): void {
    if (!domState.tooltipEl) return;
    const label = btn.getAttribute("data-tooltip");
    if (!label) return;
    domState.tooltipEl.textContent = label;
    domState.tooltipEl.style.display = "block";
    const btnRect = btn.getBoundingClientRect();
    const mainRect = glMain.getBoundingClientRect();
    const top = btnRect.top - mainRect.top + btnRect.height / 2;
    const left = btnRect.right - mainRect.left + 10;
    domState.tooltipEl.style.top = `${top}px`;
    domState.tooltipEl.style.left = `${left}px`;
    requestAnimationFrame(() => {
        if (domState.tooltipEl) domState.tooltipEl.classList.add("is-visible");
    });
}

function _hideTooltip(): void {
    if (!domState.tooltipEl) return;
    domState.tooltipEl.classList.remove("is-visible");
    domState.tooltipEl.addEventListener(
        "transitionend",
        () => {
            if (domState.tooltipEl && !domState.tooltipEl.classList.contains("is-visible")) {
                domState.tooltipEl.style.display = "none";
            }
        },
        { once: true }
    );
}

export function attachTooltipHandlers(wrapper: HTMLElement, glMain: HTMLElement): void {
    const btns = wrapper.querySelectorAll<HTMLElement>("[data-tooltip]");
    btns.forEach((btn) => {
        btn.addEventListener("mouseenter", () => _showTooltip(btn, glMain));
        btn.addEventListener("focusin", () => _showTooltip(btn, glMain));
        btn.addEventListener("mouseleave", _hideTooltip);
        btn.addEventListener("focusout", _hideTooltip);
        btn.addEventListener("pointerleave", _hideTooltip);
    });
}
