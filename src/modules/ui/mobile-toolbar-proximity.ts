/* eslint-disable security/detect-object-injection */
/**







 * GeoLeaf UI – Mobile toolbar: proximity configuration bar.







 * @module ui/mobile-toolbar-proximity







 */

import { Config } from "../config/geoleaf-config/config-core.js";

import { domState, _g } from "./mobile-toolbar-state.js";

import { createSvgIcon, refreshFilterButtonState } from "./mobile-toolbar-pill.js";
import { getLabel } from "../i18n/i18n.js";

function _applyRadiusConfig(
    searchConfig: any,
    out: { min: number; max: number; step: number; def: number }
): void {
    const props: Array<[keyof typeof out, string]> = [
        ["min", "radiusMin"],
        ["max", "radiusMax"],
        ["step", "radiusStep"],
        ["def", "radiusDefault"],
    ];

    for (const [k, prop] of props) {
        if (typeof searchConfig[prop] === "number" && searchConfig[prop] > 0)
            out[k] = searchConfig[prop];
    }

    out.def = Math.max(out.min, Math.min(out.def, out.max));
}

function _readProximityRadius(): { min: number; max: number; step: number; def: number } {
    const out = { min: 1, max: 50, step: 1, def: 10 };

    try {
        const activeProfile = (Config as any)?.getActiveProfile?.();

        if (activeProfile) {
            const searchConfig =
                (activeProfile.panels && activeProfile.panels.search) || activeProfile.search;

            if (searchConfig) _applyRadiusConfig(searchConfig, out);
        }
    } catch (_e) {
        /* fallback to defaults */
    }

    return out;
}

function _runFilterApplier(filterEl: HTMLElement | null): void {
    const applier = (_g.GeoLeaf as any)?._UIFilterPanelApplier;

    if (applier && typeof applier.applyFiltersNow === "function") {
        applier.applyFiltersNow(filterEl);
    }
}

function _createProximitySlider(
    min: number,
    max: number,
    step: number,
    def: number
): HTMLInputElement {
    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "gl-proximity-bar__slider";
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.defaultValue = String(def);
    slider.setAttribute("aria-label", getLabel("aria.proximity.slider"));
    domState.proximitySlider = slider;
    return slider;
}

/** Creates the proximity configuration pill (slider + validate/cancel). */

export function createProximityBarDom(): HTMLElement {
    const bar = document.createElement("div");

    bar.className = "gl-proximity-bar";

    bar.style.display = "none";

    bar.setAttribute("role", "region");

    bar.setAttribute("aria-label", getLabel("aria.proximity.region"));

    const instruction = document.createElement("span");

    instruction.className = "gl-proximity-bar__instruction";

    instruction.textContent = getLabel("ui.proximity.instruction_initial");

    domState.proximityInstruction = instruction;

    bar.appendChild(instruction);

    const {
        min: _minRadius,
        max: _maxRadius,
        step: _stepRadius,
        def: _defaultRadius,
    } = _readProximityRadius();

    const slider = _createProximitySlider(_minRadius, _maxRadius, _stepRadius, _defaultRadius);

    bar.appendChild(slider);

    const radiusLabel = document.createElement("span");

    radiusLabel.className = "gl-proximity-bar__radius-label";

    radiusLabel.textContent = `${_defaultRadius} km`;

    domState.proximityRadiusLabel = radiusLabel;

    bar.appendChild(radiusLabel);

    const validateBtn = document.createElement("button");

    validateBtn.type = "button";

    validateBtn.className = "gl-proximity-bar__validate";

    validateBtn.setAttribute("aria-label", getLabel("aria.proximity.validate"));

    validateBtn.disabled = true;

    validateBtn.appendChild(createSvgIcon("M9 10l-4 4 4 4M5 14h8a4 4 0 000-8H9", 20));

    validateBtn.addEventListener("click", () => closeProximityBar(false));

    domState.proximityValidateBtn = validateBtn;

    bar.appendChild(validateBtn);

    const cancelBtn = document.createElement("button");

    cancelBtn.type = "button";

    cancelBtn.className = "gl-proximity-bar__cancel";

    cancelBtn.setAttribute("aria-label", getLabel("aria.proximity.cancel"));

    cancelBtn.appendChild(createSvgIcon("M18 6L6 18M6 6l12 12", 18));

    cancelBtn.addEventListener("click", () => closeProximityBar(true));

    bar.appendChild(cancelBtn);

    slider.addEventListener("input", () => {
        const km = parseInt(slider.value, 10);

        if (domState.proximityRadiusLabel) domState.proximityRadiusLabel.textContent = `${km} km`;

        const prox = (_g.GeoLeaf as any)?._UIFilterPanelProximity;

        if (prox?.setProximityRadius) prox.setProximityRadius(km);
    });

    domState.proximityBar = bar;

    return bar;
}

/** Shows the proximity pill with fade+scale animation. */

export function openProximityBar(): void {
    if (!domState.proximityBar) return;

    if (domState.proximityValidateBtn) domState.proximityValidateBtn.disabled = true;

    if (domState.proximityInstruction) {
        domState.proximityInstruction.textContent = getLabel("ui.proximity.instruction_initial");

        domState.proximityInstruction.classList.remove("point-placed");
    }

    if (domState.proximitySlider)
        domState.proximitySlider.value = domState.proximitySlider.defaultValue;

    if (domState.proximityRadiusLabel)
        domState.proximityRadiusLabel.textContent = `${domState.proximitySlider?.defaultValue ?? 10} km`;

    domState.proximityBar.style.display = "flex";

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (domState.proximityBar) domState.proximityBar.classList.add("is-visible");

            const glMain = domState.options?.glMain;

            if (glMain) {
                glMain.style.setProperty("--gl-proximity-bar-height", "46px");

                glMain.style.setProperty("--gl-proximity-bar-gap", "0.4rem");
            }
        });
    });
}

/**







 * Closes the proximity pill.







 * @param cancel true = cancel (deactivates mode), false = validate (keeps mode active).







 */

export function closeProximityBar(cancel: boolean): void {
    if (!domState.proximityBar) return;

    domState.proximityBar.classList.remove("is-visible");

    const glMain = domState.options?.glMain;

    if (glMain) {
        glMain.style.removeProperty("--gl-proximity-bar-height");

        glMain.style.removeProperty("--gl-proximity-bar-gap");
    }

    domState.proximityBar.addEventListener(
        "transitionend",

        () => {
            if (domState.proximityBar && !domState.proximityBar.classList.contains("is-visible")) {
                domState.proximityBar.style.display = "";
            }
        },

        { once: true }
    );

    if (cancel) {
        const prox = (_g.GeoLeaf as any)?._UIFilterPanelProximity;

        const map = domState.options?.map as any;

        if (prox?.toggleProximityToolbar && map && domState.proximityActive) {
            prox.toggleProximityToolbar(map, 10);
        }

        domState.proximityActive = false;

        const proximityBtn = domState.toolbar?.querySelector('[data-gl-sheet="proximity"]');

        if (proximityBtn instanceof HTMLElement)
            proximityBtn.classList.remove("gl-map-toolbar__btn--active");

        _runFilterApplier(document.querySelector<HTMLElement>("#gl-filter-panel"));

        refreshFilterButtonState();
    } else {
        _runFilterApplier(document.querySelector<HTMLElement>("#gl-filter-panel"));

        refreshFilterButtonState();
    }
}
