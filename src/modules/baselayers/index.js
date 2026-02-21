/*!
 * GeoLeaf Core – Baselayers / Index (barrel)
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

import {
    ensureMap,
    setMap,
    registerDefaultBaseLayers,
    registerBaseLayer,
    registerBaseLayers,
    setBaseLayer,
    getBaseLayers,
    getActiveKey,
    getActiveLayer,
} from "./registry.js";
import { createBaseLayerControlsUI, bindUIOnce, refreshUI, destroyUI } from "./ui.js";

function init(options) {
    options = options || {};

    if (options.map) {
        setMap(options.map);
    } else {
        ensureMap();
    }

    registerDefaultBaseLayers();

    if (options.baselayers && typeof options.baselayers === "object") {
        registerBaseLayers(options.baselayers);
    }

    if (options.activeKey) {
        setBaseLayer(options.activeKey, { silent: true });
    }

    if (!getActiveKey()) {
        const keys = Object.keys(getBaseLayers());
        if (keys.length > 0) {
            setBaseLayer(keys[0], { silent: true });
        }
    }

    createBaseLayerControlsUI(options);
    bindUIOnce();
    refreshUI();

    return {
        activeKey: getActiveKey(),
        layers: getBaseLayers(),
    };
}

export const Baselayers = {
    init,
    registerBaseLayer,
    registerBaseLayers,
    setBaseLayer,
    setActive: setBaseLayer, // alias compat
    getBaseLayers,
    getActiveKey,
    getActiveId: getActiveKey, // alias compat
    getActiveLayer,
    destroy: destroyUI,
};
