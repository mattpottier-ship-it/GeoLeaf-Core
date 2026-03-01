/**
 * GeoLeaf File Validator Module
 * Security-focused file validation for uploads
 *
 * @module utils/file-validator
 * @version 1.0.0
 */

import { Log } from "../log/index.js";
import { formatFileSize } from "./formatters";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export interface MagicBytesEntry {
    signature: number[];
    offset: number;
    mime: string;
    extensions: string[];
    extraCheck?: (bytes: number[]) => boolean;
}

const MAGIC_BYTES: MagicBytesEntry[] = [
    { signature: [0xff, 0xd8, 0xff], offset: 0, mime: "image/jpeg", extensions: ["jpg", "jpeg"] },
    {
        signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        offset: 0,
        mime: "image/png",
        extensions: ["png"],
    },
    { signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], offset: 0, mime: "image/gif", extensions: ["gif"] },
    { signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], offset: 0, mime: "image/gif", extensions: ["gif"] },
    {
        signature: [0x52, 0x49, 0x46, 0x46],
        offset: 0,
        mime: "image/webp",
        extensions: ["webp"],
        extraCheck: (bytes) =>
            bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50,
    },
    { signature: [0x42, 0x4d], offset: 0, mime: "image/bmp", extensions: ["bmp"] },
    { signature: [0x25, 0x50, 0x44, 0x46], offset: 0, mime: "application/pdf", extensions: ["pdf"] },
    { signature: [0x50, 0x4b, 0x03, 0x04], offset: 0, mime: "application/zip", extensions: ["zip", "kmz"] },
    { signature: [0x50, 0x4b, 0x05, 0x06], offset: 0, mime: "application/zip", extensions: ["zip", "kmz"] },
    { signature: [0x50, 0x4b, 0x07, 0x08], offset: 0, mime: "application/zip", extensions: ["zip", "kmz"] },
];

const ALLOWED_EXTENSIONS = [
    "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg",
    "geojson", "json", "kml", "gpx", "kmz",
    "pdf", "txt", "csv",
];

const ALLOWED_MIME_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml",
    "application/json", "application/geo+json", "application/vnd.google-earth.kml+xml",
    "application/vnd.google-earth.kmz", "application/gpx+xml",
    "application/pdf", "text/plain", "text/csv",
    "application/zip",
];

export interface ValidateFileOptions {
    maxSize?: number;
    allowedExtensions?: string[];
    allowedMimeTypes?: string[];
    checkMagicBytes?: boolean;
}

export interface ValidationResult {
    valid: boolean;
    error: string | null;
    details: {
        fileName: string;
        fileSize: number;
        mimeType: string;
        extension: string;
        magicBytesMatch?: string;
    };
}

export const FileValidator = {
    async validateFile(
        file: File,
        options: ValidateFileOptions = {}
    ): Promise<ValidationResult> {
        const {
            maxSize = MAX_FILE_SIZE,
            allowedExtensions = ALLOWED_EXTENSIONS,
            allowedMimeTypes = ALLOWED_MIME_TYPES,
            checkMagicBytes = true,
        } = options;

        const result: ValidationResult = {
            valid: false,
            error: null,
            details: {
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                extension: this._getFileExtension(file.name),
            },
        };

        try {
            if (!file) {
                result.error = "No file provided";
                return result;
            }

            if (file.name) {
                const dangerousPatterns = [
                    /\.\./,
                    /[/\\]/,
                    /[\0-\x1f]/,
                    /^\.+$/,
                ];
                for (const pattern of dangerousPatterns) {
                    if (pattern.test(file.name)) {
                        result.error = "Filename contains dangerous characters (path traversal attempt?)";
                        Log.warn("[FileValidator] Dangerous filename rejected:", file.name.substring(0, 50));
                        return result;
                    }
                }
                if (file.name.length > 255) {
                    result.error = "Filename too long (max 255 characters)";
                    return result;
                }
            }

            if (file.size > maxSize) {
                result.error = `File size (${this._formatBytes(file.size)}) exceeds maximum allowed (${this._formatBytes(maxSize)})`;
                Log.warn("[FileValidator] File too large:", result.error);
                return result;
            }

            if (file.size === 0) {
                result.error = "File is empty";
                return result;
            }

            const extension = this._getFileExtension(file.name);
            if (!extension) {
                result.error = "File has no extension";
                return result;
            }

            if (!allowedExtensions.includes(extension.toLowerCase())) {
                result.error = `File extension '.${extension}' is not allowed. Allowed: ${allowedExtensions.join(", ")}`;
                Log.warn("[FileValidator] Invalid extension:", result.error);
                return result;
            }

            if (file.type && !allowedMimeTypes.includes(file.type)) {
                result.error = `MIME type '${file.type}' is not allowed`;
                Log.warn("[FileValidator] Invalid MIME type:", result.error);
                return result;
            }

            if (checkMagicBytes && this._needsMagicBytesCheck(extension)) {
                const magicBytesValid = await this._validateMagicBytes(file, extension);
                if (!magicBytesValid.valid) {
                    result.error = magicBytesValid.error ?? "Magic bytes validation failed";
                    Log.warn("[FileValidator] Magic bytes check failed:", result.error);
                    return result;
                }
                result.details.magicBytesMatch = magicBytesValid.matchedType;
            }

            if (this._isTextFile(extension)) {
                const textValid = await this._validateTextFile(file, extension);
                if (!textValid.valid) {
                    result.error = textValid.error ?? "Text file validation failed";
                    Log.warn("[FileValidator] Text file validation failed:", result.error);
                    return result;
                }
            }

            result.valid = true;
            Log.info("[FileValidator] File validation successful:", file.name);
            return result;
        } catch (error) {
            result.error = `Validation error: ${(error as Error).message}`;
            Log.error("[FileValidator] Validation exception:", error);
            return result;
        }
    },

    async _validateMagicBytes(
        file: File,
        extension: string
    ): Promise<{ valid: boolean; error?: string; matchedType?: string }> {
        try {
            const headerBytes = await this._readFileBytes(file, 0, 32);

            const matches = MAGIC_BYTES.filter((magic) => {
                if (!magic.extensions.includes(extension.toLowerCase())) return false;
                for (let i = 0; i < magic.signature.length; i++) {
                    if (headerBytes[magic.offset + i] !== magic.signature[i]) return false;
                }
                if (magic.extraCheck && !magic.extraCheck(Array.from(headerBytes))) return false;
                return true;
            });

            if (matches.length === 0) {
                return {
                    valid: false,
                    error: `File signature does not match extension '.${extension}'. File may be corrupted or renamed.`,
                };
            }
            return { valid: true, matchedType: matches[0].mime };
        } catch (error) {
            return {
                valid: false,
                error: `Error reading file signature: ${(error as Error).message}`,
            };
        }
    },

    async _validateTextFile(
        file: File,
        extension: string
    ): Promise<{ valid: boolean; error?: string }> {
        try {
            const text = await this._readFileAsText(file, 1024 * 1024);

            if (extension === "json" || extension === "geojson") {
                try {
                    JSON.parse(text);
                    return { valid: true };
                } catch (e) {
                    return { valid: false, error: `Invalid JSON: ${(e as Error).message}` };
                }
            }

            if (extension === "kml" || extension === "gpx" || extension === "svg") {
                if (!text.trim().startsWith("<?xml") && !text.trim().startsWith("<")) {
                    return {
                        valid: false,
                        error: "Invalid XML: File does not start with XML declaration or tag",
                    };
                }
            }

            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error: `Error reading text file: ${(error as Error).message}`,
            };
        }
    },

    _readFileBytes(file: File, start: number, length: number): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const blob = file.slice(start, start + length);
            reader.onload = (e) => {
                const arrayBuffer = (e.target as FileReader).result as ArrayBuffer;
                resolve(new Uint8Array(arrayBuffer));
            };
            reader.onerror = () => reject(new Error("Failed to read file bytes"));
            reader.readAsArrayBuffer(blob);
        });
    },

    _readFileAsText(file: File, maxLength: number | null = null): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const blob = maxLength ? file.slice(0, maxLength) : file;
            reader.onload = (e) => resolve((e.target as FileReader).result as string);
            reader.onerror = () => reject(new Error("Failed to read file as text"));
            reader.readAsText(blob);
        });
    },

    _getFileExtension(filename: string): string {
        if (!filename || typeof filename !== "string") return "";
        const parts = filename.split(".");
        return parts.length > 1 ? parts[parts.length - 1] ?? "" : "";
    },

    _needsMagicBytesCheck(extension: string): boolean {
        const ext = extension.toLowerCase();
        const binaryExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "pdf"];
        return binaryExtensions.includes(ext);
    },

    _isTextFile(extension: string): boolean {
        const ext = extension.toLowerCase();
        const textExtensions = ["json", "geojson", "kml", "gpx", "svg", "txt", "csv"];
        return textExtensions.includes(ext);
    },

    _formatBytes(bytes: number): string {
        return formatFileSize(bytes, { precision: 2 });
    },

    getConfig(): {
        maxFileSize: number;
        allowedExtensions: string[];
        allowedMimeTypes: string[];
        magicBytesSignatures: Array<{ mime: string; extensions: string[] }>;
    } {
        return {
            maxFileSize: MAX_FILE_SIZE,
            allowedExtensions: [...ALLOWED_EXTENSIONS],
            allowedMimeTypes: [...ALLOWED_MIME_TYPES],
            magicBytesSignatures: MAGIC_BYTES.map((m) => ({ mime: m.mime, extensions: m.extensions })),
        };
    },
};
