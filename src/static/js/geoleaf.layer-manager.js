/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

(function (global) {
    "use strict";

    /**
     * Namespace global GeoLeaf
     */
    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    /**
     * Logger unifié
     */
    const Log = GeoLeaf.Log;

    /**
     * Module GeoLeaf.LayerManager (REFACTORISÉ v3.0)
     *
     * ARCHITECTURE MODULAIRE :
     * - layer-manager/shared.js : État partagé
     * - layer-manager/control.js : Contrôle Leaflet (L.Control)
     * - layer-manager/renderer.js : Rendu des sections et items
     * - layer-manager/basemap-selector.js : Sélecteur de fonds de carte
     * - layer-manager/theme-selector.js : Sélecteur de thèmes
     * - geoleaf.layer-manager.js (ce fichier) : Agrégateur/façade publique
     *
     * DÉPENDANCES REQUISES (chargées avant ce module) :
     * - layer-manager/shared.js → GeoLeaf._LayerManagerShared
     * - layer-manager/renderer.js → GeoLeaf._LayerManagerRenderer
     * - layer-manager/basemap-selector.js → GeoLeaf._LayerManagerBasemapSelector
     * - layer-manager/theme-selector.js → GeoLeaf._LayerManagerThemeSelector
     * - layer-manager/control.js → GeoLeaf._LayerManagerControl
     *
     * Rôle :
     * - Créer un contrôle Leaflet de gestionnaire de couches pour GeoLeaf
     * - Afficher des sections structurées (basemaps, couches, catégories)
     * - Gérer un mode repliable (collapsible)
     * - Préparation pour l'intégration avec le module Legend (Phase 6)
     */
    const LayerManagerModule = {
        /**
         * Référence à la carte Leaflet
         * @type {L.Map|null}
         * @private
         */
        _map: null,

        /**
         * Référence au contrôle Leaflet de légende
         * @type {L.Control|null}
         * @private
         */
        _control: null,

        /**
         * Timeout pour le debounce du refresh
         * @type {number|null}
         * @private
         */
        _refreshTimeout: null,

        /**
         * Options internes du module
         * @type {Object}
         * @private
         */
        _options: {
            position: "bottomright",
            title: "Gestionnaire de couches",
            collapsible: true,
            collapsed: false,
            sections: []
        },

        /**
         * Initialisation du module LayerManager
         *
         * @param {Object} options
         * @param {L.Map} [options.map] - Carte Leaflet (si absent, tentative via GeoLeaf.Core.getMap())
         * @param {string} [options.position]
         * @param {string} [options.title]
         * @param {boolean} [options.collapsible]
         * @param {boolean} [options.collapsed]
         * @param {Array} [options.sections]
         * @returns {L.Control|null} - Le contrôle LayerManager ou null
         */
        init(options = {}) {
            if (typeof global.L === "undefined" || !global.L || !global.L.Control) {
                if (Log) Log.error("[GeoLeaf.LayerManager] Leaflet (L.Control) est requis mais introuvable.");
                return null;
            }

            let map = options.map || null;

            // Tentative de récupération via GeoLeaf.Core
            if (!map && GeoLeaf.Core && typeof GeoLeaf.Core.getMap === "function") {
                map = GeoLeaf.Core.getMap();
            }

            if (!map) {
                if (Log) Log.error("[GeoLeaf.LayerManager] Aucune carte Leaflet disponible. Passe une instance dans init({ map }).");
                return null;
            }

            this._map = map;
            if (Log) Log.info("[GeoLeaf.LayerManager] init: map assigned");

            this._options = this._mergeOptions(this._options, options);

            // Charger les sections depuis layerManagerConfig si disponibles
            this._loadConfigSections();

            // Remplir automatiquement la section basemap
            this._autoPopulateBasemap();

            // Autoremplissage minimal si aucune section
            this._autoPopulateSections();

            // Créer le contrôle Leaflet via le sous-module
            if (!GeoLeaf._LayerManagerControl) {
                if (Log) Log.error("[GeoLeaf.LayerManager] Module _LayerManagerControl non chargé");
                return null;
            }

            this._control = GeoLeaf._LayerManagerControl.create(this._options);

            if (!this._control) {
                if (Log) Log.error("[GeoLeaf.LayerManager] Échec création contrôle");
                return null;
            }

            this._control.addTo(this._map);

            if (Log) Log.info("[GeoLeaf.LayerManager] Contrôle créé et ajouté à la carte");
            return this._control;
        },

        /**
         * Charge les sections depuis la configuration
         * @private
         */
        _loadConfigSections() {
            if (GeoLeaf.Config && typeof GeoLeaf.Config.get === "function") {
                const layerManagerConfig = GeoLeaf.Config.get('layerManagerConfig');
                if (GeoLeaf.Log) GeoLeaf.Log.debug("[LayerManager] Configuration chargée:", {
                    title: layerManagerConfig?.title,
                    collapsed: layerManagerConfig?.collapsedByDefault,
                    sectionsCount: layerManagerConfig?.sections?.length || 0
                });
                if (layerManagerConfig) {
                    if (layerManagerConfig.title) {
                        this._options.title = layerManagerConfig.title;
                    }

                    // Paramètre global collapsed/collapsedByDefault
                    if (typeof layerManagerConfig.collapsedByDefault === 'boolean') {
                        this._options.collapsed = layerManagerConfig.collapsedByDefault;
                    }

                    if (Array.isArray(layerManagerConfig.sections) && layerManagerConfig.sections.length > 0) {
                        const configSections = layerManagerConfig.sections
                            .slice()
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map(s => ({
                                id: s.id,
                                label: s.label,
                                order: s.order,
                                collapsedByDefault: s.collapsedByDefault,
                                items: []
                            }));

                        if (!Array.isArray(this._options.sections)) {
                            this._options.sections = [];
                        }

                        configSections.forEach(configSection => {
                            const existingSection = this._options.sections.find(s => s.id === configSection.id);
                            if (!existingSection) {
                                this._options.sections.push(configSection);
                            } else if (configSection.label && !existingSection.label) {
                                existingSection.label = configSection.label;
                            }
                        });

                        this._options.sections.sort((a, b) => (a.order || 0) - (b.order || 0));

                        if (Log) Log.info("[GeoLeaf.LayerManager] Sections fusionnées avec layerManagerConfig");
                    }
                }
            }
        },

        /**
         * Remplit automatiquement la section basemap
         * @private
         */
        _autoPopulateBasemap() {
            if (!Array.isArray(this._options.sections)) return;

            const basemapSection = this._options.sections.find(s => s.id === "basemap");
            if (basemapSection && (!basemapSection.items || basemapSection.items.length === 0)) {
                try {
                    let basemapDefs = null;
                    if (global.GeoLeaf && global.GeoLeaf.Baselayers && typeof global.GeoLeaf.Baselayers.getBaseLayers === "function") {
                        basemapDefs = global.GeoLeaf.Baselayers.getBaseLayers() || {};
                    } else if (GeoLeaf.Config && typeof GeoLeaf.Config.get === "function") {
                        basemapDefs = GeoLeaf.Config.get('basemaps') || {};
                    }

                    if (basemapDefs && Object.keys(basemapDefs).length > 0) {
                        basemapSection.items = Object.keys(basemapDefs).map(k => {
                            const d = basemapDefs[k] || {};
                            return { id: d.id || k, label: d.label || k };
                        });
                        if (Log) Log.info("[GeoLeaf.LayerManager] Section basemap remplie automatiquement");
                    }
                } catch (e) {
                    if (Log) Log.warn("[GeoLeaf.LayerManager] Erreur lors du remplissage automatique des basemaps:", e);
                }
            }
        },

        /**
         * Autoremplissage minimal des sections
         * @private
         */
        _autoPopulateSections() {
            if (Array.isArray(this._options.sections) && this._options.sections.length > 0) return;

            const autoSections = [];
            try {
                if (global.GeoLeaf && global.GeoLeaf.Baselayers && typeof global.GeoLeaf.Baselayers.getBaseLayers === "function") {
                    const defs = global.GeoLeaf.Baselayers.getBaseLayers() || {};
                    const baseItems = Object.keys(defs).map(k => {
                        const d = defs[k] || {};
                        return { id: k, label: d.label || k };
                    });
                    if (baseItems.length) {
                        autoSections.push({ id: "basemap", label: "Fond de carte", items: baseItems });
                    }
                }
            } catch (e) {
                // ignore
            }

            if (autoSections.length) {
                this._options.sections = autoSections;
                if (Log) Log.info("[GeoLeaf.LayerManager] auto-populated sections from Baselayers");
            } else {
                if (Log) Log.warn("[GeoLeaf.LayerManager] Aucune section fournie et autoremplissage impossible.");
            }
        },

        /**
         * Enregistre une couche GeoJSON dans la légende
         * @param {string} layerId - ID de la couche
         * @param {Object} options - Options de la couche
         */
        _registerGeoJsonLayer(layerId, options = {}) {
            // ...log supprimé ([LayerManager] _registerGeoJsonLayer appelé pour)...

            if (!this._options.sections) {
                this._options.sections = [];
            }

            // Utiliser layerManagerId ou legendSection (rétrocompatibilité)
            const sectionId = options.layerManagerId || options.legendSection || "geojson-default";
            let section = this._options.sections.find(s => s.id === sectionId);

            if (!section) {
                section = {
                    id: sectionId,
                    label: options.legendSectionLabel || "Couches GeoJSON",
                    order: 10,
                    items: []
                };
                this._options.sections.push(section);
                this._options.sections.sort((a, b) => (a.order || 0) - (b.order || 0));
            }

            const existingItem = section.items.find(item => item.id === layerId);
            if (!existingItem) {
                section.items.push({
                    id: layerId,
                    label: options.label || layerId,
                    toggleable: true,
                    themes: options.themes || null,
                    styles: options.styles || null,
                    labels: options.labels || null
                });

                this._updateContent();
                if (Log) Log.debug(`[LayerManager] Couche "${layerId}" enregistrée dans section "${sectionId}"`);
            }
        },

        /**
         * Désenregistre une couche GeoJSON de la légende
         * @param {string} layerId - ID de la couche
         */
        _unregisterGeoJsonLayer(layerId) {
            if (!Array.isArray(this._options.sections)) return;

            this._options.sections.forEach(section => {
                if (Array.isArray(section.items)) {
                    section.items = section.items.filter(item => item.id !== layerId);
                }
            });

            this._options.sections = this._options.sections.filter(
                section => section.id === "basemap" || (Array.isArray(section.items) && section.items.length > 0)
            );

            this._updateContent();
            if (Log) Log.debug(`[LayerManager] Couche "${layerId}" désenregistrée`);
        },

        /**
         * Met à jour les sections de la légende
         * @param {Array} sections - Nouvelles sections
         */
        updateSections(sections) {
            if (!Array.isArray(sections)) {
                if (Log) Log.warn("[GeoLeaf.LayerManager] updateSections: sections doit être un tableau");
                return;
            }
            this._options.sections = sections;
            this._updateContent();
        },

        /**
         * Ajoute ou met à jour une section dans la légende
         * @param {Object} section - Section à ajouter {id, label, order, items}
         */
        addSection(section) {
            if (!section || !section.id) {
                if (Log) Log.warn("[GeoLeaf.LayerManager] addSection: section invalide (id manquant)");
                return;
            }

            if (!Array.isArray(this._options.sections)) {
                this._options.sections = [];
            }

            // Chercher une section existante avec le même id
            const existingIndex = this._options.sections.findIndex(s => s.id === section.id);

            if (existingIndex !== -1) {
                // Fusionner avec la section existante
                const existing = this._options.sections[existingIndex];

                // Fusionner les items
                if (Array.isArray(section.items)) {
                    if (!Array.isArray(existing.items)) {
                        existing.items = [];
                    }

                    section.items.forEach(newItem => {
                        const existingItemIndex = existing.items.findIndex(i => i.id === newItem.id);
                        if (existingItemIndex !== -1) {
                            // Mettre à jour l'item existant
                            existing.items[existingItemIndex] = Object.assign({}, existing.items[existingItemIndex], newItem);
                        } else {
                            // Ajouter le nouvel item
                            existing.items.push(newItem);
                        }
                    });

                    // Trier les items par order
                    existing.items.sort((a, b) => (a.order || 0) - (b.order || 0));
                }

                // Mettre à jour les autres propriétés si fournies
                if (section.label) existing.label = section.label;
                if (section.order !== undefined) existing.order = section.order;
                if (section.collapsedByDefault !== undefined) existing.collapsedByDefault = section.collapsedByDefault;
            } else {
                // Ajouter la nouvelle section
                this._options.sections.push({
                    id: section.id,
                    label: section.label || section.id,
                    order: section.order || 99,
                    collapsedByDefault: section.collapsedByDefault || false,
                    items: section.items || []
                });

                // Trier les sections par order
                this._options.sections.sort((a, b) => (a.order || 0) - (b.order || 0));
            }

            this._updateContent();
            if (Log) Log.debug(`[LayerManager] Section "${section.id}" ajoutée/mise à jour`);
        },

        /**
         * Bascule l'état replié/déplié de la légende
         */
        toggleCollapse() {
            this._options.collapsed = !this._options.collapsed;
            if (!this._control) return;
            if (this._options.collapsed) {
                this._control._container.classList.add("gl-layer-manager--collapsed");
            } else {
                this._control._container.classList.remove("gl-layer-manager--collapsed");
            }
        },

        /**
         * Indique si la légende est repliée
         * @returns {boolean}
         */
        isCollapsed() {
            return !!this._options.collapsed;
        },

        /**
         * Force le re-rendu du contenu
         * @private
         */
        _updateContent() {
            if (!this._control || typeof this._control.updateSections !== "function") {
                return;
            }
            this._control.updateSections(this._options.sections || []);
        },

        /**
         * Rafraîchit l'affichage du LayerManager
         * Utilisé notamment après l'application d'un thème pour mettre à jour l'état des boutons toggle
         * Version debounced pour grouper les appels multiples (ex: plusieurs couches changent de visibilité au zoom)
         * @public
         * @param {boolean} [immediate=false] - Si true, force le refresh immédiat sans debounce
         */
        refresh(immediate = false) {
            if (!this._control || typeof this._control.refresh !== "function") {
                if (Log) Log.warn("[LayerManager] refresh(): contrôle non disponible ou méthode refresh manquante");
                return;
            }

            // Si refresh immédiat demandé, annuler le debounce et exécuter
            if (immediate) {
                if (this._refreshTimeout) {
                    clearTimeout(this._refreshTimeout);
                    this._refreshTimeout = null;
                }
                this._control.refresh();
                if (Log) Log.debug("[LayerManager] Affichage rafraîchi (immédiat)");
                return;
            }

            // Debounce: annuler le timeout précédent et programmer un nouveau refresh
            if (this._refreshTimeout) {
                clearTimeout(this._refreshTimeout);
            }

            this._refreshTimeout = setTimeout(() => {
                this._refreshTimeout = null;
                this._control.refresh();
                if (Log) Log.debug("[LayerManager] Affichage rafraîchi (debounced)");
            }, 250);
        },

        /**
         * Fusion d'options (shallow + fusion légère pour sous-objets)
         * @param {Object} base
         * @param {Object} override
         * @returns {Object}
         * @private
         */
        _mergeOptions(base, override) {
            const result = Object.assign({}, base || {});
            if (!override) return result;

            Object.keys(override).forEach((key) => {
                const value = override[key];

                if (
                    value &&
                    typeof value === "object" &&
                    !Array.isArray(value) &&
                    base &&
                    typeof base[key] === "object" &&
                    !Array.isArray(base[key])
                ) {
                    result[key] = Object.assign({}, base[key], value);
                } else {
                    result[key] = value;
                }
            });

            return result;
        }
    };

    // Exposer le module dans l'espace de nom GeoLeaf
    GeoLeaf.LayerManager = LayerManagerModule;
})(window);
