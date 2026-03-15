/* eslint-disable security/detect-object-injection */
/*!
 * GeoLeaf Core — i18n
 * © 2026 Mattieu Pottier — MIT License
 *
 * Lightweight internationalisation — no external dependency.
 * Resolution order: profile labels override > active lang > French fallback > key.
 * Template variables: {0}, {1}, ...
 *
 * @module i18n/i18n
 */
import type { LangDict } from "../../lang/lang_fr.js";
import langFr from "../../lang/lang_fr.js";
import langEn from "../../lang/lang_en.js";
import langEs from "../../lang/lang_es.js";
import langPt from "../../lang/lang_pt.js";
import langIt from "../../lang/lang_it.js";
import langDe from "../../lang/lang_de.js";
import { Config } from "../config/geoleaf-config/config-core.js";

const LANGS: Record<string, LangDict> = {
    fr: langFr,
    en: langEn,
    es: langEs,
    pt: langPt,
    it: langIt,
    de: langDe,
    al: langDe, // "al" = Allemand (French shorthand for German)
};

let _active: LangDict = langFr;
let _overrides: LangDict = {};
let _initialized = false;

/** Initialize i18n from config. Called once after config is loaded. */
export function initI18n(): void {
    const code =
        ((Config as any).get?.("ui.language", "fr") as string | undefined)?.toLowerCase() ?? "fr";
    _active = LANGS[code] ?? langFr;
    _overrides = ((Config as any).get?.("labels", {}) as LangDict) ?? {};
    _initialized = true;
}

/**
 * Returns the localised label for `key`, optionally interpolating positional args.
 * Falls back to French, then to the raw key if not found.
 *
 * @example getLabel("toast.geoloc.position_found")
 * @example getLabel("toast.cache.download_success", "4.20")
 */
export function getLabel(key: string, ...args: string[]): string {
    if (!_initialized) initI18n();
    let label: string = _overrides[key] ?? _active[key] ?? langFr[key] ?? key;
    for (let i = 0; i < args.length; i++) {
        label = label.replace(`{${i}}`, args[i]);
    }
    return label;
}
