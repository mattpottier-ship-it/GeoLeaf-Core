/**
 * src/baselayers/index.js — Shim: exposes Baselayers methods as named exports
 * Tests expect: BaseLayers, init, registerBaseLayer, setBaseLayer, getBaseLayers, getActiveKey
 * @see src/modules/geoleaf.baselayers.js
 */
import { Baselayers } from '../modules/geoleaf.baselayers.js';

export { Baselayers };
export const BaseLayers = Baselayers;
export const init = (...args) => Baselayers.init(...args);
export const registerBaseLayer = (...args) => Baselayers.registerBaseLayer(...args);
export const setBaseLayer = (...args) => Baselayers.setBaseLayer(...args);
export const getBaseLayers = () => Baselayers.getBaseLayers();
export const getActiveKey = () => Baselayers.getActiveKey();
