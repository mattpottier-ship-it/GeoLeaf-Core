/**
 * @fileoverview FetchHelper - Unified HTTP client with timeout, retry, and cache strategies
 * @module GeoLeaf.Utils.FetchHelper
 *
 * Sprint 3.3: Unified fetch() implementation across codebase
 * Consolidates scattered fetch logic into one robust helper
 *
 * @version 1.0.0
 * @since Sprint 3.3 - Performance Phase
 */
(function (global) {
    "use strict";

    // Ensure GeoLeaf namespace
    if (typeof global.GeoLeaf === "undefined") {
        global.GeoLeaf = {};
    }
    if (typeof global.GeoLeaf.Utils === "undefined") {
        global.GeoLeaf.Utils = {};
    }

    const Log = global.GeoLeaf.Log;

    /**
     * Default configuration for fetch operations
     * @private
     */
    const DEFAULT_CONFIG = {
        timeout: 10000,        // 10s timeout (was 5s in helpers.js)
        retries: 2,           // Max retry attempts
        retryDelay: 1000,     // Delay between retries (ms)
        retryDelayMultiplier: 1.5,  // Exponential backoff multiplier
        cache: 'default',     // Cache strategy
        credentials: 'same-origin', // CORS credentials
        parseResponse: true,  // Auto-parse JSON/text responses
        throwOnError: true,   // Throw on HTTP errors (4xx, 5xx)
        validateUrl: true     // Use GeoLeaf.Security.validateUrl if available
    };

    /**
     * @namespace FetchHelper
     * @memberof GeoLeaf.Utils
     * @description Unified HTTP client with advanced features
     */
    const FetchHelper = {

        /**
         * Execute HTTP request with comprehensive error handling and retry logic
         *
         * @param {string} url - Request URL
         * @param {Object} [options={}] - Fetch options + FetchHelper extensions
         * @param {number} [options.timeout=10000] - Request timeout in ms
         * @param {number} [options.retries=2] - Max retry attempts
         * @param {number} [options.retryDelay=1000] - Base delay between retries
         * @param {number} [options.retryDelayMultiplier=1.5] - Exponential backoff multiplier
         * @param {boolean} [options.parseResponse=true] - Auto-parse response based on content-type
         * @param {boolean} [options.throwOnError=true] - Throw on HTTP error status
         * @param {boolean} [options.validateUrl=true] - Validate URL with GeoLeaf.Security
         * @param {Function} [options.onRetry] - Callback on retry attempt
         * @param {Function} [options.onTimeout] - Callback on timeout
         * @returns {Promise<Response|Object>} Response or parsed data
         * @throws {FetchError} Enhanced error with retry info and context
         *
         * @example
         * // Simple request
         * const data = await FetchHelper.fetch('/api/data');
         *
         * @example
         * // Advanced request with custom options
         * const result = await FetchHelper.fetch('/api/config', {
         *   method: 'POST',
         *   timeout: 5000,
         *   retries: 3,
         *   parseResponse: true,
         *   onRetry: (attempt, error) => console.log(`Retry ${attempt}:`, error.message)
         * });
         *
         * @example
         * // HEAD request for resource checking
         * const response = await FetchHelper.fetch('/resource.json', {
         *   method: 'HEAD',
         *   parseResponse: false,
         *   throwOnError: false
         * });
         */
        async fetch(url, options = {}) {
            const config = { ...DEFAULT_CONFIG, ...options };
            let attempt = 0;
            let lastError;

            // URL validation
            if (config.validateUrl && global.GeoLeaf.Security?.validateUrl) {
                try {
                    url = global.GeoLeaf.Security.validateUrl(url);
                } catch (error) {
                    throw new FetchError(`URL validation failed: ${error.message}`, {
                        url,
                        cause: error,
                        type: 'validation_error'
                    });
                }
            }

            // Retry loop
            while (attempt <= config.retries) {
                try {
                    const result = await this._executeRequest(url, config, attempt);

                    // Log successful request (with retry info if applicable)
                    if (Log && attempt > 0) {
                        Log.info(`[FetchHelper] ✓ ${url} (succeeded after ${attempt} retries)`);
                    }

                    return result;

                } catch (error) {
                    lastError = error;
                    attempt++;

                    // If this was the last attempt, throw the error
                    if (attempt > config.retries) {
                        throw new FetchError(
                            `Request failed after ${config.retries + 1} attempts: ${error.message}`,
                            {
                                url,
                                attempts: attempt,
                                cause: error,
                                type: error.name === 'AbortError' ? 'timeout' : 'network_error'
                            }
                        );
                    }

                    // Calculate delay with exponential backoff
                    const delay = config.retryDelay * Math.pow(config.retryDelayMultiplier, attempt - 1);

                    // Call retry callback if provided
                    if (config.onRetry && typeof config.onRetry === 'function') {
                        try {
                            config.onRetry(attempt, error, delay);
                        } catch (callbackError) {
                            if (Log) Log.warn('[FetchHelper] onRetry callback failed:', callbackError);
                        }
                    }

                    if (Log) {
                        Log.warn(`[FetchHelper] Retry ${attempt}/${config.retries} for ${url} in ${delay}ms (${error.message})`);
                    }

                    // Wait before retry
                    await this._delay(delay);
                }
            }
        },

        /**
         * Execute single HTTP request with timeout
         * @private
         */
        async _executeRequest(url, config, attempt) {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                if (config.onTimeout && typeof config.onTimeout === 'function') {
                    try {
                        config.onTimeout(url, config.timeout, attempt);
                    } catch (callbackError) {
                        if (Log) Log.warn('[FetchHelper] onTimeout callback failed:', callbackError);
                    }
                }
            }, config.timeout);

            try {
                // Prepare fetch options (remove our custom options)
                const fetchOptions = { ...config };
                delete fetchOptions.timeout;
                delete fetchOptions.retries;
                delete fetchOptions.retryDelay;
                delete fetchOptions.retryDelayMultiplier;
                delete fetchOptions.parseResponse;
                delete fetchOptions.throwOnError;
                delete fetchOptions.validateUrl;
                delete fetchOptions.onRetry;
                delete fetchOptions.onTimeout;

                // Add abort signal
                fetchOptions.signal = controller.signal;

                // Execute fetch
                const response = await fetch(url, fetchOptions);

                // Clear timeout
                clearTimeout(timeoutId);

                // Handle HTTP errors
                if (!response.ok && config.throwOnError) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Parse response if requested
                if (config.parseResponse && response.ok) {
                    return await this._parseResponse(response);
                }

                return response;

            } catch (error) {
                clearTimeout(timeoutId);

                // Enhance AbortError with more context
                if (error.name === 'AbortError') {
                    throw new Error(`Request timed out after ${config.timeout}ms`);
                }

                throw error;
            }
        },

        /**
         * Parse response based on content-type
         * @private
         */
        async _parseResponse(response) {
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                return await response.json();
            }

            if (contentType.includes('text/') || contentType.includes('application/javascript')) {
                return await response.text();
            }

            if (contentType.startsWith('image/') || contentType.includes('application/octet-stream')) {
                return await response.blob();
            }

            // Default to text for unknown types
            return await response.text();
        },

        /**
         * Delay utility for retry logic
         * @private
         */
        async _delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * Convenience method for GET requests
         *
         * @param {string} url - Request URL
         * @param {Object} [options={}] - Request options
         * @returns {Promise} Parsed response data
         */
        async get(url, options = {}) {
            return this.fetch(url, { ...options, method: 'GET' });
        },

        /**
         * Convenience method for POST requests
         *
         * @param {string} url - Request URL
         * @param {Object} data - Request body data
         * @param {Object} [options={}] - Request options
         * @returns {Promise} Parsed response data
         */
        async post(url, data, options = {}) {
            const postOptions = {
                ...options,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: typeof data === 'string' ? data : JSON.stringify(data)
            };

            return this.fetch(url, postOptions);
        },

        /**
         * Convenience method for HEAD requests (check resource existence)
         *
         * @param {string} url - Request URL
         * @param {Object} [options={}] - Request options
         * @returns {Promise<Response>} Raw response (not parsed)
         */
        async head(url, options = {}) {
            return this.fetch(url, {
                ...options,
                method: 'HEAD',
                parseResponse: false
            });
        },

        /**
         * Check if resource exists (HEAD request)
         *
         * @param {string} url - Resource URL
         * @param {Object} [options={}] - Request options
         * @returns {Promise<boolean>} True if resource exists (2xx status)
         */
        async exists(url, options = {}) {
            try {
                const response = await this.head(url, {
                    ...options,
                    throwOnError: false
                });
                return response.ok;
            } catch (error) {
                if (Log) Log.debug(`[FetchHelper] exists() failed for ${url}:`, error.message);
                return false;
            }
        },

        /**
         * Configure default options
         *
         * @param {Object} config - Default configuration to merge
         * @example
         * FetchHelper.configure({
         *   timeout: 15000,
         *   retries: 3
         * });
         */
        configure(config) {
            Object.assign(DEFAULT_CONFIG, config);
            if (Log) Log.debug('[FetchHelper] Configuration updated:', DEFAULT_CONFIG);
        },

        /**
         * Get current default configuration
         *
         * @returns {Object} Current default config
         */
        getConfig() {
            return { ...DEFAULT_CONFIG };
        }
    };

    /**
     * Enhanced Error class for fetch operations
     *
     * @class FetchError
     * @extends Error
     */
    class FetchError extends Error {
        constructor(message, context = {}) {
            super(message);
            this.name = 'FetchError';
            this.url = context.url;
            this.attempts = context.attempts;
            this.type = context.type || 'unknown';
            this.cause = context.cause;

            // Maintain stack trace
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, FetchError);
            }
        }
    }

    // Export to GeoLeaf namespace
    global.GeoLeaf.Utils.FetchHelper = FetchHelper;
    global.GeoLeaf.Utils.FetchError = FetchError;

    // Convenient aliases for common usage
    global.GeoLeaf.fetch = FetchHelper.fetch.bind(FetchHelper);
    global.GeoLeaf.get = FetchHelper.get.bind(FetchHelper);
    global.GeoLeaf.post = FetchHelper.post.bind(FetchHelper);

    // Backward compatibility: enhance helpers.js fetchWithTimeout
    if (global.GeoLeaf.Helpers) {
        global.GeoLeaf.Helpers.fetchWithTimeout = (url, options = {}, timeout = 5000) => {
            if (Log) Log.warn('[FetchHelper] fetchWithTimeout is deprecated, use GeoLeaf.Utils.FetchHelper.fetch() instead');
            return FetchHelper.fetch(url, { ...options, timeout });
        };
    }

    if (Log && Log.info) {
        Log.info('[GeoLeaf.Utils.FetchHelper] Module loaded - unified fetch implementation available');
    }

})(typeof window !== 'undefined' ? window : this);
