/*!
 * GeoLeaf Core – Core / Theme
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 */

import { Log } from "../log/index.js";

let _theme = "light";

/**
 * Applies ae class de theme sur document.body.
 * @param {string} theme - "light" | "dark"
 */
function _applyThemeToBody(theme: any) {
    const body = document.body;
    if (!body) {
        Log.warn("[GeoLeaf.Core] document.body not found");
        return;
    }
    body.classList.remove("gl-theme-light", "gl-theme-dark");
    body.classList.add(theme === "dark" ? "gl-theme-dark" : "gl-theme-light");
}

/**
 * Sets et applique the theme active.
 * @param {string} theme - "light" | "dark"
 */
export function setTheme(theme: any) {
    if (!theme || (theme !== "light" && theme !== "dark")) {
        Log.warn("[GeoLeaf.Core] setTheme()→", theme);
        return;
    }
    _theme = theme;
    _applyThemeToBody(theme);
}

/**
 * Returns the theme active.
 * @returns {string}
 */
export function getTheme() {
    return _theme;
}
