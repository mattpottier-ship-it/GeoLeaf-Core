/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Panel Builder
 * Building POI detail panels with configurable layouts
 */

import { $create } from "../utils/dom-helpers.js";
import { resolveField } from "../utils/general-utils.js";

/**
 * Creates a bloc section simple (sans accordion).
 *
 * @param {string} label - Title de la section.
 * @param {Node|string} innerContent - Contenu de la section (Node ou text).
 * @param {string} extraClass - Classes CSS additionnelles.
 * @returns {HTMLElement} Element section.
 */
function createPlainSection(label: any, innerContent: any, extraClass: any) {
    const section = $create("section", {
        className: "gl-poi-panel__section" + (extraClass ? " " + extraClass : ""),
    });

    if (label) {
        const header = $create("h3", {
            className: "gl-poi-panel__section-title",
            textContent: label,
        });
        section.appendChild(header);
    }

    const body = $create("div", {
        className: "gl-poi-panel__section-body",
    });
    if (innerContent instanceof Node) {
        body.appendChild(innerContent);
    } else if (innerContent != null) {
        body.textContent = String(innerContent);
    }
    section.appendChild(body);

    return section;
}

/**
 * Creates a bloc section accordion (panel collapsible).
 *
 * @param {string} label - Title of the accordion.
 * @param {Node|string} innerContent - Contenu of the accordion.
 * @param {object} options - Options { defaultOpen: boolean }.
 * @returns {HTMLElement} Element section accordion.
 */
function createAccordionSection(label: any, innerContent: any, options: any) {
    const opts = options || {};
    const isOpen = Boolean(opts.defaultOpen);

    const section = $create("section", {
        className: "gl-accordion gl-poi-panel__section" + (isOpen ? " is-open" : ""),
    });

    const header = $create("button", {
        type: "button",
        className: "gl-accordion__header",
    });

    const titleSpan = $create("span", {
        className: "gl-accordion__title",
        textContent: label || "",
    });
    header.appendChild(titleSpan);

    const iconSpan = $create("span", {
        className: "gl-accordion__icon",
        attributes: { "aria-hidden": "true" },
        textContent: "▾",
    });
    header.appendChild(iconSpan);

    section.appendChild(header);

    const body = $create("div", {
        className: "gl-accordion__body",
    });

    if (innerContent instanceof Node) {
        body.appendChild(innerContent);
    } else if (innerContent != null) {
        const p = $create("p", {
            textContent: String(innerContent),
        });
        body.appendChild(p);
    }

    section.appendChild(body);
    return section;
}

/**
 * Builds the rendu of a item de type "text".
 *
 * @param {*} value - Value to display.
 * @param {string} variant - Variant ("multiline" ou autre).
 * @returns {HTMLElement|null} Element div ou null.
 */
function renderText(value: any, variant: any) {
    const div = $create("div", {
        className:
            "gl-poi-panel__text" +
            (variant === "multiline" ? " gl-poi-panel__text--multiline" : ""),
        textContent: String(value),
    });
    return div;
}

function _resolveEntryLabel(entry: any): string | null {
    if (typeof entry.label === "string") return entry.label;
    if (typeof entry.text === "string") return entry.text;
    return null;
}

function _resolveListEntry(entry: any): string | null {
    if (entry == null) return null;
    if (typeof entry === "string" || typeof entry === "number") return String(entry);
    if (typeof entry !== "object") return null;
    const label = _resolveEntryLabel(entry);
    const val = entry.value != null ? String(entry.value) : null;
    if (label && val) return label + " : " + val;
    return label ?? val ?? null;
}

/**
 * Builds the rendu of a item de type "list".
 *
 * @param {*} value - Array ou string (lines separatedes).
 * @returns {HTMLElement|null} Element ul ou null.
 */
function renderList(value: any) {
    const items: any[] = [];

    if (Array.isArray(value)) {
        value.forEach(function (entry) {
            const text = _resolveListEntry(entry);
            if (text !== null) items.push(text);
        });
    } else if (typeof value === "string") {
        value.split(/\r?\n/).forEach(function (line) {
            const trimmed = line.trim();
            if (trimmed) {
                items.push(trimmed);
            }
        });
    }

    if (!items.length) {
        return null;
    }

    const ul = $create("ul", {
        className: "gl-poi-panel__list",
    });

    items.forEach(function (text) {
        const li = $create("li", {
            className: "gl-poi-panel__list-item",
            textContent: text,
        });
        ul.appendChild(li);
    });

    return ul;
}

/**
 * Builds the rendu of a item de type "table".
 *
 * @param {Array} value - Array of objects representing the rows.
 * @param {object} item - Configuration du array (columns, borders).
 * @returns {HTMLElement|null} Wrapper de array ou null.
 */
function _buildTableBorderClass(borders: any): string {
    const cls: string[] = [];
    if (borders.outer) cls.push("gl-poi-panel__table--border-outer");
    if (borders.row) cls.push("gl-poi-panel__table--border-row");
    if (borders.column) cls.push("gl-poi-panel__table--border-column");
    return cls.length ? " " + cls.join(" ") : "";
}

function _buildPanelTableHead(columns: any[]): HTMLElement {
    const thead = $create("thead");
    const headRow = $create("tr", {
        className: "gl-poi-panel__table-row gl-poi-panel__table-row--head",
    });
    columns.forEach(function (col: any) {
        const th = $create("th", {
            className: "gl-poi-panel__table-cell gl-poi-panel__table-cell--head",
            textContent: col.label || col.key || "",
        });
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    return thead;
}

function _buildPanelTableBody(value: any[], columns: any[]): HTMLElement {
    const tbody = $create("tbody");
    value.forEach(function (rowObj) {
        if (!rowObj || typeof rowObj !== "object") return;
        const tr = $create("tr", { className: "gl-poi-panel__table-row" });
        columns.forEach(function (col: any) {
            const cellVal = rowObj[col.key];
            const td = $create("td", {
                className: "gl-poi-panel__table-cell",
                textContent: cellVal == null ? "" : String(cellVal),
            });
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    return tbody;
}

function renderTable(value: any, item: any) {
    if (!Array.isArray(value) || !value.length) {
        return null;
    }

    const columns = Array.isArray(item.columns) ? item.columns : [];
    if (!columns.length) {
        return null;
    }

    const wrapper = $create("div", {
        className: "gl-poi-panel__table-wrapper",
    });

    const borders = item.borders || {};
    const table = $create("table", {
        className: "gl-poi-panel__table" + _buildTableBorderClass(borders),
        attributes: borders.color ? { "data-gl-border-color": borders.color } : {},
    });

    table.appendChild(_buildPanelTableHead(columns));
    table.appendChild(_buildPanelTableBody(value, columns));
    wrapper.appendChild(table);
    return wrapper;
}

/**
 * Builds the rendu of a item de type "gallery".
 *
 * @param {Array} value - Array d'images { url, alt, caption }.
 * @returns {HTMLElement|null} Container gallery ou null.
 */
function renderGallery(value: any) {
    if (!Array.isArray(value)) {
        return null;
    }

    const container = $create("div", {
        className: "gl-poi-panel__gallery",
    });

    value.forEach(function (img) {
        if (!img) return;

        const figure = $create("figure", {
            className: "gl-poi-panel__gallery-item",
        });

        const imgEl = $create("img", {
            src: img.url || img,
            alt: img.alt || "",
        });
        figure.appendChild(imgEl);

        if (img.caption) {
            const figCap = $create("figcaption", {
                textContent: img.caption,
            });
            figure.appendChild(figCap);
        }

        container.appendChild(figure);
    });

    return container;
}

function _appendReviewFooter(review: any): HTMLElement {
    const footer = $create("footer", { className: "gl-poi-panel__review-footer" }) as HTMLElement;
    if (typeof review.helpfulCount === "number") {
        footer.appendChild(
            $create("span", {
                className: "gl-poi-panel__review-helpful",
                textContent: review.helpfulCount + " personnes ont found cet avis utile",
            })
        );
    }
    if (review.url) {
        footer.appendChild(
            $create("a", {
                href: review.url,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "gl-poi-panel__review-link",
                textContent: "Voir l'avis",
            })
        );
    }
    return footer;
}

function _renderReviewItem(review: any): HTMLElement {
    const itemEl = $create("article", { className: "gl-poi-panel__review" }) as HTMLElement;
    const header = $create("header", { className: "gl-poi-panel__review-header" }) as HTMLElement;
    header.appendChild(
        $create("span", {
            className: "gl-poi-panel__review-author",
            textContent: review.authorName || "",
        })
    );
    if (typeof review.rating === "number") {
        header.appendChild(
            $create("span", {
                className: "gl-poi-panel__review-rating",
                textContent: review.rating.toFixed(1) + "/5",
            })
        );
    }
    if (review.source) {
        header.appendChild(
            $create("span", {
                className: "gl-poi-panel__review-source",
                textContent: review.source,
            })
        );
    }
    itemEl.appendChild(header);
    if (review.title) {
        itemEl.appendChild(
            $create("h4", { className: "gl-poi-panel__review-title", textContent: review.title })
        );
    }
    const reviewText = review.text || review.comment;
    if (reviewText) {
        itemEl.appendChild(
            $create("p", { className: "gl-poi-panel__review-text", textContent: reviewText })
        );
    }
    const reviewDate = review.date || review.createdAt;
    if (reviewDate) {
        itemEl.appendChild(
            $create("time", { className: "gl-poi-panel__review-date", textContent: reviewDate })
        );
    }
    itemEl.appendChild(_appendReviewFooter(review));
    return itemEl;
}

/**
 * Builds the rendu of a item de type "reviews" (avis voyageurs).
 *
 * @param {*} value - Array ou object avec property 'recent'.
 * @returns {HTMLElement|null} Container d'avis ou null.
 */
function renderReviews(value: any) {
    // Si value est an object with ae property 'recent', utiliser celle-ci
    let reviewsArray = value;
    if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Array.isArray(value.recent)
    ) {
        reviewsArray = value.recent;
    }

    if (!Array.isArray(reviewsArray)) {
        return null;
    }

    const container = $create("div", {
        className: "gl-poi-panel__reviews gl-poi-sidepanel__reviews",
    });

    reviewsArray.forEach(function (review) {
        if (!review) return;
        container.appendChild(_renderReviewItem(review));
    });

    return container;
}

/**
 * Builds the contenu internal for a item de layout.
 * Dispatcher main to thes fonctions de rendu specialized.
 *
 * @param {object} poi - Object POI source.
 * @param {object} item - Configuration du layout item (type, field, variant, etc).
 * @returns {HTMLElement|null} Element construit ou null.
 */
function buildLayoutItemContent(poi: any, item: any) {
    const type = item.type;
    const value = resolveField(poi, item.field);

    if (value == null || value === "") {
        if (!Array.isArray(value)) {
            return null;
        }
    }

    // Dispatch par type
    if (type === "text") {
        return renderText(value, item.variant);
    }

    if (type === "list") {
        return renderList(value);
    }

    if (type === "table") {
        return renderTable(value, item);
    }

    if (type === "gallery") {
        return renderGallery(value);
    }

    if (type === "reviews") {
        return renderReviews(value);
    }

    // Fallback : text simple
    const defaultDiv = $create("div", {
        className: "gl-poi-panel__text",
        textContent: String(value),
    });
    return defaultDiv;
}

// ── ESM Export ──

const PanelBuilder = {
    resolveField,
    createPlainSection,
    createAccordionSection,
    renderText,
    renderList,
    renderTable,
    renderGallery,
    renderReviews,
    buildLayoutItemContent,
};

export { PanelBuilder };
