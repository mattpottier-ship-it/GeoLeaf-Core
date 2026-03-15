// @ts-nocheck — migration TS, typage progressif
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI - POI Add Control
 * Custom Leaflet control for adding new points of interest.
 *
 * @module ui/control-poi-add
 */
import { Log } from "../log/index.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { GeoLocationState } from "./geolocation-state.js";
import { POIAddFormContract } from "../../contracts/poi-addform.contract.js";
import { getLabel } from "../i18n/i18n.js";

function _handlePoiAddAction(e: Event, link: HTMLElement, map: any, config: any): void {
    L.DomEvent.preventDefault(e);
    link.classList.add("disabled");
    const openForm = (latlng: any) => {
        link.classList.remove("disabled");
        if (!POIAddFormContract.isAddFormAvailable()) {
            if (Log) Log.error("[UI.Controls] AddForm.openAddForm not available");
            return;
        }
        POIAddFormContract.openAddForm(latlng, null);
    };
    const userPosition = GeoLocationState.userPosition;
    const defaultPosition = config?.poiAddConfig?.defaultPosition || "placement-mode";
    if (userPosition && defaultPosition === "geolocation") {
        if (Log) Log.debug("[UI.Controls] Using GPS position for POI add");
        openForm(userPosition);
    } else {
        if (Log) Log.debug("[UI.Controls] Activating placement mode for POI add");
        POIAddFormContract.activatePlacementMode(map, (result) => {
            if (result?.latlng) {
                openForm(result.latlng);
            } else {
                link.classList.remove("disabled");
                if (Log) Log.warn("[UI.Controls] Mode placement cancelled");
            }
        });
    }
}

function _buildPoiAddClass(map: any, config: any): any {
    return L.Control.extend({
        options: { position: "topleft" },
        onAdd: function (map) {
            const container = L.DomUtil.create(
                "div",
                "leaflet-control-poi-add leaflet-bar leaflet-control"
            );
            const link = L.DomUtil.create("a", "", container);
            link.href = "#";
            link.title = getLabel("aria.poi_add.title");
            link.setAttribute("role", "button");
            link.setAttribute("aria-label", getLabel("aria.poi_add.label"));
            // SAFE: SVG static hardcode, pas de donnees user
            const poiSvg = DOMSecurity.createSVGIcon(
                18,
                18,
                "M12 2 C 6.5 2 2 6.5 2 12 C 2 17.5 6.5 22 12 22 C 17.5 22 22 17.5 22 12 C 22 6.5 17.5 2 12 2 M12 8 L12 16 M8 12 L16 12",
                { stroke: "currentColor", strokeWidth: "2", fill: "none" }
            );
            link.appendChild(poiSvg);
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            const handleAddPoi = (e) => _handlePoiAddAction(e, link, map, config);
            L.DomEvent.on(link, "click", handleAddPoi);
            L.DomEvent.on(link, "keydown", (e) => {
                if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") handleAddPoi(e);
            });
            this._link = link;
            return container;
        },
        onRemove: function (_map) {
            if (this._link) {
                L.DomEvent.off(this._link, "click");
                L.DomEvent.off(this._link, "keydown");
                this._link = null;
            }
        },
    });
}

/**
 * Management of the POI add button on the map
 * Allows users to add new points of interest
 * @param {L.Map} map - Instance de the map Leaflet
 * @param {Object} config - Configuration incluant ui.showAddPoi et poi.*
 */
function initPoiAddControl(map, config) {
    if (!map) {
        Log?.warn("[UI.Controls] initPoiAddControl: map missing");
        return;
    }
    if (!config?.ui?.showAddPoi) {
        Log?.debug("[UI.Controls] POI Add button disabled in configuration");
        return;
    }
    if (typeof L === "undefined" || !L.Control) {
        Log?.warn("[UI.Controls] Leaflet n'est pas disponible");
        return;
    }
    if (
        !POIAddFormContract.isAddFormAvailable() ||
        !POIAddFormContract.isPlacementModeAvailable()
    ) {
        Log?.warn("[UI.Controls] POI modules not loaded");
        return;
    }
    L.Control.PoiAdd = _buildPoiAddClass(map, config);
    new L.Control.PoiAdd().addTo(map);
    Log?.info("[UI.Controls] POI Add control added to map");
}

export { initPoiAddControl };
