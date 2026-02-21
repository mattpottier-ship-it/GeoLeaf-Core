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

import { Log } from '../log/index.js';

const _g = typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined' ? window : {};


/**
 * CSRF Token Manager
 */
export const CSRFToken = {
    /** @private */
    _token: null,
    /** @private */
    _tokenExpiry: null,
    /** @private */
    _tokenDuration: 3600000, // 1 hour
    /** @private interval handle */
    _refreshIntervalId: null,

    /**
     * Initialize CSRF protection — generates initial token and starts auto-refresh.
     */
    init() {
        try {
            this._token = this._generateToken();
            this._tokenExpiry = Date.now() + this._tokenDuration;
            this._startAutoRefresh();
            Log.info('[CSRF] Token initialized');
        } catch (e) {
            Log.error('[CSRF] Init failed — crypto.getRandomValues unavailable:', e.message);
            this._token = null;
        }
    },

    /**
     * Generate a cryptographically secure token
     * @private
     * @returns {string}
     * @throws {Error} When crypto.getRandomValues is unavailable (insecure environment)
     */
    _generateToken() {
        if (_g.crypto && _g.crypto.getRandomValues) {
            const array = new Uint8Array(32);
            _g.crypto.getRandomValues(array);
            return btoa(String.fromCharCode.apply(null, array))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
        }
        // 8.1.2 Phase 8: Math.random() fallback removed — insecure for CSRF tokens.
        // Environments without crypto.getRandomValues cannot generate safe CSRF tokens.
        Log.error('[CSRF] crypto.getRandomValues not available — CSRF protection disabled');
        throw new Error('[CSRF] Secure random number generation not available');
    },

    /**
     * Get current CSRF token (auto-refreshes if expired)
     * @returns {string|null} token or null if crypto unavailable
     */
    getToken() {
        if (!this._token || Date.now() >= this._tokenExpiry) {
            Log.info('[CSRF] Token expired, generating new one');
            try {
                this._token = this._generateToken();
                this._tokenExpiry = Date.now() + this._tokenDuration;
            } catch (e) {
                Log.error('[CSRF] Token generation failed:', e.message);
                this._token = null;
            }
        }
        return this._token;
    },

    /**
     * Validate a token
     * @param {string} token
     * @returns {boolean}
     */
    validateToken(token) {
        if (!token || typeof token !== 'string') return false;
        if (token === this._token && Date.now() < this._tokenExpiry) return true;
        Log.warn('[CSRF] Token validation failed');
        return false;
    },

    /**
     * Add CSRF token to form data or plain object
     * @param {FormData|Object} data
     * @returns {FormData|Object}
     */
    addTokenToData(data) {
        const token = this.getToken();
        if (data instanceof FormData) {
            data.append('csrf_token', token);
        } else if (typeof data === 'object' && data !== null) {
            data.csrf_token = token;
        }
        return data;
    },

    /**
     * Add CSRF token as X-CSRF-Token header to fetch options
     * @param {Object} options
     * @returns {Object}
     */
    addTokenToHeaders(options = {}) {
        const token = this.getToken();
        if (!options.headers) options.headers = {};
        options.headers['X-CSRF-Token'] = token;
        return options;
    },

    /**
     * Create a hidden input field with CSRF token
     * @returns {HTMLInputElement}
     */
    createTokenInput() {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf_token';
        input.value = this.getToken();
        input.className = 'csrf-token-input';
        return input;
    },

    /**
     * Add CSRF token input to a form
     * @param {HTMLFormElement} form
     */
    addTokenToForm(form) {
        if (!form || !(form instanceof HTMLFormElement)) {
            Log.error('[CSRF] Invalid form element');
            return;
        }
        const existingInput = form.querySelector('input[name="csrf_token"]');
        if (existingInput) {
            existingInput.value = this.getToken();
            return;
        }
        form.appendChild(this.createTokenInput());
    },

    /**
     * Validate CSRF token from form submission data
     * @param {FormData|Object} data
     * @returns {boolean}
     */
    validateFormToken(data) {
        let token;
        if (data instanceof FormData) {
            token = data.get('csrf_token');
        } else if (typeof data === 'object' && data !== null) {
            token = data.csrf_token;
        }
        return this.validateToken(token);
    },

    /**
     * Set a SameSite secure cookie
     * @param {string} cookieName
     * @param {string} value
     * @param {Object} [options]
     */
    setSecureCookie(cookieName, value, options = {}) {
        const {
            maxAge = 3600,
            path = '/',
            sameSite = 'Strict',
            secure = true
        } = options;

        let cookie = `${encodeURIComponent(cookieName)}=${encodeURIComponent(value)}`;
        cookie += `; Max-Age=${maxAge}`;
        cookie += `; Path=${path}`;
        cookie += `; SameSite=${sameSite}`;

        if (secure && _g.location && _g.location.protocol === 'https:') {
            cookie += '; Secure';
        }

        document.cookie = cookie;
        Log.info(`[CSRF] Secure cookie set: ${cookieName}`);
    },

    /**
     * Auto-refresh token before expiry
     * @private
     */
    _startAutoRefresh() {
        const refreshInterval = this._tokenDuration - (5 * 60 * 1000);
        this._refreshIntervalId = setInterval(() => {
            Log.info('[CSRF] Auto-refreshing token');
            this._token = this._generateToken();
            this._tokenExpiry = Date.now() + this._tokenDuration;

            if (typeof CustomEvent !== 'undefined') {
                const event = new CustomEvent('geoleaf:csrf:refreshed', {
                    detail: { token: this._token }
                });
                document.dispatchEvent(event);
            }
        }, refreshInterval);
    },

    /**
     * Stoppe l'auto-refresh et nettoie le token.
     */
    destroy() {
        if (this._refreshIntervalId !== null) {
            clearInterval(this._refreshIntervalId);
            this._refreshIntervalId = null;
        }
        this._token = null;
        this._tokenExpiry = null;
        Log.debug('[CSRF] Destroyed');
    },

    /**
     * Force new token generation (call after sensitive operations)
     */
    rotateToken() {
        Log.info('[CSRF] Rotating token');
        this._token = this._generateToken();
        this._tokenExpiry = Date.now() + this._tokenDuration;

        if (typeof CustomEvent !== 'undefined') {
            const event = new CustomEvent('geoleaf:csrf:rotated', {
                detail: { token: this._token }
            });
            document.dispatchEvent(event);
        }
    },

    /**
     * Get token info (debugging only)
     * @returns {Object}
     */
    getTokenInfo() {
        return {
            hasToken: !!this._token,
            expiresIn: this._tokenExpiry ? Math.max(0, this._tokenExpiry - Date.now()) : 0,
            isValid: this._token && Date.now() < this._tokenExpiry
        };
    }
};

// ── Backward compatibility moved to globals.js ──
