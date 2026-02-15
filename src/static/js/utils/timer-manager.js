/**
 * @fileoverview TimerManager - Gestion centralisée des timers
 * Permet de tracker et nettoyer tous les setTimeout/setInterval
 * pour éviter les fuites mémoire
 *
 * @module GeoLeaf.Utils.TimerManager
 * @version 2.0.0
 * @author GeoLeaf Project
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf.Utils = GeoLeaf.Utils || {};

    const Log = GeoLeaf.Log;

    /**
     * TimerManager - Gestionnaire centralisé de timers
     * @class
     */
    class TimerManager {
        constructor(name = 'default') {
            this.name = name;
            this.timers = new Map();
            this.intervals = new Map();
            this._nextId = 1;
        }

        /**
         * Crée un setTimeout avec tracking
         * @param {Function} callback - Fonction à exécuter
         * @param {number} delay - Délai en ms
         * @param {string} [label] - Label optionnel pour debug
         * @returns {number} ID du timer
         */
        setTimeout(callback, delay, label = '') {
            const id = this._nextId++;
            const timerId = setTimeout(() => {
                try {
                    callback();
                } finally {
                    // Auto-cleanup après exécution
                    this.timers.delete(id);
                }
            }, delay);

            this.timers.set(id, {
                timerId,
                label,
                type: 'timeout',
                createdAt: Date.now(),
                delay
            });

            if (Log) Log.debug(`[TimerManager.${this.name}] setTimeout created:`, id, label);
            return id;
        }

        /**
         * Crée un setInterval avec tracking
         * @param {Function} callback - Fonction à exécuter
         * @param {number} interval - Intervalle en ms
         * @param {string} [label] - Label optionnel pour debug
         * @returns {number} ID de l'interval
         */
        setInterval(callback, interval, label = '') {
            const id = this._nextId++;
            const intervalId = setInterval(() => {
                try {
                    callback();
                } catch (error) {
                    if (Log) Log.error(`[TimerManager.${this.name}] Error in interval ${id}:`, error);
                }
            }, interval);

            this.intervals.set(id, {
                intervalId,
                label,
                type: 'interval',
                createdAt: Date.now(),
                interval
            });

            if (Log) Log.debug(`[TimerManager.${this.name}] setInterval created:`, id, label);
            return id;
        }

        /**
         * Clear un timer spécifique
         * @param {number} id - ID du timer
         * @returns {boolean} True si le timer a été trouvé et nettoyé
         */
        clearTimeout(id) {
            const timer = this.timers.get(id);
            if (timer) {
                clearTimeout(timer.timerId);
                this.timers.delete(id);
                if (Log) Log.debug(`[TimerManager.${this.name}] setTimeout cleared:`, id, timer.label);
                return true;
            }
            return false;
        }

        /**
         * Clear un interval spécifique
         * @param {number} id - ID de l'interval
         * @returns {boolean} True si l'interval a été trouvé et nettoyé
         */
        clearInterval(id) {
            const interval = this.intervals.get(id);
            if (interval) {
                clearInterval(interval.intervalId);
                this.intervals.delete(id);
                if (Log) Log.debug(`[TimerManager.${this.name}] setInterval cleared:`, id, interval.label);
                return true;
            }
            return false;
        }

        /**
         * Clear tous les timers et intervals
         */
        clearAll() {
            // Clear tous les timeouts
            for (const [id, timer] of this.timers.entries()) {
                clearTimeout(timer.timerId);
            }

            // Clear tous les intervals
            for (const [id, interval] of this.intervals.entries()) {
                clearInterval(interval.intervalId);
            }

            const totalCleared = this.timers.size + this.intervals.size;
            this.timers.clear();
            this.intervals.clear();

            if (Log && totalCleared > 0) {
                Log.info(`[TimerManager.${this.name}] Cleared ${totalCleared} timer(s)`);
            }
        }

        /**
         * Obtient le nombre de timers actifs
         * @returns {{timeouts: number, intervals: number, total: number}}
         */
        getStats() {
            return {
                timeouts: this.timers.size,
                intervals: this.intervals.size,
                total: this.timers.size + this.intervals.size
            };
        }

        /**
         * Liste tous les timers actifs (pour debug)
         * @returns {Array} Liste des timers avec leurs infos
         */
        listActiveTimers() {
            const list = [];

            for (const [id, timer] of this.timers.entries()) {
                list.push({
                    id,
                    type: 'timeout',
                    label: timer.label,
                    age: Date.now() - timer.createdAt,
                    delay: timer.delay
                });
            }

            for (const [id, interval] of this.intervals.entries()) {
                list.push({
                    id,
                    type: 'interval',
                    label: interval.label,
                    age: Date.now() - interval.createdAt,
                    interval: interval.interval
                });
            }

            return list;
        }

        /**
         * Détruit le manager et nettoie tous les timers
         */
        destroy() {
            this.clearAll();
            if (Log) Log.info(`[TimerManager.${this.name}] Destroyed`);
        }
    }

    /**
     * Instance globale par défaut
     */
    const globalTimerManager = new TimerManager('global');

    /**
     * API simplifiée pour l'instance globale
     */
    GeoLeaf.Utils.TimerManager = TimerManager;
    GeoLeaf.Utils.timers = {
        /**
         * setTimeout avec tracking global
         */
        setTimeout: (callback, delay, label) => globalTimerManager.setTimeout(callback, delay, label),

        /**
         * setInterval avec tracking global
         */
        setInterval: (callback, interval, label) => globalTimerManager.setInterval(callback, interval, label),

        /**
         * clearTimeout global
         */
        clearTimeout: (id) => globalTimerManager.clearTimeout(id),

        /**
         * clearInterval global
         */
        clearInterval: (id) => globalTimerManager.clearInterval(id),

        /**
         * Clear tous les timers globaux
         */
        clearAll: () => globalTimerManager.clearAll(),

        /**
         * Obtient les stats globales
         */
        getStats: () => globalTimerManager.getStats(),

        /**
         * Liste les timers actifs
         */
        listActive: () => globalTimerManager.listActiveTimers(),

        /**
         * Crée une nouvelle instance de TimerManager pour un composant
         * @param {string} name - Nom du manager
         * @returns {TimerManager}
         */
        createManager: (name) => new TimerManager(name)
    };

    // Cleanup automatique avant unload de la page
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
            const stats = globalTimerManager.getStats();
            if (stats.total > 0) {
                if (Log) Log.warn(`[TimerManager] ${stats.total} timer(s) still active at page unload`);
                globalTimerManager.clearAll();
            }
        });
    }

    if (Log) Log.info('[GeoLeaf.Utils.TimerManager] Module chargé');

})(typeof window !== 'undefined' ? window : global);
