/**
 * GeoLeaf POI API (assemblage namespace POI)
 *
 * Assemble GeoLeaf.POI from thes sous-modules refactoreds :
 *   - poi/core.js      : Fonctions maines (init, load, display)
 *   - poi/sidepanel.js : Panneau side
 *   - poi/shared.js    : Shared state et constantes
 *
 * Note : POI.Renderers est injected separatedment par globals.api.js after Object.assign.
 *
 * @module poi/poi-api
 */
"use strict";

import { Log } from "../log/index.js";
import { POICore } from "./core.ts";
import { POISidepanel as POISidePanel } from "./sidepanel.ts";
import { POIShared } from "./shared.ts";

/**
 * API public of the module POI
 * All functions delegate to the appropriate sub-modules
 */
// NOTE: POI.Renderers is set explicitly by globals.js after Object.assign — do not set it here.
const POI = {
    /**
     * Initializes the module POI avec the map et la configuration.
     * Supporte deux signatures: init(map, config) et init({map, config}).
     */
    init: function (mapOrOptions: any, config: any) {
        if (!POICore) {
            if (Log) Log.error("[POI] Core module not loaded.");
            return;
        }
        POICore.init(mapOrOptions, config);
    },

    loadAndDisplay: function () {
        if (!POICore) {
            if (Log) Log.error("[POI] Core module not loaded.");
            return;
        }
        POICore.loadAndDisplay();
    },

    displayPois: function (pois: any) {
        if (!POICore) {
            if (Log) Log.error("[POI] Core module not loaded.");
            return;
        }
        POICore.displayPois(pois);
    },

    addPoi: function (poi: any) {
        if (!POICore) {
            if (Log) Log.error("[POI] Core module not loaded.");
            return null;
        }
        return POICore.addPoi(poi);
    },

    add: function (poi: any) {
        if (!POICore) {
            if (Log) Log.error("[POI] Core module not loaded.");
            return false;
        }
        return POICore.addPoi(poi);
    },

    getAllPois: function () {
        if (!POICore) return [];
        return POICore.getAllPois();
    },

    getPoiById: function (id: any) {
        if (!POICore) return null;
        return POICore.getPoiById(id);
    },

    reload: function (pois: any) {
        if (!POICore) {
            if (Log) Log.error("[POI] Core module not loaded.");
            return;
        }
        POICore.reload(pois);
    },

    showPoiDetails: async function (poi: any, customLayout: any) {
        if (!POISidePanel) {
            if (Log) Log.error("[POI] SidePanel module not loaded.");
            return;
        }
        await POISidePanel.openSidePanel(poi, customLayout);
    },

    hideSidePanel: function () {
        if (!POISidePanel) {
            if (Log) Log.error("[POI] SidePanel module not loaded.");
            return;
        }
        POISidePanel.closeSidePanel();
    },

    openSidePanelWithLayout: function (poi: any, customLayout: any) {
        this.showPoiDetails(poi, customLayout);
    },

    getLayer: function () {
        if (!POIShared) return null;
        const state = POIShared.state;
        return state.poiClusterGroup || state.poiLayerGroup;
    },

    getDisplayedPoisCount: function () {
        if (!POICore) {
            if (Log) Log.error("[POI] Core module not loaded.");
            return 0;
        }
        return POICore.getDisplayedPoisCount();
    },

    /** @private */
    _clearAllForTests: function () {
        if (!POIShared) return;
        const state = POIShared.state;
        if (Log)
            Log.info(
                "[POI] _clearAllForTests: Suppression de",
                state.allPois.length,
                "POI(s) et",
                state.poiMarkers.size,
                "marker(s)"
            );
        state.allPois = [];
        state.poiMarkers.clear();
        if (state.poiClusterGroup) state.poiClusterGroup.clearLayers();
        if (state.poiLayerGroup) state.poiLayerGroup.clearLayers();
    },
};

export { POI };
