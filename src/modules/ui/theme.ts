/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Theme Management
 * Gestion of the theme dark/light avec persistance localStorage
 */

import { Log } from "../log/index.js";
import { getLabel } from "../i18n/i18n.js";

// ========================================
//   CONSTANTES
// ========================================

const THEME_KEY = "geoleaf_theme";
const THEME_LIGHT = "light";
const THEME_DARK = "dark";

// ========================================
//   STATE INTERNE
// ========================================

/**
 * Single source of truth for the current theme
 * @type {string|null}
 * @private
 */
let _currentTheme: string | null = null;

// ========================================
//   FONCTIONS PUBLIQUES
// ========================================

/**
 * Returns the theme current ("light" ou "dark").
 * @returns {string} Theme current
 */
function getCurrentTheme() {
    // Si already en memory, returnner directly
    if (_currentTheme) {
        return _currentTheme;
    }

    // Sinon, fallback sur le DOM
    if (document.body.classList.contains("gl-theme-dark")) {
        _currentTheme = THEME_DARK;
        return THEME_DARK;
    }
    if (document.body.classList.contains("gl-theme-light")) {
        _currentTheme = THEME_LIGHT;
        return THEME_LIGHT;
    }

    // Fallback final
    _currentTheme = THEME_DARK;
    return THEME_DARK;
}

/**
 * Applies a theme au <body> et synchronise le button.
 * @param {string} theme - "light" ou "dark"
 */
function applyTheme(theme: string) {
    const normalized = theme === THEME_LIGHT || theme === THEME_DARK ? theme : THEME_DARK;

    Log.debug("[UI.Theme] applyTheme:", theme, "→", normalized);

    // Mettre up to date the state centralized AVANT le DOM
    _currentTheme = normalized;

    // Update du DOM sur body
    document.body.classList.remove("gl-theme-light", "gl-theme-dark");
    document.body.classList.add(normalized === THEME_DARK ? "gl-theme-dark" : "gl-theme-light");

    // Appliesr aussi the theme au conteneur de carte (pour support fullscreen)
    const mapContainer = document.getElementById("geoleaf-map");
    if (mapContainer) {
        mapContainer.classList.remove("gl-theme-light", "gl-theme-dark");
        mapContainer.classList.add(normalized === THEME_DARK ? "gl-theme-dark" : "gl-theme-light");
    }

    // Sauvegarde locale
    try {
        localStorage.setItem(THEME_KEY, normalized);
    } catch (_e) {
        // Handle explicitement l'absence de localStorage
        if (Log) Log.warn("[UI.Theme] localStorage not available, theme not persisted.");
    }

    // Synchronise le button si present
    updateToggleButton(normalized);

    // Global event for other modules
    if (globalThis.dispatchEvent) {
        globalThis.dispatchEvent(
            new CustomEvent("geoleaf:ui-theme-changed", {
                detail: { theme: normalized },
            })
        );
    }
}

/**
 * Switches the theme current (light <-> dark).
 */
function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    Log.debug("[UI.Theme] toggleTheme:", current, "→", next);
    applyTheme(next);
}

/**
 * Determines the theme initial :
 * 1) localStorage si available
 * 2) class du <body> si already defined
 * 3) sinon, "dark"
 * @returns {string} Theme initial
 * @private
 */
function resolveInitialTheme() {
    let stored = null;

    try {
        stored = localStorage.getItem(THEME_KEY);
    } catch (_e) {
        stored = null;
    }

    if (stored === THEME_LIGHT || stored === THEME_DARK) {
        return stored;
    }

    const bodyTheme = getCurrentTheme();
    if (bodyTheme === THEME_LIGHT || bodyTheme === THEME_DARK) {
        return bodyTheme;
    }

    return THEME_DARK;
}

/**
 * Retrieves the button de theme in the DOM.
 * Par convention on utilise l'attribut data-gl-role="theme-toggle".
 * @returns {HTMLElement|null}
 * @private
 */
function getToggleButton() {
    return document.querySelector('[data-gl-role="theme-toggle"]');
}

/**
 * Updates the state visuel/ARIA du button de theme.
 * @param {string} theme - "light" ou "dark"
 * @private
 */
function updateToggleButton(theme: string) {
    const btn = getToggleButton();
    if (!btn) return;

    const isDark = theme === THEME_DARK;

    btn.setAttribute("data-gl-theme-state", isDark ? "dark" : "light");
    btn.setAttribute("aria-pressed", String(isDark));
    btn.setAttribute(
        "aria-label",
        isDark ? getLabel("aria.theme.toggle_to_light") : getLabel("aria.theme.toggle_to_dark")
    );
    (btn as HTMLElement).title = isDark
        ? getLabel("aria.theme.toggle_to_light")
        : getLabel("aria.theme.toggle_to_dark");
}

/**
 * Initializes the gestion du button de theme.
 * @param {object} [options] - Options de configuration
 * @param {string} [options.buttonSelector] - Selector custom du button
 * @param {boolean} [options.autoInitOnDomReady] - Si true, attend DOMContentLoaded
 */
function initThemeToggle(options: { buttonSelector?: string; autoInitOnDomReady?: boolean } = {}) {
    const cfg = {
        buttonSelector: options.buttonSelector || '[data-gl-role="theme-toggle"]',
        autoInitOnDomReady:
            typeof options.autoInitOnDomReady === "boolean" ? options.autoInitOnDomReady : false,
    };

    const doInit = () => {
        const initialTheme = resolveInitialTheme();
        Log.debug("[UI.Theme] initThemeToggle:", initialTheme);
        applyTheme(initialTheme);

        const btn = document.querySelector(cfg.buttonSelector);
        if (!btn) {
            Log.warn("[UI.Theme] Theme button not found:", cfg.buttonSelector);
            return;
        }

        Log.debug("[UI.Theme] Theme button found");

        // Accessibility: native <button> or role "button"
        const tag = (btn.tagName || "").toLowerCase();
        if (tag === "button") {
            try {
                (btn as HTMLButtonElement).type = (btn as HTMLButtonElement).type || "button";
            } catch (_e) {
                // Certains elements custom peuvent lever une error
            }
        } else {
            btn.setAttribute("role", "button");
            btn.setAttribute("tabindex", "0");
        }

        // First sync of visual state
        updateToggleButton(initialTheme);

        // Click souris
        btn.addEventListener("click", (evt: Event) => {
            evt.preventDefault();
            toggleTheme();
        });

        // Clavier (Enter / Space)
        (btn as HTMLElement).addEventListener("keydown", (evt: KeyboardEvent) => {
            if (evt.key === "Enter" || evt.key === " " || evt.key === "Spacebar") {
                evt.preventDefault();
                toggleTheme();
            }
        });
    };
    if (cfg.autoInitOnDomReady) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", doInit, { once: true });
        } else {
            doInit();
        }
    } else {
        doInit();
    }
}

// ========================================
//   EXPORT
// ========================================

const _UITheme = {
    initThemeToggle,
    toggleTheme,
    applyTheme,
    getCurrentTheme,
    // Constantes exposedes
    THEME_LIGHT,
    THEME_DARK,
};

// ── ESM Export ──
export { _UITheme };
