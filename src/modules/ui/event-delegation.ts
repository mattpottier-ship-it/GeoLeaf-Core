/**
 * GeoLeaf UI Module - Event Delegation
 * Centralisation de la gestion des events UI avec patterns de delegation efficaces
 *
 * @module ui/event-delegation
 * @author Assistant
 * @version 1.0.0
 */
import { Log } from "../log/index.js";

// ========================================
//   CONSTANTES & STATE
// ========================================

/**
 * Map des listners actives pour cleanup
 * @type {Map<string, {element: HTMLElement, event: string, handler: Function}>}
 */
const _activeListeners = new Map();

/**
 * Compteur pour identifiers uniques des listners
 * @type {number}
 */
let _listenerIdCounter = 0;

// ========================================
//   UTILITAIRES DE DELEGATION
// ========================================

/**
 * Attache un event listner avec tracking automatic pour cleanup
 * @param {HTMLElement} element - Element DOM
 * @param {string} event - Type d'event
 * @param {Function} handler - Handler of the event
 * @param {Object} options - Options pour addEventListner
 * @returns {string} ID unique du listner pour cleanup
 */
function attachTrackedListener(element: any, event: string, handler: any, options: any = {}) {
    if (!element || typeof handler !== "function") {
        if (Log) Log.warn("[UI.EventDelegation] attachTrackedListener: element or handler missing");
        return null;
    }

    const listenerId = `listener_${++_listenerIdCounter}`;

    // Wrapper pour tracking automatic des errors
    const wrappedHandler = function (this: any, e: any) {
        try {
            return handler.call(this, e);
        } catch (error) {
            if (Log) Log.error("[UI.EventDelegation] Error in handler:", error);
        }
    };

    element.addEventListener(event, wrappedHandler, options);

    _activeListeners.set(listenerId, {
        element,
        event,
        handler: wrappedHandler,
        originalHandler: handler,
    });

    return listenerId;
}

/**
 * Detaches a tracked listener
 * @param {string} listnerId - ID returned by attachTrackedListner
 * @returns {boolean} True si success
 */
function detachTrackedListener(listenerId: any) {
    if (!listenerId || !_activeListeners.has(listenerId)) {
        return false;
    }

    const { element, event, handler } = _activeListeners.get(listenerId);
    element.removeEventListener(event, handler);
    _activeListeners.delete(listenerId);
    return true;
}

/**
 * Cleans up all tracked listeners
 * @returns {number} Nombre de listners cleaned
 */
function cleanupAllListeners() {
    let cleaned = 0;
    for (const [_listenerId, { element, event, handler }] of _activeListeners) {
        element.removeEventListener(event, handler);
        cleaned++;
    }
    _activeListeners.clear();
    if (Log && cleaned > 0) {
        Log.info(`[UI.EventDelegation] ${cleaned} listeners cleaned`);
    }
    return cleaned;
}

// ========================================
//   DELEGATION BY SPECIFIC UI TYPES
// ========================================

/**
 * Manages thes events des inputs de filters avec debouncing
 * @param {HTMLElement} filterContainer - Conteneur des filters
 * @param {Function} onFilterChange - Callback called whens changements
 * @param {number} debounceMs - Debounce delay (default: 300ms)
 * @returns {string[]} IDs des listners created
 */
function attachFilterInputEvents(filterContainer: any, onFilterChange: any, debounceMs = 300) {
    if (!filterContainer || typeof onFilterChange !== "function") {
        if (Log) Log.warn("[UI.EventDelegation] attachFilterInputEvents: missing parameters");
        return [];
    }

    const listenerIds = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Fonction debounce for thes inputs
    const debouncedHandler = function () {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            onFilterChange();
        }, debounceMs);
    };

    // Delegation pour tous les inputs de type text/range
    const textInputHandler = function (e: any) {
        if (e.target.matches('input[type="text"], input[type="range"]')) {
            debouncedHandler();
        }
    };

    // Delegation for thes checkboxes (pas de debounce)
    const checkboxHandler = function (e: any) {
        if (e.target.matches('input[type="checkbox"]')) {
            onFilterChange();
        }
    };

    // Delegation for thes selects
    const selectHandler = function (e: any) {
        if (e.target.matches("select")) {
            onFilterChange();
        }
    };

    listenerIds.push(attachTrackedListener(filterContainer, "input", textInputHandler));
    listenerIds.push(attachTrackedListener(filterContainer, "change", checkboxHandler));
    listenerIds.push(attachTrackedListener(filterContainer, "change", selectHandler));

    return listenerIds.filter((id) => id !== null);
}

/**
 * Manages thes events d'accordion avec delegation
 * @param {HTMLElement} container - Conteneur des accordions
 * @returns {string} ID du listner created
 */
function attachAccordionEvents(container: any) {
    if (!container) {
        if (Log) Log.warn("[UI.EventDelegation] attachAccordionEvents: conteneur manquant");
        return null;
    }

    const accordionHandler = function (e: any) {
        // Cherche le button d'accordion in the hierarchy
        const accordionButton = e.target.closest(".gl-accordion-toggle, .accordion-arrow");
        if (!accordionButton) return;

        e.preventDefault();
        e.stopPropagation();

        // Finds the associated panel
        const panel = accordionButton
            .closest(".gl-accordion")
            ?.querySelector(".gl-accordion-content");
        if (!panel) return;

        // Toggle accordion
        const isExpanded = panel.style.display !== "none";
        panel.style.display = isExpanded ? "none" : "block";

        // Updates the aria-expanded
        accordionButton.setAttribute("aria-expanded", !isExpanded);

        // Updates the icon si presents
        const icon = accordionButton.querySelector(".accordion-icon, .accordion-arrow");
        if (icon) {
            icon.classList.toggle("expanded", !isExpanded);
        }
    };

    return attachTrackedListener(container, "click", accordionHandler);
}

/**
 * Manages thes events des controles de carte (delegation for thes buttons)
 * @param {HTMLElement} mapContainer - Conteneur de the map
 * @param {Object} handlers - Map des handlers { selectorPattern: handlerFunction }
 * @returns {string[]} IDs des listners created
 */
function attachMapControlEvents(mapContainer: any, handlers: any) {
    if (!mapContainer || !handlers || typeof handlers !== "object") {
        if (Log) Log.warn("[UI.EventDelegation] attachMapControlEvents: missing parameters");
        return [];
    }

    const listenerIds = [];

    const controlHandler = function (this: any, e: any) {
        for (const [selector, handler] of Object.entries(handlers)) {
            if (e.target.matches(selector) || e.target.closest(selector)) {
                e.preventDefault();
                e.stopPropagation();

                if (typeof handler === "function") {
                    handler.call(this, e);
                }
                break;
            }
        }
    };

    listenerIds.push(attachTrackedListener(mapContainer, "click", controlHandler));
    return listenerIds.filter((id) => id !== null);
}

// ========================================
//   API PUBLIQUE
// ========================================

/**
 * Obtient le nombre de listners actives registered
 * Utile for the debugging et le monitoring des fuites memory
 * @returns {number} Nombre de listners actives
 */
function getActiveListenersCount() {
    return _activeListeners.size;
}

/**
 * Retrieves the list complete des listners actives with theurs metadata
 * @returns {string[]} List des IDs de listners actives
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
    getActiveListeners,
};

// ── ESM Export ──
export { _UIEventDelegation };
