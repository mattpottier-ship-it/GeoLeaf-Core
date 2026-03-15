/* eslint-disable security/detect-object-injection */
/*!



 * GeoLeaf Core



 * © 2026 Mattieu Pottier



 * Released under the MIT License



 * https://geoleaf.dev



 */

/**



 * @module security



 * @description Security functions for GeoLeaf — HTML escaping, URL validation, sanitization.



 */

import { Log } from "../log/index.js";

// ── Types ──

export interface SanitizeHtmlOptions {
    stripAll?: boolean;

    allowedTags?: string[];

    /** @deprecated Ignored — all content is now sanitized */

    trusted?: boolean;
}

export interface SafeElementOptions {
    className?: string;

    id?: string;

    textContent?: string;

    attributes?: Record<string, string>;

    children?: Element[];
}

// ── HTML Escaping ──

/**



 * Escape dangerous HTML characters to prevent XSS



 */

export function escapeHtml(str: string | null | undefined): string {
    if (str === null || str === undefined) {
        return "";
    }

    if (typeof str !== "string") {
        str = String(str);
    }

    const div = document.createElement("div");

    div.textContent = str;

    return div.innerHTML;
}

/**



 * Escape HTML attributes for safe use in attribute values



 */

export function escapeAttribute(str: string | null | undefined): string {
    if (str === null || str === undefined) {
        return "";
    }

    if (typeof str !== "string") {
        str = String(str);
    }

    return str

        .replace(/&/g, "&amp;")

        .replace(/'/g, "&#39;")

        .replace(/"/g, "&quot;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;");
}

// ── URL Validation ──

export interface ValidateUrlOptions {
    /** When true, only https: and data: (images) allowed; http: rejected. Default false. */

    httpsOnly?: boolean;
}

/**



 * Validate a URL strictly with protocol whitelist



 * @param options - Optional: { httpsOnly: true } to reject http: (production hardening)



 * @throws {Error} If URL is invalid or protocol not allowed



 */

function _resolveBaseUrl(baseUrl?: string): string {
    const _loc =
        typeof globalThis !== "undefined" && "location" in globalThis
            ? (globalThis as unknown as { location: { origin?: string } }).location
            : typeof location !== "undefined"
              ? location
              : null;

    return baseUrl ?? _loc?.origin ?? "https://localhost";
}

const _ALLOWED_DATA_TYPES = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/svg+xml",
    "image/webp",
];

function _validateDataUrl(url: string): void {
    const dataPrefix = url.split(",")[0];

    const mimeMatch = dataPrefix.match(/data:([^;,]+)/);

    if (!mimeMatch) throw new Error("Invalid data URL format");

    if (!_ALLOWED_DATA_TYPES.includes(mimeMatch[1])) {
        throw new Error(
            `Data URL type "${mimeMatch[1]}" not allowed. Allowed: ${_ALLOWED_DATA_TYPES.join(", ")}`
        );
    }
}

export function validateUrl(url: string, baseUrl?: string, options?: ValidateUrlOptions): string {
    if (!url || typeof url !== "string") {
        throw new TypeError("URL must be a non-empty string");
    }

    url = url.trim();

    const base = _resolveBaseUrl(baseUrl);

    try {
        const parsed = new URL(url, base);

        const allowedProtocols = options?.httpsOnly
            ? ["https:", "data:"]
            : ["http:", "https:", "data:"];

        if (!allowedProtocols.includes(parsed.protocol)) {
            throw new Error(
                options?.httpsOnly
                    ? "Only https: and data: (images) URLs are allowed when security.httpsOnly is enabled."
                    : `Protocol "${parsed.protocol}" not allowed. Allowed protocols: ${allowedProtocols.join(", ")}`
            );
        }

        if (parsed.protocol === "data:") {
            _validateDataUrl(url);
        }

        return parsed.href;
    } catch (e) {
        const err = e as Error;

        if (err.message?.includes("not allowed")) {
            throw e;
        }

        throw new Error(`Invalid URL "${url}": ${err.message}`);
    }
}

export function validateCoordinates(lat: number, lng: number): [number, number] {
    if (typeof lat !== "number" || typeof lng !== "number") {
        throw new TypeError(
            `Coordinates must be numbers, got lat=${typeof lat}, lng=${typeof lng}`
        );
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new RangeError("Coordinates must be finite numbers (not NaN or Infinity)");
    }

    if (lat < -90 || lat > 90) {
        throw new RangeError(`Latitude must be between -90 and 90, got ${lat}`);
    }

    if (lng < -180 || lng > 180) {
        throw new RangeError(`Longitude must be between -180 and 180, got ${lng}`);
    }

    return [lat, lng];
}

// ── POI Sanitization ──

/** Recursive value for POI properties */

type _PoiValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | _PoiValue[]
    | { [key: string]: _PoiValue };

/**



 * Sanitize a POI properties object — escapes text fields and validates URLs



 */

const _TEXT_FIELDS = [
    "label",
    "name",
    "title",
    "description",
    "desc",
    "address",
    "phone",
    "email",
    "category",
    "type",
];

const _URL_FIELDS = ["url", "website", "image", "photo", "icon"];

function _sanitizeStringValue(key: string, value: string): string {
    if (_TEXT_FIELDS.includes(key)) return escapeHtml(value);

    if (_URL_FIELDS.includes(key)) {
        try {
            return validateUrl(value);
        } catch (e) {
            Log.warn(`[Security] Invalid URL for ${key}: ${(e as Error).message}`);
            return "";
        }
    }

    return value;
}

function _sanitizeEntry(key: string, value: unknown, sanitized: Record<string, unknown>): void {
    if (typeof value === "function" || typeof value === "symbol") return;

    if (value === null || value === undefined) {
        sanitized[key] = "";
        return;
    }

    if (typeof value === "string") {
        sanitized[key] = _sanitizeStringValue(key, value);
        return;
    }

    if (Array.isArray(value)) {
        sanitized[key] = value.map((item: unknown) => {
            if (typeof item === "object" && item !== null)
                return sanitizePoiProperties(item as Record<string, unknown>);

            if (typeof item === "string") return escapeHtml(item);

            return item;
        });

        return;
    }

    if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizePoiProperties(value as Record<string, unknown>);
    } else {
        sanitized[key] = value;
    }
}

export function sanitizePoiProperties(
    props: Record<string, unknown> | null | undefined
): Record<string, unknown> {
    if (!props || typeof props !== "object") {
        return {};
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(props)) {
        _sanitizeEntry(key, value, sanitized);
    }

    return sanitized;
}

export function containsDangerousHtml(str: unknown): boolean {
    if (typeof str !== "string") return false;

    const dangerousPatterns = [
        /<script/i,

        /javascript:/i,

        /on\w+\s*=/i,

        /<iframe/i,

        /<object/i,

        /<embed/i,

        /<applet/i,

        /<meta/i,

        /<link/i,

        /vbscript:/i,

        /data:text\/html/i,
    ];

    return dangerousPatterns.some((pattern) => pattern.test(str));
}

/**



 * Strip all HTML from a string, keeping only text content



 */

export function stripHtml(html: string): string {
    if (typeof html !== "string") return "";

    const parser = new DOMParser();

    const doc = parser.parseFromString(html, "text/html");

    return doc.body.textContent ?? doc.body.innerText ?? "";
}

// ── Safe DOM Creation ──

/**



 * Create a DOM element safely with automatic content escaping



 */

export function createSafeElement(tagName: string, options: SafeElementOptions = {}): Element {
    const element = document.createElement(tagName);

    if (options.className) element.className = options.className;

    if (options.id) element.id = options.id;

    if (options.textContent) {
        element.textContent = options.textContent;
    }

    if (options.attributes) {
        Object.keys(options.attributes).forEach((key) => {
            element.setAttribute(key, escapeAttribute(options.attributes![key]));
        });
    }

    if (options.children && Array.isArray(options.children)) {
        options.children.forEach((child) => {
            if (child instanceof Element) element.appendChild(child);
        });
    }

    return element;
}

// ── SVG Sanitization ──

/**



 * Parse and sanitize SVG content safely



 */

export function sanitizeSvgContent(svgContent: string | null | undefined): SVGElement | null {
    if (!svgContent || typeof svgContent !== "string") return null;

    try {
        const parser = new DOMParser();

        const doc = parser.parseFromString(svgContent, "image/svg+xml");

        const parserError = doc.querySelector("parsererror");

        if (parserError) {
            Log.warn("[Security] Error parsing SVG:", parserError.textContent ?? "");

            return null;
        }

        const svgEl = doc.documentElement;

        if (!svgEl || svgEl.tagName.toLowerCase() !== "svg") {
            Log.warn("[Security] Invalid SVG content: root element is not SVG");

            return null;
        }

        const dangerousElements = ["script", "foreignObject", "use[href^='data:']"];

        dangerousElements.forEach((selector) => {
            const elements = svgEl.querySelectorAll(selector);

            elements.forEach((el) => el.remove());
        });

        const allElements = svgEl.querySelectorAll("*");

        allElements.forEach((el) => {
            Array.from(el.attributes).forEach((attr) => {
                if (attr.name.toLowerCase().startsWith("on")) {
                    el.removeAttribute(attr.name);
                }

                const isHref = attr.name === "href" || attr.name === "xlink:href";

                const val = (attr.value || "").toLowerCase().trim();

                const jsProto = "javascript" + ":";

                const isJsProtocol =
                    val.length >= jsProto.length && val.slice(0, jsProto.length) === jsProto;

                if (isHref && isJsProtocol) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        return svgEl as unknown as SVGElement;
    } catch (e) {
        Log.warn("[Security] Erreur sanitization SVG:", (e as Error).message);

        return null;
    }
}

// ── Number Validation ──

/**



 * Validate that a value is a number within a given range



 */

export function validateNumber(
    value: unknown,

    min: number = -Infinity,

    max: number = Infinity
): number | null {
    const num = Number(value);

    if (!Number.isFinite(num)) return null;

    if (num < min || num > max) return null;

    return num;
}

// ── Safe HTML Parsing ──

const DEFAULT_ALLOWED_TAGS = ["p", "br", "strong", "em", "span", "a", "ul", "ol", "li", "b", "i"];

/**



 * Parse HTML safely with tag whitelist



 */

export function parseHtmlSafely(
    html: string,

    allowedTags: string[] = DEFAULT_ALLOWED_TAGS
): DocumentFragment {
    const fragment = document.createDocumentFragment();

    if (!html || typeof html !== "string") return fragment;

    try {
        const parser = new DOMParser();

        const doc = parser.parseFromString(html, "text/html");

        const cleanNode = (node: ChildNode): Text | HTMLElement | null => {
            if (node.nodeType === Node.TEXT_NODE) {
                return document.createTextNode(node.textContent ?? "");
            }

            if (node.nodeType !== Node.ELEMENT_NODE) return null;

            const tagName = (node as Element).tagName.toLowerCase();

            if (!allowedTags.includes(tagName)) {
                return document.createTextNode(node.textContent ?? "");
            }

            const cleanElement = document.createElement(tagName);

            if (tagName === "a" && (node as Element).hasAttribute("href")) {
                try {
                    const href = validateUrl((node as Element).getAttribute("href")!);

                    cleanElement.setAttribute("href", href);

                    cleanElement.setAttribute("rel", "noopener noreferrer");

                    cleanElement.setAttribute("target", "_blank");
                } catch {
                    // Invalid URL — ignore the link
                }
            }

            node.childNodes.forEach((child) => {
                const cleanChild = cleanNode(child);

                if (cleanChild) cleanElement.appendChild(cleanChild);
            });

            return cleanElement;
        };

        doc.body.childNodes.forEach((child) => {
            const cleanChild = cleanNode(child);

            if (cleanChild) fragment.appendChild(cleanChild);
        });
    } catch (e) {
        Log.warn("[Security] Error parsing safe HTML:", (e as Error).message);
    }

    return fragment;
}

// ── Alias for backward compatibility ──

/** Clear element children without innerHTML (same contract as DOMSecurity.clearElement; avoids circular import). */

function clearElementContent(el: Element): void {
    const htmlEl = el as HTMLElement;

    if (!htmlEl?.firstChild) return;

    while (htmlEl.firstChild) {
        htmlEl.removeChild(htmlEl.firstChild);
    }
}

/**



 * Sanitize HTML content and inject into a DOM element safely.



 * @returns The element for chaining, or null if invalid



 */

export function sanitizeHTML(
    element: Element,

    html: string | null | undefined,

    options: SanitizeHtmlOptions = {}
): Element | null {
    if (!element || typeof (element as HTMLElement).appendChild !== "function") return null;

    if (html == null) {
        clearElementContent(element);

        return element;
    }

    const str = typeof html === "string" ? html : String(html);

    if (options.trusted) {
        Log.warn(
            "[GeoLeaf.Security] sanitizeHTML({ trusted: true }) is deprecated and ignored. All content is now sanitized."
        );
    }

    if (options.stripAll) {
        (element as HTMLElement).textContent = stripHtml(str);

        return element;
    }

    const allowedTags = options.allowedTags ?? DEFAULT_ALLOWED_TAGS;

    const fragment = parseHtmlSafely(str, allowedTags);

    clearElementContent(element);

    element.appendChild(fragment);

    return element;
}

// ── Aggregate export (facade) ──

export const Security = {
    escapeHtml,

    escapeAttribute,

    validateUrl,

    validateCoordinates,

    sanitizePoiProperties,

    containsDangerousHtml,

    stripHtml,

    createSafeElement,

    sanitizeSvgContent,

    validateNumber,

    parseHtmlSafely,

    sanitizeHTML,
};
