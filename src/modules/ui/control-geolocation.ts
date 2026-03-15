// @ts-nocheck — migration TS, typage progressif
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI - Geolocation Control
 * Controle Leaflet personnalise pour centrer the map sur la position GPS of the user.
 *
 * @module ui/control-geolocation
 */
import { Log } from "../log/index.js";
import { Config } from "../config/config-primitives.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { _UINotifications } from "./notifications.js";
import { GeoLocationState } from "./geolocation-state.js";
import { getLabel } from "../i18n/i18n.js";

function _checkRecenterVisibility(map: any, geoState: any): void {
    if (!geoState.recenterBtn || !GeoLocationState.userPosition) return;
    const mapCenter = map.getCenter();
    const userLatLng = (globalThis.L as any).latLng(
        GeoLocationState.userPosition.lat,
        GeoLocationState.userPosition.lng
    );
    geoState.recenterBtn.classList.toggle("is-visible", mapCenter.distanceTo(userLatLng) > 50);
}

function _stopGeolocation(map: any, link: any, geoState: any, onMoveEnd: () => void): void {
    if (GeoLocationState.watchId !== null) {
        navigator.geolocation.clearWatch(GeoLocationState.watchId);
        GeoLocationState.watchId = null;
    }
    if (geoState.userMarker) {
        map.removeLayer(geoState.userMarker);
        geoState.userMarker = null;
    }
    if (geoState.accuracyCircle) {
        map.removeLayer(geoState.accuracyCircle);
        geoState.accuracyCircle = null;
    }
    GeoLocationState.active = false;
    GeoLocationState.userPosition = null;
    link.classList.remove("is-active");
    link.classList.remove("is-locating");
    if (geoState.pendingGeolocToast && _UINotifications?.dismiss) {
        _UINotifications.dismiss(geoState.pendingGeolocToast);
        geoState.pendingGeolocToast = null;
    }
    if (geoState.recenterBtn) {
        map.off("moveend", onMoveEnd);
        if (geoState.recenterBtn.parentNode) geoState.recenterBtn.remove();
        geoState.recenterBtn = null;
    }
    map.getContainer().dispatchEvent(
        new CustomEvent("gl:geoloc:statechange", { detail: { active: false }, bubbles: true })
    );
    Log?.info("[UI.Controls] Geolocation disabled");
}

function _createRecenterButton(map: any, geoState: any): void {
    if (geoState.recenterBtn) return;
    const btn = document.createElement("button") as HTMLButtonElement;
    btn.id = "gl-recenter-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", getLabel("aria.geoloc.recenter"));
    btn.title = getLabel("aria.geoloc.recenter");
    const svg = DOMSecurity.createSVGIcon(
        20,
        20,
        "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
        { stroke: "none", fill: "currentColor" }
    );
    btn.appendChild(svg);
    btn.addEventListener("click", () => {
        if (GeoLocationState.userPosition) {
            map.setView(
                [GeoLocationState.userPosition.lat, GeoLocationState.userPosition.lng],
                map.getZoom(),
                { animate: true, duration: 0.4 }
            );
        }
    });
    map.getContainer().appendChild(btn);
    geoState.recenterBtn = btn;
}

function _updateGeoMarkers(
    map: any,
    geoState: any,
    lat: number,
    lng: number,
    accuracy: number
): void {
    if (geoState.userMarker) map.removeLayer(geoState.userMarker);
    if (geoState.accuracyCircle) map.removeLayer(geoState.accuracyCircle);
    geoState.userMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: "gl-user-location-marker gl-user-location-marker--active",
            html: `<div class="gl-user-location-dot gl-user-location-dot--active"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
        }),
        zIndexOffset: 1000,
    }).addTo(map);
    if (accuracy && accuracy < 1000) {
        const interactiveShapes = Config.get("ui.interactiveShapes", false);
        geoState.accuracyCircle = L.circle([lat, lng], {
            radius: accuracy,
            className: "gl-user-location-accuracy",
            fillColor: "#4285F4",
            fillOpacity: 0.1,
            stroke: true,
            color: "#4285F4",
            opacity: 0.3,
            weight: 1,
            interactive: interactiveShapes,
        }).addTo(map);
    }
}

function _onGeoPositionSuccess(
    position: GeolocationPosition,
    map: any,
    link: any,
    geoState: any,
    onMoveEnd: () => void
): void {
    const { latitude, longitude, accuracy } = position.coords;
    if (!GeoLocationState.active) {
        map.setView([latitude, longitude], 16, { animate: true, duration: 0.5 });
    }
    _updateGeoMarkers(map, geoState, latitude, longitude, accuracy);
    const _isFirstFix = !GeoLocationState.active;
    GeoLocationState.active = true;
    link.classList.remove("is-locating");
    link.classList.add("is-active");
    GeoLocationState.userPosition = {
        lat: latitude,
        lng: longitude,
        accuracy,
        timestamp: Date.now(),
    };
    if (_isFirstFix) {
        if (geoState.pendingGeolocToast && _UINotifications?.dismiss) {
            _UINotifications.dismiss(geoState.pendingGeolocToast);
            geoState.pendingGeolocToast = null;
        }
        if (_UINotifications?.success)
            _UINotifications.success(getLabel("toast.geoloc.position_found"), 2500);
        map.on("moveend", onMoveEnd);
        map.getContainer().dispatchEvent(
            new CustomEvent("gl:geoloc:statechange", { detail: { active: true }, bubbles: true })
        );
    } else {
        _checkRecenterVisibility(map, geoState);
    }
    Log?.debug("[UI.Controls] Position GPS mise a jour:", latitude, longitude);
}

function _onGeoPositionError(error: GeolocationPositionError, link: any, geoState: any): void {
    link.classList.remove("is-locating");
    link.classList.remove("is-active");
    GeoLocationState.active = false;
    if (geoState.pendingGeolocToast && _UINotifications?.dismiss) {
        _UINotifications.dismiss(geoState.pendingGeolocToast);
        geoState.pendingGeolocToast = null;
    }
    let errorMessage = getLabel("toast.geoloc.error.default");
    switch (error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = getLabel("toast.geoloc.error.permission_denied");
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = getLabel("toast.geoloc.error.position_unavailable");
            break;
        case error.TIMEOUT:
            errorMessage = getLabel("toast.geoloc.error.timeout");
            break;
    }
    if (Log) Log.error("[UI.Controls] Geolocation error:", error);
    if (_UINotifications && typeof _UINotifications.error === "function") {
        _UINotifications.error(errorMessage);
    } else {
        Log.warn("[UI.Controls] " + errorMessage);
    }
}

function _makeToggleGeolocation(
    map: any,
    link: any,
    geoState: any,
    onMoveEnd: () => void
): (e: Event) => void {
    return (e) => {
        L.DomEvent.preventDefault(e);
        if (GeoLocationState.active) {
            _stopGeolocation(map, link, geoState, onMoveEnd);
            return;
        }
        link.classList.add("is-locating");
        if (_UINotifications?.info) {
            geoState.pendingGeolocToast = _UINotifications.info(getLabel("toast.geoloc.locating"), {
                persistent: true,
                dismissible: false,
            });
        }
        _createRecenterButton(map, geoState);
        GeoLocationState.watchId = navigator.geolocation.watchPosition(
            (pos) => _onGeoPositionSuccess(pos, map, link, geoState, onMoveEnd),
            (err) => _onGeoPositionError(err, link, geoState),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };
}

function _buildGeoControlClass(map: any, geoState: any, onMoveEnd: () => void): any {
    return L.Control.extend({
        options: {
            position: "topleft",
        },

        onAdd: function (map) {
            const container = L.DomUtil.create(
                "div",
                "leaflet-control-geolocation leaflet-bar leaflet-control"
            );
            const link = L.DomUtil.create("a", "", container);
            link.href = "#";
            link.title = getLabel("aria.geoloc.toggle");
            link.setAttribute("role", "button");
            link.setAttribute("aria-label", getLabel("aria.geoloc.toggle_label"));
            // SAFE: SVG static hardcode
            const geoSvg = DOMSecurity.createSVGIcon(
                18,
                18,
                "M12 2 C 6.5 2 2 6.5 2 12 C 2 17.5 6.5 22 12 22 C 17.5 22 22 17.5 22 12 C 22 6.5 17.5 2 12 2 M12 9 C 10.3 9 9 10.3 9 12 C 9 13.7 10.3 15 12 15 C 13.7 15 15 13.7 15 12 C 15 10.3 13.7 9 12 9",
                { stroke: "currentColor", strokeWidth: "2", fill: "none" }
            );
            link.appendChild(geoSvg);
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            const toggleGeolocation = _makeToggleGeolocation(map, link, geoState, onMoveEnd);
            L.DomEvent.on(link, "click", toggleGeolocation);
            L.DomEvent.on(link, "keydown", (e) => {
                if (e.key === "Enter" || e.key === " " || e.key === "Spacebar")
                    toggleGeolocation(e);
            });
            this._link = link;
            this._userMarker = geoState.userMarker;
            return container;
        },

        onRemove: function (map) {
            if (this._link) {
                L.DomEvent.off(this._link, "click");
                L.DomEvent.off(this._link, "keydown");
                this._link = null;
            }
            if (this._userMarker) {
                map.removeLayer(this._userMarker);
                this._userMarker = null;
            }
        },
    });
}

/**
 * Gestion de la geolocalisation pour centrer the map sur la position of the user
 * @param {L.Map} map - Instance de the map Leaflet
 * @param {Object} config - Configuration incluant ui.enableGeolocation
 */
function initGeolocationControl(map, config) {
    if (!map) {
        Log?.warn("[UI.Controls] initGeolocationControl: carte manquante");
        return;
    }
    if (!config?.ui?.enableGeolocation) {
        Log?.info("[UI.Controls] Geolocation disabled in configuration");
        return;
    }
    if (typeof L === "undefined" || !L.Control) {
        Log?.warn("[UI.Controls] Leaflet n'est pas disponible");
        return;
    }
    if (!navigator.geolocation) {
        Log?.warn("[UI.Controls] Geolocation is not supported by this browser");
        return;
    }
    const geoState = {
        userMarker: null,
        accuracyCircle: null,
        pendingGeolocToast: null as HTMLElement | null,
        recenterBtn: null as HTMLButtonElement | null,
    };
    const onMoveEnd = () => _checkRecenterVisibility(map, geoState);
    L.Control.Geolocation = _buildGeoControlClass(map, geoState, onMoveEnd);
    new L.Control.Geolocation().addTo(map);
    if (Log) Log.info("[UI.Controls] Geolocation control added to map");
}

export { initGeolocationControl };
