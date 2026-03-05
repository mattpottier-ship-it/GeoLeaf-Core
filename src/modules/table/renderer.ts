/**
 * GeoLeaf Table - Renderer Module
 * Rendu des colonnes, lignes et pagination avec virtual scrolling
 */
"use strict";

import { Log } from "../log/index.js";
import { $create } from "../utils/dom-helpers.js";
import { getNestedValue } from "../utils/object-utils.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { GeoJSONShared } from "../geojson/shared.js";
import { events as _events } from "../utils/event-listener-manager.js";
import { TableContract } from "../../contracts/table.contract.js";

const _TableRenderer: any = {};
_TableRenderer._eventCleanups = [];

// Virtual scrolling (Sprint 8.2): only render visible rows + buffer
const VIRTUAL_ROW_HEIGHT = 32;
const VIRTUAL_BUFFER = 20;
const VIRTUAL_THRESHOLD = 150;
/** @type {WeakMap<HTMLElement, { features: unknown[]; columns: unknown[]; selectedIds: Set<string>; layerConfig: unknown }>} */
const _virtualState = new WeakMap();

/**
 * Flush all tracked event cleanups (called before re-render and on destroy)
 */
_TableRenderer._flushEventCleanups = function () {
    const cleanups = this._eventCleanups;
    for (let i = 0; i < cleanups.length; i++) {
        if (typeof cleanups[i] === "function") {
            try {
                cleanups[i]();
            } catch (_e) {
                /* ignore */
            }
        }
    }
    cleanups.length = 0;
};

/**
 * Destroy the table renderer and clean up all event listeners
 */
_TableRenderer.destroy = function () {
    this._flushEventCleanups();
};

/**
 * Rend le tableau avec les donn�es fournies
 * @param {HTMLElement} container - Conteneur du tableau
 * @param {Object} options - Options de rendu
 * @param {string} options.layerId - ID de la couche
 * @param {Array} options.features - Features � afficher
 * @param {Set} options.selectedIds - IDs des entit�s s�lectionn�es
 * @param {Object} options.sortState - �tat du tri
 * @param {Object} options.config - Configuration du tableau
 */
_TableRenderer.render = function (container: any, options: any) {
    Log.debug("[TableRenderer] render() - D�but, options:", options);

    if (!container) {
        Log.error("[TableRenderer] Conteneur invalide");
        return;
    }

    // Phase 1 fix L4.4: flush previous event cleanups before re-render
    _TableRenderer._flushEventCleanups();

    // R�initialiser le compteur d'IDs synth�tiques � chaque rendu
    _syntheticIdCounter = 0;

    const { layerId, features, selectedIds, sortState } = options;
    Log.debug(
        "[TableRenderer] render() - layerId:",
        layerId,
        "features:",
        features ? features.length : 0
    );

    const table = container.querySelector(".gl-table-panel__table");
    if (!table) {
        Log.error("[TableRenderer] Élément table introuvable");
        return;
    }

    // Si pas de layerId, vider le tableau
    if (!layerId) {
        // SAFE: Chaîne vide pour nettoyer le contenu
        DOMSecurity.clearElementFast(table);
        Log.debug("[TableRenderer] Tableau vidé (aucune couche sélectionnée)");
        return;
    }

    // Récupérer la config du layer
    const layerData = GeoJSONShared.getLayerById(layerId) as any;
    const layerConfig =
        layerData && layerData.config && layerData.config.table ? layerData.config.table : null;

    if (!layerConfig || !layerConfig.columns) {
        Log.warn("[TableRenderer] Aucune configuration de colonne pour", layerId);
        // SAFE: Cha�ne vide pour nettoyer le contenu
        DOMSecurity.clearElementFast(table);
        return;
    }

    Log.debug("[TableRenderer] Colonnes:", layerConfig.columns);

    // Vider le tableau
    // SAFE: Cha�ne vide pour nettoyer le contenu avant reconstruction
    DOMSecurity.clearElementFast(table);

    // Cr�er le thead
    const thead = createTableHead(layerConfig.columns, sortState);
    table.appendChild(thead);

    let tbody;
    if (features.length > VIRTUAL_THRESHOLD) {
        tbody = createTableBodyVirtual(features, layerConfig.columns, selectedIds);
        table.appendChild(tbody);
        _virtualState.set(container, {
            features,
            columns: layerConfig.columns,
            selectedIds,
            layerConfig,
        });
        setupVirtualScroll(container);
    } else {
        tbody = createTableBody(features, layerConfig.columns, selectedIds);
        table.appendChild(tbody);
    }

    Log.debug(
        "[TableRenderer] Tableau rendu:",
        features.length,
        "lignes",
        features.length > VIRTUAL_THRESHOLD ? "(virtual)" : ""
    );
};

/**
 * Cr�e l'en-t�te du tableau (thead)
 * @param {Array} columns - Configuration des colonnes
 * @param {Object} sortState - �tat du tri actuel
 * @returns {HTMLElement}
 * @private
 */
function createTableHead(columns: any, sortState: any) {
    const thead = $create("thead");
    const tr = $create("tr");

    // Colonne checkbox (s�lection)
    const thCheckbox = $create("th", {
        className: "gl-table-panel__th gl-table-panel__th--checkbox",
    });

    const checkboxAll = $create("input", {
        type: "checkbox",
        className: "gl-table-panel__checkbox-all",
        title: "Tout s�lectionner / Tout d�s�lectionner",
    });

    const checkboxAllHandler = (e: any) => {
        toggleAllRows(e.target.checked);
    };

    const events = _events;
    if (events) {
        _TableRenderer._eventCleanups.push(
            events.on(checkboxAll, "change", checkboxAllHandler, false, "TableRenderer.checkboxAll")
        );
    } else {
        checkboxAll.addEventListener("change", checkboxAllHandler);
    }

    thCheckbox.appendChild(checkboxAll);
    tr.appendChild(thCheckbox);

    // Colonnes de donn�es
    columns.forEach((col: any) => {
        const th = $create("th", { className: "gl-table-panel__th" });
        th.textContent = col.label || col.field;

        if (col.width) {
            th.style.width = col.width;
        }

        // Rendre la colonne triable (par d�faut toutes les colonnes sont triables)
        const isSortable = col.sortable !== false;
        if (isSortable) {
            th.classList.add("gl-table-panel__th--sortable");
            th.setAttribute("data-field", col.field);

            // Ajouter les indicateurs de tri
            const sortIcon = $create("span", { className: "gl-table-panel__sort-icon" });

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

            // �v�nement de tri - avec cleanup tracking
            const sortHandler = () => {
                TableContract.sortByField(col.field);
            };

            const events = _events;
            if (events) {
                _TableRenderer._eventCleanups.push(
                    events.on(th, "click", sortHandler, false, "TableRenderer.sort")
                );
            } else {
                th.addEventListener("click", sortHandler);
            }
        }

        tr.appendChild(th);
    });

    thead.appendChild(tr);
    return thead;
}

/**
 * Cr�e le corps du tableau (tbody)
 * @param {Array} features - Features � afficher
 * @param {Array} columns - Configuration des colonnes
 * @param {Set} selectedIds - IDs s�lectionn�s
 * @returns {HTMLElement}
 * @private
 */
function createTableBody(features: any, columns: any, selectedIds: any) {
    Log.debug("[TableRenderer] createTableBody() - features:", features.length);

    const tbody = $create("tbody");

    // Sprint 3.2: Use DocumentFragment for batch DOM operations
    const fragment = document.createDocumentFragment();

    features.forEach((feature: any) => {
        const tr = createTableRow(feature, columns, selectedIds);
        fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);

    Log.debug("[TableRenderer] tbody cr�� avec", tbody.children.length, "lignes");
    return tbody;
}

/**
 * Creates tbody for virtual scrolling: fixed height, only visible window filled on first paint.
 */
function createTableBodyVirtual(features: any, columns: any, selectedIds: any) {
    const tbody = $create("tbody");
    tbody.setAttribute("data-virtual", "true");
    tbody.style.height = features.length * VIRTUAL_ROW_HEIGHT + "px";
    updateVirtualRows(tbody, features, columns, selectedIds, 0);
    return tbody;
}

/**
 * Fills tbody with spacer + visible rows + spacer based on scrollTop.
 */
function updateVirtualRows(
    tbody: any,
    features: any,
    columns: any,
    selectedIds: any,
    scrollTop: any
) {
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
        const tr = createTableRow(feature, columns, selectedIds);
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
 * Attaches scroll listener to table wrapper to update visible rows.
 */
function setupVirtualScroll(container: any) {
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
            wrapper.scrollTop
        );
    };

    if (_events) {
        _TableRenderer._eventCleanups.push(
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

/**
 * Cr�e une ligne du tableau
 * @param {Object} feature - Feature GeoJSON
 * @param {Array} columns - Configuration des colonnes
 * @param {Set} selectedIds - IDs s�lectionn�s
 * @returns {HTMLElement}
 * @private
 */
function createTableRow(feature: any, columns: any, selectedIds: any) {
    const tr = $create("tr");
    const featureId = getFeatureId(feature);
    tr.setAttribute("data-feature-id", featureId);

    const isSelected = selectedIds.has(String(featureId));
    if (isSelected) {
        tr.classList.add("is-selected");
    }

    // Cellule checkbox
    const tdCheckbox = $create("td", {
        className: "gl-table-panel__td gl-table-panel__td--checkbox",
    });

    const checkbox = $create("input", {
        type: "checkbox",
        className: "gl-table-panel__checkbox",
        checked: isSelected,
    });

    const checkboxHandler = (e: any) => {
        handleRowSelection(featureId, (e.target as HTMLInputElement).checked, false, true, true);
    };

    const events = _events;
    if (events) {
        _TableRenderer._eventCleanups.push(
            events.on(checkbox, "change", checkboxHandler, false, "TableRenderer.checkbox")
        );
    } else {
        checkbox.addEventListener("change", checkboxHandler);
    }

    tdCheckbox.appendChild(checkbox);
    tr.appendChild(tdCheckbox);

    // Cellules de donn�es
    columns.forEach((col: any) => {
        const td = $create("td", { className: "gl-table-panel__td" });

        const value = getNestedValue(feature, col.field);
        const formattedValue = formatValue(value, col.type);

        td.textContent = formattedValue;

        // Aligner les nombres � droite
        if (col.type === "number") {
            td.classList.add("gl-table-panel__td--number");
        }

        tr.appendChild(td);
    });

    // �v�nement clic sur la ligne (s�lection simple) - avec cleanup tracking
    const rowClickHandler = (e: any) => {
        if ((e.target as HTMLElement).getAttribute?.("type") === "checkbox") return;
        const currentState = tr.classList.contains("is-selected");
        handleRowSelection(featureId, !currentState, e.shiftKey, e.ctrlKey || e.metaKey);
    };

    // Reuse EventListenerManager from outer scope
    if (_events) {
        _TableRenderer._eventCleanups.push(
            _events.on(tr, "click", rowClickHandler, false, "TableRenderer.rowClick")
        );
    } else {
        tr.addEventListener("click", rowClickHandler);
    }

    return tr;
}

/**
 * G�re la s�lection d'une ligne
 * @param {string} featureId - ID de la feature
 * @param {boolean} selected - S�lectionn� ou non
 * @param {boolean} shiftKey - Touche Shift enfonc�e
 * @param {boolean} ctrlKey - Touche Ctrl/Cmd enfonc�e
 * @param {boolean} isCheckbox - Si l'action vient d'une checkbox
 * @private
 */
function handleRowSelection(
    featureId: any,
    selected: any,
    shiftKey: any,
    ctrlKey: any,
    isCheckbox = false
) {
    Log.debug("[TableRenderer] handleRowSelection - featureId:", featureId, "selected:", selected);

    const currentSelection = TableContract.getSelectedIds();

    if (shiftKey && currentSelection.length > 0) {
        // S�lection par plage (Shift+clic)
        Log.debug("[TableRenderer] Mode SHIFT - S�lection par plage");
        selectRange(featureId);
    } else if (ctrlKey || isCheckbox) {
        // Multi-s�lection (Ctrl+clic ou checkbox)
        Log.debug(
            "[TableRenderer] Mode MULTI - Multi-s�lection" +
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
        // S�lection simple
        Log.debug("[TableRenderer] Mode SIMPLE - S�lection unique");
        if (selected) {
            TableContract.setSelection([featureId], false);
        } else {
            TableContract.clearSelection();
        }
    }

    // Mettre � jour l'�tat des boutons
    updateToolbarButtonsState();
}

/**
 * S�lectionne une plage de lignes (Shift+clic)
 * @param {string} targetId - ID de la feature cible
 * @private
 */
function selectRange(targetId: any) {
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
 * Toggle toutes les lignes (checkbox "tout s�lectionner")
 * @param {boolean} checked - �tat du checkbox
 * @private
 */
function toggleAllRows(checked: any) {
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

/**
 * Met � jour la s�lection visuelle dans le tableau
 * @param {HTMLElement} container - Conteneur du tableau
 * @param {Set} selectedIds - IDs s�lectionn�s
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

    // Mettre � jour le checkbox "tout s�lectionner"
    const checkboxAll = container.querySelector(".gl-table-panel__checkbox-all");
    if (checkboxAll) {
        const totalRows = rows.length;
        const selectedCount = selectedIds.size;
        checkboxAll.checked = totalRows > 0 && selectedCount === totalRows;
        checkboxAll.indeterminate = selectedCount > 0 && selectedCount < totalRows;
    }

    updateToolbarButtonsState();
};

// Virtual scrolling supprim� � la pagination dans renderTable() est suffisante.
// TODO(v5): R�impl�menter si les datasets > 10 000 lignes deviennent courants.

/**
 * Met � jour l'�tat des boutons de la toolbar
 * @private
 */
function updateToolbarButtonsState() {
    const selectedCount = TableContract.getSelectedIds().length;
    TableContract.updateToolbarButtons(selectedCount);
}

/**
 * Compteur interne pour g�n�rer des IDs synth�tiques
 * @type {number}
 * @private
 */
let _syntheticIdCounter = 0;

/**
 * R�cup�re l'ID d'une feature de mani�re fiable
 * Parcourt plusieurs propri�t�s candidates puis g�n�re un ID synth�tique si n�cessaire
 * @param {Object} feature - Feature GeoJSON
 * @returns {string}
 * @private
 */
function getFeatureId(feature: any) {
    // 1. ID standard GeoJSON
    if (feature.id != null && feature.id !== "") return String(feature.id);

    const p = feature.properties;
    if (!p) return "__gl_row_" + _syntheticIdCounter++;

    // 2. Propri�t�s d'identifiant courantes
    if (p.id != null && p.id !== "") return String(p.id);
    if (p.fid != null && p.fid !== "") return String(p.fid);
    if (p.osm_id != null && p.osm_id !== "") return String(p.osm_id);
    if (p.OBJECTID != null && p.OBJECTID !== "") return String(p.OBJECTID);
    if (p.SITE_ID != null && p.SITE_ID !== "") return String(p.SITE_ID);
    if (p.code != null && p.code !== "") return String(p.code);
    if (p.IN1 != null && p.IN1 !== "") return String(p.IN1);

    // 3. Fallback : ID synth�tique bas� sur un compteur
    return "__gl_row_" + _syntheticIdCounter++;
}

/**
 * Formate une valeur selon son type
 * @param {*} value - Valeur � formater
 * @param {string} type - Type de donn�es (string, number, date)
 * @returns {string}
 * @private
 */
function formatValue(value: any, type: any) {
    if (value == null || value === "") return "�";

    if (type === "number") {
        const num = Number(value);
        if (isNaN(num)) return String(value);
        // Formater avec s�parateurs de milliers
        return num.toLocaleString("fr-FR");
    }

    if (type === "date") {
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString("fr-FR");
    }

    return String(value);
}

const TableRenderer = _TableRenderer;
export { TableRenderer };
