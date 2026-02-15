/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

(function (global) {
    "use strict";

    /**
     * Namespace global GeoLeaf
     */
    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    /**
     * Logger unifié (défini par geoleaf.log.js / logger-shim)
     */
    const Log = GeoLeaf.Log || console;

    /**
     * Module GeoLeaf.Route
     * - Charge et affiche des itinéraires (GPX, GeoJSON, profils GeoLeaf)
     * - Gère une couche dédiée (polyline + points éventuels)
     * - Offre une API de visibilité pour la Légende (getLayer)
     * - Prend en compte les styles et les points départ/arrivée définis
     *   dans le profil actif (profile.json).
     */
    const RouteModule = {
        _map: null,
        _layerGroup: null,
        _routeLayer: null,

        _initialized: false,
        _visible: true,

        /**
         * Options par défaut
         */
        _options: {
            lineStyle: {
                color: "#1E88E5",
                weight: 4,
                opacity: 0.9,
                interactive: false
            },
            waypointStyle: {
                radius: 5,
                color: "#0D47A1",
                fillColor: "#42A5F5",
                fillOpacity: 0.9,
                weight: 2
            },
            // Affichage des points de départ / arrivée
            showStart: true,
            showEnd: true,
            startWaypointStyle: null, // si null => waypointStyle
            endWaypointStyle: null,   // si null => waypointStyle

            fitBoundsOnLoad: true,
            maxZoomOnFit: 14
        },

        /**
         * Valide les options passées à init()
         * @param {Object} options
         * @private
         */
        _validateOptions(options) {
            if (options.map && typeof options.map.addLayer !== "function") {
                Log.warn("[GeoLeaf.Route] options.map ne semble pas être une carte Leaflet valide.");
            }

            if (options.lineStyle && typeof options.lineStyle !== "object") {
                Log.warn("[GeoLeaf.Route] options.lineStyle doit être un objet.");
                delete options.lineStyle;
            }

            if (options.waypointStyle && typeof options.waypointStyle !== "object") {
                Log.warn("[GeoLeaf.Route] options.waypointStyle doit être un objet.");
                delete options.waypointStyle;
            }

            if (
                options.maxZoomOnFit !== undefined &&
                (typeof options.maxZoomOnFit !== "number" ||
                    options.maxZoomOnFit < 1 ||
                    options.maxZoomOnFit > 20)
            ) {
                Log.warn("[GeoLeaf.Route] options.maxZoomOnFit doit être entre 1 et 20.");
                options.maxZoomOnFit = 14;
            }

            return options;
        },

        /**
         * Retourne le layerGroup contenant les itinéraires
         * (utilisé par la Légende pour afficher/masquer la couche)
         * @returns {L.LayerGroup|null}
         */
        getLayer() {
            return this._layerGroup || null;
        },

        /**
         * Initialisation du module Route
         * @param {Object} options
         * @param {L.Map} [options.map] - Carte Leaflet
         * @returns {L.LayerGroup|null}
         */
        init(options = {}) {
            options = this._validateOptions(options);

            if (typeof global.L === "undefined") {
                Log.error("[GeoLeaf.Route] Leaflet introuvable.");
                return null;
            }

            // Utilise un helper commun si disponible
            let map = options.map || null;
            if (!map && GeoLeaf.Core && typeof GeoLeaf.Core.getMap === "function") {
                map = GeoLeaf.Core.getMap();
            }
            if (GeoLeaf.Utils && typeof GeoLeaf.Utils.ensureMap === "function") {
                map = GeoLeaf.Utils.ensureMap(map);
            }

            if (!map) {
                Log.error("[GeoLeaf.Route] Aucune carte disponible pour init().");
                return null;
            }

            this._map = map;

            // Fusion des options
            if (GeoLeaf.Utils && typeof GeoLeaf.Utils.mergeOptions === "function") {
                this._options = GeoLeaf.Utils.mergeOptions(this._options, options);
            } else {
                this._options = Object.assign({}, this._options, options);
            }

            // Applique le paramètre interactiveShapes de la config
            const interactiveShapes = GeoLeaf.Config.get('ui.interactiveShapes', false);
            if (this._options.lineStyle) {
                this._options.lineStyle.interactive = interactiveShapes;
            }

            this._layerGroup = global.L.layerGroup().addTo(this._map);
            this._routeLayer = global.L.polyline([], this._options.lineStyle).addTo(
                this._layerGroup
            );

            this._initialized = true;
            this._visible = true;

            return this._layerGroup;
        },

        /**
         * Indique si le module est initialisé.
         * @returns {boolean}
         */
        isInitialized() {
            return this._initialized === true && !!this._map && !!this._layerGroup;
        },

        /**
         * Indique si la couche d'itinéraires est actuellement visible.
         * @returns {boolean}
         */
        isVisible() {
            return this._visible === true;
        },

        /**
         * Affiche la couche d'itinéraires.
         */
        show() {
            if (!this._map || !this._layerGroup) return;
            if (!this._map.hasLayer(this._layerGroup)) {
                this._layerGroup.addTo(this._map);
            }
            this._visible = true;
        },

        /**
         * Masque la couche d'itinéraires.
         */
        hide() {
            if (!this._map || !this._layerGroup) return;
            if (this._map.hasLayer(this._layerGroup)) {
                this._map.removeLayer(this._layerGroup);
            }
            this._visible = false;
        },

        /**
         * Bascule la visibilité (utile éventuellement en dehors de la Légende).
         */
        toggleVisibility() {
            if (!this.isInitialized()) {
                Log.warn("[GeoLeaf.Route] toggleVisibility() appelé sans init().");
                return;
            }
            if (this.isVisible()) {
                this.hide();
            } else {
                this.show();
            }
        },

        /**
         * Vider tous les itinéraires de la couche
         */
        clear() {
            if (this._layerGroup) {
                this._layerGroup.clearLayers();
            }
            if (this._map && this._layerGroup) {
                this._routeLayer = global.L.polyline([], this._options.lineStyle).addTo(
                    this._layerGroup
                );
            } else {
                this._routeLayer = null;
            }
        },

        /**
         * Charger un fichier GPX (via fetch)
         * @param {string} url
         * @returns {Promise<void>}
         */
        loadGPX(url) {
            if (!url) {
                Log.warn("[GeoLeaf.Route] URL GPX manquante.");
                return Promise.resolve();
            }

            // Sprint 3.3: Use unified FetchHelper with timeout for GPX loading
            const FetchHelper = GeoLeaf.Utils?.FetchHelper;

            if (FetchHelper) {
                return FetchHelper.fetch(url, {
                    timeout: 15000, // GPX files can be larger, allow more time
                    retries: 2,
                    parseResponse: false // We need raw text
                })
                .then((response) => response.text())
                .then((xmlText) =>
                    new DOMParser().parseFromString(xmlText, "application/xml")
                )
                .then((gpx) => {
                    const coords = Array.from(gpx.getElementsByTagName("trkpt")).map(
                        (pt) => [
                            parseFloat(pt.getAttribute("lat") || "0"),
                            parseFloat(pt.getAttribute("lon") || "0")
                        ]
                    );
                    this._applyRoute(coords);
                })
                .catch((err) => Log.error("[GeoLeaf.Route] Erreur GPX :", err));
            }

            // Fallback to raw fetch
            return fetch(url)
                .then((res) => res.text())
                .then((xmlText) =>
                    new DOMParser().parseFromString(xmlText, "application/xml")
                )
                .then((gpx) => {
                    const coords = Array.from(gpx.getElementsByTagName("trkpt")).map(
                        (pt) => [
                            parseFloat(pt.getAttribute("lat") || "0"),
                            parseFloat(pt.getAttribute("lon") || "0")
                        ]
                    );
                    this._applyRoute(coords);
                })
                .catch((err) => Log.error("[GeoLeaf.Route] Erreur GPX :", err));
        },

        /**
         * Charger un itinéraire GeoJSON (LineString)
         * @param {Object} geojson
         */
        loadGeoJSON(geojson) {
            if (!GeoLeaf._RouteLoaders || typeof GeoLeaf._RouteLoaders.loadGeoJSON !== "function") {
                Log.error("[GeoLeaf.Route.loadGeoJSON] GeoLeaf._RouteLoaders.loadGeoJSON() non disponible.");
                return;
            }
            GeoLeaf._RouteLoaders.loadGeoJSON(geojson, this._applyRoute.bind(this));
        },

        /**
         * Charge un tableau d’itinéraires déjà normalisés depuis cfg.routes
         * (profil GeoLeaf) et les dessine sur la carte.
         *
         * Format attendu pour chaque item :
         * {
         *   id: "route-id",
         *   label: "Nom",
         *   type: "walking" | "trekking" | ... (optionnel)
         *   geometry: [ [lat, lng], ... ]  // OU GeoJSON LineString
         *   properties: {
         *     type?: "walking" | "trekking" | ...,
         *     color?: "#hex",
         *     weight?: number,
         *     opacity?: number,
         *     dashArray?: string,
         *     showStart?: boolean,
         *     showEnd?: boolean,
         *     startStyle?: {...},
         *     endStyle?: {...},
         *     ...
         *   }
         * }
         *
         * Les styles et endpoints par défaut peuvent être définis
         * dans le profil actif (profile.json) :
         *
         * "defaultSettings": {
         *   "routeConfig": {
         *     "default": { "color": "#ff6600", "weight": 4, "opacity": 0.9 },
         *     "endpoints": {
         *       "showStart": true,
         *       "showEnd": true,
         *       "start": { "radius": 6, "color": "#ffffff", "fillColor": "#2b7cff" },
         *       "end":   { "radius": 6, "color": "#ffffff", "fillColor": "#ff7b32" }
         *     }
         *   }
         * }
         *
         * La couleur des routes est déterminée par priorité :
         * 1. colorRoute de la sous-catégorie (taxonomy.categories[cat].subcategories[subcat].colorRoute)
         * 2. colorRoute de la catégorie (taxonomy.categories[cat].colorRoute)
         * 3. defaultSettings.routeConfig.default.color
         *
         * @param {Array} routes
         */
        loadFromConfig(routes) {
            if (!this.isInitialized()) {
                Log.warn(
                    "[GeoLeaf.Route] loadFromConfig() appelé alors que le module n'est pas initialisé."
                );
                return;
            }

            if (!Array.isArray(routes) || routes.length === 0) {
                this.clear();
                Log.info("[GeoLeaf.Route] Aucun itinéraire dans cfg.routes ; couche vidée.");
                return;
            }

            this.clear();

            const allCoords = [];
            const defaultStyle = this._options.lineStyle || {};

            // Récupérer config + endpoints définis dans le profil actif
            let activeProfile = null;
            let routeConfigDefault = null;
            let profileEndpoints = null;

            try {
                if (
                    GeoLeaf.Config &&
                    typeof GeoLeaf.Config.getActiveProfile === "function"
                ) {
                    activeProfile = GeoLeaf.Config.getActiveProfile();
                    if (activeProfile && activeProfile.defaultSettings && activeProfile.defaultSettings.routeConfig) {
                        if (
                            activeProfile.defaultSettings.routeConfig.default &&
                            typeof activeProfile.defaultSettings.routeConfig.default === "object" &&
                            !Array.isArray(activeProfile.defaultSettings.routeConfig.default)
                        ) {
                            routeConfigDefault = activeProfile.defaultSettings.routeConfig.default;
                        }
                        if (
                            activeProfile.defaultSettings.routeConfig.endpoints &&
                            typeof activeProfile.defaultSettings.routeConfig.endpoints === "object" &&
                            !Array.isArray(activeProfile.defaultSettings.routeConfig.endpoints)
                        ) {
                            profileEndpoints = activeProfile.defaultSettings.routeConfig.endpoints;
                        }
                    }
                }
            } catch (e) {
                Log.warn(
                    "[GeoLeaf.Route] Impossible de lire la config/endpoints depuis le profil actif.",
                    e
                );
            }

            routes.forEach((route) => {
                if (!route || typeof route !== "object") {
                    return;
                }

                const coords = this._extractCoordsFromRouteItem(route);
                if (!coords || coords.length === 0) {
                    return;
                }

                // Style de la polyline
                const routeStyle = this._resolveRouteStyle(
                    route,
                    activeProfile,
                    routeConfigDefault,
                    defaultStyle
                );

                // Applique le paramètre interactiveShapes
                const interactiveShapes = GeoLeaf.Config.get('ui.interactiveShapes', false);
                routeStyle.interactive = interactiveShapes;

                const polyline = global.L.polyline(coords, routeStyle).addTo(
                    this._layerGroup
                );

                // Attach route data to polyline for popup/tooltip access
                polyline._geoleafRouteData = route;

                // Add tooltip with route label
                this._addRouteTooltip(polyline, route);

                // Add popup with route details
                this._addRoutePopup(polyline, route);

                // Première polyline = "routeLayer" principal
                if (!this._routeLayer) {
                    this._routeLayer = polyline;
                }

                allCoords.push(...coords);

                // Points de départ / arrivée
                const endpointCfg = this._resolveEndpointConfig(
                    route,
                    profileEndpoints,
                    this._options
                );

                if (coords.length > 0) {
                    const startLatLng = coords[0];
                    const endLatLng = coords[coords.length - 1];

                    if (endpointCfg.showStart) {
                        const startStyle = Object.assign({}, endpointCfg.startStyle, { interactive: interactiveShapes });
                        global.L.circleMarker(startLatLng, startStyle).addTo(
                            this._layerGroup
                        );
                    }

                    if (
                        endpointCfg.showEnd &&
                        endLatLng &&
                        (endLatLng[0] !== startLatLng[0] ||
                            endLatLng[1] !== startLatLng[1])
                    ) {
                        const endStyle = Object.assign({}, endpointCfg.endStyle, { interactive: interactiveShapes });
                        global.L.circleMarker(endLatLng, endStyle).addTo(
                            this._layerGroup
                        );
                    }
                }
            });

            if (allCoords.length === 0) {
                Log.warn(
                    "[GeoLeaf.Route] loadFromConfig() n'a trouvé aucun itinéraire valide dans cfg.routes."
                );
                return;
            }

            // Ajuster l'emprise globale si option activée
            if (this._options.fitBoundsOnLoad) {
                try {
                    const bounds = this._layerGroup.getBounds();
                    const fitOpt = {};
                    if (this._options.maxZoomOnFit) {
                        fitOpt.maxZoom = this._options.maxZoomOnFit;
                    }
                    this._map.fitBounds(bounds, fitOpt);
                } catch (e) {
                    Log.warn(
                        "[GeoLeaf.Route] Erreur lors du fitBounds sur les itinéraires :",
                        e
                    );
                }
            }

            // Événements "route loaded" (Leaflet + DOM)
            this._fireRouteLoadedEvents(allCoords);
        },

        /**
         * Filtrer la visibilité des routes déjà chargées sans les recharger.
         * Préserve les styles originaux des routes.
         * @param {Array<Object>} filteredRoutes - Liste des routes à afficher (après filtrage)
         * @public
         */
        filterVisibility: function (filteredRoutes) {
            if (!this._initialized) {
                Log.warn("[GeoLeaf.Route] Module non initialisé - filterVisibility ignoré.");
                return;
            }

            if (!Array.isArray(filteredRoutes)) {
                Log.warn("[GeoLeaf.Route] filterVisibility : filteredRoutes doit être un tableau.");
                return;
            }

            // Créer un Set des IDs des routes à afficher pour une recherche rapide
            const visibleRouteIds = new Set(filteredRoutes.map(r => r.id));

            // Parcourir toutes les couches actuellement affichées
            this._layerGroup.eachLayer(function (layer) {
                // Vérifier si cette couche a un ID de route
                const routeId = layer.options && layer.options.routeId;

                if (routeId !== undefined) {
                    // Afficher ou masquer selon si l'ID est dans la liste filtrée
                    if (visibleRouteIds.has(routeId)) {
                        if (!this._map.hasLayer(layer)) {
                            this._map.addLayer(layer);
                        }
                    } else {
                        if (this._map.hasLayer(layer)) {
                            this._map.removeLayer(layer);
                        }
                    }
                }
            }.bind(this));

            Log.info("[GeoLeaf.Route] Visibilité filtrée : " + filteredRoutes.length + " routes visibles.");
        },

        /**
         * Extraire un tableau de [lat, lng] à partir d'un item de cfg.routes.
         * @param {Object} route
         * @returns {number[][]}
         * @private
         */
        _extractCoordsFromRouteItem(route) {
            if (!GeoLeaf._RouteLoaders || typeof GeoLeaf._RouteLoaders.extractCoordsFromRouteItem !== "function") {
                Log.error("[GeoLeaf.Route._extractCoordsFromRouteItem] GeoLeaf._RouteLoaders.extractCoordsFromRouteItem() non disponible.");
                return [];
            }
            return GeoLeaf._RouteLoaders.extractCoordsFromRouteItem(route);
        },

        /**
         * Détermine la couleur d'un itinéraire selon la priorité :
         *  1. colorRoute de la sous-catégorie (si définie)
         *  2. colorRoute de la catégorie (si définie)
         *  3. couleur par défaut de routeConfig.default.color
         *
         * @param {Object} route - L'itinéraire
         * @param {Object} profile - Le profil actif
         * @param {Object} routeConfigDefault - La config par défaut (defaultSettings.routeConfig.default)
         * @returns {string|null} La couleur à utiliser ou null
         * @private
         */
        _getRouteColor(route, profile, routeConfigDefault) {
            if (!GeoLeaf._RouteStyleResolver || typeof GeoLeaf._RouteStyleResolver.getRouteColor !== "function") {
                Log.error("[GeoLeaf.Route._getRouteColor] GeoLeaf._RouteStyleResolver.getRouteColor() non disponible.");
                return routeConfigDefault?.color || null;
            }
            return GeoLeaf._RouteStyleResolver.getRouteColor(route, profile, routeConfigDefault);
        },

        /**
         * Calcule le style final d'un itinéraire en combinant :
         *  - le style par défaut du module,
         *  - la config par défaut du profil (defaultSettings.routeConfig.default),
         *  - la couleur basée sur la taxonomie (colorRoute),
         *  - les surcharges au niveau de l'itinéraire (properties.*).
         *
         * @private
         */
        _resolveRouteStyle(route, activeProfile, routeConfigDefault, defaultStyle) {
            if (!GeoLeaf._RouteStyleResolver || typeof GeoLeaf._RouteStyleResolver.resolveRouteStyle !== "function") {
                Log.error("[GeoLeaf.Route._resolveRouteStyle] GeoLeaf._RouteStyleResolver.resolveRouteStyle() non disponible.");
                return Object.assign({}, defaultStyle || {});
            }
            return GeoLeaf._RouteStyleResolver.resolveRouteStyle(route, activeProfile, routeConfigDefault, defaultStyle);
        },

        /**
         * Calcule la configuration d'affichage des points départ / arrivée
         * en combinant :
         *  - les options par défaut du module (_options),
         *  - les endpoints définis dans le profil actif (defaultSettings.routeConfig.endpoints),
         *  - les surcharges éventuelles au niveau de l'itinéraire
         *    (properties.showStart, properties.showEnd, startStyle, endStyle).
         *
         * @private
         */
        _resolveEndpointConfig(route, profileEndpoints, moduleOptions) {
            if (!GeoLeaf._RouteStyleResolver || typeof GeoLeaf._RouteStyleResolver.resolveEndpointConfig !== "function") {
                Log.error("[GeoLeaf.Route._resolveEndpointConfig] GeoLeaf._RouteStyleResolver.resolveEndpointConfig() non disponible.");
                return {
                    showStart: true,
                    showEnd: true,
                    startStyle: { radius: 6, color: "#ffffff", fillColor: "#2b7cff", fillOpacity: 1, weight: 2 },
                    endStyle: { radius: 6, color: "#ffffff", fillColor: "#ff7b32", fillOpacity: 1, weight: 2 }
                };
            }
            return GeoLeaf._RouteStyleResolver.resolveEndpointConfig(route, profileEndpoints, moduleOptions);
        },

        /**
         * Ajouter un waypoint manuel
         * @param {number[]} latlng
         */
        addWaypoint(latlng) {
            if (!GeoLeaf._RouteLayerManager || typeof GeoLeaf._RouteLayerManager.addWaypoint !== "function") {
                Log.error("[GeoLeaf.Route.addWaypoint] GeoLeaf._RouteLayerManager.addWaypoint() non disponible.");
                return;
            }
            GeoLeaf._RouteLayerManager.addWaypoint(this._layerGroup, latlng, this._options.waypointStyle);
        },

        /**
         * Ajouter un segment manuel
         * @param {number[][]} coords
         */
        addSegment(coords) {
            if (!this._routeLayer) return;
            const current = this._routeLayer.getLatLngs();
            this._routeLayer.setLatLngs([...current, ...coords]);
        },

        /**
         * Appliquer un itinéraire complet (remplacement)
         * @param {number[][]} coords
         * @private
         */
        _applyRoute(coords) {
            if (!GeoLeaf._RouteLayerManager || typeof GeoLeaf._RouteLayerManager.applyRoute !== "function") {
                Log.error("[GeoLeaf.Route._applyRoute] GeoLeaf._RouteLayerManager.applyRoute() non disponible.");
                return;
            }
            const context = {
                map: this._map,
                layerGroup: this._layerGroup,
                routeLayer: this._routeLayer,
                options: this._options
            };
            GeoLeaf._RouteLayerManager.applyRoute(context, coords, this.clear.bind(this), this._fireRouteLoadedEvents.bind(this));
            this._routeLayer = context.routeLayer;
        },

        /**
         * Add tooltip to route polyline
         * @param {L.Polyline} polyline
         * @param {Object} route
         * @private
         */
        _addRouteTooltip(polyline, route) {
            if (!GeoLeaf._RoutePopupBuilder || typeof GeoLeaf._RoutePopupBuilder.addRouteTooltip !== "function") {
                Log.error("[GeoLeaf.Route._addRouteTooltip] GeoLeaf._RoutePopupBuilder.addRouteTooltip() non disponible.");
                return;
            }
            GeoLeaf._RoutePopupBuilder.addRouteTooltip(polyline, route);
        },

        /**
         * Add popup to route polyline with "Voir plus" button
         * @param {L.Polyline} polyline
         * @param {Object} route
         * @private
         */
        _addRoutePopup(polyline, route) {
            if (!GeoLeaf._RoutePopupBuilder || typeof GeoLeaf._RoutePopupBuilder.addRoutePopup !== "function") {
                Log.error("[GeoLeaf.Route._addRoutePopup] GeoLeaf._RoutePopupBuilder.addRoutePopup() non disponible.");
                return;
            }
            GeoLeaf._RoutePopupBuilder.addRoutePopup(polyline, route, this);
        },

        /**
         * Build popup content for route (same structure as POI popup)
         * @param {Object} route
         * @returns {string} HTML content
         * @private
         */
        _buildRoutePopupContent(route) {
            if (!GeoLeaf._RoutePopupBuilder || typeof GeoLeaf._RoutePopupBuilder.buildRoutePopupContent !== "function") {
                Log.error("[GeoLeaf.Route._buildRoutePopupContent] GeoLeaf._RoutePopupBuilder.buildRoutePopupContent() non disponible.");
                return "<div>Route popup non disponible</div>";
            }
            return GeoLeaf._RoutePopupBuilder.buildRoutePopupContent(route);
        },        /**
         * Open side panel with route details
         * @param {Object} route
         * @private
         */
        _openRouteSidePanel(route) {
            if (!GeoLeaf._RoutePopupBuilder || typeof GeoLeaf._RoutePopupBuilder.openRouteSidePanel !== "function") {
                Log.error("[GeoLeaf.Route._openRouteSidePanel] GeoLeaf._RoutePopupBuilder.openRouteSidePanel() non disponible.");
                return;
            }
            GeoLeaf._RoutePopupBuilder.openRouteSidePanel(route);
        },

        /**
         * Émet les événements "geoleaf:route:loaded" (Leaflet + DOM)
         * @param {number[][]} coords
         * @private
         */
        _fireRouteLoadedEvents(coords) {
            // Événement Leaflet sur la carte
            try {
                if (this._map && typeof this._map.fire === "function") {
                    this._map.fire("geoleaf:route:loaded", {
                        coords,
                        layer: this._routeLayer,
                        source: "geoleaf.route"
                    });
                }
            } catch (e) {
                Log.warn(
                    "[GeoLeaf.Route] Impossible d'émettre l'événement Leaflet geoleaf:route:loaded.",
                    e
                );
            }

            // CustomEvent DOM
            if (typeof document !== "undefined" && typeof document.dispatchEvent === "function") {
                const detail = {
                    coords: Array.isArray(coords) ? coords.slice() : [],
                    map: this._map,
                    layer: this._routeLayer,
                    source: "geoleaf.route"
                };

                try {
                    if (typeof CustomEvent === "function") {
                        const event = new CustomEvent("geoleaf:route:loaded", { detail });
                        document.dispatchEvent(event);
                    } else {
                        const legacyEvent = document.createEvent("CustomEvent");
                        legacyEvent.initCustomEvent(
                            "geoleaf:route:loaded",
                            true,
                            true,
                            detail
                        );
                        document.dispatchEvent(legacyEvent);
                    }
                } catch (err) {
                    Log.warn(
                        "[GeoLeaf.Route] Impossible d'émettre le CustomEvent geoleaf:route:loaded.",
                        err
                    );
                }
            }
        }
    };

    GeoLeaf.Route = RouteModule;
})(window);
