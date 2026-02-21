/**
 * Module Theme Loader
 * Charge et met en cache le fichier themes.json
 *
 * DÉPENDANCES:
 * - GeoLeaf.Log (optionnel)
 * - GeoLeaf.Core.getActiveProfile()
 *
 * EXPOSE:
 * - GeoLeaf._ThemeLoader
 *
 * @module _ThemeLoader
 * @private
 */
"use strict";

import { Log } from '../log/index.js';
import { FetchHelper } from '../utils/fetch-helper.js';


/**
 * Cache pour les configurations de thèmes
 * @type {Map<string, Object>}
 */
const _cache = new Map();

/**
 * Promises en cours de chargement
 * @type {Map<string, Promise>}
 */
const _loadingPromises = new Map();

/**
 * Module Theme Loader
 * @namespace _ThemeLoader
 * @private
 */
const _ThemeLoader = {
    /**
     * Charge le fichier themes.json pour un profil
     * @param {string} profileId - ID du profil
     * @returns {Promise<Object>} Configuration des thèmes
     */
    loadThemesConfig(profileId) {
        if (Log) Log.debug("[ThemeLoader] loadThemesConfig appelé pour:", profileId);

        // Vérifier le cache
        if (_cache.has(profileId)) {
            if (Log) Log.debug("[ThemeLoader] Config en cache pour:", profileId);
            return Promise.resolve(_cache.get(profileId));
        }

        // Vérifier si déjà en cours de chargement
        if (_loadingPromises.has(profileId)) {
            if (Log) Log.debug("[ThemeLoader] Chargement déjà en cours pour:", profileId);
            return _loadingPromises.get(profileId);
        }

        // Construire le chemin du fichier
        // Utiliser un chemin relatif depuis la racine du projet
        // Si on est dans /demo/, on remonte avec ../
        const isInDemo = window.location.pathname.includes('/demo/');
        const basePath = isInDemo ? '../' : '';
        const themesPath = `${basePath}profiles/${profileId}/themes.json`;

        // Sprint 3.3: Unified fetch using FetchHelper with timeout and retry
        // FetchHelper: imported from utils/fetch-helper.js
        let loadPromise;

        if (FetchHelper) {
            // Use enhanced FetchHelper with timeout and retry
            loadPromise = FetchHelper.get(themesPath, {
                timeout: 8000,
                retries: 1,
                parseResponse: true
            })
            .then((data) => {
                if (Log) Log.debug("[ThemeLoader] Fichier chargé:", themesPath);

                // Valider la structure
                const validated = this._validateConfig(data);

                // Mettre en cache
                _cache.set(profileId, validated);
                _loadingPromises.delete(profileId);

                return validated;
            })
            .catch((err) => {
                if (Log) Log.warn("[ThemeLoader] Erreur chargement themes.json:", err.message);
                _loadingPromises.delete(profileId);
                throw err;
            });
        } else {
            // Fallback to raw fetch if FetchHelper not available
            loadPromise = fetch(themesPath)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Erreur HTTP ${response.status} lors du chargement de ${themesPath}`);
                    }
                    return response.json();
                })
                .then((data) => {
                    if (Log) Log.debug("[ThemeLoader] Fichier chargé:", themesPath);

                    // Valider la structure
                    const validated = this._validateConfig(data);

                    // Mettre en cache
                    _cache.set(profileId, validated);
                    _loadingPromises.delete(profileId);

                    return validated;
                })
                .catch((err) => {
                    if (Log) Log.warn("[ThemeLoader] Erreur chargement themes.json:", err.message);
                    _loadingPromises.delete(profileId);
                    throw err;
                });
        }

        // Stocker la promesse en cours
        _loadingPromises.set(profileId, loadPromise);

        return loadPromise;
    },

    /**
     * Valide et normalise la configuration des thèmes
     * @param {Object} config - Configuration brute
     * @returns {Object} Configuration validée
     * @private
     */
    _validateConfig(config) {
        if (!config || typeof config !== 'object') {
            throw new Error("Configuration de thèmes invalide");
        }

        // Valeurs par défaut pour config
        const validatedConfig = {
            config: {
                primaryThemes: {
                    enabled: true,
                    position: "top-map",
                    ...(config.config?.primaryThemes || {})
                },
                secondaryThemes: {
                    enabled: true,
                    placeholder: "Sélectionner un thème...",
                    showNavigationButtons: true,
                    position: "top-layermanager",
                    ...(config.config?.secondaryThemes || {})
                }
            },
            themes: [],
            defaultTheme: config.defaultTheme || null
        };

        // Valider les thèmes
        if (!Array.isArray(config.themes)) {
            if (Log) Log.warn("[ThemeLoader] Aucun thème défini dans la configuration");
            return validatedConfig;
        }

        // Normaliser chaque thème
        validatedConfig.themes = config.themes.map((theme) => {
            if (!theme.id) {
                if (Log) Log.warn("[ThemeLoader] Thème sans ID ignoré");
                return null;
            }

            return {
                id: theme.id,
                label: theme.label || theme.id,
                type: theme.type || "secondary", // Par défaut: secondary
                description: theme.description || "",
                icon: theme.icon || "",
                layers: Array.isArray(theme.layers) ? theme.layers : []
            };
        }).filter(Boolean); // Supprimer les thèmes invalides

        // Vérifier qu'il y a au moins un thème
        if (validatedConfig.themes.length === 0) {
            throw new Error("Aucun thème valide trouvé dans la configuration");
        }

        // Vérifier que le defaultTheme existe
        if (validatedConfig.defaultTheme) {
            const defaultExists = validatedConfig.themes.some(
                (t) => t.id === validatedConfig.defaultTheme
            );
            if (!defaultExists) {
                if (Log) Log.warn("[ThemeLoader] defaultTheme introuvable, utilisation du premier thème");
                validatedConfig.defaultTheme = validatedConfig.themes[0].id;
            }
        } else {
            // Pas de defaultTheme défini, utiliser le premier
            validatedConfig.defaultTheme = validatedConfig.themes[0].id;
        }

        if (Log) Log.debug("[ThemeLoader] Configuration validée:", validatedConfig.themes.length, "thèmes");

        return validatedConfig;
    },

    /**
     * Vide le cache (pour tests ou rechargement)
     * @param {string} [profileId] - ID du profil (optionnel, vide tout si non spécifié)
     */
    clearCache(profileId) {
        if (profileId) {
            _cache.delete(profileId);
            _loadingPromises.delete(profileId);
            if (Log) Log.debug("[ThemeLoader] Cache vidé pour:", profileId);
        } else {
            _cache.clear();
            _loadingPromises.clear();
            if (Log) Log.debug("[ThemeLoader] Cache complet vidé");
        }
    }
};

export { _ThemeLoader as ThemeLoader };
