/**
 * POI Renderers - Complex Renderers Module
 * Rendu des structures complexes: listes, tables, reviews
 *
 * @module poi/renderers/complex-renderers
 * @requires poi/renderers/core (parent)
 */
((global) => {
    'use strict';

    const GeoLeaf = global.GeoLeaf || {};
    const Log = GeoLeaf.Log;

    /**
     * Shorthand for createElement
     */
    const $create = (tag, props, ...children) => {
        return GeoLeaf.Utils && GeoLeaf.Utils.createElement
            ? GeoLeaf.Utils.createElement(tag, props, ...children)
            : document.createElement(tag);
    };

    /**
     * Rend une liste (normale ou price object)
     */
    function renderList(section, data) {
        if (!data) {
            if (Log) Log.warn('[POI] renderList: data is null/undefined');
            return null;
        }

        const div = $create('div', { className: 'gl-poi-section' });

        // Cas spécial pour price (objet)
        if (typeof data === 'object' && !Array.isArray(data)) {
            if (Log) Log.info('[POI] renderList: price object:', data);

            if (data.from || data.to) {
                const p = $create('p');
                const strong = $create('strong');

                const safeFrom = Number.isFinite(Number(data.from)) ? Number(data.from) : null;
                const safeTo = Number.isFinite(Number(data.to)) ? Number(data.to) : null;
                const safeCurrency = data.currency || 'USD';

                if (safeFrom !== null && safeTo !== null) {
                    strong.textContent = `De ${safeFrom} à ${safeTo} ${safeCurrency}`;
                } else if (safeFrom !== null) {
                    strong.textContent = `À partir de ${safeFrom} ${safeCurrency}`;
                } else if (safeTo !== null) {
                    strong.textContent = `Jusqu'à ${safeTo} ${safeCurrency}`;
                }

                if (strong.textContent) {
                    p.appendChild(strong);
                    div.appendChild(p);
                }
            }
            if (data.description) {
                const desc = $create('p', {
                    textContent: data.description,
                    style: {
                        fontSize: '0.85rem',
                        color: 'var(--gl-color-text-muted)'
                    }
                });
                div.appendChild(desc);
            }

            if (div.children.length === 0) {
                if (Log) Log.warn('[POI] renderList: price object has no displayable content');
                return null;
            }
            return div;
        }

        // Liste normale
        if (Array.isArray(data)) {
            const variant = section.variant || 'disc';

            const ul = $create('ul', {
                className: 'gl-poi-list-unordered',
                style: { listStyleType: variant === 'disc' || variant === 'circle' || variant === 'square' ? variant : 'disc' }
            });

            data.forEach(item => {
                const li = $create('li', { textContent: item });
                ul.appendChild(li);
            });

            div.appendChild(ul);
        }

        return div;
    }

    /**
     * Rend un tableau (horaires, etc.)
     */
    function renderTable(section, data) {
        if (!data || !Array.isArray(data)) {
            if (Log) Log.warn('[POI] renderTable: data is', data ? 'not an array' : 'null/undefined', '- type:', typeof data);
            return null;
        }

        if (Log) Log.info('[POI] renderTable: rendering', data.length, 'rows');

        // Transformer les chaînes en objets si nécessaire
        let tableData = data;
        if (data.length > 0 && typeof data[0] === 'string' && section.columns && section.columns.length === 2) {
            const separators = [' : ', ': ', ' – ', '–', ' - ', '-'];
            tableData = data.map(str => {
                for (const sep of separators) {
                    const parts = str.split(sep);
                    if (parts.length >= 2) {
                        return {
                            [section.columns[0].key]: parts[0].trim(),
                            [section.columns[1].key]: parts.slice(1).join(sep).trim()
                        };
                    }
                }
                return {
                    [section.columns[0].key]: str,
                    [section.columns[1].key]: ''
                };
            });
            if (Log) Log.info('[POI] renderTable: transformed string array to object array');
        }

        const table = $create('table', { className: 'gl-poi-table' });

        const borders = section.borders || {};
        if (borders.outer !== false) {
            table.style.border = `1px solid ${borders.color || 'var(--gl-color-border-soft)'}`;
        }

        // En-têtes
        if (section.columns) {
            const thead = $create('thead');
            const tr = $create('tr');
            section.columns.forEach((col, index) => {
                const th = $create('th', {
                    textContent: col.label,
                    style: {
                        padding: '8px',
                        textAlign: 'left',
                        fontWeight: '600',
                        backgroundColor: 'var(--gl-color-bg-subtle)'
                    }
                });

                if (borders.row !== false) {
                    th.style.borderBottom = `1px solid ${borders.color || 'var(--gl-color-border-soft)'}`;
                }
                if (borders.column && index > 0) {
                    th.style.borderLeft = `1px solid ${borders.color || 'var(--gl-color-border-soft)'}`;
                }

                tr.appendChild(th);
            });
            thead.appendChild(tr);
            table.appendChild(thead);
        }

        // Lignes de données
        const tbody = $create('tbody');
        tableData.forEach((row, rowIndex) => {
            const tr = $create('tr');
            if (section.columns) {
                section.columns.forEach((col, colIndex) => {
                    const td = $create('td', {
                        textContent: row[col.key] || '',
                        style: { padding: '8px' }
                    });

                    if (borders.row !== false && rowIndex < tableData.length - 1) {
                        td.style.borderBottom = `1px solid ${borders.color || 'var(--gl-color-border-soft)'}`;
                    }
                    if (borders.column && colIndex > 0) {
                        td.style.borderLeft = `1px solid ${borders.color || 'var(--gl-color-border-soft)'}`;
                    }

                    tr.appendChild(td);
                });
            }
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        return table;
    }

    /**
     * Rend les avis (reviews)
     */
    function renderReviews(section, reviews) {
        if (!reviews || !Array.isArray(reviews)) {
            if (Log) Log.warn('[POI] renderReviews: reviews is', reviews ? 'not an array' : 'null/undefined', '- type:', typeof reviews);
            return null;
        }

        if (Log) Log.info('[POI] renderReviews: rendering', reviews.length, 'reviews');

        const div = $create('div', { className: 'gl-poi-reviews' });

        const maxCount = section.maxCount || 5;
        reviews.slice(0, maxCount).forEach(review => {
            const reviewDiv = $create('div', {
                className: 'gl-poi-review',
                style: {
                    borderLeft: '3px solid var(--gl-color-accent-soft)',
                    paddingLeft: '12px',
                    marginBottom: '12px'
                }
            });

            const header = $create('p', {
                style: {
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '4px'
                }
            });

            const safeAuthor = review.authorName || 'Anonyme';
            const safeRating = Number.isFinite(review.rating) ? review.rating : 0;
            const verifiedMark = review.verified ? ' ✓' : '';
            header.textContent = `${safeAuthor} - ⭐${safeRating}/5${verifiedMark}`;
            reviewDiv.appendChild(header);

            const comment = $create('p', {
                textContent: review.comment,
                style: {
                    fontSize: '0.85rem',
                    marginBottom: '4px'
                }
            });
            reviewDiv.appendChild(comment);

            const date = $create('p', {
                style: {
                    fontSize: '0.75rem',
                    color: 'var(--gl-color-text-muted)'
                }
            });
            date.textContent = review.createdAt;
            reviewDiv.appendChild(date);

            div.appendChild(reviewDiv);
        });

        return div;
    }

    // Export
    GeoLeaf._POIComplexRenderers = {
        renderList,
        renderTable,
        renderReviews
    };

    if (Log) Log.debug('[POI] Complex Renderers module loaded');

})(window);
