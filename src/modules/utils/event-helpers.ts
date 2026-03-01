/**
 * @fileoverview Event Helpers - Utilities for custom event dispatching
 * @module utils/event-helpers
 */

import { Log } from "../log/index.js";

export interface DispatchCustomEventOptions {
    bubbles?: boolean;
    cancelable?: boolean;
    target?: EventTarget;
}

export interface ListenerConfig {
    target: EventTarget;
    event: string;
    handler: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
}

/**
 * @namespace EventHelpers
 * @memberof GeoLeaf.Utils
 */
export const EventHelpers = {
    dispatchCustomEvent(
        eventName: string,
        detail: Record<string, unknown> = {},
        options: DispatchCustomEventOptions = {}
    ): boolean {
        const { bubbles = true, cancelable = true, target = document } = options;

        try {
            const event = new CustomEvent(eventName, {
                detail,
                bubbles,
                cancelable,
            });

            target.dispatchEvent(event);
            return true;
        } catch (error) {
            if (Log.error) {
                Log.error(`[EventHelpers] Failed to dispatch event '${eventName}':`, error);
            }
            return false;
        }
    },

    dispatchMapEvent(
        map: { fire?: (name: string, detail?: Record<string, unknown>) => void } | null,
        eventName: string,
        detail: Record<string, unknown> = {}
    ): boolean {
        if (!map || typeof map.fire !== "function") {
            if (Log.warn) {
                Log.warn(`[EventHelpers] Invalid map instance, cannot fire '${eventName}'`);
            }
            return false;
        }

        try {
            map.fire(eventName, detail);
            return true;
        } catch (error) {
            if (Log.error) {
                Log.error(`[EventHelpers] Failed to fire map event '${eventName}':`, error);
            }
            return false;
        }
    },

    dispatchBoth(
        eventName: string,
        detail: Record<string, unknown> = {},
        map: { fire?: (name: string, detail?: Record<string, unknown>) => void } | null = null
    ): { document: boolean; map: boolean } {
        const fullEventName = eventName.startsWith("geoleaf:") ? eventName : `geoleaf:${eventName}`;

        const results = {
            document: false,
            map: false,
        };

        results.document = this.dispatchCustomEvent(fullEventName, detail);

        if (map) {
            results.map = this.dispatchMapEvent(map, fullEventName, detail);
        }

        return results;
    },

    addEventListener(
        target: EventTarget | null,
        eventName: string,
        handler: EventListenerOrEventListenerObject,
        options: boolean | AddEventListenerOptions = {}
    ): () => void {
        if (!target || typeof target.addEventListener !== "function") {
            if (Log.warn) {
                Log.warn(`[EventHelpers] Invalid target for addEventListener '${eventName}'`);
            }
            return () => {};
        }

        target.addEventListener(eventName, handler, options);

        return () => {
            try {
                target.removeEventListener(eventName, handler, options);
            } catch (error) {
                if (Log.error) {
                    Log.error(`[EventHelpers] Failed to remove listener '${eventName}':`, error);
                }
            }
        };
    },

    addEventListeners(listeners: ListenerConfig[] = []): () => void {
        const cleanups = listeners.map(({ target, event, handler, options }) => {
            return this.addEventListener(target, event, handler, options ?? {});
        });

        return () => {
            cleanups.forEach((cleanup) => cleanup());
        };
    },

    debounce<T extends (...args: unknown[]) => unknown>(
        func: T,
        wait = 300,
        immediate = false
    ): (...args: Parameters<T>) => void {
        let timeout: ReturnType<typeof setTimeout> | undefined;

        return function debounced(this: unknown, ...args: Parameters<T>) {
            const context = this;

            const later = () => {
                timeout = undefined;
                if (!immediate) {
                    func.apply(context, args);
                }
            };

            const callNow = immediate && !timeout;

            clearTimeout(timeout);
            timeout = setTimeout(later, wait);

            if (callNow) {
                func.apply(context, args);
            }
        };
    },

    throttle<T extends (...args: unknown[]) => unknown>(
        func: T,
        limit = 300
    ): (...args: Parameters<T>) => void {
        let lastRan: number | undefined;

        return function throttled(this: unknown, ...args: Parameters<T>) {
            const context = this;
            const now = Date.now();

            if (!lastRan) {
                func.apply(context, args);
                lastRan = now;
            } else {
                if (now - lastRan >= limit) {
                    func.apply(context, args);
                    lastRan = now;
                }
            }
        };
    },
};
