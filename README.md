# Print Control System

Protótipo funcional de monitoramento de impressoras em rede. A solução reúne uma central HTTP, um agente Windows instalado no cliente e um painel administrativo.

## Componentes

- **Central** — ASP.NET Core 8 e SQLite. Recebe heartbeat, relatórios SNMP e eventos do spooler; mantém clientes, impressoras, trabalhos, cotas e comandos pendentes.
- **Agente Windows** — coleta informações na rede local por SNMP e observa trabalhos do spooler. Cada instalador baixado é configurado para um cliente e recebe uma credencial própria. O scanner principal faz uma leitura inicial e repete a varredura conforme o intervalo definido no cadastro.
- **Painel** — React, Vite e TanStack Router, em `AdminPanelV2/`. As páginas administrativas consultam a API protegida.

## Iniciar localmente no Windows

1. Para executar o sistema completo, use o inicializador do servidor. Ele serve painel e API juntos na porta 5000. No primeiro início, copie a chave administrativa exibida no console.
2. Acesse http://localhost:5000 e informe a chave.
3. Cadastre o cliente e defina as sub-redes em CIDR (por exemplo, 192.168.10.0/24) e a comunidade SNMP aceita pelas impressoras.
4. Publique o agente com o script scripts/publish-agent.ps1.
5. Baixe o instalador pela página do cliente e execute-o em um Windows na rede do cliente. O agente inicia no tray e se registra na central.

Para desenvolvimento da interface, instale Node.js com npm e, em AdminPanelV2, execute npm install e npm run dev. Iniciar_Sistema.vbs abre a central unificada. Parar_Sistema.bat encerra somente o serviço da porta 5000.

## Executar no servidor da rede

No servidor `192.168.0.225`, com o .NET 8 SDK instalado, execute `Iniciar_Sistema_Servidor.bat`. Um processo ASP.NET serve a interface web e a API na porta `5000`. Acesse `http://192.168.0.225:5000`; os agentes também enviam dados para esse endereço, sob `/api`. O serviço existente na porta `5001` permanece intacto. Execute o inicializador na sessão do servidor: iniciá-lo no `DESKTOP-766` executa o processo nesse desktop, não no servidor de arquivos. O painel está incluído em `ServerMock/wwwroot`, então Node.js/npm não precisam estar instalados no servidor. Se alterar o painel, gere o bundle com `npm run build:central` na pasta `AdminPanelV2`.

Abra `http://192.168.0.225:5000`. A central imprime a chave administrativa no console. A base SQLite fica em `%LOCALAPPDATA%\PrintFlow\printcontrol.db` do usuário que iniciou a central. Libere TCP `5000` no firewall apenas para as redes que precisam acessar o protótipo. O acesso ainda usa HTTP; configure HTTPS antes de uma implantação de produção.

## Configuração

- `PRINT_CONTROL_ADMIN_KEY`: chave administrativa persistente. Se omitida, uma chave temporária aleatória é exibida no console a cada inicialização.
- `PRINT_CONTROL_DB_PATH`: caminho opcional do SQLite. Padrão: `ServerMock/printcontrol.db`.
- `PRINT_CONTROL_AGENT_EXE`: caminho opcional do agente publicado. Padrão: `ServerMock/AgentPublish/Agent.exe`.
- `PRINT_CONTROL_CORS_ORIGINS`: origens de desenvolvimento separadas por ponto e vírgula. Em produção, painel e API usam a mesma origem.
- `PRINT_CONTROL_LISTEN_URL`: endereço opcional da central. Padrão: `http://0.0.0.0:5000`; para teste apenas nesta máquina, use `http://127.0.0.1:5000`.
- `VITE_API_BASE`: URL opcional da API para desenvolvimento. Em produção, o painel usa a mesma origem (`/api`).

A central escuta na porta 5000. Para acesso de outras máquinas, configure HTTPS e firewall; não exponha o protótipo diretamente à internet.

## Segurança e operação

- Rotas administrativas exigem `X-Admin-Key`. Rotas do agente exigem ID do cliente e token individual; somente o hash do token fica no banco.
- Baixar outro instalador para o mesmo cliente revoga o token do agente anterior. Reinstale a versão mais recente.
- Bancos SQLite, executáveis e segredos locais não devem ser versionados.
- Veja [docs/PROTOTYPE.md](docs/PROTOTYPE.md) para limites conhecidos e próximos passos antes de produção.

## Estrutura

```
Agent/                   agente Windows
ServerMock/              central e API
AdminPanelV2/             painel web ativo e sua fonte
ServerMock/wwwroot/       painel compilado servido pela central
scripts/publish-agent.ps1 publicação do agente
.agents/skills/           skills de desenvolvimento instaladas
```
