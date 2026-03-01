/**
 * GeoLeaf POI API (assemblage namespace POI)
 *
 * Assemble GeoLeaf.POI depuis les sous-modules refactorisés :
 *   - poi/core.js      : Fonctions principales (init, load, display)
 *   - poi/sidepanel.js : Panneau latéral
 *   - poi/shared.js    : État partagé et constantes
 *
 * Note : POI.Renderers est injecté séparément par globals.api.js après Object.assign.
 *
 * @module poi/poi-api
 */
"use strict";

import { Log } from "../log/index.js";
import { POICore } from "./core.ts";
import { POISidepanel as POISidePanel } from "./sidepanel.ts";
import { POIShared } from "./shared.ts";

/**
 * API publique du module POI
 * Toutes les fonctions délèguent aux sous-modules appropriés
 */
// NOTE: POI.Renderers is set explicitly by globals.js after Object.assign — do not set it here.
const POI = {
    /**
     * Initialise le module POI avec la carte et la configuration.
     * Supporte deux signatures: init(map, config) et init({map, config}).
     */
    init: function (mapOrOptions: any, config: any) {
        if (!POICore) {
            if (Log) Log.error("[POI] Module Core non chargé.");
            return;
        }
        POICore.init(mapOrOptions, config);
    },

    loadAndDisplay: function () {
        if (!POICore) {
            if (Log) Log.error("[POI] Module Core non chargé.");
            return;
        }
        POICore.loadAndDisplay();
    },

    displayPois: function (pois: any) {
        if (!POICore) {
            if (Log) Log.error("[POI] Module Core non chargé.");
            return;
        }
        POICore.displayPois(pois);
    },

    addPoi: function (poi: any) {
        if (!POICore) {
            if (Log) Log.error("[POI] Module Core non chargé.");
            return null;
        }
        return POICore.addPoi(poi);
    },

    add: function (poi: any) {
        if (!POICore) {
            if (Log) Log.error("[POI] Module Core non chargé.");
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
            if (Log) Log.error("[POI] Module Core non chargé.");
            return;
        }
        POICore.reload(pois);
    },

    showPoiDetails: async function (poi: any, customLayout: any) {
        if (!POISidePanel) {
            if (Log) Log.error("[POI] Module SidePanel non chargé.");
            return;
        }
        await POISidePanel.openSidePanel(poi, customLayout);
    },

    hideSidePanel: function () {
        if (!POISidePanel) {
            if (Log) Log.error("[POI] Module SidePanel non chargé.");
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
            if (Log) Log.error("[POI] Module Core non chargé.");
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
                "marqueur(s)"
            );
        state.allPois = [];
        state.poiMarkers.clear();
        if (state.poiClusterGroup) state.poiClusterGroup.clearLayers();
        if (state.poiLayerGroup) state.poiLayerGroup.clearLayers();
    },
};

export { POI };
