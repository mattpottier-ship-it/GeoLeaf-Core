/**
 * API Factory Manager - Sprint 4.3 (Version Robuste)
 * Gestionnaire pour la création d'instances multi-cartes
 * @module APIFactoryManager
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log || console;

    /**
     * Gestionnaire de factory pour multi-cartes
     */
    class APIFactoryManager {
        constructor() {
            this.isReady = true;
            this.mapInstances = new Map();
            this.stats = {
                mapsCreated: 0,
                errors: 0
            };
        }

        /**
         * Initialise le gestionnaire avec la fonction d'accès aux modules
         * @param {Function} getModule - Fonction d'accès aux modules
         * @returns {boolean} Succès
         */
        init(getModule) {
            try {
                if (!getModule || typeof getModule !== 'function') {
                    throw new Error('getModule function is required');
                }

                this.getModule = getModule;

                if (Log) Log.info('[APIFactoryManager] Factory manager initialized');
                return true;

            } catch (error) {
                this.stats.errors++;
                if (Log) Log.error('[APIFactoryManager] Initialization failed:', error);
                return false;
            }
        }

        /**
         * Crée une nouvelle instance de carte
         * @param {string} targetId - ID de l'élément cible
         * @param {Object} options - Options de configuration
         * @param {Function} getModule - Fonction d'accès aux modules
         * @returns {*} Instance de carte ou null
         */
        createMap(targetId, options, getModule) {
            try {
                this.stats.mapsCreated++;

                if (!targetId) {
                    throw new Error('Target ID is required');
                }

                const Core = getModule('Core');
                if (!Core || typeof Core.init !== 'function') {
                    throw new Error('Core module not available for map creation');
                }

                // Créer la carte avec les options fournies
                const mapOptions = {
                    target: targetId,
                    ...options
                };

                const mapInstance = Core.init(mapOptions);

                if (mapInstance) {
                    this.mapInstances.set(targetId, mapInstance);
                    if (Log) Log.info(`[APIFactoryManager] Map created for target: ${targetId}`);
                }

                return mapInstance;

            } catch (error) {
                this.stats.errors++;
                if (Log) Log.error(`[APIFactoryManager] Failed to create map for ${targetId}:`, error);
                return null;
            }
        }

        /**
         * Obtient une instance de carte par ID
         * @param {string} targetId - ID de l'élément cible
         * @returns {*} Instance de carte ou null
         */
        getMapInstance(targetId) {
            return this.mapInstances.get(targetId) || null;
        }

        /**
         * Obtient toutes les instances de carte
         * @returns {Array} Liste des instances
         */
        getAllMapInstances() {
            return Array.from(this.mapInstances.values());
        }

        /**
         * Obtient les statistiques
         */
        getStats() {
            return {
                ...this.stats,
                activeInstances: this.mapInstances.size,
                isReady: this.isReady
            };
        }

        /**
         * Réinitialise le gestionnaire
         */
        reset() {
            this.mapInstances.clear();
            this.getModule = null;
            this.stats = {
                mapsCreated: 0,
                errors: 0
            };

            if (Log) Log.info('[APIFactoryManager] Manager reset');
        }
    }

    // Export vers le namespace GeoLeaf
    GeoLeaf.API = GeoLeaf.API || {};
    GeoLeaf.API.APIFactoryManager = APIFactoryManager; // Nom correct pour controller
    GeoLeaf.API.FactoryManager = APIFactoryManager; // Alias pour compatibilité

    if (Log) Log.info('[APIFactoryManager] Factory manager loaded (Sprint 4.3 - Robust)');

})(window);
