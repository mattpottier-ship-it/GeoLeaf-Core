/**
 * @fileoverview Chargeur de profil V3.0 pour GeoLeaf
 * Gère le chargement modulaire des profils avec structure V3:
 * - profile.json (métadonnées)
 * - taxonomy.json (catégories/sous-catégories)
 * - themes.json (thèmes visuels)
 * - layers.json (index des couches)
 * - layers/{layerId}/{layerId}_config.json (config par couche)
 * @module config/profile-v3-loader
 */

(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
    const Log = GeoLeaf.Log;

    /**
     * Module de chargement de profils V3.0
     * @namespace ProfileV3Loader
     */
    const ProfileV3Loader = {
        /**
         * Charge un profil v3.0 avec structure modulaire
         * @param {Object} profile - Objet profile.json v3.0
         * @param {string} baseUrl - URL de base du profil
         * @param {string} profileId - ID du profil
         * @param {number} timestamp - Timestamp pour cache busting
         * @param {Object} fetchOptions - Options de fetch
         * @returns {Promise<Object>} Profil enrichi avec toutes les données chargées
         */
        async loadV3Profile(profile, baseUrl, profileId, timestamp = Date.now(), fetchOptions = {}) {
            const Loader = GeoLeaf._ConfigLoader;

            if (!Loader) {
                throw new Error("GeoLeaf._ConfigLoader non disponible");
            }

            Log.info(`[ProfileV3Loader] Chargement profil V3.0: ${profileId}`);

            try {
                // 1. Charger les ressources en parallèle
                const [taxonomyData, themesData, layersFileData] = await Promise.all([
                    this._loadTaxonomy(profile, baseUrl, timestamp, fetchOptions),
                    this._loadThemes(profile, baseUrl, timestamp, fetchOptions),
                    this._loadLayersFile(profile, baseUrl, timestamp, fetchOptions)
                ]);

                // 2. Déterminer la source des layers
                const layersSource = layersFileData || profile.layers || [];

                // 3. Charger les configurations individuelles des layers
                const layersConfigs = await this._loadLayerConfigs(
                    layersSource,
                    baseUrl,
                    timestamp,
                    fetchOptions
                );

                // 4. Construire le profil enrichi
                const enrichedProfile = this._buildEnrichedProfile({
                    profile,
                    baseUrl,
                    profileId,
                    taxonomy: taxonomyData,
                    themes: themesData,
                    layersSource,
                    layersConfigs
                });

                Log.info("[ProfileV3Loader] Profil V3.0 chargé avec succès", {
                    profileId,
                    hasTaxonomy: !!enrichedProfile.taxonomy,
                    hasThemes: !!enrichedProfile.themes,
                    layersCount: enrichedProfile.layers ? enrichedProfile.layers.length : 0
                });

                return enrichedProfile;

            } catch (error) {
                Log.error("[ProfileV3Loader] Erreur chargement profil V3.0:", error);
                throw error;
            }
        },

        /**
         * Vérifie si des features GeoJSON ont des categoryId/subCategoryId
         * @private
         * @returns {boolean} true si au moins une feature a des catégories
         */
        _shouldLoadTaxonomy() {
            // Toujours charger la taxonomie si elle est référencée dans le profil
            // Les features GeoJSON ne sont pas encore chargées à ce stade
            return true;
        },

        /**
         * Charge taxonomy.json si référencé ET si des features ont des catégories
         * @private
         */
        async _loadTaxonomy(profile, baseUrl, timestamp, fetchOptions) {
            const Loader = GeoLeaf._ConfigLoader;
            const taxonomyFile = profile.Files?.taxonomyFile || profile.taxonomyFile;

            if (!taxonomyFile && !profile.taxonomy) {
                return null;
            }

            // Vérifier si on doit charger la taxonomy (si features ont des catégories)
            const shouldLoad = this._shouldLoadTaxonomy();
            if (!shouldLoad) {
                Log.info("[ProfileV3Loader] Taxonomy.json non chargé (aucune catégorie détectée dans les données)");
                return null;
            }

            if (taxonomyFile) {
                try {
                    const taxonomy = await Loader.fetchJson(
                        `${baseUrl}/${taxonomyFile}?t=${timestamp}`,
                        fetchOptions
                    );
                    Log.info("[ProfileV3Loader] Taxonomy.json chargé avec succès");
                    return taxonomy;
                } catch (err) {
                    Log.warn("[ProfileV3Loader] Erreur chargement taxonomy.json:", err);
                    return null;
                }
            }

            return profile.taxonomy || null;
        },

        /**
         * Charge themes.json si référencé
         * @private
         */
        async _loadThemes(profile, baseUrl, timestamp, fetchOptions) {
            const Loader = GeoLeaf._ConfigLoader;
            const themesFile = profile.Files?.themesFile || profile.themesFile;

            if (themesFile) {
                try {
                    const themes = await Loader.fetchJson(
                        `${baseUrl}/${themesFile}?t=${timestamp}`,
                        fetchOptions
                    );
                    return themes;
                } catch (err) {
                    Log.warn("[ProfileV3Loader] Erreur chargement themes.json:", err);
                    return null;
                }
            }

            return profile.themes || null;
        },

        /**
         * Charge layers.json si référencé
         * @private
         */
        async _loadLayersFile(profile, baseUrl, timestamp, fetchOptions) {
            const Loader = GeoLeaf._ConfigLoader;
            const layersFile = profile.Files?.layersFile;

            if (layersFile) {
                try {
                    const layers = await Loader.fetchJson(
                        `${baseUrl}/${layersFile}?t=${timestamp}`,
                        fetchOptions
                    );
                    return layers;
                } catch (err) {
                    Log.warn("[ProfileV3Loader] Erreur chargement layers.json:", err);
                    return null;
                }
            }

            return null;
        },

        /**
         * Charge les configurations individuelles des layers
         * @private
         */
        async _loadLayerConfigs(layersSource, baseUrl, timestamp, fetchOptions) {
            const Loader = GeoLeaf._ConfigLoader;

            if (!Array.isArray(layersSource) || layersSource.length === 0) {
                return [];
            }

            const promises = layersSource.map(async (layerRef) => {
                if (!layerRef.configFile) {
                    return {
                        id: layerRef.id,
                        config: null,
                        layerDirectory: null,
                        layerManagerId: layerRef.layerManagerId || null
                    };
                }

                const layerDirectory = layerRef.configFile.replace(/\/[^\/]+$/, '');

                try {
                    const layerConfig = await Loader.fetchJson(
                        `${baseUrl}/${layerRef.configFile}?t=${timestamp}`,
                        fetchOptions
                    );

                    return {
                        id: layerRef.id,
                        config: layerConfig,
                        layerDirectory: layerDirectory,
                        layerManagerId: layerRef.layerManagerId || null
                    };
                } catch (err) {
                    Log.error(`[ProfileV3Loader] Erreur chargement ${layerRef.configFile}:`, err);
                    return {
                        id: layerRef.id,
                        config: null,
                        layerDirectory: layerDirectory,
                        layerManagerId: layerRef.layerManagerId || null
                    };
                }
            });

            return Promise.all(promises);
        },

        /**
         * Construit le profil enrichi avec toutes les données chargées
         * @private
         */
        _buildEnrichedProfile(params) {
            const { profile, baseUrl, profileId, taxonomy, themes, layersSource, layersConfigs } = params;

            const enrichedProfile = { ...profile };

            // Ajouter le basePath pour résolution des chemins
            enrichedProfile.basePath = baseUrl;
            enrichedProfile._profileId = profileId;

            // Intégrer la taxonomie
            if (taxonomy) {
                enrichedProfile.taxonomy = taxonomy;
            }

            // Intégrer les thèmes
            if (themes) {
                enrichedProfile.themes = themes;
            }

            // Intégrer les configurations de couches
            if (layersConfigs && layersConfigs.length > 0) {
                enrichedProfile.layers = layersConfigs.map(layerData => {
                    if (layerData.config) {
                        // Ajouter le layerDirectory, profileId ET layerManagerId à la config
                        const normalized = {
                            ...layerData.config,
                            _layerDirectory: layerData.layerDirectory,
                            _profileId: profileId,
                            layerManagerId: layerData.layerManagerId || layerData.config.layerManagerId || 'geojson-default'
                        };

                        // Normaliser data.file → dataFile pour compatibilité GeoJSON loader
                        if (normalized.data && normalized.data.file && !normalized.dataFile) {
                            const dataDir = normalized.data.directory || 'data';
                            normalized.dataFile = `${dataDir}/${normalized.data.file}`;
                        }

                        return normalized;
                    }
                    // Fallback si erreur de chargement
                    const original = layersSource.find(l => l.id === layerData.id);
                    return original || { id: layerData.id, error: "Failed to load config" };
                });
            }

            return enrichedProfile;
        },

        /**
         * Détermine si un profil utilise la structure V3.0
         * @param {Object} profile - Objet profile.json
         * @returns {boolean} True si V3.0
         */
        isV3Profile(profile) {
            if (!profile || typeof profile !== 'object') {
                return false;
            }

            // Détection V3.0: présence de Files ou version >= 3.0.0
            if (profile.Files && typeof profile.Files === 'object') {
                return true;
            }

            if (profile.version) {
                const versionMatch = profile.version.match(/^(\d+)\.(\d+)/);
                if (versionMatch) {
                    const major = parseInt(versionMatch[1], 10);
                    return major >= 3;
                }
            }

            return false;
        }
    };

    // Exposer le module
    GeoLeaf._ProfileV3Loader = ProfileV3Loader;

})(window);
