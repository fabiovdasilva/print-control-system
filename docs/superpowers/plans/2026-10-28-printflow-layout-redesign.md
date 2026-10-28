
## Status da execução — 28/10/2026

- Concluídos: novo sistema de tokens, shell, navegação desktop/móvel, padrões compartilhados de título/cartão/painel/estado vazio, tratamento de listas do dashboard/clientes/impressoras e estado vazio em alertas/agentes/relatórios.
- Aplicada a identidade visual comum às rotas existentes, preservando handlers, endpoints e navegação. Detalhes de cliente/impressora e configurações mantêm a estrutura funcional e recebem os novos tokens e componentes compartilhados.
- Login continua em HTML/CSS leve separado da SPA e só carrega o dashboard autenticado.
- Verificado: build de produção concluído, `tsc --noEmit` concluído, assets publicados no `wwwroot` e resposta HTTP 200 na central. Screenshot desktop revisado.
- Revisão manual em navegador nos quatro tamanhos e interação de cada rota não foi executada nesta etapa; os breakpoints, foco e overflow foram revisados no código.
# PrintFlow UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refazer a interface inteira da central PrintFlow com navegação responsiva, hierarquia operacional e componentes consistentes, preservando todas as funções atuais.

**Architecture:** Manter a API e o modelo de rotas. Criar tokens e componentes de shell compartilhados; adaptar as páginas por grupos de uso. O login permanece como bootstrap HTML leve e só carrega React após sessão autenticada.

**Tech Stack:** React, TypeScript, TanStack Router/Query, Tailwind CSS 4, Lucide, Vite central build, ASP.NET static serving.

**Spec:** `docs/superpowers/specs/2026-10-28-printflow-layout-redesign-design.md`

## Global Constraints

- Não alterar API, autenticação, banco, payloads, rotas ou regras de negócio.
- Não adicionar dependências, fontes remotas ou bibliotecas de ícones.
- Preservar dashboard, clientes, detalhe de cliente, impressoras, detalhe de impressora, alertas, agentes, relatórios e configurações.
- Alvos responsivos: 375, 768, 1024 e 1440px; sem rolagem horizontal global em 375px.
- Login HTML leve precisa continuar sem carregar o bundle React antes de autenticar.
- Manter commit ordinário por etapa; não reescrever histórico de `master`.

## Review Focus

- 375px: navegação e tabelas não causam overflow — validar shell e tabelas em viewport 375px.
- Teclado: drawer, cliente seletor, abas e ações têm foco visível — validar fluxo principal por teclado.
- Sem dados: estados vazios explicam o próximo passo — revisar dashboard, clientes, agentes, alertas e relatórios.
- Erro/rede: alertas e falhas mantêm contexto e ação de recuperação — revisar estados existentes e estilos.
- Contraste/status: online, aviso, offline e erros incluem texto/ícone e contraste — revisar tokens e componentes compartilhados.
- Sessão: login continua leve e só monta SPA depois da validação — verificar HTML/asset inicial e autenticação.

---

### Task 1: Sistema visual e shell responsivo

**Files:**
- Modify: `AdminPanelV2/src/styles.css`
- Modify: `AdminPanelV2/src/components/AppLayout.tsx`
- Modify: `AdminPanelV2/src/components/AppSidebar.tsx`
- Modify: `AdminPanelV2/spa/bootstrap.css`
- Modify: `AdminPanelV2/spa/index.html`
- Modify: `AdminPanelV2/spa/bootstrap.ts`

- [ ] Definir tokens semânticos para superfícies, texto, navegação, bordas, foco e estados em `styles.css`.
- [ ] Refazer shell com sidebar desktop, drawer móvel, cabeçalho de página, seletor de cliente, estado/atualização e identidade de sessão sem texto fictício.
- [ ] Tornar PageTitle, KpiCard e Panel os blocos padrão de páginas, com densidade e estados consistentes.
- [ ] Aplicar a mesma direção visual à tela leve de login sem adicionar dependências.
- [ ] Revisar menu aberto/fechado, foco e links acessíveis em larguras 375/768/1024/1440px.
- [ ] Executar build de produção central e inspecionar o diff.
- [ ] Commit: `style: rebuild PrintFlow shell and design tokens`

### Task 2: Visão geral e descoberta de frota

**Files:**
- Modify: `AdminPanelV2/src/routes/index.tsx`
- Modify: `AdminPanelV2/src/routes/clientes.index.tsx`
- Modify: `AdminPanelV2/src/routes/impressoras.tsx`
- Modify: `AdminPanelV2/src/components/AlertsList.tsx`
- Modify as needed: `AdminPanelV2/src/components/VolumeChart.tsx`

- [ ] Reorganizar dashboard em saúde da frota, alertas prioritários, tendência de impressão e lista de clientes.
- [ ] Melhorar busca, filtros, ações, cabeçalhos e estados vazios nas listas de clientes/impressoras sem alterar seus handlers ou URLs.
- [ ] Fazer cartões e tabelas refluírem; usar rolagem interna só onde a tabela realmente precisa.
- [ ] Verificar busca, abrir detalhe e links de navegação usando dados existentes.
- [ ] Executar build de produção central; revisar visual em desktop e 375px.
- [ ] Commit: `style: redesign fleet overview and lists`

### Task 3: Operação de cliente e impressora

**Files:**
- Modify: `AdminPanelV2/src/routes/clientes.$clientId.tsx`
- Modify: `AdminPanelV2/src/routes/clientes_.$clientId.impressoras.$printerId.tsx`

- [ ] Reagrupar resumo, abas, rede/agentes, suprimentos e histórico em seções com leitura clara.
- [ ] Atualizar formulários, toggles, tabelas e ações de varredura mantendo validação e chamadas atuais.
- [ ] Ajustar detalhe de impressora para priorizar estado, consumíveis e histórico; manter navegação de volta.
- [ ] Verificar abas, configuração dos papéis do agente, atualização, histórico e ações principais.
- [ ] Executar build de produção central; revisar visual desktop e mobile.
- [ ] Commit: `style: redesign client and printer operations`

### Task 4: Alertas, agentes, relatórios e configurações

**Files:**
- Modify: `AdminPanelV2/src/routes/alertas.tsx`
- Modify: `AdminPanelV2/src/routes/agentes.tsx`
- Modify: `AdminPanelV2/src/routes/relatorios.tsx`
- Modify: `AdminPanelV2/src/routes/configuracoes.tsx`

- [ ] Reaplicar cabeçalhos, filtros, cartões, tabelas, badges e estados vazios consistentes.
- [ ] Tornar severidade/estado compreensível sem cor e destacar atualização/ausência de heartbeat.
- [ ] Preservar CSV, dados de sessão, alteração de senha e operação de logout.
- [ ] Verificar exportação CSV e ações de formulário; executar build central.
- [ ] Commit: `style: redesign operations and settings pages`

### Task 5: Verificação visual e publicação

**Files:**
- Inspect: `ServerMock/wwwroot/index.html`
- Generate: `ServerMock/wwwroot/assets/*` conforme build

- [ ] Executar build completo `build:central` com o carregador de configuração de ambiente já documentado.
- [ ] Verificar no navegador dashboard, uma lista, detalhe de cliente, tela de impressora, alertas, agentes, relatórios e configurações.
- [ ] Verificar login isolado, sessão válida, estados vazios e largura 375px; corrigir divergências.
- [ ] Confirmar `git status`, commit dos assets gerados e enviar `master` ao GitHub.
