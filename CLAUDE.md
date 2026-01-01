# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meal Tracker PWA is a lightweight, accessible Progressive Web App for tracking meals and nutritional intake using the French Ciqual food database (3,400+ foods). Built with vanilla JavaScript—no frameworks or dependencies.

**Live URL:** https://wolh-dynapps.github.io/meal-tracker/

## Commands

### Development Server
```bash
python3 -m http.server 8001 --directory docs   # Serves on http://localhost:8001
```

### Rebuild Ciqual Index
```bash
python3 scripts/fill_all_nutrients.py  # Regenerates docs/ciqual/ciqual_index.json from XMLs
```

## Project Structure

```
meal-tracker/
├── docs/                      # Static files (served by GitHub Pages)
│   ├── index.html             # Main app (tabs: Ajouter, Stats)
│   ├── browse.html            # Food database browser
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker v5
│   ├── css/simple.css         # All styles (~1000 lines)
│   ├── js/simple.js           # Core app logic (~1000 lines)
│   └── ciqual/
│       └── ciqual_index.json  # Prebuilt food database (~2.5 MB)
├── scripts/
│   ├── ciqual/*.xml           # Source Ciqual XMLs (~69 MB, dev only)
│   └── fill_all_nutrients.py  # Build script for JSON index
├── CHANGELOG.md               # Version history
└── CLAUDE.md                  # This file
```

## Architecture

### Data Flow
1. **Production data**: `docs/ciqual/ciqual_index.json` - prebuilt food database
2. **Source data**: `scripts/ciqual/*.xml` - raw Ciqual XMLs (development only)
3. **User data**: localStorage stores meals, goals, favorites, recipes

### localStorage Keys
| Key | Description |
|-----|-------------|
| `meals` | Array of meal objects |
| `dailyGoal` | Calorie target (default: 2000) |
| `macroGoals` | `{protein, fat, carbs}` in grams |
| `theme` | `"light"` or `"dark"` |
| `favorites` | Frequently used foods |
| `recipes` | User-created composed meals |
| `pendingSync` | Offline sync queue |

### Nutrient Code Mapping (Ciqual → App)
```javascript
'328'   → energy_kcal
'25000' → protein_g
'40000' → fat_g
'31000' → carbs_g
'32000' → sugars_g
'34100' → fiber_g
'10110' → sodium_mg
```

## Key Features (v1.2.1)

- **Tab Navigation**: "Ajouter" (input) and "Stats" (goals, charts, recipes)
- **Meal Categories**: Breakfast, lunch, dinner, snack with icons
- **Fuzzy Search**: Typo-tolerant food search
- **Favorites/Recent**: Quick access to common foods
- **Macro Goals**: Protein, fat, carbs tracking with progress bars
- **7-Day Chart**: Canvas-based calorie history
- **Recipes**: Create composed meals from multiple ingredients
- **Dark Mode**: Manual toggle + system preference
- **Export/Import**: JSON backup of all data
- **Push Notifications**: Optional meal reminders

## Technical Constraints

- **No build tools**: Vanilla JS/HTML/CSS—no Webpack, Vite, or transpilation
- **No testing framework**: Manual browser testing only
- **No linting**: No ESLint/Prettier configured
- **French interface**: All UI text, date formatting in French
- **WCAG 2.1 AA**: High contrast, focus indicators, ARIA labels
- **Relative paths**: All paths use `./` for GitHub Pages compatibility

## Deployment

### GitHub Pages (Current)
- Branch: `main`
- Folder: `/docs`
- URL: https://wolh-dynapps.github.io/meal-tracker/

### Service Worker
- Version: v5 (dynamic base path detection)
- Cache strategy: cache-first for static, network-first for data
- Updates: `skipWaiting()` on install for immediate activation

## Development Guidelines

### Before Committing
1. **Update CHANGELOG.md** with any user-facing changes
2. **Update README.md** if features, usage, or structure changed
3. **Update this file (CLAUDE.md)** if architecture, keys, or dev process changed
4. **Increment Service Worker version** if caching behavior changes
5. **Test on localhost** before pushing

### Documentation Checklist
- [ ] New feature? → Add to CHANGELOG.md + README.md features list
- [ ] New localStorage key? → Add to CLAUDE.md localStorage table
- [ ] New file/folder? → Update project structure in CLAUDE.md + README.md
- [ ] Breaking change? → Document migration steps in CHANGELOG.md
- [ ] Bug fix? → Add to CHANGELOG.md under "Fixed"

### Code Style
- Use `escapeHtml()` for any user-generated content (XSS prevention)
- Use `debounce()` for search inputs (200ms default)
- Keep functions small and focused
- Prefer early returns over nested conditionals

### Adding New Features
1. Update `docs/js/simple.js` for logic
2. Update `docs/css/simple.css` for styles
3. Update `docs/index.html` for new UI elements
4. Update `CHANGELOG.md` with feature description
5. Bump SW version in `docs/sw.js` and registration
