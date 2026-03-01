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
 * @param obj - Objet source
 * @param path - Chemin vers la propriété avec notation point (ex: 'user.address.city')
 * @returns Valeur trouvée ou null si le chemin n'existe pas
 */
export function getNestedValue<T = unknown>(
    obj: object | null | undefined,
    path: string
): T | null {
    if (!obj || typeof obj !== "object") {
        return null;
    }

    if (!path || typeof path !== "string") {
        return null;
    }

    const keys = path.split(".");
    let result: unknown = obj;

    for (const key of keys) {
        if (result == null) {
            return null;
        }
        result = (result as Record<string, unknown>)[key];
    }

    return result !== undefined ? (result as T) : null;
}

/**
 * Vérifie si un chemin de propriété existe dans un objet.
 *
 * @param obj - Objet source
 * @param path - Chemin vers la propriété
 * @returns True si le chemin existe, false sinon
 */
export function hasNestedPath(obj: object | null | undefined, path: string): boolean {
    if (!obj || typeof obj !== "object" || !path) {
        return false;
    }

    const keys = path.split(".");
    let current: unknown = obj;

    for (const key of keys) {
        if (current == null || !Object.prototype.hasOwnProperty.call(current, key)) {
            return false;
        }
        current = (current as Record<string, unknown>)[key];
    }

    return true;
}

/**
 * Définit une valeur dans un objet via un chemin de propriétés.
 * Crée les objets intermédiaires si nécessaire.
 *
 * @param obj - Objet cible
 * @param path - Chemin vers la propriété
 * @param value - Valeur à définir
 * @returns L'objet modifié
 */
export function setNestedValue<T extends Record<string, unknown>>(
    obj: T,
    path: string,
    value: unknown
): T {
    if (!obj || typeof obj !== "object") {
        throw new Error("[ObjectUtils.setNestedValue] Invalid object");
    }

    if (!path || typeof path !== "string") {
        throw new Error("[ObjectUtils.setNestedValue] Invalid path");
    }

    const keys = path.split(".");
    const lastKey = keys.pop()!;
    let current: Record<string, unknown> = obj;

    for (const key of keys) {
        if (!(key in current) || typeof current[key] !== "object") {
            current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
    }

    current[lastKey] = value;

    return obj;
}
