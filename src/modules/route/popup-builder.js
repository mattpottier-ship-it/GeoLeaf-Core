/**
 * GeoLeaf Route Popup Builder Module
 * Construction des popups/tooltips et panneau latéral pour les itinéraires.
 * Délègue le rendu au module _ContentBuilder centralisé.
 *
 * @module route/popup-builder
 * @version 2.0.0
 */
"use strict";

import { Log } from "../log/index.js";
import { escapeHtml } from "../security/index.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

const RoutePopupBuilder = {};

// Perf 6.1.6: Module-level cache for taxonomy lookups (invalidated on profile change)
const _taxonomyCache = { profileId: null, categories: null, icons: null };

/**
 * Retourne le cache taxonomy, rafraîchi si le profil a changé
 * @returns {{ categories: Object, icons: Object }}
 * @private
 */
function _getTaxonomyCache() {
    const Config = _g.GeoLeaf.Config;
    if (!Config || typeof Config.getActiveProfile !== "function") {
        return { categories: {}, icons: {} };
    }
    const profile = Config.getActiveProfile() || {};
    const profileId = profile.id || null;
    if (_taxonomyCache.profileId !== profileId) {
        _taxonomyCache.profileId = profileId;
        _taxonomyCache.categories = profile?.taxonomy?.categories || {};
        _taxonomyCache.icons = profile?.icons || {};
    }
    return _taxonomyCache;
}

// ========================================
//   UTILITAIRES
// ========================================

/**
 * Récupère le ContentBuilder (Assemblers).
 * Les fonctions buildPopupHTML / buildTooltipHTML sont sur le sous-module Assemblers.
 * @returns {Object|null}
 */
function getContentBuilder() {
    return _g.GeoLeaf._ContentBuilder?.Assemblers || null;
}

/**
 * Récupère le Normalizer
 * @returns {Object|null}
 */
function getNormalizer() {
    return _g.GeoLeaf._Normalizer || null;
}

// escapeHtml imported directly from security/index.js (A3 — DEAD-01)

/**
 * Convertit une route en POI normalisé
 * @param {Object} route - Données de la route
 * @returns {Object} POI normalisé
 */
function convertRouteToPOI(route) {
    const Normalizer = getNormalizer();
    if (Normalizer && typeof Normalizer.normalizeFromRoute === "function") {
        return Normalizer.normalizeFromRoute(route);
    }

    // Fallback: conversion manuelle
    const attrs = route.attributes || {};
    return {
        id: route.id,
        sourceType: "route",
        geometryType: "LineString",
        title: route.label || route.name || "Itinéraire",
        description: attrs.description || route.description || "",
        lat: null,
        lng: null,
        categoryId: attrs.categoryId || null,
        subCategoryId: attrs.subCategoryId || null,
        attributes: {
            ...attrs,
            label: route.label || route.name,
            photo: attrs.photo,
            distance_km: attrs.distance_km,
            duration_min: attrs.duration_min,
            difficulty: attrs.difficulty,
            tags: attrs.tags,
        },
        rawData: route,
    };
}

// ========================================
//   CONFIGURATION
// ========================================

/**
 * Récupère la configuration de popup pour les routes
 * @returns {Array|null}
 */
function getRoutePopupConfig() {
    const Config = _g.GeoLeaf.Config;
    if (Config && typeof Config.getActiveProfile === "function") {
        const profile = Config.getActiveProfile();
        if (profile?.panels?.route?.popup?.detailPopup) {
            return profile.panels.route.popup.detailPopup;
        }
    }
    return null;
}

/**
 * Récupère la configuration du layout pour le side panel des routes
 * @returns {Array|null}
 */
function getRouteLayoutConfig() {
    const Config = _g.GeoLeaf.Config;
    if (Config && typeof Config.getActiveProfile === "function") {
        const profile = Config.getActiveProfile();
        if (profile?.panels?.route?.layout) {
            return profile.panels.route.layout;
        }
    }
    return null;
}

// ========================================
//   TOOLTIP
// ========================================

/**
 * Ajoute un tooltip à une polyline d'itinéraire
 * @param {L.Polyline} polyline - Polyline Leaflet
 * @param {Object} route - Données de l'itinéraire
 */
RoutePopupBuilder.addRouteTooltip = function (polyline, route) {
    const label = route.label || route.name || "Itinéraire";

    polyline.bindTooltip(escapeHtml(label), {
        sticky: true,
        className: "gl-route-tooltip",
    });
};

// ========================================
//   POPUP
// ========================================

/**
 * Ajoute un popup à une polyline d'itinéraire
 * @param {L.Polyline} polyline - Polyline Leaflet
 * @param {Object} route - Données de l'itinéraire
 * @param {Object} _routeModule - Référence au module GeoLeaf.Route (réservé pour usage futur)
 */
RoutePopupBuilder.addRoutePopup = function (polyline, route, _routeModule) {
    const popupContent = RoutePopupBuilder.buildRoutePopupContent(route);
    polyline.bindPopup(popupContent, { maxWidth: 300 });

    // Attacher le handler pour le bouton "Voir plus"
    polyline.on("popupopen", () => {
        Log.info && Log.info("[Route Popup] Popup opened for route:", route.id);
        setTimeout(() => {
            const selector = '.gl-poi-popup__link[data-route-id="' + route.id + '"]';
            const linkEl = document.querySelector(selector);
            if (linkEl && !linkEl._geoleafClickBound) {
                linkEl._geoleafClickBound = true;
                linkEl.addEventListener("click", (e) => {
                    e.preventDefault();
                    RoutePopupBuilder.openRouteSidePanel(route);
                });
            }
        }, 50);
    });
};

/**
 * Construit le contenu HTML d'un popup pour une route
 * @param {Object} route - Données de l'itinéraire
 * @returns {string} Contenu HTML
 */
RoutePopupBuilder.buildRoutePopupContent = function (route) {
    const ContentBuilder = getContentBuilder();
    const config = getRoutePopupConfig();
    const routeAsPoi = convertRouteToPOI(route);

    // Utiliser ContentBuilder si disponible et configuré
    if (ContentBuilder && typeof ContentBuilder.buildPopupHTML === "function" && config) {
        return ContentBuilder.buildPopupHTML(routeAsPoi, config, {
            resolveCategoryDisplay: null,
        });
    }

    // Fallback: construction manuelle du popup
    return buildFallbackRoutePopup(route);
};

/**
 * Construit un popup de route par défaut (fallback)
 * @param {Object} route - Données de l'itinéraire
 * @returns {string} HTML du popup
 */
function buildFallbackRoutePopup(route) {
    const attrs = route.attributes || {};
    const label = escapeHtml(route.label || route.name || "Itinéraire");
    const description = escapeHtml(attrs.description || route.description || "");
    const photo = attrs.photo || route.photo || null;
    const routeId = escapeHtml(String(route.id || ""));

    // Résolution des icônes depuis la taxonomie (Perf 6.1.6: cache module-level)
    const categoryId = attrs.categoryId || null;
    const subCategoryId = attrs.subCategoryId || null;

    const taxCache = _getTaxonomyCache();
    const categories = taxCache.categories;
    const iconsConfig = taxCache.icons;
    const catData = categoryId ? categories[categoryId] : null;
    const subCatData = catData && subCategoryId ? catData.subcategories?.[subCategoryId] : null;

    const iconId =
        subCatData?.icon || catData?.icon || iconsConfig.defaultIcon || "activity-generic";
    const colorFill = subCatData?.colorFill || catData?.colorFill || "#666666";
    const colorStroke = subCatData?.colorStroke || catData?.colorStroke || "#222222";

    // Construction de l'icône
    let iconHtml = "";
    if (iconId) {
        const iconPrefix = iconsConfig.symbolPrefix || "gl-poi-cat-";
        const iconIdNormalized = String(iconId).trim().toLowerCase().replace(/\s+/g, "-");
        const symbolId = iconPrefix + iconIdNormalized;

        iconHtml =
            '<svg class="gl-poi-popup__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">' +
            '<circle cx="12" cy="12" r="10" fill="' +
            colorFill +
            '" stroke="' +
            colorStroke +
            '" stroke-width="1.5"/>' +
            '<svg x="4" y="4" width="16" height="16"><use href="#' +
            symbolId +
            '" style="color: #ffffff"/></svg>' +
            "</svg>";
    }

    // Métadonnées (distance, durée, difficulté)
    let metaText = "";
    const metaItems = [];
    if (attrs.distance_km) {
        metaItems.push("📏 " + attrs.distance_km + " km");
    }
    if (attrs.duration_min) {
        metaItems.push("⏱️ " + attrs.duration_min + " min");
    }
    if (attrs.difficulty) {
        const diffLabels = { easy: "Facile", medium: "Moyen", hard: "Difficile" };
        metaItems.push("⚡ " + (diffLabels[attrs.difficulty] || attrs.difficulty));
    }
    if (metaItems.length > 0) {
        metaText = '<p class="gl-poi-popup__meta-text">' + metaItems.join(" • ") + "</p>";
    }

    // Tags
    const tagBadges = [];
    if (Array.isArray(attrs.tags)) {
        attrs.tags.forEach((tag) => {
            if (tag && typeof tag === "string") {
                tagBadges.push(
                    '<span class="gl-poi-badge gl-poi-badge--tag">' + escapeHtml(tag) + "</span>"
                );
            }
        });
    }

    // Construction du popup
    return (
        '<div class="gl-poi-popup">' +
        (photo
            ? '<div class="gl-poi-popup__photo"><img src="' +
              photo +
              '" alt="' +
              label +
              '" /></div>'
            : "") +
        '<div class="gl-poi-popup__body">' +
        '<div class="gl-poi-popup__title-wrapper">' +
        '<h3 class="gl-poi-popup__title">' +
        iconHtml +
        '<span class="gl-poi-popup__title-text">' +
        label +
        "</span></h3>" +
        "</div>" +
        (description ? '<p class="gl-poi-popup__desc">' + description + "</p>" : "") +
        metaText +
        (tagBadges.length
            ? '<div class="gl-poi-popup__badges">' + tagBadges.join("") + "</div>"
            : "") +
        '<a class="gl-poi-popup__link" href="#" data-route-id="' +
        routeId +
        '">Voir plus >>></a>' +
        "</div>" +
        "</div>"
    );
}

// ========================================
//   SIDE PANEL
// ========================================

/**
 * Ouvre le panneau latéral avec les détails d'un itinéraire
 * @param {Object} route - Données de l'itinéraire
 */
RoutePopupBuilder.openRouteSidePanel = function (route) {
    // Vérifier que le module POI est disponible
    if (!_g.GeoLeaf.POI || typeof _g.GeoLeaf.POI.openSidePanelWithLayout !== "function") {
        Log.warn &&
            Log.warn(
                "[Route Popup] Cannot open side panel: POI.openSidePanelWithLayout not available"
            );
        return;
    }

    const attrs = route.attributes || {};
    const layout = getRouteLayoutConfig();

    // Construire les métadonnées
    const metadata = [];
    if (attrs.distance_km) {
        metadata.push("📏 Distance : " + attrs.distance_km + " km");
    }
    if (attrs.duration_min) {
        metadata.push("⏱️ Durée : " + attrs.duration_min + " minutes");
    }
    if (attrs.difficulty) {
        const diffLabels = { easy: "Facile", medium: "Moyen", hard: "Difficile" };
        metadata.push("⚡ Difficulté : " + (diffLabels[attrs.difficulty] || attrs.difficulty));
    }

    // Transformer la route en structure POI pour le rendu
    const routeAsPoi = {
        id: route.id,
        label: route.label || route.name,
        title: route.label || route.name,
        name: route.label || route.name,
        description: attrs.description || route.description,
        attributes: {
            ...attrs,
            metadata: metadata.length > 0 ? metadata : null,
            photo: attrs.photo,
            mainImage: attrs.photo,
            description: attrs.description,
            shortDescription: attrs.description,
            description_long: attrs.description_long,
            longDescription: attrs.description_long,
            categoryId: attrs.categoryId,
            subCategoryId: attrs.subCategoryId,
            difficulty: attrs.difficulty,
            distance_km: attrs.distance_km,
            duration_min: attrs.duration_min,
            tags: attrs.tags,
            link: attrs.link,
        },
    };

    // Ouvrir le panneau latéral
    _g.GeoLeaf.POI.openSidePanelWithLayout(routeAsPoi, layout);
};

export { RoutePopupBuilder };
