/*!
 * GeoLeaf Core – Core / Theme
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

import { Log } from "../log/index.js";

let _theme = "light";

/**
 * Applique une classe de thème sur document.body.
 * @param {string} theme - "light" | "dark"
 */
function _applyThemeToBody(theme) {
    const body = document.body;
    if (!body) {
        Log.warn("[GeoLeaf.Core] Impossible d'appliquer le thème : document.body introuvable.");
        return;
    }
    body.classList.remove("gl-theme-light", "gl-theme-dark");
    body.classList.add(theme === "dark" ? "gl-theme-dark" : "gl-theme-light");
}

/**
 * Définit et applique le thème actif.
 * @param {string} theme - "light" | "dark"
 */
export function setTheme(theme) {
    if (!theme || (theme !== "light" && theme !== "dark")) {
        Log.warn("[GeoLeaf.Core] setTheme() : thème invalide →", theme);
        return;
    }
    _theme = theme;
    _applyThemeToBody(theme);
}

/**
 * Retourne le thème actif.
 * @returns {string}
 */
export function getTheme() {
    return _theme;
}
