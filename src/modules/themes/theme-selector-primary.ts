"use strict";

import { Log } from "../log/index.js";
import { _state, PRIMARY_COMPACT_THRESHOLD } from "./theme-selector-state.js";
import { attachDOMEvent } from "./theme-selector-events.js";
import {
    attachCompactNavHandler,
    updatePrimaryNavButtons,
    ensurePrimaryThemeVisible,
} from "./theme-selector-compact.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { getLabel } from "../i18n/i18n.js";

/**
 * Attache le manager for click sur un button de theme main.
 *
 * @param btn - Button DOM
 * @param theme - Configuration of the theme
 * @param setThemeFn - Fonction de changement de theme
 */
export function attachPrimaryButtonHandler(
    btn: any,
    theme: any,
    setThemeFn: (id: string) => Promise<void>
): void {
    const onClick = (ev: any) => {
        if ((globalThis as any).L?.DomEvent) {
            (globalThis as any).L.DomEvent.stopPropagation(ev);
        }
        ev.preventDefault();
        setThemeFn(theme.id);
    };
    attachDOMEvent(btn, "click", onClick, "ThemeSelector.primaryButton");
}

/**
 * Updates the state active des buttons principaux et manages le scroll compact.
 *
 * @param themeId - ID of the theme active
 */
export function updateUIStatePrimary(themeId: string): void {
    if (!_state.primaryContainer) return;
    const buttons = _state.primaryContainer.querySelectorAll(".gl-theme-btn");
    buttons.forEach((btn: any) => {
        if (btn.dataset.themeId === themeId) {
            btn.classList.add("gl-theme-btn--active");
        } else {
            btn.classList.remove("gl-theme-btn--active");
        }
    });
    // Compact mode: scroll to the active theme (Phase 4)
    if (_state.primaryScrollEl) {
        ensurePrimaryThemeVisible(themeId);
    }
}

/**
 * Creates the UI for main themes (buttons + compact mode if threshold exceeded).
 *
 * @param setThemeFn - Theme change function passed as callback
 */
function _buildCompactPrimaryUI(container: HTMLElement): HTMLElement {
    container.classList.add("gl-theme-selector-primary--compact");

    const navPrev = (globalThis as any).L.DomUtil.create(
        "button",
        "gl-theme-selector-primary__nav gl-theme-selector-primary__nav--prev",
        container
    );
    navPrev.type = "button";
    navPrev.setAttribute("aria-label", getLabel("aria.themes.nav_prev"));
    navPrev.innerHTML = "&#8249;";
    _state.primaryScrollNavPrev = navPrev;
    attachCompactNavHandler(navPrev, "prev");

    const scrollEl = (globalThis as any).L.DomUtil.create(
        "div",
        "gl-theme-selector-primary__scroll",
        container
    );
    _state.primaryScrollEl = scrollEl;
    scrollEl.addEventListener("scroll", () => updatePrimaryNavButtons());

    const navNext = (globalThis as any).L.DomUtil.create(
        "button",
        "gl-theme-selector-primary__nav gl-theme-selector-primary__nav--next",
        container
    );
    navNext.type = "button";
    navNext.setAttribute("aria-label", getLabel("aria.themes.nav_next"));
    navNext.innerHTML = "&#8250;";
    _state.primaryScrollNavNext = navNext;
    attachCompactNavHandler(navNext, "next");

    return scrollEl;
}

export function createPrimaryUI(setThemeFn: (id: string) => Promise<void>): void {
    if (!_state.primaryContainer) return;

    // Emptyr le conteneur
    DOMSecurity.clearElementFast(_state.primaryContainer);

    // Addsr la class CSS (retirer d'abord --compact au case de re-init)
    _state.primaryContainer.classList.add("gl-theme-selector-primary");
    _state.primaryContainer.classList.remove("gl-theme-selector-primary--compact");

    // Reset references mode compact
    _state.primaryScrollEl = null;
    _state.primaryScrollNavPrev = null;
    _state.primaryScrollNavNext = null;

    // Seuil configurable (Phase 4) : si > seuil → mode compact (nav + scroll horizontal)
    const threshold: number =
        _state.config?.primaryThemes?.compactThreshold ?? PRIMARY_COMPACT_THRESHOLD;
    const isCompact = _state.primaryThemes.length > threshold;

    // Conteneur qui recevra les buttons (direct ou zone scrollable)
    let btnParent: HTMLElement = _state.primaryContainer;

    if (isCompact) {
        btnParent = _buildCompactPrimaryUI(_state.primaryContainer);
    }

    // Createsr un button pour chaque theme main
    _state.primaryThemes.forEach((theme: any) => {
        const btn = (globalThis as any).L.DomUtil.create("button", "gl-theme-btn", btnParent);
        btn.type = "button";
        btn.dataset.themeId = theme.id;
        btn.title = theme.description || theme.label;

        // Contenu du button : icon + label
        const iconSpan = (globalThis as any).L.DomUtil.create("span", "gl-theme-btn__icon", btn);
        iconSpan.textContent = theme.icon || "??";

        const labelSpan = (globalThis as any).L.DomUtil.create("span", "gl-theme-btn__label", btn);
        labelSpan.textContent = theme.label;

        // Marquer the theme active
        if (theme.id === _state.currentTheme) {
            btn.classList.add("gl-theme-btn--active");
        }

        // Manager for click
        attachPrimaryButtonHandler(btn, theme, setThemeFn);
    });

    if (isCompact) {
        // Initializesr the state des buttons nav after rendu (scrollWidth available)
        requestAnimationFrame(() => updatePrimaryNavButtons());
    }

    if (Log)
        Log.debug(
            "[ThemeSelector] Primary UI created:",
            _state.primaryThemes.length,
            "buttons",
            isCompact ? "(mode compact)" : ""
        );
}
