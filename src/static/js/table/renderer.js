/**
 * GeoLeaf Table - Renderer Module
 * Rendu des colonnes, lignes et pagination avec virtual scrolling
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;

    /**
     * Shorthand for createElement
     */
    const $create = (tag, props, ...children) => {
        return GeoLeaf.Utils && GeoLeaf.Utils.createElement
            ? GeoLeaf.Utils.createElement(tag, props, ...children)
            : document.createElement(tag);
    };

    GeoLeaf._TableRenderer = GeoLeaf._TableRenderer || {};
    GeoLeaf._TableRenderer._eventCleanups = [];

    /**
     * Rend le tableau avec les données fournies
     * @param {HTMLElement} container - Conteneur du tableau
     * @param {Object} options - Options de rendu
     * @param {string} options.layerId - ID de la couche
     * @param {Array} options.features - Features à afficher
     * @param {Set} options.selectedIds - IDs des entités sélectionnées
     * @param {Object} options.sortState - État du tri
     * @param {Object} options.config - Configuration du tableau
     */
    GeoLeaf._TableRenderer.render = function (container, options) {
        Log.debug("[TableRenderer] render() - Début, options:", options);

        if (!container) {
            Log.error("[TableRenderer] Conteneur invalide");
            return;
        }

        // Réinitialiser le compteur d'IDs synthétiques à chaque rendu
        _syntheticIdCounter = 0;

        const { layerId, features, selectedIds, sortState, config } = options;
        Log.debug("[TableRenderer] render() - layerId:", layerId, "features:", features ? features.length : 0);

        const table = container.querySelector(".gl-table-panel__table");
        if (!table) {
            Log.error("[TableRenderer] Élément table introuvable");
            return;
        }

        // Si pas de layerId, vider le tableau
        if (!layerId) {
            // SAFE: Chaîne vide pour nettoyer le contenu
            GeoLeaf.DOMSecurity.clearElementFast(table);
            Log.debug("[TableRenderer] Tableau vidé (aucune couche sélectionnée)");
            return;
        }

        // Récupérer la config du layer
        const layerData = GeoLeaf.GeoJSON ? GeoLeaf.GeoJSON.getLayerData(layerId) : null;
        const layerConfig = layerData && layerData.config && layerData.config.table ? layerData.config.table : null;

        if (!layerConfig || !layerConfig.columns) {
            Log.warn("[TableRenderer] Aucune configuration de colonne pour", layerId);
            // SAFE: Chaîne vide pour nettoyer le contenu
            GeoLeaf.DOMSecurity.clearElementFast(table);
            return;
        }

        Log.debug("[TableRenderer] Colonnes:", layerConfig.columns);

        // Vider le tableau
        // SAFE: Chaîne vide pour nettoyer le contenu avant reconstruction
        GeoLeaf.DOMSecurity.clearElementFast(table);

        // Créer le thead
        const thead = createTableHead(layerConfig.columns, sortState);
        table.appendChild(thead);

        // Créer le tbody
        const tbody = createTableBody(features, layerConfig.columns, selectedIds);
        table.appendChild(tbody);

        // Appliquer virtual scrolling si activé
        if (config.virtualScrolling && features.length > config.pageSize) {
            applyVirtualScrolling(container, features, config.pageSize);
        }

        Log.debug("[TableRenderer] Tableau rendu:", features.length, "lignes");
    };

    /**
     * Crée l'en-tête du tableau (thead)
     * @param {Array} columns - Configuration des colonnes
     * @param {Object} sortState - État du tri actuel
     * @returns {HTMLElement}
     * @private
     */
    function createTableHead(columns, sortState) {
        const thead = $create("thead");
        const tr = $create("tr");

        // Colonne checkbox (sélection)
        const thCheckbox = $create("th", { className: "gl-table-panel__th gl-table-panel__th--checkbox" });

        const checkboxAll = $create("input", {
            type: "checkbox",
            className: "gl-table-panel__checkbox-all",
            title: "Tout sélectionner / Tout désélectionner"
        });

        const checkboxAllHandler = (e) => {
            toggleAllRows(e.target.checked);
        };

        const events = GeoLeaf.Utils?.events;
        if (events) {
            GeoLeaf._TableRenderer._eventCleanups.push(
                events.on(checkboxAll, "change", checkboxAllHandler, false, 'TableRenderer.checkboxAll')
            );
        } else {
            checkboxAll.addEventListener("change", checkboxAllHandler);
        }

        thCheckbox.appendChild(checkboxAll);
        tr.appendChild(thCheckbox);

        // Colonnes de données
        columns.forEach(col => {
            const th = $create("th", { className: "gl-table-panel__th" });
            th.textContent = col.label || col.field;

            if (col.width) {
                th.style.width = col.width;
            }

            // Rendre la colonne triable (par défaut toutes les colonnes sont triables)
            const isSortable = col.sortable !== false;
            if (isSortable) {
                th.classList.add("gl-table-panel__th--sortable");
                th.setAttribute("data-field", col.field);

                // Ajouter les indicateurs de tri
                const sortIcon = $create("span", { className: "gl-table-panel__sort-icon" });

                if (sortState.field === col.field) {
                    if (sortState.direction === "asc") {
                        sortIcon.textContent = " ▲";
                        th.classList.add("is-sorted-asc");
                    } else if (sortState.direction === "desc") {
                        sortIcon.textContent = " ▼";
                        th.classList.add("is-sorted-desc");
                    }
                } else {
                    sortIcon.textContent = " ⇅";
                }

                th.appendChild(sortIcon);

                // Événement de tri - avec cleanup tracking
                const sortHandler = () => {
                    if (GeoLeaf.Table && typeof GeoLeaf.Table.sortByField === "function") {
                        GeoLeaf.Table.sortByField(col.field);
                    }
                };

                const events = GeoLeaf.Utils?.events;
                if (events) {
                    GeoLeaf._TableRenderer._eventCleanups.push(
                        events.on(th, "click", sortHandler, false, 'TableRenderer.sort')
                    );
                } else {
                    th.addEventListener("click", sortHandler);
                }
            }

            tr.appendChild(th);
        });

        thead.appendChild(tr);
        return thead;
    }

    /**
     * Crée le corps du tableau (tbody)
     * @param {Array} features - Features à afficher
     * @param {Array} columns - Configuration des colonnes
     * @param {Set} selectedIds - IDs sélectionnés
     * @returns {HTMLElement}
     * @private
     */
    function createTableBody(features, columns, selectedIds) {
        Log.debug("[TableRenderer] createTableBody() - features:", features.length);

        const tbody = $create("tbody");

        // Sprint 3.2: Use DocumentFragment for batch DOM operations
        const fragment = document.createDocumentFragment();

        features.forEach((feature, index) => {
            const tr = createTableRow(feature, columns, selectedIds);
            fragment.appendChild(tr);
        });

        tbody.appendChild(fragment);

        Log.debug("[TableRenderer] tbody créé avec", tbody.children.length, "lignes");
        return tbody;
    }

    /**
     * Crée une ligne du tableau
     * @param {Object} feature - Feature GeoJSON
     * @param {Array} columns - Configuration des colonnes
     * @param {Set} selectedIds - IDs sélectionnés
     * @returns {HTMLElement}
     * @private
     */
    function createTableRow(feature, columns, selectedIds) {
        const tr = $create("tr");
        const featureId = getFeatureId(feature);
        tr.setAttribute("data-feature-id", featureId);

        const isSelected = selectedIds.has(String(featureId));
        if (isSelected) {
            tr.classList.add("is-selected");
        }

        // Cellule checkbox
        const tdCheckbox = $create("td", { className: "gl-table-panel__td gl-table-panel__td--checkbox" });

        const checkbox = $create("input", {
            type: "checkbox",
            className: "gl-table-panel__checkbox",
            checked: isSelected
        });

        const checkboxHandler = (e) => {
            // Pour les checkboxes, toujours traiter comme multi-sélection
            handleRowSelection(featureId, e.target.checked, false, true, true);
        };

        const events = GeoLeaf.Utils?.events;
        if (events) {
            GeoLeaf._TableRenderer._eventCleanups.push(
                events.on(checkbox, "change", checkboxHandler, false, 'TableRenderer.checkbox')
            );
        } else {
            checkbox.addEventListener("change", checkboxHandler);
        }

        tdCheckbox.appendChild(checkbox);
        tr.appendChild(tdCheckbox);

        // Cellules de données
        columns.forEach((col, colIndex) => {
            const td = $create("td", { className: "gl-table-panel__td" });

            const value = getNestedValue(feature, col.field);
            const formattedValue = formatValue(value, col.type);

            td.textContent = formattedValue;

            // Aligner les nombres à droite
            if (col.type === "number") {
                td.classList.add("gl-table-panel__td--number");
            }

            tr.appendChild(td);
        });

        // Événement clic sur la ligne (sélection simple) - avec cleanup tracking
        const rowClickHandler = (e) => {
            // Ignorer si c'est le checkbox qui a été cliqué
            if (e.target.type === "checkbox") return;
            const currentState = tr.classList.contains("is-selected");
            handleRowSelection(featureId, !currentState, e.shiftKey, e.ctrlKey || e.metaKey);
        };

        // Reuse EventListenerManager from outer scope
        if (events) {
            GeoLeaf._TableRenderer._eventCleanups.push(
                events.on(tr, "click", rowClickHandler, false, 'TableRenderer.rowClick')
            );
        } else {
            tr.addEventListener("click", rowClickHandler);
        }

        return tr;
    }

    /**
     * Gère la sélection d'une ligne
     * @param {string} featureId - ID de la feature
     * @param {boolean} selected - Sélectionné ou non
     * @param {boolean} shiftKey - Touche Shift enfoncée
     * @param {boolean} ctrlKey - Touche Ctrl/Cmd enfoncée
     * @param {boolean} isCheckbox - Si l'action vient d'une checkbox
     * @private
     */
    function handleRowSelection(featureId, selected, shiftKey, ctrlKey, isCheckbox = false) {
        Log.debug("[TableRenderer] handleRowSelection - featureId:", featureId, "selected:", selected);

        if (!GeoLeaf.Table) {
            Log.error("[TableRenderer] GeoLeaf.Table non disponible");
            return;
        }

        const currentSelection = GeoLeaf.Table.getSelectedIds();

        if (shiftKey && currentSelection.length > 0) {
            // Sélection par plage (Shift+clic)
            Log.debug("[TableRenderer] Mode SHIFT - Sélection par plage");
            selectRange(featureId);
        } else if (ctrlKey || isCheckbox) {
            // Multi-sélection (Ctrl+clic ou checkbox)
            Log.debug("[TableRenderer] Mode MULTI - Multi-sélection" + (isCheckbox ? " (checkbox)" : " (Ctrl)"));
            if (selected) {
                const newSelection = [...currentSelection, featureId];
                GeoLeaf.Table.setSelection(newSelection, false);
            } else {
                const newSelection = currentSelection.filter(id => id !== featureId);
                GeoLeaf.Table.setSelection(newSelection, false);
            }
        } else {
            // Sélection simple
            Log.debug("[TableRenderer] Mode SIMPLE - Sélection unique");
            if (selected) {
                GeoLeaf.Table.setSelection([featureId], false);
            } else {
                GeoLeaf.Table.clearSelection();
            }
        }

        // Mettre à jour l'état des boutons
        updateToolbarButtonsState();
    }

    /**
     * Sélectionne une plage de lignes (Shift+clic)
     * @param {string} targetId - ID de la feature cible
     * @private
     */
    function selectRange(targetId) {
        const tbody = document.querySelector(".gl-table-panel__table tbody");
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll("tr"));
        const currentSelection = GeoLeaf.Table.getSelectedIds();
        const lastSelected = currentSelection[currentSelection.length - 1];

        const targetIndex = rows.findIndex(r => r.getAttribute("data-feature-id") === targetId);
        const lastIndex = rows.findIndex(r => r.getAttribute("data-feature-id") === lastSelected);

        if (targetIndex === -1 || lastIndex === -1) return;

        const start = Math.min(targetIndex, lastIndex);
        const end = Math.max(targetIndex, lastIndex);

        const rangeIds = [];
        for (let i = start; i <= end; i++) {
            const id = rows[i].getAttribute("data-feature-id");
            if (id) rangeIds.push(id);
        }

        GeoLeaf.Table.setSelection(rangeIds, false);
        updateToolbarButtonsState();
    }

    /**
     * Toggle toutes les lignes (checkbox "tout sélectionner")
     * @param {boolean} checked - État du checkbox
     * @private
     */
    function toggleAllRows(checked) {
        const tbody = document.querySelector(".gl-table-panel__table tbody");
        if (!tbody) return;

        const rows = tbody.querySelectorAll("tr");
        const ids = [];

        rows.forEach(row => {
            const id = row.getAttribute("data-feature-id");
            if (id) {
                ids.push(id);
                row.classList.toggle("is-selected", checked);
                const checkbox = row.querySelector(".gl-table-panel__checkbox");
                if (checkbox) checkbox.checked = checked;
            }
        });

        if (checked) {
            GeoLeaf.Table.setSelection(ids, false);
        } else {
            GeoLeaf.Table.clearSelection();
        }

        updateToolbarButtonsState();
    }

    /**
     * Met à jour la sélection visuelle dans le tableau
     * @param {HTMLElement} container - Conteneur du tableau
     * @param {Set} selectedIds - IDs sélectionnés
     */
    GeoLeaf._TableRenderer.updateSelection = function (container, selectedIds) {
        const tbody = container.querySelector(".gl-table-panel__table tbody");
        if (!tbody) return;

        const rows = tbody.querySelectorAll("tr");

        rows.forEach(row => {
            const id = row.getAttribute("data-feature-id");
            const isSelected = selectedIds.has(String(id));

            row.classList.toggle("is-selected", isSelected);

            const checkbox = row.querySelector(".gl-table-panel__checkbox");
            if (checkbox) {
                checkbox.checked = isSelected;
            }
        });

        // Mettre à jour le checkbox "tout sélectionner"
        const checkboxAll = container.querySelector(".gl-table-panel__checkbox-all");
        if (checkboxAll) {
            const totalRows = rows.length;
            const selectedCount = selectedIds.size;
            checkboxAll.checked = totalRows > 0 && selectedCount === totalRows;
            checkboxAll.indeterminate = selectedCount > 0 && selectedCount < totalRows;
        }

        updateToolbarButtonsState();
    };

    /**
     * Applique le virtual scrolling pour de grandes listes
     * @param {HTMLElement} container - Conteneur
     * @param {Array} features - Features complètes
     * @param {number} pageSize - Taille de page
     * @private
     */
    function applyVirtualScrolling(container, features, pageSize) {
        // Implementation simple : pagination au scroll
        // Pour un vrai virtual scrolling, utiliser IntersectionObserver
        Log.debug("[TableRenderer] Virtual scrolling activé pour", features.length, "entités");
        // TODO(v3.2): Implement custom cell renderers if necessary for advanced use cases
    }

    /**
     * Met à jour l'état des boutons de la toolbar
     * @private
     */
    function updateToolbarButtonsState() {
        if (!GeoLeaf.Table) return;

        const selectedCount = GeoLeaf.Table.getSelectedIds().length;

        if (GeoLeaf._TablePanel && typeof GeoLeaf._TablePanel.updateToolbarButtons === "function") {
            GeoLeaf._TablePanel.updateToolbarButtons(selectedCount);
        }
    }

    /**
     * Compteur interne pour générer des IDs synthétiques
     * @type {number}
     * @private
     */
    let _syntheticIdCounter = 0;

    /**
     * Récupère l'ID d'une feature de manière fiable
     * Parcourt plusieurs propriétés candidates puis génère un ID synthétique si nécessaire
     * @param {Object} feature - Feature GeoJSON
     * @returns {string}
     * @private
     */
    function getFeatureId(feature) {
        // 1. ID standard GeoJSON
        if (feature.id != null && feature.id !== "") return String(feature.id);

        const p = feature.properties;
        if (!p) return "__gl_row_" + (_syntheticIdCounter++);

        // 2. Propriétés d'identifiant courantes
        if (p.id != null && p.id !== "") return String(p.id);
        if (p.fid != null && p.fid !== "") return String(p.fid);
        if (p.osm_id != null && p.osm_id !== "") return String(p.osm_id);
        if (p.OBJECTID != null && p.OBJECTID !== "") return String(p.OBJECTID);
        if (p.SITE_ID != null && p.SITE_ID !== "") return String(p.SITE_ID);
        if (p.code != null && p.code !== "") return String(p.code);
        if (p.IN1 != null && p.IN1 !== "") return String(p.IN1);

        // 3. Fallback : ID synthétique basé sur un compteur
        return "__gl_row_" + (_syntheticIdCounter++);
    }

    /**
     * Récupère une valeur imbriquée dans un objet
     * @param {Object} obj - Objet source
     * @param {string} path - Chemin avec notation point
     * @returns {*}
     * @private
     */
    function getNestedValue(obj, path) {
        if (!obj || !path) return null;
        return path.split('.').reduce((current, prop) =>
            current && current[prop] !== undefined ? current[prop] : null, obj);
    }

    /**
     * Formate une valeur selon son type
     * @param {*} value - Valeur à formater
     * @param {string} type - Type de données (string, number, date)
     * @returns {string}
     * @private
     */
    function formatValue(value, type) {
        if (value == null || value === "") return "–";

        if (type === "number") {
            const num = Number(value);
            if (isNaN(num)) return String(value);
            // Formater avec séparateurs de milliers
            return num.toLocaleString("fr-FR");
        }

        if (type === "date") {
            const date = new Date(value);
            if (isNaN(date.getTime())) return String(value);
            return date.toLocaleDateString("fr-FR");
        }

        return String(value);
    }

})(typeof window !== "undefined" ? window : global);
