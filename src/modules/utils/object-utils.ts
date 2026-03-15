/* eslint-disable security/detect-object-injection */
/**
 * @module GeoLeaf.Utils.ObjectUtils
 * @description Utilitaires pour manipulation d'objects et access to properties nestedes
 * @version 2.1.0
 * @since 2.1.0
 */

/**
 * Retrieves a value nestede dans an object via un path de properties.
 * Manages null/undefined values safely.
 *
 * @param obj - Object source
 * @param path - Path to the property avec notation point (ex: 'user.address.city')
 * @returns Value found ou null si le path n'existe pas
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
 * Checks if un path de property existe dans an object.
 *
 * @param obj - Object source
 * @param path - Path to the property
 * @returns True si le path existe, false sinon
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
 * Sets ae value dans an object via un path de properties.
 * Creates intermediate objects if needed.
 *
 * @param obj - Object cible
 * @param path - Path to the property
 * @param value - Value to define
 * @returns The object modified
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
