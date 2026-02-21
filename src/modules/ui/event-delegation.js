/**
 * GeoLeaf UI Module - Event Delegation
 * Centralisation de la gestion des événements UI avec patterns de délégation efficaces
 *
 * @module ui/event-delegation
 * @author Assistant
 * @version 1.0.0
 */
import { Log } from '../log/index.js';

// ========================================
//   CONSTANTES & ÉTAT
// ========================================

/**
 * Map des listeners actifs pour cleanup
 * @type {Map<string, {element: HTMLElement, event: string, handler: Function}>}
 */
const _activeListeners = new Map();

/**
 * Compteur pour identifiants uniques des listeners
 * @type {number}
 */
let _listenerIdCounter = 0;

// ========================================
//   UTILITAIRES DE DÉLÉGATION
// ========================================

/**
 * Attache un event listener avec tracking automatique pour cleanup
 * @param {HTMLElement} element - Élément DOM
 * @param {string} event - Type d'événement
 * @param {Function} handler - Handler de l'événement
 * @param {Object} options - Options pour addEventListener
 * @returns {string} ID unique du listener pour cleanup
 */
function attachTrackedListener(element, event, handler, options = {}) {
    if (!element || typeof handler !== 'function') {
        if (Log) Log.warn("[UI.EventDelegation] attachTrackedListener: élement ou handler manquant");
        return null;
    }

    const listenerId = `listener_${++_listenerIdCounter}`;

    // Wrapper pour tracking automatique des erreurs
    const wrappedHandler = function(e) {
        try {
            return handler.call(this, e);
        } catch (error) {
            if (Log) Log.error("[UI.EventDelegation] Erreur dans handler:", error);
        }
    };

    element.addEventListener(event, wrappedHandler, options);

    _activeListeners.set(listenerId, {
        element,
        event,
        handler: wrappedHandler,
        originalHandler: handler
    });

    return listenerId;
}

/**
 * Détache un listener trackée
 * @param {string} listenerId - ID retourné par attachTrackedListener
 * @returns {boolean} True si succès
 */
function detachTrackedListener(listenerId) {
    if (!listenerId || !_activeListeners.has(listenerId)) {
        return false;
    }

    const { element, event, handler } = _activeListeners.get(listenerId);
    element.removeEventListener(event, handler);
    _activeListeners.delete(listenerId);
    return true;
}

/**
 * Nettoie tous les listeners trackées
 * @returns {number} Nombre de listeners nettoyées
 */
function cleanupAllListeners() {
    let cleaned = 0;
    for (const [listenerId, { element, event, handler }] of _activeListeners) {
        element.removeEventListener(event, handler);
        cleaned++;
    }
    _activeListeners.clear();
    if (Log && cleaned > 0) {
        Log.info(`[UI.EventDelegation] ${cleaned} listeners nettoyées`);
    }
    return cleaned;
}

// ========================================
//   DÉLÉGATION PAR TYPES UI SPÉCIFIQUES
// ========================================

/**
 * Gère les événements des inputs de filtre avec debouncing
 * @param {HTMLElement} filterContainer - Conteneur des filtres
 * @param {Function} onFilterChange - Callback appelé lors des changements
 * @param {number} debounceMs - Délai de debounce (défaut: 300ms)
 * @returns {string[]} IDs des listeners créés
 */
function attachFilterInputEvents(filterContainer, onFilterChange, debounceMs = 300) {
    if (!filterContainer || typeof onFilterChange !== 'function') {
        if (Log) Log.warn("[UI.EventDelegation] attachFilterInputEvents: paramètres manquants");
        return [];
    }

    const listenerIds = [];
    let debounceTimer = null;

    // Fonction debounce pour les inputs
    const debouncedHandler = function() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            onFilterChange();
        }, debounceMs);
    };

    // Délégation pour tous les inputs de type text/range
    const textInputHandler = function(e) {
        if (e.target.matches('input[type="text"], input[type="range"]')) {
            debouncedHandler();
        }
    };

    // Délégation pour les checkboxes (pas de debounce)
    const checkboxHandler = function(e) {
        if (e.target.matches('input[type="checkbox"]')) {
            onFilterChange();
        }
    };

    // Délégation pour les selects
    const selectHandler = function(e) {
        if (e.target.matches('select')) {
            onFilterChange();
        }
    };

    listenerIds.push(attachTrackedListener(filterContainer, 'input', textInputHandler));
    listenerIds.push(attachTrackedListener(filterContainer, 'change', checkboxHandler));
    listenerIds.push(attachTrackedListener(filterContainer, 'change', selectHandler));

    return listenerIds.filter(id => id !== null);
}

/**
 * Gère les événements d'accordéon avec délégation
 * @param {HTMLElement} container - Conteneur des accordéons
 * @returns {string} ID du listener créé
 */
function attachAccordionEvents(container) {
    if (!container) {
        if (Log) Log.warn("[UI.EventDelegation] attachAccordionEvents: conteneur manquant");
        return null;
    }

    const accordionHandler = function(e) {
        // Cherche le bouton d'accordéon dans la hiérarchie
        const accordionButton = e.target.closest('.gl-accordion-toggle, .accordion-arrow');
        if (!accordionButton) return;

        e.preventDefault();
        e.stopPropagation();

        // Trouve le panel associé
        const panel = accordionButton.closest('.gl-accordion')?.querySelector('.gl-accordion-content');
        if (!panel) return;

        // Toggle accordéon
        const isExpanded = panel.style.display !== 'none';
        panel.style.display = isExpanded ? 'none' : 'block';

        // Met à jour l'aria-expanded
        accordionButton.setAttribute('aria-expanded', !isExpanded);

        // Met à jour l'icône si présente
        const icon = accordionButton.querySelector('.accordion-icon, .accordion-arrow');
        if (icon) {
            icon.classList.toggle('expanded', !isExpanded);
        }
    };

    return attachTrackedListener(container, 'click', accordionHandler);
}

/**
 * Gère les événements des contrôles de carte (delegation pour les boutons)
 * @param {HTMLElement} mapContainer - Conteneur de la carte
 * @param {Object} handlers - Map des handlers { selectorPattern: handlerFunction }
 * @returns {string[]} IDs des listeners créés
 */
function attachMapControlEvents(mapContainer, handlers) {
    if (!mapContainer || !handlers || typeof handlers !== 'object') {
        if (Log) Log.warn("[UI.EventDelegation] attachMapControlEvents: paramètres manquants");
        return [];
    }

    const listenerIds = [];

    const controlHandler = function(e) {
        for (const [selector, handler] of Object.entries(handlers)) {
            if (e.target.matches(selector) || e.target.closest(selector)) {
                e.preventDefault();
                e.stopPropagation();

                if (typeof handler === 'function') {
                    handler.call(this, e);
                }
                break;
            }
        }
    };

    listenerIds.push(attachTrackedListener(mapContainer, 'click', controlHandler));
    return listenerIds.filter(id => id !== null);
}

// ========================================
//   API PUBLIQUE
// ========================================

/**
 * Obtient le nombre de listeners actifs enregistrés
 * Utile pour le debugging et le monitoring des fuites mémoire
 * @returns {number} Nombre de listeners actifs
 */
function getActiveListenersCount() {
    return _activeListeners.size;
}

/**
 * Récupère la liste complète des listeners actifs avec leurs métadonnées
 * @returns {string[]} Liste des IDs de listeners actifs
 */
function getActiveListeners() {
    return Array.from(_activeListeners.keys());
}

const _UIEventDelegation = {
    attachTrackedListener,
    detachTrackedListener,
    cleanupAllListeners,
    attachFilterInputEvents,
    attachAccordionEvents,
    attachMapControlEvents,
    getActiveListenersCount,
    getActiveListeners
};

// ── ESM Export ──
export { _UIEventDelegation };
