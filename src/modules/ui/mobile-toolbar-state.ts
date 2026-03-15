/**
 * GeoLeaf UI – Mobile toolbar: shared mutable state, types and constants.
 * @module ui/mobile-toolbar-state
 */

export const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

import { getLabel } from "../i18n/i18n.js";

export interface MobileToolbarOptions {
    glMain: HTMLElement;
    map?: {
        zoomIn: () => void;
        zoomOut: () => void;
        getContainer: () => HTMLElement;
        getZoom: () => number;
    } | null;
    getFilterActiveState?: () => boolean;
    onResetFilters?: () => void;
    sheetTitles?: Record<string, string>;
    showAddPoi?: boolean;
}

export interface RestoreEntry {
    parent: HTMLElement;
    node: HTMLElement;
    nextSibling: Node | null;
}

export function getDefaultSheetTitles(): Record<string, string> {
    return {
        zoom: getLabel("sheet.title.zoom"),
        geoloc: getLabel("sheet.title.geoloc"),
        search: getLabel("sheet.title.search"),
        proximity: getLabel("sheet.title.proximity"),
        filters: getLabel("sheet.title.filters"),
        themes: getLabel("sheet.title.themes"),
        legend: getLabel("sheet.title.legend"),
        layers: getLabel("sheet.title.layers"),
        table: getLabel("sheet.title.table"),
    };
}

/** Shared mutable DOM and runtime state — populated during init by each sub-module. */
export const domState = {
    overlay: null as HTMLElement | null,
    toolbar: null as HTMLElement | null,
    filterGroup: null as HTMLElement | null,
    filterBtn: null as HTMLElement | null,
    resetBtn: null as HTMLElement | null,
    scrollEl: null as HTMLElement | null,
    navUp: null as HTMLElement | null,
    navDown: null as HTMLElement | null,
    panelTitle: null as HTMLElement | null,
    panelBody: null as HTMLElement | null,
    tooltipEl: null as HTMLElement | null,
    activeSheetId: null as string | null,
    options: null as MobileToolbarOptions | null,
    filterCheckInterval: null as number | null,
    proximityActive: false,
    // proximity bar
    proximityBar: null as HTMLElement | null,
    proximitySlider: null as HTMLInputElement | null,
    proximityValidateBtn: null as HTMLButtonElement | null,
    proximityInstruction: null as HTMLElement | null,
    proximityRadiusLabel: null as HTMLElement | null,
    // search bar
    searchBar: null as HTMLElement | null,
    searchInput: null as HTMLInputElement | null,
    // sheet restore
    restoreOnClose: [] as RestoreEntry[],
    lastFocusedElement: null as HTMLElement | null,
};
