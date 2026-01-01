#!/usr/bin/env python3
"""
Scan `compo_*.xml` and populate `ciqual_index.json` with selected nutrients.
Merges multiple COMPO blocks per `alim_code`, prefers numeric values when available.
Converts const_code 327 (kJ/100g) to kcal/100g if 328 is missing.
"""
import os, re, json
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(__file__))
CIQUAL_DIR = os.path.join(ROOT, 'scripts', 'ciqual')
PUBLIC_CIQUAL_DIR = os.path.join(ROOT, 'docs', 'ciqual')
COMPO_FILE = os.path.join(CIQUAL_DIR, 'compo_2025_11_03.xml')
ALIM_FILE = os.path.join(CIQUAL_DIR, 'alim_2025_11_03.xml')
OUT_FILE = os.path.join(PUBLIC_CIQUAL_DIR, 'ciqual_index.json')

SELECT_CODES = {
    '328': 'energy_kcal',
    '327': 'energy_kj',
    '25000': 'protein_g',
    '40000': 'fat_g',
    '31000': 'carbs_g',
    '32000': 'sugars_g',
    '34100': 'fiber_g',
    '10110': 'sodium_mg'
}

def load_alim_names(path):
    names = {}
    if not os.path.exists(path):
        return names
    for event, elem in ET.iterparse(path, events=('end',)):
        if elem.tag == 'ALIM':
            code_el = elem.find('alim_code')
            name_el = elem.find('alim_nom_fr')
            if code_el is not None and code_el.text:
                code = code_el.text.strip()
                name = name_el.text.strip() if name_el is not None and name_el.text else ''
                names[code] = name
            elem.clear()
    return names


def build_index(alim_names):
    results = {}
    if not os.path.exists(COMPO_FILE):
        return results

    with open(COMPO_FILE, 'r', encoding='utf-8', errors='ignore') as fh:
        in_block = False
        block_lines = []
        for line in fh:
            if '<COMPO' in line:
                in_block = True
                block_lines = [line]
                continue
            if in_block:
                block_lines.append(line)
                if '</COMPO>' in line:
                    block = ''.join(block_lines)
                    m = re.search(r'<alim_code>\s*(\d+)\s*</alim_code>', block)
                    if not m:
                        in_block = False
                        continue
                    alim = m.group(1).strip()

                    # find all const_code and following teneur values via regex (fast)
                    consts = re.findall(r'<const_code>\s*(\d+)\s*</const_code>', block)
                    teneurs = re.findall(r'<teneur>\s*([\d.,eE+-]+)\s*</teneur>', block)
                    # pair by index
                    for i in range(min(len(consts), len(teneurs))):
                        c = consts[i]
                        vtxt = teneurs[i]
                        try:
                            v = float(vtxt.replace(',', '.'))
                        except Exception:
                            continue
                        key = SELECT_CODES.get(c)
                        if not key:
                            continue
                        if alim not in results:
                            results[alim] = {'name': alim_names.get(alim, ''), 'code': alim}
                        # don't overwrite existing non-null values
                        if results[alim].get(key) is None:
                            results[alim][key] = v

                    in_block = False

    # post-process conversions and ensure canonical keys
    for alim, obj in list(results.items()):
        # convert kJ -> kcal if needed
        if obj.get('energy_kcal') is None and obj.get('energy_kj') is not None:
            try:
                obj['energy_kcal'] = round(obj['energy_kj'] / 4.184, 2)
            except Exception:
                obj['energy_kcal'] = None
        # ensure all keys present
        for key in ('energy_kcal', 'protein_g', 'fat_g', 'carbs_g', 'sugars_g', 'fiber_g', 'sodium_mg'):
            if key not in obj:
                obj[key] = None

    return results


def main():
    alim_names = load_alim_names(ALIM_FILE)
    idx = build_index(alim_names)
    os.makedirs(CIQUAL_DIR, exist_ok=True)
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)
    print('Wrote', OUT_FILE, 'with', len(idx), 'entries')


if __name__ == '__main__':
    main()
