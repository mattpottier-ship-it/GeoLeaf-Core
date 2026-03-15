/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/table/index.js — SHIM LEGACY
 * Rétrocompatibilité : expose Table depuis src/table/ ? src/modules/geoleaf.table.js
 * @module src/table
 */
import { Table as _Table } from "../modules/geoleaf.table.js";
const Table: any = _Table;

// Méthodes availables sur Table
export const init = (...args: any[]) => Table.init?.(...(args as any));
export const setLayer = (...args: any[]) => Table.setLayer?.(...(args as any));
export const sortByField = (...args: any[]) => Table.sortByField?.(...(args as any));
export const setSelection = (...args: any[]) => Table.setSelection?.(...(args as any));
export const getSelectedIds = (...args: any[]) => Table.getSelectedIds?.(...(args as any));
export const clearSelection = (...args: any[]) => Table.clearSelection?.(...(args as any));
export const getOptions = (...args: any[]) => Table.getOptions?.(...(args as any));
export const setOptions = (...args: any[]) => Table.setOptions?.(...(args as any));

// Méthodes absentes — stubs pour compatibilité
export function reset() {
    return undefined;
}
export function getCurrentLayer() {
    return null;
}
export function setData(data: any) {
    return data;
}
export function getData() {
    return [];
}
export function getDataCount() {
    return 0;
}
export function setSort(field: any, dir: any) {
    return { field, dir };
}
export function getSortState() {
    return { field: null, direction: null };
}
export function clearSort() {
    return undefined;
}
export function addToSelection(id: any) {
    return id;
}
export function removeFromSelection(id: any) {
    return id;
}
export function toggleSelection(_id: any) {
    return false;
}
export function isSelected(_id: any) {
    return false;
}
export function getSelectedCount() {
    return 0;
}
export function selectAll() {
    return undefined;
}
export function getSelectedFeatures() {
    return [];
}
export function searchData(_q: any) {
    return [];
}
export function filterByField(_f: any, _v: any) {
    return [];
}
export function getUniqueValues(_field: any) {
    return [];
}
export function getPage(_page: any, _size: any) {
    return [];
}
export function getSelectionBounds() {
    return null;
}
export function getFieldStats(_field: any) {
    return { min: null, max: null, count: 0 };
}

export { Table };
