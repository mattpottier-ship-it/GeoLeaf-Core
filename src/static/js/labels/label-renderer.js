/**
 * Module Label Renderer pour GeoLeaf
 * Crée et gère les tooltips permanents Leaflet pour les étiquettes
 *
 * DÉPENDANCES:
 * - Leaflet (L.Tooltip, L.LatLng)
 * - GeoLeaf.Log (optionnel)
 *
 * EXPOSE:
 * - GeoLeaf._LabelRenderer
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
    const Log = GeoLeaf.Log;

    /**
     * Module Label Renderer
     * @namespace _LabelRenderer
     * @private
     */
    const _LabelRenderer = {
        /**
         * Crée les tooltips permanents pour toutes les features d'une couche
         * @param {string} layerId - ID de la couche
         * @param {L.LayerGroup} leafletLayer - Couche Leaflet (LayerGroup ou FeatureGroup)
         * @param {Object} labelConfig - Configuration des labels
         * @param {Object} style - Style des labels (extrait de currentStyle.label)
         * @param {Map} tooltipsMap - Map pour stocker les tooltips créés
         */
        createTooltipsForLayer(layerId, leafletLayer, labelConfig, style, tooltipsMap) {
            if (!leafletLayer || !labelConfig || !labelConfig.labelId) {
                if (Log) Log.warn("[LabelRenderer] Paramètres invalides pour createTooltipsForLayer", {
                    layerId,
                    hasLeafletLayer: !!leafletLayer,
                    hasLabelConfig: !!labelConfig,
                    labelId: labelConfig?.labelId,
                    labelConfigKeys: labelConfig ? Object.keys(labelConfig) : null
                });
                return;
            }

            const labelField = labelConfig.labelId;

            if (Log) Log.debug(`[LabelRenderer] Création tooltips pour ${layerId}, champ: ${labelField}`);

            // Parcourir toutes les features de la couche
            let featureCount = 0;

            leafletLayer.eachLayer((featureLayer) => {
                featureCount++;
                try {
                    this._createTooltipForFeature(
                        featureLayer,
                        labelField,
                        style,
                        tooltipsMap
                    );
                } catch (err) {
                    if (Log) Log.warn("[LabelRenderer] Erreur création tooltip:", err);
                }
            });

            if (Log) Log.debug(`[LabelRenderer] ${tooltipsMap.size} tooltips créés pour ${layerId} (${featureCount} features parcourues)`);
        },

        /**
         * Crée un marker texte (label) pour une feature
         * @private
         * @param {L.Layer} featureLayer - Layer Leaflet de la feature
         * @param {string} labelField - Nom du champ à afficher
         * @param {Object} style - Style du label
         * @param {Map} tooltipsMap - Map pour stocker le marker
         */
        _createTooltipForFeature(featureLayer, labelField, style, tooltipsMap) {
            // Récupérer les données GeoJSON de la feature
            const feature = featureLayer.feature;
            if (!feature || !feature.properties) {
                if (Log) Log.debug("[LabelRenderer] Feature ou properties manquant");
                return;
            }

            // Extraire la valeur du champ label
            const labelValue = this._extractFieldValue(feature.properties, labelField);
            if (!labelValue) {
                return;
            }

            // Récupérer la position (centre de la géométrie)
            let position = null;

            if (typeof featureLayer.getLatLng === "function") {
                // Pour les points
                position = featureLayer.getLatLng();
            } else if (typeof featureLayer.getBounds === "function") {
                // Pour les polygones (Polygon, MultiPolygon) - centre du bounding box
                // IMPORTANT: Vérifier getBounds AVANT getLatLngs car les polygones ont les deux!
                const bounds = featureLayer.getBounds();
                if (bounds && typeof bounds.getCenter === "function") {
                    position = bounds.getCenter();
                    if (Log) Log.info("[LabelRenderer] Position polygone calculée:", {
                        labelValue,
                        position: position,
                        positionType: typeof position,
                        hasLat: 'lat' in position,
                        hasLng: 'lng' in position,
                        latType: typeof position.lat,
                        lngType: typeof position.lng,
                        positionKeys: Object.keys(position)
                    });
                } else {
                    if (Log) Log.warn("[LabelRenderer] getBounds ne retourne pas getCenter pour:", labelValue);
                }
            } else if (typeof featureLayer.getLatLngs === "function") {
                // Pour les lignes - prendre le point du milieu de la ligne
                const latlngs = featureLayer.getLatLngs();
                if (latlngs && latlngs.length > 0) {
                    // Si c'est un MultiLineString ou une ligne complexe
                    const flatLatlngs = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
                    if (flatLatlngs && flatLatlngs.length > 0) {
                        const middleIndex = Math.floor(flatLatlngs.length / 2);
                        position = flatLatlngs[middleIndex];
                    }
                }
            }

            // Vérifier que position est valide
            // Note: Leaflet LatLng peut avoir lat/lng comme propriétés OU comme méthodes
            if (!position) {
                if (Log) Log.debug("[LabelRenderer] Position null pour feature, skipping label. Label:", labelValue);
                return;
            }

            const lat = typeof position.lat === 'function' ? position.lat() : position.lat;
            const lng = typeof position.lng === 'function' ? position.lng() : position.lng;

            if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                return;
            }

            // Créer un divIcon avec le texte du label
            const htmlContent = this._formatLabelContent(labelValue, style);

            const labelIcon = global.L.divIcon({
                html: htmlContent,
                className: this._buildClassName(style),
                iconSize: null, // Auto-size
                iconAnchor: [0, 0] // Position relative au point
            });

            // Créer un marker avec cet icône texte
            const labelMarker = global.L.marker([lat, lng], {
                icon: labelIcon,
                interactive: false, // Ne pas intercepter les clics
                keyboard: false
            });

            // Ajouter au map
            const map = GeoLeaf.Core && GeoLeaf.Core.getMap ? GeoLeaf.Core.getMap() : null;
            if (map) {
                labelMarker.addTo(map);

                // Stocker dans la map
                const featureId = feature.id || feature.properties.id || `feature_${Date.now()}_${Math.random()}`;
                tooltipsMap.set(featureId, labelMarker);
            } else {
                if (Log) Log.warn("[LabelRenderer] Carte non disponible pour", labelValue);
            }
        },

        /**
         * Extrait la valeur d'un champ depuis les propriétés
         * Supporte la notation pointée (ex: "attributes.name")
         * @private
         */
        _extractFieldValue(properties, fieldPath) {
            if (!properties || !fieldPath) return null;

            // Si pas de point, accès direct
            if (!fieldPath.includes(".")) {
                return properties[fieldPath];
            }

            // Notation pointée
            const parts = fieldPath.split(".");
            let value = properties;

            for (const part of parts) {
                if (value && typeof value === "object" && part in value) {
                    value = value[part];
                } else {
                    return null;
                }
            }

            return value;
        },

        /**
         * Parse l'offset depuis le style
         * @private
         */
        _parseOffset(offset) {
            if (!offset) return [0, 0];

            if (Array.isArray(offset) && offset.length === 2) {
                return [
                    typeof offset[0] === "number" ? offset[0] : 0,
                    typeof offset[1] === "number" ? offset[1] : 0
                ];
            }

            return [0, 0];
        },

        /**
         * Construit le nom de classe CSS pour le tooltip
         * @private
         */
        _buildClassName(style) {
            const classes = ["gl-label"];

            if (style) {
                if (style.className) {
                    classes.push(style.className);
                }

                // Ajouter des classes basées sur les propriétés de style
                if (style.variant) {
                    classes.push(`gl-label--${style.variant}`);
                }
            }

            return classes.join(" ");
        },

        /**
         * Formate le contenu du label
         * @private
         */
        _formatLabelContent(value, style) {
            if (!value) return "";

            let content = String(value);

            // Appliquer un préfixe/suffixe si défini
            if (style) {
                if (style.prefix) {
                    content = style.prefix + content;
                }
                if (style.suffix) {
                    content = content + style.suffix;
                }
            }

            // Créer le HTML du label
            const div = global.document.createElement("div");
            div.className = "gl-label__content";
            div.textContent = content;

            // Appliquer les styles inline si définis
            if (style) {
                this._applyInlineStyles(div, style);
            }

            // Retourner le HTML string, pas l'élément DOM
            return div.outerHTML;
        },

        /**
         * Applique les styles inline au contenu du label
         * @private
         */
        _applyInlineStyles(element, style) {
            if (!element || !style) return;

            // Appliquer les styles de police et couleur avec setProperty + important pour forcer la priorité sur le CSS
            if (style.font) {
                if (style.font.family) {
                    // Ajouter un fallback pour assurer la lisibilité si la police demandée n'est pas disponible
                    const fontFamily = `"${style.font.family}", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
                    element.style.setProperty('font-family', fontFamily, 'important');
                }
                if (style.font.sizePt) {
                    element.style.setProperty('font-size', `${style.font.sizePt}pt`, 'important');
                }
                if (style.font.bold) {
                    element.style.setProperty('font-weight', 'bold', 'important');
                } else if (style.font.weight) {
                    // Pour améliorer la lisibilité, forcer un poids minimum de 500 si < 400
                    const weight = style.font.weight < 400 ? 500 : style.font.weight;
                    element.style.setProperty('font-weight', weight, 'important');
                }
                if (style.font.italic) {
                    element.style.setProperty('font-style', 'italic', 'important');
                }
            }

            // Appliquer la couleur du texte avec !important
            if (style.color) {
                element.style.setProperty('color', style.color, 'important');
            }

            // Appliquer l'opacité du texte
            if (style.opacity !== undefined) {
                element.style.setProperty('opacity', style.opacity, 'important');
            }

            // Appliquer le buffer (text-shadow pour contour) avec !important
            if (style.buffer && style.buffer.enabled) {
                const bufferColor = style.buffer.color || '#ffffff';
                const bufferOpacity = style.buffer.opacity !== undefined ? style.buffer.opacity : 1;
                const bufferSize = style.buffer.sizePx || 2;

                // Convertir la couleur hex + opacité en rgba
                const rgba = this._hexToRgba(bufferColor, bufferOpacity);

                // Créer un text-shadow multi-couches pour un contour plus net et visible
                const shadowParts = [];

                // Couche 1: Contour net avec de nombreux angles pour une couverture complète
                for (let angle = 0; angle < 360; angle += 30) {
                    const rad = angle * Math.PI / 180;
                    const x = Math.cos(rad) * bufferSize;
                    const y = Math.sin(rad) * bufferSize;
                    shadowParts.push(`${x.toFixed(2)}px ${y.toFixed(2)}px 0 ${rgba}`);
                }

                // Couche 2: Contour intermédiaire pour plus de densité (meilleure couverture)
                for (let angle = 15; angle < 360; angle += 30) {
                    const rad = angle * Math.PI / 180;
                    const x = Math.cos(rad) * bufferSize * 0.7;
                    const y = Math.sin(rad) * bufferSize * 0.7;
                    shadowParts.push(`${x.toFixed(2)}px ${y.toFixed(2)}px 0 ${rgba}`);
                }

                // Couche 3: Effet glow plus prononcé pour renforcer le contraste
                shadowParts.push(`0 0 ${bufferSize * 0.8}px ${rgba}`);
                shadowParts.push(`0 0 ${bufferSize * 1.5}px ${rgba}`);

                element.style.setProperty('text-shadow', shadowParts.join(', '), 'important');
            }

            // Appliquer textTransform
            if (style.textTransform) {
                element.style.setProperty('text-transform', style.textTransform, 'important');
            }
        },

        /**
         * Convertit une couleur hex en rgba
         * @private
         */
        _hexToRgba(hex, opacity) {
            if (!hex) return `rgba(0, 0, 0, ${opacity})`;

            // Enlever le # si présent
            hex = hex.replace('#', '');

            // Gérer les formats courts (#RGB) et longs (#RRGGBB)
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }

            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
    };

    // Exposer dans l'espace de noms interne
    GeoLeaf._LabelRenderer = _LabelRenderer;

})(window);
