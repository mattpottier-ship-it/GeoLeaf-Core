/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Theme Management
 * Gestion du thème dark/light avec persistance localStorage
 */

import { Log } from '../log/index.js';

// ========================================
//   CONSTANTES
// ========================================

const THEME_KEY = "geoleaf_theme";
const THEME_LIGHT = "light";
const THEME_DARK = "dark";

// ========================================
//   ÉTAT INTERNE
// ========================================

/**
 * Source de vérité unique pour le thème actuel
 * @type {string|null}
 * @private
 */
let _currentTheme = null;

// ========================================
//   FONCTIONS PUBLIQUES
// ========================================

/**
 * Retourne le thème courant ("light" ou "dark").
 * @returns {string} Theme actuel
 */
function getCurrentTheme() {
    // Si déjà en mémoire, retourner directement
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
 * Applique un thème au <body> et synchronise le bouton.
 * @param {string} theme - "light" ou "dark"
 */
function applyTheme(theme) {
    const normalized =
        theme === THEME_LIGHT || theme === THEME_DARK
            ? theme
            : THEME_DARK;

    Log.debug('[UI.Theme] applyTheme:', theme, '→', normalized);

    // Mettre à jour l'état centralisé AVANT le DOM
    _currentTheme = normalized;

    // Mise à jour du DOM sur body
    document.body.classList.remove("gl-theme-light", "gl-theme-dark");
    document.body.classList.add(
        normalized === THEME_DARK ? "gl-theme-dark" : "gl-theme-light"
    );

    // Appliquer aussi le thème au conteneur de carte (pour support fullscreen)
    const mapContainer = document.getElementById("geoleaf-map");
    if (mapContainer) {
        mapContainer.classList.remove("gl-theme-light", "gl-theme-dark");
        mapContainer.classList.add(
            normalized === THEME_DARK ? "gl-theme-dark" : "gl-theme-light"
        );
    }

    // Sauvegarde locale
    try {
        localStorage.setItem(THEME_KEY, normalized);
    } catch (e) {
        // Gérer explicitement l'absence de localStorage
        if (Log) Log.warn("[UI.Theme] localStorage non disponible, thème non persisté.");
    }

    // Synchronise le bouton si présent
    updateToggleButton(normalized);

    // Évènement global pour les autres modules
    if (globalThis.dispatchEvent) {
        globalThis.dispatchEvent(
            new CustomEvent("geoleaf:ui-theme-changed", {
                detail: { theme: normalized }
            })
        );
    }
}

/**
 * Bascule le thème courant (light <-> dark).
 */
function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    Log.debug('[UI.Theme] toggleTheme:', current, '→', next);
    applyTheme(next);
}

/**
 * Détermine le thème initial :
 * 1) localStorage si disponible
 * 2) class du <body> si déjà définie
 * 3) sinon, "dark"
 * @returns {string} Theme initial
 * @private
 */
function resolveInitialTheme() {
    let stored = null;

    try {
        stored = localStorage.getItem(THEME_KEY);
    } catch (e) {
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
 * Récupère le bouton de thème dans le DOM.
 * Par convention on utilise l'attribut data-gl-role="theme-toggle".
 * @returns {HTMLElement|null}
 * @private
 */
function getToggleButton() {
    return document.querySelector('[data-gl-role="theme-toggle"]');
}

/**
 * Met à jour l'état visuel/ARIA du bouton de thème.
 * @param {string} theme - "light" ou "dark"
 * @private
 */
function updateToggleButton(theme) {
    const btn = getToggleButton();
    if (!btn) return;

    const isDark = theme === THEME_DARK;

    btn.setAttribute("data-gl-theme-state", isDark ? "dark" : "light");
    btn.setAttribute("aria-pressed", String(isDark));
    btn.setAttribute(
        "aria-label",
        isDark ? "Basculer en thème clair" : "Basculer en thème sombre"
    );
    btn.title = isDark ? "Thème clair" : "Thème sombre";
}

/**
 * Initialise la gestion du bouton de thème.
 * @param {object} [options] - Options de configuration
 * @param {string} [options.buttonSelector] - Sélecteur custom du bouton
 * @param {boolean} [options.autoInitOnDomReady] - Si true, attend DOMContentLoaded
 */
function initThemeToggle(options = {}) {
    const cfg = {
        buttonSelector: options.buttonSelector || '[data-gl-role="theme-toggle"]',
        autoInitOnDomReady:
            typeof options.autoInitOnDomReady === "boolean"
                ? options.autoInitOnDomReady
                : false
    };

    const doInit = () => {
        const initialTheme = resolveInitialTheme();
        Log.debug('[UI.Theme] initThemeToggle:', initialTheme);
        applyTheme(initialTheme);

        const btn = document.querySelector(cfg.buttonSelector);
        if (!btn) {
            Log.warn('[UI.Theme] Bouton de thème introuvable:', cfg.buttonSelector);
            return;
        }

        Log.debug('[UI.Theme] Bouton de thème trouvé');

        // Accessibilité : <button> natif ou rôle "button"
        const tag = (btn.tagName || "").toLowerCase();
        if (tag === "button") {
            try {
                btn.type = btn.type || "button";
            } catch (e) {
                // Certains éléments custom peuvent lever une erreur
            }
        } else {
            btn.setAttribute("role", "button");
            btn.setAttribute("tabindex", "0");
        }

        // Première synchro de l'état visuel
        updateToggleButton(initialTheme);

        // Clic souris
        btn.addEventListener("click", (evt) => {
            evt.preventDefault();
            toggleTheme();
        });

        // Clavier (Enter / Space)
        btn.addEventListener("keydown", (evt) => {
            if (evt.key === "Enter" || evt.key === " " || evt.key === "Spacebar") {
                evt.preventDefault();
                toggleTheme();
            }
        });
    };    if (cfg.autoInitOnDomReady) {
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
    // Constantes exposées
    THEME_LIGHT,
    THEME_DARK
};

// ── ESM Export ──
export { _UITheme };
