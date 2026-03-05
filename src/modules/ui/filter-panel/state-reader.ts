/**
 * GeoLeaf UI Filter Panel - State Reader
 * Lecture de l'état des filtres depuis le DOM
 *
 * @module ui/filter-panel/state-reader
 */
"use strict";

import { FilterPanelProximity as _FilterPanelProximity } from "./proximity.js";
const FilterPanelProximity: any = _FilterPanelProximity;
// _g.GeoLeaf.UI.* proximity globals removed — using FilterPanelProximity.resetProximity() (module-local state)

const FilterPanelStateReader: any = {};

/**
 * Structure par défaut de l'état des filtres
 * @returns {Object}
 */
FilterPanelStateReader.getDefaultState = function () {
    return {
        categoriesTree: [],
        subCategoriesTree: [],
        minRating: NaN,
        hasMinRating: false,
        selectedTags: [],
        hasTags: false,
        dataTypes: { poi: true, routes: true },
        searchText: "",
        hasSearchText: false,
        proximity: {
            active: false,
            center: null,
            radius: 10,
        },
    };
};

/**
 * Lit l'état actuel des filtres depuis le panneau DOM
 * @param {HTMLElement} panelEl - Élément du panneau de filtres
 * @returns {Object} - État des filtres
 */
FilterPanelStateReader.readFiltersFromPanel = function (panelEl: any) {
    const state = FilterPanelStateReader.getDefaultState();

    if (!panelEl) return state;

    // Types de données (POI / Routes)
    const poiCheckbox = panelEl.querySelector("[data-gl-filter-id='dataTypes'] input[value='poi']");
    const routesCheckbox = panelEl.querySelector(
        "[data-gl-filter-id='dataTypes'] input[value='routes']"
    );
    if (poiCheckbox) state.dataTypes.poi = poiCheckbox.checked;
    if (routesCheckbox) state.dataTypes.routes = routesCheckbox.checked;

    // Recherche textuelle
    const searchInput = panelEl.querySelector(
        "[data-gl-filter-id='searchText'] input[type='text']"
    );
    if (searchInput && searchInput.value.trim() !== "") {
        state.searchText = searchInput.value.trim().toLowerCase();
        state.hasSearchText = true;
    }

    // Proximité — vérifier data-proximity-active="true" sur chaque source indépendamment.
    // ?? seul ne suffit pas : querySelector retourne un élément inactif (non null) s'il existe dans
    // le panneau, court-circuitant le fallback vers le wrapper global de la toolbar mobile.
    const panelProximityEl: Element | null = panelEl.querySelector(
        "[data-gl-filter-id='proximity']"
    );
    const toolbarProximityEl: Element | null = document.getElementById(
        "gl-proximity-toolbar-wrapper"
    );
    const proximityContainer: Element | null =
        (panelProximityEl?.getAttribute("data-proximity-active") === "true"
            ? panelProximityEl
            : null) ??
        (toolbarProximityEl?.getAttribute("data-proximity-active") === "true"
            ? toolbarProximityEl
            : null);

    if (proximityContainer) {
        const lat = parseFloat(proximityContainer.getAttribute("data-proximity-lat") ?? "");
        const lng = parseFloat(proximityContainer.getAttribute("data-proximity-lng") ?? "");
        const radius = parseFloat(proximityContainer.getAttribute("data-proximity-radius") ?? "");

        if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
            state.proximity.active = true;
            state.proximity.center = { lat: lat, lng: lng };
            state.proximity.radius = radius;
        }
    }

    // Tree-view : catégories cochées
    panelEl.querySelectorAll("input.gl-filter-tree__checkbox--category:checked").forEach(function (
        input: any
    ) {
        const val = input.value;
        if (val) {
            state.categoriesTree.push(String(val));
        }
    });

    // Tree-view : sous-catégories cochées
    panelEl
        .querySelectorAll("input.gl-filter-tree__checkbox--subcategory:checked")
        .forEach(function (input: any) {
            const subId = input.getAttribute("data-gl-filter-subcategory-id");
            if (subId) {
                state.subCategoriesTree.push(String(subId));
            }
        });

    // Slider de note minimale
    const ratingInput = panelEl.querySelector(
        "[data-gl-filter-id='minRating'] input[type='range']"
    );
    if (ratingInput && ratingInput.value !== "") {
        const val = parseFloat(ratingInput.value);
        if (!isNaN(val)) {
            state.minRating = val;
            state.hasMinRating = val > 0;
        }
    }

    // Tags sélectionnés (badges)
    const tagsContainer = panelEl.querySelector(
        "[data-gl-filter-id='tags'] .gl-filter-panel__tags-container"
    );
    if (tagsContainer) {
        const selectedBadges = tagsContainer.querySelectorAll(
            ".gl-filter-panel__tag-badge.is-selected"
        );
        const selected = Array.from(selectedBadges)
            .map(function (badge: any) {
                return badge.getAttribute("data-tag-value");
            })
            .filter(Boolean);
        state.selectedTags = selected;
        state.hasTags = selected.length > 0;
    }

    return state;
};

/**
 * Réinitialise les contrôles du panneau de filtres à leur état par défaut
 * @param {HTMLElement} panelEl - Élément du panneau de filtres
 */
FilterPanelStateReader.resetControls = function (panelEl: any) {
    if (!panelEl) return;

    // Checkbox-group (POI/Routes) - reset to checked by default
    const dataTypesCheckboxes = panelEl.querySelectorAll(
        "[data-gl-filter-id='dataTypes'] input[type='checkbox']"
    );
    dataTypesCheckboxes.forEach(function (input: any) {
        input.checked = true;
    });

    // Search text input
    const searchInput = panelEl.querySelector(
        "[data-gl-filter-id='searchText'] input[type='text']"
    );
    if (searchInput) {
        searchInput.value = "";
    }

    // Proximité
    const proximityWrapper = panelEl.querySelector("[data-gl-filter-id='proximity']");
    if (proximityWrapper) {
        proximityWrapper.removeAttribute("data-proximity-active");
        proximityWrapper.removeAttribute("data-proximity-lat");
        proximityWrapper.removeAttribute("data-proximity-lng");
        proximityWrapper.removeAttribute("data-proximity-radius");

        const btn = proximityWrapper.querySelector(".gl-filter-panel__proximity-btn");
        if (btn) {
            btn.classList.remove("is-active");
            btn.textContent = btn.getAttribute("data-label-inactive") || "Activer";
        }

        const rangeWrapper = proximityWrapper.querySelector(".gl-filter-panel__proximity-range");
        if (rangeWrapper) {
            rangeWrapper.style.display = "none";
        }

        const instruction = proximityWrapper.querySelector(
            ".gl-filter-panel__proximity-instruction"
        );
        if (instruction) {
            instruction.style.display = "none";
        }

        // Supprimer le cercle, le marqueur et le handler de clic via l'état module-local
        // (les anciens _g.GeoLeaf.UI._proximityMarker/Circle/Map sont morts depuis P3-DEAD-01)
        FilterPanelProximity.resetProximity();
    }

    // Checkboxes du tree-view (catégories & sous-catégories)
    panelEl.querySelectorAll(".gl-filter-tree__checkbox").forEach(function (input: any) {
        input.checked = false;
    });

    // Tags - désélectionner tous les badges
    const tagBadges = panelEl.querySelectorAll(".gl-filter-panel__tag-badge.is-selected");
    tagBadges.forEach(function (badge: any) {
        badge.classList.remove("is-selected");
    });

    // Select classiques
    panelEl.querySelectorAll("select.gl-filter-panel__control--select").forEach(function (
        sel: any
    ) {
        if (sel.multiple) {
            Array.from(sel.options).forEach(function (opt: any) {
                opt.selected = false;
            });
        } else {
            sel.value = "";
        }
    });

    // Slider note
    const ratingInput = panelEl.querySelector(
        "[data-gl-filter-id='minRating'] input[type='range']"
    );
    const ratingLabel = panelEl.querySelector(
        "[data-gl-filter-id='minRating'] .gl-filter-panel__range-value"
    );
    if (ratingInput) {
        const min = ratingInput.min !== "" ? ratingInput.min : "0";
        ratingInput.value = min;
        if (ratingLabel) {
            ratingLabel.textContent = String(min).replace(".", ",");
        }
    }
};

/**
 * Réinitialise uniquement les catégories, sous-catégories, tags et note.
 * Ne touche PAS à la recherche textuelle ni à la proximité.
 * @param {HTMLElement} panelEl - Élément du panneau de filtres
 */
FilterPanelStateReader.resetCategoryTagControls = function (panelEl: any) {
    if (!panelEl) return;

    // Checkboxes tree-view catégories & sous-catégories
    panelEl.querySelectorAll(".gl-filter-tree__checkbox").forEach(function (input: any) {
        input.checked = false;
    });

    // Tags
    panelEl.querySelectorAll(".gl-filter-panel__tag-badge.is-selected").forEach(function (
        badge: any
    ) {
        badge.classList.remove("is-selected");
    });

    // Select classiques
    panelEl.querySelectorAll("select.gl-filter-panel__control--select").forEach(function (
        sel: any
    ) {
        if (sel.multiple) {
            Array.from(sel.options).forEach(function (opt: any) {
                opt.selected = false;
            });
        } else {
            sel.value = "";
        }
    });

    // Slider note
    const ratingInput = panelEl.querySelector(
        "[data-gl-filter-id='minRating'] input[type='range']"
    );
    const ratingLabel = panelEl.querySelector(
        "[data-gl-filter-id='minRating'] .gl-filter-panel__range-value"
    );
    if (ratingInput) {
        const min = ratingInput.min !== "" ? ratingInput.min : "0";
        ratingInput.value = min;
        if (ratingLabel) {
            ratingLabel.textContent = String(min).replace(".", ",");
        }
    }
};

export { FilterPanelStateReader };
