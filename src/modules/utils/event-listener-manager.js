/**
 * @fileoverview EventListenerManager - Gestion centralisée des event listeners
 * Permet de tracker et nettoyer tous les event listeners
 * pour éviter les fuites mémoire
 *
 * @module GeoLeaf.Utils.EventListenerManager
 * @version 2.0.0
 * @author GeoLeaf Project
 */

import { Log } from '../log/index.js';


/**
 * EventListenerManager - Gestionnaire centralisé d'event listeners
 * @class
 */
export class EventListenerManager {
    constructor(name = 'default') {
        this.name = name;
        this.listeners = [];
        this._nextId = 1;
    }

    /**
     * Ajoute un event listener avec tracking
     * @param {Element|Window|Document} target - Élément cible
     * @param {string} event - Nom de l'événement
     * @param {Function} handler - Handler de l'événement
     * @param {Object|boolean} [options] - Options (capture, once, passive, etc.)
     * @param {string} [label] - Label optionnel pour debug
     * @returns {number} ID du listener pour removal ultérieur
     */
    addEventListener(target, event, handler, options = false, label = '') {
        if (!target || typeof target.addEventListener !== 'function') {
            Log.warn(`[EventListenerManager.${this.name}] Invalid target for addEventListener`);
            return null;
        }

        const id = this._nextId++;

        target.addEventListener(event, handler, options);

        this.listeners.push({
            id,
            target,
            event,
            handler,
            options,
            label,
            createdAt: Date.now()
        });

        Log.debug(`[EventListenerManager.${this.name}] Listener added:`, id, event, label);
        return id;
    }

    /**
     * Ajoute un event listener Leaflet avec tracking
     * @param {L.Evented} target - Objet Leaflet (map, marker, etc.)
     * @param {string} event - Nom de l'événement
     * @param {Function} handler - Handler de l'événement
     * @param {string} [label] - Label optionnel pour debug
     * @returns {number} ID du listener
     */
    addLeafletListener(target, event, handler, label = '') {
        if (!target || typeof target.on !== 'function') {
            Log.warn(`[EventListenerManager.${this.name}] Invalid Leaflet target`);
            return null;
        }

        const id = this._nextId++;

        target.on(event, handler);

        this.listeners.push({
            id,
            target,
            event,
            handler,
            label,
            type: 'leaflet',
            createdAt: Date.now()
        });

        Log.debug(`[EventListenerManager.${this.name}] Leaflet listener added:`, id, event, label);
        return id;
    }

    /**
     * Retire un listener spécifique par ID
     * @param {number} id - ID du listener
     * @returns {boolean} True si le listener a été trouvé et retiré
     */
    removeListener(id) {
        const index = this.listeners.findIndex(l => l.id === id);
        if (index === -1) return false;

        const listener = this.listeners[index];

        if (listener.type === 'leaflet') {
            if (listener.target && typeof listener.target.off === 'function') {
                listener.target.off(listener.event, listener.handler);
            }
        } else {
            if (listener.target && typeof listener.target.removeEventListener === 'function') {
                listener.target.removeEventListener(listener.event, listener.handler, listener.options);
            }
        }

        this.listeners.splice(index, 1);

        Log.debug(`[EventListenerManager.${this.name}] Listener removed:`, id, listener.label);
        return true;
    }

    /**
     * Retire tous les listeners d'un élément spécifique
     * @param {Element|L.Evented} target - Élément cible
     * @returns {number} Nombre de listeners retirés
     */
    removeListenersForTarget(target) {
        const matchingListeners = this.listeners.filter(l => l.target === target);

        matchingListeners.forEach(listener => {
            if (listener.type === 'leaflet') {
                if (listener.target && typeof listener.target.off === 'function') {
                    listener.target.off(listener.event, listener.handler);
                }
            } else {
                if (listener.target && typeof listener.target.removeEventListener === 'function') {
                    listener.target.removeEventListener(listener.event, listener.handler, listener.options);
                }
            }
        });

        this.listeners = this.listeners.filter(l => l.target !== target);

        if (Log && matchingListeners.length > 0) {
            Log.info(`[EventListenerManager.${this.name}] Removed ${matchingListeners.length} listener(s) for target`);
        }

        return matchingListeners.length;
    }

    /**
     * Retire tous les listeners
     */
    removeAll() {
        const count = this.listeners.length;

        this.listeners.forEach(listener => {
            try {
                if (listener.type === 'leaflet') {
                    if (listener.target && typeof listener.target.off === 'function') {
                        listener.target.off(listener.event, listener.handler);
                    }
                } else {
                    if (listener.target && typeof listener.target.removeEventListener === 'function') {
                        listener.target.removeEventListener(listener.event, listener.handler, listener.options);
                    }
                }
            } catch (error) {
                Log.warn(`[EventListenerManager.${this.name}] Error removing listener:`, error);
            }
        });

        this.listeners = [];

        if (Log && count > 0) {
            Log.info(`[EventListenerManager.${this.name}] Removed ${count} listener(s)`);
        }
    }

    /**
     * Obtient le nombre de listeners actifs
     * @returns {number}
     */
    getCount() {
        return this.listeners.length;
    }

    /**
     * Liste tous les listeners actifs (pour debug)
     * @returns {Array}
     */
    listActiveListeners() {
        return this.listeners.map(l => ({
            id: l.id,
            event: l.event,
            label: l.label,
            type: l.type || 'dom',
            age: Date.now() - l.createdAt
        }));
    }

    /**
     * Détruit le manager et nettoie tous les listeners
     */
    destroy() {
        this.removeAll();
        Log.info(`[EventListenerManager.${this.name}] Destroyed`);
    }
}

/**
 * Instance globale par défaut
 */
const globalEventManager = new EventListenerManager('global');

/**
 * API simplifiée pour l'instance globale
 */

// Cleanup automatique avant unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        const count = globalEventManager.getCount();
        if (count > 0) {
            Log.warn(`[EventListenerManager] ${count} listener(s) still active at page unload`);
            globalEventManager.removeAll();
        }
    });
}

/**
 * API simplifiée pour l'instance globale (shortcuts sur globalEventManager)
 */
const events = {
    /**
     * addEventListener avec tracking global
     */
    on: (target, event, handler, options, label) =>
        globalEventManager.addEventListener(target, event, handler, options, label),

    /**
     * Leaflet event listener avec tracking global
     */
    onLeaflet: (target, event, handler, label) =>
        globalEventManager.addLeafletListener(target, event, handler, label),

    /**
     * Retire un listener par ID
     */
    off: (id) => globalEventManager.removeListener(id),

    /**
     * Retire tous les listeners d'une cible
     */
    offTarget: (target) => globalEventManager.removeListenersForTarget(target),

    /**
     * Retire tous les listeners globaux
     */
    offAll: () => globalEventManager.removeAll(),

    /**
     * Obtient le nombre de listeners actifs
     */
    getCount: () => globalEventManager.getCount(),

    /**
     * Liste les listeners actifs
     */
    listActive: () => globalEventManager.listActiveListeners(),

    /**
     * Crée une nouvelle instance pour un composant
     * @param {string} name - Nom du manager
     * @returns {EventListenerManager}
     */
    createManager: (name) => new EventListenerManager(name)
};

export { globalEventManager, events };
