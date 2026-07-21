// Estado global do editor + histórico de undo/redo

export const state = {
  fileHandle: null,      // FileSystemFileHandle da página aberta
  dirHandle: null,       // FileSystemDirectoryHandle da pasta do projeto
  filePath: '',          // caminho relativo dentro da pasta (ex.: "index.html")
  fileName: '',
  dirty: false,
  previewMode: false,
  device: 'desktop',
  zoom: '1',
  selected: null,        // elemento selecionado no iframe
};

// ---- Preferências persistentes ----
const PREFS_KEY = 'omni.prefs';
export function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; }
  catch { return {}; }
}
export function savePrefs(patch) {
  const p = { ...loadPrefs(), ...patch };
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

// ---- Eventos simples ----
const listeners = {};
export function on(evt, fn) { (listeners[evt] ??= []).push(fn); }
export function emit(evt, ...args) { (listeners[evt] || []).forEach(fn => fn(...args)); }

// ---- Histórico ----
const MAX_HISTORY = 60;
const undoStack = [];
const redoStack = [];
let lastOpKey = null;
let lastOpTime = 0;
let snapshotFn = null;   // () => snapshot
let restoreFn = null;    // (snapshot) => void

export function initHistory(getSnapshot, restore) {
  snapshotFn = getSnapshot;
  restoreFn = restore;
  undoStack.length = 0;
  redoStack.length = 0;
  lastOpKey = null;
  emit('history');
}

// Chame ANTES de aplicar uma mudança. opKey agrupa mudanças contínuas (ex.: arrastar slider).
export function checkpoint(opKey = null) {
  if (!snapshotFn) return;
  const now = Date.now();
  if (opKey && opKey === lastOpKey && now - lastOpTime < 900) {
    lastOpTime = now;
    return; // agrupa com o checkpoint anterior
  }
  lastOpKey = opKey;
  lastOpTime = now;
  undoStack.push(snapshotFn());
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  emit('history');
}

export function undo() {
  if (!undoStack.length || !snapshotFn) return false;
  redoStack.push(snapshotFn());
  restoreFn(undoStack.pop());
  lastOpKey = null;
  emit('history');
  return true;
}

export function redo() {
  if (!redoStack.length || !snapshotFn) return false;
  undoStack.push(snapshotFn());
  restoreFn(redoStack.pop());
  lastOpKey = null;
  emit('history');
  return true;
}

export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;

export function markDirty(v = true) {
  if (state.dirty === v) return;
  state.dirty = v;
  emit('dirty', v);
}
