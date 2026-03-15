/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf Table - Panel Module
 * Building du bottom-sheet drawer pour the table
 */
"use strict";

import { Log } from "../log/index.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { LayerVisibilityManager } from "../shared/layer-visibility-state.js";
import { GeoJSONShared } from "../geojson/shared.js";
import { events as _events } from "../utils/event-listener-manager.js";
import { TableContract } from "../../contracts/table.contract.js";
import { getLabel } from "../i18n/i18n.js";

const _TablePanel: any = {};
_TablePanel._eventCleanups = [];

/**
 * Creates the container main du array (bottom-sheet)
 * @param {L.Map} map - Instance de the map Leaflet
 * @param {Object} config - Configuration du array
 * @returns {HTMLElement} Conteneur du array
 */
_TablePanel.create = function (map: any, config: any) {
    // Check si le conteneur existe already
    let container = document.querySelector(".gl-table-panel") as HTMLElement | null;
    if (container) {
        return container;
    }

    // Createsr le conteneur main
    container = document.createElement("div");
    container.className = "gl-table-panel";
    container.id = "gl-rp-pane-table"; // B1: aria-controls target for desktop panel table tab
    (container as HTMLElement).style.height = config.defaultHeight || "40%";

    // Addsr la bar de redimensionnement si resizable
    if (config.resizable) {
        const resizeHandle = createResizeHandle(container, config);
        container.appendChild(resizeHandle);
    }

    // Createsr la bar d'outils (header)
    const toolbar = createToolbar(map, config);
    container.appendChild(toolbar);

    // Createsr le wrapper du array avec scroll
    const tableWrapper = document.createElement("div");
    tableWrapper.className = "gl-table-panel__wrapper";
    container.appendChild(tableWrapper);

    // Createsr the table empty (sera rempli par le renderer)
    const table = document.createElement("table");
    table.className = "gl-table-panel__table";
    tableWrapper.appendChild(table);

    // Addsr au body
    document.body.appendChild(container);

    // Createsr le button flottant pour display the table (quand hidden)
    createFloatingShowButton();

    Log.info("[TablePanel] Panel created successfully");
    return container;
};

function _attachResizeEvents(handle: any, container: any, config: any): void {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;
    const events = _events;
    const mouseDownHandler = (e: any) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = container.offsetHeight;
        document.body.style.cursor = "ns-resize";
        document.body.style.userSelect = "none";
        e.preventDefault();
    };
    const mouseMoveHandler = (e: any) => {
        if (!isResizing) return;
        const delta = startY - e.clientY;
        let newHeight = startHeight + delta;
        const viewportHeight = window.innerHeight;
        const minHeightPx = parseHeight(config.minHeight || "20%", viewportHeight);
        const maxHeightPx = parseHeight(config.maxHeight || "80%", viewportHeight);
        newHeight = Math.max(minHeightPx, Math.min(maxHeightPx, newHeight));
        (container as HTMLElement).style.height = newHeight + "px";
    };
    const mouseUpHandler = () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        }
    };
    if (events) {
        _TablePanel._eventCleanups.push(
            events.on(handle, "mousedown", mouseDownHandler, false, "TablePanel.resizeMouseDown")
        );
        _TablePanel._eventCleanups.push(
            events.on(document, "mousemove", mouseMoveHandler, false, "TablePanel.resizeMouseMove")
        );
        _TablePanel._eventCleanups.push(
            events.on(document, "mouseup", mouseUpHandler, false, "TablePanel.resizeMouseUp")
        );
    } else {
        handle.addEventListener("mousedown", mouseDownHandler);
        document.addEventListener("mousemove", mouseMoveHandler);
        document.addEventListener("mouseup", mouseUpHandler);
    }
}

/**
 * Creates la bar de redimensionnement
 * @param {HTMLElement} container - Conteneur du array
 * @param {Object} config - Configuration
 * @returns {HTMLElement}
 * @private
 */
function createResizeHandle(container: any, config: any) {
    const handle = document.createElement("div");
    handle.className = "gl-table-panel__resize-handle";
    const resizeBar = document.createElement("div");
    resizeBar.className = "gl-table-panel__resize-bar";
    handle.appendChild(resizeBar);
    _attachResizeEvents(handle, container, config);
    return handle;
}

/**
 * Parse a value de height (%, px, vh) en pixels
 * @param {string} value - Value à parser ("40%", "300px", "50vh")
 * @param {number} referenceHeight - Height de reference for thes %
 * @returns {number} Height en pixels
 * @private
 */
function parseHeight(value: any, referenceHeight: any) {
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
    return 300; // Default
}

/**
 * Creates la bar d'outils du array
 * @param {L.Map} map - Instance de the map
 * @param {Object} config - Configuration
 * @returns {HTMLElement}
 * @private
 */
function createToolbar(map: any, config: any) {
    const toolbar = document.createElement("div");
    toolbar.className = "gl-table-panel__toolbar";

    // Selector de layer
    const layerSelect = createLayerSelector();
    toolbar.appendChild(layerSelect);

    // Champ de recherche
    const searchInput = createSearchInput();
    toolbar.appendChild(searchInput);

    // Button Zoom sur the selection
    const zoomButton = createButton("Zoom sur selection", "zoom", () => {
        TableContract.zoomToSelection();
    });
    zoomButton.disabled = true;
    zoomButton.setAttribute("data-table-btn", "zoom");
    toolbar.appendChild(zoomButton);

    // Button Surbrillance
    const highlightButton = createButton("Surbrillance", "highlight", () => {
        const isActive = highlightButton.classList.toggle("is-active");
        TableContract.highlightSelection(isActive);
    });
    highlightButton.disabled = true;
    highlightButton.setAttribute("data-table-btn", "highlight");
    toolbar.appendChild(highlightButton);

    // Button Export (si activated)
    if (config.enableExportButton) {
        const exportButton = createButton("Exporter", "export", () => {
            TableContract.exportSelection();
        });
        exportButton.disabled = true;
        exportButton.setAttribute("data-table-btn", "export");
        toolbar.appendChild(exportButton);
    }

    // Spacer pour pousser le button toggle à droite
    const spacer = document.createElement("div");
    spacer.style.flex = "1";
    toolbar.appendChild(spacer);

    // Button toggle (hide/display the table)
    const toggleBtn = createToggleButton();
    toolbar.appendChild(toggleBtn);

    return toolbar;
}

/**
 * Creates the selector de layer
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

    // Option by default
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = getLabel("ui.table.layer_placeholder");
    select.appendChild(defaultOption);

    // Population deferrede : les GeoJSON layers ne sont pas encore availables to the creation du panel.
    // refreshLayerSelector() est called via l'event geoleaf:geojson:layers-loaded une fois
    // async loading completed.

    // Event de changement - avec cleanup tracking
    const changeHandler = (e: any) => {
        const layerId = (e.target as HTMLSelectElement)?.value ?? "";
        TableContract.setLayer(layerId);
    };

    const events = _events;
    if (events) {
        _TablePanel._eventCleanups.push(
            events.on(select, "change", changeHandler, false, "TablePanel.layerSelect")
        );
    } else {
        select.addEventListener("change", changeHandler);
    }

    wrapper.appendChild(select);
    return wrapper;
}

function _isLayerVisible(layerId: string, layerData: any, VisibilityManager: any): boolean {
    if (VisibilityManager && typeof VisibilityManager.getVisibilityState === "function") {
        const visState = VisibilityManager.getVisibilityState(layerId);
        return visState?.current === true;
    }
    if (layerData._visibility) return layerData._visibility.current === true;
    return true;
}

function _isTableLayer(layerData: any): boolean {
    return !!layerData?.config?.table?.enabled;
}

/**
 * Peuple le selector avec the layers availables
 * @param {HTMLSelectElement} select - Element select
 * @private
 */
function populateLayerSelector(select: HTMLSelectElement) {
    const allLayersMap = GeoJSONShared.getLayers();
    if (!allLayersMap || allLayersMap.size === 0) {
        Log.warn("[TablePanel] Module GeoJSON non disponible ou aucune layer");
        return;
    }

    const VisibilityManager = LayerVisibilityManager;

    // Check les options existings pour avoid les doublons
    const existingValues = new Set<string>();
    for (let i = 1; i < select.options.length; i++) {
        existingValues.add(select.options[i].value);
    }

    let addedCount = 0;
    allLayersMap.forEach((layerData: any, layerId: string) => {
        if (!_isTableLayer(layerData)) return;
        if (!_isLayerVisible(layerId, layerData, VisibilityManager)) return;
        if (existingValues.has(layerId)) return;

        const option = document.createElement("option");
        option.value = layerId;
        option.textContent = layerData.label || layerData.config?.title || layerId;
        select.appendChild(option);
        addedCount++;
    });

    if (addedCount > 0) {
        Log.info("[TablePanel] Layer selector populated:", addedCount, "layers added");
    }
}

/**
 * Creates the field de recherche
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
    input.placeholder = getLabel("placeholder.search.input");
    input.className = "gl-table-panel__search-input";
    input.setAttribute("data-table-search", "");

    // Debounce la recherche pour avoid les appels trop frequent
    let timeout: ReturnType<typeof setTimeout> | undefined;
    input.addEventListener("input", (e: any) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const searchText = ((e.target as HTMLInputElement)?.value ?? "").trim().toLowerCase();
            filterTableRows(searchText);
        }, 300);
    });

    wrapper.appendChild(input);
    return wrapper;
}

/**
 * Filtre les lines du tableat the bottomed on the text de recherche
 * @param {string} searchText - Text à rechercher
 * @private
 */
function filterTableRows(searchText: any) {
    const table = document.querySelector(".gl-table-panel__table tbody");
    if (!table) return;

    const rows = table.querySelectorAll("tr");
    rows.forEach((row: Element) => {
        const rowEl = row as HTMLElement;
        if (!searchText) {
            rowEl.style.display = "";
            return;
        }

        const cells = row.querySelectorAll("td");
        let match = false;

        cells.forEach((cell: Element) => {
            const text = (cell.textContent ?? "").toLowerCase();
            if (text.includes(searchText)) {
                match = true;
            }
        });

        rowEl.style.display = match ? "" : "none";
    });
}

/**
 * Creates a button generic
 * @param {string} label - Label du button
 * @param {string} icon - Classe d'icon (optional)
 * @param {Function} onClickk - Callback au click
 * @returns {HTMLElement}
 * @private
 */
function createButton(label: any, icon: any, onClick: any) {
    const button = document.createElement("button");
    button.className = "gl-table-panel__btn";
    button.textContent = label;

    if (icon) {
        button.classList.add("gl-table-panel__btn--" + icon);
    }

    if (onClick) {
        if (_events) {
            _TablePanel._eventCleanups.push(
                _events.on(button, "click", onClick, false, "TablePanel.button")
            );
        } else {
            button.addEventListener("click", onClick);
        }
    }

    return button;
}

function _resetPanelStyles(tp: HTMLElement): void {
    tp.setAttribute("data-gl-open", "false");
    tp.classList.remove("is-visible");
    tp.style.removeProperty("position");
    tp.style.removeProperty("top");
    tp.style.removeProperty("bottom");
    tp.style.removeProperty("right");
    tp.style.removeProperty("left");
    tp.style.removeProperty("width");
    tp.style.removeProperty("height");
    tp.style.removeProperty("transform");
    tp.style.removeProperty("display");
    tp.style.removeProperty("visibility");
    tp.style.removeProperty("opacity");
    tp.style.removeProperty("z-index");
    /* Disable desktop tab */
    const desktopPanel = document.getElementById("gl-right-panel");
    if (desktopPanel) {
        desktopPanel
            .querySelector<HTMLElement>("[data-gl-rp-tab='table']")
            ?.classList.remove("is-active");
        desktopPanel
            .querySelector<HTMLElement>("[data-gl-rp-tab='table']")
            ?.setAttribute("aria-selected", "false");
    }
}

/**
 * Creates the button toggle pour hide the table (integrated in the toolbar)
 * @returns {HTMLElement}
 * @private
 */
function createToggleButton() {
    const button = document.createElement("button");
    button.className = "gl-table-panel__toggle-btn";
    button.title = getLabel("aria.table.hide");
    button.setAttribute("aria-label", getLabel("aria.table.hide"));
    const icon = document.createElement("span");
    icon.className = "gl-table-panel__toggle-btn__icon";
    // SAFE: SVG static hardcoded, pas de data user
    const rightSvg = DOMSecurity.createSVGIcon(16, 16, "M9 6l6 6-6 6", {
        stroke: "currentColor",
        strokeWidth: "6",
        fill: "none",
    });
    icon.appendChild(rightSvg);
    button.appendChild(icon);
    const clickHandler = () => {
        const tp = document.querySelector<HTMLElement>(".gl-table-panel");
        if (tp && tp.getAttribute("data-gl-open") === "true") {
            _resetPanelStyles(tp);
        }
        TableContract.toggle();
    };
    const events = _events;
    if (events) {
        _TablePanel._eventCleanups.push(
            events.on(button, "click", clickHandler, false, "TablePanel.toggleBtn")
        );
    } else {
        button.addEventListener("click", clickHandler);
    }
    return button;
}

/**
 * Creates the button flottant pour display the table (visible quand array hidden)
 * @private
 */
function createFloatingShowButton() {
    const button = document.createElement("button");
    button.className = "gl-table-panel__floating-show-btn";
    button.title = getLabel("aria.table.show");
    button.setAttribute("aria-label", getLabel("aria.table.show"));

    // Createsr l'icon SVG (arrow to the haut)
    const icon = document.createElement("span");
    icon.className = "gl-table-panel__toggle-btn__icon";
    // SAFE: SVG static hardcoded, pas de data user
    const upSvg = DOMSecurity.createSVGIcon(16, 16, "M18 15l-6-6-6 6", {
        stroke: "currentColor",
        strokeWidth: "6",
        fill: "none",
    });
    icon.appendChild(upSvg);
    button.appendChild(icon);

    const clickHandler = () => {
        TableContract.show();
    };

    const events = _events;
    if (events) {
        _TablePanel._eventCleanups.push(
            events.on(button, "click", clickHandler, false, "TablePanel.floatingShowBtn")
        );
    } else {
        button.addEventListener("click", clickHandler);
    }

    document.body.appendChild(button);
}

/**
 * Met à jour the state des buttons de la toolbar selon the selection
 * @param {number} selectedCount - Nombre d'entities selected
 */
_TablePanel.updateToolbarButtons = function (selectedCount: any) {
    const hasSelection = selectedCount > 0;

    const zoomBtn = document.querySelector("[data-table-btn='zoom']") as HTMLButtonElement | null;
    const highlightBtn = document.querySelector(
        "[data-table-btn='highlight']"
    ) as HTMLButtonElement | null;
    const exportBtn = document.querySelector(
        "[data-table-btn='export']"
    ) as HTMLButtonElement | null;

    if (zoomBtn) zoomBtn.disabled = !hasSelection;
    if (highlightBtn) {
        highlightBtn.disabled = !hasSelection;
        // Si plus aucune selection, disable la surbrillance
        if (!hasSelection && highlightBtn.classList.contains("is-active")) {
            highlightBtn.classList.remove("is-active");
            TableContract.highlightSelection(false);
        }
    }
    if (exportBtn) exportBtn.disabled = !hasSelection;
};

/**
 * Refreshes le selector de layer (utile after loading de nouvelthe layers)
 */
_TablePanel.refreshLayerSelector = function () {
    const select = document.querySelector("[data-table-layer-select]") as HTMLSelectElement | null;
    if (!select) return;

    // Sauvegarder the value currentle
    const currentValue = select.value;

    // Empty options (except the first)
    while (select.options.length > 1) {
        select.options[1].remove();
    }

    // Re-peupler
    populateLayerSelector(select);

    // Check si the value currentle est always available
    const optionValues = Array.from(select.options).map((o: HTMLOptionElement) => o.value);
    if (currentValue && optionValues.includes(currentValue)) {
        select.value = currentValue;
    } else if (currentValue && !optionValues.includes(currentValue)) {
        // The active layer has been removed (hidden): switch to the first available
        if (select.options.length > 1) {
            select.value = select.options[1].value;
            TableContract.setLayer(select.options[1].value);
        } else {
            // Auca layer visible : emptyr the table
            select.value = "";
            TableContract.setLayer("");
        }
    }

    // Mettre up to date le placeholder si auca layer visible
    const defaultOption = select.options[0];
    if (defaultOption) {
        defaultOption.textContent =
            select.options.length > 1 ? "Select a layer..." : "No visible layer";
    }

    Log.info(
        "[TablePanel] Layer selector refreshed,",
        select.options.length - 1,
        "layers disponibles"
    );
};

/**
 * Cleanup all event listners
 */
_TablePanel.destroy = function () {
    if (_TablePanel._eventCleanups && _TablePanel._eventCleanups.length > 0) {
        _TablePanel._eventCleanups.forEach((cleanup: any) => {
            if (typeof cleanup === "function") cleanup();
        });
        _TablePanel._eventCleanups = [];
        Log.info("[TablePanel] Event listeners cleaned up");
    }
};

const TablePanel = _TablePanel;
export { TablePanel };
