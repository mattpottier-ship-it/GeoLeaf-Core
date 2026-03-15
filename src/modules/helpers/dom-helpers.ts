/* eslint-disable security/detect-object-injection */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Helpers - Performance optimization & DOM utilities
 * @module helpers/dom-helpers
 * SEC-03: innerHTML always via DOMSecurity (no raw assignment).
 */

import { DOMSecurity } from "../utils/dom-security.js";

export interface CreateElementOptions {
    className?: string;
    id?: string;
    attributes?: Record<string, string>;
    dataset?: Record<string, string>;
    styles?: Record<string, string>;
    textContent?: string;
    innerHTML?: string;
    children?: HTMLElement[];
    ariaLabel?: string;
    [key: string]: unknown;
}

function getElementById(id: string | null | undefined): HTMLElement | null {
    if (!id || typeof id !== "string") return null;
    return document.getElementById(id);
}

function querySelector(selector: string, parent: ParentNode = document): Element | null {
    if (!selector || typeof selector !== "string") return null;
    try {
        return parent.querySelector(selector);
    } catch {
        return null;
    }
}

function querySelectorAll(selector: string, parent: ParentNode = document): Element[] {
    if (!selector || typeof selector !== "string") return [];
    try {
        return Array.from(parent.querySelectorAll(selector));
    } catch {
        return [];
    }
}

function createElement(tag: string, options: CreateElementOptions = {}): HTMLElement {
    const element = document.createElement(tag);

    const {
        className,
        id,
        attributes = {},
        dataset = {},
        styles = {},
        textContent,
        innerHTML,
        children = [],
        ...otherProps
    } = options;

    if (className) element.className = className;
    if (id) element.id = id;

    Object.keys(attributes).forEach((key) => {
        element.setAttribute(key, attributes[key]);
    });

    Object.keys(dataset).forEach((key) => {
        (element as HTMLElement & { dataset: Record<string, string> }).dataset[key] = dataset[key];
    });

    Object.keys(styles).forEach((key) => {
        (element.style as unknown as Record<string, string>)[key] = styles[key];
    });

    Object.keys(otherProps).forEach((key) => {
        if (key === "ariaLabel") {
            element.setAttribute("aria-label", String(otherProps[key]));
        } else if (key in element) {
            (element as unknown as Record<string, unknown>)[key] = otherProps[key];
        } else {
            element.setAttribute(key, String(otherProps[key]));
        }
    });

    if (innerHTML) {
        DOMSecurity.setSafeHTML(element, innerHTML);
    } else if (textContent) {
        element.textContent = textContent;
    }

    if (children.length > 0) {
        children.forEach((child) => {
            if (child instanceof HTMLElement) {
                element.appendChild(child);
            }
        });
    }

    return element;
}

function addClass(element: Element | null | undefined, ...classNames: string[]): void {
    if (!element || !element.classList) return;
    const allClasses = classNames.flatMap((cn) => cn.split(" ")).filter(Boolean);
    element.classList.add(...allClasses);
}

function removeClass(element: Element | null | undefined, ...classNames: string[]): void {
    if (!element || !element.classList) return;
    const allClasses = classNames.flatMap((cn) => cn.split(" ")).filter(Boolean);
    element.classList.remove(...allClasses);
}

function toggleClass(
    element: Element | null | undefined,
    className: string,
    force?: boolean
): boolean {
    if (!element || !element.classList) return false;
    return element.classList.toggle(className, force);
}

function hasClass(element: Element | null | undefined, className: string): boolean {
    if (!element || !element.classList) return false;
    return element.classList.contains(className);
}

function removeElement(element: Node | null | undefined): void {
    if (element?.parentNode) {
        element.parentNode.removeChild(element);
    }
}

function requestFrame(callback: FrameRequestCallback): number {
    const w =
        typeof window !== "undefined"
            ? window
            : typeof globalThis !== "undefined"
              ? globalThis
              : ({} as Window);
    if (typeof (w as Window).requestAnimationFrame === "function") {
        return (w as Window).requestAnimationFrame(callback);
    }
    return setTimeout(callback as () => void, 0) as unknown as number;
}

function cancelFrame(id: number): void {
    const w =
        typeof window !== "undefined"
            ? window
            : typeof globalThis !== "undefined"
              ? globalThis
              : ({} as Window);
    if (typeof (w as Window).cancelAnimationFrame === "function") {
        (w as Window).cancelAnimationFrame(id);
    } else {
        clearTimeout(id);
    }
}

function createAbortController(timeout?: number): AbortController {
    const controller = new AbortController();
    if (timeout) {
        setTimeout(() => controller.abort(), timeout);
    }
    return controller;
}

function lazyLoadImage(
    img: HTMLImageElement,
    options: { threshold?: number } = { threshold: 0.1 }
): void {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
        const src = img.dataset.src || img.getAttribute("data-src");
        if (src) img.src = src;
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const lazyImg = entry.target as HTMLImageElement;
                const src = lazyImg.dataset.src || lazyImg.getAttribute("data-src");
                if (src) lazyImg.src = src;
                observer.unobserve(lazyImg);
            }
        });
    }, options);

    observer.observe(img);
}

function lazyExecute(callback: () => void, timeout: number = 100): void {
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (
            window as Window & {
                requestIdleCallback: (cb: () => void, opts: { timeout: number }) => number;
            }
        ).requestIdleCallback(callback, { timeout });
    } else {
        setTimeout(callback, timeout);
    }
}

function clearObject(obj: Record<string, unknown> | null | undefined): void {
    if (!obj || typeof obj !== "object") return;
    Object.keys(obj).forEach((key) => {
        delete obj[key];
    });
}

function createFragment(children: HTMLElement[] = []): DocumentFragment {
    const fragment = document.createDocumentFragment();
    children.forEach((child) => {
        if (child instanceof HTMLElement) {
            fragment.appendChild(child);
        }
    });
    return fragment;
}

function addEventListener(
    element: EventTarget | null | undefined,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
): () => void {
    if (!element || !event || !handler) return () => {};
    element.addEventListener(event, handler, options);
    return () => {
        element.removeEventListener(event, handler, options);
    };
}

function addEventListeners(
    element: EventTarget | null | undefined,
    events: Record<string, EventListenerOrEventListenerObject>,
    options?: boolean | AddEventListenerOptions
): () => void {
    if (!element || !events) return () => {};
    const cleanups: (() => void)[] = [];
    Object.keys(events).forEach((eventName) => {
        cleanups.push(addEventListener(element, eventName, events[eventName], options));
    });
    return () => {
        cleanups.forEach((cleanup) => cleanup());
    };
}

function delegateEvent(
    parent: EventTarget | null | undefined,
    event: string,
    selector: string,
    handler: (this: Element, e: Event) => void
): () => void {
    const delegatedHandler = (e: Event): void => {
        const target = e.target as Element | null;
        if (target?.matches?.(selector)) {
            handler.call(target, e);
        }
    };
    return addEventListener(parent, event, delegatedHandler as EventListener);
}

function deepClone<T>(obj: T, seen: WeakMap<object, unknown> = new WeakMap()): T {
    if (obj === null || typeof obj !== "object") return obj;
    if (seen.has(obj as object)) return seen.get(obj as object) as T;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags) as unknown as T;
    if (Array.isArray(obj)) {
        const cloned: unknown[] = [];
        seen.set(obj as object, cloned);
        (obj as unknown[]).forEach((item) => cloned.push(deepClone(item, seen)));
        return cloned as unknown as T;
    }
    const cloned: Record<string, unknown> = {};
    seen.set(obj as object, cloned);
    Object.keys(obj as object).forEach((key) => {
        cloned[key] = deepClone((obj as Record<string, unknown>)[key], seen);
    });
    return cloned as T;
}

function isEmpty(value: unknown): boolean {
    if (value == null) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (i < maxRetries - 1) {
                const backoffDelay = delay * Math.pow(2, i);
                await wait(backoffDelay);
            }
        }
    }
    throw lastError;
}

const Helpers = {
    getElementById,
    querySelector,
    querySelectorAll,
    createElement,
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    removeElement,
    requestFrame,
    cancelFrame,
    createAbortController,
    lazyLoadImage,
    lazyExecute,
    clearObject,
    createFragment,
    addEventListener,
    addEventListeners,
    delegateEvent,
    deepClone,
    isEmpty,
    wait,
    retryWithBackoff,
};

export { Helpers };
