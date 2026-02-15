/**
 * @module GeoLeaf.Utils.DomHelpers
 * Helpers pour création et manipulation d'éléments DOM
 * Simplifie et standardise la création d'éléments DOM dans tout le projet
 *
 * @version 1.0.0
 * @requires GeoLeaf.Security (pour sanitization)
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf.Utils = GeoLeaf.Utils || {};

    /**
     * Crée un élément DOM avec propriétés et enfants de manière déclarative
     * Cette fonction simplifie la création d'éléments DOM complexes
     *
     * @param {string} tag - Nom du tag HTML (ex: 'div', 'span', 'button')
     * @param {Object} [props={}] - Propriétés de l'élément
     * @param {string} [props.className] - Classes CSS
     * @param {string} [props.id] - ID de l'élément
     * @param {Object} [props.style] - Styles inline (objet)
     * @param {Object} [props.dataset] - Data attributes (objet)
     * @param {Object} [props.attributes] - Attributs HTML (objet)
     * @param {Function} [props.on*] - Event handlers (ex: onClick, onMouseOver)
     * @param {string} [props._eventContext] - Context for EventListenerManager tracking
     * @param {Array} [props._cleanupArray] - Array to store cleanup functions
     * @param {...(Node|string|number)} children - Enfants de l'élément
     * @returns {HTMLElement} L'élément créé
     *
     * @example
     * // Simple div avec classe
     * createElement('div', { className: 'card' })
     *
     * @example
     * // Div avec enfants
     * createElement('div', { className: 'card' },
     *     createElement('h2', {}, 'Title'),
     *     createElement('p', {}, 'Content')
     * )
     *
     * @example
     * // Bouton avec event handler (auto-cleanup with EventListenerManager)
     * createElement('button', {
     *     className: 'btn',
     *     onClick: (e) => console.log('Clicked!'),
     *     dataset: { action: 'submit' },
     *     _eventContext: 'MyModule.button'
     * }, 'Click me')
     *
     * @example
     * // With cleanup tracking
     * const cleanups = [];
     * createElement('button', {
     *     onClick: handler,
     *     _cleanupArray: cleanups,
     *     _eventContext: 'MyModule'
     * }, 'Click')
     * // Later: cleanups.forEach(fn => fn())
     */
    function createElement(tag, props = {}, ...children) {
        // Validate tag parameter
        if (typeof tag !== 'string' || !tag.trim()) {
            throw new TypeError('[DomHelpers] createElement: tag must be a non-empty string');
        }

        const element = document.createElement(tag);

        // Traiter les propriétés spéciales en premier
        const {
            className,
            id,
            style,
            dataset,
            attributes,
            textContent,
            innerHTML,
            _eventContext,
            _cleanupArray,
            ...otherProps
        } = props;

        // Appliquer className
        if (className) {
            element.className = className;
        }

        // Appliquer ID
        if (id) {
            element.id = id;
        }

        // Appliquer styles
        if (style && typeof style === 'object') {
            Object.assign(element.style, style);
        }

        // Appliquer data attributes
        if (dataset && typeof dataset === 'object') {
            for (const [key, value] of Object.entries(dataset)) {
                element.dataset[key] = value;
            }
        }

        // Appliquer attributes HTML
        if (attributes && typeof attributes === 'object') {
            for (const [key, value] of Object.entries(attributes)) {
                element.setAttribute(key, value);
            }
        }

        // Appliquer les autres propriétés (event handlers, etc.)
        const events = GeoLeaf.Utils?.events;

        for (const [key, value] of Object.entries(otherProps)) {
            // Event handlers (onClick, onMouseOver, etc.)
            if (key.startsWith('on') && typeof value === 'function') {
                const event = key.substring(2).toLowerCase();

                // Use EventListenerManager for auto-cleanup if available
                if (events) {
                    const cleanup = events.on(
                        element,
                        event,
                        value,
                        false,
                        _eventContext || 'DomHelpers.createElement'
                    );

                    // Store cleanup function if array provided
                    if (_cleanupArray && Array.isArray(_cleanupArray)) {
                        _cleanupArray.push(cleanup);
                    }
                } else {
                    // Fallback to native addEventListener
                    element.addEventListener(event, value);
                }
            }
            // Propriétés aria-*
            else if (key.startsWith('aria')) {
                const attrName = 'aria-' + key.substring(4).toLowerCase();
                element.setAttribute(attrName, value);
            }
            // Autres propriétés directes
            else if (key in element) {
                element[key] = value;
            }
            // Fallback: setAttribute
            else {
                element.setAttribute(key, value);
            }
        }

        // Appliquer textContent si fourni (écrase innerHTML et children)
        if (textContent !== undefined) {
            element.textContent = textContent;
            return element; // Ignorer children si textContent est fourni
        }

        // Appliquer innerHTML si fourni (écrase children)
        // WARNING: N'utiliser qu'avec du contenu sécurisé/sanitizé
        if (innerHTML !== undefined) {
            if (GeoLeaf.Log && GeoLeaf.Log.warn) {
                GeoLeaf.Log.warn(
                    '[DomHelpers] createElement avec innerHTML - assurez-vous que le contenu est sanitizé',
                    { tag, innerHTML: innerHTML.substring(0, 100) }
                );
            }

            // Use DOMSecurity if available, otherwise use textContent as safer fallback
            if (GeoLeaf.DOMSecurity && typeof GeoLeaf.DOMSecurity.setSafeHTML === 'function') {
                GeoLeaf.DOMSecurity.setSafeHTML(element, innerHTML);
            } else {
                // Fallback: convert to text for security
                if (GeoLeaf.Log && GeoLeaf.Log.error) {
                    GeoLeaf.Log.error('[DomHelpers] DOMSecurity not available, using textContent fallback');
                }
                element.textContent = innerHTML;
            }
            return element; // Ignorer children si innerHTML est fourni
        }

        // Ajouter les enfants
        appendChild(element, ...children);

        return element;
    }

    /**
     * Ajoute des enfants à un élément parent
     * Gère automatiquement les strings, numbers, nodes, et tableaux
     *
     * @param {HTMLElement} parent - Élément parent
     * @param {...(Node|string|number|Array)} children - Enfants à ajouter
     * @returns {HTMLElement} Le parent (pour chaînage)
     *
     * @example
     * appendChild(div, 'Text', createElement('span', {}, 'More text'))
     *
     * @example
     * // Avec tableau
     * appendChild(ul, items.map(item => createElement('li', {}, item)))
     */
    function appendChild(parent, ...children) {
        for (const child of children) {
            if (child == null || child === false) {
                // Ignorer null, undefined, false (utile pour render conditionnel)
                continue;
            }

            // Si c'est un tableau, l'aplatir récursivement
            if (Array.isArray(child)) {
                appendChild(parent, ...child);
            }
            // Si c'est une string ou number, créer un TextNode
            else if (typeof child === 'string' || typeof child === 'number') {
                parent.appendChild(document.createTextNode(String(child)));
            }
            // Si c'est un Node, l'ajouter directement
            else if (child instanceof Node) {
                parent.appendChild(child);
            }
            // Sinon, convertir en string et ajouter comme TextNode
            else {
                parent.appendChild(document.createTextNode(String(child)));
            }
        }
        return parent;
    }

    /**
     * Vide un élément de tous ses enfants
     *
     * @param {HTMLElement} element - Élément à vider
     * @returns {HTMLElement} L'élément (pour chaînage)
     *
     * @example
     * clearElement(container)
     */
    function clearElement(element) {
        if (!element) return element;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        return element;
    }

    /**
     * Trouve un élément par ID avec validation
     *
     * @param {string} id - ID de l'élément
     * @param {boolean} [required=false] - Si true, lance une erreur si non trouvé
     * @returns {HTMLElement|null} L'élément trouvé ou null
     * @throws {Error} Si required=true et élément non trouvé
     *
     * @example
     * const el = getElementById('my-element', true) // Lance erreur si absent
     */
    function getElementById(id, required = false) {
        const element = document.getElementById(id);
        if (required && !element) {
            throw new Error(`Element with id "${id}" not found`);
        }
        return element;
    }

    /**
     * Trouve des éléments par sélecteur CSS
     *
     * @param {string} selector - Sélecteur CSS
     * @param {HTMLElement} [parent=document] - Élément parent pour la recherche
     * @returns {HTMLElement[]} Tableau d'éléments trouvés
     *
     * @example
     * const buttons = querySelectorAll('.btn')
     */
    function querySelectorAll(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    }

    /**
     * Trouve un élément par sélecteur CSS
     *
     * @param {string} selector - Sélecteur CSS
     * @param {HTMLElement} [parent=document] - Élément parent pour la recherche
     * @returns {HTMLElement|null} Premier élément trouvé ou null
     *
     * @example
     * const button = querySelector('.btn-primary')
     */
    function querySelector(selector, parent = document) {
        return parent.querySelector(selector);
    }

    /**
     * Toggle une classe CSS sur un élément
     *
     * @param {HTMLElement} element - Élément cible
     * @param {string} className - Nom de la classe
     * @param {boolean} [force] - Force l'ajout (true) ou le retrait (false)
     * @returns {boolean} True si la classe est présente après toggle
     *
     * @example
     * toggleClass(element, 'active')
     * toggleClass(element, 'hidden', false) // Force retrait
     */
    function toggleClass(element, className, force) {
        if (!element) return false;
        return element.classList.toggle(className, force);
    }

    /**
     * Ajoute une ou plusieurs classes à un élément
     *
     * @param {HTMLElement} element - Élément cible
     * @param {...string} classNames - Classes à ajouter
     * @returns {HTMLElement} L'élément (pour chaînage)
     *
     * @example
     * addClass(element, 'active', 'visible')
     */
    function addClass(element, ...classNames) {
        if (!element) return element;
        element.classList.add(...classNames);
        return element;
    }

    /**
     * Retire une ou plusieurs classes d'un élément
     *
     * @param {HTMLElement} element - Élément cible
     * @param {...string} classNames - Classes à retirer
     * @returns {HTMLElement} L'élément (pour chaînage)
     *
     * @example
     * removeClass(element, 'active', 'visible')
     */
    function removeClass(element, ...classNames) {
        if (!element) return element;
        element.classList.remove(...classNames);
        return element;
    }

    /**
     * Vérifie si un élément a une classe
     *
     * @param {HTMLElement} element - Élément à vérifier
     * @param {string} className - Nom de la classe
     * @returns {boolean} True si la classe est présente
     *
     * @example
     * if (hasClass(element, 'active')) { ... }
     */
    function hasClass(element, className) {
        if (!element) return false;
        return element.classList.contains(className);
    }

    /**
     * Définit ou récupère un attribut data-*
     *
     * @param {HTMLElement} element - Élément cible
     * @param {string} key - Nom de l'attribut (sans 'data-')
     * @param {*} [value] - Valeur à définir (omis pour lecture)
     * @returns {string|HTMLElement} Valeur lue ou élément (pour chaînage)
     *
     * @example
     * setData(element, 'id', '123') // Définir
     * const id = setData(element, 'id') // Lire
     */
    function setData(element, key, value) {
        if (!element) return value === undefined ? null : element;
        if (value === undefined) {
            return element.dataset[key];
        }
        element.dataset[key] = value;
        return element;
    }

    // Exposer le module
    GeoLeaf.Utils.DomHelpers = {
        createElement,
        appendChild,
        clearElement,
        getElementById,
        querySelector,
        querySelectorAll,
        toggleClass,
        addClass,
        removeClass,
        hasClass,
        setData
    };

    // Alias sur GeoLeaf.Utils pour compatibilité et facilité d'usage
    GeoLeaf.Utils.createElement = createElement;
    GeoLeaf.Utils.appendChild = appendChild;
    GeoLeaf.Utils.clearElement = clearElement;

    if (GeoLeaf.Log && GeoLeaf.Log.info) {
        GeoLeaf.Log.info('[GeoLeaf.Utils.DomHelpers] Module loaded');
    }

})(typeof window !== 'undefined' ? window : this);
