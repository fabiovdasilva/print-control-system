# Escopo do protótipo Print Control

## Fluxo pronto

1. O operador inicia a central e autentica no painel com chave administrativa.
2. Cadastra um cliente, suas sub-redes, comunidade SNMP e intervalo de consulta.
3. Publica e baixa um agente Windows configurado para o cliente.
4. O agente envia heartbeat, consulta comandos e cotas, varre a rede configurada e envia resultados SNMP.
5. A central registra ou atualiza impressoras e trabalhos; o painel mostra status, agentes, alertas derivados, relatórios e exportação CSV.
6. Uma varredura solicitada pelo painel entra em fila persistente e é executada pelo agente conectado.

## Segurança implementada

- Chave administrativa nas rotas administrativas.
- Token aleatório individual por cliente, guardado como hash no banco e enviado pelo agente em cabeçalho separado.
- Verificação da identidade do cliente nas chamadas do agente.
- CORS restrito às origens configuradas.
- Arquivos SQLite e binários ignorados pelo Git.

## Limites conhecidos

- O transporte de desenvolvimento ainda é HTTP. Antes de implantação, use TLS, rotação e armazenamento seguro de chaves, firewall e gestão operacional de segredos.
- O status e os hosts conectados ficam em memória e são reiniciados com a central. Comandos ficam no SQLite, mas são marcados como entregues na leitura; falta confirmação de execução e reentrega confiável.
- A inicialização usa EnsureCreated e ajustes SQL compatíveis com o banco atual. Faltam migrations versionadas e estratégia de backup/retention.
- A descoberta SNMP depende de modelos, versões e OIDs. Validar em equipamentos reais, incluindo SNMP v3 e estados específicos de fabricantes.
- A contagem de páginas e metadados do spooler variam por driver e política. Páginas coloridas e custo não são inferidos.
- O agente é um aplicativo Windows de tray que inicia na sessão do usuário; não é um serviço Windows gerenciado. Validar instalação, atualização e desinstalação nos clientes.
- A chave administrativa compartilhada fornece autenticação simples; faltam usuários individuais, permissões por função, auditoria e isolamento multi-tenant forte.
- O instalador não é assinado. Para distribuição ampla, assine os binários e use canal autenticado.
- A validação local comprova comunicação e fila, mas não substitui testes com impressoras e drivers de cada fabricante.

## Próximas etapas recomendadas

1. Definir instalação como serviço Windows, atualização e recuperação; assinar o pacote.
2. Adicionar migrations, backup, métricas e logs estruturados.
3. Implementar confirmação de comandos, retry idempotente e buffer local offline.
4. Validar fabricantes, OIDs e SNMP v3 com equipamentos reais.
5. Criar usuários/RBAC, auditoria e isolamento por organização.
6. Implantar central HTTPS com cofre de segredos, monitoramento, backups e alertas.
