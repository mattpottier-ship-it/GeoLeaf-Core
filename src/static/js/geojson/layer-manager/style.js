/**
 * GeoLeaf GeoJSON Layer Manager - Style
 * Style normalization, hatch patterns, style application
 *
 * @module geojson/layer-manager/style
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const getState = () => GeoLeaf._GeoJSONShared.state;
    const getLog = () => (GeoLeaf.Log || console);

    const LayerManager = GeoLeaf._GeoJSONLayerManager = GeoLeaf._GeoJSONLayerManager || {};

    /**
     * Crée un pattern SVG pour le hachurage
     * @private
     * @param {string} layerId - ID de la couche (pour l'unicité du pattern)
     * @param {Object} hatchConfig - Configuration du hachurage
     * @returns {string} - ID du pattern SVG
     */
    function _createHatchPattern(layerId, hatchConfig) {
        if (!hatchConfig || !hatchConfig.enabled) {
            return null;
        }

        // Créer un ID unique basé sur les paramètres du hatch
        const type = hatchConfig.type || 'diagonal';
        const angle = hatchConfig.angleDeg || 0;
        const spacing = hatchConfig.spacingPx || 10;
        const strokeColor = (hatchConfig.stroke?.color || '#000000').replace('#', '');
        const strokeWidth = hatchConfig.stroke?.widthPx || 1;
        const strokeOpacity = hatchConfig.stroke?.opacity || 1;

        // Hash des paramètres pour créer un ID unique
        const configHash = `${type}-${angle}-${spacing}-${strokeColor}-${strokeWidth}-${strokeOpacity}`;
        const patternId = `hatch-${layerId}-${configHash}`;

        // Si le pattern existe déjà, le réutiliser
        const existingPattern = document.getElementById(patternId);
        if (existingPattern) {
            return patternId;
        }

        // Créer le pattern SVG
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', patternId);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');
        pattern.setAttribute('width', spacing);
        pattern.setAttribute('height', spacing);

        // Créer les lignes selon le type
        if (type === 'dot') {
            // Pattern de points (stipple)
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', spacing / 2);
            circle.setAttribute('cy', spacing / 2);
            circle.setAttribute('r', Math.max(0.5, strokeWidth / 2));
            circle.setAttribute('fill', `#${strokeColor}`);
            circle.setAttribute('fill-opacity', strokeOpacity);
            pattern.appendChild(circle);
        } else if (type === 'cross') {
            // Croix (horizontal + vertical)
            const lineH = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineH.setAttribute('x1', '0');
            lineH.setAttribute('y1', spacing / 2);
            lineH.setAttribute('x2', spacing);
            lineH.setAttribute('y2', spacing / 2);
            lineH.setAttribute('stroke', `#${strokeColor}`);
            lineH.setAttribute('stroke-width', strokeWidth);
            lineH.setAttribute('stroke-opacity', strokeOpacity);
            pattern.appendChild(lineH);

            const lineV = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineV.setAttribute('x1', spacing / 2);
            lineV.setAttribute('y1', '0');
            lineV.setAttribute('x2', spacing / 2);
            lineV.setAttribute('y2', spacing);
            lineV.setAttribute('stroke', `#${strokeColor}`);
            lineV.setAttribute('stroke-width', strokeWidth);
            lineV.setAttribute('stroke-opacity', strokeOpacity);
            pattern.appendChild(lineV);
        } else if (type === 'x') {
            // Croix diagonale (45° + 135°)
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', '0');
            line1.setAttribute('y1', '0');
            line1.setAttribute('x2', spacing);
            line1.setAttribute('y2', spacing);
            line1.setAttribute('stroke', `#${strokeColor}`);
            line1.setAttribute('stroke-width', strokeWidth);
            line1.setAttribute('stroke-opacity', strokeOpacity);
            pattern.appendChild(line1);

            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line2.setAttribute('x1', spacing);
            line2.setAttribute('y1', '0');
            line2.setAttribute('x2', '0');
            line2.setAttribute('y2', spacing);
            line2.setAttribute('stroke', `#${strokeColor}`);
            line2.setAttribute('stroke-width', strokeWidth);
            line2.setAttribute('stroke-opacity', strokeOpacity);
            pattern.appendChild(line2);
        } else {
            // Simple ligne (diagonal, horizontal, vertical)
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

            if (type === 'horizontal' || angle === 0) {
                line.setAttribute('x1', '0');
                line.setAttribute('y1', spacing / 2);
                line.setAttribute('x2', spacing);
                line.setAttribute('y2', spacing / 2);
            } else if (type === 'vertical' || angle === 90) {
                line.setAttribute('x1', spacing / 2);
                line.setAttribute('y1', '0');
                line.setAttribute('x2', spacing / 2);
                line.setAttribute('y2', spacing);
            } else {
                // Diagonal avec angle - créer une vraie diagonale
                line.setAttribute('x1', '0');
                line.setAttribute('y1', '0');
                line.setAttribute('x2', spacing);
                line.setAttribute('y2', spacing);
                // Appliquer la rotation depuis le centre du pattern
                if (angle != null && angle !== 45) {
                    const centerX = spacing / 2;
                    const centerY = spacing / 2;
                    pattern.setAttribute('patternTransform', `rotate(${angle} ${centerX} ${centerY})`);
                }
            }

            line.setAttribute('stroke', `#${strokeColor}`);
            line.setAttribute('stroke-width', strokeWidth);
            line.setAttribute('stroke-opacity', strokeOpacity);
            pattern.appendChild(line);
        }

        // Retourner juste l'ID du pattern
        // Les patterns seront créés dans _applyHatchToLayer quand le SVG Leaflet existe
        return patternId;
    }

    /**
     * Applique le hachurage SVG à un layer Leaflet
     * @private
     * @param {L.Layer} layer - Layer Leaflet
     * @param {string} patternId - ID du pattern SVG
     */
    function _applyHatchToLayer(layer, patternId, hatchConfig) {
        if (!layer || !patternId) return;

        // Log supprimé pour éviter des milliers de logs dans les boucles eachLayer
        // ...log supprimé pour éviter du bruit inutile...

        // S'assurer que le pattern existe dans le SVG de Leaflet
        let mapSvg = document.querySelector('.leaflet-overlay-pane svg');
        if (!mapSvg) {
            // Retry avec délai si SVG n'existe pas encore
            const retryCount = 5;
            const retryDelay = 100; // ms
            let attempts = 0;
            const tryApplyHatch = () => {
                mapSvg = document.querySelector('.leaflet-overlay-pane svg');
                if (mapSvg) {
                    _applyHatchToLayer(layer, patternId, hatchConfig);
                    return;
                }
                attempts++;
                if (attempts < retryCount) {
                    setTimeout(tryApplyHatch, retryDelay);
                }
            };
            setTimeout(tryApplyHatch, retryDelay);
            return;
        }

        // Vérifier si le pattern existe déjà
        let pattern = mapSvg.querySelector(`#${patternId}`);
        if (!pattern && hatchConfig) {
            // Créer le pattern maintenant
            const spacing = hatchConfig.spacingPx || 10;
            const type = hatchConfig.type || 'diagonal';
            const angle = hatchConfig.angleDeg;
            const strokeColor = hatchConfig.stroke?.color || '#000000';
            const strokeWidth = hatchConfig.stroke?.widthPx || 1;
            const strokeOpacity = hatchConfig.stroke?.opacity || 1;

            // Assurer que la couleur a toujours le # pour les attributs SVG
            const colorWithHash = strokeColor.startsWith('#') ? strokeColor : `#${strokeColor}`;

            pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
            pattern.setAttribute('id', patternId);
            pattern.setAttribute('patternUnits', 'userSpaceOnUse');
            pattern.setAttribute('width', spacing);
            pattern.setAttribute('height', spacing);

            // Créer le contenu selon le type
            if (type === 'dot') {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', spacing / 2);
                circle.setAttribute('cy', spacing / 2);
                // Rayon proportionnel au spacing:
                // Plus petit spacing (plus dense) = points plus petits
                // Plus grand spacing (moins dense) = points plus gros pour compenser
                // spacing 6px → r=0.42, spacing 12px → r=0.84
                circle.setAttribute('r', Math.max(0.3, spacing * 0.07));
                circle.setAttribute('fill', colorWithHash);
                circle.setAttribute('fill-opacity', strokeOpacity);
                pattern.appendChild(circle);
            } else if (type === 'diagonal') {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', '0');
                line.setAttribute('y1', '0');
                line.setAttribute('x2', spacing);
                line.setAttribute('y2', spacing);
                line.setAttribute('stroke', colorWithHash);
                line.setAttribute('stroke-width', strokeWidth);
                line.setAttribute('stroke-opacity', strokeOpacity);
                if (angle != null && angle !== 45) {
                    const centerX = spacing / 2;
                    const centerY = spacing / 2;
                    pattern.setAttribute('patternTransform', `rotate(${angle} ${centerX} ${centerY})`);
                }
                pattern.appendChild(line);
            } else if (type === 'cross') {
                // Ligne horizontale
                const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                hLine.setAttribute('x1', '0');
                hLine.setAttribute('y1', spacing / 2);
                hLine.setAttribute('x2', spacing);
                hLine.setAttribute('y2', spacing / 2);
                hLine.setAttribute('stroke', colorWithHash);
                hLine.setAttribute('stroke-width', strokeWidth);
                hLine.setAttribute('stroke-opacity', strokeOpacity);
                pattern.appendChild(hLine);
                // Ligne verticale
                const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                vLine.setAttribute('x1', spacing / 2);
                vLine.setAttribute('y1', '0');
                vLine.setAttribute('x2', spacing / 2);
                vLine.setAttribute('y2', spacing);
                vLine.setAttribute('stroke', colorWithHash);
                vLine.setAttribute('stroke-width', strokeWidth);
                vLine.setAttribute('stroke-opacity', strokeOpacity);
                pattern.appendChild(vLine);
            } else if (type === 'x') {
                // Diagonale principal (TL to BR)
                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', '0');
                line1.setAttribute('y1', '0');
                line1.setAttribute('x2', spacing);
                line1.setAttribute('y2', spacing);
                line1.setAttribute('stroke', colorWithHash);
                line1.setAttribute('stroke-width', strokeWidth);
                line1.setAttribute('stroke-opacity', strokeOpacity);
                pattern.appendChild(line1);
                // Diagonale secondaire (TR to BL)
                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', spacing);
                line2.setAttribute('y1', '0');
                line2.setAttribute('x2', '0');
                line2.setAttribute('y2', spacing);
                line2.setAttribute('stroke', colorWithHash);
                line2.setAttribute('stroke-width', strokeWidth);
                line2.setAttribute('stroke-opacity', strokeOpacity);
                pattern.appendChild(line2);
            } else if (type === 'horizontal') {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', '0');
                line.setAttribute('y1', spacing / 2);
                line.setAttribute('x2', spacing);
                line.setAttribute('y2', spacing / 2);
                line.setAttribute('stroke', colorWithHash);
                line.setAttribute('stroke-width', strokeWidth);
                line.setAttribute('stroke-opacity', strokeOpacity);
                pattern.appendChild(line);
            } else if (type === 'vertical') {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', spacing / 2);
                line.setAttribute('y1', '0');
                line.setAttribute('x2', spacing / 2);
                line.setAttribute('y2', spacing);
                line.setAttribute('stroke', colorWithHash);
                line.setAttribute('stroke-width', strokeWidth);
                line.setAttribute('stroke-opacity', strokeOpacity);
                pattern.appendChild(line);
            }

            // Ajouter au defs du SVG
            let defs = mapSvg.querySelector('defs');
            if (!defs) {
                defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                mapSvg.insertBefore(defs, mapSvg.firstChild);
            }
            defs.appendChild(pattern);
        }

        // Fonction pour appliquer le pattern à un élément path
        const applyToPath = (path) => {
            if (path && path.setAttribute) {
                const fillUrl = `url(#${patternId})`;
                const currentFill = path.getAttribute('fill');

                // N'appliquer que si différent (évite boucle infinie)
                if (currentFill !== fillUrl) {
                    path.setAttribute('fill', fillUrl);
                }

                // S'assurer que l'opacité de remplissage est visible pour les patterns
                if (hatchConfig && hatchConfig.renderMode === 'pattern_only') {
                    const curFillOpacity = path.getAttribute('fill-opacity');
                    if (curFillOpacity == null || Number(curFillOpacity) <= 0) {
                        path.setAttribute('fill-opacity', '1');
                    }
                }

                // Observer les changements pour réappliquer le pattern
                if (!path._hatchObserver) {
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'attributes' && mutation.attributeName === 'fill') {
                                const newFill = path.getAttribute('fill');
                                // Ne réappliquer que si vraiment différent
                                if (newFill !== fillUrl && !newFill.includes(patternId)) {
                                    path.setAttribute('fill', fillUrl);
                                }
                            }
                        });
                    });
                    observer.observe(path, { attributes: true, attributeFilter: ['fill'] });
                    path._hatchObserver = observer;
                }
            }
        };

        // Pour les layers individuels
        if (layer._path) {
            applyToPath(layer._path);
        }

        // Pour les groupes de layers
        if (typeof layer.eachLayer === 'function') {
            layer.eachLayer(sublayer => {
                if (sublayer._path) {
                    applyToPath(sublayer._path);
                }
            });
        }
    }

    /**
     * Normalise le format de style vers le format Leaflet
     * @private
     * @param {Object} style - Style source (format imbriqué ou plat)
     * @param {string} layerId - ID de la couche (pour les patterns SVG)
     * @returns {Object} - Style normalisé au format Leaflet
     */
    function _normalizeStyleToLeaflet(style, layerId) {
        if (!style || typeof style !== 'object') {
            return {};
        }

        const normalized = {};

        // Nouveau format imbriqué avec fill/stroke
        if (style.fill || style.stroke) {
            // Fill (remplissage)
            if (style.fill) {
                if (style.fill.color) normalized.fillColor = style.fill.color;
                if (typeof style.fill.opacity === 'number') normalized.fillOpacity = style.fill.opacity;
                if (style.fill.pattern) normalized.fillPattern = style.fill.pattern;
            }

            // Si hatch avec renderMode="pattern_only", forcer un fillColor et une fillOpacity visible
            // (Leaflet a besoin d'un fillColor pour appliquer un pattern et l'opacité doit être > 0)
            if (style.hatch && style.hatch.enabled && style.hatch.renderMode === 'pattern_only') {
                if (!normalized.fillColor) normalized.fillColor = '#ffffff';
                // Override toute valeur de fill.opacity fournie par le style (souvent 0.0) pour rendre le pattern visible
                normalized.fillOpacity = 1.0;
            }

            // Stroke (contour)
            if (style.stroke) {
                if (style.stroke.color) normalized.color = style.stroke.color;
                if (typeof style.stroke.opacity === 'number') normalized.opacity = style.stroke.opacity;
                if (typeof style.stroke.widthPx === 'number') normalized.weight = style.stroke.widthPx;
                if (style.stroke.dashArray) normalized.dashArray = style.stroke.dashArray;
                if (style.stroke.lineCap) normalized.lineCap = style.stroke.lineCap;
                if (style.stroke.lineJoin) normalized.lineJoin = style.stroke.lineJoin;
            }

            // Casing (bordure/contour pour polylines)
            if (style.casing && style.casing.enabled) {
                normalized._casing = {
                    enabled: true,
                    color: style.casing.color || '#000000',
                    opacity: typeof style.casing.opacity === 'number' ? style.casing.opacity : 1.0,
                    weight: typeof style.casing.widthPx === 'number' ? style.casing.widthPx : 1.0,
                    dashArray: style.casing.dashArray || null,
                    lineCap: style.casing.lineCap || null,
                    lineJoin: style.casing.lineJoin || null
                };
            }

            // Propriétés communes
            if (style.shape) normalized.shape = style.shape;
            if (typeof style.sizePx === 'number') {
                normalized.radius = style.sizePx;
                normalized.sizePx = style.sizePx;
            }

            // Hatch (hachurage) - copie de la structure complète
            if (style.hatch) {
                normalized.hatch = { ...style.hatch };
                // Normaliser le stroke du hatch si présent
                if (style.hatch.stroke) {
                    const hatchStroke = {};
                    if (style.hatch.stroke.color) hatchStroke.color = style.hatch.stroke.color;
                    if (typeof style.hatch.stroke.opacity === 'number') hatchStroke.opacity = style.hatch.stroke.opacity;
                    if (typeof style.hatch.stroke.widthPx === 'number') hatchStroke.widthPx = style.hatch.stroke.widthPx;
                    normalized.hatch.stroke = hatchStroke;
                }

                // Créer le pattern SVG et l'appliquer comme fillPattern
                if (style.hatch.enabled && layerId) {
                    const patternId = _createHatchPattern(layerId, style.hatch);
                    if (patternId) {
                        // Stocker l'ID du pattern pour application ultérieure
                        normalized._hatchPatternId = patternId;

                        // Si renderMode = "pattern_only", on utilise le pattern comme fill
                        // IMPORTANT: on NE définit PAS fillOpacity=0 car cela rendrait le pattern invisible!
                        // Le pattern SVG s'affichera avec son propre rendu via l'attribut fill="url(#pattern-id)"
                        if (style.hatch.renderMode === 'pattern_only') {
                            // Rendre le pattern visible: fillOpacity doit être > 0 et un fillColor doit exister
                            normalized.fillColor = normalized.fillColor || '#ffffff';
                            normalized.fillOpacity = 1.0;
                        }
                    }
                }
            }
        }
        // Ancien format plat (rétrocompatibilité)
        else {
            // Copier toutes les propriétés directement
            Object.assign(normalized, style);
        }

        return normalized;
    }

    /**
     * Applique un nouveau style à une couche existante.
     * Utilisé par le module Themes pour changer dynamiquement l'apparence.
     *
     * @param {string} layerId - ID de la couche
     * @param {Object} styleConfig - Configuration du style { style, styleRules }
     * @returns {boolean} - true si le style a été appliqué avec succès
     */
    LayerManager.setLayerStyle = function (layerId, styleConfig) {
        const state = getState();
        const Log = getLog();
        const layerData = state.layers.get(layerId);

        if (!layerData) {
            Log.warn("[GeoLeaf.GeoJSON] setLayerStyle: couche introuvable :", layerId);
            return false;
        }

        const leafletLayer = layerData.layer;
        if (!leafletLayer || typeof leafletLayer.setStyle !== 'function') {
            Log.warn("[GeoLeaf.GeoJSON] setLayerStyle: couche sans méthode setStyle :", layerId);
            return false;
        }

        // Préparer le style par défaut (ne pas utiliser defaultStyle qui peut contenir les anciennes valeurs)
        const baseStyle = {
            color: '#3388ff',
            weight: 3,
            opacity: 0.65,
            fillColor: '#3388ff',
            fillOpacity: 0.2
        };

        // Normaliser le style (defaultStyle ou style) vers format Leaflet
        const rawStyle = styleConfig.defaultStyle || styleConfig.style || {};
        const normalizedStyle = _normalizeStyleToLeaflet(rawStyle, layerId);
        const defaultStyle = Object.assign({}, baseStyle, normalizedStyle);

        // Préparer les styleRules
        const styleRules = Array.isArray(styleConfig.styleRules) ? styleConfig.styleRules : [];

        // Fonction de style dynamique
        const styleFn = (feature) => {
            // 1. Commencer avec le style par défaut
            let finalStyle = Object.assign({}, defaultStyle);

            // 2. Appliquer les styleRules (première règle correspondante gagne)
            if (styleRules.length > 0 && GeoLeaf._GeoJSONStyleResolver) {
                const matchedStyle = GeoLeaf._GeoJSONStyleResolver.evaluateStyleRules(feature, styleRules);
                if (matchedStyle) {
                    // Normaliser le style de la règle vers format Leaflet
                    const normalizedRuleStyle = _normalizeStyleToLeaflet(matchedStyle, layerId);
                    finalStyle = Object.assign({}, finalStyle, normalizedRuleStyle);
                }
            }

            // 3. NE PAS appliquer properties.style ou properties.color pour permettre aux règles de s'appliquer
            // Commenté car cela écrase les règles de style
            // const featureStyle = feature && feature.properties && feature.properties.style
            //     ? feature.properties.style
            //     : null;
            // if (featureStyle) {
            //     finalStyle = Object.assign({}, finalStyle, featureStyle);
            // }

            return finalStyle;
        };

        // Appliquer le style à toutes les features de la couche
        try {
            let styled = 0;
            let skipped = 0;
            let markersRecreated = 0;
            const layersToRecreate = [];

            // Première passe : identifier et styler ou marquer pour recréation
            leafletLayer.eachLayer(function(layer) {
                if (!layer.feature) {
                    skipped++;
                    return;
                }

                const style = styleFn(layer.feature);

                // Cas 1: Layers avec setStyle (Path, CircleMarker, Polyline, etc.)
                if (layer.setStyle && typeof layer.setStyle === 'function') {
                    layer.setStyle(style);
                    styled++;

                    // Gérer le casing (bordure pour polylines)
                    if (style._casing && style._casing.enabled && layer instanceof global.L.Polyline && !(layer instanceof global.L.Polygon)) {
                        const casingConfig = style._casing;

                        // Créer ou mettre à jour la polyline de casing (dessous, plus large)
                        if (!layer._casingLayer) {
                            // Créer une nouvelle couche de casing
                            const casingStyle = {
                                color: casingConfig.color,
                                opacity: casingConfig.opacity,
                                weight: casingConfig.weight,
                                dashArray: casingConfig.dashArray,
                                lineCap: casingConfig.lineCap || 'butt',
                                lineJoin: casingConfig.lineJoin || 'miter',
                                fill: false
                            };

                            layer._casingLayer = global.L.polyline(layer.getLatLngs(), casingStyle);
                            // Ajouter la couche de casing au même parent (group ou map)
                            if (leafletLayer && leafletLayer.addLayer) {
                                leafletLayer.addLayer(layer._casingLayer);
                            } else if (layer._map) {
                                layer._map.addLayer(layer._casingLayer);
                            }
                            // Mettre la couche de casing derrière la couche principale
                            if (layer._casingLayer.setZIndex) {
                                layer._casingLayer.setZIndex((layer.options.zIndex || 0) - 1);
                            }
                        } else {
                            // Mettre à jour le style existant
                            layer._casingLayer.setStyle({
                                color: casingConfig.color,
                                opacity: casingConfig.opacity,
                                weight: casingConfig.weight,
                                dashArray: casingConfig.dashArray,
                                lineCap: casingConfig.lineCap || 'butt',
                                lineJoin: casingConfig.lineJoin || 'miter'
                            });
                        }
                    } else if (!style._casing || !style._casing.enabled) {
                        // Supprimer la couche de casing si elle existe mais n'est plus nécessaire
                        if (layer._casingLayer && leafletLayer && leafletLayer.removeLayer) {
                            leafletLayer.removeLayer(layer._casingLayer);
                            layer._casingLayer = null;
                        }
                    }

                    // Appliquer le hachurage si présent dans ce style
                    if (style._hatchPatternId && style.hatch) {
                        const patternId = style._hatchPatternId;
                        const hatchConfig = style.hatch;
                        // Log supprimé pour éviter des milliers de logs (appelé pour chaque feature)
                        // ...log supprimé pour éviter du bruit inutile...

                        // Appliquer immédiatement si le path existe
                        if (layer._path) {
                            setTimeout(() => {
                                _applyHatchToLayer(layer, patternId, hatchConfig);
                            }, 0);
                        }

                        // Ajouter aussi un listener pour quand le layer est ajouté/re-ajouté
                        if (!layer._hatchPatternId || layer._hatchPatternId !== patternId) {
                            layer._hatchPatternId = patternId;

                            // Supprimer l'ancien listener s'il existe
                            if (layer._hatchListener) {
                                layer.off('add', layer._hatchListener);
                            }

                            // Créer le nouveau listener
                            layer._hatchListener = function() {
                                if (this._path) {
                                    _applyHatchToLayer(this, patternId, hatchConfig);
                                }
                            };

                            layer.on('add', layer._hatchListener);
                        }
                    }
                }
                // Cas 2: Markers avec icônes - besoin de recréer avec nouvelle icône
                else if (global.L && layer instanceof global.L.Marker) {
                    layersToRecreate.push({ layer, feature: layer.feature, style });
                } else {
                    skipped++;
                }
            });

            // Seconde passe : recréer les markers avec les nouvelles couleurs
            if (layersToRecreate.length > 0) {
                const POIMarkers = global.GeoLeaf && global.GeoLeaf._POIMarkers;

                layersToRecreate.forEach(({ layer, feature, style }) => {
                    const latlng = layer.getLatLng();

                    // Utiliser le système POI pour créer une nouvelle icône colorée
                    if (POIMarkers && typeof POIMarkers.buildMarkerIcon === 'function') {
                        const poiData = {
                            ...feature.properties,
                            latlng: [latlng.lat, latlng.lng],
                            attributes: feature.properties.attributes || {},
                            _layerConfig: { style: style } // Passer le style pour resolveCategoryColors
                        };

                        let displayConfig = {};
                        if (typeof POIMarkers.resolveCategoryDisplay === 'function') {
                            displayConfig = POIMarkers.resolveCategoryDisplay(poiData);
                        }

                        // Override avec tous les paramètres du style
                        if (style.fillColor) {
                            displayConfig.colorFill = style.fillColor;
                        }
                        if (style.color) {
                            displayConfig.colorStroke = style.color;
                        }
                        if (typeof style.radius === 'number') {
                            displayConfig.radius = style.radius;
                        }
                        if (typeof style.weight === 'number') {
                            displayConfig.weight = style.weight;
                        }
                        if (typeof style.fillOpacity === 'number') {
                            displayConfig.fillOpacity = style.fillOpacity;
                        }
                        if (typeof style.opacity === 'number') {
                            displayConfig.opacity = style.opacity;
                        }

                        const newIcon = POIMarkers.buildMarkerIcon(displayConfig);
                        layer.setIcon(newIcon);
                        markersRecreated++;
                    } else {
                        // Fallback: remplacer par un CircleMarker
                        const newMarker = global.L.circleMarker(latlng, style);
                        newMarker.feature = feature;
                        leafletLayer.removeLayer(layer);
                        leafletLayer.addLayer(newMarker);
                        markersRecreated++;
                    }
                });
            }

            Log.debug(`[GeoLeaf.GeoJSON] Style appliqué: ${styled + markersRecreated} features (${styled} setStyle, ${markersRecreated} markers)`);

            // Appliquer le hachurage global uniquement si pas de styleRules avec hatch
            const hasHatchInRules = styleRules.some(rule => rule.style?.hatch?.enabled);

            if (defaultStyle._hatchPatternId && !hasHatchInRules) {
                const patternId = defaultStyle._hatchPatternId;

                // Appliquer immédiatement
                _applyHatchToLayer(leafletLayer, patternId);

                // Log résumé au lieu de logs individuels
                Log.debug(`[GeoLeaf.GeoJSON] Hachures appliquées: pattern=${patternId}, features=${styled}`);

                // Supprimer les anciens listeners pour éviter les doublons
                if (layerData._hatchListeners) {
                    leafletLayer.off('add', layerData._hatchListeners.onAdd);
                    if (global.L && global.L.DomEvent) {
                        leafletLayer.eachLayer(layer => {
                            if (layer._path) {
                                layer.off('add', layerData._hatchListeners.onLayerAdd);
                            }
                        });
                    }
                }

                // Créer les listeners pour réappliquer le hachurage après les redraws
                const onAdd = () => {
                    setTimeout(() => _applyHatchToLayer(leafletLayer, patternId), 0);
                };

                const onLayerAdd = function() {
                    if (this._path) {
                        this._path.setAttribute('fill', `url(#${patternId})`);
                    }
                };

                // Ajouter les listeners
                leafletLayer.on('add', onAdd);
                leafletLayer.eachLayer(layer => {
                    if (layer._path) {
                        layer.on('add', onLayerAdd);
                    }
                });

                // Stocker les listeners pour nettoyage futur
                layerData._hatchListeners = { onAdd, onLayerAdd };
                layerData._hatchPatternId = patternId;
            }

            // Mettre à jour la config stockée pour que les futures évaluations utilisent le nouveau style
            layerData.config = Object.assign({}, layerData.config, {
                style: styleConfig.defaultStyle || styleConfig.style,
                styleRules: styleRules
            });

            // Stocker currentStyle pour les labels
            layerData.currentStyle = styleConfig;

            // Mettre à jour l'état du bouton des labels immédiatement
            if (GeoLeaf._LabelButtonManager) {
                GeoLeaf._LabelButtonManager.syncImmediate(layerId);
            }

            // Réévaluer la visibilité après application du style (layerScale)
            if (GeoLeaf._GeoJSONLayerManager && typeof GeoLeaf._GeoJSONLayerManager.updateLayerVisibilityByZoom === "function") {
                GeoLeaf._GeoJSONLayerManager.updateLayerVisibilityByZoom();
            }

            Log.debug("[GeoLeaf.GeoJSON] Style appliqué avec succès :", layerId);
            return true;
        } catch (err) {
            Log.error("[GeoLeaf.GeoJSON] Erreur setLayerStyle :", layerId, err.message);
            return false;
        }
    };

})(window);
