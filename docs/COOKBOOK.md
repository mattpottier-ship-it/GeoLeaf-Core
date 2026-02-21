# ðŸ“– Cookbook - GeoLeaf.js

> **Exemples pratiques et cas d'usage** pour maÃ®triser GeoLeaf.js

**Version produit**: GeoLeaf Platform V1  
**Version**: 3.2.0  
**DerniÃ¨re mise Ã  jour**: 14 fÃ©vrier 2026

> Convention de versioning : **Platform V1** est le label produit ; le SemVer technique de ce dépôt reste en **3.2.0**.

---

## ðŸ“‹ Table des MatiÃ¨res

- [Introduction](#introduction)
- [Exemple 1: Carte Touristique Simple](#exemple-1-carte-touristique-simple)
- [Exemple 2: Cache Offline pour Travail Terrain](#exemple-2-cache-offline-pour-travail-terrain)
- [Exemple 3: ThÃ¨mes et Styles PersonnalisÃ©s](#exemple-3-thÃ¨mes-et-styles-personnalisÃ©s)
- [Exemple 2: Multi-Profils avec Switch Dynamique](#exemple-2-multi-profils-avec-switch-dynamique)
- [Exemple 7: Filtres AvancÃ©s et Recherche](#exemple-7-filtres-avancÃ©s-et-recherche)
- [Exemple 8: Import/Export de DonnÃ©es](#exemple-8-importexport-de-donnÃ©es)

---

## ðŸŽ¯ Introduction

Ce cookbook contient des **exemples concrets** d'utilisation de GeoLeaf.js pour diffÃ©rents cas d'usage. Chaque exemple inclut:

âœ… Code complet et fonctionnel  
âœ… Explications dÃ©taillÃ©es  
âœ… Captures d'Ã©cran (quand pertinent)  
âœ… Bonnes pratiques  

---

## ðŸ—ºï¸ Exemple 1: Carte Touristique Simple

### Objectif
CrÃ©er une carte interactive pour afficher des points d'intÃ©rÃªt touristiques (restaurants, monuments, hÃ´tels) avec recherche et filtres.

### Code Complet

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carte Touristique - Paris</title>
    
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    
    <!-- GeoLeaf CSS -->
    <link rel="stylesheet" href="https://cdn.geoleaf.js/3.0.0/geoleaf.min.css" />
    
    <style>
        body {
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        #map {
            height: 100vh;
        }
        .custom-control {
            position: absolute;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            z-index: 1000;
        }
        .custom-control h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        .custom-control input {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .custom-control button {
            width: 100%;
            padding: 8px;
            margin-bottom: 5px;
            border: none;
            border-radius: 4px;
            background: #007bff;
            color: white;
            cursor: pointer;
        }
        .custom-control button:hover {
            background: #0056b3;
        }
        .custom-control button.secondary {
            background: #6c757d;
        }
        .custom-control button.secondary:hover {
            background: #5a6268;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    
    <!-- ContrÃ´les personnalisÃ©s -->
    <div class="custom-control">
        <h3>ðŸ” Recherche</h3>
        <input type="text" id="search" placeholder="Rechercher...">
        
        <h3>ðŸ·ï¸ CatÃ©gories</h3>
        <button id="filter-restaurants">ðŸ½ï¸ Restaurants</button>
        <button id="filter-monuments">ðŸ›ï¸ Monuments</button>
        <button id="filter-hotels">ðŸ¨ HÃ´tels</button>
        <button id="reset-filters" class="secondary">â†» RÃ©initialiser</button>
    </div>

    <!-- Scripts -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.geoleaf.js/3.0.0/geoleaf.min.js"></script>
    
    <script>
        // =====================================================
        // 1. INITIALISATION
        // =====================================================
        
        const map = GeoLeaf.init({
            target: 'map',
            profile: 'tourism',
            center: [48.8566, 2.3522], // Paris
            zoom: 13,
            theme: 'light',
            controls: {
                zoom: true,
                scale: true,
                layers: true,
                legend: true,
                theme: true,
                fullscreen: true,
                locate: true
            },
            poi: {
                clustering: true,
                clusterRadius: 80,
                addFormEnabled: true
            }
        });

        // =====================================================
        // 2. DONNÃ‰ES EXEMPLE - POI TOURISTIQUES
        // =====================================================
        
        const touristPOIs = [
            // Restaurants
            {
                type: 'restaurant',
                name: 'Le Jules Verne',
                lat: 48.8583,
                lng: 2.2945,
                description: 'Restaurant gastronomique dans la Tour Eiffel',
                address: 'Tour Eiffel, 75007 Paris',
                phone: '+33 1 45 55 61 44',
                website: 'https://lejulesverne-paris.com',
                tags: ['gastronomie', 'vue panoramique', 'Ã©toilÃ©'],
                price: 'â‚¬â‚¬â‚¬â‚¬',
                rating: 4.7,
                hours: {
                    monday: '12:00-14:00, 19:00-21:30',
                    tuesday: '12:00-14:00, 19:00-21:30',
                    wednesday: '12:00-14:00, 19:00-21:30',
                    thursday: '12:00-14:00, 19:00-21:30',
                    friday: '12:00-14:00, 19:00-21:30',
                    saturday: '12:00-14:00, 19:00-21:30',
                    sunday: 'FermÃ©'
                },
                images: ['https://example.com/jules-verne-1.jpg']
            },
            {
                type: 'restaurant',
                name: 'L\'Ambroisie',
                lat: 48.8548,
                lng: 2.3615,
                description: 'Restaurant 3 Ã©toiles Michelin',
                address: '9 Place des Vosges, 75004 Paris',
                tags: ['gastronomie', 'Ã©toilÃ©', 'luxe'],
                price: 'â‚¬â‚¬â‚¬â‚¬',
                rating: 4.8
            },
            
            // Monuments
            {
                type: 'monument',
                name: 'Tour Eiffel',
                lat: 48.8584,
                lng: 2.2945,
                description: 'Monument emblÃ©matique de Paris',
                address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris',
                phone: '+33 892 70 12 39',
                website: 'https://www.toureiffel.paris',
                tags: ['incontournable', 'vue panoramique', 'photo'],
                price: 'â‚¬â‚¬',
                rating: 4.9,
                hours: {
                    monday: '09:30-23:45',
                    tuesday: '09:30-23:45',
                    wednesday: '09:30-23:45',
                    thursday: '09:30-23:45',
                    friday: '09:30-23:45',
                    saturday: '09:30-00:45',
                    sunday: '09:30-23:45'
                },
                customFields: {
                    height: '330m',
                    built: 1889,
                    visitors_per_year: 7000000
                }
            },
            {
                type: 'monument',
                name: 'MusÃ©e du Louvre',
                lat: 48.8606,
                lng: 2.3376,
                description: 'Plus grand musÃ©e d\'art du monde',
                address: 'Rue de Rivoli, 75001 Paris',
                tags: ['musÃ©e', 'art', 'incontournable'],
                price: 'â‚¬â‚¬',
                rating: 4.8
            },
            {
                type: 'monument',
                name: 'Notre-Dame de Paris',
                lat: 48.8530,
                lng: 2.3499,
                description: 'CathÃ©drale gothique historique',
                address: '6 Parvis Notre-Dame, 75004 Paris',
                tags: ['cathÃ©drale', 'gothique', 'histoire'],
                price: 'Gratuit',
                rating: 4.7
            },
            
            // HÃ´tels
            {
                type: 'hotel',
                name: 'HÃ´tel Plaza AthÃ©nÃ©e',
                lat: 48.8663,
                lng: 2.3049,
                description: 'Palace parisien 5 Ã©toiles',
                address: '25 Avenue Montaigne, 75008 Paris',
                phone: '+33 1 53 67 66 65',
                website: 'https://www.plaza-athenee-paris.com',
                tags: ['luxe', 'spa', 'restaurant gastronomique'],
                price: 'â‚¬â‚¬â‚¬â‚¬',
                rating: 4.9,
                customFields: {
                    stars: 5,
                    rooms: 208,
                    swimming_pool: true,
                    spa: true
                }
            },
            {
                type: 'hotel',
                name: 'Le Meurice',
                lat: 48.8655,
                lng: 2.3297,
                description: 'HÃ´tel de luxe face aux Tuileries',
                address: '228 Rue de Rivoli, 75001 Paris',
                tags: ['luxe', 'restaurant Ã©toilÃ©', 'spa'],
                price: 'â‚¬â‚¬â‚¬â‚¬',
                rating: 4.8
            }
        ];

        // =====================================================
        // 3. AJOUTER LES POI Ã€ LA CARTE
        // =====================================================
        
        async function loadPOIs() {
            console.log('Chargement des POI...');
            
            for (const poiData of touristPOIs) {
                try {
                    const poi = await GeoLeaf.POI.add(poiData);
                    console.log(`POI ajoutÃ©: ${poi.name}`);
                } catch (error) {
                    console.error('Erreur ajout POI:', error);
                }
            }
            
            console.log('Tous les POI chargÃ©s!');
            
            // Afficher notification
            GeoLeaf.UI.notify('âœ… POI touristiques chargÃ©s', 'success');
        }

        // Charger POI au dÃ©marrage
        loadPOIs();

        // =====================================================
        // 4. RECHERCHE
        // =====================================================
        
        const searchInput = document.getElementById('search');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            // Debounce: attendre 500ms avant recherche
            clearTimeout(searchTimeout);
            
            searchTimeout = setTimeout(async () => {
                const query = e.target.value.trim();
                
                if (query.length < 2) {
                    // Reset si query trop courte
                    GeoLeaf.POI.showAll();
                    return;
                }
                
                // Recherche
                const results = await GeoLeaf.POI.search(query);
                console.log(`${results.length} rÃ©sultat(s) trouvÃ©(s)`);
                
                // Afficher seulement rÃ©sultats
                GeoLeaf.POI.hideAll();
                results.forEach(poi => {
                    GeoLeaf.POI.show(poi.id);
                });
                
                // Zoom sur rÃ©sultats si trouvÃ©s
                if (results.length > 0) {
                    const bounds = L.latLngBounds(
                        results.map(poi => [poi.lat, poi.lng])
                    );
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            }, 500);
        });

        // =====================================================
        // 5. FILTRES PAR CATÃ‰GORIE
        // =====================================================
        
        let activeFilters = new Set();

        // Filtre restaurants
        document.getElementById('filter-restaurants').addEventListener('click', () => {
            toggleFilter('restaurant');
        });

        // Filtre monuments
        document.getElementById('filter-monuments').addEventListener('click', () => {
            toggleFilter('monument');
        });

        // Filtre hÃ´tels
        document.getElementById('filter-hotels').addEventListener('click', () => {
            toggleFilter('hotel');
        });

        // Reset
        document.getElementById('reset-filters').addEventListener('click', () => {
            activeFilters.clear();
            GeoLeaf.POI.showAll();
            searchInput.value = '';
            updateFilterButtons();
            GeoLeaf.UI.notify('Filtres rÃ©initialisÃ©s', 'info');
        });

        function toggleFilter(type) {
            if (activeFilters.has(type)) {
                activeFilters.delete(type);
            } else {
                activeFilters.add(type);
            }
            
            applyFilters();
            updateFilterButtons();
        }

        async function applyFilters() {
            if (activeFilters.size === 0) {
                // Aucun filtre: afficher tout
                GeoLeaf.POI.showAll();
            } else {
                // Appliquer filtres
                GeoLeaf.POI.hideAll();
                
                for (const type of activeFilters) {
                    const pois = await GeoLeaf.POI.getByType(type);
                    pois.forEach(poi => {
                        GeoLeaf.POI.show(poi.id);
                    });
                }
            }
        }

        function updateFilterButtons() {
            // Mise Ã  jour visuelle des boutons
            const buttons = {
                'restaurant': document.getElementById('filter-restaurants'),
                'monument': document.getElementById('filter-monuments'),
                'hotel': document.getElementById('filter-hotels')
            };
            
            for (const [type, button] of Object.entries(buttons)) {
                if (activeFilters.has(type)) {
                    button.style.background = '#28a745';
                } else {
                    button.style.background = '#007bff';
                }
            }
        }

        // =====================================================
        // 6. EVENTS LISTENERS
        // =====================================================
        
        // POI ajoutÃ© (via formulaire)
        GeoLeaf.on('poi:added', (poi) => {
            console.log('Nouveau POI ajoutÃ©:', poi);
            GeoLeaf.UI.notify(`âœ… ${poi.name} ajoutÃ©`, 'success');
        });

        // POI cliquÃ©
        GeoLeaf.on('poi:click', (poi) => {
            console.log('POI cliquÃ©:', poi.name);
            
            // Exemple: tracking analytics
            // analytics.track('poi_click', { poi_id: poi.id, poi_name: poi.name });
        });

        // ThÃ¨me changÃ©
        GeoLeaf.on('theme:changed', (theme) => {
            console.log('ThÃ¨me changÃ©:', theme);
            
            // Adapter contrÃ´les custom au thÃ¨me
            const control = document.querySelector('.custom-control');
            if (theme === 'dark') {
                control.style.background = '#2c3e50';
                control.style.color = '#ecf0f1';
            } else {
                control.style.background = 'white';
                control.style.color = 'black';
            }
        });

        console.log('âœ… Carte touristique initialisÃ©e');
    </script>
</body>
</html>
```

### Points ClÃ©s

âœ… **POI variÃ©s**: Restaurants, monuments, hÃ´tels avec donnÃ©es riches  
âœ… **Recherche en temps rÃ©el**: Debounce 500ms pour performances  
âœ… **Filtres multi-catÃ©gories**: Toggle avec feedback visuel  
âœ… **Events personnalisÃ©s**: Analytics, notifications  
âœ… **Responsive**: ContrÃ´les adaptÃ©s au thÃ¨me  

---

## ðŸ’¾ Exemple 2: Cache Offline pour Travail Terrain

### Objectif
PrÃ©parer l'application pour une utilisation hors-ligne lors de missions terrain.

### Code

```javascript
// =====================================================
// OFFLINE MODE - Cache layers pour travail terrain
// =====================================================

// 1. INITIALISATION AVEC STORAGE ACTIVÃ‰
const map = GeoLeaf.init({
    target: 'map',
    profile: 'tourism',
    center: [45.7640, 4.8357],
    zoom: 13,
    storage: {
        enabled: true,
        quota: 200 * 1024 * 1024, // 200 MB
        ttl: 30 * 24 * 60 * 60 * 1000 // 30 jours
    }
});

// 2. LAYERS Ã€ TÃ‰LÃ‰CHARGER
const offlineLayers = [
    'tourism_poi_all',
    'tourism_itineraries',
    'tourism_monuments',
    'tourism_restaurants',
    'base_osm_tiles_z12_z16' // Tuiles fond de carte
];

// 3. UI TÃ‰LÃ‰CHARGEMENT
function createDownloadUI() {
    const ui = document.createElement('div');
    ui.id = 'download-ui';
    ui.innerHTML = `
        <div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 2000; min-width: 400px;">
            <h3>ðŸ’¾ TÃ©lÃ©chargement Offline</h3>
            
            <div id="layer-list">
                ${offlineLayers.map(layer => `
                    <div style="margin: 10px 0;">
                        <input type="checkbox" id="layer-${layer}" value="${layer}" checked>
                        <label for="layer-${layer}">${layer}</label>
                    </div>
                `).join('')}
            </div>
            
            <div style="margin: 20px 0;">
                <div id="progress-container" style="display: none;">
                    <div style="background: #ecf0f1; height: 20px; border-radius: 10px; overflow: hidden;">
                        <div id="progress-bar" style="background: #3498db; height: 100%; width: 0%; transition: width 0.3s;"></div>
                    </div>
                    <p id="progress-text" style="margin: 10px 0; text-align: center;">0%</p>
                </div>
            </div>
            
            <button id="download-btn" style="width: 100%; padding: 10px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
                ðŸ“¥ TÃ©lÃ©charger
            </button>
            
            <button id="cancel-btn" style="width: 100%; padding: 10px; margin-top: 10px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                âœ– Annuler
            </button>
            
            <div id="cache-info" style="margin-top: 20px; padding: 10px; background: #ecf0f1; border-radius: 4px; display: none;">
                <strong>Cache actuel:</strong>
                <p id="cache-size">Taille: 0 MB</p>
                <p id="cache-layers">Layers: 0</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(ui);
    
    // Events
    document.getElementById('download-btn').addEventListener('click', startDownload);
    document.getElementById('cancel-btn').addEventListener('click', () => {
        ui.remove();
    });
    
    // Afficher info cache actuel
    showCacheInfo();
}

// 4. DÃ‰MARRER TÃ‰LÃ‰CHARGEMENT
async function startDownload() {
    const selectedLayers = [];
    
    // RÃ©cupÃ©rer layers sÃ©lectionnÃ©s
    offlineLayers.forEach(layer => {
        const checkbox = document.getElementById(`layer-${layer}`);
        if (checkbox && checkbox.checked) {
            selectedLayers.push(layer);
        }
    });
    
    if (selectedLayers.length === 0) {
        GeoLeaf.UI.notify('âš ï¸ SÃ©lectionnez au moins un layer', 'warning');
        return;
    }
    
    // Afficher progression
    document.getElementById('progress-container').style.display = 'block';
    document.getElementById('download-btn').disabled = true;
    document.getElementById('download-btn').textContent = 'â³ TÃ©lÃ©chargement...';
    
    try {
        await GeoLeaf.Storage.downloadLayers(selectedLayers, {
            onProgress: (progress) => {
                // Mise Ã  jour barre de progression
                const percent = progress.percent;
                document.getElementById('progress-bar').style.width = `${percent}%`;
                document.getElementById('progress-text').textContent = 
                    `${percent}% - ${progress.current}/${progress.total}`;
            }
        });
        
        GeoLeaf.UI.notify('âœ… TÃ©lÃ©chargement terminÃ©!', 'success');
        
        // RafraÃ®chir info cache
        await showCacheInfo();
        
    } catch (error) {
        console.error('Erreur tÃ©lÃ©chargement:', error);
        GeoLeaf.UI.notify('âŒ Erreur tÃ©lÃ©chargement', 'error');
    } finally {
        document.getElementById('download-btn').disabled = false;
        document.getElementById('download-btn').textContent = 'ðŸ“¥ TÃ©lÃ©charger';
    }
}

// 5. AFFICHER INFO CACHE
async function showCacheInfo() {
    const info = await GeoLeaf.Storage.getCacheInfo();
    
    const cacheInfoDiv = document.getElementById('cache-info');
    if (cacheInfoDiv) {
        cacheInfoDiv.style.display = 'block';
        document.getElementById('cache-size').textContent = 
            `Taille: ${(info.size / (1024 * 1024)).toFixed(2)} MB`;
        document.getElementById('cache-layers').textContent = 
            `Layers: ${info.layers.length}`;
    }
}

// 6. DÃ‰TECTER MODE OFFLINE
GeoLeaf.on('offline', () => {
    // Afficher banner offline
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; background: #e74c3c; color: white; padding: 10px; text-align: center; z-index: 9999;">
            âš ï¸ Mode Offline - Utilisation des donnÃ©es en cache
        </div>
    `;
    document.body.appendChild(banner);
    
    console.log('ðŸ“´ Mode offline activÃ©');
});

GeoLeaf.on('online', () => {
    // Retirer banner
    const banner = document.getElementById('offline-banner');
    if (banner) {
        banner.remove();
    }
    
    console.log('ðŸ“¶ Connexion rÃ©tablie');
    GeoLeaf.UI.notify('âœ… Connexion rÃ©tablie', 'success');
});

// 7. OUVRIR UI TÃ‰LÃ‰CHARGEMENT
document.getElementById('offline-btn').addEventListener('click', () => {
    createDownloadUI();
});
```

### Points ClÃ©s

âœ… **SÃ©lection layers**: Checkbox pour choisir donnÃ©es  
âœ… **Progression**: Barre temps rÃ©el  
âœ… **Cache info**: Taille, nombre layers  
âœ… **DÃ©tection offline**: Banner + notification  
âœ… **Storage quota**: Gestion limite 200 MB  

---

## ðŸŽ¨ Exemple 3: ThÃ¨mes et Styles PersonnalisÃ©s

Voir [USER_GUIDE.md](USER_GUIDE.md#64-themes) pour code complet thÃ¨me personnalisÃ©.

---

## ðŸ”€ Exemple 4: Multi-Profils avec Switch Dynamique

```javascript
// Switch entre profils dynamiquement
let currentProfile = 'tourism';

function switchProfile(newProfile) {
    // Sauvegarder Ã©tat actuel
    const currentState = {
        center: map.getCenter(),
        zoom: map.getZoom(),
        pois: GeoLeaf.POI.getAll()
    };
    
    // DÃ©truire instance actuelle
    GeoLeaf.destroy();
    
    // CrÃ©er nouvelle instance avec nouveau profil
    GeoLeaf.init({
        target: 'map',
        profile: newProfile,
        center: [currentState.center.lat, currentState.center.lng],
        zoom: currentState.zoom
    });
    
    currentProfile = newProfile;
    console.log(`Profil changÃ©: ${newProfile}`);
}

// UI switch
document.getElementById('profile-selector').addEventListener('change', (e) => {
    switchProfile(e.target.value);
});
```

---

## ðŸ” Exemple 7: Filtres AvancÃ©s et Recherche

Voir [Exemple 1](#exemple-1-carte-touristique-simple) pour implÃ©mentation complÃ¨te.

---

## ðŸ“¤ Exemple 8: Import/Export de DonnÃ©es

```javascript
// EXPORT POI vers JSON
async function exportPOIs() {
    const pois = await GeoLeaf.POI.getAll();
    
    const dataStr = JSON.stringify(pois, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pois_${new Date().toISOString()}.json`;
    link.click();
    
    GeoLeaf.UI.notify('âœ… POI exportÃ©s', 'success');
}

// IMPORT POI depuis JSON
async function importPOIs(file) {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const pois = JSON.parse(e.target.result);
            
            for (const poi of pois) {
                await GeoLeaf.POI.add(poi);
            }
            
            GeoLeaf.UI.notify(`âœ… ${pois.length} POI importÃ©s`, 'success');
        } catch (error) {
            console.error('Erreur import:', error);
            GeoLeaf.UI.notify('âŒ Erreur import', 'error');
        }
    };
    
    reader.readAsText(file);
}

// EXPORT vers CSV
async function exportCSV() {
    const pois = await GeoLeaf.POI.getAll();
    
    // Headers
    const headers = ['ID', 'Nom', 'Type', 'Latitude', 'Longitude', 'Description'];
    const rows = pois.map(poi => [
        poi.id,
        poi.name,
        poi.type,
        poi.lat,
        poi.lng,
        poi.description
    ]);
    
    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pois_${new Date().toISOString()}.csv`;
    link.click();
    
    GeoLeaf.UI.notify('âœ… CSV exportÃ©', 'success');
}
```

---

## ðŸ“š Ressources

- [Guide Utilisateur](USER_GUIDE.md)
- [Guide de Configuration](CONFIGURATION_GUIDE.md)
- [Guide des Profils](PROFILES_GUIDE.md)
- [Guide Contribution](CONTRIBUTING.md)
- [FAQ](FAQ.md)

---

**DerniÃ¨re mise Ã  jour**: 19 janvier 2026  
**Version**: 3.2.0  
**Auteurs**: Ã‰quipe GeoLeaf
