/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Helpers - Performance optimization & DOM utilities
 * @module helpers/dom-helpers
 */

"use strict";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
_g.GeoLeaf = _g.GeoLeaf || {};

/**
 * ========================================
 * DOM HELPERS
 * ========================================
 */

/**
 * Safely get element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null}
 */
function getElementById(id) {
    if (!id || typeof id !== "string") return null;
    return document.getElementById(id);
}

/**
 * Safely query selector
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (default: document)
 * @returns {HTMLElement|null}
 */
function querySelector(selector, parent = document) {
    if (!selector || typeof selector !== "string") return null;
    try {
        return parent.querySelector(selector);
    } catch (e) {
        return null;
    }
}

/**
 * Safely query all selectors
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (default: document)
 * @returns {Array<HTMLElement>}
 */
function querySelectorAll(selector, parent = document) {
    if (!selector || typeof selector !== "string") return [];
    try {
        return Array.from(parent.querySelectorAll(selector));
    } catch (e) {
        return [];
    }
}

/**
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {object} options - Element options
 * @returns {HTMLElement}
 */
function createElement(tag, options = {}) {
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
        element.dataset[key] = dataset[key];
    });

    Object.keys(styles).forEach((key) => {
        element.style[key] = styles[key];
    });

    Object.keys(otherProps).forEach((key) => {
        if (key === "ariaLabel") {
            element.setAttribute("aria-label", otherProps[key]);
        } else if (key in element) {
            element[key] = otherProps[key];
        } else {
            element.setAttribute(key, otherProps[key]);
        }
    });

    if (innerHTML) {
        const DOMSecurity = _g.GeoLeaf?.DOMSecurity;
        if (DOMSecurity && typeof DOMSecurity.setSafeHTML === "function") {
            DOMSecurity.setSafeHTML(element, innerHTML);
        } else {
            const Log = _g.GeoLeaf?.Log;
            if (Log)
                Log.warn(
                    "[GeoLeaf.Helpers] createElement with innerHTML - DOMSecurity not available"
                );
            element.innerHTML = innerHTML;
        }
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

/**
 * Add class to element
 */
function addClass(element, ...classNames) {
    if (!element || !element.classList) return;
    const allClasses = classNames.flatMap((cn) => cn.split(" ")).filter(Boolean);
    element.classList.add(...allClasses);
}

/**
 * Remove class from element
 */
function removeClass(element, ...classNames) {
    if (!element || !element.classList) return;
    const allClasses = classNames.flatMap((cn) => cn.split(" ")).filter(Boolean);
    element.classList.remove(...allClasses);
}

/**
 * Toggle class on element
 */
function toggleClass(element, className, force) {
    if (!element || !element.classList) return;
    return element.classList.toggle(className, force);
}

/**
 * Check if element has class
 */
function hasClass(element, className) {
    if (!element || !element.classList) return false;
    return element.classList.contains(className);
}

/**
 * Remove element from DOM
 */
function removeElement(element) {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

/**
 * ========================================
 * PERFORMANCE HELPERS
 * ========================================
 */

function requestFrame(callback) {
    const w = typeof window !== "undefined" ? window : _g;
    if (typeof w.requestAnimationFrame === "function") {
        return w.requestAnimationFrame(callback);
    }
    return setTimeout(callback, 0);
}

function cancelFrame(id) {
    const w = typeof window !== "undefined" ? window : _g;
    if (typeof w.cancelAnimationFrame === "function") {
        w.cancelAnimationFrame(id);
    } else {
        clearTimeout(id);
    }
}

/**
 * ========================================
 * ABORT CONTROLLER HELPERS
 * ========================================
 */

function createAbortController(timeout) {
    const controller = new AbortController();
    if (timeout) {
        setTimeout(() => controller.abort(), timeout);
    }
    return controller;
}

/**
 * ========================================
 * LAZY LOADING HELPERS
 * ========================================
 */

function lazyLoadImage(img, options = { threshold: 0.1 }) {
    if (!("IntersectionObserver" in window)) {
        const src = img.dataset.src || img.getAttribute("data-src");
        if (src) img.src = src;
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const lazyImg = entry.target;
                const src = lazyImg.dataset.src || lazyImg.getAttribute("data-src");
                if (src) lazyImg.src = src;
                observer.unobserve(lazyImg);
            }
        });
    }, options);

    observer.observe(img);
}

function lazyExecute(callback, timeout = 100) {
    if ("requestIdleCallback" in window) {
        requestIdleCallback(callback, { timeout });
    } else {
        setTimeout(callback, timeout);
    }
}

/**
 * ========================================
 * MEMORY OPTIMIZATION HELPERS
 * ========================================
 */

function clearObject(obj) {
    if (!obj || typeof obj !== "object") return;
    Object.keys(obj).forEach((key) => {
        delete obj[key];
    });
}

function createFragment(children = []) {
    const fragment = document.createDocumentFragment();
    children.forEach((child) => {
        if (child instanceof HTMLElement) {
            fragment.appendChild(child);
        }
    });
    return fragment;
}

/**
 * ========================================
 * EVENT HELPERS
 * ========================================
 */

function addEventListener(element, event, handler, options) {
    if (!element || !event || !handler) return () => {};
    element.addEventListener(event, handler, options);
    return () => {
        element.removeEventListener(event, handler, options);
    };
}

function addEventListeners(element, events, options) {
    if (!element || !events) return () => {};
    const cleanups = [];
    Object.keys(events).forEach((eventName) => {
        cleanups.push(addEventListener(element, eventName, events[eventName], options));
    });
    return () => {
        cleanups.forEach((cleanup) => cleanup());
    };
}

function delegateEvent(parent, event, selector, handler) {
    const delegatedHandler = (e) => {
        const target = e.target;
        if (target && target.matches && target.matches(selector)) {
            handler.call(target, e);
        }
    };
    return addEventListener(parent, event, delegatedHandler);
}

/**
 * ========================================
 * UTILITY HELPERS
 * ========================================
 */

function deepClone(obj, seen = new WeakMap()) {
    if (obj === null || typeof obj !== "object") return obj;
    if (seen.has(obj)) return seen.get(obj);
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
    if (obj instanceof Array) {
        const cloned = [];
        seen.set(obj, cloned);
        obj.forEach((item) => cloned.push(deepClone(item, seen)));
        return cloned;
    }
    const cloned = {};
    seen.set(obj, cloned);
    Object.keys(obj).forEach((key) => {
        cloned[key] = deepClone(obj[key], seen);
    });
    return cloned;
}

function isEmpty(value) {
    if (value == null) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                const backoffDelay = delay * Math.pow(2, i);
                await wait(backoffDelay);
            }
        }
    }
    throw lastError;
}

/**
 * ========================================
 * PUBLIC API
 * ========================================
 */

const Helpers = {
    // DOM Helpers
    getElementById,
    querySelector,
    querySelectorAll,
    createElement,
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    removeElement,

    // Performance Helpers
    requestFrame,
    cancelFrame,

    // AbortController Utilities
    createAbortController,

    // Lazy Loading
    lazyLoadImage,
    lazyExecute,

    // Memory Optimization
    clearObject,
    createFragment,

    // Event Helpers
    addEventListener,
    addEventListeners,
    delegateEvent,

    // Utility Functions
    deepClone,
    isEmpty,
    wait,
    retryWithBackoff,
};

export { Helpers };
