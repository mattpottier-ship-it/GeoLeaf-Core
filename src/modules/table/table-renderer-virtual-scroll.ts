/**
 * GeoLeaf Table - Virtual Scroll
 * Renders only visible rows + a buffer for large datasets (> VIRTUAL_THRESHOLD rows).
 */
"use strict";

import { $create } from "../utils/dom-helpers.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { events as _events } from "../utils/event-listener-manager.js";
import { VIRTUAL_ROW_HEIGHT, VIRTUAL_BUFFER, _eventCleanups } from "./table-renderer-utils.js";

type CreateRowFn = (feature: any, columns: any, selectedIds: any) => HTMLElement;

interface VirtualState {
    features: any[];
    columns: any[];
    selectedIds: Set<string>;
    layerConfig: any;
    createRowFn: CreateRowFn;
}

/** @type {WeakMap<HTMLElement, VirtualState>} */
const _virtualState = new WeakMap<HTMLElement, VirtualState>();

/**
 * Registers virtual scroll state for a container.
 * Must be called right after createTableBodyVirtual() and before setupVirtualScroll().
 */
export function initVirtualState(
    container: HTMLElement,
    features: any[],
    columns: any[],
    selectedIds: Set<string>,
    layerConfig: any,
    createRowFn: CreateRowFn
): void {
    _virtualState.set(container, { features, columns, selectedIds, layerConfig, createRowFn });
}

/**
 * Creates a fixed-height tbody for virtual scrolling.
 * Only the initially visible window is populated; subsequent rows are rendered on scroll.
 * @param {Array} features - All features
 * @param {Array} columns - Column config
 * @param {Set} selectedIds - Selected IDs
 * @param {Function} createRowFn - Row factory from the main renderer
 * @returns {HTMLElement}
 */
export function createTableBodyVirtual(
    features: any,
    columns: any,
    selectedIds: any,
    createRowFn: CreateRowFn
): HTMLElement {
    const tbody = $create("tbody") as HTMLElement;
    tbody.setAttribute("data-virtual", "true");
    tbody.style.height = features.length * VIRTUAL_ROW_HEIGHT + "px";
    updateVirtualRows(tbody, features, columns, selectedIds, 0, createRowFn);
    return tbody;
}

/**
 * Fills tbody with a top spacer, visible rows, and a bottom spacer based on scrollTop.
 * @param {HTMLElement} tbody - Virtual tbody element
 * @param {Array} features - All features
 * @param {Array} columns - Column config
 * @param {Set} selectedIds - Selected IDs
 * @param {number} scrollTop - Current scroll position of the wrapper
 * @param {Function} createRowFn - Row factory from the main renderer
 */
export function updateVirtualRows(
    tbody: any,
    features: any,
    columns: any,
    selectedIds: any,
    scrollTop: any,
    createRowFn: CreateRowFn
): void {
    const wrapper = tbody.closest(".gl-table-panel__wrapper");
    const clientHeight = wrapper ? wrapper.clientHeight : 400;
    const total = features.length;
    const startIndex = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_BUFFER);
    const endIndex = Math.min(
        total,
        Math.ceil((scrollTop + clientHeight) / VIRTUAL_ROW_HEIGHT) + VIRTUAL_BUFFER
    );
    const visibleFeatures = features.slice(startIndex, endIndex);
    const colCount = columns && columns.length ? columns.length + 1 : 2;

    DOMSecurity.clearElementFast(tbody);

    const fragment = document.createDocumentFragment();

    if (startIndex > 0) {
        const spacerTop = $create("tr", { className: "gl-table-panel__spacer" });
        const tdTop = $create("td", { colSpan: colCount });
        tdTop.style.height = startIndex * VIRTUAL_ROW_HEIGHT + "px";
        spacerTop.appendChild(tdTop);
        fragment.appendChild(spacerTop);
    }

    visibleFeatures.forEach((feature: any) => {
        const tr = createRowFn(feature, columns, selectedIds);
        tr.style.height = VIRTUAL_ROW_HEIGHT + "px";
        fragment.appendChild(tr);
    });

    if (endIndex < total) {
        const spacerBottom = $create("tr", { className: "gl-table-panel__spacer" });
        const tdBottom = $create("td", { colSpan: colCount });
        tdBottom.style.height = (total - endIndex) * VIRTUAL_ROW_HEIGHT + "px";
        spacerBottom.appendChild(tdBottom);
        fragment.appendChild(spacerBottom);
    }

    tbody.appendChild(fragment);
}

/**
 * Attaches a passive scroll listner to the table wrapper.
 * On each scroll, re-renders the visible window of rows.
 * @param {HTMLElement} container - Tabthe module container
 */
export function setupVirtualScroll(container: any): void {
    const wrapper = container.querySelector(".gl-table-panel__wrapper");
    const table = container.querySelector(".gl-table-panel__table");
    if (!wrapper || !table) return;

    const tbody = table.querySelector("tbody[data-virtual=true]");
    if (!tbody) return;

    const onScroll = () => {
        const state = _virtualState.get(container);
        if (!state) return;
        updateVirtualRows(
            tbody,
            state.features,
            state.columns,
            state.selectedIds,
            wrapper.scrollTop,
            state.createRowFn
        );
    };

    if (_events) {
        _eventCleanups.push(
            _events.on(
                wrapper,
                "scroll",
                onScroll,
                { passive: true },
                "TableRenderer.virtualScroll"
            )
        );
    } else {
        wrapper.addEventListener("scroll", onScroll, { passive: true });
    }
}
