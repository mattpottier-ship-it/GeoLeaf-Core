/**
 * GeoLeaf POI Module - Component Renderers
 * Rendu des components UI (badges, links, lists, arrayx, tags)
 * Phase 6.2 - Extraction from core.js
 */
import { Log } from "../../log/index.js";
import { resolveCategoryDisplay } from "../markers-styling.ts";

/**
 * Renderers for thes components UI du side panel
 */
class ComponentRenderers {
    /**
     * Rend un badge avec style de category
     * @param {object} section - Configuration de section
     * @param {string} value - Value du badge
     * @param {object} poi - POI complete
     * @returns {HTMLElement|null}
     */
    renderBadge(section: any, value: any, poi: any) {
        if (!value) return null;

        const container = document.createElement("div");
        container.className = "gl-poi-badge-container";

        const badge = document.createElement("span");
        badge.className = "gl-poi-badge";
        badge.textContent = value;

        // Retrieve les colors from the taxonomy si available
        const displayInfo = resolveCategoryDisplay(poi);
        if (displayInfo.colorFill) {
            badge.style.background = displayInfo.colorFill;
            badge.style.color = "#fff";
        }

        container.appendChild(badge);
        return container;
    }

    /**
     * Rend un link external
     * @param {object} section - Configuration de section
     * @param {string} url - URL du link
     * @returns {HTMLElement|null}
     */
    renderLink(section: any, url: any) {
        if (!url) return null;

        const container = document.createElement("div");
        container.className = "gl-poi-link-container";

        const link = document.createElement("a");
        link.className = "gl-poi-website-link";
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = section.label || "Visiter le site web →";

        container.appendChild(link);
        return container;
    }

    _buildPriceText(data: any): string {
        const safeFrom = Number.isFinite(Number(data.from)) ? Number(data.from) : null;
        const safeTo = Number.isFinite(Number(data.to)) ? Number(data.to) : null;
        const safeCurrency = data.currency || "USD";
        if (safeFrom !== null && safeTo !== null)
            return `From ${safeFrom} to ${safeTo} ${safeCurrency}`;
        if (safeFrom !== null) return `From ${safeFrom} ${safeCurrency}`;
        if (safeTo !== null) return `Up to ${safeTo} ${safeCurrency}`;
        return "";
    }

    /**
     * Rend a list (array de prix, etc.)
     * @param {object} section - Configuration de section
     * @param {Array|object} data - Data to display
     * @returns {HTMLElement|null}
     */
    _renderPriceObject(data: any): HTMLElement | null {
        const div = document.createElement("div");
        div.className = "gl-poi-section";
        if (data.from || data.to) {
            const p = document.createElement("p");
            const strong = document.createElement("strong");
            strong.textContent = this._buildPriceText(data);
            if (strong.textContent) {
                p.appendChild(strong);
                div.appendChild(p);
            }
        }
        if (data.description) {
            const desc = document.createElement("p");
            desc.textContent = data.description;
            desc.style.fontSize = "0.85rem";
            desc.style.color = "var(--gl-color-text-muted)";
            div.appendChild(desc);
        }
        if (div.children.length === 0) {
            if (Log) Log.warn("[POI] renderList: price object has no displayable content");
            return null;
        }
        return div;
    }

    _renderArrayList(data: any[], section: any): HTMLElement {
        const variant = section.variant || "disc";
        const ul = document.createElement("ul");
        ul.className = "gl-poi-list-unordered";
        if (variant === "disc" || variant === "circle" || variant === "square") {
            ul.style.listStyleType = variant;
        } else {
            ul.style.listStyleType = "disc";
        }
        data.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item;
            ul.appendChild(li);
        });
        return ul;
    }

    renderList(section: any, data: any) {
        if (!data) {
            if (Log) Log.warn("[POI] renderList: data is null/undefined");
            return null;
        }

        const div = document.createElement("div");
        div.className = "gl-poi-section";

        // Special case for price (object)
        if (typeof data === "object" && !Array.isArray(data)) {
            if (Log) Log.info("[POI] renderList: price object:", data);
            return this._renderPriceObject(data);
        }

        // List normale (array)
        if (Array.isArray(data)) {
            div.appendChild(this._renderArrayList(data, section));
        }

        return div;
    }

    /**
     * Renders a table with headers and borders
     * @param {object} section - Configuration de section
     * @param {Array} data - Data du array
     * @returns {HTMLElement|null}
     */
    _normalizeTableData(data: any[], section: any): any[] {
        if (data.length === 0 || typeof data[0] !== "string") return data;
        if (!section.columns || section.columns.length !== 2) return data;
        const separators = [" : ", ": ", " – ", "–", " - ", "-"];
        return data.map((str) => {
            for (const sep of separators) {
                const parts = str.split(sep);
                if (parts.length >= 2) {
                    return {
                        [section.columns[0].key]: parts[0].trim(),
                        [section.columns[1].key]: parts.slice(1).join(sep).trim(),
                    };
                }
            }
            return { [section.columns[0].key]: str, [section.columns[1].key]: "" };
        });
    }

    _buildDataTableHeader(table: HTMLElement, section: any, borders: any, borderColor: string) {
        if (!section.columns) return;
        const thead = document.createElement("thead");
        const tr = document.createElement("tr");
        section.columns.forEach((col: any, index: any) => {
            const th = document.createElement("th");
            th.textContent = col.label;
            th.style.padding = "8px";
            th.style.textAlign = "left";
            th.style.fontWeight = "600";
            th.style.backgroundColor = "var(--gl-color-bg-subtle)";
            if (borders.row !== false)
                th.style.borderBottom = `1px solid ${borders.color || borderColor}`;
            if (borders.column && index > 0)
                th.style.borderLeft = `1px solid ${borders.color || borderColor}`;
            tr.appendChild(th);
        });
        thead.appendChild(tr);
        table.appendChild(thead);
    }

    _buildDataTableBody(
        table: HTMLElement,
        section: any,
        tableData: any[],
        borders: any,
        borderColor: string
    ) {
        const tbody = document.createElement("tbody");
        tableData.forEach((row, rowIndex) => {
            const tr = document.createElement("tr");
            if (section.columns) {
                section.columns.forEach((col: any, colIndex: any) => {
                    const td = document.createElement("td");
                    td.textContent = row[col.key] || "";
                    td.style.padding = "8px";
                    if (borders.row !== false && rowIndex < tableData.length - 1)
                        td.style.borderBottom = `1px solid ${borders.color || borderColor}`;
                    if (borders.column && colIndex > 0)
                        td.style.borderLeft = `1px solid ${borders.color || borderColor}`;
                    tr.appendChild(td);
                });
            }
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
    }

    renderTable(section: any, data: any) {
        if (!data || !Array.isArray(data)) {
            if (Log)
                Log.warn(
                    "[POI] renderTable: data is",
                    data ? "not an array" : "null/undefined",
                    "- type:",
                    typeof data
                );
            return null;
        }
        if (Log) Log.info("[POI] renderTable: rendering", data.length, "rows");
        const tableData = this._normalizeTableData(data, section);
        const table = document.createElement("table");
        table.className = "gl-poi-table";
        const borders = section.borders ?? {};
        const borderColor = borders.color ?? "var(--gl-color-border-soft)";
        if (borders.outer !== false) table.style.border = `1px solid ${borderColor}`;
        this._buildDataTableHeader(table, section, borders, borderColor);
        this._buildDataTableBody(table, section, tableData, borders, borderColor);
        return table;
    }
    /**
     * Rend des tags
     * @param {object} section - Configuration de section
     * @param {Array<string>} tags - List de tags
     * @returns {HTMLElement|null}
     */
    renderTags(section: any, tags: any) {
        if (!tags || !Array.isArray(tags)) {
            if (Log)
                Log.warn(
                    "[POI] renderTags: tags is",
                    tags ? "not an array" : "null/undefined",
                    "- type:",
                    typeof tags,
                    "- value:",
                    tags
                );
            return null;
        }

        if (tags.length === 0) {
            if (Log) Log.warn("[POI] renderTags: tags array is empty");
            return null;
        }

        if (Log) Log.info("[POI] renderTags: rendering", tags.length, "tags");

        const div = document.createElement("div");
        div.className = "gl-poi-sidepanel__tags";
        div.style.display = "flex";
        div.style.flexWrap = "wrap";
        div.style.gap = "6px";

        tags.forEach((tag) => {
            const tagSpan = document.createElement("span");
            tagSpan.className = "gl-poi-tag";
            tagSpan.textContent = tag;
            div.appendChild(tagSpan);
        });

        return div;
    }

    /**
     * Rend une note globale (stars)
     * @param {object} section - Configuration de section
     * @param {number} rating - Note numeric (0-5)
     * @returns {HTMLElement|null}
     */
    renderRating(section: any, rating: any) {
        const numRating = parseFloat(rating);
        if (!Number.isFinite(numRating)) {
            if (Log) Log.warn("[POI] renderRating: non-numeric value:", rating);
            return null;
        }

        const container = document.createElement("div");
        container.className = "gl-rating gl-rating--stat";

        if (section.label) {
            const label = document.createElement("span");
            label.className = "gl-rating__label";
            label.textContent = section.label;
            container.appendChild(label);
        }

        const starsWrap = document.createElement("span");
        starsWrap.className = "gl-rating__stars";
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("span");
            star.className =
                "gl-rating__star" + (i <= Math.round(numRating) ? " gl-rating__star--filled" : "");
            star.textContent = "\u2605";
            starsWrap.appendChild(star);
        }
        container.appendChild(starsWrap);

        const value = document.createElement("span");
        value.className = "gl-rating__value";
        value.textContent = numRating.toFixed(1) + "/5";
        container.appendChild(value);

        return container;
    }

    /**
     * Rend les avis (reviews)
     * @param {object} section - Configuration de section
     * @param {Array} reviews - List d'avis
     * @returns {HTMLElement|null}
     */
    renderReviews(section: any, reviews: any) {
        if (!reviews || !Array.isArray(reviews)) {
            if (Log)
                Log.warn(
                    "[POI] renderReviews: reviews is",
                    reviews ? "not an array" : "null/undefined",
                    "- type:",
                    typeof reviews
                );
            return null;
        }

        if (Log) Log.info("[POI] renderReviews: rendering", reviews.length, "reviews");

        const div = document.createElement("div");
        div.className = "gl-poi-reviews";

        const maxCount = section.maxCount || 5;
        reviews.slice(0, maxCount).forEach((review) => {
            const reviewDiv = document.createElement("div");
            reviewDiv.className = "gl-poi-review";
            reviewDiv.style.borderLeft = "3px solid var(--gl-color-accent-soft)";
            reviewDiv.style.paddingLeft = "12px";
            reviewDiv.style.marginBottom = "12px";

            const header = document.createElement("p");
            header.style.fontSize = "0.875rem";
            header.style.fontWeight = "600";
            header.style.marginBottom = "4px";

            const safeAuthor = review.authorName || "Anonyme";
            const safeRating = Number.isFinite(review.rating) ? review.rating : 0;
            const verifiedMark = review.verified ? " ✓" : "";
            header.textContent = `${safeAuthor} - ⭐${safeRating}/5${verifiedMark}`;
            reviewDiv.appendChild(header);

            if (review.comment) {
                const comment = document.createElement("p");
                comment.textContent = review.comment;
                comment.style.fontSize = "0.85rem";
                comment.style.marginBottom = "4px";
                reviewDiv.appendChild(comment);
            }

            if (review.createdAt) {
                const date = document.createElement("p");
                date.style.fontSize = "0.75rem";
                date.style.color = "var(--gl-color-text-muted)";
                date.textContent = review.createdAt;
                reviewDiv.appendChild(date);
            }

            div.appendChild(reviewDiv);
        });

        return div;
    }
}

// ── ESM Export ──
export { ComponentRenderers };
