// Páginas de exemplo

export const BLANK_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nova página</title>
</head>
<body style="margin: 0; font-family: Inter, system-ui, sans-serif; background: #ffffff; color: #000000;">
<section style="padding: 80px 24px; text-align: center;">
  <h1 style="margin: 0 0 12px;">Sua nova página</h1>
  <p style="margin: 0;">Arraste elementos da paleta para começar.</p>
</section>
</body>
</html>`;

export const DEMO_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aurora — Página demo</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, system-ui, -apple-system, sans-serif; color: #17171f; background: #ffffff; }
  .nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 48px; }
  .nav-logo { font-weight: 800; font-size: 20px; letter-spacing: -0.02em; }
  .nav-links { display: flex; gap: 28px; }
  .nav-links a { color: #55556a; text-decoration: none; font-size: 14px; font-weight: 500; }
  .hero { text-align: center; padding: 96px 24px 80px; background: linear-gradient(180deg, #f6f3ff 0%, #ffffff 100%); }
  .hero h1 { font-size: 52px; margin: 0 0 16px; letter-spacing: -0.03em; line-height: 1.1; }
  .hero p { font-size: 18px; color: #5d5d70; max-width: 520px; margin: 0 auto 32px; line-height: 1.6; }
  .btn-primary { display: inline-block; padding: 15px 34px; background: #8B5CF6; color: #fff; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; }
  .features { display: flex; gap: 24px; max-width: 1040px; margin: 0 auto; padding: 72px 24px; flex-wrap: wrap; }
  .feature { flex: 1 1 260px; padding: 30px; background: #fafafc; border: 1px solid #ececf2; border-radius: 16px; }
  .feature .icon { width: 44px; height: 44px; border-radius: 12px; background: #ede9fe; display: grid; place-items: center; font-size: 20px; margin-bottom: 16px; }
  .feature h3 { margin: 0 0 8px; font-size: 17px; }
  .feature p { margin: 0; color: #6b6b7e; font-size: 14px; line-height: 1.6; }
  .cta { text-align: center; padding: 80px 24px; background: #17171f; color: #fff; }
  .cta h2 { font-size: 34px; margin: 0 0 12px; letter-spacing: -0.02em; }
  .cta p { color: #a8a8bc; margin: 0 0 28px; }
  .footer { padding: 32px 48px; text-align: center; color: #9a9aac; font-size: 13px; }
</style>
</head>
<body>
<nav class="nav">
  <div class="nav-logo">✦ Aurora</div>
  <div class="nav-links">
    <a href="#recursos">Recursos</a>
    <a href="#precos">Preços</a>
    <a href="#contato">Contato</a>
  </div>
</nav>

<header class="hero">
  <h1>Construa algo<br>incrível hoje</h1>
  <p>Aurora é a página demo do OmniEditor. Clique em qualquer elemento para editar estilos, arraste novos blocos e crie animações GSAP.</p>
  <a class="btn-primary" href="#">Começar agora</a>
</header>

<section class="features" id="recursos">
  <div class="feature">
    <div class="icon">⚡</div>
    <h3>Rápido</h3>
    <p>Edição visual em tempo real, sem esperar build nem deploy para ver o resultado.</p>
  </div>
  <div class="feature">
    <div class="icon">🎨</div>
    <h3>Flexível</h3>
    <p>Controle cada detalhe: tipografia, cores, espaçamentos, sombras e efeitos.</p>
  </div>
  <div class="feature">
    <div class="icon">✨</div>
    <h3>Animado</h3>
    <p>Animações GSAP configuráveis pela interface, com preview instantâneo.</p>
  </div>
</section>

<section class="cta">
  <h2>Pronto para começar?</h2>
  <p>Experimente editar esta seção — mude cores, textos e crie animações.</p>
  <a class="btn-primary" href="#">Criar conta grátis</a>
</section>

<footer class="footer">© 2026 Aurora — feito com OmniEditor</footer>
</body>
</html>`;
