// ========== STOCKAGE ==========
const STORAGE_KEY = 'meals';
const GOAL_KEY = 'dailyGoal';
const THEME_KEY = 'theme';
let meals = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let dailyGoal = parseInt(localStorage.getItem(GOAL_KEY)) || 2000;

// ========== THEME ==========
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
  updateThemeIcon();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  let newTheme;
  if (current === 'dark') {
    newTheme = 'light';
  } else if (current === 'light') {
    newTheme = 'dark';
  } else {
    // No preference set, toggle from system default
    newTheme = prefersDark ? 'light' : 'dark';
  }

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const theme = document.documentElement.getAttribute('data-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (!theme && prefersDark);
  btn.textContent = isDark ? '☀️' : '🌙';
}

// Initialize theme immediately
initTheme();

// Ciqual data cache
let ciqualAlim = null; // [{code, name}]
const DEFAULT_GRAMS = 100;

// ========== UTILITAIRES ==========
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ========== FONCTIONS UTILES ==========

// Friendly labels and units for selected const codes
const NUTRIENT_META = {
  '328': { label: 'Énergie', unit: 'kcal' },
  '327': { label: 'Énergie (kJ)', unit: 'kJ' },
  '25000': { label: 'Protéines', unit: 'g' },
  '40000': { label: 'Lipides', unit: 'g' },
  '31000': { label: 'Glucides', unit: 'g' },
  '32000': { label: 'Sucres', unit: 'g' },
  '34100': { label: 'Fibres', unit: 'g' },
  '10110': { label: 'Sodium', unit: 'mg' }
};

function saveMeals() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
  render();
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('fr-FR', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function showNotification(message, isError = false) {
  const notif = document.createElement('div');
  notif.className = `notification ${isError ? 'error' : ''}`;
  notif.setAttribute('role','status');
  notif.textContent = message;
  document.body.appendChild(notif);
  // Also update hidden aria-live region for screen readers
  const aria = document.getElementById('ariaNotifications');
  if (aria) { aria.textContent = message; }

  setTimeout(() => {
    notif.remove();
  }, 3000);
}

async function loadCiqualIndex() {
  if (ciqualAlim) return ciqualAlim;
  const resp = await fetch('/ciqual/ciqual_index.json');
  if (!resp.ok) return null;
  const short = await resp.json();
  ciqualAlim = Object.keys(short).map(k => ({ code: k, name: short[k].name || '' }));
  window.__ciqual_short = short;
  return ciqualAlim;
}

// ========== AFFICHAGE ==========
function render() {
  const today = getTodayDate();
  const todayMeals = meals.filter(m => m.date === today);
  const todayCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);

  document.getElementById('todayCalories').textContent = todayCalories;
  document.getElementById('todayMeals').textContent = todayMeals.length;
  document.getElementById('totalMeals').textContent = meals.length;

  // Update progress bar
  const progressBar = document.getElementById('goalProgress');
  const goalLabel = document.getElementById('goalLabel');
  if (progressBar && goalLabel) {
    const pct = Math.min(100, Math.round((todayCalories / dailyGoal) * 100));
    progressBar.style.width = pct + '%';
    progressBar.className = 'progress-fill' + (pct >= 100 ? ' over' : '');
    goalLabel.textContent = `${todayCalories} / ${dailyGoal} kcal (${pct}%)`;
  }

  document.getElementById('clearBtn').style.display = meals.length > 0 ? 'block' : 'none';

  const listContainer = document.getElementById('mealsList');
  const sorted = [...meals].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sorted.length === 0) {
    listContainer.innerHTML = '<div class="empty-state"><p>Aucun repas pour le moment</p></div>';
    return;
  }

  // Group meals by date
  const grouped = {};
  sorted.forEach(meal => {
    if (!grouped[meal.date]) grouped[meal.date] = [];
    grouped[meal.date].push(meal);
  });

  listContainer.innerHTML = Object.entries(grouped).map(([date, dateMeals]) => {
    const dayCalories = dateMeals.reduce((sum, m) => sum + m.calories, 0);
    const mealsHtml = dateMeals.map(meal => `
      <div class="meal-item">
        <div class="meal-info">
          <h3>${escapeHtml(meal.name)}</h3>
          <div class="meal-details">
            <span class="meal-calories">${meal.calories} kcal</span>
            ${meal.notes ? `<span class="meal-notes">« ${escapeHtml(meal.notes)} »</span>` : ''}
          </div>
          ${meal.nutrients ? `<div style="margin-top:8px;"><button class="btn-nutrients" onclick="toggleNutrients(${meal.id})">Voir nutriments</button></div>
          <div id="nutrients-${meal.id}" class="nutrient-list" style="display:none; margin-top:8px;"></div>` : ''}
        </div>
        <button class="btn-delete" onclick="deleteMeal(${meal.id})">🗑️</button>
      </div>
    `).join('');
    return `
      <div class="day-group">
        <div class="day-header">
          <span class="day-date">${formatDate(date)}</span>
          <span class="day-total">${dayCalories} kcal</span>
        </div>
        ${mealsHtml}
      </div>
    `;
  }).join('');

  // populate nutrient lists
  sorted.forEach(meal => {
    if (meal.nutrients) {
      const el = document.getElementById(`nutrients-${meal.id}`);
      if (!el) return;
      const entries = Object.entries(meal.nutrients || {});
      if (entries.length === 0) { el.innerHTML = '<div class="muted">Aucune donnée nutritionnelle</div>'; return; }
      const rows = entries.slice(0, 50).map(([code, val]) => {
        const key = String(code);
        const meta = NUTRIENT_META[key] ? NUTRIENT_META[key].label : key;
        const unit = NUTRIENT_META[key] ? NUTRIENT_META[key].unit : '';
        const perPortion = ((val * (meal.grams || DEFAULT_GRAMS)) / 100);
        const display = Number.isFinite(perPortion) ? Math.round(perPortion * 100) / 100 : val;
        const unitDisplay = unit ? ` ${unit}` : '';
        return `<div class="nutrient-row"><strong>${escapeHtml(meta)}:</strong> ${display}${unitDisplay}</div>`;
      }).join('');
      el.innerHTML = rows;
    }
  });
}

function toggleNutrients(id) {
  const el = document.getElementById(`nutrients-${id}`);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ========== SUPPRIMER UN REPAS ==========
function deleteMeal(id) {
  const meal = meals.find(m => m.id === id);
  if (meal && confirm(`Supprimer "${meal.name}" ?`)) {
    meals = meals.filter(m => m.id !== id);
    saveMeals();
    showNotification('Repas supprimé');
  }
}

// ========== EXPORT ==========
function exportData() {
  const data = {
    meals,
    dailyGoal,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meal-tracker-${getTodayDate()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('Données exportées');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.meals && Array.isArray(data.meals)) {
        meals = data.meals;
        if (data.dailyGoal) {
          dailyGoal = data.dailyGoal;
          localStorage.setItem(GOAL_KEY, dailyGoal);
        }
        saveMeals();
        showNotification(`${meals.length} repas importés`);
      }
    } catch (err) {
      showNotification('Fichier invalide', true);
    }
  };
  reader.readAsText(file);
}

function setGoal(newGoal) {
  dailyGoal = parseInt(newGoal) || 2000;
  localStorage.setItem(GOAL_KEY, dailyGoal);
  render();
}

// ========== INITIALISATION (Attendre le DOM) ==========
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mealDate').valueAsDate = new Date();

  // Theme toggle
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Goal input
  const goalInput = document.getElementById('goalInput');
  if (goalInput) {
    goalInput.value = dailyGoal;
    goalInput.addEventListener('change', (e) => setGoal(e.target.value));
  }

  // Export/Import buttons
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportData);

  const importInput = document.getElementById('importInput');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      if (e.target.files[0]) importData(e.target.files[0]);
    });
  }

  // Preload Ciqual data
  (async () => {
    const statusEl = document.getElementById('preloadStatus');
    try {
      if (statusEl) statusEl.textContent = 'Préchargement…';
      const idx = await loadCiqualIndex();
      if (idx && idx.length && statusEl) {
        statusEl.textContent = 'Données prêtes';
        statusEl.classList.add('ready');
        setTimeout(() => statusEl.classList.add('hidden'), 2500);
      }
    } catch (e) {
      if (statusEl) { statusEl.textContent = 'Préchargement échoué'; statusEl.classList.add('ready'); }
      console.warn('Ciqual preload failed:', e);
    }
  })();

  // --- Ciqual search UI ---
  const foodInput = document.getElementById('foodSearch');
  const sugg = document.getElementById('foodSuggestions');
  let selectedIndex = -1;

  function addMeal(code, name) {
    const gramsInput = document.getElementById('foodGrams');
    const dateInput = document.getElementById('mealDate');
    const grams = (gramsInput && parseFloat(String(gramsInput.value).replace(',', '.'))) || DEFAULT_GRAMS;
    const date = (dateInput && dateInput.value) || getTodayDate();
    const short = window.__ciqual_short && window.__ciqual_short[code];
    if (!short) {
      showNotification('Données non disponibles', true);
      return;
    }
    const compo = {};
    let kcal = 0;
    if (short.energy_kcal != null) { compo['328'] = Number(short.energy_kcal); kcal = Math.round((Number(short.energy_kcal) * grams) / 100); }
    if (short.protein_g != null) compo['25000'] = Number(short.protein_g);
    if (short.fat_g != null) compo['40000'] = Number(short.fat_g);
    if (short.carbs_g != null) compo['31000'] = Number(short.carbs_g);
    if (short.sugars_g != null) compo['32000'] = Number(short.sugars_g);
    if (short.fiber_g != null) compo['34100'] = Number(short.fiber_g);
    if (short.sodium_mg != null) compo['10110'] = Number(short.sodium_mg);
    const mealName = `${name} — ${grams} g`;
    const meal = { id: Date.now(), name: mealName, calories: kcal, grams, date, category: 'from-ciqual', notes: '', timestamp: new Date().toISOString(), nutrients: compo };
    meals.push(meal);
    saveMeals();
    showNotification(`✅ ${mealName} ajouté (${kcal} kcal)`);
    foodInput.value = '';
    sugg.innerHTML = '';
    selectedIndex = -1;
  }

  function updateSelection() {
    const items = sugg.querySelectorAll('.suggestion-item');
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === selectedIndex);
    });
    if (selectedIndex >= 0 && items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  if (foodInput && sugg) {
    const doSearch = debounce(async (q) => {
      if (!q) { sugg.innerHTML = ''; selectedIndex = -1; return; }
      const list = await loadCiqualIndex();
      if (!list) {
        sugg.innerHTML = '<div class="suggestion-error">Données Ciqual non disponibles.</div>';
        return;
      }
      const results = list.filter(i => i.name.toLowerCase().includes(q)).slice(0, 12);
      sugg.innerHTML = results.map(r => `<button class="suggestion-item" data-code="${r.code}" data-name="${escapeHtml(r.name)}">${escapeHtml(r.name)} <small class="muted">(${r.code})</small></button>`).join('');
      selectedIndex = -1;

      // attach handlers
      Array.from(sugg.querySelectorAll('.suggestion-item')).forEach(btn => {
        btn.addEventListener('click', () => {
          addMeal(btn.dataset.code, btn.dataset.name);
        });
      });
    }, 200);

    foodInput.addEventListener('input', (e) => {
      doSearch(e.target.value.trim().toLowerCase());
    });

    // Keyboard navigation
    foodInput.addEventListener('keydown', (e) => {
      const items = sugg.querySelectorAll('.suggestion-item');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection();
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        const btn = items[selectedIndex];
        addMeal(btn.dataset.code, btn.dataset.name);
      } else if (e.key === 'Escape') {
        sugg.innerHTML = '';
        selectedIndex = -1;
      }
    });
  }

  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('Êtes-vous sûr ? Tous les repas seront supprimés')) {
      meals = [];
      saveMeals();
      showNotification('Tous les repas effacés');
    }
  });

  render();
});
