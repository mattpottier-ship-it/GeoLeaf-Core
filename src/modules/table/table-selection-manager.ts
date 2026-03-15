/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf Table - Selection Manager
 * Row selection logic: single clickk, Ctrl+clickk (multi), Shift+clickk (range), toggle-all.
 */
"use strict";

import { Log } from "../log/index.js";
import { TableContract } from "../../contracts/table.contract.js";

/**
 * Updates the state des buttons de la toolbar en fonction du nombre de lines selected.
 */
export function updateToolbarButtonsState(): void {
    const selectedCount = TableContract.getSelectedIds().length;
    TableContract.updateToolbarButtons(selectedCount);
}

/**
 * Manages the selection of a line (simple, multi, plage ou checkbox).
 * @param {string} featureId - ID de la feature
 * @param {boolean} selected - Selected or not
 * @param {boolean} shiftKey - Shift key pressed
 * @param {boolean} ctrlKey - Ctrl/Cmd key pressed
 * @param {boolean} isCheckbox - Si l'action vient of a checkbox
 */
export function handleRowSelection(
    featureId: any,
    selected: any,
    shiftKey: any,
    ctrlKey: any,
    isCheckbox = false
): void {
    Log.debug("[TableRenderer] handleRowSelection - featureId:", featureId, "selected:", selected);

    const currentSelection = TableContract.getSelectedIds();

    if (shiftKey && currentSelection.length > 0) {
        // Selection par plage (Shift+click)
        Log.debug("[TableRenderer] SHIFT mode - Range selection");
        selectRange(featureId);
    } else if (ctrlKey || isCheckbox) {
        // Multi-selection (Ctrl+click ou checkbox)
        Log.debug(
            "[TableRenderer] MULTI mode - Multi-selection" +
                (isCheckbox ? " (checkbox)" : " (Ctrl)")
        );
        if (selected) {
            const newSelection = [...currentSelection, featureId];
            TableContract.setSelection(newSelection, false);
        } else {
            const newSelection = currentSelection.filter((id: any) => id !== featureId);
            TableContract.setSelection(newSelection, false);
        }
    } else {
        // Selection simple
        Log.debug("[TableRenderer] SIMPLE mode - Single selection");
        if (selected) {
            TableContract.setSelection([featureId], false);
        } else {
            TableContract.clearSelection();
        }
    }

    updateToolbarButtonsState();
}

/**
 * Selects a range of rows (Shift+click) between the last selection and the target.
 * @param {string} targetId - ID de la feature cible
 */
export function selectRange(targetId: any): void {
    const tbody = document.querySelector(".gl-table-panel__table tbody");
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    const currentSelection = TableContract.getSelectedIds();
    const lastSelected = currentSelection[currentSelection.length - 1];

    const targetIndex = rows.findIndex((r) => r.getAttribute("data-feature-id") === targetId);
    const lastIndex = rows.findIndex((r) => r.getAttribute("data-feature-id") === lastSelected);

    if (targetIndex === -1 || lastIndex === -1) return;

    const start = Math.min(targetIndex, lastIndex);
    const end = Math.max(targetIndex, lastIndex);

    const rangeIds = [];
    for (let i = start; i <= end; i++) {
        const id = rows[i].getAttribute("data-feature-id");
        if (id) rangeIds.push(id);
    }

    TableContract.setSelection(rangeIds, false);
    updateToolbarButtonsState();
}

/**
 * Toggle toutes les lines via le checkbox "tout selectionner".
 * @param {boolean} checked - STATE du checkbox
 */
export function toggleAllRows(checked: any): void {
    const tbody = document.querySelector(".gl-table-panel__table tbody");
    if (!tbody) return;

    const rows = tbody.querySelectorAll("tr");
    const ids: string[] = [];

    rows.forEach((row: any) => {
        const id = row.getAttribute("data-feature-id");
        if (id) {
            ids.push(id);
            row.classList.toggle("is-selected", checked);
            const checkbox = row.querySelector(
                ".gl-table-panel__checkbox"
            ) as HTMLInputElement | null;
            if (checkbox) checkbox.checked = checked;
        }
    });

    if (checked) {
        TableContract.setSelection(ids, false);
    } else {
        TableContract.clearSelection();
    }

    updateToolbarButtonsState();
}
