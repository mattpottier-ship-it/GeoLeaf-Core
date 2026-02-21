/**
 * GeoLeaf GeoJSON Loader - Config Helpers
 * Accesseurs de configuration normalisée pour popup, tooltip et sidepanel.
 * Utilisé par popup-tooltip.js via l'import ESM de GeoJSONLoader.
 *
 * @module geojson/loader/config-helpers
 */
"use strict";

const Loader = {};

/**
 * Récupère la configuration des champs popup d'une couche.
 *
 * @param {Object} def - Définition de la couche (normalisée ou originale)
 * @returns {Array|null} - Array de configurations de champs ou null
 */
Loader.getPopupConfig = function(def) {
    if (!def) return null;

    // Structure normalisée (après passage dans loadProfile)
    if (def.popupFields && Array.isArray(def.popupFields)) {
        return def.popupFields;
    }

    // Structure originale (depuis config JSON)
    if (def.popup && def.popup.fields && Array.isArray(def.popup.fields)) {
        return def.popup.fields;
    }

    return null;
};

/**
 * Récupère la configuration des champs tooltip d'une couche.
 *
 * @param {Object} def - Définition de la couche (normalisée ou originale)
 * @returns {Array|null} - Array de configurations de champs ou null
 */
Loader.getTooltipConfig = function(def) {
    if (!def) return null;

    // Structure normalisée (après passage dans loadProfile)
    if (def.tooltipFields && Array.isArray(def.tooltipFields)) {
        return def.tooltipFields;
    }

    // Structure originale (depuis config JSON)
    if (def.tooltip && def.tooltip.fields && Array.isArray(def.tooltip.fields)) {
        return def.tooltip.fields;
    }

    return null;
};

/**
 * Récupère la configuration des champs sidepanel d'une couche.
 *
 * @param {Object} def - Définition de la couche (normalisée ou originale)
 * @returns {Array|null} - Array de configurations de champs ou null
 */
Loader.getSidepanelConfig = function(def) {
    if (!def) return null;

    // Structure normalisée (après passage dans loadProfile)
    if (def.sidepanelFields && Array.isArray(def.sidepanelFields)) {
        return def.sidepanelFields;
    }

    // Structure originale (depuis config JSON)
    if (def.sidepanel && def.sidepanel.detailLayout && Array.isArray(def.sidepanel.detailLayout)) {
        return def.sidepanel.detailLayout;
    }

    return null;
};

export { Loader as LoaderConfigHelpers };
