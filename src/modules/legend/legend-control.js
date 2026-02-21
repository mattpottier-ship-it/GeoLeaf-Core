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
"use strict";

import { Log } from "../log/index.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { POIMarkers } from "../poi/markers.js";
import { LegendRenderer } from "./legend-renderer.js";

// Direct ESM bindings (P3-DEAD-01 complete)
// Leaflet (L) and optional GeoLeaf runtime modules accessed via globalThis

/**
 * S'assure que le sprite SVG des icônes est chargé avec vérification robuste
 * @private
 * @param {Function} [callback] - Fonction à appeler une fois le sprite chargé
 */
async function ensureSpriteLoaded(callback) {
    if (POIMarkers && typeof POIMarkers.ensureProfileSpriteInjectedSync === "function") {
        // Éviter les logs répétitifs - log seulement la première fois
        if (!ensureSpriteLoaded._alreadyLogged) {
            if (Log) Log.debug("[Legend] Chargement du sprite SVG pour les icônes...");
            ensureSpriteLoaded._alreadyLogged = true;
        }

        // Attendre que le sprite soit chargé de manière asynchrone
        await POIMarkers.ensureProfileSpriteInjectedSync();

        // Perf 6.3.4: MutationObserver au lieu du polling setTimeout × 20
        const spriteEl = document.querySelector('svg[data-geoleaf-sprite="profile"]');
        if (spriteEl) {
            if (!ensureSpriteLoaded._spriteDetected) {
                if (Log) Log.info("[Legend] Sprite SVG détecté et prêt pour utilisation");
                ensureSpriteLoaded._spriteDetected = true;
            }
            if (typeof callback === "function") callback(true);
            return;
        }

        // Sprite pas encore dans le DOM : observer jusqu'à son apparition (max 2s)
        new Promise((resolve) => {
            const observer = new MutationObserver((_mutations, obs) => {
                const el = document.querySelector('svg[data-geoleaf-sprite="profile"]');
                if (el) {
                    obs.disconnect();
                    clearTimeout(timerId);
                    if (!ensureSpriteLoaded._spriteDetected) {
                        if (Log) Log.info("[Legend] Sprite SVG détecté via MutationObserver");
                        ensureSpriteLoaded._spriteDetected = true;
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
        if (typeof callback === "function") {
            callback(false);
        }
    }
}

/**
 * Crée un contrôle Leaflet pour la légende cartographique
 * @param {Object} options - Options du contrôle
 * @returns {L.Control} - Instance du contrôle Leaflet
 */
function createLegendControl(options) {
    if (!globalThis.L || !globalThis.L.Control) {
        if (Log) Log.error("[Legend] Leaflet L.Control non disponible");
        return null;
    }

    const LegendControl = globalThis.L.Control.extend({
        options: {
            position: options.position || "bottomleft",
        },

        initialize: function (controlOptions) {
            globalThis.L.setOptions(this, controlOptions || {});
            this._glOptions = controlOptions._glOptions;
        },

        onAdd: function (mapInstance) {
            this._map = mapInstance;
            this._container = globalThis.L.DomUtil.create("div", "gl-map-legend");

            // Empêcher les interactions carte
            if (globalThis.L.DomEvent) {
                globalThis.L.DomEvent.disableClickPropagation(this._container);
                globalThis.L.DomEvent.disableScrollPropagation(this._container);
            }

            this._buildStructure();
            return this._container;
        },

        onRemove: function () {
            this._map = null;
            this._container = null;
        },

        /**
         * Construit la structure DOM de la légende
         * @private
         */
        _buildStructure: function () {
            const opts = this._glOptions;

            // Wrapper principal
            const wrapper = globalThis.L.DomUtil.create(
                "div",
                "gl-map-legend__wrapper",
                this._container
            );

            // En-tête : titre + bouton collapse
            if (opts.title) {
                const header = globalThis.L.DomUtil.create("div", "gl-map-legend__header", wrapper);

                const titleEl = globalThis.L.DomUtil.create("h2", "gl-map-legend__title", header);
                titleEl.textContent = opts.title;

                if (opts.collapsible) {
                    const toggleEl = globalThis.L.DomUtil.create(
                        "button",
                        "gl-map-legend__toggle",
                        header
                    );
                    toggleEl.type = "button";
                    toggleEl.setAttribute("aria-label", "Basculer la légende");
                    toggleEl.textContent = "⟱";

                    const self = this;
                    globalThis.L.DomEvent.on(toggleEl, "click", function (ev) {
                        globalThis.L.DomEvent.stopPropagation(ev);
                        self._toggleCollapsed();
                    });
                }
            }

            // Corps de la légende
            this._bodyEl = globalThis.L.DomUtil.create("div", "gl-map-legend__body", wrapper);

            // Appliquer l'état collapsed initial
            if (opts.collapsed) {
                this._container.classList.add("gl-map-legend--collapsed");
            }

            // Rendu des sections via le renderer
            this._renderContent();
        },

        /**
         * Rend le contenu de la légende
         * @private
         */
        _renderContent: function () {
            if (!this._bodyEl) return;
            const opts = this._glOptions;

            // Vider le contenu existant
            DOMSecurity.clearElementFast(this._bodyEl);
            const renderer = LegendRenderer;

            if (!renderer) {
                if (Log) Log.error("[Legend] LegendRenderer non disponible");
                return;
            }

            // S'assurer que le sprite SVG est chargé pour les icônes
            ensureSpriteLoaded();

            // Rendu des sections (ancien mode pour compatibilité)
            if (Array.isArray(opts.sections)) {
                opts.sections.forEach((section) => {
                    renderer.renderSection(this._bodyEl, section);
                });
            }

            // Rendu du footer
            if (opts.footer) {
                renderer.renderFooter(this._bodyEl, opts.footer);
            }
        },

        /**
         * Mise à jour du contenu multi-couches avec accordéons
         * @param {Array} legendsArray - Tableau d'accordéons à afficher
         */
        updateMultiLayerContent: function (legendsArray) {
            if (!this._bodyEl) return;

            // Vider le contenu existant
            DOMSecurity.clearElementFast(this._bodyEl);

            const renderer = LegendRenderer;

            if (!renderer || typeof renderer.renderAccordion !== "function") {
                if (Log) Log.error("[Legend] Renderer.renderAccordion non disponible");
                return;
            }

            // S'assurer que le sprite SVG est chargé avant le rendu
            const self = this;
            ensureSpriteLoaded(function (spriteLoaded) {
                if (Log)
                    Log.debug("[Legend] Sprite chargé:", spriteLoaded, "- Rendu des accordéons");

                // Rendre chaque accordéon (même si le sprite n'est pas chargé pour éviter une interface vide)
                if (Array.isArray(legendsArray)) {
                    legendsArray.forEach((accordionData) => {
                        renderer.renderAccordion(self._bodyEl, accordionData);
                    });
                }

                // Si le sprite n'était pas chargé, réessayer dans 1 seconde
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

        /**
         * Mise à jour du contenu de la légende (ancien mode)
         * @param {Object} legendData - Nouvelles données de légende
         */
        updateContent: function (legendData) {
            if (legendData.title) this._glOptions.title = legendData.title;
            if (legendData.sections) this._glOptions.sections = legendData.sections;
            if (legendData.footer) this._glOptions.footer = legendData.footer;

            this._renderContent();
        },

        /**
         * Bascule l'état collapsed
         * @private
         */
        _toggleCollapsed: function () {
            const isCollapsed = this._container.classList.toggle("gl-map-legend--collapsed");
            this._glOptions.collapsed = isCollapsed;
        },

        /**
         * Montre la légende
         * @public
         */
        show: function () {
            if (this._container) {
                this._container.style.display = "block";
            }
        },

        /**
         * Cache la légende
         * @public
         */
        hide: function () {
            if (this._container) {
                this._container.style.display = "none";
            }
        },
    });

    return new LegendControl({
        position: options.position,
        _glOptions: options,
    });
}

const LegendControl = {
    create: createLegendControl,
};
export { LegendControl };
