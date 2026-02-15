/**
 * GeoLeaf Theme Applier - Deferred
 * Chargement différé de couches, résolution de profil, gestion du cache
 *
 * @module themes/theme-applier/deferred
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};

    const TA = GeoLeaf._ThemeApplier;

    /**
     * Programme l'application d'une configuration de couche pour plus tard
     * @param {string} layerId - ID de la couche
     * @param {boolean} visible - Visibilité souhaitée
     * @param {string} styleId - ID du style à appliquer
     * @returns {Promise<void>}
     * @private
     */
    TA._scheduleLayerConfig = function (layerId, visible, styleId) {
        if (!TA._pendingLayerConfigs) {
            TA._pendingLayerConfigs = new Map();
        }

        TA._pendingLayerConfigs.set(layerId, { visible, styleId });

        // Programmer une vérification périodique
        TA._schedulePendingCheck();

        return Promise.resolve();
    };

    /**
     * Planifie une vérification des couches en attente
     * @private
     */
    TA._schedulePendingCheck = function () {
        if (TA._pendingCheckTimer) {
            return; // Déjà planifié
        }

        TA._pendingCheckTimer = setTimeout(() => {
            TA._checkPendingLayerConfigs();
            TA._pendingCheckTimer = null;
        }, 1000);
    };

    /**
     * Vérifie et applique les configurations de couches en attente
     * @private
     */
    TA._checkPendingLayerConfigs = function () {
        if (!TA._pendingLayerConfigs || TA._pendingLayerConfigs.size === 0) {
            return;
        }

        const appliedLayers = [];

        for (const [layerId, config] of TA._pendingLayerConfigs) {
            const layerData = GeoLeaf._GeoJSONShared?.state?.layers?.get(layerId);
            if (layerData) {
                TA._setLayerVisibilityAndStyle(layerId, config.visible, config.styleId);
                appliedLayers.push(layerId);
            }
        }

        // Supprimer les couches traitées
        appliedLayers.forEach(layerId => {
            TA._pendingLayerConfigs.delete(layerId);
        });

        // S'il reste des couches en attente, programmer une nouvelle vérification
        if (TA._pendingLayerConfigs.size > 0) {
            TA._schedulePendingCheck();
        }
    };

    /**
     * Charge une couche depuis le profil actif (avec tolérance aux erreurs)
     * @param {string} layerId - ID de la couche à charger
     * @returns {Promise<Object|null>} - Couche chargée ou null si erreur
     * @private
     */
    TA._loadLayerFromProfile = async function (layerId) {
        const Config = GeoLeaf.Config;
        if (!Config || typeof Config.getActiveProfile !== 'function') {
            return null;
        }

        try {
            const activeProfile = Config.getActiveProfile();

            if (!activeProfile || typeof activeProfile !== 'object') {
                return null;
            }

            const profileId = activeProfile.id || null;

            // Get layers config from profile
            let profileLayersConfig = [];
            if (Array.isArray(activeProfile.geojsonLayers)) {
                profileLayersConfig = activeProfile.geojsonLayers;
            } else if (activeProfile.geojson && Array.isArray(activeProfile.geojson.layers)) {
                profileLayersConfig = activeProfile.geojson.layers;
            } else if (Array.isArray(activeProfile.layers)) {
                profileLayersConfig = activeProfile.layers;
            } else if (Array.isArray(activeProfile.Layers)) {
                profileLayersConfig = activeProfile.Layers;
            }

            if (!Array.isArray(profileLayersConfig) || profileLayersConfig.length === 0) {
                return null;
            }

            const layerConfig = profileLayersConfig.find(config => config.id === layerId);

            if (!layerConfig) {
                return null;
            }

            const dataUrl = TA._resolveDataFilePath(layerConfig);

            if (!dataUrl) {
                return null;
            }

            const layerLabel = layerConfig.label || layerId;
            const baseOptions = {};

            const loader = GeoLeaf._GeoJSONLoader?._loadSingleLayer;

            if (!loader) {
                return null;
            }

            // Tentative cache avant réseau
            let cachedData = null;
            if (GeoLeaf.ThemeCache?.get) {
                cachedData = await GeoLeaf.ThemeCache.get(layerId, profileId);
            }

            // Transmettre TOUTE la configuration de la couche
            const layerDef = {
                ...layerConfig,
                url: dataUrl,
                type: layerConfig.geometryType || layerConfig.type || 'geojson',
                _profileId: profileId,
                _layerDirectory: layerConfig._layerDirectory
            };

            // Normaliser les champs popup/tooltip/sidepanel
            const normalizedDef = { ...layerDef };

            if (layerDef.popup && layerDef.popup.fields) {
                normalizedDef.popupFields = layerDef.popup.fields;
            }

            if (layerDef.tooltip && layerDef.tooltip.fields) {
                normalizedDef.tooltipFields = layerDef.tooltip.fields;
            }

            if (layerDef.sidepanel && layerDef.sidepanel.detailLayout) {
                normalizedDef.sidepanelFields = layerDef.sidepanel.detailLayout;
            }

            if (cachedData) {
                normalizedDef._cachedData = cachedData;
            }

            try {
                const layer = await loader.call(GeoLeaf._GeoJSONLoader, layerId, layerLabel, normalizedDef, baseOptions);
                // Rafraîchir le cache pour prolonger la durée de vie
                if (cachedData && GeoLeaf.ThemeCache?.store) {
                    GeoLeaf.ThemeCache.store(layerId, profileId, cachedData);
                }
                return layer;
            } catch (err) {
                return null;
            }
        } catch (error) {
            return null;
        }
    };

    /**
     * Résout le chemin du fichier de données d'une couche
     * @param {Object} layerConfig - Configuration de la couche
     * @returns {string|null} - URL complète du fichier de données
     * @private
     */
    TA._resolveDataFilePath = function (layerConfig) {
        if (!layerConfig.dataFile || !layerConfig._layerDirectory) {
            return null;
        }

        const Config = GeoLeaf.Config;
        if (!Config || !Config.getActiveProfile) {
            return null;
        }

        const activeProfile = Config.getActiveProfile();
        if (!activeProfile) {
            return null;
        }

        const profileId = activeProfile.id;
        const profileBasePath = TA._getProfilesBasePath(activeProfile);

        return `${profileBasePath}/${profileId}/${layerConfig._layerDirectory}/${layerConfig.dataFile}`;
    };

    /**
     * Résout le chemin de base des profils
     * @private
     */
    TA._getProfilesBasePath = function (activeProfile) {
        const Config = GeoLeaf.Config;
        const configured = Config?.get?.("data.profilesBasePath");

        if (typeof configured === "string" && configured.trim().length > 0) {
            return TA._normalizeBasePath(configured);
        }

        if (activeProfile && typeof activeProfile.profilesBasePath === "string") {
            return TA._normalizeBasePath(activeProfile.profilesBasePath);
        }

        return "profiles";
    };

    /**
     * Normalise un chemin (trim + supprime le / final)
     * @private
     */
    TA._normalizeBasePath = function (path) {
        const trimmed = path.trim();
        return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
    };

})(window);
