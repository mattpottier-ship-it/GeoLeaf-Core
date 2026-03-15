/**
 * GeoLeaf Demo — Initialization script
 * Loads the demo header and bootstraps GeoLeaf.
 * Extracted from inline scripts for CSP compliance (no 'unsafe-inline').
 */

// DEMO ONLY — Remove this fetch block and the demo-header-container div for production projects
fetch('demo-header.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('demo-header-container').innerHTML = html; // SAFE: trusted same-origin HTML
    })
    .catch(err => console.error('Erreur chargement header:', err));

// Bootstrap GeoLeaf
GeoLeaf.boot();
