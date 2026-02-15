/**
 * GeoLeaf UI Filter Panel - Proximity
 * Gestion des filtres de proximité (GPS, manuel, cercle)
 *
 * @module ui/filter-panel/proximity
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Dépendances lazy
    const getLog = () => (GeoLeaf.Log || console);

    GeoLeaf._UIFilterPanelProximity = GeoLeaf._UIFilterPanelProximity || {};
    GeoLeaf._UIFilterPanelProximity._eventCleanups = [];

    /**
     * Initialise la fonctionnalité de proximité
     * @param {L.Map} map - Instance de carte Leaflet
     */
    GeoLeaf._UIFilterPanelProximity.initProximityFilter = function(map) {
        const Log = getLog();

        if (!map) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Carte non disponible pour le filtre de proximité");
            return;
        }

        // Stocker sur GeoLeaf.UI pour accès global
        GeoLeaf.UI._proximityMode = false;
        GeoLeaf.UI._proximityCircle = null;
        GeoLeaf.UI._proximityMarker = null;
        GeoLeaf.UI._proximityMap = map;
        GeoLeaf.UI._proximityClickHandler = null;

        // Écouter les changements sur le slider de rayon - avec cleanup tracking
        const events = GeoLeaf.Utils?.events;
        if (events) {
            const inputHandler = function(evt) {
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
                if (GeoLeaf.UI._proximityCircle) {
                    const radiusMeters = newRadius * 1000;
                    GeoLeaf.UI._proximityCircle.setRadius(radiusMeters);
                }
            };

            const clickHandler = function(evt) {
                const btn = evt.target.closest("[data-filter-proximity-btn]");
                if (!btn) return;

                evt.preventDefault();
                GeoLeaf._UIFilterPanelProximity.toggleProximityMode(btn, map);
            };

            GeoLeaf._UIFilterPanelProximity._eventCleanups.push(
                events.on(
                    document,
                    "input",
                    inputHandler,
                    false,
                    'ProximityFilter.radiusInput'
                )
            );
            GeoLeaf._UIFilterPanelProximity._eventCleanups.push(
                events.on(
                    document,
                    "click",
                    clickHandler,
                    false,
                    'ProximityFilter.buttonClick'
                )
            );
        } else {
            // Fallback sans cleanup
            Log.warn('[ProximityFilter] EventListenerManager not available - listeners will not be cleaned up');
            document.addEventListener("input", function(evt) {
                const slider = evt.target.closest("[data-filter-proximity-radius]");
                if (!slider) return;
                const proximityControl = slider.closest(".gl-filter-panel__proximity");
                if (!proximityControl) return;
                const wrapper = proximityControl.closest("[data-gl-filter-id='proximity']");
                if (!wrapper) return;
                const newRadius = parseFloat(slider.value);
                wrapper.setAttribute("data-proximity-radius", newRadius);
                if (GeoLeaf.UI._proximityCircle) {
                    const radiusMeters = newRadius * 1000;
                    GeoLeaf.UI._proximityCircle.setRadius(radiusMeters);
                }
            });
            document.addEventListener("click", function(evt) {
                const btn = evt.target.closest("[data-filter-proximity-btn]");
                if (!btn) return;
                evt.preventDefault();
                GeoLeaf._UIFilterPanelProximity.toggleProximityMode(btn, map);
            });
        }

        Log.info("[GeoLeaf.UI.FilterPanel] Filtre de proximité initialisé");
    };

    /**
     * Cleanup du filtre de proximité
     */
    GeoLeaf._UIFilterPanelProximity.destroy = function() {
        const Log = getLog();

        // Cleanup event listeners
        if (GeoLeaf._UIFilterPanelProximity._eventCleanups && GeoLeaf._UIFilterPanelProximity._eventCleanups.length > 0) {
            GeoLeaf._UIFilterPanelProximity._eventCleanups.forEach(cleanup => {
                if (typeof cleanup === 'function') cleanup();
            });
            GeoLeaf._UIFilterPanelProximity._eventCleanups = [];
            Log.info('[ProximityFilter] Event listeners cleaned up');
        }

        // Cleanup map references
        if (GeoLeaf.UI._proximityCircle) {
            GeoLeaf.UI._proximityMap.removeLayer(GeoLeaf.UI._proximityCircle);
            GeoLeaf.UI._proximityCircle = null;
        }
        if (GeoLeaf.UI._proximityMarker) {
            GeoLeaf.UI._proximityMap.removeLayer(GeoLeaf.UI._proximityMarker);
            GeoLeaf.UI._proximityMarker = null;
        }

        GeoLeaf.UI._proximityMap = null;
        GeoLeaf.UI._proximityMode = false;
    };

    /**
     * Bascule le mode de proximité
     * @param {HTMLElement} btn - Bouton de proximité
     * @param {L.Map} map - Instance de carte
     */
    GeoLeaf._UIFilterPanelProximity.toggleProximityMode = function(btn, map) {
        const Log = getLog();

        GeoLeaf.UI._proximityMode = !GeoLeaf.UI._proximityMode;

        const container = btn.closest(".gl-filter-panel__proximity");
        const rangeWrapper = container.querySelector(".gl-filter-panel__proximity-range");
        const instruction = container.querySelector(".gl-filter-panel__proximity-instruction");

        if (GeoLeaf.UI._proximityMode) {
            btn.textContent = "Désactiver";
            btn.classList.add("is-active");
            if (rangeWrapper) rangeWrapper.style.display = "block";
            if (instruction) instruction.style.display = "block";

            // Vérifier si la position GPS est disponible et récente (< 5 minutes)
            const hasRecentGPS = GeoLeaf.UI._userPosition &&
                                (Date.now() - GeoLeaf.UI._userPosition.timestamp < 300000);

            if (hasRecentGPS) {
                GeoLeaf._UIFilterPanelProximity.activateGPSMode(container, map);
            } else {
                GeoLeaf._UIFilterPanelProximity.activateManualMode(container, map);
            }

        } else {
            // Désactiver le mode proximité
            GeoLeaf._UIFilterPanelProximity.deactivateProximityMode(btn, container, map);
        }
    };

    /**
     * Active le mode GPS automatique
     * @param {HTMLElement} container - Container de proximité
     * @param {L.Map} map - Instance de carte
     */
    GeoLeaf._UIFilterPanelProximity.activateGPSMode = function(container, map) {
        const Log = getLog();

        Log.info("[GeoLeaf.UI.FilterPanel] Utilisation de la position GPS pour la recherche par proximité");

        const radiusInput = container.querySelector("[data-filter-proximity-radius]");
        const radius = radiusInput ? parseFloat(radiusInput.value) : 10;
        const radiusMeters = radius * 1000;

        const wrapper = container.closest("[data-gl-filter-id='proximity']");
        if (!wrapper) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Wrapper proximity non trouvé");
            return;
        }

        // Supprimer les éléments existants
        if (GeoLeaf.UI._proximityCircle) {
            map.removeLayer(GeoLeaf.UI._proximityCircle);
        }
        if (GeoLeaf.UI._proximityMarker) {
            map.removeLayer(GeoLeaf.UI._proximityMarker);
        }

        // Créer le cercle à la position GPS
        const gpsLatLng = global.L.latLng(GeoLeaf.UI._userPosition.lat, GeoLeaf.UI._userPosition.lng);

        const interactiveShapes = GeoLeaf.Config.get('ui.interactiveShapes', false);
        GeoLeaf.UI._proximityCircle = global.L.circle(gpsLatLng, {
            radius: radiusMeters,
            color: "#c2410c",
            fillColor: "#c2410c",
            fillOpacity: 0.2,
            weight: 2,
            interactive: interactiveShapes
        }).addTo(map);

        // Ne pas créer de marqueur supplémentaire si la géolocalisation est active
        if (!GeoLeaf.UI._geolocationActive) {
            // Mode GPS mais géolocalisation pas en tracking continu : créer un marqueur draggable
            GeoLeaf.UI._proximityMarker = global.L.marker(gpsLatLng, {
                draggable: true,
                icon: global.L.divIcon({
                    className: 'gl-proximity-gps-marker',
                    html: '<div style="width: 20px; height: 20px; background: #2563eb; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(map);

            // Gérer le déplacement du marqueur
            GeoLeaf.UI._proximityMarker.on('dragend', function() {
                const newLatLng = GeoLeaf.UI._proximityMarker.getLatLng();
                if (GeoLeaf.UI._proximityCircle) {
                    GeoLeaf.UI._proximityCircle.setLatLng(newLatLng);
                }
                wrapper.setAttribute("data-proximity-lat", newLatLng.lat);
                wrapper.setAttribute("data-proximity-lng", newLatLng.lng);
                Log.info("[GeoLeaf.UI.FilterPanel] Point de proximité GPS déplacé:", {
                    lat: newLatLng.lat,
                    lng: newLatLng.lng,
                    radius: radius
                });
            });
        } else {
            GeoLeaf.UI._proximityMarker = null;
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
            duration: 0.5
        });

        Log.info("[GeoLeaf.UI.FilterPanel] Point de proximité GPS défini:", {
            lat: gpsLatLng.lat,
            lng: gpsLatLng.lng,
            radius: radius
        });

        // Pas de handler de clic nécessaire en mode GPS
        GeoLeaf.UI._proximityClickHandler = null;
    };

    /**
     * Active le mode manuel (clic sur la carte)
     * @param {HTMLElement} container - Container de proximité
     * @param {L.Map} map - Instance de carte
     */
    GeoLeaf._UIFilterPanelProximity.activateManualMode = function(container, map) {
        const Log = getLog();

        Log.info("[GeoLeaf.UI.FilterPanel] Mode manuel : cliquez sur la carte pour définir le point de recherche");

        map.getContainer().style.cursor = "crosshair";

        // Créer le handler pour pouvoir le retirer plus tard
        GeoLeaf.UI._proximityClickHandler = function(e) {
            const radiusInput = container.querySelector("[data-filter-proximity-radius]");
            const radius = radiusInput ? parseFloat(radiusInput.value) : 10;
            const radiusMeters = radius * 1000;

            const wrapper = container.closest("[data-gl-filter-id='proximity']");
            if (!wrapper) {
                Log.warn("[GeoLeaf.UI.FilterPanel] Wrapper proximity non trouvé");
                return;
            }

            if (GeoLeaf.UI._proximityCircle) {
                map.removeLayer(GeoLeaf.UI._proximityCircle);
            }
            if (GeoLeaf.UI._proximityMarker) {
                map.removeLayer(GeoLeaf.UI._proximityMarker);
            }

            const interactiveShapes = GeoLeaf.Config.get('ui.interactiveShapes', false);
            GeoLeaf.UI._proximityCircle = global.L.circle(e.latlng, {
                radius: radiusMeters,
                color: "#c2410c",
                fillColor: "#c2410c",
                fillOpacity: 0.2,
                weight: 2,
                interactive: interactiveShapes
            }).addTo(map);

            GeoLeaf.UI._proximityMarker = global.L.marker(e.latlng, {
                draggable: true
            }).addTo(map);

            // Gérer le déplacement du marqueur
            GeoLeaf.UI._proximityMarker.on('dragend', function() {
                const newLatLng = GeoLeaf.UI._proximityMarker.getLatLng();

                if (GeoLeaf.UI._proximityCircle) {
                    GeoLeaf.UI._proximityCircle.setLatLng(newLatLng);
                }

                wrapper.setAttribute("data-proximity-lat", newLatLng.lat);
                wrapper.setAttribute("data-proximity-lng", newLatLng.lng);

                Log.info("[GeoLeaf.UI.FilterPanel] Point de proximité déplacé:", {
                    lat: newLatLng.lat,
                    lng: newLatLng.lng,
                    radius: radius
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
                radius: radius
            });

            // Nettoyer le handler après le premier clic
            map.off('click', GeoLeaf.UI._proximityClickHandler);
            GeoLeaf.UI._proximityClickHandler = null;
        };

        // Attacher le handler à la carte
        map.on('click', GeoLeaf.UI._proximityClickHandler);
    };

    /**
     * Désactive le mode de proximité
     * @param {HTMLElement} btn - Bouton de proximité
     * @param {HTMLElement} container - Container de proximité
     * @param {L.Map} map - Instance de carte
     */
    GeoLeaf._UIFilterPanelProximity.deactivateProximityMode = function(btn, container, map) {
        const Log = getLog();

        btn.textContent = "Activer";
        btn.classList.remove("is-active");

        const rangeWrapper = container.querySelector(".gl-filter-panel__proximity-range");
        const instruction = container.querySelector(".gl-filter-panel__proximity-instruction");

        if (rangeWrapper) rangeWrapper.style.display = "none";
        if (instruction) instruction.style.display = "none";

        map.getContainer().style.cursor = "";

        // Retirer le handler de clic
        if (GeoLeaf.UI._proximityClickHandler) {
            map.off('click', GeoLeaf.UI._proximityClickHandler);
            GeoLeaf.UI._proximityClickHandler = null;
        }

        // Retirer le cercle et le marqueur
        if (GeoLeaf.UI._proximityCircle) {
            map.removeLayer(GeoLeaf.UI._proximityCircle);
            GeoLeaf.UI._proximityCircle = null;
        }
        if (GeoLeaf.UI._proximityMarker) {
            map.removeLayer(GeoLeaf.UI._proximityMarker);
            GeoLeaf.UI._proximityMarker = null;
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

})(window);
