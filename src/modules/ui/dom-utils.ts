/* eslint-disable security/detect-object-injection */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI DOM Utilities Module
 * Reusable DOM utilities for the user interface
 */

import { Log } from "../log/index.js";
import { $create } from "../utils/dom-helpers.js";
import { resolveField } from "../utils/general-utils.js";
import { Config } from "../config/geoleaf-config/config-core.js";

const _UIDomUtils: any = {};

// Delegate resolveField to canonical import (Phase 4 dedup)
_UIDomUtils.resolveField = resolveField;

/**
 * Attache le behavior d'accordion (toggle open/close) to a conteneur.
 * Prevents multiple attachments using a flag.
 * @param {HTMLElement} container - Conteneur parent avec des elements .gl-accordion
 */
_UIDomUtils.attachAccordionBehavior = function (container: any) {
    if (!container || container._glAccordionBound) return;
    container._glAccordionBound = true;

    container.addEventListener("click", function (evt: any) {
        const header = evt.target.closest(".gl-accordion__header");
        if (!header || !container.contains(header)) {
            return;
        }
        const section = header.closest(".gl-accordion");
        if (!section) return;

        section.classList.toggle("is-open");
    });
};

/**
 * Retrieves the profile active from GeoLeaf.Config.
 * @returns {Object|null} Object profile ou null si inavailable
 */
_UIDomUtils.getActiveProfileConfig = function () {
    if (!Config || typeof (Config as any).getActiveProfile !== "function") {
        Log.warn(
            "[UIDomUtils] GeoLeaf.(Config as any).getActiveProfile() unavailable. Cannot retrieve active profile."
        );
        return null;
    }
    const profile = (Config as any).getActiveProfile();
    if (!profile) {
        Log.warn(
            "[UIDomUtils] No active profile returned by GeoLeaf.(Config as any).getActiveProfile()."
        );
    }
    return profile || null;
};

/**
 * Builds thes <option> of a select from la taxonomy et of a path optionsFrom.
 * @param {HTMLSelectElement} selectEl - Element <select> to peupler
 * @param {Object} profile - Object profile contenant la taxonomy
 * @param {string} optionsFrom - Path to thes options (ex: "taxonomy.categories")
 */
_UIDomUtils.populateSelectOptionsFromTaxonomy = function (
    selectEl: any,
    profile: any,
    optionsFrom: any
) {
    if (!selectEl || !profile || !profile.taxonomy) return;

    const taxonomy = profile.taxonomy;
    const emptyOpt = $create("option", {
        value: "",
        textContent: "— Tous —",
    });
    selectEl.appendChild(emptyOpt);

    if (optionsFrom === "taxonomy.categories") {
        const categories = taxonomy.categories || {};
        Object.keys(categories).forEach(function (catId) {
            const cat = categories[catId];
            const opt = $create("option", {
                value: catId,
                textContent: cat.label || catId,
            });
            selectEl.appendChild(opt);
        });
        return;
    }

    if (optionsFrom === "taxonomy.categories[*].subcategories") {
        const categories = taxonomy.categories || {};
        Object.keys(categories).forEach(function (catId) {
            const cat = categories[catId];
            const subs = (cat && cat.subcategories) || {};
            Object.keys(subs).forEach(function (subId) {
                const sub = subs[subId];
                const catLabel = cat.label || catId;
                const subLabel = sub.label || subId;
                const opt = $create("option", {
                    value: subId,
                    textContent: catLabel + " – " + subLabel,
                    attributes: { "data-category-id": catId },
                });
                selectEl.appendChild(opt);
            });
        });
    }
};

// ── ESM Export ──
export { _UIDomUtils };
