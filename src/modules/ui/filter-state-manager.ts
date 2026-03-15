/**
 * GeoLeaf UI Module - Filter State Manager
 * Gestion centralizede de the state des filters avec patterns observer
 *
 * @module ui/filter-state-manager
 * @author Assistant
 * @version 1.0.0
 */
import { Log } from "../log/index.js";

// ========================================
//   CENTRALIZED FILTER STATE
// ========================================

/**
 * Current state des filters
 * @type {Object}
 * @private
 */
const _filterState = {
    // STATE des filters par ID
    values: new Map(),

    // Metadata des filters
    metadata: new Map(),

    // Profil current
    activeProfile: null,

    // Callbacks observers
    observers: new Set(),
};

/**
 * Timestamps pour debouncing
 * @type {Map<string, number>}
 * @private
 */
const _debounceTimers = new Map();
const _ARRAY_FILTER_TYPES = new Set(["multiselect", "tree", "tree-category", "categoryTree"]);

// ========================================
//   GESTION DE L'STATE DES FILTRES
// ========================================

function _getDefaultForType(filter: any): unknown {
    if (_ARRAY_FILTER_TYPES.has(filter.type)) return filter.default ?? [];
    if (filter.type === "select") return filter.default ?? "";
    if (filter.type === "range") return filter.default ?? (filter.min + filter.max) / 2;
    return filter.default ?? "";
}

function _initFilterFromDesc(filter: any): void {
    if (!filter.id) return;
    const metadata = {
        type: filter.type,
        label: filter.label,
        required: !!filter.required,
        min: filter.min,
        max: filter.max,
        options: filter.options ?? [],
        optionsFrom: filter.optionsFrom,
    };
    _filterState.metadata.set(filter.id, metadata);
    _filterState.values.set(filter.id, _getDefaultForType(filter));
}

/**
 * Initializes the filter state from a profile
 * @param {Object} profile - Configuration of the profile
 * @returns {boolean} Successfully initialized
 */
function initializeFromProfile(profile: any) {
    if (!profile || !profile.filters) {
        if (Log) Log.warn("[UI.FilterStateManager] Profil ou filters manquants");
        return false;
    }

    // Reinitializes the state
    _filterState.values.clear();
    _filterState.metadata.clear();
    _filterState.activeProfile = profile;

    // Configure chaque filters avec ses values by default
    profile.filters.forEach(_initFilterFromDesc);

    // Notifie les observers
    _notifyObservers("init", null, _filterState.values);

    if (Log) {
        Log.info(`[UI.FilterStateManager] Initialized with ${_filterState.values.size} filters`);
    }

    return true;
}

/**
 * Updates the value d'a filter
 * @param {string} filterId - ID du filters
 * @param {*} value - Nouvelle value
 * @param {boolean} skipNotify - Skip notification (default: false)
 * @returns {boolean} Update success
 */
function updateFilterValue(filterId: any, value: any, skipNotify = false) {
    if (!filterId || !_filterState.metadata.has(filterId)) {
        if (Log) Log.warn(`[UI.FilterStateManager] Filtre inconnu: ${filterId}`);
        return false;
    }

    const metadata = _filterState.metadata.get(filterId);
    const oldValue = _filterState.values.get(filterId);

    // Validation selon the type
    const validatedValue = _validateFilterValue(value, metadata);
    if (validatedValue === null && value !== null) {
        if (Log) Log.warn(`[UI.FilterStateManager] Invalid value for ${filterId}:`, value);
        return false;
    }

    // Update
    _filterState.values.set(filterId, validatedValue);

    // Notification avec debouncing for thes ranges
    if (!skipNotify) {
        if (metadata.type === "range") {
            _notifyWithDebounce(filterId, "change", oldValue, validatedValue, 200);
        } else {
            _notifyObservers("change", filterId, validatedValue, oldValue);
        }
    }

    return true;
}

/**
 * Retrieves the value d'a filter
 * @param {string} filterId - ID du filters
 * @returns {*} Value du filters ou null si inexisting
 */
function getFilterValue(filterId: any) {
    return _filterState.values.get(filterId) || null;
}

/**
 * Retrieves toutes the values de filters
 * @returns {Object} Object avec filterId -> value
 */
function getAllFilterValues() {
    return Object.fromEntries(_filterState.values);
}

/**
 * Retrieves thes metadata d'a filter
 * @param {string} filterId - ID du filters
 * @returns {Object|null} Metadata ou null
 */
function getFilterMetadata(filterId: any) {
    return _filterState.metadata.get(filterId) || null;
}

/**
 * Resets all filters
 * @param {boolean} skipNotify - Skip notification (default: false)
 */
function resetAllFilters(skipNotify = false) {
    const oldState = new Map(_filterState.values);

    _filterState.values.forEach((value, filterId) => {
        const metadata = _filterState.metadata.get(filterId);
        if (!metadata) return;

        // Reset according to type
        let resetValue = null;
        switch (metadata.type) {
            case "multiselect":
            case "tree":
            case "tree-category":
            case "categoryTree":
                resetValue = [];
                break;
            case "range":
                resetValue = (metadata.min + metadata.max) / 2;
                break;
            default:
                resetValue = "";
        }

        _filterState.values.set(filterId, resetValue);
    });

    if (!skipNotify) {
        _notifyObservers("reset", null, _filterState.values, oldState);
    }
}

// ========================================
//   OBSERVER SYSTEM
// ========================================

/**
 * Adds a observer for thes changements d'state
 * @param {Function} callback - Fonction called whens changements
 * @returns {Function} Function to unsubscribe the observer
 */
function addObserver(callback: any) {
    if (typeof callback !== "function") {
        if (Log) Log.warn("[UI.FilterStateManager] Observer must be a function");
        return () => {};
    }

    _filterState.observers.add(callback);

    // Returns unsubscription function
    return function unsubscribe() {
        _filterState.observers.delete(callback);
    };
}

/**
 * Notifie tous les observers
 * @param {string} type - Type of changement ('init', 'change', 'reset')
 * @param {string|null} filterId - Changed filter ID (null for global)
 * @param {*} newValue - Nouvelle value
 * @param {*} oldValue - Ancienne value
 * @private
 */
function _notifyObservers(type: any, filterId: any, newValue: any, oldValue?: any) {
    const event = {
        type,
        filterId,
        newValue,
        oldValue,
        timestamp: Date.now(),
        allValues: Object.fromEntries(_filterState.values),
    };

    _filterState.observers.forEach((callback) => {
        try {
            (callback as any)(event);
        } catch (error) {
            if (Log) Log.error("[UI.FilterStateManager] Error in observer:", error);
        }
    });
}

/**
 * Notification avec debouncing
 * @param {string} filterId - ID du filters
 * @param {string} type - Type d'event
 * @param {*} oldValue - Ancienne value
 * @param {*} newValue - Nouvelle value
 * @param {number} delay - Delay de debounce
 * @private
 */
function _notifyWithDebounce(filterId: any, type: any, oldValue: any, newValue: any, delay: any) {
    // Clear existing timer
    if (_debounceTimers.has(filterId)) {
        clearTimeout(_debounceTimers.get(filterId));
    }

    // Set new timer
    const timer = setTimeout(() => {
        _notifyObservers(type, filterId, newValue, oldValue);
        _debounceTimers.delete(filterId);
    }, delay);

    _debounceTimers.set(filterId, timer);
}

// ========================================
//   VALIDATION DE VALEURS
// ========================================

function _validateRangeValue(value: any, metadata: any): number {
    const num = parseFloat(value);
    if (isNaN(num)) return metadata.min ?? 0;
    if (metadata.min !== undefined && num < metadata.min) return metadata.min;
    if (metadata.max !== undefined && num > metadata.max) return metadata.max;
    return num;
}

/**
 * Valide a value based on thes metadata du filters
 * @param {*} value - Value to valider
 * @param {Object} metadata - Metadata du filters
 * @returns {*} Value validated ou null si invalid
 * @private
 */
function _validateFilterValue(value: any, metadata: any) {
    if (!metadata) return null;
    if (_ARRAY_FILTER_TYPES.has(metadata.type)) return Array.isArray(value) ? value : [];
    if (metadata.type === "select") return typeof value === "string" ? value : "";
    if (metadata.type === "range") return _validateRangeValue(value, metadata);
    return value;
}

// ========================================
//   QUERY UTILITIES
// ========================================

function _rangeDefaultVal(metadata: any): number {
    return (metadata.min + metadata.max) / 2;
}

function _isFilterActive(metadata: any, value: any): boolean {
    if (_ARRAY_FILTER_TYPES.has(metadata.type)) return Array.isArray(value) && value.length > 0;
    if (metadata.type === "select") return !!value && value !== "";
    if (metadata.type === "range") return Math.abs(value - _rangeDefaultVal(metadata)) > 0.01;
    return false;
}

function _getFilterDisplayValue(metadata: any, value: any): string {
    if (_ARRAY_FILTER_TYPES.has(metadata.type)) return `${(value as unknown[]).length} selected(s)`;
    if (metadata.type === "select") return value as string;
    if (metadata.type === "range") return (value as number).toString().replace(".", ",");
    return "";
}

/**
 * Checks if des filters sont currentlement actives
 * @returns {boolean} True si au moins a filter est active
 */
function hasActiveFilters() {
    for (const [filterId, value] of _filterState.values) {
        const metadata = _filterState.metadata.get(filterId);
        if (!metadata) continue;
        if (_isFilterActive(metadata, value)) return true;
    }
    return false;
}

/**
 * Retrieves a summary of active filters
 * @returns {Array} List des filters actives with theurs values
 */
function getActiveFiltersSummary() {
    const summary = [];
    for (const [filterId, value] of _filterState.values) {
        const metadata = _filterState.metadata.get(filterId);
        if (!metadata) continue;
        if (!_isFilterActive(metadata, value)) continue;
        summary.push({
            id: filterId,
            label: metadata.label || filterId,
            value: _getFilterDisplayValue(metadata, value),
            type: metadata.type,
        });
    }
    return summary;
}

// ========================================
//   API PUBLIQUE
// ========================================

const _UIFilterStateManager = {
    initializeFromProfile,
    updateFilterValue,
    getFilterValue,
    getAllFilterValues,
    getFilterMetadata,
    resetAllFilters,
    addObserver,
    hasActiveFilters,
    getActiveFiltersSummary,
};

// Properties as read-only
Object.defineProperty(_UIFilterStateManager, "activeProfile", {
    get: () => _filterState.activeProfile,
    enumerable: true,
});

Object.defineProperty(_UIFilterStateManager, "filterCount", {
    get: () => _filterState.values.size,
    enumerable: true,
});

// ── ESM Export ──
export { _UIFilterStateManager };
