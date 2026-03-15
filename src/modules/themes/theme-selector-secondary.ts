"use strict";

import { Log } from "../log/index.js";
import { _state } from "./theme-selector-state.js";
import { attachDOMEvent } from "./theme-selector-events.js";
import { $create } from "../utils/dom-helpers.js";
import { getLabel } from "../i18n/i18n.js";
import { DOMSecurity } from "../utils/dom-security.js";

/**
 * Attache le manager for changement sur le dropdown secondary.
 *
 * @param select - Element select
 * @param setThemeFn - Fonction de changement de theme
 */
export function attachDropdownHandler(
    select: any,
    setThemeFn: (id: string) => Promise<void>
): void {
    const onChange = (ev: any) => {
        if ((globalThis as any).L?.DomEvent) {
            (globalThis as any).L.DomEvent.stopPropagation(ev);
        }
        const themeId = select.value;
        if (Log) Log.info(`[ThemeSelector] Dropdown changed: ${themeId}`);
        if (themeId) {
            setThemeFn(themeId);
        } else {
            if (Log) Log.warn("[ThemeSelector] Dropdown: themeId vide");
        }
    };
    attachDOMEvent(select, "change", onChange, "ThemeSelector.dropdown");
    if (Log) Log.debug("[ThemeSelector] Dropdown handler attached");
}

/**
 * Attache le manager sur un button de navigation secondary (prev/next).
 *
 * @param btn - Button DOM
 * @param direction - "prev" | "next"
 * @param nextThemeFn - Fonction pour enable the theme suivant
 * @param previousThemeFn - Fonction pour enable the theme previous
 */
export function attachNavButtonHandler(
    btn: any,
    direction: "prev" | "next",
    nextThemeFn: () => void,
    previousThemeFn: () => void
): void {
    const onClick = (ev: any) => {
        if ((globalThis as any).L?.DomEvent) {
            (globalThis as any).L.DomEvent.stopPropagation(ev);
        }
        ev.preventDefault();
        if (direction === "next") {
            nextThemeFn();
        } else {
            previousThemeFn();
        }
    };
    attachDOMEvent(btn, "click", onClick, "ThemeSelector.navButton");
}

/**
 * Updates the state du dropdown after un changement de theme.
 *
 * @param themeId - ID of the theme active
 */
export function updateUIStateSecondary(themeId: string): void {
    if (!_state.dropdown) return;
    const isSecondary = _state.secondaryThemes.some((t: any) => t.id === themeId);
    if (isSecondary) {
        _state.dropdown.value = themeId;
    } else {
        _state.dropdown.value = "";
    }
}

/**
 * Creates the UI des themes secondarys (dropdown + buttons prev/next).
 *
 * @param setThemeFn - Fonction de changement de theme
 * @param nextThemeFn - Callback theme suivant
 * @param previousThemeFn - Callback theme previous
 */
function _buildSecondaryNavButton(
    wrapper: HTMLElement,
    dir: "prev" | "next",
    nextFn: () => void,
    prevFn: () => void
): void {
    const cls =
        dir === "prev" ? "gl-theme-nav gl-theme-nav--prev" : "gl-theme-nav gl-theme-nav--next";
    const btn = (globalThis as any).L.DomUtil.create("button", cls, wrapper);
    btn.type = "button";
    btn.textContent = dir === "prev" ? "❮" : "❯";
    btn.title =
        dir === "prev" ? getLabel("aria.themes.prev_title") : getLabel("aria.themes.next_title");
    attachNavButtonHandler(btn, dir, nextFn, prevFn);
}

function _buildSecondaryDropdown(
    wrapper: HTMLElement,
    setThemeFn: (id: string) => Promise<void>
): void {
    const select = (globalThis as any).L.DomUtil.create("select", "gl-theme-dropdown", wrapper);
    _state.dropdown = select;

    const placeholder = $create("option", {
        value: "",
        textContent: _state.config.secondaryThemes.placeholder,
        disabled: true,
    });
    select.appendChild(placeholder);

    _state.secondaryThemes.forEach((theme: any) => {
        const opt = $create("option", { value: theme.id, textContent: theme.label });
        select.appendChild(opt);
    });

    const currentIsSecondary = _state.secondaryThemes.some(
        (t: any) => t.id === _state.currentTheme
    );
    select.value = currentIsSecondary ? _state.currentTheme : "";
    attachDropdownHandler(select, setThemeFn);
}

export function createSecondaryUI(
    setThemeFn: (id: string) => Promise<void>,
    nextThemeFn: () => void,
    previousThemeFn: () => void
): void {
    if (!_state.secondaryContainer) {
        if (Log) Log.warn("[ThemeSelector] Conteneur secondaire introuvable");
        return;
    }
    if (Log)
        Log.debug(
            "[ThemeSelector] Creating secondary UI:",
            _state.secondaryThemes.length,
            "themes"
        );
    if (Log)
        Log.debug(
            "[ThemeSelector] IDs:",
            _state.secondaryThemes.map((t: any) => t.id)
        );

    DOMSecurity.clearElementFast(_state.secondaryContainer);
    _state.secondaryContainer.classList.add("gl-theme-selector-secondary");

    const wrapper = (globalThis as any).L.DomUtil.create(
        "div",
        "gl-theme-selector-secondary__wrapper",
        _state.secondaryContainer
    );

    if (_state.config.secondaryThemes.showNavigationButtons) {
        _buildSecondaryNavButton(wrapper, "prev", nextThemeFn, previousThemeFn);
    }

    _buildSecondaryDropdown(wrapper, setThemeFn);

    if (_state.config.secondaryThemes.showNavigationButtons) {
        _buildSecondaryNavButton(wrapper, "next", nextThemeFn, previousThemeFn);
    }

    if (Log)
        Log.debug("[ThemeSelector] Secondary UI created:", _state.secondaryThemes.length, "themes");
}
