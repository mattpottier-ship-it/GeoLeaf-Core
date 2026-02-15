/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Table Module
 * Affichage tabulaire des données cartographiques avec tri, recherche et sélection
 * Version: 1.0.0
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;

    /**
     * Module GeoLeaf.Table
     * Vue tabulaire complémentaire à la carte
     */
    const TableModule = {
        /**
         * Référence vers la carte Leaflet
         * @type {L.Map|null}
         */
        _map: null,

        /**
         * Configuration du module table depuis geoleaf.config.json
         * @type {Object|null}
         */
        _config: null,

        /**
         * Couche actuellement affichée dans le tableau
         * @type {string|null}
         */
        _currentLayerId: null,

        /**
         * IDs des entités sélectionnées
         * @type {Set<string>}
         */
        _selectedIds: new Set(),

        /**
         * Données en cache (features filtrées)
         * @type {Array}
         */
        _cachedData: [],

        /**
         * Mapping featureId → index dans _cachedData (synchronisé avec le renderer)
         * @type {Map<string, number>}
         */
        _featureIdMap: new Map(),

        /**
         * Couches Leaflet de surbrillance actuellement actives
         * @type {Array<L.Layer>}
         */
        _highlightLayers: [],

        /**
         * Indique si la surbrillance est activée
         * @type {boolean}
         */
        _highlightActive: false,

        /**
         * État actuel du tri
         * @type {Object}
         */
        _sortState: {
            field: null,
            direction: null // 'asc' | 'desc' | null
        },

        /**
         * Conteneur DOM du tableau
         * @type {HTMLElement|null}
         */
        _container: null,

        /**
         * Indique si le tableau est visible
         * @type {boolean}
         */
        _isVisible: false,

        /**
         * Initialise le module Table
         * @param {Object} options - Options d'initialisation
         * @param {L.Map} options.map - Instance de la carte Leaflet
         * @param {Object} [options.config] - Configuration personnalisée
         */
        init(options) {
            if (!options || !options.map) {
                Log.error("[Table] init() nécessite une instance de carte Leaflet");
                return;
            }

            this._map = options.map;

            // Récupérer la config depuis GeoLeaf.Config
            const globalConfig = GeoLeaf.Config ? GeoLeaf.Config.get("tableConfig") : null;
            this._config = Object.assign({
                enabled: true,
                defaultVisible: false,
                pageSize: 50,
                maxRowsPerLayer: 1000,
                enableExportButton: true,
                virtualScrolling: true,
                defaultHeight: "40%",
                minHeight: "20%",
                maxHeight: "60%",
                resizable: false
            }, globalConfig, options.config);

            if (!this._config.enabled) {
                Log.info("[Table] Module désactivé via configuration");
                return;
            }

            Log.info("[Table] Initialisation du module Table", this._config);

            // Créer le panel si besoin
            if (GeoLeaf._TablePanel && typeof GeoLeaf._TablePanel.create === "function") {
                this._container = GeoLeaf._TablePanel.create(this._map, this._config);
            } else {
                Log.error("[Table] Module table/panel.js non chargé");
                return;
            }

            // Définir la visibilité initiale
            if (this._config.defaultVisible) {
                this.show();
            }

            // Écouter les événements carte
            this._attachMapEvents();

            Log.info("[Table] Module Table initialisé avec succès");
        },

        /**
         * Attache les listeners d'événements Leaflet
         * @private
         */
        _attachMapEvents() {
            if (!this._map) return;

            // Timer pour debounce du rafraîchissement du sélecteur
            let refreshSelectorTimer = null;
            const debouncedRefreshSelector = () => {
                if (refreshSelectorTimer) clearTimeout(refreshSelectorTimer);
                refreshSelectorTimer = setTimeout(() => {
                    if (GeoLeaf._TablePanel && typeof GeoLeaf._TablePanel.refreshLayerSelector === "function") {
                        GeoLeaf._TablePanel.refreshLayerSelector();
                    }
                }, 150);
            };

            // Synchroniser avec les changements de filtres
            this._map.on("geoleaf:filters:changed", () => {
                if (this._isVisible && this._currentLayerId) {
                    this.refresh();
                }
            });

            // Rafraîchir le sélecteur quand les couches GeoJSON sont chargées
            this._map.on("geoleaf:geojson:layers-loaded", () => {
                Log.debug("[Table] Événement layers-loaded reçu, rafraîchissement du sélecteur");
                debouncedRefreshSelector();
            });

            // Rafraîchir le sélecteur quand un thème est appliqué
            // (c'est à ce moment que la visibilité est réellement définie)
            document.addEventListener("geoleaf:theme:applied", () => {
                Log.debug("[Table] Événement theme:applied reçu, rafraîchissement du sélecteur");
                debouncedRefreshSelector();
            });

            // Synchroniser avec les changements de visibilité des couches
            this._map.on("geoleaf:geojson:visibility-changed", (e) => {
                // Rafraîchir le sélecteur (debounced pour grouper les changements multiples)
                debouncedRefreshSelector();

                // Si la couche active est celle qui a changé de visibilité
                if (this._currentLayerId === e.layerId) {
                    if (e.visible) {
                        this.refresh();
                    } else {
                        // La couche active a été masquée : basculer sur la première couche visible
                        // Attendre le debounce pour que le sélecteur soit à jour
                        setTimeout(() => {
                            const available = this._getAvailableVisibleLayers();
                            if (available.length > 0) {
                                this.setLayer(available[0].id);
                                const select = document.querySelector("[data-table-layer-select]");
                                if (select) select.value = available[0].id;
                            } else {
                                this.setLayer("");
                            }
                        }, 200);
                    }
                }
            });
        },

        /**
         * Affiche le tableau
         */
        show() {
            if (!this._container) {
                Log.warn("[Table] Conteneur non initialisé");
                return;
            }

            this._container.classList.add("is-visible");
            this._isVisible = true;

            this._fireEvent("table:opened", {});
            Log.debug("[Table] Tableau affiché");
        },

        /**
         * Masque le tableau
         */
        hide() {
            if (!this._container) return;

            // Nettoyer la surbrillance
            this._clearHighlightLayers();
            this._highlightActive = false;

            this._container.classList.remove("is-visible");
            this._isVisible = false;

            this._fireEvent("table:closed", {});
            Log.debug("[Table] Tableau masqué");
        },

        /**
         * Toggle la visibilité du tableau
         */
        toggle() {
            if (this._isVisible) {
                this.hide();
            } else {
                this.show();
            }
        },

        /**
         * Définit la couche à afficher dans le tableau
         * @param {string} layerId - ID de la couche
         */
        setLayer(layerId) {
            Log.debug("[Table] setLayer appelé avec:", layerId);

            // Si layerId est vide, vider le tableau
            if (!layerId) {
                this._currentLayerId = null;
                this._selectedIds.clear();
                this._clearHighlightLayers();
                this._highlightActive = false;
                this._featureIdMap.clear();
                this._sortState = { field: null, direction: null };
                this._cachedData = [];

                // Vider le tableau visuellement
                if (GeoLeaf._TableRenderer && this._container) {
                    GeoLeaf._TableRenderer.render(this._container, {
                        layerId: null,
                        features: [],
                        selectedIds: this._selectedIds,
                        sortState: this._sortState,
                        config: this._config
                    });
                }

                this._fireEvent("table:layerChanged", { layerId: null });
                Log.debug("[Table] Tableau vidé (aucune couche sélectionnée)");
                return;
            }

            const layers = this._getAvailableLayers();
            const layer = layers.find(l => l.id === layerId);

            if (!layer) {
                Log.warn("[Table] Couche introuvable ou non activée pour le tableau:", layerId);
                return;
            }

            this._currentLayerId = layerId;
            this._selectedIds.clear();
            this._clearHighlightLayers();
            this._highlightActive = false;
            this._sortState = { field: null, direction: null };

            // Définir le tri par défaut depuis la config du layer
            const layerData = GeoLeaf.GeoJSON ? GeoLeaf.GeoJSON.getLayerData(layerId) : null;
            if (layerData && layerData.config && layerData.config.table && layerData.config.table.defaultSort) {
                this._sortState.field = layerData.config.table.defaultSort.field;
                this._sortState.direction = layerData.config.table.defaultSort.direction || layerData.config.table.defaultSort.order || "asc";
            }

            this.refresh();

            this._fireEvent("table:layerChanged", { layerId });
            Log.debug("[Table] Couche changée:", layerId);
        },

        /**
         * Rafraîchit les données affichées dans le tableau
         */
        refresh() {
            if (!this._currentLayerId) {
                Log.debug("[Table] Aucune couche sélectionnée, impossible de rafraîchir");
                return;
            }

            // Récupérer les données depuis GeoJSON
            const features = this._getLayerFeatures(this._currentLayerId);
            this._cachedData = features;

            // Construire le mapping ID→index (miroir de la logique du renderer)
            this._featureIdMap.clear();
            let syntheticCounter = 0;
            features.forEach((feature, index) => {
                const id = this._resolveFeatureId(feature, syntheticCounter);
                if (id.startsWith("__gl_row_")) syntheticCounter++;
                this._featureIdMap.set(id, index);
            });

            Log.debug("[Table] Features récupérées:", features.length);

            // Appliquer le tri si défini
            if (this._sortState.field && this._sortState.direction) {
                this._applySorting();
            }

            // Rafraîchir le rendu
            if (GeoLeaf._TableRenderer && typeof GeoLeaf._TableRenderer.render === "function") {
                GeoLeaf._TableRenderer.render(this._container, {
                    layerId: this._currentLayerId,
                    features: this._cachedData,
                    selectedIds: this._selectedIds,
                    sortState: this._sortState,
                    config: this._config
                });
            } else {
                Log.error("[Table] Renderer non disponible");
            }

            Log.debug("[Table] Données rafraîchies:", features.length, "entités");
        },

        /**
         * Récupère les features d'une couche avec les filtres appliqués
         * @param {string} layerId - ID de la couche
         * @returns {Array} Features
         * @private
         */
        _getLayerFeatures(layerId) {
            if (!GeoLeaf.GeoJSON || typeof GeoLeaf.GeoJSON.getLayerData !== "function") {
                Log.warn("[Table] Module GeoJSON non disponible");
                return [];
            }

            const layerData = GeoLeaf.GeoJSON.getLayerData(layerId);

            if (!layerData || !layerData.features) {
                Log.warn("[Table] Aucune donnée pour la couche:", layerId);
                return [];
            }

            Log.debug("[Table] _getLayerFeatures - Nombre de features:", layerData.features.length);

            // Appliquer la limite de lignes
            const maxRows = this._config.maxRowsPerLayer || 1000;
            if (layerData.features.length > maxRows) {
                Log.warn("[Table] Données volumineuses (" + layerData.features.length + " entités). Limité à " + maxRows);
                return layerData.features.slice(0, maxRows);
            }

            return layerData.features || [];
        },

        /**
         * Récupère les couches disponibles pour le tableau (table.enabled)
         * @returns {Array} Liste des couches avec table.enabled = true
         * @private
         */
        _getAvailableLayers() {
            if (!GeoLeaf.GeoJSON || typeof GeoLeaf.GeoJSON.getAllLayers !== "function") {
                return [];
            }

            const allLayers = GeoLeaf.GeoJSON.getAllLayers();
            const availableLayers = [];

            allLayers.forEach(layer => {
                const layerData = GeoLeaf.GeoJSON.getLayerData(layer.id);
                if (layerData && layerData.config && layerData.config.table && layerData.config.table.enabled) {
                    availableLayers.push({
                        id: layer.id,
                        label: layer.label || layer.id,
                        config: layerData.config.table
                    });
                }
            });

            return availableLayers;
        },

        /**
         * Récupère les couches disponibles ET visibles pour le tableau
         * @returns {Array} Liste des couches avec table.enabled = true et visibles sur la carte
         * @private
         */
        _getAvailableVisibleLayers() {
            const available = this._getAvailableLayers();
            const VisibilityManager = GeoLeaf._LayerVisibilityManager;

            return available.filter(layer => {
                if (VisibilityManager && typeof VisibilityManager.getVisibilityState === "function") {
                    const visState = VisibilityManager.getVisibilityState(layer.id);
                    return visState && visState.current === true;
                }
                // Fallback : vérifier via layerData
                const layerData = GeoLeaf.GeoJSON.getLayerData(layer.id);
                return layerData && layerData._visibility && layerData._visibility.current === true;
            });
        },

        /**
         * Applique le tri sur les données en cache
         * @private
         */
        _applySorting() {
            if (!this._sortState.field || !this._sortState.direction) return;

            const field = this._sortState.field;
            const direction = this._sortState.direction;

            this._cachedData.sort((a, b) => {
                const valA = this._getNestedValue(a, field);
                const valB = this._getNestedValue(b, field);

                // Gestion des valeurs nulles
                if (valA == null && valB == null) return 0;
                if (valA == null) return direction === "asc" ? 1 : -1;
                if (valB == null) return direction === "asc" ? -1 : 1;

                // Comparaison
                let result = 0;
                if (typeof valA === "number" && typeof valB === "number") {
                    result = valA - valB;
                } else {
                    result = String(valA).localeCompare(String(valB));
                }

                return direction === "asc" ? result : -result;
            });

            Log.debug("[Table] Tri appliqué:", field, direction);
        },

        /**
         * Change le tri sur une colonne
         * @param {string} field - Chemin du champ
         */
        sortByField(field) {
            if (this._sortState.field === field) {
                // Cycle : asc → desc → null
                if (this._sortState.direction === "asc") {
                    this._sortState.direction = "desc";
                } else if (this._sortState.direction === "desc") {
                    this._sortState.field = null;
                    this._sortState.direction = null;
                } else {
                    this._sortState.direction = "asc";
                }
            } else {
                this._sortState.field = field;
                this._sortState.direction = "asc";
            }

            this.refresh();
            this._fireEvent("table:sortChanged", this._sortState);
        },

        /**
         * Sélectionne ou désélectionne des entités
         * @param {Array<string>} ids - IDs à sélectionner
         * @param {boolean} [add=false] - Ajouter à la sélection existante ou remplacer
         */
        setSelection(ids, add = false) {
            if (!add) {
                this._selectedIds.clear();
            }

            ids.forEach(id => this._selectedIds.add(String(id)));

            this._fireEvent("table:selectionChanged", {
                layerId: this._currentLayerId,
                selectedIds: Array.from(this._selectedIds)
            });

            // Rafraîchir le rendu pour mettre à jour les cases cochées
            if (GeoLeaf._TableRenderer && typeof GeoLeaf._TableRenderer.updateSelection === "function") {
                GeoLeaf._TableRenderer.updateSelection(this._container, this._selectedIds);
            }

            Log.debug("[Table] Sélection mise à jour:", this._selectedIds.size, "entités");
        },

        /**
         * Retourne les IDs des entités sélectionnées
         * @returns {Array<string>}
         */
        getSelectedIds() {
            return Array.from(this._selectedIds);
        },

        /**
         * Efface la sélection
         */
        clearSelection() {
            this._selectedIds.clear();
            this._fireEvent("table:selectionChanged", {
                layerId: this._currentLayerId,
                selectedIds: []
            });

            if (GeoLeaf._TableRenderer && typeof GeoLeaf._TableRenderer.updateSelection === "function") {
                GeoLeaf._TableRenderer.updateSelection(this._container, this._selectedIds);
            }

            Log.debug("[Table] Sélection effacée");
        },

        /**
         * Zoom sur les entités sélectionnées
         */
        zoomToSelection() {
            if (this._selectedIds.size === 0) {
                Log.warn("[Table] Aucune entité sélectionnée pour le zoom");
                return;
            }

            const selectedFeatures = this._getSelectedFeatures();
            if (selectedFeatures.length === 0) {
                Log.warn("[Table] Aucune feature trouvée pour les IDs sélectionnés");
                return;
            }

            const bounds = L.latLngBounds([]);

            selectedFeatures.forEach(feature => {
                if (feature.geometry && feature.geometry.coordinates) {
                    this._extendBoundsFromGeometry(bounds, feature.geometry);
                }
            });

            if (bounds.isValid()) {
                this._map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
                this._fireEvent("table:zoomToSelection", {
                    layerId: this._currentLayerId,
                    selectedIds: Array.from(this._selectedIds)
                });
                Log.debug("[Table] Zoom sur la sélection (", selectedFeatures.length, "entités)");
            } else {
                Log.warn("[Table] Bounds invalides pour la sélection");
            }
        },

        /**
         * Active/désactive la surbrillance des entités sélectionnées sur la carte
         * @param {boolean} active - Activer ou non
         */
        highlightSelection(active) {
            // Toujours nettoyer les anciennes surbrillances
            this._clearHighlightLayers();

            this._highlightActive = active;

            if (!active) {
                Log.debug("[Table] Surbrillance désactivée");
                this._fireEvent("table:highlightSelection", {
                    layerId: this._currentLayerId,
                    selectedIds: Array.from(this._selectedIds),
                    active: false
                });
                return;
            }

            if (this._selectedIds.size === 0) {
                Log.warn("[Table] Aucune entité sélectionnée pour la surbrillance");
                return;
            }

            const selectedFeatures = this._getSelectedFeatures();
            if (selectedFeatures.length === 0) {
                Log.warn("[Table] Aucune feature trouvée pour la surbrillance");
                return;
            }

            // Style de surbrillance (contour jaune épais)
            const highlightStyle = {
                color: "#FFD600",
                weight: 4,
                opacity: 1,
                fillOpacity: 0.15,
                fillColor: "#FFD600",
                dashArray: "",
                interactive: false
            };

            selectedFeatures.forEach(feature => {
                try {
                    if (feature.geometry) {
                        const geomType = feature.geometry.type;
                        if (geomType === "Point") {
                            // Pour les points, créer un cercle de surbrillance
                            const coords = feature.geometry.coordinates;
                            const circle = L.circleMarker(
                                [coords[1], coords[0]],
                                {
                                    radius: 14,
                                    color: "#FFD600",
                                    weight: 4,
                                    opacity: 1,
                                    fillOpacity: 0.25,
                                    fillColor: "#FFD600",
                                    interactive: false
                                }
                            );
                            circle.addTo(this._map);
                            this._highlightLayers.push(circle);
                        } else {
                            // Pour les polygones/polylines, superposer le contour
                            const highlightLayer = L.geoJSON(feature, {
                                style: function() { return highlightStyle; },
                                interactive: false,
                                pointToLayer: function(f, latlng) {
                                    return L.circleMarker(latlng, highlightStyle);
                                }
                            });
                            highlightLayer.addTo(this._map);
                            this._highlightLayers.push(highlightLayer);
                        }
                    }
                } catch (e) {
                    Log.warn("[Table] Erreur surbrillance feature:", e);
                }
            });

            this._fireEvent("table:highlightSelection", {
                layerId: this._currentLayerId,
                selectedIds: Array.from(this._selectedIds),
                active: true
            });

            Log.debug("[Table] Surbrillance activée pour", selectedFeatures.length, "entités");
        },

        /**
         * Supprime toutes les couches de surbrillance de la carte
         * @private
         */
        _clearHighlightLayers() {
            this._highlightLayers.forEach(layer => {
                try {
                    if (this._map && this._map.hasLayer(layer)) {
                        this._map.removeLayer(layer);
                    }
                } catch (e) {
                    // Silencieux
                }
            });
            this._highlightLayers = [];
        },

        /**
         * Exporte les entités sélectionnées au format GeoJSON (téléchargement)
         */
        exportSelection() {
            if (this._selectedIds.size === 0) {
                Log.warn("[Table] Aucune entité sélectionnée pour l'export");
                return;
            }

            const selectedFeatures = this._getSelectedFeatures();

            if (selectedFeatures.length === 0) {
                Log.warn("[Table] Aucune feature trouvée pour l'export");
                return;
            }

            // Construire le GeoJSON FeatureCollection
            const geojson = {
                type: "FeatureCollection",
                features: selectedFeatures.map(f => ({
                    type: "Feature",
                    properties: f.properties || {},
                    geometry: f.geometry || null
                }))
            };

            // Télécharger le fichier
            try {
                const json = JSON.stringify(geojson, null, 2);
                const blob = new Blob([json], { type: "application/geo+json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = (this._currentLayerId || "export") + "_selection.geojson";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                Log.info("[Table] Export GeoJSON:", selectedFeatures.length, "entités exportées");
            } catch (e) {
                Log.error("[Table] Erreur lors de l'export:", e);
            }

            this._fireEvent("table:exportSelection", {
                layerId: this._currentLayerId,
                selectedIds: Array.from(this._selectedIds),
                rows: selectedFeatures
            });
        },

        /**
         * Récupère les features sélectionnées à partir du cache via le mapping d'IDs
         * @returns {Array} Features GeoJSON correspondant à la sélection
         * @private
         */
        _getSelectedFeatures() {
            const result = [];
            this._selectedIds.forEach(id => {
                const index = this._featureIdMap.get(id);
                if (index != null && this._cachedData[index]) {
                    result.push(this._cachedData[index]);
                }
            });
            return result;
        },

        /**
         * Résout l'ID d'une feature en miroir de la logique du renderer
         * @param {Object} feature - Feature GeoJSON
         * @param {number} syntheticIndex - Index pour les IDs synthétiques
         * @returns {string}
         * @private
         */
        _resolveFeatureId(feature, syntheticIndex) {
            // 1. ID standard GeoJSON
            if (feature.id != null && feature.id !== "") return String(feature.id);

            const p = feature.properties;
            if (!p) return "__gl_row_" + syntheticIndex;

            // 2. Propriétés d'identifiant courantes (miroir exact du renderer)
            if (p.id != null && p.id !== "") return String(p.id);
            if (p.fid != null && p.fid !== "") return String(p.fid);
            if (p.osm_id != null && p.osm_id !== "") return String(p.osm_id);
            if (p.OBJECTID != null && p.OBJECTID !== "") return String(p.OBJECTID);
            if (p.SITE_ID != null && p.SITE_ID !== "") return String(p.SITE_ID);
            if (p.code != null && p.code !== "") return String(p.code);
            if (p.IN1 != null && p.IN1 !== "") return String(p.IN1);

            // 3. Fallback : ID synthétique (miroir du renderer)
            return "__gl_row_" + syntheticIndex;
        },

        /**
         * Étend les bounds à partir d'une géométrie GeoJSON
         * @param {L.LatLngBounds} bounds - Bounds à étendre
         * @param {Object} geometry - Géométrie GeoJSON
         * @private
         */
        _extendBoundsFromGeometry(bounds, geometry) {
            const coords = geometry.coordinates;
            const type = geometry.type;

            if (type === "Point") {
                bounds.extend([coords[1], coords[0]]);
            } else if (type === "LineString") {
                coords.forEach(c => bounds.extend([c[1], c[0]]));
            } else if (type === "MultiLineString") {
                coords.forEach(line => line.forEach(c => bounds.extend([c[1], c[0]])));
            } else if (type === "Polygon") {
                coords[0].forEach(c => bounds.extend([c[1], c[0]]));
            } else if (type === "MultiPolygon") {
                coords.forEach(poly => {
                    poly[0].forEach(c => bounds.extend([c[1], c[0]]));
                });
            } else if (type === "MultiPoint") {
                coords.forEach(c => bounds.extend([c[1], c[0]]));
            }
        },

        /**
         * Récupère une valeur imbriquée dans un objet
         * @param {Object} obj - Objet source
         * @param {string} path - Chemin avec notation point
         * @returns {*}
         * @private
         */
        _getNestedValue(obj, path) {
            if (!obj || !path) return null;
            return path.split('.').reduce((current, prop) =>
                current && current[prop] !== undefined ? current[prop] : null, obj);
        },

        /**
         * Émet un événement personnalisé
         * @param {string} eventName - Nom de l'événement
         * @param {Object} detail - Données de l'événement
         * @private
         */
        _fireEvent(eventName, detail) {
            if (this._map && typeof this._map.fire === "function") {
                this._map.fire("geoleaf:" + eventName, detail);
            }

            if (typeof document !== "undefined" && document.dispatchEvent) {
                document.dispatchEvent(new CustomEvent("geoleaf:" + eventName, { detail }));
            }
        }
    };

    // Exposer le module
    GeoLeaf.Table = TableModule;

})(typeof window !== "undefined" ? window : global);
