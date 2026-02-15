/**
 * API Controller - Sprint 4.3 (Version Robuste)
 * Orchestrateur principal pour les opérations API GeoLeaf
 * Architecture modulaire avec validation renforcée
 * @module APIController
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log || console;

    /**
     * Contrôleur principal pour l'API GeoLeaf
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
                lastUpdate: null
            };
        }

        /**
         * Initialise le contrôleur et tous ses managers
         * @returns {boolean} Succès de l'initialisation
         */
        init() {
            try {
                if (this.isInitialized) {
                    if (Log) Log.debug('[APIController] Already initialized');
                    return true;
                }

                if (Log) Log.info('[APIController] Initializing API controller (Sprint 4.3 - Robust)');

                // Initialiser les managers dans l'ordre
                this._initializeManagers();

                // Configurer l'accès aux modules
                const success = this._setupModuleAccess();
                if (!success) {
                    throw new Error('Module access setup failed');
                }

                // Valider l'état final
                this._validateInitialization();

                this.isInitialized = true;
                this.healthStatus.lastUpdate = new Date().toISOString();

                if (Log) Log.info('[APIController] API controller initialized successfully');
                return true;

            } catch (error) {
                this.healthStatus.errors.push({
                    message: error.message,
                    timestamp: new Date().toISOString(),
                    stack: error.stack
                });

                if (Log) Log.error('[APIController] Initialization failed:', error);
                return false;
            }
        }

        /**
         * Initialise tous les managers disponibles
         * @private
         */
        _initializeManagers() {
            const managerTypes = ['module', 'initialization', 'namespace', 'factory'];

            managerTypes.forEach(type => {
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
                            error: error.message
                        });
                    }
                }
            });

            if (Log) Log.info(`[APIController] Loaded ${this.healthStatus.managers} managers`);
        }

        /**
         * Obtient la classe d'un manager
         * @private
         */
        _getManagerClass(type) {
            const classNames = {
                module: 'APIModuleManager',
                initialization: 'APIInitializationManager',
                namespace: 'APINamespaceManager',
                factory: 'APIFactoryManager'
            };

            const className = classNames[type];
            return GeoLeaf.API && GeoLeaf.API[className] ? GeoLeaf.API[className] : null;
        }

        /**
         * Configure l'accès aux modules
         * @private
         */
        _setupModuleAccess() {
            // Le module manager doit être initialisé en premier
            if (!this.managers.module) {
                if (Log) Log.error('[APIController] Module manager not available');
                return false;
            }

            // Initialiser le module manager avec les modules existants
            const initSuccess = this.managers.module.init ? this.managers.module.init() : true;
            if (!initSuccess) {
                if (Log) Log.error('[APIController] Module manager initialization failed');
                return false;
            }

            // Créer la fonction d'accès aux modules avec validation
            this.moduleAccessFn = (name) => {
                try {
                    if (!name || typeof name !== 'string') {
                        if (Log) Log.warn('[APIController] Invalid module name:', name);
                        return null;
                    }

                    if (this.managers.module && typeof this.managers.module.getModule === 'function') {
                        return this.managers.module.getModule(name);
                    }

                    // Fallback vers l'accès global
                    if (global.GeoLeaf && global.GeoLeaf[name]) {
                        return global.GeoLeaf[name];
                    }

                    return null;
                } catch (error) {
                    if (Log) Log.warn(`[APIController] Error accessing module ${name}:`, error);
                    return null;
                }
            };

            if (Log) Log.info('[APIController] Module access configured');
            return true;
        }

        /**
         * Valide l'état de l'initialisation
         * @private
         */
        _validateInitialization() {
            const checks = [
                { name: 'moduleAccessFn', value: this.moduleAccessFn, type: 'function' },
                { name: 'managers', value: this.managers, type: 'object' },
                { name: 'moduleManager', value: this.managers.module, type: 'object' }
            ];

            const failures = checks.filter(check => {
                return !check.value || typeof check.value !== check.type;
            });

            if (failures.length > 0) {
                const failureNames = failures.map(f => f.name).join(', ');
                throw new Error(`Validation failed for: ${failureNames}`);
            }

            if (Log) Log.debug('[APIController] Validation passed');
        }

        /**
         * GeoLeaf.init() - Initialisation de carte
         */
        geoleafInit(options) {
            if (!this._ensureInitialized()) return null;

            try {
                if (!this.managers.initialization) {
                    throw new Error('Initialization manager not available');
                }

                return this.managers.initialization.init(options, this.moduleAccessFn);
            } catch (error) {
                if (Log) Log.error('[APIController] geoleafInit failed:', error);
                return null;
            }
        }

        /**
         * GeoLeaf.loadConfig() - Chargement configuration
         */
        geoleafLoadConfig(input) {
            if (!this._ensureInitialized()) return Promise.resolve(null);

            try {
                if (!this.managers.initialization) {
                    throw new Error('Initialization manager not available');
                }

                return this.managers.initialization.loadConfig(input, this.moduleAccessFn);
            } catch (error) {
                if (Log) Log.error('[APIController] geoleafLoadConfig failed:', error);
                return Promise.resolve(null);
            }
        }

        /**
         * GeoLeaf.setTheme() - Changement de thème
         */
        geoleafSetTheme(theme) {
            if (!this._ensureInitialized()) return false;

            try {
                if (!this.managers.initialization) {
                    throw new Error('Initialization manager not available');
                }

                return this.managers.initialization.setTheme(theme, this.moduleAccessFn);
            } catch (error) {
                if (Log) Log.error('[APIController] geoleafSetTheme failed:', error);
                return false;
            }
        }

        /**
         * GeoLeaf.createMap() - Création multi-cartes
         */
        geoleafCreateMap(targetId, options) {
            if (!this._ensureInitialized()) return null;

            try {
                if (!this.managers.factory) {
                    throw new Error('Factory manager not available');
                }

                return this.managers.factory.createMap(targetId, options, this.moduleAccessFn);
            } catch (error) {
                if (Log) Log.error('[APIController] geoleafCreateMap failed:', error);
                return null;
            }
        }

        /**
         * S'assure que le contrôleur est initialisé
         * @private
         */
        _ensureInitialized() {
            if (!this.isInitialized) {
                if (Log) Log.error('[APIController] Controller not initialized');
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
                hasModuleAccess: !!this.moduleAccessFn
            };
        }

        /**
         * Réinitialise le contrôleur
         */
        reset() {
            this.isInitialized = false;
            this.managers = {};
            this.moduleAccessFn = null;
            this.healthStatus = {
                managers: 0,
                errors: [],
                lastUpdate: null
            };

            if (Log) Log.info('[APIController] Controller reset');
        }
    }

    // Export vers le namespace GeoLeaf
    GeoLeaf.API = GeoLeaf.API || {};
    GeoLeaf.API.Controller = APIController;

    // Créer et exposer une instance globale _APIController
    if (!GeoLeaf._APIController) {
        const controllerInstance = new APIController();

        // Tentative d'initialisation automatique
        const initSuccess = controllerInstance.init();
        if (initSuccess) {
            GeoLeaf._APIController = controllerInstance;
            if (Log) Log.info('[APIController] Global instance created and initialized successfully');
        } else {
            if (Log) Log.warn('[APIController] Failed to auto-initialize - will try manual init later');
            GeoLeaf._APIController = controllerInstance; // Exposer quand même pour debug
        }
    }

    if (Log) Log.info('[APIController] Controller class loaded (Sprint 4.3 - Robust)');

})(window);
