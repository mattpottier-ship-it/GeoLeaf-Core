/**
 * Module Legend Control
 * Contrôle Leaflet pour afficher une légende cartographique
 *
 * DÉPENDANCES:
 * - Leaflet (L.Control, L.DomUtil, L.DomEvent)
 * - GeoLeaf.Log (optionnel)
 * - GeoLeaf._LegendRenderer
 *
 * EXPOSE:
 * - GeoLeaf._LegendControl
 */

import { Log } from "../log/index.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { POIMarkers } from "../poi/markers.js";
import { LegendRenderer } from "./legend-renderer.js";
import type { LegendSection, LegendFooter } from "./legend-renderer.js";

const L = typeof globalThis !== "undefined" ? (globalThis as unknown as { L?: LeafletGlobal }).L : undefined;

interface LeafletGlobal {
    Control: { extend: (props: Record<string, unknown>) => new (opts: unknown) => unknown };
    DomUtil: { create: (tag: string, cls: string, parent?: HTMLElement) => HTMLElement };
    DomEvent: {
        on: (el: HTMLElement, ev: string, fn: (ev: Event) => void) => void;
        stopPropagation: (ev: Event) => void;
        disableClickPropagation: (el: HTMLElement) => void;
        disableScrollPropagation: (el: HTMLElement) => void;
    };
    setOptions: (obj: unknown, opts: unknown) => void;
}

let _alreadyLogged = false;
let _spriteDetected = false;

/**
 * S'assure que le sprite SVG des icônes est chargé avec vérification robuste
 */
async function ensureSpriteLoaded(callback?: (loaded: boolean) => void): Promise<void> {
    if (POIMarkers && typeof POIMarkers.ensureProfileSpriteInjectedSync === "function") {
        if (!_alreadyLogged) {
            if (Log) Log.debug("[Legend] Chargement du sprite SVG pour les icônes...");
            _alreadyLogged = true;
        }

        await POIMarkers.ensureProfileSpriteInjectedSync();

        const spriteEl = document.querySelector('svg[data-geoleaf-sprite="profile"]');
        if (spriteEl) {
            if (!_spriteDetected) {
                if (Log) Log.info("[Legend] Sprite SVG détecté et prêt pour utilisation");
                _spriteDetected = true;
            }
            if (typeof callback === "function") callback(true);
            return;
        }

        new Promise<boolean>((resolve) => {
            const observer = new MutationObserver((_mutations, obs) => {
                const el = document.querySelector('svg[data-geoleaf-sprite="profile"]');
                if (el) {
                    obs.disconnect();
                    clearTimeout(timerId);
                    if (!_spriteDetected) {
                        if (Log) Log.info("[Legend] Sprite SVG détecté via MutationObserver");
                        _spriteDetected = true;
                    }
                    resolve(true);
                }
            });
            observer.observe(document.documentElement || document.body, {
                childList: true,
                subtree: true,
            });

            const timerId = setTimeout(() => {
                observer.disconnect();
                if (Log) Log.warn("[Legend] Sprite SVG non trouvé après 2s");
                resolve(false);
            }, 2000);
        }).then((found) => {
            if (typeof callback === "function") callback(found);
        });
    } else {
        if (Log)
            Log.debug(
                "[Legend] GeoLeaf._POIMarkers.ensureProfileSpriteInjectedSync non disponible"
            );
        if (typeof callback === "function") callback(false);
    }
}

export interface LegendControlOptions {
    position?: string;
    title?: string;
    collapsible?: boolean;
    collapsed?: boolean;
    sections?: LegendSection[];
    footer?: LegendFooter;
}

export interface LegendAccordionEntry {
    layerId: string;
    label: string;
    collapsed?: boolean;
    order?: number;
    visible?: boolean;
    sections?: LegendSection[];
}

interface LegendControlInstance {
    _map: unknown;
    _container: HTMLElement | null;
    _bodyEl: HTMLElement;
    _glOptions: LegendControlOptions;
    _buildStructure(): void;
    _renderContent(): void;
    _toggleCollapsed(): void;
    updateMultiLayerContent(legendsArray: LegendAccordionEntry[]): void;
    updateContent(legendData: { title?: string; sections?: LegendSection[]; footer?: LegendFooter }): void;
    show(): void;
    hide(): void;
}

/**
 * Crée un contrôle Leaflet pour la légende cartographique
 */
function createLegendControl(options: LegendControlOptions): unknown {
    if (!L || !L.Control) {
        if (Log) Log.error("[Legend] Leaflet L.Control non disponible");
        return null;
    }

    const LegendControlClass = L.Control.extend({
        options: {
            position: options.position || "bottomleft",
        },

        initialize(this: LegendControlInstance, controlOptions: { _glOptions?: LegendControlOptions }) {
            L!.setOptions(this, controlOptions || {});
            this._glOptions = controlOptions?._glOptions ?? options;
        },

        onAdd(this: LegendControlInstance, mapInstance: unknown) {
            this._map = mapInstance;
            this._container = L!.DomUtil.create("div", "gl-map-legend") as HTMLElement;

            if (L!.DomEvent) {
                L!.DomEvent.disableClickPropagation(this._container);
                L!.DomEvent.disableScrollPropagation(this._container);
            }

            this._buildStructure();
            return this._container;
        },

        onRemove(this: LegendControlInstance) {
            this._map = null;
            this._container = null;
        },

        _buildStructure(this: LegendControlInstance) {
            const opts = this._glOptions;

            const wrapper = L!.DomUtil.create("div", "gl-map-legend__wrapper", this._container!);

            if (opts.title) {
                const header = L!.DomUtil.create("div", "gl-map-legend__header", wrapper);

                const titleEl = L!.DomUtil.create("h2", "gl-map-legend__title", header);
                titleEl.textContent = opts.title ?? "";

                if (opts.collapsible) {
                    const toggleEl = L!.DomUtil.create("button", "gl-map-legend__toggle", header) as HTMLButtonElement;
                    toggleEl.type = "button";
                    toggleEl.setAttribute("aria-label", "Basculer la légende");
                    toggleEl.textContent = "⟱";

                    const self = this;
                    L!.DomEvent.on(toggleEl, "click", function (ev) {
                        L!.DomEvent.stopPropagation(ev);
                        self._toggleCollapsed();
                    });
                }
            }

            this._bodyEl = L!.DomUtil.create("div", "gl-map-legend__body", wrapper);

            if (opts.collapsed) {
                this._container!.classList.add("gl-map-legend--collapsed");
            }

            this._renderContent();
        },

        _renderContent(this: LegendControlInstance) {
            if (!this._bodyEl) return;
            const opts = this._glOptions;

            DOMSecurity.clearElementFast(this._bodyEl);

            if (!LegendRenderer) {
                if (Log) Log.error("[Legend] LegendRenderer non disponible");
                return;
            }

            ensureSpriteLoaded();

            if (Array.isArray(opts.sections)) {
                opts.sections.forEach((section) => {
                    LegendRenderer.renderSection(this._bodyEl, section);
                });
            }

            if (opts.footer) {
                LegendRenderer.renderFooter(this._bodyEl, opts.footer);
            }
        },

        updateMultiLayerContent(this: LegendControlInstance, legendsArray: LegendAccordionEntry[]) {
            if (!this._bodyEl) return;

            DOMSecurity.clearElementFast(this._bodyEl);

            if (!LegendRenderer || typeof LegendRenderer.renderAccordion !== "function") {
                if (Log) Log.error("[Legend] Renderer.renderAccordion non disponible");
                return;
            }

            const self = this;
            ensureSpriteLoaded(function (spriteLoaded) {
                if (Log)
                    Log.debug("[Legend] Sprite chargé:", spriteLoaded, "- Rendu des accordéons");

                if (Array.isArray(legendsArray)) {
                    legendsArray.forEach((accordionData) => {
                        LegendRenderer.renderAccordion(self._bodyEl, accordionData);
                    });
                }

                if (!spriteLoaded) {
                    setTimeout(function () {
                        const spriteEl = document.querySelector(
                            'svg[data-geoleaf-sprite="profile"]'
                        );
                        if (spriteEl && Log) {
                            Log.info(
                                "[Legend] Sprite chargé tardivement - Re-rendu des accordéons"
                            );
                            self.updateMultiLayerContent(legendsArray);
                        }
                    }, 1000);
                }
            });
        },

        updateContent(
            this: LegendControlInstance,
            legendData: { title?: string; sections?: LegendSection[]; footer?: LegendFooter }
        ) {
            if (legendData.title) this._glOptions.title = legendData.title;
            if (legendData.sections) this._glOptions.sections = legendData.sections;
            if (legendData.footer) this._glOptions.footer = legendData.footer;
            this._renderContent();
        },

        _toggleCollapsed(this: LegendControlInstance) {
            const isCollapsed = this._container!.classList.toggle("gl-map-legend--collapsed");
            this._glOptions.collapsed = isCollapsed;
        },

        show(this: LegendControlInstance) {
            if (this._container) {
                this._container.style.display = "block";
            }
        },

        hide(this: LegendControlInstance) {
            if (this._container) {
                this._container.style.display = "none";
            }
        },
    });

    return new LegendControlClass({
        position: options.position,
        _glOptions: options,
    });
}

const LegendControl = {
    create: createLegendControl,
};
export { LegendControl };
