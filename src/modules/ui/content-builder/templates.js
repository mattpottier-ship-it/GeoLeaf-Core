/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Content Builder - Templates Module
 *
 * Centralise tous les templates HTML (14 builders) et classes CSS standards
 * pour les renderers (text, number, badge, rating, image, link, list, etc.).
 *
 * Organisation:
 * - CSS_CLASSES: Library de classes CSS standards
 * - Template Builders: 14 fonctions de construction HTML
 * - Wrappers: Fonctions utilitaires (wrapInParagraph, wrapInDiv, wrapInLink)
 *
 * @module ui/content-builder/templates
 * @author Assistant
 * @version 1.0.0
 * @since 2026-01-18 (Sprint 4.5 - Modularisation)
 *
 * @example
 * // Import des templates
 * const Templates = GeoLeaf._ContentBuilder.Templates;
 *
 * @example
 * // Utilisation CSS_CLASSES
 * const className = Templates.CSS_CLASSES.badge; // 'gl-poi-badge'
 *
 * @example
 * // Création d'un badge
 * const badgeHtml = Templates.createBadge(
 *   { displayValue: 'Restaurant', style: 'background-color: #e74c3c;' },
 *   'category',
 *   escapeHtml
 * );
 */
import { Log } from '../../log/index.js';

    // ========================================
    //   CLASSES CSS STANDARDS
    // ========================================

    const CSS_CLASSES = {
        // Container classes
        text: 'gl-content__text',
        longtext: 'gl-content__longtext',
        number: 'gl-content__number',
        metric: 'gl-content__metric',
        badge: 'gl-poi-badge',
        rating: 'gl-content__rating',
        image: 'gl-content__image',
        link: 'gl-content__link',
        list: 'gl-content__list',
        table: 'gl-content__table',
        tags: 'gl-content__tags',
        tag: 'gl-content__tag',
        coordinates: 'gl-content__coordinates',
        gallery: 'gl-content__gallery',

        // Badge variants
        badgeDefault: 'gl-poi-badge--default',
        badgeStatus: 'gl-poi-badge--status',
        badgePriority: 'gl-poi-badge--priority',
        badgeCategory: 'gl-poi-badge--category',

        // Rating
        star: 'gl-star',
        starFull: 'gl-star--full',
        starHalf: 'gl-star--half',
        starEmpty: 'gl-star--empty'
    };

    // ========================================
    //   TEMPLATE BUILDERS
    // ========================================

    /**
     * Construit un attribut HTML class="..." avec classes de base et personnalisées.
     *
     * Combine baseClass (obligatoire) + customClass (optionnel) en un seul attribut.
     *
     * @function buildClassAttr
     * @param {string} baseClass - Classe CSS de base (ex: 'gl-content__badge')
     * @param {string} [customClass] - Classe personnalisée optionnelle
     * @returns {string} Attribut HTML class (ex: ' class="gl-content__badge custom"')
     *
     * @example
     * // Classe de base uniquement
     * const attr1 = buildClassAttr('gl-content__badge');
     * // Retourne: ' class="gl-content__badge"'
     *
     * @example
     * // Classe de base + classe personnalisée
     * const attr2 = buildClassAttr('gl-content__badge', 'my-custom-badge');
     * // Retourne: ' class="gl-content__badge my-custom-badge"'
     */
    function buildClassAttr(baseClass, customClass) {
        const classes = [baseClass];
        if (customClass) classes.push(customClass);
        return ' class="' + classes.join(' ') + '"';
    }

    /**
     * Construit un attribut HTML style="..." si un style est fourni.
     *
     * Retourne une chaîne vide si style est null/undefined/vide.
     *
     * @function buildStyleAttr
     * @param {string} [style] - Style CSS inline (ex: 'color: red; background: blue;')
     * @returns {string} Attribut HTML style (ex: ' style="color: red;"') ou chaîne vide
     *
     * @example
     * // Avec style
     * const attr1 = buildStyleAttr('color: red; font-weight: bold;');
     * // Retourne: ' style="color: red; font-weight: bold;"'
     *
     * @example
     * // Sans style
     * const attr2 = buildStyleAttr('');
     * // Retourne: ''
     */
    function buildStyleAttr(style) {
        return style ? ' style="' + style + '"' : '';
    }

    /**
     * Construit un label HTML avec gestion d'icône et échappement.
     *
     * Utilisé dans les templates pour afficher un label avec icône optionnelle.
     *
     * @function buildLabel
     * @param {string} label - Texte du label (sera échappé)
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @param {string} [icon] - Icône optionnelle (HTML non échappé)
     * @returns {string} HTML du label avec icône si fournie
     *
     * @example
     * // Label simple
     * const html1 = buildLabel('Restaurant', escapeHtml);
     * // Retourne: '<span>Restaurant</span>'
     *
     * @example
     * // Label avec icône
     * const html2 = buildLabel('Restaurant', escapeHtml, '<i class="fa fa-utensils"></i>');
     * // Retourne: '<i class="fa fa-utensils"></i><span>Restaurant</span>'
     */
    function buildLabel(label, escapeHtml, icon) {
        if (!label) return '';
        return '<strong>' + escapeHtml(label) + ':</strong> ';
    }

    /**
     * Enveloppe du contenu HTML dans un paragraphe <p> avec classes.
     *
     * @function wrapInParagraph
     * @param {string} content - Contenu HTML (déjà échappé ou non)
     * @param {string} className - Classe CSS de base
     * @param {string} [customClass] - Classe personnalisée optionnelle
     * @returns {string} HTML paragraphe avec classes
     *
     * @example
     * const html = wrapInParagraph('Restaurant', 'gl-content__text');
     * // Retourne: '<p class="gl-content__text">Restaurant</p>'
     *
     * @example
     * const html2 = wrapInParagraph('Restaurant', 'gl-content__text', 'my-custom');
     * // Retourne: '<p class="gl-content__text my-custom">Restaurant</p>'
     */
    function wrapInParagraph(content, className, customClass) {
        return '<p' + buildClassAttr(className, customClass) + '>' + content + '</p>';
    }

    /**
     * Enveloppe du contenu HTML dans un div <div> avec classes.
     *
     * @function wrapInDiv
     * @param {string} content - Contenu HTML (déjà échappé ou non)
     * @param {string} className - Classe CSS de base
     * @param {string} [customClass] - Classe personnalisée optionnelle
     * @returns {string} HTML div avec classes
     *
     * @example
     * const html = wrapInDiv('Content', 'gl-content__longtext');
     * // Retourne: '<div class="gl-content__longtext">Content</div>'
     */
    function wrapInDiv(content, className, customClass) {
        return '<div' + buildClassAttr(className, customClass) + '>' + content + '</div>';
    }

    /**
     * Crée un élément de texte simple <p> avec label optionnel.
     *
     * Format: <p class="gl-content__text"><strong>Label:</strong> Value</p>
     *
     * @function createTextElement
     * @param {string} value - Valeur texte (à échapper)
     * @param {Object} config - Configuration renderer
     * @param {string} [config.label] - Label optionnel
     * @param {string} [config.className] - Classe personnalisée
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML paragraphe avec texte
     *
     * @example
     * // Avec label
     * const html1 = createTextElement('Restaurant', { label: 'Nom' }, escapeHtml);
     * // Retourne: '<p class="gl-content__text"><strong>Nom:</strong> Restaurant</p>'
     *
     * @example
     * // Sans label
     * const html2 = createTextElement('Restaurant', {}, escapeHtml);
     * // Retourne: '<p class="gl-content__text">Restaurant</p>'
     */
    function createTextElement(value, config, escapeHtml) {
        const label = buildLabel(config.label, escapeHtml);
        const content = label + escapeHtml(value);
        return wrapInParagraph(content, CSS_CLASSES.text, config.className);
    }

    /**
     * Crée un élément de texte long <div> avec label séparé.
     *
     * Format: <div><p><strong>Label</strong></p><p>Value</p></div>
     * Utilisé pour descriptions, commentaires, textes longs.
     *
     * @function createLongtextElement
     * @param {string} value - Valeur texte longue (à échapper)
     * @param {Object} config - Configuration renderer
     * @param {string} [config.label] - Label optionnel
     * @param {string} [config.className] - Classe personnalisée
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML div avec texte long
     *
     * @example
     * // Avec label
     * const html1 = createLongtextElement(
     *   'Une longue description...',
     *   { label: 'Description' },
     *   escapeHtml
     * );
     * // Retourne: '<div class="gl-content__longtext">
     * //   <p><strong>Description</strong></p>
     * //   <p>Une longue description...</p>
     * // </div>'
     */
    function createLongtextElement(value, config, escapeHtml) {
        const label = config.label ? '<p><strong>' + escapeHtml(config.label) + '</strong></p>' : '';
        const content = label + '<p>' + escapeHtml(value) + '</p>';
        return wrapInDiv(content, CSS_CLASSES.longtext, config.className);
    }

    /**
     * Crée un élément numérique <p> avec formatage locale FR.
     *
     * Formate le nombre avec toLocaleString('fr-FR').
     * Supporte prefix, suffix, label.
     *
     * @function createNumberElement
     * @param {number} value - Valeur numérique
     * @param {Object} config - Configuration renderer
     * @param {string} [config.label] - Label optionnel
     * @param {string} [config.prefix] - Préfixe (ex: "~")
     * @param {string} [config.suffix] - Suffixe (ex: "m²", "habitants")
     * @param {string} [config.className] - Classe personnalisée
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML paragraphe avec nombre formaté
     *
     * @example
     * // Nombre simple avec suffix
     * const html1 = createNumberElement(1234567, { suffix: 'habitants' }, escapeHtml);
     * // Retourne: '<p class="gl-content__number">1\u202f234\u202f567 habitants</p>'
     *
     * @example
     * // Avec label + prefix + suffix
     * const html2 = createNumberElement(120, { label: 'Surface', prefix: '~', suffix: 'm²' }, escapeHtml);
     * // Retourne: '<p class="gl-content__number"><strong>Surface:</strong> ~120 m²</p>'
     */
    function createNumberElement(value, config, escapeHtml) {
        const formatted = value.toLocaleString('fr-FR');
        const label = buildLabel(config.label, escapeHtml);
        const suffix = config.suffix ? ' ' + escapeHtml(config.suffix) : '';
        const prefix = config.prefix ? escapeHtml(config.prefix) + ' ' : '';
        const content = label + prefix + formatted + suffix;
        return wrapInParagraph(content, CSS_CLASSES.number, config.className);
    }

    /**
     * Crée un élément métrique <p> avec formatage (similaire à number).
     *
     * Identique à createNumberElement mais utilise CSS_CLASSES.metric.
     * Utilisé pour métriques spécifiques (KPI, statistiques, etc.).
     *
     * @function createMetricElement
     * @param {number} value - Valeur numérique
     * @param {Object} config - Configuration renderer
     * @param {string} [config.label] - Label optionnel
     * @param {string} [config.prefix] - Préfixe (ex: "+", "-")
     * @param {string} [config.suffix] - Suffixe (ex: "%", "€")
     * @param {string} [config.className] - Classe personnalisée
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML paragraphe avec métrique formatée
     *
     * @example
     * // Métrique avec pourcentage
     * const html1 = createMetricElement(95.5, { label: 'Satisfaction', suffix: '%' }, escapeHtml);
     * // Retourne: '<p class="gl-content__metric"><strong>Satisfaction:</strong> 95,5%</p>'
     */
    function createMetricElement(value, config, escapeHtml) {
        const formatted = value.toLocaleString('fr-FR');
        const label = buildLabel(config.label, escapeHtml);
        const suffix = config.suffix ? escapeHtml(config.suffix) : '';
        const prefix = config.prefix ? escapeHtml(config.prefix) : '';
        const content = label + prefix + formatted + suffix;
        return wrapInParagraph(content, CSS_CLASSES.metric, config.className);
    }

    /**
     * Crée un badge <span> avec variante et style inline.
     *
     * Variantes disponibles:
     * - 'default': gl-poi-badge--default
     * - 'status': gl-poi-badge--status
     * - 'priority': gl-poi-badge--priority
     * - 'category': gl-poi-badge--category
     *
     * @function createBadge
     * @param {string} value - Texte du badge (à échapper)
     * @param {string} [variant='default'] - Variante du badge (default, status, priority, category)
     * @param {string} [style] - Style CSS inline optionnel (ex: 'background-color: #e74c3c;')
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML span badge
     *
     * @example
     * // Badge default
     * const html1 = createBadge('Restaurant', 'default', '', escapeHtml);
     * // Retourne: '<span class="gl-poi-badge gl-poi-badge--default">Restaurant</span>'
     *
     * @example
     * // Badge category avec style
     * const html2 = createBadge(
     *   'Gastronomique',
     *   'category',
     *   'background-color: #e74c3c; color: white;',
     *   escapeHtml
     * );
     * // Retourne: '<span class="gl-poi-badge gl-poi-badge--category" style="...">Gastronomique</span>'
     */
    function createBadge(value, variant, style, escapeHtml) {
        variant = variant || 'default';
        const badgeClass = CSS_CLASSES.badge + ' ' + CSS_CLASSES['badge' + variant.charAt(0).toUpperCase() + variant.slice(1)];
        const styleAttr = buildStyleAttr(style);
        return '<span class="' + badgeClass + '"' + styleAttr + '>' + escapeHtml(value) + '</span>';
    }

    /**
     * Crée une étoile <span> de notation avec classe CSS.
     *
     * Types disponibles:
     * - 'full': gl-star--full (★ plein)
     * - 'half': gl-star--half (½ étoile)
     * - 'empty': gl-star--empty (☆ vide)
     *
     * @function createStar
     * @param {string} type - Type d'étoile ('full', 'half', 'empty')
     * @returns {string} HTML span étoile
     *
     * @example
     * const html1 = createStar('full');
     * // Retourne: '<span class="gl-star gl-star--full">★</span>'
     *
     * @example
     * const html2 = createStar('empty');
     * // Retourne: '<span class="gl-star gl-star--empty">★</span>'
     */
    function createStar(type) {
        const starClass = CSS_CLASSES.star + ' ' + CSS_CLASSES['star' + type.charAt(0).toUpperCase() + type.slice(1)];
        return '<span class="' + starClass + '">★</span>';
    }

    /**
     * Crée un élément de notation <p> avec étoiles (0-5).
     *
     * Génère automatiquement les étoiles pleines, demi et vides.
     * Logique:
     * - rating = 4.7 => 4 full + 1 half + 0 empty
     * - rating = 3.2 => 3 full + 0 half + 2 empty
     *
     * @function createRatingElement
     * @param {number} rating - Note (0-5)
     * @param {Object} config - Configuration renderer
     * @param {string} [config.label] - Label optionnel
     * @param {number} [config.max=5] - Note maximale (généralement 5)
     * @param {boolean} [config.showValue=true] - Afficher la valeur numérique
     * @param {string} [config.className] - Classe personnalisée
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML paragraphe avec étoiles
     *
     * @example
     * // Rating 4.5/5 avec label
     * const html1 = createRatingElement(4.5, { label: 'Note', showValue: true }, escapeHtml);
     * // Retourne: '<p class="gl-content__rating">
     * //   <strong>Note:</strong> ★★★★½ (4.5/5)
     * // </p>'
     *
     * @example
     * // Rating sans valeur numérique
     * const html2 = createRatingElement(3, { showValue: false }, escapeHtml);
     * // Retourne: '<p class="gl-content__rating">★★★☆☆</p>'
     */
    function createRatingElement(rating, config, escapeHtml) {
        let stars = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = (rating % 1) >= 0.5;

        // Étoiles pleines
        for (let i = 0; i < fullStars; i++) {
            stars += createStar('full');
        }

        // Demi-étoile
        if (hasHalfStar) {
            stars += createStar('half');
        }

        // Étoiles vides
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            stars += createStar('empty');
        }

        const ratingText = ' (' + rating.toFixed(1) + '/5)';
        const label = buildLabel(config.label, escapeHtml);
        const content = label + stars + ratingText;
        return wrapInDiv(content, CSS_CLASSES.rating, config.className);
    }

    /**
     * Crée un élément image <img> avec classe et alt.
     *
     * @function createImageElement
     * @param {string} src - URL de l'image (sera échappée)
     * @param {Object} config - Configuration renderer
     * @param {string} [config.alt] - Texte alternatif optionnel
     * @param {string} [config.className] - Classe personnalisée
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML img
     *
     * @example
     * // Image avec alt
     * const html1 = createImageElement(
     *   'https://example.com/photo.jpg',
     *   { alt: 'Photo du restaurant' },
     *   escapeHtml
     * );
     * // Retourne: '<img class="gl-content__image" src="https://example.com/photo.jpg" alt="Photo du restaurant">'
     *
     * @example
     * // Image sans alt
     * const html2 = createImageElement('https://example.com/photo.jpg', {}, escapeHtml);
     * // Retourne: '<img class="gl-content__image" src="https://example.com/photo.jpg" alt="">'
     */
    function createImageElement(src, config, escapeHtml) {
        const alt = config.alt ? escapeHtml(config.alt) : '';
        const classAttr = buildClassAttr(CSS_CLASSES.image, config.className);
        return '<img' + classAttr + ' src="' + escapeHtml(src) + '" alt="' + alt + '">';
    }

    /**
     * Crée un élément lien <a> avec target="_blank" et sécurité.
     *
     * Sécurité: rel="noopener noreferrer" pour éviter tabnabbing.
     *
     * @function createLinkElement
     * @param {string} href - URL du lien (sera échappée)
     * @param {Object} config - Configuration renderer
     * @param {string} [config.text] - Texte du lien (défaut: URL)
     * @param {string} [config.label] - Label optionnel
     * @param {string} [config.className] - Classe personnalisée
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML paragraphe avec lien
     *
     * @example
     * // Lien avec texte personnalisé
     * const html1 = createLinkElement(
     *   'https://example.com',
     *   { text: 'Visiter le site', label: 'Site web' },
     *   escapeHtml
     * );
     * // Retourne: '<p class="gl-content__link">
     * //   <strong>Site web:</strong>
     * //   <a href="https://example.com" target="_blank" rel="noopener noreferrer">Visiter le site</a>
     * // </p>'
     *
     * @example
     * // Lien sans texte (affiche URL)
     * const html2 = createLinkElement('https://example.com', {}, escapeHtml);
     * // Retourne: '<p class="gl-content__link">
     * //   <a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a>
     * // </p>'
     */
    function createLinkElement(href, config, escapeHtml) {
        const text = config.text ? escapeHtml(config.text) : escapeHtml(href);
        const label = buildLabel(config.label, escapeHtml);
        const link = '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
        const content = label + link;
        return wrapInParagraph(content, CSS_CLASSES.link, config.className);
    }

    /**
     * Crée un élément liste <ul> avec items.
     *
     * Convertit automatiquement les items en string via String(item).
     *
     * @function createListElement
     * @param {Array<string|number|*>} items - Items de la liste
     * @param {Object} config - Configuration renderer
     * @param {string} [config.label] - Label optionnel
     * @param {string} [config.className] - Classe personnalisée
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML div avec liste ul
     *
     * @example
     * // Liste avec label
     * const html1 = createListElement(
     *   ['Pizza', 'Pasta', 'Risotto'],
     *   { label: 'Spécialités' },
     *   escapeHtml
     * );
     * // Retourne: '<div class="gl-content__list">
     * //   <p><strong>Spécialités</strong></p>
     * //   <ul><li>Pizza</li><li>Pasta</li><li>Risotto</li></ul>
     * // </div>'
     *
     * @example
     * // Liste simple sans label
     * const html2 = createListElement(['Item 1', 'Item 2'], {}, escapeHtml);
     * // Retourne: '<div class="gl-content__list"><ul><li>Item 1</li><li>Item 2</li></ul></div>'
     */
    function createListElement(items, config, escapeHtml) {
        const label = config.label ? '<p><strong>' + escapeHtml(config.label) + '</strong></p>' : '';
        let list = '<ul>';
        items.forEach(item => {
            list += '<li>' + escapeHtml(String(item)) + '</li>';
        });
        list += '</ul>';
        const content = label + list;
        return wrapInDiv(content, CSS_CLASSES.list, config.className);
    }

    /**
     * Crée un élément table <table> à partir d'un objet clé/valeur.
     *
     * Génère une table HTML avec <th> pour les clés et <td> pour les valeurs.
     *
     * @function createTableElement
     * @param {Object} data - Données de la table (clé/valeur)
     * @param {Object} config - Configuration renderer
     * @param {string} [config.label] - Label optionnel
     * @param {string} [config.className] - Classe personnalisée
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML div avec table
     *
     * @example
     * // Table avec label
     * const html1 = createTableElement(
     *   { 'Ouverture': '9h-18h', 'Fermeture': 'Dimanche' },
     *   { label: 'Horaires' },
     *   escapeHtml
     * );
     * // Retourne: '<div class="gl-content__table">
     * //   <p><strong>Horaires</strong></p>
     * //   <table><tbody>
     * //     <tr><th>Ouverture</th><td>9h-18h</td></tr>
     * //     <tr><th>Fermeture</th><td>Dimanche</td></tr>
     * //   </tbody></table>
     * // </div>'
     */
    function createTableElement(data, config, escapeHtml) {
        const label = config.label ? '<p><strong>' + escapeHtml(config.label) + '</strong></p>' : '';
        let table = '<table><tbody>';

        Object.keys(data).forEach(key => {
            const keyLabel = escapeHtml(String(key));
            const value = escapeHtml(String(data[key]));
            table += '<tr><th>' + keyLabel + '</th><td>' + value + '</td></tr>';
        });

        table += '</tbody></table>';
        const content = label + table;
        return wrapInDiv(content, CSS_CLASSES.table, config.className);
    }

    /**
     * Crée un tag <span> unique avec classe gl-content__tag.
     *
     * Utilisé par createTagsElement pour générer des tags individuels.
     *
     * @function createTag
     * @param {string|number} tag - Texte du tag (à échapper)
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML span tag
     *
     * @example
     * const html = createTag('Restaurant', escapeHtml);
     * // Retourne: '<span class="gl-content__tag">Restaurant</span>'
     */
    function createTag(tag, escapeHtml) {
        return '<span class="' + CSS_CLASSES.tag + '">' + escapeHtml(String(tag)) + '</span>';
    }

    /**
     * Crée un élément cloud de tags <div> avec plusieurs tags.
     *
     * Génère un nuage de tags (tag cloud) avec chaque tag séparé par un espace.
     *
     * @function createTagsElement
     * @param {Array<string|number>} tags - Liste de tags
     * @param {Object} config - Configuration renderer
     * @param {string} [config.className] - Classe personnalisée
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML div avec tags
     *
     * @example
     * // Tags multiples
     * const html = createTagsElement(
     *   ['Pizza', 'Italien', 'Gastronomique'],
     *   {},
     *   escapeHtml
     * );
     * // Retourne: '<div class="gl-content__tags">
     * //   <span class="gl-content__tag">Pizza</span>
     * //   <span class="gl-content__tag">Italien</span>
     * //   <span class="gl-content__tag">Gastronomique</span>
     * // </div>'
     */
    function createTagsElement(tags, config, escapeHtml) {
        let content = '';
        tags.forEach(tag => {
            content += createTag(tag, escapeHtml) + ' ';
        });
        return wrapInDiv(content.trim(), CSS_CLASSES.tags, config.className);
    }

    /**
     * Crée un élément coordonnées <p> avec lat, lng.
     *
     * Formate automatiquement avec 6 décimales de précision.
     *
     * @function createCoordinatesElement
     * @param {number} lat - Latitude (∈ [-90, 90])
     * @param {number} lng - Longitude (∈ [-180, 180])
     * @param {Object} config - Configuration renderer
     * @param {string} [config.className] - Classe personnalisée
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML paragraphe avec coordonnées
     *
     * @example
     * const html = createCoordinatesElement(45.7578137, 4.8320114, {}, escapeHtml);
     * // Retourne: '<p class="gl-content__coordinates">
     * //   <strong>Coordonnées:</strong> 45.757814, 4.832011
     * // </p>'
     */
    function createCoordinatesElement(lat, lng, config, escapeHtml) {
        const latFixed = lat.toFixed(6);
        const lngFixed = lng.toFixed(6);
        const content = '<strong>Coordonnées:</strong> ' + latFixed + ', ' + lngFixed;
        return wrapInParagraph(content, CSS_CLASSES.coordinates, config.className);
    }

    /**
     * Crée un élément galerie <div> avec plusieurs images.
     *
     * Génère une galerie d'images sans balises <img> individuelles.
     * Les URLs doivent être validées avant via validateImageUrl.
     *
     * @function createGalleryElement
     * @param {Array<string>} photos - URLs des photos (déjà validées)
     * @param {Object} config - Configuration renderer
     * @param {string} [config.className] - Classe personnalisée
     * @param {Function} escapeHtml - Fonction d'échappement HTML
     * @returns {string} HTML div galerie avec images
     *
     * @example
     * const html = createGalleryElement(
     *   [
     *     'https://example.com/photo1.jpg',
     *     'https://example.com/photo2.jpg'
     *   ],
     *   {},
     *   escapeHtml
     * );
     * // Retourne: '<div class="gl-content__gallery">
     * //   <img src="https://example.com/photo1.jpg" alt="Photo">
     * //   <img src="https://example.com/photo2.jpg" alt="Photo">
     * // </div>'
     */
    function createGalleryElement(photos, config, escapeHtml) {
        let gallery = '';
        photos.forEach(photo => {
            gallery += '<img src="' + escapeHtml(photo) + '" alt="Photo">';
        });
        return wrapInDiv(gallery, CSS_CLASSES.gallery, config.className);
    }

    // ========================================
    //   EXPORT
    // ========================================

    const Templates = {
        // Classes CSS
        CSS_CLASSES,

        // Helpers de base
        buildClassAttr,
        buildStyleAttr,
        buildLabel,
        wrapInParagraph,
        wrapInDiv,

        // Template builders
        createTextElement,
        createLongtextElement,
        createNumberElement,
        createMetricElement,
        createBadge,
        createStar,
        createRatingElement,
        createImageElement,
        createLinkElement,
        createListElement,
        createTableElement,
        createTag,
        createTagsElement,
        createCoordinatesElement,
        createGalleryElement
    };

// ── ESM Export ──
export { Templates };
