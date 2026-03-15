// @ts-nocheck — migration TS, typage progressif
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI - Fullscreen Control
 * Custom Leaflet control for fullscreen mode.
 *
 * @module ui/control-fullscreen
 */
import { Log } from "../log/index.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { debounce } from "../utils/general-utils.js";
import { getLabel } from "../i18n/i18n.js";

function _buildFullscreenIcons(link: HTMLElement): { svgEnter: SVGElement; svgExit: SVGElement } {
    // SAFE: SVG static hardcode
    const svgEnter = DOMSecurity.createSVGIcon(
        18,
        18,
        "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
        { stroke: "currentColor", strokeWidth: "2", fill: "none" }
    );
    svgEnter.classList.add("fullscreen-enter-icon");
    // SAFE: SVG static hardcode
    const svgExit = DOMSecurity.createSVGIcon(
        18,
        18,
        "M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3",
        { stroke: "currentColor", strokeWidth: "2", fill: "none" }
    );
    svgExit.classList.add("fullscreen-exit-icon");
    svgExit.style.display = "none";
    link.appendChild(svgEnter);
    link.appendChild(svgExit);
    return { svgEnter, svgExit } as { svgEnter: SVGElement; svgExit: SVGElement };
}

function _buildNotifMover(mapContainer: HTMLElement): { moveIn: () => void; moveOut: () => void } {
    const _notifId = "gl-notifications";
    let _notifOriginalParent: Element | null = null;
    let _notifOriginalNextSibling: ChildNode | null = null;
    return {
        moveIn: () => {
            const notif = document.getElementById(_notifId);
            if (!notif) return;
            _notifOriginalParent = notif.parentElement;
            _notifOriginalNextSibling = notif.nextSibling;
            mapContainer.appendChild(notif);
        },
        moveOut: () => {
            const notif = document.getElementById(_notifId);
            if (!notif || !_notifOriginalParent) return;
            if (_notifOriginalNextSibling) {
                _notifOriginalParent.insertBefore(notif, _notifOriginalNextSibling);
            } else {
                _notifOriginalParent.appendChild(notif);
            }
            _notifOriginalParent = null;
            _notifOriginalNextSibling = null;
        },
    };
}

function _buildFullscreenHandlers(
    link: HTMLElement,
    mapContainer: HTMLElement,
    debouncedInvalidateSize: () => void,
    svgEnter: SVGElement,
    svgExit: SVGElement,
    notifMover: { moveIn: () => void; moveOut: () => void }
): { toggleFullscreen: (e: Event) => void; fullscreenChangeHandler: () => void } {
    const updateIcon = (isFullscreen: boolean) => {
        svgEnter.style.display = isFullscreen ? "none" : "block";
        svgExit.style.display = isFullscreen ? "block" : "none";
    };
    const toggleFullscreen = (e) => {
        L.DomEvent.preventDefault(e);
        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen().catch((err) => {
                if (Log) Log.error("[UI.Controls] Fullscreen error:", err);
            });
        } else {
            document.exitFullscreen().catch((err) => {
                if (Log) Log.error("[UI.Controls] Fullscreen exit error:", err);
            });
        }
    };
    // Single source of truth for the fullscreen state.
    const fullscreenChangeHandler = () => {
        if (document.fullscreenElement) {
            link.classList.add("is-fullscreen");
            link.title = getLabel("aria.fullscreen.exit");
            link.setAttribute("aria-label", getLabel("aria.fullscreen.exit_label"));
            updateIcon(true);
            document.body.classList.add("gl-fullscreen-active");
            notifMover.moveIn();
            debouncedInvalidateSize();
        } else {
            link.classList.remove("is-fullscreen");
            link.title = getLabel("aria.fullscreen.enter");
            link.setAttribute("aria-label", getLabel("aria.fullscreen.enter_label"));
            updateIcon(false);
            document.body.classList.remove("gl-fullscreen-active");
            notifMover.moveOut();
            debouncedInvalidateSize();
        }
    };
    return { toggleFullscreen, fullscreenChangeHandler };
}

function _buildFullscreenOnAdd(map: any, mapContainer: HTMLElement, ctrl: any): HTMLElement {
    const container = L.DomUtil.create(
        "div",
        "leaflet-control-fullscreen leaflet-bar leaflet-control"
    );
    const link = L.DomUtil.create("a", "", container);
    link.href = "#";
    link.title = getLabel("aria.fullscreen.enter");
    link.setAttribute("role", "button");
    link.setAttribute("aria-label", getLabel("aria.fullscreen.enter_label"));
    const { svgEnter, svgExit } = _buildFullscreenIcons(link);
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    const debouncedInvalidateSize = debounce
        ? debounce(() => map.invalidateSize(), 200)
        : () => map.invalidateSize();
    const notifMover = _buildNotifMover(mapContainer);
    const { toggleFullscreen, fullscreenChangeHandler } = _buildFullscreenHandlers(
        link,
        mapContainer,
        debouncedInvalidateSize,
        svgEnter,
        svgExit,
        notifMover
    );
    L.DomEvent.on(link, "click", toggleFullscreen);
    L.DomEvent.on(link, "keydown", (e) => {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") toggleFullscreen(e);
    });
    document.addEventListener("fullscreenchange", fullscreenChangeHandler);
    ctrl._fullscreenChangeHandler = fullscreenChangeHandler;
    ctrl._toggleFullscreen = toggleFullscreen;
    ctrl._link = link;
    ctrl._mapContainer = mapContainer;
    ctrl._debouncedInvalidateSize = debouncedInvalidateSize;
    return container;
}

function _buildFullscreenClass(map: any, mapContainer: HTMLElement): any {
    return L.Control.extend({
        options: { position: "topleft" },
        onAdd: function (map) {
            return _buildFullscreenOnAdd(map, mapContainer, this);
        },
        onRemove: function (_map) {
            if (this._fullscreenChangeHandler) {
                document.removeEventListener("fullscreenchange", this._fullscreenChangeHandler);
                this._fullscreenChangeHandler = null;
            }
            if (this._link) {
                L.DomEvent.off(this._link, "click", this._toggleFullscreen);
                L.DomEvent.off(this._link, "keydown");
                this._link = null;
            }
            this._toggleFullscreen = null;
            this._mapContainer = null;
            this._debouncedInvalidateSize = null;
        },
    });
}

/**
 * Fullscreen management for the map
 * @param {L.Map} map - Instance de the map Leaflet
 * @param {HTMLElement} mapContainer - The map container to put in fullscreen
 */
function initFullscreenControl(map, mapContainer) {
    if (!map || !mapContainer) {
        if (Log) Log.warn("[UI.Controls] initFullscreenControl: map or container missing");
        return;
    }
    if (typeof L === "undefined" || !L.Control) {
        if (Log) Log.warn("[UI.Controls] Leaflet is not available");
        return;
    }
    L.Control.Fullscreen = _buildFullscreenClass(map, mapContainer);
    new L.Control.Fullscreen().addTo(map);
    if (Log) Log.info("[UI.Controls] Fullscreen control added to map");
}

export { initFullscreenControl };
