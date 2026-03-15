// @ts-nocheck — migration TS, typage progressif
/**
 * GeoLeaf UI Filter Panel - Proximity Manual Mode
 * Activation du mode proximity par click manuel sur the map — compatible panel ET toolbar.
 * Eliminates duplication between activateManualMode() (panel) and the manual branch
 * de toggleProximityToolbar() (toolbar).
 *
 * Note : le radius est lu via callback au moment du click (pas to the activation) pour
 * capture the current slider value, including if it changed after activation.
 *
 * @module ui/filter-panel/proximity-manual-mode
 */
"use strict";

import { getLog } from "../../utils/general-utils.js";
import { ProximityState } from "./proximity-state.js";
import {
    createProximityCircle,
    createManualMarker,
    removeCircleAndMarker,
} from "./proximity-circle.js";

interface ManualModeOptions {
    onPointPlaced?: () => void;
}

/**
 * Activates manual mode on a given DOM wrapper.
 * Utilisable from the panel comme from the toolbar.
 *
 * @param map          - Instance de carte Leaflet
 * @param wrapper      - Element [data-gl-filter-id="proximity"] recevant les attributes data-proximity-*
 * @param getRadiusKm  - Callback called au click pour lire le radius current en km
 * @param options      - Callbacks optionals (onPointPlaced)
 */
export function activateManualMode(
    map: any,
    wrapper: HTMLElement,
    getRadiusKm: () => number,
    options?: ManualModeOptions
): void {
    const Log = getLog();

    Log.info("[GeoLeaf.Proximity] Manual mode: click on the map to define the search point");

    map.getContainer().style.cursor = "crosshair";

    ProximityState.clickHandler = function (e: any) {
        // Lire le radius au moment du click, pas to the activation
        const radiusKm = getRadiusKm();
        const radiusMeters = radiusKm * 1000;

        removeCircleAndMarker(map);
        createProximityCircle(e.latlng, radiusMeters, map);
        createManualMarker(e.latlng, map, wrapper);

        if (!wrapper) {
            Log.warn("[GeoLeaf.Proximity] clickHandler: wrapper not found, attributes not updated");
            return;
        }

        wrapper.setAttribute("data-proximity-lat", String(e.latlng.lat));
        wrapper.setAttribute("data-proximity-lng", String(e.latlng.lng));
        wrapper.setAttribute("data-proximity-radius", String(radiusKm));
        wrapper.setAttribute("data-proximity-active", "true");

        map.getContainer().style.cursor = "";
        map.off("click", ProximityState.clickHandler);
        ProximityState.clickHandler = null;

        Log.info("[GeoLeaf.Proximity] Manual proximity point defined", {
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            radius: radiusKm,
        });

        options?.onPointPlaced?.();
    };

    map.on("click", ProximityState.clickHandler);
}
