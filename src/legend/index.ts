/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/legend/index.js — SHIM LEGACY
 * Backward compatibility : expose Legend from src/legend/ → src/modules/geoleaf.legend.js
 * @module src/legend
 */
import { Legend as _Legend } from "../modules/geoleaf.legend.js";
const Legend: any = _Legend;

// Methods availables sur Legend (proxy-forwarding)
export const init = (...args: any[]) => (Legend.init as any)?.(...args);
export const reset = (...args: any[]) => (Legend.reset as any)?.(...args);
export const getOptions = (...args: any[]) => (Legend.getOptions as any)?.(...args);

// Methods absentes of the implementation currentle — stubs compatibles
export function addSection(_id: any, _label: any, _opts: any = {}) {
    return { id: _id, label: _label, items: [], ..._opts };
}
export function removeSection(_id: any) {
    return false;
}
export function getSection(_id: any) {
    return null;
}
export function getSections() {
    return [];
}
export function updateSections(sections: any) {
    return sections;
}
export function addItem(_sectionId: any, item: any) {
    return item;
}
export function removeItem(_sectionId: any, _itemId: any) {
    return false;
}
export function getItem(_sectionId: any, _itemId: any) {
    return null;
}
export function toggleItem(_sectionId: any, _itemId: any) {
    return false;
}
export function setItemVisibility(_sectionId: any, _itemId: any, v: any) {
    return v;
}
export function toggleCollapse(_sectionId: any) {
    return false;
}
export function isCollapsed(_sectionId: any) {
    return false;
}
export function setCollapsed(_sectionId: any, collapsed: any) {
    return collapsed;
}

export { Legend };
