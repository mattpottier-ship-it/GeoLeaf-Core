/**
 * GeoLeaf GeoJSON Module - Visibility Manager
 * Gestionnaire centralis� de visibilit� des couches avec gestion des priorit�s
 *
 * G�re trois sources de modification de visibilit� :
 * - 'user': Action manuelle de l'utilisateur (toggle, show/hide explicite)
 * - 'theme': Modification par application d'un th�me
 * - 'zoom': Modification automatique selon le niveau de zoom
 *
 * R�gles de priorit� :
 * 1. user > theme > zoom (l'utilisateur a toujours le dernier mot)
 * 2. Une action 'user' annule les flags 'theme' et 'zoom'
 * 3. Une action 'theme' peut override 'zoom' mais pas 'user'
 * 4. Une action 'zoom' ne change jamais l'�tat si 'user' ou 'theme' est actif
 *
 * @module geojson/visibility-manager
 */
"use strict";

import { GeoJSONShared } from "./shared.js";
import { getLog } from "../utils/general-utils.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

// D�pendances lazy � fallback pour tests o� shared peut �tre r�solu diff�remment
const _defaultState = {
    map: null as any,
    layers: new Map<string, any>(),
};
const getState = () => (GeoJSONShared && GeoJSONShared.state ? GeoJSONShared.state : _defaultState);

const VisibilityManager: any = {};

/**
 * �tats de visibilit� possibles
 * @private
 */
const VisibilitySource = {
    USER: "user",
    THEME: "theme",
    ZOOM: "zoom",
    SYSTEM: "system", // Chargement initial, etc.
};

/**
 * Initialise les m�tadonn�es de visibilit� pour une couche
 * @param {Object} layerData - Donn�es de la couche
 * @private
 */
function initVisibilityMetadata(layerData: any) {
    if (!layerData._visibility) {
        layerData._visibility = {
            current: false, // �tat actuel physique sur la carte (true/false)
            logicalState: false, // �tat logique (bouton ON/OFF, ind�pendant du zoom)
            source: VisibilitySource.SYSTEM, // Derni�re source de modification
            userOverride: false, // L'utilisateur a forc� un �tat
            themeOverride: false, // Un th�me a forc� un �tat
            themeDesired: null, // Visibilit� voulue par le th�me (true/false)
            zoomConstrained: false, // La couche est limit�e par le zoom
        };
    }
}

/**
 * D�finit la visibilit� d'une couche avec gestion de priorit�
 *
 * @param {string} layerId - ID de la couche
 * @param {boolean} visible - �tat de visibilit� souhait�
 * @param {string} source - Source de la modification ('user' | 'theme' | 'zoom' | 'system')
 * @returns {boolean} - true si la visibilit� a �t� modifi�e, false sinon
 */
VisibilityManager.setVisibility = function (layerId: any, visible: any, source: any) {
    const state = getState();
    const Log = getLog();
    const layerData = state.layers.get(layerId);

    if (!layerData) {
        Log.warn("[VisibilityManager] Couche introuvable:", layerId);
        return false;
    }

    // Initialiser les m�tadonn�es si n�cessaire
    initVisibilityMetadata(layerData);

    const meta = layerData._visibility;
    const oldVisible = meta.current;
    const oldSource = meta.source;

    // Appliquer les r�gles de priorit�
    const canChange = this._canChangeVisibility(meta, source, visible);

    if (!canChange) {
        Log.debug(
            `[VisibilityManager] Changement refus� pour ${layerId}: ` +
                `source=${source}, userOverride=${meta.userOverride}, themeOverride=${meta.themeOverride}`
        );
        return false;
    }

    // Mettre � jour les flags selon la source
    this._updateVisibilityFlags(meta, source, visible);

    // Appliquer le changement effectif
    const changed = this._applyVisibilityChange(layerId, layerData, visible);

    if (changed) {
        meta.current = visible;
        meta.source = source;

        Log.debug(
            `[VisibilityManager] ${layerId}: ${oldVisible} ? ${visible} ` +
                `(source: ${oldSource} ? ${source})`
        );

        // Mettre � jour les anciens flags pour compatibilit�
        layerData.visible = visible;
        layerData.userDisabled = meta.userOverride && !visible;
        layerData.themeHidden = meta.themeOverride && !visible;

        // Notifier la l�gende
        this._notifyLegend(layerId, visible);

        // �mettre l'�v�nement
        this._fireVisibilityEvent(layerId, visible, source);
    }

    return changed;
};

/**
 * V�rifie si la visibilit� peut �tre modifi�e selon les r�gles de priorit�
 * @param {Object} meta - M�tadonn�es de visibilit�
 * @param {string} source - Source de la modification
 * @returns {boolean}
 * @private
 */
VisibilityManager._canChangeVisibility = function (meta: any, source: any, desiredVisible: any) {
    // L'utilisateur peut toujours modifier
    if (source === VisibilitySource.USER) {
        return true;
    }

    // IMPORTANT: Le zoom DOIT TOUJOURS pouvoir modifier l'affichage physique (current)
    // m�me si userOverride est true. Cela permet d'afficher/masquer selon les seuils de zoom
    // tout en gardant logicalState ind�pendant.
    if (source === VisibilitySource.ZOOM) {
        return true;
    }

    // Si l'utilisateur a d�fini un override, seul l'utilisateur peut changer l'�tat logique
    if (meta.userOverride) {
        return false;
    }

    // Ne jamais r�activer ce qu'un th�me a explicitement masqu�
    if (
        source === VisibilitySource.ZOOM &&
        meta.themeOverride &&
        meta.themeDesired === false &&
        desiredVisible === true
    ) {
        return false;
    }

    // Les th�mes peuvent override le zoom mais pas l'utilisateur
    if (source === VisibilitySource.THEME) {
        return true;
    }

    // Par d�faut, autoriser (pour 'system' et autres)
    return true;
};

/**
 * Met � jour les flags de visibilit� selon la source
 * @param {Object} meta - M�tadonn�es de visibilit�
 * @param {string} source - Source de la modification
 * @param {boolean} visible - �tat de visibilit�
 * @private
 */
VisibilityManager._updateVisibilityFlags = function (meta: any, source: any, visible: any) {
    switch (source) {
        case VisibilitySource.USER:
            meta.userOverride = true;
            meta.themeOverride = false; // Reset theme override
            meta.zoomConstrained = false;
            meta.logicalState = visible; // Mettre � jour l'�tat logique
            break;

        case VisibilitySource.THEME:
            // Ne pas override userOverride si d�j� pr�sent
            if (!meta.userOverride) {
                meta.themeOverride = true;
                meta.themeDesired = visible;
                meta.zoomConstrained = false;
                meta.logicalState = visible; // Mettre � jour l'�tat logique
            }
            break;

        case VisibilitySource.ZOOM:
            // Marquer la contrainte zoom (sauf override utilisateur)
            // NE PAS modifier logicalState - le zoom n'affecte pas l'�tat logique
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
            meta.logicalState = visible; // Initialiser l'�tat logique
            break;
    }
};

/**
 * Applique physiquement le changement de visibilit� (add/remove layer)
 * @param {string} layerId - ID de la couche
 * @param {Object} layerData - Donn�es de la couche
 * @param {boolean} visible - �tat de visibilit� souhait�
 * @returns {boolean} - true si un changement a �t� effectu�
 * @private
 */
VisibilityManager._applyVisibilityChange = function (layerId: any, layerData: any, visible: any) {
    const state = getState();
    const Log = getLog();

    if (!layerData.layer) {
        Log.warn("[VisibilityManager] Layer Leaflet manquant pour:", layerId);
        return false;
    }

    // D�terminer quelle couche g�rer (cluster ou layer)
    const layerToManage = layerData.clusterGroup || layerData.layer;
    const isCurrentlyOnMap = state.map && state.map.hasLayer(layerToManage);

    // Si d�j� dans l'�tat souhait�, ne rien faire
    if (visible && isCurrentlyOnMap) {
        return false;
    }
    if (!visible && !isCurrentlyOnMap) {
        return false;
    }

    try {
        if (visible) {
            // Cas 1 : Cluster partag� avec POI
            if (layerData.useSharedCluster && layerData.clusterGroup) {
                layerData.clusterGroup.addLayer(layerData.layer);
            }
            // Cas 2 : Cluster ind�pendant
            else if (layerData.clusterGroup) {
                state.map.addLayer(layerData.clusterGroup);
                if (layerData.clusterGroup.refreshClusters) {
                    layerData.clusterGroup.refreshClusters();
                }
            }
            // Cas 3 : Pas de cluster - ajouter directement � la map pour respecter le pane
            else {
                state.map.addLayer(layerData.layer);
                // Re-apply filter state: map.addLayer calls onAdd on every child layer which
                // recreates all SVG <path> elements, destroying any display:none previously
                // set by filterFeatures. Walk children and re-hide filtered ones.
                if (layerData.layer && typeof layerData.layer.eachLayer === "function") {
                    layerData.layer.eachLayer(function (child: any) {
                        if (!child._geoleafFiltered) return;
                        const el = child.getElement?.();
                        if (el) {
                            el.style.display = "none";
                        } else if (
                            typeof child.setStyle === "function" &&
                            child.options._originalOpacity !== undefined
                        ) {
                            child.setStyle({ opacity: 0, fillOpacity: 0 });
                        }
                        // Re-hide casing layer too
                        if (child._casingLayer) {
                            const casingEl = child._casingLayer.getElement?.();
                            if (casingEl) {
                                casingEl.style.display = "none";
                            } else if (typeof child._casingLayer.setStyle === "function") {
                                child._casingLayer.setStyle({ opacity: 0 });
                            }
                        }
                    });
                }
            }
        } else {
            // Cas 1 : Cluster partag� avec POI
            if (layerData.useSharedCluster && layerData.clusterGroup) {
                layerData.clusterGroup.removeLayer(layerData.layer);
            }
            // Cas 2 : Cluster ind�pendant
            else if (layerData.clusterGroup) {
                state.map.removeLayer(layerData.clusterGroup);
            }
            // Cas 3 : Pas de cluster - retirer directement de la map
            else {
                state.map.removeLayer(layerData.layer);
            }
        }

        // Synchroniser l'UI du Layer Manager et le bouton labels apr�s changement r�ussi
        // Utilise le refresh debounced pour grouper les changements multiples (ex: zoom)
        if (
            _g.GeoLeaf &&
            _g.GeoLeaf.LayerManager &&
            typeof _g.GeoLeaf.LayerManager.refresh === "function"
        ) {
            _g.GeoLeaf.LayerManager.refresh(); // Debounced par d�faut (100ms)
        }

        if (
            _g.GeoLeaf &&
            _g.GeoLeaf._LabelButtonManager &&
            typeof _g.GeoLeaf._LabelButtonManager.syncImmediate === "function"
        ) {
            _g.GeoLeaf._LabelButtonManager.syncImmediate(layerId);
        }

        return true;
    } catch (err) {
        Log.error(
            `[VisibilityManager] Erreur lors du changement de visibilit� de ${layerId}:`,
            err
        );
        return false;
    }
};

/**
 * Notifie le module Legend d'un changement de visibilit�
 * @param {string} layerId - ID de la couche
 * @param {boolean} visible - �tat de visibilit�
 * @private
 */
VisibilityManager._notifyLegend = function (layerId: any, visible: any) {
    if (
        _g.GeoLeaf &&
        _g.GeoLeaf.Legend &&
        typeof _g.GeoLeaf.Legend.setLayerVisibility === "function"
    ) {
        _g.GeoLeaf.Legend.setLayerVisibility(layerId, visible);
    }

    // Notifier aussi le module Labels pour masquer/afficher les �tiquettes
    if (_g.GeoLeaf && _g.GeoLeaf.Labels) {
        if (visible) {
            // Si la couche devient visible, v�rifier si les labels doivent �tre affich�s
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

    // Synchroniser le bouton de label pour refl�ter la visibilit� de la couche
    if (
        _g.GeoLeaf &&
        _g.GeoLeaf._LabelButtonManager &&
        typeof _g.GeoLeaf._LabelButtonManager.syncImmediate === "function"
    ) {
        _g.GeoLeaf._LabelButtonManager.syncImmediate(layerId);
    }
};

/**
 * �met un �v�nement de changement de visibilit�
 * @param {string} layerId - ID de la couche
 * @param {boolean} visible - �tat de visibilit�
 * @param {string} source - Source du changement
 * @private
 */
VisibilityManager._fireVisibilityEvent = function (layerId: any, visible: any, source: any) {
    const state = getState();
    if (!state.map) return;

    try {
        state.map.fire("geoleaf:geojson:visibility-changed", {
            layerId: layerId,
            visible: visible,
            source: source,
        });
    } catch (_e) {
        // Silencieux
    }
};

/**
 * R�initialise les overrides utilisateur pour une couche
 * Utilis� par les th�mes pour reprendre le contr�le
 *
 * @param {string} layerId - ID de la couche
 */
VisibilityManager.resetUserOverride = function (layerId: any) {
    const state = getState();
    const layerData = state.layers.get(layerId);

    if (layerData && layerData._visibility) {
        layerData._visibility.userOverride = false;
        getLog().debug(`[VisibilityManager] User override r�initialis� pour ${layerId}`);
    }
};

/**
 * R�initialise tous les overrides utilisateur
 * Utilis� par les th�mes lors d'un changement complet de th�me
 */
VisibilityManager.resetAllUserOverrides = function () {
    const state = getState();
    let count = 0;

    state.layers.forEach((layerData: any, _layerId) => {
        if (layerData._visibility && layerData._visibility.userOverride) {
            layerData._visibility.userOverride = false;
            count++;
        }
    });

    if (count > 0) {
        getLog().debug(`[VisibilityManager] ${count} user override(s) r�initialis�(s)`);
    }
};

/**
 * Obtient l'�tat de visibilit� complet d'une couche
 * @param {string} layerId - ID de la couche
 * @returns {Object|null} - M�tadonn�es de visibilit� ou null
 */
VisibilityManager.getVisibilityState = function (layerId: any) {
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
        zoomConstrained: layerData._visibility.zoomConstrained,
    };
};

/**
 * Exporte les constantes pour utilisation externe
 */
VisibilityManager.VisibilitySource = VisibilitySource;
/** Expos� pour les tests lorsque GeoJSONShared n'est pas inject� (r�solution de module diff�rente) */
VisibilityManager._getTestState = () => _defaultState;

getLog().info("[GeoLeaf._LayerVisibilityManager] Module charg�");

export { VisibilityManager };
