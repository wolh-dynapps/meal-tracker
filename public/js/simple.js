// Copied from root simple.js (adjusted for PWA public path)
// ========== STOCKAGE ==========
const STORAGE_KEY = 'meals';
let meals = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

// Ciqual data caches
let ciqualAlim = null; // [{code, name}]
let ciqualConst = null; // { const_code: {name_fr, name_eng, infoods} }
let ciqualCompoText = null; // raw compo XML text (lazy-loaded)
const DEFAULT_GRAMS = 100;
// Web Worker for compo parsing (to avoid blocking UI)
let compoWorker = null;
let compoWorkerReady = false;
const pendingWorker = new Map();

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

function tryFetchText(url) {
  return fetch(url).then(r => {
    if (!r.ok) throw new Error('Not found');
    return r.text();
  });
}

async function loadCiqualIndex() {
  if (ciqualAlim) return ciqualAlim;
  // Try a prebuilt short JSON index for fast lookups
  try {
    const resp = await fetch('/ciqual/ciqual_index.json');
    if (resp.ok) {
      const short = await resp.json();
      // short is map code -> {name, code, energy_kcal, ...}
      ciqualAlim = Object.keys(short).map(k => ({ code: k, name: short[k].name || '' }));
      // attach a quick lookup map
      window.__ciqual_short = short;
      return ciqualAlim;
    }
  } catch (e) {
    // ignore, fallback to xml parsing
  }
  // try multiple locations (served root or inside public)
  const alimPaths = ['/ciqual/alim_2025_11_03.xml', '/public/ciqual/alim_2025_11_03.xml'];
  const constPaths = ['/ciqual/const_2025_11_03.xml', '/public/ciqual/const_2025_11_03.xml'];
  let alimText = null;
  for (const p of alimPaths) {
    try { alimText = await tryFetchText(p); break; } catch(e) { /* try next */ }
  }
  if (!alimText) {
    return null;
  }
  // parse ALIM list
  const parser = new DOMParser();
  const doc = parser.parseFromString(alimText, 'application/xml');
  const nodes = Array.from(doc.getElementsByTagName('ALIM'));
  ciqualAlim = nodes.map(n => {
    const code = (n.getElementsByTagName('alim_code')[0] || {}).textContent || '';
    const name = (n.getElementsByTagName('alim_nom_fr')[0] || {}).textContent || '';
    return { code: code.trim(), name: name.trim() };
  });

  // load const mapping
  let constText = null;
  for (const p of constPaths) {
    try { constText = await tryFetchText(p); break; } catch(e) { /* next */ }
  }
  if (constText) {
    const docc = parser.parseFromString(constText, 'application/xml');
    const cNodes = Array.from(docc.getElementsByTagName('CONST'));
    ciqualConst = {};
    cNodes.forEach(cn => {
      const code = (cn.getElementsByTagName('const_code')[0] || {}).textContent || '';
      const name_fr = (cn.getElementsByTagName('const_nom_fr')[0] || {}).textContent || '';
      const name_eng = (cn.getElementsByTagName('const_nom_eng')[0] || {}).textContent || '';
      const infoods = (cn.getElementsByTagName('code_INFOODS')[0] || {}).textContent || '';
      ciqualConst[code.trim()] = { name_fr: name_fr.trim(), name_eng: name_eng.trim(), infoods: infoods.trim() };
    });
  }

  return ciqualAlim;
}

async function ensureCompoText() {
  if (ciqualCompoText) return ciqualCompoText;
  const paths = ['/ciqual/compo_2025_11_03.xml', '/public/ciqual/compo_2025_11_03.xml'];
  for (const p of paths) {
    try { ciqualCompoText = await tryFetchText(p); break; } catch(e) { /* next */ }
  }
  // initialize worker if available
  if (typeof Worker !== 'undefined' && ciqualCompoText) {
    try {
      compoWorker = new Worker('/js/compoWorker.js');
      compoWorker.addEventListener('message', (ev) => {
        const m = ev.data || {};
        if (m.type === 'ready') { compoWorkerReady = true; }
        if (m.type === 'result' && m.code) {
          const key = String(m.code);
          const resolver = pendingWorker.get(key);
          if (resolver) { resolver(m.result); pendingWorker.delete(key); }
        }
        if (m.type === 'error') {
          console.warn('compoWorker error:', m.error);
        }
      });
      // reflect worker readiness in UI
      compoWorker.addEventListener('message', (ev) => {
        const m = ev.data || {};
        const statusEl = document.getElementById('preloadStatus');
        if (m.type === 'ready' && statusEl) {
          statusEl.textContent = 'Données prêtes';
          statusEl.classList.add('ready');
          setTimeout(() => statusEl.classList.add('hidden'), 2500);
        }
        if (m.type === 'error' && statusEl) {
          statusEl.textContent = 'Préchargement échoué';
        }
      });
      // send the compo text to the worker by initializing it with the URL so it fetches itself (avoid sending huge string)
      // worker will fetch from the same path; find which path exists
      for (const p of paths) {
        try {
          // test existence
          await fetch(p, { method: 'HEAD' });
          compoWorker.postMessage({ type: 'init', url: p });
          break;
        } catch (e) { /* next */ }
      }
    } catch (e) {
      console.warn('Worker init failed', e);
    }
  }
  return ciqualCompoText;
}

// Given an alim_code, parse compo XML text and return a map of const_code -> value (as number per 100g)
async function getCompositionFor(alimCode) {
  // Prefer worker-based lookup to avoid blocking UI
  await ensureCompoText();
  if (compoWorker && compoWorkerReady) {
    return new Promise((resolve) => {
      const key = String(alimCode);
      pendingWorker.set(key, resolve);
      compoWorker.postMessage({ type: 'get', code: key });
      // safety timeout
      setTimeout(() => {
        if (pendingWorker.has(key)) { pendingWorker.delete(key); resolve({}); }
      }, 8000);
    });
  }

  // Fallback to previous synchronous method (may be slow)
  const text = ciqualCompoText;
  if (!text) return null;
  const reBlock = new RegExp('<COMPO>[\\s\\S]*?<alim_code>\\s*' + alimCode + '\\s*<\\/alim_code>[\\s\\S]*?<\\/COMPO>', 'g');
  const matches = text.match(reBlock);
  if (!matches) return {};
  const result = {};
  const reConst = /<const_code>\s*(\d+)\s*<\/const_code>[\s\S]*?<valeur>\s*([\d.,eE+-]+)\s*<\/valeur>/g;
  matches.forEach(block => {
    let m;
    while ((m = reConst.exec(block)) !== null) {
      const code = m[1];
      const raw = m[2].replace(',', '.');
      const val = parseFloat(raw);
      if (!isNaN(val)) {
        result[code] = (result[code] || 0) + val;
      }
    }
  });
  return result;
}

// ========== AFFICHAGE ==========
function render() {
  const today = getTodayDate();
  const todayMeals = meals.filter(m => m.date === today);
  const todayCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);

  document.getElementById('todayCalories').textContent = todayCalories;
  document.getElementById('todayMeals').textContent = todayMeals.length;
  document.getElementById('totalMeals').textContent = meals.length;

  document.getElementById('clearBtn').style.display = meals.length > 0 ? 'block' : 'none';

  const listContainer = document.getElementById('mealsList');
  const sorted = [...meals].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sorted.length === 0) {
    listContainer.innerHTML = '<div class="empty-state"><p>Aucun repas pour le moment</p></div>';
    return;
  }

  listContainer.innerHTML = sorted.map(meal => `
    <div class="meal-item">
      <div class="meal-info">
        <h3>${meal.name}</h3>
        <div class="meal-details">
          <span>${formatDate(meal.date)}</span>
          <span class="meal-category">${meal.category}</span>
          <span class="meal-calories">${meal.calories} kcal</span>
          ${meal.notes ? `<span style="color: #9aa0a6; font-style: italic;">« ${meal.notes} »</span>` : ''}
        </div>
        ${meal.nutrients ? `<div style="margin-top:8px;"><button class="btn-nutrients" onclick="toggleNutrients(${meal.id})">Voir nutriments</button></div>
        <div id="nutrients-${meal.id}" class="nutrient-list" style="display:none; margin-top:8px;"></div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="btn-delete" onclick="deleteMeal(${meal.id})">🗑️ Supprimer</button>
      </div>
    </div>
  `).join('');

  // populate nutrient lists
  sorted.forEach(meal => {
    if (meal.nutrients) {
      const el = document.getElementById(`nutrients-${meal.id}`);
      if (!el) return;
      const entries = Object.entries(meal.nutrients || {});
      if (entries.length === 0) { el.innerHTML = '<div class="muted">Aucune donnée nutritionnelle</div>'; return; }
      const rows = entries.slice(0, 50).map(([code, val]) => {
        const key = String(code);
        // friendly meta: prefer our small map, else use ciqual const names, else raw code
        const meta = NUTRIENT_META[key] ? NUTRIENT_META[key].label : (ciqualConst && ciqualConst[key] ? (ciqualConst[key].name_fr || ciqualConst[key].name_eng) : key);
        const unit = NUTRIENT_META[key] ? NUTRIENT_META[key].unit : '';
        const perPortion = ((val * (meal.grams || DEFAULT_GRAMS)) / 100);
        const display = Number.isFinite(perPortion) ? Math.round(perPortion * 100) / 100 : val;
        const unitDisplay = unit ? ` ${unit}` : '';
        return `<div class="nutrient-row"><strong>${meta}:</strong> ${display}${unitDisplay}</div>`;
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

// ========== INITIALISATION (Attendre le DOM) ==========
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mealDate').valueAsDate = new Date();

  // Preload Ciqual data and initialize compo worker so lookups are fast
  (async () => {
    const statusEl = document.getElementById('preloadStatus');
    try {
      if (statusEl) statusEl.textContent = 'Préchargement — index…';
      const idx = await loadCiqualIndex();
      if (idx && idx.length) {
        if (statusEl) statusEl.textContent = `Préchargement — index (${idx.length})`;
      }
      if (statusEl) statusEl.textContent = 'Préchargement — composition…';
      const compo = await ensureCompoText();
      // worker will post ready; but if no worker, mark ready now
      if (compo && (!compoWorker || compoWorkerReady)) {
        if (statusEl) { statusEl.textContent = 'Données prêtes'; statusEl.classList.add('ready'); setTimeout(()=>statusEl.classList.add('hidden'), 2500); }
      } else {
        // worker will set ready when ready
      }
    } catch (e) {
      if (statusEl) { statusEl.textContent = 'Préchargement échoué'; statusEl.classList.add('ready'); }
      console.warn('Ciqual preload failed:', e);
    }
  })();

  // Manual add form removed: use Ciqual search and click to add meals.

  // --- Ciqual search UI ---
  const foodInput = document.getElementById('foodSearch');
  const sugg = document.getElementById('foodSuggestions');
  if (foodInput && sugg) {
    foodInput.addEventListener('input', async (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) { sugg.innerHTML = ''; return; }
      const list = await loadCiqualIndex();
      if (!list) {
        sugg.innerHTML = '<div class="suggestion-error">Ciqual files not found. Place `ciqual/` under server root or `public/ciqual/`.</div>';
        return;
      }
      const results = list.filter(i => i.name.toLowerCase().includes(q)).slice(0, 12);
      sugg.innerHTML = results.map(r => `<button class="suggestion-item" data-code="${r.code}">${r.name} <small class="muted">(${r.code})</small></button>`).join('');

      // attach handlers
      Array.from(sugg.querySelectorAll('.suggestion-item')).forEach(btn => {
        btn.addEventListener('click', async () => {
          const code = btn.getAttribute('data-code');
          const name = btn.textContent.trim();
          const gramsInput = document.getElementById('foodGrams');
          const grams = (gramsInput && parseFloat(String(gramsInput.value).replace(',', '.'))) || DEFAULT_GRAMS;
          // Prefer short JSON index if available for immediate kcal calculation
          let compo = null;
          let kcal = 0;
          const short = window.__ciqual_short && window.__ciqual_short[code];
          if (short) {
            compo = {};
            // map short fields back to const-like keys where possible
            if (short.energy_kcal != null) { compo['328'] = Number(short.energy_kcal); kcal = Math.round((Number(short.energy_kcal) * grams) / 100); }
            if (short.protein_g != null) compo['25000'] = Number(short.protein_g);
            if (short.fat_g != null) compo['40000'] = Number(short.fat_g);
            if (short.carbs_g != null) compo['31000'] = Number(short.carbs_g);
            if (short.sugars_g != null) compo['32000'] = Number(short.sugars_g);
            if (short.fiber_g != null) compo['34100'] = Number(short.fiber_g);
            if (short.sodium_mg != null) compo['10110'] = Number(short.sodium_mg);
          } else {
            showNotification('Récupération des données nutritionnelles…');
            compo = await getCompositionFor(code);
            // compute calories: prefer const_code 328 (kcal/100g). Fallback to other energy codes only if 328 missing.
            let kcalPer100 = null;
            if (compo && typeof compo['328'] !== 'undefined') {
              kcalPer100 = Number(compo['328']);
            } else {
              const energyCodes = ['333','332','327'];
              for (const c of energyCodes) {
                if (compo && typeof compo[c] !== 'undefined') { kcalPer100 = Number(compo[c]); break; }
              }
            }
            kcal = Number.isFinite(kcalPer100) ? Math.round((kcalPer100 * grams) / 100) : 0;
          }
          const mealName = `${name} — ${grams} g`;
          const meal = { id: Date.now(), name: mealName, calories: kcal, grams, date: getTodayDate(), category: 'from-ciqual', notes: '', timestamp: new Date().toISOString(), nutrients: compo };
          meals.push(meal);
          saveMeals();
          showNotification(`✅ ${mealName} ajouté (${kcal} kcal)`);
          foodInput.value = '';
          sugg.innerHTML = '';
        });
      });
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
