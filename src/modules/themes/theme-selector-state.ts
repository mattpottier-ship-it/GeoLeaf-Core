"use strict";

/**
 * Primary theme threshold beyond which the bar switches to compact mode.
 * Configurable via config.primaryThemes.compactThreshold (Phase 4).
 */
export const PRIMARY_COMPACT_THRESHOLD = 5;

/**
 * Shared state of the module ThemeSelector
 */
export const _state: any = {
    initialized: false,
    profileId: null,
    config: null,
    themes: [],
    primaryThemes: [],
    secondaryThemes: [],
    currentTheme: null,
    // UI references
    primaryContainer: null,
    secondaryContainer: null,
    dropdown: null,
    // Event listner cleanup tracking
    _eventCleanups: [],
    // Mode compact – references DOM (Phase 4)
    primaryScrollEl: null,
    primaryScrollNavPrev: null,
    primaryScrollNavNext: null,
};
