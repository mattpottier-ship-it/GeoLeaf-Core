/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Aggregator
 *
 * Ce fichier est maintenant un agrégateur UMD qui expose l'API publique du module POI.
 * Les fonctionnalités principales sont implémentées dans les sous-modules :
 *
 * - poi/shared.js      : État partagé et constantes
 * - poi/normalizers.js : Normalisation des données POI
 * - poi/popup.js       : Popups et tooltips
 * - poi/markers.js     : Création de marqueurs
 * - poi/sidepanel.js   : Panneau latéral
 * - poi/renderers.js   : Rendu du contenu
 * - poi/core.js        : Fonctions principales (init, load, display)
 *
 * En production, Rollup bundle automatiquement tous les modules ensemble.
 * En développement, chaque module est chargé séparément dans demo/index.html.
 *
 * Pour plus de détails, voir docs/poi/POI_SPLIT_STRATEGY.md
 *
 * @version 2.1.0
 * @since 2.0.0
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;

    // Références aux sous-modules POI (chargés via getters pour éviter les dépendances circulaires)
    const POICore = () => GeoLeaf._POICore;
    const POISidePanel = () => GeoLeaf._POISidePanel;
    const POIShared = () => GeoLeaf._POIShared;

    /**
     * API publique du module POI
     * Toutes les fonctions délèguent aux sous-modules appropriés
     */
    // Préserver GeoLeaf.POI.Renderers s'il existe déjà (défini par field-renderers.js, etc.)
    const existingRenderers = GeoLeaf.POI && GeoLeaf.POI.Renderers;

    GeoLeaf.POI = (function () {
        return {
            // Restaurer les Renderers définis avant
            Renderers: existingRenderers || {},

            /**
             * Initialise le module POI avec la carte et la configuration.
             * Supporte deux signatures: init(map, config) et init({map, config}).
             *
             * @param {L.Map|object} mapOrOptions - Instance Leaflet ou objet avec {map, config}
             * @param {object} [config] - Configuration POI (optionnel si premier param est objet)
             */
            init: function (mapOrOptions, config) {
                const core = POICore();
                if (!core) {
                    if (Log) Log.error('[POI] Module Core non chargé.');
                    return;
                }
                core.init(mapOrOptions, config);
            },

            /**
             * Charge et affiche les POIs sur la carte.
             */
            loadAndDisplay: function () {
                const core = POICore();
                if (!core) {
                    if (Log) Log.error('[POI] Module Core non chargé.');
                    return;
                }
                core.loadAndDisplay();
            },

            /**
             * Affiche un tableau de POIs sur la carte.
             *
             * @param {array} pois - Tableau d'objets POI
             */
            displayPois: function (pois) {
                const core = POICore();
                if (!core) {
                    if (Log) Log.error('[POI] Module Core non chargé.');
                    return;
                }
                core.displayPois(pois);
            },

            /**
             * Ajoute un POI manuellement à la carte.
             *
             * @param {object} poi - Données du POI
             * @returns {L.Marker|null} Marqueur créé ou null
             */
            addPoi: function (poi) {
                const core = POICore();
                if (!core) {
                    if (Log) Log.error('[POI] Module Core non chargé.');
                    return null;
                }
                return core.addPoi(poi);
            },

            /**             * Ajoute un nouveau POI à la carte.
             *
             * @param {object} poi - Données du POI à ajouter
             * @returns {boolean} true si ajout réussi, false sinon
             */
            add: function (poi) {
                const core = POICore();
                if (!core) {
                    if (Log) Log.error('[POI] Module Core non chargé.');
                    return false;
                }
                return core.addPoi(poi);
            },

            /**
             * Alias pour add() - ajoute un POI.
             *
             * @param {object} poi - Données du POI
             * @returns {boolean} true si ajout réussi, false sinon
             */
            addPoi: function (poi) {
                return this.add(poi);
            },

            /**             * Récupère tous les POI chargés.
             *
             * @returns {array} Tableau des POI
             */
            getAllPois: function () {
                const core = POICore();
                if (!core) return [];
                return core.getAllPois();
            },

            /**
             * Récupère un POI par son ID.
             *
             * @param {string} id - ID du POI
             * @returns {object|null} POI trouvé ou null
             */
            getPoiById: function (id) {
                const core = POICore();
                if (!core) return null;
                return core.getPoiById(id);
            },

            /**
             * Recharge les POIs (efface et réaffiche).
             *
             * @param {array} [pois] - Nouveau tableau de POI (optionnel)
             */
            reload: function (pois) {
                const core = POICore();
                if (!core) {
                    if (Log) Log.error('[POI] Module Core non chargé.');
                    return;
                }
                core.reload(pois);
            },

            /**
             * Affiche le panneau latéral avec les détails d'un POI.
             *
             * @param {object} poi - Données du POI
             * @param {array} [customLayout] - Layout personnalisé (optionnel)
             * @returns {Promise<void>}
             */
            showPoiDetails: async function (poi, customLayout) {
                const sidePanel = POISidePanel();
                if (!sidePanel) {
                    if (Log) Log.error('[POI] Module SidePanel non chargé.');
                    return;
                }
                await sidePanel.openSidePanel(poi, customLayout);
            },

            /**
             * Ferme le panneau latéral.
             */
            hideSidePanel: function () {
                const sidePanel = POISidePanel();
                if (!sidePanel) {
                    if (Log) Log.error('[POI] Module SidePanel non chargé.');
                    return;
                }
                sidePanel.closeSidePanel();
            },

            /**
             * Alias pour showPoiDetails avec layout personnalisé.
             *
             * @param {object} poi - Données du POI
             * @param {array} customLayout - Layout personnalisé
             */
            openSidePanelWithLayout: function (poi, customLayout) {
                this.showPoiDetails(poi, customLayout);
            },

            /**
             * Récupère le layer group Leaflet actif (cluster ou simple).
             *
             * @returns {L.LayerGroup|L.MarkerClusterGroup|null} Layer group ou null
             */
            getLayer: function () {
                const shared = POIShared();
                if (!shared) return null;
                const state = shared.state;
                return state.poiClusterGroup || state.poiLayerGroup;
            },

            /**
             * Obtient le nombre de POI actuellement affichés.
             *
             * @returns {number} Nombre de POI affichés
             */
            getDisplayedPoisCount: function () {
                const core = POICore();
                if (!core) {
                    if (Log) Log.error('[POI] Module Core non chargé.');
                    return 0;
                }
                return core.getDisplayedPoisCount();
            },

            /**
             * Helper pour tests unitaires : efface tous les POI.
             * @private
             */
            _clearAllForTests: function () {
                const shared = POIShared();
                if (!shared) return;
                const state = shared.state;

                if (Log) Log.info('[POI] _clearAllForTests: Suppression de', state.allPois.length, 'POI(s) et', state.poiMarkers.size, 'marqueur(s)');

                state.allPois = [];
                state.poiMarkers.clear();
                if (state.poiClusterGroup) state.poiClusterGroup.clearLayers();
                if (state.poiLayerGroup) state.poiLayerGroup.clearLayers();
            }
        };
    })();

})(typeof window !== "undefined" ? window : global);
