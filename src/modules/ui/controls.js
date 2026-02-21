/*!
 * GeoLeaf Core
 * Ã‚Â© 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Controls
 * ContrÃƒÂ´les Leaflet personnalisÃƒÂ©s (fullscreen, zoom, scale, etc.)
 */

import { Log } from "../log/index.js";
import { Config } from "../config/config-primitives.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { _UINotifications } from "./notifications.js";
import { GeoLocationState } from "./geolocation-state.js";
import { debounce } from "../utils/general-utils.js";
import { POIAddFormContract } from "../../contracts/poi-addform.contract.js";

// ========================================
//   FULLSCREEN CONTROL
// ========================================

/**
 * Gestion du plein ÃƒÂ©cran pour la carte
 * @param {L.Map} map - Instance de la carte Leaflet
 * @param {HTMLElement} mapContainer - Le conteneur de la carte ÃƒÂ  mettre en plein ÃƒÂ©cran
 */
function initFullscreenControl(map, mapContainer) {
    if (!map || !mapContainer) {
        if (Log) Log.warn("[UI.Controls] initFullscreenControl: carte ou conteneur manquant");
        return;
    }

    // VÃƒÂ©rifier que Leaflet est disponible
    if (typeof L === "undefined" || !L.Control) {
        if (Log) Log.warn("[UI.Controls] Leaflet n'est pas disponible");
        return;
    }

    // ContrÃƒÂ´le Leaflet personnalisÃƒÂ©
    L.Control.Fullscreen = L.Control.extend({
        options: {
            position: "topleft",
        },

        onAdd: function (map) {
            const container = L.DomUtil.create(
                "div",
                "leaflet-control-fullscreen leaflet-bar leaflet-control"
            );
            const link = L.DomUtil.create("a", "", container);

            link.href = "#";
            link.title = "Plein ÃƒÂ©cran";
            link.setAttribute("role", "button");
            link.setAttribute("aria-label", "Activer le mode plein ÃƒÂ©cran");

            // Fullscreen ENTER icon (static SVG)
            // SAFE: SVG statique hardcodÃƒÂ©
            const svgEnter = DOMSecurity.createSVGIcon(
                18,
                18,
                "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
                {
                    stroke: "currentColor",
                    strokeWidth: "2",
                    fill: "none",
                }
            );
            svgEnter.classList.add("fullscreen-enter-icon");

            // Fullscreen EXIT icon (static SVG)
            // SAFE: SVG statique hardcodÃƒÂ©
            const svgExit = DOMSecurity.createSVGIcon(
                18,
                18,
                "M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3",
                {
                    stroke: "currentColor",
                    strokeWidth: "2",
                    fill: "none",
                }
            );
            svgExit.classList.add("fullscreen-exit-icon");
            svgExit.style.display = "none"; // CachÃƒÂ© par dÃƒÂ©faut

            link.appendChild(svgEnter);
            link.appendChild(svgExit);

            // Ãƒâ€°viter la propagation vers la carte
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            // Debounce pour invalidateSize
            const debouncedInvalidateSize = debounce
                ? debounce(() => map.invalidateSize(), 200)
                : () => map.invalidateSize();

            // Fonction pour mettre ÃƒÂ  jour l'icÃƒÂ´ne
            const updateIcon = (isFullscreen) => {
                if (isFullscreen) {
                    svgEnter.style.display = "none";
                    svgExit.style.display = "block";
                } else {
                    svgEnter.style.display = "block";
                    svgExit.style.display = "none";
                }
            };

            const toggleFullscreen = (e) => {
                L.DomEvent.preventDefault(e);

                if (!document.fullscreenElement) {
                    // Entrer en plein ÃƒÂ©cran
                    mapContainer
                        .requestFullscreen()
                        .then(() => {
                            link.classList.add("is-fullscreen");
                            link.title = "Quitter le plein ÃƒÂ©cran";
                            link.setAttribute("aria-label", "Quitter le mode plein ÃƒÂ©cran");
                            updateIcon(true);
                            debouncedInvalidateSize();
                        })
                        .catch((err) => {
                            if (Log) Log.error("[UI.Controls] Erreur plein ÃƒÂ©cran:", err);
                        });
                } else {
                    // Quitter le plein ÃƒÂ©cran
                    document
                        .exitFullscreen()
                        .then(() => {
                            link.classList.remove("is-fullscreen");
                            link.title = "Plein ÃƒÂ©cran";
                            link.setAttribute("aria-label", "Activer le mode plein ÃƒÂ©cran");
                            updateIcon(false);
                            debouncedInvalidateSize();
                        })
                        .catch((err) => {
                            if (Log) Log.error("[UI.Controls] Erreur sortie plein ÃƒÂ©cran:", err);
                        });
                }
            };

            const fullscreenChangeHandler = () => {
                if (!document.fullscreenElement) {
                    link.classList.remove("is-fullscreen");
                    link.title = "Plein ÃƒÂ©cran";
                    link.setAttribute("aria-label", "Activer le mode plein ÃƒÂ©cran");
                    updateIcon(false);
                    debouncedInvalidateSize();
                }
            };

            L.DomEvent.on(link, "click", toggleFullscreen);
            L.DomEvent.on(link, "keydown", (e) => {
                if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                    toggleFullscreen(e);
                }
            });

            document.addEventListener("fullscreenchange", fullscreenChangeHandler);

            this._fullscreenChangeHandler = fullscreenChangeHandler;
            this._toggleFullscreen = toggleFullscreen;
            this._link = link;
            this._mapContainer = mapContainer;
            this._debouncedInvalidateSize = debouncedInvalidateSize;

            return container;
        },

        onRemove: function (_map) {
            // MEMORY LEAK FIX (Phase 2): Clean up circular references in closures
            if (this._fullscreenChangeHandler) {
                document.removeEventListener("fullscreenchange", this._fullscreenChangeHandler);
                this._fullscreenChangeHandler = null;
            }

            if (this._link) {
                L.DomEvent.off(this._link, "click", this._toggleFullscreen);
                L.DomEvent.off(this._link, "keydown");
                this._link = null;
            }

            // Clean up closure references to prevent memory leaks
            this._toggleFullscreen = null;
            this._mapContainer = null;
            this._debouncedInvalidateSize = null;
        },
    });

    new L.Control.Fullscreen().addTo(map);
    if (Log) Log.info("[UI.Controls] ContrÃƒÂ´le plein ÃƒÂ©cran ajoutÃƒÂ© ÃƒÂ  la carte");
}

// ========================================
//   GEOLOCATION CONTROL
// ========================================

/**
 * Gestion de la gÃƒÂ©olocalisation pour centrer la carte sur la position de l'utilisateur
 * @param {L.Map} map - Instance de la carte Leaflet
 * @param {Object} config - Configuration incluant ui.enableGeolocation
 */
function initGeolocationControl(map, config) {
    if (!map) {
        if (Log) Log.warn("[UI.Controls] initGeolocationControl: carte manquante");
        return;
    }

    // VÃƒÂ©rifier si la gÃƒÂ©olocalisation est activÃƒÂ©e dans la config
    if (!config?.ui?.enableGeolocation) {
        if (Log)
            Log.info("[UI.Controls] GÃƒÂ©olocalisation dÃƒÂ©sactivÃƒÂ©e dans la configuration");
        return;
    }

    // VÃƒÂ©rifier que Leaflet est disponible
    if (typeof L === "undefined" || !L.Control) {
        if (Log) Log.warn("[UI.Controls] Leaflet n'est pas disponible");
        return;
    }

    // VÃƒÂ©rifier que l'API de gÃƒÂ©olocalisation est disponible
    if (!navigator.geolocation) {
        if (Log)
            Log.warn(
                "[UI.Controls] La gÃƒÂ©olocalisation n'est pas supportÃƒÂ©e par ce navigateur"
            );
        return;
    }

    // Marqueur de position utilisateur (stockÃƒÂ© pour pouvoir le supprimer/mettre ÃƒÂ  jour)
    let userMarker = null;
    let accuracyCircle = null;

    // ContrÃƒÂ´le Leaflet personnalisÃƒÂ©
    L.Control.Geolocation = L.Control.extend({
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
            link.title = "GÃƒÂ©olocalisation ON/OFF";
            link.setAttribute("role", "button");
            link.setAttribute("aria-label", "Activer/DÃƒÂ©sactiver le suivi GPS");

            // IcÃƒÂ´ne de gÃƒÂ©olocalisation (utilisation d'un SVG ou Unicode)
            // SAFE: SVG statique hardcodÃƒÂ©, pas de donnÃƒÂ©es utilisateur
            const geoSvg = DOMSecurity.createSVGIcon(
                18,
                18,
                "M12 2 C 6.5 2 2 6.5 2 12 C 2 17.5 6.5 22 12 22 C 17.5 22 22 17.5 22 12 C 22 6.5 17.5 2 12 2 M12 9 C 10.3 9 9 10.3 9 12 C 9 13.7 10.3 15 12 15 C 13.7 15 15 13.7 15 12 C 15 10.3 13.7 9 12 9",
                {
                    stroke: "currentColor",
                    strokeWidth: "2",
                    fill: "none",
                }
            );
            link.appendChild(geoSvg);

            // Ãƒâ€°viter la propagation vers la carte
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const toggleGeolocation = (e) => {
                L.DomEvent.preventDefault(e);

                // Si déjà actif, désactiver
                if (GeoLocationState.active) {
                    // Désactiver le tracking
                    if (GeoLocationState.watchId !== null) {
                        navigator.geolocation.clearWatch(GeoLocationState.watchId);
                        GeoLocationState.watchId = null;
                    }

                    // Retirer les marqueurs et cercles
                    if (userMarker) {
                        map.removeLayer(userMarker);
                        userMarker = null;
                    }
                    if (accuracyCircle) {
                        map.removeLayer(accuracyCircle);
                        accuracyCircle = null;
                    }

                    // Réinitialiser l'état
                    GeoLocationState.active = false;
                    GeoLocationState.userPosition = null;

                    link.classList.remove("is-active");
                    link.classList.remove("is-locating");

                    if (Log) Log.info("[UI.Controls] GÃƒÂ©olocalisation dÃƒÂ©sactivÃƒÂ©e");
                    return;
                }

                // Activer le mode gÃƒÂ©olocalisation
                link.classList.add("is-locating");

                // Utiliser watchPosition pour un tracking continu
                GeoLocationState.watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude, accuracy } = position.coords;

                        // Première activation : centrer la carte
                        if (!GeoLocationState.active) {
                            map.setView([latitude, longitude], 16, {
                                animate: true,
                                duration: 0.5,
                            });
                        } else {
                            // Mise ÃƒÂ  jour continue : dÃƒÂ©placer le marqueur sans recentrer
                            // (sauf si on veut un mode "suivi" permanent)
                        }

                        // Supprimer l'ancien marqueur et cercle s'ils existent
                        if (userMarker) {
                            map.removeLayer(userMarker);
                        }
                        if (accuracyCircle) {
                            map.removeLayer(accuracyCircle);
                        }

                        // CrÃƒÂ©er un nouveau marqueur pour la position de l'utilisateur
                        userMarker = L.marker([latitude, longitude], {
                            icon: L.divIcon({
                                className:
                                    "gl-user-location-marker gl-user-location-marker--active",
                                html: `<div class="gl-user-location-dot gl-user-location-dot--active"></div>`,
                                iconSize: [22, 22],
                                iconAnchor: [11, 11],
                            }),
                            zIndexOffset: 1000,
                        }).addTo(map);

                        // Ajouter un cercle de prÃƒÂ©cision
                        if (accuracy && accuracy < 1000) {
                            const interactiveShapes = Config.get("ui.interactiveShapes", false);
                            accuracyCircle = L.circle([latitude, longitude], {
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

                        // Mettre à jour l'état
                        GeoLocationState.active = true;
                        link.classList.remove("is-locating");
                        link.classList.add("is-active");

                        // Stocker la position GPS pour utilisation par d'autres fonctionnalités (ex: recherche par proximité)
                        GeoLocationState.userPosition = {
                            lat: latitude,
                            lng: longitude,
                            accuracy: accuracy,
                            timestamp: Date.now(),
                        };

                        if (Log)
                            Log.debug(
                                "[UI.Controls] Position GPS mise ÃƒÂ  jour:",
                                latitude,
                                longitude
                            );
                    },
                    (error) => {
                        link.classList.remove("is-locating");
                        link.classList.remove("is-active");
                        GeoLocationState.active = false;

                        let errorMessage = "Impossible d'obtenir votre position";
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                errorMessage = "Permission de gÃƒÂ©olocalisation refusÃƒÂ©e";
                                break;
                            case error.POSITION_UNAVAILABLE:
                                errorMessage = "Position indisponible";
                                break;
                            case error.TIMEOUT:
                                errorMessage = "DÃƒÂ©lai de gÃƒÂ©olocalisation dÃƒÂ©passÃƒÂ©";
                                break;
                        }

                        if (Log) Log.error("[UI.Controls] Erreur de gÃƒÂ©olocalisation:", error);

                        // Afficher un message ÃƒÂ  l'utilisateur via le systÃƒÂ¨me de notifications
                        if (_UINotifications && typeof _UINotifications.error === "function") {
                            _UINotifications.error(errorMessage);
                        } else {
                            Log.warn("[UI.Controls] " + errorMessage);
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0,
                    }
                );
            };

            L.DomEvent.on(link, "click", toggleGeolocation);
            L.DomEvent.on(link, "keydown", (e) => {
                if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                    toggleGeolocation(e);
                }
            });

            this._link = link;
            this._userMarker = userMarker;

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

    new L.Control.Geolocation().addTo(map);
    if (Log) Log.info("[UI.Controls] ContrÃƒÂ´le de gÃƒÂ©olocalisation ajoutÃƒÂ© ÃƒÂ  la carte");
}

// ========================================
//   POI ADD CONTROL
// ========================================

/**
 * Gestion du bouton d'ajout de POI sur la carte
 * Permet aux utilisateurs d'ajouter de nouveaux points d'intÃƒÂ©rÃƒÂªt
 * @param {L.Map} map - Instance de la carte Leaflet
 * @param {Object} config - Configuration incluant ui.showAddPoi et poi.*
 */
function initPoiAddControl(map, config) {
    if (!map) {
        if (Log) Log.warn("[UI.Controls] initPoiAddControl: carte manquante");
        return;
    }

    // VÃƒÂ©rifier si le bouton POI Add est activÃƒÂ©
    if (!config?.ui?.showAddPoi) {
        if (Log) Log.debug("[UI.Controls] Bouton POI Add dÃƒÂ©sactivÃƒÂ© dans la configuration");
        return;
    }

    // VÃƒÂ©rifier que Leaflet est disponible
    if (typeof L === "undefined" || !L.Control) {
        if (Log) Log.warn("[UI.Controls] Leaflet n'est pas disponible");
        return;
    }

    // VÃƒÂ©rifier que les modules POI sont chargÃƒÂ©s
    if (
        !POIAddFormContract.isAddFormAvailable() ||
        !POIAddFormContract.isPlacementModeAvailable()
    ) {
        if (Log) Log.warn("[UI.Controls] Modules POI non chargÃƒÂ©s");
        return;
    }

    // ContrÃƒÂ´le Leaflet personnalisÃƒÂ© pour l'ajout de POI
    L.Control.PoiAdd = L.Control.extend({
        options: {
            position: "topleft",
        },

        onAdd: function (map) {
            const container = L.DomUtil.create(
                "div",
                "leaflet-control-poi-add leaflet-bar leaflet-control"
            );
            const link = L.DomUtil.create("a", "", container);

            link.href = "#";
            link.title = "Ajouter un POI";
            link.setAttribute("role", "button");
            link.setAttribute("aria-label", "Ajouter un nouveau point d'intÃƒÂ©rÃƒÂªt");

            // IcÃƒÂ´ne d'ajout de POI (SVG statique)
            // SAFE: SVG statique hardcodÃƒÂ©, pas de donnÃƒÂ©es utilisateur
            const poiSvg = DOMSecurity.createSVGIcon(
                18,
                18,
                "M12 2 C 6.5 2 2 6.5 2 12 C 2 17.5 6.5 22 12 22 C 17.5 22 22 17.5 22 12 C 22 6.5 17.5 2 12 2 M12 8 L12 16 M8 12 L16 12",
                {
                    stroke: "currentColor",
                    strokeWidth: "2",
                    fill: "none",
                }
            );
            link.appendChild(poiSvg);

            // Ãƒâ€°viter la propagation vers la carte
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const handleAddPoi = (e) => {
                L.DomEvent.preventDefault(e);

                // DÃƒÂ©sactiver le bouton temporairement
                link.classList.add("disabled");

                // Fonction pour ouvrir le formulaire
                const openForm = (latlng) => {
                    link.classList.remove("disabled");

                    if (!POIAddFormContract.isAddFormAvailable()) {
                        if (Log) Log.error("[UI.Controls] AddForm.openAddForm non disponible");
                        return;
                    }

                    POIAddFormContract.openAddForm(latlng, null);
                };

                // VÃƒÂ©rifier si la gÃƒÂ©olocalisation est disponible et si elle est le mode par dÃƒÂ©faut
                const userPosition = GeoLocationState.userPosition;
                const defaultPosition = config?.poiAddConfig?.defaultPosition || "placement-mode";

                if (userPosition && defaultPosition === "geolocation") {
                    // Utiliser la position GPS
                    if (Log)
                        Log.debug(
                            "[UI.Controls] Utilisation de la position GPS pour l'ajout de POI"
                        );
                    openForm(userPosition);
                } else {
                    // Activer le mode placement
                    if (Log)
                        Log.debug("[UI.Controls] Activation du mode placement pour l'ajout de POI");
                    POIAddFormContract.activatePlacementMode(map, (result) => {
                        if (result?.latlng) {
                            openForm(result.latlng);
                        } else {
                            link.classList.remove("disabled");
                            if (Log) Log.warn("[UI.Controls] Mode placement cancelled");
                        }
                    });
                }
            };

            L.DomEvent.on(link, "click", handleAddPoi);
            L.DomEvent.on(link, "keydown", (e) => {
                if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                    handleAddPoi(e);
                }
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

    new L.Control.PoiAdd().addTo(map);
    if (Log) Log.info("[UI.Controls] ContrÃƒÂ´le POI Add ajoutÃƒÂ© ÃƒÂ  la carte");
}

// ========================================
//   EXPORT
// ========================================

const _UIControls = {
    initFullscreenControl,
    initGeolocationControl,
    initPoiAddControl,
};

// Ã¢â€â‚¬Ã¢â€â‚¬ ESM Export Ã¢â€â‚¬Ã¢â€â‚¬
export { _UIControls };
