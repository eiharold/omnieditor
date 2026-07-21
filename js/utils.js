// Utilitários gerais

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

let uidCounter = 0;
export const uid = () => `o${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

// Resolve um caminho relativo a partir de um caminho base (dentro da pasta do projeto)
export function resolvePath(basePath, rel) {
  // basePath: "sub/pagina.html" ou "" ; rel: "./css/x.css", "../img/a.png", "img/a.png"
  rel = rel.split(/[?#]/)[0];
  if (rel.startsWith('/')) rel = rel.slice(1);
  const baseDir = basePath.includes('/') ? basePath.slice(0, basePath.lastIndexOf('/')) : '';
  const parts = (baseDir ? baseDir.split('/') : []);
  for (const seg of rel.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

export function isExternalURL(url) {
  return /^(https?:)?\/\//i.test(url) || /^(data|blob|mailto|tel|javascript|#)/i.test(url) || url.startsWith('#');
}

// Caminho de `target` relativo à pasta do arquivo HTML (ambos relativos à raiz do projeto)
export function relativePathBetween(htmlPath, target) {
  const baseParts = htmlPath.split('/').slice(0, -1);
  const tParts = target.split('/');
  let i = 0;
  while (i < baseParts.length && baseParts[i] === tParts[i]) i++;
  return '../'.repeat(baseParts.length - i) + tParts.slice(i).join('/');
}

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

// Nome amigável de um elemento para UI
export function prettyName(elm) {
  if (!elm || elm.nodeType !== 1) return '';
  let s = elm.tagName.toLowerCase();
  return s;
}
export function prettyExtra(elm) {
  if (!elm || elm.nodeType !== 1) return '';
  if (elm.id) return `#${elm.id}`;
  const cls = [...elm.classList].filter(c => !c.startsWith('omni-'));
  if (cls.length) return `.${cls[0]}${cls.length > 1 ? ` +${cls.length - 1}` : ''}`;
  const txt = (elm.textContent || '').trim();
  if (txt) return `“${txt.slice(0, 22)}${txt.length > 22 ? '…' : ''}”`;
  return '';
}

// Parse "12px" -> {num:12, unit:'px'}
export function parseUnit(val) {
  if (!val || val === 'auto' || val === 'none') return { num: '', unit: val || '' };
  const m = String(val).match(/^(-?[\d.]+)([a-z%]*)$/i);
  if (!m) return { num: '', unit: '' };
  return { num: parseFloat(m[1]), unit: m[2] || 'px' };
}

// Converte qualquer cor CSS para #rrggbb (para o input color) — retorna null se não der
export function toHex(color) {
  if (!color) return null;
  const c = document.createElement('canvas').getContext('2d');
  c.fillStyle = '#000';
  c.fillStyle = color;
  const v = c.fillStyle;
  if (v.startsWith('#')) return v;
  const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('');
  return null;
}

export function escHTML(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ---- Toasts ----
const icons = {
  ok: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  err: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>',
};
export function toast(msg, type = 'info', ms = 2600) {
  const wrap = $('#toastWrap');
  const t = el('div', { class: `toast ${type}`, html: icons[type] + escHTML(msg) });
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, ms);
}
