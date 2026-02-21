/*!
 * GeoLeaf Core – Config / Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

"use strict";

import { Log } from "../../log/index.js";
import { StorageHelper } from "../storage.js";
import { TaxonomyManager } from "../taxonomy.js";
import { ProfileManager } from "../profile.js";
import { ConfigNormalizer } from "../normalization.js";

/**
 * Logger unifié (défini par geoleaf.logger-shim.js chargé en premier)
 */

/**
 * Module GeoLeaf.Config
 *
 * Rôle :
 * - Centraliser la configuration de GeoLeaf (options carte, basemaps, thèmes, etc.)
 * - Charger une configuration depuis un objet JS ou un fichier JSON externe (fetch)
 * - Fournir des helpers pour lire / écrire via chemins de type "map.center" ou "basemaps.street.url"
 * - Gérer les profils métiers (tourism, etc.) et leurs ressources associées
 *
 * Architecture Phase 4 :
 * - config/loader.js       : Chargement HTTP, fetch, validation CSRF
 * - config/taxonomy.js     : Gestion taxonomie (catégories/sous-catégories)
 * - config/storage.js      : get/set/merge config, helpers paths
 * - config/normalization.js: Normalisation POI (mapping brut→GeoLeaf)
 * - config/profile.js      : Gestion profils métier (profile.json, poi.json, routes.json)
 */
const Config = {};

/* ------------------------------------------------------------------ */
/*  Module-level state                                                 */
/* ------------------------------------------------------------------ */

/**
 * Configuration interne consolidée
 * @type {Object}
 * @private
 */
Config._config = {};

/**
 * Indicateur de chargement
 * @type {boolean}
 * @private
 */
Config._isLoaded = false;

/**
 * Garde d'idempotence pour _initSubModules() — reseté par _applyConfig() avant chaque rechargement
 * @type {boolean}
 * @private
 */
Config._subModulesInitialized = false;

/**
 * Source de la configuration ("inline", "url", null)
 * @type {string|null}
 * @private
 */
Config._source = null;

/**
 * Options internes
 * @type {{autoEvent: boolean}}
 * @private
 */
Config._options = {
    /**
     * Si true, émet un événement DOM "geoleaf:config:loaded" après chargement.
     */
    autoEvent: true,
};

/* ------------------------------------------------------------------ */
/*  Core methods                                                       */
/* ------------------------------------------------------------------ */

/**
 * Initialisation du module de configuration.
 *
 * @param {Object} [options]
 * @param {Object} [options.config] - Objet de configuration fourni directement.
 * @param {string} [options.url] - URL d'un fichier JSON à charger.
 * @param {Object} [options.headers] - Headers HTTP personnalisés pour loadUrl (ex: CSRF token).
 * @param {boolean} [options.strictContentType=true] - Validation stricte du Content-Type.
 * @param {boolean} [options.autoEvent] - Désactiver ou non l'événement auto.
 * @param {Function} [options.onLoaded] - Callback appelé une fois la config disponible (après mapping).
 *
 * @param {Object}  [options.mappingHeaders]
 *        Headers HTTP spécifiques pour le mapping (sinon ceux de headers sont réutilisés).
 * @param {boolean} [options.mappingStrictContentType]
 *        Si défini, surcharge strictContentType pour le mapping.
 *
 * @returns {Promise<Object>} - Promesse résolue avec l'objet de configuration.
 */
Config.init = function (options = {}) {
    this._options = Object.assign({}, this._options, {
        autoEvent:
            typeof options.autoEvent === "boolean" ? options.autoEvent : this._options.autoEvent,
    });

    // Cas 1 : configuration inline (objet JS directement fourni)
    if (options.config && typeof options.config === "object") {
        this._applyConfig(options.config, "inline");

        // Si un profileId est spécifié, le mettre à jour après l'application de la config
        if (typeof options.profileId === "string" && options.profileId.length > 0) {
            if (!this._config.data) {
                this._config.data = {};
            }
            this._config.data.activeProfile = options.profileId;
            Log.info("[GeoLeaf.Config] Profil actif changé vers:", options.profileId);
        }

        this._maybeFireLoadedEvent();

        if (typeof options.onLoaded === "function") {
            try {
                options.onLoaded(this._config);
            } catch (e) {
                Log.error("[GeoLeaf.Config] Erreur dans onLoaded (inline) :", e);
            }
        }

        return Promise.resolve(this._config);
    }

    // Cas 2 : chargement via URL JSON
    if (typeof options.url === "string" && options.url.length > 0) {
        const loadOptions = {
            headers: options.headers,
            strictContentType:
                typeof options.strictContentType === "boolean" ? options.strictContentType : true,
        };

        const mappingUrl =
            typeof options.mappingUrl === "string" && options.mappingUrl.length > 0
                ? options.mappingUrl
                : null;

        const mappingOptions = {
            headers: options.mappingHeaders || options.headers,
            strictContentType:
                typeof options.mappingStrictContentType === "boolean"
                    ? options.mappingStrictContentType
                    : loadOptions.strictContentType,
        };

        // 1) Charger la config principale
        return (
            this.loadUrl(options.url, loadOptions)
                .then((cfg) => {
                    // Appliquer le profileId APRÈS le chargement de l'URL
                    if (typeof options.profileId === "string" && options.profileId.length > 0) {
                        if (!cfg.data) {
                            cfg.data = {};
                        }
                        cfg.data.activeProfile = options.profileId;
                        this._config.data.activeProfile = options.profileId;
                        Log.info("[GeoLeaf.Config] Profil actif changé vers:", options.profileId);
                    }
                    return cfg;
                })
                // 2) Charger le mapping catégories (si URL fournie)
                .then((cfg) => {
                    if (!mappingUrl) {
                        return cfg;
                    }

                    return this.loadTaxonomy(mappingUrl, mappingOptions)
                        .then(() => cfg)
                        .catch((err) => {
                            Log.warn(
                                "[GeoLeaf.Config] Échec du chargement du mapping catégories depuis " +
                                    mappingUrl +
                                    " (GeoLeaf continuera sans mapping dédié) :",
                                err
                            );
                            return cfg;
                        });
                })
                // 3) Appeler onLoaded une fois TOUT chargé (config + mapping)
                .then((cfg) => {
                    if (typeof options.onLoaded === "function") {
                        try {
                            options.onLoaded(cfg);
                        } catch (e) {
                            Log.error("[GeoLeaf.Config] Erreur dans onLoaded (url+mapping) :", e);
                        }
                    }
                    return cfg;
                })
                .catch((err) => {
                    Log.error("[GeoLeaf.Config] Erreur init() avec url :", err);

                    // Appeler onError si fourni
                    if (typeof options.onError === "function") {
                        try {
                            options.onError(err);
                        } catch (e) {
                            Log.error("[GeoLeaf.Config] Erreur dans onError :", e);
                        }
                    }

                    throw err; // Re-throw pour que la Promise soit rejetée
                })
        );
    }

    // Cas 3 : Aucun paramètre fourni : on se contente d'un objet vide
    this._applyConfig({}, "inline");

    // Si un profileId est spécifié, le mettre à jour
    if (typeof options.profileId === "string" && options.profileId.length > 0) {
        if (!this._config.data) {
            this._config.data = {};
        }
        this._config.data.activeProfile = options.profileId;
        Log.info("[GeoLeaf.Config] Profil actif changé vers:", options.profileId);
    }

    this._maybeFireLoadedEvent();

    if (typeof options.onLoaded === "function") {
        try {
            options.onLoaded(this._config);
        } catch (e) {
            Log.error("[GeoLeaf.Config] Erreur dans onLoaded (vide) :", e);
        }
    }

    return Promise.resolve(this._config);
};

/**
 * Initialise les sous-modules avec la référence partagée à la config.
 *
 * @private
 */
Config._initSubModules = function () {
    // B1 [PERF-01]: garde d'idempotence — évite double/triple init depuis les accesseurs defensifs
    if (this._subModulesInitialized) return;
    this._subModulesInitialized = true;

    const Storage = StorageHelper;
    const Taxonomy = TaxonomyManager;
    const Profile = ProfileManager;

    if (Storage && typeof Storage.init === "function") {
        Storage.init(this._config);
    }
    if (Taxonomy && typeof Taxonomy.init === "function") {
        Taxonomy.init(this._config);
    }
    if (Profile && typeof Profile.init === "function") {
        Profile.init(this._config);
    }
};

/**
 * Applique une configuration brute (remplace la précédente de manière fusionnée).
 *
 * @param {Object} cfg
 * @param {string} source
 * @private
 */
Config._applyConfig = function (cfg, source) {
    if (typeof cfg !== "object" || cfg === null) {
        cfg = {};
    }

    // Validation de la structure du JSON
    this._validateConfig(cfg);

    // Fusion profonde avec la configuration existante
    const Storage = StorageHelper;
    if (Storage && typeof Storage.deepMerge === "function") {
        this._config = Storage.deepMerge(this._config, cfg);
    } else {
        this._config = Object.assign({}, this._config, cfg);
    }

    // Normalisation des POI (avis) après fusion
    const Normalization = ConfigNormalizer;
    if (Array.isArray(this._config.poi) && Normalization) {
        this._config.poi = Normalization.normalizePoiArray(this._config.poi);
    }

    this._isLoaded = true;
    this._source = source || "inline";

    // Initialiser les sous-modules maintenant que _config est chargé
    // Reset du flag pour permettre une ré-initialisation propre avec la nouvelle config
    this._subModulesInitialized = false;
    this._initSubModules();

    try {
        // On récupère le bloc "logging" soit depuis le cfg brut, soit depuis la configuration consolidée
        const loggingCfg =
            cfg && typeof cfg === "object" && cfg.logging
                ? cfg.logging
                : this._config && this._config.logging
                  ? this._config.logging
                  : null;

        // Prise en compte du flag global debug
        let level = loggingCfg && loggingCfg.level;
        let debugFlag = false;
        if (cfg && typeof cfg.debug !== "undefined") {
            debugFlag = !!cfg.debug;
        } else if (this._config && typeof this._config.debug !== "undefined") {
            debugFlag = !!this._config.debug;
        }

        if (!level) {
            level = debugFlag ? "debug" : "info";
        }

        if (level && Log && typeof Log.setLevel === "function") {
            Log.setLevel(level);
            Log.info(
                "[GeoLeaf.Config] Niveau de log appliqué depuis la configuration :",
                level,
                "(debug:",
                debugFlag,
                ")"
            );
        }
    } catch (e) {
        Log.warn(
            "[GeoLeaf.Config] Impossible d'appliquer le niveau de log depuis la configuration :",
            e
        );
    }
};

/**
 * Indique si la configuration est considérée comme "chargée".
 *
 * @returns {boolean}
 */
Config.isLoaded = function () {
    return this._isLoaded;
};

/**
 * Retourne la source de la config ("inline", "url", null).
 *
 * @returns {string|null}
 */
Config.getSource = function () {
    return this._source;
};

/**
 * Envoie un événement DOM "geoleaf:config:loaded" si autoEvent = true.
 *
 * @private
 */
Config._maybeFireLoadedEvent = function () {
    if (!this._options.autoEvent) {
        return;
    }

    if (typeof document === "undefined" || typeof document.dispatchEvent !== "function") {
        return;
    }

    try {
        const event = new CustomEvent("geoleaf:config:loaded", {
            detail: {
                config: this._config,
                source: this._source,
            },
        });
        document.dispatchEvent(event);
    } catch (e) {
        // En environnement très ancien, CustomEvent peut ne pas exister
        try {
            const legacyEvent = document.createEvent("CustomEvent");
            legacyEvent.initCustomEvent("geoleaf:config:loaded", false, false, {
                config: this._config,
                source: this._source,
            });
            document.dispatchEvent(legacyEvent);
        } catch (err) {
            // On ne bloque pas le fonctionnement si l'événement échoue
            Log.warn("[GeoLeaf.Config] Impossible d'émettre l'événement geoleaf:config:loaded.");
        }
    }
};

export { Config };
