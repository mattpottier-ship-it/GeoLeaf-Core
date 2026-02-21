/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Panel Builder
 * Construction de panneaux de détails POI avec layouts configurables
 */

import { $create } from '../utils/dom-helpers.js';
import { resolveField } from '../utils/general-utils.js';

    /**
     * Crée un bloc section simple (sans accordéon).
     *
     * @param {string} label - Titre de la section.
     * @param {Node|string} innerContent - Contenu de la section (Node ou texte).
     * @param {string} extraClass - Classes CSS additionnelles.
     * @returns {HTMLElement} Élément section.
     */
    function createPlainSection(label, innerContent, extraClass) {
        const section = $create("section", {
            className: "gl-poi-panel__section" + (extraClass ? " " + extraClass : "")
        });

        if (label) {
            const header = $create("h3", {
                className: "gl-poi-panel__section-title",
                textContent: label
            });
            section.appendChild(header);
        }

        const body = $create("div", {
            className: "gl-poi-panel__section-body"
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
     * Crée un bloc section accordéon (panneau repliable).
     *
     * @param {string} label - Titre de l'accordéon.
     * @param {Node|string} innerContent - Contenu de l'accordéon.
     * @param {object} options - Options { defaultOpen: boolean }.
     * @returns {HTMLElement} Élément section accordéon.
     */
    function createAccordionSection(label, innerContent, options) {
        const opts = options || {};
        const isOpen = Boolean(opts.defaultOpen);

        const section = $create("section", {
            className: "gl-accordion gl-poi-panel__section" + (isOpen ? " is-open" : "")
        });

        const header = $create("button", {
            type: "button",
            className: "gl-accordion__header"
        });

        const titleSpan = $create("span", {
            className: "gl-accordion__title",
            textContent: label || ""
        });
        header.appendChild(titleSpan);

        const iconSpan = $create("span", {
            className: "gl-accordion__icon",
            attributes: { "aria-hidden": "true" },
            textContent: "▾"
        });
        header.appendChild(iconSpan);

        section.appendChild(header);

        const body = $create("div", {
            className: "gl-accordion__body"
        });

        if (innerContent instanceof Node) {
            body.appendChild(innerContent);
        } else if (innerContent != null) {
            const p = $create("p", {
                textContent: String(innerContent)
            });
            body.appendChild(p);
        }

        section.appendChild(body);
        return section;
    }

    /**
     * Construit le rendu d'un item de type "text".
     *
     * @param {*} value - Valeur à afficher.
     * @param {string} variant - Variant ("multiline" ou autre).
     * @returns {HTMLElement|null} Élément div ou null.
     */
    function renderText(value, variant) {
        const div = $create("div", {
            className: "gl-poi-panel__text" +
                (variant === "multiline" ? " gl-poi-panel__text--multiline" : ""),
            textContent: String(value)
        });
        return div;
    }

    /**
     * Construit le rendu d'un item de type "list".
     *
     * @param {*} value - Array ou string (lignes séparées).
     * @returns {HTMLElement|null} Élément ul ou null.
     */
    function renderList(value) {
        const items = [];

        if (Array.isArray(value)) {
            value.forEach(function (entry) {
                if (entry == null) return;

                if (typeof entry === "string" || typeof entry === "number") {
                    items.push(String(entry));
                } else if (typeof entry === "object") {
                    const label =
                        typeof entry.label === "string"
                            ? entry.label
                            : typeof entry.text === "string"
                            ? entry.text
                            : null;
                    const val = entry.value != null ? String(entry.value) : null;

                    if (label && val) {
                        items.push(label + " : " + val);
                    } else if (label) {
                        items.push(label);
                    } else if (val) {
                        items.push(val);
                    }
                }
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
            className: "gl-poi-panel__list"
        });

        items.forEach(function (text) {
            const li = $create("li", {
                className: "gl-poi-panel__list-item",
                textContent: text
            });
            ul.appendChild(li);
        });

        return ul;
    }

    /**
     * Construit le rendu d'un item de type "table".
     *
     * @param {Array} value - Tableau d'objets représentant les lignes.
     * @param {object} item - Configuration du tableau (columns, borders).
     * @returns {HTMLElement|null} Wrapper de tableau ou null.
     */
    function renderTable(value, item) {
        if (!Array.isArray(value) || !value.length) {
            return null;
        }

        const columns = Array.isArray(item.columns) ? item.columns : [];
        if (!columns.length) {
            return null;
        }

        const wrapper = $create("div", {
            className: "gl-poi-panel__table-wrapper"
        });

        const borders = item.borders || {};
        const borderClasses = [];
        if (borders.outer) borderClasses.push("gl-poi-panel__table--border-outer");
        if (borders.row) borderClasses.push("gl-poi-panel__table--border-row");
        if (borders.column) borderClasses.push("gl-poi-panel__table--border-column");

        const table = $create("table", {
            className: "gl-poi-panel__table" + (borderClasses.length ? " " + borderClasses.join(" ") : ""),
            attributes: borders.color ? { "data-gl-border-color": borders.color } : {}
        });

        // En-tête
        const thead = $create("thead");
        const headRow = $create("tr", {
            className: "gl-poi-panel__table-row gl-poi-panel__table-row--head"
        });

        columns.forEach(function (col) {
            const th = $create("th", {
                className: "gl-poi-panel__table-cell gl-poi-panel__table-cell--head",
                textContent: col.label || col.key || ""
            });
            headRow.appendChild(th);
        });

        thead.appendChild(headRow);
        table.appendChild(thead);

        // Corps
        const tbody = $create("tbody");

        value.forEach(function (rowObj) {
            if (!rowObj || typeof rowObj !== "object") {
                return;
            }

            const tr = $create("tr", {
                className: "gl-poi-panel__table-row"
            });

            columns.forEach(function (col) {
                const cellVal = rowObj[col.key];
                const td = $create("td", {
                    className: "gl-poi-panel__table-cell",
                    textContent: cellVal == null ? "" : String(cellVal)
                });

                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        wrapper.appendChild(table);
        return wrapper;
    }

    /**
     * Construit le rendu d'un item de type "gallery".
     *
     * @param {Array} value - Tableau d'images { url, alt, caption }.
     * @returns {HTMLElement|null} Container galerie ou null.
     */
    function renderGallery(value) {
        if (!Array.isArray(value)) {
            return null;
        }

        const container = $create("div", {
            className: "gl-poi-panel__gallery"
        });

        value.forEach(function (img) {
            if (!img) return;

            const figure = $create("figure", {
                className: "gl-poi-panel__gallery-item"
            });

            const imgEl = $create("img", {
                src: img.url || img,
                alt: img.alt || ""
            });
            figure.appendChild(imgEl);

            if (img.caption) {
                const figCap = $create("figcaption", {
                    textContent: img.caption
                });
                figure.appendChild(figCap);
            }

            container.appendChild(figure);
        });

        return container;
    }

    /**
     * Construit le rendu d'un item de type "reviews" (avis voyageurs).
     *
     * @param {*} value - Array ou objet avec propriété 'recent'.
     * @returns {HTMLElement|null} Container d'avis ou null.
     */
    function renderReviews(value) {
        // Si value est un objet avec une propriété 'recent', utiliser celle-ci
        let reviewsArray = value;
        if (value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.recent)) {
            reviewsArray = value.recent;
        }

        if (!Array.isArray(reviewsArray)) {
            return null;
        }

        const container = $create("div", {
            className: "gl-poi-panel__reviews gl-poi-sidepanel__reviews"
        });

        reviewsArray.forEach(function (review) {
            if (!review) return;

            const itemEl = $create("article", {
                className: "gl-poi-panel__review"
            });

            const header = $create("header", {
                className: "gl-poi-panel__review-header"
            });

            const nameSpan = $create("span", {
                className: "gl-poi-panel__review-author",
                textContent: review.authorName || ""
            });
            header.appendChild(nameSpan);

            if (typeof review.rating === "number") {
                const ratingSpan = $create("span", {
                    className: "gl-poi-panel__review-rating",
                    textContent: review.rating.toFixed(1) + "/5"
                });
                header.appendChild(ratingSpan);
            }

            if (review.source) {
                const sourceSpan = $create("span", {
                    className: "gl-poi-panel__review-source",
                    textContent: review.source
                });
                header.appendChild(sourceSpan);
            }

            itemEl.appendChild(header);

            if (review.title) {
                const titleEl = $create("h4", {
                    className: "gl-poi-panel__review-title",
                    textContent: review.title
                });
                itemEl.appendChild(titleEl);
            }

            // Gérer à la fois 'text' (ancien format) et 'comment' (nouveau format)
            const reviewText = review.text || review.comment;
            if (reviewText) {
                const textEl = $create("p", {
                    className: "gl-poi-panel__review-text",
                    textContent: reviewText
                });
                itemEl.appendChild(textEl);
            }

            // Gérer à la fois 'date' (ancien format) et 'createdAt' (nouveau format)
            const reviewDate = review.date || review.createdAt;
            if (reviewDate) {
                const dateEl = $create("time", {
                    className: "gl-poi-panel__review-date",
                    textContent: reviewDate
                });
                itemEl.appendChild(dateEl);
            }

            const footer = $create("footer", {
                className: "gl-poi-panel__review-footer"
            });

            if (typeof review.helpfulCount === "number") {
                const helpfulSpan = $create("span", {
                    className: "gl-poi-panel__review-helpful",
                    textContent: review.helpfulCount + " personnes ont trouvé cet avis utile"
                });
                footer.appendChild(helpfulSpan);
            }

            if (review.url) {
                const link = $create("a", {
                    href: review.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "gl-poi-panel__review-link",
                    textContent: "Voir l'avis"
                });
                footer.appendChild(link);
            }

            itemEl.appendChild(footer);
            container.appendChild(itemEl);
        });

        return container;
    }

    /**
     * Construit le contenu interne pour un item de layout.
     * Dispatcher principal vers les fonctions de rendu spécialisées.
     *
     * @param {object} poi - Objet POI source.
     * @param {object} item - Configuration du layout item (type, field, variant, etc).
     * @returns {HTMLElement|null} Élément construit ou null.
     */
    function buildLayoutItemContent(poi, item) {
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

        // Fallback : texte simple
        const defaultDiv = $create("div", {
            className: "gl-poi-panel__text",
            textContent: String(value)
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
        buildLayoutItemContent
    };

    export { PanelBuilder };
