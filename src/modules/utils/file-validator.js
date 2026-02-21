/**
 * GeoLeaf File Validator Module
 * Security-focused file validation for uploads
 *
 * Features:
 * - Magic bytes validation (file signature check)
 * - MIME type verification
 * - File size limits
 * - Extension whitelist
 *
 * @module utils/file-validator
 * @version 1.0.0
 */

import { Log } from '../log/index.js';
import { formatFileSize } from './formatters.js';


// ========================================
//   CONSTANTS
// ========================================

/**
 * Maximum file size: 100 MB
 * @const {number}
 */
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

/**
 * Magic bytes signatures for common file types
 * Each entry: [signature bytes, offset, mime type, extensions]
 * @const {Array}
 */
const MAGIC_BYTES = [
    // Images
    { signature: [0xFF, 0xD8, 0xFF], offset: 0, mime: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
    { signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], offset: 0, mime: 'image/png', extensions: ['png'] },
    { signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], offset: 0, mime: 'image/gif', extensions: ['gif'] },
    { signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], offset: 0, mime: 'image/gif', extensions: ['gif'] },
    { signature: [0x52, 0x49, 0x46, 0x46], offset: 0, mime: 'image/webp', extensions: ['webp'], extraCheck: (bytes) => {
        // WEBP: RIFF....WEBP
        return bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    }},
    { signature: [0x42, 0x4D], offset: 0, mime: 'image/bmp', extensions: ['bmp'] },

    // Documents
    { signature: [0x25, 0x50, 0x44, 0x46], offset: 0, mime: 'application/pdf', extensions: ['pdf'] },

    // Archives
    { signature: [0x50, 0x4B, 0x03, 0x04], offset: 0, mime: 'application/zip', extensions: ['zip', 'kmz'] },
    { signature: [0x50, 0x4B, 0x05, 0x06], offset: 0, mime: 'application/zip', extensions: ['zip', 'kmz'] },
    { signature: [0x50, 0x4B, 0x07, 0x08], offset: 0, mime: 'application/zip', extensions: ['zip', 'kmz'] },

    // GeoJSON (JSON text file - no magic bytes, validate by parsing)
    // KML/GPX (XML text file - validate by parsing)
];

/**
 * Whitelist of allowed file extensions
 * @const {Array<string>}
 */
const ALLOWED_EXTENSIONS = [
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',

    // Geo formats
    'geojson', 'json', 'kml', 'gpx', 'kmz',

    // Documents
    'pdf', 'txt', 'csv'
];

/**
 * Whitelist of allowed MIME types
 * @const {Array<string>}
 */
const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',

    // Geo formats
    'application/json', 'application/geo+json', 'application/vnd.google-earth.kml+xml',
    'application/vnd.google-earth.kmz', 'application/gpx+xml',

    // Documents
    'application/pdf', 'text/plain', 'text/csv',

    // Archives
    'application/zip'
];

// ========================================
//   FILE VALIDATOR MODULE
// ========================================

export const FileValidator = {
    /**
     * Validate a file for security and format compliance
     *
     * @param {File} file - File object to validate
     * @param {Object} [options] - Validation options
     * @param {number} [options.maxSize] - Max file size in bytes (default: 100 MB)
     * @param {Array<string>} [options.allowedExtensions] - Allowed extensions (default: ALLOWED_EXTENSIONS)
     * @param {Array<string>} [options.allowedMimeTypes] - Allowed MIME types (default: ALLOWED_MIME_TYPES)
     * @param {boolean} [options.checkMagicBytes=true] - Verify magic bytes signature
     * @returns {Promise<Object>} Validation result { valid: boolean, error?: string, details: {} }
     */
    async validateFile(file, options = {}) {
        const {
            maxSize = MAX_FILE_SIZE,
            allowedExtensions = ALLOWED_EXTENSIONS,
            allowedMimeTypes = ALLOWED_MIME_TYPES,
            checkMagicBytes = true
        } = options;

        const result = {
            valid: false,
            error: null,
            details: {
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                extension: this._getFileExtension(file.name)
            }
        };

        try {
            // 1. Check if file exists
            if (!file) {
                result.error = 'No file provided';
                return result;
            }

            // 1b. Check filename for path traversal and dangerous characters
            if (file.name) {
                const dangerousPatterns = [
                    /\.\./,              // path traversal
                    /[/\\]/,             // directory separators
                    /[\0-\x1f]/,         // eslint-disable-line no-control-regex -- control chars
                    /^\.+$/,             // only dots (., ..)
                ];
                for (const pattern of dangerousPatterns) {
                    if (pattern.test(file.name)) {
                        result.error = 'Filename contains dangerous characters (path traversal attempt?)';
                        Log.warn('[FileValidator] Dangerous filename rejected:', file.name.substring(0, 50));
                        return result;
                    }
                }
                // Max filename length
                if (file.name.length > 255) {
                    result.error = 'Filename too long (max 255 characters)';
                    return result;
                }
            }

            // 2. Check file size
            if (file.size > maxSize) {
                result.error = `File size (${this._formatBytes(file.size)}) exceeds maximum allowed (${this._formatBytes(maxSize)})`;
                Log.warn('[FileValidator] File too large:', result.error);
                return result;
            }

            if (file.size === 0) {
                result.error = 'File is empty';
                return result;
            }

            // 3. Check file extension
            const extension = this._getFileExtension(file.name);
            if (!extension) {
                result.error = 'File has no extension';
                return result;
            }

            if (!allowedExtensions.includes(extension.toLowerCase())) {
                result.error = `File extension '.${extension}' is not allowed. Allowed: ${allowedExtensions.join(', ')}`;
                Log.warn('[FileValidator] Invalid extension:', result.error);
                return result;
            }

            // 4. Check MIME type
            if (file.type && !allowedMimeTypes.includes(file.type)) {
                result.error = `MIME type '${file.type}' is not allowed`;
                Log.warn('[FileValidator] Invalid MIME type:', result.error);
                return result;
            }

            // 5. Check magic bytes (file signature)
            if (checkMagicBytes && this._needsMagicBytesCheck(extension)) {
                const magicBytesValid = await this._validateMagicBytes(file, extension);
                if (!magicBytesValid.valid) {
                    result.error = magicBytesValid.error || 'Magic bytes validation failed';
                    Log.warn('[FileValidator] Magic bytes check failed:', result.error);
                    return result;
                }
                result.details.magicBytesMatch = magicBytesValid.matchedType;
            }

            // 6. Text file validation (JSON, XML, etc.)
            if (this._isTextFile(extension)) {
                const textValid = await this._validateTextFile(file, extension);
                if (!textValid.valid) {
                    result.error = textValid.error || 'Text file validation failed';
                    Log.warn('[FileValidator] Text file validation failed:', result.error);
                    return result;
                }
            }

            // All checks passed
            result.valid = true;
            Log.info('[FileValidator] File validation successful:', file.name);
            return result;

        } catch (error) {
            result.error = `Validation error: ${error.message}`;
            Log.error('[FileValidator] Validation exception:', error);
            return result;
        }
    },

    /**
     * Validate magic bytes (file signature)
     *
     * @private
     * @param {File} file - File to check
     * @param {string} extension - File extension
     * @returns {Promise<Object>} { valid: boolean, error?: string, matchedType?: string }
     */
    async _validateMagicBytes(file, extension) {
        try {
            // Read first 32 bytes (enough for most signatures)
            const headerBytes = await this._readFileBytes(file, 0, 32);

            // Find matching signatures
            const matches = MAGIC_BYTES.filter(magic => {
                // Check if extension matches
                if (!magic.extensions.includes(extension.toLowerCase())) {
                    return false;
                }

                // Check signature bytes
                for (let i = 0; i < magic.signature.length; i++) {
                    if (headerBytes[magic.offset + i] !== magic.signature[i]) {
                        return false;
                    }
                }

                // Extra check if defined (e.g., WEBP)
                if (magic.extraCheck && !magic.extraCheck(headerBytes)) {
                    return false;
                }

                return true;
            });

            if (matches.length === 0) {
                return {
                    valid: false,
                    error: `File signature does not match extension '.${extension}'. File may be corrupted or renamed.`
                };
            }

            return {
                valid: true,
                matchedType: matches[0].mime
            };

        } catch (error) {
            return {
                valid: false,
                error: `Error reading file signature: ${error.message}`
            };
        }
    },

    /**
     * Validate text-based files (JSON, XML, etc.)
     *
     * @private
     * @param {File} file - File to validate
     * @param {string} extension - File extension
     * @returns {Promise<Object>} { valid: boolean, error?: string }
     */
    async _validateTextFile(file, extension) {
        try {
            const text = await this._readFileAsText(file, 1024 * 1024); // Read first 1MB

            if (extension === 'json' || extension === 'geojson') {
                // Validate JSON syntax
                try {
                    JSON.parse(text);
                    return { valid: true };
                } catch (e) {
                    return {
                        valid: false,
                        error: `Invalid JSON: ${e.message}`
                    };
                }
            }

            if (extension === 'kml' || extension === 'gpx' || extension === 'svg') {
                // Basic XML validation
                if (!text.trim().startsWith('<?xml') && !text.trim().startsWith('<')) {
                    return {
                        valid: false,
                        error: 'Invalid XML: File does not start with XML declaration or tag'
                    };
                }
            }

            return { valid: true };

        } catch (error) {
            return {
                valid: false,
                error: `Error reading text file: ${error.message}`
            };
        }
    },

    /**
     * Read file bytes from start to end
     *
     * @private
     * @param {File} file - File to read
     * @param {number} start - Start byte position
     * @param {number} length - Number of bytes to read
     * @returns {Promise<Uint8Array>} Byte array
     */
    _readFileBytes(file, start, length) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const blob = file.slice(start, start + length);

            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                const bytes = new Uint8Array(arrayBuffer);
                resolve(bytes);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file bytes'));
            };

            reader.readAsArrayBuffer(blob);
        });
    },

    /**
     * Read file as text
     *
     * @private
     * @param {File} file - File to read
     * @param {number} [maxLength] - Maximum characters to read
     * @returns {Promise<string>} File text content
     */
    _readFileAsText(file, maxLength = null) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const blob = maxLength ? file.slice(0, maxLength) : file;

            reader.onload = (e) => {
                resolve(e.target.result);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file as text'));
            };

            reader.readAsText(blob);
        });
    },

    /**
     * Get file extension from filename
     *
     * @private
     * @param {string} filename - File name
     * @returns {string} Extension (without dot)
     */
    _getFileExtension(filename) {
        if (!filename || typeof filename !== 'string') return '';
        const parts = filename.split('.');
        return parts.length > 1 ? parts[parts.length - 1] : '';
    },

    /**
     * Check if file extension requires magic bytes validation
     *
     * @private
     * @param {string} extension - File extension
     * @returns {boolean}
     */
    _needsMagicBytesCheck(extension) {
        const ext = extension.toLowerCase();
        // Images and PDFs need magic bytes check
        const binaryExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'pdf'];
        return binaryExtensions.includes(ext);
    },

    /**
     * Check if file is text-based
     *
     * @private
     * @param {string} extension - File extension
     * @returns {boolean}
     */
    _isTextFile(extension) {
        const ext = extension.toLowerCase();
        const textExtensions = ['json', 'geojson', 'kml', 'gpx', 'svg', 'txt', 'csv'];
        return textExtensions.includes(ext);
    },

    /**
     * Format bytes to human-readable size
     *
     * @private
     * @param {number} bytes - Byte count
     * @returns {string} Formatted size (e.g., "1.5 MB")
     */
    _formatBytes(bytes) {
        // Phase 4 dedup: delegate to Formatters.formatFileSize
        return formatFileSize(bytes, { precision: 2 });
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Get configuration constants (for testing/documentation)
     *
     * @returns {Object} Configuration object
     */
    getConfig() {
        return {
            maxFileSize: MAX_FILE_SIZE,
            allowedExtensions: [...ALLOWED_EXTENSIONS],
            allowedMimeTypes: [...ALLOWED_MIME_TYPES],
            magicBytesSignatures: MAGIC_BYTES.map(m => ({
                mime: m.mime,
                extensions: m.extensions
            }))
        };
    }
};

// ========================================
//   EXPORT
// ========================================


