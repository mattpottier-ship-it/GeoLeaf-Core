// @ts-nocheck — migration TS, typage progressif
/**
 * API Controller - Sprint 4.3 (Version Robuste)
 * Orchestrateur main for thes opérations API GeoLeaf
 * Architecture modulaire avec validation renforcée
 * @module APIController
 */
"use strict";

import { Log } from "../log/index.js";
const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
_g.GeoLeaf = _g.GeoLeaf || {};

/**
 * Contrôleur main pour l'API GeoLeaf
 * Gère l'orchestration des managers spécialisés
 */
class APIController {
    constructor() {
        this.isInitialized = false;
        this.managers = {};
        this.moduleAccessFn = null;

        // État de sanité du contrôleur
        this.healthStatus = {
            managers: 0,
            errors: [],
            lastUpdate: null,
        };
    }

    /**
     * Initialise le contrôleur et tous ses managers
     * @returns {boolean} Succès of the initialization
     */
    init() {
        try {
            if (this.isInitialized) {
                if (Log) Log.debug("[APIController] Already initialized");
                return true;
            }

            if (Log) Log.info("[APIController] Initializing API controller (Sprint 4.3 - Robust)");

            // Initialiser les managers dans l'ordre
            this._initializeManagers();

            // Configurer l'accès aux modules
            const success = this._setupModuleAccess();
            if (!success) {
                throw new Error("Module access setup failed");
            }

            // Valider l'état final
            this._validateInitialization();

            this.isInitialized = true;
            this.healthStatus.lastUpdate = new Date().toISOString();

            if (Log) Log.info("[APIController] API controller initialized successfully");
            return true;
        } catch (error) {
            this.healthStatus.errors.push({
                message: error.message,
                timestamp: new Date().toISOString(),
                stack: error.stack,
            });

            if (Log) Log.error("[APIController] Initialization failed:", error);
            return false;
        }
    }

    /**
     * Initialise tous les managers availables
     * @private
     */
    _initializeManagers() {
        const managerTypes = ["module", "initialization", "factory"];

        /* eslint-disable security/detect-object-injection -- manager type from config enum */
        managerTypes.forEach((type) => {
            const ManagerClass = this._getManagerClass(type);
            if (ManagerClass) {
                try {
                    this.managers[type] = new ManagerClass();
                    this.healthStatus.managers++;
                    if (Log) Log.debug(`[APIController] ${type} manager loaded`);
                } catch (error) {
                    if (Log) Log.warn(`[APIController] Failed to load ${type} manager:`, error);
                    this.healthStatus.errors.push({
                        manager: type,
                        error: error.message,
                    });
                }
            }
        });
        /* eslint-enable security/detect-object-injection */

        if (Log) Log.info(`[APIController] Loaded ${this.healthStatus.managers} managers`);
    }

    /**
     * Obtient la class of a manager
     * @private
     */
    /* eslint-disable security/detect-object-injection -- type from enum, className from map */
    _getManagerClass(type) {
        const classNames = {
            module: "APIModuleManager",
            initialization: "APIInitializationManager",
            factory: "APIFactoryManager",
        };

        const className = classNames[type];
        return _g.GeoLeaf.API && _g.GeoLeaf.API[className] ? _g.GeoLeaf.API[className] : null;
    }
    /* eslint-enable security/detect-object-injection */

    /**
     * Configure l'accès aux modules
     * @private
     */
    _setupModuleAccess() {
        // The module manager doit être initialisé en premier
        if (!this.managers.module) {
            if (Log) Log.error("[APIController] Module manager not available");
            return false;
        }

        // Initialiser the module manager avec the modules existants
        const initSuccess = this.managers.module.init ? this.managers.module.init() : true;
        if (!initSuccess) {
            if (Log) Log.error("[APIController] Module manager initialization failed");
            return false;
        }

        // Créer la fonction d'accès aux modules avec validation
        this.moduleAccessFn = (name) => {
            try {
                if (!name || typeof name !== "string") {
                    if (Log) Log.warn("[APIController] Invalid module name:", name);
                    return null;
                }

                if (this.managers.module && typeof this.managers.module.getModule === "function") {
                    return this.managers.module.getModule(name);
                }

                // Fallback to global access
                /* eslint-disable security/detect-object-injection -- name from controlled API arg */
                if (_g.GeoLeaf && _g.GeoLeaf[name]) {
                    return _g.GeoLeaf[name];
                }
                /* eslint-enable security/detect-object-injection */

                return null;
            } catch (error) {
                if (Log) Log.warn(`[APIController] Error accessing module ${name}:`, error);
                return null;
            }
        };

        if (Log) Log.info("[APIController] Module access configured");
        return true;
    }

    /**
     * Valiof the état of the initialization
     * @private
     */
    _validateInitialization() {
        const checks = [
            { name: "moduleAccessFn", value: this.moduleAccessFn, type: "function" },
            { name: "managers", value: this.managers, type: "object" },
            { name: "moduleManager", value: this.managers.module, type: "object" },
        ];

        const failures = checks.filter((check) => {
            return !check.value || typeof check.value !== check.type;
        });

        if (failures.length > 0) {
            const failureNames = failures.map((f) => f.name).join(", ");
            throw new Error(`Validation failed for: ${failureNames}`);
        }

        if (Log) Log.debug("[APIController] Validation passed");
    }

    /**
     * _g.GeoLeaf.init() - Initialization de carte
     */
    geoleafInit(options) {
        if (!this._ensureInitialized()) return null;

        try {
            if (!this.managers.initialization) {
                throw new Error("Initialization manager not available");
            }

            return this.managers.initialization.init(options, this.moduleAccessFn);
        } catch (error) {
            if (Log) Log.error("[APIController] geoleafInit failed:", error);
            return null;
        }
    }

    /**
     * _g.GeoLeaf.loadConfig() - Loadsment configuration
     */
    geoleafLoadConfig(input) {
        if (!this._ensureInitialized()) return Promise.resolve(null);

        try {
            if (!this.managers.initialization) {
                throw new Error("Initialization manager not available");
            }

            return this.managers.initialization.loadConfig(input, this.moduleAccessFn);
        } catch (error) {
            if (Log) Log.error("[APIController] geoleafLoadConfig failed:", error);
            return Promise.resolve(null);
        }
    }

    /**
     * _g.GeoLeaf.setTheme() - Changement de thème
     */
    geoleafSetTheme(theme) {
        if (!this._ensureInitialized()) return false;

        try {
            if (!this.managers.initialization) {
                throw new Error("Initialization manager not available");
            }

            return this.managers.initialization.setTheme(theme, this.moduleAccessFn);
        } catch (error) {
            if (Log) Log.error("[APIController] geoleafSetTheme failed:", error);
            return false;
        }
    }

    /**
     * _g.GeoLeaf.createMap() - Création multi-cartes
     */
    geoleafCreateMap(targetId, options) {
        if (!this._ensureInitialized()) return null;

        try {
            if (!this.managers.factory) {
                throw new Error("Factory manager not available");
            }

            return this.managers.factory.createMap(targetId, options, this.moduleAccessFn);
        } catch (error) {
            if (Log) Log.error("[APIController] geoleafCreateMap failed:", error);
            return null;
        }
    }

    /**
     * S'assure que le contrôleur est initialisé
     * @private
     */
    _ensureInitialized() {
        if (!this.isInitialized) {
            if (Log) Log.error("[APIController] Controller not initialized");
            return false;
        }
        return true;
    }

    /**
     * Obtient l'état de santé du contrôleur
     */
    getHealthStatus() {
        return {
            ...this.healthStatus,
            isInitialized: this.isInitialized,
            managersCount: Object.keys(this.managers).length,
            hasModuleAccess: !!this.moduleAccessFn,
        };
    }

    /**
     * Réinitializes le contrôleur
     */
    reset() {
        this.isInitialized = false;
        this.managers = {};
        this.moduleAccessFn = null;
        this.healthStatus = {
            managers: 0,
            errors: [],
            lastUpdate: null,
        };

        if (Log) Log.info("[APIController] Controller reset");
    }
}

// perf 5.9 : Instanciation lazy — création au premier accès via getter
// (évite init synchrone coûteuse de _initializeManagers — l'import)
let _apiControllerInstance = null;

function _getAPIController() {
    if (!_apiControllerInstance) {
        _apiControllerInstance = new APIController();
        // Init différée : les managers ne sont résolus qu'une fois le namespace GeoLeaf.API peuplé
        _apiControllerInstance.init();
    }
    return _apiControllerInstance;
}

if (
    !Object.getOwnPropertyDescriptor(_g.GeoLeaf, "_APIController") ||
    !Object.getOwnPropertyDescriptor(_g.GeoLeaf, "_APIController").get
) {
    Object.defineProperty(_g.GeoLeaf, "_APIController", {
        get: _getAPIController,
        configurable: true,
        enumerable: true,
    });
}

export { APIController };
