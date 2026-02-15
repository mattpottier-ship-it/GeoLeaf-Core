/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Core
 * Fonctions principales d'initialisation, chargement et gestion des POI
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;

    GeoLeaf._POICore = GeoLeaf._POICore || {};

    // Références aux modules POI
    const getShared = () => GeoLeaf._POIShared;
    const getMarkers = () => GeoLeaf._POIMarkers;
    const getSidePanel = () => GeoLeaf._POISidePanel;
    const getNormalizers = () => GeoLeaf._POINormalizers;

    /**
     * Fonction principale d'initialisation du module POI.
     *
     * @param {L.Map|object} mapOrOptions - Instance de la carte Leaflet ou objet {map, config}.
     * @param {object} config - Configuration POI depuis GeoLeaf.config.json (optionnel si premier param est objet).
     */
    async function init(mapOrOptions, config) {
        // Support pour les deux signatures: init(map, config) et init({map, config})
        let map, opts;

        if (mapOrOptions && typeof mapOrOptions === 'object' && mapOrOptions.map) {
            map = mapOrOptions.map;
            opts = mapOrOptions.config || mapOrOptions;
        } else {
            map = mapOrOptions;
            opts = config;
        }

        if (!map || typeof map.addLayer !== 'function') {
            if (Log) Log.error('[POI] Aucune carte Leaflet valide fournie. Impossible d\'initialiser le module POI.');
            return;
        }

        const shared = getShared();
        if (!shared) {
            if (Log) Log.error('[POI] Module shared non chargé.');
            return;
        }

        const state = shared.state;
        const constants = shared.constants;

        state.mapInstance = map;
        state.poiConfig = opts || {};

        if (Log) Log.info('[POI] Initialisation du module POI...');

        // Forcer un maxZoom valide sur la carte
        if (shared.ensureMapMaxZoom) {
            shared.ensureMapMaxZoom(map, constants.POI_MAX_ZOOM);
        }

        // Créer le layer group principal
        state.poiLayerGroup = L.layerGroup().addTo(map);

        // Créer le cluster group si clustering activé
        const clustering = state.poiConfig.clustering !== false;
        if (clustering && typeof L !== 'undefined' && typeof L.markerClusterGroup === 'function') {
            state.poiClusterGroup = L.markerClusterGroup({
                maxClusterRadius: state.poiConfig.clusterRadius || 80,
                disableClusteringAtZoom: state.poiConfig.disableClusteringAtZoom || constants.POI_MAX_ZOOM,
                animate: false,
                showCoverageOnHover: false
            });
            state.mapInstance.addLayer(state.poiClusterGroup);
            if (Log) Log.info('[POI] Clustering activé (MarkerClusterGroup créé).');
        }

        // Créer le panneau latéral (caché par défaut)
        const sidePanel = getSidePanel();
        if (sidePanel && typeof sidePanel.createSidePanel === 'function') {
            sidePanel.createSidePanel();
        }

        // Charger le sprite SVG AVANT de charger les POIs
        const markers = getMarkers();
        if (markers && typeof markers.ensureProfileSpriteInjectedSync === 'function') {
            await markers.ensureProfileSpriteInjectedSync();
        }

        // Charger et afficher les POIs avec délai pour attendre Storage
        if (state.poiConfig.enabled !== false) {
            // ✅ NOUVEAU: Retarder le chargement initial pour laisser le temps au Storage de s'initialiser
            setTimeout(() => {
                if (Log) Log.info('[POI] Chargement des POI après délai d\'initialisation');
                loadAndDisplay();
            }, 1000);
        }
    }

    /**
     * ✅ NOUVELLE FONCTION: Charge et fusionne les POI stockés localement avec les POI existants
     */
    function loadAndMergeStoredPois(existingPois, callback) {
        if (typeof callback !== 'function') {
            if (Log) Log.error('[POI] loadAndMergeStoredPois: callback requis');
            return;
        }

        // ✅ NOUVEAU: Vérification renforcée de la disponibilité du module Storage
        const checkStorageAvailable = () => {
            const available = typeof GeoLeaf !== 'undefined' &&
                   GeoLeaf.Storage &&
                   GeoLeaf.Storage.DB &&
                   typeof GeoLeaf.Storage.DB.getAllFromSyncQueue === 'function';

            if (Log) {
                if (!available) {
                    Log.info('[POI] Debug Storage - GeoLeaf:', typeof GeoLeaf !== 'undefined');
                    Log.info('[POI] Debug Storage - GeoLeaf.Storage:', !!(GeoLeaf && GeoLeaf.Storage));
                    Log.info('[POI] Debug Storage - GeoLeaf.Storage.DB:', !!(GeoLeaf && GeoLeaf.Storage && GeoLeaf.Storage.DB));
                    Log.info('[POI] Debug Storage - getAllFromSyncQueue:', !!(GeoLeaf && GeoLeaf.Storage && GeoLeaf.Storage.DB && typeof GeoLeaf.Storage.DB.getAllFromSyncQueue === 'function'));
                }
            }

            return available;
        };

        if (!checkStorageAvailable()) {
            // ✅ NOUVEAU: Retry après un délai si Storage pas encore prêt
            if (Log) Log.warn('[POI] Module Storage pas encore prêt, retry dans 1000ms...');
            setTimeout(() => {
                if (checkStorageAvailable()) {
                    if (Log) Log.info('[POI] Module Storage maintenant disponible, retry...');
                    loadAndMergeStoredPois(existingPois, callback);
                } else {
                    if (Log) Log.error('[POI] Module Storage toujours non disponible après retry, abandon.');
                    callback(existingPois);
                }
            }, 1000);
            return;
        }

        if (Log) Log.info('[POI] Module Storage disponible, récupération des POI...');

        // Utiliser le module de synchronisation pour récupérer les POI du cache
        GeoLeaf.Storage.DB.getAllFromSyncQueue()
            .then(queueItems => {
                if (Log) Log.info(`[POI] Récupération cache: ${queueItems.length} items trouvés`);

                if (!Array.isArray(queueItems) || queueItems.length === 0) {
                    if (Log) Log.info('[POI] Aucun POI trouvé dans la file de synchronisation.');
                    callback(existingPois);
                    return;
                }

                // Débugger les types d'items trouvés
                if (Log) {
                    const itemTypes = queueItems.map(item => `${item.action}:${item.data?.type || 'no-type'}`);
                    Log.info(`[POI] Types d'items dans le cache: [${itemTypes.join(', ')}]`);

                    // DEBUG: Structure complète des premiers items
                    queueItems.slice(0, 2).forEach((item, i) => {
                        Log.info(`[POI] DEBUG Item ${i}:`, {
                            action: item.action,
                            type: item.type,
                            data_type: item.data?.type,
                            keys: Object.keys(item),
                            data_keys: item.data ? Object.keys(item.data) : 'no data'
                        });
                    });
                }

                // Filtrer les éléments POI (action 'add' ou 'update') et extraire les données
                const cachedPois = [];
                const normalizers = getNormalizers();

                if (!normalizers) {
                    if (Log) Log.error('[POI] Module Normalizers non disponible pour les POI du cache.');
                    callback(existingPois);
                    return;
                }

                queueItems.forEach(item => {
                    // Essayer différents formats de structure pour les POI
                    let isPoi = false;
                    let poiData = null;
                    let itemAction = null;

                    // Format 1: item.data.type === 'poi' && item.action contient 'add'
                    if (item.data && item.data.type === 'poi' && item.action &&
                        (item.action.includes('add') || item.action.includes('update'))) {
                        isPoi = true;
                        poiData = item.data;
                        itemAction = item.action;
                    }
                    // Format 2: item.type === 'poi' directement
                    else if (item.type === 'poi') {
                        isPoi = true;
                        poiData = item;
                        itemAction = item.action || 'add';
                    }
                    // Format 3: Contient un id POI et des coordonnées (detection heuristique)
                    else if (item.data && (item.data.id || item.data.latlng || item.data.latitude)) {
                        isPoi = true;
                        poiData = item.data;
                        itemAction = item.action || 'add';
                        if (Log) Log.info(`[POI] Détection heuristique POI: ${item.data.id || 'no-id'}`);
                    }
                    // Format 4: L'item lui-même est un POI (pas d'enveloppe data)
                    else if (item.id && (item.latlng || item.latitude)) {
                        isPoi = true;
                        poiData = item;
                        itemAction = 'add';
                        if (Log) Log.info(`[POI] Détection POI direct: ${item.id}`);
                    }

                    if (isPoi && poiData) {
                        // Normaliser le POI stocké comme les autres
                        const normalizedPoi = normalizers.normalizePoi(poiData);
                        if (normalizedPoi) {
                            cachedPois.push(normalizedPoi);
                            if (Log) Log.info(`[POI] POI du cache normalisé: ${normalizedPoi.id || 'Sans ID'} (action: ${itemAction})`);
                        } else {
                            if (Log) Log.warn('[POI] Échec normalisation POI du cache:', poiData);
                        }
                    } else {
                        if (Log) Log.debug(`[POI] Item ignoré - action: ${item.action}, type: ${item.type || item.data?.type}, keys: ${Object.keys(item).join(',')}`);
                    }
                });

                if (cachedPois.length > 0) {
                    if (Log) Log.info(`[POI] ${cachedPois.length} POI(s) récupéré(s) du cache local.`);

                    // Fusionner avec les POI existants (éviter les doublons par ID)
                    const mergedPois = [...existingPois];
                    cachedPois.forEach(cachedPoi => {
                        if (!mergedPois.find(p => p.id === cachedPoi.id)) {
                            mergedPois.push(cachedPoi);
                        }
                    });

                    callback(mergedPois);
                } else {
                    callback(existingPois);
                }
            })
            .catch(err => {
                if (Log) Log.error('[POI] Erreur lors de la récupération des POI du cache :', err);
                callback(existingPois);
            });
    }

    /**
     * Charge les POIs et les affiche sur la carte.
     */
    function loadAndDisplay() {
        const shared = getShared();
        if (!shared) return;
        const state = shared.state;

        if (state.isLoading) {
            if (Log) Log.warn('[POI] Chargement déjà en cours...');
            return;
        }

        // 1) Essayer d'utiliser les POI normalisés du profil actif
        try {
            if (GeoLeaf.Config && typeof GeoLeaf.Config.getActiveProfilePoi === 'function') {
                const profilePois = GeoLeaf.Config.getActiveProfilePoi();
                if (Array.isArray(profilePois) && profilePois.length > 0) {
                    state.allPois = profilePois;
                    if (Log) Log.info(`[POI] ${state.allPois.length} POI(s) provenant du profil actif.`);

                    // ✅ CORRECTION: Charger aussi les POI du cache après les POI du profil
                    loadAndMergeStoredPois(state.allPois, function(mergedPois) {
                        state.allPois = mergedPois;
                        displayPois(state.allPois);
                    });
                    return;
                }
            }
        } catch (err) {
            if (Log) Log.error('[POI] Erreur lors de la récupération des POI du profil actif :', err);
        }

        // ✅ CORRECTION: Essayer de charger les POI stockés en cache AVANT le fallback dataUrl
        loadAndMergeStoredPois([], function(cachedPois) {
            if (cachedPois.length > 0) {
                state.allPois = cachedPois;
                if (Log) Log.info(`[POI] ${cachedPois.length} POI(s) chargé(s) depuis le cache local.`);
                displayPois(cachedPois);
                return;
            }

            // 2) Fallback : charger un fichier JSON depuis dataUrl (mode historique)
            const dataUrl = state.poiConfig.dataUrl;
            if (!dataUrl) {
                if (Log) Log.info('[POI] Aucune dataUrl spécifiée et aucun POI en cache. Mode ajout manuel.');
                return;
            }

            state.isLoading = true;
            if (Log) Log.info('[POI] Chargement des données POI depuis :', dataUrl);

            fetch(dataUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur HTTP ${response.status} lors du chargement de ${dataUrl}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (Array.isArray(data)) {
                        state.allPois = data;
                    } else if (data && Array.isArray(data.pois)) {
                        state.allPois = data.pois;
                    } else {
                        state.allPois = [];
                    }
                    if (Log) Log.info(`[POI] ${state.allPois.length} POI(s) chargé(s) depuis dataUrl.`);
                    displayPois(state.allPois);
                })
                .catch(err => {
                    if (Log) Log.error('[POI] Erreur lors du chargement des POIs :', err);
                })
                .finally(() => {
                    state.isLoading = false;
                });
        });
    }

    /**
     * Affiche tous les POIs passés en paramètre sur la carte.
     *
     * @param {array} pois - Tableau d'objets POI.
     */
    function displayPois(pois) {
        if (!pois || !Array.isArray(pois)) {
            if (Log) Log.warn('[POI] displayPois() : Aucune donnée POI valide à afficher.');
            return;
        }

        const shared = getShared();
        if (!shared) return;
        const state = shared.state;
        const constants = shared.constants;

        // Nettoyer les layers existants
        if (state.poiLayerGroup) {
            state.poiLayerGroup.clearLayers();
        }
        if (state.poiClusterGroup) {
            state.poiClusterGroup.clearLayers();
        }

        const clustering = state.poiConfig.clustering !== false;
        const markers = getMarkers();

        if (!markers || typeof markers.createMarker !== 'function') {
            if (Log) Log.error('[POI] Module Markers non chargé.');
            return;
        }

        if (clustering && state.poiClusterGroup) {
            // Mode clustering
            pois.forEach(poi => {
                const marker = markers.createMarker(poi);
                if (marker) {
                    state.poiClusterGroup.addLayer(marker);
                    state.poiMarkers.set(poi.id || poi.title || poi.label, marker);
                }
            });

            if (!state.mapInstance.hasLayer(state.poiClusterGroup)) {
                state.mapInstance.addLayer(state.poiClusterGroup);
            }

            if (Log) Log.info('[POI] Affichage avec clustering.');
        } else {
            // Mode sans clustering
            pois.forEach(poi => {
                const marker = markers.createMarker(poi);
                if (marker) {
                    state.poiLayerGroup.addLayer(marker);
                    state.poiMarkers.set(poi.id || poi.title || poi.label, marker);
                }
            });

            if (!state.mapInstance.hasLayer(state.poiLayerGroup)) {
                state.mapInstance.addLayer(state.poiLayerGroup);
            }

            if (Log) Log.info('[POI] Affichage sans clustering.');
        }
    }

    /**
     * Ajoute un POI manuellement sur la carte.
     * CORRIGÉ V3: Normalisation systématique des nouveaux POI
     *
     * @param {object} poi - Données du POI.
     * @returns {L.Marker|null} Marqueur créé ou null.
     */
    function addPoi(poi) {
        if (!poi) {
            if (Log) Log.warn('[POI] addPoi() : POI invalide.');
            return null;
        }

        const shared = getShared();
        if (!shared) return null;
        const state = shared.state;

        const normalizers = getNormalizers();
        const markers = getMarkers();

        if (!normalizers || !markers) {
            if (Log) Log.error('[POI] Modules Normalizers ou Markers non chargés.');
            return null;
        }

        // ✅ CORRECTION V3: NORMALISER le POI avant traitement
        // Ceci garantit une structure cohérente avec les POI existants
        const normalizedPoi = normalizers.normalizePoi(poi);
        if (!normalizedPoi) {
            if (Log) Log.warn('[POI] addPoi() : Échec de la normalisation du POI.', poi);
            return null;
        }

        // Générer un ID si manquant après normalisation
        if (!normalizedPoi.id) {
            normalizedPoi.id = normalizers.generatePoiId(normalizedPoi);
        }

        if (Log) {
            Log.info('[POI] Adding normalized POI:', normalizedPoi.id);
            Log.info('[POI] - Has _layerConfig:', !!normalizedPoi._layerConfig);
            Log.info('[POI] - Has _sidepanelConfig:', !!normalizedPoi._sidepanelConfig);
            Log.info('[POI] - Has _popupConfig:', !!normalizedPoi._popupConfig);
            Log.info('[POI] - Attributes keys:', Object.keys(normalizedPoi.attributes || {}));
        }

        // Créer le marqueur avec le POI normalisé
        const marker = markers.createMarker(normalizedPoi);
        if (!marker) {
            if (Log) Log.warn('[POI] addPoi() : Impossible de créer le marqueur pour ce POI normalisé.', normalizedPoi);
            return null;
        }

        // Ajouter au bon layer group
        const clustering = state.poiConfig.clustering !== false;
        if (clustering && state.poiClusterGroup) {
            state.poiClusterGroup.addLayer(marker);
        } else {
            state.poiLayerGroup.addLayer(marker);
        }

        // Stocker le POI NORMALISÉ dans la liste (important pour la cohérence)
        state.allPois.push(normalizedPoi);
        state.poiMarkers.set(normalizedPoi.id, marker);

        // Note: La sauvegarde en cache est gérée par le submit-handler via SyncHandler
        // pour éviter la duplication et assurer la cohérence

        if (Log) Log.info('[POI] ✅ POI normalisé ajouté avec succès :', normalizedPoi.id);

        return marker;
    }

    /**
     * Récupère tous les POI chargés.
     *
     * @returns {array} Tableau des POI.
     */
    function getAllPois() {
        const shared = getShared();
        return shared ? shared.state.allPois : [];
    }

    /**
     * Récupère un POI par son ID.
     *
     * @param {string} id - ID du POI.
     * @returns {object|null} POI trouvé ou null.
     */
    function getPoiById(id) {
        const shared = getShared();
        if (!shared) return null;
        const state = shared.state;

        return state.allPois.find(p => p.id === id) || null;
    }

    /**
     * Recharge les POI (efface et réaffiche).
     *
     * @param {array} pois - Nouveau tableau de POI (optionnel).
     */
    function reload(pois) {
        const shared = getShared();
        if (!shared) return;
        const state = shared.state;

        if (pois && Array.isArray(pois)) {
            state.allPois = pois;
        }

        displayPois(state.allPois);

        if (Log) Log.info('[POI] POI rechargés.');
    }

    // ========================================
    //   EXPORT
    // ========================================

    GeoLeaf._POICore = {
        init,
        loadAndDisplay,
        displayPois,
        addPoi,
        getAllPois,
        getPoiById,
        reload,
        getDisplayedPoisCount: function() {
            const shared = getShared();
            return shared && shared.state ? (shared.state.allPois || []).length : 0;
        }
    };

})(typeof window !== "undefined" ? window : global);
