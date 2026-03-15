/**
 * GeoLeaf Performance Profiler – DevTools Export
 * Pure DevTools trace builder extracted from performance-profiler.js (Phase 8.2.5)
 *
 * @module utils/performance/devtools-export
 */
"use strict";

/**
 * Builds a object de trace Chrome DevTools (profile JSON) froms
 * marks and measures collected by `PerformanceProfiler`.
 *
 * Compatible avec l'tab Performance de Chrome DevTools:
 * `DevTools → Performance → Load Profile → selectionner le file JSON`
 *
 * @param {{ marks: Map<string, number>, measures: Map<string, number> }} data
 * @returns {{traceEvents: Array, metadata: Object}} Object de trace DevTools
 */
export function buildDevToolsTrace({ marks, measures }: { marks: any; measures: any }) {
    const devToolsData = {
        traceEvents: [] as any[],
        metadata: {
            "cpu-family": 6,
            "cpu-model": 70,
            "cpu-stepping": 1,
            "field-name-mappings": {},
            "os-name": navigator.platform,
            "trace-capture-datetime": new Date().toISOString(),
            "user-agent": navigator.userAgent,
        },
    };

    // Convert marks → Instant trace events
    marks.forEach((timestamp: any, name: any) => {
        devToolsData.traceEvents.push({
            name,
            cat: "blink.user_timing",
            ph: "I", // Instant event
            ts: timestamp * 1000, // µs
            pid: 1,
            tid: 1,
        });
    });

    // Convert measures → Begin/End trace event pairs
    measures.forEach((duration: any, name: any) => {
        const startTime = performance.now() - duration;
        devToolsData.traceEvents.push(
            {
                name,
                cat: "blink.user_timing",
                ph: "B", // Begin
                ts: startTime * 1000,
                pid: 1,
                tid: 1,
            },
            {
                name,
                cat: "blink.user_timing",
                ph: "E", // End
                ts: (startTime + duration) * 1000,
                pid: 1,
                tid: 1,
            }
        );
    });

    return devToolsData;
}
