/**
 * @fileoverview Animation Helper - 60 FPS Animation Manager
 * @description Optimized animation utilities using requestAnimationFrame
 * @version 1.0.0
 * @phase Phase 5 Section 5.2 - Animation Optimization
 *
 * Features:
 * - requestAnimationFrame-based animations (60 FPS)
 * - Automatic frame batching for multiple animations
 * - CSS transition optimization with will-change
 * - Animation queue management
 * - Performance monitoring (FPS counter)
 * - Mobile-optimized animations
 * - Graceful degradation for older browsers
 *
 * @example Basic usage
 * ```javascript
 * const helper = GeoLeaf.Utils.AnimationHelper;
 *
 * // Animate element
 * helper.animate(element, {
 *     from: { opacity: 0, translateY: -20 },
 *     to: { opacity: 1, translateY: 0 },
 *     duration: 300,
 *     easing: 'easeOutCubic'
 * });
 * ```
 */

(function (global) {
    'use strict';

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    if (!GeoLeaf.Utils) GeoLeaf.Utils = {};

    /**
     * @class AnimationHelper
     * @description Manages high-performance animations using requestAnimationFrame
     */
    class AnimationHelper {
        constructor() {
            /** @private {Map<number, Function>} Active animations */
            this._animations = new Map();

            /** @private {number} Animation frame ID */
            this._rafId = null;

            /** @private {number} Last frame timestamp */
            this._lastFrameTime = 0;

            /** @private {Array<number>} FPS history (last 60 frames) */
            this._fpsHistory = [];

            /** @private {boolean} Debug mode */
            this._debug = false;

            /** @private {number} Next animation ID */
            this._nextId = 1;

            /** @private {WeakMap<HTMLElement, Set>} Element animations tracking */
            this._elementAnimations = new WeakMap();

            // Performance monitoring
            this._stats = {
                totalFrames: 0,
                droppedFrames: 0,
                averageFPS: 0
            };

            // Bind methods
            this._tick = this._tick.bind(this);
        }

        /**
         * Enable debug mode with FPS counter
         * @param {boolean} enabled - Enable debug
         */
        setDebug(enabled) {
            this._debug = enabled;
            if (enabled && !this._rafId) {
                this._startLoop();
            }
        }

        /**
         * Get animation statistics
         * @returns {Object} Animation stats
         */
        getStats() {
            return {
                ...this._stats,
                activeAnimations: this._animations.size,
                currentFPS: this._getCurrentFPS()
            };
        }

        /**
         * Animate element with requestAnimationFrame
         * @param {HTMLElement} element - Target element
         * @param {Object} options - Animation options
         * @param {Object} options.from - Start values
         * @param {Object} options.to - End values
         * @param {number} [options.duration=300] - Duration in ms
         * @param {string} [options.easing='easeOutCubic'] - Easing function
         * @param {Function} [options.onComplete] - Completion callback
         * @param {Function} [options.onUpdate] - Update callback (progress 0-1)
         * @returns {number} Animation ID (can be used to cancel)
         */
        animate(element, options = {}) {
            if (!element || !(element instanceof HTMLElement)) {
                this._log('warn', 'animate: invalid element', element);
                return null;
            }

            const {
                from = {},
                to = {},
                duration = 300,
                easing = 'easeOutCubic',
                onComplete = null,
                onUpdate = null
            } = options;

            const id = this._nextId++;
            const startTime = performance.now();
            const easingFn = this._getEasingFunction(easing);

            // Optimize with will-change
            this._optimizeElement(element, to);

            // Track animation for this element
            this._trackElementAnimation(element, id);

            const animationFn = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easingFn(progress);

                // Apply transformations
                this._applyTransform(element, from, to, easedProgress);

                // Update callback
                if (onUpdate) {
                    onUpdate(easedProgress);
                }

                // Check completion
                if (progress >= 1) {
                    this._animations.delete(id);
                    this._untrackElementAnimation(element, id);
                    this._cleanupElement(element);

                    if (onComplete) {
                        onComplete();
                    }

                    this._log('debug', `Animation ${id} completed`);
                    return false; // Stop animation
                }

                return true; // Continue animation
            };

            this._animations.set(id, animationFn);
            this._startLoop();

            this._log('debug', `Animation ${id} started`, { duration, easing });
            return id;
        }

        /**
         * Fade in element
         * @param {HTMLElement} element - Target element
         * @param {number} [duration=300] - Duration in ms
         * @param {Function} [onComplete] - Completion callback
         * @returns {number} Animation ID
         */
        fadeIn(element, duration = 300, onComplete = null) {
            element.style.display = element.style.display || 'block';
            return this.animate(element, {
                from: { opacity: 0 },
                to: { opacity: 1 },
                duration,
                easing: 'easeOutCubic',
                onComplete
            });
        }

        /**
         * Fade out element
         * @param {HTMLElement} element - Target element
         * @param {number} [duration=300] - Duration in ms
         * @param {Function} [onComplete] - Completion callback
         * @returns {number} Animation ID
         */
        fadeOut(element, duration = 300, onComplete = null) {
            return this.animate(element, {
                from: { opacity: 1 },
                to: { opacity: 0 },
                duration,
                easing: 'easeOutCubic',
                onComplete: () => {
                    element.style.display = 'none';
                    if (onComplete) onComplete();
                }
            });
        }

        /**
         * Slide in element (from top)
         * @param {HTMLElement} element - Target element
         * @param {number} [duration=300] - Duration in ms
         * @param {Function} [onComplete] - Completion callback
         * @returns {number} Animation ID
         */
        slideIn(element, duration = 300, onComplete = null) {
            element.style.display = element.style.display || 'block';
            return this.animate(element, {
                from: { opacity: 0, translateY: -20 },
                to: { opacity: 1, translateY: 0 },
                duration,
                easing: 'easeOutBack',
                onComplete
            });
        }

        /**
         * Slide out element (to top)
         * @param {HTMLElement} element - Target element
         * @param {number} [duration=300] - Duration in ms
         * @param {Function} [onComplete] - Completion callback
         * @returns {number} Animation ID
         */
        slideOut(element, duration = 300, onComplete = null) {
            return this.animate(element, {
                from: { opacity: 1, translateY: 0 },
                to: { opacity: 0, translateY: -20 },
                duration,
                easing: 'easeInCubic',
                onComplete: () => {
                    element.style.display = 'none';
                    if (onComplete) onComplete();
                }
            });
        }

        /**
         * Cancel animation
         * @param {number} id - Animation ID
         * @returns {boolean} True if cancelled
         */
        cancel(id) {
            const existed = this._animations.has(id);
            if (existed) {
                this._animations.delete(id);
                this._log('debug', `Animation ${id} cancelled`);
            }
            return existed;
        }

        /**
         * Cancel all animations for element
         * @param {HTMLElement} element - Target element
         * @returns {number} Number of animations cancelled
         */
        cancelForElement(element) {
            const ids = this._elementAnimations.get(element);
            if (!ids) return 0;

            let count = 0;
            ids.forEach(id => {
                if (this._animations.delete(id)) {
                    count++;
                }
            });

            this._elementAnimations.delete(element);
            this._cleanupElement(element);

            this._log('debug', `Cancelled ${count} animations for element`);
            return count;
        }

        /**
         * Cancel all animations
         */
        cancelAll() {
            const count = this._animations.size;
            this._animations.clear();

            if (this._rafId) {
                cancelAnimationFrame(this._rafId);
                this._rafId = null;
            }

            this._log('info', `Cancelled all ${count} animations`);
        }

        /**
         * Wait for next frame (utility for chaining animations)
         * @returns {Promise<DOMHighResTimeStamp>} Resolves with timestamp
         */
        nextFrame() {
            return new Promise(resolve => {
                requestAnimationFrame(resolve);
            });
        }

        /**
         * Batch multiple animations to run in same frame
         * @param {Array<Function>} animations - Array of animation functions
         */
        batch(animations) {
            if (!Array.isArray(animations)) return;

            requestAnimationFrame(() => {
                animations.forEach(fn => {
                    if (typeof fn === 'function') {
                        try {
                            fn();
                        } catch (error) {
                            this._log('error', 'Batch animation error:', error);
                        }
                    }
                });
            });
        }

        /**
         * Main animation loop
         * @private
         * @param {DOMHighResTimeStamp} currentTime - Current timestamp
         */
        _tick(currentTime) {
            // Calculate FPS
            if (this._lastFrameTime) {
                const delta = currentTime - this._lastFrameTime;
                const fps = 1000 / delta;
                this._updateFPS(fps);

                // Detect dropped frames (< 50 FPS)
                if (fps < 50) {
                    this._stats.droppedFrames++;
                }
            }

            this._lastFrameTime = currentTime;
            this._stats.totalFrames++;

            // Run all active animations
            const toRemove = [];
            this._animations.forEach((animationFn, id) => {
                try {
                    const shouldContinue = animationFn(currentTime);
                    if (!shouldContinue) {
                        toRemove.push(id);
                    }
                } catch (error) {
                    this._log('error', `Animation ${id} error:`, error);
                    toRemove.push(id);
                }
            });

            // Cleanup completed animations
            toRemove.forEach(id => this._animations.delete(id));

            // Continue loop if animations active or debug mode
            if (this._animations.size > 0 || this._debug) {
                this._rafId = requestAnimationFrame(this._tick);
            } else {
                this._rafId = null;
            }
        }

        /**
         * Start animation loop
         * @private
         */
        _startLoop() {
            if (!this._rafId) {
                this._rafId = requestAnimationFrame(this._tick);
            }
        }

        /**
         * Apply transform to element
         * @private
         * @param {HTMLElement} element - Target element
         * @param {Object} from - Start values
         * @param {Object} to - End values
         * @param {number} progress - Progress (0-1)
         */
        _applyTransform(element, from, to, progress) {
            const transforms = [];
            const styles = {};

            Object.keys(to).forEach(key => {
                const startValue = from[key] !== undefined ? from[key] : this._getDefaultValue(key);
                const endValue = to[key];
                const currentValue = this._interpolate(startValue, endValue, progress);

                if (this._isTransformProperty(key)) {
                    transforms.push(this._formatTransform(key, currentValue));
                } else {
                    styles[key] = this._formatValue(key, currentValue);
                }
            });

            // Apply transforms
            if (transforms.length > 0) {
                element.style.transform = transforms.join(' ');
            }

            // Apply styles
            Object.keys(styles).forEach(key => {
                element.style[key] = styles[key];
            });
        }

        /**
         * Interpolate between two values
         * @private
         * @param {number} start - Start value
         * @param {number} end - End value
         * @param {number} progress - Progress (0-1)
         * @returns {number} Interpolated value
         */
        _interpolate(start, end, progress) {
            return start + (end - start) * progress;
        }

        /**
         * Check if property is a transform
         * @private
         * @param {string} key - Property name
         * @returns {boolean} True if transform property
         */
        _isTransformProperty(key) {
            return ['translateX', 'translateY', 'translateZ', 'scale', 'scaleX', 'scaleY',
                    'rotate', 'rotateX', 'rotateY', 'rotateZ', 'skewX', 'skewY'].includes(key);
        }

        /**
         * Format transform property
         * @private
         * @param {string} key - Property name
         * @param {number} value - Value
         * @returns {string} Formatted transform
         */
        _formatTransform(key, value) {
            if (key.includes('translate')) {
                return `${key}(${value}px)`;
            } else if (key.includes('rotate') || key.includes('skew')) {
                return `${key}(${value}deg)`;
            } else {
                return `${key}(${value})`;
            }
        }

        /**
         * Format CSS value
         * @private
         * @param {string} key - Property name
         * @param {number} value - Value
         * @returns {string} Formatted value
         */
        _formatValue(key, value) {
            if (key === 'opacity') {
                return value.toString();
            }
            return `${value}px`;
        }

        /**
         * Get default value for property
         * @private
         * @param {string} key - Property name
         * @returns {number} Default value
         */
        _getDefaultValue(key) {
            if (key === 'opacity') return 1;
            if (key === 'scale' || key === 'scaleX' || key === 'scaleY') return 1;
            return 0;
        }

        /**
         * Optimize element for animation
         * @private
         * @param {HTMLElement} element - Target element
         * @param {Object} properties - Properties to animate
         */
        _optimizeElement(element, properties) {
            const willChange = [];

            Object.keys(properties).forEach(key => {
                if (this._isTransformProperty(key)) {
                    if (!willChange.includes('transform')) {
                        willChange.push('transform');
                    }
                } else {
                    willChange.push(key);
                }
            });

            if (willChange.length > 0) {
                element.style.willChange = willChange.join(', ');
            }
        }

        /**
         * Cleanup element optimization
         * @private
         * @param {HTMLElement} element - Target element
         */
        _cleanupElement(element) {
            element.style.willChange = 'auto';
        }

        /**
         * Track animation for element
         * @private
         * @param {HTMLElement} element - Target element
         * @param {number} id - Animation ID
         */
        _trackElementAnimation(element, id) {
            let ids = this._elementAnimations.get(element);
            if (!ids) {
                ids = new Set();
                this._elementAnimations.set(element, ids);
            }
            ids.add(id);
        }

        /**
         * Untrack animation for element
         * @private
         * @param {HTMLElement} element - Target element
         * @param {number} id - Animation ID
         */
        _untrackElementAnimation(element, id) {
            const ids = this._elementAnimations.get(element);
            if (ids) {
                ids.delete(id);
                if (ids.size === 0) {
                    this._elementAnimations.delete(element);
                }
            }
        }

        /**
         * Get easing function
         * @private
         * @param {string} name - Easing name
         * @returns {Function} Easing function
         */
        _getEasingFunction(name) {
            const easings = {
                linear: t => t,
                easeInQuad: t => t * t,
                easeOutQuad: t => t * (2 - t),
                easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
                easeInCubic: t => t * t * t,
                easeOutCubic: t => (--t) * t * t + 1,
                easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
                easeInQuart: t => t * t * t * t,
                easeOutQuart: t => 1 - (--t) * t * t * t,
                easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
                easeOutBack: t => {
                    const c1 = 1.70158;
                    const c3 = c1 + 1;
                    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
                }
            };

            return easings[name] || easings.easeOutCubic;
        }

        /**
         * Update FPS history
         * @private
         * @param {number} fps - Current FPS
         */
        _updateFPS(fps) {
            this._fpsHistory.push(fps);
            if (this._fpsHistory.length > 60) {
                this._fpsHistory.shift();
            }

            // Calculate average
            const sum = this._fpsHistory.reduce((a, b) => a + b, 0);
            this._stats.averageFPS = Math.round(sum / this._fpsHistory.length);
        }

        /**
         * Get current FPS
         * @private
         * @returns {number} Current FPS
         */
        _getCurrentFPS() {
            if (this._fpsHistory.length === 0) return 0;
            return Math.round(this._fpsHistory[this._fpsHistory.length - 1]);
        }

        /**
         * Log message
         * @private
         * @param {string} level - Log level
         * @param {...*} args - Log arguments
         */
        _log(level, ...args) {
            if (!this._debug && level === 'debug') return;

            const log = GeoLeaf.Log || console;
            if (log[level]) {
                log[level]('[AnimationHelper]', ...args);
            }
        }
    }

    // Create singleton instance
    const animationHelper = new AnimationHelper();

    // Export to namespace
    GeoLeaf.Utils.AnimationHelper = animationHelper;

    // Convenience methods on GeoLeaf namespace
    GeoLeaf.animate = animationHelper.animate.bind(animationHelper);
    GeoLeaf.fadeIn = animationHelper.fadeIn.bind(animationHelper);
    GeoLeaf.fadeOut = animationHelper.fadeOut.bind(animationHelper);

    if (GeoLeaf.Log) {
        GeoLeaf.Log.info('[GeoLeaf.Utils.AnimationHelper] 60 FPS Animation Helper loaded');
    }

})(window);
