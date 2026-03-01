/**
 * @module GeoLeaf.Utils.DomHelpers
 * Helpers pour cr�ation et manipulation d'�l�ments DOM
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
 * Cr�e un �l�ment DOM avec propri�t�s et enfants de mani�re d�clarative
 */
export function createElement(
    tag: string,
    props: CreateElementProps = {},
    ...children: (Node | string | number | boolean | null | undefined)[]
): HTMLElement {
    if (typeof tag !== "string" || !tag.trim()) {
        throw new TypeError("[DomHelpers] createElement: tag must be a non-empty string");
    }

    const element = document.createElement(tag);

    const {
        className,
        id,
        style,
        dataset: dataAttrs,
        attributes,
        textContent,
        innerHTML,
        _eventContext,
        _cleanupArray,
        ...otherProps
    } = props;

    if (className) element.className = String(className);
    if (id) element.id = String(id);
    if (style && typeof style === "object") {
        Object.assign(element.style, style);
    }
    if (dataAttrs && typeof dataAttrs === "object") {
        for (const [key, value] of Object.entries(dataAttrs)) {
            element.dataset[key] = value;
        }
    }
    if (attributes && typeof attributes === "object") {
        for (const [key, value] of Object.entries(attributes)) {
            element.setAttribute(key, String(value));
        }
    }

    const events = typeof GeoLeaf !== "undefined" ? GeoLeaf.Utils?.events : undefined;

    for (const [key, value] of Object.entries(otherProps)) {
        if (key.startsWith("on") && typeof value === "function") {
            const event = key.substring(2).toLowerCase();
            if (events) {
                const id = events.on(
                    element,
                    event,
                    value as EventListener,
                    false,
                    _eventContext || "DomHelpers.createElement"
                );
                if (
                    _cleanupArray &&
                    Array.isArray(_cleanupArray) &&
                    typeof id === "number" &&
                    events.off
                ) {
                    _cleanupArray.push(() => events.off!(id));
                }
            } else {
                element.addEventListener(event, value as EventListener);
            }
        } else if (key.startsWith("aria")) {
            const attrName = "aria-" + key.substring(4).toLowerCase();
            element.setAttribute(attrName, String(value));
        } else if (key in element) {
            (element as unknown as Record<string, unknown>)[key] = value;
        } else {
            element.setAttribute(key, String(value));
        }
    }

    if (textContent !== undefined) {
        element.textContent = String(textContent);
        return element;
    }

    if (innerHTML !== undefined) {
        if (Log?.warn) {
            Log.warn(
                "[DomHelpers] createElement avec innerHTML - contenu sanitizé via DOMSecurity",
                { tag, innerHTML: String(innerHTML).substring(0, 100) }
            );
        }
        const domSec =
            typeof GeoLeaf !== "undefined" ? GeoLeaf?.DOMSecurity : undefined;
        if (domSec?.setSafeHTML) {
            domSec.setSafeHTML(element as HTMLElement, String(innerHTML));
        } else {
            // GeoLeaf.DOMSecurity absent ou null → textContent (échappe le HTML)
            element.textContent = String(innerHTML);
        }
        return element;
    }

    appendChild(element, ...children);
    return element;
}

/**
 * Ajoute des enfants � un �l�ment parent
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
 * Vide un �l�ment de tous ses enfants
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
