/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/legend/index.js — SHIM LEGACY
 * Rétrocompatibilité : expose Legend depuis src/legend/ → src/modules/geoleaf.legend.js
 * @module src/legend
 */
import { Legend } from '../modules/geoleaf.legend.js';

// Méthodes disponibles sur Legend (proxy-forwarding)
export const init          = (...args) => Legend.init?.(...args);
export const reset         = (...args) => Legend.reset?.(...args);
export const getOptions    = (...args) => Legend.getOptions?.(...args);

// Méthodes absentes de l'implémentation actuelle — stubs compatibles
export function addSection(id, label, opts = {})           { return { id, label, items: [], ...opts }; }
export function removeSection(id)                          { return false; }
export function getSection(id)                             { return null; }
export function getSections()                              { return []; }
export function updateSections(sections)                   { return sections; }
export function addItem(sectionId, item)                   { return item; }
export function removeItem(sectionId, itemId)              { return false; }
export function getItem(sectionId, itemId)                 { return null; }
export function toggleItem(sectionId, itemId)              { return false; }
export function setItemVisibility(sectionId, itemId, v)    { return v; }
export function toggleCollapse(sectionId)                  { return false; }
export function isCollapsed(sectionId)                     { return false; }
export function setCollapsed(sectionId, collapsed)         { return collapsed; }

export { Legend };
