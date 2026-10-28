# PrintFlow Central Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or equivalent task-by-task execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir cache, login e cadastro para que a central responda de forma previsível e o agente permaneça vinculado ao cliente correto.

**Architecture:** O servidor controla o cache da entrada HTML e mantém o cookie somente para autorizar chamadas da SPA. O bootstrap HTML controla o login; a SPA inicia apenas após sucesso. O cliente HTTP aplica prazo limite e o cadastro não bloqueia a tela enquanto a lista é revalidada.

**Tech Stack:** ASP.NET Core 8, React 19, TanStack Query, Vite, SQLite temporário para smoke test.

**Spec:** `docs/superpowers/specs/2026-10-28-central-reliability-design.md`

## Global Constraints

- Não gravar registros de teste no banco operacional.
- Não expor senha, token de agente ou outros segredos em logs ou commits.
- Preservar as APIs e o protocolo já usado pelo agente.
- Publicar somente depois de build e smoke test em central isolada.

## Review Focus

- Aba antiga: recarregar recebe `index.html` sem cache e não mantém código anterior.
- Sessão válida: abrir ou recarregar a central mostra login até a senha ser enviada.
- Central indisponível: cadastro retorna mensagem após o prazo, sem bloquear controles.
- Cadastro válido: cria cliente e torna a tela utilizável antes da revalidação da lista.
- Instalador: a configuração embutida contém o ID/servidor/token do cliente e o token é aceito somente para aquele ID.

---

### Task 1: Entrada e sessão determinísticas

**Files:**
- Modify: `ServerMock/Program.cs`
- Modify: `AdminPanelV2/spa/bootstrap.ts`
- Modify: `AdminPanelV2/src/routes/__root.tsx`

- [ ] Definir `Cache-Control: no-store` para `index.html` no middleware de arquivos estáticos.
- [ ] Remover a restauração automática de sessão no bootstrap e a barreira de login duplicada da SPA.
- [ ] Compilar central e conferir o cabeçalho HTTP da entrada.
- [ ] Commit: `fix: make PrintFlow login entry deterministic`

### Task 2: Cadastro resistente a falhas

**Files:**
- Modify: `AdminPanelV2/src/lib/api.ts`
- Modify: `AdminPanelV2/src/routes/clientes.index.tsx`
- Modify: `ServerMock/Program.cs`

- [ ] Aplicar prazo limite às chamadas administrativas e mensagem de falha clara.
- [ ] Validar os dados mínimos do cliente no servidor.
- [ ] Finalizar a mutação de cadastro antes da atualização assíncrona do dashboard.
- [ ] Build e teste de criação em banco temporário.
- [ ] Commit: `fix: keep client registration responsive`

### Task 3: Smoke test isolado e publicação

**Files:**
- Create: `scripts/Test-Central-Smoke.ps1`
- Inspect: `Agent/AgentClient.cs`
- Inspect: `ServerMock/Program.cs`

- [ ] Iniciar central temporária com banco e credencial descartáveis.
- [ ] Testar login, cadastro, atualização, chamadas protegidas, fila do agente e rejeição de token incorreto.
- [ ] Confirmar o vínculo do instalador por `ClientId` e token sem logar o segredo.
- [ ] Executar build e publicar os assets; criar e enviar os commits.
