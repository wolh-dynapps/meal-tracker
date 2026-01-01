# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meal Tracker PWA is a lightweight, accessible Progressive Web App for tracking meals and nutritional intake using the French Ciqual food database (41,665+ foods). Built with vanilla JavaScript—no frameworks or dependencies.

## Commands

### Development Server
```bash
python3 -m http.server 8001 --directory public   # Serves on http://localhost:8001
```

### Rebuild Ciqual Index
```bash
python3 scripts/fill_all_nutrients.py  # Regenerates public/ciqual/ciqual_index.json from XMLs
```

## Architecture

### Data Flow
1. **Production data**: `public/ciqual/ciqual_index.json` (~2.5 MB) - prebuilt food database served to users
2. **Source data**: `scripts/ciqual/*.xml` (~69 MB) - raw Ciqual XMLs used only for regeneration
3. **User data**: localStorage stores meal entries client-side

### Key Components

| File | Purpose |
|------|---------|
| `public/js/simple.js` | Core app logic: meal CRUD, Ciqual search, nutrient calculation |
| `public/sw.js` | Service Worker v2: cache-first for static assets, network-first for data |
| `scripts/fill_all_nutrients.py` | Build script: parses Ciqual XMLs → generates JSON index |

### Pages
- `public/index.html` - Main app (meal tracking, search, stats)
- `public/browse.html` - Food database browser (sortable table with pagination)

### Nutrient Code Mapping
The app maps Ciqual const_codes to friendly names:
```javascript
'328'   → energy_kcal
'25000' → protein_g
'40000' → fat_g
'31000' → carbs_g
'32000' → sugars_g
'34100' → fiber_g
'10110' → sodium_mg
```

### localStorage Schema
```javascript
meals = [{
  id: timestamp,
  name: "Food — 100 g",
  calories: number,
  grams: number,
  date: "YYYY-MM-DD",
  category: "from-ciqual",
  nutrients: { "328": kcal, "25000": protein, ... }
}]
```

## Technical Constraints

- **No build tools**: Vanilla JS/HTML/CSS—no Webpack, Vite, or transpilation
- **No testing framework**: Manual browser testing only
- **No linting**: No ESLint/Prettier configured
- **French interface**: All UI text, date formatting, and labels are in French
- **WCAG 2.1 AA compliant**: Maintain high contrast, focus indicators, ARIA labels

## Service Worker Caching

`sw.js` uses versioned caching (v2):
- Static assets (HTML, CSS, JS, manifest): cache-first
- Dynamic data (JSON): network-first with cache fallback
- Call `skipWaiting()` on install for immediate activation
