/**
 * Module Basemap Selector pour LayerManager
 * Gestion du sélecteur de fonds de carte
 *
 * DÉPENDANCES:
 * - Leaflet (L.DomUtil, L.DomEvent)
 * - GeoLeaf.Log (optionnel)
 * - GeoLeaf.Baselayers (optionnel, pour getActiveId et setBaseLayer)
 *
 * EXPOSE:
 * - GeoLeaf._LayerManagerBasemapSelector
 */
"use strict";

import { Log } from '../log/index.js';
import { Baselayers } from '../geoleaf.baselayers.js';



/**
 * Module Basemap Selector
 * @namespace _LayerManagerBasemapSelector
 * @private
 */
const _LayerManagerBasemapSelector = {
    /**
     * Rend le sélecteur de basemap
     * @param {Object} section - Section basemap avec items
     * @param {HTMLElement} sectionEl - Élément DOM de la section
     */
    render(section, sectionEl) {
        // Validation des paramètres
        if (!section || !sectionEl) {
            return;
        }

        const container = globalThis.L.DomUtil.create(
            "div",
            "gl-layer-manager__items gl-layer-manager__basemap-select",
            sectionEl
        );

        const select = globalThis.L.DomUtil.create("select", "gl-layer-manager__basemap-select__select", container);

        // Remplir les options
        if (Array.isArray(section.items)) {
            section.items.forEach(function (item) {
                if (!item || !item.id) return;
                const opt = document.createElement("option");
                opt.value = item.id;
                opt.textContent = item.label || item.id;
                select.appendChild(opt);
            });
        }

        // Valeur initiale -> clé active des basemaps
        try {
            const activeKey = Baselayers && typeof Baselayers.getActiveKey === "function"
                ? Baselayers.getActiveKey()
                : null;
            if (activeKey) {
                select.value = activeKey;
            }
        } catch (e) {
            // ignore
        }

        // Changement par l'utilisateur
        this._attachChangeHandler(select);

        // Écouter les changements externes
        this._attachExternalListener(select);
    },

    /**
     * Attache le gestionnaire de changement au select
     * @private
     */
    _attachChangeHandler(select) {
        const handler = function (ev) {
            if (globalThis.L && globalThis.L.DomEvent) {
                globalThis.L.DomEvent.stopPropagation(ev);
            }
            try {
                const val = select.value;
                if (Baselayers && typeof Baselayers.setBaseLayer === "function") {
                    Baselayers.setBaseLayer(val);
                }
            } catch (err) {
                if (Log) Log.warn("Erreur lors du changement de basemap depuis la légende:", err);
            }
        };

        if (globalThis.L && globalThis.L.DomEvent) {
            globalThis.L.DomEvent.on(select, "change", handler);
        } else {
            select.addEventListener("change", handler);
        }
    },

    /**
     * Écoute les événements de changement de basemap externe
     * @private
     */
    _attachExternalListener(select) {
        if (typeof document !== "undefined") {
            this._externalHandler = function (e) {
                try {
                    if (e && e.detail && e.detail.key) {
                        select.value = e.detail.key;
                    }
                } catch (err) {
                    // ignore
                }
            };
            document.addEventListener("geoleaf:basemap:change", this._externalHandler);
        }
    },

    /**
     * Nettoie les listeners pour éviter les fuites mémoire
     */
    destroy() {
        if (this._externalHandler) {
            document.removeEventListener("geoleaf:basemap:change", this._externalHandler);
            this._externalHandler = null;
        }
    }
};

const BasemapSelector = _LayerManagerBasemapSelector;
export { BasemapSelector };
