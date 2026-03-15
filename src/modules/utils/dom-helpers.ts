/* eslint-disable security/detect-object-injection */
/**
 * @module GeoLeaf.Utils.DomHelpers
 * Helpers pour création et manipulation d'éléments DOM
 *
 * @version 1.0.0
 * @requires GeoLeaf.Security (pour sanitization)
 */

import { Log } from "../log/index.js";
import { DOMSecurity } from "./dom-security";

declare global {
    interface GeoLeafUtilsEvents {
        on: (
            target: EventTarget | null,
            event: string,
            handler: EventListenerOrEventListenerObject,
            options?: boolean | AddEventListenerOptions,
            label?: string
        ) => number | null;
        off?: (id: number) => boolean;
    }
    interface GeoLeafGlobal {
        Utils?: { events?: GeoLeafUtilsEvents };
        DOMSecurity?: { setSafeHTML(element: HTMLElement, html: string): void };
    }
    const GeoLeaf: GeoLeafGlobal | undefined;
}

export interface CreateElementProps {
    className?: string;
    id?: string;
    style?: Partial<CSSStyleDeclaration> | Record<string, string>;
    dataset?: Record<string, string>;
    attributes?: Record<string, string>;
    textContent?: string;
    innerHTML?: string;
    _eventContext?: string;
    _cleanupArray?: (() => void)[];
    [key: string]: unknown;
}

/**
 * Cr\u00e9e un \u00e9l\u00e9ment DOM avec propri\u00e9t\u00e9s et enfants de mani\u00e8re d\u00e9clarative
 */
function _applyDataset(element: HTMLElement, dataAttrs: Record<string, string> | undefined): void {
    if (!(dataAttrs && typeof dataAttrs === "object")) return;
    for (const [key, value] of Object.entries(dataAttrs)) element.dataset[key] = value;
}

function _applyAttributes(
    element: HTMLElement,
    attributes: Record<string, string> | undefined
): void {
    if (!(attributes && typeof attributes === "object")) return;
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
}

function _applyBaseProps(element: HTMLElement, props: CreateElementProps): void {
    const { className, id, style, dataset: dataAttrs, attributes } = props;
    if (className) element.className = String(className);
    if (id) element.id = String(id);
    if (style && typeof style === "object") Object.assign(element.style, style);
    _applyDataset(element, dataAttrs);
    _applyAttributes(element, attributes);
}

function _applyOtherProp(
    element: HTMLElement,
    key: string,
    value: unknown,
    events: GeoLeafUtilsEvents | undefined,
    eventContext: string,
    cleanupArray: (() => void)[] | undefined
): void {
    if (key.startsWith("on") && typeof value === "function") {
        const event = key.substring(2).toLowerCase();
        if (events) {
            const id = events.on(element, event, value as EventListener, false, eventContext);
            if (
                cleanupArray &&
                Array.isArray(cleanupArray) &&
                typeof id === "number" &&
                events.off
            ) {
                cleanupArray.push(() => events.off!(id));
            }
        } else {
            element.addEventListener(event, value as EventListener);
        }
    } else if (key.startsWith("aria")) {
        element.setAttribute("aria-" + key.substring(4).toLowerCase(), String(value));
    } else if (key in element) {
        (element as unknown as Record<string, unknown>)[key] = value;
    } else {
        element.setAttribute(key, String(value));
    }
}

function _applyContent(
    element: HTMLElement,
    textContent: string | undefined,
    innerHTML: string | undefined,
    children: (Node | string | number | boolean | null | undefined)[]
): void {
    if (textContent !== undefined) {
        element.textContent = String(textContent);
        return;
    }
    if (innerHTML !== undefined) {
        if (Log?.warn) {
            Log.warn(
                "[DomHelpers] createElement with innerHTML — content sanitized via DOMSecurity",
                { tag: element.tagName, innerHTML: String(innerHTML).substring(0, 100) }
            );
        }
        const domSec = typeof GeoLeaf !== "undefined" ? GeoLeaf?.DOMSecurity : undefined;
        if (domSec?.setSafeHTML) {
            domSec.setSafeHTML(element as HTMLElement, String(innerHTML));
        } else {
            element.textContent = String(innerHTML);
        }
        return;
    }
    appendChild(element, ...children);
}

export function createElement(
    tag: string,
    props: CreateElementProps = {},
    ...children: (Node | string | number | boolean | null | undefined)[]
): HTMLElement {
    if (typeof tag !== "string" || !tag.trim()) {
        throw new TypeError("[DomHelpers] createElement: tag must be a non-empty string");
    }
    const element = document.createElement(tag);
    const { textContent, innerHTML, _eventContext, _cleanupArray, ...otherProps } = props;
    _applyBaseProps(element, props);
    const events = typeof GeoLeaf !== "undefined" ? GeoLeaf.Utils?.events : undefined;
    const evCtx = _eventContext ? _eventContext : "DomHelpers.createElement";
    for (const [key, value] of Object.entries(otherProps)) {
        if (!["className", "id", "style", "dataset", "attributes"].includes(key)) {
            _applyOtherProp(element, key, value, events, evCtx, _cleanupArray);
        }
    }
    _applyContent(element, textContent, innerHTML, children);
    return element;
}

/**
 * Adds des enfants à un élément parent
 */
export function appendChild(
    parent: HTMLElement,
    ...children: (
        | Node
        | string
        | number
        | boolean
        | null
        | undefined
        | (Node | string | number)[]
    )[]
): HTMLElement {
    for (const child of children) {
        if (child == null || child === false) continue;
        if (Array.isArray(child)) {
            appendChild(parent, ...child);
        } else if (typeof child === "string" || typeof child === "number") {
            parent.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
            parent.appendChild(child);
        } else {
            parent.appendChild(document.createTextNode(String(child)));
        }
    }
    return parent;
}

/**
 * Empty un élément de tous ses enfants
 */
export function clearElement(
    element: HTMLElement | null | undefined
): HTMLElement | null | undefined {
    if (!element) return element;
    if (DOMSecurity && typeof DOMSecurity.clearElement === "function") {
        DOMSecurity.clearElement(element);
        return element;
    }
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
    return element;
}

function getElementById(id: string, required = false): HTMLElement | null {
    const el = document.getElementById(id);
    if (required && !el) throw new Error(`Element with id "${id}" not found`);
    return el;
}

function querySelectorAll(selector: string, parent: ParentNode = document): Element[] {
    return Array.from(parent.querySelectorAll(selector));
}

function querySelector(selector: string, parent: ParentNode = document): Element | null {
    return parent.querySelector(selector);
}

function toggleClass(element: HTMLElement | null, className: string, force?: boolean): boolean {
    if (!element) return false;
    return element.classList.toggle(className, force);
}

function addClass(element: HTMLElement | null, ...classNames: string[]): HTMLElement | null {
    if (!element) return element;
    element.classList.add(...classNames);
    return element;
}

function removeClass(element: HTMLElement | null, ...classNames: string[]): HTMLElement | null {
    if (!element) return element;
    element.classList.remove(...classNames);
    return element;
}

function hasClass(element: HTMLElement | null, className: string): boolean {
    if (!element) return false;
    return element.classList.contains(className);
}

function setData(
    element: HTMLElement | null,
    key: string,
    value?: string
): string | HTMLElement | null {
    if (!element) return value === undefined ? null : element;
    if (value === undefined) return element.dataset[key] ?? null;
    element.dataset[key] = value;
    return element;
}

export {
    createElement as $create,
    getElementById,
    querySelectorAll,
    querySelector,
    toggleClass,
    addClass,
    removeClass,
    hasClass,
    setData,
};
