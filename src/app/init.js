/*!
 * GeoLeaf Core – App / Init
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Application Init
 * Fonction principale d'initialisation de l'application :
 * - Initialisation de la carte
 * - Chargement des modules (POI, Routes, GeoJSON, etc.)
 * - Configuration des composants UI
 * - Mécanisme de reveal (loader / spinner)
 *
 * @module app/init
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const _app = GeoLeaf._app = GeoLeaf._app || {};

    // ============================================================
    // Fonction principale : initialiser l'application
    // ============================================================
    _app.initApp = function (cfg) {
        cfg = cfg || {};
        const AppLog = _app.AppLog;
        AppLog.log("Initialisation avec config:", cfg);

        // Vérifier les plugins
        _app.checkPlugins(cfg);

        // ========================================================
        // Initialisation de la carte
        // La carte est créée directement sur l'emprise du profil
        // (map.bounds obligatoire dans le profil).
        // ========================================================
        const mapTarget = (cfg.map && (cfg.map.target || cfg.map.id)) || "geoleaf-map";
        const uiTheme = (cfg.ui && cfg.ui.theme) || "light";

        // Bounds obligatoires — pas de fallback carte monde
        if (!cfg.map || !Array.isArray(cfg.map.bounds) || cfg.map.bounds.length !== 2) {
            AppLog.error(
                "[GeoLeaf] Le profil actif ne définit pas de map.bounds valide. " +
                "L'emprise (map.bounds) est obligatoire dans le fichier profile.json. " +
                "Exemple : \"bounds\": [[43.0, 1.0], [44.0, 2.0]]"
            );
            return;
        }

        // Calculer le centre depuis les bounds pour éviter le flash carte monde
        const profileBounds = cfg.map.bounds;
        const profileMaxZoom = cfg.map.maxZoom || 12;
        const profilePadding = cfg.map.padding || [50, 50];
        const mapCenter = [
            (profileBounds[0][0] + profileBounds[1][0]) / 2,
            (profileBounds[0][1] + profileBounds[1][1]) / 2
        ];

        let map = null;

        try {
            map = GeoLeaf.init({
                map: {
                    target: mapTarget,
                    center: mapCenter,
                    zoom: profileMaxZoom
                },
                ui: {
                    theme: uiTheme
                }
            });
        } catch (e) {
            AppLog.error("GeoLeaf.init() a levé une erreur :", e);
            return;
        }

        if (!map) {
            AppLog.error("GeoLeaf.init() n'a pas renvoyé de carte valide.");
            return;
        }

        // Positionnement précis via fitBounds (ajuste le zoom aux dimensions réelles du conteneur)
        try {
            map.fitBounds(profileBounds, {
                maxZoom: profileMaxZoom,
                padding: profilePadding,
                animate: false
            });
            AppLog.log("Carte positionnée via map.bounds du profil.");
        } catch (e) {
            AppLog.warn("Erreur fitBounds depuis profile.map.bounds :", e);
        }

        // ========================================================
        // Initialiser le Storage avec la config du profil (si plugin chargé)
        // ========================================================
        if (GeoLeaf.Storage && typeof GeoLeaf.Storage.init === "function") {
            try {
                const storageConfig = cfg.storage || {};
                AppLog.log("Initialisation du Storage avec config:", storageConfig);

                GeoLeaf.Storage.init({
                    indexedDB: { name: 'geoleaf-db', version: 2 },
                    cache: storageConfig.cache || {
                        enableProfileCache: true,
                        enableTileCache: true
                    },
                    offline: {},
                    enableOfflineDetector: !!(storageConfig.enableOfflineDetector),
                    enableServiceWorker: !!(storageConfig.enableServiceWorker)
                }).then(() => {
                    AppLog.log("Storage initialisé avec succès");
                }).catch(err => {
                    AppLog.warn("Erreur initialisation Storage:", err);
                });
            } catch (e) {
                AppLog.warn("Erreur lors de l'initialisation du Storage:", e);
            }
        } else {
            AppLog.log("Plugin Storage non chargé — fonctionnement en mode cache navigateur standard.");
        }

        // ========================================================
        // Initialiser le système de notifications UI
        // ========================================================
        if (GeoLeaf._UINotifications && typeof GeoLeaf._UINotifications.init === "function") {
            try {
                let notificationContainer = document.getElementById('gl-notifications');
                if (!notificationContainer) {
                    notificationContainer = document.createElement('div');
                    notificationContainer.id = 'gl-notifications';
                    notificationContainer.className = 'gl-notifications gl-notifications--bottom-center';
                    document.body.appendChild(notificationContainer);
                }

                GeoLeaf._UINotifications.init({
                    container: '#gl-notifications',
                    position: 'bottom-center',
                    maxVisible: 3,
                    animations: true
                });

                AppLog.log("Système de notifications initialisé");
            } catch (e) {
                AppLog.warn("Erreur lors de l'initialisation des notifications:", e);
            }
        }

        // ========================================================
        // Toast de chargement persistant pendant le chargement des couches
        // Affiché dès que le ThemeApplier commence à charger un thème,
        // fermé quand geoleaf:theme:applied est émis.
        // ========================================================
        let _loadingToast = null;

        document.addEventListener('geoleaf:theme:applying', function(event) {
            // Afficher un toast persistant si le système de notifications est prêt
            if (GeoLeaf._UINotifications && GeoLeaf._UINotifications.container) {
                _loadingToast = GeoLeaf._UINotifications.info(
                    'Chargement des données en cours, patientez…',
                    { persistent: true, dismissible: false }
                );
            }
        });

        // ========================================================
        // Écouteurs d'événements (notifications profile & theme)
        // ========================================================
        let pendingProfileToastDetail = null;

        function notificationsReady() {
            try {
                if (GeoLeaf.UI && GeoLeaf.UI.Notifications && typeof GeoLeaf.UI.Notifications.getStatus === "function") {
                    return !!GeoLeaf.UI.Notifications.getStatus().initialized;
                }
                if (GeoLeaf._UINotifications && GeoLeaf._UINotifications.container) {
                    return true;
                }
            } catch (e) {}
            return false;
        }

        function tryShowProfileToast(detail) {
            if (!detail || !detail.data) return false;
            const profile = detail.data.profile || {};
            const profileName = profile.label || profile.name || profile.title || detail.profileId || 'Profil';
            const message = profileName + " chargé";
            if (!notificationsReady()) {
                pendingProfileToastDetail = detail;
                return false;
            }
            const shown = _app.showNotification(message);
            if (shown) pendingProfileToastDetail = null;
            else pendingProfileToastDetail = detail;
            return shown;
        }

        document.addEventListener("geoleaf:profile:loaded", function(event) {
            if (event && event.detail) {
                pendingProfileToastDetail = event.detail;
                tryShowProfileToast(event.detail);
            }
        });

        document.addEventListener("geoleaf:theme:applied", function(event) {
            // Fermer le toast de chargement persistant
            if (_loadingToast && GeoLeaf._UINotifications && typeof GeoLeaf._UINotifications.dismiss === 'function') {
                GeoLeaf._UINotifications.dismiss(_loadingToast);
                _loadingToast = null;
            }
            if (event && event.detail) {
                const detail = event.detail;
                _app.showNotification(`Thème "${detail.themeName}" chargé (${detail.layerCount} couches visibles)`, 3500);
            }
        });

        // Écouter la fin de chargement pour les notifications en attente
        document.addEventListener("geoleaf:map:ready", function() {
            if (pendingProfileToastDetail) {
                tryShowProfileToast(pendingProfileToastDetail);
            }
        });

        // ========================================================
        // Thème UI via GeoLeaf.setTheme() + initialisation UI
        // ========================================================
        try {
            if (typeof GeoLeaf.setTheme === "function") {
                GeoLeaf.setTheme(uiTheme);
            }
        } catch (e) {
            AppLog.warn("Erreur lors de l'appel à GeoLeaf.setTheme :", e);
        }

        if (GeoLeaf.UI && typeof GeoLeaf.UI.init === "function") {
            try {
                const mapContainer = document.querySelector('.gl-main') || document.getElementById(mapTarget);
                GeoLeaf.UI.init({
                    buttonSelector: '[data-gl-role="theme-toggle"]',
                    map: map,
                    mapContainer: mapContainer,
                    config: cfg
                });
            } catch (e) {
                AppLog.warn("GeoLeaf.UI.init() a levé une erreur :", e);
            }
        }

        // Construction du panneau de filtres
        if (GeoLeaf.UI && typeof GeoLeaf.UI.buildFilterPanelFromActiveProfile === "function") {
            try {
                let filterContainer = document.getElementById("gl-filter-panel");
                if (!filterContainer) {
                    filterContainer = document.createElement("div");
                    filterContainer.id = "gl-filter-panel";
                    filterContainer.setAttribute("data-gl-role", "filter-panel");
                    const glMain = document.querySelector('.gl-main');
                    if (glMain) glMain.appendChild(filterContainer);
                    else document.body.appendChild(filterContainer);
                }

                GeoLeaf.UI.buildFilterPanelFromActiveProfile({ container: filterContainer });

                if (typeof GeoLeaf.UI.initFilterToggle === "function") {
                    GeoLeaf.UI.initFilterToggle();
                }
                if (typeof GeoLeaf.UI.initProximityFilter === "function") {
                    GeoLeaf.UI.initProximityFilter(map);
                }
            } catch (e) {
                AppLog.warn("Erreur lors de la construction du panneau de filtres :", e);
            }
        }

        // Initialisation du module Table
        if (GeoLeaf.Table && typeof GeoLeaf.Table.init === "function" && cfg.tableConfig && cfg.tableConfig.enabled) {
            try {
                GeoLeaf.Table.init({ map: map, config: cfg.tableConfig });
                AppLog.log("Module Table initialisé.");
            } catch (e) {
                AppLog.warn("Erreur lors de l'initialisation du module Table :", e);
            }
        }

        // Initialisation du bouton de cache offline (si plugin Storage chargé)
        if (GeoLeaf.UI && GeoLeaf.UI.CacheButton && typeof GeoLeaf.UI.CacheButton.init === "function") {
            try {
                GeoLeaf.UI.CacheButton.init(map, cfg);
                AppLog.log("Bouton de cache initialisé.");
            } catch (e) {
                AppLog.warn("Erreur lors de l'initialisation du bouton de cache :", e);
            }
        }

        // ========================================================
        // Basemaps via GeoLeaf.BaseLayers
        // ========================================================
        (function initBasemaps() {
            const baseLayersModule = GeoLeaf.BaseLayers || GeoLeaf.Baselayers;
            if (!baseLayersModule || typeof baseLayersModule.init !== "function") {
                AppLog.warn("Module BaseLayers introuvable.");
                return;
            }

            let activeKey = "street";
            const basemapsFromConfig = {};
            if (cfg.basemaps && typeof cfg.basemaps === 'object') {
                Object.keys(cfg.basemaps).forEach(function(key) {
                    const def = cfg.basemaps[key];
                    if (def.defaultBasemap === true) activeKey = def.id || key;
                    basemapsFromConfig[key] = {
                        id: def.id || key,
                        label: def.label || key,
                        url: def.url,
                        options: {
                            minZoom: def.minZoom || 0,
                            maxZoom: def.maxZoom || 19,
                            attribution: def.attribution || ''
                        }
                    };
                });
            }

            try {
                baseLayersModule.init({
                    map: map,
                    baselayers: basemapsFromConfig,
                    activeKey: activeKey,
                    ui: cfg.ui,
                    basemaps: cfg.basemaps
                });
            } catch (e) {
                AppLog.warn("BaseLayers.init a levé une exception :", e);
            }
        })();

        // ========================================================
        // POI via GeoLeaf.POI
        // ========================================================
        (function initPOI() {
            const poiApi = GeoLeaf.POI;
            if (!poiApi || typeof poiApi.add !== "function") {
                AppLog.warn("GeoLeaf.POI.add() indisponible, aucun POI ne sera affiché.");
                return;
            }

            try {
                if (typeof poiApi.init === "function") {
                    poiApi.init({ map: map, config: cfg.poiConfig || {} });

                    // Chargement des légendes POI
                    if (GeoLeaf.Legend && typeof GeoLeaf.Legend.loadLayerLegend === "function" && cfg.layers && Array.isArray(cfg.layers)) {
                        cfg.layers.forEach(function(layerRef) {
                            if (layerRef.id && layerRef.id.includes('poi') && layerRef.configFile) {
                                fetch(layerRef.configFile)
                                    .then(response => response.json())
                                    .then(layerConfig => {
                                        let styleId = 'default';
                                        if (layerConfig.styles && layerConfig.styles.available && layerConfig.styles.available.length > 0) {
                                            styleId = layerConfig.styles.available[0].id || 'default';
                                        }
                                        GeoLeaf.Legend.loadLayerLegend(layerRef.id, styleId, layerConfig);
                                        if (typeof GeoLeaf.Legend.setLayerVisibility === "function") {
                                            GeoLeaf.Legend.setLayerVisibility(layerRef.id, true);
                                        }
                                    })
                                    .catch(err => AppLog.warn(`Erreur chargement config couche ${layerRef.id}:`, err));
                            }
                        });
                    }
                }
            } catch (e) {
                AppLog.warn("GeoLeaf.POI.init() a levé une erreur :", e);
            }

            const showFilterPanel = cfg.ui && cfg.ui.showFilterPanel === true;
            if (showFilterPanel) {
                AppLog.info("Panneau de filtres activé : les POI seront chargés via le système de filtres.");
                if (GeoLeaf.UI && typeof GeoLeaf.UI.applyFiltersInitial === "function") {
                    GeoLeaf.UI.applyFiltersInitial();
                }
                return;
            }

            if (!Array.isArray(cfg.poi) || cfg.poi.length === 0) {
                return;
            }

            const bounds = [];
            cfg.poi.forEach(function (poiItem) {
                let latlng = null;
                if (poiItem.latlng && Array.isArray(poiItem.latlng) && poiItem.latlng.length === 2) {
                    latlng = poiItem.latlng;
                } else if (poiItem.location && typeof poiItem.location.lat === "number" && typeof poiItem.location.lng === "number") {
                    latlng = [poiItem.location.lat, poiItem.location.lng];
                }
                if (latlng) bounds.push(latlng);
            });

            if (bounds.length > 0) {
                // fitBounds POI uniquement si pas de bounds dans le profil ET pas de couches GeoJSON
                const hasBoundsFromProfile = cfg.map && Array.isArray(cfg.map.bounds) && cfg.map.bounds.length === 2;
                const hasGeoJSONLayers = cfg.layers && Array.isArray(cfg.layers) && cfg.layers.length > 0;
                if (!hasBoundsFromProfile && !hasGeoJSONLayers) {
                    try {
                        map.fitBounds(L.latLngBounds(bounds), { padding: [80, 80], maxZoom: 12, animate: false });
                    } catch (e) {
                        AppLog.warn("Erreur lors de fitBounds :", e);
                    }
                }
                if (GeoLeaf.UI && typeof GeoLeaf.UI.refreshFilterTags === "function") {
                    GeoLeaf.UI.refreshFilterTags();
                }
            }
        })();

        // ========================================================
        // Itinéraires via GeoLeaf.Route
        // ========================================================
        (function initRoute() {
            const routeApi = GeoLeaf.Route;
            if (!routeApi || typeof routeApi.init !== "function" || typeof routeApi.loadFromConfig !== "function") {
                return;
            }
            try {
                routeApi.init({ map: map, fitBoundsOnLoad: false, maxZoomOnFit: 12 });
            } catch (e) {
                AppLog.warn("GeoLeaf.Route.init() a levé une erreur :", e);
                return;
            }
            if (Array.isArray(cfg.routes) && cfg.routes.length > 0) {
                try {
                    routeApi.loadFromConfig(cfg.routes);
                    AppLog.log("Itinéraires chargés.");
                } catch (e) {
                    AppLog.warn("GeoLeaf.Route.loadFromConfig() a levé une erreur :", e);
                }
            }
        })();

        // ========================================================
        // Couches GeoJSON via GeoLeaf.GeoJSON
        // ========================================================
        (function initGeoJSON() {
            const geoJsonApi = GeoLeaf.GeoJSON;
            if (!geoJsonApi || typeof geoJsonApi.init !== "function") {
                AppLog.log("GeoLeaf.GeoJSON.init() indisponible — pas de couches GeoJSON.");
                return;
            }

            try {
                geoJsonApi.init({ map: map, fitBoundsOnLoad: false, maxZoomOnFit: 12 });
            } catch (e) {
                AppLog.warn("GeoLeaf.GeoJSON.init() a levé une erreur :", e);
                return;
            }

            if (map && typeof map.on === "function") {
                map.on("geoleaf:geojson:layers-loaded", function(event) {
                    if (event && event.detail && typeof event.detail.count === "number") {
                        const count = event.detail.count;
                        const message = count === 1 ? "1 couche GeoJSON chargée" : count + " couches GeoJSON chargées";
                        _app.showNotification(message, 3000);
                    }
                });
            }

            // Initialisation du système de thèmes
            const loadAllConfigsPromise = (function() {
                if (GeoLeaf._GeoJSONLoader && typeof GeoLeaf._GeoJSONLoader.loadAllLayersConfigsForLayerManager === "function") {
                    const activeProfile = GeoLeaf.Config && typeof GeoLeaf.Config.getActiveProfile === "function"
                        ? GeoLeaf.Config.getActiveProfile() : null;
                    if (activeProfile) {
                        return GeoLeaf._GeoJSONLoader.loadAllLayersConfigsForLayerManager(activeProfile)
                            .catch(err => { AppLog.warn("Erreur chargement configs couches:", err); return []; });
                    }
                }
                return Promise.resolve();
            })();

            loadAllConfigsPromise.then(function() {
                if (!GeoLeaf.ThemeSelector || typeof GeoLeaf.ThemeSelector.init !== "function") {
                    AppLog.warn("ThemeSelector non disponible");
                    return;
                }

                let currentProfileId = null;
                if (GeoLeaf.Config && typeof GeoLeaf.Config.getActiveProfileId === "function") {
                    currentProfileId = GeoLeaf.Config.getActiveProfileId();
                }

                const primaryContainer = document.getElementById("gl-theme-primary-container");
                const secondaryContainer = document.getElementById("gl-theme-secondary-container");

                if (!currentProfileId || !primaryContainer || !secondaryContainer) {
                    AppLog.warn("ThemeSelector : conteneurs ou profil manquants");
                    return;
                }

                GeoLeaf.ThemeSelector.init({
                    profileId: currentProfileId,
                    primaryContainer: primaryContainer,
                    secondaryContainer: secondaryContainer
                }).then(function() {
                    AppLog.log("ThemeSelector initialisé et thème appliqué");

                    if (GeoLeaf._GeoJSONLayerManager && typeof GeoLeaf._GeoJSONLayerManager.populateLayerManagerWithAllConfigs === "function") {
                        const activeThemeConfig = GeoLeaf.ThemeSelector.getActiveTheme ? GeoLeaf.ThemeSelector.getActiveTheme() : null;
                        GeoLeaf._GeoJSONLayerManager.populateLayerManagerWithAllConfigs(activeThemeConfig);
                    }

                    document.addEventListener('geoleaf:theme:applied', function() {
                        if (GeoLeaf._GeoJSONLayerManager && typeof GeoLeaf._GeoJSONLayerManager.populateLayerManagerWithAllConfigs === "function") {
                            const activeThemeConfig = GeoLeaf.ThemeSelector.getActiveTheme ? GeoLeaf.ThemeSelector.getActiveTheme() : null;
                            GeoLeaf._GeoJSONLayerManager.populateLayerManagerWithAllConfigs(activeThemeConfig);
                        }
                    });
                }).catch(function(e) {
                    AppLog.warn("Erreur initialisation ThemeSelector:", e);
                });
            });
        })();

        // ========================================================
        // Branding
        // ========================================================
        if (GeoLeaf.UI && GeoLeaf.UI.Branding && typeof GeoLeaf.UI.Branding.init === "function") {
            try {
                GeoLeaf.UI.Branding.init(map);
            } catch (e) {
                AppLog.warn("GeoLeaf.UI.Branding.init() a levé une erreur :", e);
            }
        }

        // ========================================================
        // Légende et gestionnaire de couches
        // ========================================================
        if (cfg.ui && cfg.ui.showLegend !== false && GeoLeaf.Legend && typeof GeoLeaf.Legend.init === "function") {
            try {
                GeoLeaf.Legend.init(map, {
                    position: "bottomleft",
                    collapsible: true,
                    collapsed: false,
                    title: "Légende"
                });
            } catch (e) {
                AppLog.warn("Erreur lors de l'initialisation du module Legend:", e);
            }
        }

        if (cfg.ui && cfg.ui.showLayerManager !== false && GeoLeaf.LayerManager && typeof GeoLeaf.LayerManager.init === "function") {
            try {
                GeoLeaf.LayerManager.init({ map: map, position: "bottomright" });
            } catch (e) {
                AppLog.warn("GeoLeaf.LayerManager.init() a levé une erreur :", e);
            }
        }

        // ========================================================
        // Contrôle d'échelle
        // ========================================================
        if (GeoLeaf.initScaleControl && typeof GeoLeaf.initScaleControl === "function") {
            try { GeoLeaf.initScaleControl(map); } catch (e) {
                AppLog.warn("GeoLeaf.initScaleControl() a levé une erreur :", e);
            }
        }

        // ========================================================
        // Système de labels
        // ========================================================
        if (GeoLeaf.Labels && typeof GeoLeaf.Labels.init === "function") {
            try { GeoLeaf.Labels.init({ map: map }); } catch (e) {
                AppLog.warn("GeoLeaf.Labels.init() a levé une erreur :", e);
            }
        }

        // ========================================================
        // Affichage des coordonnées
        // ========================================================
        if (cfg.ui && cfg.ui.showCoordinates !== false && GeoLeaf.UI && GeoLeaf.UI.CoordinatesDisplay && typeof GeoLeaf.UI.CoordinatesDisplay.init === "function") {
            try {
                GeoLeaf.UI.CoordinatesDisplay.init(map, { position: "bottomleft", decimals: 6 });
            } catch (e) {
                AppLog.warn("GeoLeaf.UI.CoordinatesDisplay.init() a levé une erreur :", e);
            }
        }

        // ========================================================
        // Révéler l'application quand les couches sont prêtes
        // Le spinner #gl-loader reste opaque pendant que la carte
        // et les couches GeoJSON se chargent derrière.
        // On attend l'événement geoleaf:theme:applied (= toutes
        // les couches visibles sont chargées) avant de révéler.
        // ========================================================
        let _appRevealed = false;
        function revealApp(reason) {
            if (_appRevealed) return;
            _appRevealed = true;
            const loader = document.getElementById('gl-loader');
            if (loader) {
                loader.classList.add('gl-loader--fade');
                // Supprimer du DOM après la transition CSS (400ms)
                loader.addEventListener('transitionend', function() {
                    loader.style.display = 'none';
                }, { once: true });
                // Fallback si transitionend ne se déclenche pas
                setTimeout(function() { loader.style.display = 'none'; }, 500);
            }

            // Correctif : le loader (#gl-loader) recouvrait la carte (position: fixed; inset: 0)
            // → Leaflet calculait fitBounds sur un conteneur de dimensions incorrectes.
            // On recalcule après le retrait du loader.
            if (map) {
                map.invalidateSize({ pan: false });
                setTimeout(function() {
                    try {
                        map.fitBounds(profileBounds, {
                            maxZoom:  profileMaxZoom,
                            padding:  profilePadding,
                            animate:  true,
                            duration: 0.6
                        });
                    } catch (e) {
                        AppLog.warn("[GeoLeaf] Correctif fitBounds au reveal :", e);
                    }
                }, 120);
            }

            document.dispatchEvent(new CustomEvent("geoleaf:map:ready"));
            AppLog.info("Application prête — " + reason);
        }

        // Attendre que toutes les couches du thème soient chargées
        document.addEventListener('geoleaf:theme:applied', function() {
            revealApp('thème appliqué, couches chargées');
        }, { once: true });

        // Sécurité : révéler après 15s max (réseau lent, erreur…)
        setTimeout(function() { revealApp('timeout sécurité 15s'); }, 15000);

        AppLog.info("Application initialisée, chargement des couches en arrière-plan…");
    };

})(window);
