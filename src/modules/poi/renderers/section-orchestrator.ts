/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf POI Module - Section Orchestrator
 * Orchestration du rendu des sections (dispatcher, extraction values, accordions)
 * Phase 6.2 - Extraction from core.js
 */
import { Log } from "../../log/index.js";
import { ComponentRenderers } from "./component-renderers.ts";
import { FieldRenderers } from "./field-renderers.ts";
import { MediaRenderers } from "./media-renderers.ts";
import { resolveField } from "../../utils/general-utils.js";

/**
 * Orchestrateur de sections for the side panel POI
 */
class SectionOrchestrator {
    componentRenderers: any = null;
    fieldRenderers: any = null;
    mediaRenderers: any = null;
    constructor() {}

    /**
     * Initializes the renderers (lazy loading)
     * @private
     */
    _initRenderers() {
        if (!this.componentRenderers) {
            this.componentRenderers = new ComponentRenderers();
        }
        if (!this.fieldRenderers) {
            this.fieldRenderers = new FieldRenderers({ debug: true });
        }
        if (!this.mediaRenderers) {
            this.mediaRenderers = new MediaRenderers({ debug: true });
        }
    }

    /**
     * Decrit a value for thes logs.
     * @private
     */
    _describeVal(v: any): string {
        if (v === undefined) return "undefined";
        if (v === null) return "null";
        if (v === "") return "\u201c\u201d (empty string)";
        if (Array.isArray(v)) return `Array(${v.length})`;
        if (v && typeof v === "object") return `Object(${Object.keys(v).length} keys)`;
        return String(v);
    }

    /**
     * Determine si the value of a field est empty.
     * Note: 0 est non-empty (value valide pour prix, metriques, etc.)
     * @private
     */
    _isEmptyFieldValue(v: any): boolean {
        if (v === null || v === undefined || v === "") return true;
        if (Array.isArray(v)) return v.length === 0;
        if (typeof v === "object") return Object.keys(v).length === 0;
        return false;
    }

    /**
     * Dispatche the render selon the type of section via une table de correspondance.
     * CC=3 : pas de switch, tous les case sont des fonctions dans DISPATCH.
     * @private
     */
    async _dispatchSection(section: any, poi: any, fieldValue: any): Promise<any> {
        const f = this.fieldRenderers;
        const m = this.mediaRenderers;
        const comp = this.componentRenderers;
        const DISPATCH: Record<string, () => any> = {
            text: () => f.renderText(section, poi, fieldValue),
            longtext: () => f.renderText(section, poi, fieldValue),
            number: () => f.renderText(section, poi, String(fieldValue)),
            metric: () =>
                f.renderText(
                    section,
                    poi,
                    (section.prefix || "") + String(fieldValue) + (section.suffix || "")
                ),
            image: () => m.renderImage(section, fieldValue),
            gallery: () => m.renderGallery(section, fieldValue),
            badge: () => comp.renderBadge(section, fieldValue, poi),
            link: () => comp.renderLink(section, fieldValue),
            list: () => comp.renderList(section, fieldValue),
            table: () => comp.renderTable(section, fieldValue),
            tags: () => comp.renderTags(section, fieldValue),
            rating: () => comp.renderRating(section, fieldValue),
            reviews: () => comp.renderReviews(section, fieldValue),
        };
        const fn = DISPATCH[section.type];
        if (!fn) {
            if (Log) Log.warn("[POI] Type de section inconnu:", section.type);
            return null;
        }
        return await fn();
    }

    /**
     * Recupere the value of a field avec support du dot notation.
     * @param {object} poi - POI complete
     * @param {string} fieldPath - Path du field (ex: "attributes.address.city")
     * @returns {*}
     */
    getFieldValue(poi: any, fieldPath: any) {
        if (!fieldPath) return null;
        const resolve_fn =
            resolveField ||
            function (obj: any, path: any) {
                let cur: any = obj;
                for (const part of path.split(".")) {
                    if (cur && typeof cur === "object" && part in cur) {
                        cur = cur[part];
                    } else {
                        return null;
                    }
                }
                return cur;
            };
        const value = resolve_fn(poi, fieldPath);
        if (Log && Log.info)
            Log.info("[POI] getFieldValue:", fieldPath, "\u2192", this._describeVal(value));
        return value;
    }

    /**
     * Wrappe un contenu dans un accordion <details>
     * @param {object} section - Configuration de section
     * @param {HTMLElement} content - Contenu to wrapper
     * @param {boolean} isOpen - Ouvrir by default
     * @returns {HTMLElement}
     */
    wrapInAccordion(section: any, content: any, isOpen = false) {
        const details = document.createElement("details");
        details.className = "gl-accordion";
        if (isOpen) details.setAttribute("open", "");

        const summary = document.createElement("summary");
        summary.className = "gl-accordion__header";
        summary.textContent = section.label || "Section";

        const arrow = document.createElement("span");
        arrow.className = "gl-accordion__arrow";
        arrow.textContent = "▼";
        summary.appendChild(arrow);

        const panel = document.createElement("div");
        panel.className = "gl-accordion__panel";

        const panelContent = document.createElement("div");
        panelContent.className = "gl-accordion__panel-content";
        panelContent.appendChild(content);

        panel.appendChild(panelContent);

        details.appendChild(summary);
        details.appendChild(panel);

        return details;
    }

    /**
     * Rend une section completee selon son type.
     * @param {object} section - Configuration de section
     * @param {object} poi - POI complete
     * @param {object} _state - Etat partage POI
     * @returns {Promise<HTMLElement|null>}
     */
    async renderSection(section: any, poi: any, _state: any) {
        if (!section?.type) return null;
        this._initRenderers();
        const fieldValue = this.getFieldValue(poi, section.field);
        Log?.debug(
            "[POI] Section:",
            section.type,
            "- Field:",
            section.field,
            "- Value:",
            this._describeVal(fieldValue)
        );
        const isRequiredField =
            (section.type === "text" && section.style === "title") || section.type === "badge";
        const isEmpty = this._isEmptyFieldValue(fieldValue);
        Log?.info("[POI] isEmpty:", isEmpty, "isRequiredField:", isRequiredField);
        if (isEmpty && !isRequiredField) {
            Log?.warn("[POI] Section ignoree (valeur vide):", section.type);
            return null;
        }
        Log?.info(
            "[POI] \u2192 Appel render - Type:",
            section.type,
            "- Value:",
            this._describeVal(fieldValue)
        );
        const content = await this._dispatchSection(section, poi, fieldValue);
        if (!content) {
            Log?.debug("[POI] Aucun contenu genere pour:", section.type);
            return null;
        }
        Log?.debug("[POI] Contenu genere:", section.type, "- Accordion:", section.accordion);
        if (section.accordion) return this.wrapInAccordion(section, content, section.defaultOpen);
        return content;
    }
}

// ── ESM Export ──
export { SectionOrchestrator };
