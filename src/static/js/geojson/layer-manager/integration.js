/**
 * GeoLeaf GeoJSON Layer Manager - Integration
 * Layer Manager UI registration, legend loading, populate with all configs
 *
 * @module geojson/layer-manager/integration
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const getState = () => GeoLeaf._GeoJSONShared.state;
    const getLog = () => (GeoLeaf.Log || console);

    const LayerManager = GeoLeaf._GeoJSONLayerManager = GeoLeaf._GeoJSONLayerManager || {};

    /**
     * Enregistre les couches dans le module LayerManager.
     */
    LayerManager.registerWithLayerManager = function () {
        const state = getState();
        const Log = getLog();
        const LMgr = GeoLeaf.LayerManager;

        Log.info(`[GeoLeaf.GeoJSON] registerWithLayerManager() appelé avec ${state.layers.size} couche(s)`);

        if (!LMgr || typeof LMgr._registerGeoJsonLayer !== "function") {
            Log.warn("[GeoLeaf.GeoJSON] Module LayerManager non disponible, pas d'intégration gestionnaire de couches");
            return;
        }

        // Grouper les layers par idSection
        const sectionMap = new Map();

        state.layers.forEach((layerData, id) => {
            // Log pour debug - VOIR TOUTES LES COUCHES
            // Utiliser layerManagerId défini dans layer.json
            const sectionId = layerData.config.layerManagerId || "geojson-default";

            if (!sectionMap.has(sectionId)) {
                sectionMap.set(sectionId, {
                    id: sectionId,
                    order: 99,
                    items: []
                });
            }

            const type = LayerManager.detectLayerType(layerData.layer);
            let legendType = "fill";
            if (type === "poi") legendType = "circle";
            else if (type === "route") legendType = "line";
            else if (type === "area") legendType = "fill";

            let color = "#3388ff";
            if (layerData.config.style) {
                color = layerData.config.style.fillColor || layerData.config.style.color || color;
            } else if (layerData.config.pointStyle) {
                color = layerData.config.pointStyle.fillColor || color;
            }

            // Détecter si la couche a des labels (dans la config OU dans le style courant)
            let hasLabels = false;
            let labelsConfig = null;

            // Vérifier d'abord dans la config de la couche
            if (layerData.config.labels && layerData.config.labels.enabled) {
                hasLabels = true;
                labelsConfig = layerData.config.labels;
            }

            // Vérifier ensuite dans le style actuel (currentStyle)
            if (!hasLabels && layerData.currentStyle && layerData.currentStyle.label && layerData.currentStyle.label.enabled) {
                hasLabels = true;
                // Créer une config de labels minimale basée sur le style
                labelsConfig = { enabled: true };
            }

            // Log pour TOUTES les couches pour comprendre le problème
            if (Log) {
                Log.info(`[GeoJSON LayerManager] 🔍 Préparation item ${id}:`, {
                    hasConfig: !!layerData.config,
                    hasStyles: !!(layerData.config && layerData.config.styles),
                    styles: layerData.config ? layerData.config.styles : 'NO CONFIG',
                    configKeys: layerData.config ? Object.keys(layerData.config).sort() : []
                });
            }

            sectionMap.get(sectionId).items.push({
                id: id,
                label: layerData.label,
                type: legendType,
                color: color,
                visible: layerData.visible,
                toggleable: true,
                order: 0,
                zIndex: layerData.config.zIndex || 0,
                themes: layerData.config.themes || null,
                labels: hasLabels ? labelsConfig : null,
                styles: layerData.config.styles || null
            });
        });

        // Ajouter chaque section au gestionnaire de couches
        sectionMap.forEach((section) => {
            // Trier les items par zIndex décroissant (zIndex élevé = en haut = affiché au-dessus)
            section.items.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

            // Enregistrer chaque couche dans le LayerManager
            section.items.forEach((item) => {
                Log.debug(`[GeoLeaf.GeoJSON] Enregistrement couche "${item.id}" dans section "${section.id}"`);
                LMgr._registerGeoJsonLayer(item.id, {
                    layerManagerId: section.id,
                    label: item.label,
                    themes: item.themes,
                    styles: item.styles,
                    labels: item.labels
                });
            });

            Log.debug("[GeoLeaf.GeoJSON] Section couche '" + section.id + "' créée avec " + section.items.length + " couche(s)");
        });
    };

    /**
     * Charge la légende d'une couche si disponible
     * @param {string} layerId - ID de la couche
     * @param {Object} layerData - Données de la couche
     * @private
     */
    LayerManager._loadLayerLegend = function (layerId, layerData) {
        const Log = getLog();

        const config = layerData.config || {};

        // Nouveau flux : générer la légende depuis le style JSON
        if (GeoLeaf.Legend && typeof GeoLeaf.Legend.loadLayerLegend === "function") {
            // Déterminer le style courant
            const styleSelector = GeoLeaf._LayerManagerStyleSelector;
            let styleId = null;

            if (styleSelector && typeof styleSelector.getCurrentStyle === "function") {
                styleId = styleSelector.getCurrentStyle(layerId) || null;
            }

            // Fallback depuis metadata éventuelle
            if (!styleId && layerData.currentStyleMetadata && layerData.currentStyleMetadata.id) {
                styleId = layerData.currentStyleMetadata.id;
            }

            // Fallback depuis la config de styles
            if (!styleId && config.styles && Array.isArray(config.styles.available)) {
                const available = config.styles.available;
                // Essayer de trouver l'ID correspondant au fichier default
                const defaultFile = config.styles.default;
                const defaultByFile = defaultFile ? available.find(s => s.file === defaultFile) : null;
                styleId = (defaultByFile && defaultByFile.id) || (available[0] && available[0].id) || "default";
            }

            if (!styleId) {
                styleId = "default";
            }

            GeoLeaf.Legend.loadLayerLegend(layerId, styleId, config);
            return;
        }

        // Legacy fallback: charger un fichier de légende statique si déclaré
        if (!GeoLeaf.Legend || typeof GeoLeaf.Legend.addLayerLegend !== "function") {
            return;
        }

        if (!config.legends || !Array.isArray(config.legends.available)) {
            return;
        }

        let activeStyle = layerData.activeStyle;
        if (!activeStyle && config.styles && Array.isArray(config.styles.available)) {
            const defaultStyle = config.styles.available.find(s => s.id === "default");
            activeStyle = defaultStyle ? defaultStyle.id : (config.styles.available[0] ? config.styles.available[0].id : "default");
        }
        if (!activeStyle) {
            activeStyle = "default";
        }

        const legendEntry = config.legends.available.find(l => l.id === activeStyle);
        if (!legendEntry || !legendEntry.file) {
            Log.warn(`[GeoLeaf.GeoJSON] Pas de légende trouvée pour le style ${activeStyle} de la couche ${layerId}`);
            return;
        }

        const profileId = config._profileId;
        const layerDir = config._layerDirectory;
        const legendDir = config.legends.directory || "legends";

        if (!profileId || !layerDir) {
            Log.warn("[GeoLeaf.GeoJSON] Métadonnées manquantes (profileId ou layerDirectory) pour charger la légende");
            return;
        }

        const Config = GeoLeaf.Config;
        const dataCfg = Config && Config.get ? Config.get('data') : null;
        const profilesBasePath = (dataCfg && dataCfg.profilesBasePath) || "profiles";

        const legendPath = `${profilesBasePath}/${profileId}/${layerDir}/${legendDir}/${legendEntry.file}`;

        fetch(legendPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(legendData => {
                GeoLeaf.Legend.addLayerLegend(layerId, activeStyle, legendData);
                Log.debug(`[GeoLeaf.GeoJSON] Légende chargée pour ${layerId} (${activeStyle})`);
            })
            .catch(error => {
                Log.warn(`[GeoLeaf.GeoJSON] Erreur chargement légende pour ${layerId}:`, error.message);
            });
    };

    /**
     * Peuple le LayerManager avec TOUTES les configurations de couches disponibles.
     * Contrairement à registerWithLayerManager() qui ne montre que les couches chargées (thème actif),
     * cette fonction affiche TOUTES les couches et met à jour l'état coché selon le thème actif.
     *
     * @param {Object} activeThemeConfig - Configuration du thème actif (contient liste des layers visibles)
     * @returns {void}
     */
    LayerManager.populateLayerManagerWithAllConfigs = function(activeThemeConfig) {
            // ...logs nettoyés...
        const Log = getLog();
        const LMgr = GeoLeaf.LayerManager;

        if (!LMgr || typeof LMgr._registerGeoJsonLayer !== "function") {
            Log.warn("[GeoLeaf.GeoJSON] populateLayerManagerWithAllConfigs: Module LayerManager non disponible");
            return;
        }

        if (!GeoLeaf._allLayerConfigs || !Array.isArray(GeoLeaf._allLayerConfigs)) {
            Log.warn("[GeoLeaf.GeoJSON] populateLayerManagerWithAllConfigs: GeoLeaf._allLayerConfigs non disponible");
            return;
        }

        Log.info(`[GeoLeaf.GeoJSON] Peuplement LayerManager avec ${GeoLeaf._allLayerConfigs.length} configs de couches...`);
        // ...log debug supprimé...

        // Obtenir la liste des couches actives du thème
        // Les layers peuvent être des objets {id, visible, style} ou des strings simples
        let activeThemeLayers = [];
        if (activeThemeConfig && Array.isArray(activeThemeConfig.layers)) {
            activeThemeLayers = activeThemeConfig.layers.map(l => l.id || l);
        }
        Log.debug(`[GeoLeaf.GeoJSON] Couches actives du thème: ${activeThemeLayers.join(', ')}`);

        // Grouper les configs par sectionId (layerManagerId)
        const sectionMap = new Map();

        GeoLeaf._allLayerConfigs.forEach(config => {
            const sectionId = config.layerManagerId || "geojson-default";

            if (!sectionMap.has(sectionId)) {
                sectionMap.set(sectionId, {
                    id: sectionId,
                    items: []
                });
            }

            // Déterminer si la couche est active dans le thème courant
            const isActive = activeThemeLayers.includes(config.id);

            // Log pour debug - VOIR CE QUI EST DANS config POUR TOUTES LES COUCHES
            // ...logs supprimés ([GeoJSON LayerManager] config debug)...

            sectionMap.get(sectionId).items.push({
                id: config.id,
                label: config.label,
                layerManagerId: sectionId,
                themes: config.themes || null,
                isActive: isActive,
                zIndex: config.zIndex || 0,
                styles: config.styles || null,
                labels: config.labels || null
            });
        });

        // Enregistrer chaque couche avec le LayerManager
        sectionMap.forEach((section) => {
            // Trier par zIndex décroissant
            section.items.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

            section.items.forEach((item) => {
                Log.debug(`[GeoLeaf.GeoJSON] Enregistrement couche "${item.id}" dans section "${section.id}" (actif: ${item.isActive})`);
                LMgr._registerGeoJsonLayer(item.id, {
                    layerManagerId: section.id,
                    label: item.label,
                    themes: item.themes,
                    checked: item.isActive,
                    styles: item.styles,
                    labels: item.labels
                });
            });

            Log.debug(`[GeoLeaf.GeoJSON] Section "${section.id}" peuplée avec ${section.items.length} couche(s)`);
        });

        Log.info(`[GeoLeaf.GeoJSON] LayerManager peuplé avec succès`);

        // Mettre à jour l'UI du LayerManager si nécessaire
        if (LMgr._updateUI && typeof LMgr._updateUI === "function") {
            Log.debug("[GeoLeaf.GeoJSON] Appel LayerManager._updateUI()");
            LMgr._updateUI();
        }
    };

})(window);
