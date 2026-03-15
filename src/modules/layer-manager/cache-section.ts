/**







 * Module LayerManager - Cache Section







 *







 * Adds ae section de gestion du cache offline in the manager for layers.







 * Allows download/effacer le cache of the profile active.







 *







 * @module GeoLeaf.LayerManager.CacheSection







 * @version 3.0.0







 */

"use strict";

import { Log } from "../log/index.js";

import { Config } from "../config/config-primitives.js";

import { StorageContract } from "../shared/storage-contract.js";

import { _UINotifications } from "../ui/notifications.js";
import { getLabel } from "../i18n/i18n.js";

export interface CacheSectionConfig {
    id: string;

    label: string;

    order: number;

    collapsedByDefault: boolean;

    customContent: string;

    init: () => void;
}

function _setButtonState(btnId: string, disabled: boolean, text: string): void {
    const btn = document.getElementById(btnId);

    if (!btn) return;

    (btn as HTMLButtonElement).disabled = disabled;

    const textEl = btn.querySelector(".gl-btn__text");

    if (textEl) textEl.textContent = text;
}

function _renderDownloadedStatus(
    stateEl: Element | null,
    sizeEl: Element | null,
    clearBtn: Element | null,
    totalSize: number
): void {
    if (stateEl) {
        stateEl.textContent = getLabel("ui.cache.state_downloaded");
        (stateEl as HTMLElement).style.color = "#22c55e";
    }

    if (sizeEl) {
        sizeEl.textContent = `${(totalSize / 1024 / 1024).toFixed(2)} MB`;
    }

    if (clearBtn) (clearBtn as HTMLButtonElement).disabled = false;
}

function _renderNotDownloadedStatus(
    stateEl: Element | null,
    sizeEl: Element | null,
    clearBtn: Element | null
): void {
    if (stateEl) {
        stateEl.textContent = getLabel("ui.cache.state_not_downloaded");
        (stateEl as HTMLElement).style.color = "#ef4444";
    }

    if (sizeEl) sizeEl.textContent = "0 MB";

    if (clearBtn) (clearBtn as HTMLButtonElement).disabled = true;
}

function _renderCacheStatus(
    profileId: string,
    status: { resourcesCount: number; totalSize: number },
    quota: { available: number }
): void {
    const profileEl = document.getElementById("gl-cache-profile");

    const stateEl = document.getElementById("gl-cache-state");

    const sizeEl = document.getElementById("gl-cache-size");

    const quotaEl = document.getElementById("gl-cache-quota");

    const clearBtn = document.getElementById("gl-cache-clear");

    if (profileEl) profileEl.textContent = profileId || "-";

    if (status && status.resourcesCount > 0) {
        _renderDownloadedStatus(stateEl, sizeEl, clearBtn, status.totalSize);
    } else {
        _renderNotDownloadedStatus(stateEl, sizeEl, clearBtn);
    }

    if (quotaEl) {
        quotaEl.textContent = getLabel(
            "format.cache.quota_mb",
            (quota.available / 1024 / 1024).toFixed(2)
        );
    }
}

function _buildCacheStatusHtml(): string {
    return `<div class="gl-cache-status">
                    <div class="gl-cache-status__header">
                        <span class="gl-cache-status__icon">💾</span>
                        <span class="gl-cache-status__label">${getLabel("ui.cache.status_label")}</span>
                    </div>
                    <div class="gl-cache-status__info">
                        <div class="gl-cache-status__row">
                            <span class="gl-cache-status__key">${getLabel("ui.cache.label_profile")}</span>
                            <span class="gl-cache-status__value" id="gl-cache-profile">-</span>
                        </div>
                        <div class="gl-cache-status__row">
                            <span class="gl-cache-status__key">${getLabel("ui.cache.label_state")}</span>
                            <span class="gl-cache-status__value" id="gl-cache-state">${getLabel("ui.cache.state_initial")}</span>
                        </div>
                        <div class="gl-cache-status__row">
                            <span class="gl-cache-status__key">${getLabel("ui.cache.label_size")}</span>
                            <span class="gl-cache-status__value" id="gl-cache-size">0 MB</span>
                        </div>
                        <div class="gl-cache-status__row">
                            <span class="gl-cache-status__key">${getLabel("ui.cache.label_quota")}</span>
                            <span class="gl-cache-status__value" id="gl-cache-quota">${getLabel("format.cache.quota_mb", "0")}</span>
                        </div>
                    </div>
                </div>`;
}

function _buildCacheActionsHtml(): string {
    return `<div class="gl-cache-actions">
                    <button id="gl-cache-download" class="gl-btn gl-btn--primary gl-cache-btn" title="${getLabel("aria.cache.download_title")}">
                        <span class="gl-btn__icon">⬇️</span>
                        <span class="gl-btn__text">${getLabel("ui.cache.btn_download")}</span>
                    </button>
                    <button id="gl-cache-clear" class="gl-btn gl-btn--secondary gl-cache-btn" title="${getLabel("aria.cache.clear_title")}" disabled>
                        <span class="gl-btn__icon">🗑️</span>
                        <span class="gl-btn__text">${getLabel("ui.cache.btn_clear")}</span>
                    </button>
                </div>
                <div class="gl-cache-progress" id="gl-cache-progress" style="display: none;">
                    <div class="gl-cache-progress__bar">
                        <div class="gl-cache-progress__fill" id="gl-cache-progress-fill"></div>
                    </div>
                    <div class="gl-cache-progress__text" id="gl-cache-progress-text">
                        ${getLabel("ui.cache.progress_in_progress")}
                    </div>
                </div>`;
}

const CacheSection = {
    generateSection(this: {
        _generateContent: () => string;
        _attachEventListeners: () => void;
    }): CacheSectionConfig {
        return {
            id: "offline-cache",

            label: getLabel("ui.cache.section_label"),

            order: 98,

            collapsedByDefault: false,

            customContent: this._generateContent(),

            init: () => this._attachEventListeners(),
        };
    },

    _generateContent(): string {
        return `<div class="gl-cache-section">${_buildCacheStatusHtml()}${_buildCacheActionsHtml()}</div>`;
    },

    _attachEventListeners(this: {
        _handleDownload: () => Promise<void>;
        _handleClear: () => Promise<void>;
        _updateStatus: () => Promise<void>;
    }) {
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
            const profileId = (
                Config as unknown as { get: (path: string, defaultVal?: string) => string }
            ).get("data.activeProfile", "");

            const status = await (
                StorageContract.CacheManager as {
                    getCacheStatus: (
                        id: string
                    ) => Promise<{ resourcesCount: number; totalSize: number }>;
                }
            ).getCacheStatus(profileId);

            const quota = await (
                StorageContract.CacheManager as {
                    getStorageQuota: () => Promise<{ available: number }>;
                }
            ).getStorageQuota();

            _renderCacheStatus(profileId, status, quota);
        } catch (error) {
            Log.error(`[CacheSection] Failed to update status: ${(error as Error).message}`);
        }
    },

    async _handleDownload(): Promise<void> {
        if (!StorageContract.isAvailable()) {
            _UINotifications.error(getLabel("toast.cache.storage_unavailable"), 5000);

            return;
        }

        const profileId = (
            Config as unknown as { get: (path: string, defaultVal?: string) => string }
        ).get("data.activeProfile", "");

        if (!profileId) {
            _UINotifications.error(getLabel("toast.cache.no_active_profile"), 3000);

            return;
        }

        const progressEl = document.getElementById("gl-cache-progress");

        const progressText = document.getElementById("gl-cache-progress-text");

        try {
            _setButtonState("gl-cache-download", true, getLabel("ui.cache.btn_downloading"));

            if (progressEl) progressEl.style.display = "block";

            if (progressText) progressText.textContent = getLabel("ui.cache.progress_preparing");

            Log.info(`[CacheSection] Starting download for profile: ${profileId}`);

            const result = await StorageContract.downloadProfileForOffline(profileId);

            if (progressText) {
                progressText.textContent = getLabel(
                    "ui.cache.progress_done",
                    String((result as { resourcesCount: number }).resourcesCount)
                );
            }

            _UINotifications.success(
                getLabel(
                    "toast.cache.download_success",
                    ((result as { totalSize: number }).totalSize / 1024 / 1024).toFixed(2)
                ),
                4000
            );

            setTimeout(() => {
                if (progressEl) progressEl.style.display = "none";
            }, 2000);

            await this._updateStatus();
        } catch (error) {
            Log.error(`[CacheSection] Download failed: ${(error as Error).message}`);

            if (progressText)
                progressText.textContent = getLabel(
                    "ui.cache.progress_error",
                    (error as Error).message
                );

            _UINotifications.error(
                getLabel("toast.cache.download_error", (error as Error).message),
                5000
            );

            setTimeout(() => {
                if (progressEl) progressEl.style.display = "none";
            }, 3000);
        } finally {
            _setButtonState("gl-cache-download", false, getLabel("ui.cache.btn_download"));
        }
    },

    async _handleClear(): Promise<void> {
        if (!window.confirm(getLabel("ui.cache.confirm_clear"))) return;
        const profileId = (
            Config as unknown as { get: (path: string, defaultVal?: string) => string }
        ).get("data.activeProfile", "");
        try {
            await (
                StorageContract.CacheManager as {
                    clearCache: (id: string) => Promise<number>;
                }
            ).clearCache(profileId);
            _UINotifications.success(getLabel("toast.cache.cleared"), 3000);
            await this._updateStatus();
        } catch (error) {
            Log.error(`[CacheSection] Clear failed: ${(error as Error).message}`);
            _UINotifications.error(
                getLabel("toast.cache.clear_error", (error as Error).message),
                5000
            );
        }
    },
};

export { CacheSection };
