/**
 * GeoLeaf GeoJSON Module - Popup & Tooltip
 * Gestion des popups et tooltips unifiés
 *
 * @module geojson/popup-tooltip
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Dépendances lazy
    const getState = () => GeoLeaf._GeoJSONShared.state;
    const getLog = () => (GeoLeaf.Log || console);

    GeoLeaf._GeoJSONPopupTooltip = GeoLeaf._GeoJSONPopupTooltip || {};

    /**
     * Convertit une feature GeoJSON en format POI pour le side panel.
     * Utilise _Normalizer si disponible, sinon crée un POI par défaut.
     * Enrichissement centralisé pour tous les POIs.
     *
     * @param {Object} feature - Feature GeoJSON
     * @param {Object} def - Définition de la couche
     * @returns {Object} - Objet POI formaté
     */
    GeoLeaf._GeoJSONPopupTooltip.convertFeatureToPOI = function (feature, def) {
        let poi;

        // Utiliser le Normalizer centralisé si disponible
        const Normalizer = GeoLeaf._Normalizer;
        if (Normalizer && typeof Normalizer.normalizeFromGeoJSON === 'function') {
            poi = Normalizer.normalizeFromGeoJSON(feature, def);
        } else {
            // Fallback: logique locale
            const props = feature.properties || {};

            poi = {
                id: props.id || ("geojson-feature-" + Math.random().toString(36).substr(2, 9)),
                // Résolution case-insensitive du titre (28 janvier 2026)
                title: props.NAME || props.Name || props.name ||
                       props.TITLE || props.Title || props.title ||
                       props.LABEL || props.Label || props.label || "Sans titre",
                description: props.description || props.desc || "",
                // Conserver properties pour compatibilité avec les configs qui utilisent "properties.field"
                properties: { ...props },
                attributes: {
                    source: "geojson",
                    layerId: def.id,
                    layerLabel: def.label,
                    ...props
                }
            };

            // Ajouter les coordonnées dans tous les formats supportés
            if (feature.geometry && feature.geometry.coordinates) {
                // Format latlng array [lat, lng] pour compatibilité POI
                poi.latlng = [
                    feature.geometry.coordinates[1], // lat
                    feature.geometry.coordinates[0]  // lng
                ];
                // Format geometry pour compatibilité GeoJSON
                poi.geometry = feature.geometry;
                // Format location pour compatibilité legacy
                poi.location = {
                    lat: feature.geometry.coordinates[1],
                    lng: feature.geometry.coordinates[0]
                };
            }
        }

        // Enrichissement centralisé pour tous les POIs
        if (poi) {
            poi.attributes = poi.attributes || {};
            poi.attributes.source = "geojson";
            poi.attributes.layerId = def.id;
            poi.attributes.layerLabel = def.label;

            // Attacher la configuration de la couche
            poi._layerConfig = def;

            // Utiliser getSidepanelConfig pour la normalisation correcte
            const Loader = GeoLeaf._GeoJSONLoader;
            const sidepanelLayout = Loader && Loader.getSidepanelConfig ? Loader.getSidepanelConfig(def) : null;
            if (sidepanelLayout) {
                poi._sidepanelConfig = {
                    detailLayout: sidepanelLayout
                };
            }
        }

        return poi;
    };

    /**
     * Attache un popup unifié compatible avec le système POI.
     *
     * @param {Object} feature - Feature GeoJSON
     * @param {L.Layer} layer - Couche Leaflet
     * @param {Object} def - Définition de la couche
     */
    GeoLeaf._GeoJSONPopupTooltip.bindUnifiedPopup = function (feature, layer, def) {
        const Log = getLog();

        if (!feature.properties) return;

        // Si interactiveShape est false, ne rien attacher (la couche est non-cliquable)
        if (def.interactiveShape === false) {
            return;
        }

        // Vérifier le paramètre showPopup de la couche (défaut: true)
        const showPopup = typeof def.showPopup === 'boolean' ? def.showPopup : true;

        // Si showPopup est false, mode DIRECT: toggle du panneau latéral au clic (sans popup)
        if (!showPopup) {
            layer.on("click", (e) => {
                if (e && e.originalEvent) e.originalEvent.stopPropagation();

                // Masquer le tooltip si présent
                if (layer.getTooltip && layer.getTooltip()) {
                    try {
                        if (typeof layer.closeTooltip === 'function') layer.closeTooltip();
                        else layer.unbindTooltip();
                    } catch (err) { /* ignore */ }
                }

                if (GeoLeaf.POI && typeof GeoLeaf.POI.showPoiDetails === "function") {
                    const poiData = GeoLeaf._GeoJSONPopupTooltip.convertFeatureToPOI(feature, def);
                    const shared = GeoLeaf._POIShared && GeoLeaf._POIShared.state;
                    const current = shared ? shared.currentPoiInPanel : null;

                    // Toggle: si le même POI est ouvert, fermer le panneau, sinon l'ouvrir
                    if (current && poiData && current.id && poiData.id && current.id === poiData.id) {
                        if (GeoLeaf.POI && typeof GeoLeaf.POI.hideSidePanel === 'function') {
                            GeoLeaf.POI.hideSidePanel();
                        }
                    } else {
                        GeoLeaf.POI.showPoiDetails(poiData);
                    }
                }
            });
            return;
        }

        // Si un popup existe déjà (créé par POI Markers), le conserver
        if (layer.getPopup()) {
            return;
        }

        // Convertir la feature en POI normalisé
        const poiData = GeoLeaf._GeoJSONPopupTooltip.convertFeatureToPOI(feature, def);

        // Utiliser ContentBuilder si disponible
        const ContentBuilder = GeoLeaf._ContentBuilder;
        // Utiliser le helper pour récupérer la config popup (28 janvier 2026)
        const Loader = GeoLeaf._GeoJSONLoader;

        let popupConfig = null;
        try {
            popupConfig = Loader && Loader.getPopupConfig ? Loader.getPopupConfig(def) : null;
        } catch (e) {
            // ...log supprimé ([DEBUG] bindUnifiedPopup - ERREUR getPopupConfig)...
        }

        // ...logs supprimés ([POPUP] bindUnifiedPopup)...
        if (ContentBuilder && typeof ContentBuilder.buildPopupHTML === 'function') {
            const markersModule = GeoLeaf._POIMarkers;
            const resolveCategoryDisplay = markersModule && typeof markersModule.resolveCategoryDisplay === 'function'
                ? markersModule.resolveCategoryDisplay
                : null;

            const popupContent = ContentBuilder.buildPopupHTML(poiData, popupConfig, {
                resolveCategoryDisplay: resolveCategoryDisplay
            });

            if (popupContent) {
                layer.bindPopup(popupContent);
            }
        } else {
            // Fallback: utiliser POIPopup module
            const popupModule = GeoLeaf._POIPopup;
            if (popupModule && typeof popupModule.buildQuickPopupContent === 'function') {
                const markersModule = GeoLeaf._POIMarkers;
                const resolveCategoryDisplay = markersModule && typeof markersModule.resolveCategoryDisplay === 'function'
                    ? markersModule.resolveCategoryDisplay
                    : null;

                const popupContent = popupModule.buildQuickPopupContent(poiData, resolveCategoryDisplay);
                if (popupContent) {
                    layer.bindPopup(popupContent);
                }
            } else {
                // Fallback minimal sans modules
                const Security = GeoLeaf.Security || {
                    escapeHtml: (str) => {
                        if (!str) return "";
                        const div = document.createElement("div");
                        div.textContent = String(str);
                        return div.innerHTML;
                    }
                };

                const props = feature.properties;
                const name = props.name || props.label || props.title || "Sans titre";
                const description = props.description || props.desc || "";

                let popupHtml = '<div class="gl-geojson-popup">';
                popupHtml += '<h3 class="gl-popup-title">' + Security.escapeHtml(name) + '</h3>';

                if (description) {
                    popupHtml += '<p class="gl-popup-description">' + Security.escapeHtml(description) + '</p>';
                }

                if (GeoLeaf.POI && typeof GeoLeaf.POI.showPoiDetails === "function") {
                    popupHtml += '<a href="#" class="gl-poi-popup__link" data-layer-id="' + def.id + '" data-feature-id="' + (props.id || '') + '">Voir détails →</a>';
                }

                popupHtml += '</div>';
                layer.bindPopup(popupHtml);
            }
        }

        // Flag pour tracker l'état du popup
        layer._geoleafPopupActive = false;

        // Fermer le tooltip quand le popup s'ouvre
        layer.on('popupopen', () => {
            layer._geoleafPopupActive = true;

            // Fermer le tooltip si présent
            if (layer.getTooltip && layer.getTooltip()) {
                try {
                    if (typeof layer.closeTooltip === 'function') {
                        layer.closeTooltip();
                    }
                } catch (err) {
                    Log.warn('[GeoJSON] Erreur fermeture tooltip:', err);
                }
            }

            // Délégation d'événement pour le lien "Voir détails"
            const popup = layer.getPopup();
            if (!popup) return;

            const popupEl = popup.getElement();
            if (!popupEl) return;

            const link = popupEl.querySelector('.gl-poi-popup__link');
            if (link) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (GeoLeaf.POI && typeof GeoLeaf.POI.showPoiDetails === "function") {
                        const poiData = GeoLeaf._GeoJSONPopupTooltip.convertFeatureToPOI(feature, def);
                        GeoLeaf.POI.showPoiDetails(poiData);
                    }
                });
            }
        });

        // Réactiver le tooltip quand le popup se ferme
        layer.on('popupclose', () => {
            layer._geoleafPopupActive = false;

            // Réouvrir le tooltip s'il est permanent (mode "always")
            if (layer.getTooltip() && layer.getTooltip().options.permanent) {
                setTimeout(() => {
                    if (layer.openTooltip && !layer._geoleafPopupActive) {
                        layer.openTooltip();
                    }
                }, 50);
            }
        });
    };

    /**
     * Attache un tooltip unifié à une couche selon sa configuration.
     *
     * @param {Object} feature - Feature GeoJSON
     * @param {L.Layer} layer - Couche Leaflet
     * @param {Object} def - Définition de la couche
     */
    GeoLeaf._GeoJSONPopupTooltip.bindUnifiedTooltip = function (feature, layer, def) {
        const state = getState();

        if (!feature.properties || !layer) return;

        // Récupérer les paramètres de tooltip de la couche
        const tooltipMode = def.tooltipMode || "hover"; // "always", "never", "hover"
        const tooltipMinZoom = typeof def.tooltipMinZoom === "number" ? def.tooltipMinZoom : 0;

        // Si mode "never", ne rien faire
        if (tooltipMode === "never") {
            return;
        }

        // Construire le texte du tooltip par défaut
        const props = feature.properties;
        const tooltipText = props.name || props.label || props.title || props.id || "Sans titre";

        // Utiliser le helper pour récupérer la config tooltip (28 janvier 2026)
        const Loader = GeoLeaf._GeoJSONLoader;
        const tooltipConfig = Loader && Loader.getTooltipConfig ? Loader.getTooltipConfig(def) : null;

        // Convertir la feature en POI pour avoir access aux champs via attributes.*
        const featureAsPoi = GeoLeaf._GeoJSONPopupTooltip.convertFeatureToPOI(feature, def);

        // Fonction pour construire le contenu du tooltip
        const buildTooltipContent = () => {
            // Utiliser ContentBuilder si disponible
            const ContentBuilder = GeoLeaf._ContentBuilder;
            if (ContentBuilder && typeof ContentBuilder.buildTooltipHTML === 'function') {
                const content = ContentBuilder.buildTooltipHTML(featureAsPoi, tooltipConfig);
                return content || tooltipText;
            }

            // Fallback: utiliser POIPopup module
            const POIPopup = GeoLeaf._POIPopup;
            if (POIPopup && typeof POIPopup.buildTooltipContent === 'function') {
                const content = POIPopup.buildTooltipContent(featureAsPoi);
                return content || tooltipText;
            }

            // Fallback minimal
            return tooltipText;
        };

        // Fonction pour gérer l'affichage du tooltip selon le zoom
        const updateTooltipVisibility = () => {
            if (!state.map) return;

            // Ne pas afficher le tooltip si un popup est actif sur cette couche
            if (layer._geoleafPopupActive) return;

            const currentZoom = state.map.getZoom();
            const shouldShow = currentZoom >= tooltipMinZoom;

            const content = buildTooltipContent();

            if (shouldShow) {
                if (!layer.getTooltip()) {
                    const opts = {
                        direction: 'top',
                        offset: [0, -10],
                        opacity: 0.9,
                        className: 'gl-geojson-tooltip',
                        permanent: tooltipMode === 'always'
                    };
                    layer.bindTooltip(content, opts);
                    if (tooltipMode === 'always' && layer.openTooltip) {
                        layer.openTooltip();
                    }
                } else {
                    // update existing tooltip content
                    const tooltip = layer.getTooltip();
                    if (tooltip && tooltip.setContent) tooltip.setContent(content);
                }
            } else {
                if (layer.getTooltip()) {
                    try {
                        if (typeof layer.closeTooltip === 'function') {
                            layer.closeTooltip();
                        } else {
                            layer.unbindTooltip();
                        }
                    } catch (err) {
                        /* ignore */
                    }
                }
            }
        };

        // Stocker la référence pour le nettoyage
        layer._geoleafTooltipUpdate = updateTooltipVisibility;

        // Bloquer l'ouverture du tooltip pendant que le popup est actif
        layer.on('tooltipopen', (e) => {
            if (layer._geoleafPopupActive) {
                layer.closeTooltip();
            }
        });

        // Attendre que la couche soit ajoutée à la map avant d'initialiser
        layer.on('add', () => {
            // Initialiser le tooltip
            updateTooltipVisibility();

            // Ajouter le listener sur le zoom
            if (state.map) {
                state.map.on('zoomend', updateTooltipVisibility);
            }
        });

        // Nettoyer le listener quand la couche est retirée
        layer.on('remove', () => {
            if (state.map && layer._geoleafTooltipUpdate) {
                state.map.off('zoomend', layer._geoleafTooltipUpdate);
            }
        });
    };

})(window);
