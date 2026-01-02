# Changelog

All notable changes to this project will be documented in this file.

## [1.2.5] - 2026-01-02

### Added
- **Import/Export Recettes** — Boutons dédiés pour exporter et importer uniquement les recettes (indépendamment des repas)
- **Recettes de démo** — 15 recettes prêtes à importer (`scripts/demo_recipes.json`)
- **Données de démo** — Script pour générer 1 an de repas fictifs (`scripts/generate_demo_data.py`)
- **Compression Gzip** — Base de données Ciqual compressée (932 KB → 129 KB, -86%)
- **DecompressionStream** — Décompression native dans le navigateur, fallback automatique pour anciens navigateurs

### Technical
- **Service Worker v16** — Updated cache version, precaches both .gz and .json

---

## [1.2.4] - 2026-01-01

### Added
- **Lighthouse Optimizations** — Targeting 100 scores across all categories
- **SEO Improvements** — Added Open Graph, structured data (JSON-LD), canonical URLs
- **Skip Links** — Keyboard accessibility for screen reader users
- **Preloading** — CSS and JS preloaded for faster initial render

### Changed
- **Enhanced Manifest** — Added categories, lang, dir, improved shortcuts with icons
- **Meta Tags** — Added theme-color, apple-mobile-web-app-*, robots

### Technical
- **Service Worker v11** — Updated cache version

---

## [1.2.3] - 2026-01-01

### Fixed
- **Browse Page Search** — Added accent normalization to food browser (matches main app behavior)
- **iPhone 14 Layout** — Added safe-area-inset padding for notch/dynamic island support
- **Modal Overlap** — Modals now respect safe-area-insets on iOS devices

### Technical
- **Service Worker v8** — Updated cache version
- **viewport-fit=cover** — Added to meta viewport for proper iOS safe area handling

---

## [1.2.2] - 2026-01-01

### Added
- **Recipes in Food Search** — Recipes now appear in the main food search bar with 📖 icon
- **Accent-Tolerant Search** — Fuzzy search now handles French accents (é→e, ô→o, etc.)

### Changed
- **Quick Suggestions** — Recipes shown first when focusing the search bar, before favorites and recent

### Technical
- **Service Worker v7** — Updated cache version for new features

---

## [1.2.1] - 2026-01-01

### Fixed
- **GitHub Pages Compatibility** — All paths now relative (`./`) for subdirectory hosting
- **Service Worker v6** — Precaches ciqual_index.json for instant first load
- **browse.html SW Path** — Fixed absolute path that caused 404 on GitHub Pages
- **manifest.json Paths** — Fixed start_url and scope for subdirectory hosting
- **Documentation** — Corrected food count from 41,665 to 3,400+ (actual Ciqual foods)

### Changed
- **Project Structure** — Renamed `public/` to `docs/` for GitHub Pages deployment

---

## [1.2.0] - 2026-01-01

### Added
- **Tab Navigation** — New UX with "Ajouter" and "Stats" tabs for cleaner interface
- **Meal Categories** — Categorize meals as breakfast, lunch, dinner, or snack with icons
- **Edit Meals** — Edit existing meals (name, date, grams, category, notes) via modal
- **Fuzzy Search** — Typo-tolerant search with scoring algorithm for better food matching
- **Favorites & Recent Foods** — Quick access to frequently used and recent foods
- **Macro Nutrient Goals** — Configurable daily targets for protein, fat, and carbs with progress bars
- **History Chart** — Visual 7-day calorie history chart with daily goal line
- **Recipes/Composed Meals** — Create and save custom recipes from multiple ingredients
- **Push Notifications** — Optional meal reminders for breakfast, lunch, and dinner
- **Offline Sync Queue** — Infrastructure for future cloud sync (stores pending changes)

### Changed
- **UX Redesign** — Food search is now the primary action on the Add tab
- **Quick Summary** — Calorie progress shown prominently at top of Add tab
- **Today's Meals** — Separate section for today's meals, full history in collapsible
- **Meal List** — Now shows category icons and notes per meal
- **Search Suggestions** — Shows favorites and recent foods when input is focused

### Technical
- **Service Worker v4** — Updated cache version for new features
- **CSS Variables** — Added macro color variables for themed progress bars
- **Modal System** — Reusable modal component for edit and recipe dialogs

---

## [1.1.0] - 2026-01-01

### Added
- **Daily Calorie Goal** — Configurable daily target with visual progress bar
- **Dark Mode** — Manual toggle + automatic theme based on system preference
- **Meal Grouping by Day** — Meals are now visually grouped by date with daily totals
- **Data Export/Import** — Export all meals to JSON, import from backup file
- **Keyboard Navigation** — Arrow keys (↑/↓) to navigate suggestions, Enter to select, Escape to close

### Changed
- **Date Picker** — Meals can now be added to any date (not just today)
- **Improved Search** — Added 200ms debounce to reduce unnecessary filtering

### Fixed
- **XSS Vulnerability** — All user input is now properly HTML-escaped before rendering

### Removed
- **Web Worker for XML Parsing** — Removed `compoWorker.js` (no longer needed, JSON index only)
- **XML Fallback Code** — Cleaned up unused XML loading code from `simple.js`

### Technical
- **CSS Variables** — Refactored styles with CSS custom properties for theming
- **Service Worker v3** — Updated cache version for new features

---

## [1.0.0] - 2026-01-01

### Added
- **Progressive Web App (PWA)** — Installable as standalone app, works offline with Service Worker
- **Ciqual Food Database Integration** — 3,400+ food items with comprehensive nutritional data
- **Food Search & Browser** — Real-time search with sortable table view
- **Meal Tracking** — Add meals with automatic calorie calculation from food database
- **Nutrient Breakdown** — Detailed nutritional information per meal
- **Accessibility Features** — WCAG 2.1 AA compliant (high contrast, ARIA, keyboard navigation)
- **Local Storage** — Persistent meal history with date tracking
- **Responsive Design** — Works seamlessly on desktop, tablet, and mobile
- **French Interface** — All UI text and date formatting in French

### Technical
- **Vanilla JavaScript** — No framework dependencies, lightweight (~50KB gzipped)
- **Service Worker** — Cache-first for static assets, network-first for data
- **Build Scripts** — Python preprocessing to generate JSON index from Ciqual XMLs

---

## Future Enhancements
- Barcode scanning for food lookup
- Export meals as PDF or CSV
- Meal plan templates
- Multi-user support with cloud sync
- Additional language support
