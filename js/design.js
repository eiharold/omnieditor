// Aba "Estilos": monta um design system a partir do que a página REALMENTE usa.
// Varre todas as fontes de CSS (arquivos externos, <style> da página, CSS
// personalizado) e os style inline dos elementos, agrupa cores e famílias de
// fonte, e permite trocá-las globalmente.
//
// A troca não gera regra de override: reescreve o valor no lugar de origem, por
// offset exato de cada ocorrência. Assim a página continua limpa e o resultado é
// idêntico ao que um humano faria editando o CSS na mão.

import { el, toast } from './utils.js';
import { checkpoint, markDirty } from './state.js';
import * as canvas from './canvas.js';
import { getSources, applySourceText, parseCss } from './selectors.js';
import { t } from './i18n.js';

let onChanged = null;

export function initDesign({ onChanged: cb } = {}) {
  onChanged = cb;
}

// ============================================================
// Cores: reconhecimento e normalização
// ============================================================
const NAMED = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff',
  yellow: '#ffff00', orange: '#ffa500', purple: '#800080', gray: '#808080', grey: '#808080',
  silver: '#c0c0c0', maroon: '#800000', olive: '#808000', lime: '#00ff00', aqua: '#00ffff',
  cyan: '#00ffff', teal: '#008080', navy: '#000080', fuchsia: '#ff00ff', magenta: '#ff00ff',
  pink: '#ffc0cb', brown: '#a52a2a', gold: '#ffd700', beige: '#f5f5dc', ivory: '#fffff0',
  indigo: '#4b0082', violet: '#ee82ee', khaki: '#f0e68c', crimson: '#dc143c', salmon: '#fa8072',
  tomato: '#ff6347', orchid: '#da70d6', plum: '#dda0dd', turquoise: '#40e0d0', coral: '#ff7f50',
};

// Um token de cor: #hex, rgb()/rgba(), hsl()/hsla() ou nome conhecido.
const COLOR_RE = new RegExp(
  '#[0-9a-f]{3,8}\\b'
  + '|\\brgba?\\(\\s*[^()]*\\)'
  + '|\\bhsla?\\(\\s*[^()]*\\)'
  + '|\\b(?:' + Object.keys(NAMED).join('|') + ')\\b',
  'gi'
);

// Converte um token para "#rrggbb" + alfa, usado só como chave de agrupamento.
// Cai fora (null) no que não der para resolver com segurança — var(), currentColor…
function normalizeColor(tokenRaw) {
  const token = tokenRaw.trim().toLowerCase();

  if (NAMED[token]) return { hex: NAMED[token], alpha: 1 };

  if (token[0] === '#') {
    const h = token.slice(1);
    const ex = c => c + c;
    if (h.length === 3) return { hex: '#' + [...h].map(ex).join(''), alpha: 1 };
    if (h.length === 4) return { hex: '#' + [...h.slice(0, 3)].map(ex).join(''), alpha: parseInt(ex(h[3]), 16) / 255 };
    if (h.length === 6) return { hex: '#' + h, alpha: 1 };
    if (h.length === 8) return { hex: '#' + h.slice(0, 6), alpha: parseInt(h.slice(6), 16) / 255 };
    return null;
  }

  const fn = token.match(/^(rgba?|hsla?)\(([^()]*)\)$/);
  if (!fn) return null;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const alpha = parts[3] != null ? parseAlpha(parts[3]) : 1;

  if (fn[1].startsWith('rgb')) {
    const [r, g, b] = parts.slice(0, 3).map(p =>
      p.endsWith('%') ? Math.round(parseFloat(p) * 2.55) : parseInt(p, 10));
    if ([r, g, b].some(Number.isNaN)) return null;
    return { hex: rgbToHex(r, g, b), alpha };
  }

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  if ([h, s, l].some(Number.isNaN)) return null;
  return { hex: rgbToHex(...hslToRgb(h, s, l)), alpha };
}

function parseAlpha(a) {
  const v = a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
  return Number.isNaN(v) ? 1 : Math.min(1, Math.max(0, v));
}

const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('');

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = tc => {
    if (tc < 0) tc += 1;
    if (tc > 1) tc -= 1;
    if (tc < 1 / 6) return p + (q - p) * 6 * tc;
    if (tc < 1 / 2) return q;
    if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map(v => Math.round(v * 255));
}

// Reescreve um token mantendo o formato original quando há transparência:
// rgba(...) continua rgba(...), #rrggbbaa continua com alfa.
function recolorToken(oldToken, newHex, alpha) {
  if (alpha >= 1) return newHex;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(newHex.slice(i, i + 2), 16));
  if (/^#/.test(oldToken.trim())) {
    return newHex + Math.round(alpha * 255).toString(16).padStart(2, '0');
  }
  return `rgba(${r}, ${g}, ${b}, ${+alpha.toFixed(3)})`;
}

// ============================================================
// Varredura
// ============================================================
// Propriedades cujo valor NÃO deve virar cor do design system.
const SKIP_PROPS = /^(content|background-image|src|font-feature-settings|grid-template|counter)/;

// Quebra o corpo de uma regra em declarações, com offsets relativos ao corpo.
function splitDecls(body) {
  const out = [];
  let i = 0, start = 0, depth = 0;
  const push = end => {
    const raw = body.slice(start, end);
    const c = raw.indexOf(':');
    if (c > 0) {
      const prop = raw.slice(0, c).trim().toLowerCase();
      // offset do valor dentro do corpo
      const vStart = start + c + 1;
      out.push({ prop, value: body.slice(vStart, end), vStart });
    }
    start = end + 1;
  };
  while (i < body.length) {
    const ch = body[i];
    if (body.startsWith('/*', i)) { const e = body.indexOf('*/', i + 2); i = e === -1 ? body.length : e + 2; continue; }
    if (ch === '"' || ch === "'") { const q = ch; i++; while (i < body.length && body[i] !== q) i += body[i] === '\\' ? 2 : 1; i++; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ';' && depth === 0) { push(i); }
    else if (ch === '{' || ch === '}') { start = i + 1; }  // aninhamento (@keyframes): ignora
    i++;
  }
  if (start < body.length) push(body.length);
  return out;
}

// Percorre todas as declarações de um texto CSS, com offsets absolutos.
function eachDecl(text, fn) {
  for (const rule of parseCss(text)) {
    const bodyStart = rule.blockStart + 1;
    const body = text.slice(bodyStart, rule.blockEnd);
    for (const d of splitDecls(body)) fn(d.prop, d.value, bodyStart + d.vStart);
  }
}

// Coleta cores e fontes de todas as fontes de CSS + style inline.
// Cada item guarda as ocorrências (alvo + offset) para reescrita cirúrgica.
export function scanPage() {
  const doc = canvas.getDoc();
  if (!doc) return { colors: [], fonts: [] };

  const colors = new Map();   // hex|alpha → item
  const fonts = new Map();    // stack normalizado → item

  const collect = (target, prop, value, valueStart) => {
    if (SKIP_PROPS.test(prop)) return;

    if (prop === 'font-family') {
      const stack = value.trim().replace(/\s+/g, ' ');
      if (!stack || /^(inherit|initial|unset|revert)$/i.test(stack) || stack.includes('var(')) return;
      const key = stack.toLowerCase();
      const item = fonts.get(key) || { key, stack, occs: [] };
      item.occs.push({ ...target, start: valueStart + (value.length - value.trimStart().length), len: stack.length });
      fonts.set(key, item);
      return;
    }

    // qualquer outra propriedade pode conter cor (border, box-shadow, gradiente…)
    for (const m of value.matchAll(COLOR_RE)) {
      // não mexe em cor dentro de url(...)
      const before = value.slice(0, m.index);
      if ((before.match(/url\(/g) || []).length > (before.match(/\)/g) || []).length) continue;
      const norm = normalizeColor(m[0]);
      if (!norm) continue;
      const key = norm.hex + '|' + norm.alpha.toFixed(3);
      const item = colors.get(key) || { key, hex: norm.hex, alpha: norm.alpha, occs: [] };
      item.occs.push({ ...target, start: valueStart + m.index, len: m[0].length, token: m[0] });
      colors.set(key, item);
    }
  };

  for (const source of getSources()) {
    if (!source.text) continue;
    eachDecl(source.text, (prop, value, at) =>
      collect({ kind: 'source', sourceId: source.id }, prop, value, at));
  }

  for (const node of doc.querySelectorAll('[style]')) {
    if (node.hasAttribute('data-omni-editor')) continue;
    const css = node.getAttribute('style');
    for (const d of splitDecls(css)) collect({ kind: 'inline', node }, d.prop, d.value, d.vStart);
  }

  const byUse = (a, b) => b.occs.length - a.occs.length;
  return {
    colors: [...colors.values()].sort(byUse),
    fonts: [...fonts.values()].sort(byUse),
  };
}

// ============================================================
// Aplicação global
// ============================================================
// Reescreve todas as ocorrências de um item. `replacer(occ)` devolve o novo texto.
async function replaceOccurrences(occs, replacer) {
  const sources = getSources();
  const bySource = new Map();
  const byNode = new Map();

  for (const occ of occs) {
    const bucket = occ.kind === 'source' ? bySource : byNode;
    const k = occ.kind === 'source' ? occ.sourceId : occ.node;
    if (!bucket.has(k)) bucket.set(k, []);
    bucket.get(k).push(occ);
  }

  // Substitui de trás para frente: os offsets anteriores continuam válidos.
  const splice = (text, list) => {
    let out = text;
    for (const occ of [...list].sort((a, b) => b.start - a.start)) {
      out = out.slice(0, occ.start) + replacer(occ) + out.slice(occ.start + occ.len);
    }
    return out;
  };

  for (const [sourceId, list] of bySource) {
    const source = sources.find(s => s.id === sourceId);
    if (!source) continue;
    await applySourceText(source, splice(source.text, list));
  }
  for (const [node, list] of byNode) {
    node.setAttribute('style', splice(node.getAttribute('style') || '', list));
  }
  markDirty();
  onChanged?.();
}

export async function applyColor(item, newHex) {
  checkpoint('design:color:' + item.key);
  await replaceOccurrences(item.occs, occ => recolorToken(occ.token, newHex, item.alpha));
  toast(t('{0} ocorrências atualizadas', item.occs.length), 'ok');
}

export async function applyFont(item, newStack) {
  checkpoint('design:font:' + item.key);
  await replaceOccurrences(item.occs, () => newStack);
  toast(t('{0} ocorrências atualizadas', item.occs.length), 'ok');
}

// ============================================================
// UI
// ============================================================
const FONT_PRESETS = [
  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  'Inter, system-ui, sans-serif',
  'Georgia, "Times New Roman", serif',
  '"Helvetica Neue", Helvetica, Arial, sans-serif',
  'Menlo, Consolas, "Courier New", monospace',
];

export function renderStylesTab(container) {
  container.innerHTML = '';
  if (!canvas.getDoc()) {
    container.appendChild(el('p', { class: 'doc-hint' }, [t('Abra uma página primeiro')]));
    return;
  }

  const { colors, fonts } = scanPage();

  container.appendChild(el('p', { class: 'doc-hint' }, [
    t('Cores e fontes detectadas na página. Alterar aqui reescreve todas as ocorrências no CSS de origem.'),
  ]));

  // ---- Fontes ----
  const fontSec = el('div', { class: 'ds-section' });
  fontSec.appendChild(el('h4', { class: 'ds-title' }, [
    t('Fontes'), el('span', { class: 'ds-count' }, [String(fonts.length)]),
  ]));
  if (!fonts.length) {
    fontSec.appendChild(el('p', { class: 'doc-hint' }, [t('Nenhuma família de fonte declarada no CSS da página.')]));
  } else {
    for (const item of fonts) fontSec.appendChild(fontCard(item, container));
  }
  container.appendChild(fontSec);

  // ---- Cores ----
  const colorSec = el('div', { class: 'ds-section' });
  colorSec.appendChild(el('h4', { class: 'ds-title' }, [
    t('Cores'), el('span', { class: 'ds-count' }, [String(colors.length)]),
  ]));
  if (!colors.length) {
    colorSec.appendChild(el('p', { class: 'doc-hint' }, [t('Nenhuma cor encontrada no CSS da página.')]));
  } else {
    const grid = el('div', { class: 'ds-grid' });
    for (const item of colors) grid.appendChild(colorCard(item, container));
    colorSec.appendChild(grid);
  }
  container.appendChild(colorSec);
}

function usageLabel(n) {
  return n === 1 ? t('1 uso') : t('{0} usos', n);
}

function colorCard(item, container) {
  const swatch = el('button', { class: 'ds-swatch', type: 'button', title: t('Alterar cor') });
  swatch.style.setProperty('--c', item.hex);
  if (item.alpha < 1) swatch.classList.add('has-alpha');

  const picker = el('input', { type: 'color', value: item.hex, class: 'ds-picker' });
  swatch.appendChild(picker);
  swatch.addEventListener('click', () => picker.click());

  const label = item.hex + (item.alpha < 1 ? ` · ${Math.round(item.alpha * 100)}%` : '');
  const card = el('div', { class: 'ds-card' }, [
    swatch,
    el('div', { class: 'ds-info' }, [
      el('code', { class: 'ds-value' }, [label]),
      el('span', { class: 'ds-uses' }, [usageLabel(item.occs.length)]),
    ]),
  ]);

  picker.addEventListener('change', async () => {
    if (picker.value.toLowerCase() === item.hex.toLowerCase()) return;
    await applyColor(item, picker.value.toLowerCase());
    renderStylesTab(container);   // offsets mudaram: revarre
  });
  return card;
}

function fontCard(item, container) {
  const input = el('input', { type: 'text', class: 'ctl-input ds-font-input', value: item.stack });
  input.setAttribute('list', 'dsFontPresets');

  const preview = el('div', { class: 'ds-font-preview', title: item.stack }, ['Aa']);
  preview.style.fontFamily = item.stack;

  const row = el('div', { class: 'ds-font' }, [
    preview,
    el('div', { class: 'ds-font-body' }, [
      el('span', { class: 'ds-uses' }, [usageLabel(item.occs.length)]),
      input,
    ]),
  ]);

  const commit = async () => {
    const v = input.value.trim();
    if (!v || v === item.stack) { input.value = item.stack; return; }
    await applyFont(item, v);
    renderStylesTab(container);
  };
  input.addEventListener('change', commit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });

  if (!document.getElementById('dsFontPresets')) {
    const dl = el('datalist', { id: 'dsFontPresets' });
    for (const f of FONT_PRESETS) dl.appendChild(el('option', { value: f }));
    document.body.appendChild(dl);
  }
  return row;
}
