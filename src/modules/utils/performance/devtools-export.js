/**
 * GeoLeaf Performance Profiler – DevTools Export
 * Pure DevTools trace builder extracted from performance-profiler.js (Phase 8.2.5)
 *
 * @module utils/performance/devtools-export
 */
"use strict";

/**
 * Construit un objet de trace Chrome DevTools (profil JSON) à partir des
 * marks et measures collectés par `PerformanceProfiler`.
 *
 * Compatible avec l'onglet Performance de Chrome DevTools:
 * `DevTools → Performance → Load Profile → sélectionner le fichier JSON`
 *
 * @param {{ marks: Map<string, number>, measures: Map<string, number> }} data
 * @returns {{traceEvents: Array, metadata: Object}} Objet de trace DevTools
 */
export function buildDevToolsTrace({ marks, measures }) {
    const devToolsData = {
        traceEvents: [],
        metadata: {
            'cpu-family': 6,
            'cpu-model': 70,
            'cpu-stepping': 1,
            'field-name-mappings': {},
            'os-name': navigator.platform,
            'trace-capture-datetime': new Date().toISOString(),
            'user-agent': navigator.userAgent
        }
    };

    // Convert marks → Instant trace events
    marks.forEach((timestamp, name) => {
        devToolsData.traceEvents.push({
            name,
            cat: 'blink.user_timing',
            ph: 'I', // Instant event
            ts: timestamp * 1000, // µs
            pid: 1,
            tid: 1
        });
    });

    // Convert measures → Begin/End trace event pairs
    measures.forEach((duration, name) => {
        const startTime = performance.now() - duration;
        devToolsData.traceEvents.push(
            {
                name,
                cat: 'blink.user_timing',
                ph: 'B', // Begin
                ts: startTime * 1000,
                pid: 1,
                tid: 1
            },
            {
                name,
                cat: 'blink.user_timing',
                ph: 'E', // End
                ts: (startTime + duration) * 1000,
                pid: 1,
                tid: 1
            }
        );
    });

    return devToolsData;
}
