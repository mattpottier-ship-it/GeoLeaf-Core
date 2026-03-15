"use strict";

import { _state } from "./theme-selector-state.js";
import { attachDOMEvent } from "./theme-selector-events.js";

/**
 * Attache le manager for click sur un button de navigation compact (prev/next).
 *
 * @param btn - Button nav
 * @param direction - "prev" | "next"
 */
export function attachCompactNavHandler(btn: any, direction: "prev" | "next"): void {
    const SCROLL_AMOUNT = 120; // px par click
    const onClick = (ev: any) => {
        if ((globalThis as any).L?.DomEvent) {
            (globalThis as any).L.DomEvent.stopPropagation(ev);
        }
        ev.preventDefault();
        if (!_state.primaryScrollEl) return;
        const delta = direction === "next" ? SCROLL_AMOUNT : -SCROLL_AMOUNT;
        _state.primaryScrollEl.scrollBy({ left: delta, behavior: "smooth" });
    };
    attachDOMEvent(btn, "click", onClick, "ThemeSelector.compactNav");
}

/**
 * Updates the state disabled des buttons de navigation compacts.
 */
export function updatePrimaryNavButtons(): void {
    const el = _state.primaryScrollEl;
    if (!el) return;
    const atStart = el.scrollLeft <= 2;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    if (_state.primaryScrollNavPrev) _state.primaryScrollNavPrev.disabled = atStart;
    if (_state.primaryScrollNavNext) _state.primaryScrollNavNext.disabled = atEnd;
}

/**
 * Scrolls the compact bar to make the active theme visible.
 *
 * @param themeId - ID of the theme active
 */
export function ensurePrimaryThemeVisible(themeId: string): void {
    if (!_state.primaryScrollEl) return;
    const btn = _state.primaryScrollEl.querySelector(
        `[data-theme-id="${themeId}"]`
    ) as HTMLElement | null;
    if (!btn) return;
    btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    // Recalculate nav button state after scrolling
    setTimeout(() => updatePrimaryNavButtons(), 350);
}
