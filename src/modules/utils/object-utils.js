/**
 * @module GeoLeaf.Utils.ObjectUtils
 * @description Utilitaires pour manipulation d'objets et accès aux propriétés imbriquées
 * @version 2.1.0
 * @since 2.1.0
 */



/**
 * Récupère une valeur imbriquée dans un objet via un chemin de propriétés.
 * Gère les valeurs null/undefined de manière sécurisée.
 *
 * @param {Object} obj - Objet source
 * @param {string} path - Chemin vers la propriété avec notation point (ex: 'user.address.city')
 * @returns {*} Valeur trouvée ou null si le chemin n'existe pas
 *
 * @example
 * const user = { name: 'John', address: { city: 'Paris', zip: '75001' } };
 * getNestedValue(user, 'name');               // 'John'
 * getNestedValue(user, 'address.city');       // 'Paris'
 * getNestedValue(user, 'address.country');    // null
 * getNestedValue(user, 'profile.avatar');     // null
 * getNestedValue(null, 'name');               // null
 */
export function getNestedValue(obj, path) {
    // Validation des paramètres
    if (!obj || typeof obj !== 'object') {
        return null;
    }

    if (!path || typeof path !== 'string') {
        return null;
    }

    // Parcours du chemin
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        // Vérification à chaque niveau
        if (result == null) {
            return null;
        }
        result = result[key];
    }

    // Retourner null si undefined, sinon la valeur (même falsy comme 0, '', false)
    return result !== undefined ? result : null;
}

/**
 * Vérifie si un chemin de propriété existe dans un objet.
 *
 * @param {Object} obj - Objet source
 * @param {string} path - Chemin vers la propriété
 * @returns {boolean} True si le chemin existe, false sinon
 *
 * @example
 * const user = { name: 'John', address: { city: 'Paris' } };
 * hasNestedPath(user, 'address.city');     // true
 * hasNestedPath(user, 'address.country');  // false
 */
export function hasNestedPath(obj, path) {
    if (!obj || typeof obj !== 'object' || !path) {
        return false;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current == null || !Object.prototype.hasOwnProperty.call(current, key)) {
            return false;
        }
        current = current[key];
    }

    return true;
}

/**
 * Définit une valeur dans un objet via un chemin de propriétés.
 * Crée les objets intermédiaires si nécessaire.
 *
 * @param {Object} obj - Objet cible
 * @param {string} path - Chemin vers la propriété
 * @param {*} value - Valeur à définir
 * @returns {Object} L'objet modifié
 *
 * @example
 * const user = {};
 * setNestedValue(user, 'address.city', 'Paris');
 * // user = { address: { city: 'Paris' } }
 */
export function setNestedValue(obj, path, value) {
    if (!obj || typeof obj !== 'object') {
        throw new Error('[ObjectUtils.setNestedValue] Invalid object');
    }

    if (!path || typeof path !== 'string') {
        throw new Error('[ObjectUtils.setNestedValue] Invalid path');
    }

    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;

    // Créer les objets intermédiaires
    for (const key of keys) {
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    // Définir la valeur finale
    current[lastKey] = value;

    return obj;
}

// Export public

// Alias pour compatibilité et facilité d'utilisation


