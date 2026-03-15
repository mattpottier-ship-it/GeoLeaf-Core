/*!
 * GeoLeaf Core — Language: French (fr)
 * © 2026 Mattieu Pottier — MIT License
 *
 * Canonical reference file. All other lang files translate these strings.
 * Template variables use {0}, {1}, ... positional placeholders.
 */

export type LangDict = Record<string, string>;

const lang_fr: LangDict = {
    // ── Toasts / Geolocation ─────────────────────────────────────────────────
    "toast.geoloc.position_found": "Position trouv\u00e9e",
    "toast.geoloc.locating": "Localisation en cours\u2026",
    "toast.geoloc.error.default": "Impossible d\u2019obtenir votre position",
    "toast.geoloc.error.permission_denied": "Permission de g\u00e9olocalisation refus\u00e9e",
    "toast.geoloc.error.position_unavailable": "Position indisponible",
    "toast.geoloc.error.timeout": "D\u00e9lai de g\u00e9olocalisation d\u00e9pass\u00e9",

    // ── Toasts / Cache ───────────────────────────────────────────────────────
    "toast.cache.storage_unavailable": "Stockage offline non disponible",
    "toast.cache.no_active_profile": "Aucun profile actif",
    "toast.cache.download_success": "Profil t\u00e9l\u00e9charg\u00e9 : {0} MB",
    "toast.cache.download_error": "Erreur t\u00e9l\u00e9chargement : {0}",
    "toast.cache.cleared": "Cache vid\u00e9",
    "toast.cache.clear_error": "Erreur : {0}",

    // ── Aria / Fullscreen ────────────────────────────────────────────────────
    "aria.fullscreen.enter": "Plein \u00e9cran",
    "aria.fullscreen.enter_label": "Activer le mode plein \u00e9cran",
    "aria.fullscreen.exit": "Quitter le plein \u00e9cran",
    "aria.fullscreen.exit_label": "Quitter le mode plein \u00e9cran",

    // ── Aria / Geolocation ───────────────────────────────────────────────────
    "aria.geoloc.toggle": "G\u00e9olocalisation ON/OFF",
    "aria.geoloc.toggle_label": "Activer/D\u00e9sactiver le suivi GPS",
    "aria.geoloc.recenter": "Revenir \u00e0 ma position",

    // ── Aria / POI Add ───────────────────────────────────────────────────────
    "aria.poi_add.title": "Ajouter un POI",
    "aria.poi_add.label": "Ajouter un nouveau point d\u2019int\u00e9r\u00eat",

    // ── Aria / Toolbar ───────────────────────────────────────────────────────
    "aria.toolbar.root": "Outils carte",
    "aria.toolbar.scroll_up": "D\u00e9filer vers le haut",
    "aria.toolbar.scroll_down": "D\u00e9filer vers le bas",
    "aria.toolbar.fullscreen": "Plein \u00e9cran",
    "aria.toolbar.zoom_in": "Zoom avant",
    "aria.toolbar.zoom_out": "Zoom arri\u00e8re",
    "aria.toolbar.geoloc": "Ma position",
    "aria.toolbar.themes": "Th\u00e8mes",
    "tooltip.toolbar.themes": "Th\u00e8mes / options th\u00e8mes secondaires",
    "aria.toolbar.legend": "L\u00e9gende",
    "tooltip.toolbar.legend": "L\u00e9gende de la carte",
    "aria.toolbar.layers": "Couches",
    "tooltip.toolbar.layers": "Gestionnaire de layers",
    "aria.toolbar.table": "Tableau de donn\u00e9es",
    "aria.toolbar.poi_add": "Ajouter un POI",
    "tooltip.toolbar.poi_add": "Ajouter un point d\u2019int\u00e9r\u00eat",
    "aria.toolbar.search": "Recherche",
    "tooltip.toolbar.search": "Recherche textuelle",
    "aria.toolbar.proximity": "Proximit\u00e9",
    "tooltip.toolbar.proximity": "Recherche par proximit\u00e9",
    "aria.toolbar.filters": "Filtres",
    "aria.toolbar.reset_filters": "R\u00e9initialiser tous les filtres",
    "tooltip.toolbar.filters": "Filtres avanc\u00e9s",

    // ── Aria / Search bar ────────────────────────────────────────────────────
    "aria.search.bar": "Recherche textuelle",
    "aria.search.input": "Texte de recherche",
    "aria.search.submit": "Valider la recherche",
    "aria.search.clear": "Effacer la recherche",
    "placeholder.search.input": "Rechercher...",

    // ── Aria / Sheet ─────────────────────────────────────────────────────────
    "aria.sheet.close": "Fermer",

    // ── Aria / Proximity ─────────────────────────────────────────────────────
    "aria.proximity.region": "Configuration de la recherche par proximit\u00e9",
    "aria.proximity.slider": "Rayon de recherche en kilom\u00e8tres",
    "aria.proximity.validate": "Valider la recherche par proximit\u00e9",
    "aria.proximity.cancel": "Annuler la recherche par proximit\u00e9",

    // ── Aria / Layer manager ─────────────────────────────────────────────────
    "aria.layer.toggle": "Afficher / hide la layer",

    // ── Aria / Themes ────────────────────────────────────────────────────────
    "aria.themes.nav_prev": "Th\u00e8mes pr\u00e9c\u00e9dents",
    "aria.themes.nav_next": "Th\u00e8mes suivants",
    "aria.themes.prev_title": "Th\u00e8me pr\u00e9c\u00e9dent",
    "aria.themes.next_title": "Th\u00e8me suivant",

    // ── Aria / Filter panel ──────────────────────────────────────────────────
    "aria.filter_panel.open": "Ouvrir le panel de filtres",
    "aria.filter_panel.close": "Fermer le panel de filtres",
    "aria.filter_panel.close_inner": "Fermer le panel",

    // ── Aria / Desktop Panel ─────────────────────────────────────────────────
    "aria.panel.nav": "Panneau de navigation",
    "aria.panel.lateral": "Panneau lat\u00e9ral",

    // ── Aria / Side Panel (POI) ──────────────────────────────────────────────
    "aria.sidepanel.close": "Fermer",
    "aria.sidepanel.landmark": "Fiche d\u00e9taill\u00e9e du point d\u2019int\u00e9r\u00eat",

    // ── Aria / Table ─────────────────────────────────────────────────────────
    "aria.table.hide": "Masquer le table",
    "aria.table.show": "Afficher le table",

    // ── Aria / Legend ────────────────────────────────────────────────────────
    "aria.legend.toggle": "Basculer la l\u00e9gende",

    // ── Aria / Labels ────────────────────────────────────────────────────────
    "aria.labels.toggle": "Afficher/hide les \u00e9tiquettes",

    // ── Aria / Theme toggle ──────────────────────────────────────────────────
    "aria.theme.toggle_to_light": "Basculer en th\u00e8me clair",
    "aria.theme.toggle_to_dark": "Basculer en th\u00e8me sombre",

    // ── Aria / Notifications ─────────────────────────────────────────────────
    "aria.notification.close_label": "Fermer la notification",
    "aria.notification.close_title": "Fermer",

    // ── Aria / Cache ─────────────────────────────────────────────────────────
    "aria.cache.download_title": "T\u00e9l\u00e9charger le profile pour usage offline",
    "aria.cache.clear_title": "Effacer le cache du profile",

    // ── UI texts / Proximity ─────────────────────────────────────────────────
    "ui.proximity.point_placed": "\u2713 Ajustez le rayon",
    "ui.proximity.instruction_initial": "Toucher la carte",
    // ── UI texts / Filter actions ────────────────────────────────────────────
    "ui.filter.activate": "Activer",
    "ui.filter.disable": "D\u00e9sactiver",

    // ── UI texts / Sheet titles ──────────────────────────────────────────────
    "sheet.title.zoom": "Zoom",
    "sheet.title.geoloc": "Ma position",
    "sheet.title.search": "Recherche",
    "sheet.title.proximity": "Proximit\u00e9",
    "sheet.title.filters": "Filtres",
    "sheet.title.legend": "L\u00e9gende",
    "sheet.title.layers": "Couches",
    "sheet.title.table": "Tableau",
    "sheet.title.themes": "Th\u00e8mes (principales et secondaire)",

    // ── UI texts / Layer manager ─────────────────────────────────────────────
    "ui.layer_manager.empty": "Aucune couche \u00e0 afficher.",

    // ── UI texts / Filter panel ──────────────────────────────────────────────
    "ui.filter_panel.title": "Filtres",
    "ui.filter_panel.apply": "Appliquer",
    "ui.filter_panel.reset": "R\u00e9initialiser",
    "ui.filter_panel.categories_title_fallback": "Afficher les cat\u00e9gories",
    "ui.filter_panel.tags_title_fallback": "Afficher les tags",
    "ui.filter_panel.no_categories": "Aucune cat\u00e9gorie disponible sur les layers visibles",
    "ui.filter_panel.no_tags": "Aucun tag disponible sur les layers visibles",
    "ui.filter_panel.loading": "Chargement...",

    // ── UI texts / Notifications ─────────────────────────────────────────────
    "ui.notification.close_char": "\u00d7",

    // ── UI texts / Branding ──────────────────────────────────────────────────
    "ui.branding.default_text": "Propuls\u00e9 par \u00a9 GeoLeaf with Leaflet",
    "ui.branding.not_configured": "\u26a0 Branding non configur\u00e9",

    // ── UI texts / Cache ─────────────────────────────────────────────────────
    "ui.cache.section_label": "\ud83d\udce5 Cache Hors Ligne",
    "ui.cache.status_label": "Statut",
    "ui.cache.label_profile": "Profil :",
    "ui.cache.label_state": "\u00c9tat :",
    "ui.cache.state_initial": "Non t\u00e9l\u00e9charg\u00e9",
    "ui.cache.label_size": "Taille :",
    "ui.cache.label_quota": "Quota :",
    "ui.cache.state_downloaded": "\u2705 T\u00e9l\u00e9charg\u00e9",
    "ui.cache.state_not_downloaded": "\u274c Non t\u00e9l\u00e9charg\u00e9",
    "ui.cache.btn_download": "T\u00e9l\u00e9charger profile",
    "ui.cache.btn_clear": "Vider cache",
    "ui.cache.progress_in_progress": "T\u00e9l\u00e9chargement en cours...",
    "ui.cache.btn_downloading": "T\u00e9l\u00e9chargement...",
    "ui.cache.progress_preparing": "Pr\u00e9paration...",
    "ui.cache.progress_done": "\u2705 {0} ressources t\u00e9l\u00e9charg\u00e9es",
    "ui.cache.progress_error": "\u274c Erreur : {0}",
    "ui.cache.confirm_clear": "Vider le cache de ce profile ?",
    // ── UI texts / Offline ───────────────────────────────────────────────────
    "ui.offline.badge": "\u26a0\ufe0f Hors ligne",
    "aria.offline.badge_title": "Mode hors ligne actif",
    // ── UI texts / Themes ────────────────────────────────────────────────────
    "ui.theme.select_placeholder": "S\u00e9lectionner un th\u00e8me...",
    // ── UI texts / Table ─────────────────────────────────────────────────────
    "ui.table.layer_placeholder": "S\u00e9lectionner une couche...",

    // ── UI texts / Themes nav chars ──────────────────────────────────────────
    "ui.themes.nav_prev_char": "\u276e",
    "ui.themes.nav_next_char": "\u276f",

    // ── Formats ──────────────────────────────────────────────────────────────
    "format.proximity.radius": "{0} km",
    "format.cache.size_mb": "{0} MB",
    "format.cache.quota_mb": "{0} MB disponible",
    "format.scale.unit_km": "{0} km",
    "format.scale.unit_m": "{0} m",
    "format.zoom.level": "Zoom : {0}",
};

export default lang_fr;
