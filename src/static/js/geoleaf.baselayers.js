/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

(function (global) {
    "use strict";

    // ---------------------------------------------------------
    // Namespace global + logger unifié (avec fallback console)
    // ---------------------------------------------------------
    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Logger unifié (défini par geoleaf.logger-shim.js chargé en premier)
    const Log = GeoLeaf.Log;

    // Vérification Leaflet
    if (!global.L) {
        Log.error("[GeoLeaf.Baselayers] Leaflet (L) est introuvable. Charge d'abord Leaflet 1.9.");
        return;
    }

    const L = global.L;

    const Baselayers = (function () {
        let _map = null;
        let _activeKey = null;
        let _uiBound = false;
        const _baseLayers = Object.create(null);

        // Fallback : basemaps par défaut (100 % utilisables sans clé)
        const DEFAULT_BASELAYERS = {
            street: {
                label: "Street",
                url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                options: {
                    maxZoom: 19,
                    attribution: "&copy; OpenStreetMap contributors"
                }
            },
            topo: {
                label: "Topo",
                url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
                options: {
                    maxZoom: 17,
                    attribution:
                        "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap"
                }
            },
            satellite: {
                label: "Satellite",
                url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                options: {
                    maxZoom: 19,
                    attribution:
                        "Tiles &copy; Esri — Source: Esri, Earthstar Geographics, and the GIS user community"
                }
            }
        };

        function _ensureMap(explicitMap) {
            if (explicitMap && typeof explicitMap.setView === "function") {
                _map = explicitMap;
                Log.info("[GeoLeaf.Baselayers] _ensureMap: using explicit map passed to init().", _map);
                return;
            }
            if (_map && typeof _map.setView === "function") {
                return;
            }
            const gl = global.GeoLeaf || {};
            if (gl.Core && typeof gl.Core.getMap === "function") {
                const m = gl.Core.getMap();
                if (m && typeof m.setView === "function") {
                    _map = m;
                    Log.info("[GeoLeaf.Baselayers] _ensureMap: acquired map from GeoLeaf.Core.getMap()", _map);
                }
            }
        }

        function _registerDefaultBaseLayers() {
            Object.keys(DEFAULT_BASELAYERS).forEach(function (key) {
                if (!_baseLayers[key]) {
                    registerBaseLayer(key, DEFAULT_BASELAYERS[key]);
                    Log.info("[GeoLeaf.Baselayers] _registerDefaultBaseLayers: registered", key);
                }
            });
        }

        function _normalizeOptions(definition) {
            const opts = Object.assign({}, definition.options || {});
            // minZoom pour limiter le zoom arrière
            if (typeof opts.minZoom !== "number") {
                if (typeof definition.minZoom === "number") {
                    opts.minZoom = definition.minZoom;
                }
            }
            // maxZoom minimal pour éviter les warnings "no maxZoom specified"
            if (typeof opts.maxZoom !== "number") {
                opts.maxZoom = typeof definition.maxZoom === "number" ? definition.maxZoom : 19;
            }
            if (!opts.attribution && definition.attribution) {
                opts.attribution = definition.attribution;
            }
            return opts;
        }

        function registerBaseLayer(key, definition) {
            if (!key) {
                Log.warn("[GeoLeaf.Baselayers] registerBaseLayer appelé sans clé.");
                return;
            }
            if (!definition) {
                Log.warn("[GeoLeaf.Baselayers] Définition manquante pour la couche :", key);
                return;
            }

            // Utiliser definition.id si disponible, sinon la clé
            const actualKey = definition.id || key;
            let layerInstance = null;
            const label = definition.label || actualKey;

            // Cas 1 : on reçoit directement une instance de L.TileLayer
            if (definition instanceof L.TileLayer) {
                layerInstance = definition;
            }
            // Cas 2 : on reçoit un objet contenant .layer déjà prêt
            else if (definition.layer && definition.layer instanceof L.TileLayer) {
                layerInstance = definition.layer;
            }
            // Cas 3 : on reçoit une config { url, options, ... } → on crée la tileLayer
            else if (definition.url) {
                const options = _normalizeOptions(definition);
                layerInstance = L.tileLayer(definition.url, options);
            } else {
                Log.warn(
                    "[GeoLeaf.Baselayers] Définition invalide pour la couche :",
                    actualKey,
                    "(aucune url / aucun layer fourni)"
                );
                return;
            }

            _baseLayers[actualKey] = {
                key: actualKey,
                label: label,
                layer: layerInstance
            };
        }

        function registerBaseLayers(definitions) {
            if (!definitions || typeof definitions !== "object") {
                Log.warn("[GeoLeaf.Baselayers] registerBaseLayers attend un objet de définitions.");
                return;
            }
            Object.keys(definitions).forEach(function (key) {
                registerBaseLayer(key, definitions[key]);
            });
        }

        function _refreshUI() {
            if (!global.document) {
                return;
            }
            const elements = global.document.querySelectorAll("[data-gl-baselayer]");
            const leftPanel = global.document.getElementById('gl-left-panel');
            let activeElement = null;

            elements.forEach(function (el) {
                const key = el.getAttribute("data-gl-baselayer");
                if (!key) {
                    return;
                }
                const isActive = key === _activeKey;
                if (isActive) {
                    el.classList.add("gl-baselayer-active", "is-active");
                    el.setAttribute("aria-pressed", "true");
                    activeElement = el;
                } else {
                    el.classList.remove("gl-baselayer-active", "is-active");
                    el.setAttribute("aria-pressed", "false");
                }
            });

            // Animer l'indicateur vers le bouton actif
            if (leftPanel && activeElement) {
                _updateActiveIndicator(leftPanel, activeElement);
            }
        }

        function _updateActiveIndicator(panel, activeButton) {
            if (!panel || !activeButton) {
                return;
            }

            const panelRect = panel.getBoundingClientRect();
            const buttonRect = activeButton.getBoundingClientRect();

            // Calculer la position relative du bouton par rapport au panneau
            const left = buttonRect.left - panelRect.left;
            const width = buttonRect.width;

            // Mettre à jour la position et la largeur de l'indicateur (::before)
            panel.style.setProperty('--indicator-left', left + 'px');
            panel.style.setProperty('--indicator-width', width + 'px');
        }

        function _createBaseLayerControlsUI(config) {
            if (!global.document) {
                return;
            }

            // Si config n'est pas fourni, essayer de le récupérer depuis GeoLeaf.Config
            if (!config && global.GeoLeaf && global.GeoLeaf.Config && typeof global.GeoLeaf.Config.get === 'function') {
                config = {
                    ui: global.GeoLeaf.Config.get('ui'),
                    basemaps: global.GeoLeaf.Config.get('basemaps') || {}
                };
            }

            // Vérifier si showBaseLayerControls est activé
            const showControls = config && config.ui && config.ui.showBaseLayerControls !== false;

            let leftPanel = global.document.getElementById('gl-left-panel');

            if (showControls) {
                // Créer le panneau s'il n'existe pas
                if (!leftPanel) {
                    leftPanel = global.document.createElement('div');
                    leftPanel.id = 'gl-left-panel';
                    leftPanel.className = 'gl-left-panel';

                    // Trouver le conteneur de la carte pour y insérer le panneau
                    const mapContainer = global.document.getElementById('geoleaf-map') ||
                                       global.document.querySelector('.gl-map');

                    if (mapContainer) {
                        mapContainer.appendChild(leftPanel);
                    } else {
                        // Fallback: ajouter au body
                        global.document.body.appendChild(leftPanel);
                    }
                }

                // Créer les boutons de sélection de fond de carte
                // SAFE: Chaîne vide pour nettoyer le contenu avant reconstruction
                GeoLeaf.DOMSecurity.clearElementFast(leftPanel);

                // Utiliser _baseLayers enregistrés plutôt que config.basemaps
                // car les basemaps par défaut peuvent avoir été ajoutés
                Object.keys(_baseLayers).forEach(function(key) {
                    const def = _baseLayers[key];
                    const button = global.document.createElement('button');
                    button.className = 'gl-baselayer-btn';
                    button.setAttribute('data-gl-baselayer', key);
                    button.setAttribute('aria-label', def.label || key);
                    button.textContent = def.label || key;
                    leftPanel.appendChild(button);
                });
                leftPanel.style.display = 'flex';

                Log.info("[GeoLeaf.Baselayers] Contrôles de fond de carte créés avec", Object.keys(_baseLayers).length, "boutons");

                // Initialiser la position de l'indicateur après un court délai
                // pour s'assurer que le DOM est complètement rendu
                setTimeout(function() {
                    _refreshUI();
                }, 50);
            } else {
                // Masquer ou supprimer le panneau si showBaseLayerControls est false
                if (leftPanel) {
                    leftPanel.style.display = 'none';
                }
            }
        }

        function _bindUIOnce() {
            if (_uiBound || !global.document) {
                return;
            }
            _uiBound = true;

            // Un seul listener global : tout élément avec data-gl-baselayer utilise le même setBaseLayer()
            global.document.addEventListener("click", function (evt) {
                const target = evt.target.closest("[data-gl-baselayer]");
                if (!target) {
                    return;
                }
                const key = target.getAttribute("data-gl-baselayer");
                if (!key) {
                    return;
                }
                evt.preventDefault();
                setBaseLayer(key);
            });

            // Recalculer la position de l'indicateur lors du redimensionnement de la fenêtre
            let resizeTimeout;
            global.addEventListener('resize', function() {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(function() {
                    _refreshUI();
                }, 100);
            });
        }

        function setBaseLayer(key, options) {
            options = options || {};

            if (!key) {
                Log.warn("[GeoLeaf.Baselayers] setBaseLayer appelé sans clé.");
                return;
            }

            const previousKey = _activeKey;

            _ensureMap();
            Log.info(
                "[GeoLeaf.Baselayers] setBaseLayer called: key=",
                key,
                "_map=",
                _map ? true : false
            );
            if (!_map) {
                Log.warn(
                    "[GeoLeaf.Baselayers] Aucun L.Map disponible. Assure-toi que GeoLeaf.Core est initialisé."
                );
                return;
            }

            if (!_baseLayers[key]) {
                Log.warn("[GeoLeaf.Baselayers] Couche inconnue :", key);
                const keys = Object.keys(_baseLayers);
                if (!previousKey && keys.length > 0) {
                    const fallbackKey = keys[0];
                    if (!options.silent) {
                        Log.warn(
                            "[GeoLeaf.Baselayers] Bascule vers la première couche disponible :",
                            fallbackKey
                        );
                    }
                    setBaseLayer(fallbackKey, { silent: true });
                }
                return;
            }

            // Si la couche est déjà active, on ne fait que rafraîchir l'UI
            if (_activeKey === key) {
                _refreshUI();
                return;
            }

            // Retirer l'ancienne couche si présente (avec garde-fous)
            if (previousKey && _baseLayers[previousKey]) {
                const prev = _baseLayers[previousKey].layer;
                try {
                    if (
                        prev &&
                        _map &&
                        typeof _map.hasLayer === "function" &&
                        _map.hasLayer(prev)
                    ) {
                        _map.removeLayer(prev);
                    }
                } catch (e) {
                    Log.warn(
                        "[GeoLeaf.Baselayers] Impossible de retirer la couche précédente:",
                        e
                    );
                }
            }

            const nextLayer = _baseLayers[key].layer;
            if (!nextLayer || typeof nextLayer.addTo !== "function") {
                Log.error("[GeoLeaf.Baselayers] Couche invalide pour la clé:", key);
                return;
            }

            try {
                nextLayer.addTo(_map);
            } catch (e) {
                Log.error(
                    "[GeoLeaf.Baselayers] Impossible d'ajouter la couche au L.Map:",
                    e
                );
                return;
            }

            _activeKey = key;
            _refreshUI();

            Log.info("[GeoLeaf.Baselayers] Activated base layer:", key);

            // Événement personnalisé : geoleaf:basemap:change
            if (!options.silent) {
                if (
                    typeof document !== "undefined" &&
                    typeof document.dispatchEvent === "function"
                ) {
                    const detail = {
                        key,
                        previousKey,
                        map: _map,
                        layer: nextLayer,
                        source: "geoleaf.baselayers"
                    };

                    try {
                        if (typeof CustomEvent === "function") {
                            const event = new CustomEvent("geoleaf:basemap:change", {
                                detail
                            });
                            document.dispatchEvent(event);
                        } else {
                            const legacyEvent = document.createEvent("CustomEvent");
                            legacyEvent.initCustomEvent(
                                "geoleaf:basemap:change",
                                true,
                                true,
                                detail
                            );
                            document.dispatchEvent(legacyEvent);
                        }
                    } catch (err) {
                        Log.warn(
                            "[GeoLeaf.Baselayers] Impossible d'émettre l'événement geoleaf:basemap:change.",
                            err
                        );
                    }
                }

                Log.info("[GeoLeaf.Baselayers] Couche de fond active :", key);
            }
        }

        function getBaseLayers() {
            return Object.assign({}, _baseLayers);
        }

        function getActiveKey() {
            return _activeKey;
        }

        function getActiveLayer() {
            return _activeKey && _baseLayers[_activeKey]
                ? _baseLayers[_activeKey].layer
                : null;
        }

        /**
         * Initialisation du module Baselayers.
         *
         * Usage flexible :
         * GeoLeaf.Baselayers.init({
         *   map: mapLeaflet,              // optionnel si GeoLeaf.Core est déjà initialisé
         *   baselayers: { street: {...}, topo: {...}, satellite: {...} },
         *   defaultKey: "street"          // ou activeKey / initialKey
         * });
         *
         * Si aucune couche n’est fournie, les 3 basemaps par défaut (OSM / OpenTopoMap / Esri WorldImagery)
         * sont automatiquement enregistrées, et une est activée.
         */
                function init(options) {
            options = options || {};

            if (options.map) {
                _map = options.map;
            } else {
                _ensureMap();
            }

            _registerDefaultBaseLayers();

            if (options.baselayers && typeof options.baselayers === "object") {
                registerBaseLayers(options.baselayers);
            }

            if (options.activeKey) {
                setBaseLayer(options.activeKey, { silent: true });
            }

            // Si aucune couche n'est active, on prend la première disponible.
            if (!_activeKey) {
                const keys = Object.keys(_baseLayers);
                if (keys.length > 0) {
                    const defaultKey = keys[0];
                    Log.info("[GeoLeaf.Baselayers] init: aucune couche active, bascule sur", defaultKey);
                    setBaseLayer(defaultKey, { silent: true });
                }
            }

            // Créer les contrôles UI de fond de carte si la config le demande
            _createBaseLayerControlsUI(options);

            // Lie les boutons UI déclarés dans le DOM (data-gl-baselayer)
            _bindUIOnce();

            return {
                map: _map,
                activeKey: getActiveKey(),
                layers: getBaseLayers()
            };
        }

        return {
            init: init,
            registerBaseLayer: registerBaseLayer,
            registerBaseLayers: registerBaseLayers,
            setBaseLayer: setBaseLayer,
            setActive: setBaseLayer, // alias pour compatibilité
            getBaseLayers: getBaseLayers,
            getActiveKey: getActiveKey,
            getActiveLayer: getActiveLayer
        };
    })();

    // Nommage stabilisé : BaseLayers devient la forme officielle,
    // Baselayers reste un alias de compatibilité.
    GeoLeaf.Baselayers = Baselayers;
    GeoLeaf.BaseLayers = Baselayers;
})(window);
