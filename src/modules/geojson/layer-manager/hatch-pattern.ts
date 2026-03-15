/**
 * GeoLeaf GeoJSON - Hatch Pattern Utilities
 * SVG hatch pattern creation and application for polygon fills.
 * Extracted from layer-manager/style.js (Phase 8.2.1)
 *
 * @module geojson/layer-manager/hatch-pattern
 */
"use strict";

/**
 * Créer un pattern SVG for the hachurage.
 * Returns the ID (string) du pattern, à passer à `_applyHatchToLayer`.
 * Les patterns sont réellement injectés in the DOM dans `_applyHatchToLayer`.
 *
 * @param {string} layerId - ID de the layer (pour l'unicité du pattern)
 * @param {Object} hatchConfig - Configuration du hachurage
 * @returns {string|null} patternId, ou null si hachurage désactivé
 */
function _parseHatchConfig(hatchConfig: any) {
    const type = hatchConfig.type ?? "diagonal";
    const angle = hatchConfig.angleDeg ?? 0;
    const spacing = hatchConfig.spacingPx ?? 10;
    const color = hatchConfig.stroke?.color ?? "#000000";
    const strokeColor = color.replace("#", "");
    const strokeWidth = hatchConfig.stroke?.widthPx ?? 1;
    const strokeOpacity = hatchConfig.stroke?.opacity ?? 1;
    const colorWithHash = color.startsWith("#") ? color : `#${color}`;
    return { type, angle, spacing, strokeColor, strokeWidth, strokeOpacity, colorWithHash };
}

export function _createHatchPattern(layerId: any, hatchConfig: any) {
    if (!hatchConfig || !hatchConfig.enabled) {
        return null;
    }

    const { type, angle, spacing, strokeColor, strokeWidth, strokeOpacity, colorWithHash } =
        _parseHatchConfig(hatchConfig);
    // Hash of parameters to create a unique ID
    const configHash = `${type}-${angle}-${spacing}-${strokeColor}-${strokeWidth}-${strokeOpacity}`;
    const patternId = `hatch-${layerId}-${configHash}`;

    // If the pattern already exists, reuse it
    const existingPattern = document.getElementById(patternId);
    if (existingPattern) {
        return patternId;
    }

    // Create the SVG pattern
    const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern") as any;
    pattern.setAttribute("id", patternId);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", spacing);
    pattern.setAttribute("height", spacing);

    _addShapeToPattern(pattern, type, spacing, colorWithHash, strokeWidth, strokeOpacity, angle);

    // Return just the pattern ID.
    // Patterns will be injected into the Leaflet SVG in _applyHatchToLayer.
    return patternId;
}

/**
 * Finds the SVG element containing the paths of a Leaflet layer.
 * Layers on custom panes (geoleaf-layer-XX) have their own SVG.
 *
 * @param {L.Layer} layer - Leaflet layer
 * @returns {SVGSVGElement|null}
 */
export function _findLayerSvg(layer: any) {
    // 1. Search via the layer's own path
    if (layer._path && layer._path.ownerSVGElement) {
        return layer._path.ownerSVGElement;
    }

    // 2. For groups, search via the first sublayer with a path
    if (typeof layer.eachLayer === "function") {
        let found: any = null;
        layer.eachLayer((sublayer: any) => {
            if (!found && sublayer._path && sublayer._path.ownerSVGElement) {
                found = sublayer._path.ownerSVGElement;
            }
        });
        if (found) return found;
    }

    // 3. Search via the layer's renderer (Leaflet stores the renderer)
    const renderer = layer._renderer || layer._map?._renderer;
    if (renderer && renderer._container && renderer._container.tagName === "svg") {
        return renderer._container;
    }

    // 4. Fallback: search across all panes (not only overlay-pane)
    const svgs = document.querySelectorAll(".leaflet-pane svg");
    if (svgs.length === 1) return svgs[0];

    // 5. Last fallback: overlay-pane
    return document.querySelector(".leaflet-overlay-pane svg");
}
function _makeSvgLine(
    ns: string,
    x1: any,
    y1: any,
    x2: any,
    y2: any,
    color: string,
    sw: any,
    op: any
) {
    const line = document.createElementNS(ns, "line") as any;
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", sw);
    line.setAttribute("stroke-opacity", op);
    return line;
}
function _addDotToPattern(
    pattern: any,
    ns: string,
    spacing: number,
    colorWithHash: string,
    strokeOpacity: any
): void {
    const circle = document.createElementNS(ns, "circle") as any;
    circle.setAttribute("cx", spacing / 2);
    circle.setAttribute("cy", spacing / 2);
    circle.setAttribute("r", Math.max(0.3, spacing * 0.07));
    circle.setAttribute("fill", colorWithHash);
    circle.setAttribute("fill-opacity", strokeOpacity);
    pattern.appendChild(circle);
}

function _addDiagonalToPattern(
    pattern: any,
    ns: string,
    spacing: number,
    colorWithHash: string,
    strokeWidth: any,
    strokeOpacity: any,
    angle: any
): void {
    const line = _makeSvgLine(
        ns,
        "0",
        "0",
        spacing,
        spacing,
        colorWithHash,
        strokeWidth,
        strokeOpacity
    );
    if (angle != null && angle !== 45) {
        pattern.setAttribute("patternTransform", `rotate(${angle} ${spacing / 2} ${spacing / 2})`);
    }
    pattern.appendChild(line);
}

function _addCrossToPattern(
    pattern: any,
    ns: string,
    spacing: number,
    colorWithHash: string,
    strokeWidth: any,
    strokeOpacity: any
): void {
    pattern.appendChild(
        _makeSvgLine(
            ns,
            "0",
            spacing / 2,
            spacing,
            spacing / 2,
            colorWithHash,
            strokeWidth,
            strokeOpacity
        )
    );
    pattern.appendChild(
        _makeSvgLine(
            ns,
            spacing / 2,
            "0",
            spacing / 2,
            spacing,
            colorWithHash,
            strokeWidth,
            strokeOpacity
        )
    );
}

function _addXToPattern(
    pattern: any,
    ns: string,
    spacing: number,
    colorWithHash: string,
    strokeWidth: any,
    strokeOpacity: any
): void {
    pattern.appendChild(
        _makeSvgLine(ns, "0", "0", spacing, spacing, colorWithHash, strokeWidth, strokeOpacity)
    );
    pattern.appendChild(
        _makeSvgLine(ns, spacing, "0", "0", spacing, colorWithHash, strokeWidth, strokeOpacity)
    );
}

function _addLineToPattern(
    pattern: any,
    ns: string,
    x1: any,
    y1: any,
    x2: any,
    y2: any,
    colorWithHash: string,
    strokeWidth: any,
    strokeOpacity: any
): void {
    pattern.appendChild(
        _makeSvgLine(ns, x1, y1, x2, y2, colorWithHash, strokeWidth, strokeOpacity)
    );
}

function _addShapeToPattern(
    pattern: any,
    type: string,
    spacing: number,
    colorWithHash: string,
    strokeWidth: any,
    strokeOpacity: any,
    angle: any
): void {
    const ns = "http://www.w3.org/2000/svg";
    const [c, sw, op] = [colorWithHash, strokeWidth, strokeOpacity];
    if (type === "dot") {
        _addDotToPattern(pattern, ns, spacing, c, op);
    } else if (type === "diagonal") {
        _addDiagonalToPattern(pattern, ns, spacing, c, sw, op, angle);
    } else if (type === "cross") {
        _addCrossToPattern(pattern, ns, spacing, c, sw, op);
    } else if (type === "x") {
        _addXToPattern(pattern, ns, spacing, c, sw, op);
    } else if (type === "horizontal") {
        _addLineToPattern(pattern, ns, "0", spacing / 2, spacing, spacing / 2, c, sw, op);
    } else if (type === "vertical") {
        _addLineToPattern(pattern, ns, spacing / 2, "0", spacing / 2, spacing, c, sw, op);
    }
}

function _ensurePatternInSvg(mapSvg: any, patternId: any, hatchConfig: any): void {
    let pattern = mapSvg.querySelector(`#${patternId}`);
    if (pattern) return;
    const spacing = hatchConfig.spacingPx || 10;
    const type = hatchConfig.type || "diagonal";
    const angle = hatchConfig.angleDeg;
    const strokeColor = hatchConfig.stroke?.color || "#000000";
    const strokeWidth = hatchConfig.stroke?.widthPx || 1;
    const strokeOpacity = hatchConfig.stroke?.opacity || 1;
    const colorWithHash = strokeColor.startsWith("#") ? strokeColor : `#${strokeColor}`;
    pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern") as any;
    pattern.setAttribute("id", patternId);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", spacing);
    pattern.setAttribute("height", spacing);
    _addShapeToPattern(pattern, type, spacing, colorWithHash, strokeWidth, strokeOpacity, angle);
    let defs = mapSvg.querySelector("defs");
    if (!defs) {
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs") as any;
        mapSvg.insertBefore(defs, mapSvg.firstChild);
    }
    defs.appendChild(pattern);
}
function _buildApplyToPathFn(patternId: string, hatchConfig: any): (path: any) => void {
    return (path: any) => {
        if (!path?.setAttribute) return;
        const fillUrl = `url(#${patternId})`;
        if (path.getAttribute("fill") !== fillUrl) path.setAttribute("fill", fillUrl);
        if (hatchConfig?.renderMode === "pattern_only") path.setAttribute("fill-opacity", "1");
        if (!path._hatchObserver) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === "attributes" && mutation.attributeName === "fill") {
                        const newFill = path.getAttribute("fill");
                        if (newFill !== fillUrl && !newFill.includes(patternId))
                            path.setAttribute("fill", fillUrl);
                    }
                });
            });
            observer.observe(path, { attributes: true, attributeFilter: ["fill"] });
            path._hatchObserver = observer;
        }
    };
}

function _applyHatchToLayerPaths(layer: any, applyToPath: (p: any) => void): void {
    if (layer._path) applyToPath(layer._path);
    if (typeof layer.eachLayer === "function") {
        layer.eachLayer((sublayer: any) => {
            if (sublayer._path) applyToPath(sublayer._path);
            else if (typeof sublayer.eachLayer === "function") {
                sublayer.eachLayer((sub: any) => {
                    if (sub._path) applyToPath(sub._path);
                });
            }
        });
    }
}

function _attachHatchCleanup(layer: any): void {
    if (layer._disconnectHatchObservers) return;
    layer._disconnectHatchObservers = function (this: any) {
        const disconnectPath = (p: any) => {
            if (p._hatchObserver) {
                p._hatchObserver.disconnect();
                p._hatchObserver = null;
            }
        };
        if (this._path) disconnectPath(this._path);
        if (typeof this.eachLayer === "function") {
            this.eachLayer((sub: any) => {
                if (sub._path) disconnectPath(sub._path);
                if (typeof sub.eachLayer === "function")
                    sub.eachLayer((inner: any) => {
                        if (inner._path) disconnectPath(inner._path);
                    });
            });
        }
    };
    layer.on("remove", function (this: any) {
        this._disconnectHatchObservers();
    });
}

export function _applyHatchToLayer(layer: any, patternId: any, hatchConfig: any) {
    if (!layer || !patternId) return;
    let mapSvg = _findLayerSvg(layer);
    if (!mapSvg) {
        let attempts = 0;
        const tryApplyHatch = () => {
            mapSvg = _findLayerSvg(layer);
            if (mapSvg) {
                _applyHatchToLayer(layer, patternId, hatchConfig);
                return;
            }
            if (++attempts < 5) setTimeout(tryApplyHatch, 100);
        };
        setTimeout(tryApplyHatch, 100);
        return;
    }
    _ensurePatternInSvg(mapSvg, patternId, hatchConfig);
    const applyToPath = _buildApplyToPathFn(patternId, hatchConfig);
    _applyHatchToLayerPaths(layer, applyToPath);
    _attachHatchCleanup(layer);
}
