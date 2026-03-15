/**
 * GeoLeaf Table API - Orchestrator and public API.
 * Wires together table-state, table-layer, table-highlight and table-selection sub-modules.
 *
 * @module table/table-api
 */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */
"use strict";

import { Log } from "../log/index.js";
import { tableState, fireEvent, _g } from "./table-state.js";
import {
    getLayerFeatures,
    getAvailableLayers,
    getAvailableVisibleLayers,
    attachMapEvents,
} from "./table-layer.js";
import {
    clearHighlightLayers,
    highlightSelection,
    extendBoundsFromGeometry,
} from "./table-highlight.js";
import {
    setSelection,
    clearSelection,
    getSelectedIds,
    zoomToSelection,
    exportSelection,
} from "./table-selection.js";
import { getNestedValue } from "../utils/object-utils.js";
import { sortInPlace, nextSortState } from "./sort.js";
import { resolveFeatureId } from "./export.js";
import { TablePanel as _TablePanel } from "./panel.js";
import { TableRenderer as _TableRenderer } from "./renderer.js";
import { TableContract } from "../../contracts/table.contract.js";

function applySorting(): void {
    sortInPlace(tableState._cachedData, tableState._sortState, (o: any, p: any) =>
        getNestedValue(o, p)
    );
    Log.debug(
        "[Table] Sort applied:",
        tableState._sortState.field,
        tableState._sortState.direction
    );
}

const TableModule: any = {
    init(options: any) {
        if (!options || !options.map) {
            Log.error("[Table] init() requires a Leaflet map instance");
            return;
        }
        tableState._map = options.map;
        const globalConfig = _g.GeoLeaf.Config ? _g.GeoLeaf.Config.get("tableConfig") : null;
        tableState._config = Object.assign(
            {
                enabled: true,
                defaultVisible: false,
                pageSize: 50,
                maxRowsPerLayer: 1000,
                enableExportButton: true,
                virtualScrolling: true,
                defaultHeight: "40%",
                minHeight: "20%",
                maxHeight: "60%",
                resizable: true,
            },
            globalConfig,
            options.config
        );
        if (!tableState._config.enabled) {
            Log.info("[Table] Module disabled via configuration");
            return;
        }
        Log.info("[Table] Initialisation du module Table", tableState._config);
        if (_TablePanel && typeof (_TablePanel as any).create === "function") {
            tableState._container = (_TablePanel as any).create(
                tableState._map,
                tableState._config
            ) as HTMLElement;
        } else {
            Log.error("[Table] Module table/panel.js not loaded");
            return;
        }
        if (tableState._config.defaultVisible) {
            this.show();
        }
        attachMapEvents(
            () => this.refresh(),
            (layerId: string) => this.setLayer(layerId)
        );
        Log.info("[Table] Table module initialized successfully");
    },

    show() {
        if (!tableState._container) {
            Log.warn("[Table] Container not initialized");
            return;
        }
        tableState._container.classList.add("is-visible");
        tableState._isVisible = true;
        fireEvent("table:opened", {});
        Log.debug("[Table] Table shown");
    },

    hide() {
        if (!tableState._container) return;
        clearHighlightLayers();
        tableState._highlightActive = false;
        tableState._container.classList.remove("is-visible");
        tableState._isVisible = false;
        fireEvent("table:closed", {});
        Log.debug("[Table] Table hidden");
    },

    toggle() {
        if (tableState._isVisible) {
            this.hide();
        } else {
            this.show();
        }
    },

    setLayer(layerId: any) {
        Log.debug("[Table] setLayer called with:", layerId);
        if (!layerId) {
            tableState._currentLayerId = null;
            tableState._selectedIds.clear();
            clearHighlightLayers();
            tableState._highlightActive = false;
            tableState._featureIdMap.clear();
            tableState._sortState = { field: null, direction: null };
            tableState._cachedData = [];
            if (_TableRenderer) {
                (_TableRenderer as any).render(tableState._container, {
                    layerId: null,
                    features: [],
                    selectedIds: tableState._selectedIds,
                    sortState: tableState._sortState,
                    config: tableState._config,
                });
            }
            fireEvent("table:layerChanged", { layerId: null });
            Log.debug("[Table] Table cleared (no layer selected)");
            return;
        }
        const layers = getAvailableLayers();
        const layer = layers.find((l: any) => l.id === layerId);
        if (!layer) {
            Log.warn("[Table] Layer not found or not active for the table:", layerId);
            return;
        }
        tableState._currentLayerId = layerId;
        tableState._selectedIds.clear();
        clearHighlightLayers();
        tableState._highlightActive = false;
        tableState._sortState = { field: null, direction: null };
        const layerData = _g.GeoLeaf.GeoJSON ? _g.GeoLeaf.GeoJSON.getLayerData(layerId) : null;
        if (layerData?.config?.table?.defaultSort) {
            tableState._sortState.field = layerData.config.table.defaultSort.field;
            tableState._sortState.direction =
                layerData.config.table.defaultSort.direction ||
                layerData.config.table.defaultSort.order ||
                "asc";
        }
        this.refresh();
        fireEvent("table:layerChanged", { layerId });
        Log.debug("[Table] Layer changed:", layerId);
    },

    refresh() {
        if (!tableState._currentLayerId) {
            Log.debug("[Table] No layer selected, cannot refresh");
            return;
        }
        const features = getLayerFeatures(tableState._currentLayerId);
        tableState._cachedData = features;
        tableState._featureIdMap.clear();
        let syntheticCounter = 0;
        features.forEach((feature: any, index: number) => {
            const id = resolveFeatureId(feature, syntheticCounter);
            if (id.startsWith("__gl_row_")) syntheticCounter++;
            tableState._featureIdMap.set(id, index);
        });
        Log.debug("[Table] Features retrieved:", features.length);
        if (tableState._sortState.field && tableState._sortState.direction) {
            applySorting();
        }
        if (_TableRenderer && typeof (_TableRenderer as any).render === "function") {
            (_TableRenderer as any).render(tableState._container, {
                layerId: tableState._currentLayerId,
                features: tableState._cachedData,
                selectedIds: tableState._selectedIds,
                sortState: tableState._sortState,
                config: tableState._config,
            });
        } else {
            Log.error("[Table] Renderer non disponible");
        }
        Log.debug("[Table] Data refreshed:", features.length, "entities");
    },

    sortByField(field: any) {
        tableState._sortState = nextSortState(tableState._sortState as any, field);
        this.refresh();
        fireEvent("table:sortChanged", tableState._sortState);
    },

    setSelection: (ids: any[], add = false) => setSelection(ids, add),
    getSelectedIds: () => getSelectedIds(),
    clearSelection: () => clearSelection(),
    zoomToSelection: () => zoomToSelection(),
    highlightSelection: (active: any) => highlightSelection(active),
    exportSelection: () => exportSelection(),
};

const Table = TableModule;

// State property forwarding — permet aux tests d'access/modifier the state via Table._*
// comme avant l'extraction de table-state.ts
Object.defineProperties(TableModule, {
    _map: {
        get: () => tableState._map,
        set: (v) => {
            tableState._map = v;
        },
        configurable: true,
    },
    _container: {
        get: () => tableState._container,
        set: (v) => {
            tableState._container = v;
        },
        configurable: true,
    },
    _config: {
        get: () => tableState._config,
        set: (v) => {
            tableState._config = v;
        },
        configurable: true,
    },
    _currentLayerId: {
        get: () => tableState._currentLayerId,
        set: (v) => {
            tableState._currentLayerId = v;
        },
        configurable: true,
    },
    _selectedIds: { get: () => tableState._selectedIds, configurable: true },
    _cachedData: {
        get: () => tableState._cachedData,
        set: (v) => {
            tableState._cachedData = v;
        },
        configurable: true,
    },
    _featureIdMap: { get: () => tableState._featureIdMap, configurable: true },
    _highlightLayers: {
        get: () => tableState._highlightLayers,
        set: (v) => {
            tableState._highlightLayers = v;
        },
        configurable: true,
    },
    _highlightActive: {
        get: () => tableState._highlightActive,
        set: (v) => {
            tableState._highlightActive = v;
        },
        configurable: true,
    },
    _sortState: {
        get: () => tableState._sortState,
        set: (v) => {
            tableState._sortState = v;
        },
        configurable: true,
    },
    _isVisible: {
        get: () => tableState._isVisible,
        set: (v) => {
            tableState._isVisible = v;
        },
        configurable: true,
    },
    // Internal methods exposed for tests (previously on Table, now extracted)
    _getLayerFeatures: {
        value: (layerId: string) => getLayerFeatures(layerId),
        configurable: true,
    },
    _getAvailableLayers: { value: () => getAvailableLayers(), configurable: true },
    _getAvailableVisibleLayers: { value: () => getAvailableVisibleLayers(), configurable: true },
    _extendBoundsFromGeometry: {
        value: (bounds: any, geometry: any) => extendBoundsFromGeometry(bounds, geometry),
        configurable: true,
    },
});

TableContract.register(Table, _TablePanel);

export { Table };
