/**
 * Extensions spécifiques à la page de démonstration
 *
 * Ce fichier contient les fonctionnalités réservées à la page de démo :
 * - Système de logs verbeux avec contrôle DemoLog
 * - Sélecteur de thèmes CSS pour tester différents styles
 * - Sélecteur de profils avec rechargement de la page
 *
 * Ces fonctionnalités ne doivent PAS être déployées en production client
 */
(function () {
    "use strict";

    // ============================================================
    // 1) Système de logs démo avec mode verbeux
    // ============================================================
    window.DemoLog = {
        _isVerbose: false,

        setVerbose(enabled) {
            this._isVerbose = enabled;
            if (enabled) {
                console.info("[Demo] Mode verbeux activé pour la démonstration");
            }
        },

        log(...args) {
            if (this._isVerbose ||
                location.search.includes('debug=true') ||
                location.search.includes('verbose=true')) {
                console.log(...args);
            }
        },

        info(...args) {
            console.info(...args);
        },

        progress(message, details = null) {
            if (this._isVerbose || location.search.includes('debug=true')) {
                console.log(`[GeoLeaf.Demo] ${message}`, details || '');
            }
        },

        warn(...args) {
            console.warn(...args);
        },

        error(...args) {
            console.error(...args);
        }
    };

    // Auto-configuration du mode verbeux
    if (location.search.includes('verbose=true')) {
        window.DemoLog.setVerbose(true);
    } else {
        console.info("🔇 [Demo] Logs de démonstration réduits - ajoutez ?verbose=true pour les détails");
    }

    // ============================================================
    // 2) Sélecteur de thème CSS (pour tester différents styles)
    // ============================================================
    (function demoThemeSelector() {
        var LINK_ID = 'gl-demo-theme-css';
        var STORAGE_KEY = 'gl-demo-theme';

        var THEMES = {
            default: '',
            green: 'css/geoleaf-theme-green.css',
            alt: 'css/geoleaf-theme-alt.css'
        };

        function ensureLink() {
            var link = document.getElementById(LINK_ID);
            if (!link) {
                link = document.createElement('link');
                link.rel = 'stylesheet';
                link.id = LINK_ID;
                document.head.appendChild(link);
            }
            return link;
        }

        function applyTheme(key) {
            try {
                var href = THEMES.hasOwnProperty(key) ? THEMES[key] : '';
                var link = ensureLink();
                if (href) {
                    link.href = href;
                } else {
                    link.removeAttribute('href');
                }
                try {
                    localStorage.setItem(STORAGE_KEY, key);
                } catch (e) {
                    DemoLog.warn('[Demo] Impossible de sauvegarder le thème:', e);
                }
                DemoLog.info('[Demo] Thème appliqué:', key);
            } catch (e) {
                console.warn('[GeoLeaf.Demo] Erreur lors de l\'application du thème:', e);
            }
        }

        // API publique pour usage manuel
        window.GeoLeafDemoTheme = {
            THEMES: THEMES,
            apply: applyTheme
        };

        // Appliquer le thème sauvegardé
        var stored = 'default';
        try {
            stored = localStorage.getItem(STORAGE_KEY) || 'default';
        } catch (e) {
            DemoLog.warn('[Demo] Impossible de lire le thème sauvegardé:', e);
        }
        applyTheme(stored);

        // Connecter le sélecteur dans le DOM
        function bindSelector() {
            var sel = document.getElementById('gl-theme-select');
            if (!sel) {
                DemoLog.log('[Demo] Sélecteur de thème non trouvé dans le DOM');
                return;
            }

            try {
                sel.value = stored || 'default';
            } catch (e) {
                DemoLog.warn('[Demo] Erreur lors de la définition de la valeur du sélecteur:', e);
            }

            sel.addEventListener('change', function () {
                var v = sel.value || 'default';
                applyTheme(v);
            });

            DemoLog.log('[Demo] Sélecteur de thème CSS connecté');
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindSelector);
        } else {
            bindSelector();
        }
    })();

    // ============================================================
    // 3) Sélecteur de profil avec rechargement de page
    // ============================================================
    function initProfileSelector() {
        var profileSelect = document.getElementById('gl-profile-select');

        if (!profileSelect) {
            DemoLog.log('[Demo] Sélecteur de profil non trouvé dans le DOM (normal si pas de header)');
            return;
        }

        profileSelect.addEventListener('change', function(e) {
            var newProfileId = e.target.value;

            DemoLog.info('[Demo] 🔄 Changement de profil vers:', newProfileId);

            try {
                sessionStorage.setItem('gl-selected-profile', newProfileId);
                DemoLog.log('[Demo] Rechargement de la page avec le profil:', newProfileId);
                window.location.reload();
            } catch (err) {
                console.error('[GeoLeaf.Demo] Erreur lors du changement de profil:', err);
                alert('Erreur lors du changement de profil. Voir la console.');
            }
        });

        // Mettre à jour le sélecteur pour refléter le profil actif après chargement
        setTimeout(function() {
            if (window.GeoLeaf && window.GeoLeaf.Config) {
                var activeProfileId = window.GeoLeaf.Config.getActiveProfileId();
                if (activeProfileId && profileSelect.value !== activeProfileId) {
                    profileSelect.value = activeProfileId;
                    DemoLog.log('[Demo] Sélecteur mis à jour avec profil actif:', activeProfileId);
                }
            }
        }, 1000);

        DemoLog.info('[Demo] Sélecteur de profil initialisé');
    }

    // Initialiser au chargement du DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProfileSelector);
    } else {
        initProfileSelector();
    }

    DemoLog.info('[Demo] Extensions de démonstration chargées');

})();
