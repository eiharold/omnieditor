// Inspector: painéis de estilo, animação e avançado do elemento selecionado

import { el, $, parseUnit, toHex, debounce, toast, relativePathBetween, fileToDataURL } from './utils.js';
import { state, checkpoint, markDirty } from './state.js';
import * as canvas from './canvas.js';
import { ANIM_PRESETS, EASES, getAnim, setAnim, defaultAnim, playAnimation, playAll } from './animations.js';
import { jumpToSelector, createRule } from './selectors.js';
import { t } from './i18n.js';
import { askConfirm } from './dialogs.js';

let stylePanel, animPanel, advancedPanel, emptyEl;
let currentEl = null;
let currentState = 'normal';   // 'normal' | 'hover' | 'active'
const openSections = new Set(['sec-element', 'sec-layout', 'sec-size', 'sec-spacing', 'sec-typo', 'sec-anim', 'sec-attrs']);

// Tags inline: o campo "Texto" continua disponível (editando o HTML) quando o
// elemento só tem filhos desse tipo (ex.: depois de aplicar negrito ou span).
const INLINE_TAGS = new Set(['SPAN', 'B', 'I', 'STRONG', 'EM', 'U', 'A', 'BR', 'SMALL', 'CODE', 'MARK', 'S', 'SUB', 'SUP', 'ABBR', 'FONT']);

const FONTS = ['Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Roboto', 'Poppins', 'Montserrat', 'Playfair Display', 'system-ui', 'sans-serif', 'serif', 'monospace'];
const UNITS = ['px', '%', 'em', 'rem', 'vw', 'vh'];

export function initInspector() {
  stylePanel = $('#stylePanel');
  animPanel = $('#animPanel');
  advancedPanel = $('#advancedPanel');
  emptyEl = $('#inspectorEmpty');

  // datalist de fontes
  const dl = el('datalist', { id: 'omniFonts' });
  FONTS.forEach(f => dl.appendChild(el('option', { value: f })));
  document.body.appendChild(dl);
}

// ============================================================
// Aplicação de estilos
// ============================================================
// Garante um id no elemento (para poder criar regras :hover/:active)
function ensureElId() {
  if (!currentEl.id) { currentEl.id = 'el-' + Math.random().toString(36).slice(2, 8); markDirty(); }
  return currentEl.id;
}

// ---- Regras de estado (:hover / :active) gravadas no CSS personalizado ----
function stateBlock(id, state) {
  const re = new RegExp(`/\\* omni:${state}:${id} \\*/\\s*#${id}:${state}\\s*\\{([\\s\\S]*?)\\}\\s*/\\* /omni:${state}:${id} \\*/`);
  const m = canvas.getCustomCss().match(re);
  return m ? m[1] : '';
}
function writeStateBlock(id, state, block) {
  let css = canvas.getCustomCss();
  const re = new RegExp(`\\n?/\\* omni:${state}:${id} \\*/[\\s\\S]*?/\\* /omni:${state}:${id} \\*/\\n?`);
  css = css.replace(re, '');
  const clean = block.trim();
  if (clean) css += `\n/* omni:${state}:${id} */\n#${id}:${state} {\n  ${clean}\n}\n/* /omni:${state}:${id} */\n`;
  canvas.setCustomCss(css);
  const area = $('#customCssArea'); if (area) area.value = canvas.getCustomCss();
}
function declGet(block, prop) {
  for (const d of block.split(';')) {
    const i = d.indexOf(':'); if (i < 0) continue;
    if (d.slice(0, i).trim().toLowerCase() === prop.toLowerCase()) return d.slice(i + 1).trim();
  }
  return '';
}
function declSet(block, prop, value) {
  const parts = []; let found = false;
  for (const d of block.split(';')) {
    const seg = d.trim(); if (!seg) continue;
    const i = seg.indexOf(':');
    if (i > 0 && seg.slice(0, i).trim().toLowerCase() === prop.toLowerCase()) {
      found = true; if (value) parts.push(`${prop}: ${value}`);
    } else parts.push(seg);
  }
  if (!found && value) parts.push(`${prop}: ${value}`);
  return parts.length ? parts.join('; ') + ';' : '';
}

// Escreve um valor de estilo no destino do estado atual (inline ou regra pseudo)
// Escreve o estilo inline garantindo que ele realmente vença.
//
// Uma regra `!important` na CSS da página derrota o estilo inline: o editor
// gravava o valor, o painel mostrava certo e a tela não mudava — parecia que
// "nada funciona". Aqui a gente compara o resultado computado com e sem
// !important: se der diferença, a página estava sobrepondo, e o !important
// fica. A comparação é feita em valores computados de propósito, porque
// "#ff0000" e "rgb(255, 0, 0)" são o mesmo valor escrito de formas diferentes.
function setInline(elm, prop, value) {
  const read = () => getComputedStyle(elm).getPropertyValue(prop);
  elm.style.setProperty(prop, value);
  const normal = read();
  elm.style.setProperty(prop, value, 'important');
  if (read() === normal) elm.style.setProperty(prop, value);   // não precisava
}

function setStyleProp(prop, value) {
  if (!currentEl) return;
  if (currentState === 'normal') {
    if (value === '' || value == null) currentEl.style.removeProperty(prop);
    else setInline(currentEl, prop, value);
  } else {
    const id = ensureElId();
    writeStateBlock(id, currentState, declSet(stateBlock(id, currentState), prop, value || ''));
  }
}

// Largura/altura não têm efeito nenhum em elemento `display: inline` (um <a>,
// um <span>). Sem aviso, parece que o editor está quebrado — avisa e explica.
const SIZE_PROPS = /^(width|height)$/;
let sizeWarned = null;

// Um aviso só por elemento+propriedade, senão vira spam a cada tecla digitada.
function warnOnce(key, msg) {
  if (sizeWarned === key) return;
  sizeWarned = key;
  toast(msg, 'info', 4600);
}

function warnIfIneffective(prop, value) {
  if (!SIZE_PROPS.test(prop) || !currentEl) return;
  const cs = getComputedStyle(currentEl);
  const key = prop + ':' + (currentEl.id || currentEl.tagName);

  if (cs.display === 'inline') {
    return warnOnce(key, t('{0} não afeta um elemento inline. Mude o Display para block ou inline-block.', prop));
  }
  // Pediu um valor exato em px e o elemento ficou de outro tamanho: quem manda
  // é o contêiner (item flex/grid) ou um min/max. Sem avisar, parece que o
  // editor ignorou a edição.
  const pedido = /^(-?[\d.]+)px$/.exec(value);
  if (!pedido) return;
  const real = parseFloat(cs[prop]);
  if (Number.isNaN(real) || Math.abs(real - parseFloat(pedido[1])) <= 1) return;
  warnOnce(key, t('O elemento ficou com {0} em vez de {1}: o tamanho está sendo definido pelo contêiner (flex/grid) ou por um min/max.', Math.round(real) + 'px', pedido[0]));
}

function applyStyle(prop, value, opKey) {
  if (!currentEl) return;
  checkpoint(opKey || 'style:' + currentState + ':' + prop);
  setStyleProp(prop, value);
  if (value && currentState === 'normal') warnIfIneffective(prop, value);
  markDirty();
  canvas.refreshBoxes();
}

const gv = prop => {
  if (!currentEl) return '';
  if (currentState === 'normal') return currentEl.style.getPropertyValue(prop);
  return currentEl.id ? declGet(stateBlock(currentEl.id, currentState), prop) : '';
};
const cv = prop => {
  if (!currentEl) return '';
  try { return currentEl.ownerDocument.defaultView.getComputedStyle(currentEl).getPropertyValue(prop); }
  catch { return ''; }
};
const normVal = v => /^-?\d+(\.\d+)?$/.test(String(v).trim()) ? v.trim() + 'px' : String(v).trim();

// ============================================================
// Fábricas de controles
// ============================================================
function section(key, title, children, { open } = {}) {
  const isOpen = open ?? openSections.has(key);
  if (isOpen) openSections.add(key);
  const sec = el('div', { class: `acc-section ${isOpen ? 'open' : ''}` });
  const head = el('button', {
    class: 'acc-head', html: `${escT(title)}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 5 7 7-7 7"/></svg>`,
    onclick: () => {
      sec.classList.toggle('open');
      if (sec.classList.contains('open')) openSections.add(key); else openSections.delete(key);
    },
  });
  const body = el('div', { class: 'acc-body' }, children.filter(Boolean));
  sec.append(head, body);
  return sec;
}

// Escapa e traduz um rótulo para uso em innerHTML
function escT(s) {
  return t(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function ctrl(label, inputEl, valHint) {
  const c = el('div', { class: 'ctrl' });
  if (label) {
    const lab = el('div', { class: 'ctrl-label' }, [el('span', { text: t(label) })]);
    if (valHint) lab.appendChild(el('span', { class: 'ctrl-val', text: valHint }));
    c.appendChild(lab);
  }
  c.appendChild(inputEl);
  return c;
}

function row2(...ctrls) {
  return el('div', { class: 'ctrl-row' }, ctrls.filter(Boolean));
}

function mkText({ label, value = '', placeholder = '', onInput, mono = false }) {
  const input = el('input', { class: 'ctl-input', type: 'text', value, placeholder: t(placeholder) });
  if (mono) input.style.fontFamily = 'var(--mono)';
  input.addEventListener('input', () => onInput(input.value));
  return ctrl(label, input);
}

function mkTextarea({ label, value = '', placeholder = '', onInput, onCommit }) {
  const input = el('textarea', { class: 'ctl-textarea', placeholder: t(placeholder) });
  input.value = value;
  if (onInput) input.addEventListener('input', () => onInput(input.value));
  if (onCommit) input.addEventListener('change', () => onCommit(input.value));
  return ctrl(label, input);
}

function mkSelect({ label, options, value = '', onChange }) {
  const sel = el('select', { class: 'ctl-select' });
  for (const o of options) {
    const [v, txt] = Array.isArray(o) ? o : [o, o];
    sel.appendChild(el('option', { value: v, text: t(txt) }));
  }
  sel.value = value;
  if (sel.value !== value) sel.value = options[0] && (Array.isArray(options[0]) ? options[0][0] : options[0]);
  sel.addEventListener('change', () => onChange(sel.value));
  return ctrl(label, sel);
}

function mkNumberUnit({ label, prop, units = UNITS, allowAuto = false, opKey, get, set, step = 1 }) {
  const getter = get || (() => gv(prop));
  const setter = set || (v => applyStyle(prop, v, opKey));
  const { num, unit } = parseUnit(getter());
  const comp = parseUnit(prop ? cv(prop) : '');
  const wrap = el('div', { class: 'nu-wrap' });
  const numIn = el('input', { type: 'number', step, value: num === '' ? '' : num, placeholder: comp.num === '' ? '–' : comp.num });
  const allUnits = allowAuto ? [...units, 'auto'] : units;
  const unitSel = el('select');
  allUnits.forEach(u => unitSel.appendChild(el('option', { value: u, text: u || '—' })));
  unitSel.value = unit && allUnits.includes(unit) ? unit : (comp.unit && allUnits.includes(comp.unit) ? comp.unit : allUnits[0]);
  if (unit === 'auto') { unitSel.value = 'auto'; numIn.disabled = true; }

  const apply = () => {
    if (unitSel.value === 'auto') { numIn.disabled = true; numIn.value = ''; setter('auto'); return; }
    numIn.disabled = false;
    if (numIn.value === '') setter('');
    else setter(numIn.value + unitSel.value);
  };
  numIn.addEventListener('input', apply);
  unitSel.addEventListener('change', apply);
  wrap.append(numIn, unitSel);
  return ctrl(label, wrap);
}

function mkSlider({ label, min, max, step = 1, value, onInput, format = v => v }) {
  const wrap = el('div', { class: 'slider-wrap' });
  const range = el('input', { type: 'range', min, max, step });
  const num = el('input', { type: 'number', min, max, step });
  range.value = value; num.value = value;
  const emitVal = v => { onInput(v); };
  range.addEventListener('input', () => { num.value = range.value; emitVal(+range.value); });
  num.addEventListener('input', () => { range.value = num.value; emitVal(+num.value); });
  wrap.append(range, num);
  return ctrl(label, wrap, null);
}

function mkColor({ label, value = '', onChange, placeholder = '' }) {
  const wrap = el('div', { class: 'color-wrap' });
  const swatch = el('button', { class: 'color-swatch', title: t('Escolher cor') });
  const fill = el('span', { class: 'sw-fill' });
  const picker = el('input', { type: 'color' });
  swatch.append(fill, picker);
  const text = el('input', { type: 'text', value, placeholder: placeholder || 'ex.: #8B5CF6' });
  const clear = el('button', {
    class: 'color-clear', title: 'Limpar',
    html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  });
  const sync = v => {
    fill.style.background = v || 'transparent';
    const hex = toHex(v);
    if (hex) picker.value = hex;
  };
  sync(value || placeholder);
  picker.addEventListener('input', () => { text.value = picker.value; sync(picker.value); onChange(picker.value); });
  text.addEventListener('input', () => { sync(text.value); onChange(text.value); });
  clear.addEventListener('click', () => { text.value = ''; sync(''); onChange(''); });
  wrap.append(swatch, text, clear);
  return ctrl(label, wrap);
}

function mkBtnGroup({ label, options, value, onChange }) {
  const group = el('div', { class: 'btngroup' });
  const btns = [];
  for (const o of options) {
    // traduz apenas rótulos de texto puro (não SVG)
    const raw = o.html || o.label || '';
    const content = raw.includes('<') ? raw : escT(raw);
    const b = el('button', { html: content, title: o.title ? t(o.title) : '' });
    if (o.v === value) b.classList.add('active');
    b.addEventListener('click', () => {
      btns.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      onChange(o.v);
    });
    btns.push(b);
    group.appendChild(b);
  }
  return ctrl(label, group);
}

function mkBox4({ label, props, labels = ['Sup', 'Dir', 'Inf', 'Esq'], opKey }) {
  const wrap = el('div');
  const box = el('div', { class: 'box4' });
  const inputs = props.map(p => {
    const { num, unit } = parseUnit(gv(p));
    const compRaw = cv(p);
    const comp = parseUnit(compRaw);
    const inp = el('input', {
      type: 'text',
      value: gv(p) ? (num === '' ? gv(p) : num + (unit === 'px' ? '' : unit)) : '',
      placeholder: compRaw === 'auto' ? 'auto' : (comp.num === '' ? '–' : Math.round(comp.num * 10) / 10),
    });
    return inp;
  });
  let linked = false;
  const linkBtn = el('button', {
    class: 'box4-link', title: t('Vincular os 4 lados'),
    html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    onclick: () => { linked = !linked; linkBtn.classList.toggle('active', linked); },
  });
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      const v = inp.value.trim();
      if (linked) {
        inputs.forEach((other, j) => {
          if (j !== i) other.value = inp.value;
          applyStyle(props[j], v === '' ? '' : (v === 'auto' ? 'auto' : normVal(v)), opKey);
        });
      } else {
        applyStyle(props[i], v === '' ? '' : (v === 'auto' ? 'auto' : normVal(v)), opKey);
      }
    });
    box.appendChild(inp);
  });
  box.appendChild(linkBtn);
  const labRow = el('div', { class: 'box4-labels' }, [...labels.map(l => el('span', { text: t(l) })), el('span')]);
  wrap.append(box, labRow);
  return ctrl(label, wrap);
}

function mkToggle({ label, checked, onChange }) {
  const rowEl = el('div', { class: 'toggle-row' });
  const lab = el('div', { class: 'ctrl-label' }, [el('span', { text: t(label) })]);
  const sw = el('label', { class: 'switch' });
  const input = el('input', { type: 'checkbox' });
  input.checked = !!checked;
  input.addEventListener('change', () => onChange(input.checked));
  sw.append(input, el('span', { class: 'track' }));
  rowEl.append(lab, sw);
  return rowEl;
}

// ============================================================
// Render principal
// ============================================================
// Clicar num elemento sempre recomeça no estado Normal. Sem isso, quem
// experimentava Hover e voltava a editar o mesmo elemento continuava gravando
// em `:hover` sem perceber — a página não mudava e parecia que o editor
// tinha parado de funcionar.
export function resetState() { currentState = 'normal'; }

export function renderInspector(elm) {
  if (elm !== currentEl) currentState = 'normal';  // novo elemento → volta ao normal
  currentEl = elm;
  const head = $('#inspTag'), name = $('#inspName');

  if (!elm) {
    head.textContent = t('Página');
    name.textContent = '';
    emptyEl.style.display = '';
    stylePanel.innerHTML = '';
    animPanel.innerHTML = '';
    advancedPanel.innerHTML = '';
    return;
  }

  emptyEl.style.display = 'none';
  head.textContent = elm.tagName.toLowerCase();
  name.textContent = (elm.id ? `#${elm.id}` : '') + (elm.classList.length ? ` .${[...elm.classList].join('.')}` : '');

  const scroll = stylePanel.parentElement.scrollTop;
  renderStyleTab(elm);
  renderAnimTab(elm);
  renderAdvancedTab(elm);
  stylePanel.parentElement.scrollTop = scroll;
}

function rerender() { if (currentEl) renderInspector(currentEl); }

// ---------- Configurações da página (painel do documento, aba Geral) ----------
export function renderPageSettings(container) {
  container.innerHTML = '';
  const doc = canvas.getDoc();
  if (!doc) return;
  const body = doc.body;

  container.appendChild(section('sec-page', 'Configurações da página', [
    mkText({
      label: 'Título da página', value: doc.title,
      onInput: v => { checkpoint('title'); doc.title = v; markDirty(); },
    }),
    mkColor({
      label: 'Cor de fundo', value: body.style.backgroundColor || '',
      placeholder: getComputedColor(body, 'background-color'),
      onChange: v => { checkpoint('pagebg'); body.style.backgroundColor = v; markDirty(); },
    }),
    mkText({
      label: 'Fonte padrão', value: body.style.fontFamily || '',
      placeholder: 'ex.: Inter, sans-serif',
      onInput: v => { checkpoint('pagefont'); body.style.fontFamily = v; markDirty(); },
    }),
    mkColor({
      label: 'Cor do texto', value: body.style.color || '',
      placeholder: getComputedColor(body, 'color'),
      onChange: v => { checkpoint('pagecolor'); body.style.color = v; markDirty(); },
    }),
  ], { open: true }));

  // --- SEO / compartilhamento ---
  container.appendChild(section('sec-seo', 'SEO e compartilhamento', [
    mkTextarea({
      label: 'Descrição (meta description)', value: getMetaContent(doc, 'meta[name="description"]'),
      placeholder: 'Resumo da página em 1–2 frases (aparece no Google).',
      onInput: v => { checkpoint('metadesc'); setMetaContent(doc, 'meta[name="description"]', { name: 'description' }, v); markDirty(); },
    }),
    mkText({
      label: 'Favicon (caminho)', mono: true, value: getFavicon(doc),
      placeholder: 'ex.: favicon.ico ou img/icone.png',
      onInput: v => { checkpoint('favicon'); setFavicon(doc, v); markDirty(); },
    }),
    mkText({
      label: 'Título de compartilhamento (og:title)', value: getMetaContent(doc, 'meta[property="og:title"]'),
      placeholder: 'Usa o título da página se vazio',
      onInput: v => { checkpoint('ogtitle'); setMetaContent(doc, 'meta[property="og:title"]', { property: 'og:title' }, v); markDirty(); },
    }),
    mkText({
      label: 'Imagem de compartilhamento (og:image)', mono: true, value: getMetaContent(doc, 'meta[property="og:image"]'),
      placeholder: 'ex.: img/share.jpg ou URL completa',
      onInput: v => { checkpoint('ogimage'); setMetaContent(doc, 'meta[property="og:image"]', { property: 'og:image' }, v); markDirty(); },
    }),
    mkText({
      label: 'Idioma da página (lang)', mono: true, value: doc.documentElement.getAttribute('lang') || '',
      placeholder: 'ex.: pt-BR, en, es',
      onInput: v => {
        checkpoint('pagelang');
        if (v.trim()) doc.documentElement.setAttribute('lang', v.trim());
        else doc.documentElement.removeAttribute('lang');
        markDirty();
      },
    }),
  ]));

  const note = el('p', { class: 'insp-note', text: t('Dica: clique em qualquer elemento no canvas para editar estilos, animações e atributos. Duplo clique edita texto.') });
  note.style.padding = '0 14px';
  container.appendChild(note);
}

// ---- helpers de <meta> / favicon no documento editado ----
function getMetaContent(doc, sel) {
  return doc.head.querySelector(sel)?.getAttribute('content') || '';
}
function setMetaContent(doc, sel, attrs, value) {
  let node = doc.head.querySelector(sel);
  if (!value.trim()) { node?.remove(); return; }
  if (!node) {
    node = doc.createElement('meta');
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    doc.head.appendChild(node);
  }
  node.setAttribute('content', value);
}
function getFavicon(doc) {
  const node = doc.head.querySelector('link[rel~="icon"]');
  return node?.getAttribute('data-omni-orig-href') || node?.getAttribute('href') || '';
}
function setFavicon(doc, value) {
  let node = doc.head.querySelector('link[rel~="icon"]');
  if (!value.trim()) { node?.remove(); return; }
  if (!node) {
    node = doc.createElement('link');
    node.setAttribute('rel', 'icon');
    doc.head.appendChild(node);
  }
  // guarda o caminho original (a serialização restaura href a partir dele)
  node.setAttribute('data-omni-orig-href', value);
  node.setAttribute('href', value);
}

function getComputedColor(elm, prop) {
  try { return elm.ownerDocument.defaultView.getComputedStyle(elm).getPropertyValue(prop); }
  catch { return ''; }
}

// ---------- Aba Estilo ----------
function renderStyleTab(elm) {
  stylePanel.innerHTML = '';
  const tag = elm.tagName;

  // --- Seletor de estado (Normal / Hover / Active) ---
  // fica grudada no topo do painel: em estado não-normal ela precisa continuar
  // visível mesmo quando o usuário rola até Tipografia ou Dimensões
  const stateBar = el('div', { class: 'state-bar' + (currentState !== 'normal' ? ' editing-state' : '') });
  stateBar.appendChild(mkBtnGroup({
    label: 'Estado', value: currentState,
    options: [
      { v: 'normal', html: 'Normal' },
      { v: 'hover', html: 'Hover' },
      { v: 'active', html: 'Active' },
    ],
    onChange: v => { currentState = v; renderStyleTab(elm); },
  }));
  if (currentState !== 'normal') {
    stateBar.appendChild(el('p', {
      class: 'insp-note state-note',
      text: t('Editando o estado :{0} — as mudanças viram uma regra CSS na página.', currentState),
    }));
  }
  stylePanel.appendChild(stateBar);

  // --- Elemento (contextual) — só no estado normal (atributos/conteúdo) ---
  const elemCtrls = [];
  if (currentState !== 'normal') { /* pula edição de src/alt/href/texto */ }
  else {
  if (tag === 'IMG') {
    elemCtrls.push(mkImageSrcControl(elm));
    elemCtrls.push(mkText({
      label: 'Texto alternativo (alt)', value: elm.getAttribute('alt') || '',
      onInput: v => { checkpoint('imgalt'); elm.alt = v; markDirty(); },
    }));
    elemCtrls.push(mkSelect({
      label: 'Ajuste (object-fit)', value: gv('object-fit') || cv('object-fit'),
      options: [['fill', 'fill'], ['cover', 'cover'], ['contain', 'contain'], ['none', 'none'], ['scale-down', 'scale-down']],
      onChange: v => applyStyle('object-fit', v),
    }));
  }
  if (tag === 'A') {
    elemCtrls.push(mkText({
      label: 'Link (href)', mono: true,
      value: elm.getAttribute('data-omni-orig-href') || elm.getAttribute('href') || '',
      onInput: v => { checkpoint('href'); elm.removeAttribute('data-omni-orig-href'); elm.setAttribute('href', v); markDirty(); },
    }));
    elemCtrls.push(mkToggle({
      label: 'Abrir em nova aba', checked: elm.target === '_blank',
      onChange: v => { checkpoint(); if (v) elm.target = '_blank'; else elm.removeAttribute('target'); markDirty(); },
    }));
  }
  // Texto: aceita filhos inline (span/b/i/a…) mostrando o HTML
  const inlineOnly = [...elm.children].every(c => INLINE_TAGS.has(c.tagName));
  if (!['IMG', 'HR', 'BR', 'INPUT', 'VIDEO'].includes(tag) && (elm.childElementCount === 0 || inlineOnly)) {
    const asHtml = elm.childElementCount > 0;
    elemCtrls.push(mkTextarea({
      label: asHtml ? 'Texto (HTML)' : 'Texto',
      value: asHtml ? elm.innerHTML.trim() : elm.textContent,
      // com HTML aplica ao sair do campo (evita quebrar tags no meio da digitação)
      ...(asHtml
        ? { onCommit: v => { checkpoint(); elm.innerHTML = v; markDirty(); canvas.refreshBoxes(); } }
        : { onInput: v => { checkpoint('textcontent'); elm.textContent = v; markDirty(); canvas.refreshBoxes(); } }),
    }));
    if (asHtml) elemCtrls.push(el('p', { class: 'insp-note', text: t('Edite e clique fora para aplicar.') }));
  }
  }
  if (elemCtrls.length) stylePanel.appendChild(section('sec-element', 'Elemento', elemCtrls));

  // --- Layout ---
  const display = gv('display') || cv('display');
  const layoutCtrls = [
    mkSelect({
      label: 'Display', value: display,
      options: ['block', 'flex', 'grid', 'inline-block', 'inline-flex', 'inline', 'none'],
      onChange: v => { applyStyle('display', v); rerender(); },
    }),
  ];
  if (display.includes('flex')) {
    layoutCtrls.push(mkBtnGroup({
      label: 'Direção', value: gv('flex-direction') || cv('flex-direction'),
      options: [
        { v: 'row', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h14m-4-5 5 5-5 5"/></svg>', title: 'Linha' },
        { v: 'column', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v14m-5-4 5 5 5-5"/></svg>', title: 'Coluna' },
        { v: 'row-reverse', html: '⇤', title: 'Linha reversa' },
        { v: 'column-reverse', html: '⤒', title: 'Coluna reversa' },
      ],
      onChange: v => applyStyle('flex-direction', v),
    }));
    layoutCtrls.push(row2(
      mkSelect({
        label: 'Justificar', value: gv('justify-content') || cv('justify-content'),
        options: [['flex-start', 'Início'], ['center', 'Centro'], ['flex-end', 'Fim'], ['space-between', 'Espaço entre'], ['space-around', 'Espaço ao redor'], ['space-evenly', 'Espaço igual']],
        onChange: v => applyStyle('justify-content', v),
      }),
      mkSelect({
        label: 'Alinhar', value: gv('align-items') || cv('align-items'),
        options: [['stretch', 'Esticar'], ['flex-start', 'Início'], ['center', 'Centro'], ['flex-end', 'Fim'], ['baseline', 'Baseline']],
        onChange: v => applyStyle('align-items', v),
      }),
    ));
    layoutCtrls.push(row2(
      mkNumberUnit({ label: 'Espaço (gap)', prop: 'gap' }),
      mkSelect({
        label: 'Quebra (wrap)', value: gv('flex-wrap') || cv('flex-wrap'),
        options: [['nowrap', 'Sem quebra'], ['wrap', 'Quebrar'], ['wrap-reverse', 'Quebra reversa']],
        onChange: v => applyStyle('flex-wrap', v),
      }),
    ));
  }
  if (display.includes('grid')) {
    layoutCtrls.push(mkText({
      label: 'Colunas (grid-template-columns)', mono: true,
      value: gv('grid-template-columns'), placeholder: cv('grid-template-columns') || 'ex.: 1fr 1fr 1fr',
      onInput: v => applyStyle('grid-template-columns', v),
    }));
    layoutCtrls.push(mkNumberUnit({ label: 'Espaço (gap)', prop: 'gap' }));
  }
  layoutCtrls.push(mkSelect({
    label: 'Overflow', value: gv('overflow') || cv('overflow'),
    options: ['visible', 'hidden', 'auto', 'scroll'],
    onChange: v => applyStyle('overflow', v),
  }));
  stylePanel.appendChild(section('sec-layout', 'Layout', layoutCtrls));

  // --- Dimensões ---
  stylePanel.appendChild(section('sec-size', 'Dimensões', [
    row2(
      mkNumberUnit({ label: 'Largura', prop: 'width', allowAuto: true }),
      mkNumberUnit({ label: 'Altura', prop: 'height', allowAuto: true }),
    ),
    row2(
      mkNumberUnit({ label: 'Larg. mín.', prop: 'min-width' }),
      mkNumberUnit({ label: 'Larg. máx.', prop: 'max-width' }),
    ),
    row2(
      mkNumberUnit({ label: 'Alt. mín.', prop: 'min-height' }),
      mkNumberUnit({ label: 'Alt. máx.', prop: 'max-height' }),
    ),
  ]));

  // --- Espaçamento ---
  stylePanel.appendChild(section('sec-spacing', 'Espaçamento', [
    mkBox4({ label: 'Margem externa (margin)', props: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'], opKey: 'margin' }),
    mkBox4({ label: 'Preenchimento (padding)', props: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'], opKey: 'padding' }),
  ]));

  // --- Tipografia ---
  const familyInput = el('input', { class: 'ctl-input', type: 'text', list: 'omniFonts', value: gv('font-family'), placeholder: cv('font-family').split(',')[0] });
  familyInput.addEventListener('input', () => applyStyle('font-family', familyInput.value, 'font-family'));
  stylePanel.appendChild(section('sec-typo', 'Tipografia', [
    mkColor({ label: 'Cor do texto', value: gv('color'), placeholder: cv('color'), onChange: v => applyStyle('color', v, 'color') }),
    ctrl('Fonte', familyInput),
    row2(
      mkNumberUnit({ label: 'Tamanho', prop: 'font-size', units: ['px', 'em', 'rem', '%', 'vw'] }),
      mkSelect({
        label: 'Peso', value: gv('font-weight') || cv('font-weight'),
        options: [['100', '100 · Thin'], ['200', '200'], ['300', '300 · Light'], ['400', '400 · Regular'], ['500', '500 · Medium'], ['600', '600 · Semibold'], ['700', '700 · Bold'], ['800', '800'], ['900', '900 · Black']],
        onChange: v => applyStyle('font-weight', v),
      }),
    ),
    row2(
      mkNumberUnit({ label: 'Entrelinha', prop: 'line-height', units: ['', 'px', 'em', '%'], step: 0.1 }),
      mkNumberUnit({ label: 'Espaç. letras', prop: 'letter-spacing', units: ['px', 'em'], step: 0.1 }),
    ),
    mkBtnGroup({
      label: 'Alinhamento', value: gv('text-align') || cv('text-align'),
      options: [
        { v: 'left', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h10M4 18h14"/></svg>', title: 'Esquerda' },
        { v: 'center', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M7 12h10M5 18h14"/></svg>', title: 'Centro' },
        { v: 'right', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M10 12h10M6 18h14"/></svg>', title: 'Direita' },
        { v: 'justify', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>', title: 'Justificado' },
      ],
      onChange: v => applyStyle('text-align', v),
    }),
    row2(
      mkSelect({
        label: 'Caixa', value: gv('text-transform') || cv('text-transform'),
        options: [['none', 'Normal'], ['uppercase', 'MAIÚSCULAS'], ['lowercase', 'minúsculas'], ['capitalize', 'Capitalizada']],
        onChange: v => applyStyle('text-transform', v),
      }),
      mkSelect({
        label: 'Decoração', value: (gv('text-decoration-line') || cv('text-decoration-line')),
        options: [['none', 'Nenhuma'], ['underline', 'Sublinhado'], ['line-through', 'Riscado'], ['overline', 'Sobrelinha']],
        onChange: v => applyStyle('text-decoration-line', v),
      }),
    ),
    mkSelect({
      label: 'Estilo', value: gv('font-style') || cv('font-style'),
      options: [['normal', 'Normal'], ['italic', 'Itálico']],
      onChange: v => applyStyle('font-style', v),
    }),
  ]));

  // --- Fundo ---
  stylePanel.appendChild(section('sec-bg', 'Fundo', buildBackgroundControls()));

  // --- Borda & sombra ---
  stylePanel.appendChild(section('sec-border', 'Borda & Sombra', buildBorderControls()));

  // --- Posição ---
  const pos = gv('position') || cv('position');
  const posCtrls = [
    mkSelect({
      label: 'Position', value: pos,
      options: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
      onChange: v => { applyStyle('position', v); rerender(); },
    }),
  ];
  if (pos !== 'static') {
    posCtrls.push(mkBox4({ label: 'Deslocamento (top/right/bottom/left)', props: ['top', 'right', 'bottom', 'left'], opKey: 'inset' }));
  }
  posCtrls.push(mkNumberUnit({ label: 'Z-index', prop: 'z-index', units: [''], get: () => gv('z-index'), set: v => applyStyle('z-index', v.replace(/[a-z%]+$/i, ''), 'z-index') }));
  stylePanel.appendChild(section('sec-pos', 'Posição', posCtrls));

  // --- Efeitos ---
  stylePanel.appendChild(section('sec-fx', 'Efeitos', buildEffectsControls()));
}

// ---------- Origem de imagem (src) e imagem de fundo ----------
// Aplicam só ao confirmar (Enter/sair do campo) para a imagem não quebrar no
// meio da digitação; caminhos relativos são resolvidos pela pasta aberta.
const IMG_ACCEPT = { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'] };

async function setImgSrc(elm, path) {
  checkpoint('imgsrc');
  if (!path) {
    elm.removeAttribute('data-omni-orig-src');
    elm.setAttribute('src', '');
  } else {
    try {
      const url = await canvas.resolveAssetURL(path);
      elm.src = url;
      if (url !== path) elm.setAttribute('data-omni-orig-src', path);
      else elm.removeAttribute('data-omni-orig-src');
    } catch {
      elm.removeAttribute('data-omni-orig-src');
      elm.src = path;
      toast(t('Arquivo não encontrado na pasta: {0}', path), 'err');
    }
  }
  markDirty();
  canvas.refreshBoxes();
}

async function setBgImage(elm, path, opKey) {
  checkpoint(opKey || 'bgimg');
  if (!path) {
    setStyleProp('background-image', '');
  } else {
    try {
      const url = await canvas.resolveAssetURL(path);
      setStyleProp('background-image', `url("${url}")`);
    } catch {
      setStyleProp('background-image', `url("${path}")`);
      toast(t('Arquivo não encontrado na pasta: {0}', path), 'err');
    }
  }
  markDirty();
  canvas.refreshBoxes();
}

// Abre o seletor de arquivos e resolve para caminho relativo (se dentro da
// pasta) ou data URL (se fora / sem pasta). onPick recebe o valor final.
async function pickAssetFile(input, onPick) {
  try {
    if (window.showOpenFilePicker) {
      const [fh] = await window.showOpenFilePicker({ types: [{ description: t('Imagem'), accept: IMG_ACCEPT }] });
      const file = await fh.getFile();
      let rel = null;
      if (state.dirHandle?.resolve) {
        try {
          const parts = await state.dirHandle.resolve(fh);
          if (parts) rel = relativePathBetween(state.filePath, parts.join('/'));
        } catch { /* fora da pasta */ }
      }
      if (rel) {
        input.value = rel;
        await onPick(rel);
        toast(t('Imagem vinculada: {0}', rel), 'ok');
      } else {
        const dataUrl = await fileToDataURL(file);
        input.value = dataUrl;
        await onPick(dataUrl);
        toast(state.dirHandle
          ? t('Arquivo fora da pasta do projeto — imagem incorporada na página')
          : t('Imagem incorporada na página (abra a pasta do projeto para vincular por caminho)'), 'info', 4200);
      }
    } else {
      const fi = el('input', { type: 'file', accept: 'image/*' });
      fi.addEventListener('change', async () => {
        if (!fi.files[0]) return;
        const dataUrl = await fileToDataURL(fi.files[0]);
        input.value = dataUrl;
        await onPick(dataUrl);
        toast(t('Imagem incorporada na página'), 'info');
      });
      fi.click();
    }
  } catch (err) {
    if (err?.name !== 'AbortError') toast(t('Não foi possível escolher a imagem'), 'err');
  }
}

// Campo de caminho + botão "Escolher…" (compartilhado por src e fundo)
function mkAssetPathControl({ label, value, apply }) {
  const input = el('input', { class: 'ctl-input', type: 'text', value: value || '', placeholder: t('caminho relativo ou URL') });
  input.style.fontFamily = 'var(--mono)';
  const commit = () => apply(input.value.trim());
  input.addEventListener('change', commit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
  const pickBtn = el('button', { class: 'btn ghost sm', text: t('Escolher…'), title: t('Escolher um arquivo de imagem') });
  pickBtn.addEventListener('click', () => pickAssetFile(input, apply));
  const wrap = ctrl(label, el('div', { class: 'img-src-row' }, [input, pickBtn]));
  wrap.appendChild(el('p', { class: 'insp-note', text: t('Aplica ao pressionar Enter ou sair do campo.') }));
  return wrap;
}

function mkImageSrcControl(elm) {
  return mkAssetPathControl({
    label: t('Origem da imagem (src)'),
    value: elm.getAttribute('data-omni-orig-src') || elm.getAttribute('src') || '',
    apply: v => setImgSrc(elm, v),
  });
}

// ---------- Fundo ----------
// Guarda o tipo escolhido no botão para não ser sobrescrito pela detecção
// (ex.: elemento com gradiente vindo de uma classe CSS ao pedir "Imagem").
const bgTypeChoice = new WeakMap();

function bgType() {
  if (currentEl && bgTypeChoice.has(currentEl)) return bgTypeChoice.get(currentEl);
  const bi = gv('background-image');
  if (bi.includes('gradient')) return 'gradient';
  if (bi.includes('url(')) return 'image';
  if (gv('background-color')) return 'color';
  const cbi = cv('background-image');
  if (cbi.includes('gradient')) return 'gradient';
  if (cbi.includes('url(')) return 'image';
  return 'color';
}

function buildBackgroundControls() {
  const type = bgType();
  const ctrls = [
    mkBtnGroup({
      label: 'Tipo', value: type,
      options: [
        { v: 'color', label: 'Cor', html: 'Cor' },
        { v: 'gradient', label: 'Gradiente', html: 'Gradiente' },
        { v: 'image', label: 'Imagem', html: 'Imagem' },
      ],
      onChange: v => {
        checkpoint();
        bgTypeChoice.set(currentEl, v);
        if (v === 'color') setStyleProp('background-image', '');
        if (v === 'gradient' && !gv('background-image').includes('gradient')) {
          setStyleProp('background-image', 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)');
        }
        if (v === 'image' && !gv('background-image').includes('url(')) {
          setStyleProp('background-image', '');
        }
        markDirty();
        rerender();
      },
    }),
  ];

  if (type === 'color') {
    ctrls.push(mkColor({
      label: 'Cor de fundo', value: gv('background-color'), placeholder: cv('background-color'),
      onChange: v => applyStyle('background-color', v, 'bgcolor'),
    }));
  }

  if (type === 'gradient') {
    const parsed = parseGradient(gv('background-image') || cv('background-image'));
    const rebuild = () => {
      applyStyle('background-image', `linear-gradient(${parsed.angle}deg, ${parsed.c1} 0%, ${parsed.c2} 100%)`, 'gradient');
    };
    ctrls.push(mkColor({ label: 'Cor inicial', value: parsed.c1, onChange: v => { parsed.c1 = v || '#8B5CF6'; rebuild(); } }));
    ctrls.push(mkColor({ label: 'Cor final', value: parsed.c2, onChange: v => { parsed.c2 = v || '#6D28D9'; rebuild(); } }));
    ctrls.push(mkSlider({ label: 'Ângulo', min: 0, max: 360, value: parsed.angle, onInput: v => { parsed.angle = v; rebuild(); } }));
  }

  if (type === 'image') {
    const rawUrl = (gv('background-image') || cv('background-image')).match(/url\(["']?([^"')]+)["']?\)/)?.[1] || '';
    const displayUrl = rawUrl.startsWith('blob:') ? (canvas.getOriginalPath(rawUrl) || rawUrl) : rawUrl;
    ctrls.push(mkAssetPathControl({
      label: t('URL da imagem'),
      value: displayUrl,
      apply: v => setBgImage(currentEl, v),
    }));
    ctrls.push(row2(
      mkSelect({
        label: 'Tamanho', value: gv('background-size') || cv('background-size'),
        options: [['auto', 'auto'], ['cover', 'cover'], ['contain', 'contain'], ['100% 100%', 'esticar']],
        onChange: v => applyStyle('background-size', v),
      }),
      mkSelect({
        label: 'Posição', value: gv('background-position') || 'center',
        options: [['center', 'centro'], ['top', 'topo'], ['bottom', 'base'], ['left', 'esquerda'], ['right', 'direita']],
        onChange: v => applyStyle('background-position', v),
      }),
    ));
    ctrls.push(row2(
      mkSelect({
        label: 'Repetição', value: gv('background-repeat') || cv('background-repeat'),
        options: [['no-repeat', 'não repetir'], ['repeat', 'repetir'], ['repeat-x', 'horizontal'], ['repeat-y', 'vertical']],
        onChange: v => applyStyle('background-repeat', v),
      }),
      mkSelect({
        label: 'Fixação', value: gv('background-attachment') || cv('background-attachment'),
        options: [['scroll', 'rolar'], ['fixed', 'fixa (parallax)']],
        onChange: v => applyStyle('background-attachment', v),
      }),
    ));
    ctrls.push(mkColor({
      label: 'Cor de apoio', value: gv('background-color'), placeholder: cv('background-color'),
      onChange: v => applyStyle('background-color', v, 'bgcolor'),
    }));
  }
  return ctrls;
}

function parseGradient(str) {
  const out = { angle: 135, c1: '#8B5CF6', c2: '#6D28D9' };
  const m = str.match(/linear-gradient\(\s*([\d.]+)deg\s*,\s*(.+)\)/);
  if (m) {
    out.angle = parseFloat(m[1]);
    const stops = m[2].split(/,(?![^(]*\))/).map(s => s.trim().replace(/\s+[\d.]+%$/, ''));
    if (stops[0]) out.c1 = stops[0];
    if (stops[stops.length - 1]) out.c2 = stops[stops.length - 1];
  }
  return out;
}

// ---------- Borda & sombra ----------
const SHADOWS = {
  none: '',
  sm: '0 2px 8px rgba(0,0,0,0.08)',
  md: '0 8px 24px rgba(0,0,0,0.12)',
  lg: '0 16px 48px rgba(0,0,0,0.2)',
};

function buildBorderControls() {
  const ctrls = [
    row2(
      mkNumberUnit({ label: 'Espessura', prop: 'border-width' }),
      mkSelect({
        label: 'Estilo', value: gv('border-style') || cv('border-style'),
        options: [['none', 'nenhum'], ['solid', 'sólido'], ['dashed', 'tracejado'], ['dotted', 'pontilhado'], ['double', 'duplo']],
        onChange: v => applyStyle('border-style', v),
      }),
    ),
    mkColor({ label: 'Cor da borda', value: gv('border-color'), placeholder: cv('border-color'), onChange: v => applyStyle('border-color', v, 'bordercolor') }),
    mkBox4({
      label: 'Raio dos cantos (border-radius)',
      props: ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'],
      labels: ['SE', 'SD', 'ID', 'IE'], opKey: 'radius',
    }),
  ];

  const cur = gv('box-shadow');
  let preset = 'none';
  if (cur) {
    preset = Object.entries(SHADOWS).find(([, v]) => v === cur)?.[0] || 'custom';
  }
  ctrls.push(mkSelect({
    label: 'Sombra', value: preset,
    options: [['none', 'Nenhuma'], ['sm', 'Suave'], ['md', 'Média'], ['lg', 'Forte'], ['custom', 'Personalizada']],
    onChange: v => {
      if (v === 'custom') {
        if (!gv('box-shadow')) applyStyle('box-shadow', '0 8px 24px rgba(0,0,0,0.15)', 'shadow');
      } else {
        applyStyle('box-shadow', SHADOWS[v], 'shadow');
      }
      rerender();
    },
  }));
  if (preset === 'custom') {
    ctrls.push(mkText({
      label: 'box-shadow', mono: true, value: cur,
      placeholder: '0 8px 24px rgba(0,0,0,0.15)',
      onInput: v => applyStyle('box-shadow', v, 'shadow'),
    }));
  }
  return ctrls;
}

// ---------- Efeitos ----------
function parseFilter(str, name, def) {
  const m = (str || '').match(new RegExp(`${name}\\(([\\d.]+)`));
  return m ? parseFloat(m[1]) : def;
}

function buildEffectsControls() {
  const filterStr = gv('filter') || (cv('filter') !== 'none' ? cv('filter') : '');
  const fx = {
    blur: parseFilter(filterStr, 'blur', 0),
    brightness: filterStr.includes('brightness') ? parseFilter(filterStr, 'brightness', 1) * 100 : 100,
    contrast: filterStr.includes('contrast') ? parseFilter(filterStr, 'contrast', 1) * 100 : 100,
    saturate: filterStr.includes('saturate') ? parseFilter(filterStr, 'saturate', 1) * 100 : 100,
    grayscale: filterStr.includes('grayscale') ? parseFilter(filterStr, 'grayscale', 0) * 100 : 0,
  };
  const rebuildFilter = () => {
    const parts = [];
    if (fx.blur > 0) parts.push(`blur(${fx.blur}px)`);
    if (fx.brightness !== 100) parts.push(`brightness(${fx.brightness / 100})`);
    if (fx.contrast !== 100) parts.push(`contrast(${fx.contrast / 100})`);
    if (fx.saturate !== 100) parts.push(`saturate(${fx.saturate / 100})`);
    if (fx.grayscale > 0) parts.push(`grayscale(${fx.grayscale / 100})`);
    applyStyle('filter', parts.join(' '), 'filter');
  };

  const op = gv('opacity') !== '' ? parseFloat(gv('opacity')) : parseFloat(cv('opacity') || 1);
  const tr = { x: parseUnit((gv('translate') || '').split(' ')[0]).num || 0, y: parseUnit((gv('translate') || '').split(' ')[1]).num || 0 };
  const scale = gv('scale') !== '' ? parseFloat(gv('scale')) : 1;
  const rot = parseUnit(gv('rotate')).num || 0;

  return [
    mkSlider({
      label: 'Opacidade (%)', min: 0, max: 100, value: Math.round(op * 100),
      onInput: v => applyStyle('opacity', v >= 100 ? '' : String(v / 100), 'opacity'),
    }),
    row2(
      mkNumberUnit({
        label: 'Mover X', units: ['px', '%'],
        get: () => (gv('translate') || '').split(' ')[0] || '',
        set: v => { tr.x = v; applyStyle('translate', `${v || '0px'} ${(gv('translate') || '').split(' ')[1] || '0px'}`, 'translate'); },
      }),
      mkNumberUnit({
        label: 'Mover Y', units: ['px', '%'],
        get: () => (gv('translate') || '').split(' ')[1] || '',
        set: v => { applyStyle('translate', `${(gv('translate') || '').split(' ')[0] || '0px'} ${v || '0px'}`, 'translate'); },
      }),
    ),
    mkSlider({
      label: 'Escala', min: 0.25, max: 3, step: 0.01, value: scale,
      onInput: v => applyStyle('scale', v === 1 ? '' : String(v), 'scale'),
    }),
    mkSlider({
      label: 'Rotação (°)', min: -180, max: 180, value: rot,
      onInput: v => applyStyle('rotate', v === 0 ? '' : `${v}deg`, 'rotate'),
    }),
    mkSlider({ label: 'Desfoque (blur px)', min: 0, max: 24, step: 0.5, value: fx.blur, onInput: v => { fx.blur = v; rebuildFilter(); } }),
    mkSlider({ label: 'Brilho (%)', min: 0, max: 200, value: fx.brightness, onInput: v => { fx.brightness = v; rebuildFilter(); } }),
    mkSlider({ label: 'Contraste (%)', min: 0, max: 200, value: fx.contrast, onInput: v => { fx.contrast = v; rebuildFilter(); } }),
    mkSlider({ label: 'Saturação (%)', min: 0, max: 200, value: fx.saturate, onInput: v => { fx.saturate = v; rebuildFilter(); } }),
    mkSlider({ label: 'Preto & branco (%)', min: 0, max: 100, value: fx.grayscale, onInput: v => { fx.grayscale = v; rebuildFilter(); } }),
    row2(
      mkNumberUnit({
        label: 'Transição (s)', units: ['s'], step: 0.05,
        get: () => { const m = gv('transition').match(/([\d.]+)s/); return m ? m[1] + 's' : ''; },
        set: v => applyStyle('transition', v ? `all ${v} ease` : '', 'transition'),
      }),
      mkSelect({
        label: 'Cursor', value: gv('cursor') || cv('cursor'),
        options: ['auto', 'default', 'pointer', 'text', 'move', 'not-allowed', 'grab'],
        onChange: v => applyStyle('cursor', v),
      }),
    ),
  ];
}

// ---------- Aba Animação ----------
function renderAnimTab(elm) {
  animPanel.innerHTML = '';
  if (!elm) {
    const doc = canvas.getDoc();
    const count = doc ? doc.querySelectorAll('[data-anim]').length : 0;
    const wrap = el('div', { style: 'padding: 14px;' });
    wrap.appendChild(el('p', { class: 'insp-note', text: count ? t('Esta página tem {0} elemento(s) animado(s) com GSAP.', count) : t('Selecione um elemento para configurar animações GSAP. As animações são salvas na página e funcionam fora do editor.') }));
    if (count) {
      const btn = el('button', { class: 'btn primary', text: t('▶  Reproduzir todas'), style: 'margin-top: 10px; width: 100%; justify-content: center;' });
      btn.addEventListener('click', () => playAll(canvas.getDoc()));
      wrap.appendChild(btn);
    }
    animPanel.appendChild(wrap);
    return;
  }

  const cfg = getAnim(elm);
  const enabled = !!cfg;
  const conf = cfg || defaultAnim();

  const save = () => {
    checkpoint('anim');
    setAnim(elm, conf);
    markDirty();
  };

  const ctrls = [];
  ctrls.push(mkToggle({
    label: 'Ativar animação GSAP', checked: enabled,
    onChange: v => {
      checkpoint();
      if (v) setAnim(elm, conf); else setAnim(elm, null);
      markDirty();
      renderAnimTab(elm);
    },
  }));

  if (enabled) {
    ctrls.push(mkSelect({
      label: 'Preset', value: conf.preset,
      options: Object.entries(ANIM_PRESETS).map(([k, v]) => [k, v.label]),
      onChange: v => { conf.preset = v; save(); playAnimation(elm, conf); },
    }));
    ctrls.push(mkBtnGroup({
      label: 'Disparo', value: conf.trigger,
      options: [
        { v: 'load', html: 'Ao carregar' },
        { v: 'scroll', html: 'Ao rolar' },
      ],
      onChange: v => { conf.trigger = v; save(); renderAnimTab(elm); },
    }));
    ctrls.push(mkSlider({
      label: 'Duração (s)', min: 0.1, max: 4, step: 0.05, value: conf.duration,
      onInput: v => { conf.duration = v; save(); },
    }));
    ctrls.push(mkSlider({
      label: 'Atraso (s)', min: 0, max: 4, step: 0.05, value: conf.delay,
      onInput: v => { conf.delay = v; save(); },
    }));
    ctrls.push(mkSelect({
      label: 'Easing', value: conf.ease,
      options: EASES,
      onChange: v => { conf.ease = v; save(); playAnimation(elm, conf); },
    }));
    if (conf.trigger === 'scroll') {
      ctrls.push(mkToggle({
        label: 'Animar só uma vez', checked: conf.once,
        onChange: v => { conf.once = v; save(); },
      }));
    }
    ctrls.push(mkSlider({
      label: 'Repetições (-1 = infinito)', min: -1, max: 10, value: conf.repeat,
      onInput: v => { conf.repeat = v; save(); },
    }));
    if (+conf.repeat !== 0) {
      ctrls.push(mkToggle({
        label: 'Vai e volta (yoyo)', checked: conf.yoyo,
        onChange: v => { conf.yoyo = v; save(); },
      }));
    }
    ctrls.push(mkToggle({
      label: 'Animar filhos em sequência (stagger)', checked: conf.stagger,
      onChange: v => { conf.stagger = v; save(); renderAnimTab(elm); },
    }));
    if (conf.stagger) {
      ctrls.push(mkSlider({
        label: 'Intervalo do stagger (s)', min: 0.03, max: 1, step: 0.01, value: conf.staggerEach,
        onInput: v => { conf.staggerEach = v; save(); },
      }));
    }
    ctrls.push(mkTextarea({
      label: 'Vars extras do gsap.from (JSON, opcional)', value: conf.custom,
      placeholder: '{ "skewY": 6, "transformOrigin": "left top" }',
      onCommit: v => { conf.custom = v; save(); },
    }));
  }

  animPanel.appendChild(section('sec-anim', 'Animação GSAP', ctrls, { open: true }));

  if (enabled) {
    const playRow = el('div', { class: 'anim-play-row', style: 'padding: 0 14px;' });
    const playBtn = el('button', { class: 'btn primary', text: t('▶  Testar') });
    playBtn.addEventListener('click', () => playAnimation(elm, conf));
    const playAllBtn = el('button', { class: 'btn ghost', text: t('Testar todas') });
    playAllBtn.addEventListener('click', () => playAll(canvas.getDoc()));
    playRow.append(playBtn, playAllBtn);
    animPanel.appendChild(playRow);
    animPanel.appendChild(el('p', { class: 'insp-note', text: t('Ao salvar, o GSAP e o ScrollTrigger são incluídos automaticamente na página para reproduzir as animações.'), style: 'padding: 0 14px;' }));
  }
}

// ---------- Aba Avançado ----------
let elCssDebounce = null;

function renderAdvancedTab(elm) {
  advancedPanel.innerHTML = '';
  if (!elm) {
    advancedPanel.appendChild(el('p', { class: 'insp-note', text: t('Selecione um elemento para editar ID, classes, CSS específico e HTML.'), style: 'padding: 14px;' }));
    return;
  }

  // chips clicáveis de #id e .classes → abrem a regra na aba CSS
  const chipsWrap = el('div', { class: 'attr-chips' });
  const chipsHint = el('p', { class: 'insp-note', text: t('Clique para editar a regra na aba CSS.') });
  const renderChips = () => {
    chipsWrap.innerHTML = '';
    const tokens = [];
    if (elm.id) tokens.push('#' + elm.id);
    for (const c of elm.classList) tokens.push('.' + c);
    chipsWrap.style.display = tokens.length ? '' : 'none';
    chipsHint.style.display = tokens.length ? '' : 'none';
    for (const tok of tokens) {
      const chip = el('button', {
        class: 'chip attr-chip ' + (tok[0] === '#' ? 'tk-id' : 'tk-class'),
        text: tok,
        title: t('Editar a regra {0} na aba CSS', tok),
      });
      chip.addEventListener('click', async () => {
        if (jumpToSelector(tok)) return;
        const criar = await askConfirm({
          title: t('Nenhuma regra encontrada para "{0}". Criar no CSS personalizado?', tok),
          confirmLabel: t('Criar regra'),
        });
        if (criar) createRule(tok);
      });
      chipsWrap.appendChild(chip);
    }
  };
  renderChips();

  advancedPanel.appendChild(section('sec-attrs', 'Identificação', [
    mkText({
      label: 'ID', mono: true, value: elm.id,
      onInput: v => { checkpoint('elid'); if (v) elm.id = v.trim(); else elm.removeAttribute('id'); markDirty(); renderChips(); },
    }),
    mkText({
      label: 'Classes (separadas por espaço)', mono: true, value: [...elm.classList].join(' '),
      onInput: v => { checkpoint('elclass'); elm.className = v; markDirty(); canvas.refreshBoxes(); renderChips(); },
    }),
    chipsWrap,
    chipsHint,
  ]));

  // CSS específico do elemento — regra gravada no CSS personalizado da página
  const ensureId = () => {
    if (!elm.id) {
      elm.id = 'el-' + Math.random().toString(36).slice(2, 8);
      markDirty();
    }
    return elm.id;
  };
  const currentRule = elm.id ? extractElementRule(elm.id) : '';
  advancedPanel.appendChild(section('sec-elcss', 'CSS deste elemento', [
    mkTextarea({
      label: elm.id ? t('Regras para #{0}', elm.id) : t('Regras (um ID será gerado)'),
      value: currentRule,
      placeholder: 'transition: transform .3s;\n&:hover { transform: scale(1.05); }',
      onInput: v => {
        clearTimeout(elCssDebounce);
        elCssDebounce = setTimeout(() => {
          checkpoint('elcss');
          writeElementRule(ensureId(), v);
          markDirty();
        }, 250);
      },
    }),
    el('p', { class: 'insp-note', text: t('Gravado no CSS personalizado da página usando o ID do elemento. Suporta &:hover e media queries pelo painel de CSS global.') }),
  ]));

  // HTML do elemento
  advancedPanel.appendChild(section('sec-elhtml', 'HTML do elemento', [
    mkTextarea({
      label: 'outerHTML', value: elm.outerHTML.replace(/\s?data-omni-[a-z-]+="[^"]*"/g, ''),
      onCommit: v => {
        try {
          checkpoint();
          const tpl = elm.ownerDocument.createElement('template');
          tpl.innerHTML = v.trim();
          const first = tpl.content.firstElementChild;
          if (!first) return;
          elm.replaceWith(...tpl.content.children);
          markDirty();
          canvas.select(first);
        } catch { /* html inválido */ }
      },
    }),
    el('p', { class: 'insp-note', text: t('Edite e clique fora para aplicar.') }),
  ]));

  const actions = el('div', { class: 'mini-actions', style: 'padding: 0 14px;' });
  const dupBtn = el('button', { class: 'btn ghost', text: t('Duplicar') });
  dupBtn.addEventListener('click', () => canvas.duplicateElement(elm));
  const delBtn = el('button', { class: 'btn danger', text: t('Excluir') });
  delBtn.addEventListener('click', () => canvas.deleteElement(elm));
  actions.append(dupBtn, delBtn);
  advancedPanel.appendChild(actions);
}

// Regras por elemento dentro do CSS personalizado, delimitadas por comentários
function extractElementRule(id) {
  const css = canvas.getCustomCss();
  const re = new RegExp(`/\\* omni:${id} \\*/\\s*#${id}\\s*\\{([\\s\\S]*?)\\}\\s*/\\* /omni:${id} \\*/`);
  const m = css.match(re);
  return m ? m[1].trim() : '';
}

function writeElementRule(id, rules) {
  let css = canvas.getCustomCss();
  const re = new RegExp(`\\n?/\\* omni:${id} \\*/[\\s\\S]*?/\\* /omni:${id} \\*/\\n?`);
  css = css.replace(re, '');
  if (rules.trim()) {
    css += `\n/* omni:${id} */\n#${id} {\n  ${rules.trim()}\n}\n/* /omni:${id} */\n`;
  }
  canvas.setCustomCss(css);
  const area = $('#customCssArea');
  if (area) area.value = css;
}
