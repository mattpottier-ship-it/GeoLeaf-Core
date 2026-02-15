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
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
    const Log = GeoLeaf.Log;

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

            const container = global.L.DomUtil.create(
                "div",
                "gl-layer-manager__items gl-layer-manager__basemap-select",
                sectionEl
            );

            const select = global.L.DomUtil.create("select", "gl-layer-manager__basemap-select__select", container);

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

            // Valeur initiale -> ID actif des basemaps
            try {
                const activeId = global.GeoLeaf && global.GeoLeaf.Baselayers && typeof global.GeoLeaf.Baselayers.getActiveId === "function"
                    ? global.GeoLeaf.Baselayers.getActiveId()
                    : null;
                if (activeId) {
                    select.value = activeId;
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
                if (global.L && global.L.DomEvent) {
                    global.L.DomEvent.stopPropagation(ev);
                }
                try {
                    const val = select.value;
                    if (global.GeoLeaf && global.GeoLeaf.Baselayers && typeof global.GeoLeaf.Baselayers.setBaseLayer === "function") {
                        global.GeoLeaf.Baselayers.setBaseLayer(val);
                    }
                } catch (err) {
                    if (Log) Log.warn("Erreur lors du changement de basemap depuis la légende:", err);
                }
            };

            if (global.L && global.L.DomEvent) {
                global.L.DomEvent.on(select, "change", handler);
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
                document.addEventListener("geoleaf:basemap-changed", function (e) {
                    try {
                        if (e && e.detail && e.detail.id) {
                            select.value = e.detail.id;
                        }
                    } catch (err) {
                        // ignore
                    }
                });
            }
        }
    };

    // Exposer dans l'espace de noms interne
    GeoLeaf._LayerManagerBasemapSelector = _LayerManagerBasemapSelector;

})(window);
