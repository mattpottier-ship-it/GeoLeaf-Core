/**
 * GeoLeaf GeoJSON Module - Visibility Manager
 * Gestionnaire centralisé de visibilité des couches avec gestion des priorités
 *
 * Gère trois sources de modification de visibilité :
 * - 'user': Action manuelle de l'utilisateur (toggle, show/hide explicite)
 * - 'theme': Modification par application d'un thème
 * - 'zoom': Modification automatique selon le niveau de zoom
 *
 * Règles de priorité :
 * 1. user > theme > zoom (l'utilisateur a toujours le dernier mot)
 * 2. Une action 'user' annule les flags 'theme' et 'zoom'
 * 3. Une action 'theme' peut override 'zoom' mais pas 'user'
 * 4. Une action 'zoom' ne change jamais l'état si 'user' ou 'theme' est actif
 *
 * @module geojson/visibility-manager
 */
"use strict";

import { GeoJSONShared } from './shared.js';
import { getLog } from '../utils/general-utils.js';

const _g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});



// Dépendances lazy

const getState = () => GeoJSONShared.state;

const VisibilityManager = {};


/**
 * États de visibilité possibles
 * @private
 */
const VisibilitySource = {
    USER: 'user',
    THEME: 'theme',
    ZOOM: 'zoom',
    SYSTEM: 'system'  // Chargement initial, etc.
};

/**
 * Initialise les métadonnées de visibilité pour une couche
 * @param {Object} layerData - Données de la couche
 * @private
 */
function initVisibilityMetadata(layerData) {
    if (!layerData._visibility) {
        layerData._visibility = {
            current: false,           // État actuel physique sur la carte (true/false)
            logicalState: false,      // État logique (bouton ON/OFF, indépendant du zoom)
            source: VisibilitySource.SYSTEM,  // Dernière source de modification
            userOverride: false,      // L'utilisateur a forcé un état
            themeOverride: false,     // Un thème a forcé un état
            themeDesired: null,       // Visibilité voulue par le thème (true/false)
            zoomConstrained: false    // La couche est limitée par le zoom
        };
    }
}

/**
 * Définit la visibilité d'une couche avec gestion de priorité
 *
 * @param {string} layerId - ID de la couche
 * @param {boolean} visible - État de visibilité souhaité
 * @param {string} source - Source de la modification ('user' | 'theme' | 'zoom' | 'system')
 * @returns {boolean} - true si la visibilité a été modifiée, false sinon
 */
VisibilityManager.setVisibility = function (layerId, visible, source) {
    const state = getState();
    const Log = getLog();
    const layerData = state.layers.get(layerId);

    if (!layerData) {
        Log.warn("[VisibilityManager] Couche introuvable:", layerId);
        return false;
    }

    // Initialiser les métadonnées si nécessaire
    initVisibilityMetadata(layerData);

    const meta = layerData._visibility;
    const oldVisible = meta.current;
    const oldSource = meta.source;

    // Appliquer les règles de priorité
    const canChange = this._canChangeVisibility(meta, source, visible);

    if (!canChange) {
        Log.debug(
            `[VisibilityManager] Changement refusé pour ${layerId}: ` +
            `source=${source}, userOverride=${meta.userOverride}, themeOverride=${meta.themeOverride}`
        );
        return false;
    }

    // Mettre à jour les flags selon la source
    this._updateVisibilityFlags(meta, source, visible);

    // Appliquer le changement effectif
    const changed = this._applyVisibilityChange(layerId, layerData, visible);

    if (changed) {
        meta.current = visible;
        meta.source = source;

        Log.debug(
            `[VisibilityManager] ${layerId}: ${oldVisible} → ${visible} ` +
            `(source: ${oldSource} → ${source})`
        );

        // Mettre à jour les anciens flags pour compatibilité
        layerData.visible = visible;
        layerData.userDisabled = meta.userOverride && !visible;
        layerData.themeHidden = meta.themeOverride && !visible;

        // Notifier la légende
        this._notifyLegend(layerId, visible);

        // Émettre l'événement
        this._fireVisibilityEvent(layerId, visible, source);
    }

    return changed;
};

/**
 * Vérifie si la visibilité peut être modifiée selon les règles de priorité
 * @param {Object} meta - Métadonnées de visibilité
 * @param {string} source - Source de la modification
 * @returns {boolean}
 * @private
 */
VisibilityManager._canChangeVisibility = function (meta, source, desiredVisible) {
    // L'utilisateur peut toujours modifier
    if (source === VisibilitySource.USER) {
        return true;
    }

    // IMPORTANT: Le zoom DOIT TOUJOURS pouvoir modifier l'affichage physique (current)
    // même si userOverride est true. Cela permet d'afficher/masquer selon les seuils de zoom
    // tout en gardant logicalState indépendant.
    if (source === VisibilitySource.ZOOM) {
        return true;
    }

    // Si l'utilisateur a défini un override, seul l'utilisateur peut changer l'état logique
    if (meta.userOverride) {
        return false;
    }

    // Ne jamais réactiver ce qu'un thème a explicitement masqué
    if (source === VisibilitySource.ZOOM && meta.themeOverride && meta.themeDesired === false && desiredVisible === true) {
        return false;
    }

    // Les thèmes peuvent override le zoom mais pas l'utilisateur
    if (source === VisibilitySource.THEME) {
        return true;
    }

    // Par défaut, autoriser (pour 'system' et autres)
    return true;
};

/**
 * Met à jour les flags de visibilité selon la source
 * @param {Object} meta - Métadonnées de visibilité
 * @param {string} source - Source de la modification
 * @param {boolean} visible - État de visibilité
 * @private
 */
VisibilityManager._updateVisibilityFlags = function (meta, source, visible) {
    switch (source) {
        case VisibilitySource.USER:
            meta.userOverride = true;
            meta.themeOverride = false;  // Reset theme override
            meta.zoomConstrained = false;
            meta.logicalState = visible; // Mettre à jour l'état logique
            break;

        case VisibilitySource.THEME:
            // Ne pas override userOverride si déjà présent
            if (!meta.userOverride) {
                meta.themeOverride = true;
                meta.themeDesired = visible;
                meta.zoomConstrained = false;
                meta.logicalState = visible; // Mettre à jour l'état logique
            }
            break;

        case VisibilitySource.ZOOM:
            // Marquer la contrainte zoom (sauf override utilisateur)
            // NE PAS modifier logicalState - le zoom n'affecte pas l'état logique
            if (!meta.userOverride) {
                meta.zoomConstrained = true;
            }
            break;

        case VisibilitySource.SYSTEM:
            // Reset tous les overrides pour un chargement propre
            meta.userOverride = false;
            meta.themeOverride = false;
            meta.themeDesired = null;
            meta.zoomConstrained = false;
            meta.logicalState = visible; // Initialiser l'état logique
            break;
    }
};

/**
 * Applique physiquement le changement de visibilité (add/remove layer)
 * @param {string} layerId - ID de la couche
 * @param {Object} layerData - Données de la couche
 * @param {boolean} visible - État de visibilité souhaité
 * @returns {boolean} - true si un changement a été effectué
 * @private
 */
VisibilityManager._applyVisibilityChange = function (layerId, layerData, visible) {
    const state = getState();
    const Log = getLog();

    if (!layerData.layer) {
        Log.warn("[VisibilityManager] Layer Leaflet manquant pour:", layerId);
        return false;
    }

    // Déterminer quelle couche gérer (cluster ou layer)
    const layerToManage = layerData.clusterGroup || layerData.layer;
    const isCurrentlyOnMap = state.map && state.map.hasLayer(layerToManage);

    // Si déjà dans l'état souhaité, ne rien faire
    if (visible && isCurrentlyOnMap) {
        return false;
    }
    if (!visible && !isCurrentlyOnMap) {
        return false;
    }

    try {
        if (visible) {
            // Cas 1 : Cluster partagé avec POI
            if (layerData.useSharedCluster && layerData.clusterGroup) {
                layerData.clusterGroup.addLayer(layerData.layer);
            }
            // Cas 2 : Cluster indépendant
            else if (layerData.clusterGroup) {
                state.map.addLayer(layerData.clusterGroup);
                if (layerData.clusterGroup.refreshClusters) {
                    layerData.clusterGroup.refreshClusters();
                }
            }
            // Cas 3 : Pas de cluster - ajouter directement à la map pour respecter le pane
            else {
                state.map.addLayer(layerData.layer);
            }
        } else {
            // Cas 1 : Cluster partagé avec POI
            if (layerData.useSharedCluster && layerData.clusterGroup) {
                layerData.clusterGroup.removeLayer(layerData.layer);
            }
            // Cas 2 : Cluster indépendant
            else if (layerData.clusterGroup) {
                state.map.removeLayer(layerData.clusterGroup);
            }
            // Cas 3 : Pas de cluster - retirer directement de la map
            else {
                state.map.removeLayer(layerData.layer);
            }
        }

        // Synchroniser l'UI du Layer Manager et le bouton labels après changement réussi
        // Utilise le refresh debounced pour grouper les changements multiples (ex: zoom)
        if (_g.GeoLeaf && _g.GeoLeaf.LayerManager && typeof _g.GeoLeaf.LayerManager.refresh === 'function') {
            _g.GeoLeaf.LayerManager.refresh(); // Debounced par défaut (100ms)
        }

        if (_g.GeoLeaf && _g.GeoLeaf._LabelButtonManager && typeof _g.GeoLeaf._LabelButtonManager.syncImmediate === 'function') {
            _g.GeoLeaf._LabelButtonManager.syncImmediate(layerId);
        }

        return true;

    } catch (err) {
        Log.error(`[VisibilityManager] Erreur lors du changement de visibilité de ${layerId}:`, err);
        return false;
    }
};

/**
 * Notifie le module Legend d'un changement de visibilité
 * @param {string} layerId - ID de la couche
 * @param {boolean} visible - État de visibilité
 * @private
 */
VisibilityManager._notifyLegend = function (layerId, visible) {
    if (_g.GeoLeaf && _g.GeoLeaf.Legend && typeof _g.GeoLeaf.Legend.setLayerVisibility === "function") {
        _g.GeoLeaf.Legend.setLayerVisibility(layerId, visible);
    }

    // Notifier aussi le module Labels pour masquer/afficher les étiquettes
    if (_g.GeoLeaf && _g.GeoLeaf.Labels) {
        if (visible) {
            // Si la couche devient visible, vérifier si les labels doivent être affichés
            // refreshLabels ne fait rien si les labels ne sont pas enabled
            if (typeof _g.GeoLeaf.Labels.refreshLabels === "function") {
                _g.GeoLeaf.Labels.refreshLabels(layerId);
            }
        } else {
            // Si la couche devient invisible, masquer les labels (sans changer enabled)
            if (typeof _g.GeoLeaf.Labels._hideLabelsForLayer === "function") {
                _g.GeoLeaf.Labels._hideLabelsForLayer(layerId);
            }
        }
    }

    // Synchroniser le bouton de label pour refléter la visibilité de la couche
    if (_g.GeoLeaf && _g.GeoLeaf._LabelButtonManager && typeof _g.GeoLeaf._LabelButtonManager.syncImmediate === "function") {
        _g.GeoLeaf._LabelButtonManager.syncImmediate(layerId);
    }
};

/**
 * Émet un événement de changement de visibilité
 * @param {string} layerId - ID de la couche
 * @param {boolean} visible - État de visibilité
 * @param {string} source - Source du changement
 * @private
 */
VisibilityManager._fireVisibilityEvent = function (layerId, visible, source) {
    const state = getState();
    if (!state.map) return;

    try {
        state.map.fire("geoleaf:geojson:visibility-changed", {
            layerId: layerId,
            visible: visible,
            source: source
        });
    } catch (e) {
        // Silencieux
    }
};

/**
 * Réinitialise les overrides utilisateur pour une couche
 * Utilisé par les thèmes pour reprendre le contrôle
 *
 * @param {string} layerId - ID de la couche
 */
VisibilityManager.resetUserOverride = function (layerId) {
    const state = getState();
    const layerData = state.layers.get(layerId);

    if (layerData && layerData._visibility) {
        layerData._visibility.userOverride = false;
        getLog().debug(`[VisibilityManager] User override réinitialisé pour ${layerId}`);
    }
};

/**
 * Réinitialise tous les overrides utilisateur
 * Utilisé par les thèmes lors d'un changement complet de thème
 */
VisibilityManager.resetAllUserOverrides = function () {
    const state = getState();
    let count = 0;

    state.layers.forEach((layerData, layerId) => {
        if (layerData._visibility && layerData._visibility.userOverride) {
            layerData._visibility.userOverride = false;
            count++;
        }
    });

    if (count > 0) {
        getLog().debug(`[VisibilityManager] ${count} user override(s) réinitialisé(s)`);
    }
};

/**
 * Obtient l'état de visibilité complet d'une couche
 * @param {string} layerId - ID de la couche
 * @returns {Object|null} - Métadonnées de visibilité ou null
 */
VisibilityManager.getVisibilityState = function (layerId) {
    const state = getState();
    const layerData = state.layers.get(layerId);

    if (!layerData) {
        return null;
    }

    initVisibilityMetadata(layerData);

    return {
        current: layerData._visibility.current,
        source: layerData._visibility.source,
        userOverride: layerData._visibility.userOverride,
        themeOverride: layerData._visibility.themeOverride,
        zoomConstrained: layerData._visibility.zoomConstrained
    };
};

/**
 * Exporte les constantes pour utilisation externe
 */
VisibilityManager.VisibilitySource = VisibilitySource;

getLog().info("[GeoLeaf._LayerVisibilityManager] Module chargé");

export { VisibilityManager };
