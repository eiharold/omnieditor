// Animações GSAP: presets, preview no canvas e runtime injetado na página salva

export const GSAP_CDN = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js';
export const SCROLLTRIGGER_CDN = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js';

// Cada preset define os "vars" de gsap.from()
export const ANIM_PRESETS = {
  fadeIn:      { label: 'Fade In',            from: { opacity: 0 } },
  fadeInUp:    { label: 'Fade In ↑',          from: { opacity: 0, y: 48 } },
  fadeInDown:  { label: 'Fade In ↓',          from: { opacity: 0, y: -48 } },
  fadeInLeft:  { label: 'Fade In ←',          from: { opacity: 0, x: 48 } },
  fadeInRight: { label: 'Fade In →',          from: { opacity: 0, x: -48 } },
  zoomIn:      { label: 'Zoom In',            from: { opacity: 0, scale: 0.7 } },
  zoomOut:     { label: 'Zoom Out',           from: { opacity: 0, scale: 1.3 } },
  slideUp:     { label: 'Slide ↑',            from: { y: 100 } },
  slideLeft:   { label: 'Slide ←',            from: { x: 120 } },
  slideRight:  { label: 'Slide →',            from: { x: -120 } },
  rotateIn:    { label: 'Rotate In',          from: { opacity: 0, rotation: -12, scale: 0.9 } },
  flipUp:      { label: 'Flip ↑',             from: { opacity: 0, rotationX: -80, transformOrigin: '50% 100%' } },
  blurIn:      { label: 'Blur In',            from: { opacity: 0, filter: 'blur(12px)' } },
  bounceIn:    { label: 'Bounce In',          from: { opacity: 0, scale: 0.3 }, defaultEase: 'bounce.out' },
};

export const EASES = [
  'power1.out', 'power2.out', 'power3.out', 'power4.out',
  'power1.inOut', 'power2.inOut', 'power3.inOut',
  'back.out(1.7)', 'elastic.out(1, 0.4)', 'bounce.out',
  'expo.out', 'expo.inOut', 'sine.out', 'sine.inOut', 'circ.out', 'none',
];

export const ANIM_ATTR = 'data-anim'; // persistido na página salva

export function getAnim(elm) {
  try { return JSON.parse(elm.getAttribute(ANIM_ATTR)) || null; }
  catch { return null; }
}

export function setAnim(elm, cfg) {
  if (!cfg || !cfg.preset) elm.removeAttribute(ANIM_ATTR);
  else elm.setAttribute(ANIM_ATTR, JSON.stringify(cfg));
}

export function defaultAnim() {
  return {
    preset: 'fadeInUp',
    duration: 0.8,
    delay: 0,
    ease: 'power2.out',
    trigger: 'scroll',   // 'load' | 'scroll'
    once: true,
    repeat: 0,
    yoyo: false,
    stagger: false,      // anima os filhos em sequência
    staggerEach: 0.12,
    custom: '',          // JSON opcional de vars gsap.from
  };
}

// Monta os vars do gsap.from a partir da config
export function buildVars(cfg) {
  const preset = ANIM_PRESETS[cfg.preset] || ANIM_PRESETS.fadeIn;
  let vars = { ...preset.from };
  if (cfg.custom) {
    try { vars = { ...vars, ...JSON.parse(cfg.custom) }; } catch { /* JSON inválido: ignora */ }
  }
  vars.duration = +cfg.duration || 0.8;
  vars.ease = cfg.ease || preset.defaultEase || 'power2.out';
  if (+cfg.repeat) { vars.repeat = +cfg.repeat; vars.yoyo = !!cfg.yoyo; }
  return vars;
}

// ---- Preview dentro do canvas do editor ----
let gsapLoading = null;
export function ensureGsap(doc) {
  const win = doc.defaultView;
  if (win.gsap && win.ScrollTrigger) return Promise.resolve(win.gsap);
  if (gsapLoading) return gsapLoading;
  gsapLoading = new Promise((resolve, reject) => {
    let pending = 2;
    const done = () => { if (--pending === 0) { gsapLoading = null; resolve(win.gsap); } };
    for (const src of [GSAP_CDN, SCROLLTRIGGER_CDN]) {
      const s = doc.createElement('script');
      s.src = src;
      s.setAttribute('data-omni-editor', '');
      s.onload = done;
      s.onerror = () => { gsapLoading = null; reject(new Error('Falha ao carregar GSAP')); };
      doc.head.appendChild(s);
    }
  });
  return gsapLoading;
}

export async function playAnimation(elm, cfg) {
  const doc = elm.ownerDocument;
  const gsap = await ensureGsap(doc);
  const vars = buildVars(cfg);
  const targets = cfg.stagger && elm.children.length ? [...elm.children] : elm;
  if (cfg.stagger && elm.children.length) vars.stagger = +cfg.staggerEach || 0.12;
  gsap.killTweensOf(targets);
  // limpa qualquer sobra de um preview anterior antes de capturar o estado final
  gsap.set(targets, { clearProps: 'all' });
  const delay = +cfg.delay || 0;
  return gsap.from(targets, {
    ...vars, delay,
    clearProps: 'all',
    onInterrupt: () => gsap.set(targets, { clearProps: 'all' }),
  });
}

// Reproduz todas as animações da página (na ordem do DOM)
export async function playAll(doc) {
  const els = [...doc.querySelectorAll(`[${ANIM_ATTR}]`)];
  if (!els.length) return 0;
  await ensureGsap(doc);
  for (const elm of els) {
    const cfg = getAnim(elm);
    if (cfg) playAnimation(elm, cfg);
  }
  return els.length;
}

// ---- Runtime injetado na página salva ----
// Lê os atributos data-anim e cria as animações (load ou ScrollTrigger).
export const RUNTIME_SCRIPT = `(function(){
  if (window.__OMNI_EDITOR__) return; // não roda dentro do editor
  function init(){
    if (!window.gsap) return;
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('[${ANIM_ATTR}]').forEach(function(el){
      var cfg; try { cfg = JSON.parse(el.getAttribute('${ANIM_ATTR}')); } catch(e){ return; }
      if (!cfg || !cfg.preset) return;
      var presets = ${JSON.stringify(Object.fromEntries(Object.entries(ANIM_PRESETS).map(([k, v]) => [k, { from: v.from, defaultEase: v.defaultEase || null }])))};
      var p = presets[cfg.preset] || presets.fadeIn;
      var vars = Object.assign({}, p.from);
      if (cfg.custom) { try { Object.assign(vars, JSON.parse(cfg.custom)); } catch(e){} }
      vars.duration = +cfg.duration || 0.8;
      vars.ease = cfg.ease || p.defaultEase || 'power2.out';
      if (+cfg.repeat) { vars.repeat = +cfg.repeat; vars.yoyo = !!cfg.yoyo; }
      var targets = el;
      if (cfg.stagger && el.children.length) { targets = el.children; vars.stagger = +cfg.staggerEach || 0.12; }
      if (cfg.trigger === 'scroll' && window.ScrollTrigger) {
        vars.scrollTrigger = { trigger: el, start: 'top 88%', toggleActions: cfg.once ? 'play none none none' : 'play none none reset' };
      } else {
        vars.delay = (+cfg.delay || 0) + (vars.delay || 0);
      }
      if (cfg.trigger === 'scroll') { vars.delay = (+cfg.delay || 0); }
      gsap.from(targets, vars);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();`;

// Injeta (ou atualiza) o runtime num documento clonado prestes a ser salvo
export function injectRuntime(rootEl) {
  // remove runtime anterior
  rootEl.querySelectorAll('[data-omni-runtime]').forEach(n => n.remove());
  const hasAnims = !!rootEl.querySelector(`[${ANIM_ATTR}]`);
  if (!hasAnims) return;
  const doc = rootEl.ownerDocument;
  const body = rootEl.querySelector('body') || rootEl;
  const mk = (attrs, content) => {
    const s = doc.createElement('script');
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    if (content) s.textContent = content;
    return s;
  };
  body.appendChild(mk({ src: GSAP_CDN, 'data-omni-runtime': '' }));
  body.appendChild(mk({ src: SCROLLTRIGGER_CDN, 'data-omni-runtime': '' }));
  body.appendChild(mk({ 'data-omni-runtime': '' }, RUNTIME_SCRIPT));
}
