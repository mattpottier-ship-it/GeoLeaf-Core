/**
 * GeoLeaf UI Filter Panel - Renderer
 * Construction du panneau HTML de filtres
 *
 * @module ui/filter-panel/renderer
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Helper pour utiliser createElement unifié
    const $create = (tag, props, ...children) => {
        return GeoLeaf.Utils && GeoLeaf.Utils.createElement
            ? GeoLeaf.Utils.createElement(tag, props, ...children)
            : document.createElement(tag);
    };

    // Dépendances lazy
    const getLog = () => (GeoLeaf.Log || console);
    const getShared = () => GeoLeaf._UIFilterPanelShared;
    const getStateReader = () => GeoLeaf._UIFilterPanelStateReader;
    const getApplier = () => GeoLeaf._UIFilterPanelApplier;

    GeoLeaf._UIFilterPanelRenderer = GeoLeaf._UIFilterPanelRenderer || {};
    GeoLeaf._UIFilterPanelRenderer._eventCleanups = [];

    /**
     * Construit le panneau de filtres depuis la configuration du profil actif
     * @param {Object} options - Options
     * @param {HTMLElement} [options.container] - Conteneur cible
     */
    GeoLeaf._UIFilterPanelRenderer.buildFilterPanelFromActiveProfile = function(options) {
        const Log = getLog();
        const Shared = getShared();
        const StateReader = getStateReader();
        const Applier = getApplier();

        if (Log) Log.debug("[FilterPanel] buildFilterPanelFromActiveProfile APPELÉ, options:", options);

        const profile = GeoLeaf.UI._getActiveProfileConfig();
        if (Log) Log.debug("[FilterPanel] Profile récupéré:", profile);

        if (!profile) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Aucun profil actif trouvé");
            return;
        }

        Log.info("[GeoLeaf.UI.FilterPanel] Profil actif:", profile.id || "unknown");

        // Support both profile.panels.search (old) and profile.search (new)
        const searchPanel = (profile.panels && profile.panels.search) || profile.search;
        if (Log) Log.debug("[FilterPanel] searchPanel:", searchPanel);

        if (!searchPanel) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Aucune configuration search/panels.search dans le profil");
            return;
        }

        const filters = searchPanel && Array.isArray(searchPanel.filters) ? searchPanel.filters : null;
        if (Log) Log.debug("[FilterPanel] Filters:", filters);

        if (!filters || !filters.length) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Aucun filtre défini dans profile.search.filters pour le profil actif. Filters:", filters);
            return;
        }

        Log.info("[GeoLeaf.UI.FilterPanel] Nombre de filtres trouvés:", filters.length);

        const container = (options && options.container) || Shared.getFilterPanelElement();
        if (!container) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Conteneur de panneau introuvable");
            return;
        }

        // ---------------------------------------------------------
        // Vider le conteneur existant
        // ---------------------------------------------------------
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        container.classList.add("gl-filter-panel");

        // ---------------------------------------------------------
        // Header
        // ---------------------------------------------------------
        const header = $create("div", {
            className: "gl-filter-panel__header"
        });

        const title = $create("h2", {
            className: "gl-filter-panel__title",
            textContent: searchPanel.title || "Filtres"
        });
        header.appendChild(title);

        // Bouton toggle avec flèche (comme le tableau)
        const toggleBtn = $create("button", {
            type: "button",
            className: "gl-filter-panel__toggle-btn",
            attributes: {
                "data-gl-action": "filter-close",
                "aria-label": "Fermer le panneau"
            }
        });
        const toggleIcon = $create("span", {
            className: "gl-filter-panel__toggle-icon",
            textContent: "◀"
        });
        toggleBtn.appendChild(toggleIcon);
        header.appendChild(toggleBtn);

        container.appendChild(header);

        // ---------------------------------------------------------
        // Body : champs de filtre
        // ---------------------------------------------------------
        const body = $create("div", {
            className: "gl-filter-panel__body"
        });

        // Sprint 3.2: Use DocumentFragment for batch DOM operations
        const bodyFragment = document.createDocumentFragment();

        filters.forEach(function(filterDef) {
            // Passer skipLabel=true pour les filtres avec accordéon (categories et tags) et proximity (qui gère son propre label)
            const skipLabel = (filterDef.id === 'categories' || filterDef.id === 'tags' || filterDef.type === 'proximity');
            const groupEl = GeoLeaf.UI._buildFilterControl(filterDef, profile, skipLabel);

            if (groupEl) {
                // Wrapper avec accordéon pour categories et tags
                if (filterDef.id === 'categories' || filterDef.id === 'tags') {
                    const accordionGroup = $create("div", {
                        className: "gl-filter-panel__group--accordion",
                        attributes: { "data-accordion-for": filterDef.id }
                    });

                    const accordionHeader = $create("div", {
                        className: "gl-filter-panel__accordion-header"
                    });

                    const accordionTitle = $create("h3", {
                        className: "gl-filter-panel__accordion-title",
                        textContent: filterDef.label || (filterDef.id === 'categories' ? 'Afficher les catégories' : 'Afficher les tags')
                    });

                    const accordionArrow = $create("span", {
                        className: "gl-filter-panel__accordion-arrow",
                        textContent: "▶"
                    });

                    accordionHeader.appendChild(accordionTitle);
                    accordionHeader.appendChild(accordionArrow);

                    const accordionBody = $create("div", {
                        className: "gl-filter-panel__accordion-body"
                    });

                    // Wrapper nécessaire pour la technique CSS Grid
                    const accordionWrapper = $create("div");
                    accordionWrapper.appendChild(groupEl);
                    accordionBody.appendChild(accordionWrapper);

                    const accordionClickHandler = function() {
                        requestAnimationFrame(function() {
                            accordionGroup.classList.toggle("is-expanded");

                            const isExpanded = accordionGroup.classList.contains("is-expanded");

                            // LAZY LOADING: Charger le contenu à la demande si nécessaire
                            if (isExpanded) {
                                GeoLeaf._UIFilterPanelRenderer._loadAccordionContentIfNeeded(accordionGroup, filterDef);
                            } else {
                                // Marquer comme fermé
                                const LazyLoader = GeoLeaf._UIFilterPanelLazyLoader;
                                if (LazyLoader) {
                                    LazyLoader.markAccordionClosed(accordionGroup);
                                }
                            }
                        });
                    };

                    const events = GeoLeaf.Utils?.events;
                    if (events) {
                        GeoLeaf._UIFilterPanelRenderer._eventCleanups.push(
                            events.on(
                                accordionHeader,
                                "click",
                                accordionClickHandler,
                                false,
                                'FilterPanel.accordionToggle'
                            )
                        );
                    } else {
                        accordionHeader.addEventListener("click", accordionClickHandler);
                    }

                    accordionGroup.appendChild(accordionHeader);
                    accordionGroup.appendChild(accordionBody);
                    bodyFragment.appendChild(accordionGroup);
                } else {
                    bodyFragment.appendChild(groupEl);
                }
            }
        });

        body.appendChild(bodyFragment);

        container.appendChild(body);

        // ---------------------------------------------------------
        // Footer : boutons Appliquer / Réinitialiser
        // ---------------------------------------------------------
        const footer = $create("div", {
            className: "gl-filter-panel__footer"
        });

        const applyBtn = $create("button", {
            type: "button",
            className: "gl-btn gl-btn--accent gl-filter-panel__btn-apply",
            textContent: (searchPanel.actions && searchPanel.actions.applyLabel) || "Appliquer"
        });
        footer.appendChild(applyBtn);

        const resetBtn = $create("button", {
            type: "button",
            className: "gl-btn gl-btn--subtle gl-filter-panel__btn-reset",
            textContent: (searchPanel.actions && searchPanel.actions.resetLabel) || "Réinitialiser"
        });
        footer.appendChild(resetBtn);

        container.appendChild(footer);

        // ---------------------------------------------------------
        // Wiring évènements (fermer / reset / appliquer)
        // ---------------------------------------------------------
        if (!container._glFilterHandlersBound) {
            // Déclarer events une seule fois pour tout le bloc
            const events = GeoLeaf.Utils?.events;

            const containerClickHandler = function(evt) {
                const target = evt.target;

                // Fermer le panneau (utilise closest pour gérer les clics sur les enfants du bouton)
                if (target.closest("[data-gl-action='filter-close']")) {
                    evt.preventDefault();
                    GeoLeaf._UIFilterPanelRenderer.toggleFilterPanelVisibility(false);
                    return;
                }

                // Réinitialiser les filtres + réafficher tous les POI
                if (target.classList.contains("gl-filter-panel__btn-reset")) {
                    evt.preventDefault();
                    StateReader.resetControls(container);
                    Applier.applyFiltersNow(container, true); // skipRoutes=true to preserve route styling
                    return;
                }

                // Appliquer les filtres
                if (target.classList.contains("gl-filter-panel__btn-apply")) {
                    evt.preventDefault();
                    Applier.applyFiltersNow(container);
                    return;
                }
            };

            if (events) {
                GeoLeaf._UIFilterPanelRenderer._eventCleanups.push(
                    events.on(
                        container,
                        "click",
                        containerClickHandler,
                        false,
                        'FilterPanel.containerClick'
                    )
                );
            } else {
                container.addEventListener("click", containerClickHandler);
            }

            // Gestionnaire pour la touche Entrée dans l'input de recherche textuelle
            const containerKeydownHandler = function(evt) {
                if (evt.key === "Enter" || evt.keyCode === 13) {
                    const target = evt.target;
                    const searchInput = target.closest("[data-gl-filter-id='searchText'] input[type='text']");
                    if (searchInput) {
                        evt.preventDefault();
                        Applier.applyFiltersNow(container);
                        return;
                    }
                }
            };

            if (events) {
                GeoLeaf._UIFilterPanelRenderer._eventCleanups.push(
                    events.on(
                        container,
                        "keydown",
                        containerKeydownHandler,
                        false,
                        'FilterPanel.enterKey'
                    )
                );
            } else {
                container.addEventListener("keydown", containerKeydownHandler);
            }

            container._glFilterHandlersBound = true;
        }

        // Le panneau doit être masqué par défaut au démarrage
        // Il ne s'affichera que lorsque l'utilisateur cliquera sur le bouton toggle
        container.classList.remove("is-open");
    };

    /**
     * Bascule la visibilité du panneau de filtres.
     * @param {boolean} [forceState] - Force l'état (true = ouvert, false = fermé)
     */
    GeoLeaf._UIFilterPanelRenderer.toggleFilterPanelVisibility = function(forceState) {
        const Shared = getShared();
        const container = Shared.getFilterPanelElement();
        if (!container) return;

        const isOpen = container.classList.contains("is-open");
        let nextState;

        if (typeof forceState === "boolean") {
            nextState = forceState;
        } else {
            nextState = !isOpen;
        }

        if (nextState) {
            container.classList.add("is-open");
        } else {
            container.classList.remove("is-open");
        }

        // Mettre à jour l'icône du bouton toggle externe
        const toggleBtn = document.getElementById("gl-filter-toggle");
        if (toggleBtn) {
            const icon = toggleBtn.querySelector(".gl-filter-toggle__icon");
            if (icon) {
                if (nextState) {
                    // Panneau ouvert : flèche vers la gauche (pour fermer)
                    // SAFE: SVG statique hardcodé
                    GeoLeaf.DOMSecurity.clearElementFast(icon);
                    const svg = GeoLeaf.DOMSecurity.createSVGIcon(16, 16, 'M15 18l-6-6 6-6', {
                        stroke: 'currentColor',
                        strokeWidth: '6',
                        fill: 'none'
                    });
                    icon.appendChild(svg);
                    toggleBtn.setAttribute("aria-label", "Fermer le panneau de filtres");
                } else {
                    // Panneau fermé : flèche vers la droite (pour ouvrir)
                    // SAFE: SVG statique hardcodé
                    GeoLeaf.DOMSecurity.clearElementFast(icon);
                    const svg = GeoLeaf.DOMSecurity.createSVGIcon(16, 16, 'M9 6l6 6-6 6', {
                        stroke: 'currentColor',
                        strokeWidth: '6',
                        fill: 'none'
                    });
                    icon.appendChild(svg);
                    toggleBtn.setAttribute("aria-label", "Ouvrir le panneau de filtres");
                }
            }
        }
    };

    /**
     * Initialise le bouton toggle du panneau de filtres
     */
    GeoLeaf._UIFilterPanelRenderer.initFilterToggle = function() {
        const Log = getLog();
        const Shared = getShared();

        const toggleBtn = document.getElementById("gl-filter-toggle");
        const panel = Shared.getFilterPanelElement();

        if (!toggleBtn || !panel) {
            Log.info("[GeoLeaf.UI.FilterPanel] Bouton toggle ou panneau filtres introuvable");
            return;
        }

        const toggleClickHandler = function() {
            const isOpen = panel.classList.contains("is-open");
            const icon = toggleBtn.querySelector(".gl-filter-toggle__icon");

            if (isOpen) {
                panel.classList.remove("is-open");
                if (icon) {
                    // SAFE: SVG statique hardcodé
                    GeoLeaf.DOMSecurity.clearElementFast(icon);
                    const svg = GeoLeaf.DOMSecurity.createSVGIcon(16, 16, 'M9 6l6 6-6 6', {
                        stroke: 'currentColor',
                        strokeWidth: '6',
                        fill: 'none'
                    });
                    icon.appendChild(svg);
                }
                toggleBtn.setAttribute("aria-label", "Ouvrir le panneau de filtres");
            } else {
                panel.classList.add("is-open");
                if (icon) {
                    // SAFE: SVG statique hardcodé
                    GeoLeaf.DOMSecurity.clearElementFast(icon);
                    const svg = GeoLeaf.DOMSecurity.createSVGIcon(16, 16, 'M15 18l-6-6 6-6', {
                        stroke: 'currentColor',
                        strokeWidth: '6',
                        fill: 'none'
                    });
                    icon.appendChild(svg);
                }
                toggleBtn.setAttribute("aria-label", "Fermer le panneau de filtres");
            }
        };

        const events = GeoLeaf.Utils?.events;
        if (events) {
            GeoLeaf._UIFilterPanelRenderer._eventCleanups.push(
                events.on(
                    toggleBtn,
                    "click",
                    toggleClickHandler,
                    false,
                    'FilterPanel.toggleButton'
                )
            );
        } else {
            toggleBtn.addEventListener("click", toggleClickHandler);
        }

        Log.info("[GeoLeaf.UI.FilterPanel] Bouton toggle filtres initialisé");
    };

    /**
     * Rafraîchit les badges de tags dans le panneau de filtres.
     * Doit être appelé APRÈS que les POI ont été chargés.
     */
    GeoLeaf._UIFilterPanelRenderer.refreshFilterTags = function() {
        const Log = getLog();
        const Shared = getShared();

        const container = Shared.getFilterPanelElement();
        if (!container) {
            Log.warn("[GeoLeaf.UI.FilterPanel.refreshFilterTags] Panneau de filtres non trouvé");
            return;
        }

        // Récupérer POI et routes
        const basePois = Shared.getBasePois();
        const baseRoutes = Shared.getBaseRoutes();
        const allItems = basePois.concat(baseRoutes);

        Log.debug("[GeoLeaf.UI.FilterPanel.refreshFilterTags] Items:", basePois.length, "POI,", baseRoutes.length, "routes");

        // Collecter tous les tags
        const allTags = Shared.collectAllTags(allItems);

        // Peupler les badges
        GeoLeaf._UIFilterPanelRenderer.populateTagsBadges(container, allTags);
    };

    /**
     * Peuple le conteneur de badges avec les tags fournis
     * @param {HTMLElement} panelEl - Élément du panneau de filtres
     * @param {Array} allTags - Liste des tags uniques
     */
    GeoLeaf._UIFilterPanelRenderer.populateTagsBadges = function(panelEl, allTags) {
        const Log = getLog();
        const wrapper = panelEl.querySelector("[data-gl-filter-id='tags']");
        if (!wrapper) {
            Log.debug("[GeoLeaf.UI.FilterPanel] Wrapper tags non trouvé - probablement pas utilisé dans ce profil");
            return;
        }

        const tagsContainer = wrapper.querySelector(".gl-filter-panel__tags-container");
        if (!tagsContainer) {
            Log.warn("[GeoLeaf.UI.FilterPanel] Container tags non trouvé");
            return;
        }

        // Trouver l'accordéon parent par l'attribut data-accordion-for
        const accordionGroup = panelEl.querySelector("[data-accordion-for='tags']");
        Log.debug("[GeoLeaf.UI.FilterPanel] Recherche accordéon avec [data-accordion-for='tags']");
        Log.debug("[GeoLeaf.UI.FilterPanel] Accordéon trouvé:", accordionGroup);

        // Vider le container
        while (tagsContainer.firstChild) {
            tagsContainer.removeChild(tagsContainer.firstChild);
        }

        // Si pas de tags, cacher complètement l'accordéon parent
        if (!allTags.length) {
            Log.debug("[GeoLeaf.UI.FilterPanel] Pas de tags (count:", allTags.length, ")");
            if (accordionGroup) {
                accordionGroup.style.display = "none";
                Log.info("[GeoLeaf.UI.FilterPanel] Accordéon tags CACHÉ (display: none)");
            } else {
                Log.warn("[GeoLeaf.UI.FilterPanel] Accordéon tags non trouvé pour le cacher");
            }
            return;
        }

        // S'il y a des tags, s'assurer que l'accordéon est visible
        Log.debug("[GeoLeaf.UI.FilterPanel] Tags détectés (count:", allTags.length, ")");
        if (accordionGroup) {
            accordionGroup.style.display = "";
            Log.info("[GeoLeaf.UI.FilterPanel] Accordéon tags AFFICHÉ");
        }

        // Créer les badges
        // Sprint 3.2: Use DocumentFragment for batch DOM operations
        const tagsFragment = document.createDocumentFragment();

        allTags.forEach(function(tag) {
            const badgeClickHandler = function() {
                this.classList.toggle("is-selected");
            };

            const badge = $create("span", {
                className: "gl-filter-panel__tag-badge",
                textContent: tag,
                attributes: { "data-tag-value": tag },
                onClick: badgeClickHandler
            });

            const events = GeoLeaf.Utils?.events;
            if (events) {
                GeoLeaf._UIFilterPanelRenderer._eventCleanups.push(
                    events.on(
                        badge,
                        "click",
                        badgeClickHandler,
                        false,
                        'FilterPanel.tagBadge'
                    )
                );
            } else {
                badge.addEventListener("click", badgeClickHandler);
            }

            tagsFragment.appendChild(badge);
        });

        tagsContainer.appendChild(tagsFragment);
    };

    /**
     * Cleanup method for event listeners
     * Call this when destroying the filter panel
     * MEMORY LEAK FIX (Phase 2): Also cleanup timeouts in applier
     */
    GeoLeaf._UIFilterPanelRenderer.destroy = function() {
        const Log = getLog();
        if (Log) Log.debug("[FilterPanel] Cleaning up event listeners");

        if (GeoLeaf._UIFilterPanelRenderer._eventCleanups) {
            GeoLeaf._UIFilterPanelRenderer._eventCleanups.forEach(cleanup => {
                if (typeof cleanup === 'function') {
                    cleanup();
                }
            });
            GeoLeaf._UIFilterPanelRenderer._eventCleanups = [];
        }

        // MEMORY LEAK FIX (Phase 2): Cleanup applier timeouts
        if (GeoLeaf._UIFilterPanelApplier && GeoLeaf._UIFilterPanelApplier.destroy) {
            GeoLeaf._UIFilterPanelApplier.destroy();
        }
    };

    /**
     * Charge le contenu d'un accordéon à la demande (lazy loading)
     * @param {HTMLElement} accordionGroup - Element de l'accordéon
     * @param {Object} filterDef - Définition du filtre
     */
    GeoLeaf._UIFilterPanelRenderer._loadAccordionContentIfNeeded = function(accordionGroup, filterDef) {
        const Log = getLog();
        const LazyLoader = GeoLeaf._UIFilterPanelLazyLoader;

        if (!LazyLoader) {
            Log.warn("[FilterPanel] LazyLoader non disponible");
            return;
        }

        // Vérifier si le contenu a déjà été chargé (le flag est reset à "false" lors d'un changement de thème)
        if (accordionGroup.dataset.lazyLoaded === "true") {
            Log.debug("[FilterPanel] Accordéon déjà chargé pour ce thème, skip");
            return;
        }

        // Trouver le container de contenu
        const contentArea = accordionGroup.querySelector('[data-lazy-type]');
        if (!contentArea) {
            Log.debug("[FilterPanel] Pas de zone lazy dans cet accordéon");
            return;
        }

        const lazyType = contentArea.dataset.lazyType;
        Log.info(`[FilterPanel] Chargement lazy du contenu: ${lazyType}`);

        // Récupérer le thème actif (avec fallback sur le thème par défaut du profil)
        let currentTheme = GeoLeaf.ThemeSelector?.getCurrentTheme();
        if (!currentTheme) {
            // Fallback : récupérer le thème par défaut depuis le profil
            const profile = (GeoLeaf.Config && typeof GeoLeaf.Config.getActiveProfile === "function")
                ? GeoLeaf.Config.getActiveProfile()
                : null;
            if (profile && profile.themes && profile.themes.config && profile.themes.config.defautTheme) {
                currentTheme = profile.themes.config.defautTheme;
                Log.info("[FilterPanel] Fallback sur le thème par défaut:", currentTheme);
            }
        }
        if (!currentTheme) {
            // Dernier fallback : utiliser "defaut" comme ID générique
            currentTheme = "defaut";
            Log.warn("[FilterPanel] Thème actif introuvable, utilisation de 'defaut'");
        }

        // Afficher un spinner pendant le chargement
        contentArea.innerHTML = '<div class="gl-filter-panel__loading">Chargement...</div>';

        // Charger de manière asynchrone pour ne pas bloquer l'UI
        setTimeout(() => {
            try {
                if (lazyType === 'categories') {
                    const result = LazyLoader.loadCategories(currentTheme);

                    // Vérifier s'il y a des catégories
                    if (!result.usedIds || result.usedIds.size === 0) {
                        contentArea.innerHTML = '<div class="gl-filter-panel__empty">Aucune catégorie disponible sur les couches visibles</div>';
                        accordionGroup.dataset.lazyLoaded = "true";
                        return;
                    }

                    // Construire le contenu HTML
                    if (typeof window._buildCategoryTreeContent === "function") {
                        const htmlContent = window._buildCategoryTreeContent(result);
                        contentArea.innerHTML = htmlContent;

                        // Attacher les event listeners
                        if (typeof window._attachCategoryTreeListeners === "function") {
                            window._attachCategoryTreeListeners(contentArea);
                        }
                    } else {
                        contentArea.innerHTML = '<div class="gl-filter-panel__error">Erreur: fonction de construction introuvable</div>';
                    }

                    // Marquer l'accordéon comme ouvert
                    LazyLoader.markAccordionOpen('categories', accordionGroup);

                } else if (lazyType === 'tags') {
                    const tags = LazyLoader.loadTags(currentTheme);

                    // Vérifier s'il y a des tags
                    if (!tags || tags.length === 0) {
                        contentArea.innerHTML = '<div class="gl-filter-panel__empty">Aucun tag disponible sur les couches visibles</div>';
                        accordionGroup.dataset.lazyLoaded = "true";
                        return;
                    }

                    // Construire le contenu HTML
                    if (typeof window._buildTagsListContent === "function") {
                        const htmlContent = window._buildTagsListContent(tags);
                        contentArea.innerHTML = htmlContent;

                        // Attacher les event listeners
                        if (typeof window._attachTagsListeners === "function") {
                            window._attachTagsListeners(contentArea);
                        }
                    } else {
                        contentArea.innerHTML = '<div class="gl-filter-panel__error">Erreur: fonction de construction introuvable</div>';
                    }

                    // Marquer l'accordéon comme ouvert
                    LazyLoader.markAccordionOpen('tags', accordionGroup);
                }

                // Marquer comme chargé
                accordionGroup.dataset.lazyLoaded = "true";

            } catch (err) {
                Log.error("[FilterPanel] Erreur durant le chargement lazy:", err);
                while (contentArea.firstChild) contentArea.removeChild(contentArea.firstChild);
                const errDiv = document.createElement('div');
                errDiv.className = 'gl-filter-panel__error';
                errDiv.textContent = 'Erreur: ' + err.message;
                contentArea.appendChild(errDiv);
            }
        }, 10); // 10ms delay pour laisser l'accordéon s'ouvrir
    };

})(window);
