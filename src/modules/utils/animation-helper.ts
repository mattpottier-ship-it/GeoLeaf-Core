/**
 * @fileoverview Animation Helper - 60 FPS Animation Manager
 * @version 1.0.0
 */

import { Log } from "../log/index.js";

const _TRANSFORM_PROPS = new Set([
    "translateX", "translateY", "translateZ", "scale", "scaleX", "scaleY",
    "rotate", "rotateX", "rotateY", "rotateZ", "skewX", "skewY",
]);

type EasingFn = (t: number) => number;

const _EASINGS: Record<string, EasingFn> = {
    linear: (t) => t,
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => --t * t * t + 1,
    easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
    easeInQuart: (t) => t * t * t * t,
    easeOutQuart: (t) => 1 - --t * t * t * t,
    easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),
    easeOutBack: (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
};

export interface AnimateOptions {
    from?: Record<string, number>;
    to?: Record<string, number>;
    duration?: number;
    easing?: string;
    onComplete?: () => void;
    onUpdate?: (progress: number) => void;
}

export class AnimationHelper {
    private _animations = new Map<number, (currentTime: number) => boolean>();
    private _rafId: number | null = null;
    private _lastFrameTime = 0;
    private _fpsHistory: number[] = [];
    private _debug = false;
    private _nextId = 1;
    private _elementAnimations = new WeakMap<HTMLElement, Set<number>>();
    private _stats = { totalFrames: 0, droppedFrames: 0, averageFPS: 0 };

    constructor() {
        this._tick = this._tick.bind(this);
    }

    setDebug(enabled: boolean): void {
        this._debug = enabled;
        if (enabled && !this._rafId) this._startLoop();
    }

    getStats(): { totalFrames: number; droppedFrames: number; averageFPS: number; activeAnimations: number; currentFPS: number } {
        return {
            ...this._stats,
            activeAnimations: this._animations.size,
            currentFPS: this._getCurrentFPS(),
        };
    }

    animate(element: HTMLElement | null, options: AnimateOptions = {}): number | null {
        if (!element || !(element instanceof HTMLElement)) {
            this._log("warn", "animate: invalid element", element);
            return null;
        }
        const {
            from = {},
            to = {},
            duration = 300,
            easing = "easeOutCubic",
            onComplete = null,
            onUpdate = null,
        } = options;

        const id = this._nextId++;
        const startTime = performance.now();
        const easingFn = this._getEasingFunction(easing);

        this._optimizeElement(element, to);
        this._trackElementAnimation(element, id);

        const animationFn = (currentTime: number): boolean => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFn(progress);

            this._applyTransform(element, from, to, easedProgress);
            if (onUpdate) onUpdate(easedProgress);

            if (progress >= 1) {
                this._animations.delete(id);
                this._untrackElementAnimation(element, id);
                this._cleanupElement(element);
                if (onComplete) onComplete();
                this._log("debug", `Animation ${id} completed`);
                return false;
            }
            return true;
        };

        this._animations.set(id, animationFn);
        this._startLoop();
        this._log("debug", `Animation ${id} started`, { duration, easing });
        return id;
    }

    fadeIn(element: HTMLElement, duration = 300, onComplete?: () => void): number | null {
        if (element.style.display === "none") element.style.display = "block";
        return this.animate(element, { from: { opacity: 0 }, to: { opacity: 1 }, duration, easing: "easeOutCubic", onComplete });
    }

    fadeOut(element: HTMLElement, duration = 300, onComplete?: () => void): number | null {
        return this.animate(element, {
            from: { opacity: 1 },
            to: { opacity: 0 },
            duration,
            easing: "easeOutCubic",
            onComplete: () => {
                element.style.display = "none";
                if (onComplete) onComplete();
            },
        });
    }

    slideIn(element: HTMLElement, duration = 300, onComplete?: () => void): number | null {
        element.style.display = element.style.display || "block";
        return this.animate(element, {
            from: { opacity: 0, translateY: -20 },
            to: { opacity: 1, translateY: 0 },
            duration,
            easing: "easeOutBack",
            onComplete,
        });
    }

    slideOut(element: HTMLElement, duration = 300, onComplete?: () => void): number | null {
        return this.animate(element, {
            from: { opacity: 1, translateY: 0 },
            to: { opacity: 0, translateY: -20 },
            duration,
            easing: "easeInCubic",
            onComplete: () => {
                element.style.display = "none";
                if (onComplete) onComplete();
            },
        });
    }

    cancel(id: number): boolean {
        const existed = this._animations.has(id);
        if (existed) {
            this._animations.delete(id);
            this._log("debug", `Animation ${id} cancelled`);
        }
        return existed;
    }

    cancelForElement(element: HTMLElement): number {
        const ids = this._elementAnimations.get(element);
        if (!ids) return 0;
        let count = 0;
        ids.forEach((id) => {
            if (this._animations.delete(id)) count++;
        });
        this._elementAnimations.delete(element);
        this._cleanupElement(element);
        this._log("debug", `Cancelled ${count} animations for element`);
        return count;
    }

    cancelAll(): void {
        const count = this._animations.size;
        this._animations.clear();
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this._log("info", `Cancelled all ${count} animations`);
    }

    nextFrame(): Promise<DOMHighResTimeStamp> {
        return new Promise((resolve) => requestAnimationFrame(resolve));
    }

    batch(animations: (() => void)[]): void {
        if (!Array.isArray(animations)) return;
        requestAnimationFrame(() => {
            animations.forEach((fn) => {
                if (typeof fn === "function") {
                    try {
                        fn();
                    } catch (error) {
                        this._log("error", "Batch animation error:", error);
                    }
                }
            });
        });
    }

    private _tick(currentTime: number): void {
        if (this._lastFrameTime) {
            const delta = currentTime - this._lastFrameTime;
            const fps = 1000 / delta;
            this._updateFPS(fps);
            if (fps < 50) this._stats.droppedFrames++;
        }
        this._lastFrameTime = currentTime;
        this._stats.totalFrames++;

        const toRemove: number[] = [];
        this._animations.forEach((animationFn, id) => {
            try {
                if (!animationFn(currentTime)) toRemove.push(id);
            } catch (error) {
                this._log("error", `Animation ${id} error:`, error);
                toRemove.push(id);
            }
        });
        toRemove.forEach((id) => this._animations.delete(id));

        if (this._animations.size > 0 || this._debug) {
            this._rafId = requestAnimationFrame(this._tick);
        } else {
            this._rafId = null;
        }
    }

    private _startLoop(): void {
        if (!this._rafId) this._rafId = requestAnimationFrame(this._tick);
    }

    private _applyTransform(
        element: HTMLElement,
        from: Record<string, number>,
        to: Record<string, number>,
        progress: number
    ): void {
        const transforms: string[] = [];
        const styles: Record<string, string> = {};
        Object.keys(to).forEach((key) => {
            const startValue = from[key] !== undefined ? from[key] : this._getDefaultValue(key);
            const endValue = to[key];
            const currentValue = this._interpolate(startValue, endValue, progress);
            if (_TRANSFORM_PROPS.has(key)) {
                transforms.push(this._formatTransform(key, currentValue));
            } else {
                styles[key] = this._formatValue(key, currentValue);
            }
        });
        if (transforms.length > 0) element.style.transform = transforms.join(" ");
        Object.assign(element.style, styles);
    }

    private _interpolate(start: number, end: number, progress: number): number {
        return start + (end - start) * progress;
    }

    private _formatTransform(key: string, value: number): string {
        if (key.includes("translate")) return `${key}(${value}px)`;
        if (key.includes("rotate") || key.includes("skew")) return `${key}(${value}deg)`;
        return `${key}(${value})`;
    }

    private _formatValue(key: string, value: number): string {
        if (key === "opacity") return value.toString();
        return `${value}px`;
    }

    private _getDefaultValue(key: string): number {
        if (key === "opacity") return 1;
        if (key === "scale" || key === "scaleX" || key === "scaleY") return 1;
        return 0;
    }

    private _optimizeElement(element: HTMLElement, properties: Record<string, number>): void {
        const willChange: string[] = [];
        Object.keys(properties).forEach((key) => {
            if (_TRANSFORM_PROPS.has(key)) {
                if (!willChange.includes("transform")) willChange.push("transform");
            } else {
                willChange.push(key);
            }
        });
        if (willChange.length > 0) element.style.willChange = willChange.join(", ");
    }

    private _cleanupElement(element: HTMLElement): void {
        element.style.willChange = "auto";
    }

    private _trackElementAnimation(element: HTMLElement, id: number): void {
        let ids = this._elementAnimations.get(element);
        if (!ids) {
            ids = new Set();
            this._elementAnimations.set(element, ids);
        }
        ids.add(id);
    }

    private _untrackElementAnimation(element: HTMLElement, id: number): void {
        const ids = this._elementAnimations.get(element);
        if (ids) {
            ids.delete(id);
            if (ids.size === 0) this._elementAnimations.delete(element);
        }
    }

    private _getEasingFunction(name: string): EasingFn {
        return _EASINGS[name] ?? _EASINGS.easeOutCubic;
    }

    private _updateFPS(fps: number): void {
        this._fpsHistory.push(fps);
        if (this._fpsHistory.length > 60) this._fpsHistory.shift();
        const sum = this._fpsHistory.reduce((a, b) => a + b, 0);
        this._stats.averageFPS = Math.round(sum / this._fpsHistory.length);
    }

    private _getCurrentFPS(): number {
        if (this._fpsHistory.length === 0) return 0;
        return Math.round(this._fpsHistory[this._fpsHistory.length - 1]!);
    }

    private _log(level: string, ...args: unknown[]): void {
        if (!this._debug && level === "debug") return;
        const log = (Log ?? console) as unknown as Record<string, (...a: unknown[]) => void>;
        if (typeof log[level] === "function") log[level]("[AnimationHelper]", ...args);
    }
}

let _animationHelperInstance: AnimationHelper | null = null;

export function getAnimationHelper(): AnimationHelper {
    if (!_animationHelperInstance) _animationHelperInstance = new AnimationHelper();
    return _animationHelperInstance;
}
