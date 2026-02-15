/**
 * API Module Manager - Sprint 4.3 (Version Robuste)
 * Gestionnaire centralisé d'accès aux modules GeoLeaf
 * @module APIModuleManager
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log || console;

    /**
     * Gestionnaire d'accès aux modules GeoLeaf
     */
    class APIModuleManager {
        constructor() {
            this.modules = new Map();
            this.aliases = new Map();
            this.isInitialized = false;
            this.stats = {
                totalModules: 0,
                accessCount: 0,
                errors: 0
            };
        }

        /**
         * Initialise le gestionnaire avec les modules existants
         * @returns {boolean} Succès de l'initialisation
         */
        init() {
            try {
                if (this.isInitialized) {
                    if (Log) Log.debug('[APIModuleManager] Already initialized');
                    return true;
                }

                if (Log) Log.info('[APIModuleManager] Initializing module manager');

                // Scanner tous les modules disponibles dans le namespace GeoLeaf
                this._scanExistingModules();

                // Configurer les alias pour compatibilité
                this._setupAliases();

                this.isInitialized = true;

                if (Log) Log.info(`[APIModuleManager] Initialized with ${this.stats.totalModules} modules`);
                return true;

            } catch (error) {
                this.stats.errors++;
                if (Log) Log.error('[APIModuleManager] Initialization failed:', error);
                return false;
            }
        }

        /**
         * Scanner les modules existants dans GeoLeaf
         * @private
         */
        _scanExistingModules() {
            if (!global.GeoLeaf) return;

            const moduleList = [
                'Core', 'UI', 'Config', 'Baselayers', 'BaseLayers',
                'POI', 'GeoJSON', 'Route', 'Legend', 'LayerManager',
                'Storage', 'Filters', 'Log', 'Security', 'Utils',
                'Constants', 'Validators', 'Errors'
            ];

            moduleList.forEach(name => {
                if (global.GeoLeaf[name]) {
                    this.modules.set(name, global.GeoLeaf[name]);
                    this.stats.totalModules++;
                }
            });

            // Scanner les modules privés (préfixe _)
            Object.keys(global.GeoLeaf).forEach(key => {
                if (key.startsWith('_') && !this.modules.has(key)) {
                    this.modules.set(key, global.GeoLeaf[key]);
                    this.stats.totalModules++;
                }
            });
        }

        /**
         * Configure les alias pour compatibilité
         * @private
         */
        _setupAliases() {
            const aliases = {
                'Baselayers': 'BaseLayers',
                'BaseLayers': 'Baselayers',
                'Logger': 'Log',
                'Log': 'Logger'
            };

            Object.entries(aliases).forEach(([alias, target]) => {
                if (this.modules.has(target)) {
                    this.aliases.set(alias, target);
                }
            });
        }

        /**
         * Obtient un module par nom
         * @param {string} name - Nom du module
         * @returns {*} Module ou null si non trouvé
         */
        getModule(name) {
            try {
                this.stats.accessCount++;

                if (!name || typeof name !== 'string') {
                    if (Log) Log.warn(`[APIModuleManager] Invalid module name:`, name);
                    this.stats.errors++;
                    return null;
                }

                // Recherche directe
                if (this.modules.has(name)) {
                    return this.modules.get(name);
                }

                // Recherche par alias
                if (this.aliases.has(name)) {
                    const targetName = this.aliases.get(name);
                    return this.modules.get(targetName);
                }

                // Fallback vers accès global direct
                if (global.GeoLeaf && global.GeoLeaf[name]) {
                    // Ajouter à notre cache pour les prochains accès
                    this.modules.set(name, global.GeoLeaf[name]);
                    this.stats.totalModules++;
                    return global.GeoLeaf[name];
                }

                // Module non trouvé
                if (Log) Log.debug(`[APIModuleManager] Module '${name}' not found`);
                return null;

            } catch (error) {
                this.stats.errors++;
                if (Log) Log.error(`[APIModuleManager] Error accessing module '${name}':`, error);
                return null;
            }
        }

        /**
         * Enregistre manuellement un module
         * @param {string} name - Nom du module
         * @param {*} module - Instance du module
         */
        registerModule(name, module) {
            try {
                if (!name || typeof name !== 'string') {
                    throw new Error('Module name must be a non-empty string');
                }

                if (!module) {
                    throw new Error('Module cannot be null or undefined');
                }

                this.modules.set(name, module);
                this.stats.totalModules++;

                if (Log) Log.debug(`[APIModuleManager] Module '${name}' registered`);
                return true;

            } catch (error) {
                this.stats.errors++;
                if (Log) Log.error(`[APIModuleManager] Failed to register module '${name}':`, error);
                return false;
            }
        }

        /**
         * Vérifie si un module existe
         * @param {string} name - Nom du module
         * @returns {boolean}
         */
        hasModule(name) {
            try {
                return this.modules.has(name) ||
                       this.aliases.has(name) ||
                       !!(global.GeoLeaf && global.GeoLeaf[name]);
            } catch (error) {
                if (Log) Log.error(`[APIModuleManager] Error checking module '${name}':`, error);
                return false;
            }
        }

        /**
         * Obtient la liste des modules disponibles
         * @returns {Array<string>}
         */
        getModuleList() {
            const moduleNames = Array.from(this.modules.keys());

            // Ajouter les modules du namespace global non encore dans notre cache
            if (global.GeoLeaf) {
                Object.keys(global.GeoLeaf).forEach(key => {
                    if (!moduleNames.includes(key)) {
                        moduleNames.push(key);
                    }
                });
            }

            return moduleNames.sort();
        }

        /**
         * Obtient les statistiques d'usage
         * @returns {Object}
         */
        getStats() {
            return {
                ...this.stats,
                cachedModules: this.modules.size,
                aliases: this.aliases.size,
                isInitialized: this.isInitialized
            };
        }

        /**
         * Rafraîchit le cache des modules
         */
        refresh() {
            if (Log) Log.info('[APIModuleManager] Refreshing module cache');

            this.modules.clear();
            this.aliases.clear();
            this.stats.totalModules = 0;

            this._scanExistingModules();
            this._setupAliases();
        }

        /**
         * Réinitialise le gestionnaire
         */
        reset() {
            this.modules.clear();
            this.aliases.clear();
            this.isInitialized = false;
            this.stats = {
                totalModules: 0,
                accessCount: 0,
                errors: 0
            };

            if (Log) Log.info('[APIModuleManager] Manager reset');
        }
    }

    // Export vers le namespace GeoLeaf
    GeoLeaf.API = GeoLeaf.API || {};
    GeoLeaf.API.APIModuleManager = APIModuleManager; // Nom correct pour controller
    GeoLeaf.API.ModuleManager = APIModuleManager; // Alias pour compatibilité

    if (Log) Log.info('[APIModuleManager] Module manager loaded (Sprint 4.3 - Robust)');

})(window);
