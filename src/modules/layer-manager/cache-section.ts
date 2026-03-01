/**
 * Module LayerManager - Cache Section
 *
 * Ajoute une section de gestion du cache offline dans le gestionnaire de couches.
 * Permet de télécharger/effacer le cache du profil actif.
 *
 * @module GeoLeaf.LayerManager.CacheSection
 * @version 3.0.0
 */

"use strict";

import { Log } from "../log/index.js";
import { Config } from "../config/config-primitives.js";
import { StorageContract } from "../shared/storage-contract.js";
import { _UINotifications } from "../ui/notifications.js";

export interface CacheSectionConfig {
    id: string;
    label: string;
    order: number;
    collapsedByDefault: boolean;
    customContent: string;
    init: () => void;
}

const CacheSection = {
    generateSection(this: { _generateContent: () => string; _attachEventListeners: () => void }): CacheSectionConfig {
        return {
            id: "offline-cache",
            label: "📥 Cache Hors Ligne",
            order: 98,
            collapsedByDefault: false,
            customContent: this._generateContent(),
            init: () => this._attachEventListeners(),
        };
    },

    _generateContent(): string {
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

    _attachEventListeners(this: { _handleDownload: () => Promise<void>; _handleClear: () => Promise<void>; _updateStatus: () => Promise<void> }) {
        const downloadBtn = document.getElementById("gl-cache-download");
        const clearBtn = document.getElementById("gl-cache-clear");

        if (downloadBtn) {
            downloadBtn.addEventListener("click", () => this._handleDownload());
        }

        if (clearBtn) {
            clearBtn.addEventListener("click", () => this._handleClear());
        }

        this._updateStatus();

        document.addEventListener("geoleaf:cache:completed", () => this._updateStatus());
        document.addEventListener("geoleaf:cache:cleared", () => this._updateStatus());
        document.addEventListener("geoleaf:profile:loaded", () => this._updateStatus());
    },

    async _updateStatus(): Promise<void> {
        if (!StorageContract.isAvailable()) {
            return;
        }

        try {
            const profileId = (Config as unknown as { get: (path: string, defaultVal?: string) => string }).get("data.activeProfile", "");
            const status = await (StorageContract.CacheManager as { getCacheStatus: (id: string) => Promise<{ resourcesCount: number; totalSize: number }> }).getCacheStatus(profileId);
            const quota = await (StorageContract.CacheManager as { getStorageQuota: () => Promise<{ available: number }> }).getStorageQuota();

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
                if (clearBtn) (clearBtn as HTMLButtonElement).disabled = false;
            } else {
                if (stateEl) {
                    stateEl.textContent = "❌ Non téléchargé";
                    stateEl.style.color = "#ef4444";
                }
                if (sizeEl) sizeEl.textContent = "0 MB";
                if (clearBtn) (clearBtn as HTMLButtonElement).disabled = true;
            }

            if (quotaEl) {
                quotaEl.textContent = `${(quota.available / 1024 / 1024).toFixed(2)} MB disponible`;
            }
        } catch (error) {
            Log.error(`[CacheSection] Failed to update status: ${(error as Error).message}`);
        }
    },

    async _handleDownload(): Promise<void> {
        if (!StorageContract.isAvailable()) {
            _UINotifications.error("Stockage offline non disponible", 5000);
            return;
        }

        const profileId = (Config as unknown as { get: (path: string, defaultVal?: string) => string }).get("data.activeProfile", "");
        if (!profileId) {
            _UINotifications.error("Aucun profil actif", 3000);
            return;
        }

        const downloadBtn = document.getElementById("gl-cache-download");
        const progressEl = document.getElementById("gl-cache-progress");
        const progressText = document.getElementById("gl-cache-progress-text");

        try {
            if (downloadBtn) {
                (downloadBtn as HTMLButtonElement).disabled = true;
                const textEl = downloadBtn.querySelector(".gl-btn__text");
                if (textEl) textEl.textContent = "Téléchargement...";
            }

            if (progressEl) progressEl.style.display = "block";
            if (progressText) progressText.textContent = "Préparation...";

            Log.info(`[CacheSection] Starting download for profile: ${profileId}`);

            const result = await StorageContract.downloadProfileForOffline(profileId);

            if (progressText) {
                progressText.textContent = `✅ ${(result as { resourcesCount: number }).resourcesCount} ressources téléchargées`;
            }

            _UINotifications.success(`Profil téléchargé : ${((result as { totalSize: number }).totalSize / 1024 / 1024).toFixed(2)} MB`, 4000);

            setTimeout(() => {
                if (progressEl) progressEl.style.display = "none";
            }, 2000);

            await this._updateStatus();
        } catch (error) {
            Log.error(`[CacheSection] Download failed: ${(error as Error).message}`);

            if (progressText) progressText.textContent = `❌ Erreur: ${(error as Error).message}`;

            _UINotifications.error(`Erreur téléchargement: ${(error as Error).message}`, 5000);

            setTimeout(() => {
                if (progressEl) progressEl.style.display = "none";
            }, 3000);
        } finally {
            if (downloadBtn) {
                (downloadBtn as HTMLButtonElement).disabled = false;
                const textEl = downloadBtn.querySelector(".gl-btn__text");
                if (textEl) textEl.textContent = "Télécharger profil";
            }
        }
    },

    async _handleClear(): Promise<void> {
        if (!StorageContract.isAvailable()) {
            return;
        }

        const profileId = (Config as unknown as { get: (path: string, defaultVal?: string) => string }).get("data.activeProfile", "");
        if (!profileId) {
            return;
        }

        if (!confirm(`Voulez-vous vraiment effacer le cache du profil "${profileId}" ?`)) {
            return;
        }

        const clearBtn = document.getElementById("gl-cache-clear");

        try {
            if (clearBtn) {
                (clearBtn as HTMLButtonElement).disabled = true;
                const textEl = clearBtn.querySelector(".gl-btn__text");
                if (textEl) textEl.textContent = "Effacement...";
            }

            Log.info(`[CacheSection] Clearing cache for profile: ${profileId}`);

            const deleted = await (StorageContract.CacheManager as { clearCache: (id: string) => Promise<number> }).clearCache(profileId);

            _UINotifications.success(`Cache effacé : ${deleted} ressources supprimées`, 3000);

            await this._updateStatus();
        } catch (error) {
            Log.error(`[CacheSection] Clear failed: ${(error as Error).message}`);

            _UINotifications.error(`Erreur effacement: ${(error as Error).message}`, 5000);
        } finally {
            if (clearBtn) {
                (clearBtn as HTMLButtonElement).disabled = false;
                const textEl = clearBtn.querySelector(".gl-btn__text");
                if (textEl) textEl.textContent = "Vider cache";
            }
        }
    },
};

export { CacheSection };
