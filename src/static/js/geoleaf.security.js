/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @fileoverview Module de sécurité GeoLeaf
 * Gère l'échappement HTML, validation URLs, sanitization
 *
 * @module GeoLeaf.Security
 * @version 2.0.0
 * @author GeoLeaf Project
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Logger (défini par geoleaf.logger-shim.js chargé en premier)
    const Log = GeoLeaf.Log;

    /**
     * Module Security - Fonctions de sécurité centralisées
     * @namespace
     */
    const Security = {
        /**
         * Échappe les caractères HTML dangereux pour prévenir XSS
         * @param {string} str - Chaîne à échapper
         * @returns {string} Chaîne échappée
         * @example
         * Security.escapeHtml('<script>alert(1)</script>')
         * // Returns: '&lt;script&gt;alert(1)&lt;/script&gt;'
         */
        escapeHtml(str) {
            if (str === null || str === undefined) {
                return "";
            }

            if (typeof str !== "string") {
                str = String(str);
            }

            const div = document.createElement("div");
            div.textContent = str;
            // SAFE: innerHTML here gets the escaped version of textContent
            return div.innerHTML;
        },

        /**
         * Échappe les attributs HTML pour utilisation dans des attributs
         * @param {string} str - Chaîne à échapper
         * @returns {string} Chaîne échappée
         * @example
         * Security.escapeAttribute('value"onclick="alert(1)')
         * // Returns: 'value&quot;onclick=&quot;alert(1)'
         */
        escapeAttribute(str) {
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
        },

        /**
         * Valide une URL strictement avec whitelist de protocoles
         * @param {string} url - URL à valider
         * @param {string} [baseUrl] - URL de base pour résolution relative
         * @returns {string} URL validée
         * @throws {Error} Si URL invalide ou protocole non autorisé
         * @example
         * Security.validateUrl('https://example.com/data.json')
         * // Returns: 'https://example.com/data.json'
         *
         * Security.validateUrl('javascript:alert(1)')
         * // Throws: Error
         */
        validateUrl(url, baseUrl) {
            if (!url || typeof url !== "string") {
                throw new TypeError("URL must be a non-empty string");
            }

            // Normaliser l'URL
            url = url.trim();

            const base = baseUrl || global.location.origin;

            try {
                const parsed = new URL(url, base);

                // Whitelist de protocoles autorisés
                const ALLOWED_PROTOCOLS = ["http:", "https:", "data:"];

                if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
                    throw new Error(
                        `Protocol "${parsed.protocol}" not allowed. ` +
                            `Allowed protocols: ${ALLOWED_PROTOCOLS.join(", ")}`
                    );
                }

                // Validation supplémentaire pour data: URLs
                if (parsed.protocol === "data:") {
                    // Autoriser uniquement les images
                    const allowedDataTypes = [
                        "image/png",
                        "image/jpeg",
                        "image/jpg",
                        "image/gif",
                        "image/svg+xml",
                        "image/webp",
                    ];

                    const dataPrefix = url.split(",")[0];
                    const mimeMatch = dataPrefix.match(/data:([^;,]+)/);

                    if (!mimeMatch) {
                        throw new Error("Invalid data URL format");
                    }

                    const mimeType = mimeMatch[1];

                    if (!allowedDataTypes.includes(mimeType)) {
                        throw new Error(
                            `Data URL type "${mimeType}" not allowed. ` +
                                `Allowed: ${allowedDataTypes.join(", ")}`
                        );
                    }
                }

                return parsed.href;
            } catch (e) {
                if (e.message.includes("not allowed")) {
                    throw e;
                }
                throw new Error(`Invalid URL "${url}": ${e.message}`);
            }
        },

        /**
         * Valide des coordonnées géographiques
         * @param {number} lat - Latitude
         * @param {number} lng - Longitude
         * @returns {[number, number]} Coordonnées validées [lat, lng]
         * @throws {TypeError} Si les coordonnées ne sont pas des nombres
         * @throws {RangeError} Si les coordonnées sont hors limites
         * @example
         * Security.validateCoordinates(45.5, -73.6)
         * // Returns: [45.5, -73.6]
         *
         * Security.validateCoordinates(999, 0)
         * // Throws: RangeError
         */
        validateCoordinates(lat, lng) {
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
        },

        /**
         * Sanitize un objet de propriétés POI
         * Échappe les champs texte et valide les URLs
         * @param {Object} props - Propriétés à sanitizer
         * @returns {Object} Propriétés sanitizées
         * @example
         * Security.sanitizePoiProperties({
         *   label: '<script>alert(1)</script>',
         *   url: 'https://example.com'
         * })
         * // Returns: { label: '&lt;script&gt;...', url: 'https://example.com' }
         */
        sanitizePoiProperties(props) {
            if (!props || typeof props !== "object") {
                return {};
            }

            const sanitized = {};

            // Champs texte à échapper
            const textFields = [
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

            // Champs URL à valider
            const urlFields = ["url", "website", "image", "photo", "icon"];

            for (const [key, value] of Object.entries(props)) {
                // Ignorer les fonctions et symboles
                if (typeof value === "function" || typeof value === "symbol") {
                    continue;
                }

                // Null/undefined = chaîne vide
                if (value === null || value === undefined) {
                    sanitized[key] = "";
                    continue;
                }

                // Échapper les champs texte
                if (textFields.includes(key) && typeof value === "string") {
                    sanitized[key] = this.escapeHtml(value);
                }
                // Valider les URLs
                else if (urlFields.includes(key) && typeof value === "string") {
                    try {
                        sanitized[key] = this.validateUrl(value);
                    } catch (e) {
                        Log.warn(`[Security] Invalid URL for ${key}: ${e.message}`);
                        sanitized[key] = "";
                    }
                }
                // Tableaux : sanitizer récursivement
                else if (Array.isArray(value)) {
                    sanitized[key] = value.map((item) => {
                        if (typeof item === "object" && item !== null) {
                            return this.sanitizePoiProperties(item);
                        }
                        if (typeof item === "string") {
                            return this.escapeHtml(item);
                        }
                        return item;
                    });
                }
                // Objets : sanitizer récursivement
                else if (typeof value === "object" && value !== null) {
                    sanitized[key] = this.sanitizePoiProperties(value);
                }
                // Autres types : conserver tel quel
                else {
                    sanitized[key] = value;
                }
            }

            return sanitized;
        },

        /**
         * Vérifie si une chaîne contient du HTML potentiellement dangereux
         * @param {string} str - Chaîne à vérifier
         * @returns {boolean} True si contient du HTML dangereux
         * @example
         * Security.containsDangerousHtml('<script>alert(1)</script>')
         * // Returns: true
         */
        containsDangerousHtml(str) {
            if (typeof str !== "string") {
                return false;
            }

            const dangerousPatterns = [
                /<script/i,
                /javascript:/i,
                /on\w+\s*=/i, // onclick=, onerror=, etc.
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
        },

        /**
         * Nettoie une chaîne de tout HTML (garde uniquement le texte)
         * @param {string} html - HTML à nettoyer
         * @returns {string} Texte uniquement
         * @example
         * Security.stripHtml('<p>Hello <b>World</b></p>')
         * // Returns: 'Hello World'
         */
        stripHtml(html) {
            if (typeof html !== "string") {
                return "";
            }

            // SAFE: Utilisation de DOMParser au lieu de innerHTML pour éviter l'exécution de scripts
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            return doc.body.textContent || doc.body.innerText || "";
        },

        /**
         * Crée un élément DOM de manière sécurisée en échappant automatiquement le contenu
         * @param {string} tagName - Nom de la balise HTML
         * @param {Object} options - Options de configuration
         * @param {string} [options.className] - Classes CSS
         * @param {string} [options.id] - ID de l'élément
         * @param {string} [options.textContent] - Contenu texte (échappé automatiquement)
         * @param {Object} [options.attributes] - Attributs HTML
         * @param {Array<Element>} [options.children] - Éléments enfants
         * @returns {Element} Élément DOM créé
         * @example
         * Security.createSafeElement('div', {
         *     className: 'my-class',
         *     textContent: '<script>alert(1)</script>', // Automatiquement échappé
         *     children: [otherElement]
         * })
         */
        createSafeElement(tagName, options = {}) {
            const element = document.createElement(tagName);

            if (options.className) {
                element.className = options.className;
            }

            if (options.id) {
                element.id = options.id;
            }

            if (options.textContent) {
                // SAFE: textContent échappe automatiquement le HTML
                element.textContent = options.textContent;
            }

            if (options.attributes) {
                Object.keys(options.attributes).forEach(key => {
                    element.setAttribute(key, this.escapeAttribute(options.attributes[key]));
                });
            }

            if (options.children && Array.isArray(options.children)) {
                options.children.forEach(child => {
                    if (child instanceof Element) {
                        element.appendChild(child);
                    }
                });
            }

            return element;
        },

        /**
         * Parse et valide un contenu SVG de manière sécurisée
         * Utilise DOMParser au lieu de innerHTML pour éviter l'exécution de scripts
         * @param {string} svgContent - Contenu SVG brut
         * @returns {SVGElement|null} Élément SVG validé ou null si invalide
         * @example
         * Security.sanitizeSvgContent('<svg>...</svg>')
         * // Returns: SVGElement or null
         */
        sanitizeSvgContent(svgContent) {
            if (!svgContent || typeof svgContent !== "string") {
                return null;
            }

            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgContent, "image/svg+xml");

                // Vérifier les erreurs de parsing
                const parserError = doc.querySelector("parsererror");
                if (parserError) {
                    Log.warn("[Security] Erreur parsing SVG:", parserError.textContent);
                    return null;
                }

                const svgEl = doc.documentElement;
                if (!svgEl || svgEl.tagName.toLowerCase() !== "svg") {
                    Log.warn("[Security] Contenu SVG invalide: élément racine n'est pas SVG");
                    return null;
                }

                // Supprimer les éléments potentiellement dangereux
                const dangerousElements = ["script", "foreignObject", "use[href^='data:']"];
                dangerousElements.forEach(selector => {
                    const elements = svgEl.querySelectorAll(selector);
                    elements.forEach(el => el.remove());
                });

                // Supprimer les attributs event handlers (onclick, onerror, etc.)
                const allElements = svgEl.querySelectorAll("*");
                allElements.forEach(el => {
                    Array.from(el.attributes).forEach(attr => {
                        if (attr.name.toLowerCase().startsWith("on")) {
                            el.removeAttribute(attr.name);
                        }
                        // Supprimer les href javascript:
                        if ((attr.name === "href" || attr.name === "xlink:href") &&
                            attr.value.toLowerCase().trim().startsWith("javascript:")) {
                            el.removeAttribute(attr.name);
                        }
                    });
                });

                return svgEl;
            } catch (e) {
                Log.warn("[Security] Erreur sanitization SVG:", e.message);
                return null;
            }
        },

        /**
         * Valide qu'une valeur est un nombre dans une plage donnée
         * @param {*} value - Valeur à valider
         * @param {number} [min=-Infinity] - Valeur minimale
         * @param {number} [max=Infinity] - Valeur maximale
         * @returns {number|null} Nombre validé ou null si invalide
         * @example
         * Security.validateNumber("123", 0, 1000)
         * // Returns: 123
         *
         * Security.validateNumber("<script>", 0, 100)
         * // Returns: null
         */
        validateNumber(value, min = -Infinity, max = Infinity) {
            // Convertir en nombre
            const num = Number(value);

            // Vérifier que c'est un nombre fini
            if (!Number.isFinite(num)) {
                return null;
            }

            // Vérifier les bornes
            if (num < min || num > max) {
                return null;
            }

            return num;
        },

        /**
         * Parse du HTML de manière sécurisée avec whitelist de balises
         * @param {string} html - HTML à parser
         * @param {string[]} [allowedTags=['p','br','strong','em','span','a','ul','ol','li']] - Balises autorisées
         * @returns {DocumentFragment} Fragment DOM nettoyé
         * @example
         * Security.parseHtmlSafely('<p>Hello</p><script>alert(1)</script>')
         * // Returns: DocumentFragment with only <p>Hello</p>
         */
        parseHtmlSafely(html, allowedTags = ['p', 'br', 'strong', 'em', 'span', 'a', 'ul', 'ol', 'li', 'b', 'i']) {
            const fragment = document.createDocumentFragment();

            if (!html || typeof html !== "string") {
                return fragment;
            }

            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");

                // Fonction récursive pour nettoyer les nœuds
                const cleanNode = (node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        return document.createTextNode(node.textContent);
                    }

                    if (node.nodeType !== Node.ELEMENT_NODE) {
                        return null;
                    }

                    const tagName = node.tagName.toLowerCase();

                    // Si la balise n'est pas autorisée, retourner seulement le contenu texte
                    if (!allowedTags.includes(tagName)) {
                        const textNode = document.createTextNode(node.textContent);
                        return textNode;
                    }

                    // Créer un nouvel élément propre
                    const cleanElement = document.createElement(tagName);

                    // Pour les liens, conserver href mais valider
                    if (tagName === 'a' && node.hasAttribute('href')) {
                        try {
                            const href = this.validateUrl(node.getAttribute('href'));
                            cleanElement.setAttribute('href', href);
                            cleanElement.setAttribute('rel', 'noopener noreferrer');
                            cleanElement.setAttribute('target', '_blank');
                        } catch (e) {
                            // URL invalide, ignorer le lien
                        }
                    }

                    // Nettoyer les enfants récursivement
                    node.childNodes.forEach(child => {
                        const cleanChild = cleanNode(child);
                        if (cleanChild) {
                            cleanElement.appendChild(cleanChild);
                        }
                    });

                    return cleanElement;
                };

                // Nettoyer le body du document parsé
                doc.body.childNodes.forEach(child => {
                    const cleanChild = cleanNode(child);
                    if (cleanChild) {
                        fragment.appendChild(cleanChild);
                    }
                });

            } catch (e) {
                Log.warn("[Security] Erreur parsing HTML sécurisé:", e.message);
            }

            return fragment;
        },
    };

    // Export du module
    GeoLeaf.Security = Security;

    // Log du chargement
    Log.info("[GeoLeaf.Security] Module de sécurité chargé");
})(typeof window !== "undefined" ? window : global);
