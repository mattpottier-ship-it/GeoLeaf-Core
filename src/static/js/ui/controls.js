/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Controls
 * Contrôles Leaflet personnalisés (fullscreen, zoom, scale, etc.)
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;
    const Utils = GeoLeaf.Utils;

    GeoLeaf._UIControls = GeoLeaf._UIControls || {};

    // ========================================
    //   FULLSCREEN CONTROL
    // ========================================

    /**
     * Gestion du plein écran pour la carte
     * @param {L.Map} map - Instance de la carte Leaflet
     * @param {HTMLElement} mapContainer - Le conteneur de la carte à mettre en plein écran
     */
    function initFullscreenControl(map, mapContainer) {
        if (!map || !mapContainer) {
            if (Log) Log.warn("[UI.Controls] initFullscreenControl: carte ou conteneur manquant");
            return;
        }

        // Vérifier que Leaflet est disponible
        if (typeof L === "undefined" || !L.Control) {
            if (Log) Log.warn("[UI.Controls] Leaflet n'est pas disponible");
            return;
        }

        // Contrôle Leaflet personnalisé
        L.Control.Fullscreen = L.Control.extend({
            options: {
                position: "topleft"
            },

            onAdd: function (map) {
                const container = L.DomUtil.create(
                    "div",
                    "leaflet-control-fullscreen leaflet-bar leaflet-control"
                );
                const link = L.DomUtil.create("a", "", container);

                link.href = "#";
                link.title = "Plein écran";
                link.setAttribute("role", "button");
                link.setAttribute("aria-label", "Activer le mode plein écran");

                // Fullscreen ENTER icon (static SVG)
                // SAFE: SVG statique hardcodé
                const svgEnter = GeoLeaf.DOMSecurity.createSVGIcon(18, 18, 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3', {
                    stroke: 'currentColor',
                    strokeWidth: '2',
                    fill: 'none'
                });
                svgEnter.classList.add('fullscreen-enter-icon');

                // Fullscreen EXIT icon (static SVG)
                // SAFE: SVG statique hardcodé
                const svgExit = GeoLeaf.DOMSecurity.createSVGIcon(18, 18, 'M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3', {
                    stroke: 'currentColor',
                    strokeWidth: '2',
                    fill: 'none'
                });
                svgExit.classList.add('fullscreen-exit-icon');
                svgExit.style.display = 'none'; // Caché par défaut

                link.appendChild(svgEnter);
                link.appendChild(svgExit);

                // Éviter la propagation vers la carte
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);

                // Debounce pour invalidateSize
                const debouncedInvalidateSize =
                    Utils?.debounce
                        ? Utils.debounce(() => map.invalidateSize(), 200)
                        : () => map.invalidateSize();

                // Fonction pour mettre à jour l'icône
                const updateIcon = (isFullscreen) => {
                    if (isFullscreen) {
                        svgEnter.style.display = 'none';
                        svgExit.style.display = 'block';
                    } else {
                        svgEnter.style.display = 'block';
                        svgExit.style.display = 'none';
                    }
                };

                const toggleFullscreen = (e) => {
                    L.DomEvent.preventDefault(e);

                    if (!document.fullscreenElement) {
                        // Entrer en plein écran
                        mapContainer
                            .requestFullscreen()
                            .then(() => {
                                link.classList.add("is-fullscreen");
                                link.title = "Quitter le plein écran";
                                link.setAttribute(
                                    "aria-label",
                                    "Quitter le mode plein écran"
                                );
                                updateIcon(true);
                                debouncedInvalidateSize();
                            })
                            .catch((err) => {
                                if (Log) Log.error("[UI.Controls] Erreur plein écran:", err);
                            });
                    } else {
                        // Quitter le plein écran
                        document
                            .exitFullscreen()
                            .then(() => {
                                link.classList.remove("is-fullscreen");
                                link.title = "Plein écran";
                                link.setAttribute(
                                    "aria-label",
                                    "Activer le mode plein écran"
                                );
                                updateIcon(false);
                                debouncedInvalidateSize();
                            })
                            .catch((err) => {
                                if (Log) Log.error("[UI.Controls] Erreur sortie plein écran:", err);
                            });
                    }
                };

                const fullscreenChangeHandler = () => {
                    if (!document.fullscreenElement) {
                        link.classList.remove("is-fullscreen");
                        link.title = "Plein écran";
                        link.setAttribute(
                            "aria-label",
                            "Activer le mode plein écran"
                        );
                        updateIcon(false);
                        debouncedInvalidateSize();
                    }
                };

                L.DomEvent.on(link, "click", toggleFullscreen);
                L.DomEvent.on(link, "keydown", (e) => {
                    if (
                        e.key === "Enter" ||
                        e.key === " " ||
                        e.key === "Spacebar"
                    ) {
                        toggleFullscreen(e);
                    }
                });

                document.addEventListener(
                    "fullscreenchange",
                    fullscreenChangeHandler
                );

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
                    document.removeEventListener(
                        "fullscreenchange",
                        this._fullscreenChangeHandler
                    );
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
            }
        });

        new L.Control.Fullscreen().addTo(map);
        if (Log) Log.info("[UI.Controls] Contrôle plein écran ajouté à la carte");
    }

    // ========================================
    //   GEOLOCATION CONTROL
    // ========================================

    /**
     * Gestion de la géolocalisation pour centrer la carte sur la position de l'utilisateur
     * @param {L.Map} map - Instance de la carte Leaflet
     * @param {Object} config - Configuration incluant ui.enableGeolocation
     */
    function initGeolocationControl(map, config) {
        if (!map) {
            if (Log) Log.warn("[UI.Controls] initGeolocationControl: carte manquante");
            return;
        }

        // Vérifier si la géolocalisation est activée dans la config
        if (!config?.ui?.enableGeolocation) {
            if (Log) Log.info("[UI.Controls] Géolocalisation désactivée dans la configuration");
            return;
        }

        // Vérifier que Leaflet est disponible
        if (typeof L === "undefined" || !L.Control) {
            if (Log) Log.warn("[UI.Controls] Leaflet n'est pas disponible");
            return;
        }

        // Vérifier que l'API de géolocalisation est disponible
        if (!navigator.geolocation) {
            if (Log) Log.warn("[UI.Controls] La géolocalisation n'est pas supportée par ce navigateur");
            return;
        }

        // Marqueur de position utilisateur (stocké pour pouvoir le supprimer/mettre à jour)
        let userMarker = null;
        let accuracyCircle = null;

        // Contrôle Leaflet personnalisé
        L.Control.Geolocation = L.Control.extend({
            options: {
                position: "topleft"
            },

            onAdd: function (map) {
                const container = L.DomUtil.create(
                    "div",
                    "leaflet-control-geolocation leaflet-bar leaflet-control"
                );
                const link = L.DomUtil.create("a", "", container);

                link.href = "#";
                link.title = "Géolocalisation ON/OFF";
                link.setAttribute("role", "button");
                link.setAttribute("aria-label", "Activer/Désactiver le suivi GPS");

                // Icône de géolocalisation (utilisation d'un SVG ou Unicode)
                // SAFE: SVG statique hardcodé, pas de données utilisateur
                const geoSvg = GeoLeaf.DOMSecurity.createSVGIcon(18, 18, 'M12 2 C 6.5 2 2 6.5 2 12 C 2 17.5 6.5 22 12 22 C 17.5 22 22 17.5 22 12 C 22 6.5 17.5 2 12 2 M12 9 C 10.3 9 9 10.3 9 12 C 9 13.7 10.3 15 12 15 C 13.7 15 15 13.7 15 12 C 15 10.3 13.7 9 12 9', {
                    stroke: 'currentColor',
                    strokeWidth: '2',
                    fill: 'none'
                });
                link.appendChild(geoSvg);

                // Éviter la propagation vers la carte
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);

                const toggleGeolocation = (e) => {
                    L.DomEvent.preventDefault(e);

                    // Si déjà actif, désactiver
                    if (window.GeoLeaf.UI._geolocationActive) {
                        // Désactiver le tracking
                        if (window.GeoLeaf.UI._geolocationWatchId !== null) {
                            navigator.geolocation.clearWatch(window.GeoLeaf.UI._geolocationWatchId);
                            window.GeoLeaf.UI._geolocationWatchId = null;
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
                        window.GeoLeaf.UI._geolocationActive = false;
                        window.GeoLeaf.UI._userPosition = null;

                        link.classList.remove("is-active");
                        link.classList.remove("is-locating");

                        if (Log) Log.info("[UI.Controls] Géolocalisation désactivée");
                        return;
                    }

                    // Activer le mode géolocalisation
                    link.classList.add("is-locating");

                    // Utiliser watchPosition pour un tracking continu
                    window.GeoLeaf.UI._geolocationWatchId = navigator.geolocation.watchPosition(
                        (position) => {
                            const { latitude, longitude, accuracy } = position.coords;

                            // Première activation : centrer la carte
                            if (!window.GeoLeaf.UI._geolocationActive) {
                                map.setView([latitude, longitude], 16, {
                                    animate: true,
                                    duration: 0.5
                                });
                            } else {
                                // Mise à jour continue : déplacer le marqueur sans recentrer
                                // (sauf si on veut un mode "suivi" permanent)
                            }

                            // Supprimer l'ancien marqueur et cercle s'ils existent
                            if (userMarker) {
                                map.removeLayer(userMarker);
                            }
                            if (accuracyCircle) {
                                map.removeLayer(accuracyCircle);
                            }

                            // Créer un nouveau marqueur pour la position de l'utilisateur
                            userMarker = L.marker([latitude, longitude], {
                                icon: L.divIcon({
                                    className: 'gl-user-location-marker gl-user-location-marker--active',
                                    html: `<div class="gl-user-location-dot gl-user-location-dot--active"></div>`,
                                    iconSize: [22, 22],
                                    iconAnchor: [11, 11]
                                }),
                                zIndexOffset: 1000
                            }).addTo(map);

                            // Ajouter un cercle de précision
                            if (accuracy && accuracy < 1000) {
                                const interactiveShapes = GeoLeaf.Config.get('ui.interactiveShapes', false);
                                accuracyCircle = L.circle([latitude, longitude], {
                                    radius: accuracy,
                                    className: 'gl-user-location-accuracy',
                                    fillColor: '#4285F4',
                                    fillOpacity: 0.1,
                                    stroke: true,
                                    color: '#4285F4',
                                    opacity: 0.3,
                                    weight: 1,
                                    interactive: interactiveShapes
                                }).addTo(map);
                            }

                            // Mettre à jour l'état
                            window.GeoLeaf.UI._geolocationActive = true;
                            link.classList.remove("is-locating");
                            link.classList.add("is-active");

                            // Stocker la position GPS globalement pour utilisation par d'autres fonctionnalités (ex: recherche par proximité)
                            if (window.GeoLeaf && window.GeoLeaf.UI) {
                                window.GeoLeaf.UI._userPosition = {
                                    lat: latitude,
                                    lng: longitude,
                                    accuracy: accuracy,
                                    timestamp: Date.now()
                                };
                            }

                            if (Log) Log.debug("[UI.Controls] Position GPS mise à jour:", latitude, longitude);
                        },
                        (error) => {
                            link.classList.remove("is-locating");
                            link.classList.remove("is-active");
                            window.GeoLeaf.UI._geolocationActive = false;

                            let errorMessage = "Impossible d'obtenir votre position";
                            switch (error.code) {
                                case error.PERMISSION_DENIED:
                                    errorMessage = "Permission de géolocalisation refusée";
                                    break;
                                case error.POSITION_UNAVAILABLE:
                                    errorMessage = "Position indisponible";
                                    break;
                                case error.TIMEOUT:
                                    errorMessage = "Délai de géolocalisation dépassé";
                                    break;
                            }

                            if (Log) Log.error("[UI.Controls] Erreur de géolocalisation:", error);

                            // Afficher un message à l'utilisateur (peut être personnalisé)
                            if (window.alert) {
                                alert(errorMessage);
                            }
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0
                        }
                    );
                };

                L.DomEvent.on(link, "click", toggleGeolocation);
                L.DomEvent.on(link, "keydown", (e) => {
                    if (
                        e.key === "Enter" ||
                        e.key === " " ||
                        e.key === "Spacebar"
                    ) {
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
            }
        });

        new L.Control.Geolocation().addTo(map);
        if (Log) Log.info("[UI.Controls] Contrôle de géolocalisation ajouté à la carte");
    }

    // ========================================
    //   POI ADD CONTROL
    // ========================================

    /**
     * Gestion du bouton d'ajout de POI sur la carte
     * Permet aux utilisateurs d'ajouter de nouveaux points d'intérêt
     * @param {L.Map} map - Instance de la carte Leaflet
     * @param {Object} config - Configuration incluant ui.showAddPoi et poi.*
     */
    function initPoiAddControl(map, config) {
        if (!map) {
            if (Log) Log.warn("[UI.Controls] initPoiAddControl: carte manquante");
            return;
        }

        // Vérifier si le bouton POI Add est activé
        if (!config?.ui?.showAddPoi) {
            if (Log) Log.debug("[UI.Controls] Bouton POI Add désactivé dans la configuration");
            return;
        }

        // Vérifier que Leaflet est disponible
        if (typeof L === "undefined" || !L.Control) {
            if (Log) Log.warn("[UI.Controls] Leaflet n'est pas disponible");
            return;
        }

        // Vérifier que les modules POI sont chargés
        if (!GeoLeaf?.POI?.AddForm || !GeoLeaf?.POI?.PlacementMode) {
            if (Log) Log.warn("[UI.Controls] Modules POI non chargés");
            return;
        }

        // Contrôle Leaflet personnalisé pour l'ajout de POI
        L.Control.PoiAdd = L.Control.extend({
            options: {
                position: "topleft"
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
                link.setAttribute("aria-label", "Ajouter un nouveau point d'intérêt");

                // Icône d'ajout de POI (SVG statique)
                // SAFE: SVG statique hardcodé, pas de données utilisateur
                const poiSvg = GeoLeaf.DOMSecurity.createSVGIcon(18, 18, 'M12 2 C 6.5 2 2 6.5 2 12 C 2 17.5 6.5 22 12 22 C 17.5 22 22 17.5 22 12 C 22 6.5 17.5 2 12 2 M12 8 L12 16 M8 12 L16 12', {
                    stroke: 'currentColor',
                    strokeWidth: '2',
                    fill: 'none'
                });
                link.appendChild(poiSvg);

                // Éviter la propagation vers la carte
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);

                const handleAddPoi = (e) => {
                    L.DomEvent.preventDefault(e);

                    // Désactiver le bouton temporairement
                    link.classList.add("disabled");

                    // Fonction pour ouvrir le formulaire
                    const openForm = (latlng) => {
                        link.classList.remove("disabled");

                        if (!GeoLeaf.POI.AddForm.openAddForm) {
                            if (Log) Log.error("[UI.Controls] AddForm.openAddForm non disponible");
                            return;
                        }

                        GeoLeaf.POI.AddForm.openAddForm(latlng, null);
                    };

                    // Vérifier si la géolocalisation est disponible et si elle est le mode par défaut
                    const userPosition = GeoLeaf?.UI?._userPosition;
                    const defaultPosition = config?.poiAddConfig?.defaultPosition || "placement-mode";

                    if (userPosition && defaultPosition === "geolocation") {
                        // Utiliser la position GPS
                        if (Log) Log.debug("[UI.Controls] Utilisation de la position GPS pour l'ajout de POI");
                        openForm(userPosition);
                    } else {
                        // Activer le mode placement
                        if (Log) Log.debug("[UI.Controls] Activation du mode placement pour l'ajout de POI");
                        GeoLeaf.POI.PlacementMode.activate(map, (result) => {
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
                    if (
                        e.key === "Enter" ||
                        e.key === " " ||
                        e.key === "Spacebar"
                    ) {
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
            }
        });

        new L.Control.PoiAdd().addTo(map);
        if (Log) Log.info("[UI.Controls] Contrôle POI Add ajouté à la carte");
    }

    // ========================================
    //   EXPORT
    // ========================================

    GeoLeaf._UIControls = {
        initFullscreenControl,
        initGeolocationControl,
        initPoiAddControl
    };

})(typeof window !== "undefined" ? window : global);
