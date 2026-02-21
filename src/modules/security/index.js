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

import { Log } from '../log/index.js';

// ── HTML Escaping ──

/**
 * Escape dangerous HTML characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) {
        return '';
    }
    if (typeof str !== 'string') {
        str = String(str);
    }
    const div = document.createElement('div');
    div.textContent = str;
    // SAFE: innerHTML here gets the escaped version of textContent
    return div.innerHTML;
}

/**
 * Escape HTML attributes for safe use in attribute values
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeAttribute(str) {
    if (str === null || str === undefined) {
        return '';
    }
    if (typeof str !== 'string') {
        str = String(str);
    }
    return str
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ── URL Validation ──

/**
 * Validate a URL strictly with protocol whitelist
 * @param {string} url - URL to validate
 * @param {string} [baseUrl] - Base URL for resolving relative URLs
 * @returns {string} Validated URL
 * @throws {Error} If URL is invalid or protocol not allowed
 */
export function validateUrl(url, baseUrl) {
    if (!url || typeof url !== 'string') {
        throw new TypeError('URL must be a non-empty string');
    }

    url = url.trim();

    const _loc = typeof globalThis !== 'undefined' && globalThis.location ? globalThis.location : (typeof location !== 'undefined' ? location : null);
    const base = baseUrl || (_loc && _loc.origin) || 'https://localhost';

    try {
        const parsed = new URL(url, base);

        const ALLOWED_PROTOCOLS = ['http:', 'https:', 'data:'];
        if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
            throw new Error(
                `Protocol "${parsed.protocol}" not allowed. Allowed protocols: ${ALLOWED_PROTOCOLS.join(', ')}`
            );
        }

        // Additional validation for data: URLs
        if (parsed.protocol === 'data:') {
            const allowedDataTypes = [
                'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
                'image/svg+xml', 'image/webp'
            ];
            const dataPrefix = url.split(',')[0];
            const mimeMatch = dataPrefix.match(/data:([^;,]+)/);
            if (!mimeMatch) {
                throw new Error('Invalid data URL format');
            }
            if (!allowedDataTypes.includes(mimeMatch[1])) {
                throw new Error(
                    `Data URL type "${mimeMatch[1]}" not allowed. Allowed: ${allowedDataTypes.join(', ')}`
                );
            }
        }

        return parsed.href;
    } catch (e) {
        if (e.message.includes('not allowed')) {
            throw e;
        }
        throw new Error(`Invalid URL "${url}": ${e.message}`);
    }
}

// ── Coordinate Validation ──

/**
 * Validate geographic coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {[number, number]} Validated coordinates [lat, lng]
 * @throws {TypeError|RangeError} If coordinates are invalid
 */
export function validateCoordinates(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        throw new TypeError(
            `Coordinates must be numbers, got lat=${typeof lat}, lng=${typeof lng}`
        );
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new RangeError('Coordinates must be finite numbers (not NaN or Infinity)');
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

/**
 * Sanitize a POI properties object — escapes text fields and validates URLs
 * @param {Object} props - Properties to sanitize
 * @returns {Object} Sanitized properties
 */
export function sanitizePoiProperties(props) {
    if (!props || typeof props !== 'object') {
        return {};
    }

    const sanitized = {};
    const textFields = ['label', 'name', 'title', 'description', 'desc', 'address', 'phone', 'email', 'category', 'type'];
    const urlFields = ['url', 'website', 'image', 'photo', 'icon'];

    for (const [key, value] of Object.entries(props)) {
        if (typeof value === 'function' || typeof value === 'symbol') continue;

        if (value === null || value === undefined) {
            sanitized[key] = '';
            continue;
        }

        if (textFields.includes(key) && typeof value === 'string') {
            sanitized[key] = escapeHtml(value);
        } else if (urlFields.includes(key) && typeof value === 'string') {
            try {
                sanitized[key] = validateUrl(value);
            } catch (e) {
                Log.warn(`[Security] Invalid URL for ${key}: ${e.message}`);
                sanitized[key] = '';
            }
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => {
                if (typeof item === 'object' && item !== null) return sanitizePoiProperties(item);
                if (typeof item === 'string') return escapeHtml(item);
                return item;
            });
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizePoiProperties(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

// ── HTML Detection & Stripping ──

/**
 * Check if a string contains potentially dangerous HTML
 * @param {string} str - String to check
 * @returns {boolean} True if contains dangerous HTML
 */
export function containsDangerousHtml(str) {
    if (typeof str !== 'string') return false;

    const dangerousPatterns = [
        /<script/i, /javascript:/i, /on\w+\s*=/i,
        /<iframe/i, /<object/i, /<embed/i,
        /<applet/i, /<meta/i, /<link/i,
        /vbscript:/i, /data:text\/html/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(str));
}

/**
 * Strip all HTML from a string, keeping only text content
 * @param {string} html - HTML to strip
 * @returns {string} Plain text
 */
export function stripHtml(html) {
    if (typeof html !== 'string') return '';

    // SAFE: DOMParser instead of innerHTML to avoid script execution
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || doc.body.innerText || '';
}

// ── Safe DOM Creation ──

/**
 * Create a DOM element safely with automatic content escaping
 * @param {string} tagName - HTML tag name
 * @param {Object} options - Configuration
 * @returns {Element} Created DOM element
 */
export function createSafeElement(tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.className) element.className = options.className;
    if (options.id) element.id = options.id;
    if (options.textContent) {
        // SAFE: textContent automatically escapes HTML
        element.textContent = options.textContent;
    }
    if (options.attributes) {
        Object.keys(options.attributes).forEach(key => {
            element.setAttribute(key, escapeAttribute(options.attributes[key]));
        });
    }
    if (options.children && Array.isArray(options.children)) {
        options.children.forEach(child => {
            if (child instanceof Element) element.appendChild(child);
        });
    }

    return element;
}

// ── SVG Sanitization ──

/**
 * Parse and sanitize SVG content safely
 * @param {string} svgContent - Raw SVG content
 * @returns {SVGElement|null} Sanitized SVG element or null
 */
export function sanitizeSvgContent(svgContent) {
    if (!svgContent || typeof svgContent !== 'string') return null;

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');

        const parserError = doc.querySelector('parsererror');
        if (parserError) {
            Log.warn('[Security] Erreur parsing SVG:', parserError.textContent);
            return null;
        }

        const svgEl = doc.documentElement;
        if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') {
            Log.warn("[Security] Contenu SVG invalide: élément racine n'est pas SVG");
            return null;
        }

        // Remove dangerous elements
        const dangerousElements = ['script', 'foreignObject', "use[href^='data:']"];
        dangerousElements.forEach(selector => {
            const elements = svgEl.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });

        // Remove event handler attributes
        const allElements = svgEl.querySelectorAll('*');
        allElements.forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.toLowerCase().startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
                if ((attr.name === 'href' || attr.name === 'xlink:href') &&
                    attr.value.toLowerCase().trim().startsWith('javascript:')) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        return svgEl;
    } catch (e) {
        Log.warn('[Security] Erreur sanitization SVG:', e.message);
        return null;
    }
}

// ── Number Validation ──

/**
 * Validate that a value is a number within a given range
 * @param {*} value - Value to validate
 * @param {number} [min=-Infinity] - Minimum value
 * @param {number} [max=Infinity] - Maximum value
 * @returns {number|null} Validated number or null
 */
export function validateNumber(value, min = -Infinity, max = Infinity) {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    if (num < min || num > max) return null;
    return num;
}

// ── Safe HTML Parsing ──

/**
 * Parse HTML safely with tag whitelist
 * @param {string} html - HTML to parse
 * @param {string[]} [allowedTags] - Allowed tag names
 * @returns {DocumentFragment} Cleaned DOM fragment
 */
export function parseHtmlSafely(html, allowedTags = ['p', 'br', 'strong', 'em', 'span', 'a', 'ul', 'ol', 'li', 'b', 'i']) {
    const fragment = document.createDocumentFragment();
    if (!html || typeof html !== 'string') return fragment;

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const cleanNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return document.createTextNode(node.textContent);
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return null;

            const tagName = node.tagName.toLowerCase();
            if (!allowedTags.includes(tagName)) {
                return document.createTextNode(node.textContent);
            }

            const cleanElement = document.createElement(tagName);

            if (tagName === 'a' && node.hasAttribute('href')) {
                try {
                    const href = validateUrl(node.getAttribute('href'));
                    cleanElement.setAttribute('href', href);
                    cleanElement.setAttribute('rel', 'noopener noreferrer');
                    cleanElement.setAttribute('target', '_blank');
                } catch (_) {
                    // Invalid URL — ignore the link
                }
            }

            node.childNodes.forEach(child => {
                const cleanChild = cleanNode(child);
                if (cleanChild) cleanElement.appendChild(cleanChild);
            });

            return cleanElement;
        };

        doc.body.childNodes.forEach(child => {
            const cleanChild = cleanNode(child);
            if (cleanChild) fragment.appendChild(cleanChild);
        });
    } catch (e) {
        Log.warn('[Security] Erreur parsing HTML sécurisé:', e.message);
    }

    return fragment;
}

// ── Alias for backward compatibility ──

/**
 * Sanitize HTML content and inject into a DOM element safely.
 * @param {Element} element - Target DOM element
 * @param {string} html - HTML string to sanitize
 * @param {Object} [options] - Options
 * @param {boolean} [options.stripAll=false] - Strip all HTML, keep text only
 * @param {string[]} [options.allowedTags] - Whitelist of allowed tags
 * @returns {Element|null} The element for chaining, or null if invalid
 */
export function sanitizeHTML(element, html, options = {}) {
    if (!element || typeof element.appendChild !== 'function') return null;

    if (html == null) {
        element.innerHTML = '';
        return element;
    }

    const str = typeof html === 'string' ? html : String(html);

    // SECURITY: 'trusted' option removed — all content is now sanitized.
    // Use parseHtmlSafely with a broad allowedTags list if you need rich HTML.
    if (options.trusted) {
        Log.warn('[GeoLeaf.Security] sanitizeHTML({ trusted: true }) is deprecated and ignored. All content is now sanitized.');
    }

    if (options.stripAll) {
        element.textContent = stripHtml(str);
        return element;
    }

    const allowedTags = options.allowedTags || ['p', 'br', 'strong', 'em', 'span', 'a', 'ul', 'ol', 'li', 'b', 'i'];
    const fragment = parseHtmlSafely(str, allowedTags);
    element.innerHTML = '';
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
    sanitizeHTML
};

// ── Backward compatibility moved to globals.js ──
