# Print Control System

Protótipo funcional de monitoramento de impressoras em rede. A solução reúne uma central HTTP, um agente Windows instalado no cliente e um painel administrativo.

## Componentes

- **Central** — ASP.NET Core 8 e SQLite. Recebe heartbeat, relatórios SNMP e eventos do spooler; mantém clientes, impressoras, trabalhos, cotas e comandos pendentes.
- **Agente Windows** — coleta informações na rede local por SNMP e observa trabalhos do spooler. Cada instalador baixado é configurado para um cliente e recebe uma credencial própria. O scanner principal faz uma leitura inicial e repete a varredura conforme o intervalo definido no cadastro.
- **Painel** — React, Vite e TanStack Router, em `AdminPanelV2/`. As páginas administrativas consultam a API protegida.

## Iniciar localmente no Windows

1. Na primeira execução, abra Configurar_Senha_Admin.vbs e defina uma senha com pelo menos 12 caracteres.
2. Abra Iniciar_Sistema_Servidor.bat. A central inicia em segundo plano, sem deixar uma janela de comando aberta.
3. Acesse http://localhost:5000 e entre com a senha administrativa.
4. Cadastre o cliente e defina as sub-redes em CIDR (por exemplo, 192.168.10.0/24) e a comunidade SNMP aceita pelas impressoras.
5. Publique o agente com scripts/publish-agent.ps1.
6. Baixe o instalador pela página do cliente e execute-o em um Windows na rede do cliente.

Para iniciar automaticamente após o usuário entrar no Windows, abra Instalar_Inicializacao_Automatica.vbs uma vez. A central roda na sessão desse usuário; ao sair dela, o processo é encerrado. Parar_Sistema.bat fecha apenas a central PrintFlow na porta 5000. Os registros ficam em %LOCALAPPDATA%\PrintFlow.

Para desenvolvimento da interface, instale Node.js com npm e, em AdminPanelV2, execute npm install e npm run dev.

## Executar no servidor da rede

No servidor 192.168.0.225, com o .NET 8 SDK instalado, configure a senha uma vez com Configurar_Senha_Admin.vbs e depois abra Iniciar_Sistema_Servidor.bat. A janela fecha logo após iniciar; a central segue em segundo plano. Para iniciar automaticamente quando o usuário do servidor entrar no Windows, abra Instalar_Inicializacao_Automatica.vbs uma vez.

Acesse http://192.168.0.225:5000; painel e API são atendidos pelo mesmo processo, e os agentes enviam dados para /api nesse endereço. A porta 5001 do PrintControl existente permanece intacta. O banco, a senha em hash, a chave local da sessão e os logs ficam em %LOCALAPPDATA%\PrintFlow do usuário que executa a central. O acesso ainda usa HTTP; configure HTTPS antes de acessar por redes não confiáveis.

## Configuração

- `PRINT_CONTROL_DB_PATH`: caminho opcional do SQLite. Padrão: `ServerMock/printcontrol.db`.
- `PRINT_CONTROL_AGENT_EXE`: caminho opcional do agente publicado. Padrão: `ServerMock/AgentPublish/Agent.exe`.
- `PRINT_CONTROL_ADMIN_AUTH_FILE`: arquivo local com hash e salt da senha administrativa; padrão: `admin-auth.json` ao lado do banco.
- `PRINT_CONTROL_CORS_ORIGINS`: origens de desenvolvimento separadas por ponto e vírgula. Em produção, painel e API usam a mesma origem.
- `PRINT_CONTROL_LISTEN_URL`: endereço opcional da central. Padrão: `http://0.0.0.0:5000`; para teste apenas nesta máquina, use `http://127.0.0.1:5000`.
- `VITE_API_BASE`: URL opcional da API para desenvolvimento. Em produção, o painel usa a mesma origem (`/api`).

A central escuta na porta 5000. Para acesso de outras máquinas, configure HTTPS e firewall; não exponha o protótipo diretamente à internet.

## Segurança e operação

- O painel usa senha administrativa com hash PBKDF2, sessão em cookie HttpOnly de 12 horas e bloqueio temporário após cinco tentativas inválidas. Rotas do agente exigem ID do cliente e token individual; somente o hash do token fica no banco.
- Baixar outro instalador para o mesmo cliente revoga o token do agente anterior. Reinstale a versão mais recente.
- Bancos SQLite, executáveis e segredos locais não devem ser versionados.
- Veja [docs/PROTOTYPE.md](docs/PROTOTYPE.md) para limites conhecidos e próximos passos antes de produção.

## Estrutura

```
Agent/                   agente Windows
ServerMock/              central e API
AdminPanelV2/             painel web ativo e sua fonte e sua fonte
ServerMock/wwwroot/       painel compilado servido pela central
scripts/publish-agent.ps1 publicação do agente
.agents/skills/           skills de desenvolvimento instaladas
```
