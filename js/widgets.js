// Paleta de elementos que podem ser arrastados para a página

const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#e2e2ea"/><path d="M310 280l70-90 60 70 40-45 80 95H310z" fill="#b9b9c6"/><circle cx="340" cy="165" r="28" fill="#b9b9c6"/></svg>`
);

export const WIDGETS = [
  {
    key: 'section', label: 'Seção',
    icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/></svg>',
    html: `<section style="padding: 64px 24px;"><div style="max-width: 1080px; margin: 0 auto;"><h2 style="margin: 0 0 12px;">Nova seção</h2><p style="margin: 0; color: #666;">Adicione conteúdo aqui.</p></div></section>`,
  },
  {
    key: 'container', label: 'Container',
    icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/></svg>',
    html: `<div style="display: flex; flex-direction: column; gap: 16px; padding: 24px;"></div>`,
  },
  {
    key: 'columns', label: '2 Colunas',
    icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/></svg>',
    html: `<div style="display: flex; gap: 24px; padding: 24px; flex-wrap: wrap;"><div style="flex: 1 1 240px; min-height: 100px; padding: 16px;"></div><div style="flex: 1 1 240px; min-height: 100px; padding: 16px;"></div></div>`,
  },
  {
    key: 'heading', label: 'Título',
    icon: '<svg viewBox="0 0 24 24"><path d="M6 4v16M18 4v16M6 12h12"/></svg>',
    html: `<h2 style="margin: 0;">Título de exemplo</h2>`,
  },
  {
    key: 'text', label: 'Texto',
    icon: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    html: `<p style="margin: 0;">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>`,
  },
  {
    key: 'button', label: 'Botão',
    icon: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="4"/></svg>',
    html: `<a href="#" style="display: inline-block; padding: 13px 30px; background: #8B5CF6; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: 600;">Clique aqui</a>`,
  },
  {
    key: 'image', label: 'Imagem',
    icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
    html: `<img src="${PLACEHOLDER_IMG}" alt="Imagem" style="max-width: 100%; display: block; border-radius: 8px;">`,
  },
  {
    key: 'card', label: 'Card',
    icon: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>',
    html: `<div style="padding: 28px; background: #ffffff; border: 1px solid #e5e5ee; border-radius: 14px; box-shadow: 0 6px 24px rgba(20,20,50,0.07); max-width: 360px;"><h3 style="margin: 0 0 8px;">Título do card</h3><p style="margin: 0; color: #666;">Descrição breve do conteúdo deste card.</p></div>`,
  },
  {
    key: 'list', label: 'Lista',
    icon: '<svg viewBox="0 0 24 24"><path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    html: `<ul style="margin: 0; padding-left: 22px;"><li>Primeiro item</li><li>Segundo item</li><li>Terceiro item</li></ul>`,
  },
  {
    key: 'quote', label: 'Citação',
    icon: '<svg viewBox="0 0 24 24"><path d="M10 8c-3 0-5 2-5 5v3h5v-5H7c0-1.5 1.2-3 3-3zm9 0c-3 0-5 2-5 5v3h5v-5h-3c0-1.5 1.2-3 3-3z"/></svg>',
    html: `<blockquote style="margin: 0; padding: 20px 24px; border-left: 4px solid #8B5CF6; background: #f6f4fd; border-radius: 0 10px 10px 0; font-style: italic; color: #444;">“Uma citação inspiradora para a sua página.”</blockquote>`,
  },
  {
    key: 'divider', label: 'Divisor',
    icon: '<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>',
    html: `<hr style="border: none; border-top: 1px solid #e0e0e8; margin: 24px 0;">`,
  },
  {
    key: 'spacer', label: 'Espaçador',
    icon: '<svg viewBox="0 0 24 24"><path d="M12 5v14M8 8l4-4 4 4M8 16l4 4 4-4"/></svg>',
    html: `<div style="height: 56px;"></div>`,
  },
];

export const WIDGET_MAP = Object.fromEntries(WIDGETS.map(w => [w.key, w]));

// ============================================================
// Seções: modelos prontos e responsivos com conteúdo de exemplo
// (estilo mínimo/neutro — servem de ponto de partida rápido)
// ============================================================
export const SECTIONS = [
  {
    key: 'header', label: 'Header',
    icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M7 6h.01"/></svg>',
    html: `<header style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;padding:20px 24px;max-width:1160px;margin:0 auto;">
  <div style="font-weight:700;font-size:20px;">Logo</div>
  <nav style="display:flex;flex-wrap:wrap;gap:24px;">
    <a href="#" style="text-decoration:none;color:inherit;">Início</a>
    <a href="#" style="text-decoration:none;color:inherit;">Sobre</a>
    <a href="#" style="text-decoration:none;color:inherit;">Serviços</a>
    <a href="#" style="text-decoration:none;color:inherit;">Contato</a>
  </nav>
  <a href="#" style="padding:10px 20px;border-radius:8px;background:#8B5CF6;color:#fff;text-decoration:none;font-weight:600;">Ação</a>
</header>`,
  },
  {
    key: 'hero', label: 'Hero',
    icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="9" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/></svg>',
    html: `<section style="display:flex;flex-wrap:wrap;align-items:center;gap:40px;padding:72px 24px;max-width:1160px;margin:0 auto;">
  <div style="flex:1 1 320px;">
    <h1 style="font-size:clamp(28px,5vw,48px);margin:0 0 16px;line-height:1.1;">Título principal da sua página</h1>
    <p style="font-size:18px;line-height:1.6;color:#555;margin:0 0 28px;">Subtítulo explicando a proposta de valor em uma ou duas frases. Descreva aqui o benefício principal.</p>
    <div style="display:flex;flex-wrap:wrap;gap:12px;">
      <a href="#" style="padding:14px 28px;border-radius:10px;background:#8B5CF6;color:#fff;text-decoration:none;font-weight:600;">Começar agora</a>
      <a href="#" style="padding:14px 28px;border-radius:10px;border:1px solid #ddd;color:inherit;text-decoration:none;font-weight:600;">Saiba mais</a>
    </div>
  </div>
  <div style="flex:1 1 320px;">
    <img src="${PLACEHOLDER_IMG}" alt="Imagem do hero" style="width:100%;height:auto;border-radius:14px;display:block;">
  </div>
</section>`,
  },
  {
    key: 'textimg', label: 'Texto + Imagem',
    icon: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="8" height="14" rx="1"/><path d="M14 7h7M14 11h7M14 15h5"/></svg>',
    html: `<section style="display:flex;flex-wrap:wrap;align-items:center;gap:40px;padding:64px 24px;max-width:1160px;margin:0 auto;">
  <div style="flex:1 1 300px;">
    <img src="${PLACEHOLDER_IMG}" alt="Imagem" style="width:100%;height:auto;border-radius:14px;display:block;">
  </div>
  <div style="flex:1 1 300px;">
    <h2 style="font-size:clamp(24px,4vw,34px);margin:0 0 14px;">Título da seção</h2>
    <p style="font-size:16px;line-height:1.7;color:#555;margin:0 0 16px;">Parágrafo descritivo sobre este tópico. Explique o contexto, o problema e como a sua solução ajuda o visitante.</p>
    <ul style="margin:0;padding-left:20px;color:#555;line-height:1.8;">
      <li>Benefício ou item de destaque</li>
      <li>Outro ponto importante</li>
      <li>Mais um diferencial</li>
    </ul>
  </div>
</section>`,
  },
  {
    key: 'cards3', label: '3 Cards',
    icon: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="6" height="12" rx="1"/><rect x="9" y="6" width="6" height="12" rx="1"/><rect x="16" y="6" width="6" height="12" rx="1"/></svg>',
    html: `<section style="padding:64px 24px;max-width:1160px;margin:0 auto;">
  <h2 style="text-align:center;font-size:clamp(24px,4vw,34px);margin:0 0 40px;">Título da seção de cards</h2>
  <div style="display:flex;flex-wrap:wrap;gap:24px;">
    <div style="flex:1 1 260px;padding:28px;border:1px solid #eee;border-radius:14px;">
      <div style="width:44px;height:44px;border-radius:10px;background:#ede9fe;margin-bottom:16px;"></div>
      <h3 style="margin:0 0 8px;font-size:18px;">Título do card</h3>
      <p style="margin:0;color:#666;line-height:1.6;">Descrição breve do recurso, serviço ou benefício apresentado neste card.</p>
    </div>
    <div style="flex:1 1 260px;padding:28px;border:1px solid #eee;border-radius:14px;">
      <div style="width:44px;height:44px;border-radius:10px;background:#ede9fe;margin-bottom:16px;"></div>
      <h3 style="margin:0 0 8px;font-size:18px;">Título do card</h3>
      <p style="margin:0;color:#666;line-height:1.6;">Descrição breve do recurso, serviço ou benefício apresentado neste card.</p>
    </div>
    <div style="flex:1 1 260px;padding:28px;border:1px solid #eee;border-radius:14px;">
      <div style="width:44px;height:44px;border-radius:10px;background:#ede9fe;margin-bottom:16px;"></div>
      <h3 style="margin:0 0 8px;font-size:18px;">Título do card</h3>
      <p style="margin:0;color:#666;line-height:1.6;">Descrição breve do recurso, serviço ou benefício apresentado neste card.</p>
    </div>
  </div>
</section>`,
  },
  {
    key: 'faq', label: 'FAQ',
    icon: '<svg viewBox="0 0 24 24"><path d="M9 9a3 3 0 1 1 4 2.8c-.8.4-1 .8-1 1.7M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>',
    html: `<section style="padding:64px 24px;max-width:760px;margin:0 auto;">
  <h2 style="text-align:center;font-size:clamp(24px,4vw,34px);margin:0 0 36px;">Perguntas frequentes</h2>
  <div style="display:flex;flex-direction:column;gap:16px;">
    <div style="padding:20px 24px;border:1px solid #eee;border-radius:12px;">
      <h3 style="margin:0 0 8px;font-size:17px;">Pergunta de exemplo?</h3>
      <p style="margin:0;color:#666;line-height:1.6;">Resposta clara e objetiva. Explique o suficiente para tirar a dúvida do visitante sem enrolação.</p>
    </div>
    <div style="padding:20px 24px;border:1px solid #eee;border-radius:12px;">
      <h3 style="margin:0 0 8px;font-size:17px;">Outra pergunta comum?</h3>
      <p style="margin:0;color:#666;line-height:1.6;">Resposta clara e objetiva. Explique o suficiente para tirar a dúvida do visitante sem enrolação.</p>
    </div>
    <div style="padding:20px 24px;border:1px solid #eee;border-radius:12px;">
      <h3 style="margin:0 0 8px;font-size:17px;">Mais uma dúvida?</h3>
      <p style="margin:0;color:#666;line-height:1.6;">Resposta clara e objetiva. Explique o suficiente para tirar a dúvida do visitante sem enrolação.</p>
    </div>
  </div>
</section>`,
  },
  {
    key: 'cta', label: 'Chamada (CTA)',
    icon: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M9 12h6"/></svg>',
    html: `<section style="padding:64px 24px;text-align:center;">
  <div style="max-width:720px;margin:0 auto;">
    <h2 style="font-size:clamp(24px,4vw,36px);margin:0 0 14px;">Pronto para começar?</h2>
    <p style="font-size:18px;color:#555;line-height:1.6;margin:0 0 28px;">Uma frase de incentivo para o visitante dar o próximo passo agora.</p>
    <a href="#" style="display:inline-block;padding:15px 34px;border-radius:10px;background:#8B5CF6;color:#fff;text-decoration:none;font-weight:600;">Quero começar</a>
  </div>
</section>`,
  },
  {
    key: 'footer', label: 'Footer simples',
    icon: '<svg viewBox="0 0 24 24"><rect x="3" y="16" width="18" height="4" rx="1"/><path d="M6 4h12M6 9h12"/></svg>',
    html: `<footer style="padding:32px 24px;text-align:center;border-top:1px solid #eee;color:#888;font-size:14px;">
  <p style="margin:0 0 10px;">© 2026 Sua Empresa. Todos os direitos reservados.</p>
  <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;">
    <a href="#" style="color:inherit;text-decoration:none;">Privacidade</a>
    <a href="#" style="color:inherit;text-decoration:none;">Termos</a>
    <a href="#" style="color:inherit;text-decoration:none;">Contato</a>
  </div>
</footer>`,
  },
  {
    key: 'footer-full', label: 'Footer completo',
    icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 14h18M8 8H5M8 11H5M14 8h-3M14 11h-3M20 8h-3M20 11h-3"/></svg>',
    html: `<footer style="padding:56px 24px 32px;border-top:1px solid #eee;">
  <div style="display:flex;flex-wrap:wrap;gap:40px;max-width:1160px;margin:0 auto;">
    <div style="flex:2 1 240px;">
      <div style="font-weight:700;font-size:20px;margin-bottom:12px;">Logo</div>
      <p style="margin:0;color:#777;line-height:1.6;max-width:320px;">Uma frase curta descrevendo a empresa ou o produto e o que ele oferece.</p>
    </div>
    <div style="flex:1 1 140px;">
      <h4 style="margin:0 0 12px;font-size:14px;">Produto</h4>
      <ul style="list-style:none;padding:0;margin:0;color:#777;line-height:2.1;">
        <li><a href="#" style="color:inherit;text-decoration:none;">Recursos</a></li>
        <li><a href="#" style="color:inherit;text-decoration:none;">Preços</a></li>
        <li><a href="#" style="color:inherit;text-decoration:none;">FAQ</a></li>
      </ul>
    </div>
    <div style="flex:1 1 140px;">
      <h4 style="margin:0 0 12px;font-size:14px;">Empresa</h4>
      <ul style="list-style:none;padding:0;margin:0;color:#777;line-height:2.1;">
        <li><a href="#" style="color:inherit;text-decoration:none;">Sobre</a></li>
        <li><a href="#" style="color:inherit;text-decoration:none;">Blog</a></li>
        <li><a href="#" style="color:inherit;text-decoration:none;">Contato</a></li>
      </ul>
    </div>
    <div style="flex:1 1 140px;">
      <h4 style="margin:0 0 12px;font-size:14px;">Legal</h4>
      <ul style="list-style:none;padding:0;margin:0;color:#777;line-height:2.1;">
        <li><a href="#" style="color:inherit;text-decoration:none;">Privacidade</a></li>
        <li><a href="#" style="color:inherit;text-decoration:none;">Termos</a></li>
      </ul>
    </div>
  </div>
  <p style="text-align:center;color:#999;font-size:13px;margin:40px 0 0;">© 2026 Sua Empresa. Todos os direitos reservados.</p>
</footer>`,
  },
];

export const SECTION_MAP = Object.fromEntries(SECTIONS.map(s => [s.key, s]));
