/**
 * @module GeoLeaf.Utils.Formatters
 * Formatters pour dates, nombres, distances et autres valeurs
 * Centralise tous les formatages pour cohérence et internationalisation
 *
 * @version 1.0.0
 */

import { Log } from '../log/index.js';


// Configuration par défaut (peut être écrasée par l'utilisateur)
const defaultConfig = {
    locale: 'fr-FR',
    dateFormat: {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    },
    dateTimeFormat: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    },
    distanceUnits: 'metric' // 'metric' ou 'imperial'
};

/**
 * Formate une distance en unités lisibles
 *
 * @param {number} distanceInMeters - Distance en mètres
 * @param {Object} [options={}] - Options de formatage
 * @param {string} [options.unit='metric'] - Système d'unités ('metric' ou 'imperial')
 * @param {number} [options.precision=2] - Nombre de décimales
 * @param {boolean} [options.showUnit=true] - Afficher l'unité
 * @param {string} [options.locale='fr-FR'] - Locale pour formatage des nombres
 * @returns {string} Distance formatée
 *
 * @example
 * formatDistance(1500) // "1.50 km"
 * formatDistance(850) // "850 m"
 * formatDistance(1500, { unit: 'imperial' }) // "0.93 mi"
 * formatDistance(1500, { precision: 1 }) // "1.5 km"
 */
export function formatDistance(distanceInMeters, options = {}) {
    const {
        unit = defaultConfig.distanceUnits,
        precision = 2,
        showUnit = true,
        locale = defaultConfig.locale
    } = options;

    if (distanceInMeters == null || isNaN(distanceInMeters)) {
        return showUnit ? '0 m' : '0';
    }

    let value, unitLabel;

    if (unit === 'imperial') {
        // Conversion en miles/feet
        const distanceInMiles = distanceInMeters * 0.000621371;
        if (distanceInMiles < 0.1) {
            // Afficher en feet si < 0.1 mile
            value = distanceInMeters * 3.28084;
            unitLabel = 'ft';
        } else {
            value = distanceInMiles;
            unitLabel = 'mi';
        }
    } else {
        // Metric (défaut)
        if (distanceInMeters < 1000) {
            // Afficher en mètres si < 1 km
            value = distanceInMeters;
            unitLabel = 'm';
        } else {
            // Afficher en kilomètres
            value = distanceInMeters / 1000;
            unitLabel = 'km';
        }
    }

    // Formater le nombre
    const formatted = value.toLocaleString(locale, {
        minimumFractionDigits: unitLabel === 'm' || unitLabel === 'ft' ? 0 : precision,
        maximumFractionDigits: unitLabel === 'm' || unitLabel === 'ft' ? 0 : precision
    });

    return showUnit ? `${formatted} ${unitLabel}` : formatted;
}

/**
 * Formate une date selon le format configuré
 *
 * @param {Date|string|number} date - Date à formater
 * @param {Object} [options={}] - Options de formatage
 * @param {string} [options.locale='fr-FR'] - Locale pour formatage
 * @param {string} [options.style='medium'] - Style de formatage ('short', 'medium', 'long', 'full')
 * @param {Object} [options.format] - Format personnalisé (Intl.DateTimeFormat options)
 * @returns {string} Date formatée ou chaîne vide si invalide
 *
 * @example
 * formatDate(new Date()) // "19 décembre 2025"
 * formatDate(new Date(), { style: 'short' }) // "19/12/2025"
 * formatDate('2025-12-19') // "19 décembre 2025"
 */
export function formatDate(date, options = {}) {
    const {
        locale = defaultConfig.locale,
        style = 'medium',
        format = null
    } = options;

    // Convertir en objet Date si nécessaire
    const dateObj = date instanceof Date ? date : new Date(date);

    // Vérifier validité
    if (isNaN(dateObj.getTime())) {
        return '';
    }

    // Formats prédéfinis selon le style
    const formats = {
        short: { year: 'numeric', month: '2-digit', day: '2-digit' },
        medium: { year: 'numeric', month: 'long', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
        full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' }
    };

    const formatOptions = format || formats[style] || formats.medium;

    return dateObj.toLocaleDateString(locale, formatOptions);
}

/**
 * Formate une date avec heure
 *
 * @param {Date|string|number} date - Date à formater
 * @param {Object} [options={}] - Options de formatage
 * @param {string} [options.locale='fr-FR'] - Locale pour formatage
 * @param {string} [options.style='medium'] - Style de formatage
 * @param {Object} [options.format] - Format personnalisé
 * @returns {string} Date et heure formatées
 *
 * @example
 * formatDateTime(new Date()) // "19 décembre 2025 à 14:30"
 * formatDateTime(new Date(), { style: 'short' }) // "19/12/2025 14:30"
 */
export function formatDateTime(date, options = {}) {
    const {
        locale = defaultConfig.locale,
        style = 'medium',
        format = null
    } = options;

    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
        return '';
    }

    const formats = {
        short: {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        },
        medium: {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        },
        long: {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }
    };

    const formatOptions = format || formats[style] || formats.medium;

    return dateObj.toLocaleString(locale, formatOptions);
}

/**
 * Formate un nombre avec séparateurs de milliers
 *
 * @param {number} value - Valeur à formater
 * @param {Object} [options={}] - Options de formatage
 * @param {string} [options.locale='fr-FR'] - Locale pour formatage
 * @param {number} [options.decimals] - Nombre de décimales (auto si non spécifié)
 * @param {number} [options.minDecimals=0] - Nombre minimum de décimales
 * @param {number} [options.maxDecimals=2] - Nombre maximum de décimales
 * @returns {string} Nombre formaté
 *
 * @example
 * formatNumber(1234567.89) // "1 234 567,89"
 * formatNumber(1234.5, { decimals: 0 }) // "1 235"
 * formatNumber(1234.5, { locale: 'en-US' }) // "1,234.5"
 */
export function formatNumber(value, options = {}) {
    const {
        locale = defaultConfig.locale,
        decimals = null,
        minDecimals = 0,
        maxDecimals = 2
    } = options;

    if (value == null || isNaN(value)) {
        return '0';
    }

    const formatOptions = {};

    if (decimals !== null) {
        formatOptions.minimumFractionDigits = decimals;
        formatOptions.maximumFractionDigits = decimals;
    } else {
        formatOptions.minimumFractionDigits = minDecimals;
        formatOptions.maximumFractionDigits = maxDecimals;
    }

    return value.toLocaleString(locale, formatOptions);
}

/**
 * Formate une durée en format lisible
 *
 * @param {number} milliseconds - Durée en millisecondes
 * @param {Object} [options={}] - Options de formatage
 * @param {boolean} [options.short=false] - Format court (h, m, s)
 * @param {boolean} [options.showSeconds=true] - Afficher les secondes
 * @returns {string} Durée formatée
 *
 * @example
 * formatDuration(3665000) // "1 heure 1 minute 5 secondes"
 * formatDuration(3665000, { short: true }) // "1h 1m 5s"
 * formatDuration(90000, { showSeconds: false }) // "1 minute"
 */
function formatDuration(milliseconds, options = {}) {
    const { short = false, showSeconds = true } = options;

    if (milliseconds == null || isNaN(milliseconds)) {
        return short ? '0s' : '0 seconde';
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];

    if (hours > 0) {
        parts.push(short ? `${hours}h` : `${hours} heure${hours > 1 ? 's' : ''}`);
    }

    if (minutes > 0) {
        parts.push(short ? `${minutes}m` : `${minutes} minute${minutes > 1 ? 's' : ''}`);
    }

    if (showSeconds && (seconds > 0 || parts.length === 0)) {
        parts.push(short ? `${seconds}s` : `${seconds} seconde${seconds > 1 ? 's' : ''}`);
    }

    return parts.join(' ');
}

/**
 * Formate une taille de fichier en unités lisibles
 *
 * @param {number} bytes - Taille en bytes
 * @param {Object} [options={}] - Options de formatage
 * @param {number} [options.precision=2] - Nombre de décimales
 * @param {string} [options.locale='fr-FR'] - Locale pour formatage
 * @returns {string} Taille formatée
 *
 * @example
 * formatFileSize(1024) // "1.00 KB"
 * formatFileSize(1536000) // "1.50 MB"
 * formatFileSize(1536000, { precision: 0 }) // "1 MB"
 */
export function formatFileSize(bytes, options = {}) {
    const {
        precision = 2,
        locale = defaultConfig.locale
    } = options;

    if (bytes == null || isNaN(bytes) || bytes === 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);

    const formatted = value.toLocaleString(locale, {
        minimumFractionDigits: i === 0 ? 0 : precision,
        maximumFractionDigits: i === 0 ? 0 : precision
    });

    return `${formatted} ${units[i]}`;
}

/**
 * Formate un pourcentage
 *
 * @param {number} value - Valeur (0-1 ou 0-100 selon options)
 * @param {Object} [options={}] - Options de formatage
 * @param {boolean} [options.fromDecimal=true] - La valeur est entre 0-1 (sinon 0-100)
 * @param {number} [options.precision=0] - Nombre de décimales
 * @param {string} [options.locale='fr-FR'] - Locale pour formatage
 * @returns {string} Pourcentage formaté
 *
 * @example
 * formatPercentage(0.75) // "75 %"
 * formatPercentage(75, { fromDecimal: false }) // "75 %"
 * formatPercentage(0.755, { precision: 1 }) // "75.5 %"
 */
function formatPercentage(value, options = {}) {
    const {
        fromDecimal = true,
        precision = 0,
        locale = defaultConfig.locale
    } = options;

    if (value == null || isNaN(value)) {
        return '0 %';
    }

    const percentValue = fromDecimal ? value * 100 : value;

    const formatted = percentValue.toLocaleString(locale, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
    });

    return `${formatted} %`;
}

/**
 * Retourne uniquement la valeur GB avec précision (convenience pour cache)
 *
 * @param {number} bytes - Nombre d'octets
 * @param {number} [precision=2] - Nombre de décimales
 * @returns {string} Exemple: "2.34"
 */
export function toGB(bytes, precision = 2) {
    if (!bytes || bytes === 0) return "0";
    return (bytes / 1024 / 1024 / 1024).toFixed(precision);
}

/**
 * Retourne uniquement la valeur MB avec précision (convenience pour cache)
 *
 * @param {number} bytes - Nombre d'octets
 * @param {number} [precision=1] - Nombre de décimales
 * @returns {string} Exemple: "512.5"
 */
export function toMB(bytes, precision = 1) {
    if (!bytes || bytes === 0) return "0";
    return (bytes / 1024 / 1024).toFixed(precision);
}

/**
 * Tronque un texte long avec ellipsis
 *
 * @param {string} text - Texte à tronquer
 * @param {number} [maxLength=50] - Longueur maximale
 * @returns {string} Exemple: "Très long texte..."
 */
function truncate(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Capitalise la première lettre
 *
 * @param {string} str - Chaîne à capitaliser
 * @returns {string} Exemple: "Hello world"
 */
function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convertit camelCase vers Title Case
 *
 * @param {string} str - Chaîne en camelCase
 * @returns {string} Exemple: "Layer Name Here"
 */
function camelCaseToTitle(str) {
    if (!str) return "";
    return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (char) => char.toUpperCase())
        .trim();
}

/**
 * Convertit une URL en nom lisible
 *
 * @param {string} url - URL complète
 * @returns {string} Exemple: "tile-0001.png"
 */
function getFilenameFromURL(url) {
    if (!url) return "-";
    return url.split('/').pop().split('?')[0];
}

/**
 * Configure les paramètres par défaut du module
 *
 * @param {Object} config - Configuration à appliquer
 * @param {string} [config.locale] - Locale par défaut
 * @param {string} [config.distanceUnits] - Unités de distance par défaut
 * @param {Object} [config.dateFormat] - Format de date par défaut
 * @param {Object} [config.dateTimeFormat] - Format de date+heure par défaut
 *
 * @example
 * configure({ locale: 'en-US', distanceUnits: 'imperial' })
 */
function configure(config) {
    Object.assign(defaultConfig, config);
}

/**
 * Récupère la configuration actuelle
 *
 * @returns {Object} Configuration actuelle
 */
function getConfig() {
    return { ...defaultConfig };
}


