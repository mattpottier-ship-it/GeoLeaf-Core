/**
 * @deprecated Remplacé par un simple spinner CSS dans demo/index.html (#gl-loader). À supprimer après validation.
 */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * Module Loading Screen
 * Affiche un écran de chargement fullscreen avec spinner et barre de progression
 *
 * DÉPENDANCES:
 * - Aucune dépendance externe requise
 * - Styles injectés dynamiquement
 *
 * EXPOSE:
 * - GeoLeaf.UI.LoadingScreen
 *
 * @module LoadingScreen
 * @public
 */
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
    GeoLeaf.UI = GeoLeaf.UI || {};

    /**
     * État du module
     */
    const _state = {
        initialized: false,
        visible: false,
        progress: 0,
        container: null,
        progressBar: null,
        spinner: null
    };

    /**
     * Module Loading Screen
     * @namespace LoadingScreen
     * @public
     */
    const LoadingScreen = {
        /**
         * Initialise l'écran de chargement
         * Crée le DOM et injecte les styles
         */
        init() {
            if (_state.initialized) {
                return;
            }

            // Injecter les styles CSS
            this._injectStyles();

            // Créer le container principal
            _state.container = document.createElement('div');
            _state.container.id = 'gl-loading-screen';
            _state.container.className = 'gl-loading-screen';

            // Créer le contenu
            const content = document.createElement('div');
            content.className = 'gl-loading-screen__content';

            // Créer le spinner
            const spinnerContainer = document.createElement('div');
            spinnerContainer.className = 'gl-loading-screen__spinner-container';

            _state.spinner = document.createElement('div');
            _state.spinner.className = 'gl-loading-screen__spinner';
            spinnerContainer.appendChild(_state.spinner);

            // Créer la barre de progression
            const progressContainer = document.createElement('div');
            progressContainer.className = 'gl-loading-screen__progress-container';

            _state.progressBar = document.createElement('div');
            _state.progressBar.className = 'gl-loading-screen__progress-bar';
            progressContainer.appendChild(_state.progressBar);

            // Assembler
            content.appendChild(spinnerContainer);
            content.appendChild(progressContainer);
            _state.container.appendChild(content);

            // Ajouter au DOM
            document.body.appendChild(_state.container);

            _state.initialized = true;
            _state.visible = true;
        },

        /**
         * Met à jour la barre de progression
         * @param {number} percent - Pourcentage de progression (0-100)
         */
        updateProgress(percent) {
            if (!_state.initialized || !_state.progressBar) {
                return;
            }

            // Limiter entre 0 et 100
            percent = Math.max(0, Math.min(100, percent));
            _state.progress = percent;

            // Mettre à jour la largeur de la barre
            _state.progressBar.style.width = percent + '%';
        },

        /**
         * Ferme l'écran de chargement avec une animation
         */
        close() {
            if (!_state.initialized || !_state.visible) {
                return;
            }

            _state.visible = false;

            // Définir la barre à 100%
            if (_state.progressBar) {
                _state.progressBar.style.width = '100%';
            }

            // Ajouter classe de fermeture pour animation
            if (_state.container) {
                _state.container.classList.add('gl-loading-screen--closing');

                // Supprimer après l'animation (300ms)
                setTimeout(() => {
                    if (_state.container && _state.container.parentNode) {
                        _state.container.parentNode.removeChild(_state.container);
                    }
                }, 300);
            }
        },

        /**
         * Injecte les styles CSS
         * @private
         */
        _injectStyles() {
            if (document.getElementById('gl-loading-screen-style')) {
                return;
            }

            const styleEl = document.createElement('style');
            styleEl.id = 'gl-loading-screen-style';
            styleEl.textContent = `
                /* Keyframes */
                @keyframes gl-loading-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes gl-loading-fade-out {
                    from {
                        opacity: 1;
                    }
                    to {
                        opacity: 0;
                    }
                }

                /* Container principal */
                .gl-loading-screen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.95);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    pointer-events: all;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }

                .gl-loading-screen--closing {
                    animation: gl-loading-fade-out 0.3s ease-out forwards;
                }

                /* Contenu */
                .gl-loading-screen__content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 40px;
                }

                /* Spinner */
                .gl-loading-screen__spinner-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .gl-loading-screen__spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(0, 0, 0, 0.12);
                    border-top: 4px solid rgba(0, 0, 0, 0.55);
                    border-radius: 50%;
                    animation: gl-loading-spin 1s linear infinite;
                }

                /* Barre de progression */
                .gl-loading-screen__progress-container {
                    width: 300px;
                    max-width: 80vw;
                    height: 4px;
                    background: rgba(0, 0, 0, 0.12);
                    border-radius: 2px;
                    overflow: hidden;
                }

                .gl-loading-screen__progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #1976d2, #1565c0);
                    border-radius: 2px;
                    width: 0%;
                    transition: width 0.3s ease;
                    box-shadow: 0 0 8px rgba(25, 118, 210, 0.4);
                }

                /* Responsive */
                @media (max-width: 600px) {
                    .gl-loading-screen__content {
                        gap: 30px;
                    }

                    .gl-loading-screen__spinner {
                        width: 40px;
                        height: 40px;
                        border-width: 3px;
                    }

                    .gl-loading-screen__progress-container {
                        width: 200px;
                    }
                }
            `;

            document.head.appendChild(styleEl);
        }
    };

    // Exporter le module
    GeoLeaf.UI.LoadingScreen = LoadingScreen;

})(typeof window !== 'undefined' ? window : global);
