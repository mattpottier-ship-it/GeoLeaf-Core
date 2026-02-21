/**
 * Module Control pour LayerManager
 * Définition du contrôle Leaflet personnalisé
 *
 * DÉPENDANCES:
 * - Leaflet (L.Control, L.DomUtil, L.DomEvent, L.setOptions)
 * - GeoLeaf.Log (optionnel)
 * - GeoLeaf._LayerManagerRenderer (pour renderSections)
 *
 * EXPOSE:
 * - GeoLeaf._LayerManagerControl
 */
"use strict";

import { Log } from '../log/index.js';
import { LMRenderer } from './renderer.js';


/**
 * Crée un contrôle Leaflet pour le gestionnaire de couches
 * @param {Object} options - Options du contrôle
 * @returns {L.Control} - Instance du contrôle Leaflet
 */
function createLayerManagerControl(options) {
    if (!globalThis.L || !globalThis.L.Control) {
        if (Log) Log.error("[LayerManager] Leaflet L.Control non disponible");
        return null;
    }

    const LayerManagerControl = globalThis.L.Control.extend({
        options: {
            position: options.position || "bottomright"
        },

        initialize: function (controlOptions) {
            globalThis.L.setOptions(this, controlOptions || {});
            this._glOptions = controlOptions._glOptions;
        },


        onAdd: function (mapInstance) {
            this._map = mapInstance;
            this._container = globalThis.L.DomUtil.create("div", "gl-layer-manager");

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

            // Conteneur principal (flex container)
            const mainWrapper = globalThis.L.DomUtil.create("div", "gl-layer-manager__main-wrapper", this._container);

            // Wrapper du header (reste fixe)
            const headerWrapper = globalThis.L.DomUtil.create("div", "gl-layer-manager__header-wrapper", mainWrapper);

            // En-tête : titre + bouton collapse
            const header = globalThis.L.DomUtil.create("div", "gl-layer-manager__header", headerWrapper);

            const titleEl = globalThis.L.DomUtil.create(
                "div",
                "gl-layer-manager__title",
                header
            );
            titleEl.textContent = opts.title || "Légende";

            let toggleEl = null;
            if (opts.collapsible) {
                toggleEl = globalThis.L.DomUtil.create(
                    "button",
                    "gl-layer-manager__toggle",
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

            // Wrapper du body avec scrollbar
            const bodyWrapper = globalThis.L.DomUtil.create("div", "gl-layer-manager__body-wrapper", mainWrapper);

            // Corps de la légende
            this._bodyEl = globalThis.L.DomUtil.create(
                "div",
                "gl-layer-manager__body",
                bodyWrapper
            );

            // Appliquer l'état collapsed initial (depuis options ou collapsedByDefault)
            const initialCollapsed = opts.collapsed || opts.collapsedByDefault || false;
            if (initialCollapsed) {
                this._container.classList.add("gl-layer-manager--collapsed");
                opts.collapsed = true; // Synchroniser l'état
            }

            // Rendu des sections via le renderer
            this._renderSections(opts.sections || []);
        },

        /**
         * Rend les sections (délègue au renderer)
         * @private
         */
        _renderSections: function (sections) {
            if (LMRenderer) {
                LMRenderer.renderSections(this._bodyEl, sections);
            } else {
                if (Log) Log.error("[LayerManager] _LayerManagerRenderer non disponible");
            }
        },

        /**
         * Mise à jour des sections
         * @param {Array} sections - Nouvelles sections
         */
        updateSections: function (sections) {
            this._glOptions.sections = Array.isArray(sections) ? sections : [];
            this._renderSections(this._glOptions.sections);
        },

        /**
         * Rafraîchit l'affichage pour mettre à jour l'état des boutons toggle
         * Utilisé notamment après l'application d'un thème
         * @public
         */
        refresh: function () {
            // Synchroniser uniquement les toggles au lieu de re-générer tout le DOM
            if (LMRenderer && typeof LMRenderer.syncToggles === 'function') {
                LMRenderer.syncToggles();
            } else if (this._glOptions && this._glOptions.sections) {
                // Fallback: re-générer les sections si syncToggles n'est pas disponible
                this._renderSections(this._glOptions.sections);
            }
        },

        /**
         * Bascule l'état collapsed
         * @private
         */
        _toggleCollapsed: function () {
            const isCollapsed = this._container.classList.toggle("gl-layer-manager--collapsed");
            this._glOptions.collapsed = isCollapsed;
        }
    });

    return new LayerManagerControl({
        position: options.position,
        _glOptions: options
    });
}

const LMControl = {
    create: createLayerManagerControl
};
export { LMControl };
