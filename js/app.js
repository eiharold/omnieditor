// OmniEditor — orquestração da interface

import { $, $$, el, toast, debounce } from './utils.js';
import { state, loadPrefs, savePrefs, initHistory, checkpoint, undo, redo, canUndo, canRedo, on, markDirty } from './state.js';
import { WIDGETS, SECTIONS } from './widgets.js';
import * as canvas from './canvas.js';
import { initLayers, refreshLayers } from './layers.js';
import { initInspector, renderInspector, renderPageSettings } from './inspector.js';
import { BLANK_PAGE, DEMO_PAGE } from './demo.js';
import * as versions from './versions.js';
import { initSelectors, refreshSelectors } from './selectors.js';
import { initDesign, renderStylesTab } from './design.js';
import { t, getLang, setLang, LANGS, applyStaticI18n, onLangChange } from './i18n.js';
import * as session from './session.js';

const hasFS = 'showDirectoryPicker' in window;
const isTouch = matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 760px)').matches;
const APP_VERSION = '1.0.0';

// ============================================================
// Tema e aparência
// ============================================================
function applyTheme(theme, accent) {
  document.body.dataset.theme = theme;
  document.body.dataset.accent = accent;
  $$('#themeToggle button').forEach(b => b.classList.toggle('active', b.dataset.thm === theme));
  $$('#accentSwatches button').forEach(b => b.classList.toggle('active', b.dataset.accent === accent));
  savePrefs({ theme, accent });
  requestAnimationFrame(() => {
    const color = getComputedStyle(document.body).getPropertyValue('--accent').trim();
    canvas.setAccentColor(color);
  });
}

function initTheme() {
  const prefs = loadPrefs();
  applyTheme(prefs.theme || 'dark', prefs.accent || 'purple');

  $('#btnSettings').addEventListener('click', e => {
    e.stopPropagation();
    const pop = $('#settingsPopover');
    pop.hidden = !pop.hidden;
  });
  document.addEventListener('click', e => {
    const pop = $('#settingsPopover');
    if (!pop.hidden && !pop.contains(e.target) && !$('#btnSettings').contains(e.target)) pop.hidden = true;
  });
  $('#themeToggle').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) applyTheme(b.dataset.thm, document.body.dataset.accent);
  });
  $('#accentSwatches').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) applyTheme(document.body.dataset.theme, b.dataset.accent);
  });

  // Idioma
  const langSel = $('#langSelect');
  langSel.innerHTML = '';
  for (const [code, name] of Object.entries(LANGS)) langSel.appendChild(el('option', { value: code, text: name }));
  langSel.value = getLang();
  langSel.addEventListener('change', () => { setLang(langSel.value); savePrefs({ lang: langSel.value }); });

  // Sobre o OmniEditor
  $('#btnAbout').addEventListener('click', () => { $('#settingsPopover').hidden = true; $('#aboutModal').hidden = false; });
  $('#btnCloseAbout').addEventListener('click', () => { $('#aboutModal').hidden = true; });
  $('#aboutModal').addEventListener('click', e => { if (e.target.id === 'aboutModal') $('#aboutModal').hidden = true; });
}

// ============================================================
// Paleta de widgets
// ============================================================
// Estado de expansão dos grupos de elementos
const elGroupOpen = { components: true, sections: false };

function makeWidgetItem(w, isSection) {
  const item = el('div', { class: 'widget-item', draggable: 'true', html: w.icon + `<span>${t(w.label)}</span>` });
  item.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/omni-widget', w.html);
    e.dataTransfer.effectAllowed = 'copy';
  });
  item.addEventListener('click', () => {
    if (!canvas.getDoc()) return toast(t('Abra uma página primeiro'), 'info');
    const sel = canvas.getSelected();
    // seções entram no nível do body por padrão; componentes após a seleção
    canvas.insertHTML(w.html, isSection ? null : (sel || null), sel && !isSection ? 'after' : 'inside');
    toast(t('{0} adicionado', t(w.label)), 'ok', 1400);
    if (isNarrow()) closeDrawers();
  });
  return item;
}

function elementGroup(key, title, items, isSection) {
  const open = elGroupOpen[key];
  const group = el('div', { class: `el-group ${open ? 'open' : ''}` });
  const head = el('button', {
    class: 'el-group-head',
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 5 7 7-7 7"/></svg>${t(title)}<span class="el-count">${items.length}</span>`,
    onclick: () => { elGroupOpen[key] = !elGroupOpen[key]; group.classList.toggle('open', elGroupOpen[key]); },
  });
  const grid = el('div', { class: `widgets-grid ${isSection ? 'sections' : ''}` });
  items.forEach(w => grid.appendChild(makeWidgetItem(w, isSection)));
  group.append(head, el('div', { class: 'el-group-body' }, [grid]));
  return group;
}

function renderElements() {
  const root = $('#elementsGroups');
  root.innerHTML = '';
  root.appendChild(elementGroup('components', 'Componentes', WIDGETS, false));
  root.appendChild(elementGroup('sections', 'Seções', SECTIONS, true));
}

// ============================================================
// Abas laterais
// ============================================================
function initTabs() {
  $$('.side-tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.side-tab[data-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('#leftSidebar .side-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
      if (tab.dataset.tab === 'layers') refreshLayers();
      if (tab.dataset.tab === 'selectors') refreshSelectors();
    });
  });
  $$('.side-tab[data-itab]').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.side-tab[data-itab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.itab-panel').forEach(p => p.classList.toggle('active', p.dataset.ipanel === tab.dataset.itab));
    });
  });
  $$('.itab-panel').forEach(p => p.classList.toggle('active', p.dataset.ipanel === 'style'));
}

// ============================================================
// Breadcrumbs
// ============================================================
function renderBreadcrumbs(elm) {
  const bar = $('#breadcrumbs');
  bar.innerHTML = '';
  if (!elm) return;
  const chain = [];
  let cur = elm;
  while (cur && cur.tagName !== 'HTML') { chain.unshift(cur); cur = cur.parentElement; }
  chain.forEach((node, i) => {
    if (i > 0) bar.appendChild(el('span', { class: 'crumb-sep', text: '›' }));
    const label = node.tagName.toLowerCase() + (node.id ? `#${node.id}` : (node.classList[0] ? `.${node.classList[0]}` : ''));
    const b = el('button', { class: 'crumb' + (node === elm ? ' current' : ''), text: label });
    b.addEventListener('click', () => canvas.select(node));
    bar.appendChild(b);
  });
}

// ============================================================
// Dispositivos e zoom
// ============================================================
const DEVICE_WIDTHS = { desktop: null, laptop: 1280, tablet: 768, mobile: 375 };

// No modo de visualização, a view que corresponde ao aparelho onde o editor
// está aberto ocupa a tela toda: a moldura existe para delimitar um tamanho
// diferente do real, e aqui o tamanho JÁ é o real. As outras views continuam
// com moldura e cantos arredondados, que é o que dá a noção do recorte.
const isNativeView = () => state.device === (isTouch ? 'mobile' : 'desktop');

function applyDevice() {
  const frame = $('#deviceFrame');
  const scroll = $('#canvasScroll');

  const fullBleed = state.previewMode && isNativeView();
  document.body.classList.toggle('preview-full', fullBleed);
  if (fullBleed) {
    frame.style.width = frame.style.flexBasis = '100%';
    frame.style.height = '100%';
    frame.style.transform = '';
    setTimeout(() => canvas.refreshBoxes?.(), 260);
    return;
  }

  let w = state.device === 'custom' ? state.customWidth : DEVICE_WIDTHS[state.device];
  // em telas de toque, "desktop" ganha largura fixa para poder ser visto reduzido
  if (isTouch && state.device === 'desktop') w = 1440;
  const cssW = w ? w + 'px' : '100%';
  frame.style.width = cssW;
  frame.style.flexBasis = cssW;  // flex-basis explícito (width sozinho colapsa no flex)

  let scale = 1;
  const avail = scroll.clientWidth - (isTouch ? 24 : 56);
  const frameW = w || avail;
  if (state.zoom === 'fit') scale = Math.min(1, avail / frameW);
  else scale = parseFloat(state.zoom) || 1;

  frame.style.transform = scale === 1 ? '' : `scale(${scale})`;
  const availH = scroll.clientHeight - 56;
  frame.style.height = scale === 1 ? availH + 'px' : (availH / scale) + 'px';
  setTimeout(() => canvas.refreshBoxes?.(), 260);
}

const DEVICE_ICONS = {
  desktop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/></svg>',
  tablet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>',
  mobile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/></svg>',
};
const DEVICE_LABELS = { desktop: 'Desktop', laptop: 'Laptop', tablet: 'Tablet', mobile: 'Mobile' };

// Define o dispositivo e sincroniza as duas UIs (botões + seletor mobile),
// re-renderizando o inspector para os valores computados naquele breakpoint.
function setDevice(dev) {
  state.device = dev;
  $('#deviceWidthInput').value = '';
  $$('#deviceBtns button').forEach(x => x.classList.toggle('active', x.dataset.device === dev));
  $('#devicePickerIcon').innerHTML = DEVICE_ICONS[dev] || DEVICE_ICONS.desktop;
  applyDevice();
  // aguarda a transição de largura para ler o computed style no novo tamanho
  if (canvas.getSelected()) setTimeout(() => renderInspector(canvas.getSelected()), 300);
}

function toggleDeviceMenu() {
  const menu = $('#deviceMenu');
  if (!menu.hidden) { menu.hidden = true; return; }
  menu.innerHTML = '';
  for (const [dev, label] of Object.entries(DEVICE_LABELS)) {
    const item = el('button', {
      class: 'dd-item' + (state.device === dev ? ' active' : ''),
      html: DEVICE_ICONS[dev] + `<span>${t(label)}</span>`,
    });
    item.addEventListener('click', () => { menu.hidden = true; setDevice(dev); });
    menu.appendChild(item);
  }
  menu.hidden = false;
  const r = $('#btnDevicePicker').getBoundingClientRect();
  const vw = document.documentElement.clientWidth || window.innerWidth || 9999;
  menu.style.top = r.bottom + 6 + 'px';
  menu.style.left = Math.max(8, Math.min(r.left, vw - menu.offsetWidth - 8)) + 'px';
}
function hideDeviceMenu() { $('#deviceMenu').hidden = true; }

function initDevices() {
  $('#deviceBtns').addEventListener('click', e => {
    const b = e.target.closest('button[data-device]');
    if (b) setDevice(b.dataset.device);
  });
  $('#btnDevicePicker').addEventListener('click', e => { e.stopPropagation(); toggleDeviceMenu(); });
  $('#devicePickerIcon').innerHTML = DEVICE_ICONS[state.device] || DEVICE_ICONS.desktop;
  $('#deviceWidthInput').addEventListener('change', e => {
    const v = parseInt(e.target.value);
    if (v >= 240) {
      state.device = 'custom';
      state.customWidth = v;
      $$('#deviceBtns button').forEach(x => x.classList.remove('active'));
      applyDevice();
      if (canvas.getSelected()) setTimeout(() => renderInspector(canvas.getSelected()), 300);
    }
  });
  $('#zoomSelect').addEventListener('change', e => {
    state.zoom = e.target.value;
    applyDevice();
  });
  window.addEventListener('resize', debounce(() => {
    applyDevice();
    // ao voltar para desktop, reexibe o painel direito e fecha gavetas
    if (!matchMedia('(max-width: 1100px)').matches) document.body.classList.remove('no-right');
    if (!isNarrow()) closeDrawers();
    syncInspectorBtn();
  }, 150));
}

// ============================================================
// Abertura de arquivos
// ============================================================
async function collectHtmlFiles(dirHandle, prefix = '', depth = 0, out = []) {
  if (depth > 3) return out;
  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    if (handle.kind === 'file' && /\.html?$/i.test(name)) {
      out.push({ path: prefix + name, handle });
    } else if (handle.kind === 'directory') {
      await collectHtmlFiles(handle, prefix + name + '/', depth + 1, out);
    }
  }
  return out;
}

async function openFolder() {
  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const files = await collectHtmlFiles(dirHandle);
    if (!files.length) return toast(t('Nenhum arquivo .html encontrado nessa pasta'), 'err');
    state.dirHandle = dirHandle;
    state.folderFiles = files;
    if (files.length === 1) {
      await openFileEntry(files[0]);
    } else {
      showFileModal(files);
    }
  } catch (err) {
    if (err.name !== 'AbortError') toast(t('Não foi possível abrir a pasta'), 'err');
  }
}

function showFileModal(files) {
  const modal = $('#fileModal');
  const list = $('#fileList');
  list.innerHTML = '';
  files.sort((a, b) => a.path.localeCompare(b.path));
  for (const f of files) {
    const name = f.path.split('/').pop();
    const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '';
    const item = el('button', {
      class: 'file-item',
      html: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg><span>${name}</span><span class="fi-path">${dir}</span>`,
    });
    item.addEventListener('click', async () => {
      modal.hidden = true;
      await openFileEntry(f);
    });
    list.appendChild(item);
  }
  modal.hidden = false;
}

async function openFileEntry({ path, handle }) {
  const file = await handle.getFile();
  const html = await file.text();
  state.fileHandle = handle;
  state.filePath = path;
  state.fileName = file.name;
  await loadDocument(html);
  persistSession();
  toast(t('{0} aberto', file.name), 'ok');
}

async function openSingleFile() {
  if (hasFS) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: t('Páginas HTML'), accept: { 'text/html': ['.html', '.htm'] } }],
      });
      state.dirHandle = null;
      await openFileEntry({ path: handle.name, handle });
      toast(t('Dica: abra a pasta do projeto para carregar CSS/JS externos'), 'info', 4000);
    } catch (err) {
      if (err.name !== 'AbortError') toast(t('Não foi possível abrir o arquivo'), 'err');
    }
  } else {
    $('#fileInput').click();
  }
}

// Guarda o ponteiro para a página atual (para reabrir ao recarregar).
function persistSession() {
  if (state.fileHandle) {
    session.saveSession({
      fileHandle: state.fileHandle, dirHandle: state.dirHandle,
      filePath: state.filePath, fileName: state.fileName,
    });
  }
}

const fileKey = () => state.filePath || state.fileName || 'sem-titulo';

async function loadDocument(html, { versionLabel = 'Versão aberta' } = {}) {
  await canvas.openDocument(html);
  initHistory(canvas.getSnapshot, canvas.restoreSnapshot);
  state.dirty = false;
  updateDirtyUI();

  $('#welcomeOverlay').style.display = 'none';
  document.body.classList.add('has-doc');
  $('#fileInfo').hidden = false;
  $('#fileName').textContent = state.fileName || t('sem título');
  // seletor de arquivo aparece quando a pasta tem mais de um HTML
  $('#btnFileSwitch').hidden = !(state.dirHandle && state.folderFiles && state.folderFiles.length > 1);
  $('#customCssArea').value = canvas.getCustomCss();

  renderInspector(null);
  refreshLayers();
  refreshSelectors();
  renderBreadcrumbs(null);
  applyDevice();

  // registra no histórico de edições (ignorado se idêntica à última versão)
  versions.addVersion({ fileKey: fileKey(), fileName: state.fileName, label: versionLabel, html: canvas.serialize() });
}

// Dropdown de troca de arquivo (ao lado do nome)
function toggleFileMenu() {
  const menu = $('#fileMenu');
  if (!menu.hidden) { menu.hidden = true; return; }
  menu.innerHTML = '';
  const files = (state.folderFiles || []).slice().sort((a, b) => a.path.localeCompare(b.path));
  for (const f of files) {
    const active = f.path === state.filePath;
    const item = el('button', {
      class: 'dd-item' + (active ? ' active' : ''),
      html: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg><span>${f.path}</span>`,
    });
    item.addEventListener('click', async () => {
      menu.hidden = true;
      if (f.path !== state.filePath) {
        if (state.dirty && !confirm(t('Descartar alterações não salvas e abrir outro arquivo?'))) return;
        await openFileEntry(f);
      }
    });
    menu.appendChild(item);
  }
  menu.hidden = false;
  const r = $('#btnFileSwitch').getBoundingClientRect();
  menu.style.top = r.bottom + 6 + 'px';
  menu.style.left = r.left + 'px';
}
function hideFileMenu() { $('#fileMenu').hidden = true; }

// ============================================================
// Salvar / exportar
// ============================================================
async function saveFile() {
  if (!canvas.getDoc()) return;
  const html = canvas.serialize();
  try {
    if (state.fileHandle?.createWritable) {
      if (state.fileHandle.requestPermission) {
        const perm = await state.fileHandle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') return toast(t('Permissão de escrita negada'), 'err');
      }
      const writable = await state.fileHandle.createWritable();
      await writable.write(html);
      await writable.close();
      // grava também os arquivos CSS externos editados
      let cssSaved = 0;
      for (const path of canvas.getDirtyCssPaths()) {
        try {
          if (await canvas.writeCssFile(path)) cssSaved++;
        } catch {
          toast(t('Não foi possível gravar {0}', path), 'err');
        }
      }
      canvas.clearDirtyCss();
      markDirty(false);
      updateDirtyUI();
      versions.addVersion({ fileKey: fileKey(), fileName: state.fileName, label: 'Salvamento', html });
      toast(cssSaved ? t('Página + {0} CSS salvos ✓', cssSaved) : t('Página salva ✓'), 'ok');
    } else if (window.showSaveFilePicker) {
      await saveFileAs();
    } else {
      exportFile();
    }
  } catch (err) {
    if (err.name !== 'AbortError') toast(t('Erro ao salvar: {0}', err.message), 'err');
  }
}

// Salvar como: sempre escolhe um novo arquivo de destino.
async function saveFileAs() {
  if (!canvas.getDoc()) return;
  if (!window.showSaveFilePicker) return exportFile();
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: state.fileName || 'pagina.html',
      types: [{ description: t('Página HTML'), accept: { 'text/html': ['.html'] } }],
    });
    state.fileHandle = handle;
    state.fileName = handle.name;
    // "Salvar como" cria arquivo novo isolado: solta a pasta antiga p/ não gravar CSS alheio
    state.dirHandle = null;
    state.filePath = handle.name;
    $('#fileName').textContent = handle.name;
    $('#fileInfo').hidden = false;
    persistSession();
    await saveFile();
  } catch (err) {
    if (err.name !== 'AbortError') toast(t('Erro ao salvar: {0}', err.message), 'err');
  }
}

function exportFile() {
  if (!canvas.getDoc()) return;
  const html = canvas.serialize();
  const blob = new Blob([html], { type: 'text/html' });
  const a = el('a', { href: URL.createObjectURL(blob), download: state.fileName || 'pagina.html' });
  a.click();
  URL.revokeObjectURL(a.href);
  versions.addVersion({ fileKey: fileKey(), fileName: state.fileName, label: 'Exportação', html });
  toast(t('HTML exportado'), 'ok');
}

function updateDirtyUI() {
  $('#dirtyDot').hidden = !state.dirty;
}

// ============================================================
// Modo de visualização: oculta os painéis laterais E desliga os marcadores
// de edição, deixando a página se comportar como para o visitante.
// ============================================================
function togglePreview() {
  state.previewMode = !state.previewMode;
  $('#btnPreview').classList.toggle('active', state.previewMode);
  document.body.classList.toggle('zen', state.previewMode);
  if (state.previewMode) {
    canvas.deselect();
    closeDrawers();   // no mobile os painéis são gavetas
    toast(t('Modo visualização — links e interações ativos'), 'info', 2200);
  }
  applyDevice();
}

// ============================================================
// Copiar / colar elementos
// ============================================================
let clipboardHTML = null;

function copySelected() {
  const sel = canvas.getSelected();
  if (!sel) return false;
  clipboardHTML = sel.outerHTML;
  toast(t('<{0}> copiado', sel.tagName.toLowerCase()), 'ok', 1400);
  return true;
}

function pasteClipboard() {
  if (!clipboardHTML || !canvas.getDoc()) return false;
  const node = canvas.insertHTML(clipboardHTML, canvas.getSelected() || null, canvas.getSelected() ? 'after' : 'inside');
  if (node) {
    // evita IDs duplicados ao colar
    for (const n of [node, ...node.querySelectorAll('[id]')]) {
      if (n.id && canvas.getDoc().querySelectorAll(`[id="${n.id}"]`).length > 1) n.removeAttribute('id');
    }
    toast(t('Elemento colado'), 'ok', 1400);
  }
  return true;
}

// ============================================================
// Menu de contexto (botão direito nos elementos do canvas)
// ============================================================
const ICONS = {
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V5h16v2M12 5v14m-3 0h6"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  cut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.5 15.5M14.7 14.7 20 20M8.5 8.5l3.2 3.2"/></svg>',
  paste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>',
  dup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="13" height="13" rx="2"/><path d="M19 8v11a2 2 0 0 1-2 2H8"/></svg>',
  del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m-11 0 1 16h12l1-16"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>',
  parent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="m8 12 4-4 4 4M12 8v12"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  selector: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 6-6 6 6 6M16 6l6 6-6 6"/></svg>',
  html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>',
  anim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m13 2-8 12h6l-2 8 8-12h-6l2-8Z"/></svg>',
};

function cssPathOf(elm) {
  if (elm.id) return `#${elm.id}`;
  const parts = [];
  let cur = elm;
  while (cur && cur.tagName !== 'BODY' && parts.length < 4) {
    if (cur.id) { parts.unshift(`#${cur.id}`); break; }
    let seg = cur.tagName.toLowerCase();
    const cls = [...cur.classList].find(c => !c.startsWith('omni-'));
    if (cls) seg += `.${cls}`;
    parts.unshift(seg);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}

function hideContextMenu() {
  $('#ctxMenu').hidden = true;
}

function switchInspectorTab(tab) {
  $$('.side-tab[data-itab]').forEach(t => t.classList.toggle('active', t.dataset.itab === tab));
  $$('.itab-panel').forEach(p => p.classList.toggle('active', p.dataset.ipanel === tab));
}

function showContextMenu(elm, x, y) {
  const menu = $('#ctxMenu');
  menu.innerHTML = '';
  const doc = canvas.getDoc();
  const hidden = elm.style.display === 'none';

  const item = (icon, label, action, { kbd = '', disabled = false, danger = false } = {}) => {
    const b = el('button', { class: 'ctx-item' + (danger ? ' danger' : ''), html: ICONS[icon] + escName(t(label)) + (kbd ? `<span class="kbd">${kbd}</span>` : '') });
    b.disabled = disabled;
    b.addEventListener('click', () => { hideContextMenu(); action(); });
    menu.appendChild(b);
  };
  const escName = s => `<span>${s}</span>`;
  const sep = () => menu.appendChild(el('div', { class: 'ctx-sep' }));

  menu.appendChild(el('div', { class: 'ctx-head', text: cssPathOf(elm) || elm.tagName.toLowerCase() }));

  if (canvas.isTextEditable(elm)) item('text', 'Editar texto', () => canvas.startTextEdit(elm), { kbd: '2× clique' });
  item('copy', 'Copiar', copySelected, { kbd: '⌘C' });
  item('cut', 'Recortar', () => { if (copySelected()) canvas.deleteElement(elm); }, { kbd: '⌘X' });
  item('paste', 'Colar depois', pasteClipboard, { kbd: '⌘V', disabled: !clipboardHTML });
  item('dup', 'Duplicar', () => canvas.duplicateElement(elm), { kbd: '⌘D' });
  sep();
  item('up', 'Mover para cima', () => canvas.moveElement(elm, -1), { disabled: !elm.previousElementSibling });
  item('down', 'Mover para baixo', () => canvas.moveElement(elm, 1), { disabled: !elm.nextElementSibling || elm.nextElementSibling.hasAttribute('data-omni-editor') });
  item('parent', 'Selecionar elemento pai', () => canvas.select(elm.parentElement), { disabled: !elm.parentElement || elm.parentElement === doc.documentElement });
  sep();
  item('eye', hidden ? 'Mostrar elemento' : 'Ocultar elemento', () => {
    checkpoint();
    elm.style.display = hidden ? '' : 'none';
    markDirty();
    canvas.refreshBoxes();
    refreshLayers();
  });
  item('selector', 'Copiar seletor CSS', () => {
    const path = cssPathOf(elm);
    navigator.clipboard?.writeText(path)
      .then(() => toast(t('Seletor copiado: {0}', path), 'ok'))
      .catch(() => toast(path, 'info', 5000));
  });
  item('anim', 'Animação…', () => switchInspectorTab('anim'));
  item('html', 'Editar HTML…', () => switchInspectorTab('advanced'));
  sep();
  item('del', 'Excluir', () => canvas.deleteElement(elm), { kbd: 'Del', danger: true });

  menu.hidden = false;
  // mantém o menu dentro da janela
  const vw = document.documentElement.clientWidth || window.innerWidth || Infinity;
  const vh = document.documentElement.clientHeight || window.innerHeight || Infinity;
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  menu.style.left = Math.max(8, Math.min(x, vw - mw - 8)) + 'px';
  menu.style.top = Math.max(8, Math.min(y, vh - mh - 8)) + 'px';
}

// ============================================================
// Histórico de edições (versões)
// ============================================================
function fmtDate(ts) {
  return new Date(ts).toLocaleString(getLang(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function fmtSize(bytes) {
  return bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';
}

async function openHistoryModal() {
  if (!canvas.getDoc()) return toast(t('Abra uma página primeiro'), 'info');
  const modal = $('#historyModal');
  const list = $('#historyList');
  const all = await versions.listVersions(fileKey());
  $('#historyInfo').textContent = all.length
    ? t('{0} versão(ões) de {1} — guardadas localmente no navegador (máx. 30)', all.length, state.fileName)
    : '';
  list.innerHTML = '';
  if (!all.length) {
    list.appendChild(el('div', { class: 'history-empty', text: t('Nenhuma versão registrada ainda. Versões são gravadas ao abrir, salvar e exportar.') }));
  }
  for (const v of all) {
    const item = el('div', { class: 'history-item' });
    const main = el('div', { class: 'hi-main' }, [
      el('div', { class: 'hi-label', text: t(v.label) }),
      el('div', { class: 'hi-meta', text: `${fmtDate(v.ts)} · ${fmtSize(v.size)}` }),
    ]);
    const actions = el('div', { class: 'hi-actions' });
    actions.appendChild(el('button', {
      class: 'icon-btn', title: t('Restaurar esta versão'),
      html: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
      onclick: async () => {
        if (state.dirty && !confirm(t('Substituir as alterações atuais pela versão selecionada?'))) return;
        modal.hidden = true;
        await loadDocument(v.html, { versionLabel: 'Restauração' });
        markDirty(true);
        updateDirtyUI();
        toast(t('Versão de {0} restaurada — salve para gravar no arquivo', fmtDate(v.ts)), 'ok', 3200);
      },
    }));
    actions.appendChild(el('button', {
      class: 'icon-btn', title: t('Baixar esta versão'),
      html: '<svg viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 21h16"/></svg>',
      onclick: () => {
        const blob = new Blob([v.html], { type: 'text/html' });
        const a = el('a', { href: URL.createObjectURL(blob), download: (v.fileName || 'pagina.html').replace(/\.html?$/i, '') + `-${new Date(v.ts).toISOString().slice(0, 16).replace(/[:T]/g, '-')}.html` });
        a.click();
        URL.revokeObjectURL(a.href);
      },
    }));
    actions.appendChild(el('button', {
      class: 'icon-btn', title: t('Excluir do histórico'),
      html: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m-11 0 1 16h12l1-16"/></svg>',
      onclick: async () => {
        await versions.deleteVersion(v.id);
        openHistoryModal();
      },
    }));
    item.append(main, actions);
    list.appendChild(item);
  }
  modal.hidden = false;
}

// ============================================================
// Painel do documento (Geral / CSS / JS)
// ============================================================
function openDocTab(tab) {
  $$('.doc-tab').forEach(b => b.classList.toggle('active', b.dataset.dtab === tab));
  $$('.doc-panel').forEach(p => p.classList.toggle('active', p.dataset.dpanel === tab));
  if (tab === 'general') renderPageSettings($('#docGeneral'));
  if (tab === 'styles') renderStylesTab($('#docStyles'));
}

function openDocPanel(tab = 'general') {
  if (!canvas.getDoc()) return toast(t('Abra uma página primeiro'), 'info');
  const drawer = $('#docDrawer');
  drawer.hidden = false;
  $('#btnCss').classList.add('active');
  $('#customCssArea').value = canvas.getCustomCss();
  $('#userJsHead').value = canvas.getUserJs('head');
  $('#userJsBody').value = canvas.getUserJs('body');
  openDocTab(tab);
}

// Mantém o painel do documento em dia quando a página muda por fora dele
// (desfazer/refazer, edição de regra no painel de CSS…).
function syncDocPanel() {
  if ($('#docDrawer').hidden || !canvas.getDoc()) return;
  const custom = canvas.getCustomCss();
  if ($('#customCssArea').value !== custom) $('#customCssArea').value = custom;
  // só a aba Estilos: a Geral tem campos de texto que perderiam o foco se
  // fossem re-renderizados enquanto o usuário digita
  if ($('.doc-tab.active')?.dataset.dtab === 'styles') renderStylesTab($('#docStyles'));
}

function closeDocPanel() {
  $('#docDrawer').hidden = true;
  $('#btnCss').classList.remove('active');
}

function initDocPanel() {
  $('#btnCss').addEventListener('click', () => {
    if ($('#docDrawer').hidden) openDocPanel('general'); else closeDocPanel();
  });
  $('#btnCloseDoc').addEventListener('click', closeDocPanel);
  $$('.doc-tab').forEach(b => b.addEventListener('click', () => openDocTab(b.dataset.dtab)));

  $('#customCssArea').addEventListener('input', debounce(e => {
    checkpoint('customcss');
    canvas.setCustomCss(e.target.value);
    markDirty(); updateDirtyUI(); refreshSelectors();
  }, 200));
  $('#userJsHead').addEventListener('input', debounce(e => {
    checkpoint('userjshead'); canvas.setUserJs('head', e.target.value); updateDirtyUI();
  }, 250));
  $('#userJsBody').addEventListener('input', debounce(e => {
    checkpoint('userjsbody'); canvas.setUserJs('body', e.target.value); updateDirtyUI();
  }, 250));
}

// ============================================================
// Responsividade (gavetas em telas pequenas)
// ============================================================
const isNarrow = () => matchMedia('(max-width: 760px)').matches;

function openDrawer(side) {
  document.body.classList.add('drawer-open', `drawer-${side}`);
  document.body.classList.remove(`drawer-${side === 'left' ? 'right' : 'left'}`);
  $('#mobileBackdrop').hidden = false;
  syncInspectorBtn();
}
function openLeftDrawer() { openDrawer('left'); }
function openInspectorDrawer() { openDrawer('right'); }
function closeDrawers() {
  document.body.classList.remove('drawer-open', 'drawer-left', 'drawer-right');
  $('#mobileBackdrop').hidden = true;
  syncInspectorBtn();
}

// Abre/fecha o painel de edição (direita): gaveta no toque, coluna no desktop
function toggleInspector() {
  if (isNarrow()) {
    if (document.body.classList.contains('drawer-right')) closeDrawers();
    else openInspectorDrawer();
  } else {
    document.body.classList.toggle('no-right');
    applyDevice();
    syncInspectorBtn();
  }
}
function syncInspectorBtn() {
  const open = isNarrow()
    ? document.body.classList.contains('drawer-right')
    : !document.body.classList.contains('no-right');
  $('#btnInspector').classList.toggle('active', open);
}

// Menu do botão Salvar
function toggleSaveMenu() {
  const m = $('#saveMenu');
  if (!m.hidden) return hideSaveMenu();
  m.hidden = false;
  const r = $('#btnSaveMenu').getBoundingClientRect();
  const vw = document.documentElement.clientWidth || window.innerWidth || 9999;
  m.style.top = r.bottom + 6 + 'px';
  m.style.left = Math.max(8, Math.min(r.right - m.offsetWidth, vw - m.offsetWidth - 8)) + 'px';
}
function hideSaveMenu() { $('#saveMenu').hidden = true; }

// ============================================================
// Barra de texto rico (aparece ao editar texto)
// ============================================================
function showRteToolbar(elm, rect) {
  const tb = $('#rteToolbar');
  tb.hidden = false;
  const tbw = tb.offsetWidth, tbh = tb.offsetHeight;
  const vw = document.documentElement.clientWidth || window.innerWidth || 9999;
  let top = rect.top - tbh - 8;
  if (top < 52) top = rect.top + 8;
  let left = Math.max(8, Math.min(rect.left, vw - tbw - 8));
  tb.style.top = top + 'px';
  tb.style.left = left + 'px';
}
function hideRteToolbar() { $('#rteToolbar').hidden = true; }

// Modal de entrada no estilo do app (substitui o prompt do navegador)
function askPrompt({ title, label = '', value = '', placeholder = '' }) {
  return new Promise(resolve => {
    const modal = $('#promptModal'), input = $('#promptInput');
    $('#promptTitle').textContent = title;
    $('#promptLabel').textContent = label;
    $('#promptLabel').style.display = label ? '' : 'none';
    input.value = value;
    input.placeholder = placeholder;
    modal.hidden = false;
    setTimeout(() => { input.focus(); input.select(); }, 30);

    const finish = val => {
      modal.hidden = true;
      $('#promptOk').removeEventListener('click', onOk);
      $('#promptCancel').removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKey);
      modal.removeEventListener('mousedown', onBackdrop);
      resolve(val);
    };
    const onOk = () => finish(input.value.trim());
    const onCancel = () => finish(null);
    const onKey = e => {
      if (e.key === 'Enter') { e.preventDefault(); onOk(); }
      else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    };
    const onBackdrop = e => { if (e.target === modal) onCancel(); };

    $('#promptOk').addEventListener('click', onOk);
    $('#promptCancel').addEventListener('click', onCancel);
    input.addEventListener('keydown', onKey);
    modal.addEventListener('mousedown', onBackdrop);
  });
}

function initRte() {
  $$('#rteToolbar button').forEach(btn => {
    // preventDefault mantém a seleção viva no iframe; capturamos para restaurar
    // depois de um modal (que rouba o foco).
    btn.addEventListener('mousedown', e => { e.preventDefault(); canvas.captureSelection(); });
    btn.addEventListener('click', async () => {
      const cmd = btn.dataset.rte;
      if (cmd === 'link' || cmd === 'span') {
        canvas.suspendTextEditBlur(true);   // não encerra a edição ao abrir o modal
        const isLink = cmd === 'link';
        const val = await askPrompt(isLink
          ? { title: t('Inserir link'), label: t('URL do link:'), value: 'https://', placeholder: 'https://' }
          : { title: t('Envolver em span com classe'), label: t('Classe do span (opcional):'), placeholder: 'destaque' });
        canvas.restoreSelection();
        canvas.suspendTextEditBlur(false);
        if (val === null) return;
        if (isLink) { if (val) canvas.execFormat('createLink', val); }
        else canvas.wrapSelectionInSpan(val);
      } else {
        canvas.execFormat(cmd);
      }
    });
  });
}

// ============================================================
// Barra inferior (celular)
// ============================================================
// No celular a barra do topo fica só com identidade + ações de saída
// (logo, tamanho da tela, visualizar, salvar) e as ferramentas de edição
// descem para uma barra fixa embaixo, ao alcance do polegar.
//
// Os botões não são duplicados: os nós reais são movidos de uma barra para a
// outra, então listeners, estado `.active` e traduções continuam valendo.
const BOTTOM_BAR_ITEMS = [
  '#btnMenuLeft', '.history-btns', '#btnHistory', '#btnCss', '#btnSettings', '#btnInspector',
];
let barHome = null;   // onde cada item mora no layout largo

function syncBarLayout() {
  const bar = $('#bottomBar');
  if (!bar) return;

  // primeira chamada: memoriza a posição original de cada item
  barHome ??= BOTTOM_BAR_ITEMS.map(sel => {
    const node = $(sel);
    return node && { node, parent: node.parentNode, next: node.nextSibling };
  }).filter(Boolean);

  const narrow = isNarrow();
  bar.hidden = !narrow;

  if (narrow) {
    for (const sel of BOTTOM_BAR_ITEMS) {
      const node = $(sel);
      if (node && node.parentNode !== bar) bar.appendChild(node);
    }
  } else {
    // devolve na ordem inversa para que os `next` guardados ainda existam
    for (const { node, parent, next } of [...barHome].reverse()) {
      if (node.parentNode !== parent) parent.insertBefore(node, next);
    }
  }
}

function initMobile() {
  syncBarLayout();
  addEventListener('resize', debounce(syncBarLayout, 150));

  // gavetas: handlers sempre ativos (o CSS decide quando os botões aparecem)
  $('#btnMenuLeft')?.addEventListener('click', () => {
    if (document.body.classList.contains('drawer-left')) closeDrawers();
    else openLeftDrawer();
  });
  $('#mobileBackdrop')?.addEventListener('click', closeDrawers);
  syncInspectorBtn();

  if (!isTouch) return;
  // em telas de toque a visão padrão é mobile, com zoom "ajustar" para caber
  state.device = 'mobile';
  state.zoom = 'fit';
  $('#zoomSelect').value = 'fit';
  $$('#deviceBtns button').forEach(x => x.classList.toggle('active', x.dataset.device === 'mobile'));
  $('#devicePickerIcon').innerHTML = DEVICE_ICONS.mobile;
}

// ============================================================
// Idioma: re-renderiza tudo que tem texto ao trocar
// ============================================================
function relocalize() {
  applyStaticI18n(document);
  renderElements();
  renderInspector(canvas.getSelected());
  refreshLayers();
  refreshSelectors();
  if (!$('#docDrawer').hidden) {
    const dtab = $('.doc-tab.active')?.dataset.dtab;
    if (dtab === 'general') renderPageSettings($('#docGeneral'));
    if (dtab === 'styles') renderStylesTab($('#docStyles'));
  }
  $('#langSelect').value = getLang();
}

// ============================================================
// Sessão: reabrir o último arquivo/pasta ao recarregar
// ============================================================
async function tryRestoreSession() {
  const s = await session.loadSession();
  if (!s?.fileHandle) return false;
  const perm = s.fileHandle.queryPermission ? await s.fileHandle.queryPermission({ mode: 'read' }) : 'granted';
  if (perm === 'granted') {
    await reopenFromSession(s);
    return true;
  }
  // permissão precisa de gesto do usuário → oferece botão na tela inicial
  offerReopen(s);
  return false;
}

async function reopenFromSession(s) {
  try {
    if (s.dirHandle) { state.dirHandle = s.dirHandle; }
    await openFileEntry({ path: s.filePath || s.fileHandle.name, handle: s.fileHandle });
  } catch { /* arquivo movido/removido: ignora e mantém a tela inicial */ }
}

function offerReopen(s) {
  const row = $('#reopenRow');
  if (!row) return;
  row.hidden = false;
  const btn = $('#btnReopen');
  btn.textContent = t('Reabrir {0}', s.fileName || s.fileHandle.name);
  btn.onclick = async () => {
    const perm = await s.fileHandle.requestPermission({ mode: 'read' });
    if (perm === 'granted') { row.hidden = true; await reopenFromSession(s); }
    else toast(t('Permissão negada'), 'err');
  };
}

// ============================================================
// Atalhos de teclado
// ============================================================
function handleShortcut(e) {
  const mod = e.metaKey || e.ctrlKey;
  const inInput = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || canvas.isEditingText();

  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(); return; }
  if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); togglePreview(); return; }
  if (mod && e.key.toLowerCase() === 'z') {
    if (inInput) return;
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return;
  }
  if (inInput) return;
  if (mod && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    if (canvas.getSelected()) canvas.duplicateElement(canvas.getSelected());
    return;
  }
  if (mod && e.key.toLowerCase() === 'c') {
    if (copySelected()) e.preventDefault();
    return;
  }
  if (mod && e.key.toLowerCase() === 'x') {
    if (canvas.getSelected() && copySelected()) {
      e.preventDefault();
      canvas.deleteElement(canvas.getSelected());
    }
    return;
  }
  if (mod && e.key.toLowerCase() === 'v') {
    if (clipboardHTML) {
      e.preventDefault();
      pasteClipboard();
    }
    return;
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && canvas.getSelected()) {
    e.preventDefault();
    canvas.deleteElement(canvas.getSelected());
    return;
  }
  if (e.key === 'Escape') {
    if (!$('#ctxMenu').hidden) hideContextMenu();
    else canvas.deselect();
  }
}

// ============================================================
// Inicialização
// ============================================================
function init() {
  // idioma antes de qualquer render de texto
  const prefs = loadPrefs();
  if (prefs.lang && LANGS[prefs.lang]) setLang(prefs.lang);
  document.documentElement.lang = getLang();
  applyStaticI18n(document);
  onLangChange(relocalize);

  $('#aboutVersion').textContent = 'v' + APP_VERSION;

  initTheme();
  renderElements();
  initTabs();
  initDevices();
  initDocPanel();
  initInspector();
  initMobile();
  initRte();
  initLayers($('#layersTree'));
  initSelectors({
    onChanged: source => {
      // mantém o textarea do CSS personalizado em sincronia
      if (source?.kind === 'custom') $('#customCssArea').value = canvas.getCustomCss();
      updateDirtyUI();
    },
  });
  initDesign({
    onChanged: () => {
      $('#customCssArea').value = canvas.getCustomCss();
      updateDirtyUI();
      refreshSelectors();
    },
  });

  const domChanged = debounce(() => {
    refreshLayers();
    refreshSelectors();
    canvas.refreshBoxes();
    updateDirtyUI();
    syncDocPanel();
  }, 200);

  canvas.initCanvas($('#canvasFrame'), {
    onSelect: elm => {
      hideContextMenu();
      renderInspector(elm);
      renderBreadcrumbs(elm);
      refreshLayers();
      if (elm && isNarrow()) openInspectorDrawer();
    },
    onDomChanged: domChanged,
    onShortcut: handleShortcut,
    onContextMenu: showContextMenu,
    onTextEditStart: showRteToolbar,
    onTextEditEnd: hideRteToolbar,
  });

  // fecha menus flutuantes ao clicar fora, rolar ou perder o foco
  document.addEventListener('click', () => { hideContextMenu(); hideSaveMenu(); hideFileMenu(); hideDeviceMenu(); });
  document.addEventListener('scroll', () => { hideContextMenu(); hideSaveMenu(); }, true);
  window.addEventListener('blur', () => { hideContextMenu(); hideSaveMenu(); });
  $('#btnFileSwitch').addEventListener('click', e => { e.stopPropagation(); toggleFileMenu(); });

  // tela inicial (welcome) — também acessível pelo botão Abrir
  const showWelcome = () => { $('#welcomeOverlay').style.display = ''; };
  const hideWelcome = () => { if (canvas.getDoc()) $('#welcomeOverlay').style.display = 'none'; };
  $('#btnOpenFolder').addEventListener('click', () => hasFS ? openFolder() : toast(t('Seu navegador não suporta abrir pastas — use o Chrome/Edge'), 'err', 4000));
  $('#btnOpenFile').addEventListener('click', openSingleFile);
  $('#btnNewPage').addEventListener('click', async () => {
    state.fileHandle = null; state.dirHandle = null; state.filePath = ''; state.fileName = 'nova-pagina.html';
    session.clearSession();
    await loadDocument(BLANK_PAGE);
  });
  $('#btnDemoPage').addEventListener('click', async () => {
    state.fileHandle = null; state.dirHandle = null; state.filePath = ''; state.fileName = 'demo.html';
    session.clearSession();
    await loadDocument(DEMO_PAGE);
  });
  $('#btnCancelFile').addEventListener('click', () => { $('#fileModal').hidden = true; });
  $('#btnCloseWelcome').addEventListener('click', hideWelcome);

  // Salvar (+ menu: Abrir / Salvar / Salvar como) e painel de edição
  $('#btnSave').addEventListener('click', saveFile);
  $('#btnSaveMenu').addEventListener('click', e => { e.stopPropagation(); toggleSaveMenu(); });
  $('#miOpen').addEventListener('click', () => { hideSaveMenu(); showWelcome(); });
  $('#miSave').addEventListener('click', () => { hideSaveMenu(); saveFile(); });
  $('#miSaveAs').addEventListener('click', () => { hideSaveMenu(); saveFileAs(); });
  $('#btnInspector').addEventListener('click', toggleInspector);
  $('#btnPreview').addEventListener('click', togglePreview);
  $('#btnHistory').addEventListener('click', openHistoryModal);
  $('#btnCloseHistory').addEventListener('click', () => { $('#historyModal').hidden = true; });
  $('#btnUndo').addEventListener('click', undo);
  $('#btnRedo').addEventListener('click', redo);

  // fallback: input file (navegadores sem File System Access)
  $('#fileInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    state.fileHandle = null; state.dirHandle = null; state.filePath = file.name; state.fileName = file.name;
    await loadDocument(await file.text());
  });

  // soltar arquivo .html na tela de boas-vindas
  const welcome = $('#welcomeOverlay');
  welcome.addEventListener('dragover', e => { e.preventDefault(); welcome.classList.add('dragover'); });
  welcome.addEventListener('dragleave', () => welcome.classList.remove('dragover'));
  welcome.addEventListener('drop', async e => {
    e.preventDefault();
    welcome.classList.remove('dragover');
    const file = [...e.dataTransfer.files].find(f => /\.html?$/i.test(f.name));
    if (!file) return toast(t('Solte um arquivo .html'), 'err');
    const handle = e.dataTransfer.items[0]?.getAsFileSystemHandle ? await e.dataTransfer.items[0].getAsFileSystemHandle() : null;
    state.fileHandle = handle?.kind === 'file' ? handle : null;
    state.dirHandle = null;
    state.filePath = file.name;
    state.fileName = file.name;
    await loadDocument(await file.text());
  });

  on('history', () => {
    $('#btnUndo').disabled = !canUndo();
    $('#btnRedo').disabled = !canRedo();
  });
  on('dirty', updateDirtyUI);

  document.addEventListener('keydown', handleShortcut);
  window.addEventListener('beforeunload', e => {
    if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // reabre a última página (se a permissão persistir entre recarregamentos)
  tryRestoreSession();
}

init();
