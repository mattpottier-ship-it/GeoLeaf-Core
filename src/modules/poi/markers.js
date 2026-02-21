/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Markers
 * Création et gestion des marqueurs Leaflet pour les POI
 */
import { Log } from '../log/index.js';
import { Config } from '../config/config-primitives.js';
import { POIShared } from './shared.js';
import { POINormalizers } from './normalizers.js';
import { POIPopup } from './popup.js';
import { StyleResolver } from '../helpers/style-resolver.js';
import { POICoreContract } from '../../contracts/poi-core.contract.js';




// Références aux modules POI





/**
 * Obtient la configuration de base des POI depuis le profil actif.
 *
 * @returns {object} Configuration de base { radius, weight, colorFill, colorStroke, fillOpacity, opacity, showIconsOnMap }.
 */
function getPoiBaseConfig() {
    const base = {
        radius: 6,
        weight: 1.5,
        colorFill: "#4a90e5",
        colorStroke: "#ffffff",
        fillOpacity: 0.8,
        opacity: 0.9,
        showIconsOnMap: true
    };

    try {
        if (Config && typeof Config.getActiveProfile === "function") {
            const activeProfile = Config.getActiveProfile();
            const poiCfg =
                activeProfile &&
                activeProfile.appearance &&
                activeProfile.appearance.poi;

            if (poiCfg) {
                if (typeof poiCfg.radius === "number") base.radius = poiCfg.radius;
                if (typeof poiCfg.weight === "number") base.weight = poiCfg.weight;
                if (typeof poiCfg.fillOpacity === "number") base.fillOpacity = poiCfg.fillOpacity;
                if (typeof poiCfg.opacity === "number") base.opacity = poiCfg.opacity;
                if (typeof poiCfg.showIconsOnMap === "boolean") base.showIconsOnMap = poiCfg.showIconsOnMap;

                if (typeof poiCfg.colorFill === "string") {
                    base.colorFill = poiCfg.colorFill;
                }
                if (typeof poiCfg.colorStroke === "string") {
                    base.colorStroke = poiCfg.colorStroke;
                }
            }
        }

        // Fallback sur variables CSS
        if (typeof document !== "undefined" && typeof window !== "undefined" && window.getComputedStyle) {
            const root = getComputedStyle(document.documentElement);
            const fillCss = root.getPropertyValue("--gl-color-poi-fill-default").trim();
            const strokeCss = root.getPropertyValue("--gl-color-poi-stroke-default").trim();
            if (fillCss && !base.colorFill) base.colorFill = fillCss;
            if (strokeCss && !base.colorStroke) base.colorStroke = strokeCss;
        }
    } catch (err) {
        if (Log) Log.warn("[POI] getPoiBaseConfig() : Erreur lecture config :", err);
    }

    return base;
}

/**
 * Résout les couleurs d'un POI depuis category.style.json du profil actif.
 * Ordre de priorité des couleurs :
 * 1. Style de la couche (poi._layerConfig.style)
 * 2. Style de catégorie (category.style.json)
 * 3. Style par défaut (baseConfig)
 *
 * @param {object} poi - Données du POI.
 * @param {object} baseConfig - Configuration de base avec couleurs par défaut
 * @returns {object} { colorFill, colorStroke, colorRoute, weight, radius, fillOpacity, opacity }
 */
function resolveCategoryColors(poi, baseConfig) {
    const colors = {
        colorFill: baseConfig.colorFill,
        colorStroke: baseConfig.colorStroke,
        colorRoute: null,
        weight: baseConfig.weight,
        radius: baseConfig.radius,
        fillOpacity: baseConfig.fillOpacity !== undefined ? baseConfig.fillOpacity : null,
        opacity: baseConfig.opacity !== undefined ? baseConfig.opacity : null
    };

    // 1. Appliquer d'abord le style de la couche si disponible
    if (poi._layerConfig && poi._layerConfig.style) {
        const layerStyle = poi._layerConfig.style;
        if (layerStyle.fillColor) colors.colorFill = layerStyle.fillColor;
        if (layerStyle.color) colors.colorStroke = layerStyle.color;
        if (typeof layerStyle.weight === 'number') colors.weight = layerStyle.weight;
        if (typeof layerStyle.radius === 'number') colors.radius = layerStyle.radius;
        if (typeof layerStyle.fillOpacity === 'number') colors.fillOpacity = layerStyle.fillOpacity;
        if (typeof layerStyle.opacity === 'number') colors.opacity = layerStyle.opacity;
    }

    // 2. Appliquer ensuite les couleurs depuis les styleRules de la couche
    if (StyleResolver) {
        const styleColors = StyleResolver.resolvePoiColors(poi);
        if (styleColors.colorFill) colors.colorFill = styleColors.colorFill;
        if (styleColors.colorStroke) colors.colorStroke = styleColors.colorStroke;
        if (styleColors.colorRoute) colors.colorRoute = styleColors.colorRoute;
    }

    return colors;
}

/**
 * Résout l'affichage d'un POI (icône + couleurs) depuis la taxonomie et category.style.json du profil actif.
 * Ordre de priorité des styles :
 * 1. Style de la couche (poi._layerConfig.style) pour les couleurs
 * 2. Style de catégorie (category.style.json) pour les couleurs
 * 3. Taxonomie pour les icônes
 * 4. Style par défaut (baseConfig)
 *
 * @param {object} poi - Données du POI.
 * @returns {object} Configuration d'affichage { useIcon, iconId, colorFill, colorStroke, weight, radius, fillOpacity, opacity }.
 */
function resolveCategoryDisplay(poi) {
    const categoriesConfig = Config.getCategories?.()
        ?? {};

    const shared = POIShared;
    const poiConfig = shared ? shared.state.poiConfig : {};
    const showIconsOnMap = (poiConfig.showIconsOnMap !== false);

    const baseConfig = getPoiBaseConfig();

    // Résoudre les couleurs via resolveCategoryColors
    const colors = resolveCategoryColors(poi, baseConfig);

    const result = {
        useIcon: false,
        iconId: null,
        colorFill: colors.colorFill,
        colorStroke: colors.colorStroke,
        colorRoute: colors.colorRoute,
        weight: colors.weight,
        radius: colors.radius,
        fillOpacity: colors.fillOpacity,
        opacity: colors.opacity
    };

    // Déterminer si on utilise les icônes
    if (showIconsOnMap) {
        try {
            const iconsConfig = Config.getIconsConfig?.()
                ?? null;

            if (iconsConfig && iconsConfig.showOnMap !== false) {
                result.useIcon = true;
            }
        } catch (e) {
            // Fallback showIconsOnMap reste true par défaut
        }
    }

    const categoryId = poi.categoryId || poi.category ||
        (poi.attributes && poi.attributes.categoryId) ||
        (poi.properties && poi.properties.categoryId) ||
        (poi.properties && poi.properties.category);

    const subCategoryId = poi.subCategoryId || poi.subCategory || poi.sub_category ||
        (poi.attributes && poi.attributes.subCategoryId) ||
        (poi.properties && poi.properties.subCategoryId) ||
        (poi.properties && poi.properties.sub_category);

    // Résolution de l'icône depuis la taxonomie (pas les couleurs)
    // Lookup case-insensitive : on cherche d'abord la clé exacte, puis en majuscules/minuscules
    const resolveCatKey = (id) => {
        if (!id || !categoriesConfig) return null;
        if (categoriesConfig[id]) return id;
        const upper = String(id).toUpperCase();
        if (categoriesConfig[upper]) return upper;
        const lower = String(id).toLowerCase();
        if (categoriesConfig[lower]) return lower;
        // Parcours linéaire comme filet de sécurité
        return Object.keys(categoriesConfig).find(k => k.toLowerCase() === lower) || null;
    };

    const resolvedCatKey = resolveCatKey(categoryId);

    if (subCategoryId && resolvedCatKey && categoriesConfig[resolvedCatKey]?.subcategories) {
        const subCat = categoriesConfig[resolvedCatKey].subcategories[subCategoryId] ||
                       categoriesConfig[resolvedCatKey].subcategories[String(subCategoryId).toUpperCase()] ||
                       categoriesConfig[resolvedCatKey].subcategories[String(subCategoryId).toLowerCase()];
        const cat = categoriesConfig[resolvedCatKey];

        if (subCat) {
            result.iconId = subCat.icon || subCat.iconId || cat.icon || cat.iconId || null;
        } else {
            result.iconId = cat.icon || cat.iconId || null;
        }
    } else if (resolvedCatKey) {
        const cat = categoriesConfig[resolvedCatKey];
        result.iconId = cat.icon || cat.iconId || null;
    } else {
        // Ne logger que si une catégorie est réellement définie (éviter les warnings pour undefined/null)
        if (categoryId && categoryId !== 'undefined' && categoryId !== 'null' && Log) {
            Log.warn(`[POI] resolveCategoryDisplay() : Catégorie '${categoryId}' non trouvée dans la taxonomie.`);
        }
    }

    return result;
}

/**
 * Injecte le sprite SVG du profil actif dans le DOM (asynchrone).
 * Lit la configuration des icônes depuis taxonomy.icons.
 * Évite les duplications en vérifiant l'existence.
 * Note: La fonction reste nommée "Sync" pour la compatibilité, mais utilise fetch (async) en interne.
 */
async function ensureProfileSpriteInjectedSync() {
    try {
        if (typeof Config === "undefined" || typeof Config.getIconsConfig !== "function") {
            if (Log) Log.warn("[POI] Config.getIconsConfig non disponible");
            return;
        }

        const iconsCfg = Config.getIconsConfig();
        // Log seulement la première fois ou si la config change
        if (!ensureProfileSpriteInjectedSync._lastConfig || JSON.stringify(iconsCfg) !== JSON.stringify(ensureProfileSpriteInjectedSync._lastConfig)) {
            if (Log) Log.debug("[POI] IconsConfig récupéré:", iconsCfg);
            ensureProfileSpriteInjectedSync._lastConfig = iconsCfg;
        }
        if (!iconsCfg) {
            if (Log) Log.warn("[POI] Aucune configuration d'icônes trouvée");
            return;
        }

        const spriteUrl = iconsCfg.spriteUrl;

        if (!spriteUrl || typeof spriteUrl !== "string") {
            if (Log) Log.warn("[POI] spriteUrl manquant ou invalide:", spriteUrl);
            return;
        }

        // Vérifier si le sprite est déjà injecté
        const existing = document.querySelector('svg[data-geoleaf-sprite="profile"]');
        if (existing) {
            if (Log) Log.debug("[POI] Sprite SVG déjà injecté");
            return;
        }

        if (Log) Log.info("[POI] Chargement sprite depuis:", spriteUrl);

        // ✅ NOUVEAU: Utiliser fetch asynchrone pour éviter l'avertissement de dépréciation
        // et améliorer les performances en évitant de bloquer le thread principal
        try {
            const response = await fetch(spriteUrl);

            if (response.ok) {
                const svgText = await response.text();

                // SAFE: Utilisation de DOMParser au lieu de innerHTML pour éviter l'exécution de scripts
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgText, "image/svg+xml");

                // Vérifier les erreurs de parsing
                const parserError = doc.querySelector("parsererror");
                if (parserError) {
                    if (Log) Log.warn("[POI] Erreur parsing SVG sprite :", parserError.textContent);
                    return;
                }

                const svgEl = doc.documentElement;
                if (svgEl && svgEl.tagName.toLowerCase() === "svg") {
                    svgEl.setAttribute("data-geoleaf-sprite", "profile");
                    svgEl.style.position = "absolute";
                    svgEl.style.width = "0";
                    svgEl.style.height = "0";
                    svgEl.style.overflow = "hidden";
                    svgEl.setAttribute("aria-hidden", "true");

                    if (document.body.firstChild) {
                        document.body.insertBefore(svgEl, document.body.firstChild);
                    } else {
                        document.body.appendChild(svgEl);
                    }

                    const symbolCount = svgEl.querySelectorAll('symbol').length;
                    if (Log) Log.info("[POI] Sprite SVG profil injecté dans le DOM (async).", symbolCount, "symboles chargés.");
                }
            } else {
                if (Log) Log.warn("[POI] Erreur chargement sprite profil: HTTP", response.status);
            }
        } catch (err) {
            if (Log) Log.warn("[POI] Erreur chargement sprite profil (async):", err);
        }
    } catch (err) {
        if (Log) Log.warn("[POI] Erreur chargement sprite profil :", err);
    }
}

/**
 * Extrait les coordonnées d'un POI pour la création de marqueur.
 *
 * @param {object} poi - Données du POI.
 * @returns {[number, number]|null} [latitude, longitude] ou null si invalides.
 */
function extractMarkerCoordinates(poi) {
    if (!poi) {
        if (Log) Log.warn("[POI] extractMarkerCoordinates() : POI invalide.", poi);
        return null;
    }

    const normalizers = POINormalizers;
    if (!normalizers) {
        if (Log) Log.error("[POI] extractMarkerCoordinates() : Module Normalizers non chargé.");
        return null;
    }

    const coords = normalizers.extractCoordinates(poi);
    if (!coords) {
        if (Log) Log.warn("[POI] extractMarkerCoordinates() : POI sans coordonnées valides.", poi);
        return null;
    }

    return coords;
}

/**
 * Construit l'icône Leaflet (DivIcon) pour un marqueur POI.
 * Mode icône : utilise le sprite SVG profil avec cercle de fond.
 * Mode simple : cercle simple sans icône.
 *
 * @param {object} displayConfig - Configuration d'affichage { useIcon, iconId, colorFill, colorStroke, radius, weight, fillOpacity, opacity }.
 * @returns {L.DivIcon} Icône Leaflet configurée.
 */
function buildMarkerIcon(displayConfig) {
    const baseConfig = getPoiBaseConfig();
    const radius = displayConfig.radius !== undefined ? displayConfig.radius : baseConfig.radius;
    const weight = displayConfig.weight !== undefined ? displayConfig.weight : baseConfig.weight;
    const fillOpacity = displayConfig.fillOpacity;
    const strokeOpacity = displayConfig.opacity;

    const iconSizeCircle = Math.max(Math.round((radius * 2) + (weight * 2)), 8);
    const iconSizeIcon = Math.max(Math.round((radius * 2) + (weight * 2)), 16);

    // Appliquer fillOpacity à colorFill si défini
    let colorFill = displayConfig.colorFill;
    if (fillOpacity !== null && typeof fillOpacity === 'number') {
        // Convertir la couleur hex en rgba avec fillOpacity
        if (colorFill && colorFill.startsWith('#')) {
            const r = parseInt(colorFill.slice(1, 3), 16);
            const g = parseInt(colorFill.slice(3, 5), 16);
            const b = parseInt(colorFill.slice(5, 7), 16);
            colorFill = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + fillOpacity + ')';
        }
    }

    // Appliquer opacity au stroke (colorStroke) si défini
    let colorStroke = displayConfig.colorStroke;
    if (strokeOpacity !== null && typeof strokeOpacity === 'number') {
        // Convertir la couleur hex en rgba avec opacity
        if (colorStroke && colorStroke.startsWith('#')) {
            const r = parseInt(colorStroke.slice(1, 3), 16);
            const g = parseInt(colorStroke.slice(3, 5), 16);
            const b = parseInt(colorStroke.slice(5, 7), 16);
            colorStroke = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + strokeOpacity + ')';
        }
    }

    if (displayConfig.useIcon && displayConfig.iconId) {
        // Mode icône : DivIcon avec sprite métier
        const iconsConfig = Config.getIconsConfig?.()
            ?? null;
        const iconPrefix = (iconsConfig && iconsConfig.symbolPrefix) || "gl-poi-cat-";

        const iconIdNormalized = String(displayConfig.iconId)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");

        const symbolId = iconPrefix + iconIdNormalized;

        const htmlIcon = [
            '<div class="gl-poi-marker" style="',
            "--gl-poi-fill:", colorFill, ";",
            "--gl-poi-stroke:", colorStroke, ";",
            "width:", iconSizeIcon, "px;",
            "height:", iconSizeIcon, "px;",
            '">',
            '<svg class="gl-poi-marker__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" style="overflow: visible;">',
            '<circle cx="12" cy="12" r="10" fill="', colorFill, '" stroke="', colorStroke, '" stroke-width="', weight, '"/>',
            '<svg x="2" y="2" width="20" height="20" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" overflow="visible">',
            '<use href="#', symbolId, '" style="color: #ffffff"/>',
            '</svg>',
            "</svg>",
            "</div>"
        ].join("");

        return L.divIcon({
            html: htmlIcon,
            className: "gl-poi-divicon",
            iconSize: [iconSizeIcon, iconSizeIcon],
            iconAnchor: [iconSizeIcon / 2, iconSizeIcon / 2],
            popupAnchor: [0, -(iconSizeIcon / 2)]
        });
    } else {
        // Mode point simple (sans icône)
        const htmlCircle = [
            '<div class="gl-poi-marker" style="',
            "--gl-poi-fill:", colorFill, ";",
            "--gl-poi-stroke:", colorStroke, ";",
            "width:", iconSizeCircle, "px;",
            "height:", iconSizeCircle, "px;",
            '">',
            '<svg class="gl-poi-marker__circle" aria-hidden="true" focusable="false">',
            '<circle cx="50%" cy="50%" r="', radius, '"',
            ' fill="', colorFill, '"',
            ' stroke="', colorStroke, '"',
            ' stroke-width="', weight, '" />',
            "</svg>",
            "</div>"
        ].join("");

        return L.divIcon({
            html: htmlCircle,
            className: "gl-poi-divicon",
            iconSize: [iconSizeCircle, iconSizeCircle],
            iconAnchor: [iconSizeCircle / 2, iconSizeCircle / 2],
            popupAnchor: [0, -(iconSizeCircle / 2)]
        });
    }
}

/**
 * Attache les événements et comportements à un marqueur POI (tooltip, popup, side panel).
 *
 * @param {L.Marker} marker - Marqueur Leaflet à configurer.
 * @param {object} poi - Données du POI.
 */
function attachMarkerEvents(marker, poi) {
    // Attacher métadonnées POI
    marker._geoleafPoiData = poi;

    const shared = POIShared;
    const poiConfig = shared ? shared.state.poiConfig : {};
    const popupModule = POIPopup;

    // Gestion tooltip
    if (popupModule && typeof popupModule.manageTooltip === 'function') {
        popupModule.manageTooltip(marker, poi, poiConfig, resolveCategoryDisplay);
    }

    // Vérifier si les popups sont activés (par défaut: true)
    const showPopup = (poiConfig.showPopup !== false);

    if (showPopup) {
        // Mode popup: afficher le popup avec lien "Voir plus"
        if (popupModule && typeof popupModule.buildQuickPopupContent === 'function') {
            const popupContent = popupModule.buildQuickPopupContent(poi, resolveCategoryDisplay);
            if (popupContent) {
                if (popupModule.attachPopup) {
                    popupModule.attachPopup(marker, popupContent);
                } else {
                    marker.bindPopup(popupContent);
                }
            } else {
                Log.error('[markers] Popup content vide pour POI:', poi.id);
            }

            // Initialiser le flag de popup actif
            marker._geoleafPopupActive = false;

            // Bloquer l'ouverture du tooltip pendant que le popup est actif
            marker.on('tooltipopen', function() {
                if (marker._geoleafPopupActive) {
                    marker.closeTooltip();
                }
            });

            // Attacher événement pour le lien "Voir plus" du popup
            marker.on('popupopen', function() {
                // Marquer le popup comme actif et fermer le tooltip
                marker._geoleafPopupActive = true;
                marker.closeTooltip();

                setTimeout(function() {
                    const link = document.querySelector('.gl-poi-popup__link[data-poi-id="' + poi.id + '"]');
                    if (link) {
                        if (Log) Log.info('[POI] Lien "Voir plus" trouvé pour POI:', poi.id);

                        // Retirer les anciens listeners pour éviter les doublons
                        const newLink = link.cloneNode(true);
                        link.parentNode.replaceChild(newLink, link);

                        newLink.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();

                            if (Log) Log.info('[POI] Clic sur "Voir plus" pour POI:', poi.id);

                            // Fermer le popup
                            if (marker && marker.closePopup) {
                                marker.closePopup();
                            }

                            // Ouvrir le side panel avec un petit délai
                            setTimeout(function() {
                                if (Log) Log.info('[POI] Appel de showPoiDetails pour:', poi.id);
                                const _gPOI = typeof globalThis !== 'undefined' ? globalThis : window;
                                if (_gPOI.GeoLeaf?.POI?.showPoiDetails) {
                                    _gPOI.GeoLeaf.POI.showPoiDetails(poi);
                                } else {
                                    POICoreContract.showPoiDetails?.(poi);
                                }
                            }, 100);
                        });
                    } else {
                        if (Log) Log.warn('[POI] Lien "Voir plus" non trouvé pour POI:', poi.id);
                    }
                }, 50);
            });

            // Réactiver le tooltip quand le popup se ferme
            marker.on('popupclose', function() {
                marker._geoleafPopupActive = false;

                // Réouvrir le tooltip s'il est permanent (mode "always")
                if (marker.getTooltip() && marker.getTooltip().options.permanent) {
                    setTimeout(function() {
                        if (marker.openTooltip && !marker._geoleafPopupActive) {
                            marker.openTooltip();
                        }
                    }, 50);
                }
            });
        }
    } else {
        // Mode direct: ouvrir le side panel directement au clic sur le marker (sans popup)
        marker.on('click', function(e) {
            e.originalEvent.stopPropagation();

            if (Log) Log.info('[POI] Clic direct sur marker (sans popup) pour POI:', poi.id);

            const _gPOI = typeof globalThis !== 'undefined' ? globalThis : window;
            if (_gPOI.GeoLeaf?.POI?.showPoiDetails) {
                _gPOI.GeoLeaf.POI.showPoiDetails(poi);
            } else {
                POICoreContract.showPoiDetails?.(poi);
            }
        });
    }
}

/**
 * Crée un marqueur Leaflet pour un POI.
 * Orchestrateur principal : coordonnées → affichage → icône → événements.
 *
 * @param {object} poi - Données du POI.
 * @returns {L.Marker|null} Marqueur Leaflet ou null si invalide.
 */
/**
 * Crée un marqueur Leaflet pour un POI.
 * Orchestrateur principal : coordonnées → affichage → icône → événements.
 *
 * @param {object} poi - Données du POI.
 * @param {object} [options] - Options de création.
 * @param {boolean} [options.attachEvents=true] - Si false, ne pas attacher les événements (popup, tooltip).
 * @param {string} [options.pane] - Nom du pane Leaflet à utiliser pour le z-index.
 * @returns {L.Marker|null} Marqueur Leaflet ou null si invalide.
 */
function createMarker(poi, options = {}) {
    if (!poi) {
        if (Log) Log.warn("[POI] createMarker() : POI invalide.", poi);
        return null;
    }

    const { attachEvents = true, pane } = options;

    // Extraction coordonnées
    const coords = extractMarkerCoordinates(poi);
    if (!coords) {
        return null;
    }

    const [lat, lon] = coords;

    // Résolution de l'affichage (icône et couleurs)
    const displayConfig = resolveCategoryDisplay(poi);

    // Construction de l'icône Leaflet
    const customIcon = buildMarkerIcon(displayConfig);

    // Options du marker avec pane si fourni
    const markerOptions = { icon: customIcon };
    if (pane) {
        markerOptions.pane = pane;
    }

    // Création du marqueur Leaflet avec le pane
    const marker = L.marker([lat, lon], markerOptions);

    // Attacher événements et comportements (sauf si désactivé)
    if (attachEvents) {
        attachMarkerEvents(marker, poi);
    }

    return marker;
}

// ========================================
//   EXPORT
// ========================================

const POIMarkers = {
    getPoiBaseConfig,
    resolveCategoryDisplay,
    ensureProfileSpriteInjectedSync,
    extractMarkerCoordinates,
    buildMarkerIcon,
    attachMarkerEvents,
    createMarker
};

// ── ESM Export ──
export { POIMarkers };
