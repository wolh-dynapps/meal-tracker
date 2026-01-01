# Changelog

All notable changes to this project will be documented in this file.

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
- **Ciqual Food Database Integration** — 41,665+ food items with comprehensive nutritional data
- **Food Search & Browser** — Real-time search with sortable table view by name, calories, proteins, lipids, carbs, fibers, sodium
- **Meal Tracking** — Add meals with automatic calorie calculation from food database
- **Nutrient Breakdown** — Detailed nutritional information per meal (proteins, lipids, carbs, sugars, fibers, sodium)
- **Accessibility Features**:
  - High-contrast design for low-vision users
  - Clear focus outlines (yellow) for keyboard navigation
  - ARIA labels, landmarks, and live regions for screen readers
  - Respects `prefers-reduced-motion` preference
  - Large, readable fonts (18px base) with 1.5 line-height
  - Keyboard-accessible UI (Tab, Enter, Arrow keys)
- **Local Storage** — Persistent meal history with date tracking
- **Responsive Design** — Works seamlessly on desktop, tablet, and mobile
- **Multi-language Support** — French interface with proper date/locale formatting
- **Food Browser** — Dedicated page to search and sort 41,665+ foods with complete nutrition data
- **Sortable Tables** — All 8 nutrient columns sortable with visual indicators (▲/▼)

### Technical
- **Client-side Ciqual Index** — Compact JSON index (`ciqual_index.json`) for instant lookups
- **Service Worker** — Cache-first strategy for static assets, network-first for dynamic content
- **Vanilla JavaScript** — No framework dependencies, lightweight (~50KB gzipped)
- **Build Scripts** — Python preprocessing to generate compact nutrient index from raw Ciqual XMLs
- **Optimized Deployment** — Only ~1 MB in production (JSON index), XMLs kept in scripts/ for development
- **Manifest.json** — Full PWA configuration with icons, shortcuts, and theme colors

### Architecture Decisions
- Ciqual XMLs stored in `scripts/ciqual/` (development only, not served)
- Only prebuilt `ciqual_index.json` deployed (production stays lean)
- Python script available to regenerate index if XMLs are updated


### Files & Structure
- `public/index.html` — Main PWA shell
- `public/browse.html` — Food database browser with search & sort
- `public/manifest.json` — Web app manifest with icons and theme
- `public/sw.js` — Service Worker for offline support
- `public/js/simple.js` — Core app logic (search, meal management, storage)
- `public/css/simple.css` — Accessible, responsive styling
- `public/ciqual/ciqual_index.json` — Prebuilt food index (3,484 foods, served only)
- `scripts/ciqual/` — Source Ciqual XMLs (development only, not served)
- `scripts/fill_all_nutrients.py` — Utility to build compact JSON index from XMLs

### Optimizations Applied
- **Production Size:** Reduced from 70 MB to ~1 MB by moving XMLs out of public/
- **Deployment:** Only serves JSON index, keeps public/ lean and fast
- **Development:** XMLs preserved in scripts/ for index regeneration
- **Build Scripts:** Updated `fill_all_nutrients.py` to work with new paths

### Known Limitations
- Ciqual index preload happens on app startup (uses prebuilt JSON, ~100ms)
- Energy calculation uses const_code 328 (kcal) from JSON index


### Future Enhancements
- Barcode scanning for food lookup
- Export meals as PDF or CSV
- Meal plan templates
- Multi-user support with cloud sync
- Additional language support
- Edit existing meals
