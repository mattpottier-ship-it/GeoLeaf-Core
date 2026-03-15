/**
 * POI Renderers - Field Renderers Module (Migrated to AbstractRenderer)
 * Rendu des fields simples: text, badges, links, tags
 *
 * @module poi/renderers/field-renderers
 * @requires renderers/abstract-renderer
 * @version 2.0.0 - Migrated to AbstractRenderer base class
 */
import { AbstractRenderer } from "../../renderers/abstract-renderer.js";
import { Config } from "../../config/config-primitives.js";
import { resolveCategoryDisplay } from "../markers-styling.ts";
import { ensureProfileSpriteInjectedSync } from "../markers-sprite-loader.ts";

/**
 * @class FieldRenderers
 * @extends AbstractRenderer
 * @description Renders simple POI fields: text, badges, links, tags
 */

function _getIconsConfig(): any {
    return Config && typeof (Config as any).getIconsConfig === "function"
        ? (Config as any).getIconsConfig()
        : null;
}

function _buildCategoryIconSvg(displayInfo: any): SVGElement {
    const svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgIcon.setAttribute("width", "32");
    svgIcon.setAttribute("height", "32");
    svgIcon.setAttribute("viewBox", "0 0 24 24");
    svgIcon.setAttribute("class", "gl-poi-sidepanel__icon");
    svgIcon.style.marginRight = "10px";
    svgIcon.style.flexShrink = "0";
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "10");
    circle.setAttribute("fill", displayInfo.colorFill || "#3388ff");
    circle.setAttribute("stroke", displayInfo.colorStroke || "#fff");
    circle.setAttribute("stroke-width", "1.5");
    svgIcon.appendChild(circle);
    return svgIcon as SVGElement;
}

function _appendCategoryIconSymbol(svgIcon: SVGElement, symbolId: string): void {
    const innerSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    innerSvg.setAttribute("x", "4");
    innerSvg.setAttribute("y", "4");
    innerSvg.setAttribute("width", "16");
    innerSvg.setAttribute("height", "16");
    innerSvg.setAttribute("viewBox", "0 0 32 32");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#" + symbolId);
    use.setAttribute("href", "#" + symbolId);
    use.style.color = "#ffffff";
    innerSvg.appendChild(use);
    svgIcon.appendChild(innerSvg);
}

class FieldRenderers extends AbstractRenderer {
    constructor(options: any = {}) {
        super({
            name: "FieldRenderers",
            debug: options.debug || false,
            config: options.config || {},
        });
        this.init();
    }

    /**
     * Render method (required by AbstractRenderer)
     * Delegates to specific render methods
     * @param {Object} data - Render data {section, poi, value, type}
     * @returns {HTMLElement|null} Rendered element
     */
    render(data: any) {
        const { section, poi, value, type } = data;

        switch (type) {
            case "text":
                return this.renderText(section, poi, value);
            case "badge":
                return this.renderBadge(section, value, poi);
            case "link":
                return this.renderLink(section, value);
            case "tags":
                return this.renderTags(section, value);
            default:
                this.warn("Unknown render type:", type);
                return null;
        }
    }

    /**
     * Rend un field text (title, description, etc.)
     * @param {Object} section - Section config
     * @param {Object} poi - POI data
     * @param {string} value - Text value
     * @returns {HTMLElement|null}
     */
    async renderText(section: any, poi: any, value: any) {
        // Special case for title with icon
        if (section.style === "title" || section.variant === "title") {
            return await this._renderTitleWithIcon(poi, value);
        }

        // Text normal ou multiline
        if (!value) {
            this.warn("renderText: no value provided");
            return null;
        }

        const element = this.createElement(
            section.variant === "multiline" ? "div" : "p",
            "gl-poi-sidepanel__desc"
        );

        if (section.variant === "multiline") {
            element.style.whiteSpace = "pre-wrap";
            element.style.lineHeight = "1.6";
        }

        element.textContent = value;
        this.info("renderText: element created, variant:", section.variant || "normal");

        return element;
    }

    /**
     * Rend un title avec icon SVG
     * @private
     * @param {Object} poi - POI data
     * @param {string} value - Title text
     * @returns {HTMLElement}
     */
    async _renderTitleWithIcon(poi: any, value: any) {
        const titleH2 = this.createElement("h2", "gl-poi-sidepanel__title");

        // Addsr l'icon SVG au title
        const displayInfo = resolveCategoryDisplay(poi);
        this.debug("_renderTitleWithIcon: displayInfo =", displayInfo);

        if (displayInfo.iconId) {
            await ensureProfileSpriteInjectedSync();
            const svgIcon = this._createCategoryIcon(displayInfo);
            if (svgIcon) {
                this.debug("_renderTitleWithIcon: SVG icon created successfully");
                titleH2.appendChild(svgIcon);
            } else {
                this.warn("_renderTitleWithIcon: SVG icon creation failed");
            }
        } else {
            this.debug("_renderTitleWithIcon: No iconId in displayInfo");
        }

        // Addsr le text du title
        const titleSpan = this.createTextElement(
            "span",
            value || poi.title || poi.label || poi.name || "POI",
            "gl-poi-sidepanel__title-text"
        );
        titleH2.appendChild(titleSpan);

        this.info("renderText: title element created with icon");
        return titleH2;
    }

    /**
     * Creates ae icon SVG de category
     * @private
     * @param {Object} displayInfo - Display information {iconId, colorFill, colorStroke}
     * @returns {SVGElement|null}
     */
    _createCategoryIcon(displayInfo: any) {
        const iconsConfig = _getIconsConfig();
        const iconPrefix = iconsConfig?.symbolPrefix || "gl-poi-cat-";
        const iconIdNormalized = String(displayInfo.iconId)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");
        const symbolId = iconPrefix + iconIdNormalized;
        this.debug("_createCategoryIcon", symbolId, displayInfo.colorFill, displayInfo.colorStroke);
        const sprite = document.querySelector('svg[data-geoleaf-sprite="profile"]');
        if (!sprite) {
            this.warn("_createCategoryIcon: Sprite SVG non trouv\u00e9 dans le DOM!");
        } else {
            this.debug(
                "_createCategoryIcon: Sprite trouv\u00e9, symboles:",
                sprite.querySelectorAll("symbol").length
            );
        }
        const spriteSymbol = sprite?.querySelector(`#${symbolId}`);
        if (!spriteSymbol) {
            this.warn("_createCategoryIcon: Symbole non trouv\u00e9:", symbolId);
            if (sprite) {
                const avail = Array.from(sprite.querySelectorAll("symbol"))
                    .map((s) => s.id)
                    .slice(0, 5);
                this.debug("_createCategoryIcon: Premiers symboles:", avail);
            }
        }
        const svgIcon = _buildCategoryIconSvg(displayInfo);
        if (spriteSymbol) {
            _appendCategoryIconSymbol(svgIcon, symbolId);
        }
        this.debug("_createCategoryIcon: SVG structure created");
        return svgIcon;
    }
    /**
     * Rend un badge (category, sous-category)
     * @param {Object} section - Section config
     * @param {string} value - Badge text
     * @param {Object} poi - POI data
     * @returns {HTMLElement|null}
     */
    renderBadge(section: any, value: any, poi: any) {
        if (!value) return null;

        const container = this.createElement("div", "gl-poi-badge-container");
        const badge = this.createTextElement("span", value, "gl-poi-badge");

        // Retrieve les colors from the taxonomy
        const displayInfo = resolveCategoryDisplay(poi);
        if (displayInfo.colorFill) {
            badge.style.background = displayInfo.colorFill;
            badge.style.color = "#fff";
        }

        container.appendChild(badge);
        return container;
    }

    /**
     * Rend un link (website, etc.)
     * @param {Object} section - Section config
     * @param {string} url - URL
     * @returns {HTMLElement|null}
     */
    renderLink(section: any, url: any) {
        if (!url) return null;

        const linkP = this.createElement("p", "gl-poi-sidepanel__link");
        const anchor = this.createElement("a", null, {
            href: url,
            target: "_blank",
            rel: "noopener noreferrer",
        });

        anchor.textContent = section.linkText || url;
        linkP.appendChild(anchor);

        return linkP;
    }

    /**
     * Rend a list de tags
     * @param {Object} section - Section config
     * @param {Array<string>} tags - Tags array
     * @returns {HTMLElement|null}
     */
    renderTags(section: any, tags: any) {
        if (!tags || !Array.isArray(tags) || tags.length === 0) return null;

        const tagsDiv = this.createElement("div", "gl-poi-sidepanel__tags");

        tags.forEach((tag) => {
            if (tag) {
                const tagSpan = this.createTextElement("span", tag, "gl-poi-tag");
                tagsDiv.appendChild(tagSpan);
            }
        });

        return tagsDiv;
    }
}

// ── ESM Export ──
export { FieldRenderers };
