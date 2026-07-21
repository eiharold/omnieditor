// Canvas: iframe com a página em edição, seleção visual, drag & drop e serialização

import { resolvePath, isExternalURL, uid } from './utils.js';
import { state, checkpoint, markDirty } from './state.js';
import { injectRuntime } from './animations.js';

let iframe, doc, win;
let overlay, hoverBox, selectBox, selectLabel, selectToolbar, dropLine, dropBox;
let selected = null;
let hovered = null;
let editingEl = null;   // elemento em edição de texto
let movingEl = null;    // elemento sendo movido por drag
let blobURLs = [];
let observer = null;
let accentColor = '#8B5CF6';
let cssFiles = new Map();   // path -> { text (original), links: Set<HTMLLinkElement> }
let cssDirty = new Set();   // paths de CSS externos alterados e ainda não gravados em disco
const blobToOriginal = new Map(); // blob URL -> caminho original (para restaurar em style="" ao salvar)
let userJs = { head: '', body: '' }; // JS personalizado (head / antes de </body>)

const cb = { onSelect: null, onDomChanged: null, onReady: null, onShortcut: null, onContextMenu: null, onTextEditStart: null, onTextEditEnd: null };

const CONTAINER_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'ASIDE', 'NAV', 'UL', 'OL', 'FORM', 'FIGURE', 'BODY']);
const TEXT_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'A', 'BUTTON', 'SPAN', 'LI', 'BLOCKQUOTE', 'FIGCAPTION', 'LABEL', 'STRONG', 'EM', 'B', 'I', 'TD', 'TH', 'DT', 'DD', 'SMALL']);

export function initCanvas(iframeEl, callbacks = {}) {
  iframe = iframeEl;
  Object.assign(cb, callbacks);
}

export const getDoc = () => doc;
export const getSelected = () => selected;

export function setAccentColor(color) {
  accentColor = color;
  if (doc) {
    const st = doc.getElementById('__omni-style');
    if (st) st.textContent = editorCss();
  }
}

// ============================================================
// Abertura de documento
// ============================================================
export async function openDocument(html) {
  // limpa blobs antigos
  blobURLs.forEach(u => URL.revokeObjectURL(u));
  blobURLs = [];
  cssFiles = new Map();
  cssDirty = new Set();
  userJs = { head: '', body: '' };
  selected = hovered = editingEl = movingEl = null;
  if (observer) { observer.disconnect(); observer = null; }

  const parser = new DOMParser();
  const pdoc = parser.parseFromString(html, 'text/html');

  // extrai o JS personalizado e o remove do doc vivo (não deve rodar no editor)
  for (const s of pdoc.querySelectorAll('script[data-omni-userjs]')) {
    const slot = s.getAttribute('data-omni-userjs');
    if (slot === 'head' || slot === 'body') userJs[slot] = s.textContent || '';
    s.remove();
  }

  // marca o ambiente do editor ANTES de qualquer script da página rodar
  const flag = pdoc.createElement('script');
  flag.setAttribute('data-omni-editor', '');
  flag.textContent = 'window.__OMNI_EDITOR__=true;';
  pdoc.head.insertBefore(flag, pdoc.head.firstChild);

  if (state.dirHandle) await rewriteAssets(pdoc);

  const finalHTML = '<!DOCTYPE html>\n' + pdoc.documentElement.outerHTML;

  await new Promise(resolve => {
    const onLoad = () => { iframe.removeEventListener('load', onLoad); resolve(); };
    iframe.addEventListener('load', onLoad);
    const d = iframe.contentDocument;
    d.open();
    d.write(finalHTML);
    d.close();
    // fallback caso 'load' não dispare
    setTimeout(resolve, 2500);
  });

  doc = iframe.contentDocument;
  win = iframe.contentWindow;
  // reassocia os <link> vivos do iframe (o doc.write recria os elementos)
  for (const entry of cssFiles.values()) entry.links = new Set();
  for (const link of doc.querySelectorAll('link[data-omni-orig-href]')) {
    const p = resolvePath(state.filePath, link.getAttribute('data-omni-orig-href'));
    const entry = cssFiles.get(p);
    if (entry) entry.links.add(link);
  }
  setupEditorLayer();
  cb.onReady?.();
}

// Reescreve src/href relativos para blob: URLs lidos da pasta do projeto
async function rewriteAssets(pdoc) {
  const jobs = [];
  const attrList = [['src', 'img, script, source, video, audio, embed'], ['poster', 'video'], ['href', 'link']];
  for (const [attr, sel] of attrList) {
    for (const elm of pdoc.querySelectorAll(sel)) {
      const val = elm.getAttribute(attr);
      if (!val || isExternalURL(val)) continue;
      jobs.push((async () => {
        try {
          const path = resolvePath(state.filePath, val);
          const file = await getFileByPath(state.dirHandle, path);
          let blobUrl;
          if (elm.tagName === 'LINK' && /stylesheet/i.test(elm.rel || '')) {
            const cssText = await file.text();
            const entry = cssFiles.get(path) || { text: cssText, links: new Set() };
            entry.links.add(elm);
            cssFiles.set(path, entry);
            const rewritten = await rewriteCssUrls(cssText, path);
            blobUrl = URL.createObjectURL(new Blob([rewritten], { type: 'text/css' }));
          } else {
            blobUrl = URL.createObjectURL(file);
          }
          blobURLs.push(blobUrl);
          elm.setAttribute(`data-omni-orig-${attr}`, val);
          elm.setAttribute(attr, blobUrl);
        } catch { /* arquivo não encontrado: mantém o caminho original */ }
      })());
    }
  }
  // url(...) dentro de <style> inline da página
  for (const st of pdoc.querySelectorAll('style')) {
    jobs.push((async () => {
      const t = st.textContent || '';
      if (/url\(/i.test(t)) {
        const nt = await rewriteCssUrls(t, state.filePath);
        if (nt !== t) { st.setAttribute('data-omni-orig-style', encodeURIComponent(t)); st.textContent = nt; }
      }
    })());
  }
  // url(...) em style="" de elementos (fundos inline) → blob (restaurado ao salvar)
  for (const elm of pdoc.querySelectorAll('[style*="url("]')) {
    jobs.push((async () => {
      const s = elm.getAttribute('style');
      const ns = await rewriteInlineStyleUrls(s);
      if (ns !== s) elm.setAttribute('style', ns);
    })());
  }
  await Promise.all(jobs);
}

async function rewriteCssUrls(cssText, cssPath) {
  const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  const matches = [...cssText.matchAll(re)];
  const map = new Map();
  await Promise.all(matches.map(async m => {
    const ref = m[2];
    if (isExternalURL(ref) || map.has(ref)) return;
    try {
      const path = resolvePath(cssPath, ref);
      const file = await getFileByPath(state.dirHandle, path);
      const u = URL.createObjectURL(file);
      blobURLs.push(u);
      map.set(ref, u);
    } catch { /* ignora */ }
  }));
  return cssText.replace(re, (full, q, ref) => map.has(ref) ? `url("${map.get(ref)}")` : full);
}

async function getFileByPath(dirHandle, path) {
  const parts = path.split('/').filter(Boolean);
  let dir = dirHandle;
  for (let i = 0; i < parts.length - 1; i++) dir = await dir.getDirectoryHandle(parts[i]);
  const fh = await dir.getFileHandle(parts[parts.length - 1]);
  return fh.getFile();
}

// Lê um arquivo da pasta do projeto (path relativo à raiz da pasta)
export function getProjectFile(path) {
  if (!state.dirHandle) return Promise.reject(new Error('sem pasta aberta'));
  return getFileByPath(state.dirHandle, path);
}

// Resolve um caminho de asset para uma URL utilizável no preview.
// Externos/data/blob voltam como estão; caminhos relativos viram blob
// (registrado para ser restaurado ao caminho original na serialização).
// Lança se o arquivo não existir na pasta.
export async function resolveAssetURL(pathOrURL) {
  if (!pathOrURL || isExternalURL(pathOrURL) || !state.dirHandle) return pathOrURL;
  const file = await getFileByPath(state.dirHandle, resolvePath(state.filePath, pathOrURL));
  const blobUrl = URL.createObjectURL(file);
  blobURLs.push(blobUrl);
  blobToOriginal.set(blobUrl, pathOrURL);
  return blobUrl;
}

// Caminho original de um blob criado por resolveAssetURL (para exibir na UI).
export const getOriginalPath = blobUrl => blobToOriginal.get(blobUrl) || null;

// Restaura em um texto (style inline) os blobs conhecidos para o caminho original.
function restoreBlobsInText(text) {
  if (!text || !text.includes('blob:')) return text;
  return text.replace(/blob:[^\s"')]+/g, m => blobToOriginal.get(m) || m);
}

// Reescreve url(...) relativos dentro de um texto de style inline, resolvendo
// pela pasta do projeto e registrando o mapeamento blob→original.
async function rewriteInlineStyleUrls(styleText) {
  const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  const matches = [...styleText.matchAll(re)];
  const map = new Map();
  await Promise.all(matches.map(async m => {
    const ref = m[2];
    if (isExternalURL(ref) || map.has(ref)) return;
    try {
      const url = await resolveAssetURL(ref);
      if (url !== ref) map.set(ref, url);
    } catch { /* arquivo ausente: mantém o caminho */ }
  }));
  return styleText.replace(re, (full, q, ref) => map.has(ref) ? `url("${map.get(ref)}")` : full);
}

// ============================================================
// Camada do editor (overlay dentro do iframe)
// ============================================================
function editorCss() {
  return `
  .__omni-overlay, .__omni-overlay * { box-sizing: border-box; }
  .__omni-overlay {
    position: absolute; top: 0; left: 0; width: 0; height: 0;
    z-index: 2147483000; pointer-events: none;
    font-family: -apple-system, 'Inter', sans-serif;
  }
  .__omni-box { position: absolute; display: none; }
  .__omni-hover { border: 1.5px solid ${accentColor}; background: ${accentColor}0d; border-radius: 2px; }
  .__omni-select { border: 1.5px solid ${accentColor}; border-radius: 2px; }
  .__omni-label {
    position: absolute; top: -22px; left: -1.5px;
    background: ${accentColor}; color: #fff;
    font-size: 10.5px; font-weight: 600; letter-spacing: .02em;
    padding: 2px 7px; border-radius: 4px 4px 4px 0;
    white-space: nowrap; line-height: 1.5;
  }
  .__omni-toolbar {
    position: absolute; top: -24px; right: -1.5px;
    display: flex; gap: 1px;
    background: ${accentColor}; border-radius: 5px;
    padding: 1px; pointer-events: auto;
  }
  .__omni-toolbar button {
    width: 21px; height: 20px; border: none; background: transparent;
    color: #fff; cursor: pointer; border-radius: 4px;
    display: grid; place-items: center; padding: 0;
  }
  .__omni-toolbar button:hover { background: rgba(255,255,255,.22); }
  .__omni-toolbar svg { width: 12px; height: 12px; fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .__omni-dropline { height: 3px; background: ${accentColor}; border-radius: 3px; box-shadow: 0 0 0 1px #fff3; }
  .__omni-dropbox { border: 2px dashed ${accentColor}; background: ${accentColor}14; border-radius: 4px; }
  [data-omni-editing] { outline: 1.5px dashed ${accentColor} !important; outline-offset: 2px; cursor: text; }
  /* imagens sem origem continuam visíveis e selecionáveis no editor */
  img[src=""], img:not([src]) {
    min-width: 72px !important; min-height: 54px !important;
    background: repeating-conic-gradient(#d4d4de 0% 25%, #f1f1f5 0% 50%);
    background-size: 16px 16px;
    outline: 1px dashed #a0a0b0;
  }
  `;
}

function setupEditorLayer() {
  let st = doc.getElementById('__omni-style');
  if (!st) {
    st = doc.createElement('style');
    st.id = '__omni-style';
    st.setAttribute('data-omni-editor', '');
    doc.head.appendChild(st);
  }
  st.textContent = editorCss();
  createOverlay();
  bindDocEvents();
  startObserver();
}

function createOverlay() {
  doc.querySelectorAll('.__omni-overlay').forEach(n => n.remove());
  overlay = doc.createElement('div');
  overlay.className = '__omni-overlay';
  overlay.setAttribute('data-omni-editor', '');
  overlay.innerHTML = `
    <div class="__omni-box __omni-hover"></div>
    <div class="__omni-box __omni-select">
      <span class="__omni-label"></span>
      <div class="__omni-toolbar">
        <button data-act="drag" title="Arrastar para mover" draggable="true">
          <svg viewBox="0 0 24 24"><path d="M5 9h14M5 15h14"/></svg>
        </button>
        <button data-act="up" title="Mover para cima">
          <svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg>
        </button>
        <button data-act="down" title="Mover para baixo">
          <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <button data-act="dup" title="Duplicar (⌘D)">
          <svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
        </button>
        <button data-act="del" title="Excluir (Delete)">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m-11 0 1 16h12l1-16"/></svg>
        </button>
      </div>
    </div>
    <div class="__omni-box __omni-dropline"></div>
    <div class="__omni-box __omni-dropbox"></div>
  `;
  doc.body.appendChild(overlay);
  hoverBox = overlay.querySelector('.__omni-hover');
  selectBox = overlay.querySelector('.__omni-select');
  selectLabel = overlay.querySelector('.__omni-label');
  selectToolbar = overlay.querySelector('.__omni-toolbar');
  dropLine = overlay.querySelector('.__omni-dropline');
  dropBox = overlay.querySelector('.__omni-dropbox');

  selectToolbar.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn || !selected) return;
    e.stopPropagation();
    const act = btn.dataset.act;
    if (act === 'del') deleteElement(selected);
    else if (act === 'dup') duplicateElement(selected);
    else if (act === 'up') moveElement(selected, -1);
    else if (act === 'down') moveElement(selected, 1);
  });
  const dragBtn = selectToolbar.querySelector('[data-act="drag"]');
  dragBtn.addEventListener('dragstart', e => {
    if (!selected) return;
    movingEl = selected;
    e.dataTransfer.setData('text/omni-move', '1');
    e.dataTransfer.effectAllowed = 'move';
  });
  dragBtn.addEventListener('dragend', () => { movingEl = null; hideDropIndicators(); });
}

function isEditorNode(n) {
  if (!n || n.nodeType !== 1) return false;
  return n.closest('.__omni-overlay, [data-omni-editor]') !== null;
}

function pickTarget(e) {
  let t = e.target;
  if (!t || t.nodeType !== 1) return null;
  if (isEditorNode(t)) return null;
  if (t.tagName === 'HTML') t = doc.body;
  return t;
}

function bindDocEvents() {
  // document.open() (usado ao carregar a página) apaga todos os listeners
  // do documento e da janela — então sempre vincula de novo aqui.

  doc.addEventListener('mousemove', e => {
    if (state.previewMode || editingEl) return;
    const t = pickTarget(e);
    if (!t || t === selected || t === doc.body) { hoverBox.style.display = 'none'; hovered = null; return; }
    hovered = t;
    positionBox(hoverBox, t);
  });

  doc.addEventListener('mouseleave', () => { hoverBox.style.display = 'none'; hovered = null; });

  doc.addEventListener('click', e => {
    if (state.previewMode) return;
    if (isEditorNode(e.target)) return;
    if (editingEl && (e.target === editingEl || editingEl.contains(e.target))) return;
    e.preventDefault();
    e.stopPropagation();
    if (editingEl) stopTextEdit();
    const t = pickTarget(e);
    if (t) select(t);
  }, true);

  doc.addEventListener('dblclick', e => {
    if (state.previewMode) return;
    const t = pickTarget(e);
    if (!t) return;
    e.preventDefault();
    if (canEditText(t)) startTextEdit(t);
  }, true);

  doc.addEventListener('submit', e => { if (!state.previewMode) e.preventDefault(); }, true);

  doc.addEventListener('contextmenu', e => {
    if (state.previewMode) return;
    // durante edição de texto, mantém o menu nativo (colar, corretor…)
    if (editingEl && (e.target === editingEl || editingEl.contains(e.target))) return;
    const t = pickTarget(e);
    if (!t) return;
    e.preventDefault();
    if (editingEl) stopTextEdit();
    select(t);
    // converte para coordenadas da janela do editor (considerando o zoom do canvas)
    const r = iframe.getBoundingClientRect();
    const scale = iframe.offsetWidth ? r.width / iframe.offsetWidth : 1;
    cb.onContextMenu?.(t, r.left + e.clientX * scale, r.top + e.clientY * scale);
  }, true);

  doc.addEventListener('keydown', e => {
    if (editingEl) {
      if (e.key === 'Escape') { e.preventDefault(); stopTextEdit(); }
      return;
    }
    cb.onShortcut?.(e);
  });

  // rAF-throttle: evita reflows repetidos a cada evento de scroll
  let boxRAF = 0;
  const scheduleBoxes = () => {
    if (boxRAF) return;
    boxRAF = win.requestAnimationFrame(() => { boxRAF = 0; refreshBoxes(); });
  };
  win.addEventListener('scroll', scheduleBoxes, { passive: true });
  win.addEventListener('resize', scheduleBoxes);

  // ---- drag & drop (widgets da paleta e movimentação) ----
  doc.addEventListener('dragover', e => {
    if (state.previewMode) return;
    const types = [...(e.dataTransfer?.types || [])];
    if (!types.includes('text/omni-widget') && !types.includes('text/omni-move')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = types.includes('text/omni-move') ? 'move' : 'copy';
    const info = dropInfo(e.clientX, e.clientY);
    showDropIndicator(info);
  });

  doc.addEventListener('dragleave', e => {
    if (e.target === doc.documentElement || !e.relatedTarget) hideDropIndicators();
  });

  doc.addEventListener('drop', e => {
    if (state.previewMode) return;
    e.preventDefault();
    hideDropIndicators();
    const info = dropInfo(e.clientX, e.clientY);
    if (!info) return;
    const widgetHTML = e.dataTransfer.getData('text/omni-widget');
    const isMove = e.dataTransfer.getData('text/omni-move');
    if (widgetHTML) {
      insertHTML(widgetHTML, info.target, info.pos);
    } else if (isMove && movingEl) {
      if (info.target === movingEl || movingEl.contains(info.target)) return;
      checkpoint();
      placeNode(movingEl, info.target, info.pos);
      markDirty();
      select(movingEl);
      cb.onDomChanged?.();
    }
    movingEl = null;
  });
}

function dropInfo(x, y) {
  const t = doc.elementFromPoint(x, y);
  let target = t && !isEditorNode(t) ? t : doc.body;
  if (target.tagName === 'HTML') target = doc.body;
  if (target === doc.body) return { target: doc.body, pos: 'inside' };
  const rect = target.getBoundingClientRect();
  const ratio = rect.height ? (y - rect.top) / rect.height : 0.5;
  const isContainer = CONTAINER_TAGS.has(target.tagName);
  if (isContainer && (target.childElementCount === 0 || (ratio > 0.3 && ratio < 0.7))) {
    return { target, pos: 'inside' };
  }
  return { target, pos: ratio < 0.5 ? 'before' : 'after' };
}

function showDropIndicator(info) {
  if (!info) return hideDropIndicators();
  const rect = info.target.getBoundingClientRect();
  const sx = win.pageXOffset, sy = win.pageYOffset;
  if (info.pos === 'inside') {
    dropLine.style.display = 'none';
    Object.assign(dropBox.style, {
      display: 'block',
      left: rect.left + sx + 'px', top: rect.top + sy + 'px',
      width: rect.width + 'px', height: Math.max(rect.height, 24) + 'px',
    });
  } else {
    dropBox.style.display = 'none';
    const yPos = (info.pos === 'before' ? rect.top : rect.bottom) + sy - 1.5;
    Object.assign(dropLine.style, {
      display: 'block',
      left: rect.left + sx + 'px', top: yPos + 'px',
      width: rect.width + 'px',
    });
  }
}

function hideDropIndicators() {
  if (dropLine) dropLine.style.display = 'none';
  if (dropBox) dropBox.style.display = 'none';
}

function placeNode(node, target, pos) {
  if (pos === 'inside') target.appendChild(node);
  else if (pos === 'before') target.parentNode.insertBefore(node, target);
  else target.parentNode.insertBefore(node, target.nextSibling);
}

// ============================================================
// Seleção
// ============================================================
function positionBox(box, elm) {
  const rect = elm.getBoundingClientRect();
  const sx = win.pageXOffset, sy = win.pageYOffset;
  Object.assign(box.style, {
    display: 'block',
    left: rect.left + sx - 1.5 + 'px',
    top: rect.top + sy - 1.5 + 'px',
    width: rect.width + 3 + 'px',
    height: rect.height + 3 + 'px',
  });
}

export function select(elm) {
  if (elm && (elm.nodeType !== 1 || isEditorNode(elm))) return;
  selected = elm || null;
  state.selected = selected;
  if (selected) {
    selectLabel.textContent = selected.tagName.toLowerCase() + (selected.id ? `#${selected.id}` : '');
    positionBox(selectBox, selected);
    hoverBox.style.display = 'none';
    // label acima corta no topo da página → joga para dentro
    const rect = selected.getBoundingClientRect();
    const flip = rect.top + win.pageYOffset < 26;
    selectLabel.style.top = flip ? '2px' : '-22px';
    selectToolbar.style.top = flip ? '2px' : '-24px';
  } else {
    selectBox.style.display = 'none';
  }
  cb.onSelect?.(selected);
}

export function deselect() { select(null); }

export function refreshBoxes() {
  if (selected) {
    if (!doc.contains(selected)) { select(null); return; }
    positionBox(selectBox, selected);
  }
  if (hovered && doc.contains(hovered)) positionBox(hoverBox, hovered);
  else if (hoverBox) hoverBox.style.display = 'none';
}

// ============================================================
// Edição de texto inline
// ============================================================
function canEditText(elm) {
  if (TEXT_TAGS.has(elm.tagName)) return true;
  return elm.childElementCount === 0 && elm.textContent !== undefined;
}

// Converte o retângulo de um elemento do iframe para coordenadas da janela pai
function elmRectInParent(elm) {
  const r = elm.getBoundingClientRect();
  const ir = iframe.getBoundingClientRect();
  const scale = iframe.offsetWidth ? ir.width / iframe.offsetWidth : 1;
  return { left: ir.left + r.left * scale, top: ir.top + r.top * scale, width: r.width * scale, height: r.height * scale };
}

export function startTextEdit(elm) {
  if (editingEl === elm) return;
  if (editingEl) stopTextEdit();
  checkpoint('textedit-' + uid());
  editingEl = elm;
  elm.setAttribute('contenteditable', 'true');   // rich (negrito/itálico/span)
  elm.setAttribute('data-omni-editing', '');
  elm.setAttribute('spellcheck', 'false');
  elm.focus();
  const onInput = () => markDirty();
  const onBlur = () => { if (!blurSuspended) stopTextEdit(); };
  elm.addEventListener('input', onInput);
  elm.addEventListener('blur', onBlur);
  elm.__omniCleanup = () => {
    elm.removeEventListener('input', onInput);
    elm.removeEventListener('blur', onBlur);
  };
  hoverBox.style.display = 'none';
  selectBox.style.display = 'none';
  cb.onTextEditStart?.(elm, elmRectInParent(elm));
}

export function stopTextEdit() {
  if (!editingEl) return;
  const elm = editingEl;
  editingEl = null;
  elm.__omniCleanup?.();
  delete elm.__omniCleanup;
  elm.removeAttribute('contenteditable');
  elm.removeAttribute('data-omni-editing');
  elm.removeAttribute('spellcheck');
  elm.blur?.();
  if (selected) positionBox(selectBox, selected);
  cb.onTextEditEnd?.();
  cb.onDomChanged?.();
}

export const isEditingText = () => !!editingEl;
export const isTextEditable = elm => elm && canEditText(elm);

// ---- seleção preservada (para abrir modais sem perder o trecho marcado) ----
let blurSuspended = false;
let savedRange = null;

// Suspende o encerramento da edição por blur (enquanto um modal está aberto)
export function suspendTextEditBlur(v) { blurSuspended = v; }

export function captureSelection() {
  if (!win || !editingEl) return null;
  const sel = win.getSelection();
  savedRange = (sel && sel.rangeCount) ? sel.getRangeAt(0).cloneRange() : null;
  return savedRange;
}

export function restoreSelection() {
  if (!win || !savedRange || !editingEl) return false;
  editingEl.focus();
  const sel = win.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedRange);
  return true;
}

// ---- formatação de texto rico (chamado pela barra flutuante) ----
export function execFormat(cmd, val = null) {
  if (!editingEl || !doc) return;
  editingEl.focus();
  try { doc.execCommand(cmd, false, val); } catch { /* comando indisponível */ }
  markDirty();
  cb.onTextEditStart?.(editingEl, elmRectInParent(editingEl)); // reposiciona a barra
}

export function wrapSelectionInSpan(cls) {
  if (!editingEl || !win) return;
  const sel = win.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const span = doc.createElement('span');
  if (cls) span.className = cls;
  try { range.surroundContents(span); }
  catch { span.appendChild(range.extractContents()); range.insertNode(span); }
  markDirty();
}

// ============================================================
// Operações estruturais
// ============================================================
export function insertHTML(html, target = null, pos = 'inside') {
  if (!doc) return null;
  checkpoint();
  const tpl = doc.createElement('template');
  tpl.innerHTML = html.trim();
  const nodes = [...tpl.content.children];
  if (!nodes.length) return null;
  target = target || selected || doc.body;
  if (target === doc.body) pos = 'inside';
  for (const n of nodes) placeNode(n, target, pos);
  markDirty();
  select(nodes[0]);
  cb.onDomChanged?.();
  return nodes[0];
}

export function deleteElement(elm) {
  if (!elm || elm === doc.body || elm.tagName === 'HTML') return;
  checkpoint();
  const parent = elm.parentElement;
  elm.remove();
  markDirty();
  select(parent && parent !== doc.body ? parent : null);
  cb.onDomChanged?.();
}

export function duplicateElement(elm) {
  if (!elm || elm === doc.body) return;
  checkpoint();
  const clone = elm.cloneNode(true);
  clone.removeAttribute('id');
  elm.parentNode.insertBefore(clone, elm.nextSibling);
  markDirty();
  select(clone);
  cb.onDomChanged?.();
}

export function moveElement(elm, dir) {
  if (!elm || elm === doc.body) return;
  const sib = dir < 0 ? elm.previousElementSibling : elm.nextElementSibling;
  if (!sib || isEditorNode(sib)) return;
  checkpoint();
  if (dir < 0) sib.parentNode.insertBefore(elm, sib);
  else sib.parentNode.insertBefore(sib, elm);
  markDirty();
  refreshBoxes();
  cb.onDomChanged?.();
}

export function moveNode(node, target, pos) {
  if (!node || node === target || node.contains(target)) return;
  checkpoint();
  placeNode(node, target, pos);
  markDirty();
  refreshBoxes();
  cb.onDomChanged?.();
}

// ============================================================
// Arquivos CSS externos (edição e gravação em disco)
// ============================================================
export function getCssFiles() {
  return Object.fromEntries([...cssFiles].map(([p, v]) => [p, v.text]));
}

export function getCssFileText(path) {
  return cssFiles.get(path)?.text ?? null;
}

// Atualiza o texto de um CSS externo: regenera o blob para preview imediato
// e marca o arquivo como pendente de gravação em disco.
export async function updateCssFile(path, text) {
  const entry = cssFiles.get(path);
  if (!entry || entry.text === text) return;
  entry.text = text;
  cssDirty.add(path);
  const rewritten = state.dirHandle ? await rewriteCssUrls(text, path) : text;
  const blobUrl = URL.createObjectURL(new Blob([rewritten], { type: 'text/css' }));
  blobURLs.push(blobUrl);
  for (const link of entry.links) link.setAttribute('href', blobUrl);
}

export const getDirtyCssPaths = () => [...cssDirty];
export const clearDirtyCss = () => cssDirty.clear();

// Grava o texto atual do CSS no arquivo original dentro da pasta do projeto
export async function writeCssFile(path) {
  const entry = cssFiles.get(path);
  if (!entry || !state.dirHandle) return false;
  const parts = path.split('/').filter(Boolean);
  let dir = state.dirHandle;
  for (let i = 0; i < parts.length - 1; i++) dir = await dir.getDirectoryHandle(parts[i]);
  const fh = await dir.getFileHandle(parts[parts.length - 1]);
  const writable = await fh.createWritable();
  await writable.write(entry.text);
  await writable.close();
  return true;
}

// Reescreve url(...) relativos de um texto CSS (para <style> inline editados)
export async function rewriteCssText(text, basePath) {
  return state.dirHandle ? rewriteCssUrls(text, basePath) : text;
}

// ============================================================
// CSS personalizado (persistido na página)
// ============================================================
export function getCustomCssTag(create = true) {
  if (!doc) return null;
  let tag = doc.querySelector('style[data-omni-custom]');
  if (!tag && create) {
    tag = doc.createElement('style');
    tag.setAttribute('data-omni-custom', '');
    doc.head.appendChild(tag);
  }
  return tag;
}
export function getCustomCss() {
  return getCustomCssTag(false)?.textContent || '';
}
export function setCustomCss(css) {
  const tag = getCustomCssTag(true);
  if (tag) tag.textContent = css;
}

// ---- JS personalizado (head / antes de </body>) ----
export const getUserJs = slot => userJs[slot] || '';
export function setUserJs(slot, code) {
  if (slot === 'head' || slot === 'body') { userJs[slot] = code; markDirty(); }
}

// ============================================================
// Observer (mudanças estruturais → atualiza camadas)
// ============================================================
let observerPaused = false;
export function pauseObserver(v) { observerPaused = v; }

function startObserver() {
  observer = new MutationObserver(muts => {
    if (observerPaused) return;
    const relevant = muts.some(m =>
      !isEditorNode(m.target) &&
      ![...m.addedNodes, ...m.removedNodes].every(n => n.nodeType === 1 && isEditorNode(n))
    );
    if (relevant) cb.onDomChanged?.();
  });
  observer.observe(doc.body, { childList: true, subtree: true });
}

// ============================================================
// Snapshot (undo/redo)
// ============================================================
function cleanBodyClone() {
  const clone = doc.body.cloneNode(true);
  clone.querySelectorAll('[data-omni-editor], .__omni-overlay').forEach(n => n.remove());
  return clone;
}

// Caminho do elemento até o body, como índices entre irmãos. Elementos do
// editor (overlay etc.) são ignorados na contagem: eles não existem no
// snapshot, então incluí-los deslocaria os índices na volta.
const contentChildren = parent =>
  [...parent.children].filter(n => !n.hasAttribute('data-omni-editor') && !n.classList.contains('__omni-overlay'));

function nodePath(elm) {
  if (!elm || !doc || elm === doc.body) return null;
  const path = [];
  let n = elm;
  while (n && n !== doc.body) {
    const p = n.parentElement;
    if (!p) return null;
    const i = contentChildren(p).indexOf(n);
    if (i < 0) return null;
    path.unshift(i);
    n = p;
  }
  return path;
}

function nodeAtPath(path) {
  if (!path || !doc) return null;
  let n = doc.body;
  for (const i of path) {
    n = contentChildren(n)[i];
    if (!n) return null;
  }
  return n;
}

function headStyleTags() {
  return [...doc.head.querySelectorAll('style')]
    .filter(t => !t.hasAttribute('data-omni-editor') && !t.hasAttribute('data-omni-custom'));
}

export function getSnapshot() {
  const attrs = {};
  for (const a of doc.body.attributes) attrs[a.name] = a.value;
  return {
    body: cleanBodyClone().innerHTML,
    css: getCustomCss(),
    bodyAttrs: attrs,
    // <style> do head (os do body já vão no snapshot do body)
    headStyles: headStyleTags().map(t => ({ text: t.textContent, orig: t.getAttribute('data-omni-orig-style') })),
    // strings são imutáveis: guardar referências aqui custa quase nada
    cssTexts: Object.fromEntries([...cssFiles].map(([p, v]) => [p, v.text])),
    userJs: { ...userJs },
    // para reselecionar o mesmo elemento depois do desfazer
    selPath: nodePath(selected),
  };
}

export function restoreSnapshot(snap) {
  if (!doc) return;
  editingEl = null;
  // o elemento selecionado é destruído pelo innerHTML abaixo; guarda o caminho
  // para reselecionar o equivalente e não jogar o usuário fora do painel
  const wantPath = nodePath(selected) || snap.selPath;
  select(null);
  pauseObserver(true);
  doc.body.innerHTML = snap.body;
  for (const a of [...doc.body.attributes]) doc.body.removeAttribute(a.name);
  for (const [k, v] of Object.entries(snap.bodyAttrs || {})) doc.body.setAttribute(k, v);
  setCustomCss(snap.css);
  headStyleTags().forEach((t, i) => {
    const s = snap.headStyles?.[i];
    if (!s) return;
    t.textContent = s.text;
    if (s.orig != null) t.setAttribute('data-omni-orig-style', s.orig);
    else t.removeAttribute('data-omni-orig-style');
  });
  for (const [p, txt] of Object.entries(snap.cssTexts || {})) {
    if (cssFiles.has(p) && cssFiles.get(p).text !== txt) updateCssFile(p, txt);
  }
  if (snap.userJs) userJs = { ...snap.userJs };
  createOverlay();
  pauseObserver(false);
  markDirty();
  // se o elemento ainda existe nesta versão, volta a selecioná-lo
  const again = nodeAtPath(wantPath);
  if (again) select(again);
  cb.onDomChanged?.();
}

// HTML para RENDERIZAR (exportar como imagem/PDF), não para salvar: tira a
// interface do editor mas mantém os blob: já resolvidos, senão os assets
// relativos não carregariam fora da pasta do projeto.
export function getRenderHTML() {
  if (!doc) return '';
  const root = doc.documentElement.cloneNode(true);
  root.querySelectorAll('[data-omni-editor], .__omni-overlay').forEach(n => n.remove());
  root.querySelectorAll('*').forEach(n => {
    n.removeAttribute('contenteditable');
    for (const a of [...n.attributes]) {
      if (a.name.startsWith('data-omni-orig-')) n.removeAttribute(a.name);
    }
  });
  return '<!DOCTYPE html>' + root.outerHTML;
}

// ============================================================
// Serialização (para salvar/exportar)
// ============================================================
export function serialize() {
  if (!doc) return '';
  const root = doc.documentElement.cloneNode(true);

  // remove tudo que é do editor
  root.querySelectorAll('[data-omni-editor], .__omni-overlay').forEach(n => n.remove());

  // restaura URLs originais
  for (const attr of ['src', 'href', 'poster']) {
    root.querySelectorAll(`[data-omni-orig-${attr}]`).forEach(n => {
      n.setAttribute(attr, n.getAttribute(`data-omni-orig-${attr}`));
      n.removeAttribute(`data-omni-orig-${attr}`);
    });
  }
  // restaura <style> inline reescritos
  root.querySelectorAll('style[data-omni-orig-style]').forEach(n => {
    n.textContent = decodeURIComponent(n.getAttribute('data-omni-orig-style'));
    n.removeAttribute('data-omni-orig-style');
  });

  // remove atributos transitórios do editor (mantém data-omni-custom e data-omni-runtime)
  root.querySelectorAll('*').forEach(n => {
    for (const a of [...n.attributes]) {
      if (a.name.startsWith('data-omni-') && a.name !== 'data-omni-custom' && a.name !== 'data-omni-runtime') {
        n.removeAttribute(a.name);
      }
    }
    n.removeAttribute('contenteditable');
    // sobras neutras do preview do GSAP
    for (const p of ['translate', 'rotate', 'scale']) {
      if (n.style && n.style.getPropertyValue(p) === 'none') n.style.removeProperty(p);
    }
    // restaura blobs de fundo inline para o caminho original
    const style = n.getAttribute('style');
    if (style && style.includes('blob:')) {
      const restored = restoreBlobsInText(style);
      if (restored !== style) n.setAttribute('style', restored);
    }
    if (n.getAttribute('style') === '') n.removeAttribute('style');
  });

  // restaura blobs (ex.: imagem de fundo em :hover) e remove tag vazia
  const customTag = root.querySelector('style[data-omni-custom]');
  if (customTag) customTag.textContent = restoreBlobsInText(customTag.textContent);
  if (customTag && !customTag.textContent.trim()) customTag.remove();

  // injeta/atualiza runtime GSAP se houver animações
  injectRuntime(root);

  // injeta o JS personalizado (marcado, executa normal fora do editor)
  const mkUserScript = (slot, code) => {
    const s = doc.createElement('script');
    s.setAttribute('data-omni-userjs', slot);
    s.textContent = code;
    return s;
  };
  const rootHead = root.querySelector('head');
  const rootBody = root.querySelector('body');
  if (userJs.head.trim() && rootHead) rootHead.appendChild(mkUserScript('head', userJs.head));
  if (userJs.body.trim() && rootBody) rootBody.appendChild(mkUserScript('body', userJs.body));

  return '<!DOCTYPE html>\n' + root.outerHTML;
}
