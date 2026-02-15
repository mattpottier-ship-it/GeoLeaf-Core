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
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf._UIDomUtils = GeoLeaf._UIDomUtils || {};

    // Helper pour utiliser createElement unifié
    const $create = (tag, props, ...children) => {
        return GeoLeaf.Utils && GeoLeaf.Utils.createElement
            ? GeoLeaf.Utils.createElement(tag, props, ...children)
            : document.createElement(tag);
    };

    const Log = GeoLeaf.Log || console;

    /**
     * Résout une valeur à partir d'un chemin de propriété (ex: "attributes.reviews.rating").
     * @param {Object} obj - Objet source (POI, route, etc.)
     * @param {string} fieldPath - Chemin de propriété séparé par des points
     * @returns {*} Valeur trouvée ou undefined
     */
    GeoLeaf._UIDomUtils.resolveField = function (obj, fieldPath) {
        if (!obj || !fieldPath) return undefined;
        const parts = fieldPath.split(".");
        let current = obj;
        for (let i = 0; i < parts.length; i += 1) {
            if (current == null) {
                return undefined;
            }
            current = current[parts[i]];
        }
        return current;
    };

    /**
     * Attache le comportement d'accordéon (toggle open/close) à un conteneur.
     * Évite les attachements multiples avec un flag.
     * @param {HTMLElement} container - Conteneur parent avec des éléments .gl-accordion
     */
    GeoLeaf._UIDomUtils.attachAccordionBehavior = function (container) {
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
    GeoLeaf._UIDomUtils.getActiveProfileConfig = function () {
        if (
            !GeoLeaf.Config ||
            typeof GeoLeaf.Config.getActiveProfile !== "function"
        ) {
            Log.warn(
                "[UIDomUtils] GeoLeaf.Config.getActiveProfile() indisponible. Impossible de récupérer le profil actif."
            );
            return null;
        }
        const profile = GeoLeaf.Config.getActiveProfile();
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
    GeoLeaf._UIDomUtils.populateSelectOptionsFromTaxonomy = function (
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

    Log.info("[GeoLeaf._UIDomUtils] Module DOM Utilities chargé");

})(window);
