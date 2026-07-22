// Internacionalização. Chave = texto em português (idioma base do app).
// Para EN/ES, traduz pelo dicionário; se faltar, cai no português (sem quebrar).

export const LANGS = { 'pt-BR': 'Português', 'en': 'English', 'es': 'Español' };

// Padrão do app (o usuário pode trocar; a escolha fica no localStorage).
// Note que pt-BR continua sendo o idioma BASE — é a chave do dicionário.
let lang = 'en';
const changeListeners = [];

// Dicionários: só EN e ES precisam de entradas (pt-BR é a própria chave).
const DICT = {
  en: {
    // Topbar / ações
    'Desfazer': 'Undo', 'Refazer': 'Redo',
    'Desktop': 'Desktop', 'Laptop': 'Laptop', 'Tablet': 'Tablet', 'Mobile': 'Mobile',
    'Largura personalizada (px)': 'Custom width (px)',
    'Ajustar': 'Fit', 'Zoom': 'Zoom',
    'Modo de visualização — interagir com a página': 'Preview mode — interact with the page',
    'Histórico de edições': 'Edit history',
    'CSS personalizado': 'Custom CSS',
    'Ajustes da página': 'Page adjustments',
    'Configurações': 'Settings',
    'Estilos': 'Styles',
    'Cores': 'Colors',
    'Fontes': 'Fonts',
    'Cores e fontes detectadas na página. Alterar aqui reescreve todas as ocorrências no CSS de origem.':
      'Colors and fonts detected on the page. Changing them here rewrites every occurrence in the source CSS.',
    'Nenhuma cor encontrada no CSS da página.': 'No colors found in the page CSS.',
    'Nenhuma família de fonte declarada no CSS da página.': 'No font family declared in the page CSS.',
    'Alterar cor': 'Change color',
    '1 uso': '1 use',
    '{0} usos': '{0} uses',
    '{0} ocorrências atualizadas': '{0} occurrences updated',
    'Abrir': 'Open', 'Salvar': 'Save', 'Salvar como': 'Save As', 'Exportar': 'Export',
    'Exportar página': 'Export page',
    'Formato': 'Format',
    'Imagem da página inteira': 'Image of the whole page',
    'Documento de uma página': 'Single-page document',
    'Copiar': 'Copy',
    'Copiar HTML para a área de transferência': 'Copy HTML to the clipboard',
    '{0} não afeta um elemento inline. Mude o Display para block ou inline-block.':
      '{0} has no effect on an inline element. Change Display to block or inline-block.',
    'O elemento ficou com {0} em vez de {1}: o tamanho está sendo definido pelo contêiner (flex/grid) ou por um min/max.':
      'The element ended up {0} instead of {1}: its size is being set by the container (flex/grid) or by a min/max.',
    'Confirmar': 'Confirm',
    'Descartar e abrir': 'Discard and open',
    'As alterações feitas em {0} serão perdidas.': 'The changes made to {0} will be lost.',
    'página atual': 'current page',
    'Restaurar': 'Restore',
    'As alterações não salvas serão perdidas.': 'Unsaved changes will be lost.',
    'Excluir': 'Delete',
    'A regra some do CSS onde está gravada. Dá para desfazer com ⌘Z.':
      'The rule is removed from the CSS file it lives in. You can undo with ⌘Z.',
    'Nova regra CSS': 'New CSS rule',
    'Criar regra': 'Create rule',
    'Largura da página': 'Page width',
    'Renderizando… isso pode levar alguns segundos.': 'Rendering… this may take a few seconds.',
    'HTML copiado para a área de transferência': 'HTML copied to the clipboard',
    'Exportação concluída': 'Export finished',
    'Falha ao exportar: {0}': 'Export failed: {0}',
    'A página é muito alta: a exportação foi cortada em {0}px': 'The page is too tall: the export was cut off at {0}px',
    'Abrir arquivo ou pasta': 'Open file or folder',
    'Salvar em novo arquivo': 'Save to a new file',
    'Salvar no arquivo': 'Save to file',
    'Alterações não salvas': 'Unsaved changes',
    // Sidebar esquerda
    'Elementos': 'Elements', 'Camadas': 'Layers', 'CSS': 'CSS',
    'Arraste um elemento para a página': 'Drag an element onto the page',
    'Buscar seletor…': 'Search selector…',
    'Todos': 'All', '+ Nova regra': '+ New rule',
    // Widgets
    'Seção': 'Section', 'Container': 'Container', '2 Colunas': '2 Columns',
    'Título': 'Heading', 'Texto': 'Text', 'Botão': 'Button', 'Imagem': 'Image',
    'Card': 'Card', 'Lista': 'List', 'Citação': 'Quote', 'Divisor': 'Divider', 'Espaçador': 'Spacer',
    'Arraste um elemento para a página': 'Drag an element onto the page',
    // Inspector cabeçalho
    'Página': 'Page', 'Estilo': 'Style', 'Animação': 'Animation', 'Avançado': 'Advanced',
    'Clique em um elemento da página para editá-lo': 'Click an element on the page to edit it',
    // Página
    'Configurações da página': 'Page settings',
    'Título da página': 'Page title', 'Cor de fundo': 'Background color',
    'Fonte padrão': 'Default font', 'Cor do texto': 'Text color',
    'Dica: clique em qualquer elemento no canvas para editar estilos, animações e atributos. Duplo clique edita texto.':
      'Tip: click any element on the canvas to edit styles, animations and attributes. Double-click to edit text.',
    // Seções de estilo
    'Elemento': 'Element', 'Layout': 'Layout', 'Dimensões': 'Dimensions',
    'Espaçamento': 'Spacing', 'Tipografia': 'Typography', 'Fundo': 'Background',
    'Borda & Sombra': 'Border & Shadow', 'Posição': 'Position', 'Efeitos': 'Effects',
    // Elemento
    'Origem da imagem (src)': 'Image source (src)',
    'caminho relativo ou URL': 'relative path or URL',
    'Escolher…': 'Choose…', 'Escolher um arquivo de imagem': 'Choose an image file',
    'Aplica ao pressionar Enter ou sair do campo.': 'Applies on Enter or when leaving the field.',
    'Texto alternativo (alt)': 'Alt text (alt)',
    'Ajuste (object-fit)': 'Fit (object-fit)',
    'Link (href)': 'Link (href)', 'Abrir em nova aba': 'Open in new tab',
    // Layout
    'Display': 'Display', 'Direção': 'Direction', 'Justificar': 'Justify', 'Alinhar': 'Align',
    'Início': 'Start', 'Centro': 'Center', 'Fim': 'End',
    'Espaço entre': 'Space between', 'Espaço ao redor': 'Space around', 'Espaço igual': 'Space evenly',
    'Esticar': 'Stretch', 'Baseline': 'Baseline',
    'Espaço (gap)': 'Gap', 'Quebra (wrap)': 'Wrap',
    'Sem quebra': 'No wrap', 'Quebrar': 'Wrap', 'Quebra reversa': 'Wrap reverse',
    'Colunas (grid-template-columns)': 'Columns (grid-template-columns)',
    'Overflow': 'Overflow', 'Linha': 'Row', 'Coluna': 'Column',
    'Linha reversa': 'Row reverse', 'Coluna reversa': 'Column reverse',
    // Dimensões
    'Largura': 'Width', 'Altura': 'Height',
    'Larg. mín.': 'Min W', 'Larg. máx.': 'Max W', 'Alt. mín.': 'Min H', 'Alt. máx.': 'Max H',
    // Espaçamento
    'Margem externa (margin)': 'Margin', 'Preenchimento (padding)': 'Padding',
    'Sup': 'Top', 'Dir': 'Right', 'Inf': 'Bottom', 'Esq': 'Left',
    'Vincular os 4 lados': 'Link all 4 sides',
    // Tipografia
    'Fonte': 'Font', 'Tamanho': 'Size', 'Peso': 'Weight', 'Entrelinha': 'Line height',
    'Espaç. letras': 'Letter spacing', 'Alinhamento': 'Alignment', 'Caixa': 'Case',
    'Decoração': 'Decoration', 'Estilo': 'Style',
    'Normal': 'Normal', 'MAIÚSCULAS': 'UPPERCASE', 'minúsculas': 'lowercase', 'Capitalizada': 'Capitalized',
    'Nenhuma': 'None', 'Sublinhado': 'Underline', 'Riscado': 'Line-through', 'Sobrelinha': 'Overline',
    'Itálico': 'Italic', 'Esquerda': 'Left', 'Direita': 'Right', 'Justificado': 'Justify',
    // Fundo
    'Tipo': 'Type', 'Cor': 'Color', 'Gradiente': 'Gradient',
    'Cor inicial': 'Start color', 'Cor final': 'End color', 'Ângulo': 'Angle',
    'URL da imagem': 'Image URL', 'Posição': 'Position',
    'auto': 'auto', 'esticar': 'stretch',
    'centro': 'center', 'topo': 'top', 'base': 'bottom', 'esquerda': 'left', 'direita': 'right',
    'Repetição': 'Repeat', 'não repetir': 'no repeat', 'repetir': 'repeat',
    'horizontal': 'horizontal', 'vertical': 'vertical',
    'Fixação': 'Attachment', 'rolar': 'scroll', 'fixa (parallax)': 'fixed (parallax)',
    'Cor de apoio': 'Fallback color',
    // Borda & sombra
    'Espessura': 'Width', 'nenhum': 'none', 'sólido': 'solid', 'tracejado': 'dashed',
    'pontilhado': 'dotted', 'duplo': 'double', 'Cor da borda': 'Border color',
    'Raio dos cantos (border-radius)': 'Corner radius (border-radius)',
    'Sombra': 'Shadow', 'Suave': 'Soft', 'Média': 'Medium', 'Forte': 'Strong', 'Personalizada': 'Custom',
    // Posição
    'Deslocamento (top/right/bottom/left)': 'Offset (top/right/bottom/left)', 'Z-index': 'Z-index',
    // Efeitos
    'Opacidade (%)': 'Opacity (%)', 'Mover X': 'Move X', 'Mover Y': 'Move Y',
    'Escala': 'Scale', 'Rotação (°)': 'Rotation (°)', 'Desfoque (blur px)': 'Blur (px)',
    'Brilho (%)': 'Brightness (%)', 'Contraste (%)': 'Contrast (%)', 'Saturação (%)': 'Saturation (%)',
    'Preto & branco (%)': 'Grayscale (%)', 'Transição (s)': 'Transition (s)', 'Cursor': 'Cursor',
    // Animação
    'Animação GSAP': 'GSAP animation', 'Ativar animação GSAP': 'Enable GSAP animation',
    'Preset': 'Preset', 'Disparo': 'Trigger', 'Ao carregar': 'On load', 'Ao rolar': 'On scroll',
    'Duração (s)': 'Duration (s)', 'Atraso (s)': 'Delay (s)', 'Easing': 'Easing',
    'Animar só uma vez': 'Animate only once', 'Repetições (-1 = infinito)': 'Repeats (-1 = infinite)',
    'Vai e volta (yoyo)': 'Yoyo', 'Animar filhos em sequência (stagger)': 'Stagger children',
    'Intervalo do stagger (s)': 'Stagger interval (s)',
    'Vars extras do gsap.from (JSON, opcional)': 'Extra gsap.from vars (JSON, optional)',
    '▶  Testar': '▶  Test', 'Testar todas': 'Test all', '▶  Reproduzir todas': '▶  Play all',
    'Selecione um elemento para configurar animações GSAP. As animações são salvas na página e funcionam fora do editor.':
      'Select an element to configure GSAP animations. Animations are saved in the page and work outside the editor.',
    'Ao salvar, o GSAP e o ScrollTrigger são incluídos automaticamente na página para reproduzir as animações.':
      'When saving, GSAP and ScrollTrigger are automatically included in the page to play the animations.',
    // Avançado
    'Identificação': 'Identification', 'ID': 'ID',
    'Classes (separadas por espaço)': 'Classes (space-separated)',
    'Clique para editar a regra na aba CSS.': 'Click to edit the rule in the CSS tab.',
    'CSS deste elemento': "This element's CSS", 'HTML do elemento': 'Element HTML',
    'Edite e clique fora para aplicar.': 'Edit and click away to apply.',
    'Duplicar': 'Duplicate', 'Excluir': 'Delete',
    'Selecione um elemento para editar ID, classes, CSS específico e HTML.':
      'Select an element to edit ID, classes, specific CSS and HTML.',
    // Settings popover
    'Tema da interface': 'Interface theme', 'Claro': 'Light', 'Escuro': 'Dark',
    'Cor de destaque': 'Accent color', 'Idioma': 'Language',
    'Abrir/fechar painel de edição': 'Open/close editing panel',
    'Mais opções de arquivo': 'More file options',
    // Welcome
    'Editor visual para suas páginas HTML. Abra uma pasta para que os arquivos CSS/JS externos sejam carregados automaticamente.':
      'Visual editor for your HTML pages. Open a folder so external CSS/JS files load automatically.',
    'Abrir pasta do projeto': 'Open project folder', 'Abrir arquivo HTML': 'Open HTML file',
    'Nova página em branco': 'New blank page', 'Experimentar com página demo': 'Try the demo page',
    '…ou solte um arquivo .html aqui': '…or drop a .html file here',
    // Modais
    'Escolha a página para editar': 'Choose a page to edit', 'Cancelar': 'Cancel', 'Fechar': 'Close',
    'Excluir regra': 'Delete rule', 'Propriedades comuns': 'Common properties',
    'Código da regra': 'Rule code', 'aplicado em tempo real': 'applied live',
    'propriedade: valor;': 'property: value;',
    // Menu de contexto
    'Editar texto': 'Edit text', 'Copiar': 'Copy', 'Recortar': 'Cut', 'Colar depois': 'Paste after',
    'Mover para cima': 'Move up', 'Mover para baixo': 'Move down',
    'Selecionar elemento pai': 'Select parent', 'Ocultar elemento': 'Hide element',
    'Mostrar elemento': 'Show element', 'Copiar seletor CSS': 'Copy CSS selector',
    'Animação…': 'Animation…', 'Editar HTML…': 'Edit HTML…',
    // Toasts
    'Abra uma página primeiro': 'Open a page first',
    'Página salva ✓': 'Page saved ✓', 'HTML exportado': 'HTML exported',
    'Modo visualização — links e interações ativos': 'Preview mode — links and interactions active',
    'Elemento colado': 'Element pasted', 'Regra excluída': 'Rule deleted',
    // Dinâmicos / imagens
    'Esta página tem {0} elemento(s) animado(s) com GSAP.': 'This page has {0} GSAP-animated element(s).',
    'Arquivo não encontrado na pasta: {0}': 'File not found in folder: {0}',
    'Imagem': 'Image', 'Imagem vinculada: {0}': 'Image linked: {0}',
    'Arquivo fora da pasta do projeto — imagem incorporada na página':
      'File outside the project folder — image embedded in the page',
    'Imagem incorporada na página (abra a pasta do projeto para vincular por caminho)':
      'Image embedded in the page (open the project folder to link by path)',
    'Imagem incorporada na página': 'Image embedded in the page',
    'Não foi possível escolher a imagem': 'Could not choose the image',
    'Editar a regra {0} na aba CSS': 'Edit the {0} rule in the CSS tab',
    'Nenhuma regra encontrada para "{0}". Criar no CSS personalizado?':
      'No rule found for "{0}". Create it in custom CSS?',
    'Regras para #{0}': 'Rules for #{0}', 'Regras (um ID será gerado)': 'Rules (an ID will be generated)',
    'Gravado no CSS personalizado da página usando o ID do elemento. Suporta &:hover e media queries pelo painel de CSS global.':
      "Saved to the page's custom CSS using the element ID. Supports &:hover and media queries via the global CSS panel.",
    // Sessão / arquivos
    'Reabrindo {0}…': 'Reopening {0}…',
    'Clique em Abrir para conceder acesso ao último arquivo': 'Click Open to grant access to the last file',
    'Nenhum arquivo .html encontrado nessa pasta': 'No .html file found in that folder',
    'Página + {0} CSS salvos ✓': 'Page + {0} CSS saved ✓',
    'Permissão de escrita negada': 'Write permission denied',
    'Não foi possível abrir a pasta': 'Could not open the folder',
    'Não foi possível abrir o arquivo': 'Could not open the file',
    'Seu navegador não suporta abrir pastas — use o Chrome/Edge': 'Your browser cannot open folders — use Chrome/Edge',
    'Dica: abra a pasta do projeto para carregar CSS/JS externos': 'Tip: open the project folder to load external CSS/JS',
    '{0} aberto': '{0} opened', 'Solte um arquivo .html': 'Drop a .html file',
    'Erro ao salvar: {0}': 'Error saving: {0}',
    '{0} adicionado': '{0} added', '<{0}> copiado': '<{0}> copied',
    'Seletor copiado: {0}': 'Selector copied: {0}',
    'Não foi possível gravar {0}': 'Could not write {0}',
    'Páginas HTML': 'HTML pages', 'Reabrir {0}': 'Reopen {0}', 'Permissão negada': 'Permission denied',
    // Histórico
    'Restaurar esta versão': 'Restore this version', 'Baixar esta versão': 'Download this version',
    'Excluir do histórico': 'Remove from history',
    'Substituir as alterações atuais pela versão selecionada?': 'Replace current changes with the selected version?',
    'Versão de {0} restaurada — salve para gravar no arquivo': 'Version from {0} restored — save to write it to the file',
    '{0} versão(ões) de {1} — guardadas localmente no navegador (máx. 30)':
      '{0} version(s) of {1} — stored locally in the browser (max. 30)',
    'Nenhuma versão registrada ainda. Versões são gravadas ao abrir, salvar e exportar.':
      'No versions recorded yet. Versions are saved when opening, saving and exporting.',
    'Versão aberta': 'Opened version', 'Salvamento': 'Save', 'Exportação': 'Export', 'Restauração': 'Restore',
    'Excluir a regra "{0}"?': 'Delete the rule "{0}"?',
    // Painel de seletores
    '<style> da página': 'Page <style>', '{0} elemento(s) na página': '{0} element(s) on the page',
    'Abra uma página para listar os seletores.': 'Open a page to list its selectors.',
    'Nenhuma regra encontrada.': 'No rules found.',
    'Regra {0} criada no CSS personalizado': 'Rule {0} created in custom CSS',
    'Seletor da nova regra (ex.: .minha-classe, #meu-id):': 'New rule selector (e.g. .my-class, #my-id):',
    'Tam. da fonte': 'Font size', 'Gap': 'Gap', 'Padding': 'Padding', 'Margin': 'Margin',
    'Larg. máxima': 'Max width', 'Borda': 'Border', 'Raio': 'Radius', 'Opacidade': 'Opacity',
    // Camadas
    'Mostrar/ocultar': 'Show/hide', 'Aplicado em tempo real e salvo dentro da página': 'Applied live and saved inside the page',
    'sem título': 'untitled',
    // Grupos de elementos + seções
    'Componentes': 'Components', 'Seções': 'Sections',
    'Header': 'Header', 'Hero': 'Hero', 'Texto + Imagem': 'Text + Image', '3 Cards': '3 Cards',
    'FAQ': 'FAQ', 'Chamada (CTA)': 'Call to action (CTA)', 'Footer simples': 'Simple footer', 'Footer completo': 'Full footer',
    // Painel do documento
    'Geral': 'General',
    'CSS aplicado em tempo real e salvo dentro da página.': 'CSS applied live and saved inside the page.',
    'JS salvo na página (roda quando a página é aberta fora do editor).': 'JS saved in the page (runs when the page is opened outside the editor).',
    'Dentro do <head>': 'Inside <head>', 'Antes de </body>': 'Before </body>',
    // Topbar extras
    'Tamanho da tela': 'Screen size', 'Trocar de arquivo': 'Switch file',
    'Descartar alterações não salvas e abrir outro arquivo?': 'Discard unsaved changes and open another file?',
    // Sobre
    'Sobre o OmniEditor': 'About OmniEditor', 'Criado por': 'Created by',
    'Editor visual de páginas HTML — edite suas próprias páginas com granularidade total, em tempo real, direto no navegador.':
      'Visual HTML page editor — edit your own pages with full granularity, in real time, right in the browser.',
    'Produto livre para uso. O autor não se responsabiliza pelo mau uso da ferramenta nem por eventuais bugs ou perda de dados — faça backup das suas páginas.':
      'Free to use. The author is not liable for misuse of the tool or for any bugs or data loss — keep backups of your pages.',
    // Texto rico
    'Negrito': 'Bold', 'Itálico': 'Italic', 'Sublinhado': 'Underline', 'Riscado': 'Strikethrough',
    'Inserir link': 'Insert link', 'Envolver em span com classe': 'Wrap in span with class',
    'Limpar formatação': 'Clear formatting',
    'URL do link:': 'Link URL:', 'Classe do span (opcional):': 'Span class (optional):',
    // Estados
    'Estado': 'State', 'Normal': 'Normal', 'Hover': 'Hover', 'Active': 'Active',
    'Editando o estado :{0} — as mudanças viram uma regra CSS na página.':
      'Editing the :{0} state — changes become a CSS rule in the page.',
    // SEO / página
    'SEO e compartilhamento': 'SEO & sharing',
    'Descrição (meta description)': 'Description (meta description)',
    'Resumo da página em 1–2 frases (aparece no Google).': 'Page summary in 1–2 sentences (shown on Google).',
    'Favicon (caminho)': 'Favicon (path)',
    'ex.: favicon.ico ou img/icone.png': 'e.g. favicon.ico or img/icon.png',
    'Título de compartilhamento (og:title)': 'Share title (og:title)',
    'Usa o título da página se vazio': 'Uses the page title if empty',
    'Imagem de compartilhamento (og:image)': 'Share image (og:image)',
    'ex.: img/share.jpg ou URL completa': 'e.g. img/share.jpg or full URL',
    'Idioma da página (lang)': 'Page language (lang)', 'ex.: pt-BR, en, es': 'e.g. pt-BR, en, es',
    // Texto / modal
    'Texto (HTML)': 'Text (HTML)', 'Aplicar': 'Apply', 'Feito com ❤️ por': 'Made with ❤️ by',
  },
  es: {
    'Desfazer': 'Deshacer', 'Refazer': 'Rehacer',
    'Desktop': 'Escritorio', 'Laptop': 'Portátil', 'Tablet': 'Tableta', 'Mobile': 'Móvil',
    'Largura personalizada (px)': 'Ancho personalizado (px)',
    'Ajustar': 'Ajustar', 'Zoom': 'Zoom',
    'Modo de visualização — interagir com a página': 'Modo vista previa — interactuar con la página',
    'Histórico de edições': 'Historial de ediciones',
    'CSS personalizado': 'CSS personalizado',
    'Ajustes da página': 'Ajustes de la página',
    'Configurações': 'Configuración',
    'Estilos': 'Estilos',
    'Cores': 'Colores',
    'Fontes': 'Fuentes',
    'Cores e fontes detectadas na página. Alterar aqui reescreve todas as ocorrências no CSS de origem.':
      'Colores y fuentes detectados en la página. Cambiarlos aquí reescribe todas las apariciones en el CSS de origen.',
    'Nenhuma cor encontrada no CSS da página.': 'No se encontró ningún color en el CSS de la página.',
    'Nenhuma família de fonte declarada no CSS da página.': 'No hay ninguna familia de fuente declarada en el CSS de la página.',
    'Alterar cor': 'Cambiar color',
    '1 uso': '1 uso',
    '{0} usos': '{0} usos',
    '{0} ocorrências atualizadas': '{0} apariciones actualizadas',
    'Abrir': 'Abrir', 'Salvar': 'Guardar', 'Salvar como': 'Guardar como', 'Exportar': 'Exportar',
    'Exportar página': 'Exportar página',
    'Formato': 'Formato',
    'Imagem da página inteira': 'Imagen de la página completa',
    'Documento de uma página': 'Documento de una sola página',
    'Copiar': 'Copiar',
    'Copiar HTML para a área de transferência': 'Copiar HTML al portapapeles',
    '{0} não afeta um elemento inline. Mude o Display para block ou inline-block.':
      '{0} no afecta a un elemento inline. Cambia el Display a block o inline-block.',
    'O elemento ficou com {0} em vez de {1}: o tamanho está sendo definido pelo contêiner (flex/grid) ou por um min/max.':
      'El elemento quedó con {0} en lugar de {1}: el tamaño lo define el contenedor (flex/grid) o un min/max.',
    'Confirmar': 'Confirmar',
    'Descartar e abrir': 'Descartar y abrir',
    'As alterações feitas em {0} serão perdidas.': 'Los cambios hechos en {0} se perderán.',
    'página atual': 'página actual',
    'Restaurar': 'Restaurar',
    'As alterações não salvas serão perdidas.': 'Los cambios no guardados se perderán.',
    'Excluir': 'Eliminar',
    'A regra some do CSS onde está gravada. Dá para desfazer com ⌘Z.':
      'La regla se elimina del CSS donde está guardada. Puedes deshacer con ⌘Z.',
    'Nova regra CSS': 'Nueva regla CSS',
    'Criar regra': 'Crear regla',
    'Largura da página': 'Ancho de la página',
    'Renderizando… isso pode levar alguns segundos.': 'Renderizando… esto puede tardar unos segundos.',
    'HTML copiado para a área de transferência': 'HTML copiado al portapapeles',
    'Exportação concluída': 'Exportación completada',
    'Falha ao exportar: {0}': 'Error al exportar: {0}',
    'A página é muito alta: a exportação foi cortada em {0}px': 'La página es demasiado alta: la exportación se cortó en {0}px',
    'Abrir arquivo ou pasta': 'Abrir archivo o carpeta',
    'Salvar em novo arquivo': 'Guardar en un archivo nuevo',
    'Salvar no arquivo': 'Guardar en el archivo',
    'Alterações não salvas': 'Cambios sin guardar',
    'Elementos': 'Elementos', 'Camadas': 'Capas', 'CSS': 'CSS',
    'Arraste um elemento para a página': 'Arrastra un elemento a la página',
    'Buscar seletor…': 'Buscar selector…',
    'Todos': 'Todos', '+ Nova regra': '+ Nueva regla',
    'Seção': 'Sección', 'Container': 'Contenedor', '2 Colunas': '2 Columnas',
    'Título': 'Título', 'Texto': 'Texto', 'Botão': 'Botón', 'Imagem': 'Imagen',
    'Card': 'Tarjeta', 'Lista': 'Lista', 'Citação': 'Cita', 'Divisor': 'Divisor', 'Espaçador': 'Espaciador',
    'Página': 'Página', 'Estilo': 'Estilo', 'Animação': 'Animación', 'Avançado': 'Avanzado',
    'Clique em um elemento da página para editá-lo': 'Haz clic en un elemento de la página para editarlo',
    'Configurações da página': 'Configuración de la página',
    'Título da página': 'Título de la página', 'Cor de fundo': 'Color de fondo',
    'Fonte padrão': 'Fuente predeterminada', 'Cor do texto': 'Color del texto',
    'Dica: clique em qualquer elemento no canvas para editar estilos, animações e atributos. Duplo clique edita texto.':
      'Consejo: haz clic en cualquier elemento del lienzo para editar estilos, animaciones y atributos. Doble clic para editar texto.',
    'Elemento': 'Elemento', 'Layout': 'Diseño', 'Dimensões': 'Dimensiones',
    'Espaçamento': 'Espaciado', 'Tipografia': 'Tipografía', 'Fundo': 'Fondo',
    'Borda & Sombra': 'Borde y sombra', 'Posição': 'Posición', 'Efeitos': 'Efectos',
    'Origem da imagem (src)': 'Origen de la imagen (src)',
    'caminho relativo ou URL': 'ruta relativa o URL',
    'Escolher…': 'Elegir…', 'Escolher um arquivo de imagem': 'Elegir un archivo de imagen',
    'Aplica ao pressionar Enter ou sair do campo.': 'Se aplica al pulsar Enter o salir del campo.',
    'Texto alternativo (alt)': 'Texto alternativo (alt)',
    'Ajuste (object-fit)': 'Ajuste (object-fit)',
    'Link (href)': 'Enlace (href)', 'Abrir em nova aba': 'Abrir en nueva pestaña',
    'Display': 'Display', 'Direção': 'Dirección', 'Justificar': 'Justificar', 'Alinhar': 'Alinear',
    'Início': 'Inicio', 'Centro': 'Centro', 'Fim': 'Fin',
    'Espaço entre': 'Espacio entre', 'Espaço ao redor': 'Espacio alrededor', 'Espaço igual': 'Espacio uniforme',
    'Esticar': 'Estirar', 'Baseline': 'Línea base',
    'Espaço (gap)': 'Espacio (gap)', 'Quebra (wrap)': 'Ajuste (wrap)',
    'Sem quebra': 'Sin ajuste', 'Quebrar': 'Ajustar', 'Quebra reversa': 'Ajuste inverso',
    'Colunas (grid-template-columns)': 'Columnas (grid-template-columns)',
    'Overflow': 'Overflow', 'Linha': 'Fila', 'Coluna': 'Columna',
    'Linha reversa': 'Fila inversa', 'Coluna reversa': 'Columna inversa',
    'Largura': 'Ancho', 'Altura': 'Alto',
    'Larg. mín.': 'Anch. mín.', 'Larg. máx.': 'Anch. máx.', 'Alt. mín.': 'Alt. mín.', 'Alt. máx.': 'Alt. máx.',
    'Margem externa (margin)': 'Margen (margin)', 'Preenchimento (padding)': 'Relleno (padding)',
    'Sup': 'Sup', 'Dir': 'Der', 'Inf': 'Inf', 'Esq': 'Izq',
    'Vincular os 4 lados': 'Vincular los 4 lados',
    'Fonte': 'Fuente', 'Tamanho': 'Tamaño', 'Peso': 'Peso', 'Entrelinha': 'Interlineado',
    'Espaç. letras': 'Esp. letras', 'Alinhamento': 'Alineación', 'Caixa': 'Mayús/minús',
    'Decoração': 'Decoración', 'Estilo': 'Estilo',
    'Normal': 'Normal', 'MAIÚSCULAS': 'MAYÚSCULAS', 'minúsculas': 'minúsculas', 'Capitalizada': 'Capitalizada',
    'Nenhuma': 'Ninguna', 'Sublinhado': 'Subrayado', 'Riscado': 'Tachado', 'Sobrelinha': 'Línea superior',
    'Itálico': 'Cursiva', 'Esquerda': 'Izquierda', 'Direita': 'Derecha', 'Justificado': 'Justificado',
    'Tipo': 'Tipo', 'Cor': 'Color', 'Gradiente': 'Degradado',
    'Cor inicial': 'Color inicial', 'Cor final': 'Color final', 'Ângulo': 'Ángulo',
    'URL da imagem': 'URL de la imagen', 'Posição': 'Posición',
    'auto': 'auto', 'esticar': 'estirar',
    'centro': 'centro', 'topo': 'arriba', 'base': 'abajo', 'esquerda': 'izquierda', 'direita': 'derecha',
    'Repetição': 'Repetición', 'não repetir': 'no repetir', 'repetir': 'repetir',
    'horizontal': 'horizontal', 'vertical': 'vertical',
    'Fixação': 'Fijación', 'rolar': 'desplazar', 'fixa (parallax)': 'fija (parallax)',
    'Cor de apoio': 'Color de apoyo',
    'Espessura': 'Grosor', 'nenhum': 'ninguno', 'sólido': 'sólido', 'tracejado': 'discontinuo',
    'pontilhado': 'punteado', 'duplo': 'doble', 'Cor da borda': 'Color del borde',
    'Raio dos cantos (border-radius)': 'Radio de esquinas (border-radius)',
    'Sombra': 'Sombra', 'Suave': 'Suave', 'Média': 'Media', 'Forte': 'Fuerte', 'Personalizada': 'Personalizada',
    'Deslocamento (top/right/bottom/left)': 'Desplazamiento (top/right/bottom/left)', 'Z-index': 'Z-index',
    'Opacidade (%)': 'Opacidad (%)', 'Mover X': 'Mover X', 'Mover Y': 'Mover Y',
    'Escala': 'Escala', 'Rotação (°)': 'Rotación (°)', 'Desfoque (blur px)': 'Desenfoque (px)',
    'Brilho (%)': 'Brillo (%)', 'Contraste (%)': 'Contraste (%)', 'Saturação (%)': 'Saturación (%)',
    'Preto & branco (%)': 'Escala de grises (%)', 'Transição (s)': 'Transición (s)', 'Cursor': 'Cursor',
    'Animação GSAP': 'Animación GSAP', 'Ativar animação GSAP': 'Activar animación GSAP',
    'Preset': 'Preset', 'Disparo': 'Disparo', 'Ao carregar': 'Al cargar', 'Ao rolar': 'Al desplazar',
    'Duração (s)': 'Duración (s)', 'Atraso (s)': 'Retraso (s)', 'Easing': 'Easing',
    'Animar só uma vez': 'Animar solo una vez', 'Repetições (-1 = infinito)': 'Repeticiones (-1 = infinito)',
    'Vai e volta (yoyo)': 'Ida y vuelta (yoyo)', 'Animar filhos em sequência (stagger)': 'Animar hijos en secuencia (stagger)',
    'Intervalo do stagger (s)': 'Intervalo del stagger (s)',
    'Vars extras do gsap.from (JSON, opcional)': 'Vars extra de gsap.from (JSON, opcional)',
    '▶  Testar': '▶  Probar', 'Testar todas': 'Probar todas', '▶  Reproduzir todas': '▶  Reproducir todas',
    'Selecione um elemento para configurar animações GSAP. As animações são salvas na página e funcionam fora do editor.':
      'Selecciona un elemento para configurar animaciones GSAP. Las animaciones se guardan en la página y funcionan fuera del editor.',
    'Ao salvar, o GSAP e o ScrollTrigger são incluídos automaticamente na página para reproduzir as animações.':
      'Al guardar, GSAP y ScrollTrigger se incluyen automáticamente en la página para reproducir las animaciones.',
    'Identificação': 'Identificación', 'ID': 'ID',
    'Classes (separadas por espaço)': 'Clases (separadas por espacio)',
    'Clique para editar a regra na aba CSS.': 'Haz clic para editar la regla en la pestaña CSS.',
    'CSS deste elemento': 'CSS de este elemento', 'HTML do elemento': 'HTML del elemento',
    'Edite e clique fora para aplicar.': 'Edita y haz clic fuera para aplicar.',
    'Duplicar': 'Duplicar', 'Excluir': 'Eliminar',
    'Selecione um elemento para editar ID, classes, CSS específico e HTML.':
      'Selecciona un elemento para editar ID, clases, CSS específico y HTML.',
    'Tema da interface': 'Tema de la interfaz', 'Claro': 'Claro', 'Escuro': 'Oscuro',
    'Cor de destaque': 'Color de acento', 'Idioma': 'Idioma',
    'Abrir/fechar painel de edição': 'Abrir/cerrar panel de edición',
    'Mais opções de arquivo': 'Más opciones de archivo',
    'Editor visual para suas páginas HTML. Abra uma pasta para que os arquivos CSS/JS externos sejam carregados automaticamente.':
      'Editor visual para tus páginas HTML. Abre una carpeta para que los archivos CSS/JS externos se carguen automáticamente.',
    'Abrir pasta do projeto': 'Abrir carpeta del proyecto', 'Abrir arquivo HTML': 'Abrir archivo HTML',
    'Nova página em branco': 'Nueva página en blanco', 'Experimentar com página demo': 'Probar con la página demo',
    '…ou solte um arquivo .html aqui': '…o suelta un archivo .html aquí',
    'Escolha a página para editar': 'Elige la página a editar', 'Cancelar': 'Cancelar', 'Fechar': 'Cerrar',
    'Excluir regra': 'Eliminar regla', 'Propriedades comuns': 'Propiedades comunes',
    'Código da regra': 'Código de la regla', 'aplicado em tempo real': 'aplicado en vivo',
    'propriedade: valor;': 'propiedad: valor;',
    'Editar texto': 'Editar texto', 'Copiar': 'Copiar', 'Recortar': 'Cortar', 'Colar depois': 'Pegar después',
    'Mover para cima': 'Mover arriba', 'Mover para baixo': 'Mover abajo',
    'Selecionar elemento pai': 'Seleccionar elemento padre', 'Ocultar elemento': 'Ocultar elemento',
    'Mostrar elemento': 'Mostrar elemento', 'Copiar seletor CSS': 'Copiar selector CSS',
    'Animação…': 'Animación…', 'Editar HTML…': 'Editar HTML…',
    'Abra uma página primeiro': 'Abre una página primero',
    'Página salva ✓': 'Página guardada ✓', 'HTML exportado': 'HTML exportado',
    'Modo visualização — links e interações ativos': 'Modo vista previa — enlaces e interacciones activos',
    'Elemento colado': 'Elemento pegado', 'Regra excluída': 'Regla eliminada',
    'Esta página tem {0} elemento(s) animado(s) com GSAP.': 'Esta página tiene {0} elemento(s) animado(s) con GSAP.',
    'Arquivo não encontrado na pasta: {0}': 'Archivo no encontrado en la carpeta: {0}',
    'Imagem': 'Imagen', 'Imagem vinculada: {0}': 'Imagen vinculada: {0}',
    'Arquivo fora da pasta do projeto — imagem incorporada na página':
      'Archivo fuera de la carpeta del proyecto — imagen incorporada en la página',
    'Imagem incorporada na página (abra a pasta do projeto para vincular por caminho)':
      'Imagen incorporada en la página (abre la carpeta del proyecto para vincular por ruta)',
    'Imagem incorporada na página': 'Imagen incorporada en la página',
    'Não foi possível escolher a imagem': 'No se pudo elegir la imagen',
    'Editar a regra {0} na aba CSS': 'Editar la regla {0} en la pestaña CSS',
    'Nenhuma regra encontrada para "{0}". Criar no CSS personalizado?':
      'No se encontró ninguna regla para "{0}". ¿Crearla en CSS personalizado?',
    'Regras para #{0}': 'Reglas para #{0}', 'Regras (um ID será gerado)': 'Reglas (se generará un ID)',
    'Gravado no CSS personalizado da página usando o ID do elemento. Suporta &:hover e media queries pelo painel de CSS global.':
      'Guardado en el CSS personalizado de la página usando el ID del elemento. Admite &:hover y media queries desde el panel de CSS global.',
    'Reabrindo {0}…': 'Reabriendo {0}…',
    'Clique em Abrir para conceder acesso ao último arquivo': 'Haz clic en Abrir para conceder acceso al último archivo',
    'Nenhum arquivo .html encontrado nessa pasta': 'No se encontró ningún archivo .html en esa carpeta',
    'Página + {0} CSS salvos ✓': 'Página + {0} CSS guardados ✓',
    'Permissão de escrita negada': 'Permiso de escritura denegado',
    'Não foi possível abrir a pasta': 'No se pudo abrir la carpeta',
    'Não foi possível abrir o arquivo': 'No se pudo abrir el archivo',
    'Seu navegador não suporta abrir pastas — use o Chrome/Edge': 'Tu navegador no admite abrir carpetas — usa Chrome/Edge',
    'Dica: abra a pasta do projeto para carregar CSS/JS externos': 'Consejo: abre la carpeta del proyecto para cargar CSS/JS externos',
    '{0} aberto': '{0} abierto', 'Solte um arquivo .html': 'Suelta un archivo .html',
    'Erro ao salvar: {0}': 'Error al guardar: {0}',
    '{0} adicionado': '{0} añadido', '<{0}> copiado': '<{0}> copiado',
    'Seletor copiado: {0}': 'Selector copiado: {0}',
    'Não foi possível gravar {0}': 'No se pudo escribir {0}',
    'Páginas HTML': 'Páginas HTML', 'Reabrir {0}': 'Reabrir {0}', 'Permissão negada': 'Permiso denegado',
    'Restaurar esta versão': 'Restaurar esta versión', 'Baixar esta versão': 'Descargar esta versión',
    'Excluir do histórico': 'Eliminar del historial',
    'Substituir as alterações atuais pela versão selecionada?': '¿Reemplazar los cambios actuales por la versión seleccionada?',
    'Versão de {0} restaurada — salve para gravar no arquivo': 'Versión de {0} restaurada — guarda para escribirla en el archivo',
    '{0} versão(ões) de {1} — guardadas localmente no navegador (máx. 30)':
      '{0} versión(es) de {1} — guardadas localmente en el navegador (máx. 30)',
    'Nenhuma versão registrada ainda. Versões são gravadas ao abrir, salvar e exportar.':
      'Aún no hay versiones registradas. Las versiones se guardan al abrir, guardar y exportar.',
    'Versão aberta': 'Versión abierta', 'Salvamento': 'Guardado', 'Exportação': 'Exportación', 'Restauração': 'Restauración',
    'Excluir a regra "{0}"?': '¿Eliminar la regla "{0}"?',
    '<style> da página': '<style> de la página', '{0} elemento(s) na página': '{0} elemento(s) en la página',
    'Abra uma página para listar os seletores.': 'Abre una página para listar sus selectores.',
    'Nenhuma regra encontrada.': 'No se encontraron reglas.',
    'Regra {0} criada no CSS personalizado': 'Regla {0} creada en CSS personalizado',
    'Seletor da nova regra (ex.: .minha-classe, #meu-id):': 'Selector de la nueva regla (ej.: .mi-clase, #mi-id):',
    'Tam. da fonte': 'Tam. de fuente', 'Gap': 'Gap', 'Padding': 'Relleno', 'Margin': 'Margen',
    'Larg. máxima': 'Ancho máx.', 'Borda': 'Borde', 'Raio': 'Radio', 'Opacidade': 'Opacidad',
    'Mostrar/ocultar': 'Mostrar/ocultar', 'Aplicado em tempo real e salvo dentro da página': 'Aplicado en vivo y guardado dentro de la página',
    'sem título': 'sin título',
    'Componentes': 'Componentes', 'Seções': 'Secciones',
    'Header': 'Header', 'Hero': 'Hero', 'Texto + Imagem': 'Texto + Imagen', '3 Cards': '3 Tarjetas',
    'FAQ': 'FAQ', 'Chamada (CTA)': 'Llamada (CTA)', 'Footer simples': 'Footer simple', 'Footer completo': 'Footer completo',
    'Geral': 'General',
    'CSS aplicado em tempo real e salvo dentro da página.': 'CSS aplicado en vivo y guardado dentro de la página.',
    'JS salvo na página (roda quando a página é aberta fora do editor).': 'JS guardado en la página (se ejecuta al abrir la página fuera del editor).',
    'Dentro do <head>': 'Dentro de <head>', 'Antes de </body>': 'Antes de </body>',
    'Tamanho da tela': 'Tamaño de pantalla', 'Trocar de arquivo': 'Cambiar de archivo',
    'Descartar alterações não salvas e abrir outro arquivo?': '¿Descartar cambios sin guardar y abrir otro archivo?',
    'Sobre o OmniEditor': 'Acerca de OmniEditor', 'Criado por': 'Creado por',
    'Editor visual de páginas HTML — edite suas próprias páginas com granularidade total, em tempo real, direto no navegador.':
      'Editor visual de páginas HTML — edita tus propias páginas con total granularidad, en tiempo real, directo en el navegador.',
    'Produto livre para uso. O autor não se responsabiliza pelo mau uso da ferramenta nem por eventuais bugs ou perda de dados — faça backup das suas páginas.':
      'Producto de uso libre. El autor no se responsabiliza por el mal uso de la herramienta ni por posibles errores o pérdida de datos — haz copias de seguridad de tus páginas.',
    'Negrito': 'Negrita', 'Itálico': 'Cursiva', 'Sublinhado': 'Subrayado', 'Riscado': 'Tachado',
    'Inserir link': 'Insertar enlace', 'Envolver em span com classe': 'Envolver en span con clase',
    'Limpar formatação': 'Limpiar formato',
    'URL do link:': 'URL del enlace:', 'Classe do span (opcional):': 'Clase del span (opcional):',
    'Estado': 'Estado', 'Normal': 'Normal', 'Hover': 'Hover', 'Active': 'Active',
    'Editando o estado :{0} — as mudanças viram uma regra CSS na página.':
      'Editando el estado :{0} — los cambios se convierten en una regla CSS en la página.',
    'SEO e compartilhamento': 'SEO y compartir',
    'Descrição (meta description)': 'Descripción (meta description)',
    'Resumo da página em 1–2 frases (aparece no Google).': 'Resumen de la página en 1–2 frases (aparece en Google).',
    'Favicon (caminho)': 'Favicon (ruta)',
    'ex.: favicon.ico ou img/icone.png': 'ej.: favicon.ico o img/icono.png',
    'Título de compartilhamento (og:title)': 'Título para compartir (og:title)',
    'Usa o título da página se vazio': 'Usa el título de la página si está vacío',
    'Imagem de compartilhamento (og:image)': 'Imagen para compartir (og:image)',
    'ex.: img/share.jpg ou URL completa': 'ej.: img/share.jpg o URL completa',
    'Idioma da página (lang)': 'Idioma de la página (lang)', 'ex.: pt-BR, en, es': 'ej.: pt-BR, en, es',
    'Texto (HTML)': 'Texto (HTML)', 'Aplicar': 'Aplicar', 'Feito com ❤️ por': 'Hecho con ❤️ por',
  },
};

// Traduz `pt` para o idioma atual; substitui {0},{1}… por args.
export function t(pt, ...args) {
  let s = (lang === 'pt-BR' ? pt : (DICT[lang]?.[pt] ?? pt));
  if (args.length) s = s.replace(/\{(\d+)\}/g, (_, i) => (args[i] ?? ''));
  return s;
}

export const getLang = () => lang;

export function setLang(next) {
  if (!LANGS[next] || next === lang) return;
  lang = next;
  document.documentElement.lang = next;
  changeListeners.forEach(fn => fn(lang));
}

export function onLangChange(fn) { changeListeners.push(fn); }

// Aplica traduções aos elementos estáticos marcados no HTML.
// data-i18n = textContent; data-i18n-ph = placeholder; data-i18n-title = title.
export function applyStaticI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = t(n.getAttribute('data-i18n')); });
  root.querySelectorAll('[data-i18n-ph]').forEach(n => { n.placeholder = t(n.getAttribute('data-i18n-ph')); });
  root.querySelectorAll('[data-i18n-title]').forEach(n => {
    const kbd = n.getAttribute('data-kbd');
    n.title = t(n.getAttribute('data-i18n-title')) + (kbd ? ` (${kbd})` : '');
  });
}
