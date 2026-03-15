/* eslint-disable security/detect-object-injection */
declare const _L: any;
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Popup & Tooltips
 * Gestion des popups rapides et tooltips sur the markers.
 * Delegates the render au module _ContentBuilder centralized.
 *
 * @module poi/popup
 * @version 2.0.0
 */
import { Log } from "../log/index.js";
import { Config } from "../config/config-primitives.js";
import { escapeHtml } from "../security/index.js";
import { resolveField as _resolveField } from "../utils/general-utils.js";
import { Assemblers } from "../ui/content-builder/assemblers.ts";

// ========================================
//   UTILITAIRES LOCAUX
// ========================================

/**
 * Retrieves the ContentBuilder (Assemblers).
 * Les fonctions buildPopupHTML / buildTooltipHTML sont sur le sous-module Assemblers.
 * @returns {Object|null}
 */
function getContentBuilder() {
    return Assemblers || null;
}

/**
 * Resolves the value of a field to partir d'an object POI.
 * Delegates to Utils.resolveField si available.
 *
 * @param {object} poi - Object POI source.
 * @param {string} field - Path du field (ex: "attributes.photo").
 * @returns {*} Value du field ou null.
 */
function resolveField(poi: any, field: any) {
    if (!poi || !field) return null;

    if (_resolveField) {
        return _resolveField(poi, field);
    }

    // Fallback minimum
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
 * Retrieves the configuration de popup pour a layer/POI.
 *
 * @param {object} poi - Data du POI.
 * @returns {Array|null} Configuration detailPopup ou null.
 */
function getPopupConfig(poi: any) {
    // 1. Config attached from the layer du POI
    if (poi._layerConfig?.popup?.detailPopup) {
        Log?.info("[POI Popup] Config popup from layerConfig");
        return poi._layerConfig.popup.detailPopup;
    }

    // 2. Fallback: profile active
    if (Config && typeof (Config as any).getActiveProfile === "function") {
        const profile = (Config as any).getActiveProfile();

        // Chercher la config in thes emplacements standards
        if (profile?.popup?.detailPopup) {
            Log?.info("[POI Popup] Config popup from profile actif (profile.popup.detailPopup)");
            return profile.popup.detailPopup;
        }

        // ALTERNATIVE: Check aussi dans panels.poi (old structure)
        if (profile?.panels?.poi?.popup?.detailPopup) {
            Log?.info(
                "[POI Popup] Config popup from profile actif (profile.panels.poi.popup.detailPopup - old structure)"
            );
            return profile.panels.poi.popup.detailPopup;
        }
    }

    Log?.warn("[POI Popup] No detailPopup configuration found for POI:", poi.id || "unknown");
    return null;
}

/**
 * Retrieves the configuration de tooltip pour a layer/POI.
 *
 * @param {object} poi - Data du POI.
 * @returns {Array|null} Configuration detailTooltip ou null.
 */
function getTooltipConfig(poi: any) {
    // 1. Config from popup.detailTooltip (structure standard)
    if (poi._layerConfig?.popup?.detailTooltip) {
        return poi._layerConfig.popup.detailTooltip;
    }

    // 2. Config from tooltip.detailTooltip
    if (poi._layerConfig?.tooltip?.detailTooltip) {
        return poi._layerConfig.tooltip.detailTooltip;
    }

    // 3. Config directe detailTooltip
    if (poi._layerConfig?.detailTooltip) {
        return poi._layerConfig.detailTooltip;
    }

    // 4. Fallback: profile active
    if (Config && typeof (Config as any).getActiveProfile === "function") {
        const profile = (Config as any).getActiveProfile();
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
 * Builds the contenu HTML of a popup rapide for a POI.
 * Utilise ContentBuilder si available, sinon logical internal.
 *
 * @param {object} poi - Data du POI.
 * @param {Function} resolveCategoryDisplay - Fonction pour resolve l'display de category.
 * @returns {string} HTML du popup.
 */
function buildQuickPopupContent(poi: any, resolveCategoryDisplay: any) {
    if (!poi) {
        Log.warn && Log.warn("[POI Popup] POI invalide");
        return "";
    }

    const config = getPopupConfig(poi);
    const ContentBuilder = getContentBuilder();

    // Si ContentBuilder available, delegate
    if (ContentBuilder && typeof ContentBuilder.buildPopupHTML === "function") {
        return ContentBuilder.buildPopupHTML(poi, config, {
            resolveCategoryDisplay: resolveCategoryDisplay,
        });
    }

    // Fallback si ContentBuilder non loaded
    Log.warn && Log.warn("[POI Popup] ContentBuilder non disponible, fallback basique");
    return buildFallbackPopup(poi, config, resolveCategoryDisplay);
}

/**
 * Builds the contenu of a tooltip for a POI.
 * Utilise ContentBuilder si available.
 *
 * @param {object} poi - Data du POI.
 * @param {Function} resolveCategoryDisplay - Fonction pour resolve l'display de category.
 * @returns {string} HTML du tooltip.
 */
function buildTooltipContent(poi: any, resolveCategoryDisplay: any) {
    if (!poi) {
        Log.warn && Log.warn("[POI Tooltip] POI invalide");
        return "";
    }

    const config = getTooltipConfig(poi);
    const ContentBuilder = getContentBuilder();

    // Si ContentBuilder available, delegate
    if (ContentBuilder && typeof ContentBuilder.buildTooltipHTML === "function") {
        return ContentBuilder.buildTooltipHTML(poi, config, {
            resolveCategoryDisplay: resolveCategoryDisplay,
        });
    }

    // Fallback si ContentBuilder non loaded
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
 * @param {object} poi - Data du POI.
 * @param {Array} _config - Configuration detailPopup (reserved pour usage futur).
 * @param {Function} _resolveCategoryDisplay - Fonction pour resolve l'display de category (reserved).
 * @returns {string} HTML du popup.
 */
function buildFallbackPopup(poi: any, _config: any, _resolveCategoryDisplay: any) {
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
 * Attache un tooltip to a marker Leaflet.
 *
 * @param {L.Marker} marker - Marqueur Leaflet.
 * @param {string} content - Contenu du tooltip (text).
 * @param {object} options - Options du tooltip.
 */
function attachTooltip(marker: any, content: any, options: any) {
    if (!marker || typeof marker.bindTooltip !== "function") {
        Log.warn && Log.warn("[POI Popup] Invalid marker for attachTooltip");
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
 * Manages the tooltip d'a marker based on the configuration.
 *
 * @param {L.Marker} marker - Marqueur Leaflet.
 * @param {object} poi - Data du POI.
 * @param {object} config - Configuration POI globale.
 * @param {Function} resolveCategoryDisplay - Fonction pour resolve l'display de category.
 */
function manageTooltip(marker: any, poi: any, config: any, resolveCategoryDisplay: any) {
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
        attachTooltip(marker, tooltipText, undefined);
    }
}

/**
 * Attache un popup to a marker Leaflet.
 *
 * @param {L.Marker} marker - Marqueur Leaflet.
 * @param {string} content - Contenu HTML du popup.
 * @param {object} options - Options du popup.
 */
function attachPopup(marker: any, content: any, options: any) {
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
    // Building de contenu
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
