/* eslint-disable security/detect-object-injection */
/**

 * @module GeoLeaf.Utils.Formatters

 * Formatters pour dates, nombres, distances et autres values

 * @version 1.0.0

 */

export interface FormatterConfig {
    locale: string;

    dateFormat: Intl.DateTimeFormatOptions;

    dateTimeFormat: Intl.DateTimeFormatOptions;

    distanceUnits: "metric" | "imperial";
}

const defaultConfig: FormatterConfig = {
    locale: "fr-FR",

    dateFormat: { year: "numeric", month: "long", day: "numeric" },

    dateTimeFormat: {
        year: "numeric",

        month: "long",

        day: "numeric",

        hour: "2-digit",

        minute: "2-digit",
    },

    distanceUnits: "metric",
};

export interface FormatDistanceOptions {
    unit?: "metric" | "imperial";

    precision?: number;

    showUnit?: boolean;

    locale?: string;
}

function _imperialDistance(meters: number): { value: number; label: string } {
    const miles = meters * 0.000621371;

    if (miles < 0.1) return { value: meters * 3.28084, label: "ft" };

    return { value: miles, label: "mi" };
}

function _metricDistance(meters: number): { value: number; label: string } {
    if (meters < 1000) return { value: meters, label: "m" };

    return { value: meters / 1000, label: "km" };
}

export function formatDistance(
    distanceInMeters: number | null | undefined,

    options: FormatDistanceOptions = {}
): string {
    const {
        unit = defaultConfig.distanceUnits,

        precision = 2,

        showUnit = true,

        locale = defaultConfig.locale,
    } = options;

    if (distanceInMeters == null || isNaN(distanceInMeters)) {
        return showUnit ? "0 m" : "0";
    }

    const { value, label: unitLabel } =
        unit === "imperial"
            ? _imperialDistance(distanceInMeters)
            : _metricDistance(distanceInMeters);

    const fractionDigits = unitLabel === "m" || unitLabel === "ft" ? 0 : precision;

    const formatted = value.toLocaleString(locale, {
        minimumFractionDigits: fractionDigits,

        maximumFractionDigits: fractionDigits,
    });

    return showUnit ? `${formatted} ${unitLabel}` : formatted;
}

export type DateStyle = "short" | "medium" | "long" | "full";

export interface FormatDateOptions {
    locale?: string;

    style?: DateStyle;

    format?: Intl.DateTimeFormatOptions;
}

export function formatDate(date: Date | string | number, options: FormatDateOptions = {}): string {
    const { locale = defaultConfig.locale, style = "medium", format = null } = options;

    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) return "";

    const formats: Record<DateStyle, Intl.DateTimeFormatOptions> = {
        short: { year: "numeric", month: "2-digit", day: "2-digit" },

        medium: { year: "numeric", month: "long", day: "numeric" },

        long: { year: "numeric", month: "long", day: "numeric", weekday: "long" },

        full: {
            year: "numeric",

            month: "long",

            day: "numeric",

            weekday: "long",

            hour: "2-digit",

            minute: "2-digit",
        },
    };

    const formatOptions = format ?? formats[style] ?? formats.medium;

    return dateObj.toLocaleDateString(locale, formatOptions);
}

export function formatDateTime(
    date: Date | string | number,

    options: FormatDateOptions = {}
): string {
    const { locale = defaultConfig.locale, style = "medium", format = null } = options;

    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) return "";

    const formats: Record<DateStyle, Intl.DateTimeFormatOptions> = {
        short: {
            year: "numeric",

            month: "2-digit",

            day: "2-digit",

            hour: "2-digit",

            minute: "2-digit",
        },

        medium: {
            year: "numeric",

            month: "long",

            day: "numeric",

            hour: "2-digit",

            minute: "2-digit",
        },

        long: {
            year: "numeric",

            month: "long",

            day: "numeric",

            weekday: "long",

            hour: "2-digit",

            minute: "2-digit",

            second: "2-digit",
        },

        full: {
            year: "numeric",

            month: "long",

            day: "numeric",

            hour: "2-digit",

            minute: "2-digit",
        },
    };

    const formatOptions = format ?? formats[style] ?? formats.medium;

    return dateObj.toLocaleString(locale, formatOptions);
}

export interface FormatNumberOptions {
    locale?: string;

    decimals?: number | null;

    minDecimals?: number;

    maxDecimals?: number;
}

export function formatNumber(
    value: number | null | undefined,

    options: FormatNumberOptions = {}
): string {
    const {
        locale = defaultConfig.locale,

        decimals = null,

        minDecimals = 0,

        maxDecimals = 2,
    } = options;

    if (value == null || isNaN(value)) return "0";

    const formatOptions: Intl.NumberFormatOptions = {};

    if (decimals !== null) {
        formatOptions.minimumFractionDigits = decimals;

        formatOptions.maximumFractionDigits = decimals;
    } else {
        formatOptions.minimumFractionDigits = minDecimals;

        formatOptions.maximumFractionDigits = maxDecimals;
    }

    return value.toLocaleString(locale, formatOptions);
}

export interface FormatFileSizeOptions {
    precision?: number;

    locale?: string;
}

export function formatFileSize(
    bytes: number | null | undefined,

    options: FormatFileSizeOptions = {}
): string {
    const { precision = 2, locale = defaultConfig.locale } = options;

    if (bytes == null || isNaN(bytes) || bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];

    const k = 1024;

    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);

    const value = bytes / Math.pow(k, i);

    const formatted = value.toLocaleString(locale, {
        minimumFractionDigits: i === 0 ? 0 : precision,

        maximumFractionDigits: i === 0 ? 0 : precision,
    });

    return `${formatted} ${units[i]}`;
}

export function toGB(bytes: number | null | undefined, precision: number = 2): string {
    if (!bytes || bytes === 0) return "0";

    return (bytes / 1024 / 1024 / 1024).toFixed(precision);
}

export function toMB(bytes: number | null | undefined, precision: number = 1): string {
    if (!bytes || bytes === 0) return "0";

    return (bytes / 1024 / 1024).toFixed(precision);
}

export function configure(config: Partial<FormatterConfig>): void {
    Object.assign(defaultConfig, config);
}

export function getConfig(): FormatterConfig {
    return { ...defaultConfig };
}
