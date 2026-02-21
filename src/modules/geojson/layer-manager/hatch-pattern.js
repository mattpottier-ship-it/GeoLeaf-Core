/**
 * GeoLeaf GeoJSON - Hatch Pattern Utilities
 * SVG hatch pattern creation and application for polygon fills.
 * Extracted from layer-manager/style.js (Phase 8.2.1)
 *
 * @module geojson/layer-manager/hatch-pattern
 */
"use strict";

/**
 * Crée un pattern SVG pour le hachurage.
 * Retourne l'ID (string) du pattern, à passer à `_applyHatchToLayer`.
 * Les patterns sont réellement injectés dans le DOM dans `_applyHatchToLayer`.
 *
 * @param {string} layerId - ID de la couche (pour l'unicité du pattern)
 * @param {Object} hatchConfig - Configuration du hachurage
 * @returns {string|null} patternId, ou null si hachurage désactivé
 */
export function _createHatchPattern(layerId, hatchConfig) {
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

    // Retourner juste l'ID du pattern.
    // Les patterns seront injectés dans le SVG Leaflet dans _applyHatchToLayer.
    return patternId;
}

/**
 * Trouve l'élément SVG contenant les paths d'un layer Leaflet.
 * Les layers sur des panes custom (geoleaf-layer-XX) ont leur propre SVG.
 *
 * @param {L.Layer} layer - Layer Leaflet
 * @returns {SVGSVGElement|null}
 */
export function _findLayerSvg(layer) {
    // 1. Chercher via le path du layer lui-même
    if (layer._path && layer._path.ownerSVGElement) {
        return layer._path.ownerSVGElement;
    }

    // 2. Pour les groupes, chercher via le premier sublayer avec un path
    if (typeof layer.eachLayer === 'function') {
        let found = null;
        layer.eachLayer(sublayer => {
            if (!found && sublayer._path && sublayer._path.ownerSVGElement) {
                found = sublayer._path.ownerSVGElement;
            }
        });
        if (found) return found;
    }

    // 3. Chercher via le renderer du layer (Leaflet stocke le renderer)
    const renderer = layer._renderer || layer._map?._renderer;
    if (renderer && renderer._container && renderer._container.tagName === 'svg') {
        return renderer._container;
    }

    // 4. Fallback: chercher dans tous les panes (pas seulement overlay-pane)
    const svgs = document.querySelectorAll('.leaflet-pane svg');
    if (svgs.length === 1) return svgs[0];

    // 5. Dernier fallback: overlay-pane
    return document.querySelector('.leaflet-overlay-pane svg');
}

/**
 * Applique le hachurage SVG à un layer Leaflet.
 * Injecte le pattern dans le `<defs>` du SVG Leaflet et pose un MutationObserver
 * pour que le `fill` reste sur le pattern même après un re-render Leaflet.
 *
 * @param {L.Layer} layer - Layer Leaflet
 * @param {string} patternId - ID du pattern SVG
 * @param {Object} hatchConfig - Configuration du hachurage
 */
export function _applyHatchToLayer(layer, patternId, hatchConfig) {
    if (!layer || !patternId) return;

    // Trouver le SVG correct pour ce layer (pane custom ou overlay-pane)
    let mapSvg = _findLayerSvg(layer);
    if (!mapSvg) {
        // Retry avec délai si SVG n'existe pas encore
        const retryCount = 5;
        const retryDelay = 100; // ms
        let attempts = 0;
        const tryApplyHatch = () => {
            mapSvg = _findLayerSvg(layer);
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
                // Toujours forcer fill-opacity=1 quand le pattern est appliqué.
                // C'est ici (et uniquement ici) qu'on rend le fill visible,
                // car le pattern SVG est déjà injecté — pas de flash blanc.
                path.setAttribute('fill-opacity', '1');
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

    // Pour les groupes de layers (L.geoJSON, FeatureGroup, MultiPolygon)
    // Récursif : gère les FeatureGroups imbriqués (ex: MultiPolygon dans L.geoJSON)
    if (typeof layer.eachLayer === 'function') {
        layer.eachLayer(sublayer => {
            if (sublayer._path) {
                applyToPath(sublayer._path);
            } else if (typeof sublayer.eachLayer === 'function') {
                // Recurse into nested groups (MultiPolygon → individual Polygons)
                sublayer.eachLayer(sub => {
                    if (sub._path) {
                        applyToPath(sub._path);
                    }
                });
            }
        });
    }

    // Phase 1 fix L1: disconnect MutationObservers on layer remove to prevent memory leaks
    if (!layer._disconnectHatchObservers) {
        layer._disconnectHatchObservers = function() {
            const disconnectPath = (p) => {
                if (p._hatchObserver) {
                    p._hatchObserver.disconnect();
                    p._hatchObserver = null;
                }
            };
            if (this._path) disconnectPath(this._path);
            if (typeof this.eachLayer === 'function') {
                this.eachLayer(sub => {
                    if (sub._path) disconnectPath(sub._path);
                    if (typeof sub.eachLayer === 'function') {
                        sub.eachLayer(inner => {
                            if (inner._path) disconnectPath(inner._path);
                        });
                    }
                });
            }
        };
        layer.on('remove', function() { this._disconnectHatchObservers(); });
    }
}
