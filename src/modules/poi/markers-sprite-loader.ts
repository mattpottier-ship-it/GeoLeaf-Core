/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Markers Sprite Loader
 * Injection asynchrone du sprite SVG of the profile active in the DOM
 */
import { Log } from "../log/index.js";
import { Config } from "../config/config-primitives.js";

function _getIconsConfig(): any {
    const ConfigAny = Config as any;
    if (typeof ConfigAny === "undefined") return null;
    if (typeof ConfigAny.getIconsConfig !== "function") return null;
    return ConfigAny.getIconsConfig();
}

function _logIconsCfgIfChanged(fn: any, iconsCfg: any): void {
    if (fn._lastConfig && JSON.stringify(iconsCfg) === JSON.stringify(fn._lastConfig)) return;
    if (Log) Log.debug("[POI] IconsConfig retrieved:", iconsCfg);
    fn._lastConfig = iconsCfg;
}

function _getSpriteUrl(iconsCfg: any): string | null {
    if (!iconsCfg) return null;
    const spriteUrl = iconsCfg.spriteUrl;
    if (!spriteUrl) return null;
    if (typeof spriteUrl !== "string") return null;
    return spriteUrl;
}

function _buildSvgElement(svgText: string): Element | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
        if (Log) Log.warn("[POI] SVG sprite parsing error :", parserError.textContent);
        return null;
    }
    const svgEl = doc.documentElement;
    if (!svgEl) return null;
    if (svgEl.tagName.toLowerCase() !== "svg") return null;
    return svgEl;
}

function _appendSvgToBody(svgEl: Element): void {
    svgEl.setAttribute("data-geoleaf-sprite", "profile");
    svgEl.setAttribute("aria-hidden", "true");
    (svgEl as HTMLElement).style.position = "absolute";
    (svgEl as HTMLElement).style.width = "0";
    (svgEl as HTMLElement).style.height = "0";
    (svgEl as HTMLElement).style.overflow = "hidden";
    if (document.body.firstChild) {
        document.body.insertBefore(svgEl, document.body.firstChild);
    } else {
        document.body.appendChild(svgEl);
    }
    const symbolCount = svgEl.querySelectorAll("symbol").length;
    if (Log)
        Log.info(
            "[POI] Profile SVG sprite injected into DOM (async).",
            symbolCount,
            "symbols loaded."
        );
}

async function _fetchAndInjectSprite(spriteUrl: string): Promise<void> {
    try {
        const response = await fetch(spriteUrl);
        if (!response.ok) {
            if (Log) Log.warn("[POI] Profile sprite load error: HTTP", response.status);
            return;
        }
        const svgText = await response.text();
        const svgEl = _buildSvgElement(svgText);
        if (!svgEl) return;
        _appendSvgToBody(svgEl);
    } catch (err: any) {
        if (Log) Log.warn("[POI] Profile sprite load error (async):", err);
    }
}

/**
 * Injecte le sprite SVG of the profile active in the DOM (asynchrone).
 */
async function ensureProfileSpriteInjectedSync(): Promise<void> {
    const fn = ensureProfileSpriteInjectedSync as (() => Promise<void>) & { _lastConfig?: any };
    try {
        const iconsCfg = _getIconsConfig();
        if (!iconsCfg) {
            if (Log) Log.warn("[POI] Config.getIconsConfig not available or no config");
            return;
        }
        _logIconsCfgIfChanged(fn, iconsCfg);
        const spriteUrl = _getSpriteUrl(iconsCfg);
        if (!spriteUrl) {
            if (Log) Log.warn("[POI] spriteUrl missing or invalid:", iconsCfg.spriteUrl);
            return;
        }
        const existing = document.querySelector('svg[data-geoleaf-sprite="profile"]');
        if (existing) {
            if (Log) Log.debug("[POI] SVG sprite already injected");
            return;
        }
        if (Log) Log.info("[POI] Loading sprite from:", spriteUrl);
        await _fetchAndInjectSprite(spriteUrl);
    } catch (err: any) {
        if (Log) Log.warn("[POI] Profile sprite load error :", err);
    }
}

export { ensureProfileSpriteInjectedSync };
