/**
 * API Namespace Manager - Sprint 4.3 (Version Robuste)
 * Gestionnaire des opérations sur les namespaces GeoLeaf
 * @module APINamespaceManager
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log || console;

    /**
     * Gestionnaire des namespaces GeoLeaf
     */
    class APINamespaceManager {
        constructor() {
            this.isReady = true;
            this.stats = {
                operations: 0,
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

                if (Log) Log.info('[APINamespaceManager] Namespace manager initialized');
                return true;

            } catch (error) {
                this.stats.errors++;
                if (Log) Log.error('[APINamespaceManager] Initialization failed:', error);
                return false;
            }
        }

        /**
         * Obtient les statistiques
         */
        getStats() {
            return {
                ...this.stats,
                isReady: this.isReady
            };
        }

        /**
         * Réinitialise le gestionnaire
         */
        reset() {
            this.getModule = null;
            this.stats = {
                operations: 0,
                errors: 0
            };

            if (Log) Log.info('[APINamespaceManager] Manager reset');
        }
    }

    // Export vers le namespace GeoLeaf
    GeoLeaf.API = GeoLeaf.API || {};
    GeoLeaf.API.APINamespaceManager = APINamespaceManager; // Nom correct pour controller
    GeoLeaf.API.NamespaceManager = APINamespaceManager; // Alias pour compatibilité

    if (Log) Log.info('[APINamespaceManager] Namespace manager loaded (Sprint 4.3 - Robust)');

})(window);
