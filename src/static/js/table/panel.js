/**
 * GeoLeaf Table - Panel Module
 * Construction du bottom-sheet drawer pour le tableau
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;

    GeoLeaf._TablePanel = GeoLeaf._TablePanel || {};
    GeoLeaf._TablePanel._eventCleanups = [];

    /**
     * Crée le conteneur principal du tableau (bottom-sheet)
     * @param {L.Map} map - Instance de la carte Leaflet
     * @param {Object} config - Configuration du tableau
     * @returns {HTMLElement} Conteneur du tableau
     */
    GeoLeaf._TablePanel.create = function (map, config) {
        // Vérifier si le conteneur existe déjà
        let container = document.querySelector(".gl-table-panel");
        if (container) {
            Log.debug("[TablePanel] Conteneur existant réutilisé");
            return container;
        }

        // Créer le conteneur principal
        container = document.createElement("div");
        container.className = "gl-table-panel";
        container.style.height = config.defaultHeight || "40%";

        // Ajouter la barre de redimensionnement si resizable
        if (config.resizable) {
            const resizeHandle = createResizeHandle(container, config);
            container.appendChild(resizeHandle);
        }

        // Créer la barre d'outils (header)
        const toolbar = createToolbar(map, config);
        container.appendChild(toolbar);

        // Créer le wrapper du tableau avec scroll
        const tableWrapper = document.createElement("div");
        tableWrapper.className = "gl-table-panel__wrapper";
        container.appendChild(tableWrapper);

        // Créer le tableau vide (sera rempli par le renderer)
        const table = document.createElement("table");
        table.className = "gl-table-panel__table";
        tableWrapper.appendChild(table);

        // Ajouter au body
        document.body.appendChild(container);

        // Créer le bouton flottant pour afficher le tableau (quand masqué)
        createFloatingShowButton();

        Log.info("[TablePanel] Panneau créé avec succès");
        return container;
    };

    /**
     * Crée la barre de redimensionnement
     * @param {HTMLElement} container - Conteneur du tableau
     * @param {Object} config - Configuration
     * @returns {HTMLElement}
     * @private
     */
    function createResizeHandle(container, config) {
        const handle = document.createElement("div");
        handle.className = "gl-table-panel__resize-handle";
        const resizeBar = document.createElement("div");
        resizeBar.className = "gl-table-panel__resize-bar";
        handle.appendChild(resizeBar);

        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        const events = GeoLeaf.Utils?.events;

        const mouseDownHandler = (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = container.offsetHeight;
            document.body.style.cursor = "ns-resize";
            document.body.style.userSelect = "none";
            e.preventDefault();
        };

        const mouseMoveHandler = (e) => {
            if (!isResizing) return;
            const delta = startY - e.clientY;
            let newHeight = startHeight + delta;
            const viewportHeight = window.innerHeight;
            const minHeightPx = parseHeight(config.minHeight || "20%", viewportHeight);
            const maxHeightPx = parseHeight(config.maxHeight || "80%", viewportHeight);
            newHeight = Math.max(minHeightPx, Math.min(maxHeightPx, newHeight));
            container.style.height = newHeight + "px";
        };

        const mouseUpHandler = () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            }
        };

        if (events) {
            GeoLeaf._TablePanel._eventCleanups.push(
                events.on(handle, "mousedown", mouseDownHandler, false, 'TablePanel.resizeMouseDown')
            );
            GeoLeaf._TablePanel._eventCleanups.push(
                events.on(document, "mousemove", mouseMoveHandler, false, 'TablePanel.resizeMouseMove')
            );
            GeoLeaf._TablePanel._eventCleanups.push(
                events.on(document, "mouseup", mouseUpHandler, false, 'TablePanel.resizeMouseUp')
            );
        } else {
            handle.addEventListener("mousedown", mouseDownHandler);
            document.addEventListener("mousemove", mouseMoveHandler);
            document.addEventListener("mouseup", mouseUpHandler);
        }

        return handle;
    }

    /**
     * Parse une valeur de hauteur (%, px, vh) en pixels
     * @param {string} value - Valeur à parser ("40%", "300px", "50vh")
     * @param {number} referenceHeight - Hauteur de référence pour les %
     * @returns {number} Hauteur en pixels
     * @private
     */
    function parseHeight(value, referenceHeight) {
        if (typeof value === "number") return value;
        if (typeof value !== "string") return 300;

        if (value.endsWith("%")) {
            const percent = parseFloat(value);
            return (referenceHeight * percent) / 100;
        } else if (value.endsWith("px")) {
            return parseFloat(value);
        } else if (value.endsWith("vh")) {
            const vh = parseFloat(value);
            return (window.innerHeight * vh) / 100;
        }
        return 300; // Défaut
    }

    /**
     * Crée la barre d'outils du tableau
     * @param {L.Map} map - Instance de la carte
     * @param {Object} config - Configuration
     * @returns {HTMLElement}
     * @private
     */
    function createToolbar(map, config) {
        const toolbar = document.createElement("div");
        toolbar.className = "gl-table-panel__toolbar";

        // Sélecteur de couche
        const layerSelect = createLayerSelector();
        toolbar.appendChild(layerSelect);

        // Champ de recherche
        const searchInput = createSearchInput();
        toolbar.appendChild(searchInput);

        // Bouton Zoom sur la sélection
        const zoomButton = createButton("Zoom sur sélection", "zoom", () => {
            if (GeoLeaf.Table && typeof GeoLeaf.Table.zoomToSelection === "function") {
                GeoLeaf.Table.zoomToSelection();
            }
        });
        zoomButton.disabled = true;
        zoomButton.setAttribute("data-table-btn", "zoom");
        toolbar.appendChild(zoomButton);

        // Bouton Surbrillance
        const highlightButton = createButton("Surbrillance", "highlight", () => {
            const isActive = highlightButton.classList.toggle("is-active");
            if (GeoLeaf.Table && typeof GeoLeaf.Table.highlightSelection === "function") {
                GeoLeaf.Table.highlightSelection(isActive);
            }
        });
        highlightButton.disabled = true;
        highlightButton.setAttribute("data-table-btn", "highlight");
        toolbar.appendChild(highlightButton);

        // Bouton Export (si activé)
        if (config.enableExportButton) {
            const exportButton = createButton("Exporter", "export", () => {
                if (GeoLeaf.Table && typeof GeoLeaf.Table.exportSelection === "function") {
                    GeoLeaf.Table.exportSelection();
                }
            });
            exportButton.disabled = true;
            exportButton.setAttribute("data-table-btn", "export");
            toolbar.appendChild(exportButton);
        }

        // Spacer pour pousser le bouton toggle à droite
        const spacer = document.createElement("div");
        spacer.style.flex = "1";
        toolbar.appendChild(spacer);

        // Bouton toggle (masquer/afficher le tableau)
        const toggleBtn = createToggleButton();
        toolbar.appendChild(toggleBtn);

        return toolbar;
    }

    /**
     * Crée le sélecteur de couche
     * @returns {HTMLElement}
     * @private
     */
    function createLayerSelector() {
        const wrapper = document.createElement("div");
        wrapper.className = "gl-table-panel__layer-selector";

        const select = document.createElement("select");
        select.id = "geoleaf-table-layer-selector";
        select.name = "geoleaf-table-layer-selector";
        select.className = "gl-table-panel__select";
        select.setAttribute("data-table-layer-select", "");

        // Option par défaut
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Sélectionner une couche...";
        select.appendChild(defaultOption);

        // Peupler avec les couches disponibles
        populateLayerSelector(select);

        // Événement de changement - avec cleanup tracking
        const changeHandler = (e) => {
            const layerId = e.target.value;
            Log.debug("[TablePanel] Sélecteur changé, layerId:", layerId);
            Log.debug("[TablePanel] GeoLeaf.Table existe:", !!GeoLeaf.Table);
            Log.debug("[TablePanel] setLayer existe:", typeof GeoLeaf.Table?.setLayer);
            if (GeoLeaf.Table && typeof GeoLeaf.Table.setLayer === "function") {
                GeoLeaf.Table.setLayer(layerId);
            } else {
                Log.error("[TablePanel] GeoLeaf.Table.setLayer non disponible!");
            }
        };

        const events = GeoLeaf.Utils?.events;
        if (events) {
            GeoLeaf._TablePanel._eventCleanups.push(
                events.on(select, "change", changeHandler, false, 'TablePanel.layerSelect')
            );
        } else {
            select.addEventListener("change", changeHandler);
        }

        Log.debug("[TablePanel] Événement 'change' attaché au sélecteur");

        wrapper.appendChild(select);
        return wrapper;
    }

    /**
     * Peuple le sélecteur avec les couches disponibles
     * @param {HTMLSelectElement} select - Élément select
     * @private
     */
    function populateLayerSelector(select) {
        Log.debug("[TablePanel] populateLayerSelector appelé");

        if (!GeoLeaf.GeoJSON || typeof GeoLeaf.GeoJSON.getAllLayers !== "function") {
            Log.warn("[TablePanel] Module GeoJSON non disponible");
            return;
        }

        const allLayers = GeoLeaf.GeoJSON.getAllLayers();
        Log.debug("[TablePanel] getAllLayers retourne:", allLayers.length, "couches");

        if (allLayers.length === 0) {
            Log.debug("[TablePanel] Aucune couche chargée, le sélecteur sera rafraîchi par l'événement layers-loaded");
            return;
        }

        const VisibilityManager = GeoLeaf._LayerVisibilityManager;

        // Vérifier les options existantes pour éviter les doublons
        const existingValues = new Set();
        for (let i = 1; i < select.options.length; i++) {
            existingValues.add(select.options[i].value);
        }

        let addedCount = 0;
        allLayers.forEach(layer => {
            const layerData = GeoLeaf.GeoJSON.getLayerData(layer.id);
            Log.debug("[TablePanel] Vérification couche:", layer.id, "table enabled:", layerData?.config?.table?.enabled);

            if (layerData && layerData.config && layerData.config.table && layerData.config.table.enabled) {
                // Vérifier que la couche est visible sur la carte
                let isVisible = true;
                if (VisibilityManager && typeof VisibilityManager.getVisibilityState === "function") {
                    const visState = VisibilityManager.getVisibilityState(layer.id);
                    isVisible = visState && visState.current === true;
                } else if (layerData._visibility) {
                    isVisible = layerData._visibility.current === true;
                }

                if (!isVisible) {
                    Log.debug("[TablePanel] Couche", layer.id, "masquée, ignorée dans le sélecteur");
                    return;
                }

                // N'ajouter que si pas déjà présent
                if (!existingValues.has(layer.id)) {
                    const option = document.createElement("option");
                    option.value = layer.id;
                    option.textContent = layer.label || layer.id;
                    select.appendChild(option);
                    addedCount++;
                }
            }
        });

        if (addedCount > 0) {
            Log.info("[TablePanel] Sélecteur de couche peuplé:", addedCount, "couches ajoutées");
        }
    }

    /**
     * Crée le champ de recherche
     * @returns {HTMLElement}
     * @private
     */
    function createSearchInput() {
        const wrapper = document.createElement("div");
        wrapper.className = "gl-table-panel__search";

        const input = document.createElement("input");
        input.type = "text";
        input.id = "geoleaf-table-search-input";
        input.name = "geoleaf-table-search-input";
        input.placeholder = "Rechercher...";
        input.className = "gl-table-panel__search-input";
        input.setAttribute("data-table-search", "");

        // Debounce la recherche pour éviter les appels trop fréquents
        let timeout;
        const inputHandler = (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const searchText = e.target.value.trim().toLowerCase();
                filterTableRows(searchText);
            }, 300);
        };

        wrapper.appendChild(input);
        return wrapper;
    }

    /**
     * Filtre les lignes du tableau selon le texte de recherche
     * @param {string} searchText - Texte à rechercher
     * @private
     */
    function filterTableRows(searchText) {
        const table = document.querySelector(".gl-table-panel__table tbody");
        if (!table) return;

        const rows = table.querySelectorAll("tr");
        let visibleCount = 0;

        rows.forEach(row => {
            if (!searchText) {
                row.style.display = "";
                visibleCount++;
                return;
            }

            const cells = row.querySelectorAll("td");
            let match = false;

            cells.forEach(cell => {
                const text = cell.textContent.toLowerCase();
                if (text.includes(searchText)) {
                    match = true;
                }
            });

            row.style.display = match ? "" : "none";
            if (match) visibleCount++;
        });

        Log.debug("[TablePanel] Recherche:", visibleCount, "résultats pour", searchText);
    }

    /**
     * Crée un bouton générique
     * @param {string} label - Libellé du bouton
     * @param {string} icon - Classe d'icône (optionnel)
     * @param {Function} onClick - Callback au clic
     * @returns {HTMLElement}
     * @private
     */
    function createButton(label, icon, onClick) {
        const button = document.createElement("button");
        button.className = "gl-table-panel__btn";
        button.textContent = label;

        if (icon) {
            button.classList.add("gl-table-panel__btn--" + icon);
        }

        if (onClick) {
            const events = GeoLeaf.Utils?.events;
            if (events) {
                GeoLeaf._TablePanel._eventCleanups.push(
                    events.on(button, "click", onClick, false, 'TablePanel.button')
                );
            } else {
                button.addEventListener("click", onClick);
            }
        }

        return button;
    }

    /**
     * Met à jour la position du bouton toggle en fonction de la hauteur du conteneur
     * @param {HTMLElement} container - Conteneur du tableau
     * @private
     */
    function updateToggleButtonPosition(container) {
        const button = document.querySelector(".gl-table-panel__toggle-btn");
        if (button && container.classList.contains("is-visible")) {
            const height = container.offsetHeight;
            button.style.bottom = height + "px";
        }
    }

    /**
     * Crée le bouton toggle pour masquer le tableau (intégré dans le toolbar)
     * @returns {HTMLElement}
     * @private
     */
    function createToggleButton() {
        const button = document.createElement("button");
        button.className = "gl-table-panel__toggle-btn";
        button.title = "Masquer le tableau";
        button.setAttribute("aria-label", "Masquer tableau");

        // Créer l'icône SVG (flèche vers le bas)
        const icon = document.createElement("span");
        icon.className = "gl-table-panel__toggle-btn__icon";
        // SAFE: SVG statique hardcodé, pas de données utilisateur
        const downSvg = GeoLeaf.DOMSecurity.createSVGIcon(16, 16, 'M6 9l6 6 6-6', {
            stroke: 'currentColor',
            strokeWidth: '6',
            fill: 'none'
        });
        icon.appendChild(downSvg);
        button.appendChild(icon);

        const clickHandler = () => {
            if (GeoLeaf.Table && typeof GeoLeaf.Table.toggle === "function") {
                GeoLeaf.Table.toggle();
            }
        };

        const events = GeoLeaf.Utils?.events;
        if (events) {
            GeoLeaf._TablePanel._eventCleanups.push(
                events.on(button, "click", clickHandler, false, 'TablePanel.toggleBtn')
            );
        } else {
            button.addEventListener("click", clickHandler);
        }

        return button;
        Log.debug("[TablePanel] Bouton toggle créé");
    }

    /**
     * Crée le bouton flottant pour afficher le tableau (visible quand tableau masqué)
     * @private
     */
    function createFloatingShowButton() {
        const button = document.createElement("button");
        button.className = "gl-table-panel__floating-show-btn";
        button.title = "Afficher le tableau";
        button.setAttribute("aria-label", "Afficher tableau");

        // Créer l'icône SVG (flèche vers le haut)
        const icon = document.createElement("span");
        icon.className = "gl-table-panel__toggle-btn__icon";
        // SAFE: SVG statique hardcodé, pas de données utilisateur
        const upSvg = GeoLeaf.DOMSecurity.createSVGIcon(16, 16, 'M18 15l-6-6-6 6', {
            stroke: 'currentColor',
            strokeWidth: '6',
            fill: 'none'
        });
        icon.appendChild(upSvg);
        button.appendChild(icon);

        const clickHandler = () => {
            if (GeoLeaf.Table && typeof GeoLeaf.Table.show === "function") {
                GeoLeaf.Table.show();
            }
        };

        const events = GeoLeaf.Utils?.events;
        if (events) {
            GeoLeaf._TablePanel._eventCleanups.push(
                events.on(button, "click", clickHandler, false, 'TablePanel.floatingShowBtn')
            );
        } else {
            button.addEventListener("click", clickHandler);
        }

        document.body.appendChild(button);
        Log.debug("[TablePanel] Bouton flottant créé");
    }

    /**
     * Met à jour l'état des boutons de la toolbar selon la sélection
     * @param {number} selectedCount - Nombre d'entités sélectionnées
     */
    GeoLeaf._TablePanel.updateToolbarButtons = function (selectedCount) {
        const hasSelection = selectedCount > 0;

        const zoomBtn = document.querySelector("[data-table-btn='zoom']");
        const highlightBtn = document.querySelector("[data-table-btn='highlight']");
        const exportBtn = document.querySelector("[data-table-btn='export']");

        if (zoomBtn) zoomBtn.disabled = !hasSelection;
        if (highlightBtn) {
            highlightBtn.disabled = !hasSelection;
            // Si plus aucune sélection, désactiver la surbrillance
            if (!hasSelection && highlightBtn.classList.contains("is-active")) {
                highlightBtn.classList.remove("is-active");
                if (GeoLeaf.Table && typeof GeoLeaf.Table.highlightSelection === "function") {
                    GeoLeaf.Table.highlightSelection(false);
                }
            }
        }
        if (exportBtn) exportBtn.disabled = !hasSelection;

        Log.debug("[TablePanel] Boutons mis à jour. Sélection:", selectedCount);
    };

    /**
     * Rafraîchit le sélecteur de couche (utile après chargement de nouvelles couches)
     */
    GeoLeaf._TablePanel.refreshLayerSelector = function () {
        const select = document.querySelector("[data-table-layer-select]");
        if (!select) return;

        // Sauvegarder la valeur actuelle
        const currentValue = select.value;

        // Vider les options (sauf la première)
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Re-peupler
        populateLayerSelector(select);

        // Vérifier si la valeur actuelle est toujours disponible
        const optionValues = Array.from(select.options).map(o => o.value);
        if (currentValue && optionValues.includes(currentValue)) {
            select.value = currentValue;
        } else if (currentValue && !optionValues.includes(currentValue)) {
            // La couche active a été retirée (masquée) — basculer sur la première disponible
            if (select.options.length > 1) {
                select.value = select.options[1].value;
                if (GeoLeaf.Table && typeof GeoLeaf.Table.setLayer === "function") {
                    GeoLeaf.Table.setLayer(select.options[1].value);
                }
            } else {
                // Aucune couche visible — vider le tableau
                select.value = "";
                if (GeoLeaf.Table && typeof GeoLeaf.Table.setLayer === "function") {
                    GeoLeaf.Table.setLayer("");
                }
            }
        }

        // Mettre à jour le placeholder si aucune couche visible
        const defaultOption = select.options[0];
        if (defaultOption) {
            defaultOption.textContent = select.options.length > 1
                ? "Sélectionner une couche..."
                : "Aucune couche visible";
        }

        Log.debug("[TablePanel] Sélecteur de couche rafraîchi,", (select.options.length - 1), "couches disponibles");
    };

    /**
     * Cleanup all event listeners
     */
    GeoLeaf._TablePanel.destroy = function() {
        if (GeoLeaf._TablePanel._eventCleanups && GeoLeaf._TablePanel._eventCleanups.length > 0) {
            GeoLeaf._TablePanel._eventCleanups.forEach(cleanup => {
                if (typeof cleanup === 'function') cleanup();
            });
            GeoLeaf._TablePanel._eventCleanups = [];
            Log.info('[TablePanel] Event listeners cleaned up');
        }
    };

})(typeof window !== "undefined" ? window : global);
