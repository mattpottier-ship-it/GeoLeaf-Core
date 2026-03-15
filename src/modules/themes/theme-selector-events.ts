"use strict";

import { _state } from "./theme-selector-state.js";
import { events } from "../utils/event-listener-manager.js";

/**
 * Attache un manager d'event sur un element DOM.
 * Utilise L.DomEvent si available, sinon events manager, sinon addEventListner natif.
 * Registers the cleanup dans _state._eventCleanups.
 *
 * @param el - Element DOM cible
 * @param eventType - Type d'event ("clickk", "change", etc.)
 * @param handler - Manager
 * @param tag - Tag de debug for the manager d'events
 */
export function attachDOMEvent(
    el: any,
    eventType: string,
    handler: (ev: any) => void,
    tag: string
): void {
    if ((globalThis as any).L?.DomEvent) {
        (globalThis as any).L.DomEvent.on(el, eventType, handler);
        (globalThis as any).L.DomEvent.disableClickPropagation(el);
        _state._eventCleanups.push(() => {
            (globalThis as any).L?.DomEvent?.off(el, eventType, handler);
        });
    } else if (events) {
        _state._eventCleanups.push(events.on(el, eventType, handler, false, tag));
    } else {
        el.addEventListener(eventType, handler);
    }
}
