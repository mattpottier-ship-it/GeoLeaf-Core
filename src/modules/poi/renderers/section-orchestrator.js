/**
 * GeoLeaf POI Module - Section Orchestrator
 * Orchestration du rendu des sections (dispatcher, extraction valeurs, accordéons)
 * Phase 6.2 - Extraction depuis core.js
 */
import { Log } from "../../log/index.js";
import { ComponentRenderers } from "./component-renderers.js";
import { FieldRenderers } from "./field-renderers.js";
import { MediaRenderers } from "./media-renderers.js";
import { resolveField } from "../../utils/general-utils.js";

/**
 * Orchestrateur de sections pour le side panel POI
 */
class SectionOrchestrator {
    constructor() {
        // Initialiser les renderers
        this.componentRenderers = null;
        this.fieldRenderers = null;
        this.mediaRenderers = null;
    }

    /**
     * Initialise les renderers (lazy loading)
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
     * Récupère la valeur d'un champ avec support du dot notation
     * @param {object} poi - POI complet
     * @param {string} fieldPath - Chemin du champ (ex: "attributes.address.city")
     * @returns {*}
     */
    getFieldValue(poi, fieldPath) {
        if (!fieldPath) return null;

        const resolve_fn =
            resolveField ||
            function (obj, path) {
                const parts = path.split(".");
                let current = obj;
                for (const part of parts) {
                    if (current && typeof current === "object" && part in current) {
                        current = current[part];
                    } else {
                        return null;
                    }
                }
                return current;
            };

        const value = resolve_fn(poi, fieldPath);

        if (Log && Log.info) {
            Log.info(
                "[POI] getFieldValue:",
                fieldPath,
                "→",
                value === undefined
                    ? "undefined"
                    : value === null
                      ? "null"
                      : value === ""
                        ? '""(empty string)'
                        : Array.isArray(value)
                          ? `Array(${value.length})`
                          : value && typeof value === "object"
                            ? `Object(${Object.keys(value).length} keys)`
                            : value
            );
        }

        return value;
    }

    /**
     * Wrappe un contenu dans un accordéon <details>
     * @param {object} section - Configuration de section
     * @param {HTMLElement} content - Contenu à wrapper
     * @param {boolean} isOpen - Ouvrir par défaut
     * @returns {HTMLElement}
     */
    wrapInAccordion(section, content, isOpen = false) {
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
     * Rend une section complète selon son type
     * @param {object} section - Configuration de section
     * @param {object} poi - POI complet
     * @param {object} state - État partagé POI
     * @returns {Promise<HTMLElement|null>}
     */
    async renderSection(section, poi, _state) {
        if (!section || !section.type) return null;

        // Initialiser les renderers si nécessaire
        this._initRenderers();

        // Résoudre la valeur du champ
        const fieldValue = this.getFieldValue(poi, section.field);

        if (Log) {
            const valueType = Array.isArray(fieldValue)
                ? `Array(${fieldValue.length})`
                : fieldValue && typeof fieldValue === "object"
                  ? `Object(${Object.keys(fieldValue).length} keys)`
                  : typeof fieldValue;
            Log.debug(
                "[POI] Section:",
                section.label || section.type,
                "- Field:",
                section.field,
                "- ValueType:",
                valueType,
                "- Value:",
                fieldValue
            );
        }

        // Ne pas afficher si la valeur est vide, SAUF pour:
        // - text avec style='title' (le titre est obligatoire)
        // - badge (peut avoir un comportement par défaut)
        const isRequiredField =
            (section.type === "text" && section.style === "title") || section.type === "badge";

        // Vérifier si la valeur est vraiment vide (null, undefined, '', [], {})
        // ATTENTION: 0 est une valeur valide (pour les prix, métriques, etc.)
        const isEmpty =
            fieldValue === null ||
            fieldValue === undefined ||
            fieldValue === "" ||
            (Array.isArray(fieldValue) && fieldValue.length === 0) ||
            (typeof fieldValue === "object" &&
                !Array.isArray(fieldValue) &&
                Object.keys(fieldValue).length === 0);

        if (Log) {
            Log.info(
                "[POI] Check isEmpty for:",
                section.label,
                "- fieldValue:",
                fieldValue,
                "- isArray:",
                Array.isArray(fieldValue),
                "- arrayLength:",
                Array.isArray(fieldValue) ? fieldValue.length : "N/A",
                "- isEmpty:",
                isEmpty
            );
        }

        if (isEmpty && !isRequiredField) {
            if (Log)
                Log.warn("[POI] Section ignorée (valeur vide):", section.label || section.type);
            return null;
        }

        if (Log)
            Log.info(
                "[POI] → Appel render pour:",
                section.label,
                "- Type:",
                section.type,
                "- Value:",
                Array.isArray(fieldValue)
                    ? `Array(${fieldValue.length})`
                    : fieldValue && typeof fieldValue === "object"
                      ? "Object"
                      : fieldValue
            );

        // Créer l'élément selon le type
        let content = null;

        switch (section.type) {
            case "text":
            case "longtext": // Alias pour text avec plus de contenu
                if (this.fieldRenderers) {
                    content = await this.fieldRenderers.renderText(section, poi, fieldValue);
                }
                break;
            case "number": // Afficher un nombre simple comme du texte
                if (this.fieldRenderers) {
                    content = await this.fieldRenderers.renderText(
                        section,
                        poi,
                        String(fieldValue)
                    );
                }
                break;
            case "metric": {
                // Nombre avec suffixe/préfixe
                const suffix = section.suffix || "";
                const prefix = section.prefix || "";
                if (this.fieldRenderers) {
                    content = await this.fieldRenderers.renderText(
                        section,
                        poi,
                        prefix + String(fieldValue) + suffix
                    );
                }
                break;
            }
            case "image":
                if (this.mediaRenderers) {
                    content = this.mediaRenderers.renderImage(section, fieldValue);
                }
                break;
            case "gallery":
                if (this.mediaRenderers) {
                    content = this.mediaRenderers.renderGallery(section, fieldValue);
                }
                break;
            case "badge":
                content = this.componentRenderers.renderBadge(section, fieldValue, poi);
                break;
            case "link":
                content = this.componentRenderers.renderLink(section, fieldValue);
                break;
            case "list":
                content = this.componentRenderers.renderList(section, fieldValue);
                break;
            case "table":
                content = this.componentRenderers.renderTable(section, fieldValue);
                break;
            case "tags":
                content = this.componentRenderers.renderTags(section, fieldValue);
                break;
            case "rating":
                content = this.componentRenderers.renderRating(section, fieldValue);
                break;
            case "reviews":
                content = this.componentRenderers.renderReviews(section, fieldValue);
                break;
            default:
                if (Log) Log.warn("[POI] Type de section inconnu:", section.type);
                return null;
        }

        if (!content) {
            if (Log) Log.debug("[POI] Aucun contenu généré pour:", section.label || section.type);
            return null;
        }

        if (Log)
            Log.debug(
                "[POI] Contenu généré pour:",
                section.label || section.type,
                "- Accordion:",
                section.accordion
            );

        // Wraper dans un accordéon si nécessaire
        if (section.accordion) {
            return this.wrapInAccordion(section, content, section.defaultOpen);
        }

        return content;
    }
}

// ── ESM Export ──
export { SectionOrchestrator };
