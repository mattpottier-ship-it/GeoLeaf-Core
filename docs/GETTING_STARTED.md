# Getting Started with GeoLeaf JS

**Product Version:** GeoLeaf Platform V1

**Estimated time:** 5 minutes  
**Level:** Beginner  
**Prerequisites:** Basic HTML/JavaScript knowledge

> Versioning convention: **Platform V1** is the product label; technical package/release SemVer remains **4.x**. See [VERSIONING_POLICY.md](VERSIONING_POLICY.md).

This guide will help you create your first interactive map with GeoLeaf in just 5 minutes.

> **Licence scope**: ce guide couvre le **core GeoLeaf** distribué sous **MIT**. Les plugins premium (Storage, AddPOI avancé) relèvent d'une licence commerciale séparée.

---

## 📋 What You'll Build

By the end of this tutorial, you'll have:

- ✅ An interactive map centered on a location
- ✅ A custom basemap (street view)
- ✅ A POI (Point of Interest) marker with popup
- ✅ Basic zoom and pan controls

![Final Result Preview](images/getting-started-result.png)

---

## Step 1: Set Up Your HTML Page

Create a new file called `my-first-map.html` and add the following structure:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My First GeoLeaf Map</title>

        <!-- Leaflet (required dependency) -->
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

        <!-- GeoLeaf CSS -->
        <link rel="stylesheet" href="https://unpkg.com/geoleaf@latest/dist/geoleaf.min.css" />

        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
            }

            #map {
                width: 100%;
                height: 600px;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>

        <!-- Leaflet JS -->
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

        <!-- GeoLeaf JS -->
        <script src="https://unpkg.com/geoleaf@latest/dist/geoleaf.min.js"></script>

        <!-- Your code will go here -->
        <script>
            // Step 2 code goes here
        </script>
    </body>
</html>
```

**What's happening:**

- We load Leaflet (the base mapping library)
- We load GeoLeaf CSS and JS from CDN
- We create a `<div id="map">` container for our map

---

## Step 2: Initialize the Map

Add this code inside the `<script>` tag at the bottom:

```javascript
// Initialize GeoLeaf map
const map = GeoLeaf.init({
    map: {
        target: "map", // ID of the container div
        center: [48.8566, 2.3522], // Paris coordinates [latitude, longitude]
        zoom: 13, // Initial zoom level (1-18)
    },
    ui: {
        theme: "light", // 'light' or 'dark'
    },
});

console.log("Map initialized!", map);
```

**Save and open** `my-first-map.html` in your browser. You should see a map centered on Paris!

**Understanding the code:**

- `GeoLeaf.init()` creates and initializes the map
- `target` specifies which HTML element to use
- `center` is `[latitude, longitude]` coordinates
- `zoom` controls how close we are (higher = closer)

---

## Step 3: Add Your First POI

Now let's add a point of interest marker. Add this code after the map initialization:

```javascript
// Add a POI marker
GeoLeaf.POI.add({
    id: "eiffel-tower",
    latlng: [48.8584, 2.2945],
    title: "Eiffel Tower",
    description: "The iconic iron lattice tower in Paris",
    category: "monument",
    icon: "landmark",
});
```

**Refresh your browser.** You'll see a marker appear on the Eiffel Tower location!

**Try clicking the marker** to see its popup with the title and description.

---

## Step 4: Add Multiple POIs

Let's add more points of interest to make it more interesting:

```javascript
// Add multiple POIs
const parisLandmarks = [
    {
        id: "eiffel-tower",
        latlng: [48.8584, 2.2945],
        title: "Eiffel Tower",
        description: "The iconic iron lattice tower",
        category: "monument",
    },
    {
        id: "louvre",
        latlng: [48.8606, 2.3376],
        title: "Louvre Museum",
        description: "World's largest art museum",
        category: "museum",
    },
    {
        id: "notre-dame",
        latlng: [48.853, 2.3499],
        title: "Notre-Dame",
        description: "Medieval Catholic cathedral",
        category: "monument",
    },
    {
        id: "arc-triomphe",
        latlng: [48.8738, 2.295],
        title: "Arc de Triomphe",
        description: "Iconic Parisian monument",
        category: "monument",
    },
];

// Add all POIs to the map
parisLandmarks.forEach((poi) => {
    GeoLeaf.POI.add(poi);
});
```

**Refresh** and you'll see four landmarks on your map!

---

## Step 5: Fit the Map to POIs

To automatically zoom to show all your POIs, add this code at the end:

```javascript
// Automatically zoom to fit all POIs
setTimeout(() => {
    const bounds = parisLandmarks.map((poi) => poi.latlng);
    map.fitBounds(bounds, {
        padding: [50, 50], // Add 50px padding around edges
    });
}, 100);
```

---

## 🎉 Complete Code

Here's your complete `my-first-map.html`:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My First GeoLeaf Map</title>

        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/geoleaf@latest/dist/geoleaf.min.css" />

        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
            }
            #map {
                width: 100%;
                height: 600px;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>

        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/geoleaf@latest/dist/geoleaf.min.js"></script>

        <script>
            // Initialize map
            const map = GeoLeaf.init({
                map: { target: "map", center: [48.8566, 2.3522], zoom: 13 },
                ui: { theme: "light" },
            });

            // Paris landmarks data
            const parisLandmarks = [
                {
                    id: "eiffel-tower",
                    latlng: [48.8584, 2.2945],
                    title: "Eiffel Tower",
                    description: "The iconic iron lattice tower",
                    category: "monument",
                },
                {
                    id: "louvre",
                    latlng: [48.8606, 2.3376],
                    title: "Louvre Museum",
                    description: "World's largest art museum",
                    category: "museum",
                },
                {
                    id: "notre-dame",
                    latlng: [48.853, 2.3499],
                    title: "Notre-Dame",
                    description: "Medieval Catholic cathedral",
                    category: "monument",
                },
                {
                    id: "arc-triomphe",
                    latlng: [48.8738, 2.295],
                    title: "Arc de Triomphe",
                    description: "Iconic Parisian monument",
                    category: "monument",
                },
            ];

            // Add all POIs
            parisLandmarks.forEach((poi) => GeoLeaf.POI.add(poi));

            // Fit map to show all POIs
            setTimeout(() => {
                const bounds = parisLandmarks.map((poi) => poi.latlng);
                map.fitBounds(bounds, { padding: [50, 50] });
            }, 100);
        </script>
    </body>
</html>
```

---

## 🚀 Next Steps

Congratulations! You've created your first GeoLeaf map. Now you can:

### Learn More Features

- **[User Guide](USER_GUIDE.md)** - Complete guide to all features
- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - Customize your map with JSON configs
- **[Profiles Guide](PROFILES_GUIDE.md)** - Create business-specific profiles

### Add More Features

- **Basemap selector** - Let users switch between street/satellite/terrain views
- **Search functionality** - Add a search bar to find POIs
- **Filters** - Filter POIs by category
- **Custom popups** - Rich HTML content in popups
- **GeoJSON layers** - Display polygons, lines, and complex shapes

### Try the Examples

- **[Cookbook](COOKBOOK.md)** - 8 practical recipes for common scenarios
- **[Demo page](../demo/index.html)** - Full-featured example application

---

## 🆘 Troubleshooting

### Map doesn't appear

- ✅ Check browser console for errors (F12)
- ✅ Ensure Leaflet CSS is loaded before GeoLeaf CSS
- ✅ Verify the `#map` div has a defined height in CSS

### POIs don't show

- ✅ Check coordinates are valid `[latitude, longitude]`
- ✅ Ensure `GeoLeaf.POI.add()` is called after map initialization
- ✅ Open browser console and look for error messages

### CDN files not loading

- ✅ Check your internet connection
- ✅ Try using specific version numbers instead of `@latest`
- ✅ Consider hosting files locally for production

### Need Help?

- **[FAQ](FAQ.md)** - Frequently asked questions
- **[GitHub Issues](https://github.com/yourusername/geoleaf-js/issues)** - Report bugs or ask questions
- **[Documentation](README.md)** - Full documentation index

---

## 📖 Quick Reference

### Essential Methods

```javascript
// Initialize map
const map = GeoLeaf.init(config);

// Add POI
GeoLeaf.POI.add({ id, latlng, title, description, category });

// Remove POI
GeoLeaf.POI.remove("poi-id");

// Update POI
GeoLeaf.POI.update("poi-id", { title: "New Title" });

// Get all POIs
const pois = GeoLeaf.POI.getAll();

// Clear all POIs
GeoLeaf.POI.clearAll();
```

### Common Coordinates

| City              | Coordinates            |
| ----------------- | ---------------------- |
| Paris, France     | `[48.8566, 2.3522]`    |
| London, UK        | `[51.5074, -0.1278]`   |
| New York, USA     | `[40.7128, -74.0060]`  |
| Tokyo, Japan      | `[35.6762, 139.6503]`  |
| Sydney, Australia | `[-33.8688, 151.2093]` |

---

## 💡 Tips for Beginners

1. **Start simple** - Get a basic map working before adding complex features
2. **Use the console** - `console.log()` is your friend for debugging
3. **Check examples** - Look at the demo page source code for inspiration
4. **Read error messages** - Browser console errors usually point to the problem
5. **Experiment** - Try changing coordinates, zoom levels, and options to see what happens

---

## 🎓 Learning Path

1. ✅ **You are here** - Getting Started (5 min)
2. 📖 **[User Guide](USER_GUIDE.md)** - Complete features overview (30 min)
3. 🔧 **[Configuration Guide](CONFIGURATION_GUIDE.md)** - JSON configuration (1 hour)
4. 🎨 **[Profiles Guide](PROFILES_GUIDE.md)** - Business profiles (1 hour)
5. 👨‍💻 **[Developer Guide](DEVELOPER_GUIDE.md)** - Advanced development (2 hours)
6. 📚 **[API Reference](API_REFERENCE.md)** - Complete API docs (reference)

---

<p align="center">
  <strong>Ready to build amazing maps! 🗺️</strong><br>
  Continue to the <a href="USER_GUIDE.md">User Guide</a> to explore all features.
</p>
