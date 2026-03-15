/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf Table – Shared mutable state, utilities.
 * @module table/table-state
 */
"use strict";

const _gRaw: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
_gRaw.GeoLeaf = _gRaw.GeoLeaf || {};
export const _g: any = _gRaw;

export interface SortState {
    field: string | null;
    direction: string | null;
}

export const tableState = {
    _map: null as any,
    _config: null as any,
    _currentLayerId: null as string | null,
    _selectedIds: new Set<string>(),
    _cachedData: [] as any[],
    _featureIdMap: new Map<string, number>(),
    _highlightLayers: [] as any[],
    _highlightActive: false,
    _sortState: { field: null, direction: null } as SortState,
    _container: null as HTMLElement | null,
    _isVisible: false,
};

/** Emits an event sur the map Leaflet et le document DOM. */
export function fireEvent(eventName: string, detail: any): void {
    if (tableState._map && typeof tableState._map.fire === "function") {
        tableState._map.fire("geoleaf:" + eventName, detail);
    }
    if (typeof document !== "undefined" && document.dispatchEvent) {
        document.dispatchEvent(new CustomEvent("geoleaf:" + eventName, { detail }));
    }
}

/** Returns the features selected via le mapping ID→index du cache. */
export function getSelectedFeatures(): any[] {
    const result: any[] = [];
    tableState._selectedIds.forEach((id) => {
        const index = tableState._featureIdMap.get(id);
        if (index != null && tableState._cachedData[index]) {
            result.push(tableState._cachedData[index]);
        }
    });
    return result;
}
