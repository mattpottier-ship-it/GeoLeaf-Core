/**
 * Gestionnaire centralisé pour le bouton de label dans le Layer Manager
 *
 * RESPONSABILITÉS:
 * - Créer le bouton de label lors du premier render d'une couche
 * - Synchroniser l'état du bouton (activé/désactivé, actif/inactif)
 * - Source unique de vérité pour la logique de décision
 *
 * LOGIQUE SIMPLIFIÉE:
 * - Le bouton est TOUJOURS visible pour toutes les couches
 * - Si couche visible ET label.enabled: true → bouton cliquable
 * - Sinon → bouton désactivé (grisé)
 * - État actif/inactif selon si les labels sont actuellement affichés
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
    const Log = GeoLeaf.Log;

    /**
     * Gestionnaire de boutons de label
     */
    const LabelButtonManager = {
        /**
         * Crée le bouton de label pour une couche
         * Appelé uniquement lors du premier render du layer manager
         * @param {string} layerId - ID de la couche
         * @param {HTMLElement} controlsContainer - Conteneur des contrôles
         * @returns {HTMLElement|null} Le bouton créé ou null si échec
         */
        createButton(layerId, controlsContainer) {
            if (!layerId || !controlsContainer) {
                if (Log) Log.warn("[LabelButtonManager] createButton: paramètres manquants", {layerId, hasContainer: !!controlsContainer});
                return null;
            }

            // Vérifier si le bouton existe déjà
            const existingButton = controlsContainer.querySelector('.gl-layer-manager__label-toggle');
            if (existingButton) {
                if (Log) Log.debug("[LabelButtonManager] Bouton déjà existant pour:", layerId);
                return existingButton;
            }

            if (Log) Log.debug("[LabelButtonManager] Création du bouton pour:", layerId);

            // Créer le bouton (toujours visible, sera activé/désactivé selon label.enabled)
            const labelToggle = global.L.DomUtil.create("button", "gl-layer-manager__label-toggle");
            labelToggle.type = "button";
            labelToggle.setAttribute("aria-label", "Afficher/masquer les étiquettes");
            // Désactivé par défaut jusqu'à la synchronisation
            labelToggle.disabled = true;
            labelToggle.classList.add("gl-layer-manager__label-toggle--disabled");

            const iconSpan = document.createElement("span");
            iconSpan.className = "gl-layer-manager__label-toggle-icon";
            iconSpan.textContent = "🏷️";
            labelToggle.appendChild(iconSpan);
            labelToggle.title = "Afficher/masquer les étiquettes";

            // Gestionnaire de clic
            const onLabelToggle = function (ev) {
                if (global.L && global.L.DomEvent) global.L.DomEvent.stopPropagation(ev);
                ev.preventDefault();

                if (labelToggle.disabled) return;

                try {
                    // Vérifier que le style actuel autorise les labels
                    const layerData = global.GeoLeaf?.GeoJSON?.getLayerById?.(layerId);
                    const labelEnabled = layerData?.currentStyle?.label?.enabled === true;

                    if (!labelEnabled) {
                        if (Log) Log.warn("[LabelButtonManager] Impossible d'afficher les labels: le style actuel a label.enabled=false");
                        return;
                    }

                    // Toggle les labels
                    if (global.GeoLeaf?.Labels?.toggleLabels) {
                        const newState = global.GeoLeaf.Labels.toggleLabels(layerId);

                        // Mettre à jour l'état visuel du bouton IMMÉDIATEMENT
                        if (newState) {
                            labelToggle.classList.add("gl-layer-manager__label-toggle--on");
                            labelToggle.setAttribute("aria-pressed", "true");
                        } else {
                            labelToggle.classList.remove("gl-layer-manager__label-toggle--on");
                            labelToggle.setAttribute("aria-pressed", "false");
                        }
                    }
                } catch (err) {
                    if (Log) Log.warn("[LabelButtonManager] Erreur lors du toggle des labels:", err);
                }
            };

            // Attacher le gestionnaire
            if (GeoLeaf._UIComponents && typeof GeoLeaf._UIComponents.attachEventHandler === 'function') {
                GeoLeaf._UIComponents.attachEventHandler(labelToggle, "click", onLabelToggle);
            } else if (global.L && global.L.DomEvent) {
                global.L.DomEvent.on(labelToggle, "click", onLabelToggle);
                global.L.DomEvent.disableClickPropagation(labelToggle);
            } else {
                labelToggle.addEventListener("click", onLabelToggle);
            }

            // Insérer le bouton avant le toggle de visibilité
            const visibilityToggle = controlsContainer.querySelector('.gl-layer-manager__item-toggle');
            if (visibilityToggle) {
                controlsContainer.insertBefore(labelToggle, visibilityToggle);
            } else {
                controlsContainer.appendChild(labelToggle);
            }

            if (Log) Log.debug("[LabelButtonManager] Bouton créé avec succès:", layerId);

            return labelToggle;
        },

        /**
         * Synchronise l'état du bouton de label
         * UNIQUE POINT D'ENTRÉE pour mettre à jour le bouton
         * @param {string} layerId - ID de la couche
         */
        sync(layerId) {
            if (!layerId) return;

            // Débounce pour éviter les mises à jour trop fréquentes
            if (this._syncTimeouts && this._syncTimeouts.has(layerId)) {
                clearTimeout(this._syncTimeouts.get(layerId));
            }

            if (!this._syncTimeouts) {
                this._syncTimeouts = new Map();
            }

            const timeout = setTimeout(() => {
                this._syncTimeouts.delete(layerId);
                this._doSync(layerId);
            }, 300);

            this._syncTimeouts.set(layerId, timeout);
        },

        /**
         * Exécute la synchronisation immédiate (méthode interne)
         * @private
         */
        _doSync(layerId) {
            if (!layerId) return;

            // Trouver le bouton - chercher directement dans tout le document
            // car le Layer Manager peut recréer des éléments
            let button = document.querySelector(`[data-layer-id="${layerId}"] .gl-layer-manager__label-toggle`);

            if (!button) {
                // Fallback: chercher le layerItem et créer le bouton si nécessaire
                const layerItem = document.querySelector(`[data-layer-id="${layerId}"]`);
                if (!layerItem) {
                    if (Log) Log.debug("[LabelButtonManager] LayerItem non trouvé (pas encore rendu):", layerId);
                    return;
                }

                const controlsContainer = layerItem.querySelector('.gl-layer-manager__item-controls');
                if (controlsContainer) {
                    // Vérifier si le bouton existe déjà dans controls
                    button = controlsContainer.querySelector('.gl-layer-manager__label-toggle');
                    if (!button) {
                        if (Log) Log.debug("[LabelButtonManager] Bouton manquant dans controls, création à la volée pour:", layerId);
                        button = this.createButton(layerId, controlsContainer);
                    }
                } else {
                    if (Log) Log.debug("[LabelButtonManager] Bouton et controlsContainer non trouvés pour:", layerId);
                    return;
                }
            }

            if (!button) {
                if (Log) Log.debug("[LabelButtonManager] Bouton non trouvé après toutes tentatives:", layerId);
                return;
            }

            // Collecter l'état actuel
            const state = this._getState(layerId);

            // Appliquer la logique de décision
            this._applyState(button, state);
        },

        /**
         * Collecte l'état actuel de tous les composants
         * @private
         */
        _getState(layerId) {
            const layerData = global.GeoLeaf?.GeoJSON?.getLayerById?.(layerId);

            const state = {
                layerId: layerId,
                layerExists: !!layerData,
                layerVisible: layerData?._visibility?.current === true,
                labelEnabled: layerData?.currentStyle?.label?.enabled === true,
                areLabelsActive: global.GeoLeaf?.Labels?.areLabelsEnabled?.(layerId) || false
            };

            return state;
        },

        /**
         * Applique l'état au bouton selon la logique simplifiée
         * RÈGLES:
         * - Bouton TOUJOURS visible
         * - Si label.enabled: true ET couche visible → bouton activé
         * - Sinon → bouton désactivé (grisé)
         * - État actif/inactif selon si les labels sont affichés
         * @private
         */
        _applyState(button, state) {
            // Bouton cliquable uniquement si la couche est visible et que le style autorise les labels
            const canUseLabels = state.labelEnabled && state.layerVisible;

            if (canUseLabels) {
                // Activer le bouton
                button.disabled = false;
                button.classList.remove("gl-layer-manager__label-toggle--disabled");

                // Appliquer l'état actif/inactif
                const shouldAppearOn = state.areLabelsActive && state.layerVisible;

                if (shouldAppearOn) {
                    button.classList.add("gl-layer-manager__label-toggle--on");
                    button.setAttribute("aria-pressed", "true");
                } else {
                    button.classList.remove("gl-layer-manager__label-toggle--on");
                    button.setAttribute("aria-pressed", "false");
                }
            } else {
                // Désactiver le bouton
                button.disabled = true;
                button.classList.add("gl-layer-manager__label-toggle--disabled");
                button.classList.remove("gl-layer-manager__label-toggle--on");
                button.setAttribute("aria-pressed", "false");
            }
        },

        /**
         * Synchronise immédiatement sans debouncing
         * Utilisé pour les cas où une réponse immédiate est nécessaire
         * @param {string} layerId - ID de la couche
         */
        syncImmediate(layerId) {
            if (!layerId) return;

            // Annuler tout debounce en cours
            if (this._syncTimeouts && this._syncTimeouts.has(layerId)) {
                clearTimeout(this._syncTimeouts.get(layerId));
                this._syncTimeouts.delete(layerId);
            }

            // Exécuter immédiatement
            this._doSync(layerId);
        }
    };

    // Exposer dans l'espace de noms interne
    GeoLeaf._LabelButtonManager = LabelButtonManager;

    if (Log) Log.debug("[LabelButtonManager] Module initialisé");

})(window);
