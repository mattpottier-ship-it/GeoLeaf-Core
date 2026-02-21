/**
 * GeoLeaf GeoJSON Module - Layer Configuration Manager
 * Gestion de la configuration et des options des couches
 *
 * @module geojson/layer-config-manager
 */
"use strict";

import { GeoJSONShared } from './shared.js';
import { getLog } from '../utils/general-utils.js';

const _g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

// Dépendances lazy
const getState = () => GeoJSONShared.state;

const LayerConfigManager = {};

/**
 * Résout le chemin absolu d'un fichier de données
 *
 * @param {string} dataFile - Nom du fichier de données
 * @param {Object} profile - Profil actif
 * @param {string} [layerDirectory] - Dossier de la couche
 * @returns {string} Chemin absolu résolu
 */
LayerConfigManager.resolveDataFilePath = function (dataFile, profile, layerDirectory) {
    const Config = _g.GeoLeaf && _g.GeoLeaf.Config;
    const dataCfg = Config && Config.get ? Config.get('data') : null;
    const profilesBasePath = (dataCfg && dataCfg.profilesBasePath) || "profiles";
    const profileId = (dataCfg && dataCfg.activeProfile) || profile.id;

    // Si dataFile commence par ../, on résout relativement au dossier du profil
    if (dataFile.startsWith('../')) {
        // dataFile = "../raw/file.json" -> "profiles/tourism/raw/file.json"
        const relativePath = dataFile.replace('../', '');
        return `${profilesBasePath}/${profileId}/${relativePath}`;
    }


    // Si dataFile commence par /, c'est un chemin absolu
    if (dataFile.startsWith('/')) {
        return dataFile;
    }

    // Sinon, relatif au dossier de la couche (layers/tourism_poi_all/data/file.json)
    if (layerDirectory) {
        return `${profilesBasePath}/${profileId}/${layerDirectory}/${dataFile}`;
    }

    // Fallback: relatif au dossier du profil
    return `${profilesBasePath}/${profileId}/${dataFile}`;
};

/**
 * Infère le type de géométrie d'une couche
 *
 * @param {Object} def - Définition de la couche
 * @param {Object} geojsonData - Données GeoJSON
 * @returns {string} Type de géométrie ('point', 'line', 'polygon', 'unknown')
 */
LayerConfigManager.inferGeometryType = function (def, geojsonData) {
    if (def && typeof def.geometryType === "string") return def.geometryType;
    const features = geojsonData && Array.isArray(geojsonData.features)
        ? geojsonData.features
        : [];
    const first = features.find(f => f && f.geometry && f.geometry.type);
    if (!first) return "unknown";
    const geometryType = first.geometry.type.toLowerCase();
    if (geometryType.includes("point")) return "point";
    if (geometryType.includes("line")) return "line";
    if (geometryType.includes("polygon")) return "polygon";
    return "unknown";
};

/**
 * Construit les options Leaflet pour une couche spécifique
 * Configure pointToLayer, onEachFeature, styles, popups, tooltips et panes
 *
 * @param {Object} def - Définition de la couche depuis profile.json
 * @param {string} def.id - ID unique de la couche
 * @param {number} [def.zIndex] - Index z pour le positionnement
 * @param {Object} [def.style] - Style par défaut de la couche
 * @param {Array} [def.styleRules] - Règles de style conditionnelles
 * @param {boolean} [def.interactiveShape=false] - Rendre les formes interactives
 * @param {boolean} [def.showIconsOnMap=false] - Afficher icônes SVG pour les points
 * @param {Object} baseOptions - Options de base du module GeoJSON
 * @returns {Object} Options Leaflet configurées (pointToLayer, onEachFeature, style, etc.)
 * @example
 * const options = GeoLeaf._GeoJSONLayerConfig.buildLayerOptions(
 *   { id: 'poi_tourism', zIndex: 100, showIconsOnMap: true },
 *   { defaultPointStyle: { radius: 8 } }
 * );
 */
LayerConfigManager.buildLayerOptions = function (def, baseOptions) {
    const state = getState();
    const mergedOptions = Object.assign({}, state.options, baseOptions);

    // Style des polygones / lignes
    if (def.style && typeof def.style === "object") {
        mergedOptions.defaultStyle = Object.assign(
            {},
            mergedOptions.defaultStyle,
            def.style
        );
    }

    // Règles de style dynamiques (styleRules)
    if (Array.isArray(def.styleRules) && def.styleRules.length > 0) {
        mergedOptions.styleRules = def.styleRules;
    }

    // Déterminer le paramètre interactiveShape pour cette couche
    mergedOptions.interactiveShape = typeof def.interactiveShape === "boolean"
        ? def.interactiveShape
        : (_g.GeoLeaf && _g.GeoLeaf.Config && _g.GeoLeaf.Config.get ? _g.GeoLeaf.Config.get('ui.interactiveShapes', false) : false);

    // Vérifier si on doit afficher les icônes SVG sur la carte
    const showIconsOnMap = typeof def.showIconsOnMap === 'boolean' ? def.showIconsOnMap : false;

    // Déterminer le pane à utiliser pour cette couche
    const PaneHelpers = GeoJSONShared.PaneHelpers;
    const paneName = PaneHelpers.getPaneName(def.zIndex);

    // Style des points
    if (showIconsOnMap) {
        // Mode ICÔNE : utiliser les icônes SVG du profil
        mergedOptions.pointToLayer = function (feature, latlng) {
            // Convertir la feature en POI pour obtenir les infos de catégorie
            const PopupTooltip = _g.GeoLeaf && _g.GeoLeaf._GeoJSONPopupTooltip;
            const poiData = PopupTooltip ? PopupTooltip.convertFeatureToPOI(feature, def) : null;

            if (poiData) {
                // Convertir le format ancien 'fields' au nouveau 'detailPopup'
                const popupConfig = def.popup || {};
                const convertedPopup = {
                    enabled: popupConfig.enabled,
                    // Format ancien: { fields: [...] } → Format nouveau: { detailPopup: [...] }
                    detailPopup: popupConfig.detailPopup || popupConfig.fields || [],
                    // Aussi supporter l'ancien format de tooltip
                    detailTooltip: popupConfig.detailTooltip || (popupConfig.tooltip && popupConfig.tooltip.fields) || []
                };

                // Passer toute la configuration de la couche au POI
                poiData._layerConfig = {
                    style: mergedOptions.defaultStyle || {},
                    popup: convertedPopup,
                    tooltip: def.tooltip || {},
                    sidepanelConfig: def.sidepanelConfig || {}
                };
            }

            // Utiliser le système de markers POI pour créer l'icône
            const markers = _g.GeoLeaf && _g.GeoLeaf._POIMarkers;
            if (markers && typeof markers.createMarker === 'function' && poiData) {
                const attachEvents = mergedOptions.interactiveShape !== false;
                const marker = markers.createMarker(poiData, { attachEvents, pane: paneName });
                // S'assurer que le pane est défini sur le marker
                if (marker && marker.options) {
                    marker.options.pane = paneName;
                }
                return marker;
            }

            // Fallback sur circleMarker avec pane
            const pointStyle = Object.assign(
                {},
                mergedOptions.defaultPointStyle,
                def.pointStyle,
                { interactive: mergedOptions.interactiveShape, pane: paneName }
            );
            return _g.L.circleMarker(latlng, pointStyle);
        };
    } else if (def.pointStyle && typeof def.pointStyle === "object") {
        // Mode CIRCLE : utiliser circleMarker classique avec pane
        const pointStyle = Object.assign(
            {},
            mergedOptions.defaultPointStyle,
            def.pointStyle,
            { interactive: mergedOptions.interactiveShape, pane: paneName }
        );
        mergedOptions.pointToLayer = function (feature, latlng) {
            return _g.L.circleMarker(latlng, pointStyle);
        };
    }

    // Callback onEachFeature : intégration popups + side panel + tooltips
    const originalOnEachFeature = typeof def.onEachFeature === "function" ? def.onEachFeature : null;

    mergedOptions.onEachFeature = function (feature, layer) {
        // Popup unifié
        const PopupTooltip = _g.GeoLeaf && _g.GeoLeaf._GeoJSONPopupTooltip;
        if (PopupTooltip) {
            PopupTooltip.bindUnifiedPopup(feature, layer, def);
            PopupTooltip.bindUnifiedTooltip(feature, layer, def);
        }

        // Callback custom si fourni
        if (originalOnEachFeature) {
            originalOnEachFeature(feature, layer);
        }
    };

    // Ajouter le pane aux defaultPointStyle pour que le style-resolver l'utilise dans son fallback
    if (mergedOptions.defaultPointStyle) {
        mergedOptions.defaultPointStyle = Object.assign({}, mergedOptions.defaultPointStyle, { pane: paneName });
    } else {
        mergedOptions.defaultPointStyle = { pane: paneName };
    }

    // Utiliser le StyleResolver pour construire les options Leaflet finales
    if (_g.GeoLeaf && _g.GeoLeaf._GeoJSONStyleResolver && _g.GeoLeaf._GeoJSONStyleResolver.buildLeafletOptions) {
        return _g.GeoLeaf._GeoJSONStyleResolver.buildLeafletOptions(mergedOptions);
    }

    return mergedOptions;
};

/**
 * Charge la légende d'une couche depuis son fichier legends/*.json
 * Résout automatiquement le chemin selon le style actif et la config du profil
 *
 * @param {Object} profile - Profil contenant la configuration
 * @param {string} profile.id - ID du profil (ex: 'tourism')
 * @param {string} [profile.basePath] - Chemin de base du profil
 * @param {Object} layerDef - Définition de la couche depuis profile.json
 * @param {string} layerDef.id - ID de la couche
 * @param {string} [layerDef.style='default'] - Style actif de la couche
 * @param {Object} [layerDef.legends] - Configuration des légendes
 * @param {string} [layerDef.legends.directory='legends'] - Dossier des légendes
 * @param {string} [layerDef.legends.default] - Fichier légende par défaut
 * @returns {void} Charge et affiche la légende via GeoLeaf.Legend.loadLegend()
 * @example
 * GeoLeaf._GeoJSONLayerConfig.loadLayerLegend(
 *   { id: 'tourism', basePath: '../profiles/tourism' },
 *   { id: 'poi_all', style: 'par_categorie', legends: { directory: 'legends' } }
 * );
 */
LayerConfigManager.loadLayerLegend = function (profile, layerDef) {
    const Log = getLog();

    if (!layerDef) {
        if (Log) Log.debug("[GeoLeaf.GeoJSON] Pas de définition de couche");
        return;
    }

    // Pour v3.0, la config de la couche est déjà dans layerDef (enrichie par profile.js)
    const layerConfig = layerDef.legends ? layerDef : null;

    if (!layerConfig || !layerConfig.legends) {
        if (Log) Log.debug("[GeoLeaf.GeoJSON] Pas de config legends pour cette couche");
        return;
    }

    const legendsConfig = layerConfig.legends;
    const legendDirectory = legendsConfig.directory || "legends";

    // Déterminer le style actif de la couche
    const activeStyle = layerDef.style || "default";

    // Construire le nom de fichier de la légende
    let legendFile;
    if (activeStyle === "default" && legendsConfig.default) {
        legendFile = legendsConfig.default;
    } else {
        legendFile = `${activeStyle}.legend.json`;
    }

    // Construire le chemin de la légende
    const profileBasePath = profile.basePath || "./profiles/" + profile.id;
    const layerDirectory = layerDef._layerDirectory || "layers/" + layerDef.id;
    const legendPath = `${profileBasePath}/${layerDirectory}/${legendDirectory}/${legendFile}`;

    if (Log) Log.debug(`[GeoLeaf.GeoJSON] Chargement légende pour style "${activeStyle}": ${legendPath}`);

    // Charger et afficher la légende directement
    if (_g.GeoLeaf && _g.GeoLeaf.Legend && typeof _g.GeoLeaf.Legend.loadLayerLegend === "function") {
        try {
            _g.GeoLeaf.Legend.loadLayerLegend(layerDef.id, activeStyle, layerDef);
            if (Log) Log.info(`[GeoLeaf.GeoJSON] Légende affichée pour ${layerDef.id} (style: ${activeStyle})`);
        } catch (error) {
            if (Log) Log.warn(`[GeoLeaf.GeoJSON] Erreur chargement légende: ${error.message}`);
        }
    } else {
        if (Log) Log.warn("[GeoLeaf.GeoJSON] Module Legend non disponible");
    }
};

/**
 * Charge le style par défaut d'une couche depuis son fichier styles/*.style.json
 * Fonction asynchrone utilisant fetch() pour charger le JSON
 *
 * @async
 * @param {string} layerId - ID de la couche (utilisé pour le logging)
 * @param {Object} layerDef - Définition de la couche
 * @param {Object} layerDef.styles - Configuration des styles
 * @param {string} layerDef.styles.default - Nom du fichier de style par défaut
 * @param {string} [layerDef.styles.directory='styles'] - Dossier des styles
 * @param {string} layerDef._profileId - ID du profil (métadonnée interne)
 * @param {string} layerDef._layerDirectory - Dossier de la couche (métadonnée interne)
 * @returns {Promise<Object>} Style chargé (objet JSON parsé)
 * @throws {Error} "Pas de style par défaut défini" si styles.default manquant
 * @throws {Error} "Métadonnées manquantes" si _profileId ou _layerDirectory absent
 * @throws {Error} "HTTP {status}" si le fetch échoue
 * @example
 * try {
 *   const style = await GeoLeaf._GeoJSONLayerConfig.loadDefaultStyle(
 *     'provincia_ar',
 *     { styles: { default: 'défaut.json' }, _profileId: 'tourism', _layerDirectory: 'layers/provincia_ar' }
 *   );
 *   console.log('Style chargé:', style);
 * } catch (err) {
 *   console.error('Erreur chargement style:', err);
 * }
 */
LayerConfigManager.loadDefaultStyle = async function (layerId, layerDef) {
    const Log = getLog();

    if (!layerDef.styles || !layerDef.styles.default) {
        throw new Error("Pas de style par défaut défini");
    }

    const profileId = layerDef._profileId;
    const layerDirectory = layerDef._layerDirectory;

    if (!profileId || !layerDirectory) {
        throw new Error("Métadonnées manquantes (profileId ou layerDirectory)");
    }

    const Config = _g.GeoLeaf && _g.GeoLeaf.Config;
    const dataCfg = Config && Config.get ? Config.get('data') : null;
    const profilesBasePath = (dataCfg && dataCfg.profilesBasePath) || "profiles";

    const styleDirectory = layerDef.styles.directory || "styles";
    const styleFile = layerDef.styles.default;
    const stylePath = `${profilesBasePath}/${profileId}/${layerDirectory}/${styleDirectory}/${styleFile}`;

    Log.debug("[GeoLeaf.GeoJSON] Chargement style par défaut:", stylePath);

    const response = await fetch(stylePath);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const styleData = await response.json();
    Log.debug("[GeoLeaf.GeoJSON] Style chargé:", styleData);
    return styleData;
};

export { LayerConfigManager };
