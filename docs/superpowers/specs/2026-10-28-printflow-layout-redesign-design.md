# PrintFlow — Redesign de layout e interface

## Objetivo

Refazer a experiência visual da central PrintFlow para que operadores acompanhem clientes, impressoras, alertas e agentes com leitura rápida, navegação previsível e boa operação em telas menores. A mudança preserva rotas, API, dados e ações existentes; trata apresentação, hierarquia e interação.

## Público e contexto

Operadores de TI e impressão acompanham várias empresas e precisam localizar rapidamente impressoras offline, toner baixo, clientes sem agente e tarefas de configuração. O painel deve funcionar durante o expediente em monitores comuns e também em notebooks e celulares usados para consulta.

## Metas

- Criar um sistema visual consistente para login, navegação, páginas, cartões, tabelas, formulários, estados vazios e erros.
- Tornar o dashboard um resumo operacional acionável, com saúde da frota, alertas e atividades recentes.
- Melhorar a navegação entre visão geral e contexto de cliente.
- Fazer tabelas e controles funcionarem em larguras pequenas sem rolagem da página inteira.
- Preservar acessibilidade de teclado, foco, rótulos, contraste e redução de movimento.
- Manter o login leve e funcional antes de carregar o painel React.

## Fora de escopo

- Alterar API, autenticação, regras de negócio, estrutura de dados ou coleta dos agentes.
- Adicionar dependências de ícones, componentes ou fontes externas.
- Inventar indicadores ou ações sem suporte nos dados/endpoints atuais.

## Abordagens consideradas

1. **Centro operacional claro (escolhida):** navegação azul-marinho, canvas claro e neutro, superfícies brancas, azul PrintFlow para ações e verde/âmbar/vermelho para estados. Mantém boa leitura em uso prolongado e permite tabelas informativas com hierarquia forte.
2. **Console integralmente escuro:** combina com ferramentas técnicas e destaca status, mas reduz conforto em ambientes iluminados e torna páginas de tabela longas mais cansativas.
3. **Glassmorphism:** dá uma aparência promocional e em camadas, mas acrescenta decoração onde o operador precisa comparar dados e aumenta dependência de fundos e efeitos.

A primeira abordagem foi escolhida como decisão de implementação, conforme autorização do proprietário para seguir diretamente com escolhas sensatas. A base de produto/UX do UI UX Pro Max recomenda status semânticos e leitura operacional; foram priorizados contraste, resposta imediata e divisão por rotas.

## Direção visual

- Paleta semântica: canvas `#F4F7FB`, superfícies `#FFFFFF`, navegação `#101B2D`, texto `#162235`, texto secundário `#607086`, borda `#E0E7EF`, azul primário `#2457D6`, sucesso `#16845B`, aviso `#B76A08`, erro `#C13B43`.
- Tipografia: sistema sans local para interface; fonte mono somente para IP, hostname e dados técnicos. Não depender de Google Fonts para renderizar a central.
- Espaçamento baseado em múltiplos de 4 e 8px; largura de conteúdo com limite confortável; cabeçalhos e cartões com raios discretos e elevação leve.
- Status sempre com texto e ícone/forma além de cor; foco visível; alvos de interação de pelo menos 40px.
- Movimento breve e funcional; respeitar `prefers-reduced-motion`.

## Estrutura da experiência

- Shell desktop com sidebar fixa recolhível, marca, grupos de navegação, seletor de cliente e rodapé de sessão.
- Em tablet/celular, sidebar vira drawer acionado por botão acessível; conteúdo fica em uma coluna com cabeçalho compacto.
- Barra superior apresenta localização da página, status da central/última atualização e ações contextuais.
- Páginas têm título, explicação curta, ação principal, filtros, conteúdo e estados vazios/erro consistentes.
- Dashboard prioriza resumo global, alertas ativos, saúde da frota, volume de impressão e clientes recentes.
- Clientes, impressoras, agentes, alertas e relatórios ganham cabeçalho e filtros consistentes, tabelas legíveis e disposição adaptável.
- Detalhe de cliente e de impressora preservam abas, dados, controles SNMP/agente, suprimentos e histórico; reorganizam esses grupos em blocos de leitura claros.
- Configurações conserva informações de conexão, sessão e alteração da senha, com explicação e estados de salvamento/erro.
- Login permanece fora do bundle React até o acesso ser validado.

## Acessibilidade e responsividade

- Alvos: 375, 768, 1024 e 1440px.
- Teclado percorre navegação, filtros, tabelas, abas e ações em ordem lógica; foco não é removido.
- Labels associados a campos, aria-label para botões de ícone, aria-current/selected nos estados e mensagens de erro próximas do campo/ação.
- Contraste de texto normal de pelo menos 4,5:1; estados nunca indicados apenas por cor.
- `prefers-reduced-motion` desliga transições não essenciais; zoom do navegador segue habilitado.

## Restrições técnicas

- Aplicação React + TypeScript + TanStack Router + Tailwind 4; servidor .NET e endpoints atuais permanecem inalterados.
- Reusar Lucide e os componentes existentes onde adequado; centralizar tokens e padrões em `styles.css`, `AppLayout.tsx` e componentes pequenos.
- Não remover recursos existentes nem quebrar URLs profundas.
- Manter login isolado como HTML/TS leve; o app completo só é carregado após sessão válida.

## Critérios de aceite

- Todas as páginas citadas usam o mesmo sistema de tipografia, cor, espaçamento, navegação e superfícies.
- A sidebar é navegável em desktop e celular, com drawer funcional e indicação da rota ativa.
- Dashboard e listas mantêm os mesmos dados e ações; filtros, links, formulários e exportação continuam operando.
- Detalhes de cliente/impressora mantêm abas, formulários e toggles sem perda de comportamento.
- Em 375px não existe rolagem horizontal da página; tabelas usam rolagem local ou cartões.
- Build de produção da central conclui; login permanece leve e separado.
