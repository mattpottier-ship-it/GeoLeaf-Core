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
import { Log } from '../log/index.js';
import { Config } from '../config/config-primitives.js';
import { StorageContract } from '../shared/storage-contract.js';
import { POIShared } from './shared.js';
import { POIMarkers } from './markers.js';
import { POISidepanel } from './sidepanel.js';
import { POINormalizers } from './normalizers.js';



// Références aux modules POI





/**
 * Fonction principale d'initialisation du module POI.
 *
 * @param {L.Map|object} mapOrOptions - Instance de la carte Leaflet ou objet {map, config}.
 * @param {object} config - Configuration POI depuis globalThis.GeoLeaf.config.json (optionnel si premier param est objet).
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

    const shared = POIShared;
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
    const sidePanel = POISidepanel;
    if (sidePanel && typeof sidePanel.createSidePanel === 'function') {
        sidePanel.createSidePanel();
    }

    // Charger le sprite SVG AVANT de charger les POIs
    const markers = POIMarkers;
    if (markers && typeof markers.ensureProfileSpriteInjectedSync === 'function') {
        await markers.ensureProfileSpriteInjectedSync();
    }

    // Charger et afficher les POIs — event-driven (perf: suppression setTimeout 1000ms)
    if (state.poiConfig.enabled !== false) {
        // Si Storage déjà prêt, charger immédiatement ; sinon attendre l'événement
        const storageReady = StorageContract.isAvailable();
        if (storageReady) {
            loadAndDisplay();
        } else {
            // Écouter l'événement une seule fois, avec fallback DOMContentLoaded
            const onStorageReady = () => {
                document.removeEventListener('geoleaf:storage:ready', onStorageReady);
                loadAndDisplay();
            };
            document.addEventListener('geoleaf:storage:ready', onStorageReady, { once: true });
            // Fallback : si l'événement n'arrive pas (Storage absent), charger quand même après DOMContentLoaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    document.removeEventListener('geoleaf:storage:ready', onStorageReady);
                    loadAndDisplay();
                }, { once: true });
            } else {
                // DOM déjà prêt : planifier au prochain tick pour laisser Storage finir son init synchrone
                Promise.resolve().then(() => {
                    document.removeEventListener('geoleaf:storage:ready', onStorageReady);
                    loadAndDisplay();
                });
            }
        }
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

    // Phase 10-C: Vérification disponibilité Storage via StorageContract
    const checkStorageAvailable = () => {
        return StorageContract.isAvailable() && typeof StorageContract.DB?.getAllFromSyncQueue === 'function';
    };

    if (!checkStorageAvailable()) {
        // perf: remplacer setTimeout(1000) par écoute événement geoleaf:storage:ready
        if (Log) Log.warn('[POI] Module Storage pas encore prêt, attente événement geoleaf:storage:ready...');
        const onReady = () => {
            if (checkStorageAvailable()) {
                loadAndMergeStoredPois(existingPois, callback);
            } else {
                if (Log) Log.error('[POI] Module Storage toujours non disponible, abandon.');
                callback(existingPois);
            }
        };
        document.addEventListener('geoleaf:storage:ready', onReady, { once: true });
        // Fallback si l'événement n'arrive jamais (Storage absent du build)
        Promise.resolve().then(() => {
            if (!checkStorageAvailable()) {
                document.removeEventListener('geoleaf:storage:ready', onReady);
                callback(existingPois);
            }
        });
        return;
    }

    if (Log) Log.info('[POI] Module Storage disponible, récupération des POI...');

    // Utiliser le module de synchronisation pour récupérer les POI du cache
    StorageContract.DB.getAllFromSyncQueue()
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
            const normalizers = POINormalizers;

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
    const shared = POIShared;
    if (!shared) return;
    const state = shared.state;

    if (state.isLoading) {
        if (Log) Log.warn('[POI] Chargement déjà en cours...');
        return;
    }

    // 1) Essayer d'utiliser les POI normalisés du profil actif
    try {
        if (Config && typeof Config.getActiveProfilePoi === 'function') {
            const profilePois = Config.getActiveProfilePoi();
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

    const shared = POIShared;
    if (!shared) return;
    const state = shared.state;

    // Nettoyer les layers existants
    if (state.poiLayerGroup) {
        state.poiLayerGroup.clearLayers();
    }
    if (state.poiClusterGroup) {
        state.poiClusterGroup.clearLayers();
    }

    const clustering = state.poiConfig.clustering !== false;
    const markers = POIMarkers;

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

    const shared = POIShared;
    if (!shared) return null;
    const state = shared.state;

    const normalizers = POINormalizers;
    const markers = POIMarkers;

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
    const shared = POIShared;
    return shared ? shared.state.allPois : [];
}

/**
 * Récupère un POI par son ID.
 *
 * @param {string} id - ID du POI.
 * @returns {object|null} POI trouvé ou null.
 */
function getPoiById(id) {
    const shared = POIShared;
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
    const shared = POIShared;
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

const POICore = {
    init,
    loadAndDisplay,
    displayPois,
    addPoi,
    getAllPois,
    getPoiById,
    reload,
    getDisplayedPoisCount: function() {
        const shared = POIShared;
        return shared && shared.state ? (shared.state.allPois || []).length : 0;
    }
};

// ── ESM Export ──
export { POICore };
