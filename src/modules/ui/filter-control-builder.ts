// @ts-nocheck � migration TS, typage progressif
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI - Filter Control Builder
 * Construit les contrôles de filtres individuels
 *
 * @module ui/filter-control-builder
 */
"use strict";

import { Log } from '../log/index.js';
import { $create } from '../utils/dom-helpers.js';
import { Config } from '../config/geoleaf-config/config-core.js';
import { Security } from '../security/index.js';

    /**
     * Construit un contrôle de filtre individuel
     * @param {Object} filterDef - Définition du filtre
     * @param {Object} profile - Configuration du profil
     * @param {boolean} skipLabel - Sauter la création du label (défaut: false)
     * @returns {HTMLElement|null}
     */
    const _buildFilterControl = function(filterDef, profile, skipLabel) {
        if (!filterDef || !filterDef.id || !filterDef.type) return null;

        const wrapper = $create("div", {
            className: "gl-filter-panel__group",
            attributes: { "data-gl-filter-id": filterDef.id }
        });

        let labelEl = null;
        // Ne pas créer de label si skipLabel est true (pour les accordéons qui ont leur propre titre)
        if (filterDef.label && !skipLabel) {
            labelEl = $create("label", {
                className: "gl-filter-panel__label",
                textContent: filterDef.label
            });
            wrapper.appendChild(labelEl);
        }

        let control = null;

        // 1) SELECT / MULTISELECT classiques
        if (filterDef.type === "select" || filterDef.type === "multiselect") {
            const selectEl = $create("select", {
                className: "gl-filter-panel__control gl-filter-panel__control--select",
                name: filterDef.id,
                id: "gl-filter-" + filterDef.id
            });

            if (labelEl) {
                labelEl.setAttribute("for", selectEl.id);
            }

            if (filterDef.type === "multiselect") {
                selectEl.multiple = true;
            }

            if (filterDef.optionsFrom) {
                // TODO P3-DEAD-01: _populateSelectOptionsFromTaxonomy not implemented
                // Placeholder — taxonomy-based select population is not yet available.
            }

            control = selectEl;
        }

        // 2) SLIDER (range)
        else if (filterDef.type === "range") {
            const container = $create("div", { className: "gl-filter-panel__range-wrapper" });

            const input = $create("input", {
                type: "range",
                className: "gl-filter-panel__control gl-filter-panel__control--range",
                id: "gl-filter-" + filterDef.id,
                name: filterDef.id
            });

            if (labelEl) {
                labelEl.setAttribute("for", input.id);
            }

            if (typeof filterDef.min === "number") input.min = String(filterDef.min);
            if (typeof filterDef.max === "number") input.max = String(filterDef.max);
            if (typeof filterDef.step === "number") input.step = String(filterDef.step);

            const valueLabel = $create("span", { className: "gl-filter-panel__range-value" });

            let initialValue;
            if (typeof filterDef.default === "number") {
                initialValue = filterDef.default;
            } else if (input.min && input.max) {
                const min = parseFloat(input.min);
                const max = parseFloat(input.max);
                initialValue = (min + max) / 2;
            } else {
                initialValue = input.min ? parseFloat(input.min) : 0;
            }

            if (!isNaN(initialValue)) {
                input.value = String(initialValue);
                valueLabel.textContent = initialValue.toString().replace(".", ",");
            }

            input.addEventListener("input", function() {
                const val = parseFloat(input.value);
                if (!isNaN(val)) {
                    valueLabel.textContent = val.toString().replace(".", ",");
                }
            });

            container.appendChild(input);
            container.appendChild(valueLabel);
            control = container;
        }

        // 3) TREE-VIEW catégories / sous-catégories
        else if (filterDef.type === "tree" || filterDef.type === "tree-category" || filterDef.type === "categoryTree") {
            // LAZY LOADING: Retourner un container vide avec marqueur
            const treeContainer = $create("div", {
                className: "gl-filter-panel__tree gl-filter-panel__tree--lazy",
                attributes: {
                    "data-lazy-type": "categories",
                    "data-filter-id": filterDef.id
                }
            });

            control = treeContainer;
        }

        // 4) CHECKBOX GROUP
        else if (filterDef.type === "checkbox-group") {
            const groupContainer = $create("div", { className: "gl-filter-panel__checkbox-group" });

            if (Array.isArray(filterDef.options)) {
                filterDef.options.forEach(function(opt) {
                    const label = $create("label", { className: "gl-filter-panel__checkbox-label" });

                    const checkbox = $create("input", {
                        type: "checkbox",
                        className: "gl-filter-panel__checkbox",
                        name: filterDef.id,
                        value: opt.id,
                        checked: !!opt.checked,
                        attributes: { "data-filter-option-id": opt.id }
                    });

                    const text = $create("span", {
                        className: "gl-filter-panel__checkbox-text",
                        textContent: opt.label || opt.id
                    });

                    label.appendChild(checkbox);
                    label.appendChild(text);
                    groupContainer.appendChild(label);
                });
            }
            control = groupContainer;
        }

        // 5) SEARCH
        else if (filterDef.type === "search") {
            const searchInput = $create("input", {
                type: "text",
                className: "gl-filter-panel__control gl-filter-panel__control--search",
                name: filterDef.id,
                placeholder: filterDef.placeholder || "Filtrer..."
            });

            if (Array.isArray(filterDef.searchFields)) {
                searchInput.setAttribute("data-search-fields", filterDef.searchFields.join(","));
            }

            control = searchInput;
        }

        // 6) PROXIMITY
        else if (filterDef.type === "proximity") {
            const proximityContainer = $create("div", { className: "gl-filter-panel__proximity" });

            if (filterDef.label) {
                const title = $create("h3", {
                    className: "gl-filter-panel__proximity-title",
                    textContent: filterDef.label
                });
                proximityContainer.appendChild(title);
            }

            const button = $create("button", {
                type: "button",
                className: "gl-btn gl-btn--secondary gl-filter-panel__proximity-btn",
                attributes: { "data-filter-proximity-btn": "true" },
                textContent: filterDef.buttonLabel || "Activer"
            });
            proximityContainer.appendChild(button);

            const rangeWrapper = $create("div", {
                className: "gl-filter-panel__proximity-range",
                style: { display: "none" }
            });

            const rangeLabel = $create("label", {
                className: "gl-filter-panel__label",
                textContent: "Rayon (km)",
                attributes: { "for": "gl-filter-proximity-radius" }
            });
            rangeWrapper.appendChild(rangeLabel);

            const rangeContainer = $create("div", { className: "gl-filter-panel__range-wrapper" });

            let minRadius = 1;
            let maxRadius = 50;
            let stepRadius = 1;
            let defaultRadius = 10;
            try {
                const activeProfile = Config?.getActiveProfile?.();
                if (activeProfile) {
                    const searchConfig = (activeProfile.panels && activeProfile.panels.search) || activeProfile.search;
                    if (searchConfig) {
                        if (typeof searchConfig.radiusMin === "number" && searchConfig.radiusMin > 0) {
                            minRadius = searchConfig.radiusMin;
                        }
                        if (typeof searchConfig.radiusMax === "number" && searchConfig.radiusMax > 0) {
                            maxRadius = searchConfig.radiusMax;
                        }
                        if (typeof searchConfig.radiusStep === "number" && searchConfig.radiusStep > 0) {
                            stepRadius = searchConfig.radiusStep;
                        }
                        if (typeof searchConfig.radiusDefault === "number" && searchConfig.radiusDefault > 0) {
                            defaultRadius = searchConfig.radiusDefault;
                        }
                        defaultRadius = Math.max(minRadius, Math.min(defaultRadius, maxRadius));
                    }
                }
            } catch (err) {
                Log?.warn?.("[GeoLeaf.UI] Erreur lecture radius config:", err);
            }

            const rangeInput = $create("input", {
                type: "range",
                className: "gl-filter-panel__control gl-filter-panel__control--range",
                id: "gl-filter-proximity-radius",
                name: filterDef.id + "_radius",
                min: String(minRadius),
                max: String(maxRadius),
                step: String(stepRadius),
                value: String(defaultRadius),
                attributes: { "data-filter-proximity-radius": "true" }
            });

            const rangeValue = $create("span", {
                className: "gl-filter-panel__range-value",
                textContent: String(defaultRadius)
            });

            rangeInput.addEventListener("input", function() {
                rangeValue.textContent = rangeInput.value;
            });

            rangeContainer.appendChild(rangeInput);
            rangeContainer.appendChild(rangeValue);
            rangeWrapper.appendChild(rangeContainer);

            const instruction = $create("p", {
                className: "gl-filter-panel__proximity-instruction",
                textContent: filterDef.instructionText || "Cliquez sur la carte",
                style: { display: "none" }
            });
            rangeWrapper.appendChild(instruction);

            proximityContainer.appendChild(rangeWrapper);
            control = proximityContainer;
        }

        // 7) TAGS
        else if (filterDef.type === "multiselect-tags" || filterDef.id === "tags") {
            const tagsContainer = $create("div", {
                className: "gl-filter-panel__tags-container",
                attributes: {
                    "data-lazy-type": "tags",
                    "data-filter-id": filterDef.id
                }
            });
            control = tagsContainer;
        }

        // Aucun type reconnu
        if (!control) {
            return null;
        }

        if (labelEl && control instanceof HTMLElement && !control.id) {
            const controlId = "gl-filter-" + filterDef.id;
            control.id = controlId;
            labelEl.setAttribute("for", controlId);
        }

        wrapper.appendChild(control);
        return wrapper;
    };

    export { _buildFilterControl };

/**
 * Fonctions globales pour le chargement lazy des filtres
 * Utilisées par le lazy-loader pour construire le contenu à la demande
 */

/**
 * Construit le contenu HTML de l'arbre de catégories
 * @param {Object} scanResult - Résultat du scan ({usedIds: Set, visibleLayerIds: Array})
 * @returns {string} HTML string
 */
export function buildCategoryTreeContent(scanResult) {
    // Récupérer le profil actif via l'API Config (enrichedProfile contient taxonomy)
    const profile = (Config && typeof Config.getActiveProfile === "function")
        ? Config.getActiveProfile()
        : null;
    if (!profile || !profile.taxonomy || !profile.taxonomy.categories) {
        return '<div class="gl-empty-state">Aucune catégorie disponible</div>';
    }

    const categories = profile.taxonomy.categories;
    const usedCategoryIds = scanResult.usedIds;

    // Sécurité : échapper les valeurs dynamiques injectées dans le HTML
    const esc = (Security && typeof Security.escapeHtml === 'function')
        ? function(s) { return Security.escapeHtml(s); }
        : function(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

    // Comparaison insensible à la casse : normaliser les IDs scannés
    const usedLower = new Set();
    usedCategoryIds.forEach(function(id) { usedLower.add(id.toLowerCase()); });

    // Filtrer les catégories pour afficher celles utilisées (comparaison case-insensitive)
    const catIds = Object.keys(categories).filter(catId => usedLower.has(catId.toLowerCase()));

    if (catIds.length === 0) {
        return '<div class="gl-empty-state">ND - Non disponible</div>';
    }

    let html = '<ul class="gl-filter-tree gl-filter-tree--root">';

    catIds.forEach(function(catId) {
        const cat = categories[catId] || {};

        // Filtrer aussi les sous-catégories (comparaison case-insensitive)
        const subs = cat.subcategories || {};
        const subKeys = Object.keys(subs).filter(subId => usedLower.has(subId.toLowerCase()));
        const hasSubcategories = subKeys.length > 0;

        html += '<li class="gl-filter-tree__item gl-filter-tree__item--category">';
        html += '<div class="gl-filter-tree__row">';

        if (hasSubcategories) {
            html += '<span class="gl-filter-tree__arrow" data-category-id="' + esc(catId) + '">▶</span>';
        } else {
            html += '<span class="gl-filter-tree__spacer"></span>';
        }

        html += '<label class="gl-filter-tree__label gl-filter-tree__label--category">';
        html += '<input type="checkbox" class="gl-filter-tree__checkbox gl-filter-tree__checkbox--category" ';
        html += 'name="categories_category" value="' + esc(catId) + '" ';
        html += 'data-gl-filter-category-id="' + esc(catId) + '">';
        html += '<span class="gl-filter-tree__text">' + esc(cat.label || catId) + '</span>';
        html += '</label>';
        html += '</div>';

        if (hasSubcategories) {
            html += '<ul class="gl-filter-tree gl-filter-tree--subcategories">';

            subKeys.forEach(function(subId) {
                const sub = subs[subId] || {};
                html += '<li class="gl-filter-tree__item gl-filter-tree__item--subcategory">';
                html += '<label class="gl-filter-tree__label gl-filter-tree__label--subcategory">';
                html += '<input type="checkbox" class="gl-filter-tree__checkbox gl-filter-tree__checkbox--subcategory" ';
                html += 'name="categories_subcategory" value="' + esc(subId) + '" ';
                html += 'data-gl-filter-category-id="' + esc(catId) + '" ';
                html += 'data-gl-filter-subcategory-id="' + esc(subId) + '">';
                html += '<span class="gl-filter-tree__text">' + esc(sub.label || subId) + '</span>';
                html += '</label>';
                html += '</li>';
            });

            html += '</ul>';
        }

        html += '</li>';
    });

    html += '</ul>';
    return html;
}

/**
 * Construit le contenu HTML de la liste de tags
 * @param {Array} tags - Array de tags uniques triés
 * @returns {string} HTML string
 */
export function buildTagsListContent(tags) {
    if (!tags || tags.length === 0) {
        return '<div class="gl-empty-state">ND - Non disponible</div>';
    }

    // Sécurité : échapper les valeurs dynamiques
    const esc = (Security && typeof Security.escapeHtml === 'function')
        ? function(s) { return Security.escapeHtml(s); }
        : function(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

    let html = '';
    tags.forEach(function(tag) {
        html += '<span class="gl-filter-panel__tag-badge" data-tag-value="' + esc(tag) + '">' + esc(tag) + '</span>';
    });

    return html;
}

/**
 * Attache les event listeners pour l'arbre de catégories après rendering
 * Perf 6.2.2: Délégation d'événements — 3 listeners sur le container au lieu de N listeners individuels
 * @param {HTMLElement} container - Container de l'arbre
 */
export function attachCategoryTreeListeners(container) {
    // Délégation: 1 seul listener 'click' pour toutes les flèches
    container.addEventListener('click', function(e) {
        const arrow = e.target.closest('.gl-filter-tree__arrow');
        if (!arrow) return;
        e.stopPropagation();
        const li = arrow.closest('.gl-filter-tree__item--category');
        if (!li) return;
        const subList = li.querySelector('.gl-filter-tree--subcategories');
        if (subList) {
            const isExpanded = li.classList.contains('is-expanded');
            if (isExpanded) {
                li.classList.remove('is-expanded');
                arrow.textContent = '▶';
            } else {
                li.classList.add('is-expanded');
                arrow.textContent = '▼';
            }
        }
    });

    // Délégation: 1 seul listener 'change' pour toutes les checkboxes (catégories + sous-catégories)
    container.addEventListener('change', function(e) {
        const target = e.target;
        if (!target.matches('.gl-filter-tree__checkbox')) return;

        if (target.classList.contains('gl-filter-tree__checkbox--category')) {
            // Checkbox catégorie cochée → propager aux sous-catégories
            const li = target.closest('.gl-filter-tree__item--category');
            if (!li) return;
            const subCheckboxes = li.querySelectorAll('.gl-filter-tree__checkbox--subcategory');
            subCheckboxes.forEach(function(subCb) {
                subCb.checked = target.checked;
            });
            target.indeterminate = false;
        } else if (target.classList.contains('gl-filter-tree__checkbox--subcategory')) {
            // Checkbox sous-catégorie cochée → mettre à jour l'état parent
            const liCat = target.closest('.gl-filter-tree__item--category');
            if (!liCat) return;
            const categoryCheckbox = liCat.querySelector('.gl-filter-tree__checkbox--category');
            const subCheckboxes = liCat.querySelectorAll('.gl-filter-tree__checkbox--subcategory');

            const checkedCount = Array.from(subCheckboxes).filter(cb => cb.checked).length;
            const totalCount = subCheckboxes.length;

            if (checkedCount === 0) {
                categoryCheckbox.checked = false;
                categoryCheckbox.indeterminate = false;
            } else if (checkedCount === totalCount) {
                categoryCheckbox.checked = true;
                categoryCheckbox.indeterminate = false;
            } else {
                categoryCheckbox.checked = false;
                categoryCheckbox.indeterminate = true;
            }
        }
    });
}

/**
 * Attache les event listeners pour les tags après rendering
 * Perf 6.2.2: Délégation d'événements — 1 listener sur le container au lieu de N badges
 * @param {HTMLElement} container - Container des tags
 */
export function attachTagsListeners(container) {
    container.addEventListener('click', function(e) {
        const badge = e.target.closest('.gl-filter-panel__tag-badge');
        if (badge) {
            badge.classList.toggle('is-selected');
        }
    });
}
