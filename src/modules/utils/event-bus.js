/**
 * GeoLeaf - Event Bus léger (pub/sub)
 * Bus d'événements interne pour découpler les modules.
 *
 * Usage :
 *   import { bus } from './event-bus.js';
 *   const off = bus.on('poi:loaded', ({ count }) => console.log(count));
 *   bus.emit('poi:loaded', { count: 42 });
 *   off(); // désabonnement
 *
 * @module utils/event-bus
 */
"use strict";

/**
 * Crée une nouvelle instance de bus d'événements.
 * @returns {{ on, off, emit, once, clear }}
 */
function createEventBus() {
    /** @type {Map<string, Set<Function>>} */
    const _listeners = new Map();

    /**
     * Abonne un handler à un événement.
     * @param {string} event - Nom de l'événement
     * @param {Function} handler - Callback(data)
     * @returns {Function} Fonction de désabonnement
     */
    function on(event, handler) {
        if (!_listeners.has(event)) _listeners.set(event, new Set());
        _listeners.get(event).add(handler);
        return () => off(event, handler);
    }

    /**
     * Désabonne un handler d'un événement.
     * @param {string} event
     * @param {Function} handler
     */
    function off(event, handler) {
        const handlers = _listeners.get(event);
        if (handlers) handlers.delete(handler);
    }

    /**
     * Émet un événement, en passant `data` à tous les handlers abonnés.
     * @param {string} event
     * @param {*} [data]
     */
    function emit(event, data) {
        const handlers = _listeners.get(event);
        if (!handlers) return;
        handlers.forEach(h => {
            try { h(data); } catch (e) { /* isolation des erreurs */ }
        });
    }

    /**
     * Abonne un handler pour une seule exécution.
     * @param {string} event
     * @param {Function} handler
     * @returns {Function} Fonction de désabonnement
     */
    function once(event, handler) {
        const wrapper = (data) => { off(event, wrapper); handler(data); };
        return on(event, wrapper);
    }

    /**
     * Supprime tous les handlers d'un événement (ou tous si non spécifié).
     * @param {string} [event]
     */
    function clear(event) {
        if (event) { _listeners.delete(event); }
        else { _listeners.clear(); }
    }

    return { on, off, emit, once, clear };
}

/** Instance globale partagée */
const bus = createEventBus();

export { bus, createEventBus };
