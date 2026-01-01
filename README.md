# 🍽️ Meal Tracker PWA

A lightweight, accessible Progressive Web App for tracking your daily meals and nutritional intake using the comprehensive **Ciqual food database** (41,665+ foods).

**🎯 Key Features:**
- ✅ Offline support (Service Worker + local storage)
- ✅ 41,665+ foods from Ciqual database with complete nutritional data
- ✅ Real-time meal logging with automatic calorie calculation
- ✅ Detailed nutrient breakdown (proteins, fats, carbs, fibers, sodium)
- ✅ Accessible design (WCAG 2.1 AA compliant)
- ✅ Mobile-friendly, responsive layout
- ✅ Zero dependencies, vanilla JavaScript

---

## 🚀 Quick Start

### Run Locally
```bash
cd meal-tracker
python3 -m http.server 8001 --directory public
# Then open: http://localhost:8001
```

### Deploy as PWA
1. Serve `public/` directory over HTTPS
2. App is installable from browser
3. Works fully offline

---

## 📖 Usage

### Add a Meal
1. Enter meal **Date**
2. **Search** for a food (e.g., "apple", "bread")
3. Click suggestion to add (default 100g)
4. Adjust grams; calories auto-calculated

### Browse Foods
1. Click **"📚 Browse Foods"**
2. **Search** by name, **Sort** by clicking headers
3. View nutrition for any food

### Manage Meals
- Click **"See nutrients"** to view details
- **Delete** individual meals
- **Clear all** meals

---

## ♿ Accessibility

- ✅ High contrast (dark text on white)
- ✅ Large fonts (18px base + 1.5 line-height)
- ✅ Keyboard navigation (Tab, Enter)
- ✅ Clear focus indicators (yellow)
- ✅ Screen reader friendly (ARIA)
- ✅ Respects `prefers-reduced-motion`

---

## 📂 Project Structure

```
public/                     (Served to users, ~1 MB)
├── index.html              # Main PWA app
├── browse.html             # Food database browser
├── manifest.json           # PWA config
├── sw.js                   # Service Worker v2
├── css/simple.css          # Accessible styles
├── js/
│   ├── simple.js           # Core app logic
│   └── compoWorker.js      # Web Worker parser
└── ciqual/
    └── ciqual_index.json   # Prebuilt food index (3,484 foods)

scripts/                    (Development only)
├── ciqual/
│   ├── alim_2025_11_03.xml
│   ├── const_2025_11_03.xml
│   └── compo_2025_11_03.xml
└── fill_all_nutrients.py   # Rebuild index from XMLs
```

**Key Design Decision:** Ciqual XMLs stored in `scripts/ciqual/` (development) only, not in `public/` (production). Only the prebuilt `ciqual_index.json` is served to users, keeping deployment lean.

---

## 🔧 Development

### Rebuild Index
If you update Ciqual XMLs, regenerate the index:
```bash
python3 scripts/fill_all_nutrients.py
```

### Test Offline
1. Open DevTools (F12)
2. Application → Service Workers
3. Check "Offline" → App still works

---

## 🌍 Data

**Ciqual Database** (Public domain)
- Source: ANSES (French Food Safety)
- 41,665+ foods with nutrition data
- Updated: November 2025

---

## 📜 License

MIT — See [LICENSE](LICENSE)

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md)

---

**Built with ❤️ for accessibility and simplicity.**
