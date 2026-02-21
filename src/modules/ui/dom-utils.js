/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI DOM Utilities Module
 * Utilitaires DOM réutilisables pour l'interface utilisateur
 */

import { Log } from '../log/index.js';
import { $create } from '../utils/dom-helpers.js';
import { resolveField } from '../utils/general-utils.js';
import { Config } from '../config/geoleaf-config/config-core.js';

const _UIDomUtils = {};

// Delegate resolveField to canonical import (Phase 4 dedup)
_UIDomUtils.resolveField = resolveField;

/**
 * Attache le comportement d'accordéon (toggle open/close) à un conteneur.
 * Évite les attachements multiples avec un flag.
 * @param {HTMLElement} container - Conteneur parent avec des éléments .gl-accordion
 */
_UIDomUtils.attachAccordionBehavior = function (container) {
    if (!container || container._glAccordionBound) return;
    container._glAccordionBound = true;

    container.addEventListener("click", function (evt) {
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
 * Récupère le profil actif depuis GeoLeaf.Config.
 * @returns {Object|null} Objet profil ou null si indisponible
 */
_UIDomUtils.getActiveProfileConfig = function () {
    if (
        !Config ||
        typeof Config.getActiveProfile !== "function"
    ) {
        Log.warn(
            "[UIDomUtils] GeoLeaf.Config.getActiveProfile() indisponible. Impossible de récupérer le profil actif."
        );
        return null;
    }
    const profile = Config.getActiveProfile();
    if (!profile) {
        Log.warn(
            "[UIDomUtils] Aucun profil actif retourné par GeoLeaf.Config.getActiveProfile()."
        );
    }
    return profile || null;
};

/**
 * Construit les <option> d'un select à partir de la taxonomie et d'un chemin optionsFrom.
 * @param {HTMLSelectElement} selectEl - Élément <select> à peupler
 * @param {Object} profile - Objet profil contenant la taxonomie
 * @param {string} optionsFrom - Chemin vers les options (ex: "taxonomy.categories")
 */
_UIDomUtils.populateSelectOptionsFromTaxonomy = function (
    selectEl,
    profile,
    optionsFrom
) {
    if (!selectEl || !profile || !profile.taxonomy) return;

    const taxonomy = profile.taxonomy;
    const emptyOpt = $create("option", {
        value: "",
        textContent: "— Tous —"
    });
    selectEl.appendChild(emptyOpt);

    if (optionsFrom === "taxonomy.categories") {
        const categories = taxonomy.categories || {};
        Object.keys(categories).forEach(function (catId) {
            const cat = categories[catId];
            const opt = $create("option", {
                value: catId,
                textContent: cat.label || catId
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
                    attributes: { "data-category-id": catId }
                });
                selectEl.appendChild(opt);
            });
        });
    }
};

// ── ESM Export ──
export { _UIDomUtils };
