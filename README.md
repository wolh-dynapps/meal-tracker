# 🍽️ Meal Tracker PWA

A lightweight, accessible Progressive Web App for tracking your daily meals and nutritional intake using the comprehensive **Ciqual food database** (3,400+ foods).

**🌐 Live Demo:** https://wolh-dynapps.github.io/meal-tracker/

---

## ✨ Features

### Core
- 🔍 **Smart Food Search** — Fuzzy search with typo tolerance
- 📊 **Macro Tracking** — Calories, protein, fat, carbs with progress bars
- 📈 **7-Day History** — Visual chart of calorie intake
- 🗂️ **Meal Categories** — Breakfast, lunch, dinner, snack
- 📖 **Recipes** — Create composed meals from multiple ingredients

### UX
- 🌙 **Dark Mode** — Manual toggle + system preference
- ⭐ **Favorites** — Quick access to frequent foods
- 🕒 **Recent Foods** — Last used items
- ✏️ **Edit Meals** — Modify existing entries
- 💾 **Export/Import** — JSON backup of all data + separate recipe import/export
- ⚡ **Lazy Loading** — Shows 7 days by default, load more on demand

### Technical
- 📱 **PWA** — Installable, works offline
- ♿ **Accessible** — WCAG 2.1 AA compliant
- 🚀 **Fast** — Vanilla JS, no frameworks, gzip-compressed data (86% smaller)
- 🔔 **Notifications** — Optional meal reminders

---

## 🚀 Quick Start

### Run Locally
```bash
python3 -m http.server 8001 --directory docs
# Open: http://localhost:8001
```

### Deploy
The app is hosted on GitHub Pages from the `/docs` folder.

---

## 📖 Usage

### Add a Meal
1. Search for a food in the search box
2. Click a suggestion to add it
3. Adjust grams if needed (default: 100g)
4. Meal is saved with calculated calories

### View Stats
1. Click the **"📊 Stats"** tab
2. Configure calorie and macro goals
3. View 7-day history chart
4. Manage recipes

### Browse Foods
Click **"📚 Parcourir les aliments"** to explore the full Ciqual database.

---

## 📂 Project Structure

```
meal-tracker/
├── docs/                      # Static files (GitHub Pages)
│   ├── index.html             # Main app
│   ├── browse.html            # Food browser
│   ├── sw.js                  # Service Worker
│   ├── css/simple.css         # Styles
│   ├── js/simple.js           # App logic
│   └── ciqual/ciqual_index.json  # Food database
├── scripts/
│   ├── ciqual/*.xml           # Source Ciqual data (dev only)
│   ├── fill_all_nutrients.py  # Build script
│   ├── generate_demo_data.py  # Demo data generator (1 year)
│   ├── demo_data_1year.json   # Generated demo meals
│   └── demo_recipes.json      # 15 demo recipes
├── CHANGELOG.md
├── CLAUDE.md                  # Dev guidelines
└── README.md
```

---

## ♿ Accessibility

- High contrast design
- Large fonts (18px base)
- Keyboard navigation (Tab, Enter, Arrow keys)
- Yellow focus indicators
- ARIA labels and landmarks
- Respects `prefers-reduced-motion`

---

## 🔧 Development

### Rebuild Ciqual Index
```bash
python3 scripts/fill_all_nutrients.py
```

### Generate Demo Data
```bash
cd scripts
python3 generate_demo_data.py  # Creates 1 year of meals (~3000 entries)
```
Import via Stats tab → Import button.

### Test Offline
1. Open DevTools → Application → Service Workers
2. Check "Offline"
3. App continues to work

---

## 🌍 Data Source

**Ciqual Database** (Public domain)
- Source: ANSES (French Food Safety Agency)
- 3,400+ foods with complete nutritional data
- Updated: November 2025

---

## 📜 License

MIT — See [LICENSE](LICENSE)

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

**Built with ❤️ for accessibility and simplicity.**
