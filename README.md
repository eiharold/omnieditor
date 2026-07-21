# OmniEditor

Editor visual para páginas HTML — inspirado no Elementor e no Framer. Edite suas próprias páginas com granularidade total, em tempo real, sem tocar em código (mas com espaço para CSS quando quiser).

![tema](https://img.shields.io/badge/tema-claro%20%2F%20escuro-8B5CF6) ![gsap](https://img.shields.io/badge/anima%C3%A7%C3%B5es-GSAP-88CE02)

## Como rodar

```bash
cd OmniEditor
python3 server.py            # abre em http://localhost:5588
```

Use **Chrome ou Edge** — o salvamento direto no arquivo usa a File System Access API.

## Fluxo de uso

1. **Abrir pasta do projeto** (recomendado): o editor varre a pasta, lista as páginas `.html` e resolve os arquivos **CSS/JS/imagens relativos** automaticamente (inclusive `url(...)` dentro dos CSS externos). A página aparece completa no canvas.
2. Clique em qualquer elemento para selecioná-lo — o painel direito mostra tudo que dá para editar.
3. **Duplo clique** edita texto direto no canvas.
4. Arraste elementos da paleta (seção, colunas, título, botão, card…) para dentro da página — um indicador mostra onde vão cair.
5. `⌘S` salva **de volta no próprio arquivo**. `Exportar` baixa uma cópia.

## O que dá para editar

- **Layout**: display, flex (direção, justify, align, gap, wrap), grid, overflow
- **Dimensões**: largura/altura, mín/máx com unidades (px, %, em, rem, vw, vh, auto)
- **Espaçamento**: margin/padding com 4 lados vinculáveis
- **Tipografia**: fonte, tamanho, peso, entrelinha, espaçamento, alinhamento, caixa, decoração, cor
- **Fundo**: cor, gradiente (2 cores + ângulo) ou imagem (tamanho, posição, repetição, parallax)
- **Borda & sombra**: espessura, estilo, cor, raio por canto, presets de sombra + customizada
- **Posição**: static/relative/absolute/fixed/sticky, deslocamentos, z-index
- **Efeitos**: opacidade, translate/scale/rotate, blur, brilho, contraste, saturação, P&B, transição, cursor
- **Avançado**: ID, classes, CSS específico do elemento, edição do outerHTML

## Animações (GSAP)

Na aba **Animação**: 14 presets (fade, zoom, slide, rotate, flip, blur, bounce…), disparo ao carregar ou ao rolar (ScrollTrigger), duração, atraso, easing, repetição, yoyo, stagger de filhos e vars extras em JSON. O botão **▶ Testar** dá preview instantâneo no canvas.

Ao salvar, o GSAP + ScrollTrigger + um runtime leve são injetados na página — as animações funcionam fora do editor, e a config fica no atributo `data-anim` de cada elemento (re-editável ao reabrir).

## Aba "Elementos"

Dois grupos: **Componentes** (aberto por padrão — seção, container, título, botão, imagem, card…) e **Seções** (recolhido — modelos prontos e responsivos com conteúdo de exemplo: Header, Hero, Texto + Imagem, 3 Cards, FAQ, Chamada (CTA), Footer simples e Footer completo). As seções servem de ponto de partida rápido; ajuste o conteúdo depois.

## Ajustes da página (botão `</>`)

O botão `</>` abre um painel com quatro abas:
- **Geral** — configurações da página (título, cor de fundo, fonte padrão, cor do texto) e **SEO/compartilhamento**: meta description, favicon, `og:title`, `og:image` e idioma da página.
- **Estilos** — o *design system* da página (veja abaixo).
- **CSS** — CSS personalizado, aplicado em tempo real e salvo dentro da página.
- **JS** — JavaScript personalizado com duas áreas: dentro do `<head>` e antes de `</body>`. É salvo na página e roda quando ela é aberta fora do editor (não executa dentro do editor).

## Estilos: o design system da página

A aba **Estilos** varre tudo que a página realmente usa — arquivos `.css` externos, `<style>`
internos, o CSS personalizado e os `style` inline — e monta duas listas: as **cores** e as
**famílias de fonte**, ordenadas por quantidade de usos.

Trocar uma cor ou uma fonte ali muda **todas as ocorrências de uma vez**. A troca não gera
regra de override: o valor é reescrito no próprio lugar de origem, por offset exato de cada
ocorrência — o resultado é o mesmo que editar o CSS na mão, e a página continua limpa.

Detecta `#hex` (3, 4, 6 e 8 dígitos), `rgb()/rgba()`, `hsl()/hsla()` e cores nomeadas, em
qualquer propriedade (inclusive dentro de gradientes e `box-shadow`). Cores dentro de
`url(...)` são ignoradas. A transparência é preservada: um `rgba(…, .5)` continua `rgba` e
um `#rrggbbaa` continua com o byte de alfa. Cores nomeadas e `hsl()` viram hex ao serem
alteradas. `var(--token)` é deixado em paz — quem usa variáveis CSS já tem o próprio
design system, e o lugar de editá-lo é a aba CSS.

## Estados (Normal / Hover / Active)

No topo da aba **Estilo** há um seletor de estado. Em **Hover** ou **Active**, as edições deixam de ir para o `style` inline e viram uma regra CSS na própria página (`#id:hover { … }`), criada automaticamente — dá para editar cor, fundo, sombra, transform, opacidade, filtros etc. para cada estado. O elemento ganha um `id` automático na primeira edição, e o efeito já é visível ao passar o mouse no canvas.

## Edição de texto rica

Duplo clique num texto abre a edição inline com uma **barra flutuante**: negrito, itálico, sublinhado, riscado, inserir link, envolver a seleção num `<span>` com classe, e limpar formatação.

## Seletores CSS (aba "CSS")

Lista todas as regras de todos os stylesheets da página — `<style>` internos, **arquivos .css externos** da pasta e o CSS personalizado — com busca e filtros por `.classes` / `#ids`. Clique numa regra para editá-la:

- **Interface**: controles rápidos para as propriedades mais comuns (cores, fonte, espaçamentos, borda, sombra…)
- **Código**: o bloco da regra em texto, aplicado em tempo real (sincronizado com os controles)
- Mostra em qual arquivo a regra vive, o media query e quantos elementos ela atinge na página
- Edições em arquivos `.css` externos são gravadas **de volta no próprio arquivo** junto com o ⌘S (só a regra editada muda; comentários e formatação do resto do arquivo são preservados)
- "+ Nova regra" cria um seletor novo no CSS personalizado
- Na aba **Avançado** de um elemento, o `#id` e as `.classes` aparecem como chips clicáveis: clique para abrir a regra correspondente direto na aba CSS (se não existir, o editor oferece criá-la no CSS personalizado)

## Imagens

O campo **src** (e o de **imagem de fundo**) aplica só ao pressionar Enter ou sair do campo (a imagem não quebra enquanto você digita). Com a pasta do projeto aberta, caminhos relativos são resolvidos na hora para o preview e restaurados ao caminho original ao salvar. O botão **Escolher…** abre o Finder: arquivos dentro da pasta do projeto são vinculados pelo caminho relativo automaticamente; arquivos de fora são incorporados na página (data URL). Imagens sem src aparecem como um placeholder quadriculado clicável no editor.

## Idiomas, tema e sessão

- **Idioma** (⚙ menu): Português do Brasil, Inglês e Espanhol — troca toda a interface na hora, sem recarregar.
- **Tema** claro/escuro + cor de destaque (roxo padrão).
- **Voltar às configurações da página** (⚙ menu): desseleciona e volta ao painel da página.
- **Sessão**: o último arquivo/pasta é lembrado (IndexedDB). Ao recarregar, a página reabre automaticamente se a permissão persistir; caso contrário, a tela inicial oferece um botão **Reabrir**. (Edições não são salvas automaticamente.)

## Mobile / tablet

Interface responsiva: em telas pequenas os painéis viram **gavetas retráteis** — ☰ à esquerda (elementos/camadas/CSS) e o botão de **painel de edição** à direita (abre o inspetor por cima do canvas; também abre sozinho ao tocar num elemento). Fundo escurecido fecha. No celular a visualização padrão é a **mobile**, e dá para ver as demais (tablet/laptop/desktop) com **zoom-out automático** para caber na tela.

No celular a barra se divide em **duas**:

- **em cima** — logo + nome, o seletor de tamanho de tela no centro, e modo de visualização + Salvar à direita;
- **embaixo** (fixa, ao alcance do polegar) — ☰ menu, desfazer, refazer, histórico, ajustes da página, configurações e o toggle do painel de edição. Ela **some no modo de visualização**, e o canvas recupera o espaço.

Os botões não são duplicados: os nós reais são movidos entre as barras conforme a largura, então estado e traduções continuam valendo.

## Barra superior

- **Salvar** (⌘S) — grava no arquivo atual (e nos CSS externos editados). A **seta ao lado** abre o menu com **Abrir**, **Salvar** e **Salvar como**.
- Ao lado do nome do arquivo, uma **setinha** troca entre os outros HTML da pasta (quando há mais de um).
- No **celular**, os tamanhos de tela viram um **seletor compacto** (mostra o atual + seta) e o **painel de edição** (direita) vira uma gaveta com botão próprio. Trocar de dispositivo **atualiza as propriedades** para aquele breakpoint. Esse toggle do painel aparece só em tablet/mobile — no desktop a coluna fica sempre visível.
- **⚙ → Sobre o OmniEditor** — informações do produto, versão e créditos (eiharold.com).
- A sessão (último arquivo/pasta) fica só no navegador (IndexedDB) — sem servidor, sem login. O único arquivo gravado em disco é a sua própria página, quando você Salva.

## Menu de contexto

Botão direito em qualquer elemento do canvas: editar texto, copiar/recortar/colar, duplicar, mover, selecionar o pai, ocultar, copiar o seletor CSS, atalhos para animação e HTML, excluir. Durante a edição de texto o menu nativo do navegador é mantido.

## Outros recursos

- **Camadas**: árvore do DOM com seleção, mostrar/ocultar, excluir e reordenação por drag & drop — tudo começa contraído; o caminho até o elemento selecionado abre sozinho
- **Responsividade**: desktop, laptop (1280), tablet (768), mobile (375) ou largura customizada + zoom
- **CSS personalizado**: painel global com aplicação em tempo real, salvo dentro da página (`<style data-omni-custom>`)
- **Modo de visualização** (`⌘P`, ícone do olho): oculta os painéis laterais **e** desliga os
  marcadores de edição — a página fica como para o visitante, com links e interações ativos
  (a barra do topo continua ali para você sair). Na view que corresponde ao aparelho onde o
  editor está aberto — **desktop** no computador, **mobile** no celular — a página ocupa a
  tela inteira, sem moldura nem cantos arredondados, porque ali o tamanho já é o real. Nas
  outras views a moldura fica, que é o que delimita o recorte.
- **Histórico de edições**: versões gravadas ao abrir, salvar e exportar (IndexedDB do navegador, máx. 30 por arquivo) — restaure, baixe ou exclua pelo painel do relógio
- **Temas**: claro/escuro + 7 cores de destaque (roxo padrão)

## Atalhos

| Atalho | Ação |
|---|---|
| `⌘S` / `Ctrl+S` | Salvar no arquivo |
| `⌘Z` / `⇧⌘Z` | Desfazer / refazer |
| `⌘C` / `⌘X` / `⌘V` | Copiar / recortar / colar o elemento selecionado |
| `⌘D` | Duplicar elemento |
| `Delete` | Excluir elemento |
| `⌘P` | Modo de visualização (oculta painéis + marcadores) |
| `Esc` | Desselecionar / sair da edição de texto |
| Duplo clique | Editar texto do elemento |

## Deploy (VPS + Docker + Traefik)

Rodando em <https://editor.eiharold.cloud> — container próprio atrás do Traefik, na rede
externa `traefik`, com deploy automático por push na `main` via GitHub Actions.

- `Dockerfile` — nginx alpine servindo os estáticos (`nginx.conf`: gzip, `no-cache` em
  HTML/CSS/JS porque o app não tem build com hash, cache longo para imagens).
- `docker-compose.yml` — labels do Traefik + rede externa `traefik`; o domínio vem de
  `OMNIEDITOR_DOMAIN` no `.env` ao lado do compose (só no servidor, fora do git).
- `.github/workflows/deploy.yml` — roda em `/root/sites-estaticos/omnieditor` e requer os
  secrets `DEPLOY_HOST`, `DEPLOY_USER` e `DEPLOY_SSH_KEY`.

Setup inicial no servidor (uma vez):

```bash
git clone https://github.com/eiharold/omnieditor.git /root/sites-estaticos/omnieditor
cd /root/sites-estaticos/omnieditor
echo 'OMNIEDITOR_DOMAIN=editor.eiharold.cloud' > .env
docker compose up -d --build
```

O DNS de `editor.eiharold.cloud` aponta para o IP do VPS (o Traefik emite o certificado
sozinho). O HTTPS não é opcional: a File System Access API só funciona em contexto seguro.

## Estrutura

```
index.html          interface do editor
css/editor.css      estilos da UI (temas via CSS variables)
js/
  app.js            orquestração, arquivos, salvar, dispositivos
  canvas.js         iframe de edição, seleção, DnD, serialização
  inspector.js      painéis de propriedades
  animations.js     presets GSAP, preview e runtime injetado
  layers.js         árvore de camadas
  selectors.js      painel de seletores CSS (parser + editor de regras)
  design.js         aba Estilos: detecta cores/fontes e troca globalmente
  versions.js       histórico de edições (IndexedDB)
  widgets.js        paleta de elementos
  state.js          estado, histórico, preferências
  utils.js          utilitários
exemplo/            projeto de teste com CSS/JS externos
```

O que o editor grava na página salva: estilos inline nos elementos editados, `<style data-omni-custom>` (CSS personalizado), `data-anim` + runtime GSAP (só se houver animações). Nada além disso — sem lock-in.
