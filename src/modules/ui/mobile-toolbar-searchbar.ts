/**
 * GeoLeaf UI – Mobile toolbar: inline text search bar.
 * @module ui/mobile-toolbar-searchbar
 */

import { domState, _g } from "./mobile-toolbar-state.js";
import { createSvgIcon } from "./mobile-toolbar-pill.js";
import { getLabel } from "../i18n/i18n.js";

/** Clears the search input and resets the filter. */
export function clearSearchText(): void {
    if (!domState.searchInput) return;
    domState.searchInput.value = "";

    const filterPanel = document.querySelector<HTMLElement>("#gl-filter-panel");
    if (filterPanel) {
        const ghostInput = ensureSearchGhostInput(filterPanel);
        ghostInput.value = "";
        const applier = (_g as any).GeoLeaf?._UIFilterPanelApplier;
        if (applier && typeof applier.applyFiltersNow === "function") {
            applier.applyFiltersNow(filterPanel);
        }
    }

    const clearBtn = domState.searchBar?.querySelector<HTMLElement>(".gl-search-bar__clear");
    if (clearBtn) clearBtn.style.display = "none";

    const searchBtn = domState.toolbar?.querySelector('[data-gl-toolbar-action="search"]');
    if (searchBtn instanceof HTMLElement) {
        searchBtn.classList.remove(
            "gl-map-toolbar__btn--active",
            "gl-map-toolbar__btn--active-muted"
        );
        searchBtn.setAttribute("aria-expanded", "true");
    }
}

/**
 * Ensures a hidden ghost input `[data-gl-filter-id='searchText']` exists in the
 * filter panel. The renderer skips the 'search' type control (commit 87840e6) so
 * this wrapper may not be in the DOM — creating it here lets state-reader.ts
 * detect `hasSearchText` correctly.
 */
function ensureSearchGhostInput(filterPanel: HTMLElement): HTMLInputElement {
    let input = filterPanel.querySelector<HTMLInputElement>(
        "[data-gl-filter-id='searchText'] input[type='text']"
    );
    if (!input) {
        const ghost = document.createElement("div");
        ghost.setAttribute("data-gl-filter-id", "searchText");
        ghost.style.cssText = "display:none;position:absolute;visibility:hidden";
        input = document.createElement("input");
        input.type = "text";
        ghost.appendChild(input);
        filterPanel.appendChild(ghost);
    }
    return input;
}

/** Submits the text search value into the existing filter panel. */
export function submitSearch(): void {
    if (!domState.searchInput) return;
    const value = domState.searchInput.value.trim();

    const filterPanel = document.querySelector<HTMLElement>("#gl-filter-panel");
    if (filterPanel) {
        const ghostInput = ensureSearchGhostInput(filterPanel);
        ghostInput.value = value;

        const applier = (_g as any).GeoLeaf?._UIFilterPanelApplier;
        if (applier && typeof applier.applyFiltersNow === "function") {
            applier.applyFiltersNow(filterPanel);
        } else {
            const applyBtn = filterPanel.querySelector<HTMLElement>(".gl-filter-panel__btn-apply");
            if (applyBtn) applyBtn.click();
        }
    }

    const clearBtnSubmit = domState.searchBar?.querySelector<HTMLElement>(".gl-search-bar__clear");
    if (clearBtnSubmit) clearBtnSubmit.style.display = value.length > 0 ? "flex" : "none";

    const searchBtn = domState.toolbar?.querySelector('[data-gl-toolbar-action="search"]');
    if (searchBtn instanceof HTMLElement) {
        const hasValue = value.length > 0;
        searchBtn.classList.toggle("gl-map-toolbar__btn--active", hasValue);
        searchBtn.setAttribute("aria-expanded", hasValue ? "true" : "false");
    }
}

/** Opens the inline search bar with animation. */
export function openSearchBar(): void {
    if (!domState.searchBar) return;
    domState.searchBar.style.display = "flex";
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (domState.searchBar) domState.searchBar.classList.add("is-visible");
            domState.searchInput?.focus();
            const glMain = domState.options?.glMain;
            if (glMain) {
                glMain.style.setProperty("--gl-search-bar-height", "46px");
                glMain.style.setProperty("--gl-search-bar-gap", "0.4rem");
            }
        });
    });
    const searchBtn = domState.toolbar?.querySelector('[data-gl-toolbar-action="search"]');
    if (searchBtn instanceof HTMLElement) {
        searchBtn.setAttribute("aria-expanded", "true");
        searchBtn.classList.remove("gl-map-toolbar__btn--active-muted");
        if ((domState.searchInput?.value.trim().length ?? 0) > 0) {
            searchBtn.classList.add("gl-map-toolbar__btn--active");
        }
    }
    const clearBtn = domState.searchBar?.querySelector<HTMLElement>(".gl-search-bar__clear");
    if (clearBtn) {
        clearBtn.style.display =
            (domState.searchInput?.value.trim().length ?? 0) > 0 ? "flex" : "none";
    }
}

/** Closes the search bar and resets text filter state if empty. */
export function closeSearchBar(): void {
    if (!domState.searchBar) return;
    domState.searchBar.classList.remove("is-visible");
    const glMain = domState.options?.glMain;
    if (glMain) {
        glMain.style.removeProperty("--gl-search-bar-height");
        glMain.style.removeProperty("--gl-search-bar-gap");
    }
    const searchBtn = domState.toolbar?.querySelector('[data-gl-toolbar-action="search"]');
    if (searchBtn instanceof HTMLElement) {
        searchBtn.setAttribute("aria-expanded", "false");
        const hasValue = (domState.searchInput?.value.trim().length ?? 0) > 0;
        searchBtn.classList.toggle("gl-map-toolbar__btn--active-muted", hasValue);
        searchBtn.classList.toggle("gl-map-toolbar__btn--active", false);
    }
    domState.searchBar.addEventListener(
        "transitionend",
        () => {
            if (domState.searchBar && !domState.searchBar.classList.contains("is-visible")) {
                domState.searchBar.style.display = "none";
            }
        },
        { once: true }
    );
}

/** Creates the inline search bar pill DOM (top of the map). */
export function createSearchBarDom(): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "gl-search-bar";
    bar.style.display = "none";
    bar.setAttribute("role", "search");
    bar.setAttribute("aria-label", getLabel("aria.search.bar"));

    const input = document.createElement("input");
    input.type = "text";
    input.className = "gl-search-bar__input";
    input.placeholder = getLabel("placeholder.search.input");
    input.setAttribute("aria-label", getLabel("aria.search.input"));
    domState.searchInput = input;

    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "gl-search-bar__submit";
    submitBtn.setAttribute("aria-label", getLabel("aria.search.submit"));
    submitBtn.appendChild(createSvgIcon("M9 10l-4 4 4 4M5 14h8a4 4 0 000-8H9", 20));

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "gl-search-bar__clear";
    clearBtn.setAttribute("aria-label", getLabel("aria.search.clear"));
    clearBtn.style.display = "none";
    clearBtn.appendChild(createSvgIcon("M18 6L6 18M6 6l12 12", 18));
    clearBtn.addEventListener("click", () => clearSearchText());

    bar.appendChild(input);
    bar.appendChild(clearBtn);
    bar.appendChild(submitBtn);

    input.addEventListener("input", () => {
        clearBtn.style.display = input.value.length > 0 ? "flex" : "none";
    });

    submitBtn.addEventListener("click", () => submitSearch());
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            submitSearch();
        } else if (e.key === "Escape") {
            if (input.value.trim().length > 0) {
                clearSearchText();
            } else {
                closeSearchBar();
            }
        }
    });

    domState.searchBar = bar;
    return bar;
}
