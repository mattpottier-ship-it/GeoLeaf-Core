/**
 * GeoLeaf UI Components - Module commun partagé
 * Composants d'interface réutilisables pour Legend et LayerManager
 *
 * Extrait le code commun entre:
 * - legend-renderer.js
 * - layer-manager/renderer.js
 *
 * DÉPENDANCES:
 * - Leaflet (L.DomUtil, L.DomEvent)
 * - Log (import ESM)
 *
 * EXPOSE:
 * - _UIComponents
 *
 * @module ui/components
 */

import { Log } from '../log/index.js';

    /**
     * Module UI Components
     * @namespace _UIComponents
     * @private
     */
    const _UIComponents = {
        /**
         * Crée un accordéon
         * @param {HTMLElement} container - Conteneur parent
         * @param {Object} config - Configuration de l'accordéon
         * @param {string} config.layerId - ID de la couche
         * @param {string} config.label - Titre de l'accordéon
         * @param {boolean} config.collapsed - État initial
         * @param {boolean} config.visible - Couche visible ou non (pour grisage)
         * @param {Function} [config.onToggle] - Callback lors du toggle
         * @returns {Object} - { accordionEl, headerEl, bodyEl }
         */
        createAccordion(container, config) {
            const accordionEl = globalThis.L.DomUtil.create("div", "gl-legend__accordion", container);
            accordionEl.setAttribute("data-layer-id", config.layerId);

            if (config.collapsed) {
                accordionEl.classList.add("gl-legend__accordion--collapsed");
            }

            // Ajouter classe inactive si la couche n'est pas visible
            if (config.visible === false) {
                accordionEl.classList.add("gl-legend__accordion--inactive");
            }

            // Header de l'accordéon
            const headerEl = globalThis.L.DomUtil.create("div", "gl-legend__accordion-header", accordionEl);
            headerEl.setAttribute("role", "button");
            headerEl.setAttribute("tabindex", "0");
            headerEl.setAttribute("aria-expanded", !config.collapsed);

            const titleEl = globalThis.L.DomUtil.create("span", "gl-legend__accordion-title", headerEl);
            titleEl.textContent = config.label;

            const toggleEl = globalThis.L.DomUtil.create("button", "gl-legend__accordion-toggle", headerEl);
            toggleEl.type = "button";
            toggleEl.setAttribute("aria-label", "Basculer l'accordéon");
            toggleEl.textContent = config.collapsed ? "▶" : "▼";

            // Body de l'accordéon
            const bodyEl = globalThis.L.DomUtil.create("div", "gl-legend__accordion-body", accordionEl);

            // Gestionnaire de clic sur le header
            const onToggle = (ev) => {
                // Ne rien faire si la couche est inactive
                if (config.visible === false) {
                    if (globalThis.L && globalThis.L.DomEvent) {
                        globalThis.L.DomEvent.stopPropagation(ev);
                    }
                    ev.preventDefault();
                    return;
                }

                if (globalThis.L && globalThis.L.DomEvent) {
                    globalThis.L.DomEvent.stopPropagation(ev);
                }
                ev.preventDefault();

                const isCollapsed = accordionEl.classList.toggle("gl-legend__accordion--collapsed");
                toggleEl.textContent = isCollapsed ? "▶" : "▼";
                headerEl.setAttribute("aria-expanded", !isCollapsed);

                // Callback optionnel
                if (typeof config.onToggle === "function") {
                    config.onToggle(config.layerId, !isCollapsed);
                }
            };

            this.attachEventHandler(headerEl, "click", onToggle);

            return { accordionEl, headerEl, bodyEl, toggleEl };
        },

        /**
         * Rend un symbole cercle (POI/Marker)
         * @param {HTMLElement} container - Conteneur du symbole
         * @param {Object} config - Configuration du symbole
         * @returns {HTMLElement} - Élément créé
         */
        renderCircleSymbol(container, config) {
            const circleEl = globalThis.L.DomUtil.create("div", "gl-legend__circle", container);

            // Utiliser le radius transmis, sinon 24px par défaut (plus grand pour les légendes avec icônes)
            const radius = config.radius !== undefined ? config.radius : 24;
            const size = radius * 2;
            const fillColor = config.fillColor || config.color || "#3388ff";
            const strokeColor = config.color || config.borderColor || "rgba(0,0,0,0.2)";
            const strokeWidth = config.weight || 1;

            circleEl.style.width = size + "px";
            circleEl.style.height = size + "px";
            circleEl.style.backgroundColor = fillColor;
            circleEl.style.borderRadius = "50%";
            circleEl.style.border = strokeWidth + "px solid " + strokeColor;
            circleEl.style.position = "relative";
            circleEl.style.display = "flex";
            circleEl.style.alignItems = "center";
            circleEl.style.justifyContent = "center";

            if (config.fillOpacity !== undefined) {
                circleEl.style.opacity = config.fillOpacity;
            }

            // Afficher l'icône sprite SVG si présente
            if (config.icon) {
                // Validation de sécurité: L'ID d'icône doit être alphanumérique avec tirets/underscores seulement
                const iconId = config.icon.startsWith('#') ? config.icon.substring(1) : config.icon;
                if (!/^[a-zA-Z0-9_-]+$/.test(iconId)) {
                    if (Log) Log.error('[UIComponents] ID d\'icône invalide (caractères non autorisés):', config.icon);
                    return circleEl;
                }

                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute("viewBox", "0 0 24 24");
                // Rendre l'icône à 85% du cercle pour qu'elle soit bien visible
                svg.style.width = (size * 0.85) + "px";
                svg.style.height = (size * 0.85) + "px";
                svg.style.fill = config.iconColor || "currentColor";
                svg.style.stroke = config.iconColor || "currentColor";
                svg.style.color = "#ffffff"; // Définir la couleur de base pour currentColor
                svg.style.pointerEvents = "none";
                svg.style.position = "absolute";

                const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
                // ID validé, construire le href sécurisé
                const iconHref = '#' + iconId;
                // Utiliser la syntaxe moderne href au lieu de xlink:href
                use.setAttribute("href", iconHref);
                svg.appendChild(use);
                circleEl.appendChild(svg);

                // Vérification d'erreur seulement si Log est disponible
                if (Log) {
                    const spriteExists = document.querySelector('svg[data-geoleaf-sprite="profile"]');
                    if (!spriteExists) {
                        svg.setAttribute('data-sprite-missing', 'true');
                        Log.warn('[UIComponents] Icône', config.icon, 'référencée mais sprite non trouvé dans le DOM');
                    } else {
                        const symbolId = config.icon.startsWith('#') ? config.icon.substring(1) : config.icon;
                        const symbol = spriteExists.querySelector('#' + symbolId);
                        if (!symbol) {
                            svg.setAttribute('data-symbol-missing', config.icon);
                            Log.warn('[UIComponents] Symbole', config.icon, 'non trouvé dans le sprite SVG');
                        }
                    }
                }
            }

            return circleEl;
        },

        /**
         * Rend un symbole ligne
         * @param {HTMLElement} container - Conteneur du symbole
         * @param {Object} config - Configuration du symbole
         * @returns {HTMLElement} - Élément créé
         */
        renderLineSymbol(container, config) {
            const width = config.width || 3;
            const color = config.color || "#3388ff";
            let style = config.style || "solid";
            const dashArray = config.dashArray || null;
            const outlineColor = config.outlineColor || null;
            const outlineWidth = config.outlineWidth || null;

            // Créer un SVG pour les lignes complexes (dashArray custom, tirets épais, ou avec outline)
            if (dashArray || width > 5 || (outlineColor && outlineWidth)) {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute("viewBox", "0 0 40 8");
                svg.style.width = "40px";
                const totalHeight = Math.max(width, 3) + (outlineWidth || 0) + 4;
                svg.style.height = totalHeight + "px";

                // Si outline existe, dessiner d'abord la ligne de contour
                if (outlineColor && outlineWidth) {
                    const outlineLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    outlineLine.setAttribute("x1", "0");
                    outlineLine.setAttribute("y1", "4");
                    outlineLine.setAttribute("x2", "40");
                    outlineLine.setAttribute("y2", "4");
                    outlineLine.setAttribute("stroke", outlineColor);
                    outlineLine.setAttribute("stroke-width", width + (outlineWidth * 2));
                    outlineLine.setAttribute("stroke-linecap", "round");

                    if (config.outlineOpacity !== undefined) {
                        outlineLine.setAttribute("stroke-opacity", config.outlineOpacity);
                    }

                    svg.appendChild(outlineLine);
                }

                // Dessiner ensuite la ligne principale
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", "0");
                line.setAttribute("y1", "4");
                line.setAttribute("x2", "40");
                line.setAttribute("y2", "4");
                line.setAttribute("stroke", color);
                line.setAttribute("stroke-width", width);
                line.setAttribute("stroke-linecap", "round");

                if (dashArray) {
                    line.setAttribute("stroke-dasharray", dashArray);
                } else if (style === "dashed") {
                    line.setAttribute("stroke-dasharray", "8,4");
                } else if (style === "dotted") {
                    line.setAttribute("stroke-dasharray", "2,3");
                }

                if (config.opacity !== undefined) {
                    line.setAttribute("stroke-opacity", config.opacity);
                }

                svg.appendChild(line);
                container.appendChild(svg);
                return svg;
            }

            // Fallback : DIV simple pour lignes basiques
            const lineEl = globalThis.L.DomUtil.create("div", "gl-legend__line", container);
            lineEl.style.width = "30px";
            lineEl.style.height = width + "px";
            lineEl.style.backgroundColor = color;

            if (style === "dashed") {
                lineEl.style.backgroundImage = `linear-gradient(to right, ${color} 50%, transparent 50%)`;
                lineEl.style.backgroundSize = "8px 100%";
            } else if (style === "dotted") {
                lineEl.style.backgroundImage = `linear-gradient(to right, ${color} 30%, transparent 30%)`;
                lineEl.style.backgroundSize = "4px 100%";
            }

            if (config.opacity !== undefined) {
                lineEl.style.opacity = config.opacity;
            }

            return lineEl;
        },

        /**
         * Rend un symbole polygone/remplissage
         * @param {HTMLElement} container - Conteneur du symbole
         * @param {Object} config - Configuration du symbole
         * @returns {HTMLElement} - Élément créé
         */
        renderPolygonSymbol(container, config) {
            const color = config.fillColor || config.color || "#3388ff";
            const borderColor = config.borderColor || config.color || "#333";
            const borderWidth = config.weight || 1;
            const hasHatch = config.hatch && config.hatch.enabled;
            // Vérifier fillOpacity OU opacity (le generator peut utiliser l'un ou l'autre)
            let fillOpacity = config.fillOpacity !== undefined ? config.fillOpacity :
                               (config.opacity !== undefined ? config.opacity : 1);

            // FIX: Si hatch avec renderMode="pattern_only", forcer fillOpacity=1.0
            // (même logique que layer-manager.js ligne 823-828 - doit rester synchronisé)
            if (hasHatch && config.hatch.renderMode === 'pattern_only') {
                fillOpacity = 1.0;
            }

            // Utiliser SVG si hachures présentes OU si fillOpacity = 0 (contour seul)
            if (hasHatch || fillOpacity === 0) {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute("viewBox", "0 0 32 24");
                svg.style.width = "32px";
                svg.style.height = "24px";

                // Créer le pattern de hachure SVG si nécessaire
                if (hasHatch) {
                    const hatchCfg = config.hatch;
                    const type = hatchCfg.type || "diagonal";
                    const spacing = hatchCfg.spacingPx || 10;
                    const hatchColor = (hatchCfg.stroke && hatchCfg.stroke.color) || "#000000";
                    const hatchOpacity = (hatchCfg.stroke && hatchCfg.stroke.opacity) !== undefined ? hatchCfg.stroke.opacity : 1;
                    const hatchWidth = (hatchCfg.stroke && hatchCfg.stroke.widthPx) || 1;

                    const patternId = "hatch-legend-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
                    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                    const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");

                    pattern.setAttribute("id", patternId);
                    pattern.setAttribute("patternUnits", "userSpaceOnUse");
                    pattern.setAttribute("width", spacing);
                    pattern.setAttribute("height", spacing);

                    // Créer le contenu selon le type
                    if (type === "diagonal") {
                        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        line.setAttribute("x1", "0");
                        line.setAttribute("y1", "0");
                        line.setAttribute("x2", spacing);
                        line.setAttribute("y2", spacing);
                        line.setAttribute("stroke", hatchColor);
                        line.setAttribute("stroke-width", hatchWidth);
                        line.setAttribute("stroke-opacity", hatchOpacity);
                        pattern.appendChild(line);
                    } else if (type === "dot") {
                        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                        circle.setAttribute("cx", spacing / 2);
                        circle.setAttribute("cy", spacing / 2);
                        circle.setAttribute("r", Math.max(0.3, spacing * 0.07));
                        circle.setAttribute("fill", hatchColor);
                        circle.setAttribute("fill-opacity", hatchOpacity);
                        pattern.appendChild(circle);
                    } else if (type === "cross") {
                        const hLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        hLine.setAttribute("x1", "0");
                        hLine.setAttribute("y1", spacing / 2);
                        hLine.setAttribute("x2", spacing);
                        hLine.setAttribute("y2", spacing / 2);
                        hLine.setAttribute("stroke", hatchColor);
                        hLine.setAttribute("stroke-width", hatchWidth);
                        hLine.setAttribute("stroke-opacity", hatchOpacity);
                        pattern.appendChild(hLine);

                        const vLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        vLine.setAttribute("x1", spacing / 2);
                        vLine.setAttribute("y1", "0");
                        vLine.setAttribute("x2", spacing / 2);
                        vLine.setAttribute("y2", spacing);
                        vLine.setAttribute("stroke", hatchColor);
                        vLine.setAttribute("stroke-width", hatchWidth);
                        vLine.setAttribute("stroke-opacity", hatchOpacity);
                        pattern.appendChild(vLine);
                    } else if (type === "x") {
                        const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        line1.setAttribute("x1", "0");
                        line1.setAttribute("y1", "0");
                        line1.setAttribute("x2", spacing);
                        line1.setAttribute("y2", spacing);
                        line1.setAttribute("stroke", hatchColor);
                        line1.setAttribute("stroke-width", hatchWidth);
                        line1.setAttribute("stroke-opacity", hatchOpacity);
                        pattern.appendChild(line1);

                        const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        line2.setAttribute("x1", spacing);
                        line2.setAttribute("y1", "0");
                        line2.setAttribute("x2", "0");
                        line2.setAttribute("y2", spacing);
                        line2.setAttribute("stroke", hatchColor);
                        line2.setAttribute("stroke-width", hatchWidth);
                        line2.setAttribute("stroke-opacity", hatchOpacity);
                        pattern.appendChild(line2);
                    }

                    defs.appendChild(pattern);
                    svg.appendChild(defs);

                    // Rectangle avec hachure
                    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    rect.setAttribute("x", "1");
                    rect.setAttribute("y", "1");
                    rect.setAttribute("width", "30");
                    rect.setAttribute("height", "22");
                    rect.setAttribute("fill", `url(#${patternId})`);
                    rect.setAttribute("stroke", borderColor);
                    rect.setAttribute("stroke-width", borderWidth);
                    if (fillOpacity !== 1) {
                        rect.setAttribute("fill-opacity", fillOpacity);
                    }

                    svg.appendChild(rect);
                } else {
                    // fillOpacity = 0 : rectangle transparent avec contour seulement
                    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    rect.setAttribute("x", "1");
                    rect.setAttribute("y", "1");
                    rect.setAttribute("width", "30");
                    rect.setAttribute("height", "22");
                    rect.setAttribute("fill", "none");
                    rect.setAttribute("stroke", borderColor);
                    rect.setAttribute("stroke-width", borderWidth);

                    // Appliquer le dashArray si présent
                    if (config.dashArray) {
                        rect.setAttribute("stroke-dasharray", config.dashArray);
                    }

                    svg.appendChild(rect);
                }

                container.appendChild(svg);
                return svg;
            }

            // Fallback : DIV simple avec remplissage
            const polygonEl = globalThis.L.DomUtil.create("div", "gl-legend__polygon", container);
            polygonEl.style.width = "24px";
            polygonEl.style.height = "16px";
            polygonEl.style.backgroundColor = color;
            polygonEl.style.border = borderWidth + "px solid " + borderColor;

            if (fillOpacity !== 1) {
                polygonEl.style.opacity = fillOpacity;
            }

            return polygonEl;
        },

        /**
         * Rend un symbole étoile (rating)
         * @param {HTMLElement} container - Conteneur du symbole
         * @param {Object} config - Configuration du symbole
         * @returns {HTMLElement} - Élément créé
         */
        renderStarSymbol(container, config) {
            const starContainer = globalThis.L.DomUtil.create("div", "gl-legend__stars", container);

            const count = config.count || 5;
            const color = config.color || "#f1c40f";
            const size = config.size || 12;

            for (let i = 0; i < count; i++) {
                    const starEl = globalThis.L.DomUtil.create("span", "gl-legend__star", starContainer);
                starEl.textContent = "★";
                starEl.style.color = color;
                starEl.style.fontSize = size + "px";
            }

            return starContainer;
        },

        /**
         * Rend un symbole selon son type
         * @param {HTMLElement} container - Conteneur du symbole
         * @param {Object} config - Configuration du symbole
         * @returns {HTMLElement} - Élément créé
         */
        renderSymbol(container, config) {
            // Support de la structure avec config.symbol ou directement config
            const symbolConfig = config.symbol || config;
            const symbolType = symbolConfig.type || config.type || "circle";

            switch (symbolType) {
                case "marker":
                case "circle":
                    return this.renderCircleSymbol(container, symbolConfig);

                case "line":
                    return this.renderLineSymbol(container, symbolConfig);

                case "polygon":
                case "fill":
                    return this.renderPolygonSymbol(container, symbolConfig);

                case "star":
                    return this.renderStarSymbol(container, symbolConfig);

                case "icon":
                    // Icon avec URL d'image
                    if (symbolConfig.iconUrl) {
                        const imgEl = globalThis.L.DomUtil.create("img", "gl-legend__icon-img", container);
                        imgEl.src = symbolConfig.iconUrl;
                        if (symbolConfig.size) {
                            imgEl.style.width = symbolConfig.size + "px";
                            imgEl.style.height = symbolConfig.size + "px";
                        }
                        return imgEl;
                    }
                    // Icon avec sprite SVG - utiliser renderCircleSymbol qui gère déjà les sprites
                    if (symbolConfig.icon) {
                        return this.renderCircleSymbol(container, symbolConfig);
                    }
                    // Fallback vers circle
                    return this.renderCircleSymbol(container, symbolConfig);

                default:
                    return this.renderCircleSymbol(container, symbolConfig);
            }
        },

        /**
         * Crée un bouton toggle (checkbox/switch)
         * @param {HTMLElement} container - Conteneur parent
         * @param {Object} config - Configuration du toggle
         * @param {string} [config.id] - ID du toggle
         * @param {boolean} config.isActive - État initial (alias: active)
         * @param {string} [config.className] - Classe CSS personnalisée
         * @param {string} [config.label] - Label du toggle
         * @param {string} [config.title] - Tooltip
         * @param {Function} [config.onToggle] - Callback lors du toggle
         * @returns {HTMLElement} - Élément bouton créé
         */
        createToggleButton(container, config) {
            // Support isActive ou active
            const isActive = config.isActive !== undefined ? config.isActive : config.active;
            const className = config.className || "gl-toggle-btn";

            const toggleBtn = globalThis.L.DomUtil.create(
                "button",
                className,
                container
            );
            toggleBtn.type = "button";

            if (config.id) {
                toggleBtn.setAttribute("data-toggle-id", config.id);
            }

            toggleBtn.setAttribute("aria-pressed", isActive ? "true" : "false");

            if (config.title) {
                toggleBtn.title = config.title;
            }

            if (isActive) {
                toggleBtn.classList.add(className + "--on");
            }

            if (config.label) {
                toggleBtn.textContent = config.label;
            }

            // Attacher le gestionnaire
            if (typeof config.onToggle === "function") {
                const className = config.className || "gl-toggle-btn";
                const onToggle = (ev) => {
                    if (globalThis.L && globalThis.L.DomEvent) {
                        globalThis.L.DomEvent.stopPropagation(ev);
                    }
                    ev.preventDefault();

                    const isActive = toggleBtn.classList.toggle(className + "--on");
                    toggleBtn.setAttribute("aria-pressed", isActive ? "true" : "false");

                    config.onToggle(config.id, isActive, ev);
                };

                this.attachEventHandler(toggleBtn, "click", onToggle);
            }

            return toggleBtn;
        },

        /**
         * Attache un gestionnaire d'événements compatible Leaflet
         * @param {HTMLElement} element - Élément cible
         * @param {string} eventName - Nom de l'événement
         * @param {Function} handler - Gestionnaire
         */
        attachEventHandler(element, eventName, handler) {
            if (globalThis.L && globalThis.L.DomEvent) {
                globalThis.L.DomEvent.on(element, eventName, handler);
                if (eventName === "click") {
                    globalThis.L.DomEvent.disableClickPropagation(element);
                }
            } else {
                element.addEventListener(eventName, handler);
            }
        }
    };

// ── ESM Export ──
export { _UIComponents };
