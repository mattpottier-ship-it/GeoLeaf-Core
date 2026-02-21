/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Popup & Tooltips
 * Gestion des popups rapides et tooltips sur les marqueurs.
 * Délègue le rendu au module _ContentBuilder centralisé.
 *
 * @module poi/popup
 * @version 2.0.0
 */
import { Log } from "../log/index.js";
import { Config } from "../config/config-primitives.js";
import { escapeHtml } from "../security/index.js";
import { resolveField as _resolveField } from "../utils/general-utils.js";
import { Assemblers } from "../ui/content-builder/assemblers.js";

// ========================================
//   UTILITAIRES LOCAUX
// ========================================

/**
 * Récupère le ContentBuilder (Assemblers).
 * Les fonctions buildPopupHTML / buildTooltipHTML sont sur le sous-module Assemblers.
 * @returns {Object|null}
 */
function getContentBuilder() {
    return Assemblers || null;
}

/**
 * Résout la valeur d'un champ à partir d'un objet POI.
 * Délègue à Utils.resolveField si disponible.
 *
 * @param {object} poi - Objet POI source.
 * @param {string} field - Chemin du champ (ex: "attributes.photo").
 * @returns {*} Valeur du champ ou null.
 */
function resolveField(poi, field) {
    if (!poi || !field) return null;

    if (_resolveField) {
        return _resolveField(poi, field);
    }

    // Fallback minimal
    const parts = field.split(".");
    let current = poi;
    for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
            current = current[part];
        } else {
            return null;
        }
    }
    return current;
}

// escapeHtml imported directly from security/index.js (A3 — DEAD-01)

// ========================================
//   CONFIGURATION
// ========================================

/**
 * Récupère la configuration de popup pour une couche/POI.
 *
 * @param {object} poi - Données du POI.
 * @returns {Array|null} Configuration detailPopup ou null.
 */
function getPopupConfig(poi) {
    // 1. Config attachée depuis la couche du POI
    if (poi._layerConfig?.popup?.detailPopup) {
        Log.info && Log.info("[POI Popup] Config popup depuis layerConfig");
        return poi._layerConfig.popup.detailPopup;
    }

    // 2. Fallback: profil actif
    if (Config && typeof Config.getActiveProfile === "function") {
        const profile = Config.getActiveProfile();

        // Chercher la config dans les emplacements standards
        if (profile?.popup?.detailPopup) {
            Log.info &&
                Log.info(
                    "[POI Popup] Config popup depuis profil actif (profile.popup.detailPopup)"
                );
            return profile.popup.detailPopup;
        }

        // ALTERNATIVE: Vérifier aussi dans panels.poi (ancienne structure)
        if (profile?.panels?.poi?.popup?.detailPopup) {
            Log.info &&
                Log.info(
                    "[POI Popup] Config popup depuis profil actif (profile.panels.poi.popup.detailPopup - ancienne structure)"
                );
            return profile.panels.poi.popup.detailPopup;
        }
    }

    Log.warn &&
        Log.warn(
            "[POI Popup] Aucune configuration detailPopup trouvée pour POI:",
            poi.id || "unknown"
        );
    return null;
}

/**
 * Récupère la configuration de tooltip pour une couche/POI.
 *
 * @param {object} poi - Données du POI.
 * @returns {Array|null} Configuration detailTooltip ou null.
 */
function getTooltipConfig(poi) {
    // 1. Config depuis popup.detailTooltip (structure standard)
    if (poi._layerConfig?.popup?.detailTooltip) {
        return poi._layerConfig.popup.detailTooltip;
    }

    // 2. Config depuis tooltip.detailTooltip
    if (poi._layerConfig?.tooltip?.detailTooltip) {
        return poi._layerConfig.tooltip.detailTooltip;
    }

    // 3. Config directe detailTooltip
    if (poi._layerConfig?.detailTooltip) {
        return poi._layerConfig.detailTooltip;
    }

    // 4. Fallback: profil actif
    if (Config && typeof Config.getActiveProfile === "function") {
        const profile = Config.getActiveProfile();
        if (profile?.popup?.detailTooltip) {
            return profile.popup.detailTooltip;
        }
    }

    return null;
}

// ========================================
//   CONSTRUCTION DU CONTENU
// ========================================

/**
 * Construit le contenu HTML d'un popup rapide pour un POI.
 * Utilise ContentBuilder si disponible, sinon logique interne.
 *
 * @param {object} poi - Données du POI.
 * @param {Function} resolveCategoryDisplay - Fonction pour résoudre l'affichage de catégorie.
 * @returns {string} HTML du popup.
 */
function buildQuickPopupContent(poi, resolveCategoryDisplay) {
    if (!poi) {
        Log.warn && Log.warn("[POI Popup] POI invalide");
        return "";
    }

    const config = getPopupConfig(poi);
    const ContentBuilder = getContentBuilder();

    // Si ContentBuilder disponible, déléguer
    if (ContentBuilder && typeof ContentBuilder.buildPopupHTML === "function") {
        return ContentBuilder.buildPopupHTML(poi, config, {
            resolveCategoryDisplay: resolveCategoryDisplay,
        });
    }

    // Fallback si ContentBuilder non chargé
    Log.warn && Log.warn("[POI Popup] ContentBuilder non disponible, fallback basique");
    return buildFallbackPopup(poi, config, resolveCategoryDisplay);
}

/**
 * Construit le contenu d'un tooltip pour un POI.
 * Utilise ContentBuilder si disponible.
 *
 * @param {object} poi - Données du POI.
 * @param {Function} resolveCategoryDisplay - Fonction pour résoudre l'affichage de catégorie.
 * @returns {string} HTML du tooltip.
 */
function buildTooltipContent(poi, resolveCategoryDisplay) {
    if (!poi) {
        Log.warn && Log.warn("[POI Tooltip] POI invalide");
        return "";
    }

    const config = getTooltipConfig(poi);
    const ContentBuilder = getContentBuilder();

    // Si ContentBuilder disponible, déléguer
    if (ContentBuilder && typeof ContentBuilder.buildTooltipHTML === "function") {
        return ContentBuilder.buildTooltipHTML(poi, config, {
            resolveCategoryDisplay: resolveCategoryDisplay,
        });
    }

    // Fallback si ContentBuilder non chargé
    return escapeHtml(
        resolveField(poi, "title") ||
            resolveField(poi, "label") ||
            resolveField(poi, "name") ||
            "POI"
    );
}

/**
 * Fallback pour construire un popup basique sans ContentBuilder.
 *
 * @param {object} poi - Données du POI.
 * @param {Array} _config - Configuration detailPopup (réservé pour usage futur).
 * @param {Function} _resolveCategoryDisplay - Fonction pour résoudre l'affichage de catégorie (réservé).
 * @returns {string} HTML du popup.
 */
function buildFallbackPopup(poi, _config, _resolveCategoryDisplay) {
    const title = escapeHtml(
        resolveField(poi, "title") ||
            resolveField(poi, "label") ||
            resolveField(poi, "name") ||
            "POI"
    );

    const description =
        resolveField(poi, "attributes.description") || resolveField(poi, "description") || "";

    let html = '<div class="gl-poi-popup">';
    html += '<div class="gl-poi-popup__body">';
    html +=
        '<h3 class="gl-poi-popup__title"><span class="gl-poi-popup__title-text">' +
        title +
        "</span></h3>";
    if (description) {
        html += '<p class="gl-poi-popup__desc">' + escapeHtml(description) + "</p>";
    }
    html +=
        '<a href="#" class="gl-poi-popup__link" data-poi-id="' +
        (poi.id || "") +
        '">Voir plus >>></a>';
    html += "</div></div>";

    return html;
}

// ========================================
//   ATTACHMENT LEAFLET
// ========================================

/**
 * Attache un tooltip à un marqueur Leaflet.
 *
 * @param {L.Marker} marker - Marqueur Leaflet.
 * @param {string} content - Contenu du tooltip (texte).
 * @param {object} options - Options du tooltip.
 */
function attachTooltip(marker, content, options) {
    if (!marker || typeof marker.bindTooltip !== "function") {
        Log.warn && Log.warn("[POI Popup] Marker invalide pour attachTooltip");
        return;
    }

    const defaultOptions = {
        direction: "top",
        offset: [0, -10],
        opacity: 0.9,
        className: "gl-poi-tooltip",
    };

    const finalOptions = Object.assign({}, defaultOptions, options || {});
    marker.bindTooltip(content, finalOptions);
}

/**
 * Gère le tooltip d'un marqueur selon la configuration.
 *
 * @param {L.Marker} marker - Marqueur Leaflet.
 * @param {object} poi - Données du POI.
 * @param {object} config - Configuration POI globale.
 * @param {Function} resolveCategoryDisplay - Fonction pour résoudre l'affichage de catégorie.
 */
function manageTooltip(marker, poi, config, resolveCategoryDisplay) {
    if (!marker || !poi) return;

    const tooltipMode = config?.tooltipMode || "hover"; // "hover", "permanent", "none"

    if (tooltipMode === "none") {
        return;
    }

    // Construire le contenu du tooltip
    const tooltipText = buildTooltipContent(poi, resolveCategoryDisplay);

    if (tooltipMode === "permanent") {
        attachTooltip(marker, tooltipText, { permanent: true });
    } else {
        attachTooltip(marker, tooltipText);
    }
}

/**
 * Attache un popup à un marqueur Leaflet.
 *
 * @param {L.Marker} marker - Marqueur Leaflet.
 * @param {string} content - Contenu HTML du popup.
 * @param {object} options - Options du popup.
 */
function attachPopup(marker, content, options) {
    if (!marker || typeof marker.bindPopup !== "function") {
        Log.error && Log.error("[POI Popup] Marker invalide ou pas de bindPopup");
        return;
    }

    const defaultOptions = {
        maxWidth: 300,
        minWidth: 200,
        className: "gl-poi-popup-leaflet",
        closeButton: true,
        autoPan: true,
    };

    const finalOptions = Object.assign({}, defaultOptions, options || {});
    marker.bindPopup(content, finalOptions);
}

// ========================================
//   EXPORT
// ========================================

const POIPopup = {
    // Construction de contenu
    buildQuickPopupContent,
    buildTooltipContent,

    // Gestion Leaflet
    attachTooltip,
    manageTooltip,
    attachPopup,

    // Configuration
    getPopupConfig,
    getTooltipConfig,
};

// ── ESM Export ──
export { POIPopup };
