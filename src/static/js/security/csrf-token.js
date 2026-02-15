/**
 * GeoLeaf Security - CSRF Token Module
 * Cross-Site Request Forgery protection
 *
 * @module security/csrf-token
 * @version 1.0.0
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf.Security = GeoLeaf.Security || {};

    const Log = GeoLeaf.Log || console;

    /**
     * CSRF Token Manager
     * Generates and validates CSRF tokens for form submissions
     */
    const CSRFToken = {
        /**
         * Token storage
         * @private
         */
        _token: null,
        _tokenExpiry: null,
        _tokenDuration: 3600000, // 1 hour in milliseconds

        /**
         * Initialize CSRF protection
         * Generates initial token and sets up refresh
         */
        init() {
            this._token = this._generateToken();
            this._tokenExpiry = Date.now() + this._tokenDuration;

            // Auto-refresh token before expiry
            this._startAutoRefresh();

            Log.info('[CSRF] Token initialized');
        },

        /**
         * Generate a cryptographically secure token
         * @private
         * @returns {string} Generated token
         */
        _generateToken() {
            // Use crypto.getRandomValues for cryptographically secure random
            if (global.crypto && global.crypto.getRandomValues) {
                const array = new Uint8Array(32); // 256 bits
                global.crypto.getRandomValues(array);

                // Convert to base64
                return btoa(String.fromCharCode.apply(null, array))
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '');
            }

            // Fallback to Math.random (less secure, but better than nothing)
            Log.warn('[CSRF] crypto.getRandomValues not available, using fallback');
            return Array.from({ length: 32 }, () =>
                Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
            ).join('');
        },

        /**
         * Get current CSRF token
         * Auto-refreshes if expired
         *
         * @returns {string} Current valid token
         */
        getToken() {
            // Check if token needs refresh
            if (!this._token || Date.now() >= this._tokenExpiry) {
                Log.info('[CSRF] Token expired, generating new one');
                this._token = this._generateToken();
                this._tokenExpiry = Date.now() + this._tokenDuration;
            }

            return this._token;
        },

        /**
         * Validate a token
         *
         * @param {string} token - Token to validate
         * @returns {boolean} True if valid
         */
        validateToken(token) {
            if (!token || typeof token !== 'string') {
                return false;
            }

            // Check if token matches and is not expired
            if (token === this._token && Date.now() < this._tokenExpiry) {
                return true;
            }

            Log.warn('[CSRF] Token validation failed');
            return false;
        },

        /**
         * Add CSRF token to form data
         *
         * @param {FormData|Object} data - Form data or object
         * @returns {FormData|Object} Data with CSRF token added
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
         * Add CSRF token to fetch options headers
         *
         * @param {Object} options - Fetch options
         * @returns {Object} Options with CSRF header added
         */
        addTokenToHeaders(options = {}) {
            const token = this.getToken();

            if (!options.headers) {
                options.headers = {};
            }

            // Add as custom header
            options.headers['X-CSRF-Token'] = token;

            return options;
        },

        /**
         * Create hidden input field with CSRF token
         * For traditional form submissions
         *
         * @returns {HTMLInputElement} Hidden input with token
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
         *
         * @param {HTMLFormElement} form - Form element
         */
        addTokenToForm(form) {
            if (!form || !(form instanceof HTMLFormElement)) {
                Log.error('[CSRF] Invalid form element');
                return;
            }

            // Check if token input already exists
            const existingInput = form.querySelector('input[name="csrf_token"]');
            if (existingInput) {
                // Update existing token
                existingInput.value = this.getToken();
                return;
            }

            // Add new token input
            const tokenInput = this.createTokenInput();
            form.appendChild(tokenInput);
        },

        /**
         * Validate CSRF token from form submission
         *
         * @param {FormData|Object} data - Submitted form data
         * @returns {boolean} True if valid
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
         * Set SameSite cookie attribute for CSRF protection
         *
         * @param {string} cookieName - Cookie name
         * @param {string} value - Cookie value
         * @param {Object} [options] - Cookie options
         */
        setSecureCookie(cookieName, value, options = {}) {
            const {
                maxAge = 3600, // 1 hour
                path = '/',
                sameSite = 'Strict', // Strict, Lax, or None
                secure = true // HTTPS only
            } = options;

            let cookie = `${encodeURIComponent(cookieName)}=${encodeURIComponent(value)}`;
            cookie += `; Max-Age=${maxAge}`;
            cookie += `; Path=${path}`;
            cookie += `; SameSite=${sameSite}`;

            if (secure) {
                // Only set Secure flag on HTTPS
                if (global.location && global.location.protocol === 'https:') {
                    cookie += '; Secure';
                }
            }

            document.cookie = cookie;
            Log.info(`[CSRF] Secure cookie set: ${cookieName}`);
        },

        /**
         * Auto-refresh token before expiry
         * @private
         */
        _startAutoRefresh() {
            // Refresh token 5 minutes before expiry
            const refreshInterval = this._tokenDuration - (5 * 60 * 1000);

            setInterval(() => {
                Log.info('[CSRF] Auto-refreshing token');
                this._token = this._generateToken();
                this._tokenExpiry = Date.now() + this._tokenDuration;

                // Dispatch event for components to update their tokens
                if (typeof CustomEvent !== 'undefined') {
                    const event = new CustomEvent('geoleaf:csrf:refreshed', {
                        detail: { token: this._token }
                    });
                    document.dispatchEvent(event);
                }
            }, refreshInterval);
        },

        /**
         * Rotate token (force new token generation)
         * Call after sensitive operations
         */
        rotateToken() {
            Log.info('[CSRF] Rotating token');
            this._token = this._generateToken();
            this._tokenExpiry = Date.now() + this._tokenDuration;

            // Dispatch rotation event
            if (typeof CustomEvent !== 'undefined') {
                const event = new CustomEvent('geoleaf:csrf:rotated', {
                    detail: { token: this._token }
                });
                document.dispatchEvent(event);
            }
        },

        /**
         * Get token info (for debugging)
         * WARNING: Do not expose in production
         *
         * @returns {Object} Token information
         */
        getTokenInfo() {
            return {
                hasToken: !!this._token,
                expiresIn: this._tokenExpiry ? Math.max(0, this._tokenExpiry - Date.now()) : 0,
                isValid: this._token && Date.now() < this._tokenExpiry
            };
        }
    };

    // Auto-initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CSRFToken.init());
    } else {
        CSRFToken.init();
    }

    // Export
    GeoLeaf.Security.CSRFToken = CSRFToken;

})(typeof window !== 'undefined' ? window : global);
