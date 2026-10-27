# Print Control System

Protótipo funcional de monitoramento de impressoras em rede. A solução reúne uma central HTTP, um agente Windows instalado no cliente e um painel administrativo.

## Componentes

- **Central** — ASP.NET Core 8 e SQLite. Recebe heartbeat, relatórios SNMP e eventos do spooler; mantém clientes, impressoras, trabalhos, cotas e comandos pendentes.
- **Agente Windows** — coleta informações na rede local por SNMP e observa trabalhos do spooler. Cada instalador baixado é configurado para um cliente e recebe uma credencial própria. O scanner principal faz uma leitura inicial e repete a varredura conforme o intervalo definido no cadastro.
- **Painel** — React, Vite e TanStack Router, em `AdminPanelV2/`. As páginas administrativas consultam a API protegida.

## Iniciar localmente no Windows

1. Instale o .NET 8 SDK e Node.js com npm.
2. Em um terminal, execute `Run_Server.bat`. No primeiro início, copie a chave administrativa exibida no console.
3. Em outro terminal, entre em `AdminPanelV2`, execute `npm install` e depois `npm run dev`. Ou execute `Run_AdminPanel.bat` depois de instalar as dependências.
4. Acesse http://localhost:5173 e informe a chave.
5. Cadastre o cliente e defina as sub-redes em CIDR (por exemplo, `192.168.10.0/24`) e a comunidade SNMP aceita pelas impressoras.
6. Publique o agente:
   ```powershell
   .\scripts\publish-agent.ps1
   ```
7. Baixe o instalador pela página do cliente e execute-o em um Windows na rede do cliente. O agente inicia no tray e se registra na central.

O script `Iniciar_Sistema.vbs` abre a central e o painel. Para desenvolvimento, inicie cada um separadamente para acompanhar os logs.

## Executar no servidor da rede

No servidor `192.168.0.225`, execute `Run_Server_Rede.bat` e `Run_Painel_Rede.bat` em janelas separadas. Os scripts iniciam a central em `0.0.0.0:5000` e o painel em `0.0.0.0:5173`; o serviço existente na porta `5001` permanece intacto. Execute-os na sessão do servidor: iniciá-los no `DESKTOP-766` executa os processos nesse desktop, não no servidor de arquivos.

Abra `http://192.168.0.225:5173`. A central imprime a chave administrativa no console. A base SQLite fica em `%LOCALAPPDATA%\PrintFlow\printcontrol.db` do usuário que iniciou a central. Libere TCP `5000` e `5173` no firewall apenas para as redes de clientes que precisam acessar o protótipo. O acesso ainda usa HTTP; configure HTTPS antes de uma implantação de produção.
## Configuração

- `PRINT_CONTROL_ADMIN_KEY`: chave administrativa persistente. Se omitida, uma chave temporária aleatória é exibida no console a cada inicialização.
- `PRINT_CONTROL_DB_PATH`: caminho opcional do SQLite. Padrão: `ServerMock/printcontrol.db`.
- `PRINT_CONTROL_AGENT_EXE`: caminho opcional do agente publicado. Padrão: `ServerMock/AgentPublish/Agent.exe`.
- `PRINT_CONTROL_CORS_ORIGINS`: origens separadas por ponto e vírgula. Padrão: `http://localhost:5173;http://127.0.0.1:5173`.
- `PRINT_CONTROL_LISTEN_URL`: endereço opcional da central. Padrão: `http://0.0.0.0:5000`; para teste apenas nesta máquina, use `http://127.0.0.1:5000`.
- `VITE_API_BASE`: URL opcional da API para o painel. Por padrão, o painel usa o host atual na porta 5000.

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
AdminPanelV2/             painel web ativo
scripts/publish-agent.ps1 publicação do agente
.agents/skills/           skills de desenvolvimento instaladas
```
