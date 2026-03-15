/**
 * GeoLeaf Contract — Table (lazy-chunk boundary)
 *
 * Interface ESM pure pour que table/panel.js puisse appeler the methods
 * of the module Table (geoleaf.table.js) sans couplage runtime.
 *
 * Phase 10-E — Pattern G : contrat de chunk Table.
 *
 * CYCLE ROMPU :
 *   geoleaf.table.js → table/panel.js (static import, unchanged)
 *   table/panel.js   → TableContract  (registration pattern)
 *   geoleaf.table.js appelle TableContract.register(Table) au loading
 *
 * USAGE dans panel.js :
 *   import { TableContract } from '../../../contracts/table.contract.js';
 *
 *   if (TableContract.isAvailable()) {
 *       TableContract.setLayer(layerId);
 *   }
 *
 * REGISTRATION dans geoleaf.table.js (side Table) :
 *   import { TableContract } from '../../contracts/table.contract.js';
 *   TableContract.register(TableModule);
 */
"use strict";

/** @type {Object|null} */
let _table: any = null;
/** @type {Object|null} */
let _panel: any = null;

/**
 * Contrat d'interface pour the module Table.
 * Allows panel.js d'appeler the methods Table sans importer geoleaf.table.js
 * (which would create a cycle).
 * @namespace TableContract
 */
const TableContract = {
    /**
     * Registers the instance Table (called par geoleaf.table.js au loading).
     * @param {Object} tableInstance
     * @param {Object} [panelInstance]
     */
    register(tableInstance: any, panelInstance?: any) {
        _table = tableInstance;
        if (panelInstance) _panel = panelInstance;
    },

    /**
     * Returns true si Table est available.
     * @returns {boolean}
     */
    isAvailable() {
        return !!_table;
    },

    /**
     * @param {string} layerId
     */
    setLayer(layerId: any) {
        if (_table && typeof _table.setLayer === "function") {
            _table.setLayer(layerId);
        }
    },

    /**
     * Zoom sur the selection currente.
     */
    zoomToSelection() {
        if (_table && typeof _table.zoomToSelection === "function") {
            _table.zoomToSelection();
        }
    },

    /**
     * @param {boolean} active
     */
    highlightSelection(active: any) {
        if (_table && typeof _table.highlightSelection === "function") {
            _table.highlightSelection(active);
        }
    },

    /**
     * Export de the selection.
     */
    exportSelection() {
        if (_table && typeof _table.exportSelection === "function") {
            _table.exportSelection();
        }
    },

    /**
     * Toggle visibility du array.
     */
    toggle() {
        if (_table && typeof _table.toggle === "function") {
            _table.toggle();
        }
    },

    /**
     * Displays the table.
     */
    show() {
        if (_table && typeof _table.show === "function") {
            _table.show();
        }
    },

    // ── Selection API ──

    /**
     * @returns {string[]}
     */
    getSelectedIds() {
        if (_table && typeof _table.getSelectedIds === "function") {
            return _table.getSelectedIds();
        }
        return [];
    },

    /**
     * @param {string[]} ids
     * @param {boolean} [fireEvent]
     */
    setSelection(ids: any, fireEvent?: any) {
        if (_table && typeof _table.setSelection === "function") {
            _table.setSelection(ids, fireEvent);
        }
    },

    /**
     * Clear the selection.
     */
    clearSelection() {
        if (_table && typeof _table.clearSelection === "function") {
            _table.clearSelection();
        }
    },

    /**
     * @param {string} field
     */
    sortByField(field: any) {
        if (_table && typeof _table.sortByField === "function") {
            _table.sortByField(field);
        }
    },

    /**
     * Updates thes buttons toolbar du panel.
     * @param {number} selectedCount
     */
    updateToolbarButtons(selectedCount: any) {
        if (_panel && typeof _panel.updateToolbarButtons === "function") {
            _panel.updateToolbarButtons(selectedCount);
        }
    },
};

export { TableContract };
