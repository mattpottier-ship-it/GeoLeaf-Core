/**
 * Module Legend Generator
 * Génère automatiquement les légendes depuis les fichiers de style
 *
 * DÉPENDANCES:
 * - GeoLeaf.Log (optionnel)
 *
 * EXPOSE:
 * - GeoLeaf._LegendGenerator
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
    const Log = GeoLeaf.Log;

    /**
     * Récupère l'icône depuis taxonomy pour une règle donnée
     * @param {Object} rule - Règle de style avec condition when
     * @param {Object} taxonomyData - Données de taxonomy
     * @param {string} symbolPrefix - Préfixe des symboles (ex: "tourism-poi-cat-")
     * @returns {string|null} - ID de l'icône sprite ou null
     * @private
     */
    function getIconFromTaxonomy(rule, taxonomyData, symbolPrefix) {
        if (!rule.when || !taxonomyData || !taxonomyData.categories) {
            if (Log) Log.debug("[LegendGenerator] Données insuffisantes pour récupérer icône:", {
                hasRule: !!rule.when,
                hasTaxonomy: !!taxonomyData,
                hasCategories: !!(taxonomyData && taxonomyData.categories)
            });
            return null;
        }

        const field = rule.when.field;
        const value = rule.when.value;
        const categories = taxonomyData.categories;

        if (Log) Log.debug(`[LegendGenerator] Recherche icône pour ${field}=${value}`);

        // Déterminer le type de recherche
        const isSubCategory = field === "properties.subCategoryId" || field === "attributes.subCategoryId";
        const isCategoryId = field === "properties.categoryId" || field === "attributes.categoryId";

        // Recherche dans subCategoryId
        if (isSubCategory) {
            for (const categoryKey in categories) {
                const subcategories = categories[categoryKey].subcategories;
                if (subcategories && subcategories[value] && subcategories[value].icon) {
                    const iconId = symbolPrefix + subcategories[value].icon;
                    if (Log) Log.debug(`[LegendGenerator] Icône trouvée (subcat): ${iconId}`);
                    return iconId;
                }
            }
        }

        // Recherche dans categoryId
        if (isCategoryId && categories[value] && categories[value].icon) {
            const iconId = symbolPrefix + categories[value].icon;
            if (Log) Log.debug(`[LegendGenerator] Icône trouvée (cat): ${iconId}`);
            return iconId;
        }

        if (Log) Log.warn(`[LegendGenerator] Aucune icône trouvée pour ${field}=${value}`);
        return null;
    }

    // Fonction utilitaire pour déterminer si les icônes doivent être affichées
    // Copie exactement la logique de markers.js resolveCategoryDisplay()
    function shouldUseIcons() {
        try {
            // Récupérer l'état partagé (comme dans markers.js)
            const shared = (GeoLeaf && GeoLeaf._POIShared) ? GeoLeaf._POIShared : null;
            const poiConfig = shared ? shared.state.poiConfig : {};
            const showIconsOnMap = (poiConfig.showIconsOnMap !== false);

            if (showIconsOnMap) {
                // Vérifier la config d'icônes (comme dans markers.js)
                const iconsConfig = (GeoLeaf.Config && typeof GeoLeaf.Config.getIconsConfig === "function")
                    ? GeoLeaf.Config.getIconsConfig()
                    : null;

                if (iconsConfig && iconsConfig.showOnMap !== false) {
                    return true;
                }
            }
        } catch (e) {
            // Ignorer les erreurs silencieusement
        }

        return false;
    }

    /**
     * Génère les données de légende depuis un fichier de style
     * @param {Object} styleData - Données du style (JSON parsé)
     * @param {string} geometryType - Type de géométrie (point, line, polygon)
     * @param {Object} taxonomyData - Données de taxonomy (pour les icônes POI)
     * @returns {Object} - Données de légende formatées
     */
    function generateLegendFromStyle(styleData, geometryType, taxonomyData) {
        if (!styleData) {
            if (Log) Log.warn("[LegendGenerator] Style data manquant");
            return null;
        }

        const legendData = {
            version: "3.0",
            id: styleData.id,
            title: styleData.label || "Sans titre",
            description: styleData.description || "",
            sections: []
        };

        const items = [];
        const symbolPrefix = taxonomyData?.icons?.symbolPrefix || "tourism-poi-cat-";

        // Cas 1 : Style avec styleRules
        if (Array.isArray(styleData.styleRules) && styleData.styleRules.length > 0) {
            styleData.styleRules.forEach(rule => {
                if (!rule.legend) {
                    if (Log) Log.warn("[LegendGenerator] Règle sans propriété legend:", rule);
                    return;
                }

                const item = generateLegendItem(
                    rule.style,
                    rule.legend,
                    geometryType,
                    styleData.style, // style de base
                    rule,
                    taxonomyData,
                    symbolPrefix
                );

                if (item) {
                    items.push(item);
                }
            });

            // Trier par order
            items.sort((a, b) => (a.order || 999) - (b.order || 999));

        // Cas 2 : Style simple sans règles ou avec styleRules vide
        }

        // Si pas d'items générés à partir des styleRules (ou pas de styleRules)
        // essayer d'utiliser la légende au niveau racine
        if (items.length === 0 && styleData.style && styleData.legend) {
            const item = generateLegendItem(
                styleData.style,
                styleData.legend,
                geometryType,
                null,
                null,
                taxonomyData,
                symbolPrefix
            );

            if (item) {
                items.push(item);
            }
        }

        // Créer une section par défaut avec tous les items
        if (items.length > 0) {
            legendData.sections.push({
                title: "",
                items: items
            });
        }

        return legendData;
    }

    /**
     * Génère un item de légende selon le type de géométrie
     * @param {Object} style - Style de l'entité
     * @param {Object} legend - Propriétés legend (label, order, description)
     * @param {string} geometryType - Type de géométrie
     * @param {Object} baseStyle - Style de base (pour héritage)
     * @param {Object} rule - Règle complète (pour extraction icône)
     * @param {Object} taxonomyData - Données taxonomy
     * @param {string} symbolPrefix - Préfixe symboles
     * @param {boolean} showIconsOnMap - Si true, génère les icônes
     * @returns {Object|null} - Item de légende
     * @private
     */
    function generateLegendItem(style, legend, geometryType, baseStyle, rule, taxonomyData, symbolPrefix) {
        if (!style || !legend) {
            return null;
        }

        // Fusionner avec le style de base si présent
        const mergedStyle = baseStyle ? Object.assign({}, baseStyle, style) : style;

        const item = {
            label: legend.label || "Sans label",
            order: legend.order || 999
        };

        if (legend.description) {
            item.description = legend.description;
        }

        // Génération du symbole selon le type de géométrie
        switch (geometryType) {
            case "point":
                item.symbol = generatePointSymbol(mergedStyle, rule, taxonomyData, symbolPrefix);
                break;

            case "line":
                item.symbol = generateLineSymbol(mergedStyle);
                break;

            case "polygon":
                item.symbol = generatePolygonSymbol(mergedStyle);
                break;

            default:
                if (Log) Log.warn("[LegendGenerator] Type de géométrie non reconnu:", geometryType);
                item.symbol = generatePointSymbol(mergedStyle, rule, taxonomyData, symbolPrefix);
        }

        return item;
    }

    /**
     * Ajoute les propriétés communes d'opacité à un symbole
     * @param {Object} symbol - Objet symbole
     * @param {Object} style - Style source
     * @param {Array<string>} opacityProps - Propriétés d'opacité à copier
     * @private
     */
    function applyOpacityProperties(symbol, style, opacityProps) {
        opacityProps.forEach(prop => {
            if (style[prop] !== undefined) {
                symbol[prop] = style[prop];
            }
        });
    }

    /**
     * Résout les icônes d'une règle selon la configuration showIconsOnMap
     * @param {Object} rule - Règle de style
     * @returns {Object} - {useIcon: boolean, iconId: string|null}
     * @private
     */
    function resolveRuleIcons(rule) {
        // Utiliser la même logique que markers.js
        if (!shouldUseIcons()) {
            return { useIcon: false, iconId: null };
        }
        // Récupérer la configuration des catégories
        const categoriesConfig = (GeoLeaf.Config && typeof GeoLeaf.Config.getCategories === "function")
            ? GeoLeaf.Config.getCategories()
            : {};

        if (!categoriesConfig || Object.keys(categoriesConfig).length === 0) {
            return { useIcon: false, iconId: null };
        }

        // Mappage de fclass vers categoryId/subCategoryId pour les icônes
        // Permet de résoudre les icônes pour les règles qui utilisent fclass au lieu de categoryId
        const fclassMappings = {
            // Cultures
            'archaeological': { categoryId: 'CULTURES', subCategoryId: 'SITE ARCHEOLOGIQUE' },
            'museum': { categoryId: 'CULTURES', subCategoryId: 'MUSEE' },
            // Hébergements
            'camp_site': { categoryId: 'HEBERGEMENT', subCategoryId: 'CAMPING' },
            'hotel': { categoryId: 'HEBERGEMENT', subCategoryId: 'HOTEL' }
        };

        // Extraire categoryId et subCategoryId depuis la règle
        let categoryId = null;
        let subCategoryId = null;

        // Format v3 : rule.when avec field/value
        if (rule.when && rule.when.field && rule.when.value !== undefined) {
            // NOUVEAU: Cas spécial pour fclass (résoudre via mapping)
            if (rule.when.field === 'properties.fclass' || rule.when.field === 'fclass') {
                const mapping = fclassMappings[rule.when.value];
                if (mapping) {
                    categoryId = mapping.categoryId;
                    subCategoryId = mapping.subCategoryId;
                }
            } else if (rule.when.field === 'properties.categoryId' || rule.when.field === 'categoryId') {
                categoryId = rule.when.value;
            } else if (rule.when.field === 'properties.subCategoryId' || rule.when.field === 'subCategoryId') {
                subCategoryId = rule.when.value;
            } else if (rule.when.field === 'properties.category' || rule.when.field === 'category') {
                categoryId = rule.when.value;
            } else if (rule.when.field === 'properties.subCategory' || rule.when.field === 'subCategory') {
                subCategoryId = rule.when.value;
            }
        }
        // Format legacy : rule.condition
        else if (rule.condition) {
            if (typeof rule.condition.categoryId !== 'undefined') {
                categoryId = rule.condition.categoryId;
            }
            if (typeof rule.condition.subCategoryId !== 'undefined') {
                subCategoryId = rule.condition.subCategoryId;
            }
            if (typeof rule.condition.category !== 'undefined') {
                categoryId = rule.condition.category;
            }
            if (typeof rule.condition.subCategory !== 'undefined') {
                subCategoryId = rule.condition.subCategory;
            }
        }

        // Pour les subCategoryId, il faut deviner la categoryId depuis la taxonomie
        if (subCategoryId && !categoryId) {
            // Chercher dans quelle catégorie se trouve cette sous-catégorie
            Object.keys(categoriesConfig).forEach(catKey => {
                const cat = categoriesConfig[catKey];
                if (cat.subcategories && cat.subcategories[subCategoryId]) {
                    categoryId = catKey;
                }
            });
        }

        if (!categoryId && !subCategoryId) {
            return { useIcon: false, iconId: null };
        }

        // Résolution de l'icône depuis la taxonomie
        let iconId = null;
        if (subCategoryId && categoriesConfig[categoryId]?.subcategories) {
            const subCat = categoriesConfig[categoryId].subcategories[subCategoryId];
            const cat = categoriesConfig[categoryId];

            if (subCat) {
                iconId = subCat.icon || subCat.iconId || cat.icon || cat.iconId || null;
            } else {
                iconId = cat.icon || cat.iconId || null;
            }
        } else if (categoriesConfig[categoryId]) {
            const cat = categoriesConfig[categoryId];
            iconId = cat.icon || cat.iconId || null;
        }

        return {
            useIcon: iconId !== null,
            iconId: iconId
        };
    }

    /**
     * Génère un symbole pour les points (POI)
     * @param {Object} style - Style du point
     * @param {Object} rule - Règle complète (pour extraction icône)
     * @param {Object} taxonomyData - Données taxonomy
     * @param {string} symbolPrefix - Préfixe symboles
     * @param {boolean} showIconsOnMap - Si true, génère les icônes
     * @returns {Object} - Configuration du symbole
     * @private
     */
    function generatePointSymbol(style, rule, taxonomyData, symbolPrefix) {
        const fill = style.fill || {};
        const stroke = style.stroke || {};

        const resolvedRadius = style.radius || style.size || (style.sizePx ? style.sizePx / 2 : undefined);

        // Taille par défaut plus grande pour que les icônes soient visibles dans la légende
        // Utiliser 24px pour les icônes, 16px pour les cercles simples
        const defaultRadius = 24;

        const symbol = {
            type: "circle",
            radius: resolvedRadius || defaultRadius,
            fillColor: style.fillColor || style.color || fill.color || "#3388ff",
            fillOpacity: style.fillOpacity !== undefined ? style.fillOpacity : (fill.opacity !== undefined ? fill.opacity : 1),
            color: style.color || stroke.color || "#ffffff",
            weight: style.weight || stroke.widthPx || 2,
            opacity: style.opacity !== undefined ? style.opacity : (stroke.opacity !== undefined ? stroke.opacity : 1)
        };

        // Priorité 1 : Vérifier si l'icône est directement dans le style (showIconsOnMap)
        if (style.useIcon && style.iconId) {
            symbol.icon = style.iconId;
            symbol.iconColor = "#ffffff"; // Couleur par défaut pour icônes
            if (Log) Log.debug(`[LegendGenerator] Icône trouvée dans le style: ${style.iconId}`);
        }
        // Priorité 2 : Résoudre l'icône depuis la configuration showIconsOnMap
        else if (rule && shouldUseIcons()) {
            const iconResolution = resolveRuleIcons(rule);

            if (iconResolution.useIcon && iconResolution.iconId) {
                // Ajouter le préfixe sprite si nécessaire
                const fullIconId = iconResolution.iconId.startsWith('#') ?
                    iconResolution.iconId :
                    (symbolPrefix ? symbolPrefix + iconResolution.iconId : '#sprite-' + iconResolution.iconId);

                symbol.icon = fullIconId;
                symbol.iconColor = "#ffffff";
                if (Log) Log.debug(`[LegendGenerator] Icône résolue depuis la config: ${fullIconId}`);
            }
        }
        // Priorité 3 : Tenter de récupérer l'icône depuis taxonomy (méthode legacy)
        if (!symbol.icon && rule && taxonomyData && shouldUseIcons()) {
            const icon = getIconFromTaxonomy(rule, taxonomyData, symbolPrefix);
            if (icon) {
                symbol.icon = icon;
                symbol.iconColor = "#ffffff"; // Couleur par défaut pour icônes
                if (Log) Log.debug("[LegendGenerator] Icône taxonomy ajoutée:", icon);
            }
        }

        return symbol;
    }

    /**
     * Génère un symbole pour les lignes
     * @param {Object} style - Style de la ligne
     * @returns {Object} - Configuration du symbole
     * @private
     */
    function generateLineSymbol(style) {
        const stroke = style.stroke || {};
        const casing = style.casing || {};

        // Stratégie : afficher le casing comme contour/bordure du stroke
        // Si casing existe, utiliser la couleur du casing comme contour
        // et le stroke comme couleur principale
        const symbol = {
            type: "line",
            color: stroke.color || style.color || "#3388ff",
            width: stroke.widthPx || style.weight || 3,
            style: "solid" // Par défaut
        };

        // Si casing est activé, ajouter une bordure/outline fine
        // Limiter l'épaisseur pour la légende (réduit d'un facteur)
        if (casing.enabled && casing.color) {
            symbol.outlineColor = casing.color;
            // Utiliser une fraction de la largeur du casing pour la légende
            symbol.outlineWidth = Math.max(0.5, (casing.widthPx || 1) * 0.4);
            symbol.outlineOpacity = casing.opacity || 1;
        }

        // Appliquer l'opacité
        if (stroke.opacity !== undefined) {
            symbol.opacity = stroke.opacity;
        }

        // Support pour dashArray - passer la valeur complète
        const dashArray = style.dashArray || stroke.dashArray;
        if (dashArray) {
            symbol.dashArray = dashArray;
            // Garder le style pour la rétrocompatibilité
            if (dashArray === "5, 5" || dashArray === "10, 10") {
                symbol.style = "dashed";
            } else if (dashArray === "1, 3" || dashArray === "2, 4") {
                symbol.style = "dotted";
            }
        }

        return symbol;
    }

    /**
     * Génère un symbole pour les polygones
     * @param {Object} style - Style du polygone
     * @returns {Object} - Configuration du symbole
     * @private
     */
    function generatePolygonSymbol(style) {
        const fill = style.fill || {};
        const stroke = style.stroke || {};

        const symbol = {
            type: "polygon",
            fillColor: style.fillColor || style.color || fill.color || "#3388ff",
            color: style.color || stroke.color || "#333",
            weight: style.weight || stroke.widthPx || 1
        };

        // Appliquer l'opacité du fill (pas du stroke qui écrase)
        applyOpacityProperties(symbol, style, ['fillOpacity']);
        // Si pas de fillOpacity, prendre l'opacity directement du fill
        if (fill.opacity !== undefined) {
            symbol.opacity = fill.opacity;
        }
        // Puis vérifier style.opacity en dernier (peut être au niveau racine)
        if (style.opacity !== undefined) {
            symbol.opacity = style.opacity;
        }

        // Support pour dashArray sur le contour
        const dashArray = style.dashArray || stroke.dashArray;
        if (dashArray) {
            symbol.dashArray = dashArray;
        }

        // Support pour patterns de hachures
        if (style.fillPattern) {
            symbol.fillPattern = style.fillPattern;
        }

        // Support pour les hachures (format moderne)
        if (style.hatch) {
            symbol.hatch = style.hatch;
        }

        return symbol;
    }

    // Exposer le module
    GeoLeaf._LegendGenerator = {
        generateLegendFromStyle: generateLegendFromStyle,
        generateLegendItem: generateLegendItem
    };

})(window);
