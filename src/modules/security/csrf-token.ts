/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module security/csrf-token
 * @description CSRF Token Manager — generates and validates CSRF tokens.
 */

import { Log } from "../log/index.js";

const _g =
    typeof globalThis !== "undefined"
        ? (globalThis as Window & typeof globalThis)
        : typeof window !== "undefined"
          ? window
          : ({} as Window);

export interface SecureCookieOptions {
    maxAge?: number;
    path?: string;
    sameSite?: "Strict" | "Lax" | "None";
    secure?: boolean;
}

export interface CSRFTokenInfo {
    hasToken: boolean;
    expiresIn: number;
    isValid: boolean;
}

interface CSRFTokenInternal {
    _token: string | null;
    _tokenExpiry: number | null;
    _tokenDuration: number;
    _refreshIntervalId: ReturnType<typeof setInterval> | null;
    init(): void;
    _generateToken(): string;
    getToken(): string | null;
    validateToken(token: string | null | undefined): boolean;
    addTokenToData<T extends FormData | Record<string, unknown>>(data: T): T;
    addTokenToHeaders(options?: Record<string, unknown>): Record<string, unknown>;
    createTokenInput(): HTMLInputElement;
    addTokenToForm(form: HTMLFormElement): void;
    validateFormToken(data: FormData | Record<string, unknown>): boolean;
    setSecureCookie(cookieName: string, value: string, options?: SecureCookieOptions): void;
    _startAutoRefresh(): void;
    destroy(): void;
    rotateToken(): void;
    getTokenInfo(): CSRFTokenInfo;
}

export const CSRFToken: CSRFTokenInternal = {
    _token: null,
    _tokenExpiry: null,
    _tokenDuration: 3600000,
    _refreshIntervalId: null,

    init(): void {
        try {
            this._token = this._generateToken();
            this._tokenExpiry = Date.now() + this._tokenDuration;
            this._startAutoRefresh();
            Log.info("[CSRF] Token initialized");
        } catch (e) {
            Log.error(
                "[CSRF] Init failed — crypto.getRandomValues unavailable:",
                (e as Error).message
            );
            this._token = null;
        }
    },

    _generateToken(): string {
        if (_g.crypto && _g.crypto.getRandomValues) {
            const array = new Uint8Array(32);
            _g.crypto.getRandomValues(array);
            return btoa(String.fromCharCode(...array))
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=/g, "");
        }
        Log.error("[CSRF] crypto.getRandomValues not available — CSRF protection disabled");
        throw new Error("[CSRF] Secure random number generation not available");
    },

    getToken(): string | null {
        if (!this._token || Date.now() >= (this._tokenExpiry ?? 0)) {
            Log.info("[CSRF] Token expired, generating new one");
            try {
                this._token = this._generateToken();
                this._tokenExpiry = Date.now() + this._tokenDuration;
            } catch (e) {
                Log.error("[CSRF] Token generation failed:", (e as Error).message);
                this._token = null;
            }
        }
        return this._token;
    },

    validateToken(token: string | null | undefined): boolean {
        if (!token || typeof token !== "string") return false;
        if (token === this._token && Date.now() < (this._tokenExpiry ?? 0)) return true;
        Log.warn("[CSRF] Token validation failed");
        return false;
    },

    addTokenToData<T extends FormData | Record<string, unknown>>(data: T): T {
        const token = this.getToken();
        if (data instanceof FormData) {
            (data as FormData).append("csrf_token", token ?? "");
        } else if (typeof data === "object" && data !== null) {
            (data as Record<string, unknown>).csrf_token = token;
        }
        return data;
    },

    addTokenToHeaders(options: Record<string, unknown> = {}): Record<string, unknown> {
        const token = this.getToken();
        if (!options.headers) options.headers = {};
        (options.headers as Record<string, string>)["X-CSRF-Token"] = token ?? "";
        return options;
    },

    createTokenInput(): HTMLInputElement {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "csrf_token";
        input.value = this.getToken() ?? "";
        input.className = "csrf-token-input";
        return input;
    },

    addTokenToForm(form: HTMLFormElement): void {
        if (!form || !(form instanceof HTMLFormElement)) {
            Log.error("[CSRF] Invalid form element");
            return;
        }
        const existingInput = form.querySelector('input[name="csrf_token"]');
        if (existingInput) {
            (existingInput as HTMLInputElement).value = this.getToken() ?? "";
            return;
        }
        form.appendChild(this.createTokenInput());
    },

    validateFormToken(data: FormData | Record<string, unknown>): boolean {
        let token: string | unknown;
        if (data instanceof FormData) {
            token = data.get("csrf_token");
        } else if (typeof data === "object" && data !== null) {
            token = (data as Record<string, unknown>).csrf_token;
        } else {
            token = undefined;
        }
        return this.validateToken(token as string | null | undefined);
    },

    setSecureCookie(cookieName: string, value: string, options: SecureCookieOptions = {}): void {
        const { maxAge = 3600, path = "/", sameSite = "Strict", secure = true } = options;

        let cookie = `${encodeURIComponent(cookieName)}=${encodeURIComponent(value)}`;
        cookie += `; Max-Age=${maxAge}`;
        cookie += `; Path=${path}`;
        cookie += `; SameSite=${sameSite}`;

        if (secure && _g.location?.protocol === "https:") {
            cookie += "; Secure";
        }

        document.cookie = cookie;
        Log.info(`[CSRF] Secure cookie set: ${cookieName}`);
    },

    _startAutoRefresh(): void {
        const refreshInterval = this._tokenDuration - 5 * 60 * 1000;
        this._refreshIntervalId = setInterval(() => {
            Log.info("[CSRF] Auto-refreshing token");
            this._token = this._generateToken();
            this._tokenExpiry = Date.now() + this._tokenDuration;

            if (typeof CustomEvent !== "undefined") {
                const event = new CustomEvent("geoleaf:csrf:refreshed", {
                    detail: { token: this._token },
                });
                document.dispatchEvent(event);
            }
        }, refreshInterval);
    },

    destroy(): void {
        if (this._refreshIntervalId !== null) {
            clearInterval(this._refreshIntervalId);
            this._refreshIntervalId = null;
        }
        this._token = null;
        this._tokenExpiry = null;
        Log.debug("[CSRF] Destroyed");
    },

    rotateToken(): void {
        Log.info("[CSRF] Rotating token");
        this._token = this._generateToken();
        this._tokenExpiry = Date.now() + this._tokenDuration;

        if (typeof CustomEvent !== "undefined") {
            const event = new CustomEvent("geoleaf:csrf:rotated", {
                detail: { token: this._token },
            });
            document.dispatchEvent(event);
        }
    },

    getTokenInfo(): CSRFTokenInfo {
        return {
            hasToken: !!this._token,
            expiresIn: this._tokenExpiry ? Math.max(0, this._tokenExpiry - Date.now()) : 0,
            isValid: !!(this._token && Date.now() < (this._tokenExpiry ?? 0)),
        };
    },
};
