declare const L: any;
/*!
 * GeoLeaf Core � App / Init
 * � 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Application Init
 * Fonction principale d'initialisation de l'application :
 * - Initialisation de la carte
 * - Chargement des modules (POI, Routes, GeoJSON, etc.)
 * - Configuration des composants UI
 * - M�canisme de reveal (loader / spinner)
 *
 * @module app/init
 */
import "../modules/utils/runtime-metrics.js";
import { _g } from "../modules/globals.js";
import { initBasemaps, initPOI, initRoute, initGeoJSON } from "./init-feature-modules.js";

const GeoLeaf = _g.GeoLeaf;
const _app = (GeoLeaf._app = GeoLeaf._app || {});

// ============================================================
// Fonction principale : initialiser l'application
// ============================================================
/* eslint-disable complexity, max-lines-per-function -- init orchestration */
_app.initApp = async function (cfg: any) {
    cfg = cfg || {};
    const AppLog = _app.AppLog;
    // perf 5 � benchmark: mesure du d�marrage
    if (typeof performance !== "undefined" && performance.mark) {
        performance.mark("geoleaf:initApp:start");
    }
    AppLog.log("Initialisation avec config:", cfg);

    // V�rifier les plugins
    _app.checkPlugins(cfg);

    // ========================================================
    // Initialisation de la carte
    // La carte est cr��e directement sur l'emprise du profil
    // (map.bounds obligatoire dans le profil).
    // ========================================================
    const mapTarget = (cfg.map && (cfg.map.target || cfg.map.id)) || "geoleaf-map";
    const uiTheme = (cfg.ui && cfg.ui.theme) || "light";

    // Bounds obligatoires � pas de fallback carte monde
    if (!cfg.map || !Array.isArray(cfg.map.bounds) || cfg.map.bounds.length !== 2) {
        AppLog.error(
            "[GeoLeaf] Le profil actif ne d�finit pas de map.bounds valide. " +
                "L'emprise (map.bounds) est obligatoire dans le fichier profile.json. " +
                'Exemple : "bounds": [[43.0, 1.0], [44.0, 2.0]]'
        );
        return;
    }

    // Calculer le centre depuis les bounds pour �viter le flash carte monde
    const profileBounds = cfg.map.bounds;
    const profileMaxZoom = cfg.map.initialMaxZoom || cfg.map.maxZoom || 12;
    const profilePadding = cfg.map.padding || [50, 50];
    const mapCenter = [
        (profileBounds[0][0] + profileBounds[1][0]) / 2,
        (profileBounds[0][1] + profileBounds[1][1]) / 2,
    ];

    let map: any = null;

    // Options Leaflet avanc�es (maxBounds pour positionFixed, etc.)
    const mapOptions: any = {};
    if (cfg.map.positionFixed === true) {
        const boundsMargin = typeof cfg.map.boundsMargin === "number" ? cfg.map.boundsMargin : 0.3;
        mapOptions.maxBounds = L.latLngBounds(profileBounds).pad(boundsMargin);
        mapOptions.maxBoundsViscosity = 0.85;
        if (typeof cfg.map.minZoom === "number") {
            mapOptions.minZoom = cfg.map.minZoom;
        } else {
            mapOptions.minZoom = 3;
        }
    }

    try {
        map = GeoLeaf.init({
            map: {
                target: mapTarget,
                center: mapCenter,
                zoom: profileMaxZoom,
                mapOptions: mapOptions,
            },
            ui: {
                theme: uiTheme,
            },
        });
    } catch (e) {
        AppLog.error("GeoLeaf.init() a lev� une erreur :", e);
        return;
    }

    if (!map) {
        AppLog.error("GeoLeaf.init() n'a pas renvoy� de carte valide.");
        return;
    }

    // Pr�charger les modules secondaires le plus t�t possible pour chevaucher
    // le t�l�chargement des chunks avec l'initialisation UI/Storage.
    // On garde un await plus bas avant l'usage des modules secondaires afin de
    // pr�server le comportement actuel.
    let secondaryModulesPromise = null;
    if (typeof GeoLeaf._loadAllSecondaryModules === "function") {
        secondaryModulesPromise = GeoLeaf._loadAllSecondaryModules();
    }

    // Appliquer positionFixed directement apr�s cr�ation (filet de s�curit�)
    if (cfg.map.positionFixed === true) {
        try {
            const boundsMargin =
                typeof cfg.map.boundsMargin === "number" ? cfg.map.boundsMargin : 0.3;
            const fixedBounds = L.latLngBounds(profileBounds).pad(boundsMargin);
            map.setMaxBounds(fixedBounds);
            map.options.maxBoundsViscosity = 0.85;
            if (typeof cfg.map.minZoom === "number") {
                map.setMinZoom(cfg.map.minZoom);
            } else {
                map.setMinZoom(3);
            }
            AppLog.log(
                "[GeoLeaf] positionFixed activ� � d�placement restreint � l'emprise du profil (marge: " +
                    boundsMargin * 100 +
                    "%)."
            );
        } catch (e) {
            AppLog.warn("[GeoLeaf] Erreur lors de l'application de positionFixed :", e);
        }
    }

    // Positionnement pr�cis via fitBounds (ajuste le zoom aux dimensions r�elles du conteneur)
    try {
        map.fitBounds(profileBounds, {
            maxZoom: profileMaxZoom,
            padding: profilePadding,
            animate: false,
        });
        AppLog.log("Carte positionn�e via map.bounds du profil.");
    } catch (e) {
        AppLog.warn("Erreur fitBounds depuis profile.map.bounds :", e);
    }

    // ========================================================
    // Service Worker core/lite � enregistrement INCONDITIONNEL
    // Le SW lite (sw-core.js) fait partie du core gratuit.
    // Il sera remplac� par le SW premium (sw.js) si le plugin
    // Storage est charg� ET enableServiceWorker = true.
    // ========================================================
    if (GeoLeaf._SWRegister) {
        GeoLeaf._SWRegister
            .register({ scope: "./" })
            .then(() => AppLog.log("Service Worker (core/lite) enregistré."))
            .catch((err: any) => AppLog.warn("Erreur enregistrement SW core:", err.message));
    }

    // ========================================================
    // Initialiser le Storage avec la config du profil (si plugin charg�)
    // ========================================================
    const storageConfig = cfg.storage || {};

    if (GeoLeaf.Storage && typeof GeoLeaf.Storage.init === "function") {
        try {
            AppLog.log("Initialisation du Storage avec config:", storageConfig);

            GeoLeaf.Storage.init({
                indexedDB: { name: "geoleaf-db", version: 2 },
                cache: storageConfig.cache || {
                    enableProfileCache: true,
                    enableTileCache: true,
                },
                offline: {},
                enableOfflineDetector: !!storageConfig.enableOfflineDetector,
                enableServiceWorker: !!storageConfig.enableServiceWorker,
            })
                .then(() => {
                    AppLog.log("Storage initialisé avec succès");
                })
                .catch((err: any) => {
                    AppLog.warn("Erreur initialisation Storage:", err);
                });
        } catch (e) {
            AppLog.warn("Erreur lors de l'initialisation du Storage:", e);
        }
    } else {
        AppLog.log("Plugin Storage non chargé — fonctionnement en mode cache navigateur standard.");

        // Initialize the Offline Detector for connectivity badge (core mode)
        if (storageConfig.enableOfflineDetector && GeoLeaf._OfflineDetector) {
            GeoLeaf._OfflineDetector.init({
                showBadge: true,
                badgePosition: "topleft",
                checkInterval: 30000,
            });
            AppLog.log("Offline Detector initialisé (mode core).");
        }
    }

    // ========================================================
    // Initialiser le syst�me de notifications UI
    // ========================================================
    if (GeoLeaf._UINotifications && typeof GeoLeaf._UINotifications.init === "function") {
        try {
            let notificationContainer = document.getElementById("gl-notifications");
            if (!notificationContainer) {
                notificationContainer = document.createElement("div");
                notificationContainer.id = "gl-notifications";
                notificationContainer.className =
                    "gl-notifications gl-notifications--bottom-center";
                document.body.appendChild(notificationContainer);
            }

            GeoLeaf._UINotifications.init({
                container: "#gl-notifications",
                position: "bottom-center",
                maxVisible: 3,
                animations: true,
            });

            AppLog.log("Système de notifications initialisé");
        } catch (e) {
            AppLog.warn("Erreur lors de l'initialisation des notifications:", e);
        }
    }

    // ========================================================
    // Toast de chargement persistant pendant le chargement des couches
    // Affich� d�s que le ThemeApplier commence � charger un th�me,
    // ferm� quand geoleaf:theme:applied est �mis.
    // ========================================================
    let _loadingToast: any = null;

    document.addEventListener("geoleaf:theme:applying", function () {
        // Afficher un toast persistant si le syst�me de notifications est pr�t
        if (GeoLeaf._UINotifications && GeoLeaf._UINotifications.container) {
            _loadingToast = GeoLeaf._UINotifications.info(
                "Chargement des données en cours, patientez.",
                { persistent: true, dismissible: false }
            );
        }
    });

    // ========================================================
    // �couteurs d'�v�nements (notifications profile & theme)
    // ========================================================
    let pendingProfileToastDetail: any = null;

    function notificationsReady() {
        try {
            if (
                GeoLeaf.UI &&
                GeoLeaf.UI.Notifications &&
                typeof GeoLeaf.UI.Notifications.getStatus === "function"
            ) {
                return !!GeoLeaf.UI.Notifications.getStatus().initialized;
            }
            if (GeoLeaf._UINotifications && GeoLeaf._UINotifications.container) {
                return true;
            }
        } catch (e) {
            void e;
        }
        return false;
    }

    function tryShowProfileToast(detail: any) {
        if (!detail || !detail.data) return false;
        const profile = detail.data.profile || {};
        const profileName =
            profile.label || profile.name || profile.title || detail.profileId || "Profil";
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

    document.addEventListener("geoleaf:profile:loaded", function (event) {
        if (event && (event as any).detail) {
            pendingProfileToastDetail = (event as any).detail;
            tryShowProfileToast((event as any).detail);
        }
    });

    document.addEventListener("geoleaf:theme:applied", function (event) {
        // Fermer le toast de chargement persistant
        if (
            _loadingToast &&
            GeoLeaf._UINotifications &&
            typeof GeoLeaf._UINotifications.dismiss === "function"
        ) {
            GeoLeaf._UINotifications.dismiss(_loadingToast);
            _loadingToast = null;
        }
        if (event && (event as any).detail) {
            const detail = (event as any).detail;
            _app.showNotification(
                `Thème "${detail.themeName}" chargé (${detail.layerCount} couches visibles)`,
                3500
            );
        }
    });

    // �couter la fin de chargement pour les notifications en attente
    document.addEventListener("geoleaf:map:ready", function () {
        if (pendingProfileToastDetail) {
            tryShowProfileToast(pendingProfileToastDetail);
        }
    });

    // ========================================================
    // Th�me UI via GeoLeaf.setTheme() + initialisation UI
    // ========================================================
    try {
        if (typeof GeoLeaf.setTheme === "function") {
            GeoLeaf.setTheme(uiTheme);
        }
    } catch (e) {
        AppLog.warn("Erreur lors de l'appel � GeoLeaf.setTheme :", e);
    }

    if (GeoLeaf.UI && typeof GeoLeaf.UI.init === "function") {
        try {
            const mapContainer =
                document.querySelector(".gl-main") || document.getElementById(mapTarget);
            GeoLeaf.UI.init({
                buttonSelector: '[data-gl-role="theme-toggle"]',
                map: map,
                mapContainer: mapContainer,
                config: cfg,
            });
        } catch (e) {
            AppLog.warn("GeoLeaf.UI.init() a lev� une erreur :", e);
        }
    }

    // Construction du panneau de filtres
    // ui.showFilterPanel === false ? masquer le bouton toggle + le panel et ne pas construire
    if (cfg.ui && cfg.ui.showFilterPanel === false) {
        const _toggleBtn = document.getElementById("gl-filter-toggle");
        if (_toggleBtn) _toggleBtn.style.display = "none";
        const _filterPanel = document.getElementById("gl-filter-panel");
        if (_filterPanel) _filterPanel.style.display = "none";
    } else if (GeoLeaf.UI && typeof GeoLeaf.UI.buildFilterPanelFromActiveProfile === "function") {
        try {
            let filterContainer = document.getElementById("gl-filter-panel");
            if (!filterContainer) {
                filterContainer = document.createElement("div");
                filterContainer.id = "gl-filter-panel";
                filterContainer.setAttribute("data-gl-role", "filter-panel");
                const glMain = document.querySelector(".gl-main");
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

    // ========================================================
    // Sprint 6: Chargement des modules secondaires (code splitting)
    // En mode ESM ? charge les chunks r�seau en parall�le.
    // En mode UMD ? d�j� inlin�, r�solution imm�diate.
    // ========================================================
    if (secondaryModulesPromise) {
        try {
            await secondaryModulesPromise;
            AppLog.log(
                "Modules secondaires chargés (POI, Route, Legend, LayerManager, Labels, Themes, Table)."
            );
        } catch (e) {
            AppLog.warn("Erreur chargement modules secondaires:", e);
        }
    }

    // Initialisation du module Table
    // ui.showTable !== false ? m�me pattern que showLegend / showLayerManager
    if (
        cfg.ui &&
        cfg.ui.showTable !== false &&
        GeoLeaf.Table &&
        typeof GeoLeaf.Table.init === "function" &&
        cfg.tableConfig &&
        cfg.tableConfig.enabled !== false
    ) {
        try {
            GeoLeaf.Table.init({ map: map, config: cfg.tableConfig });
            AppLog.log("Module Table initialisé.");
        } catch (e) {
            AppLog.warn("Erreur lors de l'initialisation du module Table :", e);
        }
    }

    // Initialisation du bouton de cache offline (si plugin Storage charg�)
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
    initBasemaps({ GeoLeaf, cfg, map, AppLog });

    // ========================================================
    // POI via GeoLeaf.POI
    // ========================================================
    initPOI({ GeoLeaf, cfg, map, AppLog });

    // ========================================================
    // Itin�raires via GeoLeaf.Route
    // ========================================================
    initRoute({ GeoLeaf, cfg, map, AppLog });

    // ========================================================
    // Couches GeoJSON via GeoLeaf.GeoJSON
    // ========================================================
    initGeoJSON({ GeoLeaf, cfg, map, AppLog, _app: _app });

    // ========================================================
    // Branding
    // ========================================================
    if (GeoLeaf.UI && GeoLeaf.UI.Branding && typeof GeoLeaf.UI.Branding.init === "function") {
        try {
            GeoLeaf.UI.Branding.init(map);
        } catch (e) {
            AppLog.warn("GeoLeaf.UI.Branding.init() a lev� une erreur :", e);
        }
    }

    // ========================================================
    // L�gende et gestionnaire de couches
    // ========================================================
    if (
        cfg.ui &&
        cfg.ui.showLegend !== false &&
        GeoLeaf.Legend &&
        typeof GeoLeaf.Legend.init === "function"
    ) {
        try {
            GeoLeaf.Legend.init(map, {
                position: "bottomleft",
                collapsible: true,
                collapsed: false,
                title: "Légende",
            });
        } catch (e) {
            AppLog.warn("Erreur lors de l'initialisation du module Legend:", e);
        }
    }

    if (
        cfg.ui &&
        cfg.ui.showLayerManager !== false &&
        GeoLeaf.LayerManager &&
        typeof GeoLeaf.LayerManager.init === "function"
    ) {
        try {
            GeoLeaf.LayerManager.init({ map: map, position: "bottomright" });
        } catch (e) {
            AppLog.warn("GeoLeaf.LayerManager.init() a lev� une erreur :", e);
        }
    }

    // ========================================================
    // Contr�le d'�chelle
    // ========================================================
    if (GeoLeaf.initScaleControl && typeof GeoLeaf.initScaleControl === "function") {
        try {
            GeoLeaf.initScaleControl(map);
        } catch (e) {
            AppLog.warn("GeoLeaf.initScaleControl() a lev� une erreur :", e);
        }
    }

    // ========================================================
    // Syst�me de labels
    // ========================================================
    if (GeoLeaf.Labels && typeof GeoLeaf.Labels.init === "function") {
        try {
            GeoLeaf.Labels.init({ map: map });
        } catch (e) {
            AppLog.warn("GeoLeaf.Labels.init() a lev� une erreur :", e);
        }
    }

    // ========================================================
    // Affichage des coordonn�es
    // ========================================================
    if (
        cfg.ui &&
        cfg.ui.showCoordinates !== false &&
        GeoLeaf.UI &&
        GeoLeaf.UI.CoordinatesDisplay &&
        typeof GeoLeaf.UI.CoordinatesDisplay.init === "function"
    ) {
        try {
            GeoLeaf.UI.CoordinatesDisplay.init(map, { position: "bottomleft", decimals: 6 });
        } catch (e) {
            AppLog.warn("GeoLeaf.UI.CoordinatesDisplay.init() a lev� une erreur :", e);
        }
    }

    // ========================================================
    // R�v�ler l'application quand les couches sont pr�tes
    // Le spinner #gl-loader reste opaque pendant que la carte
    // et les couches GeoJSON se chargent derri�re.
    // On attend l'�v�nement geoleaf:theme:applied (= toutes
    // les couches visibles sont charg�es) avant de r�v�ler.
    // ========================================================
    let _appRevealed = false;
    /* eslint-disable max-lines-per-function -- loader reveal + fitBounds + events */
    function revealApp(reason: any) {
        if (_appRevealed) return;
        _appRevealed = true;
        const loader = document.getElementById("gl-loader");
        if (loader) {
            loader.classList.add("gl-loader--fade");
            // Supprimer du DOM apr�s la transition CSS (400ms)
            // { once: true } garantit qu'on n'appelle pas hide() plusieurs fois
            loader.addEventListener(
                "transitionend",
                function () {
                    loader.style.display = "none";
                },
                { once: true }
            );
            // Fallback si transitionend ne se d�clenche pas � 800ms > dur�e transition
            // (valeur > dur�e transition pour laisser transitionend s'ex�cuter en premier)
            setTimeout(function () {
                loader.style.display = "none";
            }, 800);
        }

        // Correctif : le loader (#gl-loader) recouvrait la carte (position: fixed; inset: 0)
        // ? Leaflet calculait fitBounds sur un conteneur de dimensions incorrectes.
        // On recalcule apr�s le retrait du loader.
        if (map) {
            map.invalidateSize({ pan: false });
            setTimeout(function () {
                try {
                    map.fitBounds(profileBounds, {
                        maxZoom: profileMaxZoom,
                        padding: profilePadding,
                        animate: true,
                        duration: 0.6,
                    });
                } catch (e) {
                    AppLog.warn("[GeoLeaf] Correctif fitBounds au reveal :", e);
                }
            }, 120);
        }

        document.dispatchEvent(new CustomEvent("geoleaf:map:ready"));
        // �mettre l'�v�nement de fin d'initialisation de l'application
        // (utilis� par boot.js pour afficher le boot toast via GeoLeaf.bootInfo)
        document.dispatchEvent(
            new CustomEvent("geoleaf:app:ready", {
                detail: {
                    version: GeoLeaf._version,
                    timestamp: Date.now(),
                },
            })
        );
        AppLog.info("Application prête à " + reason);
        // perf 5 � benchmark: mesure du temps total de d�marrage
        if (typeof performance !== "undefined" && performance.mark) {
            performance.mark("geoleaf:initApp:ready");
            try {
                performance.measure(
                    "geoleaf:startup-total",
                    "geoleaf:initApp:start",
                    "geoleaf:initApp:ready"
                );
                const entries = performance.getEntriesByName("geoleaf:startup-total", "measure");
                if (entries.length) {
                    AppLog.info(
                        "[Perf] ? Startup total: " +
                            entries[entries.length - 1].duration.toFixed(1) +
                            "ms"
                    );
                }
            } catch (error) {
                void error;
            }
        }
    }
    /* eslint-enable max-lines-per-function */

    // Attendre que toutes les couches du th�me soient charg�es
    document.addEventListener(
        "geoleaf:theme:applied",
        function () {
            revealApp("thème appliqué, couches chargées");
        },
        { once: true }
    );

    // S�curit� : r�v�ler apr�s 5s max (r�seau lent, erreur�) � perf 5.10: r�duit de 15s � 5s
    setTimeout(function () {
        revealApp("timeout sécurité 5s");
    }, 5000);

    AppLog.info("Application initialisée, chargement des couches en arrière-plan.");
};
/* eslint-enable complexity, max-lines-per-function */

export { _app };
