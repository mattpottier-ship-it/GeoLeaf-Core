// @ts-nocheck ´┐¢ migration TS, typage progressif
/**
 * GeoLeaf UI Components - Common shared module
 * Reusable UI components for Legend and LayerManager
 *
 * Extrait le code commun entre:
 * - legend-renderer.js
 * - layer-manager/renderer.js
 *
 * DEPENDENCIES:
 * - Leaflet (L.DomUtil, L.DomEvent)
 * - Log (import ESM)
 *
 * EXPOSE:
 * - _UIComponents
 *
 * @module ui/components
 */

import { Log } from "../log/index.js";

/**
 * Module UI Components
 * @namespace _UIComponents
 * @private
 */
function _appendCircleIconSvg(circleEl, iconId, size, iconColor) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.style.width = size * 0.85 + "px";
    svg.style.height = size * 0.85 + "px";
    svg.style.fill = iconColor || "currentColor";
    svg.style.stroke = iconColor || "currentColor";
    svg.style.color = "#ffffff";
    svg.style.pointerEvents = "none";
    svg.style.position = "absolute";
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + iconId);
    svg.appendChild(use);
    circleEl.appendChild(svg);
    if (Log) {
        const spriteExists = document.querySelector('svg[data-geoleaf-sprite="profile"]');
        if (!spriteExists) {
            svg.setAttribute("data-sprite-missing", "true");
            Log.warn("[UIComponents] Icon", "#" + iconId, "referenced but sprite not found in DOM");
        } else if (!spriteExists.querySelector("#" + iconId)) {
            svg.setAttribute("data-symbol-missing", "#" + iconId);
            Log.warn("[UIComponents] Symbol", "#" + iconId, "not found in SVG sprite");
        }
    }
}

function _buildLineSvgEl(config, width, color, dashArray, outlineColor, outlineWidth) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 40 8");
    svg.style.width = "40px";
    const totalHeight = Math.max(width, 3) + (outlineWidth || 0) + 4;
    svg.style.height = totalHeight + "px";
    if (outlineColor && outlineWidth) {
        const outlineLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        outlineLine.setAttribute("x1", "0");
        outlineLine.setAttribute("y1", "4");
        outlineLine.setAttribute("x2", "40");
        outlineLine.setAttribute("y2", "4");
        outlineLine.setAttribute("stroke", outlineColor);
        outlineLine.setAttribute("stroke-width", width + outlineWidth * 2);
        outlineLine.setAttribute("stroke-linecap", "round");
        if (config.outlineOpacity !== undefined)
            outlineLine.setAttribute("stroke-opacity", config.outlineOpacity);
        svg.appendChild(outlineLine);
    }
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "0");
    line.setAttribute("y1", "4");
    line.setAttribute("x2", "40");
    line.setAttribute("y2", "4");
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", width);
    line.setAttribute("stroke-linecap", "round");
    if (dashArray) line.setAttribute("stroke-dasharray", dashArray);
    else if (config.style === "dashed") line.setAttribute("stroke-dasharray", "8,4");
    else if (config.style === "dotted") line.setAttribute("stroke-dasharray", "2,3");
    if (config.opacity !== undefined) line.setAttribute("stroke-opacity", config.opacity);
    svg.appendChild(line);
    return svg;
}

function _buildLegendHatchDefs(svg, config) {
    const hatchCfg = config.hatch;
    const type = hatchCfg.type || "diagonal";
    const spacing = hatchCfg.spacingPx || 10;
    const hatchColor = (hatchCfg.stroke && hatchCfg.stroke.color) || "#000000";
    const hatchOpacity =
        (hatchCfg.stroke && hatchCfg.stroke.opacity) !== undefined ? hatchCfg.stroke.opacity : 1;
    const hatchWidth = (hatchCfg.stroke && hatchCfg.stroke.widthPx) || 1;
    const patternId = "hatch-legend-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
    pattern.setAttribute("id", patternId);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", spacing);
    pattern.setAttribute("height", spacing);
    const ns = "http://www.w3.org/2000/svg";
    const mkLine = (x1, y1, x2, y2) => {
        const l = document.createElementNS(ns, "line");
        l.setAttribute("x1", x1);
        l.setAttribute("y1", y1);
        l.setAttribute("x2", x2);
        l.setAttribute("y2", y2);
        l.setAttribute("stroke", hatchColor);
        l.setAttribute("stroke-width", hatchWidth);
        l.setAttribute("stroke-opacity", hatchOpacity);
        return l;
    };
    if (type === "diagonal") pattern.appendChild(mkLine("0", "0", spacing, spacing));
    else if (type === "dot") {
        const c = document.createElementNS(ns, "circle");
        c.setAttribute("cx", spacing / 2);
        c.setAttribute("cy", spacing / 2);
        c.setAttribute("r", Math.max(0.3, spacing * 0.07));
        c.setAttribute("fill", hatchColor);
        c.setAttribute("fill-opacity", hatchOpacity);
        pattern.appendChild(c);
    } else if (type === "cross") {
        pattern.appendChild(mkLine("0", spacing / 2, spacing, spacing / 2));
        pattern.appendChild(mkLine(spacing / 2, "0", spacing / 2, spacing));
    } else if (type === "x") {
        pattern.appendChild(mkLine("0", "0", spacing, spacing));
        pattern.appendChild(mkLine(spacing, "0", "0", spacing));
    }
    defs.appendChild(pattern);
    svg.appendChild(defs);
    return patternId;
}

const _UIComponents = {
    /**
     * Creates an accordion
     * @param {HTMLElement} container - Conteneur parent
     * @param {Object} config - Configuration of the accordion
     * @param {string} config.layerId - ID de the layer
     * @param {string} config.label - Title of the accordion
     * @param {boolean} config.collapsed - Initial state
     * @param {boolean} config.visible - Couche visible ou non (pour grisage)
     * @param {Function} [config.onToggle] - Callback during the toggle
     * @returns {Object} - { accordionEl, headerEl, bodyEl }
     */
    createAccordion(container, config) {
        const accordionEl = globalThis.L.DomUtil.create("div", "gl-legend__accordion", container);
        accordionEl.setAttribute("data-layer-id", config.layerId);

        if (config.collapsed) {
            accordionEl.classList.add("gl-legend__accordion--collapsed");
        }

        // Addsr class inactive si the layer n'est pas visible
        if (config.visible === false) {
            accordionEl.classList.add("gl-legend__accordion--inactive");
        }

        // A1+A2+A3: single semantic <button> — native keyboard, no nesting violation
        const headerEl = globalThis.L.DomUtil.create(
            "button",
            "gl-legend__accordion-header",
            accordionEl
        );
        headerEl.type = "button";
        headerEl.setAttribute("aria-expanded", !config.collapsed);

        const titleEl = globalThis.L.DomUtil.create("span", "gl-legend__accordion-title", headerEl);
        titleEl.textContent = config.label;

        // Icon span excluded from accessibility tree (replaces nested <button>)
        const toggleEl = globalThis.L.DomUtil.create("span", "gl-legend__accordion-icon", headerEl);
        toggleEl.setAttribute("aria-hidden", "true");
        toggleEl.textContent = config.collapsed ? "\u25b6" : "\u25bc";

        // Body of the accordion
        const bodyEl = globalThis.L.DomUtil.create("div", "gl-legend__accordion-body", accordionEl);

        // Manager for click sur le header
        const onToggle = (ev) => {
            // Ne rien faire si the layer est inactive
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
            toggleEl.textContent = isCollapsed ? "\u25b6" : "\u25bc";
            headerEl.setAttribute("aria-expanded", !isCollapsed);

            // Callback optional
            if (typeof config.onToggle === "function") {
                config.onToggle(config.layerId, !isCollapsed);
            }
        };

        this.attachEventHandler(headerEl, "click", onToggle);

        return { accordionEl, headerEl, bodyEl, toggleEl };
    },

    /**
     * Rend un symbole circle (POI/Marker)
     * @param {HTMLElement} container - Conteneur du symbole
     * @param {Object} config - Configuration du symbole
     * @returns {HTMLElement} - Created element
     */
    renderCircleSymbol(container, config) {
        const radius = config.radius !== undefined ? config.radius : 24;
        const size = radius * 2;
        const fillColor = config.fillColor || config.color || "#3388ff";
        const strokeColor = config.color || config.borderColor || "rgba(0,0,0,0.2)";
        const strokeWidth = config.weight || 1;
        const circleEl = globalThis.L.DomUtil.create("div", "gl-legend__circle", container);
        circleEl.style.width = size + "px";
        circleEl.style.height = size + "px";
        circleEl.style.backgroundColor = fillColor;
        circleEl.style.borderRadius = "50%";
        circleEl.style.border = strokeWidth + "px solid " + strokeColor;
        circleEl.style.position = "relative";
        circleEl.style.display = "flex";
        circleEl.style.alignItems = "center";
        circleEl.style.justifyContent = "center";
        if (config.fillOpacity !== undefined) circleEl.style.opacity = config.fillOpacity;
        if (config.icon) {
            const iconId = config.icon.startsWith("#") ? config.icon.substring(1) : config.icon;
            if (!/^[a-zA-Z0-9_-]+$/.test(iconId)) {
                if (Log)
                    Log.error(
                        "[UIComponents] ID d'ic\u00f4ne invalide (caract\u00e8res non autoris\u00e9s):",
                        config.icon
                    );
                return circleEl;
            }
            _appendCircleIconSvg(circleEl, iconId, size, config.iconColor);
        }
        return circleEl;
    },

    /**
     * Rend un symbole line
     * @param {HTMLElement} container - Conteneur du symbole
     * @param {Object} config - Configuration du symbole
     * @returns {HTMLElement} - Created element
     */
    renderLineSymbol(container, config) {
        const width = config.width || 3;
        const color = config.color || "#3388ff";
        const style = config.style || "solid";
        const dashArray = config.dashArray || null;
        const outlineColor = config.outlineColor || null;
        const outlineWidth = config.outlineWidth || null;
        if (dashArray || width > 5 || (outlineColor && outlineWidth)) {
            const svg = _buildLineSvgEl(
                config,
                width,
                color,
                dashArray,
                outlineColor,
                outlineWidth
            );
            container.appendChild(svg);
            return svg;
        }
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
        if (config.opacity !== undefined) lineEl.style.opacity = config.opacity;
        return lineEl;
    },

    /**
     * Rend un symbole polygon/fill
     * @param {HTMLElement} container - Conteneur du symbole
     * @param {Object} config - Configuration du symbole
     * @returns {HTMLElement} - Created element
     */
    renderPolygonSymbol(container, config) {
        const color = config.fillColor || config.color || "#3388ff";
        const borderColor = config.borderColor || config.color || "#333";
        const borderWidth = config.weight || 1;
        const hasHatch = config.hatch && config.hatch.enabled;
        let fillOpacity =
            config.fillOpacity !== undefined
                ? config.fillOpacity
                : config.opacity !== undefined
                  ? config.opacity
                  : 1;
        if (hasHatch && config.hatch.renderMode === "pattern_only") fillOpacity = 1.0;
        if (hasHatch || fillOpacity === 0) {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 32 24");
            svg.style.width = "32px";
            svg.style.height = "24px";
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", "1");
            rect.setAttribute("y", "1");
            rect.setAttribute("width", "30");
            rect.setAttribute("height", "22");
            rect.setAttribute("stroke", borderColor);
            rect.setAttribute("stroke-width", borderWidth);
            if (hasHatch) {
                const patternId = _buildLegendHatchDefs(svg, config);
                rect.setAttribute("fill", `url(#${patternId})`);
                if (fillOpacity !== 1) rect.setAttribute("fill-opacity", fillOpacity);
            } else {
                rect.setAttribute("fill", "none");
                if (config.dashArray) rect.setAttribute("stroke-dasharray", config.dashArray);
            }
            svg.appendChild(rect);
            container.appendChild(svg);
            return svg;
        }
        const polygonEl = globalThis.L.DomUtil.create("div", "gl-legend__polygon", container);
        polygonEl.style.width = "24px";
        polygonEl.style.height = "16px";
        polygonEl.style.backgroundColor = color;
        polygonEl.style.border = borderWidth + "px solid " + borderColor;
        if (fillOpacity !== 1) polygonEl.style.opacity = fillOpacity;
        return polygonEl;
    },

    /**
     * Renders a star symbol (rating)
     * @param {HTMLElement} container - Conteneur du symbole
     * @param {Object} config - Configuration du symbole
     * @returns {HTMLElement} - Created element
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
     * @returns {HTMLElement} - Created element
     */
    renderSymbol(container, config) {
        // Support de la structure avec config.symbol ou directly config
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
                    const imgEl = globalThis.L.DomUtil.create(
                        "img",
                        "gl-legend__icon-img",
                        container
                    );
                    imgEl.src = symbolConfig.iconUrl;
                    if (symbolConfig.size) {
                        imgEl.style.width = symbolConfig.size + "px";
                        imgEl.style.height = symbolConfig.size + "px";
                    }
                    return imgEl;
                }
                // Icon with SVG sprite - use renderCircleSymbol which already handles sprites
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
     * Creates a toggle button (checkbox/switch)
     * @param {HTMLElement} container - Conteneur parent
     * @param {Object} config - Configuration du toggle
     * @param {string} [config.id] - ID du toggle
     * @param {boolean} config.isActive - Initial state (alias: active)
     * @param {string} [config.className] - Custom CSS class
     * @param {string} [config.label] - Label du toggle
     * @param {string} [config.title] - Tooltip
     * @param {Function} [config.onToggle] - Callback during the toggle
     * @returns {HTMLElement} - Created button element
     */
    createToggleButton(container, config) {
        // Support isActive ou active
        const isActive = config.isActive !== undefined ? config.isActive : config.active;
        const className = config.className || "gl-toggle-btn";

        const toggleBtn = globalThis.L.DomUtil.create("button", className, container);
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

        // Attacher le manager
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
     * Attaches a Leaflet-compatible event manager
     * @param {HTMLElement} element - Target element
     * @param {string} eventName - Name of the event
     * @param {Function} handler - Manager
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
    },
};

// ── ESM Export ──
export { _UIComponents };
