/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf Table - Renderer Module (orchestrator)
 * Rendu des columns, lines et pagination avec virtual scrolling.
 *
 * Sub-modules:
 *  - table-renderer-utils.ts     — constants, getFeatureId, formatValue, _eventCleanups
 *  - table-renderer-virtual-scroll.ts — virtual scrolling for large datasets
 *  - table-selection-manager.ts  — row selection logic (single, multi, range, toggle-all)
 */
"use strict";

import { Log } from "../log/index.js";
import { $create } from "../utils/dom-helpers.js";
import { getNestedValue } from "../utils/object-utils.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { GeoJSONShared } from "../geojson/shared.js";
import { events as _events } from "../utils/event-listener-manager.js";
import { TableContract } from "../../contracts/table.contract.js";
import {
    VIRTUAL_THRESHOLD,
    _eventCleanups,
    resetSyntheticIdCounter,
    getFeatureId,
    formatValue,
} from "./table-renderer-utils.js";
import {
    createTableBodyVirtual,
    initVirtualState,
    setupVirtualScroll,
} from "./table-renderer-virtual-scroll.js";
import {
    handleRowSelection,
    toggleAllRows,
    updateToolbarButtonsState,
} from "./table-selection-manager.js";

const _TableRenderer: any = {};
// Exposes the shared cleanup array on the object for backward compatibility
_TableRenderer._eventCleanups = _eventCleanups;

/**
 * Flush all tracked event cleanups (called before re-render and on destroy).
 */
_TableRenderer._flushEventCleanups = function () {
    const cleanups = _eventCleanups;
    for (let i = 0; i < cleanups.length; i++) {
        const item = cleanups[i];
        if (typeof item === "function") {
            try {
                item();
            } catch (_e) {
                /* ignore */
            }
        } else if (typeof item === "number") {
            try {
                _events?.off(item);
            } catch (_e) {
                /* ignore */
            }
        }
    }
    cleanups.length = 0;
};

/**
 * Destroy the table renderer and clean up all event listners.
 */
_TableRenderer.destroy = function () {
    this._flushEventCleanups();
};

function _getLayerTableConfig(layerId: any): any {
    const layerData = GeoJSONShared.getLayerById(layerId) as any;
    return layerData?.config?.table ?? null;
}

function _renderTableBody(
    container: any,
    features: any[],
    columns: any,
    selectedIds: any,
    layerConfig: any,
    table: any
): void {
    if (features.length > VIRTUAL_THRESHOLD) {
        const tbody = createTableBodyVirtual(features, columns, selectedIds, createTableRow);
        table.appendChild(tbody);
        initVirtualState(container, features, columns, selectedIds, layerConfig, createTableRow);
        setupVirtualScroll(container);
    } else {
        const tbody = createTableBody(features, columns, selectedIds);
        table.appendChild(tbody);
    }
}

/**
 * Rend the table with thes data fournies.
 * @param {HTMLElement} container - Conteneur du array
 * @param {Object} options - Options de rendu
 * @param {string} options.layerId - ID de the layer
 * @param {Array} options.features - Features to display
 * @param {Set} options.selectedIds - IDs des entities selected
 * @param {Object} options.sortState - STATE du tri
 */
_TableRenderer.render = function (container: any, options: any) {
    Log.debug("[TableRenderer] render() - Start, options:", options);

    if (!container) {
        Log.error("[TableRenderer] Conteneur invalide");
        return;
    }

    // Flush previous event cleanups before re-render
    _TableRenderer._flushEventCleanups();

    // Reset le compteur d'IDs synthetic to chaque rendu
    resetSyntheticIdCounter();

    const { layerId, features, selectedIds, sortState } = options;
    Log.debug(
        "[TableRenderer] render() - layerId:",
        layerId,
        "features:",
        features ? features.length : 0
    );

    const table = container.querySelector(".gl-table-panel__table");
    if (!table) {
        Log.error("[TableRenderer] Table element not found");
        return;
    }

    // Si pas de layerId, emptyr the table
    if (!layerId) {
        // SAFE: Empty string to clear the content
        DOMSecurity.clearElementFast(table);
        Log.debug("[TableRenderer] Table cleared (no layer selected)");
        return;
    }

    // Retrieve la config du layer
    const layerConfig = _getLayerTableConfig(layerId);

    if (!layerConfig?.columns) {
        Log.warn("[TableRenderer] No column configuration for", layerId);
        // SAFE: Empty string to clear the content
        DOMSecurity.clearElementFast(table);
        return;
    }

    Log.debug("[TableRenderer] Colonnes:", layerConfig.columns);

    // Emptyr the table avant rebuilding
    DOMSecurity.clearElementFast(table);

    // Createsr le thead
    const thead = createTableHead(layerConfig.columns, sortState);
    table.appendChild(thead);

    _renderTableBody(container, features, layerConfig.columns, selectedIds, layerConfig, table);

    Log.debug("[TableRenderer] Tableau rendu:", features.length, "lines");
};

function _buildCheckboxTh(): HTMLElement {
    const thCheckbox = $create("th", {
        className: "gl-table-panel__th gl-table-panel__th--checkbox",
    }) as HTMLElement;
    const checkboxAll = $create("input", {
        type: "checkbox",
        className: "gl-table-panel__checkbox-all",
        title: "Select all / Deselect all",
    }) as HTMLInputElement;
    const checkboxAllHandler = (e: any) => {
        toggleAllRows(e.target.checked);
    };
    if (_events) {
        _eventCleanups.push(
            _events.on(
                checkboxAll,
                "change",
                checkboxAllHandler,
                false,
                "TableRenderer.checkboxAll"
            )
        );
    } else {
        checkboxAll.addEventListener("change", checkboxAllHandler);
    }
    thCheckbox.appendChild(checkboxAll);
    return thCheckbox;
}

function _buildSortableTh(col: any, sortState: any): HTMLElement {
    const th = $create("th", { className: "gl-table-panel__th" }) as HTMLElement;
    th.textContent = col.label || col.field;
    if (col.width) {
        th.style.width = col.width;
    }
    const isSortable = col.sortable !== false;
    if (isSortable) {
        th.classList.add("gl-table-panel__th--sortable");
        th.setAttribute("data-field", col.field);
        const sortIcon = $create("span", { className: "gl-table-panel__sort-icon" }) as HTMLElement;
        if (sortState.field === col.field) {
            if (sortState.direction === "asc") {
                sortIcon.textContent = " \u25b2"; // ▲
                th.classList.add("is-sorted-asc");
            } else if (sortState.direction === "desc") {
                sortIcon.textContent = " \u25bc"; // ▼
                th.classList.add("is-sorted-desc");
            }
        } else {
            sortIcon.textContent = " \u2195"; // ↕
        }
        th.appendChild(sortIcon);
        const sortHandler = () => {
            TableContract.sortByField(col.field);
        };
        if (_events) {
            _eventCleanups.push(_events.on(th, "click", sortHandler, false, "TableRenderer.sort"));
        } else {
            th.addEventListener("click", sortHandler);
        }
    }
    return th;
}

/**
 * Creates the header du array (thead).
 * @param {Array} columns - Configuration des columns
 * @param {Object} sortState - STATE du tri current
 * @returns {HTMLElement}
 * @private
 */
function createTableHead(columns: any, sortState: any): HTMLElement {
    const thead = $create("thead") as HTMLElement;
    const tr = $create("tr") as HTMLElement;
    tr.appendChild(_buildCheckboxTh());
    columns.forEach((col: any) => {
        tr.appendChild(_buildSortableTh(col, sortState));
    });
    thead.appendChild(tr);
    return thead;
}

/**
 * Creates the corps du array (tbody).
 * @param {Array} features - Features to display
 * @param {Array} columns - Configuration des columns
 * @param {Set} selectedIds - IDs selected
 * @returns {HTMLElement}
 * @private
 */
function createTableBody(features: any, columns: any, selectedIds: any): HTMLElement {
    Log.debug("[TableRenderer] createTableBody() - features:", features.length);

    const tbody = $create("tbody") as HTMLElement;

    // Use DocumentFragment for batch DOM operations
    const fragment = document.createDocumentFragment();

    features.forEach((feature: any) => {
        const tr = createTableRow(feature, columns, selectedIds);
        fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);

    Log.debug("[TableRenderer] tbody created with", tbody.children.length, "rows");
    return tbody;
}

function _buildRowCheckboxTd(featureId: any): HTMLElement {
    const tdCheckbox = $create("td", {
        className: "gl-table-panel__td gl-table-panel__td--checkbox",
    }) as HTMLElement;
    const checkbox = $create("input", {
        type: "checkbox",
        className: "gl-table-panel__checkbox",
    }) as HTMLInputElement;
    const checkboxHandler = (e: any) => {
        handleRowSelection(featureId, (e.target as HTMLInputElement).checked, false, true, true);
    };
    if (_events) {
        _eventCleanups.push(
            _events.on(checkbox, "change", checkboxHandler, false, "TableRenderer.checkbox")
        );
    } else {
        checkbox.addEventListener("change", checkboxHandler);
    }
    tdCheckbox.appendChild(checkbox);
    return tdCheckbox;
}

function _attachRowClickEvent(tr: HTMLElement, featureId: any): void {
    const rowClickHandler = (e: any) => {
        if ((e.target as HTMLElement).getAttribute?.("type") === "checkbox") return;
        const currentState = tr.classList.contains("is-selected");
        handleRowSelection(featureId, !currentState, e.shiftKey, e.ctrlKey || e.metaKey);
    };
    if (_events) {
        _eventCleanups.push(
            _events.on(tr, "click", rowClickHandler, false, "TableRenderer.rowClick")
        );
    } else {
        tr.addEventListener("click", rowClickHandler);
    }
}

/**
 * Creates ae line du array.
 * @param {Object} feature - Feature GeoJSON
 * @param {Array} columns - Configuration des columns
 * @param {Set} selectedIds - IDs selected
 * @returns {HTMLElement}
 * @private
 */
function createTableRow(feature: any, columns: any, selectedIds: any): HTMLElement {
    const tr = $create("tr") as HTMLElement;
    const featureId = getFeatureId(feature);
    tr.setAttribute("data-feature-id", featureId);
    if (selectedIds.has(String(featureId))) {
        tr.classList.add("is-selected");
    }
    const tdCheckbox = _buildRowCheckboxTd(featureId);
    const checkbox = tdCheckbox.querySelector(".gl-table-panel__checkbox") as HTMLInputElement;
    if (checkbox) checkbox.checked = selectedIds.has(String(featureId));
    tr.appendChild(tdCheckbox);
    columns.forEach((col: any) => {
        const td = $create("td", { className: "gl-table-panel__td" }) as HTMLElement;
        const value = getNestedValue(feature, col.field);
        td.textContent = formatValue(value, col.type);
        if (col.type === "number") {
            td.classList.add("gl-table-panel__td--number");
        }
        tr.appendChild(td);
    });
    _attachRowClickEvent(tr, featureId);
    return tr;
}

/**
 * Met a jour la selection visuelle dans the table sans re-rendre toutes les lines.
 * @param {HTMLElement} container - Conteneur du array
 * @param {Set} selectedIds - IDs selectionnes
 */
_TableRenderer.updateSelection = function (container: any, selectedIds: any) {
    const tbody = container.querySelector(".gl-table-panel__table tbody");
    if (!tbody) return;

    const rows = tbody.querySelectorAll("tr");

    rows.forEach((row: any) => {
        const id = row.getAttribute("data-feature-id");
        const isSelected = selectedIds.has(String(id));

        row.classList.toggle("is-selected", isSelected);

        const checkbox = row.querySelector(".gl-table-panel__checkbox");
        if (checkbox) {
            checkbox.checked = isSelected;
        }
    });

    // Mettre a jour le checkbox "tout selectionner"
    const checkboxAll = container.querySelector(".gl-table-panel__checkbox-all");
    if (checkboxAll) {
        // Count only feature rows (rows with data-feature-id) to exclude virtual-scroll spacers
        const totalRows = tbody.querySelectorAll("tr[data-feature-id]").length;
        const selectedCount = selectedIds.size;
        checkboxAll.checked = totalRows > 0 && selectedCount === totalRows;
        checkboxAll.indeterminate = selectedCount > 0 && selectedCount < totalRows;
    }

    updateToolbarButtonsState();
};

const TableRenderer = _TableRenderer;
export { TableRenderer };
