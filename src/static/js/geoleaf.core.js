/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

(function (global) {
    "use strict";
    // Instance unique de la carte Leaflet gérée par GeoLeaf.Core
    let _mapInstance = null;

    // ---------------------------------------------------------
    // Namespace global
    // ---------------------------------------------------------
    const root = (typeof globalThis !== "undefined" ? globalThis : window);
    root.GeoLeaf = root.GeoLeaf || {};
    root.GeoLeaf.Core = root.GeoLeaf.Core || {};

    // ---------------------------------------------------------
    // Logger unifié (défini par geoleaf.logger-shim.js chargé en premier)
    // ---------------------------------------------------------
    const Log = root.GeoLeaf.Log;

    // ---------------------------------------------------------
    // Module interne
    // ---------------------------------------------------------
    const Core = (function () {

        let _map = null;
        let _theme = "light";

        // -----------------------------------------------------
        // Normalisation des options d'initialisation
        // -----------------------------------------------------
        // eslint-disable-next-line no-unused-vars
        function _normalizeOptions(options) {
            if (!options || typeof options !== "object") {
                throw new Error("[GeoLeaf.Core] init() requiert un objet d’options.");
            }

            // Obligatoires
            if (!options.target) {
                throw new Error("[GeoLeaf.Core] L’option 'target' est obligatoire.");
            }

            if (!options.center || !Array.isArray(options.center) || options.center.length !== 2) {
                throw new Error("[GeoLeaf.Core] L’option 'center' doit être un tableau [lat, lng].");
            }

            if (typeof options.zoom !== "number") {
                throw new Error("[GeoLeaf.Core] L’option 'zoom' doit être un nombre.");
            }

            // Optionnels
            return {
                target: String(options.target),
                center: options.center,
                zoom: options.zoom,
                theme: options.theme || "light",
                mapOptions: options.mapOptions || {} // Options brutes Leaflet (optionnel)
            };
        }

        // -----------------------------------------------------
        // Gestion d’erreurs uniforme
        // -----------------------------------------------------
        function init(options = {}) {
            const context = "[GeoLeaf.Core]";

            try {
                // Vérification Leaflet
                if (typeof L === "undefined") {
                    throw new Error("Leaflet (L) est introuvable. Assurez-vous d’avoir chargé Leaflet 1.9.x.");
                }

                // Vérification des options obligatoires
                if (!options.mapId) {
                    throw new Error("L’option obligatoire 'mapId' est manquante.");
                }
                const targetEl = document.getElementById(options.mapId);
                if (!targetEl) {
                    throw new Error(`Aucun élément DOM trouvé pour mapId='${options.mapId}'.`);
                }

                // Valeurs par défaut + normalisation
                const center = Array.isArray(options.center) ? options.center : GeoLeaf.CONSTANTS.DEFAULT_CENTER;
                const zoom = Number.isFinite(options.zoom) ? options.zoom : GeoLeaf.CONSTANTS.DEFAULT_ZOOM;
                const theme = options.theme || "light";

                // Création ou récupération de la carte
                if (_mapInstance) {
                    Log.warn(`${context} Carte déjà initialisée. Recyclage de l’instance existante.`);
                    return _mapInstance;
                }

                // Options Leaflet : on permet mapOptions, mais on force zoomControl à true par défaut
                const leafletMapOptions = Object.assign({}, options.mapOptions || {}, {
                    center,
                    zoom
                });

                if (typeof leafletMapOptions.zoomControl === "undefined") {
                    leafletMapOptions.zoomControl = true;            // ✅ boutons de zoom activés par défaut
                }
                if (typeof leafletMapOptions.attributionControl === "undefined") {
                    leafletMapOptions.attributionControl = false;    // tu gardes ton UI sans attribution Leaflet
                }
                if (typeof leafletMapOptions.zoomSnap === "undefined") {
                    leafletMapOptions.zoomSnap = 0;                  // ✅ Désactive le snapping = zoom totalement libre
                }
                if (typeof leafletMapOptions.zoomDelta === "undefined") {
                    leafletMapOptions.zoomDelta = 0.25;              // ✅ Incréments de zoom pour les boutons +/-
                }
                if (typeof leafletMapOptions.wheelPxPerZoomLevel === "undefined") {
                    leafletMapOptions.wheelPxPerZoomLevel = 120;     // ✅ Sensibilité de la molette
                }

                _mapInstance = L.map(targetEl, leafletMapOptions);
                _map = _mapInstance; // ✅ Synchronisation de la variable locale

                // Application du thème
                try {
                    if (global.GeoLeaf && global.GeoLeaf.UI && typeof global.GeoLeaf.UI.applyTheme === "function") {
                        global.GeoLeaf.UI.applyTheme(theme);
                    }
                } catch (themeError) {
                    Log.warn(`${context} Impossible d'appliquer le thème :`, themeError);
                }

                // Initialisation du module Legend si disponible et activé
                const uiConfig = global.GeoLeaf.Config && global.GeoLeaf.Config.get ? global.GeoLeaf.Config.get('ui') : null;
                const showLegend = uiConfig ? (uiConfig.showLegend !== false) : true;

                if (showLegend && global.GeoLeaf && global.GeoLeaf.Legend && typeof global.GeoLeaf.Legend.init === "function") {
                    try {
                        global.GeoLeaf.Legend.init(_mapInstance, {
                            position: "bottomleft",
                            collapsible: true,
                            collapsed: false
                        });
                    } catch (legendError) {
                        Log.warn(`${context} Impossible d'initialiser Legend :`, legendError);
                    }
                }

                Log.info(`${context} Carte initialisée avec succès.`);
                return _mapInstance;

            } catch (err) {
                Log.error(`${context} ERREUR :`, err.message);

                // Callback global utilisateur
                if (typeof global.GeoLeaf?.Core?.onError === "function") {
                    try {
                        global.GeoLeaf.Core.onError(err);
                    } catch (cbErr) {
                        Log.error(`${context} Erreur dans Core.onError() :`, cbErr);
                    }
                }

                // ✅ S'assurer que les variables sont cohérentes en cas d'erreur
                _mapInstance = null;
                _map = null;

                return null;
            }
        }

        // -----------------------------------------------------
        // Compatibilité descendante : initMap
        // -----------------------------------------------------
        function initMap(a, b, c, d) {
            Log.warn("[GeoLeaf.Core] GeoLeaf.Core.initMap() est obsolète, utilisez GeoLeaf.Core.init().");

            let options = null;

            if (root.GeoLeaf && root.GeoLeaf.Config && typeof root.GeoLeaf.Config.get === "function") {
                try {
                    const mapCfg = root.GeoLeaf.Config.get("map") || {};
                    const uiCfg = root.GeoLeaf.Config.get("ui") || {};

                    options = {
                        target: mapCfg.target || "geoleaf-map",
                        center: mapCfg.center || GeoLeaf.CONSTANTS.DEFAULT_CENTER,
                        zoom: (typeof mapCfg.zoom === "number" ? mapCfg.zoom : GeoLeaf.CONSTANTS.DEFAULT_ZOOM),
                        theme: uiCfg.theme || "light",
                        mapOptions: mapCfg.mapOptions || {}
                    };

                    return init(options);
                } catch (err) {
                    Log.error("[GeoLeaf.Core] initMap() n’a pas pu construire les options à partir de GeoLeaf.Config :", err);
                    // on continue vers les heuristiques d’arguments
                }
            }

            // Cas objet unique : initMap({ target, center, zoom, theme })
            if (a && typeof a === "object" && !Array.isArray(a)) {
                return init(a);
            }

            // Cas ancienne signature : initMap(target, center, zoom, theme?)
            if (typeof a === "string" && Array.isArray(b) && typeof c === "number") {
                const legacyOptions = {
                    target: a,
                    center: b,
                    zoom: c,
                    theme: d || "light"
                };
                return init(legacyOptions);
            }

            Log.error("[GeoLeaf.Core] initMap() appelé avec une signature obsolète ou invalide. Utilisez GeoLeaf.Core.init({ target, center, zoom, theme }).");
            return null;
        }

        // -----------------------------------------------------
        // Thème
        // -----------------------------------------------------
        function _applyThemeToBody(theme) {
            const body = document.body;
            if (!body) {
                Log.warn("[GeoLeaf.Core] Impossible d’appliquer le thème : document.body introuvable.");
                return;
            }
            body.classList.remove("gl-theme-light", "gl-theme-dark");
            body.classList.add(theme === "dark" ? "gl-theme-dark" : "gl-theme-light");
        }

        function setTheme(theme) {
            if (!theme || (theme !== "light" && theme !== "dark")) {
                Log.warn("[GeoLeaf.Core] setTheme() : thème invalide →", theme);
                return;
            }
            _theme = theme;
            _applyThemeToBody(theme);
        }

        function getTheme() {
            return _theme;
        }

        // -----------------------------------------------------
        // Accès à la map
        // -----------------------------------------------------
        function getMap() {
            return _map;
        }

        // -----------------------------------------------------
        // API publique
        // -----------------------------------------------------
        return {
            init,      // nouvelle API normalisée
            initMap,   // alias rétrocompatible pour la démo et anciens appels
            getMap,
            setTheme,
            getTheme
        };

    })();

    root.GeoLeaf.Core = Core;

})(window);
