/**
 * GeoLeaf UI Module - Filter State Manager
 * Gestion centralisée de l'état des filtres avec patterns observateur
 *
 * @module ui/filter-state-manager
 * @author Assistant
 * @version 1.0.0
 */
import { Log } from '../log/index.js';

// ========================================
//   ÉTAT CENTRALISÉ DES FILTRES
// ========================================

/**
 * État actuel des filtres
 * @type {Object}
 * @private
 */
let _filterState = {
    // État des filtres par ID
    values: new Map(),

    // Métadonnées des filtres
    metadata: new Map(),

    // Profil actuel
    activeProfile: null,

    // Callbacks observers
    observers: new Set()
};

/**
 * Timestamps pour debouncing
 * @type {Map<string, number>}
 * @private
 */
const _debounceTimers = new Map();

// ========================================
//   GESTION DE L'ÉTAT DES FILTRES
// ========================================

/**
 * Initialise l'état des filtres depuis un profil
 * @param {Object} profile - Configuration du profil
 * @returns {boolean} Succès de l'initialisation
 */
function initializeFromProfile(profile) {
    if (!profile || !profile.filters) {
        if (Log) Log.warn("[UI.FilterStateManager] Profil ou filtres manquants");
        return false;
    }

    // Réinitialise l'état
    _filterState.values.clear();
    _filterState.metadata.clear();
    _filterState.activeProfile = profile;

    // Configure chaque filtre avec ses valeurs par défaut
    profile.filters.forEach(filter => {
        if (!filter.id) return;

        const metadata = {
            type: filter.type,
            label: filter.label,
            required: !!filter.required,
            min: filter.min,
            max: filter.max,
            options: filter.options || [],
            optionsFrom: filter.optionsFrom
        };

        _filterState.metadata.set(filter.id, metadata);

        // Valeur par défaut selon le type
        let defaultValue = null;
        switch (filter.type) {
            case 'select':
            case 'multiselect':
                defaultValue = filter.default || (filter.type === 'multiselect' ? [] : '');
                break;
            case 'range':
                defaultValue = filter.default ?? ((filter.min + filter.max) / 2);
                break;
            case 'tree':
            case 'tree-category':
            case 'categoryTree':
                defaultValue = filter.default || [];
                break;
            default:
                defaultValue = filter.default || '';
        }

        _filterState.values.set(filter.id, defaultValue);
    });

    // Notifie les observateurs
    _notifyObservers('init', null, _filterState.values);

    if (Log) {
        Log.info(`[UI.FilterStateManager] Initialisé avec ${_filterState.values.size} filtres`);
    }

    return true;
}

/**
 * Met à jour la valeur d'un filtre
 * @param {string} filterId - ID du filtre
 * @param {*} value - Nouvelle valeur
 * @param {boolean} skipNotify - Éviter la notification (défaut: false)
 * @returns {boolean} Succès de la mise à jour
 */
function updateFilterValue(filterId, value, skipNotify = false) {
    if (!filterId || !_filterState.metadata.has(filterId)) {
        if (Log) Log.warn(`[UI.FilterStateManager] Filtre inconnu: ${filterId}`);
        return false;
    }

    const metadata = _filterState.metadata.get(filterId);
    const oldValue = _filterState.values.get(filterId);

    // Validation selon le type
    const validatedValue = _validateFilterValue(value, metadata);
    if (validatedValue === null && value !== null) {
        if (Log) Log.warn(`[UI.FilterStateManager] Valeur invalide pour ${filterId}:`, value);
        return false;
    }

    // Mise à jour
    _filterState.values.set(filterId, validatedValue);

    // Notification avec debouncing pour les ranges
    if (!skipNotify) {
        if (metadata.type === 'range') {
            _notifyWithDebounce(filterId, 'change', oldValue, validatedValue, 200);
        } else {
            _notifyObservers('change', filterId, validatedValue, oldValue);
        }
    }

    return true;
}

/**
 * Récupère la valeur d'un filtre
 * @param {string} filterId - ID du filtre
 * @returns {*} Valeur du filtre ou null si inexistant
 */
function getFilterValue(filterId) {
    return _filterState.values.get(filterId) || null;
}

/**
 * Récupère toutes les valeurs de filtres
 * @returns {Object} Object avec filterId -> value
 */
function getAllFilterValues() {
    return Object.fromEntries(_filterState.values);
}

/**
 * Récupère les métadonnées d'un filtre
 * @param {string} filterId - ID du filtre
 * @returns {Object|null} Métadonnées ou null
 */
function getFilterMetadata(filterId) {
    return _filterState.metadata.get(filterId) || null;
}

/**
 * Remet à zéro tous les filtres
 * @param {boolean} skipNotify - Éviter la notification (défaut: false)
 */
function resetAllFilters(skipNotify = false) {
    const oldState = new Map(_filterState.values);

    _filterState.values.forEach((value, filterId) => {
        const metadata = _filterState.metadata.get(filterId);
        if (!metadata) return;

        // Remise à zéro selon le type
        let resetValue = null;
        switch (metadata.type) {
            case 'multiselect':
            case 'tree':
            case 'tree-category':
            case 'categoryTree':
                resetValue = [];
                break;
            case 'range':
                resetValue = (metadata.min + metadata.max) / 2;
                break;
            default:
                resetValue = '';
        }

        _filterState.values.set(filterId, resetValue);
    });

    if (!skipNotify) {
        _notifyObservers('reset', null, _filterState.values, oldState);
    }
}

// ========================================
//   SYSTÈME D'OBSERVATEURS
// ========================================

/**
 * Ajoute un observateur pour les changements d'état
 * @param {Function} callback - Fonction appelée lors des changements
 * @returns {Function} Fonction pour désabonner l'observateur
 */
function addObserver(callback) {
    if (typeof callback !== 'function') {
        if (Log) Log.warn("[UI.FilterStateManager] Observateur doit être une fonction");
        return () => {};
    }

    _filterState.observers.add(callback);

    // Retourne fonction de désabonnement
    return function unsubscribe() {
        _filterState.observers.delete(callback);
    };
}

/**
 * Notifie tous les observateurs
 * @param {string} type - Type de changement ('init', 'change', 'reset')
 * @param {string|null} filterId - ID du filtre changé (null pour global)
 * @param {*} newValue - Nouvelle valeur
 * @param {*} oldValue - Ancienne valeur
 * @private
 */
function _notifyObservers(type, filterId, newValue, oldValue) {
    const event = {
        type,
        filterId,
        newValue,
        oldValue,
        timestamp: Date.now(),
        allValues: Object.fromEntries(_filterState.values)
    };

    _filterState.observers.forEach(callback => {
        try {
            callback(event);
        } catch (error) {
            if (Log) Log.error("[UI.FilterStateManager] Erreur dans observateur:", error);
        }
    });
}

/**
 * Notification avec debouncing
 * @param {string} filterId - ID du filtre
 * @param {string} type - Type d'événement
 * @param {*} oldValue - Ancienne valeur
 * @param {*} newValue - Nouvelle valeur
 * @param {number} delay - Délai de debounce
 * @private
 */
function _notifyWithDebounce(filterId, type, oldValue, newValue, delay) {
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

/**
 * Valide une valeur selon les métadonnées du filtre
 * @param {*} value - Valeur à valider
 * @param {Object} metadata - Métadonnées du filtre
 * @returns {*} Valeur validée ou null si invalide
 * @private
 */
function _validateFilterValue(value, metadata) {
    if (!metadata) return null;

    switch (metadata.type) {
        case 'select':
            return typeof value === 'string' ? value : '';

        case 'multiselect':
            return Array.isArray(value) ? value : [];

        case 'range':
            const num = parseFloat(value);
            if (isNaN(num)) return metadata.min || 0;
            if (metadata.min !== undefined && num < metadata.min) return metadata.min;
            if (metadata.max !== undefined && num > metadata.max) return metadata.max;
            return num;

        case 'tree':
        case 'tree-category':
        case 'categoryTree':
            return Array.isArray(value) ? value : [];

        default:
            return value;
    }
}

// ========================================
//   UTILITAIRES DE REQUÊTES
// ========================================

/**
 * Vérifie si des filtres sont actuellement actifs
 * @returns {boolean} True si au moins un filtre est actif
 */
function hasActiveFilters() {
    for (const [filterId, value] of _filterState.values) {
        const metadata = _filterState.metadata.get(filterId);
        if (!metadata) continue;

        // Vérifie selon le type si la valeur est "active"
        switch (metadata.type) {
            case 'multiselect':
            case 'tree':
            case 'tree-category':
            case 'categoryTree':
                if (Array.isArray(value) && value.length > 0) return true;
                break;
            case 'select':
                if (value && value !== '') return true;
                break;
            case 'range':
                // Considère actif si différent de la valeur par défaut
                const defaultVal = (metadata.min + metadata.max) / 2;
                if (Math.abs(value - defaultVal) > 0.01) return true;
                break;
        }
    }
    return false;
}

/**
 * Récupère un résumé des filtres actifs
 * @returns {Array} Liste des filtres actifs avec leurs valeurs
 */
function getActiveFiltersSummary() {
    const summary = [];

    for (const [filterId, value] of _filterState.values) {
        const metadata = _filterState.metadata.get(filterId);
        if (!metadata) continue;

        let isActive = false;
        let displayValue = '';

        switch (metadata.type) {
            case 'multiselect':
            case 'tree':
            case 'tree-category':
            case 'categoryTree':
                if (Array.isArray(value) && value.length > 0) {
                    isActive = true;
                    displayValue = `${value.length} sélectionné(s)`;
                }
                break;
            case 'select':
                if (value && value !== '') {
                    isActive = true;
                    displayValue = value;
                }
                break;
            case 'range':
                const defaultVal = (metadata.min + metadata.max) / 2;
                if (Math.abs(value - defaultVal) > 0.01) {
                    isActive = true;
                    displayValue = value.toString().replace('.', ',');
                }
                break;
        }

        if (isActive) {
            summary.push({
                id: filterId,
                label: metadata.label || filterId,
                value: displayValue,
                type: metadata.type
            });
        }
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
    getActiveFiltersSummary
};

// Propriétés en lecture seule
Object.defineProperty(_UIFilterStateManager, 'activeProfile', {
    get: () => _filterState.activeProfile,
    enumerable: true
});

Object.defineProperty(_UIFilterStateManager, 'filterCount', {
    get: () => _filterState.values.size,
    enumerable: true
});

// ── ESM Export ──
export { _UIFilterStateManager };
