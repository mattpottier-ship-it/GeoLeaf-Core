/**
 * @fileoverview GeoLeaf Performance Profiler
 * Sprint 3.5: Advanced performance monitoring and Chrome DevTools integration
 * 
 * Features:
 * - Real-time performance monitoring
 * - Memory usage tracking and leak detection
 * - Chrome DevTools integration
 * - Performance baseline establishment
 * - Automated performance regression detection
 * - Detailed profiling reports
 * 
 * @version 1.0.0
 * @author GeoLeaf Team
 * @since 2026-01-17
 */

(function (global) {
    'use strict';

    // Ensure GeoLeaf namespace
    if (typeof global.GeoLeaf === 'undefined') {
        global.GeoLeaf = {};
    }
    if (typeof global.GeoLeaf.Utils === 'undefined') {
        global.GeoLeaf.Utils = {};
    }

    /**
     * Performance monitoring configuration
     */
    const DEFAULT_CONFIG = {
        // Monitoring intervals
        monitoring: {
            enabled: false, // Enable only in dev mode
            interval: 1000, // 1 second
            maxDataPoints: 300 // 5 minutes of data
        },
        // Memory monitoring
        memory: {
            enabled: true,
            threshold: 50 * 1024 * 1024, // 50MB threshold
            leakDetection: true
        },
        // Performance marks
        marks: {
            enabled: true,
            autoMark: ['init', 'ready', 'firstLoad']
        },
        // Baseline
        baseline: {
            enabled: true,
            storage: 'sessionStorage' // or 'localStorage'
        }
    };

    /**
     * Performance data storage
     */
    let performanceData = {
        marks: new Map(),
        measures: new Map(),
        memory: [],
        timeline: [],
        baseline: null
    };

    /**
     * @class PerformanceProfiler
     * @description Advanced performance profiling for GeoLeaf
     */
    class PerformanceProfiler {
        constructor(config = {}) {
            this.config = this._mergeConfig(DEFAULT_CONFIG, config);
            this.monitoringInterval = null;
            this.baselineEstablished = false;
            
            this.init();
        }

        /**
         * Initialize performance profiler
         */
        init() {
            // Check if we're in development mode
            this.config.monitoring.enabled = this._isDevelopmentMode();
            
            this._initPerformanceObserver();
            this._loadBaseline();
            
            if (this.config.monitoring.enabled) {
                this._startMonitoring();
            }
            
            if (global.GeoLeaf.Log) {
                global.GeoLeaf.Log.info('[GeoLeaf.Utils.PerformanceProfiler] Performance profiler initialized');
            }
        }

        /**
         * Start performance monitoring
         */
        startMonitoring() {
            if (this.monitoringInterval) {
                this.stopMonitoring();
            }
            
            this._startMonitoring();
            
            if (global.GeoLeaf.Log) {
                global.GeoLeaf.Log.info('[PerformanceProfiler] Monitoring started');
            }
        }

        /**
         * Stop performance monitoring
         */
        stopMonitoring() {
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
                
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.info('[PerformanceProfiler] Monitoring stopped');
                }
            }
        }

        /**
         * Create performance mark
         * @param {string} name - Mark name
         */
        mark(name) {
            if (!this.config.marks.enabled) return;
            
            const timestamp = performance.now();
            
            try {
                performance.mark(name);
                performanceData.marks.set(name, timestamp);
                
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.debug(`[PerformanceProfiler] Mark: ${name} at ${timestamp.toFixed(2)}ms`);
                }
            } catch (error) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.warn(`[PerformanceProfiler] Failed to create mark ${name}:`, error);
                }
            }
        }

        /**
         * Create performance measure
         * @param {string} name - Measure name
         * @param {string} startMark - Start mark name
         * @param {string} [endMark] - End mark name (optional)
         * @returns {number} Duration in milliseconds
         */
        measure(name, startMark, endMark) {
            try {
                performance.measure(name, startMark, endMark);
                
                const entries = performance.getEntriesByName(name, 'measure');
                const latestEntry = entries[entries.length - 1];
                const duration = latestEntry ? latestEntry.duration : 0;
                
                performanceData.measures.set(name, duration);
                
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.debug(`[PerformanceProfiler] Measure: ${name} = ${duration.toFixed(2)}ms`);
                }
                
                return duration;
            } catch (error) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.warn(`[PerformanceProfiler] Failed to create measure ${name}:`, error);
                }
                return 0;
            }
        }

        /**
         * Get current memory usage
         * @returns {Object} Memory information
         */
        getMemoryUsage() {
            const memory = {
                timestamp: performance.now(),
                used: 0,
                total: 0,
                available: 0
            };

            try {
                if (performance.memory) {
                    memory.used = performance.memory.usedJSHeapSize;
                    memory.total = performance.memory.totalJSHeapSize;
                    memory.available = performance.memory.jsHeapSizeLimit;
                }
            } catch (error) {
                // Memory API not available
            }

            return memory;
        }

        /**
         * Analyze memory for potential leaks
         * @returns {Object} Leak analysis
         */
        analyzeMemoryLeaks() {
            if (performanceData.memory.length < 10) {
                return { status: 'insufficient_data' };
            }

            const recentData = performanceData.memory.slice(-30); // Last 30 data points
            const firstUsed = recentData[0].used;
            const lastUsed = recentData[recentData.length - 1].used;
            const growthRate = (lastUsed - firstUsed) / firstUsed;

            const analysis = {
                status: 'normal',
                growthRate: growthRate,
                memoryTrend: lastUsed > firstUsed ? 'increasing' : 'decreasing',
                recommendation: 'No action needed'
            };

            if (growthRate > 0.2) { // 20% increase
                analysis.status = 'warning';
                analysis.recommendation = 'Monitor memory usage - potential leak detected';
            }

            if (growthRate > 0.5) { // 50% increase
                analysis.status = 'critical';
                analysis.recommendation = 'Investigate memory leak - significant growth detected';
            }

            return analysis;
        }

        /**
         * Generate comprehensive performance report
         * @returns {Object} Performance report
         */
        generateReport() {
            const currentMemory = this.getMemoryUsage();
            const memoryAnalysis = this.analyzeMemoryLeaks();
            
            const report = {
                timestamp: new Date().toISOString(),
                session: {
                    duration: performance.now(),
                    marks: Object.fromEntries(performanceData.marks),
                    measures: Object.fromEntries(performanceData.measures)
                },
                memory: {
                    current: currentMemory,
                    peak: this._getPeakMemory(),
                    analysis: memoryAnalysis,
                    history: performanceData.memory.slice(-10) // Last 10 samples
                },
                performance: {
                    navigation: this._getNavigationTiming(),
                    paint: this._getPaintTiming(),
                    resources: this._getResourceTiming(),
                    longTasks: this._getLongTasks()
                },
                baseline: this._compareWithBaseline(),
                recommendations: this._generateRecommendations()
            };

            return report;
        }

        /**
         * Establish performance baseline
         */
        establishBaseline() {
            const baseline = {
                timestamp: new Date().toISOString(),
                navigation: this._getNavigationTiming(),
                paint: this._getPaintTiming(),
                memory: this.getMemoryUsage(),
                userAgent: navigator.userAgent,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            };

            performanceData.baseline = baseline;
            this.baselineEstablished = true;

            if (this.config.baseline.enabled) {
                this._saveBaseline(baseline);
            }

            if (global.GeoLeaf.Log) {
                global.GeoLeaf.Log.info('[PerformanceProfiler] Performance baseline established');
            }

            return baseline;
        }

        /**
         * Export profiling data for Chrome DevTools
         * @returns {Object} Chrome DevTools compatible data
         */
        exportForDevTools() {
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

            // Convert marks to trace events
            performanceData.marks.forEach((timestamp, name) => {
                devToolsData.traceEvents.push({
                    name: name,
                    cat: 'blink.user_timing',
                    ph: 'I', // Instant event
                    ts: timestamp * 1000, // Convert to microseconds
                    pid: 1,
                    tid: 1
                });
            });

            // Convert measures to trace events
            performanceData.measures.forEach((duration, name) => {
                const startTime = performance.now() - duration;
                devToolsData.traceEvents.push({
                    name: name,
                    cat: 'blink.user_timing',
                    ph: 'B', // Begin event
                    ts: startTime * 1000,
                    pid: 1,
                    tid: 1
                }, {
                    name: name,
                    cat: 'blink.user_timing',
                    ph: 'E', // End event
                    ts: (startTime + duration) * 1000,
                    pid: 1,
                    tid: 1
                });
            });

            return devToolsData;
        }

        /**
         * Initialize performance observer
         * @private
         */
        _initPerformanceObserver() {
            if (!('PerformanceObserver' in window)) {
                return;
            }

            try {
                // Observe navigation and paint timings
                const observer = new PerformanceObserver((list) => {
                    this._processPerformanceEntries(list.getEntries());
                });

                observer.observe({ entryTypes: ['navigation', 'paint', 'measure', 'mark', 'longtask'] });
                
            } catch (error) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.warn('[PerformanceProfiler] PerformanceObserver initialization failed:', error);
                }
            }
        }

        /**
         * Process performance entries
         * @private
         */
        _processPerformanceEntries(entries) {
            entries.forEach(entry => {
                switch (entry.entryType) {
                    case 'longtask':
                        if (global.GeoLeaf.Log) {
                            global.GeoLeaf.Log.warn(`[PerformanceProfiler] Long task detected: ${entry.duration.toFixed(2)}ms`);
                        }
                        break;
                    case 'measure':
                        performanceData.measures.set(entry.name, entry.duration);
                        break;
                    case 'mark':
                        performanceData.marks.set(entry.name, entry.startTime);
                        break;
                }
            });
        }

        /**
         * Start monitoring loop
         * @private
         */
        _startMonitoring() {
            this.monitoringInterval = setInterval(() => {
                this._collectPerformanceData();
            }, this.config.monitoring.interval);
        }

        /**
         * Collect performance data
         * @private
         */
        _collectPerformanceData() {
            const memory = this.getMemoryUsage();
            
            // Add to memory history
            performanceData.memory.push(memory);
            
            // Limit data points
            if (performanceData.memory.length > this.config.monitoring.maxDataPoints) {
                performanceData.memory.shift();
            }

            // Check memory threshold
            if (this.config.memory.enabled && memory.used > this.config.memory.threshold) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.warn(`[PerformanceProfiler] Memory usage high: ${(memory.used / 1024 / 1024).toFixed(2)}MB`);
                }
            }
        }

        /**
         * Get navigation timing
         * @private
         */
        _getNavigationTiming() {
            try {
                const timing = performance.getEntriesByType('navigation')[0];
                if (!timing) return null;

                return {
                    domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
                    load: timing.loadEventEnd - timing.loadEventStart,
                    domComplete: timing.domComplete - timing.navigationStart,
                    firstByte: timing.responseStart - timing.requestStart,
                    dns: timing.domainLookupEnd - timing.domainLookupStart,
                    tcp: timing.connectEnd - timing.connectStart
                };
            } catch (error) {
                return null;
            }
        }

        /**
         * Get paint timing
         * @private
         */
        _getPaintTiming() {
            try {
                const paintEntries = performance.getEntriesByType('paint');
                const result = {};
                
                paintEntries.forEach(entry => {
                    result[entry.name] = entry.startTime;
                });
                
                return result;
            } catch (error) {
                return {};
            }
        }

        /**
         * Get resource timing
         * @private
         */
        _getResourceTiming() {
            try {
                const resources = performance.getEntriesByType('resource');
                const summary = {
                    total: resources.length,
                    scripts: 0,
                    stylesheets: 0,
                    images: 0,
                    totalSize: 0,
                    totalDuration: 0
                };

                resources.forEach(resource => {
                    if (resource.name.includes('.js')) summary.scripts++;
                    else if (resource.name.includes('.css')) summary.stylesheets++;
                    else if (resource.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) summary.images++;
                    
                    if (resource.transferSize) summary.totalSize += resource.transferSize;
                    summary.totalDuration += resource.duration;
                });

                return summary;
            } catch (error) {
                return { total: 0 };
            }
        }

        /**
         * Get long tasks
         * @private
         */
        _getLongTasks() {
            try {
                return performance.getEntriesByType('longtask').map(task => ({
                    duration: task.duration,
                    startTime: task.startTime
                }));
            } catch (error) {
                return [];
            }
        }

        /**
         * Get peak memory usage
         * @private
         */
        _getPeakMemory() {
            if (performanceData.memory.length === 0) {
                return this.getMemoryUsage();
            }

            return performanceData.memory.reduce((peak, current) => {
                return current.used > peak.used ? current : peak;
            });
        }

        /**
         * Compare with baseline
         * @private
         */
        _compareWithBaseline() {
            if (!performanceData.baseline) {
                return { status: 'no_baseline' };
            }

            const current = {
                navigation: this._getNavigationTiming(),
                paint: this._getPaintTiming(),
                memory: this.getMemoryUsage()
            };

            const comparison = {
                navigation: {},
                paint: {},
                memory: {},
                overall: 'similar'
            };

            // Compare navigation timing
            if (current.navigation && performanceData.baseline.navigation) {
                Object.keys(performanceData.baseline.navigation).forEach(key => {
                    const baselineValue = performanceData.baseline.navigation[key];
                    const currentValue = current.navigation[key];
                    const diff = ((currentValue - baselineValue) / baselineValue) * 100;
                    
                    comparison.navigation[key] = {
                        baseline: baselineValue,
                        current: currentValue,
                        difference: diff,
                        status: Math.abs(diff) > 20 ? (diff > 0 ? 'worse' : 'better') : 'similar'
                    };
                });
            }

            // Compare paint timing
            Object.keys(performanceData.baseline.paint).forEach(key => {
                if (current.paint[key]) {
                    const diff = ((current.paint[key] - performanceData.baseline.paint[key]) / performanceData.baseline.paint[key]) * 100;
                    comparison.paint[key] = {
                        baseline: performanceData.baseline.paint[key],
                        current: current.paint[key],
                        difference: diff,
                        status: Math.abs(diff) > 20 ? (diff > 0 ? 'worse' : 'better') : 'similar'
                    };
                }
            });

            // Compare memory
            if (performanceData.baseline.memory.used > 0) {
                const memDiff = ((current.memory.used - performanceData.baseline.memory.used) / performanceData.baseline.memory.used) * 100;
                comparison.memory = {
                    baseline: performanceData.baseline.memory.used,
                    current: current.memory.used,
                    difference: memDiff,
                    status: Math.abs(memDiff) > 30 ? (memDiff > 0 ? 'worse' : 'better') : 'similar'
                };
            }

            return comparison;
        }

        /**
         * Generate recommendations
         * @private
         */
        _generateRecommendations() {
            const recommendations = [];
            const memoryAnalysis = this.analyzeMemoryLeaks();
            const resources = this._getResourceTiming();
            const longTasks = this._getLongTasks();

            // Memory recommendations
            if (memoryAnalysis.status === 'warning') {
                recommendations.push({
                    type: 'memory',
                    priority: 'medium',
                    message: 'Monitor memory usage - potential leak detected',
                    action: 'Check for event listener cleanup and object references'
                });
            } else if (memoryAnalysis.status === 'critical') {
                recommendations.push({
                    type: 'memory',
                    priority: 'high',
                    message: 'Critical memory usage detected',
                    action: 'Immediate investigation required - check for memory leaks'
                });
            }

            // Long task recommendations
            if (longTasks.length > 0) {
                const avgLongTask = longTasks.reduce((sum, task) => sum + task.duration, 0) / longTasks.length;
                recommendations.push({
                    type: 'performance',
                    priority: 'medium',
                    message: `${longTasks.length} long tasks detected (avg: ${avgLongTask.toFixed(2)}ms)`,
                    action: 'Consider breaking up long-running operations with setTimeout or requestIdleCallback'
                });
            }

            // Resource recommendations
            if (resources.total > 50) {
                recommendations.push({
                    type: 'resources',
                    priority: 'low',
                    message: `High number of resources loaded (${resources.total})`,
                    action: 'Consider bundling or lazy loading resources'
                });
            }

            return recommendations;
        }

        /**
         * Check if in development mode
         * @private
         */
        _isDevelopmentMode() {
            return (
                (global.location && global.location.hostname === 'localhost') ||
                (global.location && global.location.hostname === '127.0.0.1') ||
                (global.location && global.location.port) ||
                (global.GeoLeaf && global.GeoLeaf.DEBUG === true)
            );
        }

        /**
         * Load baseline from storage
         * @private
         */
        _loadBaseline() {
            if (!this.config.baseline.enabled) return;

            try {
                const storage = this.config.baseline.storage === 'localStorage' ? localStorage : sessionStorage;
                const savedBaseline = storage.getItem('geoleaf_performance_baseline');
                
                if (savedBaseline) {
                    performanceData.baseline = JSON.parse(savedBaseline);
                    this.baselineEstablished = true;
                }
            } catch (error) {
                // Storage not available or data corrupted
            }
        }

        /**
         * Save baseline to storage
         * @private
         */
        _saveBaseline(baseline) {
            try {
                const storage = this.config.baseline.storage === 'localStorage' ? localStorage : sessionStorage;
                storage.setItem('geoleaf_performance_baseline', JSON.stringify(baseline));
            } catch (error) {
                // Storage not available
            }
        }

        /**
         * Merge configuration objects
         * @private
         */
        _mergeConfig(defaultConfig, userConfig) {
            const merged = { ...defaultConfig };
            
            for (const key in userConfig) {
                if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
                    merged[key] = { ...defaultConfig[key], ...userConfig[key] };
                } else {
                    merged[key] = userConfig[key];
                }
            }
            
            return merged;
        }
    }

    // Create global instance
    const performanceProfiler = new PerformanceProfiler();

    // Export to GeoLeaf namespace
    global.GeoLeaf.Utils.PerformanceProfiler = PerformanceProfiler;
    global.GeoLeaf.Utils.performanceProfiler = performanceProfiler;

    // Convenience methods
    global.GeoLeaf.mark = (name) => performanceProfiler.mark(name);
    global.GeoLeaf.measure = (name, startMark, endMark) => performanceProfiler.measure(name, startMark, endMark);
    global.GeoLeaf.getPerformanceReport = () => performanceProfiler.generateReport();
    global.GeoLeaf.establishBaseline = () => performanceProfiler.establishBaseline();

    // Auto-establish baseline on load (if enabled)
    if (document.readyState === 'complete') {
        setTimeout(() => performanceProfiler.establishBaseline(), 100);
    } else {
        window.addEventListener('load', () => {
            setTimeout(() => performanceProfiler.establishBaseline(), 100);
        });
    }

    if (global.GeoLeaf.Log) {
        global.GeoLeaf.Log.info('[GeoLeaf.Utils.PerformanceProfiler] Module loaded - advanced profiling available');
    }

})(typeof window !== 'undefined' ? window : this);