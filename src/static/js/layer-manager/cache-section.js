/**
 * Module LayerManager - Cache Section
 *
 * Ajoute une section de gestion du cache offline dans le gestionnaire de couches.
 * Permet de télécharger/effacer le cache du profil actif.
 *
 * @module GeoLeaf.LayerManager.CacheSection
 * @version 3.0.0
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;

    /**
     * Module de section cache pour la légende
     */
    const CacheSection = {
        /**
         * Génère la section HTML du cache
         *
         * @returns {Object} Section configuration
         */
        generateSection() {
            return {
                id: "offline-cache",
                label: "📥 Cache Hors Ligne",
                order: 98,
                collapsedByDefault: false,
                customContent: this._generateContent(),
                init: () => this._attachEventListeners()
            };
        },

        /**
         * Génère le contenu HTML
         * @private
         */
        _generateContent() {
            return `
                <div class="gl-cache-section">
                    <div class="gl-cache-status">
                        <div class="gl-cache-status__header">
                            <span class="gl-cache-status__icon">💾</span>
                            <span class="gl-cache-status__label">Statut</span>
                        </div>
                        <div class="gl-cache-status__info">
                            <div class="gl-cache-status__row">
                                <span class="gl-cache-status__key">Profil:</span>
                                <span class="gl-cache-status__value" id="gl-cache-profile">-</span>
                            </div>
                            <div class="gl-cache-status__row">
                                <span class="gl-cache-status__key">État:</span>
                                <span class="gl-cache-status__value" id="gl-cache-state">Non téléchargé</span>
                            </div>
                            <div class="gl-cache-status__row">
                                <span class="gl-cache-status__key">Taille:</span>
                                <span class="gl-cache-status__value" id="gl-cache-size">0 MB</span>
                            </div>
                            <div class="gl-cache-status__row">
                                <span class="gl-cache-status__key">Quota:</span>
                                <span class="gl-cache-status__value" id="gl-cache-quota">0 MB disponible</span>
                            </div>
                        </div>
                    </div>

                    <div class="gl-cache-actions">
                        <button
                            id="gl-cache-download"
                            class="gl-btn gl-btn--primary gl-cache-btn"
                            title="Télécharger le profil pour usage offline">
                            <span class="gl-btn__icon">⬇️</span>
                            <span class="gl-btn__text">Télécharger profil</span>
                        </button>

                        <button
                            id="gl-cache-clear"
                            class="gl-btn gl-btn--secondary gl-cache-btn"
                            title="Effacer le cache du profil"
                            disabled>
                            <span class="gl-btn__icon">🗑️</span>
                            <span class="gl-btn__text">Vider cache</span>
                        </button>
                    </div>

                    <div class="gl-cache-progress" id="gl-cache-progress" style="display: none;">
                        <div class="gl-cache-progress__bar">
                            <div class="gl-cache-progress__fill" id="gl-cache-progress-fill"></div>
                        </div>
                        <div class="gl-cache-progress__text" id="gl-cache-progress-text">
                            Téléchargement en cours...
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Attache les event listeners
         * @private
         */
        _attachEventListeners() {
            const downloadBtn = document.getElementById("gl-cache-download");
            const clearBtn = document.getElementById("gl-cache-clear");

            if (downloadBtn) {
                downloadBtn.addEventListener("click", () => this._handleDownload());
            }

            if (clearBtn) {
                clearBtn.addEventListener("click", () => this._handleClear());
            }

            // Mettre à jour le statut initial
            this._updateStatus();

            // Écouter les événements de cache
            document.addEventListener("geoleaf:cache:completed", () => this._updateStatus());
            document.addEventListener("geoleaf:cache:cleared", () => this._updateStatus());
            document.addEventListener("geoleaf:profile:loaded", () => this._updateStatus());
        },

        /**
         * Met à jour l'affichage du statut
         * @private
         */
        async _updateStatus() {
            if (!GeoLeaf.Storage || !GeoLeaf.Storage.isAvailable()) {
                return;
            }

            try {
                const profileId = GeoLeaf.Config.get("data.activeProfile", "");
                const status = await GeoLeaf.Storage.CacheManager.getCacheStatus(profileId);
                const quota = await GeoLeaf.Storage.CacheManager.getStorageQuota();

                // Mettre à jour les éléments DOM
                const profileEl = document.getElementById("gl-cache-profile");
                const stateEl = document.getElementById("gl-cache-state");
                const sizeEl = document.getElementById("gl-cache-size");
                const quotaEl = document.getElementById("gl-cache-quota");
                const clearBtn = document.getElementById("gl-cache-clear");

                if (profileEl) profileEl.textContent = profileId || "-";

                if (status && status.resourcesCount > 0) {
                    if (stateEl) {
                        stateEl.textContent = "✅ Téléchargé";
                        stateEl.style.color = "#22c55e";
                    }
                    if (sizeEl) {
                        sizeEl.textContent = `${(status.totalSize / 1024 / 1024).toFixed(2)} MB`;
                    }
                    if (clearBtn) clearBtn.disabled = false;
                } else {
                    if (stateEl) {
                        stateEl.textContent = "❌ Non téléchargé";
                        stateEl.style.color = "#ef4444";
                    }
                    if (sizeEl) sizeEl.textContent = "0 MB";
                    if (clearBtn) clearBtn.disabled = true;
                }

                if (quotaEl) {
                    quotaEl.textContent = `${(quota.available / 1024 / 1024).toFixed(2)} MB disponible`;
                }

            } catch (error) {
                Log.error(`[CacheSection] Failed to update status: ${error.message}`);
            }
        },

        /**
         * Gère le téléchargement du profil
         * @private
         */
        async _handleDownload() {
            if (!GeoLeaf.Storage || !GeoLeaf.Storage.isAvailable()) {
                if (GeoLeaf.UI && GeoLeaf.UI.Notifications) {
                    GeoLeaf.UI.Notifications.error(
                        "Stockage offline non disponible",
                        5000
                    );
                }
                return;
            }

            const profileId = GeoLeaf.Config.get("data.activeProfile", "");
            if (!profileId) {
                if (GeoLeaf.UI && GeoLeaf.UI.Notifications) {
                    GeoLeaf.UI.Notifications.error(
                        "Aucun profil actif",
                        3000
                    );
                }
                return;
            }

            const downloadBtn = document.getElementById("gl-cache-download");
            const progressEl = document.getElementById("gl-cache-progress");
            const progressText = document.getElementById("gl-cache-progress-text");

            try {
                // Désactiver le bouton
                if (downloadBtn) {
                    downloadBtn.disabled = true;
                    downloadBtn.querySelector(".gl-btn__text").textContent = "Téléchargement...";
                }

                // Afficher la barre de progression
                if (progressEl) progressEl.style.display = "block";
                if (progressText) progressText.textContent = "Préparation...";

                Log.info(`[CacheSection] Starting download for profile: ${profileId}`);

                // Télécharger le profil
                const result = await GeoLeaf.Storage.downloadProfileForOffline(profileId);

                if (progressText) {
                    progressText.textContent = `✅ ${result.resourcesCount} ressources téléchargées`;
                }

                // Notification de succès
                if (GeoLeaf.UI && GeoLeaf.UI.Notifications) {
                    GeoLeaf.UI.Notifications.success(
                        `Profil téléchargé : ${(result.totalSize / 1024 / 1024).toFixed(2)} MB`,
                        4000
                    );
                }

                // Masquer la progression après 2s
                setTimeout(() => {
                    if (progressEl) progressEl.style.display = "none";
                }, 2000);

                await this._updateStatus();

            } catch (error) {
                Log.error(`[CacheSection] Download failed: ${error.message}`);

                if (progressText) progressText.textContent = `❌ Erreur: ${error.message}`;

                if (GeoLeaf.UI && GeoLeaf.UI.Notifications) {
                    GeoLeaf.UI.Notifications.error(
                        `Erreur téléchargement: ${error.message}`,
                        5000
                    );
                }

                setTimeout(() => {
                    if (progressEl) progressEl.style.display = "none";
                }, 3000);

            } finally {
                // Réactiver le bouton
                if (downloadBtn) {
                    downloadBtn.disabled = false;
                    downloadBtn.querySelector(".gl-btn__text").textContent = "Télécharger profil";
                }
            }
        },

        /**
         * Gère l'effacement du cache
         * @private
         */
        async _handleClear() {
            if (!GeoLeaf.Storage || !GeoLeaf.Storage.isAvailable()) {
                return;
            }

            const profileId = GeoLeaf.Config.get("data.activeProfile", "");
            if (!profileId) {
                return;
            }

            // Confirmation
            if (!confirm(`Voulez-vous vraiment effacer le cache du profil "${profileId}" ?`)) {
                return;
            }

            const clearBtn = document.getElementById("gl-cache-clear");

            try {
                if (clearBtn) {
                    clearBtn.disabled = true;
                    clearBtn.querySelector(".gl-btn__text").textContent = "Effacement...";
                }

                Log.info(`[CacheSection] Clearing cache for profile: ${profileId}`);

                const deleted = await GeoLeaf.Storage.CacheManager.clearCache(profileId);

                if (GeoLeaf.UI && GeoLeaf.UI.Notifications) {
                    GeoLeaf.UI.Notifications.success(
                        `Cache effacé : ${deleted} ressources supprimées`,
                        3000
                    );
                }

                await this._updateStatus();

            } catch (error) {
                Log.error(`[CacheSection] Clear failed: ${error.message}`);

                if (GeoLeaf.UI && GeoLeaf.UI.Notifications) {
                    GeoLeaf.UI.Notifications.error(
                        `Erreur effacement: ${error.message}`,
                        5000
                    );
                }
            } finally {
                if (clearBtn) {
                    clearBtn.querySelector(".gl-btn__text").textContent = "Vider cache";
                }
            }
        }
    };

    // Exposer le module
    GeoLeaf._LayerManagerCacheSection = CacheSection;

})(window);
