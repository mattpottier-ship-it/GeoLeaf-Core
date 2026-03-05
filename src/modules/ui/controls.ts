// @ts-nocheck � migration TS, typage progressif
/*!
 * GeoLeaf Core
 * Â© 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Controls
 * ContrÃ´les Leaflet personnalisÃ©s (fullscreen, zoom, scale, etc.)
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
 * Gestion du plein Ã©cran pour la carte
 * @param {L.Map} map - Instance de la carte Leaflet
 * @param {HTMLElement} mapContainer - Le conteneur de la carte Ã�  mettre en plein Ã©cran
 */
function initFullscreenControl(map, mapContainer) {
    if (!map || !mapContainer) {
        if (Log) Log.warn("[UI.Controls] initFullscreenControl: carte ou conteneur manquant");
        return;
    }

    // VÃ©rifier que Leaflet est disponible
    if (typeof L === "undefined" || !L.Control) {
        if (Log) Log.warn("[UI.Controls] Leaflet n'est pas disponible");
        return;
    }

    // ContrÃ´le Leaflet personnalisÃ©
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
            link.title = "Plein Ã©cran";
            link.setAttribute("role", "button");
            link.setAttribute("aria-label", "Activer le mode plein Ã©cran");

            // Fullscreen ENTER icon (static SVG)
            // SAFE: SVG statique hardcodÃ©
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
            // SAFE: SVG statique hardcodÃ©
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
            svgExit.style.display = "none"; // CachÃ© par dÃ©faut

            link.appendChild(svgEnter);
            link.appendChild(svgExit);

            // Ã‰viter la propagation vers la carte
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            // Debounce pour invalidateSize
            const debouncedInvalidateSize = debounce
                ? debounce(() => map.invalidateSize(), 200)
                : () => map.invalidateSize();

            // Fonction pour mettre Ã�  jour l'icÃ´ne
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
                    // Entrer en plein Ã©cran
                    mapContainer
                        .requestFullscreen()
                        .then(() => {
                            link.classList.add("is-fullscreen");
                            link.title = "Quitter le plein Ã©cran";
                            link.setAttribute("aria-label", "Quitter le mode plein Ã©cran");
                            updateIcon(true);
                            debouncedInvalidateSize();
                        })
                        .catch((err) => {
                            if (Log) Log.error("[UI.Controls] Erreur plein Ã©cran:", err);
                        });
                } else {
                    // Quitter le plein Ã©cran
                    document
                        .exitFullscreen()
                        .then(() => {
                            link.classList.remove("is-fullscreen");
                            link.title = "Plein Ã©cran";
                            link.setAttribute("aria-label", "Activer le mode plein Ã©cran");
                            updateIcon(false);
                            debouncedInvalidateSize();
                        })
                        .catch((err) => {
                            if (Log) Log.error("[UI.Controls] Erreur sortie plein Ã©cran:", err);
                        });
                }
            };

            const fullscreenChangeHandler = () => {
                if (!document.fullscreenElement) {
                    link.classList.remove("is-fullscreen");
                    link.title = "Plein Ã©cran";
                    link.setAttribute("aria-label", "Activer le mode plein Ã©cran");
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
    if (Log) Log.info("[UI.Controls] ContrÃ´le plein Ã©cran ajoutÃ© Ã�  la carte");
}

// ========================================
//   GEOLOCATION CONTROL
// ========================================

/**
 * Gestion de la gÃ©olocalisation pour centrer la carte sur la position de l'utilisateur
 * @param {L.Map} map - Instance de la carte Leaflet
 * @param {Object} config - Configuration incluant ui.enableGeolocation
 */
function initGeolocationControl(map, config) {
    if (!map) {
        if (Log) Log.warn("[UI.Controls] initGeolocationControl: carte manquante");
        return;
    }

    // VÃ©rifier si la gÃ©olocalisation est activÃ©e dans la config
    if (!config?.ui?.enableGeolocation) {
        if (Log) Log.info("[UI.Controls] GÃ©olocalisation dÃ©sactivÃ©e dans la configuration");
        return;
    }

    // VÃ©rifier que Leaflet est disponible
    if (typeof L === "undefined" || !L.Control) {
        if (Log) Log.warn("[UI.Controls] Leaflet n'est pas disponible");
        return;
    }

    // VÃ©rifier que l'API de gÃ©olocalisation est disponible
    if (!navigator.geolocation) {
        if (Log)
            Log.warn("[UI.Controls] La gÃ©olocalisation n'est pas supportÃ©e par ce navigateur");
        return;
    }

    // Marqueur de position utilisateur (stockÃ© pour pouvoir le supprimer/mettre Ã�  jour)
    let userMarker = null;
    let accuracyCircle = null;
    /** Toast "Localisation en cours…" à dismiss au premier fix. */
    let _pendingGeolocToast: HTMLElement | null = null;
    /** Bouton flottant "revenir à ma position", injecté dans map.getContainer(). */
    let _recenterBtn: HTMLButtonElement | null = null;
    /** Vérifie si la carte s'est éloignée et affiche/masque le bouton recentrage. */
    const _checkRecenterVisibility = () => {
        if (!_recenterBtn || !GeoLocationState.userPosition) return;
        const mapCenter = map.getCenter();
        const userLatLng = (globalThis.L as any).latLng(
            GeoLocationState.userPosition.lat,
            GeoLocationState.userPosition.lng
        );
        _recenterBtn.classList.toggle("is-visible", mapCenter.distanceTo(userLatLng) > 50);
    };

    // ContrÃ´le Leaflet personnalisÃ©
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
            link.title = "GÃ©olocalisation ON/OFF";
            link.setAttribute("role", "button");
            link.setAttribute("aria-label", "Activer/DÃ©sactiver le suivi GPS");

            // IcÃ´ne de gÃ©olocalisation (utilisation d'un SVG ou Unicode)
            // SAFE: SVG statique hardcodÃ©, pas de donnÃ©es utilisateur
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

            // Ã‰viter la propagation vers la carte
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const toggleGeolocation = (e) => {
                L.DomEvent.preventDefault(e);

                // Si d�j� actif, d�sactiver
                if (GeoLocationState.active) {
                    // D�sactiver le tracking
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

                    // R�initialiser l'�tat
                    GeoLocationState.active = false;
                    GeoLocationState.userPosition = null;

                    link.classList.remove("is-active");
                    link.classList.remove("is-locating");

                    /* Fermer le toast "Localisation en cours…" si encore visible */
                    if (_pendingGeolocToast && _UINotifications?.dismiss) {
                        _UINotifications.dismiss(_pendingGeolocToast);
                        _pendingGeolocToast = null;
                    }
                    /* Retirer le bouton de recentrage et son écouteur moveend */
                    if (_recenterBtn) {
                        map.off("moveend", _checkRecenterVisibility);
                        if (_recenterBtn.parentNode) _recenterBtn.remove();
                        _recenterBtn = null;
                    }
                    /* Notifier la barre mobile */
                    map.getContainer().dispatchEvent(
                        new CustomEvent("gl:geoloc:statechange", {
                            detail: { active: false },
                            bubbles: true,
                        })
                    );

                    if (Log) Log.info("[UI.Controls] Géolocalisation désactivée");
                    return;
                }

                // Activer le mode géolocalisation
                link.classList.add("is-locating");

                /* Toast persistant "Localisation en cours…" — dismissé au premier fix */
                if (_UINotifications?.info) {
                    _pendingGeolocToast = _UINotifications.info("Localisation en cours\u2026", {
                        persistent: true,
                        dismissible: false,
                    });
                }

                /* Créer le bouton de recentrage GPS (caché par défaut) */
                if (!_recenterBtn) {
                    const btn = document.createElement("button") as HTMLButtonElement;
                    btn.id = "gl-recenter-btn";
                    btn.type = "button";
                    btn.setAttribute("aria-label", "Revenir à ma position");
                    btn.title = "Revenir à ma position";
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
                                [
                                    GeoLocationState.userPosition.lat,
                                    GeoLocationState.userPosition.lng,
                                ],
                                map.getZoom(),
                                { animate: true, duration: 0.4 }
                            );
                        }
                    });
                    map.getContainer().appendChild(btn);
                    _recenterBtn = btn;
                }

                // Utiliser watchPosition pour un tracking continu
                GeoLocationState.watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude, accuracy } = position.coords;

                        // Premi�re activation : centrer la carte
                        if (!GeoLocationState.active) {
                            map.setView([latitude, longitude], 16, {
                                animate: true,
                                duration: 0.5,
                            });
                        } else {
                            // Mise Ã�  jour continue : dÃ©placer le marqueur sans recentrer
                            // (sauf si on veut un mode "suivi" permanent)
                        }

                        // Supprimer l'ancien marqueur et cercle s'ils existent
                        if (userMarker) {
                            map.removeLayer(userMarker);
                        }
                        if (accuracyCircle) {
                            map.removeLayer(accuracyCircle);
                        }

                        // CrÃ©er un nouveau marqueur pour la position de l'utilisateur
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

                        // Ajouter un cercle de prÃ©cision
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

                        /* Mémoriser si c'est le premier fix */
                        const _isFirstFix = !GeoLocationState.active;

                        // Mettre à jour l'état
                        GeoLocationState.active = true;
                        link.classList.remove("is-locating");
                        link.classList.add("is-active");

                        // Stocker la position GPS
                        GeoLocationState.userPosition = {
                            lat: latitude,
                            lng: longitude,
                            accuracy: accuracy,
                            timestamp: Date.now(),
                        };

                        if (_isFirstFix) {
                            /* Fermer le toast "en cours" et afficher la confirmation */
                            if (_pendingGeolocToast && _UINotifications?.dismiss) {
                                _UINotifications.dismiss(_pendingGeolocToast);
                                _pendingGeolocToast = null;
                            }
                            if (_UINotifications?.success) {
                                _UINotifications.success("Position trouvée", 2500);
                            }
                            /* Activer la détection d'éloignement pour le bouton recentrage */
                            map.on("moveend", _checkRecenterVisibility);
                            /* Notifier la barre mobile */
                            map.getContainer().dispatchEvent(
                                new CustomEvent("gl:geoloc:statechange", {
                                    detail: { active: true },
                                    bubbles: true,
                                })
                            );
                        } else {
                            /* Fixes suivants : recalculer la visibilité du bouton recentrage */
                            _checkRecenterVisibility();
                        }

                        if (Log)
                            Log.debug(
                                "[UI.Controls] Position GPS mise à jour:",
                                latitude,
                                longitude
                            );
                    },
                    (error) => {
                        link.classList.remove("is-locating");
                        link.classList.remove("is-active");
                        GeoLocationState.active = false;

                        /* Fermer le toast "en cours" en cas d'erreur */
                        if (_pendingGeolocToast && _UINotifications?.dismiss) {
                            _UINotifications.dismiss(_pendingGeolocToast);
                            _pendingGeolocToast = null;
                        }

                        let errorMessage = "Impossible d'obtenir votre position";
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                errorMessage = "Permission de gÃ©olocalisation refusÃ©e";
                                break;
                            case error.POSITION_UNAVAILABLE:
                                errorMessage = "Position indisponible";
                                break;
                            case error.TIMEOUT:
                                errorMessage = "DÃ©lai de gÃ©olocalisation dÃ©passÃ©";
                                break;
                        }

                        if (Log) Log.error("[UI.Controls] Erreur de gÃ©olocalisation:", error);

                        // Afficher un message Ã�  l'utilisateur via le systÃ¨me de notifications
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
    if (Log) Log.info("[UI.Controls] ContrÃ´le de gÃ©olocalisation ajoutÃ© Ã�  la carte");
}

// ========================================
//   POI ADD CONTROL
// ========================================

/**
 * Gestion du bouton d'ajout de POI sur la carte
 * Permet aux utilisateurs d'ajouter de nouveaux points d'intÃ©rÃªt
 * @param {L.Map} map - Instance de la carte Leaflet
 * @param {Object} config - Configuration incluant ui.showAddPoi et poi.*
 */
function initPoiAddControl(map, config) {
    if (!map) {
        if (Log) Log.warn("[UI.Controls] initPoiAddControl: carte manquante");
        return;
    }

    // VÃ©rifier si le bouton POI Add est activÃ©
    if (!config?.ui?.showAddPoi) {
        if (Log) Log.debug("[UI.Controls] Bouton POI Add dÃ©sactivÃ© dans la configuration");
        return;
    }

    // VÃ©rifier que Leaflet est disponible
    if (typeof L === "undefined" || !L.Control) {
        if (Log) Log.warn("[UI.Controls] Leaflet n'est pas disponible");
        return;
    }

    // VÃ©rifier que les modules POI sont chargÃ©s
    if (
        !POIAddFormContract.isAddFormAvailable() ||
        !POIAddFormContract.isPlacementModeAvailable()
    ) {
        if (Log) Log.warn("[UI.Controls] Modules POI non chargÃ©s");
        return;
    }

    // ContrÃ´le Leaflet personnalisÃ© pour l'ajout de POI
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
            link.setAttribute("aria-label", "Ajouter un nouveau point d'intÃ©rÃªt");

            // IcÃ´ne d'ajout de POI (SVG statique)
            // SAFE: SVG statique hardcodÃ©, pas de donnÃ©es utilisateur
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

            // Ã‰viter la propagation vers la carte
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const handleAddPoi = (e) => {
                L.DomEvent.preventDefault(e);

                // DÃ©sactiver le bouton temporairement
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

                // VÃ©rifier si la gÃ©olocalisation est disponible et si elle est le mode par dÃ©faut
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
    if (Log) Log.info("[UI.Controls] ContrÃ´le POI Add ajoutÃ© Ã�  la carte");
}

// ========================================
//   EXPORT
// ========================================

const _UIControls = {
    initFullscreenControl,
    initGeolocationControl,
    initPoiAddControl,
};

// â”€â”€ ESM Export â”€â”€
export { _UIControls };
