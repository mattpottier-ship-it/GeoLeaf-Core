// @ts-nocheck � migration TS, typage progressif
/**
 * GeoLeaf UI Filter Panel - Proximity
 * Gestion des filtres de proximité (GPS, manuel, cercle)
 *
 * @module ui/filter-panel/proximity
 */
"use strict";

import { getLog } from "../../utils/general-utils.js";
import { events } from "../../utils/event-listener-manager.js";
import { Config } from "../../config/geoleaf-config/config-core.js";
import { GeoLocationState } from "../geolocation-state.js";

// Direct ESM bindings (P3-DEAD-01 complete — module-local state + globalThis)
// Proximity state — module-local (previously stored on GeoLeaf.UI.*)
let _proximityMode = false;
let _proximityCircle = null;
let _proximityMarker = null;
let _proximityMap = null;
let _proximityClickHandler = null;

const FilterPanelProximity = {};
FilterPanelProximity._eventCleanups = [];

/**
 * Initialise la fonctionnalité de proximité
 * @param {L.Map} map - Instance de carte Leaflet
 */
FilterPanelProximity.initProximityFilter = function (map) {
    const Log = getLog();

    if (!map) {
        Log.warn("[GeoLeaf.UI.FilterPanel] Carte non disponible pour le filtre de proximité");
        return;
    }

    // Initialiser l'état du module de proximité
    _proximityMode = false;
    _proximityCircle = null;
    _proximityMarker = null;
    _proximityMap = map;
    _proximityClickHandler = null;

    // Écouter les changements sur le slider de rayon - avec cleanup tracking
    if (events) {
        const inputHandler = function (evt) {
            const slider = evt.target.closest("[data-filter-proximity-radius]");
            if (!slider) return;

            const proximityControl = slider.closest(".gl-filter-panel__proximity");
            if (!proximityControl) return;

            const wrapper = proximityControl.closest("[data-gl-filter-id='proximity']");
            if (!wrapper) return;

            const newRadius = parseFloat(slider.value);

            // Mettre à jour l'attribut sur le wrapper
            wrapper.setAttribute("data-proximity-radius", newRadius);

            // Si un cercle existe, le mettre à jour visuellement
            if (_proximityCircle) {
                const radiusMeters = newRadius * 1000;
                _proximityCircle.setRadius(radiusMeters);
            }
        };

        const clickHandler = function (evt) {
            const btn = evt.target.closest("[data-filter-proximity-btn]");
            if (!btn) return;

            evt.preventDefault();
            FilterPanelProximity.toggleProximityMode(btn, map);
        };

        FilterPanelProximity._eventCleanups.push(
            events.on(document, "input", inputHandler, false, "ProximityFilter.radiusInput")
        );
        FilterPanelProximity._eventCleanups.push(
            events.on(document, "click", clickHandler, false, "ProximityFilter.buttonClick")
        );
    } else {
        // Fallback sans cleanup
        Log.warn(
            "[ProximityFilter] EventListenerManager not available - listeners will not be cleaned up"
        );
        document.addEventListener("input", function (evt) {
            const slider = evt.target.closest("[data-filter-proximity-radius]");
            if (!slider) return;
            const proximityControl = slider.closest(".gl-filter-panel__proximity");
            if (!proximityControl) return;
            const wrapper = proximityControl.closest("[data-gl-filter-id='proximity']");
            if (!wrapper) return;
            const newRadius = parseFloat(slider.value);
            wrapper.setAttribute("data-proximity-radius", newRadius);
            if (_proximityCircle) {
                const radiusMeters = newRadius * 1000;
                _proximityCircle.setRadius(radiusMeters);
            }
        });
        document.addEventListener("click", function (evt) {
            const btn = evt.target.closest("[data-filter-proximity-btn]");
            if (!btn) return;
            evt.preventDefault();
            FilterPanelProximity.toggleProximityMode(btn, map);
        });
    }

    Log.info("[GeoLeaf.UI.FilterPanel] Filtre de proximité initialisé");
};

/**
 * Cleanup du filtre de proximité
 */
FilterPanelProximity.destroy = function () {
    const Log = getLog();

    // Cleanup event listeners
    if (FilterPanelProximity._eventCleanups && FilterPanelProximity._eventCleanups.length > 0) {
        FilterPanelProximity._eventCleanups.forEach((cleanup) => {
            if (typeof cleanup === "function") cleanup();
        });
        FilterPanelProximity._eventCleanups = [];
        Log.info("[ProximityFilter] Event listeners cleaned up");
    }

    // Cleanup map references
    if (_proximityCircle) {
        _proximityMap.removeLayer(_proximityCircle);
        _proximityCircle = null;
    }
    if (_proximityMarker) {
        _proximityMap.removeLayer(_proximityMarker);
        _proximityMarker = null;
    }

    _proximityMap = null;
    _proximityMode = false;
};

/**
 * Bascule le mode de proximité
 * @param {HTMLElement} btn - Bouton de proximité
 * @param {L.Map} map - Instance de carte
 */
FilterPanelProximity.toggleProximityMode = function (btn, map) {
    _proximityMode = !_proximityMode;

    const container = btn.closest(".gl-filter-panel__proximity");
    const rangeWrapper = container.querySelector(".gl-filter-panel__proximity-range");
    const instruction = container.querySelector(".gl-filter-panel__proximity-instruction");

    if (_proximityMode) {
        btn.textContent = "Désactiver";
        btn.classList.add("is-active");
        if (rangeWrapper) rangeWrapper.style.display = "block";
        if (instruction) instruction.style.display = "block";

        // Vérifier si la position GPS est disponible et récente (< 5 minutes)
        const hasRecentGPS =
            GeoLocationState.userPosition &&
            Date.now() - GeoLocationState.userPosition.timestamp < 300000;

        if (hasRecentGPS) {
            FilterPanelProximity.activateGPSMode(container, map);
        } else {
            FilterPanelProximity.activateManualMode(container, map);
        }
    } else {
        // Désactiver le mode proximité
        FilterPanelProximity.deactivateProximityMode(btn, container, map);
    }
};

/**
 * Active le mode GPS automatique
 * @param {HTMLElement} container - Container de proximité
 * @param {L.Map} map - Instance de carte
 */
FilterPanelProximity.activateGPSMode = function (container, map) {
    const Log = getLog();

    Log.info(
        "[GeoLeaf.UI.FilterPanel] Utilisation de la position GPS pour la recherche par proximité"
    );

    const radiusInput = container.querySelector("[data-filter-proximity-radius]");
    const radius = radiusInput ? parseFloat(radiusInput.value) : 10;
    const radiusMeters = radius * 1000;

    const wrapper = container.closest("[data-gl-filter-id='proximity']");
    if (!wrapper) {
        Log.warn("[GeoLeaf.UI.FilterPanel] Wrapper proximity non trouvé");
        return;
    }

    // Supprimer les éléments existants
    if (_proximityCircle) {
        map.removeLayer(_proximityCircle);
    }
    if (_proximityMarker) {
        map.removeLayer(_proximityMarker);
    }

    // Créer le cercle à la position GPS
    const gpsLatLng = globalThis.L.latLng(
        GeoLocationState.userPosition.lat,
        GeoLocationState.userPosition.lng
    );

    const interactiveShapes = Config.get("ui.interactiveShapes", false);
    _proximityCircle = globalThis.L.circle(gpsLatLng, {
        radius: radiusMeters,
        color: "#c2410c",
        fillColor: "#c2410c",
        fillOpacity: 0.2,
        weight: 2,
        interactive: interactiveShapes,
    }).addTo(map);

    // Ne pas créer de marqueur supplémentaire si la géolocalisation est active
    if (!GeoLocationState.active) {
        // Mode GPS mais géolocalisation pas en tracking continu : créer un marqueur draggable
        _proximityMarker = globalThis.L.marker(gpsLatLng, {
            draggable: true,
            icon: globalThis.L.divIcon({
                className: "gl-proximity-gps-marker",
                html: '<div style="width: 20px; height: 20px; background: #2563eb; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            }),
        }).addTo(map);

        // Gérer le déplacement du marqueur
        _proximityMarker.on("dragend", function () {
            const newLatLng = _proximityMarker.getLatLng();
            if (_proximityCircle) {
                _proximityCircle.setLatLng(newLatLng);
            }
            wrapper.setAttribute("data-proximity-lat", newLatLng.lat);
            wrapper.setAttribute("data-proximity-lng", newLatLng.lng);
            Log.info("[GeoLeaf.UI.FilterPanel] Point de proximité GPS déplacé:", {
                lat: newLatLng.lat,
                lng: newLatLng.lng,
                radius: radius,
            });
        });
    } else {
        _proximityMarker = null;
        Log.info("[GeoLeaf.UI.FilterPanel] Cercle de proximité affiché autour du marqueur GPS");
    }

    // Définir les attributs sur le wrapper
    wrapper.setAttribute("data-proximity-lat", gpsLatLng.lat);
    wrapper.setAttribute("data-proximity-lng", gpsLatLng.lng);
    wrapper.setAttribute("data-proximity-radius", radius);
    wrapper.setAttribute("data-proximity-active", "true");

    // Centrer la carte sur la position GPS
    map.setView(gpsLatLng, Math.max(map.getZoom(), 14), {
        animate: true,
        duration: 0.5,
    });

    Log.info("[GeoLeaf.UI.FilterPanel] Point de proximité GPS défini:", {
        lat: gpsLatLng.lat,
        lng: gpsLatLng.lng,
        radius: radius,
    });

    // Pas de handler de clic nécessaire en mode GPS
    _proximityClickHandler = null;
};

/**
 * Active le mode manuel (clic sur la carte)
 * @param {HTMLElement} container - Container de proximité
 * @param {L.Map} map - Instance de carte
 */
FilterPanelProximity.activateManualMode = function (container, map) {
    const Log = getLog();

    Log.info(
        "[GeoLeaf.UI.FilterPanel] Mode manuel : cliquez sur la carte pour définir le point de recherche"
    );

    map.getContainer().style.cursor = "crosshair";

    // Créer le handler pour pouvoir le retirer plus tard
    _proximityClickHandler = function (e) {
        const radiusInput = container.querySelector("[data-filter-proximity-radius]");
        const radius = radiusInput ? parseFloat(radiusInput.value) : 10;
        const radiusMeters = radius * 1000;

        const wrapper = container.closest("[data-gl-filter-id='proximity']");
        if (!wrapper) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Wrapper proximity non trouvé");
            return;
        }

        if (_proximityCircle) {
            map.removeLayer(_proximityCircle);
        }
        if (_proximityMarker) {
            map.removeLayer(_proximityMarker);
        }

        const interactiveShapes = Config.get("ui.interactiveShapes", false);
        _proximityCircle = globalThis.L.circle(e.latlng, {
            radius: radiusMeters,
            color: "#c2410c",
            fillColor: "#c2410c",
            fillOpacity: 0.2,
            weight: 2,
            interactive: interactiveShapes,
        }).addTo(map);

        _proximityMarker = globalThis.L.marker(e.latlng, {
            draggable: true,
        }).addTo(map);

        // Gérer le déplacement du marqueur
        _proximityMarker.on("dragend", function () {
            const newLatLng = _proximityMarker.getLatLng();

            if (_proximityCircle) {
                _proximityCircle.setLatLng(newLatLng);
            }

            wrapper.setAttribute("data-proximity-lat", newLatLng.lat);
            wrapper.setAttribute("data-proximity-lng", newLatLng.lng);

            Log.info("[GeoLeaf.UI.FilterPanel] Point de proximité déplacé:", {
                lat: newLatLng.lat,
                lng: newLatLng.lng,
                radius: radius,
            });
        });

        // Définir les attributs sur le wrapper
        wrapper.setAttribute("data-proximity-lat", e.latlng.lat);
        wrapper.setAttribute("data-proximity-lng", e.latlng.lng);
        wrapper.setAttribute("data-proximity-radius", radius);
        wrapper.setAttribute("data-proximity-active", "true");

        map.getContainer().style.cursor = "";

        Log.info("[GeoLeaf.UI.FilterPanel] Point de proximité défini:", {
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            radius: radius,
        });

        // Nettoyer le handler après le premier clic
        map.off("click", _proximityClickHandler);
        _proximityClickHandler = null;
    };

    // Attacher le handler à la carte
    map.on("click", _proximityClickHandler);
};

/**
 * Désactive le mode de proximité
 * @param {HTMLElement} btn - Bouton de proximité
 * @param {HTMLElement} container - Container de proximité
 * @param {L.Map} map - Instance de carte
 */
FilterPanelProximity.deactivateProximityMode = function (btn, container, map) {
    const Log = getLog();

    btn.textContent = "Activer";
    btn.classList.remove("is-active");

    const rangeWrapper = container.querySelector(".gl-filter-panel__proximity-range");
    const instruction = container.querySelector(".gl-filter-panel__proximity-instruction");

    if (rangeWrapper) rangeWrapper.style.display = "none";
    if (instruction) instruction.style.display = "none";

    map.getContainer().style.cursor = "";

    // Retirer le handler de clic
    if (_proximityClickHandler) {
        map.off("click", _proximityClickHandler);
        _proximityClickHandler = null;
    }

    // Retirer le cercle et le marqueur
    if (_proximityCircle) {
        map.removeLayer(_proximityCircle);
        _proximityCircle = null;
    }
    if (_proximityMarker) {
        map.removeLayer(_proximityMarker);
        _proximityMarker = null;
    }

    // Retirer les attributs du wrapper
    const wrapper = container.closest("[data-gl-filter-id='proximity']");
    if (wrapper) {
        wrapper.removeAttribute("data-proximity-active");
        wrapper.removeAttribute("data-proximity-lat");
        wrapper.removeAttribute("data-proximity-lng");
    }

    Log.info("[GeoLeaf.UI.FilterPanel] Mode proximité désactivé");
};

/**
 * Réinitialise complètement le mode proximité depuis l'extérieur (ex. bouton "Réinitialiser").
 * Utilise les variables module-locales (_proximityMap, _proximityMarker, _proximityCircle,
 * _proximityClickHandler) migrées en P3-DEAD-01 — les anciens accès _g.GeoLeaf.UI.* sont morts.
 */
FilterPanelProximity.resetProximity = function () {
    if (!_proximityMap) return;

    // Retirer le handler de clic sur la carte si présent
    if (_proximityClickHandler) {
        _proximityMap.off("click", _proximityClickHandler);
        _proximityClickHandler = null;
    }

    // Remettre le curseur par défaut
    _proximityMap.getContainer().style.cursor = "";

    // Retirer le cercle de la carte
    if (_proximityCircle) {
        _proximityMap.removeLayer(_proximityCircle);
        _proximityCircle = null;
    }

    // Retirer le marqueur de la carte
    if (_proximityMarker) {
        _proximityMap.removeLayer(_proximityMarker);
        _proximityMarker = null;
    }

    _proximityMode = false;
};

export { FilterPanelProximity };
