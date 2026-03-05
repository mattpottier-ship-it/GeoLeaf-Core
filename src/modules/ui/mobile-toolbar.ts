/**
 * GeoLeaf UI – Barre pill d'utilitaires mobile + composant sheet (Phase 2 Mobile Friendly)
 * Création du DOM, gestion ouvert/fermé, état actif filtre + réinitialiser.
 *
 * @module ui/mobile-toolbar
 */

import { DOMSecurity } from "../utils/dom-security.js";
import { Config } from "../config/geoleaf-config/config-core.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

export interface MobileToolbarOptions {
    glMain: HTMLElement;
    map?: {
        zoomIn: () => void;
        zoomOut: () => void;
        getContainer: () => HTMLElement;
        getZoom: () => number;
    } | null;
    getFilterActiveState?: () => boolean;
    onResetFilters?: () => void;
    sheetTitles?: Record<string, string>;
}

let _overlay: HTMLElement | null = null;
let _toolbar: HTMLElement | null = null;
let _filterGroup: HTMLElement | null = null;
let _filterBtn: HTMLElement | null = null;
let _resetBtn: HTMLElement | null = null;
let _scrollEl: HTMLElement | null = null;
let _navUp: HTMLElement | null = null;
let _navDown: HTMLElement | null = null;
let _panelTitle: HTMLElement | null = null;
let _panelBody: HTMLElement | null = null;
let _activeSheetId: string | null = null;
let _options: MobileToolbarOptions | null = null;
let _filterCheckInterval: number | null = null;
let _proximityActive = false;
/* Bandeau de configuration proximité */
let _proximityBar: HTMLElement | null = null;
let _proximitySlider: HTMLInputElement | null = null;
let _proximityValidateBtn: HTMLButtonElement | null = null;
let _proximityInstruction: HTMLElement | null = null;
let _proximityRadiusLabel: HTMLElement | null = null;
/* Barre de recherche textuelle (inline, en haut de la carte) */
let _searchBar: HTMLElement | null = null;
let _searchInput: HTMLInputElement | null = null;
/* Tooltip flottant — div dans glMain, hors de la pill (overflow:hidden) */
let _tooltipEl: HTMLElement | null = null;

/** Phase 3 : éléments déplacés dans le sheet à restaurer à la fermeture */
interface RestoreEntry {
    parent: HTMLElement;
    node: HTMLElement;
    nextSibling: Node | null;
}
let _restoreOnClose: RestoreEntry[] = [];
let _lastFocusedElement: HTMLElement | null = null;

const DEFAULT_SHEET_TITLES: Record<string, string> = {
    zoom: "Zoom",
    geoloc: "Ma position",
    search: "Recherche",
    proximity: "Proximité",
    filters: "Filtres",
    themes: "Thèmes (principales et secondaire)",
    legend: "Légende",
    layers: "Couches",
    table: "Tableau",
};

/**
 * Met à jour la visibilité des flèches de navigation selon le scroll courant.
 * Les flèches n'apparaissent que si le contenu dépasse la zone visible.
 */
function updateNavVisibility(): void {
    if (!_scrollEl || !_navUp || !_navDown) return;
    const { scrollTop, scrollHeight, clientHeight } = _scrollEl;
    const hasOverflow = scrollHeight > clientHeight + 2; /* +2 pour éviter le flicker pixel */
    const canScrollUp = scrollTop > 2;
    const canScrollDown = scrollTop + clientHeight < scrollHeight - 2;

    _navUp.classList.toggle("is-visible", hasOverflow && canScrollUp);
    _navDown.classList.toggle("is-visible", hasOverflow && canScrollDown);
}

function createSvgIcon(pathData: string, size = 22): SVGElement {
    const opts = { stroke: "currentColor", strokeWidth: "2", fill: "none" as const };
    return DOMSecurity.createSVGIcon(size, size, pathData, opts);
}

/** Crée la pill de configuration de la proximité (style barre de recherche) et la stocke dans les vars module. */
function createProximityBarDom(): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "gl-proximity-bar";
    bar.style.display = "none";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Configuration de la recherche par proximité");

    /* Texte de statut court */
    const instruction = document.createElement("span");
    instruction.className = "gl-proximity-bar__instruction";
    instruction.textContent = "Toucher la carte";
    _proximityInstruction = instruction;
    bar.appendChild(instruction);

    /* Slider de rayon (flex:1) — valeurs issues du profil actif */
    let _minRadius = 1,
        _maxRadius = 50,
        _stepRadius = 1,
        _defaultRadius = 10;
    try {
        const activeProfile = (Config as any)?.getActiveProfile?.();
        if (activeProfile) {
            const searchConfig =
                (activeProfile.panels && activeProfile.panels.search) || activeProfile.search;
            if (searchConfig) {
                if (typeof searchConfig.radiusMin === "number" && searchConfig.radiusMin > 0)
                    _minRadius = searchConfig.radiusMin;
                if (typeof searchConfig.radiusMax === "number" && searchConfig.radiusMax > 0)
                    _maxRadius = searchConfig.radiusMax;
                if (typeof searchConfig.radiusStep === "number" && searchConfig.radiusStep > 0)
                    _stepRadius = searchConfig.radiusStep;
                if (
                    typeof searchConfig.radiusDefault === "number" &&
                    searchConfig.radiusDefault > 0
                )
                    _defaultRadius = searchConfig.radiusDefault;
                _defaultRadius = Math.max(_minRadius, Math.min(_defaultRadius, _maxRadius));
            }
        }
    } catch (_e) {
        /* fallback silencieux */
    }

    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "gl-proximity-bar__slider";
    slider.min = String(_minRadius);
    slider.max = String(_maxRadius);
    slider.step = String(_stepRadius);
    slider.defaultValue = String(_defaultRadius);
    slider.setAttribute("aria-label", "Rayon de recherche en kilomètres");
    _proximitySlider = slider;
    bar.appendChild(slider);

    /* Label km compact */
    const radiusLabel = document.createElement("span");
    radiusLabel.className = "gl-proximity-bar__radius-label";
    radiusLabel.textContent = `${_defaultRadius} km`;
    _proximityRadiusLabel = radiusLabel;
    bar.appendChild(radiusLabel);

    /* Bouton valider — flèche comme la barre de recherche */
    const validateBtn = document.createElement("button");
    validateBtn.type = "button";
    validateBtn.className = "gl-proximity-bar__validate";
    validateBtn.setAttribute("aria-label", "Valider la recherche par proximité");
    validateBtn.disabled = true;
    validateBtn.appendChild(createSvgIcon("M9 10l-4 4 4 4M5 14h8a4 4 0 000-8H9", 20));
    validateBtn.addEventListener("click", () => closeProximityBar(false));
    _proximityValidateBtn = validateBtn;
    bar.appendChild(validateBtn);

    /* Bouton annuler — croix discrète */
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "gl-proximity-bar__cancel";
    cancelBtn.setAttribute("aria-label", "Annuler la recherche par proximité");
    cancelBtn.appendChild(createSvgIcon("M18 6L6 18M6 6l12 12", 18));
    cancelBtn.addEventListener("click", () => closeProximityBar(true));
    bar.appendChild(cancelBtn);

    /* Slider — mise à jour du label + cercle en temps réel */
    slider.addEventListener("input", () => {
        const km = parseInt(slider.value, 10);
        if (_proximityRadiusLabel) _proximityRadiusLabel.textContent = `${km} km`;
        const prox = (_g.GeoLeaf as any)?._UIFilterPanelProximity;
        if (prox?.setProximityRadius) prox.setProximityRadius(km);
    });

    _proximityBar = bar;
    return bar;
}

/** Affiche la pill proximité (animation fade+scale comme la barre de recherche). */
function openProximityBar(): void {
    if (!_proximityBar) return;
    if (_proximityValidateBtn) _proximityValidateBtn.disabled = true;
    if (_proximityInstruction) {
        _proximityInstruction.textContent = "Toucher la carte";
        _proximityInstruction.classList.remove("point-placed");
    }
    if (_proximitySlider) _proximitySlider.value = _proximitySlider.defaultValue;
    if (_proximityRadiusLabel)
        _proximityRadiusLabel.textContent = `${_proximitySlider?.defaultValue ?? 10} km`;

    _proximityBar.style.display = "flex";
    /* décaler d’une frame pour que la transition CSS se déclenche */
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (_proximityBar) _proximityBar.classList.add("is-visible");
            /* Décaler les barres de thèmes vers le bas via variable CSS */
            const glMain = _options?.glMain;
            if (glMain) {
                glMain.style.setProperty("--gl-proximity-bar-height", "46px");
                glMain.style.setProperty("--gl-proximity-bar-gap", "0.4rem");
            }
        });
    });
}

/**
 * Ferme la pill proximité.
 * @param cancel true = annuler (désactive le mode), false = valider (garde le mode actif).
 */
function closeProximityBar(cancel: boolean): void {
    if (!_proximityBar) return;
    _proximityBar.classList.remove("is-visible");
    /* Remonter les barres de thèmes */
    const glMain = _options?.glMain;
    if (glMain) {
        glMain.style.removeProperty("--gl-proximity-bar-height");
        glMain.style.removeProperty("--gl-proximity-bar-gap");
    }
    /* Retire du DOM après la transition */
    _proximityBar.addEventListener(
        "transitionend",
        () => {
            if (_proximityBar && !_proximityBar.classList.contains("is-visible")) {
                _proximityBar.style.display = "";
            }
        },
        { once: true }
    );

    if (cancel) {
        /* Désactiver complètement la proximité */
        const prox = (_g.GeoLeaf as any)?._UIFilterPanelProximity;
        const map = _options?.map as any;
        if (prox?.toggleProximityToolbar && map && _proximityActive) {
            prox.toggleProximityToolbar(map, 10);
        }
        _proximityActive = false;
        /* Retirer l'état actif de l'icône */
        const proximityBtn = _toolbar?.querySelector('[data-gl-sheet="proximity"]');
        if (proximityBtn instanceof HTMLElement)
            proximityBtn.classList.remove("gl-map-toolbar__btn--active");
        /* Réappliquer les filtres sans proximité pour restaurer l'affichage */
        const filterPanelCancel = document.querySelector<HTMLElement>("#gl-filter-panel");
        const applierCancel = (_g.GeoLeaf as any)?._UIFilterPanelApplier;
        if (applierCancel && typeof applierCancel.applyFiltersNow === "function") {
            applierCancel.applyFiltersNow(filterPanelCancel);
        }
        refreshFilterButtonState();
    } else {
        /* Valider : le cercle reste — appliquer tous les filtres cumulés (texte + catégorie + tag + proximité) */
        const filterPanel = document.querySelector<HTMLElement>("#gl-filter-panel");
        const applier = (_g.GeoLeaf as any)?._UIFilterPanelApplier;
        if (applier && typeof applier.applyFiltersNow === "function") {
            applier.applyFiltersNow(filterPanel);
        }
        refreshFilterButtonState();
    }
}

function createToolbarDom(): HTMLElement {
    /* Wrapper de positionnement — contient le bouton nav haut, la pill, le bouton nav bas */
    const wrapper = document.createElement("div");
    wrapper.className = "gl-map-toolbar-wrapper";

    /* Bouton nav haut — rond, externe à la pill */
    const navUp = document.createElement("button");
    navUp.type = "button";
    navUp.className = "gl-map-toolbar__nav";
    navUp.setAttribute("aria-label", "Défiler vers le haut");
    navUp.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>';
    wrapper.appendChild(navUp);
    _navUp = navUp;

    /* La pill d'icônes */
    const toolbar = document.createElement("div");
    toolbar.className = "gl-map-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Outils carte");
    _toolbar = toolbar;

    const scroll = document.createElement("div");
    scroll.className = "gl-map-toolbar__scroll";
    _scrollEl = scroll;

    const filterGroup = document.createElement("div");
    filterGroup.className = "gl-map-toolbar__group";
    _filterGroup = filterGroup;

    const filterBtn = document.createElement("button");
    filterBtn.type = "button";
    filterBtn.className = "gl-map-toolbar__btn";
    filterBtn.setAttribute("data-gl-sheet", "filters");
    filterBtn.setAttribute("data-gl-toolbar-action", "filters");
    filterBtn.setAttribute("aria-label", "Filtres");
    filterBtn.setAttribute("aria-expanded", "false");
    /* Icône entonnoir */
    filterBtn.appendChild(createSvgIcon("M4 4h16v2.5l-6 6v6l-4 2v-8l-6-6V4z"));
    _filterBtn = filterBtn;

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "gl-map-toolbar__reset";
    resetBtn.setAttribute("aria-label", "Réinitialiser tous les filtres");
    resetBtn.setAttribute("data-gl-toolbar-action", "reset-filters");
    resetBtn.appendChild(createSvgIcon("M4 6h16M4 12h16M4 18h16M3 3l18 18", 18));
    _resetBtn = resetBtn;

    filterGroup.appendChild(filterBtn);
    filterGroup.appendChild(resetBtn);

    /* Ajouter tooltip sur le bouton filtre */
    filterBtn.setAttribute("data-tooltip", "Filtres avancés");

    const items: Array<{
        id: string;
        label: string;
        path: string;
        action?: string;
        tooltip: string;
    }> = [
        {
            id: "",
            label: "Plein écran",
            tooltip: "Plein écran",
            path: "M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6",
            action: "fullscreen",
        },
        {
            id: "",
            label: "Zoom avant",
            tooltip: "Zoom avant",
            path: "M12 5v14M5 12h14",
            action: "zoom-in",
        },
        {
            id: "",
            label: "Zoom arrière",
            tooltip: "Zoom arrière",
            path: "M5 12h14",
            action: "zoom-out",
        },
        {
            id: "geoloc",
            label: "Ma position",
            tooltip: "Ma position",
            path: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 7a3 3 0 100 6 3 3 0 000-6z",
        },
        {
            id: "",
            label: "Recherche",
            tooltip: "Recherche textuelle",
            path: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
            action: "search",
        },
        {
            id: "proximity",
            label: "Proximité",
            tooltip: "Recherche par proximité",
            /* Icône radar / cibles concentriques : distingue la proximité des couches */
            path: "M12 2v2M12 20v2M2 12h2M20 12h2M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0",
        },
        {
            id: "",
            label: "Thèmes",
            tooltip: "Thèmes / options thèmes secondaires",
            path: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
            action: "themes",
        },
        {
            id: "legend",
            label: "Légende",
            tooltip: "Légende de la carte",
            path: "M4 6h16M4 10h10M4 14h8M4 18h6",
        },
        {
            id: "layers",
            label: "Couches",
            tooltip: "Gestionnaire de couches",
            path: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
        },
        {
            id: "table",
            label: "Tableau de données",
            tooltip: "Tableau de données",
            path: "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
        },
    ];

    items.forEach((b, index) => {
        if (index === 6) {
            // Filtre avancé inséré après Proximité (index 5), avant Thèmes (index 6)
            scroll.appendChild(filterGroup);
        }
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gl-map-toolbar__btn";
        if (b.id) btn.setAttribute("data-gl-sheet", b.id);
        btn.setAttribute("aria-label", b.label);
        btn.setAttribute("data-tooltip", b.tooltip);
        if (b.action) btn.setAttribute("data-gl-toolbar-action", b.action);
        /* aria-expanded : boutons ouvrant un sheet ou un panel basculant */
        if ((b.id && !["geoloc", "proximity"].includes(b.id)) || b.action === "themes") {
            btn.setAttribute("aria-expanded", "false");
        }
        btn.appendChild(createSvgIcon(b.path));
        scroll.appendChild(btn);
    });
    toolbar.appendChild(scroll);
    wrapper.appendChild(toolbar);

    /* Bouton nav bas — rond, externe à la pill */
    const navDown = document.createElement("button");
    navDown.type = "button";
    navDown.className = "gl-map-toolbar__nav";
    navDown.setAttribute("aria-label", "Défiler vers le bas");
    navDown.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    wrapper.appendChild(navDown);
    _navDown = navDown;

    /* Scroll continu tant que le bouton est maintenu enfoncé */
    function startContinuousScroll(direction: 1 | -1): () => void {
        let rafId: number | null = null;
        let speed = 1.5; /* px par frame au départ */
        const MAX_SPEED = 8;
        const ACCEL = 0.15;

        function step(): void {
            if (_scrollEl) {
                _scrollEl.scrollTop += direction * speed;
                speed = Math.min(speed + ACCEL, MAX_SPEED);
            }
            rafId = requestAnimationFrame(step);
        }

        rafId = requestAnimationFrame(step);
        return (): void => {
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }

    function attachNavScroll(btn: HTMLButtonElement, direction: 1 | -1): void {
        let stop: (() => void) | null = null;

        const onDown = (e: Event): void => {
            e.preventDefault();
            stop = startContinuousScroll(direction);
        };
        const onUp = (): void => {
            if (stop) {
                stop();
                stop = null;
            }
        };

        btn.addEventListener("pointerdown", onDown);
        btn.addEventListener("pointerup", onUp);
        btn.addEventListener("pointercancel", onUp);
        btn.addEventListener("pointerleave", onUp);
    }

    attachNavScroll(navUp, -1);
    attachNavScroll(navDown, 1);

    /* Mise à jour des flèches à chaque scroll */
    scroll.addEventListener("scroll", updateNavVisibility, { passive: true });

    /* Observer les changements de taille (orientation, redimensionnement) */
    if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => updateNavVisibility());
        ro.observe(scroll);
    }

    return wrapper; /* Le wrapper positionné — _toolbar est la pill intérieure */
}

/** Efface la recherche textuelle et réinitialise l'icône. */
function clearSearchText(): void {
    if (!_searchInput) return;
    _searchInput.value = "";

    /* Sync panneau filtre + appliquer */
    const filterPanel = document.querySelector<HTMLElement>("#gl-filter-panel");
    if (filterPanel) {
        const existing = filterPanel.querySelector<HTMLInputElement>(
            "[data-gl-filter-id='searchText'] input[type='text']"
        );
        if (existing) existing.value = "";
        const applier = (_g as any).GeoLeaf?._UIFilterPanelApplier;
        if (applier && typeof applier.applyFiltersNow === "function") {
            applier.applyFiltersNow(filterPanel);
        }
    }

    /* Masquer le bouton clear, retirer l'état actif */
    const clearBtn = _searchBar?.querySelector<HTMLElement>(".gl-search-bar__clear");
    if (clearBtn) clearBtn.style.display = "none";

    const searchBtn = _toolbar?.querySelector('[data-gl-toolbar-action="search"]');
    if (searchBtn instanceof HTMLElement) {
        searchBtn.classList.remove(
            "gl-map-toolbar__btn--active",
            "gl-map-toolbar__btn--active-muted"
        );
        searchBtn.setAttribute("aria-expanded", "true"); /* barre est ouverte */
    }
}

/** Soumet la recherche textuelle vers le filtre existant dans le panneau. */
function submitSearch(): void {
    if (!_searchInput) return;
    const value = _searchInput.value.trim();

    /* Synchroniser la valeur dans l'input caché du panneau filtre */
    const filterPanel = document.querySelector<HTMLElement>("#gl-filter-panel");
    if (filterPanel) {
        /* Sélecteur conforme à renderer.ts : [data-gl-filter-id='searchText'] input[type='text'] */
        const existingSearchInput = filterPanel.querySelector<HTMLInputElement>(
            "[data-gl-filter-id='searchText'] input[type='text']"
        );
        if (existingSearchInput) {
            existingSearchInput.value = value;
        }

        /* Déclencher l'application des filtres via l'API globale ou le bouton Appliquer */
        const applier = (_g as any).GeoLeaf?._UIFilterPanelApplier;
        if (applier && typeof applier.applyFiltersNow === "function") {
            applier.applyFiltersNow(filterPanel);
        } else {
            /* Fallback : cliquer sur le bouton "Appliquer" pour déclencher containerClickHandler */
            const applyBtn = filterPanel.querySelector<HTMLElement>(".gl-filter-panel__btn-apply");
            if (applyBtn) applyBtn.click();
        }
    }

    /* Afficher / masquer le bouton clear selon le contenu soumis */
    const clearBtnSubmit = _searchBar?.querySelector<HTMLElement>(".gl-search-bar__clear");
    if (clearBtnSubmit) clearBtnSubmit.style.display = value.length > 0 ? "flex" : "none";

    /* Mettre à jour l'état visuel du bouton recherche */
    const searchBtn = _toolbar?.querySelector('[data-gl-toolbar-action="search"]');
    if (searchBtn instanceof HTMLElement) {
        const hasValue = value.length > 0;
        searchBtn.classList.toggle("gl-map-toolbar__btn--active", hasValue);
        searchBtn.setAttribute("aria-expanded", hasValue ? "true" : "false");
    }
}

/** Ouvre la barre de recherche inline avec animation. */
function openSearchBar(): void {
    if (!_searchBar) return;
    _searchBar.style.display = "flex";
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (_searchBar) _searchBar.classList.add("is-visible");
            _searchInput?.focus();
            /* Décaler les barres de thèmes vers le bas via variable CSS */
            const glMain = _options?.glMain;
            if (glMain) {
                glMain.style.setProperty("--gl-search-bar-height", "46px");
                glMain.style.setProperty("--gl-search-bar-gap", "0.4rem");
            }
        });
    });
    const searchBtn = _toolbar?.querySelector('[data-gl-toolbar-action="search"]');
    if (searchBtn instanceof HTMLElement) {
        searchBtn.setAttribute("aria-expanded", "true");
        /* La barre est ouverte — promouvoir vers active plein s'il y avait active-muted */
        searchBtn.classList.remove("gl-map-toolbar__btn--active-muted");
        if ((_searchInput?.value.trim().length ?? 0) > 0) {
            searchBtn.classList.add("gl-map-toolbar__btn--active");
        }
    }

    /* Sync visibilité du bouton clear selon la valeur courante */
    const clearBtn = _searchBar?.querySelector<HTMLElement>(".gl-search-bar__clear");
    if (clearBtn) {
        clearBtn.style.display = (_searchInput?.value.trim().length ?? 0) > 0 ? "flex" : "none";
    }
}

/** Ferme la barre de recherche et réinitialise le filtre texte si vide. */
function closeSearchBar(): void {
    if (!_searchBar) return;
    _searchBar.classList.remove("is-visible");
    /* Remonter les barres de thèmes */
    const glMain = _options?.glMain;
    if (glMain) {
        glMain.style.removeProperty("--gl-search-bar-height");
        glMain.style.removeProperty("--gl-search-bar-gap");
    }
    const searchBtn = _toolbar?.querySelector('[data-gl-toolbar-action="search"]');
    if (searchBtn instanceof HTMLElement) {
        searchBtn.setAttribute("aria-expanded", "false");
        /* Si une recherche textuelle est active, conserver un état actif atténué */
        const hasValue = (_searchInput?.value.trim().length ?? 0) > 0;
        searchBtn.classList.toggle("gl-map-toolbar__btn--active-muted", hasValue);
        searchBtn.classList.toggle("gl-map-toolbar__btn--active", false);
    }
    _searchBar.addEventListener(
        "transitionend",
        () => {
            if (_searchBar && !_searchBar.classList.contains("is-visible")) {
                _searchBar.style.display = "none";
            }
        },
        { once: true }
    );
}

/** Crée le DOM de la barre de recherche inline (pill en haut de la carte). */
function createSearchBarDom(): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "gl-search-bar";
    bar.style.display = "none";
    bar.setAttribute("role", "search");
    bar.setAttribute("aria-label", "Recherche textuelle");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "gl-search-bar__input";
    input.placeholder = "Rechercher...";
    input.setAttribute("aria-label", "Texte de recherche");
    _searchInput = input;

    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "gl-search-bar__submit";
    submitBtn.setAttribute("aria-label", "Valider la recherche");
    /* Icône entrée (flèche retour chariot) */
    submitBtn.appendChild(createSvgIcon("M9 10l-4 4 4 4M5 14h8a4 4 0 000-8H9", 20));

    /* Bouton effacer — croix, visible uniquement si l'input a du contenu */
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "gl-search-bar__clear";
    clearBtn.setAttribute("aria-label", "Effacer la recherche");
    clearBtn.style.display = "none";
    clearBtn.appendChild(createSvgIcon("M18 6L6 18M6 6l12 12", 18));
    clearBtn.addEventListener("click", () => clearSearchText());

    bar.appendChild(input);
    bar.appendChild(clearBtn);
    bar.appendChild(submitBtn);

    /* Afficher/masquer le bouton clear selon la présence de contenu */
    input.addEventListener("input", () => {
        clearBtn.style.display = input.value.length > 0 ? "flex" : "none";
    });

    submitBtn.addEventListener("click", () => submitSearch());
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            submitSearch();
        } else if (e.key === "Escape") {
            if (input.value.trim().length > 0) {
                clearSearchText();
            } else {
                closeSearchBar();
            }
        }
    });

    _searchBar = bar;
    return bar;
}

/** Crée le div tooltip flottant (hors pill, dans glMain, non clippé par overflow). */
function createTooltipDom(): HTMLElement {
    const tip = document.createElement("div");
    tip.className = "gl-toolbar-tooltip";
    tip.setAttribute("aria-hidden", "true");
    _tooltipEl = tip;
    return tip;
}

function _showTooltip(btn: HTMLElement, glMain: HTMLElement): void {
    if (!_tooltipEl) return;
    const label = btn.getAttribute("data-tooltip");
    if (!label) return;
    _tooltipEl.textContent = label;
    _tooltipEl.style.display = "block";
    const btnRect = btn.getBoundingClientRect();
    const mainRect = glMain.getBoundingClientRect();
    const top = btnRect.top - mainRect.top + btnRect.height / 2;
    const left = btnRect.right - mainRect.left + 10;
    _tooltipEl.style.top = `${top}px`;
    _tooltipEl.style.left = `${left}px`;
    requestAnimationFrame(() => {
        if (_tooltipEl) _tooltipEl.classList.add("is-visible");
    });
}

function _hideTooltip(): void {
    if (!_tooltipEl) return;
    _tooltipEl.classList.remove("is-visible");
    _tooltipEl.addEventListener(
        "transitionend",
        () => {
            if (_tooltipEl && !_tooltipEl.classList.contains("is-visible")) {
                _tooltipEl.style.display = "none";
            }
        },
        { once: true }
    );
}

function attachTooltipHandlers(wrapper: HTMLElement, glMain: HTMLElement): void {
    const btns = wrapper.querySelectorAll<HTMLElement>("[data-tooltip]");
    btns.forEach((btn) => {
        btn.addEventListener("mouseenter", () => _showTooltip(btn, glMain));
        btn.addEventListener("focusin", () => _showTooltip(btn, glMain));
        btn.addEventListener("mouseleave", _hideTooltip);
        btn.addEventListener("focusout", _hideTooltip);
        btn.addEventListener("pointerleave", _hideTooltip);
    });
}

function createSheetDom(): HTMLElement {
    const overlay = document.createElement("div");
    overlay.className = "gl-sheet-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "gl-sheet-panel-title");

    const panel = document.createElement("div");
    panel.className = "gl-sheet-panel";

    const header = document.createElement("div");
    header.className = "gl-sheet-panel__header";

    const title = document.createElement("h2");
    title.className = "gl-sheet-panel__title";
    title.id = "gl-sheet-panel-title";
    _panelTitle = title;

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "gl-sheet-panel__close";
    closeBtn.setAttribute("aria-label", "Fermer");
    closeBtn.appendChild(createSvgIcon("M18 6L6 18M6 6l12 12", 24));

    const body = document.createElement("div");
    body.className = "gl-sheet-panel__body";
    body.id = "gl-sheet-panel-body";
    _panelBody = body;

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);
    panel.appendChild(body);
    overlay.appendChild(panel);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeSheet();
    });
    closeBtn.addEventListener("click", () => closeSheet());

    /* Focus trap : Tab/Shift-Tab reste dans le dialog tant qu'il est ouvert */
    overlay.addEventListener("keydown", (e) => {
        if (!overlay.classList.contains("open") || e.key !== "Tab") return;
        const focusable = Array.from(
            overlay.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter((el) => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && _overlay?.classList.contains("open")) closeSheet();
    });

    return overlay;
}

/**
 * Déplace un nœud dans le body du sheet et enregistre sa position pour restauration.
 */
function moveNodeToSheetBody(node: HTMLElement | null): void {
    if (!node || !_panelBody) return;
    const parent = node.parentElement;
    if (!parent) return;
    const nextSibling = node.nextSibling;
    _restoreOnClose.push({ parent, node, nextSibling });
    _panelBody.appendChild(node);
}

/**
 * Phase 3 : injecte le contenu existant (filtres, couches, tableau, légende) dans le sheet.
 * Les thèmes ne sont plus injectés ici — barre primaire toujours visible, secondaire via toggle.
 */
function injectSheetContent(sheetId: string): void {
    if (!_panelBody) return;
    _restoreOnClose = [];
    if (sheetId === "filters") {
        const panel = document.getElementById("gl-filter-panel");
        if (panel) {
            panel.classList.add("is-open", "gl-sheet-content");
            moveNodeToSheetBody(panel);
        }
    } else if (sheetId === "layers") {
        const lm = document.querySelector(".gl-layer-manager") as HTMLElement | null;
        if (lm) {
            lm.classList.remove("gl-layer-manager--collapsed");
            moveNodeToSheetBody(lm);
        }
    } else if (sheetId === "table") {
        const tablePanel = document.querySelector(".gl-table-panel") as HTMLElement | null;
        if (tablePanel) {
            tablePanel.classList.add("is-visible", "gl-sheet-content");
            moveNodeToSheetBody(tablePanel);
        }
    } else if (sheetId === "legend") {
        /* La légende est affichée dans le sheet au lieu d'être un overlay sur la carte */
        const legendEl = document.querySelector(".gl-map-legend") as HTMLElement | null;
        if (legendEl) {
            moveNodeToSheetBody(legendEl);
        }
    }
}

/**
 * Restaure les nœuds déplacés dans le sheet à leur position d'origine.
 */
function restoreMovedNodes(): void {
    for (let i = _restoreOnClose.length - 1; i >= 0; i--) {
        const { parent, node, nextSibling } = _restoreOnClose[i];
        node.classList.remove("gl-sheet-content");
        if (nextSibling && nextSibling.parentNode === parent) {
            parent.insertBefore(node, nextSibling);
        } else {
            parent.appendChild(node);
        }
    }
    _restoreOnClose = [];
    /* Remettre les panneaux dans un état fermé après restauration */
    document.getElementById("gl-filter-panel")?.classList.remove("is-open");
    /* Ne pas retirer is-visible si le panneau tableau est ouvert via le panneau desktop (data-gl-open=true) */
    const _tpRestore = document.querySelector<HTMLElement>(".gl-table-panel");
    if (_tpRestore && _tpRestore.getAttribute("data-gl-open") !== "true") {
        _tpRestore.classList.remove("is-visible");
    }
}

function openSheet(sheetId: string): void {
    const titles = { ...DEFAULT_SHEET_TITLES, ...(_options?.sheetTitles ?? {}) };
    const title = titles[sheetId] ?? sheetId;
    if (_panelTitle) _panelTitle.textContent = title;
    if (_panelBody) _panelBody.innerHTML = "";
    _activeSheetId = sheetId;
    /* Mémoriser le focus pour restauration à la fermeture (accessibilité) */
    _lastFocusedElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    _overlay?.classList.add("open");
    _overlay?.setAttribute("aria-labelledby", "gl-sheet-panel-title");
    const openedBtn = _toolbar?.querySelector(`[data-gl-sheet="${sheetId}"]`);
    if (openedBtn && openedBtn instanceof HTMLElement)
        openedBtn.setAttribute("aria-expanded", "true");
    /* Phase 3 : filtres, couches, tableau, légende → contenu existant dans le sheet */
    if (["filters", "layers", "table", "legend"].includes(sheetId)) {
        injectSheetContent(sheetId);
    }
    /* Déplacer le focus dans le dialog pour les AT et la navigation clavier */
    const _closeBtn = _overlay?.querySelector<HTMLElement>(".gl-sheet-panel__close");
    _closeBtn?.focus();
    refreshFilterButtonState();
}

function closeSheet(): void {
    /* Phase 3 : restaurer les nœuds déplacés avant de fermer */
    restoreMovedNodes();
    _overlay?.classList.remove("open");
    _activeSheetId = null;
    _toolbar
        ?.querySelectorAll("[aria-expanded]")
        .forEach((el) => el.setAttribute("aria-expanded", "false"));
    /* Rendre le focus à l'élément qui avait le focus avant l'ouverture */
    if (_lastFocusedElement) {
        _lastFocusedElement.focus();
        _lastFocusedElement = null;
    }
    refreshFilterButtonState();
}

function refreshFilterButtonState(): void {
    let active = _options?.getFilterActiveState?.() ?? false;
    /* Vérifier aussi directement en DOM si des catégories ou tags sont sélectionnés */
    if (!active) {
        const panel = document.querySelector("#gl-filter-panel");
        if (panel) {
            const checkedCats = panel.querySelectorAll(
                ".gl-filter-tree__checkbox--category:checked, .gl-filter-tree__checkbox--subcategory:checked"
            ).length;
            const selectedTags = panel.querySelectorAll(
                ".gl-filter-panel__tag-badge.is-selected"
            ).length;
            active = checkedCats > 0 || selectedTags > 0;
        }
    }
    _filterBtn?.classList.toggle("gl-map-toolbar__btn--active", active);
    _filterGroup?.classList.toggle("has-active-filters", active);
}

function onToolbarClick(e: Event): void {
    const target = (e.target as HTMLElement).closest("button");
    if (!target) return;
    const action = target.getAttribute("data-gl-toolbar-action");
    const sheetId = target.getAttribute("data-gl-sheet");

    if (action === "reset-filters") {
        e.preventDefault();
        _options?.onResetFilters?.();
        refreshFilterButtonState();
        return;
    }

    if (action === "zoom-in" && _options?.map) {
        _options.map.zoomIn();
        return;
    }
    if (action === "zoom-out" && _options?.map) {
        _options.map.zoomOut();
        return;
    }

    /* Plein écran — on met glMain en fullscreen afin que la barre y reste visible */
    if (action === "fullscreen") {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            _options!.glMain.requestFullscreen().catch(() => {
                /* Plein écran non supporté ou refusé */
            });
        }
        return;
    }

    /* Recherche : toggle de la barre de recherche inline */
    if (action === "search") {
        const isOpen = _searchBar?.classList.contains("is-visible");
        if (isOpen) {
            closeSearchBar();
            target.classList.remove("gl-map-toolbar__btn--active");
        } else {
            openSearchBar();
        }
        return;
    }

    /* Thèmes : toggle de la barre secondaire (primaire toujours visible sur mobile) */
    if (action === "themes") {
        const secondaryCtr = document.getElementById("gl-theme-secondary-container");
        if (!secondaryCtr) return;
        const isVisible = secondaryCtr.classList.contains("gl-mobile-secondary-visible");
        if (isVisible) {
            secondaryCtr.classList.remove("gl-mobile-secondary-visible");
            target.classList.remove("gl-map-toolbar__btn--active");
            target.setAttribute("aria-expanded", "false");
        } else {
            secondaryCtr.classList.add("gl-mobile-secondary-visible");
            target.classList.add("gl-map-toolbar__btn--active");
            target.setAttribute("aria-expanded", "true");
        }
        return;
    }

    /* Proximité : activation directe + bandeau de configuration */
    if (sheetId === "proximity") {
        const proximity = (_g.GeoLeaf as any)?._UIFilterPanelProximity;
        const map = _options?.map as any;
        if (!proximity?.toggleProximityToolbar || !map) return;

        if (_proximityActive) {
            /* Déjà actif : deuxième clic = désactivation */
            proximity.toggleProximityToolbar(map, 10);
            _proximityActive = false;
            target.classList.remove("gl-map-toolbar__btn--active");
            closeProximityBar(false); /* ferme le bandeau sans annuler */
        } else {
            /* Activation */
            const onPointPlaced = () => {
                if (_proximityValidateBtn) _proximityValidateBtn.disabled = false;
                if (_proximityInstruction) {
                    _proximityInstruction.textContent = "\u2713 Ajustez le rayon";
                    _proximityInstruction.classList.add("point-placed");
                }
            };
            _proximityActive = proximity.toggleProximityToolbar(
                map,
                parseInt(_proximitySlider?.defaultValue || "10", 10),
                { onPointPlaced }
            );
            target.classList.toggle("gl-map-toolbar__btn--active", _proximityActive);
            if (_proximityActive) openProximityBar();
        }
        return;
    }

    /* Géolocalisation : déclencher le même comportement que le bouton Leaflet */
    if (sheetId === "geoloc") {
        const geolocLink = document.querySelector(
            ".leaflet-control-geolocation a"
        ) as HTMLAnchorElement | null;
        if (geolocLink) geolocLink.click();
        const btn = _toolbar?.querySelector('[data-gl-sheet="geoloc"]');
        if (btn && btn instanceof HTMLElement) btn.setAttribute("aria-expanded", "false");
        return;
    }

    /* Phase 3 : Filtres, Couches, Tableau, Légende → ouvrir le sheet avec le contenu existant */
    if (
        sheetId === "filters" ||
        sheetId === "layers" ||
        sheetId === "table" ||
        sheetId === "legend"
    ) {
        openSheet(sheetId);
        return;
    }

    if (sheetId) {
        openSheet(sheetId);
    }
}

function onTableClosed(): void {
    if (_activeSheetId === "table") closeSheet();
}

/**
 * Initialise la barre pill d'utilitaires mobile et le composant sheet.
 * À appeler après que la carte et le DOM .gl-main soient prêts.
 */
export function initMobileToolbar(options: MobileToolbarOptions): void {
    _options = options;
    const { glMain } = options;

    /* createToolbarDom() affecte _toolbar à la pill intérieure et retourne le wrapper */
    const toolbarWrapper = createToolbarDom();
    _toolbar!.addEventListener("click", onToolbarClick);
    glMain.appendChild(toolbarWrapper);

    /* Barre de recherche inline — pill en haut de la carte */
    const searchBarEl = createSearchBarDom();
    glMain.appendChild(searchBarEl);

    /* Tooltip flottant — div dans glMain, hors de la pill (overflow:hidden ne peut pas clipper) */
    const tooltipEl = createTooltipDom();
    tooltipEl.style.display = "none";
    glMain.appendChild(tooltipEl);
    attachTooltipHandlers(toolbarWrapper, glMain);

    /* Bandeau proximité — accolé au haut de glMain */
    const proximityBar = createProximityBarDom();
    glMain.appendChild(proximityBar);
    /* S'assurer que glMain est en position relative pour le positionnement absolu */
    if (glMain.style.position === "" || glMain.style.position === "static") {
        glMain.style.position = "relative";
    }

    _overlay = createSheetDom();
    glMain.appendChild(_overlay);

    /* Vérification initiale de la visibilité des flèches après rendu du layout */
    requestAnimationFrame(() => {
        updateNavVisibility();
    });

    /* Retirer la classe body quand le tableau est fermé par son propre bouton */
    if (typeof document !== "undefined") {
        document.addEventListener("geoleaf:table:closed", onTableClosed);

        /* Synchronise l'icône plein écran avec l'état natif (sortie via Échap) */
        document.addEventListener("fullscreenchange", () => {
            const isFullscreen = !!document.fullscreenElement;
            const fsBtn = _toolbar?.querySelector(
                '[data-gl-toolbar-action="fullscreen"]'
            ) as HTMLElement | null;
            if (fsBtn) {
                fsBtn.classList.toggle("gl-map-toolbar__btn--active", isFullscreen);
                /* Icône : enter (4 coins vers l'extérieur) ou exit (4 coins vers l'intérieur) */
                fsBtn.innerHTML = "";
                const exitPath =
                    "M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3";
                const enterPath = "M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6";
                fsBtn.appendChild(createSvgIcon(isFullscreen ? exitPath : enterPath));
            }
            /* Mode plein écran : réduit la barre aux 2 boutons essentiels */
            _toolbar?.classList.toggle("gl-map-toolbar--fullscreen", isFullscreen);
            /* Recalcule la visibilité des flèches (en plein écran il n'y a pas d'overflow) */
            updateNavVisibility();
        });
    }

    /* Synchronise l'état du bouton géoloc avec les événements dispatché depuis controls.ts */
    const _geolocMapContainer = (_options?.map as any)?.getContainer?.() as HTMLElement | null;
    if (_geolocMapContainer) {
        _geolocMapContainer.addEventListener("gl:geoloc:statechange", (e: Event) => {
            const detail = (e as CustomEvent).detail;
            const btn = _toolbar?.querySelector('[data-gl-sheet="geoloc"]');
            if (btn instanceof HTMLElement) {
                btn.classList.toggle("gl-map-toolbar__btn--active", !!detail?.active);
            }
        });
    }

    refreshFilterButtonState();
    _filterCheckInterval = window.setInterval(
        () => refreshFilterButtonState(),
        2000
    ) as unknown as number;
}

/**
 * Ferme le sheet s'il est ouvert (utile au resize ou avant démontage).
 */
export function closeMobileSheet(): void {
    closeSheet();
}

/**
 * Rafraîchit l'état visuel du bouton filtre (actif / réinitialiser).
 */
export function refreshMobileToolbarFilterState(): void {
    refreshFilterButtonState();
}
