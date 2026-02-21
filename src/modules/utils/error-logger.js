/**
 * GeoLeaf Error Logger
 *
 * Centralised error logging for consistent error reporting across all modules.
 * Replaces 60+ LOC of repetitive logging patterns with unified interface.
 *
 * @module GeoLeaf.Utils.ErrorLogger
 * @version 3.0.0
 */

import { Log } from '../log/index.js';


export const ErrorLogger = {
    /**
     * Niveaux de log
     * @private
     */
    LEVELS: {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug'
    },

    /**
     * Logue une erreur avec contexte
     * @param {string} module - Nom du module (ex: "CacheManager", "LayerSelector")
     * @param {string} message - Message d'erreur
     * @param {Error|*} [error] - L'erreur originale (optionnel)
     */
    error: function (module, message, error) {
        const fullMessage = `[${module}] ${message}`;

        if (Log && typeof Log.error === 'function') {
            Log.error(fullMessage, error);
            // Inclure le stack trace si disponible
            if (error && error.stack) {
                Log.error(`  Stack: ${error.stack}`);
            }
        }
    },

    /**
     * Logue un avertissement
     * @param {string} module - Nom du module
     * @param {string} message - Message d'avertissement
     */
    warn: function (module, message) {
        const fullMessage = `[${module}] ${message}`;

        if (Log && typeof Log.warn === 'function') {
            Log.warn(fullMessage);
        }
    },

    /**
     * Logue une info
     * @param {string} module - Nom du module
     * @param {string} message - Message d'info
     */
    info: function (module, message) {
        const fullMessage = `[${module}] ${message}`;

        if (Log && typeof Log.info === 'function') {
            Log.info(fullMessage);
        }
    },

    /**
     * Logue un debug
     * @param {string} module - Nom du module
     * @param {string} message - Message de debug
     */
    debug: function (module, message) {
        const fullMessage = `[${module}] ${message}`;

        if (Log && typeof Log.debug === 'function') {
            Log.debug(fullMessage);
        } else {
            console.debug(fullMessage);
        }
    },

    /**
     * Logue une erreur quota spécifiquement
     * @param {string} module - Nom du module
     * @param {number} available - Espace disponible en bytes
     * @param {number} needed - Espace nécessaire en bytes
     */
    quotaError: function (module, available, needed) {
        const availableGB = (available / 1024 / 1024 / 1024).toFixed(2);
        const neededGB = (needed / 1024 / 1024 / 1024).toFixed(2);
        const shortageGB = ((needed - available) / 1024 / 1024 / 1024).toFixed(2);

        const message = `QUOTA EXCEEDED - Available: ${availableGB}GB, Needed: ${neededGB}GB, Shortage: ${shortageGB}GB`;
        this.error(module, message);
    },

    /**
     * Logue une erreur de réseau
     * @param {string} module - Nom du module
     * @param {string} url - URL qui a échoué
     * @param {number|string} status - Statut HTTP
     * @param {Error} [error] - L'erreur originale
     */
    networkError: function (module, url, status, error) {
        const message = `Network error [${status}] - ${url}`;
        this.error(module, message, error);
    },

    /**
     * Logue une erreur de validation
     * @param {string} module - Nom du module
     * @param {string} field - Champ validé
     * @param {string} expectedFormat - Format attendu
     */
    validationError: function (module, field, expectedFormat) {
        const message = `Validation error - ${field} (expected: ${expectedFormat})`;
        this.warn(module, message);
    },

    /**
     * Logue une erreur IndexedDB
     * @param {string} module - Nom du module
     * @param {string} operation - Opération (query, insert, update, delete)
     * @param {Error} [error] - L'erreur IDB
     */
    idbError: function (module, operation, error) {
        const message = `IndexedDB error (${operation})`;
        this.error(module, message, error);
    },

    /**
     * Logue les détails d'une performance
     * @param {string} module - Nom du module
     * @param {string} operation - Opération effectuée
     * @param {number} milliseconds - Temps en ms
     */
    performance: function (module, operation, milliseconds) {
        const message = `${operation} completed in ${milliseconds}ms`;
        this.info(module, message);
    },

    /**
     * Logue un warning de mémoire
     * @param {string} module - Nom du module
     * @param {number} usedMB - Mémoire utilisée en MB
     */
    memoryWarning: function (module, usedMB) {
        const message = `⚠️ High memory usage: ${usedMB}MB`;
        this.warn(module, message);
    },

    /**
     * Crée un contexte de log pour une opération
     * @param {string} module - Nom du module
     * @param {string} operation - Nom de l'opération
     * @returns {Object} Objet avec start/end/error methods
     */
    operation: function (module, operation) {
        const startTime = performance.now();

        return {
            success: (result) => {
                const duration = performance.now() - startTime;
                this.info(module, `${operation} succeeded (${duration.toFixed(0)}ms)`);
                return result;
            },
            error: (error) => {
                const duration = performance.now() - startTime;
                this.error(module, `${operation} failed (${duration.toFixed(0)}ms)`, error);
                throw error;
            },
            warn: (warning) => {
                const duration = performance.now() - startTime;
                this.warn(module, `${operation} warning (${duration.toFixed(0)}ms): ${warning}`);
            }
        };
    }
};

if (Log) {
    Log.debug("[ErrorLogger] Module loaded");
}
