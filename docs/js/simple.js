// ========== STOCKAGE ==========
const STORAGE_KEY = 'meals';
const GOAL_KEY = 'dailyGoal';
const MACRO_GOALS_KEY = 'macroGoals';
const THEME_KEY = 'theme';
const FAVORITES_KEY = 'favorites';
const RECIPES_KEY = 'recipes';
const PENDING_SYNC_KEY = 'pendingSync';

let meals = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let dailyGoal = parseInt(localStorage.getItem(GOAL_KEY)) || 2000;
let macroGoals = JSON.parse(localStorage.getItem(MACRO_GOALS_KEY) || '{"protein":50,"fat":70,"carbs":260}');
let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
let recipes = JSON.parse(localStorage.getItem(RECIPES_KEY) || '[]');
let pendingSync = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');

// Categories
const MEAL_CATEGORIES = [
  { id: 'breakfast', label: 'Petit-déjeuner', icon: '🌅' },
  { id: 'lunch', label: 'Déjeuner', icon: '☀️' },
  { id: 'dinner', label: 'Dîner', icon: '🌙' },
  { id: 'snack', label: 'Snack', icon: '🍎' }
];

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
  if (current === 'dark') newTheme = 'light';
  else if (current === 'light') newTheme = 'dark';
  else newTheme = prefersDark ? 'light' : 'dark';
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

initTheme();

// Ciqual data cache
let ciqualAlim = null;
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

// Normalize accents for search (é→e, ô→o, etc.)
function normalizeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Fuzzy search - calcule un score de correspondance
function fuzzyMatch(text, query) {
  text = normalizeAccents(text.toLowerCase());
  query = normalizeAccents(query.toLowerCase());

  // Exact match = highest score
  if (text.includes(query)) return 1000 - text.indexOf(query);

  // Fuzzy matching
  let score = 0;
  let queryIdx = 0;
  let consecutiveBonus = 0;

  for (let i = 0; i < text.length && queryIdx < query.length; i++) {
    if (text[i] === query[queryIdx]) {
      score += 10 + consecutiveBonus;
      consecutiveBonus += 5;
      queryIdx++;
    } else {
      consecutiveBonus = 0;
    }
  }

  // All query chars must be found
  if (queryIdx < query.length) return 0;

  // Bonus for shorter texts (more relevant)
  score += Math.max(0, 50 - text.length);

  return score;
}

// ========== NUTRIMENTS ==========
const NUTRIENT_META = {
  '328': { label: 'Énergie', unit: 'kcal', key: 'energy_kcal' },
  '327': { label: 'Énergie (kJ)', unit: 'kJ', key: 'energy_kj' },
  '25000': { label: 'Protéines', unit: 'g', key: 'protein_g' },
  '40000': { label: 'Lipides', unit: 'g', key: 'fat_g' },
  '31000': { label: 'Glucides', unit: 'g', key: 'carbs_g' },
  '32000': { label: 'Sucres', unit: 'g', key: 'sugars_g' },
  '34100': { label: 'Fibres', unit: 'g', key: 'fiber_g' },
  '10110': { label: 'Sodium', unit: 'mg', key: 'sodium_mg' }
};

// ========== PERSISTENCE ==========
function saveMeals() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
  render();
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function saveRecipes() {
  localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
}

function saveMacroGoals() {
  localStorage.setItem(MACRO_GOALS_KEY, JSON.stringify(macroGoals));
}

function addToPendingSync(action) {
  pendingSync.push({ ...action, timestamp: Date.now() });
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingSync));
}

function clearPendingSync() {
  pendingSync = [];
  localStorage.setItem(PENDING_SYNC_KEY, '[]');
}

// ========== FAVORIS ==========
function addToFavorites(code, name) {
  const existing = favorites.find(f => f.code === code);
  if (existing) {
    existing.count++;
    existing.lastUsed = Date.now();
  } else {
    favorites.push({ code, name, count: 1, lastUsed: Date.now() });
  }
  // Keep only top 20
  favorites.sort((a, b) => b.count - a.count);
  favorites = favorites.slice(0, 20);
  saveFavorites();
}

function getRecentFoods() {
  // Get last 10 unique foods from meals
  const seen = new Set();
  const recent = [];
  const sortedMeals = [...meals].sort((a, b) => b.id - a.id);
  for (const meal of sortedMeals) {
    if (meal.foodCode && !seen.has(meal.foodCode)) {
      seen.add(meal.foodCode);
      recent.push({ code: meal.foodCode, name: meal.foodName || meal.name });
      if (recent.length >= 10) break;
    }
  }
  return recent;
}

// ========== RECETTES ==========
function createRecipe(name, ingredients) {
  const recipe = {
    id: Date.now(),
    name,
    ingredients, // [{code, name, grams}]
    createdAt: new Date().toISOString()
  };
  recipes.push(recipe);
  saveRecipes();
  return recipe;
}

function deleteRecipe(id) {
  recipes = recipes.filter(r => r.id !== id);
  saveRecipes();
}

function getRecipeNutrients(recipe) {
  const totals = { calories: 0, protein: 0, fat: 0, carbs: 0 };
  for (const ing of recipe.ingredients) {
    const short = window.__ciqual_short && window.__ciqual_short[ing.code];
    if (short) {
      const factor = ing.grams / 100;
      totals.calories += (short.energy_kcal || 0) * factor;
      totals.protein += (short.protein_g || 0) * factor;
      totals.fat += (short.fat_g || 0) * factor;
      totals.carbs += (short.carbs_g || 0) * factor;
    }
  }
  return totals;
}

// ========== DATES ==========
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTodayDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getDateRange(days) {
  const dates = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return dates;
}

// ========== NOTIFICATIONS ==========
function showNotification(message, isError = false) {
  const notif = document.createElement('div');
  notif.className = `notification ${isError ? 'error' : ''}`;
  notif.setAttribute('role', 'status');
  notif.textContent = message;
  document.body.appendChild(notif);
  const aria = document.getElementById('ariaNotifications');
  if (aria) aria.textContent = message;
  setTimeout(() => notif.remove(), 3000);
}

// Push notifications
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

function scheduleReminder(hour, minute, message) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(hour, minute, 0, 0);
  if (scheduled <= now) scheduled.setDate(scheduled.getDate() + 1);

  const delay = scheduled - now;
  setTimeout(() => {
    new Notification('Meal Tracker', { body: message });
    // Reschedule for next day
    scheduleReminder(hour, minute, message);
  }, delay);
}

// ========== CHARGEMENT CIQUAL ==========
async function loadCiqualIndex() {
  if (ciqualAlim) return ciqualAlim;
  const resp = await fetch('./ciqual/ciqual_index.json');
  if (!resp.ok) return null;
  const short = await resp.json();
  ciqualAlim = Object.keys(short).map(k => ({ code: k, name: short[k].name || '' }));
  window.__ciqual_short = short;
  return ciqualAlim;
}

// ========== CALCULS MACROS ==========
function getTodayMacros() {
  const today = getTodayDate();
  const todayMeals = meals.filter(m => m.date === today);
  const macros = { calories: 0, protein: 0, fat: 0, carbs: 0 };

  for (const meal of todayMeals) {
    macros.calories += meal.calories || 0;
    if (meal.nutrients) {
      const grams = meal.grams || 100;
      macros.protein += ((meal.nutrients['25000'] || 0) * grams) / 100;
      macros.fat += ((meal.nutrients['40000'] || 0) * grams) / 100;
      macros.carbs += ((meal.nutrients['31000'] || 0) * grams) / 100;
    }
  }

  return macros;
}

// ========== GRAPHIQUES ==========
function renderChart(canvasId, days = 7) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = 200;

  const dates = getDateRange(days);
  const data = dates.map(date => {
    const dayMeals = meals.filter(m => m.date === date);
    return dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  });

  const maxVal = Math.max(...data, dailyGoal) * 1.1;
  const barWidth = (width - 60) / days;
  const chartHeight = height - 40;

  ctx.clearRect(0, 0, width, height);

  // Goal line
  const goalY = height - 20 - (dailyGoal / maxVal) * chartHeight;
  ctx.strokeStyle = '#e74c3c';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(40, goalY);
  ctx.lineTo(width - 10, goalY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bars
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

  data.forEach((val, i) => {
    const barHeight = (val / maxVal) * chartHeight;
    const x = 50 + i * barWidth;
    const y = height - 20 - barHeight;

    ctx.fillStyle = val >= dailyGoal ? '#e74c3c' : (isDark ? '#8ab4f8' : '#4285f4');
    ctx.fillRect(x, y, barWidth - 8, barHeight);

    // Labels
    ctx.fillStyle = isDark ? '#9aa0a6' : '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const dayLabel = new Date(dates[i] + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short' });
    ctx.fillText(dayLabel, x + (barWidth - 8) / 2, height - 5);

    if (val > 0) {
      ctx.fillText(val.toString(), x + (barWidth - 8) / 2, y - 5);
    }
  });

  // Y axis
  ctx.fillStyle = isDark ? '#9aa0a6' : '#666';
  ctx.textAlign = 'right';
  ctx.fillText('0', 35, height - 20);
  ctx.fillText(Math.round(maxVal).toString(), 35, 25);
}

// ========== AFFICHAGE ==========
function render() {
  const today = getTodayDate();
  const todayMeals = meals.filter(m => m.date === today);
  const macros = getTodayMacros();

  // Quick summary (Add tab)
  const quickCalEl = document.getElementById('todayCalories');
  if (quickCalEl) quickCalEl.textContent = Math.round(macros.calories);

  const quickProgressEl = document.getElementById('quickProgress');
  const quickGoalEl = document.getElementById('quickGoalLabel');
  if (quickProgressEl && quickGoalEl) {
    const pct = Math.min(100, Math.round((macros.calories / dailyGoal) * 100));
    quickProgressEl.style.width = pct + '%';
    quickGoalEl.textContent = `/ ${dailyGoal}`;
  }

  // Today's meals count
  const todayMealsEl = document.getElementById('todayMeals');
  if (todayMealsEl) todayMealsEl.textContent = todayMeals.length;

  const totalMealsEl = document.getElementById('totalMeals');
  if (totalMealsEl) totalMealsEl.textContent = meals.length;

  // Calorie progress (Stats tab)
  const progressBar = document.getElementById('goalProgress');
  const goalLabel = document.getElementById('goalLabel');
  if (progressBar && goalLabel) {
    const pct = Math.min(100, Math.round((macros.calories / dailyGoal) * 100));
    progressBar.style.width = pct + '%';
    progressBar.className = 'progress-fill' + (pct >= 100 ? ' over' : '');
    goalLabel.textContent = `${Math.round(macros.calories)} / ${dailyGoal} kcal (${pct}%)`;
  }

  // Macro progress bars
  renderMacroProgress('proteinProgress', 'proteinLabel', macros.protein, macroGoals.protein, 'Protéines', 'protein');
  renderMacroProgress('fatProgress', 'fatLabel', macros.fat, macroGoals.fat, 'Lipides', 'fat');
  renderMacroProgress('carbsProgress', 'carbsLabel', macros.carbs, macroGoals.carbs, 'Glucides', 'carbs');

  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) clearBtn.style.display = meals.length > 0 ? 'inline-block' : 'none';

  // Today's meals list (Add tab)
  const todayListContainer = document.getElementById('todayMealsList');
  if (todayListContainer) {
    if (todayMeals.length === 0) {
      todayListContainer.innerHTML = '<div class="empty-state"><p>Aucun repas aujourd\'hui</p></div>';
    } else {
      todayListContainer.innerHTML = todayMeals.map(meal => renderMealItem(meal)).join('');
      populateNutrients(todayMeals);
    }
  }

  // All meals list (collapsible)
  const listContainer = document.getElementById('mealsList');
  const sorted = [...meals].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (listContainer) {
    if (sorted.length === 0) {
      listContainer.innerHTML = '<div class="empty-state"><p>Aucun repas enregistré</p></div>';
    } else {
      const grouped = {};
      sorted.forEach(meal => {
        if (!grouped[meal.date]) grouped[meal.date] = [];
        grouped[meal.date].push(meal);
      });

      listContainer.innerHTML = Object.entries(grouped).map(([date, dateMeals]) => {
        const dayCalories = dateMeals.reduce((sum, m) => sum + m.calories, 0);
        return `
          <div class="day-group">
            <div class="day-header">
              <span class="day-date">${formatDate(date)}</span>
              <span class="day-total">${dayCalories} kcal</span>
            </div>
            ${dateMeals.map(meal => renderMealItem(meal)).join('')}
          </div>
        `;
      }).join('');

      populateNutrients(sorted);
    }
  }

  // Render chart (only if visible)
  if (document.getElementById('tab-stats')?.classList.contains('active')) {
    renderChart('historyChart', 7);
  }
}

function renderMealItem(meal) {
  const cat = MEAL_CATEGORIES.find(c => c.id === meal.category) || { icon: '🍽️', label: '' };
  return `
    <div class="meal-item" data-id="${meal.id}">
      <div class="meal-info">
        <h3><span class="meal-cat-icon">${cat.icon}</span> ${escapeHtml(meal.name)}</h3>
        <div class="meal-details">
          <span class="meal-calories">${meal.calories} kcal</span>
          ${meal.category ? `<span class="meal-category-tag">${cat.label}</span>` : ''}
          ${meal.notes ? `<span class="meal-notes">« ${escapeHtml(meal.notes)} »</span>` : ''}
        </div>
        ${meal.nutrients ? `<div style="margin-top:8px;"><button class="btn-nutrients" onclick="toggleNutrients(${meal.id})">Nutriments</button></div>
        <div id="nutrients-${meal.id}" class="nutrient-list" style="display:none;"></div>` : ''}
      </div>
      <div class="meal-actions">
        <button class="btn-edit" onclick="openEditModal(${meal.id})" title="Modifier">✏️</button>
        <button class="btn-delete" onclick="deleteMeal(${meal.id})" title="Supprimer">🗑️</button>
      </div>
    </div>
  `;
}

function populateNutrients(mealsList) {
  mealsList.forEach(meal => {
    if (meal.nutrients) {
      const el = document.getElementById(`nutrients-${meal.id}`);
      if (!el) return;
      const entries = Object.entries(meal.nutrients || {});
      if (entries.length === 0) {
        el.innerHTML = '<div class="muted">Aucune donnée nutritionnelle</div>';
        return;
      }
      const rows = entries.slice(0, 50).map(([code, val]) => {
        const meta = NUTRIENT_META[code] || { label: code, unit: '' };
        const perPortion = ((val * (meal.grams || 100)) / 100);
        const display = Number.isFinite(perPortion) ? Math.round(perPortion * 100) / 100 : val;
        return `<div class="nutrient-row"><strong>${escapeHtml(meta.label)}:</strong> ${display} ${meta.unit}</div>`;
      }).join('');
      el.innerHTML = rows;
    }
  });
}

function renderMacroProgress(barId, labelId, current, goal, name, colorClass) {
  const bar = document.getElementById(barId);
  const label = document.getElementById(labelId);
  if (!bar || !label) return;
  const pct = Math.min(100, Math.round((current / goal) * 100));
  bar.style.width = pct + '%';
  bar.className = 'macro-fill ' + colorClass + (pct >= 100 ? ' over' : '');
  label.textContent = `${name}: ${Math.round(current)}g / ${goal}g`;
}

function toggleNutrients(id) {
  const el = document.getElementById(`nutrients-${id}`);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ========== CRUD REPAS ==========
function deleteMeal(id) {
  const meal = meals.find(m => m.id === id);
  if (meal && confirm(`Supprimer "${meal.name}" ?`)) {
    meals = meals.filter(m => m.id !== id);
    addToPendingSync({ type: 'delete', id });
    saveMeals();
    showNotification('Repas supprimé');
  }
}

function openEditModal(id) {
  const meal = meals.find(m => m.id === id);
  if (!meal) return;

  const modal = document.getElementById('editModal');
  document.getElementById('editMealId').value = meal.id;
  document.getElementById('editMealName').value = meal.name;
  document.getElementById('editMealGrams').value = meal.grams || 100;
  document.getElementById('editMealDate').value = meal.date;
  document.getElementById('editMealCategory').value = meal.category || '';
  document.getElementById('editMealNotes').value = meal.notes || '';

  modal.classList.add('open');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
}

function saveEditedMeal() {
  const id = parseInt(document.getElementById('editMealId').value);
  const meal = meals.find(m => m.id === id);
  if (!meal) return;

  const newGrams = parseFloat(document.getElementById('editMealGrams').value) || 100;
  const oldGrams = meal.grams || 100;
  const ratio = newGrams / oldGrams;

  meal.name = document.getElementById('editMealName').value;
  meal.grams = newGrams;
  meal.date = document.getElementById('editMealDate').value;
  meal.category = document.getElementById('editMealCategory').value;
  meal.notes = document.getElementById('editMealNotes').value;
  meal.calories = Math.round(meal.calories * ratio);

  addToPendingSync({ type: 'update', meal });
  saveMeals();
  closeEditModal();
  showNotification('Repas modifié');
}

// ========== EXPORT/IMPORT ==========
function exportData() {
  const data = { meals, dailyGoal, macroGoals, favorites, recipes, exportedAt: new Date().toISOString() };
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
      if (data.meals) meals = data.meals;
      if (data.dailyGoal) { dailyGoal = data.dailyGoal; localStorage.setItem(GOAL_KEY, dailyGoal); }
      if (data.macroGoals) { macroGoals = data.macroGoals; saveMacroGoals(); }
      if (data.favorites) { favorites = data.favorites; saveFavorites(); }
      if (data.recipes) { recipes = data.recipes; saveRecipes(); }
      saveMeals();
      showNotification(`${meals.length} repas importés`);
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

function setMacroGoal(macro, value) {
  macroGoals[macro] = parseInt(value) || 0;
  saveMacroGoals();
  render();
}

// ========== RECETTES UI ==========
function openRecipeModal() {
  document.getElementById('recipeModal').classList.add('open');
  document.getElementById('recipeName').value = '';
  document.getElementById('recipeIngredients').innerHTML = '';
  addRecipeIngredient();
}

function closeRecipeModal() {
  document.getElementById('recipeModal').classList.remove('open');
}

function addRecipeIngredient() {
  const container = document.getElementById('recipeIngredients');
  const idx = container.children.length;
  const div = document.createElement('div');
  div.className = 'recipe-ingredient';
  div.innerHTML = `
    <div class="recipe-ing-search-wrap">
      <input type="text" class="recipe-ing-search" placeholder="Rechercher un aliment..." data-idx="${idx}" autocomplete="off">
      <div class="recipe-ing-suggestions"></div>
    </div>
    <input type="number" class="recipe-ing-grams" value="100" min="1" placeholder="g">
    <input type="hidden" class="recipe-ing-code">
    <input type="hidden" class="recipe-ing-name">
    <button type="button" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(div);

  // Add search functionality
  const searchInput = div.querySelector('.recipe-ing-search');
  const suggBox = div.querySelector('.recipe-ing-suggestions');
  const codeInput = div.querySelector('.recipe-ing-code');
  const nameInput = div.querySelector('.recipe-ing-name');

  const doIngSearch = debounce(async (q) => {
    if (!q || q.length < 2) { suggBox.innerHTML = ''; return; }
    const list = await loadCiqualIndex();
    if (!list) return;

    const scored = list.map(i => ({ ...i, score: fuzzyMatch(i.name, q) }))
      .filter(i => i.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    suggBox.innerHTML = scored.map(r =>
      `<button type="button" class="recipe-sugg-item" data-code="${r.code}" data-name="${escapeHtml(r.name)}">${escapeHtml(r.name)}</button>`
    ).join('');

    suggBox.querySelectorAll('.recipe-sugg-item').forEach(btn => {
      btn.addEventListener('click', () => {
        searchInput.value = btn.dataset.name;
        codeInput.value = btn.dataset.code;
        nameInput.value = btn.dataset.name;
        suggBox.innerHTML = '';
      });
    });
  }, 200);

  searchInput.addEventListener('input', (e) => doIngSearch(e.target.value.trim().toLowerCase()));
  searchInput.addEventListener('blur', () => setTimeout(() => suggBox.innerHTML = '', 200));
}

function saveRecipe() {
  const name = document.getElementById('recipeName').value.trim();
  if (!name) { showNotification('Nom requis', true); return; }

  const ingredients = [];
  document.querySelectorAll('.recipe-ingredient').forEach(div => {
    const code = div.querySelector('.recipe-ing-code').value;
    const ingName = div.querySelector('.recipe-ing-name').value;
    const grams = parseFloat(div.querySelector('.recipe-ing-grams').value) || 100;
    if (code) ingredients.push({ code, name: ingName, grams });
  });

  if (ingredients.length === 0) { showNotification('Ajoutez des ingrédients', true); return; }

  createRecipe(name, ingredients);
  closeRecipeModal();
  showNotification('Recette créée');
  renderRecipesList();
}

function renderRecipesList() {
  const container = document.getElementById('recipesList');
  if (!container) return;

  if (recipes.length === 0) {
    container.innerHTML = '<p class="muted">Aucune recette</p>';
    return;
  }

  container.innerHTML = recipes.map(r => {
    const nutrients = getRecipeNutrients(r);
    return `
      <div class="recipe-item">
        <div class="recipe-info">
          <strong>${escapeHtml(r.name)}</strong>
          <span class="recipe-stats">${Math.round(nutrients.calories)} kcal • ${r.ingredients.length} ingrédients</span>
        </div>
        <div class="recipe-actions">
          <button onclick="addRecipeAsMeal(${r.id})">➕</button>
          <button onclick="deleteRecipeConfirm(${r.id})">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function addRecipeAsMeal(recipeId) {
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return;

  const nutrients = getRecipeNutrients(recipe);
  const totalGrams = recipe.ingredients.reduce((sum, i) => sum + i.grams, 0);

  const dateInput = document.getElementById('mealDate');
  const categorySelect = document.getElementById('mealCategory');

  const meal = {
    id: Date.now(),
    name: recipe.name,
    calories: Math.round(nutrients.calories),
    grams: totalGrams,
    date: (dateInput && dateInput.value) || getTodayDate(),
    category: (categorySelect && categorySelect.value) || 'lunch',
    notes: '',
    timestamp: new Date().toISOString(),
    nutrients: {
      '328': nutrients.calories,
      '25000': nutrients.protein,
      '40000': nutrients.fat,
      '31000': nutrients.carbs
    },
    recipeId: recipe.id
  };

  meals.push(meal);
  addToPendingSync({ type: 'add', meal });
  saveMeals();
  showNotification(`✅ ${recipe.name} ajouté`);
}

function deleteRecipeConfirm(id) {
  if (confirm('Supprimer cette recette ?')) {
    deleteRecipe(id);
    renderRecipesList();
    showNotification('Recette supprimée');
  }
}

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      // Update buttons
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tabId);
        b.setAttribute('aria-selected', b.dataset.tab === tabId);
      });
      // Update content
      document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('active', c.id === `tab-${tabId}`);
      });
      // Render chart when switching to stats tab
      if (tabId === 'stats') {
        renderChart('historyChart', 7);
      }
    });
  });

  // Date picker
  const dateInput = document.getElementById('mealDate');
  if (dateInput) dateInput.valueAsDate = new Date();

  // Theme toggle
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Goal inputs
  const goalInput = document.getElementById('goalInput');
  if (goalInput) {
    goalInput.value = dailyGoal;
    goalInput.addEventListener('change', (e) => setGoal(e.target.value));
  }

  // Macro goal inputs
  ['protein', 'fat', 'carbs'].forEach(macro => {
    const input = document.getElementById(`${macro}GoalInput`);
    if (input) {
      input.value = macroGoals[macro];
      input.addEventListener('change', (e) => setMacroGoal(macro, e.target.value));
    }
  });

  // Export/Import
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportData);

  const importInput = document.getElementById('importInput');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      if (e.target.files[0]) importData(e.target.files[0]);
    });
  }

  // Edit modal
  const editSaveBtn = document.getElementById('editSaveBtn');
  if (editSaveBtn) editSaveBtn.addEventListener('click', saveEditedMeal);

  const editCancelBtn = document.getElementById('editCancelBtn');
  if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);

  // Recipe modal
  const recipeBtn = document.getElementById('newRecipeBtn');
  if (recipeBtn) recipeBtn.addEventListener('click', openRecipeModal);

  const recipeSaveBtn = document.getElementById('recipeSaveBtn');
  if (recipeSaveBtn) recipeSaveBtn.addEventListener('click', saveRecipe);

  const recipeCancelBtn = document.getElementById('recipeCancelBtn');
  if (recipeCancelBtn) recipeCancelBtn.addEventListener('click', closeRecipeModal);

  const addIngBtn = document.getElementById('addIngredientBtn');
  if (addIngBtn) addIngBtn.addEventListener('click', addRecipeIngredient);

  // Notifications permission
  const notifBtn = document.getElementById('enableNotifications');
  if (notifBtn) {
    notifBtn.addEventListener('click', async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        showNotification('Notifications activées');
        // Schedule default reminders
        scheduleReminder(8, 0, 'N\'oubliez pas de logger votre petit-déjeuner !');
        scheduleReminder(12, 30, 'C\'est l\'heure du déjeuner !');
        scheduleReminder(19, 0, 'Pensez à logger votre dîner !');
      } else {
        showNotification('Notifications refusées', true);
      }
    });
  }

  // Preload Ciqual
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
      if (statusEl) { statusEl.textContent = 'Échec'; statusEl.classList.add('ready'); }
    }
  })();

  // Search UI
  const foodInput = document.getElementById('foodSearch');
  const sugg = document.getElementById('foodSuggestions');
  let selectedIndex = -1;

  function addMeal(code, name) {
    const gramsInput = document.getElementById('foodGrams');
    const categorySelect = document.getElementById('mealCategory');
    const grams = (gramsInput && parseFloat(String(gramsInput.value).replace(',', '.'))) || DEFAULT_GRAMS;
    const date = (dateInput && dateInput.value) || getTodayDate();
    const category = (categorySelect && categorySelect.value) || 'lunch';

    const short = window.__ciqual_short && window.__ciqual_short[code];
    if (!short) { showNotification('Données non disponibles', true); return; }

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
    const meal = {
      id: Date.now(),
      name: mealName,
      foodCode: code,
      foodName: name,
      calories: kcal,
      grams,
      date,
      category,
      notes: '',
      timestamp: new Date().toISOString(),
      nutrients: compo
    };

    meals.push(meal);
    addToFavorites(code, name);
    addToPendingSync({ type: 'add', meal });
    saveMeals();
    showNotification(`✅ ${mealName} ajouté (${kcal} kcal)`);
    foodInput.value = '';
    sugg.innerHTML = '';
    selectedIndex = -1;
  }

  function updateSelection() {
    const items = sugg.querySelectorAll('.suggestion-item');
    items.forEach((item, i) => item.classList.toggle('selected', i === selectedIndex));
    if (selectedIndex >= 0 && items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function showFavoritesAndRecent() {
    const recent = getRecentFoods();
    const favs = favorites.slice(0, 5);
    const userRecipes = recipes.slice(0, 5);

    let html = '';
    if (userRecipes.length > 0) {
      html += '<div class="suggestion-section"><strong>📖 Recettes</strong></div>';
      html += userRecipes.map(r => {
        const nutrients = getRecipeNutrients(r);
        return `<button class="suggestion-item suggestion-recipe" data-recipe-id="${r.id}" data-name="${escapeHtml(r.name)}">📖 ${escapeHtml(r.name)} <small class="muted">(${Math.round(nutrients.calories)} kcal)</small></button>`;
      }).join('');
    }
    if (favs.length > 0) {
      html += '<div class="suggestion-section"><strong>⭐ Favoris</strong></div>';
      html += favs.map(f => `<button class="suggestion-item" data-code="${f.code}" data-name="${escapeHtml(f.name)}">⭐ ${escapeHtml(f.name)}</button>`).join('');
    }
    if (recent.length > 0) {
      html += '<div class="suggestion-section"><strong>🕒 Récents</strong></div>';
      html += recent.map(r => `<button class="suggestion-item" data-code="${r.code}" data-name="${escapeHtml(r.name)}">🕒 ${escapeHtml(r.name)}</button>`).join('');
    }

    if (html) {
      sugg.innerHTML = html;
      attachSuggestionHandlers();
    }
  }

  function attachSuggestionHandlers() {
    Array.from(sugg.querySelectorAll('.suggestion-item')).forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.recipeId) {
          // It's a recipe
          addRecipeAsMeal(parseInt(btn.dataset.recipeId));
          foodInput.value = '';
          sugg.innerHTML = '';
          selectedIndex = -1;
        } else {
          // It's a food
          addMeal(btn.dataset.code, btn.dataset.name);
        }
      });
    });
  }

  if (foodInput && sugg) {
    const doSearch = debounce(async (q) => {
      if (!q) {
        showFavoritesAndRecent();
        selectedIndex = -1;
        return;
      }

      const list = await loadCiqualIndex();
      if (!list) {
        sugg.innerHTML = '<div class="suggestion-error">Données non disponibles.</div>';
        return;
      }

      // Fuzzy search with scoring - foods
      const scoredFoods = list.map(i => ({ ...i, score: fuzzyMatch(i.name, q), type: 'food' }))
        .filter(i => i.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // Also search recipes
      const scoredRecipes = recipes.map(r => ({
        ...r,
        code: 'recipe-' + r.id,
        score: fuzzyMatch(r.name, q),
        type: 'recipe'
      }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // Combine: recipes first (with bonus score), then foods
      const combined = [...scoredRecipes.map(r => ({ ...r, score: r.score + 500 })), ...scoredFoods]
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);

      sugg.innerHTML = combined.map(r => {
        if (r.type === 'recipe') {
          const nutrients = getRecipeNutrients(r);
          return `<button class="suggestion-item suggestion-recipe" data-recipe-id="${r.id}" data-name="${escapeHtml(r.name)}">📖 ${escapeHtml(r.name)} <small class="muted">(${Math.round(nutrients.calories)} kcal)</small></button>`;
        }
        return `<button class="suggestion-item" data-code="${r.code}" data-name="${escapeHtml(r.name)}">${escapeHtml(r.name)} <small class="muted">(${r.code})</small></button>`;
      }).join('');
      selectedIndex = -1;
      attachSuggestionHandlers();
    }, 200);

    foodInput.addEventListener('focus', () => {
      if (!foodInput.value) showFavoritesAndRecent();
    });

    foodInput.addEventListener('input', (e) => {
      doSearch(e.target.value.trim().toLowerCase());
    });

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
        if (btn.dataset.recipeId) {
          addRecipeAsMeal(parseInt(btn.dataset.recipeId));
          foodInput.value = '';
          sugg.innerHTML = '';
          selectedIndex = -1;
        } else {
          addMeal(btn.dataset.code, btn.dataset.name);
        }
      } else if (e.key === 'Escape') {
        sugg.innerHTML = '';
        selectedIndex = -1;
      }
    });
  }

  // Clear all
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('Supprimer tous les repas ?')) {
      meals = [];
      saveMeals();
      showNotification('Tous les repas effacés');
    }
  });

  // Render recipes list
  renderRecipesList();

  // Initial render
  render();
});
