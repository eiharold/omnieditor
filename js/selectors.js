// Painel de seletores CSS: lista todas as regras (classes, ids, elementos)
// de todos os stylesheets da página e permite editá-las visualmente ou no código.

import { $, el, debounce, toast, escHTML } from './utils.js';
import { state, checkpoint, markDirty } from './state.js';
import * as canvas from './canvas.js';
import { t } from './i18n.js';
import { askConfirm, askPrompt } from './dialogs.js';

let listRoot, searchInput;
let drawer, ruleSelectorEl, ruleMetaEl, ruleControlsEl, ruleCodeEl;
let filterMode = 'all';
let current = null;       // { sourceId, selector, media, occ, atomic }
let applyingFromCode = false;
let onCssChanged = null;  // callback do app (sincronizar textarea do CSS custom etc.)

// ============================================================
// Parser de CSS (texto → regras com offsets, preservando o resto do arquivo)
// ============================================================
export function parseCss(text) {
  const rules = [];
  const n = text.length;
  const ctx = [];
  let i = 0;

  const skipComment = j => {
    const e = text.indexOf('*/', j + 2);
    return e === -1 ? n : e + 2;
  };

  while (i < n) {
    if (text.startsWith('/*', i)) { i = skipComment(i); continue; }
    const ch = text[i];
    if (ch === '}') { ctx.pop(); i++; continue; }
    if (/\s/.test(ch)) { i++; continue; }

    // lê até '{' (regra) ou ';' (@import etc.)
    let j = i;
    while (j < n && text[j] !== '{' && text[j] !== ';') {
      if (text.startsWith('/*', j)) { j = skipComment(j); continue; }
      if (text[j] === '"' || text[j] === "'") {
        const q = text[j]; j++;
        while (j < n && text[j] !== q) j += text[j] === '\\' ? 2 : 1;
      }
      j++;
    }
    if (j >= n) break;
    if (text[j] === ';') { i = j + 1; continue; }

    const selector = text.slice(i, j).trim().replace(/\s+/g, ' ');

    // blocos condicionais: entra neles sem consumir o conteúdo
    if (/^@(media|supports|layer|container)/.test(selector)) {
      ctx.push(selector);
      i = j + 1;
      continue;
    }

    // encontra o fechamento do bloco (contando aninhamentos)
    let depth = 1, k = j + 1;
    while (k < n && depth > 0) {
      if (text.startsWith('/*', k)) { k = skipComment(k); continue; }
      if (text[k] === '"' || text[k] === "'") {
        const q = text[k]; k++;
        while (k < n && text[k] !== q) k += text[k] === '\\' ? 2 : 1;
        k++; continue;
      }
      if (text[k] === '{') depth++;
      else if (text[k] === '}') depth--;
      k++;
    }

    rules.push({
      selector,
      media: ctx.join(' · '),
      start: i,
      blockStart: j,
      blockEnd: k - 1,           // índice da chave de fechamento
      atomic: selector.startsWith('@'),  // @keyframes, @font-face…
    });
    i = k;
  }
  return rules;
}

// ============================================================
// Fontes de CSS (arquivos externos, <style> da página, CSS personalizado)
// ============================================================
export function getSources() {
  const doc = canvas.getDoc();
  if (!doc) return [];
  const sources = [];
  for (const [path, text] of Object.entries(canvas.getCssFiles())) {
    sources.push({ id: 'file:' + path, kind: 'file', label: path.split('/').pop(), path, text });
  }
  [...doc.querySelectorAll('style')]
    .filter(t => !t.hasAttribute('data-omni-editor') && !t.hasAttribute('data-omni-custom'))
    .forEach((t, idx) => {
      const orig = t.getAttribute('data-omni-orig-style');
      sources.push({
        id: 'style:' + idx, kind: 'style', label: `<style> da página${idx ? ' ' + (idx + 1) : ''}`,
        tag: t, text: orig ? decodeURIComponent(orig) : t.textContent,
      });
    });
  sources.push({ id: 'custom', kind: 'custom', label: 'CSS personalizado', text: canvas.getCustomCss() });
  return sources;
}

const getSourceById = id => getSources().find(s => s.id === id) || null;

export async function applySourceText(source, newText) {
  if (source.kind === 'file') {
    await canvas.updateCssFile(source.path, newText);
  } else if (source.kind === 'style') {
    if (source.tag.hasAttribute('data-omni-orig-style')) {
      source.tag.setAttribute('data-omni-orig-style', encodeURIComponent(newText));
      source.tag.textContent = await canvas.rewriteCssText(newText, state.filePath);
    } else {
      source.tag.textContent = newText;
    }
  } else {
    canvas.setCustomCss(newText);
  }
  markDirty();
  onCssChanged?.(source);
}

// ============================================================
// Painel (lista de regras)
// ============================================================
export function initSelectors({ onChanged } = {}) {
  onCssChanged = onChanged || null;
  listRoot = $('#selList');
  searchInput = $('#selSearch');
  drawer = $('#ruleDrawer');
  ruleSelectorEl = $('#ruleSelector');
  ruleMetaEl = $('#ruleMeta');
  ruleControlsEl = $('#ruleControls');
  ruleCodeEl = $('#ruleCode');

  searchInput.addEventListener('input', debounce(refreshSelectors, 150));
  $$chips().forEach(chip => chip.addEventListener('click', () => {
    $$chips().forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filterMode = chip.dataset.selfilter;
    refreshSelectors();
  }));

  $('#btnNewRule').addEventListener('click', newRule);
  $('#btnCloseRule').addEventListener('click', closeRuleDrawer);
  $('#btnDeleteRule').addEventListener('click', deleteCurrentRule);

  ruleCodeEl.addEventListener('input', debounce(() => {
    applyingFromCode = true;
    applyBlock(ruleCodeEl.value);
    applyingFromCode = false;
  }, 300));
}

const $$chips = () => [...document.querySelectorAll('#selectorsPanel .chip')];

function matchesFilter(rule) {
  const q = (searchInput.value || '').toLowerCase().trim();
  if (q && !rule.selector.toLowerCase().includes(q)) return false;
  if (filterMode === 'class') return rule.selector.includes('.');
  if (filterMode === 'id') return rule.selector.includes('#');
  return true;
}

export function refreshSelectors() {
  if (!listRoot) return;
  const panel = $('#selectorsPanel');
  if (!panel || !panel.classList.contains('active')) return;
  listRoot.innerHTML = '';
  const doc = canvas.getDoc();
  if (!doc) {
    listRoot.appendChild(el('div', { class: 'sel-empty', text: t('Abra uma página para listar os seletores.') }));
    return;
  }
  let total = 0;
  for (const source of getSources()) {
    const rules = parseCss(source.text).filter(matchesFilter);
    if (!rules.length) continue;
    total += rules.length;
    listRoot.appendChild(el('div', { class: 'sel-group-head' }, [
      el('span', { text: t(source.label) }),
      el('span', { class: 'sel-group-count', text: String(rules.length) }),
    ]));
    const seen = {};
    for (const rule of rules) {
      const key = rule.media + '|' + rule.selector;
      const occ = seen[key] = (seen[key] ?? -1) + 1;
      const row = el('button', { class: 'sel-row', title: rule.selector });
      row.appendChild(el('span', { class: 'sel-name', html: highlightSelector(rule.selector) }));
      if (rule.media) row.appendChild(el('span', { class: 'sel-media', text: shortMedia(rule.media) }));
      row.addEventListener('click', () => openRule(source.id, rule.selector, rule.media, occ, rule.atomic));
      listRoot.appendChild(row);
    }
  }
  if (!total) listRoot.appendChild(el('div', { class: 'sel-empty', text: t('Nenhuma regra encontrada.') }));
}

function highlightSelector(sel) {
  return escHTML(sel)
    .replace(/(\.[\w-]+)/g, '<b class="tk-class">$1</b>')
    .replace(/(#[\w-]+)/g, '<b class="tk-id">$1</b>');
}

function shortMedia(media) {
  const m = media.match(/\(([^)]+)\)/);
  return m ? `@ ${m[1].replace('max-width', '≤').replace('min-width', '≥').replace(/:\s*/, ' ')}` : '@';
}

// ============================================================
// Editor de regra (drawer)
// ============================================================
function findRule(source) {
  if (!source || !current) return null;
  const all = parseCss(source.text).filter(r => r.selector === current.selector && r.media === current.media);
  return all[current.occ] || null;
}

function openRule(sourceId, selector, media, occ, atomic) {
  current = { sourceId, selector, media, occ, atomic };
  const source = getSourceById(sourceId);
  const rule = findRule(source);
  if (!rule) return;

  // fecha o drawer de CSS global se estiver aberto
  const cssDrawer = $('#cssDrawer');
  if (cssDrawer && !cssDrawer.hidden) { cssDrawer.hidden = true; $('#btnCss')?.classList.remove('active'); }

  ruleSelectorEl.textContent = selector;
  const bits = [t(source.label)];
  if (media) bits.push(media);
  if (!atomic) {
    try {
      const clean = selector.replace(/::?[a-z-]+(\([^)]*\))?/gi, '') || selector;
      const count = canvas.getDoc().querySelectorAll(clean).length;
      bits.push(t('{0} elemento(s) na página', count));
    } catch { /* seletor não consultável */ }
  }
  ruleMetaEl.textContent = bits.join(' · ');

  const block = dedent(source.text.slice(rule.blockStart + 1, rule.blockEnd));
  ruleCodeEl.value = block;
  buildControls(block);
  ruleControlsEl.style.display = atomic ? 'none' : '';
  drawer.hidden = false;
}

function closeRuleDrawer() {
  drawer.hidden = true;
  current = null;
  refreshSelectors();
}

function dedent(block) {
  const lines = block.replace(/^\n+|\s+$/g, '').split('\n');
  const indents = lines.filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map(l => l.slice(min)).join('\n');
}

function indent(block) {
  return block.split('\n').map(l => (l.trim() ? '  ' + l : l)).join('\n');
}

// Aplica um novo conteúdo de bloco à regra atual (chamado pelo código e pelos controles)
async function applyBlock(block) {
  if (!current) return;
  const source = getSourceById(current.sourceId);
  const rule = findRule(source);
  if (!rule) return;
  const newText = source.text.slice(0, rule.blockStart + 1) + '\n' + indent(block) + '\n' + source.text.slice(rule.blockEnd);
  checkpoint('cssrule:' + current.sourceId + '|' + current.selector);
  await applySourceText(source, newText);
  if (applyingFromCode) updateControlValues(block);
}

async function deleteCurrentRule() {
  if (!current) return;
  if (!await askConfirm({
    title: t('Excluir a regra "{0}"?', current.selector),
    message: t('A regra some do CSS onde está gravada. Dá para desfazer com ⌘Z.'),
    confirmLabel: t('Excluir'), danger: true,
  })) return;
  const source = getSourceById(current.sourceId);
  const rule = findRule(source);
  if (!rule) return;
  let end = rule.blockEnd + 1;
  while (end < source.text.length && source.text[end] === '\n') end++;
  const newText = source.text.slice(0, rule.start) + source.text.slice(end);
  checkpoint();
  await applySourceText(source, newText);
  toast(t('Regra excluída'), 'ok', 1600);
  closeRuleDrawer();
}

// ============================================================
// Declarações do bloco (parse/regeneração preservando aninhados)
// ============================================================
function parseSegments(block) {
  const segs = [];
  let cur = '', depth = 0;
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    cur += ch;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { segs.push({ type: 'nested', text: cur.trim() }); cur = ''; }
    } else if (ch === ';' && depth === 0) {
      const t = cur.trim();
      segs.push({ type: t.includes(':') && !t.startsWith('/*') ? 'decl' : 'raw', text: t });
      cur = '';
    }
  }
  const left = cur.trim();
  if (left) segs.push({ type: left.includes(':') && !left.includes('{') ? 'decl' : 'raw', text: left.endsWith(';') ? left : left + (left.includes(':') ? ';' : '') });
  return segs;
}

function getDecl(block, prop) {
  for (const s of parseSegments(block)) {
    if (s.type !== 'decl') continue;
    const idx = s.text.indexOf(':');
    if (s.text.slice(0, idx).trim().toLowerCase() === prop) {
      return s.text.slice(idx + 1).replace(/;\s*$/, '').trim();
    }
  }
  return '';
}

function setDecl(block, prop, value) {
  const segs = parseSegments(block);
  let found = false;
  for (const s of segs) {
    if (s.type !== 'decl') continue;
    const idx = s.text.indexOf(':');
    if (s.text.slice(0, idx).trim().toLowerCase() === prop) {
      s.text = value ? `${prop}: ${value};` : '';
      found = true;
      break;
    }
  }
  if (!found && value) {
    const firstNested = segs.findIndex(s => s.type === 'nested');
    const decl = { type: 'decl', text: `${prop}: ${value};` };
    if (firstNested === -1) segs.push(decl);
    else segs.splice(firstNested, 0, decl);
  }
  return segs.filter(s => s.text).map(s => s.text).join('\n');
}

// ============================================================
// Controles visuais
// ============================================================
const RULE_PROPS = [
  ['color', 'Cor do texto', 'color'],
  ['background-color', 'Cor de fundo', 'color'],
  ['font-size', 'Tam. da fonte', 'text', '16px'],
  ['font-weight', 'Peso', 'select', ['', '100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold']],
  ['font-family', 'Fonte', 'text', 'Inter, sans-serif'],
  ['line-height', 'Entrelinha', 'text', '1.5'],
  ['letter-spacing', 'Espaç. letras', 'text', '0.02em'],
  ['text-align', 'Alinhamento', 'select', ['', 'left', 'center', 'right', 'justify']],
  ['display', 'Display', 'select', ['', 'block', 'flex', 'grid', 'inline-block', 'inline', 'none']],
  ['gap', 'Gap', 'text', '16px'],
  ['padding', 'Padding', 'text', '16px 24px'],
  ['margin', 'Margin', 'text', '0 auto'],
  ['width', 'Largura', 'text', 'auto'],
  ['height', 'Altura', 'text', 'auto'],
  ['max-width', 'Larg. máxima', 'text', '1080px'],
  ['border', 'Borda', 'text', '1px solid #ddd'],
  ['border-radius', 'Raio', 'text', '8px'],
  ['box-shadow', 'Sombra', 'text', '0 8px 24px rgba(0,0,0,.12)'],
  ['opacity', 'Opacidade', 'text', '1'],
  ['transition', 'Transição', 'text', 'all .3s ease'],
];

const controlRefs = new Map(); // prop -> input(s)

function buildControls(block) {
  ruleControlsEl.innerHTML = '';
  controlRefs.clear();
  let row = null;
  RULE_PROPS.forEach(([prop, label, type, extra], i) => {
    const val = getDecl(block, prop);
    const wrap = el('div', { class: 'ctrl' });
    wrap.appendChild(el('div', { class: 'ctrl-label' }, [el('span', { text: t(label) })]));
    let input;
    if (type === 'color') {
      const cw = el('div', { class: 'color-wrap' });
      const swatch = el('button', { class: 'color-swatch', title: t('Escolher cor') });
      const fill = el('span', { class: 'sw-fill' });
      const picker = el('input', { type: 'color' });
      swatch.append(fill, picker);
      input = el('input', { type: 'text', value: val, placeholder: '—' });
      fill.style.background = val || 'transparent';
      picker.addEventListener('input', () => {
        input.value = picker.value;
        fill.style.background = picker.value;
        onControlChange(prop, picker.value);
      });
      input.addEventListener('input', () => {
        fill.style.background = input.value || 'transparent';
        onControlChange(prop, input.value);
      });
      cw.append(swatch, input);
      wrap.appendChild(cw);
      controlRefs.set(prop, { input, fill });
    } else if (type === 'select') {
      input = el('select', { class: 'ctl-select' });
      for (const o of extra) input.appendChild(el('option', { value: o, text: o || '—' }));
      input.value = extra.includes(val) ? val : '';
      if (val && !extra.includes(val)) {
        input.appendChild(el('option', { value: val, text: val }));
        input.value = val;
      }
      input.addEventListener('change', () => onControlChange(prop, input.value));
      wrap.appendChild(input);
      controlRefs.set(prop, { input });
    } else {
      input = el('input', { class: 'ctl-input', type: 'text', value: val, placeholder: extra || '—' });
      input.addEventListener('input', debounce(() => onControlChange(prop, input.value), 250));
      wrap.appendChild(input);
      controlRefs.set(prop, { input });
    }
    if (i % 2 === 0) { row = el('div', { class: 'ctrl-row' }); ruleControlsEl.appendChild(row); }
    row.appendChild(wrap);
  });
}

function updateControlValues(block) {
  for (const [prop, ref] of controlRefs) {
    if (document.activeElement === ref.input) continue;
    const val = getDecl(block, prop);
    ref.input.value = val;
    if (ref.fill) ref.fill.style.background = val || 'transparent';
  }
}

function onControlChange(prop, value) {
  if (!current) return;
  const newBlock = setDecl(ruleCodeEl.value, prop, value.trim());
  ruleCodeEl.value = newBlock;
  applyBlock(newBlock);
}

// ============================================================
// Nova regra (adicionada ao CSS personalizado)
// ============================================================
export function createRule(selector) {
  const css = canvas.getCustomCss();
  checkpoint();
  canvas.setCustomCss(css + (css && !css.endsWith('\n') ? '\n' : '') + `${selector} {\n}\n`);
  markDirty();
  onCssChanged?.({ kind: 'custom' });
  activateCssTab();
  refreshSelectors();
  const occ = parseCss(canvas.getCustomCss()).filter(r => r.selector === selector && !r.media).length - 1;
  openRule('custom', selector, '', Math.max(0, occ), false);
  toast(t('Regra {0} criada no CSS personalizado', selector), 'ok');
}

async function newRule() {
  if (!canvas.getDoc()) return toast(t('Abra uma página primeiro'), 'info');
  const sel = await askPrompt({
    title: t('Nova regra CSS'),
    label: t('Seletor da nova regra (ex.: .minha-classe, #meu-id):'),
    placeholder: '.minha-classe',
  });
  if (!sel || !sel.trim()) return;
  createRule(sel.trim());
}

// ============================================================
// Salto direto para um seletor (usado pelos chips da aba Avançado)
// ============================================================
function activateCssTab() {
  const tab = document.querySelector('.side-tab[data-tab="selectors"]');
  if (tab && !tab.classList.contains('active')) tab.click();
}

// Abre a aba CSS filtrada pelo token (".classe" ou "#id") e, se existir uma
// regra que o utilize, abre direto o editor dela. Retorna false se não achar.
export function jumpToSelector(token) {
  activateCssTab();
  if (searchInput) {
    searchInput.value = token;
    refreshSelectors();
  }
  const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])');
  for (const source of getSources()) {
    const seen = {};
    for (const rule of parseCss(source.text)) {
      const key = rule.media + '|' + rule.selector;
      const occ = seen[key] = (seen[key] ?? -1) + 1;
      if (!rule.atomic && re.test(rule.selector)) {
        openRule(source.id, rule.selector, rule.media, occ, rule.atomic);
        return true;
      }
    }
  }
  return false;
}
