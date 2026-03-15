/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Markers Events
 * Managers d'events : tooltip, popup, click direct, side panel
 */
import { Log } from "../log/index.js";
import { POIShared } from "./shared.ts";
import { POIPopup } from "./popup.ts";
import { resolveCategoryDisplay } from "./markers-styling.ts";

/**
 * Attaches events and behaviors to a POI marker (tooltip, popup, side panel).
 *
 * @param {L.Marker} marker - Leaflet marker to configure.
 * @param {object} poi - Data du POI.
 */
async function _openPoiDetails(poi: any) {
    if ((globalThis as any).GeoLeaf?.POI?.showPoiDetails) {
        (globalThis as any).GeoLeaf.POI.showPoiDetails(poi);
    } else {
        // Lazy import to avoid circular dependency:
        // markers-events → poi-core.contract → poi/core → markers → markers-events
        const { POICoreContract } = await import("../../contracts/poi-core.contract.js");
        POICoreContract.showPoiDetails?.(poi);
    }
}

function _attachMarkerPopupOpen(marker: any, poi: any) {
    marker.on("popupopen", function () {
        marker._geoleafPopupActive = true;
        marker.closeTooltip();
        setTimeout(function () {
            const link = document.querySelector(
                '.gl-poi-popup__link[data-poi-id="' + poi.id + '"]'
            );
            if (link) {
                if (Log) Log.info('[POI] "See more" link found for POI:', poi.id);
                const newLink = link.cloneNode(true);
                if (link.parentNode) link.parentNode.replaceChild(newLink, link);
                newLink.addEventListener("click", function (e: any) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (Log) Log.info('[POI] Click on "See more" for POI:', poi.id);
                    if (marker && marker.closePopup) marker.closePopup();
                    setTimeout(function () {
                        if (Log) Log.info("[POI] Calling showPoiDetails for:", poi.id);
                        _openPoiDetails(poi);
                    }, 100);
                });
            } else {
                if (Log) Log.warn('[POI] "See more" link not found for POI:', poi.id);
            }
        }, 50);
    });
    marker.on("popupclose", function () {
        marker._geoleafPopupActive = false;
        if (marker.getTooltip() && marker.getTooltip().options.permanent) {
            setTimeout(function () {
                if (marker.openTooltip && !marker._geoleafPopupActive) marker.openTooltip();
            }, 50);
        }
    });
}

function _attachMarkerPopupMode(marker: any, poi: any, popupModule: any) {
    const popupContent = popupModule.buildQuickPopupContent(poi, resolveCategoryDisplay);
    if (popupContent) {
        if ((popupModule as any).attachPopup) {
            (popupModule as any).attachPopup(marker, popupContent);
        } else {
            marker.bindPopup(popupContent);
        }
    } else {
        Log.error("[markers] Empty popup content for POI:", poi.id);
    }
    marker._geoleafPopupActive = false;
    marker.on("tooltipopen", function () {
        if (marker._geoleafPopupActive) marker.closeTooltip();
    });
    _attachMarkerPopupOpen(marker, poi);
}

function _attachMarkerDirectMode(marker: any, poi: any) {
    marker.on("click", function (e: any) {
        e.originalEvent?.stopPropagation?.();
        if (Log) Log.info("[POI] Direct click on marker (without popup) for POI:", poi.id);
        _openPoiDetails(poi);
    });
}

function attachMarkerEvents(marker: any, poi: any) {
    marker._geoleafPoiData = poi;
    const shared = POIShared;
    const poiConfig = shared ? shared.state.poiConfig : {};
    const popupModule = POIPopup;
    if (popupModule && typeof popupModule.manageTooltip === "function") {
        popupModule.manageTooltip(marker, poi, poiConfig, resolveCategoryDisplay);
    }
    const showPopup = poiConfig.showPopup !== false;
    if (showPopup) {
        if (popupModule && typeof popupModule.buildQuickPopupContent === "function") {
            _attachMarkerPopupMode(marker, poi, popupModule);
        }
    } else {
        _attachMarkerDirectMode(marker, poi);
    }
}

export { attachMarkerEvents };
