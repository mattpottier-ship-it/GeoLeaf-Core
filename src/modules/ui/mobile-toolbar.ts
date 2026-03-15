/**
 * GeoLeaf UI – Mobile toolbar: orchestrator and public API.
 * Wires together pill, search bar, proximity bar and sheet modal sub-modules.
 *
 * @module ui/mobile-toolbar
 */

import { domState, _g, MobileToolbarOptions } from "./mobile-toolbar-state.js";
import { getLabel } from "../i18n/i18n.js";
import {
    createToolbarDom,
    createTooltipDom,
    attachTooltipHandlers,
    updateNavVisibility,
    refreshFilterButtonState,
    createSvgIcon,
} from "./mobile-toolbar-pill.js";
import { createSearchBarDom, closeSearchBar, openSearchBar } from "./mobile-toolbar-searchbar.js";
import {
    createProximityBarDom,
    openProximityBar,
    closeProximityBar,
} from "./mobile-toolbar-proximity.js";
import { createSheetDom, openSheet, closeSheet } from "./mobile-toolbar-sheet.js";

export type { MobileToolbarOptions };

// ── Toolbar clickk dispatcher ──────────────────────────────────────────────────

function _handleResetFilters(e: Event): void {
    e.preventDefault();
    domState.options?.onResetFilters?.();
    refreshFilterButtonState();
}

function _handleZoom(action: string): void {
    if (!domState.options?.map) return;
    if (action === "zoom-in") {
        domState.options.map.zoomIn();
        return;
    }
    domState.options.map.zoomOut();
}

function _isZoomAction(action: string | null): boolean {
    if (action === "zoom-in") return true;
    if (action === "zoom-out") return true;
    return false;
}

function _handleFullscreen(): void {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        domState.options!.glMain.requestFullscreen().catch(() => {
            /* fullscreen not supported or denied */
        });
    }
}

function _handleSearch(target: HTMLElement): void {
    const isOpen = domState.searchBar?.classList.contains("is-visible");
    if (isOpen) {
        closeSearchBar();
        target.classList.remove("gl-map-toolbar__btn--active");
    } else {
        openSearchBar();
    }
}

function _handleThemes(target: HTMLElement): void {
    const secondaryCtr = document.getElementById("gl-theme-secondary-container");
    if (!secondaryCtr) return;
    const isVisible = secondaryCtr.classList.contains("gl-mobile-secondary-visible");
    if (isVisible) {
        secondaryCtr.classList.remove("gl-mobile-secondary-visible");
        target.classList.remove("gl-map-toolbar__btn--active");
        target.setAttribute("aria-expanded", "false");
    } else {
        secondaryCtr.classList.add("gl-mobile-secondary-visible");
        target.classList.add("gl-map-toolbar__btn--active");
        target.setAttribute("aria-expanded", "true");
    }
}

function _buildProximityCallback(): () => void {
    return () => {
        if (domState.proximityValidateBtn) domState.proximityValidateBtn.disabled = false;
        if (domState.proximityInstruction) {
            domState.proximityInstruction.textContent = getLabel("ui.proximity.point_placed");
            domState.proximityInstruction.classList.add("point-placed");
        }
    };
}

function _handleProximity(target: HTMLElement): void {
    const proximity = (_g.GeoLeaf as any)?._UIFilterPanelProximity;
    const map = domState.options?.map as any;
    if (!proximity?.toggleProximityToolbar || !map) return;
    if (domState.proximityActive) {
        proximity.toggleProximityToolbar(map, 10);
        domState.proximityActive = false;
        target.classList.remove("gl-map-toolbar__btn--active");
        closeProximityBar(false);
        return;
    }
    domState.proximityActive = proximity.toggleProximityToolbar(
        map,
        parseInt(domState.proximitySlider?.defaultValue || "10", 10),
        { onPointPlaced: _buildProximityCallback() }
    );
    target.classList.toggle("gl-map-toolbar__btn--active", domState.proximityActive);
    if (domState.proximityActive) openProximityBar();
}

function _handleGeoloc(): void {
    const geolocLink = document.querySelector(
        ".leaflet-control-geolocation a"
    ) as HTMLAnchorElement | null;
    if (geolocLink) geolocLink.click();
    const btn = domState.toolbar?.querySelector('[data-gl-sheet="geoloc"]');
    if (btn instanceof HTMLElement) btn.setAttribute("aria-expanded", "false");
}

function _handlePoiAdd(): void {
    const leafletBtn = document.querySelector(".leaflet-control-poi-add a") as HTMLElement | null;
    if (leafletBtn) leafletBtn.click();
}

function _dispatchSheetAction(sheetId: string | null, target: HTMLElement): void {
    if (sheetId === "proximity") {
        _handleProximity(target);
        return;
    }
    if (sheetId === "geoloc") {
        _handleGeoloc();
        return;
    }
    if (sheetId) openSheet(sheetId);
}

function onToolbarClick(e: Event): void {
    const target = (e.target as HTMLElement).closest("button");
    if (!target) return;
    const action = target.getAttribute("data-gl-toolbar-action");
    const sheetId = target.getAttribute("data-gl-sheet");
    if (action === "reset-filters") {
        _handleResetFilters(e);
        return;
    }
    if (_isZoomAction(action)) {
        _handleZoom(action!);
        return;
    }
    if (action === "fullscreen") {
        _handleFullscreen();
        return;
    }
    if (action === "search") {
        _handleSearch(target);
        return;
    }
    if (action === "themes") {
        _handleThemes(target);
        return;
    }
    if (action === "poi-add") {
        _handlePoiAdd();
        return;
    }
    _dispatchSheetAction(sheetId, target);
}

function onTableClosed(): void {
    if (domState.activeSheetId === "table") closeSheet();
}

// ── Public API ────────────────────────────────────────────────────────────────

function _setupDocumentListeners(): void {
    if (typeof document === "undefined") return;
    document.addEventListener("geoleaf:table:closed", onTableClosed);
    document.addEventListener("fullscreenchange", () => {
        const isFullscreen = !!document.fullscreenElement;
        const fsBtn = domState.toolbar?.querySelector(
            '[data-gl-toolbar-action="fullscreen"]'
        ) as HTMLElement | null;
        if (fsBtn) {
            fsBtn.classList.toggle("gl-map-toolbar__btn--active", isFullscreen);
            fsBtn.innerHTML = "";
            const exitPath =
                "M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3";
            const enterPath = "M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6";
            fsBtn.appendChild(createSvgIcon(isFullscreen ? exitPath : enterPath));
        }
        domState.toolbar?.classList.toggle("gl-map-toolbar--fullscreen", isFullscreen);
        updateNavVisibility();
    });
}

function _setupGeolocListener(): void {
    const geolocMapContainer = (
        domState.options?.map as any
    )?.getContainer?.() as HTMLElement | null;
    if (geolocMapContainer) {
        geolocMapContainer.addEventListener("gl:geoloc:statechange", (e: Event) => {
            const detail = (e as CustomEvent).detail;
            const btn = domState.toolbar?.querySelector('[data-gl-sheet="geoloc"]');
            if (btn instanceof HTMLElement) {
                btn.classList.toggle("gl-map-toolbar__btn--active", !!detail?.active);
            }
        });
    }
}

/**
 * Initializes the mobile utility pill toolbar and sheet modal.
 * Must be called after the map and .gl-main DOM are ready.
 */
export function initMobileToolbar(options: MobileToolbarOptions): void {
    domState.options = options;
    const { glMain } = options;

    const toolbarWrapper = createToolbarDom();
    domState.toolbar!.addEventListener("click", onToolbarClick);
    glMain.appendChild(toolbarWrapper);

    const searchBarEl = createSearchBarDom();
    glMain.appendChild(searchBarEl);

    const tooltipEl = createTooltipDom();
    tooltipEl.style.display = "none";
    glMain.appendChild(tooltipEl);
    attachTooltipHandlers(toolbarWrapper, glMain);

    const proximityBar = createProximityBarDom();
    glMain.appendChild(proximityBar);
    if (glMain.style.position === "" || glMain.style.position === "static") {
        glMain.style.position = "relative";
    }

    domState.overlay = createSheetDom();
    glMain.appendChild(domState.overlay);

    requestAnimationFrame(() => {
        updateNavVisibility();
    });

    _setupDocumentListeners();

    _setupGeolocListener();

    refreshFilterButtonState();
    domState.filterCheckInterval = window.setInterval(
        () => refreshFilterButtonState(),
        2000
    ) as unknown as number;
}

/**
 * Closes the sheet if open (useful on resize or before unmount).
 */
export function closeMobileSheet(): void {
    closeSheet();
}

/**
 * Refreshes the visual state of the filter button (active / reset).
 */
export function refreshMobileToolbarFilterState(): void {
    refreshFilterButtonState();
}
