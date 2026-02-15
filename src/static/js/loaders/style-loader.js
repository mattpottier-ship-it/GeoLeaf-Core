/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @fileoverview Chargeur centralisé de styles GeoLeaf
 * Gère le chargement, la validation et le cache des fichiers style.json
 * Supporte les labels intégrés et la détection automatique
 * @module loaders/style-loader
 */

(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};

/**
 * Cache en mémoire des styles chargés
 * Clé: "profileId:layerId:styleId"
 * Valeur: { styleData, labelConfig, timestamp }
 */
const styleCache = new Map();

/**
 * Configuration du loader
 */
let loaderConfig = {
    debug: false,
    validateOnLoad: true,
    throwOnValidationError: true
};

function getProfilesBasePath() {
    const cfg = GeoLeaf.Config;

    if (cfg && typeof cfg.get === "function") {
        const configured = cfg.get("data.profilesBasePath", "profiles");
        if (typeof configured === "string" && configured.trim().length > 0) {
            return configured.endsWith("/") ? configured.slice(0, -1) : configured;
        }
    }

    return "profiles";
}

/**
 * Initialise le style loader avec la configuration GeoLeaf
 * @param {Object} config - Configuration GeoLeaf (doit contenir { debug: boolean })
 */
function initStyleLoader(config = {}) {
    loaderConfig.debug = config.debug === true;

    if (loaderConfig.debug) {
        console.log('[StyleLoader] Mode debug activé - cache désactivé');
    }
}

/**
 * Charge et valide un fichier de style
 * @param {string} profileId - ID du profil
 * @param {string} layerId - ID de la couche
 * @param {string} styleId - ID du style
 * @param {string} styleFileName - Nom du fichier de style (ex: "default.json")
 * @param {string} layerDirectory - Répertoire de la couche (ex: "layers/tourism_poi_all")
 * @returns {Promise<Object>} Style chargé et validé avec labels extraits
 * @throws {Error} Si le fichier est invalide ou introuvable
 */
async function loadAndValidateStyle(profileId, layerId, styleId, styleFileName, layerDirectory) {
    const cacheKey = `${profileId}:${layerId}:${styleId}`;

    // Vérifier le cache (sauf en mode debug)
    if (!loaderConfig.debug && styleCache.has(cacheKey)) {
        const cached = styleCache.get(cacheKey);
        console.log(`[StyleLoader] Style chargé depuis le cache: ${cacheKey}`);
        return cached;
    }

    try {
        // Construire le chemin du fichier de style
        const profilesBasePath = getProfilesBasePath();
        const stylePath = `${profilesBasePath}/${profileId}/${layerDirectory}/styles/${styleFileName}`;

        console.log(`[StyleLoader] Chargement du style: ${stylePath}`);

        // Charger le fichier JSON
        const response = await fetch(stylePath);

        if (!response.ok) {
            throw new Error(
                `Impossible de charger le fichier de style: ${stylePath}\n` +
                `HTTP ${response.status}: ${response.statusText}`
            );
        }

        let styleData;
        try {
            styleData = await response.json();
        } catch (jsonError) {
            // Erreur de parsing JSON - format détaillé
            const errorContext = {
                profileId,
                layerId,
                styleId,
                stylePath,
                httpStatus: response.status,
                parseError: jsonError.message
            };

            console.error('═══════════════════════════════════════════════════════');
            console.error('❌ ERREUR DE PARSING JSON - FICHIER STYLE MALFORMÉ');
            console.error('═══════════════════════════════════════════════════════');
            console.error(`Fichier: ${stylePath}`);
            console.error(`Erreur: ${jsonError.message}`);
            console.error('Contexte:', JSON.stringify(errorContext, null, 2));
            console.error('Stack trace:', jsonError.stack);
            console.error('═══════════════════════════════════════════════════════');

            throw new Error(
                `Le fichier de style contient du JSON malformé: ${stylePath}\n` +
                `Erreur de parsing: ${jsonError.message}\n` +
                `Veuillez vérifier la syntaxe JSON du fichier.`
            );
        }

        // VALIDATION STRICTE: Ajouter visibleByDefault si manquant et label.enabled: true
        if (styleData.label && styleData.label.enabled === true) {
            if (styleData.label.visibleByDefault === undefined) {
                // Fallback automatique à false
                styleData.label.visibleByDefault = false;
                console.warn(
                    `[StyleLoader] ⚠️ Paramètre "visibleByDefault" manquant dans le style: ${stylePath}\n` +
                    `Le style a "label.enabled: true" mais pas de "visibleByDefault".\n` +
                    `Fallback appliqué: visibleByDefault = false\n` +
                    `Ajoutez explicitement "visibleByDefault": false ou true dans le fichier de style.`
                );
            }
        }

        // Valider le style contre le schéma
        if (loaderConfig.validateOnLoad) {
            const StyleValidator = GeoLeaf._StyleValidator;
            if (!StyleValidator) {
                console.warn('[StyleLoader] GeoLeaf._StyleValidator non disponible, validation ignorée');
            }

            const validationResult = StyleValidator ? StyleValidator.validateStyle(styleData, {
                profileId,
                layerId,
                styleId,
                stylePath
            }) : { valid: true, errors: [], warnings: [] };

            if (!validationResult.valid) {
                const errorMessage = StyleValidator ? StyleValidator.formatValidationErrors(validationResult, stylePath) : 'Erreurs de validation';
                console.error(errorMessage);

                if (loaderConfig.throwOnValidationError) {
                    throw new Error(
                        `Le fichier de style ne respecte pas le schéma GeoLeaf: ${stylePath}\n` +
                        `Consultez la console pour les détails des erreurs.`
                    );
                }
            }

            // Afficher les avertissements même si validation OK
            if (validationResult.warnings.length > 0) {
                console.warn(`[StyleLoader] ${validationResult.warnings.length} avertissement(s) pour ${stylePath}:`);
                validationResult.warnings.forEach(warning => {
                    console.warn(`  - ${warning.field}: ${warning.message}`);
                });
            }
        }

        // Extraire la configuration de labels intégrés
        const labelConfig = extractLabelConfig(styleData);

        // Préparer l'objet de retour
        const result = {
            styleData,
            labelConfig,
            metadata: {
                profileId,
                layerId,
                styleId,
                stylePath,
                hasIntegratedLabels: labelConfig !== null,
                loadedAt: new Date().toISOString()
            }
        };

        // Mettre en cache (sauf en mode debug)
        if (!loaderConfig.debug) {
            styleCache.set(cacheKey, result);
        }

        console.log(
            `[StyleLoader] Style chargé avec succès: ${styleId}` +
            (labelConfig ? ' (avec labels intégrés)' : '')
        );

        return result;

    } catch (error) {
        // Re-throw les erreurs avec contexte complet
        if (error.message.includes('JSON malformé') || error.message.includes('schéma GeoLeaf')) {
            throw error;
        }

        // Erreur réseau ou autre
        const errorContext = {
            profileId,
            layerId,
            styleId,
            styleFileName,
            layerDirectory,
            originalError: error.message
        };

        console.error('═══════════════════════════════════════════════════════');
        console.error('❌ ERREUR DE CHARGEMENT DE STYLE');
        console.error('═══════════════════════════════════════════════════════');
        console.error('Contexte:', JSON.stringify(errorContext, null, 2));
        console.error('Stack trace:', error.stack);
        console.error('═══════════════════════════════════════════════════════');

        throw error;
    }
}

/**
 * Extrait la configuration de labels depuis un style chargé
 * Détecte automatiquement si les labels sont intégrés dans le style
 * @param {Object} styleData - Données du style
 * @returns {Object|null} Configuration de labels ou null si absents/désactivés
 */
function extractLabelConfig(styleData) {
    if (!styleData || typeof styleData !== 'object') {
        return null;
    }

    // Vérifier si le champ label est un objet de configuration
    if (styleData.label && typeof styleData.label === 'object' && styleData.label !== null) {
        // Vérifier que enabled est true
        if (styleData.label.enabled === true) {
            return {
                ...styleData.label,
                isIntegrated: true
            };
        }
    }

    // Pas de labels intégrés ou désactivés
    return null;
}

/**
 * Charge un style avec gestion simplifiée (sans validation stricte)
 * Utilisé pour les cas où on veut charger même si validation échoue
 * @param {string} profileId - ID du profil
 * @param {string} layerId - ID de la couche
 * @param {string} styleId - ID du style
 * @param {string} styleFileName - Nom du fichier
 * @param {string} layerDirectory - Répertoire de la couche
 * @returns {Promise<Object>} Style chargé (peut contenir des erreurs)
 */
async function loadStyleLenient(profileId, layerId, styleId, styleFileName, layerDirectory) {
    const previousThrowSetting = loaderConfig.throwOnValidationError;
    loaderConfig.throwOnValidationError = false;

    try {
        return await loadAndValidateStyle(profileId, layerId, styleId, styleFileName, layerDirectory);
    } finally {
        loaderConfig.throwOnValidationError = previousThrowSetting;
    }
}

/**
 * Précharge plusieurs styles en parallèle
 * @param {Array<Object>} styleConfigs - Tableau de { profileId, layerId, styleId, styleFileName, layerDirectory }
 * @returns {Promise<Array<Object>>} Résultats de chargement
 */
async function preloadStyles(styleConfigs) {
    console.log(`[StyleLoader] Préchargement de ${styleConfigs.length} style(s)...`);

    const promises = styleConfigs.map(config =>
        loadAndValidateStyle(
            config.profileId,
            config.layerId,
            config.styleId,
            config.styleFileName,
            config.layerDirectory
        ).catch(error => ({
            error: true,
            message: error.message,
            config
        }))
    );

    const results = await Promise.all(promises);

    const successCount = results.filter(r => !r.error).length;
    const errorCount = results.filter(r => r.error).length;

    console.log(`[StyleLoader] Préchargement terminé: ${successCount} succès, ${errorCount} erreurs`);

    return results;
}

/**
 * Efface le cache des styles
 * @param {string} [cacheKey] - Clé spécifique à effacer (optionnel, sinon tout le cache)
 */
function clearStyleCache(cacheKey = null) {
    if (cacheKey) {
        styleCache.delete(cacheKey);
        console.log(`[StyleLoader] Cache effacé pour: ${cacheKey}`);
    } else {
        const count = styleCache.size;
        styleCache.clear();
        console.log(`[StyleLoader] Cache complet effacé (${count} entrée(s))`);
    }
}

/**
 * Obtient les statistiques du cache
 * @returns {Object} Statistiques { size, keys, debug }
 */
function getCacheStats() {
    return {
        size: styleCache.size,
        keys: Array.from(styleCache.keys()),
        debug: loaderConfig.debug,
        cacheEnabled: !loaderConfig.debug
    };
}

/**
 * Charge un style depuis une configuration de couche
 * Détecte automatiquement les références obsolètes à styleFile
 * @param {string} profileId - ID du profil
 * @param {Object} layerConfig - Configuration de la couche
 * @param {string} styleIdOrFileName - ID du style ou nom de fichier
 * @returns {Promise<Object>} Style chargé
 */
async function loadStyleFromLayerConfig(profileId, layerConfig, styleIdOrFileName) {
    const layerId = layerConfig.id;
    const layerDirectory = layerConfig._layerDirectory || `layers/${layerId}`;

    // Vérifier si styleFile est présent dans labels (configuration obsolète)
    if (layerConfig.labels && layerConfig.labels.styleFile) {
        const errorMessage =
            `❌ CONFIGURATION OBSOLÈTE DÉTECTÉE\n` +
            `═══════════════════════════════════════════════════════\n` +
            `La couche "${layerId}" utilise une référence obsolète à un fichier\n` +
            `de labels séparé via "labels.styleFile".\n\n` +
            `GeoLeaf ne supporte plus les fichiers de labels séparés (styleLabel.json).\n` +
            `Les labels doivent être intégrés dans les fichiers de style.\n\n` +
            `Valeur détectée: ${layerConfig.labels.styleFile}\n` +
            `Profil: ${profileId}\n` +
            `Couche: ${layerId}\n\n` +
            `Action requise:\n` +
            `1. Supprimez la propriété "labels.styleFile" de la configuration\n` +
            `2. Intégrez les labels dans les fichiers de style (propriété "label")\n` +
            `3. Consultez docs/STYLE_FORMAT_SPEC.md pour la syntaxe\n` +
            `═══════════════════════════════════════════════════════`;

        console.error(errorMessage);
        throw new Error(`Configuration obsolète: labels.styleFile détecté dans la couche ${layerId}`);
    }

    // Trouver le fichier de style dans styles.available
    let styleFileName = styleIdOrFileName;
    let styleId = styleIdOrFileName;

    if (layerConfig.styles && layerConfig.styles.available) {
        const styleConfig = layerConfig.styles.available.find(s => s.id === styleIdOrFileName || s.file === styleIdOrFileName);
        if (styleConfig) {
            styleFileName = styleConfig.file;
            styleId = styleConfig.id;
        }
    }

    return loadAndValidateStyle(profileId, layerId, styleId, styleFileName, layerDirectory);
}

/**
 * Construit le chemin complet d'un fichier de style
 * @param {string} profileId - ID du profil
 * @param {string} layerDirectory - Répertoire de la couche
 * @param {string} styleFileName - Nom du fichier
 * @returns {string} Chemin complet
 */
function getStylePath(profileId, layerDirectory, styleFileName) {
    return `profiles/${profileId}/${layerDirectory}/styles/${styleFileName}`;
}

/**
 * Module Style Loader
 * Expose toutes les fonctions publiques
 */
const StyleLoader = {
    initStyleLoader,
    loadAndValidateStyle,
    extractLabelConfig,
    loadStyleLenient,
    preloadStyles,
    clearStyleCache,
    getCacheStats,
    loadStyleFromLayerConfig,
    getStylePath,
    styleCache // Export pour tests/debugging
};

// Exposer le module
GeoLeaf._StyleLoader = StyleLoader;

})(window);
