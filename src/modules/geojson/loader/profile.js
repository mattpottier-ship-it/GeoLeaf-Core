/**
 * GeoLeaf GeoJSON Loader - Profile
 * Orchestration du chargement par profil, batch loading, LayerManager population
 *
 * @module geojson/loader/profile
 */
"use strict";

import { GeoJSONShared } from '../shared.js';
import { getLog } from '../../utils/general-utils.js';

const _g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

const getState = () => GeoJSONShared.state;

const Loader = {};

/**
 * Charge automatiquement les couches GeoJSON déclarées dans le profil actif.
 *
 * @param {Object} [options] - Options supplémentaires globales appliquées à toutes les couches.
 * @returns {Promise<Array<Object>>} - Tableau des couches effectivement chargées avec métadonnées.
 */
Loader.loadFromActiveProfile = function (options = {}) {
    const state = getState();
    const Log = getLog();
    const Config = _g.GeoLeaf && _g.GeoLeaf.Config;



    if (!Config || typeof Config.getActiveProfile !== "function") {

        Log.warn(
            "[GeoLeaf.GeoJSON] Module Config ou Config.getActiveProfile() non disponible ; chargement GeoJSON par profil impossible."
        );
        return Promise.resolve([]);
    }

    const profile = Config.getActiveProfile();


    if (!profile || typeof profile !== "object") {

        Log.warn("[GeoLeaf.GeoJSON] Aucun profil actif ou profil invalide ; aucun GeoJSON chargé.");
        return Promise.resolve([]);
    }

    let layersDef = [];

    // Format 1 : profil.geojsonLayers = [...]
    if (Array.isArray(profile.geojsonLayers)) {
        layersDef = profile.geojsonLayers;
    }
    // Format 2 : profil.geojson.layers = [...]
    else if (profile.geojson && Array.isArray(profile.geojson.layers)) {
        layersDef = profile.geojson.layers;
    }
    // Format 3 : profil.layers = [...] (nouveau modèle Full Layer)
    else if (Array.isArray(profile.layers)) {
        layersDef = profile.layers;
    }
    // Format 4 : v3.0 avec Config.getActiveProfileLayersConfig() (nouvelles couches modulaires)
    else if (Config.Profile && typeof Config.Profile.getActiveProfileLayersConfig === "function") {
        const layersConfig = Config.Profile.getActiveProfileLayersConfig();
        if (Array.isArray(layersConfig)) {
            layersDef = layersConfig;
            Log.info("[GeoLeaf.GeoJSON] Utilisation du système v3.0 - " + layersConfig.length + " couches détectées");
        }
    }

    if (!layersDef.length) {
        Log.info(
            "[GeoLeaf.GeoJSON] Aucun bloc geojsonLayers / geojson.layers / layers défini dans le profil actif ; rien à charger."
        );
        return Promise.resolve([]);
    }

    // Limite de sécurité : max 50 couches (augmentée pour profils riches)
    if (layersDef.length > 50) {
        Log.warn(
            "[GeoLeaf.GeoJSON] Beaucoup de couches GeoJSON détectées (" + layersDef.length + "). Cela peut affecter les performances."
        );
    } else if (layersDef.length > 20) {
        Log.info(
            "[GeoLeaf.GeoJSON] " + layersDef.length + " couches GeoJSON détectées. Profil riche détecté."
        );
    }

    const baseOptions = options || {};
    const batchSize = 3;
    const batchDelay = 200;
    const self = this;

    const tasks = layersDef.map((def, index) => async () => {
        if (!def || typeof def !== "object") {
            Log.warn("[GeoLeaf.GeoJSON] Descripteur GeoJSON de profil invalide, ignoré :", { index, def });
            return null;
        }

        if (typeof def.active === "boolean" && def.active === false) {
            Log.debug("[GeoLeaf.GeoJSON] Couche désactivée (active: false), ignorée :", def.id || "(sans ID)");
            return null;
        }

        const layerDirectory = def._layerDirectory || null;
        const layerUrl = def.url || (def.dataFile ? self._resolveDataFilePath(def.dataFile, profile, layerDirectory) : null);

        if (!layerUrl) {
            Log.warn("[GeoLeaf.GeoJSON] Descripteur GeoJSON sans URL ou dataFile, ignoré :", {
                index,
                id: def.id,
                label: def.label
            });
            return null;
        }

        const normalizedDef = { ...def, url: layerUrl };
        normalizedDef._profileId = profile.id;
        normalizedDef._layerDirectory = layerDirectory;

        // Normalisation unifiée des configurations
        if (def.popup && typeof def.popup === 'object') {
            normalizedDef.showPopup = def.popup.enabled !== false;
            if (def.popup.fields && Array.isArray(def.popup.fields)) {
                normalizedDef.popupFields = def.popup.fields;
            }
            normalizedDef.popup = def.popup;
        }

        if (def.tooltip && typeof def.tooltip === 'object') {
            normalizedDef.showTooltip = def.tooltip.enabled !== false;
            if (def.tooltip.fields && Array.isArray(def.tooltip.fields)) {
                normalizedDef.tooltipFields = def.tooltip.fields;
            }
            if (def.tooltip.mode) {
                normalizedDef.tooltipMode = def.tooltip.mode;
            }
            normalizedDef.tooltip = def.tooltip;
        }

        if (def.sidepanel && typeof def.sidepanel === 'object') {
            if (def.sidepanel.detailLayout && Array.isArray(def.sidepanel.detailLayout)) {
                normalizedDef.sidepanelFields = def.sidepanel.detailLayout;
            }
            normalizedDef.sidepanel = def.sidepanel;
        }

        if (def.clustering && typeof def.clustering === 'object') {
            normalizedDef.clustering = def.clustering.enabled !== false;
            if (typeof def.clustering.maxClusterRadius === 'number') {
                normalizedDef.maxClusterRadius = def.clustering.maxClusterRadius;
                normalizedDef.clusterRadius = def.clustering.maxClusterRadius;
            }
            if (typeof def.clustering.disableClusteringAtZoom === 'number') {
                normalizedDef.disableClusteringAtZoom = def.clustering.disableClusteringAtZoom;
            }
        }

        if (def.search && typeof def.search === 'object') {
            normalizedDef.search = def.search;
        }

        if (def.table && typeof def.table === 'object') {
            normalizedDef.table = def.table;
        }

        // Sprint 8: propagate vectorTiles config
        if (def.data && def.data.vectorTiles && typeof def.data.vectorTiles === 'object') {
            normalizedDef.vectorTiles = def.data.vectorTiles;
        }
        if (def.vectorTiles && typeof def.vectorTiles === 'object') {
            normalizedDef.vectorTiles = def.vectorTiles;
        }

        const layerId = def.id || ("geojson-layer-" + (state.layerIdCounter++));
        const layerLabel = def.label || layerId;

        Log.debug("[GeoLeaf.GeoJSON] Chargement couche GeoJSON :", {
            profileId: profile.id || "(inconnu)",
            layerId: layerId,
            url: layerUrl
        });

        try {
            return await _g.GeoLeaf._GeoJSONLoader._loadSingleLayer(layerId, layerLabel, normalizedDef, baseOptions);
        } catch (err) {
            Log.error("[GeoLeaf.GeoJSON] Échec chargement couche :", {
                layerId: layerId,
                url: layerUrl,
                error: err
            });
            return null;
        }
    });

    // ── Sprint 5 : Smart loading — immediate (default theme) + deferred ──
    const defaultThemeLayerIds = self._getDefaultThemeLayerIds(profile);
    const immediateTasks = [];
    const deferredTasks = [];

    layersDef.forEach((def, index) => {
        if (def && def.id && defaultThemeLayerIds.has(def.id)) {
            immediateTasks.push(tasks[index]);
        } else {
            deferredTasks.push(tasks[index]);
        }
    });

    Log.info(
        `[GeoLeaf.GeoJSON] Smart loading: ${immediateTasks.length} immédiate(s) (thème par défaut), ${deferredTasks.length} différée(s)`
    );

    // Phase 1 : charger les couches du thème par défaut
    return this._loadLayersByBatch(immediateTasks, batchSize, batchDelay).then((layers) => {
        const loadedLayers = layers.filter(Boolean);

        Log.info("[GeoLeaf.GeoJSON] Phase 1 : " + loadedLayers.length + " couche(s) du thème par défaut chargée(s)");

        // Intégration avec LayerManager si disponible
        if (loadedLayers.length > 0 && _g.GeoLeaf && _g.GeoLeaf._GeoJSONLayerManager) {
            _g.GeoLeaf._GeoJSONLayerManager.registerWithLayerManager();
        }

        // Fit bounds sur l'ensemble des couches chargées
        if (baseOptions.fitBoundsOnLoad !== false && state.map && state.layerGroup) {
            const bounds = state.layerGroup.getBounds();
            if (bounds.isValid()) {
                const fitOptions = {};
                if (typeof baseOptions.maxZoomOnFit === "number") {
                    fitOptions.maxZoom = baseOptions.maxZoomOnFit;
                }
                state.map.fitBounds(bounds, fitOptions);
                Log.debug("[GeoLeaf.GeoJSON] Carte ajustée sur l'emprise des couches GeoJSON");

                const onMoveEnd = function() {
                    state.map.off('moveend', onMoveEnd);
                    try {
                        const event = new CustomEvent('geoleaf:fitbounds:complete', { detail: { bounds: bounds } });
                        document.dispatchEvent(event);
                    } catch (e) {
                        // fallback si CustomEvent n'est pas dispo
                    }
                };
                state.map.on('moveend', onMoveEnd);
            }
        }

        // Événement : couches initiales prêtes
        try {
            state.map.fire("geoleaf:geojson:layers-loaded", {
                count: loadedLayers.length,
                layers: loadedLayers.map(l => ({ id: l.id, label: l.label }))
            });
        } catch (e) {
            // Silencieux
        }

        try {
            document.dispatchEvent(new CustomEvent('geoleaf:layers:initial-loaded', {
                detail: { count: loadedLayers.length, deferred: deferredTasks.length }
            }));
        } catch (e) {
            // Silencieux
        }

        // Phase 2 : charger le reste en arrière-plan (idle)
        if (deferredTasks.length > 0) {
            self._loadLayersInIdle(deferredTasks).then((deferredLayers) => {
                const loadedDeferred = deferredLayers.filter(Boolean);
                Log.info(
                    "[GeoLeaf.GeoJSON] Phase 2 : " + loadedDeferred.length + " couche(s) différée(s) chargée(s) en arrière-plan"
                );

                // Re-register with LayerManager to include deferred layers
                if (loadedDeferred.length > 0 && _g.GeoLeaf && _g.GeoLeaf._GeoJSONLayerManager) {
                    _g.GeoLeaf._GeoJSONLayerManager.registerWithLayerManager();
                }

                try {
                    state.map.fire("geoleaf:geojson:deferred-layers-loaded", {
                        count: loadedDeferred.length,
                        layers: loadedDeferred.map(l => ({ id: l.id, label: l.label }))
                    });
                } catch (e) {
                    // Silencieux
                }
            }).catch((err) => {
                Log.error("[GeoLeaf.GeoJSON] Erreur chargement couches différées :", err);
            });
        }

        return loadedLayers;
    });
};

/**
 * Exécute un tableau de tâches async par lots.
 *
 * @param {Array<Function>} tasks - Fonctions async à exécuter
 * @param {number} [batchSize=3] - Taille des lots
 * @param {number} [delayMs=200] - Délai entre les lots (non utilisé actuellement)
 * @returns {Promise<Array>}
 * @private
 */
Loader._loadLayersByBatch = async function (tasks, batchSize = 3, delayMs = 200) {
    const results = [];

    for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const batchStart = Date.now();
        const batchResults = await Promise.all(batch.map(fn => fn()));
        results.push(...batchResults);

        const batchDuration = Date.now() - batchStart;
        const Log = getLog();
        Log.info(`[GeoLeaf.GeoJSON] Lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)} chargé en ${batchDuration} ms`);

        // Yield to the main thread between batches to avoid long tasks
        if (i + batchSize < tasks.length && delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return results;
};

/**
 * Retourne un Set d'IDs de couches appartenant au thème par défaut.
 * Utilisé pour le chargement prioritaire (Sprint 5).
 *
 * @param {Object} profile - Profil actif enrichi
 * @returns {Set<string>} - IDs des couches du thème initial
 * @private
 */
Loader._getDefaultThemeLayerIds = function (profile) {
    try {
        if (!profile || !profile.themes) return new Set();

        const themesData = profile.themes;
        // Support "defautTheme" (FR) et "defaultTheme" (EN)
        const defaultThemeId =
            (themesData.config && themesData.config.defautTheme) ||
            themesData.defaultTheme ||
            null;

        if (!defaultThemeId || !Array.isArray(themesData.themes)) return new Set();

        const defaultTheme = themesData.themes.find((t) => t.id === defaultThemeId);
        if (!defaultTheme || !Array.isArray(defaultTheme.layers)) return new Set();

        return new Set(
            defaultTheme.layers
                .filter((l) => l.visible !== false)
                .map((l) => l.id)
        );
    } catch (e) {
        return new Set();
    }
};

/**
 * Charge des tâches de couches en arrière-plan via requestIdleCallback.
 * Chaque lot est planifié quand le navigateur est inactif.
 *
 * @param {Array<Function>} tasks - Fonctions async à exécuter
 * @param {number} [batchSize=2] - Taille des lots idle
 * @returns {Promise<Array>}
 * @private
 */
Loader._loadLayersInIdle = function (tasks, batchSize = 2) {
    const Log = getLog();

    return new Promise((resolve) => {
        const results = [];
        let index = 0;

        const schedule =
            typeof requestIdleCallback === 'function'
                ? (cb) => requestIdleCallback(cb, { timeout: 3000 })
                : (cb) => setTimeout(cb, 60);

        const processNext = () => {
            if (index >= tasks.length) {
                resolve(results);
                return;
            }

            schedule(async () => {
                const batch = tasks.slice(index, index + batchSize);
                const batchResults = await Promise.all(batch.map((fn) => fn()));
                results.push(...batchResults);

                Log.debug(
                    `[GeoLeaf.GeoJSON] Idle: lot ${Math.floor(index / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)} ` +
                    `(${results.length}/${tasks.length} traitées)`
                );

                index += batchSize;
                processNext();
            });
        };

        processNext();
    });
};

/**
 * Prépare les configurations de TOUTES les couches pour le LayerManager.
 * Utilise les configs déjà chargées par ProfileLoader et y ajoute les layerManagerId.
 *
 * @param {Object} profile - Profil actif enrichi par ProfileLoader
 * @returns {Promise<Array>} - Promise résolvant en array des infos de couches
 */
Loader.loadAllLayersConfigsForLayerManager = async function(profile) {
    const Log = getLog();

    if (!profile || !profile.layers || !Array.isArray(profile.layers)) {
        Log.warn("[GeoLeaf.GeoJSON] loadAllLayersConfigsForLayerManager: Pas de couches dans le profil");
        return [];
    }

    Log.info(`[GeoLeaf.GeoJSON] Préparation de ${profile.layers.length} configurations de couches pour LayerManager...`);

    // Les configs sont déjà chargées par ProfileLoader, il suffit d'enrichir avec layerManagerId
    const allConfigs = profile.layers.map(layer => {
        let styles = null;
        let labels = null;
        if (layer.config && layer.config.styles) {
            styles = layer.config.styles;
        } else if (layer.styles) {
            styles = layer.styles;
        }
        if (layer.config && layer.config.labels) {
            labels = layer.config.labels;
        } else if (layer.labels) {
            labels = layer.labels;
        }
        return {
            id: layer.id,
            label: layer.label,
            layerManagerId: layer.layerManagerId || "geojson-default",
            configFile: layer.configFile,
            zIndex: (layer.config && layer.config.zIndex) || 0,
            themes: (layer.config && layer.config.themes) || null,
            styles: styles,
            labels: labels
        };
    });

    Log.info(`[GeoLeaf.GeoJSON] ${allConfigs.length} configurations prêtes pour LayerManager`);

    // Stocker les configs pour utilisation par LayerManager
    _g.GeoLeaf._allLayerConfigs = allConfigs;

    return allConfigs;
};

export { Loader as LoaderProfile };
