/**
 * Module Renderer pour LayerManager
 * Logique de rendu des sections et items de la légende
 *
 * DÉPENDANCES:
 * - Leaflet (L.DomUtil, L.DomEvent)
 * - GeoLeaf.Log (optionnel)
 * - GeoLeaf._LayerManagerBasemapSelector (pour section basemap)
 * - GeoLeaf._LayerManagerThemeSelector (pour thèmes)
 * - GeoLeaf.Themes (pour getAvailableThemes)
 * - GeoLeaf.GeoJSON (pour setTheme)
 *
 * EXPOSE:
 * - GeoLeaf._LayerManagerRenderer
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
    const Log = GeoLeaf.Log;

    /**
     * Module Renderer pour LayerManager
     * @namespace _LayerManagerRenderer
     * @private
     */
    const _LayerManagerRenderer = {
        /**
         * Rend les sections de la légende
         * @param {HTMLElement} bodyEl - Élément body de la légende
         * @param {Array} sections - Liste des sections à rendre
         */
        renderSections(bodyEl, sections) {
            if (!bodyEl) {
                return;
            }

            // Clear content sans innerHTML
            if (GeoLeaf._UIComponents && typeof GeoLeaf._UIComponents.clearElement === 'function') {
                GeoLeaf._UIComponents.clearElement(bodyEl);
            } else {
                while (bodyEl.firstChild) {
                    bodyEl.removeChild(bodyEl.firstChild);
                }
            }

            if (!Array.isArray(sections) || sections.length === 0) {
                if (GeoLeaf._UIComponents && typeof GeoLeaf._UIComponents.createEmptyMessage === 'function') {
                    GeoLeaf._UIComponents.createEmptyMessage(bodyEl, "Aucune couche à afficher.", "gl-layer-manager__empty");
                } else {
                    const emptyEl = global.L.DomUtil.create("div", "gl-layer-manager__empty", bodyEl);
                    emptyEl.textContent = "Aucune couche à afficher.";
                }
                return;
            }

            // Filtrer les sections legacy "poi" et "route" (obsolètes)
            const filteredSections = sections.filter(s => s.id !== "poi" && s.id !== "route");

            filteredSections.forEach((section) => {
                const isCollapsible = typeof section.collapsedByDefault === 'boolean';
                const isCollapsed = section.collapsedByDefault === true;

                const sectionEl = global.L.DomUtil.create(
                    "div",
                    isCollapsible ? "gl-layer-manager__section gl-layer-manager__section--accordion" : "gl-layer-manager__section",
                    bodyEl
                );

                if (isCollapsed) {
                    sectionEl.classList.add("gl-layer-manager__section--collapsed");
                }

                if (section.label) {
                    if (isCollapsible) {
                        // En-tête cliquable pour accordéon
                        const accordionHeader = global.L.DomUtil.create(
                            "div",
                            "gl-layer-manager__accordion-header",
                            sectionEl
                        );

                        const sectionTitle = global.L.DomUtil.create(
                            "div",
                            "gl-layer-manager__section-title",
                            accordionHeader
                        );
                        sectionTitle.textContent = section.label;

                        const accordionArrow = global.L.DomUtil.create(
                            "span",
                            "gl-layer-manager__accordion-arrow",
                            accordionHeader
                        );
                        accordionArrow.textContent = "▶";

                        // Gestionnaire de clic pour l'accordéon
                        global.L.DomEvent.on(accordionHeader, "click", function(ev) {
                            global.L.DomEvent.stopPropagation(ev);
                            global.L.DomEvent.preventDefault(ev);

                            const wasCollapsed = sectionEl.classList.contains("gl-layer-manager__section--collapsed");
                            sectionEl.classList.toggle("gl-layer-manager__section--collapsed");

                            // Mettre à jour la flèche avec animation
                            accordionArrow.textContent = wasCollapsed ? "▼" : "▶";

                            // Mettre à jour l'état dans la section
                            section._isExpanded = wasCollapsed;

                            if (Log) Log.debug("[LayerManager] Accordéon", section.id, wasCollapsed ? "ouvert" : "fermé");
                        });
                    } else {
                        // Titre simple pour section non-accordéon
                        const sectionTitle = global.L.DomUtil.create(
                            "div",
                            "gl-layer-manager__section-title",
                            sectionEl
                        );
                        sectionTitle.textContent = section.label;
                    }
                }

                // Si pas d'items, garder la section visible avec son titre seulement
                if (!Array.isArray(section.items) || section.items.length === 0) {
                    return;
                }

                // Créer le corps de la section (accordéon ou simple)
                const sectionBody = isCollapsible ?
                    global.L.DomUtil.create("div", "gl-layer-manager__accordion-body", sectionEl) :
                    sectionEl;

                // Section basemap : déléguer au BasemapSelector
                if (section.id === "basemap") {
                    if (GeoLeaf._LayerManagerBasemapSelector) {
                        GeoLeaf._LayerManagerBasemapSelector.render(section, sectionBody);
                    }
                } else {
                    // Autres sections : rendre les items
                    this._renderItems(section, sectionBody);
                }
            });

            // Synchroniser immédiatement les boutons de labels après re-render
            if (GeoLeaf._LabelButtonManager && GeoLeaf._GeoJSONLayerManager) {
                const allLayers = GeoLeaf._GeoJSONLayerManager._layers || new Map();
                allLayers.forEach((layerData, layerId) => {
                    if (layerData.currentStyle) {
                        GeoLeaf._LabelButtonManager.syncImmediate(layerId);
                    }
                });
            }
        },

        /**
         * Synchronise l'état des toggles existants sans re-générer le DOM
         * Utilisé après l'application d'un thème pour mettre à jour les toggles
         * @public
         */
        syncToggles() {
            // Trouver tous les items de couche dans le DOM
            const layerItems = document.querySelectorAll('[data-layer-id]');

            if (Log) Log.debug(`[LayerManager Renderer] Synchronisation de ${layerItems.length} toggles`);

            layerItems.forEach(itemEl => {
                const layerId = itemEl.getAttribute('data-layer-id');
                if (!layerId) return;

                // Récupérer les infos de visibilité pour le log
                const layerData = global.GeoLeaf?.GeoJSON?.getLayerById(layerId);
                const isVisible = this._checkLayerVisibility(layerId);

                if (Log) Log.debug(`[LayerManager Renderer] Couche ${layerId}:`, {
                    isVisible,
                    hasLayerData: !!layerData,
                    hasVisibility: !!(layerData && layerData._visibility),
                    currentValue: layerData?._visibility?.current,
                    onMap: layerData?.layer ? global.GeoLeaf._GeoJSONShared?.state?.map?.hasLayer(layerData.layer) : false
                });

                // Mettre à jour la classe gl-layer--hidden
                if (isVisible) {
                    itemEl.classList.remove('gl-layer--hidden');
                } else {
                    itemEl.classList.add('gl-layer--hidden');
                }

                // Trouver et mettre à jour le toggle button
                const toggleBtn = itemEl.querySelector('.gl-layer-manager__item-toggle');
                if (toggleBtn) {
                    toggleBtn.setAttribute('aria-pressed', isVisible ? 'true' : 'false');

                    // Harmoniser avec createToggleButton: suffixe "--on"
                    const onClass = 'gl-layer-manager__item-toggle--on';
                    if (isVisible) {
                        toggleBtn.classList.add(onClass);
                    } else {
                        toggleBtn.classList.remove(onClass);
                    }
                }
            });

            if (Log) Log.debug("[LayerManager Renderer] États des toggles synchronisés");
        },

        /**
         * Rend les items d'une section
         * @private
         */
        _renderItems(section, sectionEl) {
            const listEl = global.L.DomUtil.create(
                "div",
                "gl-layer-manager__items",
                sectionEl
            );

            section.items.forEach((item) => {
                const itemEl = global.L.DomUtil.create(
                    "div",
                    "gl-layer-manager__item",
                    listEl
                );

                // Ajouter l'attribut data-layer-id pour faciliter la recherche DOM
                if (item.id) {
                    itemEl.setAttribute("data-layer-id", item.id);

                    // Ajouter la classe gl-layer--hidden si la couche n'est pas visible au chargement
                    const isVisible = this._checkLayerVisibility(item.id);
                    if (!isVisible) {
                        itemEl.classList.add("gl-layer--hidden");
                    }
                }

                // Conteneur de la ligne principale (toujours créé pour le layout en colonne)
                const mainRow = global.L.DomUtil.create("div", "gl-layer-manager__item-row", itemEl);

                // Libellé
                const labelEl = global.L.DomUtil.create(
                    "span",
                    "gl-layer-manager__label",
                    mainRow
                );
                labelEl.textContent = item.label || "";

                // Toggle d'affichage pour les couches toggleable
                if (item.toggleable && item.id) {
                    this._renderToggleControls(item, mainRow, itemEl);
                } else if (item.id) {
                    // Même pour les couches non-toggleable, créer le bouton label
                    const controlsContainer = global.L.DomUtil.create(
                        "div",
                        "gl-layer-manager__item-controls",
                        mainRow
                    );

                    // Créer le bouton de label
                    if (global.GeoLeaf && global.GeoLeaf._LabelButtonManager) {
                        global.GeoLeaf._LabelButtonManager.createButton(item.id, controlsContainer);
                        global.GeoLeaf._LabelButtonManager.syncImmediate(item.id);
                    }
                } else {
                    // Valeur/info complémentaire pour items sans ID
                    if (typeof item.value !== "undefined") {
                        const valueEl = global.L.DomUtil.create(
                            "span",
                            "gl-layer-manager__value",
                            itemEl
                        );
                        valueEl.textContent = String(item.value);
                    }
                }
            });
        },

        /**
         * Rend les contrôles toggle pour un item
         * @private
         */
        _renderToggleControls(item, mainRow, itemEl) {
            // Conteneur des contrôles (toggle + flèche thème)
            const controlsContainer = global.L.DomUtil.create(
                "div",
                "gl-layer-manager__item-controls",
                mainRow
            );

            // Créer le bouton de label via le gestionnaire centralisé
            if (global.GeoLeaf && global.GeoLeaf._LabelButtonManager) {
                global.GeoLeaf._LabelButtonManager.createButton(item.id, controlsContainer);
                global.GeoLeaf._LabelButtonManager.syncImmediate(item.id);
            }

            // Vérifier l'état initial
            const isActive = this._checkLayerVisibility(item.id);

            const toggleBtn = GeoLeaf._UIComponents && typeof GeoLeaf._UIComponents.createToggleButton === 'function'
                ? GeoLeaf._UIComponents.createToggleButton(controlsContainer, {
                    isActive: isActive,
                    className: "gl-layer-manager__item-toggle",
                    title: "Afficher / masquer la couche"
                })
                : this._createToggleFallback(controlsContainer, isActive);

            // Attacher le gestionnaire de toggle
            this._attachToggleHandler(toggleBtn, item.id);

            // Sélecteur de styles si disponible
            if (item.styles && GeoLeaf._LayerManagerStyleSelector) {
                const styleElement = GeoLeaf._LayerManagerStyleSelector.renderDOM(item);
                if (styleElement) {
                    itemEl.appendChild(styleElement);
                    GeoLeaf._LayerManagerStyleSelector.bindEvents(styleElement, item);
                }
            }
        },

        /**
         * Vérifie si une couche est visible
         * @private
         */
        _checkLayerVisibility(layerId) {
            try {
                if (layerId && global.GeoLeaf && global.GeoLeaf.GeoJSON && typeof global.GeoLeaf.GeoJSON.getLayerById === "function") {
                    const layerData = global.GeoLeaf.GeoJSON.getLayerById(layerId);

                    // IMPORTANT: Utiliser logicalState (état du bouton ON/OFF) au lieu de current (état physique sur carte)
                    // Le bouton doit refléter l'intention de l'utilisateur/thème, pas les contraintes de zoom
                    const logicalState = layerData && layerData._visibility && typeof layerData._visibility.logicalState === 'boolean'
                        ? layerData._visibility.logicalState
                        : (layerData && layerData.visible === true);

                    const result = logicalState;

                    if (Log) {
                        Log.debug(`[LayerManager Renderer] _checkLayerVisibility(${layerId}): logicalState=${logicalState}`);
                    }

                    return result;
                }
            } catch (e) {
                if (Log) Log.error("[LayerManager Renderer] Erreur dans _checkLayerVisibility:", e);
            }
            return false;
        },

        /**
         * Attache le gestionnaire de toggle pour une couche
         * @private
         */
        _attachToggleHandler(toggleBtn, itemId) {
            // GUARD: Vérifier si un gestionnaire est déjà attaché
            if (toggleBtn._toggleHandlerAttached) {
                return;
            }

            // Marquer comme attaché AVANT de créer le gestionnaire
            toggleBtn._toggleHandlerAttached = true;

            const self = this;

            const onToggle = function (ev) {
                // EMPÊCHER LES MULTIPLES CLICS EN PREMIER
                if (toggleBtn._isToggling) {
                    if (Log) Log.warn("[LayerManager] ⏸️ Toggle DÉJÀ en cours, BLOQUÉ:", itemId);
                    if (global.L && global.L.DomEvent) {
                        global.L.DomEvent.stopPropagation(ev);
                        global.L.DomEvent.preventDefault(ev);
                    }
                    return; // SORTIR IMMÉDIATEMENT
                }

                // Marquer comme en cours IMMÉDIATEMENT
                toggleBtn._isToggling = true;

                // Arrêter la propagation
                if (global.L && global.L.DomEvent) {
                    global.L.DomEvent.stopPropagation(ev);
                    global.L.DomEvent.preventDefault(ev);
                }

                // Réinitialiser après 100ms (juste pour empêcher les double-clics rapides)
                setTimeout(() => {
                    toggleBtn._isToggling = false;
                }, 100);

                try {
                    if (itemId && global.GeoLeaf && global.GeoLeaf.GeoJSON) {
                        const layerData = global.GeoLeaf.GeoJSON.getLayerById(itemId);

                        // Si la couche n'est pas encore chargée, la charger à la demande
                        if (!layerData) {
                            if (Log) Log.info("[LayerManager] ⏳ Couche non chargée, chargement à la demande:", itemId);

                            // Indicateur visuel de chargement
                            toggleBtn.classList.add("gl-layer-manager__item-toggle--loading");
                            toggleBtn.disabled = true;

                            const ThemeApplier = global.GeoLeaf._ThemeApplier;
                            if (ThemeApplier && typeof ThemeApplier._loadLayerFromProfile === "function") {
                                ThemeApplier._loadLayerFromProfile(itemId).then(function (loadedLayer) {
                                    // Retirer l'indicateur de chargement
                                    toggleBtn.classList.remove("gl-layer-manager__item-toggle--loading");
                                    toggleBtn.disabled = false;

                                    if (loadedLayer) {
                                        if (Log) Log.info("[LayerManager] ✅ Couche chargée avec succès:", itemId);

                                        // Afficher la couche via le gestionnaire standard
                                        global.GeoLeaf.GeoJSON.showLayer(itemId);

                                        // Mettre à jour l'UI du toggle
                                        toggleBtn.setAttribute("aria-pressed", "true");
                                        toggleBtn.classList.add("gl-layer-manager__item-toggle--on");

                                        const layerItem = document.querySelector('[data-layer-id="' + itemId + '"]');
                                        if (layerItem) {
                                            layerItem.classList.remove("gl-layer--hidden");
                                        }

                                        // Réactiver le bouton label si applicable
                                        let labelBtn = null;
                                        if (layerItem) {
                                            labelBtn = layerItem.querySelector('.gl-layer-manager__label-toggle');
                                        }
                                        if (!labelBtn && toggleBtn.parentElement) {
                                            labelBtn = toggleBtn.parentElement.querySelector('.gl-layer-manager__label-toggle');
                                        }
                                        if (labelBtn) {
                                            const ld = global.GeoLeaf?.GeoJSON?.getLayerById?.(itemId);
                                            const labelEnabled = ld?.currentStyle?.label?.enabled === true;
                                            if (labelEnabled) {
                                                labelBtn.disabled = false;
                                                labelBtn.classList.remove("gl-layer-manager__label-toggle--disabled");
                                            }
                                        }
                                    } else {
                                        if (Log) Log.warn("[LayerManager] ❌ Échec du chargement de la couche:", itemId);
                                    }
                                }).catch(function (err) {
                                    toggleBtn.classList.remove("gl-layer-manager__item-toggle--loading");
                                    toggleBtn.disabled = false;
                                    if (Log) Log.error("[LayerManager] Erreur lors du chargement de la couche:", itemId, err);
                                });
                            } else {
                                toggleBtn.classList.remove("gl-layer-manager__item-toggle--loading");
                                toggleBtn.disabled = false;
                                if (Log) Log.warn("[LayerManager] ThemeApplier non disponible pour charger:", itemId);
                            }
                            return;
                        }

                        const isCurrentlyVisible = self._checkLayerVisibility(itemId);

                        // Trouver le layerItem pour ajouter/retirer la classe CSS
                        const layerItem = document.querySelector(`[data-layer-id="${itemId}"]`);

                        if (isCurrentlyVisible) {
                            // Masquer la couche
                            global.GeoLeaf.GeoJSON.hideLayer(itemId);
                            toggleBtn.setAttribute("aria-pressed", "false");
                            toggleBtn.classList.remove("gl-layer-manager__item-toggle--on");

                            // Ajouter la classe gl-layer--hidden
                            if (layerItem) {
                                layerItem.classList.add("gl-layer--hidden");
                            }

                            // Désactiver immédiatement le bouton label (couche cachée)
                            // Chercher dans tout le layerItem, pas juste les enfants directs
                            let labelBtn = null;
                            if (layerItem) {
                                labelBtn = layerItem.querySelector('.gl-layer-manager__label-toggle');
                            }
                            // Fallback: chercher via le sibling du toggle button (même container)
                            if (!labelBtn && toggleBtn.parentElement) {
                                labelBtn = toggleBtn.parentElement.querySelector('.gl-layer-manager__label-toggle');
                            }
                            if (labelBtn) {
                                labelBtn.disabled = true;
                                labelBtn.classList.add("gl-layer-manager__label-toggle--disabled");
                                labelBtn.classList.remove("gl-layer-manager__label-toggle--on");
                                labelBtn.setAttribute("aria-pressed", "false");
                            } else {
                                if (Log) Log.warn("[LayerManager] Bouton label NON TROUVÉ pour désactivation:", itemId);
                            }
                        } else {
                            // Afficher la couche
                            global.GeoLeaf.GeoJSON.showLayer(itemId);
                            toggleBtn.setAttribute("aria-pressed", "true");
                            toggleBtn.classList.add("gl-layer-manager__item-toggle--on");

                            // Retirer la classe gl-layer--hidden
                            if (layerItem) {
                                layerItem.classList.remove("gl-layer--hidden");
                            }

                            // Réactiver le bouton label
                            let labelBtn = null;
                            if (layerItem) {
                                labelBtn = layerItem.querySelector('.gl-layer-manager__label-toggle');
                            }
                            if (!labelBtn && toggleBtn.parentElement) {
                                labelBtn = toggleBtn.parentElement.querySelector('.gl-layer-manager__label-toggle');
                            }
                            if (labelBtn) {
                                // Vérifier si label.enabled dans le style avant de réactiver
                                const ld = global.GeoLeaf?.GeoJSON?.getLayerById?.(itemId);
                                const labelEnabled = ld?.currentStyle?.label?.enabled === true;
                                if (labelEnabled) {
                                    labelBtn.disabled = false;
                                    labelBtn.classList.remove("gl-layer-manager__label-toggle--disabled");
                                }
                            }
                        }
                    }
                } catch (err) {
                    if (Log) Log.warn("Erreur toggle légende :", err);
                }
            };

            // TEMPORAIREMENT: utiliser uniquement L.DomEvent pour déboguer
            if (global.L && global.L.DomEvent) {
                global.L.DomEvent.on(toggleBtn, "click", onToggle);
                global.L.DomEvent.disableClickPropagation(toggleBtn);
            } else {
                toggleBtn.addEventListener("click", onToggle);
            }

            // Ancienne version avec _UIComponents (désactivé pour debug)
            // if (GeoLeaf._UIComponents && typeof GeoLeaf._UIComponents.attachEventHandler === 'function') {
            //     GeoLeaf._UIComponents.attachEventHandler(toggleBtn, "click", onToggle);
            // } else if (global.L && global.L.DomEvent) {
            //     global.L.DomEvent.on(toggleBtn, "click", onToggle);
            // } else {
            //     toggleBtn.addEventListener("click", onToggle);
            // }
        },

        /**
         * Fallback pour créer un toggle button si _UIComponents non disponible
         * @private
         */
        _createToggleFallback(container, isActive) {
            const toggleBtn = global.L.DomUtil.create("button", "gl-layer-manager__item-toggle", container);
            toggleBtn.type = "button";
            toggleBtn.setAttribute("aria-pressed", isActive ? "true" : "false");
            toggleBtn.title = "Afficher / masquer la couche";
            if (isActive) {
                toggleBtn.classList.add("gl-layer-manager__item-toggle--on");
            }
            return toggleBtn;
        },

        /**
         * Crée le bouton de labels pour une couche (appelé lors de l'application d'un style)
         * @param {string} layerId - ID de la couche
         */
    };

    // Exposer dans l'espace de noms interne
    GeoLeaf._LayerManagerRenderer = _LayerManagerRenderer;

})(window);
