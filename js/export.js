// Exportar a página: PNG, PDF ou HTML na área de transferência.
//
// PNG/PDF são rasterizados num iframe invisível com a largura escolhida — e não
// no canvas do editor — para que o resultado não dependa do zoom, do dispositivo
// em uso nem da altura da janela. O iframe recebe o HTML "de renderização"
// (sem a interface do editor, mas com os blob: dos assets já resolvidos).

import { $, $$, toast } from './utils.js';
import { state } from './state.js';
import * as canvas from './canvas.js';
import { t } from './i18n.js';

const HTML2CANVAS_CDN = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
const JSPDF_CDN = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';

// altura máxima do bitmap: acima disso o canvas estoura o limite do navegador
const MAX_CAPTURE_H = 12000;

let format = 'png';
let width = 1440;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some(s => s.src === src)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('falha ao carregar ' + src));
    document.head.appendChild(s);
  });
}

const baseName = () => (state.fileName || 'pagina').replace(/\.html?$/i, '');

function setStatus(msg) {
  const el = $('#exportStatus');
  el.hidden = !msg;
  el.textContent = msg || '';
}

// ============================================================
// Modal
// ============================================================
export function initExport() {
  $('#btnCancelExport').addEventListener('click', closeExport);
  $('#exportModal').addEventListener('click', e => { if (e.target.id === 'exportModal') closeExport(); });
  $('#btnDoExport').addEventListener('click', runExport);

  $$('#exportFormats .export-opt').forEach(b => b.addEventListener('click', () => {
    format = b.dataset.fmt;
    $$('#exportFormats .export-opt').forEach(x => x.classList.toggle('active', x === b));
    // a largura só interessa a quem vira imagem
    $('#exportSizeRow').hidden = format === 'clipboard';
  }));

  $$('#exportSizes .export-opt').forEach(b => b.addEventListener('click', () => {
    width = +b.dataset.w;
    $$('#exportSizes .export-opt').forEach(x => x.classList.toggle('active', x === b));
  }));
}

export function openExport() {
  if (!canvas.getDoc()) return toast(t('Abra uma página primeiro'), 'info');
  // começa na largura do dispositivo que está sendo editado
  const cur = { desktop: 1440, laptop: 1280, tablet: 768, mobile: 375 }[state.device] || 1440;
  width = cur;
  $$('#exportSizes .export-opt').forEach(x => x.classList.toggle('active', +x.dataset.w === cur));
  setStatus('');
  $('#btnDoExport').disabled = false;
  $('#exportModal').hidden = false;
}

function closeExport() {
  $('#exportModal').hidden = true;
  setStatus('');
}

// ============================================================
// Renderização fora da tela
// ============================================================
// Monta um iframe invisível com a largura pedida e devolve o canvas rasterizado.
// O html2canvas MEDE o texto no documento de origem (o iframe) mas PINTA num
// canvas do documento do editor. Se uma fonte existe num e não no outro, as
// larguras divergem e as palavras se sobrepõem ("Auroraé a páginademo").
// Copiar as fontes do editor para o iframe faz os dois concordarem.
const FONT_HOSTS = /fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|fonts\.bunny\.net/;

function copyWebfonts(fdoc) {
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    if (FONT_HOSTS.test(link.href)) fdoc.head.appendChild(link.cloneNode(true));
  }
  for (const style of document.querySelectorAll('style')) {
    if (style.textContent.includes('@font-face')) fdoc.head.appendChild(style.cloneNode(true));
  }
}

async function captureCanvas(w) {
  await loadScript(HTML2CANVAS_CDN);

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  // fora da tela, mas com tamanho real: display:none não renderiza layout
  frame.style.cssText = `position:fixed;left:-10000px;top:0;border:0;width:${w}px;height:800px;`;
  document.body.appendChild(frame);

  try {
    const html = canvas.getRenderHTML();
    await new Promise(resolve => {
      frame.addEventListener('load', resolve, { once: true });
      frame.srcdoc = html;
    });

    const fdoc = frame.contentDocument;
    copyWebfonts(fdoc);

    // Espera fontes e imagens — mas com prazo: uma imagem quebrada pode nunca
    // disparar load nem error, e a exportação ficaria pendurada para sempre.
    const prazo = ms => new Promise(r => setTimeout(r, ms));
    await Promise.race([
      Promise.all([
        fdoc.fonts?.ready?.catch(() => {}),
        ...[...fdoc.images].map(img =>
          img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })),
      ]),
      prazo(8000),
    ]);

    // altura total do conteúdo nessa largura
    const full = Math.max(fdoc.documentElement.scrollHeight, fdoc.body.scrollHeight);
    const h = Math.min(full, MAX_CAPTURE_H);
    frame.style.height = h + 'px';
    await new Promise(r => setTimeout(r, 120));   // deixa o layout assentar

    const bg = getComputedStyle(fdoc.body).backgroundColor;
    const out = await window.html2canvas(fdoc.documentElement, {
      width: w, height: h, windowWidth: w, windowHeight: h,
      scale: Math.min(2, window.devicePixelRatio || 1),
      backgroundColor: bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#ffffff',
      useCORS: true, logging: false,
    });
    return { out, cortado: full > MAX_CAPTURE_H };
  } finally {
    frame.remove();
  }
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ============================================================
// Execução
// ============================================================
async function runExport() {
  const btn = $('#btnDoExport');
  btn.disabled = true;
  try {
    if (format === 'clipboard') {
      await navigator.clipboard.writeText(canvas.serialize());
      toast(t('HTML copiado para a área de transferência'), 'ok');
      return closeExport();
    }

    setStatus(t('Renderizando… isso pode levar alguns segundos.'));
    const { out, cortado } = await captureCanvas(width);

    if (format === 'png') {
      // via data URL: canvas.toBlob depende de callback ocioso e não dispara
      // com a aba em segundo plano — a exportação ficaria pendurada
      const blob = await (await fetch(out.toDataURL('image/png'))).blob();
      download(blob, `${baseName()}-${width}px.png`);
    } else {
      await loadScript(JSPDF_CDN);
      const { jsPDF } = window.jspdf;
      // uma página só, do tamanho exato da captura (em pt, 1px ≈ 0.75pt)
      const wpt = width * 0.75;
      const hpt = (out.height / out.width) * wpt;
      const pdf = new jsPDF({ unit: 'pt', format: [wpt, hpt], orientation: hpt > wpt ? 'p' : 'l' });
      pdf.addImage(out.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, wpt, hpt);
      pdf.save(`${baseName()}-${width}px.pdf`);
    }

    if (cortado) toast(t('A página é muito alta: a exportação foi cortada em {0}px', MAX_CAPTURE_H), 'info', 4000);
    else toast(t('Exportação concluída'), 'ok');
    closeExport();
  } catch (err) {
    console.error(err);
    setStatus('');
    toast(t('Falha ao exportar: {0}', err.message || err), 'err', 4000);
  } finally {
    btn.disabled = false;
  }
}
