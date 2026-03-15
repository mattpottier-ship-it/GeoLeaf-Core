/* eslint-disable security/detect-object-injection */
// @ts-nocheck — migration TS, typage progressif
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */
import { Config } from "../config/geoleaf-config/config-core.js";
import { Log } from "../log/index.js";
import { $create } from "../utils/dom-helpers.js";
import { Security } from "../security/index.js";
import { _UIDomUtils } from "./dom-utils.js";

function _numCfg(val, def) {
    return typeof val === "number" && val > 0 ? val : def;
}

function _resolveProximityRadius() {
    let minRadius = 1,
        maxRadius = 50,
        stepRadius = 1,
        defaultRadius = 10;
    try {
        const activeProfile = Config?.getActiveProfile?.();
        const searchConfig = activeProfile
            ? (activeProfile.panels && activeProfile.panels.search) || activeProfile.search
            : null;
        if (searchConfig) {
            minRadius = _numCfg(searchConfig.radiusMin, 1);
            maxRadius = _numCfg(searchConfig.radiusMax, 50);
            stepRadius = _numCfg(searchConfig.radiusStep, 1);
            defaultRadius = Math.max(
                minRadius,
                Math.min(_numCfg(searchConfig.radiusDefault, 10), maxRadius)
            );
        }
    } catch (err) {
        Log?.warn?.("[GeoLeaf.UI] Erreur lecture radius config:", err);
    }
    return { minRadius, maxRadius, stepRadius, defaultRadius };
}

function _buildSelectControl(filterDef, labelEl) {
    const selectEl = $create("select", {
        className: "gl-filter-panel__control gl-filter-panel__control--select",
        name: filterDef.id,
        id: "gl-filter-" + filterDef.id,
    });
    if (labelEl) labelEl.setAttribute("for", selectEl.id);
    if (filterDef.type === "multiselect") selectEl.multiple = true;
    if (filterDef.optionsFrom) {
        const profile = _UIDomUtils.getActiveProfileConfig();
        _UIDomUtils.populateSelectOptionsFromTaxonomy(selectEl, profile, filterDef.optionsFrom);
    }
    return selectEl;
}

function _buildRangeControl(filterDef, labelEl) {
    const container = $create("div", { className: "gl-filter-panel__range-wrapper" });
    const input = $create("input", {
        type: "range",
        className: "gl-filter-panel__control gl-filter-panel__control--range",
        id: "gl-filter-" + filterDef.id,
        name: filterDef.id,
    });
    if (labelEl) labelEl.setAttribute("for", input.id);
    if (typeof filterDef.min === "number") input.min = String(filterDef.min);
    if (typeof filterDef.max === "number") input.max = String(filterDef.max);
    if (typeof filterDef.step === "number") input.step = String(filterDef.step);
    const valueLabel = $create("span", { className: "gl-filter-panel__range-value" });
    let initialValue;
    if (typeof filterDef.default === "number") {
        initialValue = filterDef.default;
    } else if (input.min && input.max) {
        initialValue = (parseFloat(input.min) + parseFloat(input.max)) / 2;
    } else {
        initialValue = input.min ? parseFloat(input.min) : 0;
    }
    if (!isNaN(initialValue)) {
        input.value = String(initialValue);
        valueLabel.textContent = initialValue.toString().replace(".", ",");
    }
    input.addEventListener("input", function () {
        const val = parseFloat(input.value);
        if (!isNaN(val)) valueLabel.textContent = val.toString().replace(".", ",");
    });
    container.appendChild(input);
    container.appendChild(valueLabel);
    return container;
}

function _buildTreeControl(filterDef) {
    return $create("div", {
        className: "gl-filter-panel__tree gl-filter-panel__tree--lazy",
        attributes: { "data-lazy-type": "categories", "data-filter-id": filterDef.id },
    });
}

function _buildCheckboxGroupControl(filterDef) {
    const groupContainer = $create("div", { className: "gl-filter-panel__checkbox-group" });
    if (Array.isArray(filterDef.options)) {
        filterDef.options.forEach(function (opt) {
            const label = $create("label", { className: "gl-filter-panel__checkbox-label" });
            const checkbox = $create("input", {
                type: "checkbox",
                className: "gl-filter-panel__checkbox",
                name: filterDef.id,
                value: opt.id,
                checked: !!opt.checked,
                attributes: { "data-filter-option-id": opt.id },
            });
            const text = $create("span", {
                className: "gl-filter-panel__checkbox-text",
                textContent: opt.label || opt.id,
            });
            label.appendChild(checkbox);
            label.appendChild(text);
            groupContainer.appendChild(label);
        });
    }
    return groupContainer;
}

function _buildSearchControl(filterDef, _labelEl, wrapper) {
    const searchInput = $create("input", {
        type: "text",
        className: "gl-filter-panel__control gl-filter-panel__control--search",
        name: filterDef.id,
        placeholder: filterDef.placeholder || "Filtrer...",
    });
    if (Array.isArray(filterDef.searchFields)) {
        searchInput.setAttribute("data-search-fields", filterDef.searchFields.join(","));
    }
    wrapper.classList.add("gl-filter-group--search");
    return searchInput;
}

function _createProximityRangeSection(filterDef) {
    const rangeWrapper = $create("div", {
        className: "gl-filter-panel__proximity-range",
        style: { display: "none" },
    });
    rangeWrapper.appendChild(
        $create("label", {
            className: "gl-filter-panel__label",
            textContent: "Rayon (km)",
            attributes: { for: "gl-filter-proximity-radius" },
        })
    );
    const rangeContainer = $create("div", { className: "gl-filter-panel__range-wrapper" });
    const { minRadius, maxRadius, stepRadius, defaultRadius } = _resolveProximityRadius();
    const rangeInput = $create("input", {
        type: "range",
        className: "gl-filter-panel__control gl-filter-panel__control--range",
        id: "gl-filter-proximity-radius",
        name: filterDef.id + "_radius",
        min: String(minRadius),
        max: String(maxRadius),
        step: String(stepRadius),
        value: String(defaultRadius),
        attributes: {
            "data-filter-proximity-radius": "true",
            "data-proximity-radius-default": String(defaultRadius),
        },
    });
    const rangeValue = $create("span", {
        className: "gl-filter-panel__range-value",
        textContent: String(defaultRadius),
    });
    rangeInput.addEventListener("input", function () {
        rangeValue.textContent = rangeInput.value;
    });
    rangeContainer.appendChild(rangeInput);
    rangeContainer.appendChild(rangeValue);
    rangeWrapper.appendChild(rangeContainer);
    rangeWrapper.appendChild(
        $create("p", {
            className: "gl-filter-panel__proximity-instruction",
            textContent: filterDef.instructionText || "Cliquez sur la carte",
            style: { display: "none" },
        })
    );
    return rangeWrapper;
}

function _buildProximityControl(filterDef) {
    const proximityContainer = $create("div", { className: "gl-filter-panel__proximity" });
    if (filterDef.label) {
        proximityContainer.appendChild(
            $create("h3", {
                className: "gl-filter-panel__proximity-title",
                textContent: filterDef.label,
            })
        );
    }
    const button = $create("button", {
        type: "button",
        className: "gl-btn gl-btn--secondary gl-filter-panel__proximity-btn",
        attributes: { "data-filter-proximity-btn": "true" },
        textContent: filterDef.buttonLabel || "Activer",
    });
    proximityContainer.appendChild(button);
    proximityContainer.appendChild(_createProximityRangeSection(filterDef));
    return proximityContainer;
}

function _buildTagsControl(filterDef) {
    return $create("div", {
        className: "gl-filter-panel__tags-container",
        attributes: { "data-lazy-type": "tags", "data-filter-id": filterDef.id },
    });
}

const _FILTER_BUILDERS: Record<string, (def: any, lab: any, wr: any) => any> = {
    select: _buildSelectControl,
    multiselect: _buildSelectControl,
    range: _buildRangeControl,
    tree: _buildTreeControl,
    "tree-category": _buildTreeControl,
    categoryTree: _buildTreeControl,
    "checkbox-group": _buildCheckboxGroupControl,
    search: _buildSearchControl,
    proximity: _buildProximityControl,
    "multiselect-tags": _buildTagsControl,
};

function _dispatchFilterControl(filterDef, labelEl, wrapper) {
    const builderFn = _FILTER_BUILDERS[filterDef.type];
    if (builderFn) return builderFn(filterDef, labelEl, wrapper);
    if (filterDef.id === "tags") return _buildTagsControl(filterDef);
    return null;
}

/**
 * Builds a controle de filters individuel
 * @param {Object} filterDef - Definition du filters
 * @param {Object} profile - Configuration of the profile
 * @param {boolean} skipLabel - Sauter la creation du label (defaut: false)
 * @returns {HTMLElement|null}
 */
const _buildFilterControl = function (filterDef, profile, skipLabel) {
    const fid = filterDef?.id;
    const ftype = filterDef?.type;
    if (!fid || !ftype) return null;
    const wrapper = $create("div", {
        className: "gl-filter-panel__group",
        attributes: { "data-gl-filter-id": fid },
    });
    let labelEl = null;
    if (filterDef.label && !skipLabel) {
        labelEl = $create("label", {
            className: "gl-filter-panel__label",
            textContent: filterDef.label,
        });
        wrapper.appendChild(labelEl);
    }
    const control = _dispatchFilterControl(filterDef, labelEl, wrapper);
    if (!control) return null;
    if (labelEl && control instanceof HTMLElement && !control.id) {
        const controlId = "gl-filter-" + fid;
        control.id = controlId;
        labelEl.setAttribute("for", controlId);
    }
    wrapper.appendChild(control);
    return wrapper;
};

export { _buildFilterControl };

/**
 * Fonctions globales for the loading lazy des filtres
 * Used by the lazy-loader to build content on demand
 */

/**
 * Builds the contenu HTML of the tree de categories
 * @param {Object} scanResult - Result du scan ({usedIds: Set, visibleLayerIds: Array})
 * @returns {string} HTML string
 */
function _buildCategoryItemHtml(catId, cat, subKeys, esc) {
    let html = '<li class="gl-filter-tree__item gl-filter-tree__item--category">';
    html += '<div class="gl-filter-tree__row">';
    if (subKeys.length > 0) {
        html +=
            '<span class="gl-filter-tree__arrow" data-category-id="' + esc(catId) + '">▶</span>';
    } else {
        html += '<span class="gl-filter-tree__spacer"></span>';
    }
    html += '<label class="gl-filter-tree__label gl-filter-tree__label--category">';
    html +=
        '<input type="checkbox" class="gl-filter-tree__checkbox gl-filter-tree__checkbox--category" ';
    html += 'name="categories_category" value="' + esc(catId) + '" ';
    html += 'data-gl-filter-category-id="' + esc(catId) + '">';
    html += '<span class="gl-filter-tree__text">' + esc(cat.label || catId) + "</span>";
    html += "</label>";
    html += "</div>";
    if (subKeys.length > 0) {
        const subs = cat.subcategories || {};
        html += '<ul class="gl-filter-tree gl-filter-tree--subcategories">';
        subKeys.forEach(function (subId) {
            const sub = subs[subId] || {};
            html += '<li class="gl-filter-tree__item gl-filter-tree__item--subcategory">';
            html += '<label class="gl-filter-tree__label gl-filter-tree__label--subcategory">';
            html +=
                '<input type="checkbox" class="gl-filter-tree__checkbox gl-filter-tree__checkbox--subcategory" ';
            html += 'name="categories_subcategory" value="' + esc(subId) + '" ';
            html += 'data-gl-filter-category-id="' + esc(catId) + '" ';
            html += 'data-gl-filter-subcategory-id="' + esc(subId) + '">';
            html += '<span class="gl-filter-tree__text">' + esc(sub.label || subId) + "</span>";
            html += "</label>";
            html += "</li>";
        });
        html += "</ul>";
    }
    html += "</li>";
    return html;
}

export function buildCategoryTreeContent(scanResult) {
    // Retrieve the profile active via l'API Config (enrichedProfile contient taxonomy)
    const profile =
        Config && typeof Config.getActiveProfile === "function" ? Config.getActiveProfile() : null;
    if (!profile || !profile.taxonomy || !profile.taxonomy.categories) {
        return '<div class="gl-empty-state">Aucune category disponible</div>';
    }

    const categories = profile.taxonomy.categories;
    const usedCategoryIds = scanResult.usedIds;

    // Security: escape dynamic values injected in HTML
    const esc =
        Security && typeof Security.escapeHtml === "function"
            ? function (s) {
                  return Security.escapeHtml(s);
              }
            : function (s) {
                  return String(s || "")
                      .replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")
                      .replace(/"/g, "&quot;");
              };

    // Case-insensitive comparison: normalize scanned IDs
    const usedLower = new Set();
    usedCategoryIds.forEach(function (id) {
        usedLower.add(id.toLowerCase());
    });

    // Filtrer les categories pour display celles used (comparaison casee-insensitive)
    const catIds = Object.keys(categories).filter((catId) => usedLower.has(catId.toLowerCase()));

    if (catIds.length === 0) {
        return '<div class="gl-empty-state">ND - Non disponible</div>';
    }

    let html = '<ul class="gl-filter-tree gl-filter-tree--root">';

    catIds.forEach(function (catId) {
        const cat = categories[catId] || {};
        const subs = cat.subcategories || {};
        const subKeys = Object.keys(subs).filter((subId) => usedLower.has(subId.toLowerCase()));
        html += _buildCategoryItemHtml(catId, cat, subKeys, esc);
    });

    html += "</ul>";
    return html;
}

/**
 * Builds the contenu HTML de the list de tags
 * @param {Array} tags - Array de tags uniques sorted
 * @returns {string} HTML string
 */
export function buildTagsListContent(tags) {
    if (!tags || tags.length === 0) {
        return '<div class="gl-empty-state">ND - Non disponible</div>';
    }

    // Security: escape dynamic values
    const esc =
        Security && typeof Security.escapeHtml === "function"
            ? function (s) {
                  return Security.escapeHtml(s);
              }
            : function (s) {
                  return String(s || "")
                      .replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")
                      .replace(/"/g, "&quot;");
              };

    let html = "";
    tags.forEach(function (tag) {
        html +=
            '<span class="gl-filter-panel__tag-badge" data-tag-value="' +
            esc(tag) +
            '">' +
            esc(tag) +
            "</span>";
    });

    return html;
}

/**
 * Attache les event listners pour l'tree de categories after rendering
 * Perf 6.2.2: Delegation d'events — 3 listners sur le container au lieu de N listners individuels
 * @param {HTMLElement} container - Container of the tree
 */
export function attachCategoryTreeListeners(container) {
    // Delegation: 1 seul listner 'clickk' pour toutes les arrows
    container.addEventListener("click", function (e) {
        const arrow = e.target.closest(".gl-filter-tree__arrow");
        if (!arrow) return;
        e.stopPropagation();
        const li = arrow.closest(".gl-filter-tree__item--category");
        if (!li) return;
        const subList = li.querySelector(".gl-filter-tree--subcategories");
        if (subList) {
            const isExpanded = li.classList.contains("is-expanded");
            if (isExpanded) {
                li.classList.remove("is-expanded");
                arrow.textContent = "▶";
            } else {
                li.classList.add("is-expanded");
                arrow.textContent = "▼";
            }
        }
    });

    // Delegation: 1 seul listner 'change' pour toutes les checkboxes (categories + sous-categories)
    container.addEventListener("change", function (e) {
        const target = e.target;
        if (!target.matches(".gl-filter-tree__checkbox")) return;

        if (target.classList.contains("gl-filter-tree__checkbox--category")) {
            // Category checkbox checked → propagate to sub-categories
            const li = target.closest(".gl-filter-tree__item--category");
            if (!li) return;
            const subCheckboxes = li.querySelectorAll(".gl-filter-tree__checkbox--subcategory");
            subCheckboxes.forEach(function (subCb) {
                subCb.checked = target.checked;
            });
            target.indeterminate = false;
        } else if (target.classList.contains("gl-filter-tree__checkbox--subcategory")) {
            // Sub-category checkbox checked → update parent state
            const liCat = target.closest(".gl-filter-tree__item--category");
            if (!liCat) return;
            const categoryCheckbox = liCat.querySelector(".gl-filter-tree__checkbox--category");
            const subCheckboxes = liCat.querySelectorAll(".gl-filter-tree__checkbox--subcategory");

            const checkedCount = Array.from(subCheckboxes).filter((cb) => cb.checked).length;
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
 * Attache les event listners for thes tags after rendering
 * Perf 6.2.2: Delegation d'events — 1 listner sur le container au lieu de N badges
 * @param {HTMLElement} container - Container des tags
 */
export function attachTagsListeners(container) {
    container.addEventListener("click", function (e) {
        const badge = e.target.closest(".gl-filter-panel__tag-badge");
        if (badge) {
            badge.classList.toggle("is-selected");
        }
    });
}
