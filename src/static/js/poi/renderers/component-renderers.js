/**
 * GeoLeaf POI Module - Component Renderers
 * Rendu des composants UI (badges, liens, listes, tableaux, tags)
 * Phase 6.2 - Extraction depuis core.js
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;

    /**
     * Renderers pour les composants UI du side panel
     */
    class ComponentRenderers {
        constructor() {
            // Référence aux modules POI
            this.getMarkers = () => GeoLeaf._POIMarkers;
        }

        /**
         * Rend un badge avec style de catégorie
         * @param {object} section - Configuration de section
         * @param {string} value - Valeur du badge
         * @param {object} poi - POI complet
         * @returns {HTMLElement|null}
         */
        renderBadge(section, value, poi) {
            if (!value) return null;

            const container = document.createElement('div');
            container.className = 'gl-poi-badge-container';

            const badge = document.createElement('span');
            badge.className = 'gl-poi-badge';
            badge.textContent = value;

            // Récupérer les couleurs depuis la taxonomie si disponible
            const markers = this.getMarkers();
            if (markers && markers.resolveCategoryDisplay) {
                const displayInfo = markers.resolveCategoryDisplay(poi);
                if (displayInfo.colorFill) {
                    badge.style.background = displayInfo.colorFill;
                    badge.style.color = '#fff';
                }
            }

            container.appendChild(badge);
            return container;
        }

        /**
         * Rend un lien externe
         * @param {object} section - Configuration de section
         * @param {string} url - URL du lien
         * @returns {HTMLElement|null}
         */
        renderLink(section, url) {
            if (!url) return null;

            const container = document.createElement('div');
            container.className = 'gl-poi-link-container';

            const link = document.createElement('a');
            link.className = 'gl-poi-website-link';
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = section.label || 'Visiter le site web →';

            container.appendChild(link);
            return container;
        }

        /**
         * Rend une liste (tableau de prix, etc.)
         * @param {object} section - Configuration de section
         * @param {Array|object} data - Données à afficher
         * @returns {HTMLElement|null}
         */
        renderList(section, data) {
            if (!data) {
                if (Log) Log.warn('[POI] renderList: data is null/undefined');
                return null;
            }

            const div = document.createElement('div');
            div.className = 'gl-poi-section';

            // Cas spécial pour price (objet)
            if (typeof data === 'object' && !Array.isArray(data)) {
                if (Log) Log.info('[POI] renderList: price object:', data);

                if (data.from || data.to) {
                    const p = document.createElement('p');
                    const strong = document.createElement('strong');

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
                    const desc = document.createElement('p');
                    desc.textContent = data.description;
                    desc.style.fontSize = '0.85rem';
                    desc.style.color = 'var(--gl-color-text-muted)';
                    div.appendChild(desc);
                }

                if (div.children.length === 0) {
                    if (Log) Log.warn('[POI] renderList: price object has no displayable content');
                    return null;
                }
                return div;
            }

            // Liste normale (array)
            if (Array.isArray(data)) {
                const variant = section.variant || 'disc';

                const ul = document.createElement('ul');
                ul.className = 'gl-poi-list-unordered';

                // Appliquer le style de puce selon le variant
                if (variant === 'disc' || variant === 'circle' || variant === 'square') {
                    ul.style.listStyleType = variant;
                } else {
                    ul.style.listStyleType = 'disc'; // Par défaut
                }

                data.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    ul.appendChild(li);
                });

                div.appendChild(ul);
            }

            return div;
        }

        /**
         * Rend un tableau avec en-têtes et bordures
         * @param {object} section - Configuration de section
         * @param {Array} data - Données du tableau
         * @returns {HTMLElement|null}
         */
        renderTable(section, data) {
            if (!data || !Array.isArray(data)) {
                if (Log) Log.warn('[POI] renderTable: data is', data ? 'not an array' : 'null/undefined', '- type:', typeof data);
                return null;
            }

            if (Log) Log.info('[POI] renderTable: rendering', data.length, 'rows');

            // Transformer les chaînes en objets si nécessaire
            let tableData = data;
            if (data.length > 0 && typeof data[0] === 'string' && section.columns && section.columns.length === 2) {
                // Détecter le format "Clé : Valeur" ou "Clé – Valeur"
                tableData = data.map(str => {
                    const separators = [' : ', ': ', ' – ', '–', ' - ', '-'];
                    for (const sep of separators) {
                        const parts = str.split(sep);
                        if (parts.length >= 2) {
                            return {
                                [section.columns[0].key]: parts[0].trim(),
                                [section.columns[1].key]: parts.slice(1).join(sep).trim()
                            };
                        }
                    }
                    // Si aucun séparateur trouvé, tout dans la première colonne
                    return {
                        [section.columns[0].key]: str,
                        [section.columns[1].key]: ''
                    };
                });
                if (Log) Log.info('[POI] renderTable: transformed string array to object array');
            }

            const table = document.createElement('table');
            table.className = 'gl-poi-table';

            // Gestion des bordures selon la configuration
            const borders = section.borders || {};
            if (borders.outer !== false) {
                table.style.border = `1px solid ${borders.color || 'var(--gl-color-border-soft)'}`;
            }

            // En-têtes
            if (section.columns) {
                const thead = document.createElement('thead');
                const tr = document.createElement('tr');
                section.columns.forEach((col, index) => {
                    const th = document.createElement('th');
                    th.textContent = col.label;
                    th.style.padding = '8px';
                    th.style.textAlign = 'left';
                    th.style.fontWeight = '600';
                    th.style.backgroundColor = 'var(--gl-color-bg-subtle)';

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
            const tbody = document.createElement('tbody');
            tableData.forEach((row, rowIndex) => {
                const tr = document.createElement('tr');
                if (section.columns) {
                    section.columns.forEach((col, colIndex) => {
                        const td = document.createElement('td');
                        td.textContent = row[col.key] || '';
                        td.style.padding = '8px';

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
         * Rend des tags
         * @param {object} section - Configuration de section
         * @param {Array<string>} tags - Liste de tags
         * @returns {HTMLElement|null}
         */
        renderTags(section, tags) {
            if (!tags || !Array.isArray(tags)) {
                if (Log) Log.warn('[POI] renderTags: tags is', tags ? 'not an array' : 'null/undefined', '- type:', typeof tags, '- value:', tags);
                return null;
            }

            if (tags.length === 0) {
                if (Log) Log.warn('[POI] renderTags: tags array is empty');
                return null;
            }

            if (Log) Log.info('[POI] renderTags: rendering', tags.length, 'tags');

            const div = document.createElement('div');
            div.className = 'gl-poi-sidepanel__tags';
            div.style.display = 'flex';
            div.style.flexWrap = 'wrap';
            div.style.gap = '6px';

            tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'gl-poi-tag';
                tagSpan.textContent = tag;
                div.appendChild(tagSpan);
            });

            return div;
        }

        /**
         * Rend les avis (reviews)
         * @param {object} section - Configuration de section
         * @param {Array} reviews - Liste d'avis
         * @returns {HTMLElement|null}
         */
        renderReviews(section, reviews) {
            if (!reviews || !Array.isArray(reviews)) {
                if (Log) Log.warn('[POI] renderReviews: reviews is', reviews ? 'not an array' : 'null/undefined', '- type:', typeof reviews);
                return null;
            }

            if (Log) Log.info('[POI] renderReviews: rendering', reviews.length, 'reviews');

            const div = document.createElement('div');
            div.className = 'gl-poi-reviews';

            const maxCount = section.maxCount || 5;
            reviews.slice(0, maxCount).forEach(review => {
                const reviewDiv = document.createElement('div');
                reviewDiv.className = 'gl-poi-review';
                reviewDiv.style.borderLeft = '3px solid var(--gl-color-accent-soft)';
                reviewDiv.style.paddingLeft = '12px';
                reviewDiv.style.marginBottom = '12px';

                const header = document.createElement('p');
                header.style.fontSize = '0.875rem';
                header.style.fontWeight = '600';
                header.style.marginBottom = '4px';

                const safeAuthor = review.authorName || 'Anonyme';
                const safeRating = Number.isFinite(review.rating) ? review.rating : 0;
                const verifiedMark = review.verified ? ' ✓' : '';
                header.textContent = `${safeAuthor} - ⭐${safeRating}/5${verifiedMark}`;
                reviewDiv.appendChild(header);

                if (review.comment) {
                    const comment = document.createElement('p');
                    comment.textContent = review.comment;
                    comment.style.fontSize = '0.85rem';
                    comment.style.marginBottom = '4px';
                    reviewDiv.appendChild(comment);
                }

                if (review.createdAt) {
                    const date = document.createElement('p');
                    date.style.fontSize = '0.75rem';
                    date.style.color = 'var(--gl-color-text-muted)';
                    date.textContent = review.createdAt;
                    reviewDiv.appendChild(date);
                }

                div.appendChild(reviewDiv);
            });

            return div;
        }
    }

    // Export global
    GeoLeaf.ComponentRenderers = ComponentRenderers;

})(typeof window !== "undefined" ? window : global);
