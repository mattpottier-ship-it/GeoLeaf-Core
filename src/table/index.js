/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/table/index.js — SHIM LEGACY
 * Rétrocompatibilité : expose Table depuis src/table/ → src/modules/geoleaf.table.js
 * @module src/table
 */
import { Table } from '../modules/geoleaf.table.js';

// Méthodes disponibles sur Table
export const init           = (...args) => Table.init?.(...args);
export const setLayer       = (...args) => Table.setLayer?.(...args);
export const sortByField    = (...args) => Table.sortByField?.(...args);
export const setSelection   = (...args) => Table.setSelection?.(...args);
export const getSelectedIds = (...args) => Table.getSelectedIds?.(...args);
export const clearSelection = (...args) => Table.clearSelection?.(...args);
export const getOptions     = (...args) => Table.getOptions?.(...args);
export const setOptions     = (...args) => Table.setOptions?.(...args);

// Méthodes absentes — stubs pour compatibilité
export function reset()                           { return undefined; }
export function getCurrentLayer()                 { return null; }
export function setData(data)                     { return data; }
export function getData()                         { return []; }
export function getDataCount()                    { return 0; }
export function setSort(field, dir)               { return { field, dir }; }
export function getSortState()                    { return { field: null, direction: null }; }
export function clearSort()                       { return undefined; }
export function addToSelection(id)                { return id; }
export function removeFromSelection(id)           { return id; }
export function toggleSelection(id)               { return false; }
export function isSelected(id)                    { return false; }
export function getSelectedCount()                { return 0; }
export function selectAll()                       { return undefined; }
export function getSelectedFeatures()             { return []; }
export function searchData(q)                     { return []; }
export function filterByField(f, v)               { return []; }
export function getUniqueValues(field)            { return []; }
export function getPage(page, size)               { return []; }
export function getSelectionBounds()              { return null; }
export function getFieldStats(field)              { return { min: null, max: null, count: 0 }; }

export { Table };
