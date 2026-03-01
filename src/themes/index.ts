/**
 * src/themes/index.js — Shim: exposes Themes module methods as named exports
 * Tests expect: Themes, setTheme, getCurrentTheme, toggleTheme, loadTheme, clearCache
 * @see src/modules/geoleaf.themes.js
 */
import { Themes as _Themes } from "../modules/geoleaf.themes.js";

const Themes: any = _Themes;
export { Themes };

/** Alias: setTheme → Themes.applyTheme */
export const setTheme = (...args: any[]) => (Themes as any).applyTheme(...args);

/** Alias: getCurrentTheme → Themes.getCurrentTheme */
export const getCurrentTheme = (...args: any[]) => (Themes as any).getCurrentTheme(...args);

/** Alias: toggleTheme — applies next available theme */
export const toggleTheme = async (layerId: any) => {
    const current = Themes.getCurrentTheme(layerId);
    const available = await Themes.getAvailableThemes(layerId);
    if (!available || !available.length) return null;
    const idx = available.findIndex((t: any) => t.id === current);
    const next = available[(idx + 1) % available.length];
    return Themes.applyTheme(layerId, next.id);
};

/** Alias: loadTheme → Themes.loadTheme */
export const loadTheme = (...args: any[]) => (Themes as any).loadTheme(...args);

/** Alias: clearCache → Themes.invalidateCache */
export const clearCache = () => Themes.invalidateCache();
