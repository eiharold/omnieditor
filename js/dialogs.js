// Diálogos do app no lugar de alert/confirm/prompt do navegador.
//
// Mora num módulo próprio (e não em app.js) porque selectors.js e inspector.js
// também precisam deles, e importar app.js criaria dependência circular.

import { $ } from './utils.js';
import { t } from './i18n.js';

// ============================================================
// Pergunta com campo de texto — devolve a string ou null se cancelar
// ============================================================
export function askPrompt({ title, label = '', value = '', placeholder = '' }) {
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

// ============================================================
// Confirmação — devolve true/false
// ============================================================
// `danger: true` pinta o botão de confirmar de vermelho (exclusões).
export function askConfirm({ title, message = '', confirmLabel, cancelLabel, danger = false }) {
  return new Promise(resolve => {
    const modal = $('#confirmModal');
    const ok = $('#confirmOk'), cancel = $('#confirmCancel');
    $('#confirmTitle').textContent = title;
    const msg = $('#confirmMessage');
    msg.textContent = message;
    msg.hidden = !message;
    ok.textContent = confirmLabel || t('Confirmar');
    cancel.textContent = cancelLabel || t('Cancelar');
    ok.classList.toggle('danger', danger);
    modal.hidden = false;
    setTimeout(() => ok.focus(), 30);

    const finish = val => {
      modal.hidden = true;
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      modal.removeEventListener('mousedown', onBackdrop);
      document.removeEventListener('keydown', onKey, true);
      resolve(val);
    };
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onOk(); }
    };
    const onBackdrop = e => { if (e.target === modal) onCancel(); };

    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    modal.addEventListener('mousedown', onBackdrop);
    document.addEventListener('keydown', onKey, true);
  });
}
