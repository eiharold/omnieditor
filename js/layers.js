// Painel de camadas: árvore do DOM com seleção, visibilidade e drag & drop

import { el, prettyName, prettyExtra } from './utils.js';
import * as canvas from './canvas.js';
import { checkpoint, markDirty } from './state.js';
import { t } from './i18n.js';

let treeRoot;
const expanded = new WeakSet();  // elementos com filhos expandidos (tudo começa contraído)
let dragSource = null;
let lastRevealed = null;         // último selecionado cujo caminho já foi aberto
let lastBody = null;             // body da última renderização (document.open() mantém o mesmo doc, mas recria o body)

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'NOSCRIPT', 'TEMPLATE']);

export function initLayers(container) {
  treeRoot = container;
}

export function refreshLayers() {
  if (!treeRoot) return;
  // não reconstrói a árvore quando o painel de camadas não está visível
  // (o initTabs chama refreshLayers ao abrir a aba)
  const panel = treeRoot.closest('.side-panel');
  if (panel && !panel.classList.contains('active')) return;
  const doc = canvas.getDoc();
  treeRoot.innerHTML = '';
  if (!doc) return;
  const body = doc.body;
  if (body !== lastBody) {
    // página (re)carregada: só o body começa expandido
    expanded.add(body);
    lastBody = body;
    lastRevealed = null;
  }
  // abre o caminho até o elemento selecionado (uma vez por seleção,
  // para não desfazer contrações manuais a cada refresh)
  const sel = canvas.getSelected();
  if (sel && sel !== lastRevealed) {
    let p = sel.parentElement;
    while (p && p !== doc.documentElement) { expanded.add(p); p = p.parentElement; }
    lastRevealed = sel;
  }
  treeRoot.appendChild(buildNode(body, 0));
}

function editorNode(n) {
  return n.nodeType !== 1 || SKIP_TAGS.has(n.tagName) ||
    n.classList?.contains('__omni-overlay') || n.hasAttribute?.('data-omni-editor') || n.hasAttribute?.('data-omni-runtime');
}

function childElements(elm) {
  return [...elm.children].filter(c => !editorNode(c));
}

function buildNode(elm, depth) {
  const wrap = el('div', { class: 'layer-node' });
  const kids = childElements(elm);
  const isOpen = expanded.has(elm);

  const row = el('div', { class: 'layer-row' });
  if (canvas.getSelected() === elm) row.classList.add('selected');
  if (elm.style?.display === 'none') row.classList.add('el-hidden');

  const caret = el('button', {
    class: `layer-caret ${isOpen ? 'open' : ''} ${kids.length ? '' : 'hidden-caret'}`,
    html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 5 7 7-7 7"/></svg>',
    onclick: e => {
      e.stopPropagation();
      if (expanded.has(elm)) expanded.delete(elm); else expanded.add(elm);
      refreshLayers();
    },
  });
  row.appendChild(caret);
  row.appendChild(el('span', { class: 'layer-tag', text: prettyName(elm) }));
  const extra = prettyExtra(elm);
  if (extra) row.appendChild(el('span', { class: 'layer-extra', text: extra }));

  const actions = el('div', { class: 'layer-actions' });
  actions.appendChild(el('button', {
    title: t('Mostrar/ocultar'),
    html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    onclick: e => {
      e.stopPropagation();
      checkpoint();
      elm.style.display = elm.style.display === 'none' ? '' : 'none';
      markDirty();
      canvas.refreshBoxes();
      refreshLayers();
    },
  }));
  if (elm !== canvas.getDoc()?.body) {
    actions.appendChild(el('button', {
      title: t('Excluir'),
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m-11 0 1 16h12l1-16"/></svg>',
      onclick: e => { e.stopPropagation(); canvas.deleteElement(elm); },
    }));
  }
  row.appendChild(actions);

  row.addEventListener('click', () => {
    canvas.select(elm);
    elm.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  row.addEventListener('mouseenter', () => { /* highlight opcional */ });

  // drag & drop na árvore
  if (elm !== canvas.getDoc()?.body) {
    row.draggable = true;
    row.addEventListener('dragstart', e => {
      dragSource = elm;
      e.dataTransfer.setData('text/omni-layer', '1');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => { dragSource = null; clearDropHints(); });
  }
  row.addEventListener('dragover', e => {
    if (!dragSource || dragSource === elm || dragSource.contains(elm)) return;
    e.preventDefault();
    e.stopPropagation();
    clearDropHints();
    const rect = row.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    const canNest = childElements(elm).length > 0 || ['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'NAV', 'UL', 'OL', 'BODY'].includes(elm.tagName);
    if (canNest && ratio > 0.3 && ratio < 0.7) {
      row.classList.add('drop-into');
      row.__dropPos = 'inside';
    } else if (ratio <= 0.5) {
      row.parentNode.insertBefore(getDropLineEl(), row);
      row.__dropPos = 'before';
    } else {
      row.parentNode.insertBefore(getDropLineEl(), row.nextSibling);
      row.__dropPos = 'after';
    }
  });
  row.addEventListener('drop', e => {
    if (!dragSource || dragSource === elm || dragSource.contains(elm)) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = row.__dropPos || 'after';
    canvas.moveNode(dragSource, elm, pos);
    dragSource = null;
    clearDropHints();
  });

  wrap.appendChild(row);

  if (kids.length && isOpen) {
    const childWrap = el('div', { class: 'layer-children' });
    for (const k of kids) childWrap.appendChild(buildNode(k, depth + 1));
    wrap.appendChild(childWrap);
  }
  return wrap;
}

let dropLineEl = null;
function getDropLineEl() {
  if (!dropLineEl) dropLineEl = el('div', { class: 'layer-drop-line' });
  return dropLineEl;
}
function clearDropHints() {
  dropLineEl?.remove();
  treeRoot?.querySelectorAll('.drop-into').forEach(r => r.classList.remove('drop-into'));
}
