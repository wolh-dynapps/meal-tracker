// Worker to fetch and search the large Ciqual compo XML without blocking the main thread
let compoText = null;
const cache = Object.create(null);

async function fetchCompo(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to fetch compo');
  compoText = await r.text();
}

function parseCompoBlock(block) {
  const result = {};
  const re = /<const_code>\s*(\d+)\s*<\/const_code>[\s\S]*?<valeur>\s*([\d.,eE+-]+)\s*<\/valeur>/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const code = m[1];
    const raw = m[2].replace(',', '.');
    const val = parseFloat(raw);
    if (!isNaN(val)) result[code] = (result[code] || 0) + val;
  }
  return result;
}

self.addEventListener('message', async (ev) => {
  const msg = ev.data;
  if (msg && msg.type === 'init') {
    try {
      await fetchCompo(msg.url);
      self.postMessage({ type: 'ready' });
    } catch (e) {
      self.postMessage({ type: 'error', error: String(e) });
    }
    return;
  }

  if (msg && msg.type === 'get' && msg.code) {
    const code = String(msg.code).trim();
    if (cache[code]) {
      self.postMessage({ type: 'result', code, result: cache[code] });
      return;
    }
    if (!compoText) {
      self.postMessage({ type: 'error', error: 'compo not loaded' });
      return;
    }

    // Scan compoText for COMPO blocks and find matching alim_code
    const results = {};
    const text = compoText;
    let idx = 0;
    const reOpen = /<COMPO[\s\S]*?>/g; // unused but kept for clarity
    while (true) {
      const start = text.indexOf('<COMPO', idx);
      if (start === -1) break;
      const end = text.indexOf('</COMPO>', start);
      if (end === -1) break;
      const block = text.substring(start, end + 8);
      const alimMatch = block.match(/<alim_code>\s*(\d+)\s*<\/alim_code>/);
      if (alimMatch && String(alimMatch[1]).trim() === code) {
        const parsed = parseCompoBlock(block);
        // merge parsed values
        Object.keys(parsed).forEach(k => { results[k] = (results[k] || 0) + parsed[k]; });
      }
      idx = end + 8;
    }

    cache[code] = results;
    self.postMessage({ type: 'result', code, result: results });
  }
});
