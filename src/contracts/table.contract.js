/**
 * GeoLeaf Contract — Table (lazy-chunk boundary)
 *
 * Interface ESM pure pour que table/panel.js puisse appeler les méthodes
 * du module Table (geoleaf.table.js) sans couplage runtime.
 *
 * Phase 10-E — Pattern G : contrat de chunk Table.
 *
 * CYCLE ROMPU :
 *   geoleaf.table.js → table/panel.js (static import, inchangé)
 *   table/panel.js   → TableContract  (registration pattern)
 *   geoleaf.table.js appelle TableContract.register(Table) au chargement
 *
 * USAGE dans panel.js :
 *   import { TableContract } from '../../../contracts/table.contract.js';
 *
 *   if (TableContract.isAvailable()) {
 *       TableContract.setLayer(layerId);
 *   }
 *
 * REGISTRATION dans geoleaf.table.js (côté Table) :
 *   import { TableContract } from '../../contracts/table.contract.js';
 *   TableContract.register(TableModule);
 */
"use strict";

/** @type {Object|null} */
let _table = null;
/** @type {Object|null} */
let _panel = null;

/**
 * Contrat d'interface pour le module Table.
 * Permet à panel.js d'appeler les méthodes Table sans importer geoleaf.table.js
 * (ce qui créerait un cycle).
 * @namespace TableContract
 */
const TableContract = {
    /**
     * Enregistre l'instance Table (appelé par geoleaf.table.js au chargement).
     * @param {Object} tableInstance
     * @param {Object} [panelInstance]
     */
    register(tableInstance, panelInstance) {
        _table = tableInstance;
        if (panelInstance) _panel = panelInstance;
    },

    /**
     * Retourne true si Table est disponible.
     * @returns {boolean}
     */
    isAvailable() {
        return !!_table;
    },

    /**
     * @param {string} layerId
     */
    setLayer(layerId) {
        if (_table && typeof _table.setLayer === 'function') {
            _table.setLayer(layerId);
        }
    },

    /**
     * Zoom sur la sélection courante.
     */
    zoomToSelection() {
        if (_table && typeof _table.zoomToSelection === 'function') {
            _table.zoomToSelection();
        }
    },

    /**
     * @param {boolean} active
     */
    highlightSelection(active) {
        if (_table && typeof _table.highlightSelection === 'function') {
            _table.highlightSelection(active);
        }
    },

    /**
     * Export de la sélection.
     */
    exportSelection() {
        if (_table && typeof _table.exportSelection === 'function') {
            _table.exportSelection();
        }
    },

    /**
     * Toggle visibilité du tableau.
     */
    toggle() {
        if (_table && typeof _table.toggle === 'function') {
            _table.toggle();
        }
    },

    /**
     * Affiche le tableau.
     */
    show() {
        if (_table && typeof _table.show === 'function') {
            _table.show();
        }
    },

    // ── Selection API ──

    /**
     * @returns {string[]}
     */
    getSelectedIds() {
        if (_table && typeof _table.getSelectedIds === 'function') {
            return _table.getSelectedIds();
        }
        return [];
    },

    /**
     * @param {string[]} ids
     * @param {boolean} [fireEvent]
     */
    setSelection(ids, fireEvent) {
        if (_table && typeof _table.setSelection === 'function') {
            _table.setSelection(ids, fireEvent);
        }
    },

    /**
     * Clear la sélection.
     */
    clearSelection() {
        if (_table && typeof _table.clearSelection === 'function') {
            _table.clearSelection();
        }
    },

    /**
     * @param {string} field
     */
    sortByField(field) {
        if (_table && typeof _table.sortByField === 'function') {
            _table.sortByField(field);
        }
    },

    /**
     * Met à jour les boutons toolbar du panel.
     * @param {number} selectedCount
     */
    updateToolbarButtons(selectedCount) {
        if (_panel && typeof _panel.updateToolbarButtons === 'function') {
            _panel.updateToolbarButtons(selectedCount);
        }
    },
};

export { TableContract };
