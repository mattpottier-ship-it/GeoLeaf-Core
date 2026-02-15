/**
 * @module _LayerManagerStyleSelector
 * @description Sélecteur de styles pour le gestionnaire de couches.
 * Permet de changer dynamiquement le style appliqué à une couche.
 * Utilise le nouveau style-loader pour charger et valider les styles.
 * @version 3.1.0
 */

(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    /**
     * État interne du sélecteur de styles
     * @private
     */
    const state = {
        currentStyles: new Map() // layerId -> styleId
    };

    /**
     * Module sélecteur de styles pour le gestionnaire de couches
     * @namespace
     */
    GeoLeaf._LayerManagerStyleSelector = {
        /**
         * Récupère le style actuel d'une couche
         * @param {string} layerId - Identifiant de la couche
         * @returns {string|null} Identifiant du style actuel
         */
        getCurrentStyle: function (layerId) {
            return state.currentStyles.get(layerId) || null;
        },

        /**
         * Définit le style actuel d'une couche
         * @param {string} layerId - Identifiant de la couche
         * @param {string} styleId - Identifiant du style
         */
        setCurrentStyle: function (layerId, styleId) {
            state.currentStyles.set(layerId, styleId);
        },

        /**
         * Génère le HTML du sélecteur de styles
         * @param {Object} item - Configuration de l'item de couche
         * @param {string} item.id - Identifiant de la couche
         * @param {Object} item.styles - Configuration des styles disponibles
         * @param {Array} item.styles.available - Tableau des styles disponibles
         * @param {string} item.styles.default - Style par défaut
         * @returns {string} HTML du sélecteur
         * @deprecated Utiliser renderDOM() à la place
         */
        render: function (item) {
            if (!item.styles || !Array.isArray(item.styles.available) || item.styles.available.length <= 1) {
                return "";
            }

            const currentStyle = this.getCurrentStyle(item.id) || item.styles.default || item.styles.available[0].id;
            const selectId = "style-selector-" + item.id;

            let html = '<div class="gl-layer-manager__style-selector">';
            html += '<select id="' + selectId + '" class="gl-layer-manager__style-select" data-layer-id="' + item.id + '">';

            item.styles.available.forEach(function (style) {
                const selected = style.id === currentStyle ? ' selected' : '';
                html += '<option value="' + style.id + '"' + selected + '>' + style.label + '</option>';
            });

            html += '</select>';
            html += '</div>';

            return html;
        },

        /**
         * Génère l'élément DOM du sélecteur de styles
         * @param {Object} item - Configuration de l'item de couche
         * @param {string} item.id - Identifiant de la couche
         * @param {Object} item.styles - Configuration des styles disponibles
         * @param {Array} item.styles.available - Tableau des styles disponibles
         * @param {string} item.styles.default - Style par défaut
         * @returns {HTMLElement|null} Élément DOM du sélecteur ou null
         */
        renderDOM: function (item) {
			const Log = global.GeoLeaf && global.GeoLeaf.Log;

			// ...log supprimé ([StyleSelector] renderDOM)...

            if (!item.styles || !Array.isArray(item.styles.available) || item.styles.available.length <= 1) {
                // ...log supprimé ([StyleSelector] Pas de sélecteur nécessaire)...
                return null;
            }

            const currentStyle = this.getCurrentStyle(item.id) || item.styles.default || item.styles.available[0].id;
            const selectId = "style-selector-" + item.id;

            // Créer le conteneur
            const container = document.createElement("div");
            container.className = "gl-layer-manager__style-selector";

            // Créer le select
            const select = document.createElement("select");
            select.id = selectId;
            select.className = "gl-layer-manager__style-select";
            select.setAttribute("data-layer-id", item.id);

            // Ajouter les options
            item.styles.available.forEach(function (style) {
                const option = document.createElement("option");
                option.value = style.id;
                option.textContent = style.label;
                if (style.id === currentStyle) {
                    option.selected = true;
                }
                select.appendChild(option);
            });

            container.appendChild(select);
            return container;
        },

        /**
         * Initialise les événements du sélecteur de styles
         * @param {HTMLElement} container - Conteneur des contrôles
         * @param {Object} item - Configuration de l'item de couche
         */
        bindEvents: function (container, item) {
            if (!item.styles || !Array.isArray(item.styles.available) || item.styles.available.length <= 1) {
                return;
            }

            const selectId = "style-selector-" + item.id;
            const select = container.querySelector("#" + selectId);

            if (!select) {
                return;
            }

            const self = this;

            select.addEventListener("change", function () {
                const styleId = this.value;
                const layerId = this.getAttribute("data-layer-id");

                // Enregistrer le style actuel
                self.setCurrentStyle(layerId, styleId);

                // Appliquer le style à la couche
                self.applyStyle(layerId, styleId);
            });
        },

        /**
         * Applique un style à une couche
         * Utilise le style-loader pour charger, valider et appliquer le style
         * @param {string} layerId - Identifiant de la couche
         * @param {string} styleId - Identifiant du style
         */
        applyStyle: async function (layerId, styleId) {
			const Log = global.GeoLeaf.Log;

			if (!global.GeoLeaf._GeoJSONLayerManager) {
				// ...log supprimé ([StyleSelector] Module GeoJSON non disponible)...
				return;
			}

			// Récupérer les données de la couche
			const layerManager = global.GeoLeaf._GeoJSONLayerManager;
			const layerData = layerManager.getLayerData(layerId);

			if (!layerData) {
				// ...log supprimé ([StyleSelector] Couche non trouvée)...
				return;
			}

			if (!layerData.config.styles || !Array.isArray(layerData.config.styles.available)) {
				// ...log supprimé ([StyleSelector] Aucun style disponible pour la couche)...
				return;
			}

			// Trouver la configuration du style
			const styleConfig = layerData.config.styles.available.find(function (s) {
				return s.id === styleId;
			});

			if (!styleConfig) {
				// ...log supprimé ([StyleSelector] Style non trouvé)...
				return;
			}

			// ...log supprimé ([StyleSelector] Application du style)...

            try {
                // Vérifier que le style-loader est disponible
                const StyleLoader = global.GeoLeaf._StyleLoader;
                if (!StyleLoader) {
                    // ...log supprimé ([StyleSelector] GeoLeaf._StyleLoader non disponible)...
                    // Fallback vers ancien système si nécessaire
                    this._applyStyleLegacy(layerId, styleId, layerData, styleConfig);
                    return;
                }

                // Récupérer les métadonnées nécessaires
                const profileId = layerData.config._profileId;
                const layerDirectory = layerData.config._layerDirectory;

                if (!profileId || !layerDirectory) {
                    // ...log supprimé ([StyleSelector] Métadonnées manquantes)...
                    return;
                }

                // Charger et valider le style avec le style-loader
                // ...log supprimé ([StyleSelector] Chargement du style via style-loader)...

                const result = await StyleLoader.loadAndValidateStyle(
                    profileId,
                    layerId,
                    styleId,
                    styleConfig.file,
                    layerDirectory
                );

                // ...log supprimé ([StyleSelector] Style chargé et validé)...

                // Stocker le style actuel dans layerData pour que les labels puissent y accéder
                layerData.currentStyle = result.styleData;
                layerData.currentStyleMetadata = result.metadata;

                // Appliquer le style via le GeoJSONLayerManager
                if (typeof layerManager.setLayerStyle === "function") {
                    layerManager.setLayerStyle(layerId, result.styleData);
                    // ...log supprimé ([StyleSelector] Style appliqué avec succès)...
                } else {
                    // ...log supprimé ([StyleSelector] Fonction setLayerStyle non disponible)...
                }

                // Réinitialiser les labels selon le nouveau style et visibleByDefault
                if (global.GeoLeaf.Labels && typeof global.GeoLeaf.Labels.initializeLayerLabels === 'function') {
                    global.GeoLeaf.Labels.initializeLayerLabels(layerId);
                }

                // Mettre à jour l'état du bouton des labels selon le nouveau style
                // Utiliser syncImmediate car currentStyle vient d'être mis à jour
                if (global.GeoLeaf._LabelButtonManager) {
                    // ...log supprimé ([StyleSelector] Synchronisation du bouton label)...
                    global.GeoLeaf._LabelButtonManager.syncImmediate(layerId);
                }

                // Charger la légende correspondante
                if (global.GeoLeaf.Legend && typeof global.GeoLeaf.Legend.loadLayerLegend === "function") {
                    global.GeoLeaf.Legend.loadLayerLegend(layerData.config.id, styleId, layerData.config);
                }

            } catch (error) {
                // ...log supprimé ([StyleSelector] Erreur lors du chargement/application du style)...
                // ...log supprimé ([StyleSelector] Stack trace)...
            }
        },

        /**
         * Méthode legacy de chargement de style (fallback)
         * @private
         * @deprecated Utiliser applyStyle() avec style-loader à la place
         */
        _applyStyleLegacy: function (layerId, styleId, layerData, styleConfig) {
            const Log = global.GeoLeaf.Log;
            const layerManager = global.GeoLeaf._GeoJSONLayerManager;

            // ...log supprimé ([StyleSelector] Utilisation de la méthode legacy)...

            const profileId = layerData.config._profileId;
            const layerDirectory = layerData.config._layerDirectory;

            if (!profileId || !layerDirectory) {
                // ...log supprimé ([StyleSelector] Métadonnées manquantes)...
                return;
            }

            const Config = global.GeoLeaf.Config;
            const dataCfg = Config && Config.get ? Config.get('data') : null;
            const profilesBasePath = (dataCfg && dataCfg.profilesBasePath) || "profiles";

            const styleDirectory = layerData.config.styles.directory || "styles";
            const stylePath = profilesBasePath + "/" + profileId + "/" + layerDirectory + "/" + styleDirectory + "/" + styleConfig.file;

            // ...log supprimé ([StyleSelector] Chargement du fichier de style (legacy))...

            fetch(stylePath)
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("Erreur HTTP " + response.status);
                    }
                    return response.json();
                })
                .then(function (styleData) {
                    if (typeof layerManager.setLayerStyle === "function") {
                        layerManager.setLayerStyle(layerId, styleData);
                        // ...log supprimé ([StyleSelector] Style appliqué avec succès (legacy))...
                    }

                    if (global.GeoLeaf.Legend && typeof global.GeoLeaf.Legend.loadLayerLegend === "function") {
                        global.GeoLeaf.Legend.loadLayerLegend(layerData.config.id, styleId, layerData.config);
                    }
                })
                .catch(function (error) {
                    // ...log supprimé ([StyleSelector] Erreur lors du chargement du style (legacy))...
                });
        }
    };

})(window);
