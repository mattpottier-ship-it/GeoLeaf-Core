/**
 * GeoLeaf - Event Bus lightweight (pub/sub)
 * @module utils/event-bus
 */

export type EventHandler<T = unknown> = (data: T) => void;

export interface EventBus {
    on<T = unknown>(event: string, handler: EventHandler<T>): () => void;
    off(event: string, handler: EventHandler): void;
    emit(event: string, data?: unknown): void;
    once<T = unknown>(event: string, handler: EventHandler<T>): () => void;
    clear(event?: string): void;
}

function createEventBus(): EventBus {
    const _listeners = new Map<string, Set<EventHandler>>();

    function on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
        if (!_listeners.has(event)) _listeners.set(event, new Set());
        _listeners.get(event)!.add(handler as EventHandler);
        return () => off(event, handler as EventHandler);
    }

    function off(event: string, handler: EventHandler): void {
        const handlers = _listeners.get(event);
        if (handlers) handlers.delete(handler);
    }

    function emit(event: string, data?: unknown): void {
        const handlers = _listeners.get(event);
        if (!handlers) return;
        handlers.forEach((h) => {
            try {
                h(data);
            } catch {
                // isolation des errors
            }
        });
    }

    function once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
        const wrapper: EventHandler = (data) => {
            off(event, wrapper);
            handler(data as T);
        };
        return on(event, wrapper);
    }

    function clear(event?: string): void {
        if (event) {
            _listeners.delete(event);
        } else {
            _listeners.clear();
        }
    }

    return { on, off, emit, once, clear };
}

const bus = createEventBus();

export { bus, createEventBus };
