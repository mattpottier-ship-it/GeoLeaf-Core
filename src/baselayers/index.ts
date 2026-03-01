/**
 * src/baselayers/index.js — Shim: exposes Baselayers methods as named exports
 * Tests expect: BaseLayers, init, registerBaseLayer, setBaseLayer, getBaseLayers, getActiveKey
 * @see src/modules/geoleaf.baselayers.js
 */
import { Baselayers } from "../modules/geoleaf.baselayers.js";

export { Baselayers };
export const BaseLayers = Baselayers;
export const init = (...args: any[]) => (Baselayers.init as any)(...args);
export const registerBaseLayer = (...args: any[]) => (Baselayers.registerBaseLayer as any)(...args);
export const setBaseLayer = (...args: any[]) => (Baselayers.setBaseLayer as any)(...args);
export const getBaseLayers = () => Baselayers.getBaseLayers();
export const getActiveKey = () => Baselayers.getActiveKey();
