/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

"use strict";

import { Log } from '../log/index.js';
import { ProfileLoader as ConfigLoader } from './loader.js';
import { ConfigNormalizer } from './normalization.js';
import { ProfileLoader as ModularProfileLoader } from './profile-loader.js';


/**
 * Logger unifié
 */

/**
 * Module Config.Profile
 *
 * Responsabilités :
 * - Chargement des profils métier (tourism, etc.)
 * - Gestion des ressources de profil : profile.json, poi.json, routes.json, mapping.json
 * - API de consultation : getActiveProfile*()
 * - Événements DOM : geoleaf:profile:loaded
 */
const ProfileModule = {
    /**
     * Configuration interne (référence partagée)
     * @type {Object}
     * @private
     */
    _config: null,

    /**
     * Profil actuellement actif (ID du profil).
     * @type {string|null}
     * @private
     */
    _activeProfileId: null,

    /**
     * Description du profil actif (contenu de profile.json).
     * @type {Object|null}
     * @private
     */
    _activeProfile: null,

    /**
     * Données rattachées au profil actif :
     * - poi.json normalisé
     * - routes.json
     * - mapping.json
     * @type {{poi: Array, routes: Array, mapping: Object|null}}
     * @private
     */
    _activeProfileData: {
        poi: [],
        routes: [],
        mapping: null
    },

    /**
     * Initialise le module avec une référence à la config.
     *
     * @param {Object} config - Référence à l'objet de configuration global
     */
    init(config) {
        this._config = config;
    },

    /**
     * Indique si l'usage de mapping.json pour normaliser les POI de profil est activé.
     *
     * 🔎 Cherche plusieurs noms possibles dans config.data pour rester robuste :
     *   - config.data.enableProfilePoiMapping (nom recommandé)
     *   - config.data.useProfilePoiMapping
     *   - config.data.useMapping (compatibilité éventuelle)
     *
     * @returns {boolean} true si le mapping doit être utilisé, false sinon.
     */
    isProfilePoiMappingEnabled() {
        const dataCfg = this._config && this._config.data;
        if (!dataCfg || typeof dataCfg !== "object") {
            return true; // par défaut : mapping actif
        }

        if (typeof dataCfg.enableProfilePoiMapping === "boolean") {
            return dataCfg.enableProfilePoiMapping;
        }
        if (typeof dataCfg.useProfilePoiMapping === "boolean") {
            return dataCfg.useProfilePoiMapping;
        }
        if (typeof dataCfg.useMapping === "boolean") {
            return dataCfg.useMapping;
        }

        return true;
    },

    /**
     * Charge les ressources liées au profil actif :
     * - profile.json
     * - poi.json
     * - mapping.json
     * - routes.json
     *
     * Utilise config.data.activeProfile et config.data.profilesBasePath.
     * Injecte aussi, pour compatibilité, les POI et routes dans this._config.poi / this._config.routes.
     * Injecte désormais la taxonomie (categories) depuis profile.json dans this._config.categories.
     *
     * @param {Object} [options]
     * @param {Object} [options.headers] - Headers HTTP optionnels.
     * @param {boolean} [options.strictContentType=true] - Validation stricte du Content-Type.
     * @returns {Promise<Object>} Configuration consolidée incluant les données du profil.
     */
    loadActiveProfileResources(options = {}) {
        const dataCfg = this._config && this._config.data;
        if (!dataCfg || !dataCfg.activeProfile) {
            Log.info(
                "[GeoLeaf.Config.Profile] Aucun profil actif défini dans config.data.activeProfile ; aucun chargement de profil effectué."
            );
            return Promise.resolve(this._config);
        }

        // Nouveau : mode layers-only (pas de poi.json / routes.json). Par défaut activé.
        const useLegacyProfileData =
            typeof dataCfg.useLegacyProfileData === "boolean"
                ? dataCfg.useLegacyProfileData
                : false;

        const profileId = dataCfg.activeProfile;
        const basePath = dataCfg.profilesBasePath || "data/profiles";
        const baseUrl = `${basePath}/${profileId}`;

        Log.info("[GeoLeaf.Config.Profile] Début du chargement du profil :", {
            profileId,
            baseUrl,
            configData: dataCfg
        });

        const fetchOptions = {
            headers: options.headers || {},
            strictContentType:
                typeof options.strictContentType === "boolean"
                    ? options.strictContentType
                    : true
        };

        const Loader = ConfigLoader;
        const Normalization = ConfigNormalizer;

        if (!Loader || !Normalization) {
            Log.error("[GeoLeaf.Config.Profile] Modules Loader ou Normalization non disponibles.");
            return Promise.reject(new Error("Required modules not available"));
        }

        // 🔧 Nouveau : pilotage global de l'usage de mapping.json via config.data.*
        const isPoiMappingEnabled = this.isProfilePoiMappingEnabled();
        if (!isPoiMappingEnabled) {
            Log.info(
                "[GeoLeaf.Config.Profile] Mapping de POI désactivé via configuration globale ; " +
                "les POI du profil seront considérés comme déjà normalisés."
            );
        }

        Log.info("[GeoLeaf.Config.Profile] Chargement des ressources du profil actif :", {
            profileId,
            baseUrl
        });

        const timestamp = Date.now();

        // Branche legacy (maintien backward compat) : charge poi.json/routes.json
        if (useLegacyProfileData) {
            // Si le mapping est désactivé, on ne charge pas mapping.json (Promise.resolve(null))
            const mappingPromise = isPoiMappingEnabled
                ? Loader.fetchJson(`${baseUrl}/mapping.json?t=${timestamp}`, fetchOptions)
                : Promise.resolve(null);

            // routes.json est optionnel - on tente de le charger mais on tolère son absence
            const routesPromise = Loader.fetchJson(`${baseUrl}/routes.json?t=${timestamp}`, fetchOptions)
                .catch(() => {
                    Log.info("[GeoLeaf.Config.Profile] routes.json non disponible ou invalide, utilisation d'un tableau vide.");
                    return [];
                });

            return Promise.all([
                Loader.fetchJson(`${baseUrl}/profile.json?t=${timestamp}`, fetchOptions),
                Loader.fetchJson(`${baseUrl}/poi.json?t=${timestamp}`, fetchOptions),
                mappingPromise,
                routesPromise
            ])
                .then(([profile, poi, mapping, routes]) => {
                    return this._finalizeProfileLoad({
                        profile,
                        poi,
                        routes,
                        mapping,
                        mappingEnabled: isPoiMappingEnabled
                    });
                })
                .catch((err) => {
                    Log.error(
                        "[GeoLeaf.Config.Profile] Erreur lors du chargement des ressources du profil actif :",
                        err
                    );
                    return this._config;
                });
        }

        // Nouveau chemin : layers-only. On charge d'abord profile.json pour vérifier si mapping est requis.
        return Loader.fetchJson(`${baseUrl}/profile.json?t=${timestamp}`, fetchOptions)
            .then((profile) => {
                // Utiliser la logique de détection du ProfileLoader pour cohérence
                const isModular = ModularProfileLoader && ModularProfileLoader.isModularProfile(profile);

                if (isModular) {
                    Log.info("[GeoLeaf.Config.Profile] Profil modulaire détecté - Chargement modulaire");
                    // Pour profil modulaire, retourner directement la config (pas besoin du .then suivant)
                    return this._loadModularProfile(profile, baseUrl, timestamp, fetchOptions);
                }

                // Version 2.0 (ancien comportement)
                // Vérifier si au moins une couche a normalized:false (nécessite mapping)
                let requiresMapping = false;
                if (profile && Array.isArray(profile.layers)) {
                    requiresMapping = profile.layers.some(layer => layer.normalized === false);
                }

                // Charger mapping seulement si requis
                const mappingPromise = isPoiMappingEnabled && requiresMapping
                    ? Loader.fetchJson(`${baseUrl}/mapping.json?t=${timestamp}`, fetchOptions).catch((err) => {
                          Log.error("[GeoLeaf.Config.Profile] mapping.json requis (normalized:false) mais non trouvé ou invalide.", err);
                          return null;
                      })
                    : Promise.resolve(null);

                return Promise.all([Promise.resolve(profile), mappingPromise]);
            })
            .then((result) => {
                // Si c'est un profil modulaire, on le retourne directement (pas un array)
                if (result && !Array.isArray(result)) {
                    return result;
                }

                // Sinon c'est un array [profile, mapping] (v2.0)
                const [profile, mapping] = result;
                this._activeProfileId = profileId;
                this._activeProfile = profile || null;

                Log.info("[GeoLeaf.Config.Profile] Profil chargé (layers-only)", {
                    profileId,
                    profileLoaded: !!profile,
                    profileKeys: profile ? Object.keys(profile) : []
                });

                // Dans ce mode, on ne précharge pas les POI/Routes : ils seront lus via GeoJSON layers.
                this._activeProfileData = {
                    poi: [],
                    routes: [],
                    mapping: mapping && typeof mapping === "object" ? mapping : null
                };

                // Taxonomie : reste depuis profile.json
                if (
                    profile &&
                    typeof profile === "object" &&
                    profile.taxonomy &&
                    profile.taxonomy.categories &&
                    typeof profile.taxonomy.categories === "object" &&
                    !Array.isArray(profile.taxonomy.categories)
                ) {
                    this._config.categories = profile.taxonomy.categories;
                    Log.info(
                        "[GeoLeaf.Config.Profile] Taxonomie des catégories chargée (layers-only).",
                        {
                            profileId,
                            categoriesCount: Object.keys(profile.taxonomy.categories || {}).length
                        }
                    );
                }

                // Stockage par profil
                if (
                    !this._config.profiles ||
                    typeof this._config.profiles !== "object" ||
                    Array.isArray(this._config.profiles)
                ) {
                    this._config.profiles = {};
                }

                this._config.profiles[profileId] = {
                    profile: this._activeProfile,
                    poi: this._activeProfileData.poi,
                    routes: this._activeProfileData.routes,
                    mapping: this._activeProfileData.mapping
                };

                // Événement pour les autres modules
                this._fireProfileLoadedEvent(profileId, {
                    profile: this._activeProfile,
                    poi: this._activeProfileData.poi,
                    routes: this._activeProfileData.routes,
                    mapping: this._activeProfileData.mapping
                });

                return this._config;
            })
            .catch((err) => {
                Log.error(
                    "[GeoLeaf.Config.Profile] Erreur lors du chargement des ressources du profil actif :",
                    err
                );
                return this._config;
            });
    },

    /**
     * Charge un profil modulaire avec structure modulaire
     * @param {Object} profile - Objet profile.json modulaire
     * @param {string} baseUrl - URL de base du profil
     * @param {number} timestamp - Timestamp pour cache busting
     * @param {Object} fetchOptions - Options de fetch
     * @returns {Promise<Object>} Config consolidée
     * @private
     */
    _loadModularProfile(profile, baseUrl, timestamp, fetchOptions) {
        const profileId = this._config.data.activeProfile;

        // Utiliser le ProfileLoader pour charger le profil
        if (!ModularProfileLoader) {
            Log.error("[GeoLeaf.Config.Profile] ProfileLoader non disponible");
            return Promise.reject(new Error("ProfileLoader non disponible"));
        }

        return ModularProfileLoader.loadModularProfile(
            profile,
            baseUrl,
            profileId,
            timestamp,
            fetchOptions
        ).then(enrichedProfile => {
            // Stocker le profil enrichi
            this._activeProfileId = profileId;
            this._activeProfile = enrichedProfile;

            Log.info("[GeoLeaf.Config.Profile] Profil modulaire chargé avec succès", {
                profileId,
                hasTaxonomy: !!enrichedProfile.taxonomy,
                hasThemes: !!enrichedProfile.themes,
                layersCount: enrichedProfile.layers ? enrichedProfile.layers.length : 0
            });

            this._activeProfileData = {
                poi: [],
                routes: [],
                mapping: null
            };

            // Stocker la taxonomie dans config.categories pour compatibilité
            if (enrichedProfile.taxonomy && enrichedProfile.taxonomy.categories) {
                this._config.categories = enrichedProfile.taxonomy.categories;
                Log.info("[GeoLeaf.Config.Profile] Taxonomie chargée depuis profil modulaire", {
                    categoriesCount: Object.keys(enrichedProfile.taxonomy.categories || {}).length
                });
            }

            // Copier toutes les propriétés du profil dans this._config
            Object.keys(enrichedProfile).forEach(key => {
                if (key !== 'layers' && key !== 'taxonomy' && key !== 'themes') {
                    this._config[key] = enrichedProfile[key];
                }
            });

            // Stocker par profil
            if (!this._config.profiles || typeof this._config.profiles !== "object") {
                this._config.profiles = {};
            }

            this._config.profiles[profileId] = {
                profile: this._activeProfile,
                poi: [],
                routes: [],
                mapping: null
            };

            // Événement
            this._fireProfileLoadedEvent(profileId, {
                profile: this._activeProfile,
                poi: [],
                routes: [],
                mapping: null
            });

            return enrichedProfile;
        });
    },

    // Factorise la fin du chargement (branche legacy uniquement)
    _finalizeProfileLoad({ profile, poi, routes, mapping, mappingEnabled }) {
        const Normalization = ConfigNormalizer;

        this._activeProfile = profile || null;

        Log.info(
            "[GeoLeaf.Config.Profile] Profil chargé depuis profile.json :",
            {
                profileId: this._activeProfileId,
                profileLoaded: profile !== null && profile !== undefined,
                profileKeys: profile ? Object.keys(profile) : []
            }
        );

        // Si le mapping est coupé au niveau global, on l'ignore même s'il existe
        const mappingForNormalization =
            mappingEnabled && mapping && typeof mapping === "object"
                ? mapping
                : null;

        // 1) Normalisation STRUCTURELLE des POI
        const structurallyNormalizedPoi = Array.isArray(poi)
            ? Normalization.normalizePoiWithMapping(poi, mappingForNormalization)
            : [];

        // 2) Normalisation métier des avis
        const normalizedPoi = Normalization.normalizePoiArray(structurallyNormalizedPoi);

        const safeMapping = mappingForNormalization;
        const safeRoutes = Array.isArray(routes) ? routes : [];

        this._activeProfileData = {
            poi: normalizedPoi,
            mapping: safeMapping,
            routes: safeRoutes
        };

        // Injection rétrocompatible dans la config globale
        if (normalizedPoi.length) {
            this._config.poi = normalizedPoi;
        }
        if (safeRoutes.length) {
            this._config.routes = safeRoutes;
        }

        // Taxonomie
        if (
            profile &&
            typeof profile === "object" &&
            profile.taxonomy &&
            profile.taxonomy.categories &&
            typeof profile.taxonomy.categories === "object" &&
            !Array.isArray(profile.taxonomy.categories)
        ) {
            this._config.categories = profile.taxonomy.categories;
            Log.info(
                "[GeoLeaf.Config.Profile] Taxonomie des catégories chargée depuis le profil actif.",
                {
                    profileId: this._activeProfileId,
                    categoriesCount: Object.keys(profile.taxonomy.categories || {}).length
                }
            );
        }

        // Stockage par profil
        if (
            !this._config.profiles ||
            typeof this._config.profiles !== "object" ||
            Array.isArray(this._config.profiles)
        ) {
            this._config.profiles = {};
        }

        this._config.profiles[this._activeProfileId] = {
            profile: this._activeProfile,
            poi: this._activeProfileData.poi,
            routes: this._activeProfileData.routes,
            mapping: this._activeProfileData.mapping
        };

        // Événement
        this._fireProfileLoadedEvent(this._activeProfileId, {
            profile: this._activeProfile,
            poi: this._activeProfileData.poi,
            routes: this._activeProfileData.routes,
            mapping: this._activeProfileData.mapping
        });

        return this._config;
    },

    /**
     * Retourne l'identifiant du profil actuellement chargé (ou null).
     *
     * @returns {string|null}
     */
    getActiveProfileId() {
        return this._activeProfileId;
    },

    /**
     * Retourne l'objet profile.json du profil actif (ou null).
     *
     * @returns {Object|null}
     */
    getActiveProfile() {
        return this._activeProfile;
    },

    /**
     * Retourne le tableau de POI normalisés du profil actif.
     *
     * @returns {Array}
     */
    getActiveProfilePoi() {
        return (this._activeProfileData && Array.isArray(this._activeProfileData.poi))
            ? this._activeProfileData.poi
            : [];
    },

    /**
     * Retourne le tableau de routes du profil actif.
     *
     * @returns {Array}
     */
    getActiveProfileRoutes() {
        return (this._activeProfileData && Array.isArray(this._activeProfileData.routes))
            ? this._activeProfileData.routes
            : [];
    },

    /**
     * Retourne l'objet de mapping du profil actif (mapping.json).
     *
     * @returns {Object|null}
     */
    getActiveProfileMapping() {
        return (this._activeProfileData && this._activeProfileData.mapping)
            ? this._activeProfileData.mapping
            : null;
    },

    /**
     * Retourne la configuration des icônes depuis la taxonomie du profil actif.
     *
     * @returns {Object|null}
     */
    getIconsConfig() {
        return (this._activeProfile && this._activeProfile.taxonomy && this._activeProfile.taxonomy.icons)
            ? this._activeProfile.taxonomy.icons
            : null;
    },

    /**
     * Retourne les configurations de couches chargées depuis le profil actif modulaire
     *
     * @returns {Array|null}
     */
    getActiveProfileLayersConfig() {
        return (this._activeProfile && this._activeProfile.layers)
            ? this._activeProfile.layers
            : null;
    },

    /**
     * Émet un événement DOM "geoleaf:profile:loaded" lorsque le profil
     * actif et ses données associées sont chargés.
     *
     * @param {string} profileId
     * @param {Object} payload
     * @private
     */
    _fireProfileLoadedEvent(profileId, payload) {
        if (typeof document === "undefined" || typeof document.dispatchEvent !== "function") {
            return;
        }

        try {
            const event = new CustomEvent("geoleaf:profile:loaded", {
                detail: {
                    profileId,
                    data: payload
                }
            });
            document.dispatchEvent(event);
        } catch (e) {
            try {
                const legacyEvent = document.createEvent("CustomEvent");
                legacyEvent.initCustomEvent(
                    "geoleaf:profile:loaded",
                    false,
                    false,
                    {
                        profileId,
                        data: payload
                    }
                );
                document.dispatchEvent(legacyEvent);
            } catch (err) {
                Log.warn(
                    "[GeoLeaf.Config.Profile] Impossible d'émettre l'événement geoleaf:profile:loaded."
                );
            }
        }
    }
};

// Exposer le module
const ProfileManager = ProfileModule;
export { ProfileManager };
